<?php
/**
 * マトリックスデータAPI - 完全修正版
 * 全業者最大重量まで対応
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラーハンドリング
set_error_handler(function($severity, $message, $file, $line) {
    error_log("Matrix API Error: $message in $file on line $line");
});

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
 * 配送日数取得（EMS料金修正版）
 */
function getDeliveryDays($carrierCode, $serviceCode) {
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
            'EMS' => '3-6' // 正確なEMS配送日数
        ]
    ];
    
    return $deliveryMap[$carrierCode][$serviceCode] ?? '2-5';
}

/**
 * 保険ステータス取得
 */
function getInsuranceStatus($carrierCode, $serviceCode) {
    $insuranceMap = [
        'ELOGI' => true,
        'SPEEDPAK' => true,
        'CPASS' => true,
        'JPPOST' => true
    ];
    
    return $insuranceMap[$carrierCode] ?? true;
}

/**
 * 料金推定（データがない場合）
 */
function estimatePrice($carrierCode, $serviceCode, $weight) {
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
            return $basePrices['ELOGI']['DHL'] ?? 0;
        } elseif (strpos($serviceCode, 'CPASS') !== false) {
            return $basePrices['CPASS']['DHL'] ?? 0;
        } else {
            return $basePrices['SPEEDPAK']['EXPRESS'] ?? 0;
        }
    } elseif (strpos($serviceCode, 'FEDEX') !== false) {
        if (strpos($serviceCode, 'ELOGI') !== false) {
            return $basePrices['ELOGI']['FEDEX'] ?? 0;
        } elseif (strpos($serviceCode, 'CPASS') !== false) {
            return $basePrices['CPASS']['FEDEX'] ?? 0;
        } else {
            return $basePrices['SPEEDPAK']['EXPRESS'] ?? 0;
        }
    } elseif (strpos($serviceCode, 'UPS') !== false) {
        if (strpos($serviceCode, 'ELOGI') !== false) {
            return $basePrices['ELOGI']['UPS'] ?? 0;
        } elseif (strpos($serviceCode, 'CPASS') !== false) {
            return $basePrices['CPASS']['UPS'] ?? 0;
        }
    } elseif (strpos($serviceCode, 'ECONOMY') !== false) {
        if (strpos($serviceCode, 'SPEEDPAK') !== false) {
            return $basePrices['SPEEDPAK']['ECONOMY'] ?? 0;
        } elseif (strpos($serviceCode, 'CPASS') !== false) {
            return $basePrices['CPASS']['ECONOMY'] ?? 0;
        }
    } elseif (strpos($serviceCode, 'EMS') !== false) {
        return $basePrices['JPPOST']['EMS'] ?? 0;
    }
    
    return 0;
}

// リクエスト処理
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'get_tabbed_matrix':
            handleGetTabbedMatrix($input);
            break;
            
        default:
            sendMatrixResponse(null, false, '不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    error_log('Matrix API Exception: ' . $e->getMessage());
    sendMatrixResponse(null, false, 'システムエラーが発生しました');
}

/**
 * タブ式マトリックス生成
 */
