<?php
/**
 * 送料計算システム - 実データAPI
 * Emoji/CPass/日本郵便 実料金データベース対応
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラーハンドリング
set_error_handler(function($severity, $message, $file, $line) {
    error_log("Shipping API Error: [$severity] $message in $file:$line");
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    // データベース接続
    function getDatabaseConnection() {
        static $pdo = null;
        
        if ($pdo === null) {
            try {
                $config = [
                    'host' => $_ENV['DB_HOST'] ?? 'localhost',
                    'dbname' => $_ENV['DB_NAME'] ?? 'nagano3_db',
                    'user' => $_ENV['DB_USER'] ?? 'postgres',
                    'password' => $_ENV['DB_PASS'] ?? 'Kn240914'
                ];
                
                $dsn = "pgsql:host={$config['host']};dbname={$config['dbname']}";
                
                $pdo = new PDO($dsn, $config['user'], $config['password'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]);
                
            } catch (PDOException $e) {
                throw new Exception('データベース接続失敗: ' . $e->getMessage());
            }
        }
        
        return $pdo;
    }
    
    // リクエスト処理
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    $pdo = getDatabaseConnection();
    
    switch ($action) {
        case 'calculate_shipping_matrix':
            // メイン送料計算
            $weightG = intval($input['weight_g'] ?? 0);
            $destinationCountry = strtoupper($input['destination_country'] ?? '');
            $serviceType = $input['service_type'] ?? null;
            $displayMode = $input['display_mode'] ?? 'price';
            
            if ($weightG <= 0 || $weightG > 30000) {
                throw new Exception('重量は1g〜30,000gの範囲で指定してください');
            }
            
            if (empty($destinationCountry)) {
                throw new Exception('配送先国が指定されていません');
            }
            
            $shippingOptions = calculateShippingCosts($pdo, $weightG, $destinationCountry, $serviceType);
            
            // 表示モードに応じてソート
            $shippingOptions = sortShippingOptions($shippingOptions, $displayMode);
            
            $response = [
                'success' => true,
                'action' => 'calculate_shipping_matrix',
                'parameters' => [
                    'weight_g' => $weightG,
                    'destination_country' => $destinationCountry,
                    'service_type' => $serviceType,
                    'display_mode' => $displayMode
                ],
                'shipping_options' => $shippingOptions,
                'count' => count($shippingOptions),
                'calculation_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']
            ];
            break;
            
        case 'get_carrier_services':
            // 業者別サービス一覧取得
            $carrierCode = strtoupper($input['carrier_code'] ?? '');
            
            $services = getCarrierServices($pdo, $carrierCode);
            
            $response = [
                'success' => true,
                'action' => 'get_carrier_services',
                'carrier_code' => $carrierCode,
                'services' => $services
            ];
            break;
            
        case 'get_supported_countries':
            // 対応国一覧取得
            $countries = getSupportedCountries($pdo);
            
            $response = [
                'success' => true,
                'action' => 'get_supported_countries',
                'countries' => $countries
            ];
            break;
            
        case 'calculate_profit_analysis':
            // 利益分析計算
            $weightG = intval($input['weight_g'] ?? 0);
            $destinationCountry = strtoupper($input['destination_country'] ?? '');
            $purchasePriceJpy = floatval($input['purchase_price_jpy'] ?? 0);
            $targetPriceJpy = floatval($input['target_price_jpy'] ?? 0);
            
            if ($weightG <= 0 || $purchasePriceJpy <= 0 || $targetPriceJpy <= 0) {
                throw new Exception('重量、仕入価格、販売価格を正しく入力してください');
            }
            
            $analysis = calculateProfitAnalysis($pdo, $weightG, $destinationCountry, $purchasePriceJpy, $targetPriceJpy);
            
            $response = [
                'success' => true,
                'action' => 'calculate_profit_analysis',
                'analysis' => $analysis
            ];
            break;
            
        case 'get_shipping_zones':
            // 配送ゾーン情報取得
            $zones = getShippingZones($pdo);
            
            $response = [
                'success' => true,
                'action' => 'get_shipping_zones',
                'zones' => $zones
            ];
            break;
            
        case 'batch_calculate':
            // バッチ計算
            $products = $input['products'] ?? [];
            
            if (empty($products)) {
                throw new Exception('商品データが必要です');
            }
            
            $results = [];
            foreach ($products as $index => $product) {
                try {
                    $weightG = intval($product['weight_g'] ?? 0);
                    $destination = strtoupper($product['destination_country'] ?? '');
                    
                    if ($weightG > 0 && !empty($destination)) {
                        $shippingOptions = calculateShippingCosts($pdo, $weightG, $destination, null);
                        $cheapestOption = !empty($shippingOptions) ? $shippingOptions[0] : null;
                        
                        $results[] = [
                            'index' => $index,
                            'success' => true,
                            'weight_g' => $weightG,
                            'destination' => $destination,
                            'cheapest_option' => $cheapestOption,
                            'available_options' => count($shippingOptions)
                        ];
                    } else {
                        $results[] = [
                            'index' => $index,
                            'success' => false,
                            'error' => '重量または配送先が無効です'
                        ];
                    }
                } catch (Exception $e) {
                    $results[] = [
                        'index' => $index,
                        'success' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            $response = [
                'success' => true,
                'action' => 'batch_calculate',
                'results' => $results,
                'processed_count' => count($results)
            ];
            break;
            
        case 'get_system_stats':
            // システム統計情報
            $stats = getSystemStatistics($pdo);
            
            $response = [
                'success' => true,
                'action' => 'get_system_stats',
                'stats' => $stats
            ];
            break;
            
        default:
            throw new Exception('不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s'),
        'action' => $action ?? 'unknown'
    ];
    
    error_log('送料計算API エラー: ' . $e->getMessage());
}

// =============================================================================
// メイン計算関数
// =============================================================================

/**
 * 送料計算メイン処理
 */
