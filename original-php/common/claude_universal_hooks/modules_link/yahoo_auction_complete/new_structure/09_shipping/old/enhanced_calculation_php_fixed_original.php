<?php
/**
 * 送料計算システム - スタンドアロン版
 * 依存ファイルなしで動作する完全版
 */

// エラー表示設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// データベース接続設定
$host = 'localhost';
$dbname = 'nagano3_db';
$username = 'postgres';
$password = 'Kn240914';

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    $pdo = null;
    $db_error = $e->getMessage();
}

// JSON APIリクエスト処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && 
    strpos(isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '', 'application/json') !== false) {
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = isset($input['action']) ? $input['action'] : '';
    
    header('Content-Type: application/json; charset=UTF-8');
    
    switch ($action) {
        case 'calculate_shipping':
            handleShippingCalculation($input);
            break;
            
        case 'get_shipping_matrix':
            handleGetShippingMatrix($input);
            break;
            
        case 'get_calculation_history':
            handleGetCalculationHistory($input);
            break;
            
        default:
            sendJsonResponse(null, false, '不明なアクション: ' . $action);
    }
    exit;
}

/**
 * 送料計算処理
 */
function handleShippingCalculation($input) {
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
        
        // 配送オプション計算
        $shippingOptions = calculateShippingOptions($destination, $chargeableWeight);
        
        $result = array(
            'original_weight' => $weight,
            'packed_weight' => $packedWeight,
            'volumetric_weight' => $volumetricWeight,
            'chargeable_weight' => $chargeableWeight,
            'destination' => $destination,
            'shipping_options' => $shippingOptions,
            'recommendations' => generateRecommendations($shippingOptions)
        );
        
        sendJsonResponse($result, true, '送料計算が完了しました');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, '計算処理エラー: ' . $e->getMessage());
    }
}

/**
 * 配送オプション計算
 */
