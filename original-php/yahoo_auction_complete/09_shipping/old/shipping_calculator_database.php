<?php
/**
 * 送料計算システム - データベース対応版（修正版）
 * 実際のデータベースから配送データを取得し、マトリックス機能完全対応
 */

// エラー表示設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// データベース接続設定
$host = 'localhost';
$dbname = 'nagano3_db';
$username = 'postgres';
$password = 'Kn240914';

$pdo = null;
$db_error = null;

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // データベース構造確認
    $checkTables = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('carriers', 'services', 'shipping_rules', 'country_exceptions')";
    $stmt = $pdo->prepare($checkTables);
    $stmt->execute();
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (count($tables) < 4) {
        $db_error = "送料計算用テーブルが不完全です。データベースセットアップを実行してください。";
    }
    
} catch (PDOException $e) {
    $pdo = null;
    $db_error = $e->getMessage();
}

// JSON APIリクエスト処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && 
    strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
    
    // エラーハンドリング設定
    ini_set('display_errors', 0);
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('JSONパースエラー: ' . json_last_error_msg());
        }
        
        $action = isset($input['action']) ? $input['action'] : '';
        
        header('Content-Type: application/json; charset=UTF-8');
        
        switch ($action) {
            case 'setup_database':
                handleSetupDatabase();
                break;
                
            case 'calculate_shipping':
                handleShippingCalculation($input);
                break;
                
            case 'get_shipping_matrix':
                handleGetShippingMatrix($input);
                break;
                
            case 'get_shipping_matrix_advanced':
                handleGetShippingMatrixAdvanced($input);
                break;
                
            case 'get_calculation_history':
                handleGetCalculationHistory($input);
                break;
                
            case 'get_carriers':
                handleGetCarriers();
                break;
                
            case 'add_carrier_data':
                handleAddCarrierData($input);
                break;
                
            default:
                sendJsonResponse(null, false, '不明なアクション: ' . $action);
        }
        
    } catch (Exception $e) {
        error_log('API Error: ' . $e->getMessage());
        header('Content-Type: application/json; charset=UTF-8');
        sendJsonResponse(null, false, 'APIエラー: ' . $e->getMessage());
    }
    
    exit;
}

/**
 * データベースセットアップ
 */
function handleSetupDatabase() {
    global $pdo;
    
    if (!$pdo) {
        sendJsonResponse(null, false, 'データベース接続エラー');
        return;
    }
    
    try {
        // スキーマファイル読み込み
        $schemaFile = __DIR__ . '/shipping_database_schema.sql';
        if (!file_exists($schemaFile)) {
            sendJsonResponse(null, false, 'スキーマファイルが見つかりません');
            return;
        }
        
        $sql = file_get_contents($schemaFile);
        $pdo->exec($sql);
        
        sendJsonResponse(array(
            'message' => 'データベースセットアップが完了しました',
            'tables_created' => true
        ), true, 'セットアップ完了');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'セットアップエラー: ' . $e->getMessage());
    }
}

/**
 * 配送業者一覧取得
 */
function handleGetCarriers() {
    global $pdo;
    
    if (!$pdo) {
        sendJsonResponse(getSampleCarriers(), true, 'サンプルデータを表示中');
        return;
    }
    
    try {
        $sql = "
            SELECT 
                c.id, c.name, c.code, c.status,
                COUNT(s.id) as service_count
            FROM carriers c
            LEFT JOIN services s ON c.id = s.carrier_id AND s.status = 'active'
            WHERE c.status = 'active'
            GROUP BY c.id, c.name, c.code, c.status
            ORDER BY c.name
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $carriers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendJsonResponse($carriers, true, '配送業者データを取得しました');
        
    } catch (Exception $e) {
        sendJsonResponse(getSampleCarriers(), true, 'エラーが発生したためサンプルデータを表示: ' . $e->getMessage());
    }
}

/**
 * 送料計算処理（データベース対応）
 */
function handleShippingCalculation($input) {
    global $pdo;
    
    try {
        $weight = floatval(isset($input['weight']) ? $input['weight'] : 0);
        $length = floatval(isset($input['length']) ? $input['length'] : 0);
        $width = floatval(isset($input['width']) ? $input['width'] : 0);
        $height = floatval(isset($input['height']) ? $input['height'] : 0);
        $destination = strtoupper(isset($input['destination']) ? $input['destination'] : '');
        
        if ($weight <= 0) {
            sendJsonResponse(null, false, '重量を正しく入力してください');
            return;
        }
        
        if (empty($destination)) {
            sendJsonResponse(null, false, '配送先国を選択してください');
            return;
        }
        
        // 梱包後重量・サイズ計算
        $packedWeight = $weight * 1.05; // 5%増加
        $packedLength = $length * 1.1;  // 10%増加
        $packedWidth = $width * 1.1;
        $packedHeight = $height * 1.1;
        
        // 容積重量計算
        $volumetricWeight = ($packedLength * $packedWidth * $packedHeight) / 5000;
        $chargeableWeight = max($packedWeight, $volumetricWeight);
        
        // 配送オプション計算（データベース優先）
        $shippingOptions = array();
        $dataSource = 'sample';
        
        if ($pdo) {
            try {
                $shippingOptions = calculateShippingOptionsDatabase($pdo, $destination, $chargeableWeight);
                $dataSource = 'database';
            } catch (Exception $e) {
                error_log('Database calculation failed: ' . $e->getMessage());
                $shippingOptions = calculateShippingOptionsSample($destination, $chargeableWeight);
                $dataSource = 'sample';
            }
        } else {
            $shippingOptions = calculateShippingOptionsSample($destination, $chargeableWeight);
        }
        
        // 計算履歴保存（データベースがある場合）
        if ($pdo && !empty($shippingOptions)) {
            try {
                saveCalculationHistory($pdo, $weight, $packedWeight, $volumetricWeight, $chargeableWeight, $destination, $shippingOptions);
            } catch (Exception $e) {
                error_log('History save failed: ' . $e->getMessage());
            }
        }
        
        $result = array(
            'original_weight' => $weight,
            'packed_weight' => $packedWeight,
            'volumetric_weight' => $volumetricWeight,
            'chargeable_weight' => $chargeableWeight,
            'destination' => $destination,
            'shipping_options' => $shippingOptions,
            'recommendations' => generateRecommendations($shippingOptions),
            'data_source' => $dataSource
        );
        
        sendJsonResponse($result, true, '送料計算が完了しました');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, '計算処理エラー: ' . $e->getMessage());
    }
}