function calculateShippingCosts($pdo, $weightG, $destinationCountry, $serviceType = null) {
    try {
        // PostgreSQL関数を使用して計算
        $sql = "SELECT * FROM calculate_shipping_cost_accurate(?, ?, NULL, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$weightG, $destinationCountry, $serviceType]);
        
        $results = $stmt->fetchAll();
        
        if (empty($results)) {
            // フォールバック: 直接SQLクエリで検索
            $results = calculateShippingCostsFallback($pdo, $weightG, $destinationCountry, $serviceType);
        }
        
        return $results;
        
    } catch (PDOException $e) {
        error_log('送料計算エラー: ' . $e->getMessage());
        return [];
    }
}

/**
 * フォールバック送料計算
 */
function calculateShippingCostsFallback($pdo, $weightG, $destinationCountry, $serviceType) {
    $whereClause = '';
    $params = [$weightG, $weightG, $destinationCountry];
    
    if ($serviceType) {
        $whereClause = 'AND csm.service_type = ?';
        $params[] = $serviceType;
    }
    
    $sql = "
        SELECT 
            csm.carrier_code,
            csm.service_code,
            csm.service_name,
            csm.service_type,
            rsr.price_jpy as base_price_jpy,
            rsr.fuel_surcharge_jpy,
            (rsr.price_jpy + rsr.fuel_surcharge_jpy + rsr.handling_fee_jpy) as total_price_jpy,
            rsr.delivery_days_min,
            rsr.delivery_days_max,
            csm.tracking_available,
            csm.insurance_included
        FROM carrier_service_matrix csm
        JOIN shipping_zone_definitions szd ON 
            csm.carrier_code = szd.carrier_code
            AND ? = ANY(szd.countries) 
            AND szd.zone_code = ANY(csm.applicable_zones)
        JOIN real_shipping_rates rsr ON 
            csm.carrier_code = rsr.carrier_code 
            AND csm.service_code = rsr.service_code
            AND szd.zone_code = rsr.destination_zone
            AND ? >= rsr.weight_from_g 
            AND ? <= rsr.weight_to_g
        WHERE 
            csm.is_active = TRUE 
            AND rsr.is_active = TRUE
            AND szd.is_active = TRUE
            AND ? <= csm.max_weight_g
            $whereClause
        ORDER BY total_price_jpy ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    return $stmt->fetchAll();
}

/**
 * 送料オプションのソート
 */
function sortShippingOptions($options, $displayMode) {
    switch ($displayMode) {
        case 'price':
            usort($options, function($a, $b) {
                return $a['total_price_jpy'] <=> $b['total_price_jpy'];
            });
            break;
            
        case 'speed':
            usort($options, function($a, $b) {
                return $a['delivery_days_min'] <=> $b['delivery_days_min'];
            });
            break;
            
        case 'carrier':
            usort($options, function($a, $b) {
                $carrierCompare = $a['carrier_code'] <=> $b['carrier_code'];
                if ($carrierCompare === 0) {
                    return $a['total_price_jpy'] <=> $b['total_price_jpy'];
                }
                return $carrierCompare;
            });
            break;
    }
    
    return $options;
}

/**
 * 業者別サービス取得
 */
function getCarrierServices($pdo, $carrierCode = '') {
    $whereClause = '';
    $params = [];
    
    if ($carrierCode) {
        $whereClause = 'WHERE carrier_code = ?';
        $params[] = $carrierCode;
    }
    
    $sql = "SELECT * FROM carrier_service_matrix $whereClause AND is_active = TRUE ORDER BY carrier_code, service_code";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    return $stmt->fetchAll();
}

/**
 * 対応国一覧取得
 */
function getSupportedCountries($pdo) {
    $sql = "
        SELECT DISTINCT 
            unnest(countries) as country_code,
            carrier_code,
            zone_name
        FROM shipping_zone_definitions 
        WHERE is_active = TRUE
        ORDER BY country_code
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    $results = $stmt->fetchAll();
    
    // 国別にグループ化
    $countries = [];
    foreach ($results as $row) {
        $countryCode = $row['country_code'];
        if (!isset($countries[$countryCode])) {
            $countries[$countryCode] = [
                'country_code' => $countryCode,
                'country_name' => getCountryName($countryCode),
                'carriers' => [],
                'zones' => []
            ];
        }
        
        if (!in_array($row['carrier_code'], $countries[$countryCode]['carriers'])) {
            $countries[$countryCode]['carriers'][] = $row['carrier_code'];
        }
        
        if (!in_array($row['zone_name'], $countries[$countryCode]['zones'])) {
            $countries[$countryCode]['zones'][] = $row['zone_name'];
        }
    }
    
    return array_values($countries);
}