function calculateShippingOptions($destination, $weight) {
    $zone = getShippingZone($destination);
    
    // 基本料金表（日本郵便ベース）
    $services = array(
        'ems' => array(
            'name' => 'EMS（国際スピード郵便）',
            'type' => 'express',
            'tracking' => true,
            'insurance' => true,
            'rates' => array(
                'zone1' => array('base' => 1400, 'per_500g' => 200, 'delivery_days' => '2-4'),
                'zone2' => array('base' => 1400, 'per_500g' => 350, 'delivery_days' => '3-6'),
                'zone3' => array('base' => 1400, 'per_500g' => 500, 'delivery_days' => '3-6')
            )
        ),
        'airmail' => array(
            'name' => 'エアメール',
            'type' => 'standard',
            'tracking' => false,
            'insurance' => false,
            'rates' => array(
                'zone1' => array('base' => 1000, 'per_500g' => 150, 'delivery_days' => '5-9'),
                'zone2' => array('base' => 1000, 'per_500g' => 250, 'delivery_days' => '6-13'),
                'zone3' => array('base' => 1000, 'per_500g' => 350, 'delivery_days' => '6-13')
            )
        ),
        'sal' => array(
            'name' => 'SAL便',
            'type' => 'economy',
            'tracking' => false,
            'insurance' => false,
            'rates' => array(
                'zone1' => array('base' => 800, 'per_500g' => 100, 'delivery_days' => '7-14'),
                'zone2' => array('base' => 800, 'per_500g' => 150, 'delivery_days' => '10-20'),
                'zone3' => array('base' => 800, 'per_500g' => 200, 'delivery_days' => '10-20')
            )
        ),
        'dhl' => array(
            'name' => 'DHL Express',
            'type' => 'courier',
            'tracking' => true,
            'insurance' => true,
            'rates' => array(
                'zone1' => array('base' => 2800, 'per_500g' => 400, 'delivery_days' => '1-3'),
                'zone2' => array('base' => 3200, 'per_500g' => 450, 'delivery_days' => '2-4'),
                'zone3' => array('base' => 3600, 'per_500g' => 500, 'delivery_days' => '2-5')
            )
        ),
        'fedex' => array(
            'name' => 'FedEx International',
            'type' => 'courier',
            'tracking' => true,
            'insurance' => true,
            'rates' => array(
                'zone1' => array('base' => 2600, 'per_500g' => 380, 'delivery_days' => '2-4'),
                'zone2' => array('base' => 3000, 'per_500g' => 420, 'delivery_days' => '3-5'),
                'zone3' => array('base' => 3400, 'per_500g' => 480, 'delivery_days' => '3-6')
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
        $costUsd = $costJpy / 150; // 簡易換算
        
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
            'zone' => $zone
        );
    }
    
    // コスト順でソート
    usort($options, function($a, $b) {
        if ($a['cost_jpy'] == $b['cost_jpy']) {
            return 0;
        }
        return ($a['cost_jpy'] < $b['cost_jpy']) ? -1 : 1;
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
    
    return 'zone2'; // デフォルト
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
        'message' => "{$cheapest['service_name']} - ¥" . number_format($cheapest['cost_jpy']) . " ({$cheapest['delivery_days']}日)",
        'service_code' => $cheapest['service_code']
    );
    
    // 最速オプション（クーリエ系から）
    $fastest = null;
    foreach ($options as $option) {
        if ($option['type'] === 'courier') {
            $fastest = $option;
            break;
        }
    }
    
    if ($fastest) {
        $recommendations[] = array(
            'type' => 'speed',
            'title' => '⚡ 最速オプション',
            'message' => "{$fastest['service_name']} - ¥" . number_format($fastest['cost_jpy']) . " ({$fastest['delivery_days']}日)",
            'service_code' => $fastest['service_code']
        );
    }
    
    // バランス推奨（EMS優先）
    $balanced = null;
    foreach ($options as $option) {
        if ($option['service_code'] === 'ems') {
            $balanced = $option;
            break;
        }
    }
    
    if ($balanced) {
        $recommendations[] = array(
            'type' => 'balanced',
            'title' => '⚖️ バランス推奨',
            'message' => "{$balanced['service_name']} - ¥" . number_format($balanced['cost_jpy']) . " ({$balanced['delivery_days']}日)",
            'service_code' => $balanced['service_code']
        );
    }
    
    return $recommendations;
}

/**
 * 送料マトリックス取得
 */
function handleGetShippingMatrix($input) {
    try {
        $destination = strtoupper(isset($input['destination']) ? $input['destination'] : '');
        $maxWeight = floatval(isset($input['max_weight']) ? $input['max_weight'] : 5.0);
        
        if (empty($destination)) {
            sendJsonResponse(null, false, '配送先国が指定されていません');
            return;
        }
        
        $weightSteps = array(0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0);
        $matrix = array();
        
        foreach ($weightSteps as $weight) {
            if ($weight > $maxWeight) continue;
            
            $options = calculateShippingOptions($destination, $weight);
            $matrix[$weight] = $options;
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
            'weight_steps' => $filteredWeightSteps
        ), true, 'マトリックスを生成しました');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'マトリックス生成エラー: ' . $e->getMessage());
    }
}

/**
 * 計算履歴取得（簡易版）
 */
