<?php
/**
 * 配送料金システム改良版API - 0.1kg刻み対応
 * 利益計算統合・階層地域管理・動的梱包制約
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class DetailedShippingAPI {
    private $pdo;
    private $defaultExchangeRate = 148.5;
    
    public function __construct() {
        try {
            $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
            $this->pdo = new PDO($dsn, "postgres", "", [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
        } catch (PDOException $e) {
            throw new Exception("データベース接続エラー: " . $e->getMessage());
        }
    }
    
    /**
     * 階層地域データ取得
     */
    public function getRegionsHierarchy() {
        $stmt = $this->pdo->query("
            WITH RECURSIVE region_tree AS (
                -- ルートレベル（ゾーン）
                SELECT 
                    id, name, code, parent_id, type, 0 as level,
                    ARRAY[name] as path,
                    id as root_id
                FROM shipping_regions_v2 
                WHERE parent_id IS NULL AND is_active = TRUE
                
                UNION ALL
                
                -- 子レベル
                SELECT 
                    r.id, r.name, r.code, r.parent_id, r.type, rt.level + 1,
                    rt.path || r.name,
                    rt.root_id
                FROM shipping_regions_v2 r
                JOIN region_tree rt ON r.parent_id = rt.id
                WHERE r.is_active = TRUE
            )
            SELECT 
                id, name, code, parent_id, type, level,
                array_to_string(path, ' > ') as full_path,
                root_id
            FROM region_tree 
            ORDER BY root_id, level, name
        ");
        
        return $stmt->fetchAll();
    }
    
    /**
     * 詳細料金検索（0.1kg刻み対応）
     */
    public function searchDetailedRates($params) {
        $weightG = isset($params['weight_kg']) ? $params['weight_kg'] * 100 : 100; // kg→g変換
        $regionId = $params['region_id'] ?? null;
        $carrierId = $params['carrier_id'] ?? null;
        $serviceId = $params['service_id'] ?? null;
        
        $sql = "
            SELECT DISTINCT
                sc.carrier_id,
                sc.carrier_name,
                sc.carrier_code,
                ss.service_id,
                ss.service_name,
                ss.service_type,
                sr.id as region_id,
                sr.name as region_name,
                sr.code as region_code,
                sr.type as region_type,
                srd.id as rate_id,
                srd.from_weight_g,
                srd.to_weight_g,
                (srd.from_weight_g::FLOAT / 100) as from_weight_kg,
                (srd.to_weight_g::FLOAT / 100) as to_weight_kg,
                srd.rate_usd,
                ROUND(srd.rate_usd * :exchange_rate, 0) as rate_jpy,
                srd.delivery_days_min,
                srd.delivery_days_max,
                srd.min_packaging_type,
                srd.max_packaging_type,
                srd.packaging_constraints,
                pc.description as packaging_description,
                pc.usage_instructions,
                CASE 
                    WHEN sr.id = :region_id THEN 'exact'
                    WHEN sr.id IN (
                        SELECT parent_id FROM shipping_regions_v2 WHERE id = :region_id
                    ) THEN 'parent_region'
                    ELSE 'zone_fallback'
                END as match_type
            FROM shipping_carriers sc
            JOIN shipping_services ss ON sc.carrier_id = ss.carrier_id
            JOIN shipping_rates_detailed srd ON (
                sc.carrier_id = srd.carrier_id 
                AND ss.service_id = srd.service_id
            )
            JOIN shipping_regions_v2 sr ON srd.region_id = sr.id
            LEFT JOIN packaging_constraints pc ON srd.min_packaging_type = pc.packaging_type
            WHERE sc.is_active = TRUE 
              AND ss.is_active = TRUE 
              AND srd.is_active = TRUE
              AND sr.is_active = TRUE
              AND srd.from_weight_g <= :weight_g 
              AND srd.to_weight_g >= :weight_g
        ";
        
        $params_array = [
            'weight_g' => $weightG,
            'exchange_rate' => $this->defaultExchangeRate,
            'region_id' => $regionId
        ];
        
        // フィルター条件追加
        if ($regionId) {
            $sql .= " AND (
                sr.id = :region_id 
                OR sr.id IN (
                    WITH RECURSIVE region_hierarchy AS (
                        SELECT parent_id FROM shipping_regions_v2 WHERE id = :region_id
                        UNION ALL
                        SELECT sr2.parent_id 
                        FROM shipping_regions_v2 sr2
                        JOIN region_hierarchy rh ON sr2.id = rh.parent_id
                        WHERE sr2.parent_id IS NOT NULL
                    )
                    SELECT parent_id FROM region_hierarchy WHERE parent_id IS NOT NULL
                )
            )";
        }
        
        if ($carrierId) {
            $sql .= " AND sc.carrier_id = :carrier_id";
            $params_array['carrier_id'] = $carrierId;
        }
        
        if ($serviceId) {
            $sql .= " AND ss.service_id = :service_id";
            $params_array['service_id'] = $serviceId;
        }
        
        $sql .= " ORDER BY srd.rate_usd ASC, 
                   CASE 
                       WHEN sr.id = :region_id THEN 1 
                       WHEN sr.id IN (
                           SELECT parent_id FROM shipping_regions_v2 WHERE id = :region_id
                       ) THEN 2 
                       ELSE 3 
                   END ASC";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params_array);
        
        return $stmt->fetchAll();
    }
    
    /**
     * 利益計算統合システム
     */
    public function calculateProfitAnalysis($params) {
        $weightKg = $params['weight_kg'] ?? 1.0;
        $regionId = $params['region_id'] ?? null;
        $purchasePriceJpy = $params['purchase_price_jpy'] ?? 0;
        $domesticShippingJpy = $params['domestic_shipping_jpy'] ?? 0;
        $exchangeRate = $params['exchange_rate'] ?? $this->defaultExchangeRate;
        $targetMargin = $params['target_margin'] ?? 25.0;
        
        if (!$regionId) {
            throw new Exception("配送先地域の指定が必要です");
        }
        
        // 利益計算関数を使用
        $stmt = $this->pdo->prepare("
            SELECT * FROM calculate_profit(
                :weight_g,
                :region_id,
                :purchase_price_jpy,
                :domestic_shipping_jpy,
                :exchange_rate,
                :target_margin
            )
        ");
        
        $stmt->execute([
            'weight_g' => $weightKg * 100,
            'region_id' => $regionId,
            'purchase_price_jpy' => $purchasePriceJpy,
            'domestic_shipping_jpy' => $domesticShippingJpy,
            'exchange_rate' => $exchangeRate,
            'target_margin' => $targetMargin
        ]);
        
        $results = $stmt->fetchAll();
        
        // 結果を加工
        $analysis = [
            'input_parameters' => [
                'weight_kg' => $weightKg,
                'region_id' => $regionId,
                'purchase_price_jpy' => $purchasePriceJpy,
                'domestic_shipping_jpy' => $domesticShippingJpy,
                'exchange_rate' => $exchangeRate,
                'target_margin_percent' => $targetMargin
            ],
            'shipping_options' => [],
            'best_options' => [
                'lowest_cost' => null,
                'fastest_delivery' => null,
                'highest_margin' => null,
                'best_balance' => null
            ],
            'summary' => [
                'total_options' => 0,
                'feasible_options' => 0,
                'avg_shipping_cost_usd' => 0,
                'cost_range_usd' => ['min' => null, 'max' => null]
            ]
        ];
        
        $feasibleOptions = [];
        foreach ($results as $row) {
            if ($row['feasible']) {
                $option = [
                    'carrier_name' => $row['carrier_name'],
                    'service_name' => $row['service_name'],
                    'shipping_cost' => [
                        'usd' => floatval($row['shipping_cost_usd']),
                        'jpy' => floatval($row['shipping_cost_jpy'])
                    ],
                    'total_cost_jpy' => floatval($row['total_cost_jpy']),
                    'suggested_selling_price' => [
                        'usd' => floatval($row['suggested_price_usd']),
                        'jpy' => floatval($row['suggested_price_jpy'])
                    ],
                    'profit' => [
                        'amount_jpy' => floatval($row['actual_profit_jpy']),
                        'margin_percent' => floatval($row['actual_margin_percent'])
                    ],
                    'packaging_required' => $row['packaging_required'],
                    'score' => [
                        'cost' => 100 - (floatval($row['shipping_cost_usd']) * 2), // 低コスト=高スコア
                        'profit' => floatval($row['actual_margin_percent']) * 2 // 高利益率=高スコア
                    ]
                ];
                
                $feasibleOptions[] = $option;
                $analysis['shipping_options'][] = $option;
            }
        }
        
        // 最適解抽出
        if (!empty($feasibleOptions)) {
            // 最安値
            $analysis['best_options']['lowest_cost'] = $this->findBestOption($feasibleOptions, 'shipping_cost.usd', 'min');
            
            // 最高利益率
            $analysis['best_options']['highest_margin'] = $this->findBestOption($feasibleOptions, 'profit.margin_percent', 'max');
            
            // バランス最適（コスト×利益率の総合スコア）
            $balanceScores = array_map(function($option) {
                return ($option['score']['cost'] + $option['score']['profit']) / 2;
            }, $feasibleOptions);
            $bestBalanceIndex = array_keys($balanceScores, max($balanceScores))[0];
            $analysis['best_options']['best_balance'] = $feasibleOptions[$bestBalanceIndex];
        }
        
        // サマリー
        $analysis['summary']['total_options'] = count($results);
        $analysis['summary']['feasible_options'] = count($feasibleOptions);
        
        if (!empty($feasibleOptions)) {
            $costs = array_column($feasibleOptions, 'shipping_cost');
            $usdCosts = array_column($costs, 'usd');
            $analysis['summary']['avg_shipping_cost_usd'] = round(array_sum($usdCosts) / count($usdCosts), 2);
            $analysis['summary']['cost_range_usd'] = [
                'min' => min($usdCosts),
                'max' => max($usdCosts)
            ];
        }
        
        return $analysis;
    }
    
    /**
     * 動的梱包制約チェック
     */
    public function checkPackagingConstraints($params) {
        $weightG = ($params['weight_kg'] ?? 1.0) * 100;
        $length = $params['length_mm'] ?? 0;
        $width = $params['width_mm'] ?? 0;
        $height = $params['height_mm'] ?? 0;
        
        $stmt = $this->pdo->prepare("
            SELECT 
                packaging_type,
                max_weight_g,
                max_length_mm,
                max_width_mm,
                max_height_mm,
                description,
                usage_instructions,
                CASE 
                    WHEN :weight_g <= max_weight_g 
                         AND (:length <= max_length_mm OR :length = 0)
                         AND (:width <= max_width_mm OR :width = 0) 
                         AND (:height <= max_height_mm OR :height = 0)
                    THEN TRUE 
                    ELSE FALSE 
                END as is_suitable,
                CASE 
                    WHEN :weight_g > max_weight_g THEN 'weight_exceeded'
                    WHEN :length > max_length_mm THEN 'length_exceeded'
                    WHEN :width > max_width_mm THEN 'width_exceeded'
                    WHEN :height > max_height_mm THEN 'height_exceeded'
                    ELSE 'suitable'
                END as constraint_status
            FROM packaging_constraints 
            WHERE is_active = TRUE
            ORDER BY max_weight_g ASC, packaging_type
        ");
        
        $stmt->execute([
            'weight_g' => $weightG,
            'length' => $length,
            'width' => $width,
            'height' => $height
        ]);
        
        $constraints = $stmt->fetchAll();
        
        $suitable = array_filter($constraints, fn($c) => $c['is_suitable']);
        $unsuitable = array_filter($constraints, fn($c) => !$c['is_suitable']);
        
        return [
            'input_specifications' => [
                'weight_g' => $weightG,
                'weight_kg' => $weightG / 100,
                'dimensions_mm' => [
                    'length' => $length,
                    'width' => $width,
                    'height' => $height
                ]
            ],
            'suitable_packaging' => array_values($suitable),
            'unsuitable_packaging' => array_values($unsuitable),
            'recommendations' => $this->generatePackagingRecommendations($suitable, $unsuitable)
        ];
    }
    
    /**
     * 重量ベース料金マトリックス生成（PDFスタイル）
     */
    public function generateRateMatrix($params) {
        $carrierId = $params['carrier_id'] ?? null;
        $serviceId = $params['service_id'] ?? null;
        $exchangeRate = $params['exchange_rate'] ?? $this->defaultExchangeRate;
        
        // 重量範囲を0.1kg刻みで取得
        $weightRanges = $this->getWeightRanges();
        
        // 地域リスト取得
        $regions = $this->getActiveRegions();
        
        // マトリックスデータ生成
        $matrix = [
            'weight_ranges' => $weightRanges,
            'regions' => $regions,
            'rate_data' => [],
            'exchange_rate' => $exchangeRate,
            'generated_at' => date('Y-m-d H:i:s')
        ];
        
        foreach ($weightRanges as $weightRange) {
            $rowData = [
                'weight_range' => $weightRange,
                'rates' => []
            ];
            
            foreach ($regions as $region) {
                $rate = $this->findRateForWeightAndRegion(
                    $weightRange['from_weight_g'], 
                    $region['id'], 
                    $carrierId, 
                    $serviceId
                );
                
                $rowData['rates'][] = [
                    'region_id' => $region['id'],
                    'region_name' => $region['name'],
                    'rate_usd' => $rate ? $rate['rate_usd'] : null,
                    'rate_jpy' => $rate ? round($rate['rate_usd'] * $exchangeRate) : null,
                    'carrier_name' => $rate ? $rate['carrier_name'] : null,
                    'service_name' => $rate ? $rate['service_name'] : null,
                    'delivery_days' => $rate ? $rate['delivery_days_min'] . '-' . $rate['delivery_days_max'] : null,
                    'packaging_required' => $rate ? $rate['min_packaging_type'] : null,
                    'available' => $rate !== null
                ];
            }
            
            $matrix['rate_data'][] = $rowData;
        }
        
        return $matrix;
    }
    
    /**
     * CSV出力（条件フィルタリング対応）
     */
    public function exportFilteredCSV($params) {
        $rates = $this->searchDetailedRates($params);
        
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="shipping_rates_detailed_' . date('Y-m-d_H-i-s') . '.csv"');
        
        $output = fopen('php://output', 'w');
        
        // UTF-8 BOM for Excel compatibility
        fwrite($output, "\xEF\xBB\xBF");
        
        // ヘッダー行
        fputcsv($output, [
            'carrier_name', 'service_name', 'service_type',
            'region_name', 'region_type', 'match_type',
            'from_weight_kg', 'to_weight_kg',
            'rate_usd', 'rate_jpy',
            'delivery_days_min', 'delivery_days_max',
            'packaging_required', 'packaging_description',
            'export_date'
        ]);
        
        // データ行
        foreach ($rates as $rate) {
            fputcsv($output, [
                $rate['carrier_name'],
                $rate['service_name'],
                $rate['service_type'],
                $rate['region_name'],
                $rate['region_type'],
                $rate['match_type'],
                $rate['from_weight_kg'],
                $rate['to_weight_kg'],
                $rate['rate_usd'],
                $rate['rate_jpy'],
                $rate['delivery_days_min'],
                $rate['delivery_days_max'],
                $rate['min_packaging_type'],
                $rate['packaging_description'],
                date('Y-m-d H:i:s')
            ]);
        }
        
        fclose($output);
        exit;
    }
    
    /**
     * システム統計情報
     */
    public function getSystemStatistics() {
        $stats = [];
        
        // 基本統計
        $stmt = $this->pdo->query("
            SELECT 
                COUNT(DISTINCT sc.carrier_id) as total_carriers,
                COUNT(DISTINCT ss.service_id) as total_services,
                COUNT(DISTINCT sr.id) as total_regions,
                COUNT(DISTINCT srd.id) as total_rates,
                MIN(srd.rate_usd) as min_rate_usd,
                MAX(srd.rate_usd) as max_rate_usd,
                AVG(srd.rate_usd) as avg_rate_usd,
                MIN(srd.from_weight_g) as min_weight_g,
                MAX(srd.to_weight_g) as max_weight_g
            FROM shipping_carriers sc
            CROSS JOIN shipping_services ss
            LEFT JOIN shipping_rates_detailed srd ON sc.carrier_id = srd.carrier_id AND ss.service_id = srd.service_id
            LEFT JOIN shipping_regions_v2 sr ON srd.region_id = sr.id
            WHERE sc.is_active = TRUE AND ss.is_active = TRUE
        ");
        $stats['basic'] = $stmt->fetch();
        
        // 地域別統計
        $stmt = $this->pdo->query("
            SELECT 
                sr.type,
                COUNT(sr.id) as region_count,
                COUNT(srd.id) as rate_count
            FROM shipping_regions_v2 sr
            LEFT JOIN shipping_rates_detailed srd ON sr.id = srd.region_id AND srd.is_active = TRUE
            WHERE sr.is_active = TRUE
            GROUP BY sr.type
            ORDER BY sr.type
        ");
        $stats['by_region_type'] = $stmt->fetchAll();
        
        // キャリア別統計
        $stmt = $this->pdo->query("
            SELECT 
                sc.carrier_name,
                COUNT(DISTINCT srd.region_id) as covered_regions,
                COUNT(srd.id) as total_rates,
                MIN(srd.rate_usd) as min_rate,
                MAX(srd.rate_usd) as max_rate,
                AVG(srd.rate_usd) as avg_rate
            FROM shipping_carriers sc
            LEFT JOIN shipping_rates_detailed srd ON sc.carrier_id = srd.carrier_id AND srd.is_active = TRUE
            WHERE sc.is_active = TRUE
            GROUP BY sc.carrier_id, sc.carrier_name
            ORDER BY total_rates DESC
        ");
        $stats['by_carrier'] = $stmt->fetchAll();
        
        // データ更新状況
        $stmt = $this->pdo->query("
            SELECT 
                data_source,
                COUNT(*) as rate_count,
                MAX(last_updated) as last_update,
                MIN(last_updated) as first_update
            FROM shipping_rates_detailed
            WHERE is_active = TRUE
            GROUP BY data_source
            ORDER BY rate_count DESC
        ");
        $stats['data_sources'] = $stmt->fetchAll();
        
        return $stats;
    }
    
    // ヘルパーメソッド
    private function findBestOption($options, $criteriaPath, $mode = 'min') {
        if (empty($options)) return null;
        
        $values = [];
        foreach ($options as $index => $option) {
            $value = $option;
            foreach (explode('.', $criteriaPath) as $key) {
                $value = $value[$key] ?? null;
            }
            $values[$index] = $value;
        }
        
        $bestIndex = ($mode === 'min') ? 
            array_keys($values, min($values))[0] : 
            array_keys($values, max($values))[0];
            
        return $options[$bestIndex];
    }
    
    private function generatePackagingRecommendations($suitable, $unsuitable) {
        $recommendations = [];
        
        if (empty($suitable)) {
            $recommendations[] = "指定された商品サイズ・重量では、標準的な梱包方法では発送できません。";
            $recommendations[] = "カスタム梱包または分割発送をご検討ください。";
        } else {
            $cheapestSuitable = min(array_column($suitable, 'max_weight_g'));
            $recommended = array_filter($suitable, fn($s) => $s['max_weight_g'] == $cheapestSuitable)[0];
            
            $recommendations[] = "推奨梱包方法: " . $recommended['description'];
            $recommendations[] = $recommended['usage_instructions'];
            
            if (count($suitable) > 1) {
                $recommendations[] = "他に " . (count($suitable) - 1) . " 種類の梱包方法も利用可能です。";
            }
        }
        
        return $recommendations;
    }
    
    private function getWeightRanges() {
        $stmt = $this->pdo->query("
            SELECT DISTINCT 
                from_weight_g, 
                to_weight_g,
                ROUND(from_weight_g::DECIMAL / 100, 1) as from_weight_kg,
                ROUND(to_weight_g::DECIMAL / 100, 1) as to_weight_kg
            FROM shipping_rates_detailed 
            WHERE is_active = TRUE
            ORDER BY from_weight_g
        ");
        return $stmt->fetchAll();
    }
    
    private function getActiveRegions() {
        $stmt = $this->pdo->query("
            SELECT id, name, code, type 
            FROM shipping_regions_v2 
            WHERE is_active = TRUE AND type = 'country'
            ORDER BY name
        ");
        return $stmt->fetchAll();
    }
    
    private function findRateForWeightAndRegion($weightG, $regionId, $carrierId = null, $serviceId = null) {
        $sql = "
            SELECT 
                srd.rate_usd, srd.delivery_days_min, srd.delivery_days_max,
                srd.min_packaging_type, sc.carrier_name, ss.service_name
            FROM shipping_rates_detailed srd
            JOIN shipping_carriers sc ON srd.carrier_id = sc.carrier_id
            JOIN shipping_services ss ON srd.service_id = ss.service_id
            WHERE srd.region_id = :region_id
              AND srd.from_weight_g <= :weight_g
              AND srd.to_weight_g >= :weight_g
              AND srd.is_active = TRUE
        ";
        
        $params = [
            'region_id' => $regionId,
            'weight_g' => $weightG
        ];
        
        if ($carrierId) {
            $sql .= " AND srd.carrier_id = :carrier_id";
            $params['carrier_id'] = $carrierId;
        }
        
        if ($serviceId) {
            $sql .= " AND srd.service_id = :service_id";
            $params['service_id'] = $serviceId;
        }
        
        $sql .= " ORDER BY srd.rate_usd ASC LIMIT 1";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetch() ?: null;
    }
}

// API ルーティング
try {
    $api = new DetailedShippingAPI();
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    switch ($action) {
        case 'regions_hierarchy':
            echo json_encode([
                'success' => true,
                'data' => $api->getRegionsHierarchy()
            ]);
            break;
            
        case 'search_rates':
            $params = array_merge($_GET, $_POST);
            echo json_encode([
                'success' => true,
                'data' => $api->searchDetailedRates($params)
            ]);
            break;
            
        case 'calculate_profit':
            $params = array_merge($_GET, $_POST);
            echo json_encode([
                'success' => true,
                'data' => $api->calculateProfitAnalysis($params)
            ]);
            break;
            
        case 'check_packaging':
            $params = array_merge($_GET, $_POST);
            echo json_encode([
                'success' => true,
                'data' => $api->checkPackagingConstraints($params)
            ]);
            break;
            
        case 'rate_matrix':
            $params = array_merge($_GET, $_POST);
            echo json_encode([
                'success' => true,
                'data' => $api->generateRateMatrix($params)
            ]);
            break;
            
        case 'export_csv':
            $params = array_merge($_GET, $_POST);
            $api->exportFilteredCSV($params);
            break;
            
        case 'statistics':
            echo json_encode([
                'success' => true,
                'data' => $api->getSystemStatistics()
            ]);
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'error' => 'Invalid action',
                'available_actions' => [
                    'regions_hierarchy', 'search_rates', 'calculate_profit',
                    'check_packaging', 'rate_matrix', 'export_csv', 'statistics'
                ]
            ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
