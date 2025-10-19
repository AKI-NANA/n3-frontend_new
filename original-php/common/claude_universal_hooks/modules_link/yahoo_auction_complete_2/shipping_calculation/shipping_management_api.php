<?php
/**
 * 配送管理統合API
 * 複数業者・地域制約・CSV管理統合システム
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

class ShippingManagementAPI {
    private $pdo;
    
    public function __construct() {
        $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
        $this->pdo = new PDO($dsn, "postgres", "", [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
    }
    
    /**
     * 配送業者一覧取得
     */
    public function getCarriers() {
        $stmt = $this->pdo->query("
            SELECT * FROM shipping_management_view 
            ORDER BY group_name, carrier_name
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 配送業者グループ別取得
     */
    public function getCarriersByGroup() {
        $stmt = $this->pdo->query("
            SELECT
                cg.group_name,
                json_agg(
                    json_build_object(
                        'carrier_id', sc.carrier_id,
                        'carrier_name', sc.carrier_name,
                        'carrier_code', sc.carrier_code,
                        'is_usa_only', sc.is_usa_only,
                        'is_international_only', sc.is_international_only
                    )
                ) AS carriers
            FROM carrier_groups cg
            JOIN carrier_group_members cgm ON cg.group_id = cgm.group_id
            JOIN shipping_carriers sc ON cgm.carrier_id = sc.carrier_id
            GROUP BY cg.group_name, cg.group_priority
            ORDER BY cg.group_priority, cg.group_name
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 最適配送計算（5候補まで）
     */
    public function getShippingOptions($weight, $country, $size = null) {
        // 実際のDBから取得する場合のサンプル実装
        // 現在はサンプルデータを返す
        $sampleOptions = [
            [
                'carrier_name' => 'eLogi',
                'service_name' => 'FedEx IE',
                'total_cost_usd' => 33.00,
                'delivery_days' => '3-5'
            ],
            [
                'carrier_name' => 'cpass',
                'service_name' => 'SpeedPAK',
                'total_cost_usd' => 16.00,
                'delivery_days' => '5-8'
            ],
            [
                'carrier_name' => '日本郵便',
                'service_name' => 'EMS',
                'total_cost_usd' => 20.00,
                'delivery_days' => '4-7'
            ],
            [
                'carrier_name' => 'eLogi',
                'service_name' => 'FedEx IP',
                'total_cost_usd' => 46.00,
                'delivery_days' => '2-4'
            ],
            [
                'carrier_name' => '日本郵便',
                'service_name' => '航空便',
                'total_cost_usd' => 25.00,
                'delivery_days' => '7-10'
            ]
        ];
        
        // 重量と国に基づいて料金調整（実装例）
        foreach ($sampleOptions as &$option) {
            $option['total_cost_usd'] *= floatval($weight);
        }
        
        // 安い順にソート
        usort($sampleOptions, function($a, $b) {
            return $a['total_cost_usd'] <=> $b['total_cost_usd'];
        });
        
        return array_slice($sampleOptions, 0, 5);
    }
    
    /**
     * 全国リスト取得
     */
    public function getCountries() {
        return [
            ['code' => 'US', 'name' => 'アメリカ合衆国'],
            ['code' => 'CA', 'name' => 'カナダ'],
            ['code' => 'AU', 'name' => 'オーストラリア'],
            ['code' => 'GB', 'name' => '英国'],
            ['code' => 'DE', 'name' => 'ドイツ'],
            ['code' => 'FR', 'name' => 'フランス'],
            ['code' => 'IT', 'name' => 'イタリア'],
            ['code' => 'ES', 'name' => 'スペイン'],
            ['code' => 'IL', 'name' => 'イスラエル'],
            ['code' => 'AE', 'name' => 'アラブ首長国連邦'],
            ['code' => 'MX', 'name' => 'メキシコ'],
            ['code' => 'ID', 'name' => 'インドネシア'],
            ['code' => 'KR', 'name' => '韓国'],
            ['code' => 'SG', 'name' => 'シンガポール'],
            ['code' => 'TW', 'name' => '台湾'],
            ['code' => 'CL', 'name' => 'チリ'],
            ['code' => 'CN', 'name' => '中国'],
            ['code' => 'NZ', 'name' => 'ニュージーランド'],
            ['code' => 'PH', 'name' => 'フィリピン'],
            ['code' => 'BR', 'name' => 'ブラジル'],
            ['code' => 'VN', 'name' => 'ベトナム'],
            ['code' => 'MY', 'name' => 'マレーシア'],
            ['code' => 'ZA', 'name' => '南アフリカ共和国'],
            ['code' => 'HK', 'name' => '香港']
        ];
    }
    
    /**
     * 地域制約確認
     */
    public function getRegionalRestrictions($country = null) {
        $sql = "
            SELECT 
                sc.carrier_name,
                sc.carrier_code,
                rcr.country_code,
                rcr.is_allowed,
                rcr.restriction_reason
            FROM regional_carrier_restrictions rcr
            JOIN shipping_carriers sc ON rcr.carrier_id = sc.carrier_id
            WHERE sc.is_active = TRUE
        ";
        
        $params = [];
        if ($country) {
            $sql .= " AND rcr.country_code = ?";
            $params[] = $country;
        }
        
        $sql .= " ORDER BY sc.carrier_name, rcr.country_code";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 料金データ取得（フィルター付き）
     */
    public function getRates($filters = []) {
        $sql = "
            SELECT 
                sc.carrier_name,
                sc.carrier_code,
                ss.service_name,
                ss.service_type,
                sz.zone_name,
                sz.countries_json,
                cr.weight_min_kg,
                cr.weight_max_kg,
                cr.cost_usd,
                cr.delivery_days_min,
                cr.delivery_days_max,
                cr.is_active,
                cr.rate_id
            FROM carrier_rates_extended cr
            JOIN carrier_policies_extended cp ON cr.policy_id = cp.policy_id
            JOIN shipping_carriers sc ON cp.carrier_id = sc.carrier_id
            JOIN shipping_services ss ON sc.carrier_id = ss.carrier_id AND ss.service_type = cp.policy_type
            JOIN shipping_zones sz ON cr.zone_id = sz.zone_id
            WHERE cr.is_active = TRUE
        ";
        
        $params = [];
        
        if (!empty($filters['carrier_code'])) {
            $sql .= " AND sc.carrier_code = ?";
            $params[] = $filters['carrier_code'];
        }
        
        if (!empty($filters['service_type'])) {
            $sql .= " AND ss.service_type = ?";
            $params[] = $filters['service_type'];
        }
        
        if (!empty($filters['zone_name'])) {
            $sql .= " AND sz.zone_name = ?";
            $params[] = $filters['zone_name'];
        }
        
        if (!empty($filters['weight_range'])) {
            $sql .= " AND cr.weight_min_kg <= ? AND cr.weight_max_kg >= ?";
            $params[] = $filters['weight_range'];
            $params[] = $filters['weight_range'];
        }
        
        $sql .= " ORDER BY sc.carrier_name, ss.service_type, sz.zone_name, cr.weight_min_kg";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * CSV出力
     */
    public function exportCSV($type = 'all', $filters = []) {
        $rates = $this->getRates($filters);
        
        $filename = "shipping_rates_{$type}_" . date('Y-m-d_H-i-s') . '.csv';
        $filepath = __DIR__ . '/csv_exports/' . $filename;
        
        if (!is_dir(dirname($filepath))) {
            mkdir(dirname($filepath), 0755, true);
        }
        
        $fp = fopen($filepath, 'w');
        
        // ヘッダー
        fputcsv($fp, [
            'carrier_name', 'carrier_code', 'service_name', 'service_type',
            'zone_name', 'countries', 'weight_min_kg', 'weight_max_kg',
            'cost_usd', 'delivery_days_min', 'delivery_days_max', 'is_active'
        ]);
        
        // データ
        foreach ($rates as $rate) {
            $countries = json_decode($rate['countries_json'], true);
            fputcsv($fp, [
                $rate['carrier_name'],
                $rate['carrier_code'],
                $rate['service_name'],
                $rate['service_type'],
                $rate['zone_name'],
                implode(';', $countries),
                $rate['weight_min_kg'],
                $rate['weight_max_kg'],
                $rate['cost_usd'],
                $rate['delivery_days_min'],
                $rate['delivery_days_max'],
                $rate['is_active'] ? 'true' : 'false'
            ]);
        }
        
        fclose($fp);
        
        return [
            'filename' => $filename,
            'filepath' => $filepath,
            'url' => '/modules/yahoo_auction_tool/shipping_calculation/csv_exports/' . $filename,
            'record_count' => count($rates)
        ];
    }
    
    /**
     * 業者有効/無効切り替え
     */
    public function toggleCarrierStatus($carrierId, $isActive) {
        $stmt = $this->pdo->prepare("
            UPDATE shipping_carriers 
            SET is_active = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE carrier_id = ?
        ");
        $stmt->execute([$isActive, $carrierId]);
        
        return ['success' => true, 'carrier_id' => $carrierId, 'is_active' => $isActive];
    }
    
    /**
     * 地域制約更新
     */
    public function updateRegionalRestriction($carrierId, $countryCode, $isAllowed, $reason = null) {
        $stmt = $this->pdo->prepare("
            INSERT INTO regional_carrier_restrictions 
            (carrier_id, country_code, is_allowed, restriction_reason)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (carrier_id, country_code) 
            DO UPDATE SET 
                is_allowed = EXCLUDED.is_allowed,
                restriction_reason = EXCLUDED.restriction_reason,
                effective_date = CURRENT_DATE
        ");
        $stmt->execute([$carrierId, $countryCode, $isAllowed, $reason]);
        
        return ['success' => true];
    }
    
    /**
     * 統計情報取得
     */
    public function getStatistics() {
        // 基本統計
        $stmt = $this->pdo->query("
            SELECT 
                COUNT(DISTINCT sc.carrier_id) as total_carriers,
                COUNT(DISTINCT ss.service_id) as total_services,
                COUNT(DISTINCT sz.zone_id) as total_zones,
                COUNT(cr.rate_id) as total_rates,
                MIN(cr.cost_usd) as min_cost,
                MAX(cr.cost_usd) as max_cost,
                AVG(cr.cost_usd) as avg_cost
            FROM shipping_carriers sc
            LEFT JOIN shipping_services ss ON sc.carrier_id = ss.carrier_id AND ss.is_active = TRUE
            LEFT JOIN shipping_zones sz ON sz.is_active = TRUE
            LEFT JOIN carrier_policies_extended cp ON sc.carrier_id = cp.carrier_id
            LEFT JOIN carrier_rates_extended cr ON cp.policy_id = cr.policy_id AND cr.is_active = TRUE
            WHERE sc.is_active = TRUE
        ");
        $basicStats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 業者別統計
        $stmt = $this->pdo->query("
            SELECT 
                sc.carrier_name,
                COUNT(DISTINCT ss.service_id) as service_count,
                COUNT(cr.rate_id) as rate_count,
                MIN(cr.cost_usd) as min_cost,
                MAX(cr.cost_usd) as max_cost
            FROM shipping_carriers sc
            LEFT JOIN shipping_services ss ON sc.carrier_id = ss.carrier_id AND ss.is_active = TRUE
            LEFT JOIN carrier_policies_extended cp ON sc.carrier_id = cp.carrier_id
            LEFT JOIN carrier_rates_extended cr ON cp.policy_id = cr.policy_id AND cr.is_active = TRUE
            WHERE sc.is_active = TRUE
            GROUP BY sc.carrier_id, sc.carrier_name
            ORDER BY sc.carrier_name
        ");
        $carrierStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'basic' => $basicStats,
            'by_carrier' => $carrierStats
        ];
    }
}

// API ルーティング
try {
    $api = new ShippingManagementAPI();
    $method = $_SERVER['REQUEST_METHOD'];
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $query = $_GET;
    
    switch ($method) {
        case 'GET':
            if (isset($query['action'])) {
                switch ($query['action']) {
                    case 'carriers':
                        echo json_encode($api->getCarriers());
                        break;
                        
                    case 'carriers_by_group':
                        echo json_encode($api->getCarriersByGroup());
                        break;
                        
                    case 'calculate':
                        $weight = floatval($query['weight'] ?? 1.0);
                        $country = $query['country'] ?? 'US';
                        $size = $query['size'] ?? null;
                        echo json_encode($api->getShippingOptions($weight, $country, $size));
                        break;
                        
                    case 'get_countries':
                        echo json_encode($api->getCountries());
                        break;
                        
                    case 'restrictions':
                        $country = $query['country'] ?? null;
                        echo json_encode($api->getRegionalRestrictions($country));
                        break;
                        
                    case 'rates':
                        echo json_encode($api->getRates($query));
                        break;
                        
                    case 'export_csv':
                        $type = $query['type'] ?? 'all';
                        $filters = array_intersect_key($query, array_flip(['carrier_code', 'service_type', 'zone_name', 'weight_range']));
                        $result = $api->exportCSV($type, $filters);
                        
                        // ファイルダウンロード
                        if (file_exists($result['filepath'])) {
                            header('Content-Type: text/csv');
                            header('Content-Disposition: attachment; filename="' . $result['filename'] . '"');
                            readfile($result['filepath']);
                            exit;
                        } else {
                            echo json_encode(['error' => 'ファイル生成失敗']);
                        }
                        break;
                        
                    case 'statistics':
                        echo json_encode($api->getStatistics());
                        break;
                        
                    default:
                        echo json_encode(['error' => '不明なアクション']);
                }
            } else {
                echo json_encode(['error' => 'アクションが指定されていません']);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (isset($input['action'])) {
                switch ($input['action']) {
                    case 'toggle_carrier':
                        echo json_encode($api->toggleCarrierStatus($input['carrier_id'], $input['is_active']));
                        break;
                        
                    case 'update_restriction':
                        echo json_encode($api->updateRegionalRestriction(
                            $input['carrier_id'], 
                            $input['country_code'], 
                            $input['is_allowed'], 
                            $input['reason'] ?? null
                        ));
                        break;
                        
                    default:
                        echo json_encode(['error' => '不明なアクション']);
                }
            } else {
                echo json_encode(['error' => 'アクションが指定されていません']);
            }
            break;
            
        default:
            echo json_encode(['error' => 'サポートされていないメソッド']);
    }
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
