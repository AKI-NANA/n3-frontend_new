<?php
/**
 * 送料計算システム - 完全実装版
 * サイズ入力（3辺）+ データベース連携 + 正確な計算
 */

// エラー表示設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// データベース接続
function getDatabaseConnection() {
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        return $pdo;
    } catch (PDOException $e) {
        return null;
    }
}

// 初期データ取得
$db_connected = false;
$db_error = null;
$initial_data = [
    'total_records' => 0,
    'ems_records' => 0,
    'countries' => 0,
    'db_status' => 'disconnected'
];

try {
    $pdo = getDatabaseConnection();
    if ($pdo) {
        $db_connected = true;
        
        // 統計情報取得
        $stmt = $pdo->query("SELECT COUNT(*) FROM shipping_service_rates");
        $initial_data['total_records'] = $stmt->fetchColumn();
        
        $stmt = $pdo->query("SELECT COUNT(*) FROM shipping_service_rates WHERE company_code = 'JPPOST' AND service_code = 'EMS'");
        $initial_data['ems_records'] = $stmt->fetchColumn();
        
        $stmt = $pdo->query("SELECT COUNT(DISTINCT country_code) FROM shipping_service_rates");
        $initial_data['countries'] = $stmt->fetchColumn();
        
        $initial_data['db_status'] = 'connected';
    }
} catch (Exception $e) {
    $db_error = $e->getMessage();
}