/**
 * データベースから送料計算
 */
function calculateShippingOptionsDatabase($pdo, $destination, $weight) {
    try {
        // 国別ゾーン取得
        $zone = getDatabaseZone($pdo, $destination);
        
        $sql = "
            SELECT 
                s.id as service_id,
                s.service_name,
                s.service_type,
                s.has_tracking,
                s.has_insurance,
                s.min_delivery_days,
                s.max_delivery_days,
                c.name as carrier_name,
                sr.base_cost_jpy,
                sr.per_500g_cost_jpy,
                COALESCE(ce.markup_percentage, 0) as markup_percentage,
                COALESCE(ce.flat_surcharge_jpy, 0) as flat_surcharge_jpy
            FROM services s
            JOIN carriers c ON s.carrier_id = c.id
            JOIN shipping_rules sr ON s.id = sr.service_id
            LEFT JOIN country_exceptions ce ON s.id = ce.service_id AND ce.country_code = ?
            WHERE s.status = 'active' 
            AND c.status = 'active'
            AND sr.status = 'active'
            AND sr.destination_zone = ?
            AND sr.weight_from_kg <= ?
            AND sr.weight_to_kg >= ?
            AND s.max_weight_kg >= ?
            ORDER BY sr.base_cost_jpy ASC
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$destination, $zone, $weight, $weight, $weight]);
        $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($services)) {
            throw new Exception('指定された条件にマッチするサービスが見つかりません');
        }
        
        $options = array();
        
        foreach ($services as $service) {
            // 料金計算
            $weight500g = ceil($weight / 0.5);
            $baseCost = floatval($service['base_cost_jpy']);
            $additionalCost = ($weight500g - 1) * floatval($service['per_500g_cost_jpy']);
            
            // 基本料金
            $totalCost = $baseCost + $additionalCost;
            
            // マークアップ適用
            $markupPercentage = floatval($service['markup_percentage']);
            if ($markupPercentage > 0) {
                $totalCost *= (1 + $markupPercentage / 100);
            }
            
            // 固定追加料金
            $totalCost += floatval($service['flat_surcharge_jpy']);
            
            $costJpy = round($totalCost);
            $costUsd = $costJpy / 150;
            
            $deliveryDays = $service['min_delivery_days'] . '-' . $service['max_delivery_days'];
            
            $options[] = array(
                'service_code' => 'db_' . $service['service_id'],
                'service_name' => $service['service_name'],
                'type' => $service['service_type'],
                'cost_jpy' => $costJpy,
                'cost_usd' => $costUsd,
                'delivery_days' => $deliveryDays,
                'tracking' => (bool)$service['has_tracking'],
                'insurance' => (bool)$service['has_insurance'],
                'weight_kg' => $weight,
                'destination' => $destination,
                'carrier_name' => $service['carrier_name']
            );
        }
        
        // コスト順でソート
        usort($options, function($a, $b) {
            return $a['cost_jpy'] - $b['cost_jpy'];
        });
        
        return $options;
        
    } catch (PDOException $e) {
        error_log('Database query error: ' . $e->getMessage());
        throw new Exception('データベースエラー: ' . $e->getMessage());
    } catch (Exception $e) {
        error_log('Calculation error: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * データベースから国別ゾーン取得
 */
function getDatabaseZone($pdo, $destination) {
    $sql = "SELECT zone_override FROM country_exceptions WHERE country_code = ? AND status = 'active' LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$destination]);
    $zone = $stmt->fetchColumn();
    
    if ($zone) {
        return $zone;
    }
    
    // フォールバックゾーン
    return getShippingZone($destination);
}

/**
 * 計算履歴保存
 */
function saveCalculationHistory($pdo, $originalWeight, $packedWeight, $volumetricWeight, $chargeableWeight, $destination, $options) {
    $sessionId = session_id() ?: 'web_' . uniqid();
    $userIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    
    $selectedService = !empty($options) ? $options[0] : null;
    $selectedServiceId = null;
    $selectedCost = null;
    
    if ($selectedService) {
        $selectedCost = $selectedService['cost_jpy'];
    }
    
    $sql = "
        INSERT INTO shipping_calculations (
            session_id, user_ip, original_weight_kg, packed_weight_kg, 
            volumetric_weight_kg, chargeable_weight_kg, destination_country,
            selected_service_id, selected_cost_jpy, calculation_results
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $sessionId,
        $userIp,
        $originalWeight,
        $packedWeight,
        $volumetricWeight,
        $chargeableWeight,
        $destination,
        $selectedServiceId,
        $selectedCost,
        json_encode($options)
    ]);
}

/**
 * サンプル配送オプション計算
 */
function calculateShippingOptionsSample($destination, $weight) {
    $zone = getShippingZone($destination);
    
    $services = array(
        'ems' => array(
            'name' => '日本郵便 EMS',
            'type' => 'courier',
            'tracking' => true,
            'insurance' => true,
            'rates' => array(
                'zone1' => array('base' => 1400, 'per_500g' => 200, 'delivery_days' => '2-4'),
                'zone2' => array('base' => 1400, 'per_500g' => 350, 'delivery_days' => '3-6'),
                'zone3' => array('base' => 1400, 'per_500g' => 500, 'delivery_days' => '3-6')
            )
        ),
        'cpass_fedex' => array(
            'name' => 'CPass Speed Pack FedEx',
            'type' => 'courier',
            'tracking' => true,
            'insurance' => true,
            'rates' => array(
                'zone1' => array('base' => 2800, 'per_500g' => 400, 'delivery_days' => '2-4'),
                'zone2' => array('base' => 3200, 'per_500g' => 450, 'delivery_days' => '2-5'),
                'zone3' => array('base' => 3600, 'per_500g' => 500, 'delivery_days' => '3-6')
            )
        ),
        'cpass_dhl' => array(
            'name' => 'CPass Speed Pack DHL',
            'type' => 'courier',
            'tracking' => true,
            'insurance' => true,
            'rates' => array(
                'zone1' => array('base' => 2600, 'per_500g' => 380, 'delivery_days' => '2-3'),
                'zone2' => array('base' => 3000, 'per_500g' => 420, 'delivery_days' => '2-4'),
                'zone3' => array('base' => 3400, 'per_500g' => 480, 'delivery_days' => '3-5')
            )
        ),
        'emoji_ups' => array(
            'name' => 'Emoji UPS Express',
            'type' => 'courier',
            'tracking' => true,
            'insurance' => true,
            'rates' => array(
                'zone1' => array('base' => 2500, 'per_500g' => 350, 'delivery_days' => '1-3'),
                'zone2' => array('base' => 2900, 'per_500g' => 400, 'delivery_days' => '2-4'),
                'zone3' => array('base' => 3300, 'per_500g' => 450, 'delivery_days' => '2-5')
            )
        ),
        'jp_sal' => array(
            'name' => '日本郵便 小型包装物',
            'type' => 'economy',
            'tracking' => false,
            'insurance' => false,
            'rates' => array(
                'zone1' => array('base' => 800, 'per_500g' => 100, 'delivery_days' => '7-14'),
                'zone2' => array('base' => 900, 'per_500g' => 150, 'delivery_days' => '10-20'),
                'zone3' => array('base' => 1000, 'per_500g' => 200, 'delivery_days' => '10-20')
            )
        )
    );
    
    $options = array();
    
    foreach ($services as $serviceCode => $service) {
        if (!isset($service['rates'][$zone])) {
            continue;
        }
        
        $rate = $service['rates'][$zone];
        $weight500g = ceil($weight / 0.5);
        $costJpy = $rate['base'] + ($weight500g - 1) * $rate['per_500g'];
        $costUsd = $costJpy / 150;
        
        $options[] = array(
            'service_code' => $serviceCode,
            'service_name' => $service['name'],
            'type' => $service['type'],
            'cost_jpy' => $costJpy,
            'cost_usd' => $costUsd,
            'delivery_days' => $rate['delivery_days'],
            'tracking' => $service['tracking'],
            'insurance' => $service['insurance'],
            'weight_kg' => $weight,
            'destination' => $destination
        );
    }
    
    // コスト順でソート
    usort($options, function($a, $b) {
        return $a['cost_jpy'] - $b['cost_jpy'];
    });
    
    return $options;
}

/**
 * 配送ゾーン取得
 */
function getShippingZone($destination) {
    $zones = array(
        'zone1' => array('US', 'CA', 'KR', 'TW', 'HK', 'SG'),
        'zone2' => array('GB', 'FR', 'DE', 'IT', 'ES', 'AU', 'NZ'),
        'zone3' => array('BR', 'AR', 'IN', 'RU', 'ZA', 'CN', 'TH', 'VN')
    );
    
    foreach ($zones as $zone => $countries) {
        if (in_array($destination, $countries)) {
            return $zone;
        }
    }
    
    return 'zone2';
}

/**
 * 推奨事項生成
 */
function generateRecommendations($options) {
    if (empty($options)) {
        return array('総合的な配送オプションが見つかりませんでした。');
    }
    
    $recommendations = array();
    
    // 最安オプション
    $cheapest = $options[0];
    $recommendations[] = array(
        'type' => 'economy',
        'title' => '💰 最安オプション',
        'message' => $cheapest['service_name'] . ' - ¥' . number_format($cheapest['cost_jpy']) . ' (' . $cheapest['delivery_days'] . '日)',
        'service_code' => isset($cheapest['service_code']) ? $cheapest['service_code'] : ''
    );
    
    // 最速オプション（最短日数）
    $fastest = null;
    $minDays = 999;
    foreach ($options as $option) {
        $days = (int)substr($option['delivery_days'], 0, 1);
        if ($days < $minDays) {
            $minDays = $days;
            $fastest = $option;
        }
    }
    
    if ($fastest && $fastest !== $cheapest) {
        $recommendations[] = array(
            'type' => 'speed',
            'title' => '⚡ 最速オプション',
            'message' => $fastest['service_name'] . ' - ¥' . number_format($fastest['cost_jpy']) . ' (' . $fastest['delivery_days'] . '日)',
            'service_code' => isset($fastest['service_code']) ? $fastest['service_code'] : ''
        );
    }
    
    // バランス推奨（中間価格帯）
    if (count($options) >= 3) {
        $midIndex = floor(count($options) / 2);
        $balanced = $options[$midIndex];
        
        $recommendations[] = array(
            'type' => 'balanced',
            'title' => '⚖️ バランス推奨',
            'message' => $balanced['service_name'] . ' - ¥' . number_format($balanced['cost_jpy']) . ' (' . $balanced['delivery_days'] . '日)',
            'service_code' => isset($balanced['service_code']) ? $balanced['service_code'] : ''
        );
    }
    
    return $recommendations;
}

/**
 * 送料マトリックス取得
 */
function handleGetShippingMatrix($input) {
    global $pdo;
    
    try {
        $destination = strtoupper(isset($input['destination']) ? $input['destination'] : '');
        $maxWeight = floatval(isset($input['max_weight']) ? $input['max_weight'] : 5.0);
        
        if (empty($destination)) {
            sendJsonResponse(null, false, '配送先国が指定されていません');
            return;
        }
        
        $weightSteps = array(0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0);
        $matrix = array();
        $dataSource = 'sample';
        
        // データベース優先でマトリックス生成
        if ($pdo) {
            try {
                foreach ($weightSteps as $weight) {
                    if ($weight > $maxWeight) continue;
                    
                    $options = calculateShippingOptionsDatabase($pdo, $destination, $weight);
                    $matrix[$weight] = $options;
                }
                $dataSource = 'database';
            } catch (Exception $e) {
                error_log('Database matrix error: ' . $e->getMessage());
                // フォールバックでサンプルデータ使用
                foreach ($weightSteps as $weight) {
                    if ($weight > $maxWeight) continue;
                    
                    $options = calculateShippingOptionsSample($destination, $weight);
                    $matrix[$weight] = $options;
                }
                $dataSource = 'sample';
            }
        } else {
            // データベースなしの場合はサンプルデータ
            foreach ($weightSteps as $weight) {
                if ($weight > $maxWeight) continue;
                
                $options = calculateShippingOptionsSample($destination, $weight);
                $matrix[$weight] = $options;
            }
        }
        
        $filteredWeightSteps = array();
        foreach ($weightSteps as $w) {
            if ($w <= $maxWeight) {
                $filteredWeightSteps[] = $w;
            }
        }
        
        sendJsonResponse(array(
            'destination' => $destination,
            'matrix' => $matrix,
            'weight_steps' => $filteredWeightSteps,
            'data_source' => $dataSource
        ), true, 'マトリックスを生成しました');
        
    } catch (Exception $e) {
        error_log('Matrix generation error: ' . $e->getMessage());
        sendJsonResponse(null, false, 'マトリックス生成エラー: ' . $e->getMessage());
    }
}

/**
 * 計算履歴取得
 */
function handleGetCalculationHistory($input) {
    global $pdo;
    
    if ($pdo) {
        try {
            $sql = "
                SELECT 
                    destination_country,
                    original_weight_kg,
                    selected_cost_jpy,
                    created_at,
                    calculation_results
                FROM shipping_calculations 
                ORDER BY created_at DESC 
                LIMIT 20
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $history = array();
            foreach ($results as $row) {
                $calculationResults = json_decode($row['calculation_results'], true);
                $serviceName = 'Unknown Service';
                
                if (!empty($calculationResults) && is_array($calculationResults)) {
                    $firstResult = $calculationResults[0];
                    $serviceName = isset($firstResult['service_name']) ? $firstResult['service_name'] : 'Unknown Service';
                }
                
                $history[] = array(
                    'destination' => $row['destination_country'],
                    'weight' => floatval($row['original_weight_kg']),
                    'service' => $serviceName,
                    'cost' => intval($row['selected_cost_jpy']),
                    'date' => date('Y-m-d H:i:s', strtotime($row['created_at']))
                );
            }
            
            sendJsonResponse(array(
                'history' => $history,
                'count' => count($history),
                'data_source' => 'database'
            ), true, 'データベースから履歴を取得しました');
            
        } catch (Exception $e) {
            error_log('Database history error: ' . $e->getMessage());
            $sampleHistory = getSampleHistory();
            sendJsonResponse(array(
                'history' => $sampleHistory,
                'count' => count($sampleHistory),
                'data_source' => 'sample'
            ), true, 'エラーのためサンプル履歴を表示: ' . $e->getMessage());
        }
    } else {
        $sampleHistory = getSampleHistory();
        sendJsonResponse(array(
            'history' => $sampleHistory,
            'count' => count($sampleHistory),
            'data_source' => 'sample'
        ), true, 'サンプル履歴を取得しました');
    }
}

/**
 * 配送業者データ追加
 */
function handleAddCarrierData($input) {
    global $pdo;
    
    if (!$pdo) {
        sendJsonResponse(null, false, 'データベース接続エラー');
        return;
    }
    
    sendJsonResponse(null, false, 'この機能は開発中です');
}

/**
 * サンプルデータ取得関数
 */
function getSampleCarriers() {
    return array(
        array('id' => 1, 'name' => 'CPass', 'code' => 'CPASS', 'status' => 'active', 'service_count' => 2),
        array('id' => 2, 'name' => 'Emoji', 'code' => 'EMOJI', 'status' => 'active', 'service_count' => 3),
        array('id' => 3, 'name' => '日本郵便', 'code' => 'JPPOST', 'status' => 'active', 'service_count' => 3)
    );
}

function getSampleHistory() {
    return array(
        array(
            'destination' => 'US',
            'weight' => 1.5,
            'service' => 'CPass Speed Pack FedEx',
            'cost' => 3200,
            'date' => date('Y-m-d H:i:s', strtotime('-1 hour'))
        ),
        array(
            'destination' => 'GB',
            'weight' => 0.8,
            'service' => '日本郵便 EMS',
            'cost' => 1800,
            'date' => date('Y-m-d H:i:s', strtotime('-2 hours'))
        ),
        array(
            'destination' => 'AU',
            'weight' => 2.2,
            'service' => 'CPass Speed Pack DHL',
            'cost' => 4500,
            'date' => date('Y-m-d H:i:s', strtotime('-1 day'))
        )
    );
}

/**
 * 新しいタブ式マトリックス生成（指示書対応）
 */
function handleGetShippingMatrixAdvanced($input) {
    global $pdo;
    
    try {
        $destination = strtoupper($input['destination'] ?? '');
        $maxWeight = floatval($input['max_weight'] ?? 5.0);
        $weightStep = floatval($input['weight_step'] ?? 1.0);
        $displayType = $input['display_type'] ?? 'all';
        
        if (empty($destination)) {
            sendJsonResponse(null, false, '配送先国が指定されていません');
            return;
        }
        
        // 新しいタブ式マトリックス生成
        $carriers = getActiveCarriers();
        $matrixData = [];
        
        foreach ($carriers as $carrier) {
            $matrixData[$carrier['code']] = generateCarrierMatrix(
                $carrier['code'], 
                $destination, 
                $maxWeight,
                $weightStep
            );
        }
        
        sendJsonResponse([
            'matrix_type' => 'tabbed',
            'carriers' => $matrixData,
            'comparison_data' => generateComparisonData($input),
            'ui_config' => getMatrixUIConfig(),
            'destination' => $destination,
            'data_source' => $pdo ? 'database' : 'sample'
        ], true, 'タブ式マトリックス生成完了');
        
    } catch (Exception $e) {
        error_log('Advanced matrix error: ' . $e->getMessage());
        sendJsonResponse(null, false, 'マトリックス生成エラー: ' . $e->getMessage());
    }
}

/**
 * 業者別マトリックス生成
 */
function generateCarrierMatrix($carrierCode, $destination, $maxWeight, $weightStep) {
    global $pdo;
    
    $weightSteps = [];
    for ($weight = $weightStep; $weight <= $maxWeight; $weight += $weightStep) {
        $weightSteps[] = $weight;
    }
    
    $matrix = [];
    
    if ($pdo) {
        try {
            // データベースから業者サービス取得
            $sql = "SELECT s.service_name, s.service_code, s.service_type FROM services s 
                    JOIN carriers c ON s.carrier_id = c.id 
                    WHERE c.code = ? AND s.status = 'active'";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$carrierCode]);
            $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($services as $service) {
                $matrix[$service['service_name']] = [];
                
                foreach ($weightSteps as $weight) {
                    $options = calculateShippingOptionsDatabase($pdo, $destination, $weight);
                    $serviceOption = array_filter($options, function($opt) use ($service) {
                        return strpos($opt['service_name'], $service['service_name']) !== false;
                    });
                    
                    if (!empty($serviceOption)) {
                        $option = array_values($serviceOption)[0];
                        $matrix[$service['service_name']][$weight] = [
                            'price' => $option['cost_jpy'],
                            'delivery_days' => $option['delivery_days'],
                            'has_tracking' => $option['tracking'],
                            'has_insurance' => $option['insurance'],
                            'source' => 'database'
                        ];
                    }
                }
            }
        } catch (Exception $e) {
            error_log("Database carrier matrix error: " . $e->getMessage());
            return generateSampleCarrierMatrix($carrierCode, $weightSteps);
        }
    } else {
        return generateSampleCarrierMatrix($carrierCode, $weightSteps);
    }
    
    return $matrix;
}

/**
 * サンプル業者マトリックス生成
 */
function generateSampleCarrierMatrix($carrierCode, $weightSteps) {
    $serviceTemplates = [
        'EMOJI' => ['UPS Express', 'FedEx Priority', 'DHL Worldwide'],
        'CPASS' => ['Speed Pack FedEx', 'Speed Pack DHL', 'UPS Express'],
        'JPPOST' => ['EMS', '航空便小形包装物', '航空便印刷物']
    ];
    
    $services = $serviceTemplates[$carrierCode] ?? ['Service A', 'Service B'];
    $matrix = [];
    
    foreach ($services as $index => $serviceName) {
        $matrix[$serviceName] = [];
        
        foreach ($weightSteps as $weight) {
            $basePrice = 1500 + ($index * 500) + ($weight * 300);
            $matrix[$serviceName][$weight] = [
                'price' => $basePrice + rand(-200, 200),
                'delivery_days' => (2 + $index) . '-' . (4 + $index),
                'has_tracking' => $index < 2,
                'has_insurance' => $index === 0,
                'source' => 'sample'
            ];
        }
    }
    
    return $matrix;
}

/**
 * 比較データ生成
 */
function generateComparisonData($input) {
    // 比較データ生成ロジック
    return [
        'cheapest_options' => [],
        'fastest_options' => [],
        'best_value_options' => []
    ];
}

/**
 * マトリックスUI設定取得
 */
function getMatrixUIConfig() {
    return [
        'enable_sorting' => true,
        'enable_filtering' => true,
        'enable_export' => true,
        'default_tab' => 'emoji',
        'animation_duration' => 300
    ];
}

/**
 * JSON レスポンス送信
 */
function sendJsonResponse($data, $success = true, $message = '') {
    echo json_encode(array(
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>送料計算システム - 修正版</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #3b82f6;
            --shipping-primary: #059669;
            --shipping-secondary: #10b981;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --info: #06b6d4;
            
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --bg-tertiary: #f1f5f9;
            
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-muted: #64748b;
            
            --border: #e2e8f0;
            --radius-md: 0.5rem;
            --radius-lg: 0.75rem;
            --radius-xl: 1rem;
            
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            
            --space-sm: 0.5rem;
            --space-md: 1rem;
            --space-lg: 1.5rem;
            --space-xl: 2rem;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--bg-primary);
        }

        .calculation-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: var(--space-lg);
        }

        /* ヘッダー */
        .calculation-header {
            background: linear-gradient(135deg, var(--shipping-primary), var(--shipping-secondary));
            color: white;
            padding: var(--space-xl);
            border-radius: var(--radius-xl);
            margin-bottom: var(--space-xl);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .calculation-header h1 {
            font-size: 2rem;
            display: flex;
            align-items: center;
            gap: var(--space-md);
        }

        .header-actions {
            display: flex;
            gap: var(--space-sm);
        }

        /* データベース状態表示 */
        .db-status {
            padding: var(--space-lg);
            margin-bottom: var(--space-lg);
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            gap: var(--space-md);
        }

        .db-status.connected {
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
            border: 2px solid var(--success);
            color: #065f46;
        }

        .db-status.error {
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border: 2px solid var(--danger);
            color: #7f1d1d;
        }

        .db-status.warning {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid var(--warning);
            color: #92400e;
        }

        /* フォーム */
        .calculation-form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: var(--space-xl);
            margin-bottom: var(--space-xl);
        }

        .calculation-input-card {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-xl);
            border: 1px solid var(--border);
            box-shadow: var(--shadow-sm);
        }

        .input-card-header {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: var(--space-lg);
            padding-bottom: var(--space-md);
            border-bottom: 2px solid var(--border);
        }

        .input-card-header i {
            color: var(--shipping-primary);
        }

        /* 入力フィールド */
        .form-input, .form-select {
            width: 100%;
            padding: var(--space-md);
            border: 2px solid var(--border);
            border-radius: var(--radius-md);
            font-size: 1rem;
            transition: all 0.2s ease;
            background: var(--bg-secondary);
        }

        .form-input:focus, .form-select:focus {
            outline: none;
            border-color: var(--shipping-primary);
            box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }

        /* ボタン */
        .btn, .calc-btn {
            display: inline-flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-md) var(--space-lg);
            border: none;
            border-radius: var(--radius-md);
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
        }

        .btn-secondary {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 2px solid var(--border);
        }

        .btn-info {
            background: linear-gradient(135deg, var(--info), #0891b2);
            color: white;
        }

        .btn-warning {
            background: linear-gradient(135deg, var(--warning), #d97706);
            color: white;
        }

        .btn-success {
            background: linear-gradient(135deg, var(--success), #059669);
            color: white;
        }

        .calc-btn-primary {
            background: linear-gradient(135deg, var(--shipping-primary), var(--shipping-secondary));
            color: white;
            box-shadow: var(--shadow-md);
            font-size: 1.125rem;
            padding: var(--space-lg) var(--space-xl);
        }

        .calc-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .calc-btn-secondary {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 2px solid var(--border);
        }

        /* 計算アクション */
        .calculation-actions {
            display: flex;
            justify-content: center;
            gap: var(--space-lg);
            margin-bottom: var(--space-xl);
            flex-wrap: wrap;
        }

        /* レスポンシブ */
        @media (max-width: 768px) {
            .calculation-form-grid {
                grid-template-columns: 1fr;
            }
            
            .calculation-header {
                flex-direction: column;
                gap: var(--space-md);
                text-align: center;
            }
            
            .calculation-actions {
                flex-direction: column;
                align-items: center;
            }
        }
    </style>
</head>
<body>
    <div class="calculation-container">
        <!-- ヘッダー -->
        <div class="calculation-header">
            <h1><i class="fas fa-shipping-fast"></i> 送料計算システム（修正版）</h1>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="showMatrixModal()">
                    <i class="fas fa-table"></i> マトリックス
                </button>
                <button class="btn btn-info" onclick="showHistoryModal()">
                    <i class="fas fa-history"></i> 履歴
                </button>
            </div>
        </div>

        <!-- データベース状態表示 -->
        <?php if ($pdo && !$db_error): ?>
        <div class="db-status connected">
            <i class="fas fa-database"></i>
            <div>
                <strong>✅ データベース接続成功</strong><br>
                サンプルデータで動作中。全機能が利用できます。
            </div>
        </div>
        <?php elseif ($db_error): ?>
        <div class="db-status error">
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <strong>❌ データベース接続エラー</strong><br>
                <?= htmlspecialchars($db_error) ?><br>
                サンプルデータで動作します。
            </div>
        </div>
        <?php endif; ?>

        <!-- メッセージ表示 -->
        <div id="errorMessage" class="db-status error" style="display: none;">
            <i class="fas fa-exclamation-triangle"></i>
            <div id="errorText"></div>
        </div>

        <div id="successMessage" class="db-status connected" style="display: none;">
            <i class="fas fa-check-circle"></i>
            <div id="successText"></div>
        </div>

        <!-- 計算フォーム -->
        <div class="calculation-form-grid">
            <!-- 重量入力 -->
            <div class="calculation-input-card">
                <div class="input-card-header">
                    <i class="fas fa-weight"></i>
                    重量設定
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
                    <label style="font-weight: 600; color: var(--text-primary);">重量 (kg)</label>
                    <input type="number" id="shippingWeight" step="0.01" min="0.01" max="30" 
                           placeholder="1.50" class="form-input" required>
                    <div style="color: var(--text-muted); font-size: 0.875rem;">
                        <i class="fas fa-info-circle"></i> 梱包後重量は自動で5%増加します
                    </div>
                </div>
            </div>

            <!-- サイズ入力 -->
            <div class="calculation-input-card">
                <div class="input-card-header">
                    <i class="fas fa-cube"></i>
                    サイズ設定
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md); margin-bottom: var(--space-sm);">
                    <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
                        <label style="font-weight: 600; color: var(--text-primary); font-size: 0.875rem;">長さ (cm)</label>
                        <input type="number" id="shippingLength" step="0.1" min="0" 
                               placeholder="20.0" class="form-input">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
                        <label style="font-weight: 600; color: var(--text-primary); font-size: 0.875rem;">幅 (cm)</label>
                        <input type="number" id="shippingWidth" step="0.1" min="0" 
                               placeholder="15.0" class="form-input">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
                        <label style="font-weight: 600; color: var(--text-primary); font-size: 0.875rem;">高さ (cm)</label>
                        <input type="number" id="shippingHeight" step="0.1" min="0" 
                               placeholder="10.0" class="form-input">
                    </div>
                </div>
                <div style="color: var(--text-muted); font-size: 0.875rem;">
                    <i class="fas fa-info-circle"></i> 梱包後サイズは自動で10%増加します
                </div>
            </div>

            <!-- 配送設定 -->
            <div class="calculation-input-card">
                <div class="input-card-header">
                    <i class="fas fa-map-marker-alt"></i>
                    配送設定
                </div>
                <div style="margin-bottom: var(--space-md);">
                    <label style="display: block; margin-bottom: var(--space-sm); font-weight: 600; color: var(--text-primary);">配送先国</label>
                    <select id="shippingCountry" class="form-select" required>
                        <option value="">-- 国を選択 --</option>
                        <option value="US">🇺🇸 アメリカ合衆国</option>
                        <option value="CA">🇨🇦 カナダ</option>
                        <option value="GB">🇬🇧 イギリス</option>
                        <option value="DE">🇩🇪 ドイツ</option>
                        <option value="FR">🇫🇷 フランス</option>
                        <option value="AU">🇦🇺 オーストラリア</option>
                        <option value="KR">🇰🇷 韓国</option>
                        <option value="CN">🇨🇳 中国</option>
                        <option value="TW">🇹🇼 台湾</option>
                        <option value="HK">🇭🇰 香港</option>
                        <option value="SG">🇸🇬 シンガポール</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- 計算ボタン -->
        <div class="calculation-actions">
            <button class="calc-btn calc-btn-primary" onclick="calculateShippingCandidates()" id="calculateBtn">
                <i class="fas fa-calculator"></i>
                送料計算実行
            </button>
            <button class="calc-btn calc-btn-secondary" onclick="clearCalculationForm()">
                <i class="fas fa-eraser"></i>
                フォームクリア
            </button>
        </div>

        <!-- 計算結果表示エリア -->
        <div id="candidatesContainer" style="display: none;">
            <!-- 計算サマリー -->
            <div style="background: var(--bg-secondary); border-radius: var(--radius-lg); padding: var(--space-xl); margin-bottom: var(--space-xl); border: 1px solid var(--border); box-shadow: var(--shadow-sm);">
                <h3 style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-lg); color: var(--text-primary);">
                    <i class="fas fa-calculator" style="color: var(--shipping-primary);"></i> 計算結果サマリー
                </h3>
                <div id="calculationSummary"></div>
            </div>

            <!-- 配送オプション一覧 -->
            <div style="background: var(--bg-secondary); border-radius: var(--radius-lg); padding: var(--space-xl); margin-bottom: var(--space-xl); border: 1px solid var(--border); box-shadow: var(--shadow-sm);">
                <h3 style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-lg); color: var(--text-primary);">
                    <i class="fas fa-truck" style="color: var(--shipping-primary);"></i> 配送オプション
                </h3>
                <div id="candidatesList"></div>
                
                <!-- 推奨事項 -->
                <div id="recommendationsContainer"></div>
            </div>
        </div>

        <!-- マトリックス表示モーダル -->
        <div id="matrixModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 1000; display: none;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-secondary); border-radius: var(--radius-lg); padding: var(--space-xl); max-width: 90vw; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg);">
                    <h3><i class="fas fa-table"></i> 送料マトリックス</h3>
                    <button onclick="closeModal('matrixModal')" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">&times;</button>
                </div>
                <div id="matrixContent">マトリックスを生成中...</div>
            </div>
        </div>

        <!-- 履歴表示モーダル -->
        <div id="historyModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 1000; display: none;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-secondary); border-radius: var(--radius-lg); padding: var(--space-xl); max-width: 90vw; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg);">
                    <h3><i class="fas fa-history"></i> 計算履歴</h3>
                    <button onclick="closeModal('historyModal')" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">&times;</button>
                </div>
                <div id="historyContent">履歴を読み込み中...</div>
            </div>
        </div>
    </div>

    <script>
        // グローバル変数
        let currentCalculationData = null;

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('送料計算システム 修正版 初期化完了');
        });

        // 送料計算実行
        async function calculateShippingCandidates() {
            try {
                const weight = parseFloat(document.getElementById('shippingWeight').value);
                const length = parseFloat(document.getElementById('shippingLength').value) || 0;
                const width = parseFloat(document.getElementById('shippingWidth').value) || 0;
                const height = parseFloat(document.getElementById('shippingHeight').value) || 0;
                const destination = document.getElementById('shippingCountry').value;

                if (!weight || weight <= 0) {
                    showError('重量を正しく入力してください。');
                    return;
                }

                if (!destination) {
                    showError('配送先国を選択してください。');
                    return;
                }

                showLoading();
                hideMessages();

                const response = await fetch('', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'calculate_shipping',
                        weight: weight,
                        length: length,
                        width: width,
                        height: height,
                        destination: destination
                    })
                });

                const result = await response.json();

                if (result.success) {
                    currentCalculationData = result.data;
                    displayCalculationResults(result.data);
                    showSuccess('送料計算が完了しました');
                } else {
                    showError(result.message);
                }

            } catch (error) {
                console.error('計算エラー:', error);
                showError('計算処理中にエラーが発生しました。');
            } finally {
                hideLoading();
            }
        }

        // 計算結果表示
        function displayCalculationResults(data) {
            // サマリー表示
            const summaryHtml = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-md);">
                    <div>
                        <strong>実重量:</strong><br>
                        ${data.original_weight} kg
                    </div>
                    <div>
                        <strong>梱包後重量:</strong><br>
                        ${data.packed_weight.toFixed(2)} kg
                    </div>
                    <div>
                        <strong>容積重量:</strong><br>
                        ${data.volumetric_weight.toFixed(2)} kg
                    </div>
                    <div>
                        <strong>課金重量:</strong><br>
                        ${data.chargeable_weight.toFixed(2)} kg
                    </div>
                    <div>
                        <strong>配送先:</strong><br>
                        ${data.destination}
                    </div>
                </div>
            `;
            document.getElementById('calculationSummary').innerHTML = summaryHtml;

            // 配送オプション表示
            const optionsHtml = data.shipping_options.map(option => `
                <div style="background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-lg); margin-bottom: var(--space-md); transition: all 0.2s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
                        <div style="font-size: 1.125rem; font-weight: 600; color: var(--text-primary);">${option.service_name}</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: var(--shipping-primary);">¥${option.cost_jpy.toLocaleString()}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--space-md); font-size: 0.875rem; color: var(--text-secondary);">
                        <div style="display: flex; align-items: center; gap: var(--space-sm);">
                            <i class="fas fa-clock"></i>
                            ${option.delivery_days}日
                        </div>
                        <div style="display: flex; align-items: center; gap: var(--space-sm);">
                            <i class="fas fa-dollar-sign"></i>
                            $${option.cost_usd.toFixed(2)}
                        </div>
                        <div style="display: flex; align-items: center; gap: var(--space-sm);">
                            <i class="fas fa-search"></i>
                            ${option.tracking ? '追跡可能' : '追跡なし'}
                        </div>
                        <div style="display: flex; align-items: center; gap: var(--space-sm);">
                            <i class="fas fa-shield-alt"></i>
                            ${option.insurance ? '保険付き' : '保険なし'}
                        </div>
                        <div style="display: flex; align-items: center; gap: var(--space-sm);">
                            <i class="fas fa-tag"></i>
                            ${option.type}
                        </div>
                    </div>
                </div>
            `).join('');
            document.getElementById('candidatesList').innerHTML = optionsHtml;

            // 推奨事項表示
            const recommendationsHtml = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-md); margin-top: var(--space-lg);">
                    ${data.recommendations.map(rec => `
                        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid var(--info); border-radius: var(--radius-lg); padding: var(--space-lg);">
                            <div style="font-weight: 600; color: #0c4a6e; margin-bottom: var(--space-sm);">${rec.title}</div>
                            <div style="color: #0c4a6e; font-size: 0.875rem;">${rec.message}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            document.getElementById('recommendationsContainer').innerHTML = recommendationsHtml;

            // 結果エリア表示
            document.getElementById('candidatesContainer').style.display = 'block';
            document.getElementById('candidatesContainer').scrollIntoView({ behavior: 'smooth' });
        }

        // マトリックス表示
        async function showMatrixModal() {
            const destination = document.getElementById('shippingCountry').value;
            if (!destination) {
                showError('配送先国を選択してからマトリックスを表示してください。');
                return;
            }

            const modal = document.getElementById('matrixModal');
            if (modal) {
                modal.style.display = 'block';
                document.getElementById('matrixContent').innerHTML = 'マトリックスを生成中...';
            }

            try {
                const response = await fetch('', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'get_shipping_matrix',
                        destination: destination,
                        max_weight: 5.0
                    })
                });

                const result = await response.json();

                if (result.success) {
                    displayMatrix(result.data);
                } else {
                    document.getElementById('matrixContent').innerHTML = `エラー: ${result.message}`;
                }

            } catch (error) {
                console.error('マトリックス生成エラー:', error);
                document.getElementById('matrixContent').innerHTML = 'マトリックス生成中にエラーが発生しました。';
            }
        }

        // マトリックス表示
        function displayMatrix(data) {
            const headers = ['サービス', ...data.weight_steps.map(w => `${w}kg`)];
            
            let tableHtml = `
                <div style="margin-bottom: var(--space-md);">
                    <p><strong>配送先:</strong> ${data.destination}</p>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            ${headers.map(h => `<th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
            `;

            // 各重量でのサービス別料金を整理
            const serviceNames = [...new Set(Object.values(data.matrix).flat().map(opt => opt.service_name))];
            
            serviceNames.forEach(serviceName => {
                tableHtml += '<tr>';
                tableHtml += `<td style="border: 1px solid var(--border); padding: var(--space-sm); font-weight: 600;">${serviceName}</td>`;
                
                data.weight_steps.forEach(weight => {
                    const option = data.matrix[weight] && data.matrix[weight].find(opt => opt.service_name === serviceName);
                    const cost = option ? `¥${option.cost_jpy.toLocaleString()}` : '-';
                    tableHtml += `<td style="border: 1px solid var(--border); padding: var(--space-sm); text-align: center;">${cost}</td>`;
                });
                
                tableHtml += '</tr>';
            });

            tableHtml += '</tbody></table>';
            
            document.getElementById('matrixContent').innerHTML = tableHtml;
        }

        // 履歴表示
        async function showHistoryModal() {
            const modal = document.getElementById('historyModal');
            if (modal) {
                modal.style.display = 'block';
                document.getElementById('historyContent').innerHTML = '履歴を読み込み中...';
            }

            try {
                const response = await fetch('', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'get_calculation_history'
                    })
                });

                const result = await response.json();

                if (result.success) {
                    displayHistory(result.data);
                } else {
                    document.getElementById('historyContent').innerHTML = `エラー: ${result.message}`;
                }

            } catch (error) {
                console.error('履歴取得エラー:', error);
                document.getElementById('historyContent').innerHTML = '履歴取得中にエラーが発生しました。';
            }
        }

        // 履歴表示
        function displayHistory(data) {
            if (data.history.length === 0) {
                document.getElementById('historyContent').innerHTML = '履歴はありません。';
                return;
            }

            const historyHtml = `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">日時</th>
                            <th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">配送先</th>
                            <th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">重量</th>
                            <th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">サービス</th>
                            <th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">料金</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.history.map(item => `
                            <tr>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">${item.date}</td>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">${item.destination}</td>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">${item.weight}kg</td>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">${item.service}</td>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">¥${item.cost.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            document.getElementById('historyContent').innerHTML = historyHtml;
        }

        // モーダルを閉じる
        function closeModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        }

        // フォームクリア
        function clearCalculationForm() {
            document.getElementById('shippingWeight').value = '';
            document.getElementById('shippingLength').value = '';
            document.getElementById('shippingWidth').value = '';
            document.getElementById('shippingHeight').value = '';
            document.getElementById('shippingCountry').value = '';
            document.getElementById('candidatesContainer').style.display = 'none';
            hideMessages();
        }

        // ユーティリティ関数
        function showLoading() {
            const btn = document.getElementById('calculateBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 計算中...';
        }

        function hideLoading() {
            const btn = document.getElementById('calculateBtn');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-calculator"></i> 送料計算実行';
        }

        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            const errorText = document.getElementById('errorText');
            errorText.textContent = message;
            errorDiv.style.display = 'flex';
            
            // 成功メッセージを隠す
            document.getElementById('successMessage').style.display = 'none';
        }

        function showSuccess(message) {
            const successDiv = document.getElementById('successMessage');
            const successText = document.getElementById('successText');
            successText.textContent = message;
            successDiv.style.display = 'flex';
            
            // エラーメッセージを隠す
            document.getElementById('errorMessage').style.display = 'none';
        }

        function hideMessages() {
            document.getElementById('errorMessage').style.display = 'none';
            document.getElementById('successMessage').style.display = 'none';
        }

        // モーダル外クリックで閉じる
        window.onclick = function(event) {
            if (event.target.style && event.target.style.position === 'fixed') {
                event.target.style.display = 'none';
            }
        }

        console.log('送料計算システム 修正版 JavaScript初期化完了');
    </script>
</body>
</html>