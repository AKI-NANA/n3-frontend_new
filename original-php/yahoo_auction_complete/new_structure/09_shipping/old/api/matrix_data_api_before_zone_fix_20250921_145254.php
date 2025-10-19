<?php
/**
 * マトリックスデータAPI - NULL値緊急修正版
 * PHP 8.x Deprecated Warning対応
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラーハンドリング強化
set_error_handler(function($severity, $message, $file, $line) {
    error_log("Matrix API Error: $message in $file on line $line");
    return true; // エラーを抑制して続行
});

// 🚨 緊急修正: NULL値セーフティ関数
function safeNumberFormat($value, $decimals = 2) {
    return number_format($value ?? 0, $decimals);
}

function safeFloatVal($value) {
    return floatval($value ?? 0);
}

function safeIntVal($value) {
    return intval($value ?? 0);
}

function safeStringVal($value, $default = '') {
    return $value ?? $default;
}

// データベース接続
function getMatrixDatabase() {
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        return $pdo;
    } catch (PDOException $e) {
        error_log('Matrix Database connection error: ' . $e->getMessage());
        return null;
    }
}

/**
 * 配送日数取得（NULL値対応版）
 */
function getDeliveryDays($carrierCode, $serviceCode) {
    $carrierCode = safeStringVal($carrierCode);
    $serviceCode = safeStringVal($serviceCode);
    
    $deliveryMap = [
        'ELOGI' => [
            'ELOGI_DHL_EXPRESS' => '1-3',
            'ELOGI_FEDEX_PRIORITY' => '1-3', 
            'ELOGI_FEDEX_ECONOMY' => '2-5',
            'ELOGI_UPS_EXPRESS' => '1-3'
        ],
        'SPEEDPAK' => [
            'SPEEDPAK_ECONOMY' => '7-15',
            'SPEEDPAK_ECONOMY_US' => '8-12',
            'SPEEDPAK_ECONOMY_US_OUTSIDE' => '8-15',
            'SPEEDPAK_ECONOMY_UK' => '7-10',
            'SPEEDPAK_ECONOMY_DE' => '7-11',
            'SPEEDPAK_ECONOMY_AU' => '6-12',
            'SPEEDPAK_DHL' => '3-7',
            'SPEEDPAK_FEDEX' => '3-7'
        ],
        'CPASS' => [
            'SPEEDPAK_ECONOMY_US' => '8-12',
            'SPEEDPAK_ECONOMY_US_OUTSIDE' => '8-15',
            'SPEEDPAK_ECONOMY_UK' => '7-10',
            'SPEEDPAK_ECONOMY_DE' => '7-11',
            'SPEEDPAK_ECONOMY_AU' => '6-12',
            'CPASS_DHL_EXPRESS' => '1-4',
            'CPASS_FEDEX_PRIORITY' => '1-4',
            'CPASS_UPS_EXPRESS' => '1-4',
            'CPASS_ECONOMY' => '5-10'
        ],
        'JPPOST' => [
            'EMS' => '3-6'
        ]
    ];
    
    return $deliveryMap[$carrierCode][$serviceCode] ?? '2-5';
}

/**
 * 料金推定（NULL値対応版）
 */