function handleGetCalculationHistory($input) {
    // データベースが利用できない場合はサンプルデータを返す
    $sampleHistory = array(
        array(
            'destination' => 'US',
            'weight' => 1.5,
            'service' => 'EMS',
            'cost' => 2200,
            'date' => date('Y-m-d H:i:s', strtotime('-1 hour'))
        ),
        array(
            'destination' => 'GB',
            'weight' => 0.8,
            'service' => 'エアメール',
            'cost' => 1800,
            'date' => date('Y-m-d H:i:s', strtotime('-2 hours'))
        ),
        array(
            'destination' => 'AU',
            'weight' => 2.2,
            'service' => 'DHL Express',
            'cost' => 4500,
            'date' => date('Y-m-d H:i:s', strtotime('-1 day'))
        )
    );
    
    sendJsonResponse(array(
        'history' => $sampleHistory,
        'count' => count($sampleHistory)
    ), true, '履歴を取得しました');
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
    <title>送料計算システム - スタンドアロン版</title>
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

        /* 重量入力 */
        .weight-input-group {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
        }

        .weight-input-label {
            font-weight: 600;
            color: var(--text-primary);
        }

        .weight-note {
            color: var(--text-muted);
            font-size: 0.875rem;
        }

        /* サイズ入力 */
        .size-input-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: var(--space-md);
            margin-bottom: var(--space-sm);
        }

        .size-input-item {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
        }

        .size-input-label {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        .size-note {
            color: var(--text-muted);
            font-size: 0.875rem;
        }

        /* 配送設定 */
        .destination-group, .preference-group {
            margin-bottom: var(--space-md);
        }

        .destination-label, .preference-label {
            display: block;
            margin-bottom: var(--space-sm);
            font-weight: 600;
            color: var(--text-primary);
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
        }

        /* 結果表示 */
        .calculation-summary, .candidates-section {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-xl);
            margin-bottom: var(--space-xl);
            border: 1px solid var(--border);
            box-shadow: var(--shadow-sm);
        }

        .calculation-summary h3, .candidates-section h3 {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            margin-bottom: var(--space-lg);
            color: var(--text-primary);
        }

        .calculation-summary h3 i, .candidates-section h3 i {
            color: var(--shipping-primary);
        }

        /* 配送オプションカード */
        .shipping-option {
            background: var(--bg-tertiary);
            border: 2px solid var(--border);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-bottom: var(--space-md);
            transition: all 0.2s ease;
        }

        .shipping-option:hover {
            border-color: var(--shipping-primary);
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }

        .option-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-md);
        }

        .option-name {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .option-cost {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--shipping-primary);
        }

        .option-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: var(--space-md);
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .option-detail {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        /* 推奨表示 */
        .recommendations {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: var(--space-md);
            margin-top: var(--space-lg);
        }

        .recommendation {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid var(--info);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
        }

        .recommendation-title {
            font-weight: 600;
            color: #0c4a6e;
            margin-bottom: var(--space-sm);
        }

        .recommendation-message {
            color: #0c4a6e;
            font-size: 0.875rem;
        }

        /* モーダル */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
        }

        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-xl);
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-lg);
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text-muted);
        }

        /* エラー表示 */
        .error-message {
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border: 2px solid var(--danger);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin: var(--space-md) 0;
            color: #7f1d1d;
            display: none;
        }

        .error-message.show {
            display: block;
        }

        /* レスポンシブ */
        @media (max-width: 768px) {
            .calculation-form-grid {
                grid-template-columns: 1fr;
            }
            
            .size-input-grid {
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
            <h1><i class="fas fa-shipping-fast"></i> 送料計算システム</h1>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="showMatrixModal()">
                    <i class="fas fa-table"></i> マトリックス
                </button>
                <button class="btn btn-info" onclick="showHistoryModal()">
                    <i class="fas fa-history"></i> 履歴
                </button>
            </div>
        </div>

        <!-- エラー表示 -->
        <?php if (isset($db_error)): ?>
        <div class="error-message show">
            <i class="fas fa-exclamation-triangle"></i>
            データベース接続エラー: <?= htmlspecialchars($db_error) ?>
            <br>基本機能は利用できますが、履歴保存機能は使用できません。
        </div>
        <?php endif; ?>

        <div id="errorMessage" class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <span id="errorText"></span>
        </div>

        <!-- 計算フォーム -->
        <div class="calculation-form-grid">
            <!-- 重量入力 -->
            <div class="calculation-input-card">
                <div class="input-card-header">
                    <i class="fas fa-weight"></i>
                    重量設定
                </div>
                <div class="weight-input-group">
                    <label class="weight-input-label">重量 (kg)</label>
                    <input type="number" id="shippingWeight" step="0.01" min="0.01" max="30" 
                           placeholder="1.50" class="form-input" required>
                    <div class="weight-note">
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
                <div class="size-input-grid">
                    <div class="size-input-item">
                        <label class="size-input-label">長さ (cm)</label>
                        <input type="number" id="shippingLength" step="0.1" min="0" 
                               placeholder="20.0" class="form-input">
                    </div>
                    <div class="size-input-item">
                        <label class="size-input-label">幅 (cm)</label>
                        <input type="number" id="shippingWidth" step="0.1" min="0" 
                               placeholder="15.0" class="form-input">
                    </div>
                    <div class="size-input-item">
                        <label class="size-input-label">高さ (cm)</label>
                        <input type="number" id="shippingHeight" step="0.1" min="0" 
                               placeholder="10.0" class="form-input">
                    </div>
                </div>
                <div class="size-note">
                    <i class="fas fa-info-circle"></i> 梱包後サイズは自動で10%増加します
                </div>
            </div>

            <!-- 配送設定 -->
            <div class="calculation-input-card">
                <div class="input-card-header">
                    <i class="fas fa-map-marker-alt"></i>
                    配送設定
                </div>
                <div class="destination-group">
                    <label class="destination-label">配送先国</label>
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
            <div class="calculation-summary">
                <h3><i class="fas fa-calculator"></i> 計算結果サマリー</h3>
                <div id="calculationSummary"></div>
            </div>

            <!-- 配送オプション一覧 -->
            <div class="candidates-section">
                <h3><i class="fas fa-truck"></i> 配送オプション</h3>
                <div id="candidatesList"></div>
                
                <!-- 推奨事項 -->
                <div id="recommendationsContainer"></div>
            </div>
        </div>

        <!-- マトリックス表示モーダル -->
        <div id="matrixModal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-table"></i> 送料マトリックス</h3>
                    <button class="modal-close" onclick="closeModal('matrixModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="matrixContent">マトリックスを生成中...</div>
                </div>
            </div>
        </div>

        <!-- 履歴表示モーダル -->
        <div id="historyModal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-history"></i> 計算履歴</h3>
                    <button class="modal-close" onclick="closeModal('historyModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="historyContent">履歴を読み込み中...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // グローバル変数
        let currentCalculationData = null;

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('送料計算システム スタンドアロン版 初期化完了');
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
                hideError();

                const response = await fetch('enhanced_calculation_php_fixed.php', {
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
            const summaryHtml = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-md);">' +
                    '<div>' +
                        '<strong>実重量:</strong><br>' +
                        data.original_weight + ' kg' +
                    '</div>' +
                    '<div>' +
                        '<strong>梱包後重量:</strong><br>' +
                        data.packed_weight.toFixed(2) + ' kg' +
                    '</div>' +
                    '<div>' +
                        '<strong>容積重量:</strong><br>' +
                        data.volumetric_weight.toFixed(2) + ' kg' +
                    '</div>' +
                    '<div>' +
                        '<strong>課金重量:</strong><br>' +
                        data.chargeable_weight.toFixed(2) + ' kg' +
                    '</div>' +
                    '<div>' +
                        '<strong>配送先:</strong><br>' +
                        data.destination +
                    '</div>' +
                '</div>';
            document.getElementById('calculationSummary').innerHTML = summaryHtml;

            // 配送オプション表示
            const optionsHtml = data.shipping_options.map(function(option) {
                return '<div class="shipping-option">' +
                    '<div class="option-header">' +
                        '<div class="option-name">' + option.service_name + '</div>' +
                        '<div class="option-cost">¥' + option.cost_jpy.toLocaleString() + '</div>' +
                    '</div>' +
                    '<div class="option-details">' +
                        '<div class="option-detail">' +
                            '<i class="fas fa-clock"></i>' +
                            option.delivery_days + '日' +
                        '</div>' +
                        '<div class="option-detail">' +
                            '<i class="fas fa-dollar-sign"></i>' +
                            '$' + option.cost_usd.toFixed(2) +
                        '</div>' +
                        '<div class="option-detail">' +
                            '<i class="fas fa-search"></i>' +
                            (option.tracking ? '追跡可能' : '追跡なし') +
                        '</div>' +
                        '<div class="option-detail">' +
                            '<i class="fas fa-shield-alt"></i>' +
                            (option.insurance ? '保険付き' : '保険なし') +
                        '</div>' +
                        '<div class="option-detail">' +
                            '<i class="fas fa-tag"></i>' +
                            option.type +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
            document.getElementById('candidatesList').innerHTML = optionsHtml;

            // 推奨事項表示
            const recommendationsHtml = '<div class="recommendations">' +
                data.recommendations.map(function(rec) {
                    return '<div class="recommendation">' +
                        '<div class="recommendation-title">' + rec.title + '</div>' +
                        '<div class="recommendation-message">' + rec.message + '</div>' +
                    '</div>';
                }).join('') +
            '</div>';
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

            document.getElementById('matrixModal').style.display = 'block';
            document.getElementById('matrixContent').innerHTML = 'マトリックスを生成中...';

            try {
                const response = await fetch('enhanced_calculation_php_fixed.php', {
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
                    document.getElementById('matrixContent').innerHTML = 'エラー: ' + result.message;
                }

            } catch (error) {
                console.error('マトリックス生成エラー:', error);
                document.getElementById('matrixContent').innerHTML = 'マトリックス生成中にエラーが発生しました。';
            }
        }

        // マトリックス表示
        function displayMatrix(data) {
            const headers = ['サービス'].concat(data.weight_steps.map(function(w) {
                return w + 'kg';
            }));
            
            let tableHtml = '<table style="width: 100%; border-collapse: collapse;">' +
                    '<thead>' +
                        '<tr>' +
                            headers.map(function(h) {
                                return '<th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">' + h + '</th>';
                            }).join('') +
                        '</tr>' +
                    '</thead>' +
                    '<tbody>';

            // 各重量でのサービス別料金を整理
            const serviceNames = Array.from(new Set(Object.values(data.matrix).flat().map(function(opt) {
                return opt.service_name;
            })));
            
            serviceNames.forEach(function(serviceName) {
                tableHtml += '<tr>';
                tableHtml += '<td style="border: 1px solid var(--border); padding: var(--space-sm); font-weight: 600;">' + serviceName + '</td>';
                
                data.weight_steps.forEach(function(weight) {
                    const option = data.matrix[weight] ? data.matrix[weight].find(function(opt) {
                        return opt.service_name === serviceName;
                    }) : null;
                    const cost = option ? '¥' + option.cost_jpy.toLocaleString() : '-';
                    tableHtml += '<td style="border: 1px solid var(--border); padding: var(--space-sm); text-align: center;">' + cost + '</td>';
                });
                
                tableHtml += '</tr>';
            });

            tableHtml += '</tbody></table>';
            
            document.getElementById('matrixContent').innerHTML = tableHtml;
        }

        // 履歴表示
        async function showHistoryModal() {
            document.getElementById('historyModal').style.display = 'block';
            document.getElementById('historyContent').innerHTML = '履歴を読み込み中...';

            try {
                const response = await fetch('enhanced_calculation_php_fixed.php', {
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
                    displayHistory(result.data.history);
                } else {
                    document.getElementById('historyContent').innerHTML = 'エラー: ' + result.message;
                }

            } catch (error) {
                console.error('履歴取得エラー:', error);
                document.getElementById('historyContent').innerHTML = '履歴取得中にエラーが発生しました。';
            }
        }

        // 履歴表示
        function displayHistory(history) {
            if (history.length === 0) {
                document.getElementById('historyContent').innerHTML = '履歴はありません。';
                return;
            }

            const historyHtml = '<table style="width: 100%; border-collapse: collapse;">' +
                    '<thead>' +
                        '<tr>' +
                            '<th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">日時</th>' +
                            '<th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">配送先</th>' +
                            '<th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">重量</th>' +
                            '<th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">サービス</th>' +
                            '<th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">料金</th>' +
                        '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                        history.map(function(item) {
                            return '<tr>' +
                                '<td style="border: 1px solid var(--border); padding: var(--space-sm);">' + item.date + '</td>' +
                                '<td style="border: 1px solid var(--border); padding: var(--space-sm);">' + item.destination + '</td>' +
                                '<td style="border: 1px solid var(--border); padding: var(--space-sm);">' + item.weight + 'kg</td>' +
                                '<td style="border: 1px solid var(--border); padding: var(--space-sm);">' + item.service + '</td>' +
                                '<td style="border: 1px solid var(--border); padding: var(--space-sm);">¥' + item.cost.toLocaleString() + '</td>' +
                            '</tr>';
                        }).join('') +
                    '</tbody>' +
                '</table>';
            
            document.getElementById('historyContent').innerHTML = historyHtml;
        }

        // モーダルを閉じる
        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        // フォームクリア
        function clearCalculationForm() {
            document.getElementById('shippingWeight').value = '';
            document.getElementById('shippingLength').value = '';
            document.getElementById('shippingWidth').value = '';
            document.getElementById('shippingHeight').value = '';
            document.getElementById('shippingCountry').value = '';
            document.getElementById('candidatesContainer').style.display = 'none';
            hideError();
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
            errorDiv.classList.add('show');
        }

        function hideError() {
            document.getElementById('errorMessage').classList.remove('show');
        }

        // モーダル外クリックで閉じる
        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        }

        console.log('送料計算システム スタンドアロン版 JavaScript初期化完了');
    </script>
</body>
</html>