function handleGetTabbedMatrix($input) {
    $destination = $input['destination'] ?? '';
    $maxWeight = floatval($input['max_weight'] ?? 20.0);
    $weightStep = floatval($input['weight_step'] ?? 0.5);
    
    if (empty($destination)) {
        sendMatrixResponse(null, false, '配送先が指定されていません');
        return;
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
            $weightSteps[] = $weight;
        }
        
        // 業者別データ生成（全業者最大重量まで）
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
 * 国からゾーン取得（簡略版 - zone_codeを固定）
 */
function getCountryZone($pdo, $countryCode) {
    // 現在は全て zone1 として処理（簡略化）
    // 実際の運用では国別ゾーンマッピングが必要
    return 'zone1';
}

/**
 * CPass統合データ生成（SpeedPAK + CPass独自サービス）
 */
function generateCombinedCPassData($pdo, $zoneCode, $weightSteps) {
    // SpeedPAKデータ
    $speedpakData = generateCarrierData($pdo, 'SPEEDPAK', $zoneCode, $weightSteps);
    
    // CPass独自サービス（推定）
    $cpassData = [];
    
    // CPass独自サービスを追加
    $cpassServices = [
        'CPASS_DHL_EXPRESS' => 'CPass DHL Express',
        'CPASS_FEDEX_PRIORITY' => 'CPass FedEx Priority', 
        'CPASS_UPS_EXPRESS' => 'CPass UPS Express',
        'CPASS_ECONOMY' => 'CPass Economy'
    ];
    
    foreach ($cpassServices as $serviceCode => $serviceName) {
        $cpassData[$serviceName] = [];
        
        foreach ($weightSteps as $weight) {
            $estimatedPrice = estimatePrice('CPASS', $serviceCode, $weight);
            
            if ($estimatedPrice > 0) {
                $cpassData[$serviceName][$weight] = [
                    'price' => $estimatedPrice,
                    'delivery_days' => getDeliveryDays('CPASS', $serviceCode),
                    'has_tracking' => true,
                    'has_insurance' => getInsuranceStatus('CPASS', $serviceCode),
                    'estimated' => true,
                    'breakdown' => [
                        'base_price' => round($estimatedPrice * 0.7),
                        'weight_surcharge' => round($estimatedPrice * 0.2),
                        'fuel_surcharge' => round($estimatedPrice * 0.1),
                        'other_fees' => 0
                    ]
                ];
            }
        }
    }
    
    // SpeedPAKとCPass独自を統合
    return array_merge($speedpakData, $cpassData);
}

/**
 * 業者別データ生成（zone_codeなし版）
 */
function generateCarrierData($pdo, $carrierCode, $zoneCode, $weightSteps) {
    // zone_codeを使わずにサービスを取得
    $sql = "SELECT DISTINCT service_code FROM real_shipping_rates 
            WHERE carrier_code = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$carrierCode]);
    $services = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($services)) {
        return [];
    }
    
    $carrierData = [];
    
    foreach ($services as $serviceCode) {
        $carrierData[$serviceCode] = [];
        
        foreach ($weightSteps as $weight) {
            $weightG = $weight * 1000;
            
            // zone_codeを使わずに料金を取得
            $sql = "SELECT price_jpy, weight_from_g, weight_to_g FROM real_shipping_rates 
                    WHERE carrier_code = ? AND service_code = ?
                    AND weight_from_g <= ? AND weight_to_g >= ?
                    ORDER BY ABS(weight_from_g - ?) ASC
                    LIMIT 1";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$carrierCode, $serviceCode, $weightG, $weightG, $weightG]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                $carrierData[$serviceCode][$weight] = [
                    'price' => floatval($result['price_jpy']),
                    'delivery_days' => getDeliveryDays($carrierCode, $serviceCode),
                    'has_tracking' => true,
                    'has_insurance' => getInsuranceStatus($carrierCode, $serviceCode),
                    'estimated' => false,  // 実データ
                    'weight_range' => [
                        'from_g' => $result['weight_from_g'],
                        'to_g' => $result['weight_to_g']
                    ],
                    'breakdown' => [
                        'base_price' => round($result['price_jpy'] * 0.7),
                        'weight_surcharge' => round($result['price_jpy'] * 0.2),
                        'fuel_surcharge' => round($result['price_jpy'] * 0.1),
                        'other_fees' => 0
                    ]
                ];
            } else {
                // データがない場合は推定
                $estimatedPrice = estimatePrice($carrierCode, $serviceCode, $weight);
                if ($estimatedPrice > 0) {
                    $carrierData[$serviceCode][$weight] = [
                        'price' => $estimatedPrice,
                        'delivery_days' => getDeliveryDays($carrierCode, $serviceCode),
                        'has_tracking' => true,
                        'has_insurance' => getInsuranceStatus($carrierCode, $serviceCode),
                        'estimated' => true,  // 推定値
                        'breakdown' => [
                            'base_price' => round($estimatedPrice * 0.7),
                            'weight_surcharge' => round($estimatedPrice * 0.2),
                            'fuel_surcharge' => round($estimatedPrice * 0.1),
                            'other_fees' => 0
                        ]
                    ];
                }
            }
        }
    }
    
    return $carrierData;
}

/**
 * 比較データ生成
 */
function generateComparisonData($carriers, $weightSteps) {
    $comparisonData = [];
    
    foreach ($weightSteps as $weight) {
        $allOptions = [];
        
        foreach ($carriers as $carrierName => $carrierData) {
            foreach ($carrierData as $serviceName => $serviceData) {
                if (isset($serviceData[$weight])) {
                    $allOptions[] = [
                        'carrier' => $carrierName,
                        'service_name' => $serviceName,
                        'price' => $serviceData[$weight]['price'],
                        'delivery_days' => $serviceData[$weight]['delivery_days']
                    ];
                }
            }
        }
        
        if (!empty($allOptions)) {
            usort($allOptions, function($a, $b) {
                return $a['price'] <=> $b['price'];
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
 * サンプルマトリックス生成
 */
function generateSampleMatrix($destination, $maxWeight, $weightStep) {
    $weightSteps = [];
    for ($weight = $weightStep; $weight <= $maxWeight; $weight += $weightStep) {
        $weightSteps[] = $weight;
    }
    
    $carriers = [
        'emoji' => [
            'ELOGI_DHL_EXPRESS' => [],
            'ELOGI_FEDEX_PRIORITY' => [],
            'ELOGI_FEDEX_ECONOMY' => [],
            'ELOGI_UPS_EXPRESS' => []
        ],
        'cpass' => [
            'SPEEDPAK_DHL' => [],
            'SPEEDPAK_FEDEX' => [],
            'SPEEDPAK_ECONOMY' => [],
            'CPASS_DHL_EXPRESS' => [],
            'CPASS_ECONOMY' => []
        ],
        'jppost' => [
            'EMS' => []
        ]
    ];
    
    foreach ($carriers as $carrierCode => &$carrierData) {
        foreach ($carrierData as $serviceName => &$serviceData) {
            foreach ($weightSteps as $weight) {
                $basePrice = 2000 + ($weight * 400);
                
                if ($carrierCode === 'jppost') {
                    $basePrice *= 0.7;
                } elseif ($carrierCode === 'cpass') {
                    $basePrice *= 0.8;
                }
                
                $serviceData[$weight] = [
                    'price' => $basePrice + rand(-200, 200),
                    'delivery_days' => '2-5',
                    'has_tracking' => true,
                    'has_insurance' => $carrierCode !== 'jppost',
                    'estimated' => true,
                    'breakdown' => [
                        'base_price' => round($basePrice * 0.7),
                        'weight_surcharge' => round($basePrice * 0.2),
                        'fuel_surcharge' => round($basePrice * 0.1),
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
 * JSON レスポンス送信
 */
function sendMatrixResponse($data, $success = true, $message = '') {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'api' => 'matrix_data_api'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
?>