// AJAX API処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && 
    strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
    
    header('Content-Type: application/json; charset=utf-8');
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    try {
        switch ($action) {
            case 'calculate_shipping':
                $result = calculateShippingWithDatabase($pdo, $input);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
                
            case 'get_correction_settings':
                $result = getCorrectionSettings($pdo);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
                
            case 'get_countries':
                $result = getCountriesFromDatabase($pdo);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
                
            default:
                echo json_encode(['success' => false, 'error' => '不明なアクション']);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    
    exit;
}

// データベースから配送先国取得
function getCountriesFromDatabase($pdo) {
    if (!$pdo) {
        return getDefaultCountries();
    }
    
    try {
        $stmt = $pdo->query("
            SELECT DISTINCT country_code, COUNT(*) as service_count 
            FROM shipping_service_rates 
            GROUP BY country_code 
            ORDER BY country_code
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return getDefaultCountries();
    }
}

function getDefaultCountries() {
// 補正設定取得
function getCorrectionSettings($pdo) {
    if (!$pdo) {
        return getDefaultCorrectionSettings();
    }
    
    try {
        $stmt = $pdo->query("
            SELECT id, setting_name, description, is_default,
                   weight_correction_value, 
                   length_correction_value, width_correction_value, height_correction_value,
                   uniform_size_correction, uniform_size_correction_value,
                   product_category
            FROM size_correction_settings 
            WHERE is_active = true 
            ORDER BY is_default DESC, priority_order ASC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return getDefaultCorrectionSettings();
    }
}

function getDefaultCorrectionSettings() {
    return [
        [
            'id' => 'default',
            'setting_name' => '標準梱包設定',
            'description' => '重量5%、各辺10%の標準補正',
            'is_default' => true,
            'weight_correction_value' => 5.0,
            'length_correction_value' => 10.0,
            'width_correction_value' => 10.0,
            'height_correction_value' => 10.0,
            'uniform_size_correction' => false,
            'uniform_size_correction_value' => 10.0,
            'product_category' => null
        ]
    ];
}

// サイズ補正適用
function applySizeCorrection($pdo, $values, $setting_id = null) {
    // 設定取得
    if ($setting_id && $pdo) {
        $stmt = $pdo->prepare("SELECT * FROM size_correction_settings WHERE id = ? AND is_active = true");
        $stmt->execute([$setting_id]);
        $setting = $stmt->fetch(PDO::FETCH_ASSOC);
    } else if ($pdo) {
        // デフォルト設定を使用
        $stmt = $pdo->query("SELECT * FROM size_correction_settings WHERE is_default = true AND is_active = true LIMIT 1");
        $setting = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    if (!$setting) {
        // フォールバック設定
        $setting = [
            'setting_name' => '標準梱包設定（フォールバック）',
            'weight_correction_type' => 'percentage',
            'weight_correction_value' => 5.0,
            'length_correction_type' => 'percentage',
            'length_correction_value' => 10.0,
            'width_correction_type' => 'percentage',
            'width_correction_value' => 10.0,
            'height_correction_type' => 'percentage',
            'height_correction_value' => 10.0,
            'uniform_size_correction' => false
        ];
    }
    
    $original_weight = floatval($values['weight'] ?? 0);
    $original_length = floatval($values['length'] ?? 0);
    $original_width = floatval($values['width'] ?? 0);
    $original_height = floatval($values['height'] ?? 0);
    
    // 重量補正
    $corrected_weight = applyCorrection(
        $original_weight, 
        $setting['weight_correction_type'] ?? 'percentage', 
        $setting['weight_correction_value'] ?? 5.0
    );
    
    // サイズ補正（一括または個別）
    if ($setting['uniform_size_correction'] ?? false) {
        $corrected_length = applyCorrection($original_length, 'percentage', $setting['uniform_size_correction_value'] ?? 10.0);
        $corrected_width = applyCorrection($original_width, 'percentage', $setting['uniform_size_correction_value'] ?? 10.0);
        $corrected_height = applyCorrection($original_height, 'percentage', $setting['uniform_size_correction_value'] ?? 10.0);
    } else {
        $corrected_length = applyCorrection($original_length, 'percentage', $setting['length_correction_value'] ?? 10.0);
        $corrected_width = applyCorrection($original_width, 'percentage', $setting['width_correction_value'] ?? 10.0);
        $corrected_height = applyCorrection($original_height, 'percentage', $setting['height_correction_value'] ?? 10.0);
    }
    
    // 容積重量計算
    $volumetric_weight = 0;
    if ($corrected_length > 0 && $corrected_width > 0 && $corrected_height > 0) {
        $volumetric_weight = ($corrected_length * $corrected_width * $corrected_height) / 5000;
    }
    
    // 課金重量
    $chargeable_weight = max($corrected_weight, $volumetric_weight);
    
    return [
        'setting_used' => $setting['setting_name'],
        'original' => [
            'weight' => $original_weight,
            'length' => $original_length,
            'width' => $original_width,
            'height' => $original_height
        ],
        'corrected' => [
            'weight' => round($corrected_weight, 3),
            'length' => round($corrected_length, 2),
            'width' => round($corrected_width, 2),
            'height' => round($corrected_height, 2)
        ],
        'calculated' => [
            'volumetric_weight' => round($volumetric_weight, 3),
            'chargeable_weight' => round($chargeable_weight, 3)
        ],
        'corrections_applied' => [
            'weight' => sprintf('%+.1f%%', (($corrected_weight - $original_weight) / max($original_weight, 0.001)) * 100),
            'length' => sprintf('%+.1f%%', (($corrected_length - $original_length) / max($original_length, 0.001)) * 100),
            'width' => sprintf('%+.1f%%', (($corrected_width - $original_width) / max($original_width, 0.001)) * 100),
            'height' => sprintf('%+.1f%%', (($corrected_height - $original_height) / max($original_height, 0.001)) * 100)
        ]
    ];
}

// 補正値適用関数
function applyCorrection($original_value, $correction_type, $correction_value) {
    switch ($correction_type) {
        case 'percentage':
            return $original_value * (1 + ($correction_value / 100));
        case 'fixed':
            return $original_value + $correction_value;
        case 'formula':
            // 将来的な拡張用
            return $original_value * 1.1; // デフォルト10%増
        default:
            return $original_value;
    }
}

    return [
        ['country_code' => 'US', 'service_count' => 5],
        ['country_code' => 'CA', 'service_count' => 4],
        ['country_code' => 'GB', 'service_count' => 4],
        ['country_code' => 'AU', 'service_count' => 4],
        ['country_code' => 'CN', 'service_count' => 3],
        ['country_code' => 'KR', 'service_count' => 3],
    ];
}

// データベース連携送料計算（サイズ補正統合版）
function calculateShippingWithDatabase($pdo, $input) {
    $weight = floatval($input['weight'] ?? 0);
    $length = floatval($input['length'] ?? 0);
    $width = floatval($input['width'] ?? 0);
    $height = floatval($input['height'] ?? 0);
    $destination = strtoupper($input['destination'] ?? '');
    $correction_setting_id = $input['correction_setting_id'] ?? null;
    
    if ($weight <= 0 || empty($destination)) {
        throw new Exception('重量と配送先国は必須です');
    }
    
    // サイズ補正適用
    $correction_result = applySizeCorrection($pdo, [
        'weight' => $weight,
        'length' => $length,
        'width' => $width,
        'height' => $height
    ], $correction_setting_id);
    
    $packed_weight = $correction_result['corrected']['weight'];
    $packed_length = $correction_result['corrected']['length'];
    $packed_width = $correction_result['corrected']['width'];
    $packed_height = $correction_result['corrected']['height'];
    
    $volumetric_weight = $correction_result['calculated']['volumetric_weight'];
    $chargeable_weight = $correction_result['calculated']['chargeable_weight'];
    
    // データベースから配送オプション取得
    $shipping_options = [];
    
    if ($pdo) {
        $shipping_options = getShippingOptionsFromDatabase($pdo, $destination, $chargeable_weight);
    }
    
    // モックデータも追加
    $mock_options = getMockShippingOptions($destination, $chargeable_weight);
    $shipping_options = array_merge($shipping_options, $mock_options);
    
    // 料金順でソート
    usort($shipping_options, function($a, $b) {
        return $a['cost_jpy'] <=> $b['cost_jpy'];
    });
    
    // 推奨事項生成
    $recommendations = generateRecommendations($shipping_options);
    
    return [
        'original_weight' => $weight,
        'original_dimensions' => [
            'length' => $length,
            'width' => $width, 
            'height' => $height
        ],
        'packed_weight' => $packed_weight,
        'packed_dimensions' => [
            'length' => $packed_length,
            'width' => $packed_width,
            'height' => $packed_height
        ],
        'volumetric_weight' => $volumetric_weight,
        'chargeable_weight' => $chargeable_weight,
        'destination' => $destination,
        'database_used' => $pdo !== null,
        'correction_info' => [
            'setting_used' => $correction_result['setting_used'],
            'corrections_applied' => $correction_result['corrections_applied']
        ],
        'shipping_options' => $shipping_options,
        'recommendations' => $recommendations
    ];
}

// データベースから配送オプション取得
function getShippingOptionsFromDatabase($pdo, $destination, $weight) {
    $options = [];
    $weight_grams = $weight * 1000;
    
    try {
        $stmt = $pdo->prepare("
            SELECT 
                company_code,
                service_code,
                carrier_code,
                weight_from_g,
                weight_to_g,
                price_jpy,
                zone_code,
                data_source
            FROM shipping_service_rates 
            WHERE country_code = ? 
            AND weight_from_g < ? 
            AND weight_to_g >= ?
            ORDER BY price_jpy ASC
            LIMIT 10
        ");
        
        $stmt->execute([$destination, $weight_grams, $weight_grams]);
        $rates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($rates as $rate) {
            $options[] = [
                'service_name' => getServiceName($rate['company_code'], $rate['service_code']),
                'service_code' => $rate['service_code'],
                'company_code' => $rate['company_code'],
                'cost_jpy' => intval($rate['price_jpy']),
                'cost_usd' => round(intval($rate['price_jpy']) / 150, 2),
                'delivery_days' => getDeliveryDays($rate['company_code'], $rate['service_code']),
                'tracking' => getTrackingInfo($rate['service_code']),
                'insurance' => getInsuranceInfo($rate['service_code']),
                'type' => getServiceType($rate['service_code']),
                'weight_range' => $rate['weight_from_g'] . 'g-' . $rate['weight_to_g'] . 'g',
                'data_source' => 'database'
            ];
        }
        
    } catch (Exception $e) {
        // データベースエラーの場合は空の配列を返す
    }
    
    return $options;
}

function getServiceName($company, $service) {
    $names = [
        'JPPOST' => [
            'EMS' => 'EMS（国際スピード郵便）',
            'AIRMAIL' => 'エアメール',
            'SAL' => 'SAL便'
        ]
    ];
    
    return $names[$company][$service] ?? $service;
}

function getDeliveryDays($company, $service) {
    if ($company === 'JPPOST' && $service === 'EMS') {
        return '3-6';
    }
    return '5-10';
}

function getTrackingInfo($service) {
    return in_array($service, ['EMS']);
}

function getInsuranceInfo($service) {
    return in_array($service, ['EMS']);
}

function getServiceType($service) {
    if (strpos($service, 'EXPRESS') !== false || $service === 'EMS') {
        return 'express';
    }
    return 'standard';
}

// モック配送オプション
function getMockShippingOptions($destination, $weight) {
    return [
        [
            'service_name' => 'DHL Express（モック）',
            'service_code' => 'DHL_EXPRESS',
            'company_code' => 'ELOGI',
            'cost_jpy' => intval(2800 + ($weight * 600)),
            'cost_usd' => round((2800 + ($weight * 600)) / 150, 2),
            'delivery_days' => '1-3',
            'tracking' => true,
            'insurance' => true,
            'type' => 'express',
            'data_source' => 'mock'
        ]
    ];
}

function generateRecommendations($options, $correction_result = null) {
    if (empty($options)) {
        return [['title' => '⚠️ オプションなし', 'message' => '該当する配送オプションがありません']];
    }
    
    $recommendations = [];
    
    // サイズ補正情報
    if ($correction_result) {
        $recommendations[] = [
            'title' => '📏 サイズ補正適用',
            'message' => '設定: ' . $correction_result['setting_used'] . ' | 重量' . $correction_result['corrections_applied']['weight']
        ];
    }
    
    // 最安オプション
    $cheapest = $options[0];
    $recommendations[] = [
        'title' => '💰 最安オプション',
        'message' => $cheapest['service_name'] . ' - ¥' . number_format($cheapest['cost_jpy']) . ' (' . $cheapest['delivery_days'] . '日)'
    ];
    
    // データベース推奨
    $db_option = null;
    foreach ($options as $option) {
        if ($option['data_source'] === 'database') {
            $db_option = $option;
            break;
        }
    }
    
    if ($db_option) {
        $recommendations[] = [
            'title' => '📊 データベース推奨',
            'message' => $db_option['service_name'] . ' - ¥' . number_format($db_option['cost_jpy']) . ' (実データ)'
        ];
    }
    
    return $recommendations;
}

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>送料計算システム - 完全実装版（サイズ入力+DB連携）</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background: #f8fafc;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: linear-gradient(135deg, #059669, #10b981);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
        }

        .db-status {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 10px;
        }

        .db-connected { background: #10b981; color: white; }
        .db-disconnected { background: #ef4444; color: white; }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .form-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .form-card h3 {
            margin-bottom: 20px;
            color: #1e293b;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .form-group {
            margin-bottom: 15px;
        }

        .form-label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #374151;
            font-size: 14px;
        }

        .form-input, .form-select {
            width: 100%;
            padding: 12px;
            border: 2px solid #d1d5db;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.2s;
        }

        .form-input:focus, .form-select:focus {
            outline: none;
            border-color: #059669;
        }

        .size-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }

        .btn {
            padding: 15px 30px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-primary {
            background: linear-gradient(135deg, #059669, #10b981);
            color: white;
            box-shadow: 0 4px 12px rgba(5,150,105,0.3);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(5,150,105,0.4);
        }

        .btn-secondary {
            background: #f1f5f9;
            color: #475569;
            border: 2px solid #e2e8f0;
        }

        .text-center {
            text-align: center;
        }

        .results {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-top: 30px;
            border: 1px solid #e2e8f0;
            display: none;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }

        .summary-item {
            text-align: center;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }

        .summary-value {
            font-size: 18px;
            font-weight: 700;
            color: #059669;
        }

        .summary-label {
            font-size: 12px;
            color: #64748b;
            margin-top: 5px;
        }

        .option-card {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            position: relative;
        }

        .option-card.database-source {
            border-left: 4px solid #10b981;
        }

        .option-card.mock-source {
            border-left: 4px solid #f59e0b;
        }

        .option-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .option-name {
            font-size: 18px;
            font-weight: 600;
        }

        .option-cost {
            font-size: 20px;
            font-weight: 700;
            color: #059669;
        }

        .option-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 10px;
        }

        .option-detail {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #64748b;
        }

        .data-source-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 12px;
            font-weight: 600;
        }

        .badge-database {
            background: #10b981;
            color: white;
        }

        .badge-mock {
            background: #f59e0b;
            color: white;
        }

        .recommendations {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }

        .recommendation {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid #0ea5e9;
            border-radius: 8px;
            padding: 15px;
        }

        .recommendation-title {
            font-weight: 600;
            color: #0c4a6e;
            margin-bottom: 5px;
        }

        .recommendation-message {
            color: #0369a1;
            font-size: 14px;
        }
        
        .correction-info {
            margin: 20px 0;
        }
        
        .correction-info h4 {
            margin-bottom: 15px;
            color: #374151;
            display: flex;
            align-items: center;
            gap: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-shipping-fast"></i> 送料計算システム - 完全実装版</h1>
            <p>サイズ入力（3辺）+ データベース連携 + 正確な計算 + 容積重量対応</p>
            <div class="db-status <?= $db_connected ? 'db-connected' : 'db-disconnected' ?>">
                <?php if ($db_connected): ?>
                    ✅ データベース接続OK | 総データ: <?= number_format($initial_data['total_records']) ?>件 | EMS: <?= number_format($initial_data['ems_records']) ?>件 | 対応国: <?= $initial_data['countries'] ?>国
                <?php else: ?>
                    ❌ データベース接続エラー<?= isset($db_error) ? ': ' . htmlspecialchars($db_error) : '' ?> （モックデータで動作）
                <?php endif; ?>
            </div>
        </div>

        <div class="form-grid">
            <!-- 重量入力 -->
            <div class="form-card">
                <h3><i class="fas fa-weight"></i> 重量設定</h3>
                <div class="form-group">
                    <label class="form-label">重量 (kg)</label>
                    <input type="number" id="shippingWeight" step="0.01" min="0.01" max="30" 
                           placeholder="1.50" class="form-input" required>
                    <small style="color: #64748b;">梱包後重量は自動で5%増加します</small>
                </div>
            </div>

            <!-- サイズ入力（3辺） -->
            <div class="form-card">
                <h3><i class="fas fa-cube"></i> サイズ設定（3辺）</h3>
                <div class="size-grid">
                    <div class="form-group">
                        <label class="form-label">長さ (cm)</label>
                        <input type="number" id="shippingLength" step="0.1" min="0" 
                               placeholder="20.0" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">幅 (cm)</label>
                        <input type="number" id="shippingWidth" step="0.1" min="0" 
                               placeholder="15.0" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">高さ (cm)</label>
                        <input type="number" id="shippingHeight" step="0.1" min="0" 
                               placeholder="10.0" class="form-input">
                    </div>
                </div>
                <small style="color: #64748b;">梱包後サイズは自動で10%増加、容積重量も自動計算します</small>
            </div>

            <!-- 配送設定 -->
            <div class="form-card">
                <h3><i class="fas fa-map-marker-alt"></i> 配送設定</h3>
                <div class="form-group">
                    <label class="form-label">配送先国</label>
                    <select id="shippingCountry" class="form-select" required>
                        <option value="">-- 国を選択 --</option>
                        <!-- JavaScriptで動的に読み込み -->
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">サイズ補正設定</label>
                    <select id="correctionSetting" class="form-select">
                        <option value="">デフォルト設定</option>
                        <!-- JavaScriptで動的に読み込み -->
                    </select>
                    <small style="color: #64748b;">梱包時のサイズ・重量補正を選択</small>
                </div>
                <div class="form-group" style="text-align: center;">
                    <button type="button" class="btn btn-secondary" onclick="openCorrectionManager()" style="font-size: 12px; padding: 8px 16px;">
                        <i class="fas fa-cog"></i> 補正設定管理
                    </button>
                </div>
            </div>
        </div>

        <div class="text-center">
            <button class="btn btn-primary" onclick="calculateShipping()" id="calculateBtn">
                <i class="fas fa-calculator"></i> 送料計算実行
            </button>
            <button class="btn btn-secondary" onclick="clearForm()">
                <i class="fas fa-eraser"></i> クリア
            </button>
        </div>

        <div id="resultsContainer" class="results">
            <h3><i class="fas fa-calculator"></i> 計算結果サマリー</h3>
            <div id="summaryContent" class="summary-grid"></div>
                
                <div id="correctionInfo" class="correction-info" style="display: none;">
                    <h4><i class="fas fa-info-circle"></i> 補正情報</h4>
                    <div id="correctionDetails"></div>
                </div>
            
            <h3><i class="fas fa-truck"></i> 配送オプション</h3>
            <div id="optionsContent"></div>

            <h3><i class="fas fa-star"></i> 推奨事項</h3>
            <div id="recommendationsContent" class="recommendations"></div>
        </div>
    </div>

    <script>
        // PHP から JavaScript に安全にデータを渡す
        var dbConnected = <?= json_encode($db_connected) ?>;
        var initialData = <?= json_encode($initial_data) ?>;
        
        console.log('送料計算システム完全実装版 初期化完了');
        console.log('データベース接続:', dbConnected);
        console.log('統計データ:', initialData);

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            loadCountries();
            loadCorrectionSettings();
        });

        // 配送先国をデータベースから読み込み
        // 補正設定読み込み
        function loadCorrectionSettings() {
            fetch('enhanced_calculation_php_complete.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_correction_settings' })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(result) {
                if (result.success) {
                    populateCorrectionSettingsSelect(result.data);
                } else {
                    console.error('補正設定取得エラー:', result.error);
                }
            })
            .catch(function(error) {
                console.error('補正設定取得失敗:', error);
            });
        }
        
        function populateCorrectionSettingsSelect(settings) {
            var select = document.getElementById('correctionSetting');
            var html = '<option value="">デフォルト設定</option>';
            
            for (var i = 0; i < settings.length; i++) {
                var setting = settings[i];
                var description = setting.description ? ' - ' + setting.description : '';
                html += '<option value="' + setting.id + '">' + setting.setting_name + description + '</option>';
            }
            
            select.innerHTML = html;
        }
        
        function loadCountries() {
            fetch('enhanced_calculation_php_complete.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_countries' })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(result) {
                if (result.success) {
                    populateCountrySelect(result.data);
                } else {
                    console.error('国データ取得エラー:', result.error);
                    // フォールバック
                    populateDefaultCountries();
                }
            })
            .catch(function(error) {
                console.error('国データ取得失敗:', error);
                populateDefaultCountries();
            });
        }

        function populateCountrySelect(countries) {
            var select = document.getElementById('shippingCountry');
            var html = '<option value="">-- 国を選択 --</option>';
            
            var countryNames = {
                'US': '🇺🇸 アメリカ合衆国',
                'CA': '🇨🇦 カナダ', 
                'GB': '🇬🇧 イギリス',
                'DE': '🇩🇪 ドイツ',
                'AU': '🇦🇺 オーストラリア',
                'CN': '🇨🇳 中国',
                'KR': '🇰🇷 韓国',
                'TW': '🇹🇼 台湾',
                'HK': '🇭🇰 香港',
                'SG': '🇸🇬 シンガポール'
            };
            
            for (var i = 0; i < countries.length; i++) {
                var country = countries[i];
                var name = countryNames[country.country_code] || country.country_code;
                var serviceInfo = dbConnected ? ' (' + country.service_count + 'サービス)' : '';
                html += '<option value="' + country.country_code + '">' + name + serviceInfo + '</option>';
            }
            
            select.innerHTML = html;
        }

        function populateDefaultCountries() {
            var select = document.getElementById('shippingCountry');
            select.innerHTML = 
                '<option value="">-- 国を選択 --</option>' +
                '<option value="US">🇺🇸 アメリカ合衆国</option>' +
                '<option value="CA">🇨🇦 カナダ</option>' + 
                '<option value="GB">🇬🇧 イギリス</option>' +
                '<option value="AU">🇦🇺 オーストラリア</option>' +
                '<option value="CN">🇨🇳 中国</option>' +
                '<option value="KR">🇰🇷 韓国</option>';
        }

        function calculateShipping() {
            var weight = parseFloat(document.getElementById('shippingWeight').value);
            var length = parseFloat(document.getElementById('shippingLength').value) || 0;
            var width = parseFloat(document.getElementById('shippingWidth').value) || 0;
            var height = parseFloat(document.getElementById('shippingHeight').value) || 0;
            var destination = document.getElementById('shippingCountry').value;

            if (!weight || weight <= 0) {
                alert('重量を正しく入力してください。');
                return;
            }

            if (!destination) {
                alert('配送先国を選択してください。');
                return;
            }

            var btn = document.getElementById('calculateBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 計算中...';

            var correctionSettingId = document.getElementById('correctionSetting').value || null;
            
            fetch('enhanced_calculation_php_complete.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'calculate_shipping',
                    weight: weight,
                    length: length,
                    width: width,
                    height: height,
                    destination: destination,
                    correction_setting_id: correctionSettingId
                })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(result) {
                if (result.success) {
                    displayResults(result.data);
                } else {
                    alert('エラー: ' + result.error);
                }
            })
            .catch(function(error) {
                console.error('計算エラー:', error);
                alert('計算処理中にエラーが発生しました。');
            })
            .finally(function() {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-calculator"></i> 送料計算実行';
            });
        }

        function displayResults(data) {
            // サマリー表示
            var summaryHtml = 
                '<div class="summary-item">' +
                    '<div class="summary-value">' + data.original_weight + 'kg</div>' +
                    '<div class="summary-label">実重量</div>' +
                '</div>' +
                '<div class="summary-item">' +
                    '<div class="summary-value">' + data.packed_weight.toFixed(2) + 'kg</div>' +
                    '<div class="summary-label">梱包後重量</div>' +
                '</div>' +
                '<div class="summary-item">' +
                    '<div class="summary-value">' + data.volumetric_weight.toFixed(2) + 'kg</div>' +
                    '<div class="summary-label">容積重量</div>' +
                '</div>' +
                '<div class="summary-item">' +
                    '<div class="summary-value">' + data.chargeable_weight.toFixed(2) + 'kg</div>' +
                    '<div class="summary-label">課金重量</div>' +
                '</div>' +
                '<div class="summary-item">' +
                    '<div class="summary-value">' + data.destination + '</div>' +
                    '<div class="summary-label">配送先</div>' +
                '</div>' +
                '<div class="summary-item">' +
                    '<div class="summary-value">' + (data.database_used ? 'DB+Mock' : 'Mock') + '</div>' +
                    '<div class="summary-label">データソース</div>' +
                '</div>';

            document.getElementById('summaryContent').innerHTML = summaryHtml;
            
            // 補正情報表示
            if (data.correction_info) {
                var correctionHtml = 
                    '<div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border: 2px solid #0ea5e9;">' +
                        '<div style="font-weight: 600; color: #0c4a6e; margin-bottom: 10px;">使用設定: ' + data.correction_info.setting_used + '</div>' +
                        '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">' +
                            '<div style="text-align: center;">重量: ' + data.correction_info.corrections_applied.weight + '</div>' +
                            '<div style="text-align: center;">長さ: ' + data.correction_info.corrections_applied.length + '</div>' +
                            '<div style="text-align: center;">幅: ' + data.correction_info.corrections_applied.width + '</div>' +
                            '<div style="text-align: center;">高さ: ' + data.correction_info.corrections_applied.height + '</div>' +
                        '</div>' +
                    '</div>';
                document.getElementById('correctionDetails').innerHTML = correctionHtml;
                document.getElementById('correctionInfo').style.display = 'block';
            }

            // 配送オプション表示
            var optionsHtml = '';
            for (var i = 0; i < data.shipping_options.length; i++) {
                var option = data.shipping_options[i];
                var sourceClass = option.data_source === 'mock' ? 'mock-source' : 'database-source';
                var badgeClass = option.data_source === 'mock' ? 'badge-mock' : 'badge-database';
                var badgeText = option.data_source === 'mock' ? 'モック' : 'DB';
                
                optionsHtml += 
                    '<div class="option-card ' + sourceClass + '">' +
                        '<div class="data-source-badge ' + badgeClass + '">' + badgeText + '</div>' +
                        '<div class="option-header">' +
                            '<div class="option-name">' + option.service_name + '</div>' +
                            '<div class="option-cost">¥' + option.cost_jpy.toLocaleString() + '</div>' +
                        '</div>' +
                        '<div class="option-details">' +
                            '<div class="option-detail">' +
                                '<i class="fas fa-clock"></i>' + option.delivery_days + '日' +
                            '</div>' +
                            '<div class="option-detail">' +
                                '<i class="fas fa-dollar-sign"></i>$' + option.cost_usd +
                            '</div>' +
                            '<div class="option-detail">' +
                                '<i class="fas fa-search"></i>' + (option.tracking ? '追跡可能' : '追跡なし') +
                            '</div>' +
                            '<div class="option-detail">' +
                                '<i class="fas fa-shield-alt"></i>' + (option.insurance ? '保険付き' : '保険なし') +
                            '</div>' +
                            '<div class="option-detail">' +
                                '<i class="fas fa-tag"></i>' + option.type +
                            '</div>' +
                            (option.weight_range ? 
                                '<div class="option-detail">' +
                                    '<i class="fas fa-weight"></i>' + option.weight_range +
                                '</div>' : ''
                            ) +
                        '</div>' +
                    '</div>';
            }

            document.getElementById('optionsContent').innerHTML = optionsHtml;

            // 推奨事項表示
            var recommendationsHtml = '';
            for (var j = 0; j < data.recommendations.length; j++) {
                var rec = data.recommendations[j];
                recommendationsHtml += 
                    '<div class="recommendation">' +
                        '<div class="recommendation-title">' + rec.title + '</div>' +
                        '<div class="recommendation-message">' + rec.message + '</div>' +
                    '</div>';
            }

            document.getElementById('recommendationsContent').innerHTML = recommendationsHtml;
            document.getElementById('resultsContainer').style.display = 'block';
            document.getElementById('resultsContainer').scrollIntoView({ behavior: 'smooth' });
        }

        function clearForm() {
            document.getElementById('shippingWeight').value = '';
            document.getElementById('shippingLength').value = '';
            document.getElementById('shippingWidth').value = '';
            document.getElementById('shippingHeight').value = '';
            document.getElementById('shippingCountry').value = '';
            document.getElementById('correctionSetting').value = '';
            document.getElementById('resultsContainer').style.display = 'none';
            document.getElementById('correctionInfo').style.display = 'none';
        }
        
        // 補正設定管理画面を開く
        function openCorrectionManager() {
            window.open('size_correction_manager.php', '_blank');
        }
    </script>
</body>
</html>