function estimatePrice($carrierCode, $serviceCode, $weight) {
    $carrierCode = safeStringVal($carrierCode);
    $serviceCode = safeStringVal($serviceCode);
    $weight = safeFloatVal($weight);
    
    if ($weight <= 0) return 0;
    
    $basePrices = [
        'ELOGI' => [
            'DHL' => 3200 + ($weight * 400),
            'FEDEX' => 3000 + ($weight * 380),
            'UPS' => 3100 + ($weight * 390)
        ],
        'SPEEDPAK' => [
            'ECONOMY' => 1600 + ($weight * 200),
            'EXPRESS' => 2000 + ($weight * 250)
        ],
        'CPASS' => [
            'DHL' => 3500 + ($weight * 420),
            'FEDEX' => 3300 + ($weight * 400),
            'UPS' => 3400 + ($weight * 410),
            'ECONOMY' => 2000 + ($weight * 250)
        ],
        'JPPOST' => [
            'EMS' => 1400 + ($weight * 300)
        ]
    ];
    
    if (strpos($serviceCode, 'DHL') !== false) {
        if (strpos($serviceCode, 'ELOGI') !== false) {
            return safeFloatVal($basePrices['ELOGI']['DHL'] ?? 0);
        } elseif (strpos($serviceCode, 'CPASS') !== false) {
            return safeFloatVal($basePrices['CPASS']['DHL'] ?? 0);
        } else {
            return safeFloatVal($basePrices['SPEEDPAK']['EXPRESS'] ?? 0);
        }
    } elseif (strpos($serviceCode, 'FEDEX') !== false) {
        if (strpos($serviceCode, 'ELOGI') !== false) {
            return safeFloatVal($basePrices['ELOGI']['FEDEX'] ?? 0);
        } elseif (strpos($serviceCode, 'CPASS') !== false) {
            return safeFloatVal($basePrices['CPASS']['FEDEX'] ?? 0);
        } else {
            return safeFloatVal($basePrices['SPEEDPAK']['EXPRESS'] ?? 0);
        }
    } elseif (strpos($serviceCode, 'UPS') !== false) {
        if (strpos($serviceCode, 'ELOGI') !== false) {
            return safeFloatVal($basePrices['ELOGI']['UPS'] ?? 0);
        } elseif (strpos($serviceCode, 'CPASS') !== false) {
            return safeFloatVal($basePrices['CPASS']['UPS'] ?? 0);
        }
    } elseif (strpos($serviceCode, 'ECONOMY') !== false) {
        if (strpos($serviceCode, 'SPEEDPAK') !== false) {
            return safeFloatVal($basePrices['SPEEDPAK']['ECONOMY'] ?? 0);
        } elseif (strpos($serviceCode, 'CPASS') !== false) {
            return safeFloatVal($basePrices['CPASS']['ECONOMY'] ?? 0);
        }
    } elseif (strpos($serviceCode, 'EMS') !== false) {
        return safeFloatVal($basePrices['JPPOST']['EMS'] ?? 0);
    }
    
    return 0;
}

// リクエスト処理（NULL値対応）
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = safeStringVal($input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '');