/**
 * 利益分析計算
 */
function calculateProfitAnalysis($pdo, $weightG, $destinationCountry, $purchasePriceJpy, $targetPriceJpy) {
    $shippingOptions = calculateShippingCosts($pdo, $weightG, $destinationCountry, null);
    
    $analysis = [];
    
    foreach ($shippingOptions as $option) {
        $shippingCost = $option['total_price_jpy'];
        $totalCost = $purchasePriceJpy + $shippingCost;
        $profit = $targetPriceJpy - $totalCost;
        $profitMargin = $targetPriceJpy > 0 ? ($profit / $targetPriceJpy) * 100 : 0;
        
        $analysis[] = [
            'carrier_code' => $option['carrier_code'],
            'service_name' => $option['service_name'],
            'shipping_cost_jpy' => $shippingCost,
            'total_cost_jpy' => $totalCost,
            'profit_jpy' => $profit,
            'profit_margin_percent' => round($profitMargin, 2),
            'delivery_days' => $option['delivery_days_min'] . '-' . $option['delivery_days_max'],
            'recommendation' => $profitMargin >= 20 ? 'excellent' : ($profitMargin >= 10 ? 'good' : 'poor')
        ];
    }
    
    // 利益率順でソート
    usort($analysis, function($a, $b) {
        return $b['profit_margin_percent'] <=> $a['profit_margin_percent'];
    });
    
    return [
        'purchase_price_jpy' => $purchasePriceJpy,
        'target_price_jpy' => $targetPriceJpy,
        'best_option' => !empty($analysis) ? $analysis[0] : null,
        'all_options' => $analysis,
        'summary' => [
            'total_options' => count($analysis),
            'profitable_options' => count(array_filter($analysis, function($a) { return $a['profit_jpy'] > 0; })),
            'excellent_options' => count(array_filter($analysis, function($a) { return $a['profit_margin_percent'] >= 20; }))
        ]
    ];
}

/**
 * 配送ゾーン情報取得
 */
function getShippingZones($pdo) {
    $sql = "SELECT * FROM shipping_zone_definitions WHERE is_active = TRUE ORDER BY carrier_code, zone_code";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    return $stmt->fetchAll();
}

/**
 * システム統計情報取得
 */
function getSystemStatistics($pdo) {
    $stats = [];
    
    // 基本統計
    $basicSql = "
        SELECT 
            COUNT(DISTINCT carrier_code) as total_carriers,
            COUNT(DISTINCT service_code) as total_services,
            COUNT(*) as total_rates,
            MIN(price_jpy) as min_price,
            MAX(price_jpy) as max_price,
            AVG(price_jpy) as avg_price
        FROM real_shipping_rates 
        WHERE is_active = TRUE
    ";
    
    $stmt = $pdo->prepare($basicSql);
    $stmt->execute();
    $stats['basic'] = $stmt->fetch();
    
    // 業者別統計
    $carrierSql = "
        SELECT 
            carrier_code,
            COUNT(DISTINCT service_code) as service_count,
            COUNT(*) as rate_count,
            MIN(price_jpy) as min_price,
            MAX(price_jpy) as max_price
        FROM real_shipping_rates 
        WHERE is_active = TRUE
        GROUP BY carrier_code
        ORDER BY carrier_code
    ";
    
    $stmt = $pdo->prepare($carrierSql);
    $stmt->execute();
    $stats['by_carrier'] = $stmt->fetchAll();
    
    // 対応国統計
    $countrySql = "
        SELECT 
            unnest(countries) as country,
            COUNT(*) as zone_count
        FROM shipping_zone_definitions 
        WHERE is_active = TRUE
        GROUP BY unnest(countries)
        ORDER BY count(*) DESC
        LIMIT 20
    ";
    
    $stmt = $pdo->prepare($countrySql);
    $stmt->execute();
    $stats['top_countries'] = $stmt->fetchAll();
    
    return $stats;
}

/**
 * 国名取得（簡易版）
 */
function getCountryName($countryCode) {
    $countries = [
        'US' => 'アメリカ',
        'SG' => 'シンガポール',
        'MY' => 'マレーシア',
        'TH' => 'タイ',
        'VN' => 'ベトナム',
        'ID' => 'インドネシア',
        'PH' => 'フィリピン',
        'TW' => '台湾',
        'HK' => '香港',
        'GB' => 'イギリス',
        'DE' => 'ドイツ',
        'FR' => 'フランス',
        'IT' => 'イタリア',
        'ES' => 'スペイン',
        'KR' => '韓国',
        'CN' => '中国',
        'CA' => 'カナダ',
        'AU' => 'オーストラリア',
        'NZ' => 'ニュージーランド'
    ];
    
    return $countries[$countryCode] ?? $countryCode;
}

// レスポンス送信
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>