try {
    if (empty($action)) {
        sendMatrixResponse(null, false, 'アクションが指定されていません');
        return;
    }
    
    switch ($action) {
        case 'get_tabbed_matrix':
            handleGetTabbedMatrix($input);
            break;
            
        case 'test':
            sendMatrixResponse(['status' => 'API動作中', 'timestamp' => date('Y-m-d H:i:s')], true, 'テスト成功');
            break;
            
        default:
            sendMatrixResponse(null, false, '不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    error_log('Matrix API Exception: ' . $e->getMessage());
    sendMatrixResponse(null, false, 'システムエラーが発生しました: ' . $e->getMessage());
}

/**
 * タブ式マトリックス生成（NULL値対応版）
 */
function handleGetTabbedMatrix($input) {
    $destination = safeStringVal($input['destination'] ?? '');
    $maxWeight = safeFloatVal($input['max_weight'] ?? 20.0);
    $weightStep = safeFloatVal($input['weight_step'] ?? 0.5);
    
    if (empty($destination)) {
        sendMatrixResponse(null, false, '配送先が指定されていません');
        return;
    }
    
    // 重量値の検証
    if ($maxWeight <= 0 || $maxWeight > 100) {
        $maxWeight = 20.0;
    }
    
    if ($weightStep <= 0 || $weightStep > 5) {
        $weightStep = 0.5;
    }
    
    $pdo = getMatrixDatabase();
    
    if (!$pdo) {
        $sampleData = generateSampleMatrix($destination, $maxWeight, $weightStep);
        sendMatrixResponse($sampleData, true, 'サンプルデータを表示中（データベース接続エラー）');
        return;
    }
    
    try {
        $zoneCode = getCountryZone($pdo, $destination);
        
        // 重量ステップ生成
        $weightSteps = [];
        for ($weight = $weightStep; $weight <= $maxWeight; $weight += $weightStep) {
            $weightSteps[] = round($weight, 1);
        }
        
        // 業者別データ生成
        $carriers = [
            'emoji' => generateCarrierData($pdo, 'ELOGI', $zoneCode, $weightSteps),
            'cpass' => generateCombinedCPassData($pdo, $zoneCode, $weightSteps),
            'jppost' => generateCarrierData($pdo, 'JPPOST', $zoneCode, $weightSteps)
        ];
        
        // 比較データ生成
        $comparisonData = generateComparisonData($carriers, $weightSteps);
        
        $responseData = [
            'destination' => $destination,
            'zone_code' => $zoneCode,
            'weight_steps' => $weightSteps,
            'carriers' => $carriers,
            'comparison_data' => $comparisonData,
            'data_source' => 'database'
        ];
        
        sendMatrixResponse($responseData, true, 'マトリックス生成完了');
        
    } catch (Exception $e) {
        error_log('Matrix generation error: ' . $e->getMessage());
        
        $sampleData = generateSampleMatrix($destination, $maxWeight, $weightStep);
        sendMatrixResponse($sampleData, true, 'サンプルデータを表示中（処理エラー）');
    }
}

/**
 * 業者別データ生成（NULL値対応版）
 */
function generateCarrierData($pdo, $carrierCode, $zoneCode, $weightSteps) {
    $carrierCode = safeStringVal($carrierCode);
    
    try {
        $sql = "SELECT DISTINCT service_code FROM real_shipping_rates 
                WHERE carrier_code = ? AND price_jpy IS NOT NULL AND price_jpy > 0";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$carrierCode]);
        $services = $stmt->fetchAll(PDO::FETCH_COLUMN) ?? [];
        
        if (empty($services)) {
            return [];
        }
        
        $carrierData = [];
        
        foreach ($services as $serviceCode) {
            $serviceCode = safeStringVal($serviceCode);
            $carrierData[$serviceCode] = [];
            
            foreach ($weightSteps as $weight) {
                $weight = safeFloatVal($weight);
                $weightG = intval($weight * 1000);
                
                $sql = "SELECT price_jpy, weight_from_g, weight_to_g 
                        FROM real_shipping_rates 
                        WHERE carrier_code = ? AND service_code = ?
                        AND weight_from_g <= ? AND weight_to_g >= ?
                        AND price_jpy IS NOT NULL AND price_jpy > 0
                        ORDER BY ABS(weight_from_g - ?) ASC
                        LIMIT 1";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$carrierCode, $serviceCode, $weightG, $weightG, $weightG]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($result && isset($result['price_jpy'])) {
                    $price = safeFloatVal($result['price_jpy']);
                    
                    if ($price > 0) {
                        $carrierData[$serviceCode][$weight] = [
                            'price' => $price,
                            'delivery_days' => getDeliveryDays($carrierCode, $serviceCode),
                            'has_tracking' => true,
                            'has_insurance' => true,
                            'estimated' => false,
                            'weight_range' => [
                                'from_g' => safeIntVal($result['weight_from_g']),
                                'to_g' => safeIntVal($result['weight_to_g'])
                            ],
                            'breakdown' => [
                                'base_price' => safeIntVal($price * 0.7),
                                'weight_surcharge' => safeIntVal($price * 0.2),
                                'fuel_surcharge' => safeIntVal($price * 0.1),
                                'other_fees' => 0
                            ]
                        ];
                    }
                } else {
                    // データがない場合は推定
                    $estimatedPrice = estimatePrice($carrierCode, $serviceCode, $weight);
                    if ($estimatedPrice > 0) {
                        $carrierData[$serviceCode][$weight] = [
                            'price' => $estimatedPrice,
                            'delivery_days' => getDeliveryDays($carrierCode, $serviceCode),
                            'has_tracking' => true,
                            'has_insurance' => true,
                            'estimated' => true,
                            'breakdown' => [
                                'base_price' => safeIntVal($estimatedPrice * 0.7),
                                'weight_surcharge' => safeIntVal($estimatedPrice * 0.2),
                                'fuel_surcharge' => safeIntVal($estimatedPrice * 0.1),
                                'other_fees' => 0
                            ]
                        ];
                    }
                }
            }
        }
        
        return $carrierData;
        
    } catch (Exception $e) {
        error_log("generateCarrierData error for $carrierCode: " . $e->getMessage());
        return [];
    }
}

/**
 * CPass統合データ生成（NULL値対応版）
 */
function generateCombinedCPassData($pdo, $zoneCode, $weightSteps) {
    // SpeedPAKデータ
    $speedpakData = generateCarrierData($pdo, 'CPASS', $zoneCode, $weightSteps);
    
    // CPass独自サービス（推定値）
    $cpassData = [];
    
    $cpassServices = [
        'CPASS_DHL_EXPRESS' => 'CPass DHL Express',
        'CPASS_FEDEX_PRIORITY' => 'CPass FedEx Priority', 
        'CPASS_UPS_EXPRESS' => 'CPass UPS Express',
        'CPASS_ECONOMY' => 'CPass Economy'
    ];
    
    foreach ($cpassServices as $serviceCode => $serviceName) {
        $cpassData[$serviceName] = [];
        
        foreach ($weightSteps as $weight) {
            $weight = safeFloatVal($weight);
            $estimatedPrice = estimatePrice('CPASS', $serviceCode, $weight);
            
            if ($estimatedPrice > 0) {
                $cpassData[$serviceName][$weight] = [
                    'price' => $estimatedPrice,
                    'delivery_days' => getDeliveryDays('CPASS', $serviceCode),
                    'has_tracking' => true,
                    'has_insurance' => true,
                    'estimated' => true,
                    'breakdown' => [
                        'base_price' => safeIntVal($estimatedPrice * 0.7),
                        'weight_surcharge' => safeIntVal($estimatedPrice * 0.2),
                        'fuel_surcharge' => safeIntVal($estimatedPrice * 0.1),
                        'other_fees' => 0
                    ]
                ];
            }
        }
    }
    
    return array_merge($speedpakData, $cpassData);
}

/**
 * 比較データ生成（NULL値対応版）
 */
function generateComparisonData($carriers, $weightSteps) {
    $comparisonData = [];
    
    foreach ($weightSteps as $weight) {
        $weight = safeFloatVal($weight);
        $allOptions = [];
        
        foreach ($carriers as $carrierName => $carrierData) {
            if (!is_array($carrierData)) continue;
            
            foreach ($carrierData as $serviceName => $serviceData) {
                if (isset($serviceData[$weight]) && is_array($serviceData[$weight])) {
                    $serviceInfo = $serviceData[$weight];
                    $price = safeFloatVal($serviceInfo['price'] ?? 0);
                    
                    if ($price > 0) {
                        $allOptions[] = [
                            'carrier' => safeStringVal($carrierName),
                            'service_name' => safeStringVal($serviceName),
                            'price' => $price,
                            'delivery_days' => safeStringVal($serviceInfo['delivery_days'] ?? '2-5'),
                            'estimated' => $serviceInfo['estimated'] ?? true
                        ];
                    }
                }
            }
        }
        
        if (!empty($allOptions)) {
            usort($allOptions, function($a, $b) {
                return ($a['price'] ?? 0) <=> ($b['price'] ?? 0);
            });
            
            $comparisonData[$weight] = [
                'cheapest' => $allOptions[0] ?? null,
                'fastest' => $allOptions[0] ?? null,
                'all_options' => $allOptions
            ];
        }
    }
    
    return $comparisonData;
}

/**
 * 国からゾーン取得（NULL値対応版）
 */
function getCountryZone($pdo, $countryCode) {
    return 'zone1'; // 簡略化
}

/**
 * サンプルマトリックス生成（NULL値対応版）
 */
function generateSampleMatrix($destination, $maxWeight, $weightStep) {
    $destination = safeStringVal($destination);
    $maxWeight = safeFloatVal($maxWeight);
    $weightStep = safeFloatVal($weightStep);
    
    $weightSteps = [];
    for ($weight = $weightStep; $weight <= $maxWeight; $weight += $weightStep) {
        $weightSteps[] = round($weight, 1);
    }
    
    $carriers = [
        'emoji' => [
            'ELOGI_DHL_EXPRESS' => [],
            'ELOGI_FEDEX_PRIORITY' => []
        ],
        'cpass' => [
            'SPEEDPAK_ECONOMY_US' => [],
            'CPASS_ECONOMY' => []
        ],
        'jppost' => [
            'EMS' => []
        ]
    ];
    
    // サンプルデータ生成
    foreach ($carriers as $carrierCode => &$carrierData) {
        foreach ($carrierData as $serviceName => &$serviceData) {
            foreach ($weightSteps as $weight) {
                $weight = safeFloatVal($weight);
                $basePrice = 2000 + ($weight * 400);
                
                if ($carrierCode === 'jppost') {
                    $basePrice *= 0.7;
                } elseif ($carrierCode === 'cpass') {
                    $basePrice *= 0.8;
                }
                
                $finalPrice = $basePrice + mt_rand(-200, 200);
                
                $serviceData[$weight] = [
                    'price' => safeFloatVal($finalPrice),
                    'delivery_days' => '2-5',
                    'has_tracking' => true,
                    'has_insurance' => $carrierCode !== 'jppost',
                    'estimated' => true,
                    'breakdown' => [
                        'base_price' => safeIntVal($basePrice * 0.7),
                        'weight_surcharge' => safeIntVal($basePrice * 0.2),
                        'fuel_surcharge' => safeIntVal($basePrice * 0.1),
                        'other_fees' => 0
                    ]
                ];
            }
        }
    }
    
    return [
        'destination' => $destination,
        'zone_code' => 'zone1',
        'weight_steps' => $weightSteps,
        'carriers' => $carriers,
        'comparison_data' => [],
        'data_source' => 'sample'
    ];
}

/**
 * JSON レスポンス送信（NULL値対応版）
 */
function sendMatrixResponse($data, $success = true, $message = '') {
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => safeStringVal($message),
        'timestamp' => date('Y-m-d H:i:s'),
        'api' => 'matrix_data_api'
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
?>