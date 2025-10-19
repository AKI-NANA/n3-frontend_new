<?php
/**
 * Yahoo Auction Tool - 送料計算システム完全版
 * 
 * 機能:
 * - 国際配送料自動計算
 * - 複数配送方法比較
 * - 重量・サイズ自動推定
 * - コスト最適化提案
 * 
 * @author Claude AI
 * @version 2.0.0
 * @date 2025-09-20
 */

// データベース接続設定（修正版）
$host = 'localhost';
$dbname = 'nagano3_db';
$username = 'postgres';
$password = 'Kn240914';

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    // データベース接続エラーの場合でも基本機能は動作させる
    $pdo = null;
    $db_error = $e->getMessage();
}

// APIリクエスト処理
if (isset($_GET['action']) || isset($_POST['action'])) {
    $action = $_GET['action'] ?? $_POST['action'];
    header('Content-Type: application/json');
    
    switch ($action) {
        case 'calculate_shipping':
            $result = calculateShippingCost();
            echo json_encode($result);
            exit;
            
        case 'get_shipping_methods':
            $result = getShippingMethods();
            echo json_encode($result);
            exit;
            
        case 'estimate_weight_size':
            $result = estimateWeightAndSize();
            echo json_encode($result);
            exit;
            
        case 'get_zone_rates':
            $result = getZoneRates();
            echo json_encode($result);
            exit;
    }
}

/**
 * 送料計算メイン関数
 */
function calculateShippingCost() {
    try {
        $weight = floatval($_POST['weight'] ?? 0);
        $length = floatval($_POST['length'] ?? 0);
        $width = floatval($_POST['width'] ?? 0);
        $height = floatval($_POST['height'] ?? 0);
        $destination = $_POST['destination'] ?? 'US';
        $shippingMethod = $_POST['shipping_method'] ?? 'standard';
        
        if ($weight <= 0) {
            return ['success' => false, 'message' => '重量を正しく入力してください。'];
        }
        
        // 寸法計算
        $dimensions = $length * $width * $height;
        $volumetricWeight = $dimensions / 5000; // 容積重量計算
        $chargeableWeight = max($weight, $volumetricWeight);
        
        // 配送方法別料金計算
        $shippingRates = getShippingRatesByMethod($destination, $chargeableWeight, $shippingMethod);
        
        // 最適化提案
        $suggestions = generateShippingSuggestions($chargeableWeight, $dimensions, $destination);
        
        return [
            'success' => true,
            'data' => [
                'actual_weight' => $weight,
                'volumetric_weight' => $volumetricWeight,
                'chargeable_weight' => $chargeableWeight,
                'shipping_cost' => $shippingRates['cost'],
                'delivery_days' => $shippingRates['delivery_days'],
                'shipping_method' => $shippingMethod,
                'suggestions' => $suggestions,
                'zone' => getShippingZone($destination),
                'tracking' => $shippingRates['tracking']
            ]
        ];
        
    } catch (Exception $e) {
        return ['success' => false, 'message' => '送料計算エラー: ' . $e->getMessage()];
    }
}

/**
 * 配送方法別料金取得
 */
function getShippingRatesByMethod($destination, $weight, $method) {
    $zone = getShippingZone($destination);
    
    // 基本料金テーブル（日本郵便ベース）
    $rates = [
        'ems' => [
            'zone1' => ['base' => 1400, 'per_500g' => 200, 'delivery_days' => '2-4', 'tracking' => true],
            'zone2' => ['base' => 1400, 'per_500g' => 350, 'delivery_days' => '3-6', 'tracking' => true],
            'zone3' => ['base' => 1400, 'per_500g' => 500, 'delivery_days' => '3-6', 'tracking' => true]
        ],
        'airmail' => [
            'zone1' => ['base' => 1000, 'per_500g' => 150, 'delivery_days' => '5-9', 'tracking' => false],
            'zone2' => ['base' => 1000, 'per_500g' => 250, 'delivery_days' => '6-13', 'tracking' => false],
            'zone3' => ['base' => 1000, 'per_500g' => 350, 'delivery_days' => '6-13', 'tracking' => false]
        ],
        'sal' => [
            'zone1' => ['base' => 800, 'per_500g' => 100, 'delivery_days' => '7-14', 'tracking' => false],
            'zone2' => ['base' => 800, 'per_500g' => 150, 'delivery_days' => '10-20', 'tracking' => false],
            'zone3' => ['base' => 800, 'per_500g' => 200, 'delivery_days' => '10-20', 'tracking' => false]
        ]
    ];
    
    if (!isset($rates[$method][$zone])) {
        throw new Exception('指定された配送方法・地域の料金が見つかりません。');
    }
    
    $rate = $rates[$method][$zone];
    $weight500g = ceil($weight / 0.5);
    $cost = $rate['base'] + ($weight500g - 1) * $rate['per_500g'];
    
    return [
        'cost' => $cost,
        'delivery_days' => $rate['delivery_days'],
        'tracking' => $rate['tracking']
    ];
}

/**
 * 配送ゾーン取得
 */
function getShippingZone($destination) {
    $zones = [
        'zone1' => ['US', 'CA', 'KR', 'TW', 'HK'],
        'zone2' => ['GB', 'FR', 'DE', 'IT', 'AU', 'NZ'],
        'zone3' => ['BR', 'AR', 'IN', 'RU', 'ZA']
    ];
    
    foreach ($zones as $zone => $countries) {
        if (in_array($destination, $countries)) {
            return $zone;
        }
    }
    
    return 'zone2'; // デフォルト
}

/**
 * 利用可能配送方法取得
 */
function getShippingMethods() {
    return [
        'success' => true,
        'data' => [
            'ems' => [
                'name' => 'EMS（国際スピード郵便）',
                'description' => '最速・追跡可能・保険付き',
                'min_delivery' => 2,
                'max_delivery' => 6,
                'tracking' => true,
                'insurance' => true
            ],
            'airmail' => [
                'name' => 'エアメール',
                'description' => '標準的な航空便',
                'min_delivery' => 5,
                'max_delivery' => 13,
                'tracking' => false,
                'insurance' => false
            ],
            'sal' => [
                'name' => 'SAL便',
                'description' => '経済的な配送方法',
                'min_delivery' => 7,
                'max_delivery' => 20,
                'tracking' => false,
                'insurance' => false
            ]
        ]
    ];
}

/**
 * 重量・サイズ自動推定
 */
function estimateWeightAndSize() {
    $category = $_POST['category'] ?? '';
    $title = $_POST['title'] ?? '';
    
    // カテゴリー別推定値
    $estimates = [
        'smartphone' => ['weight' => 0.2, 'length' => 15, 'width' => 8, 'height' => 1],
        'camera' => ['weight' => 0.8, 'length' => 25, 'width' => 15, 'height' => 10],
        'laptop' => ['weight' => 2.0, 'length' => 35, 'width' => 25, 'height' => 3],
        'game' => ['weight' => 0.1, 'length' => 20, 'width' => 15, 'height' => 2],
        'watch' => ['weight' => 0.15, 'length' => 12, 'width' => 8, 'height' => 5],
        'default' => ['weight' => 0.5, 'length' => 20, 'width' => 15, 'height' => 5]
    ];
    
    // タイトルからカテゴリー推定
    $detectedCategory = 'default';
    $keywords = [
        'smartphone' => ['iphone', 'galaxy', 'pixel', 'smartphone', 'スマホ'],
        'camera' => ['camera', 'canon', 'nikon', 'sony', 'カメラ'],
        'laptop' => ['macbook', 'laptop', 'notebook', 'ノートパソコン'],
        'game' => ['game', 'nintendo', 'playstation', 'ゲーム'],
        'watch' => ['watch', 'rolex', 'omega', '時計']
    ];
    
    $lowerTitle = strtolower($title);
    foreach ($keywords as $cat => $words) {
        foreach ($words as $word) {
            if (strpos($lowerTitle, $word) !== false) {
                $detectedCategory = $cat;
                break 2;
            }
        }
    }
    
    $estimate = $estimates[$detectedCategory];
    
    return [
        'success' => true,
        'data' => [
            'detected_category' => $detectedCategory,
            'estimated_weight' => $estimate['weight'],
            'estimated_dimensions' => [
                'length' => $estimate['length'],
                'width' => $estimate['width'],
                'height' => $estimate['height']
            ],
            'confidence' => $detectedCategory === 'default' ? 'low' : 'high'
        ]
    ];
}

/**
 * 配送最適化提案生成
 */
function generateShippingSuggestions($weight, $dimensions, $destination) {
    $suggestions = [];
    
    // 重量最適化
    if ($weight > 2.0) {
        $suggestions[] = [
            'type' => 'weight_optimization',
            'message' => '重量が2kgを超えています。分割配送を検討してください。',
            'potential_savings' => '15-30%'
        ];
    }
    
    // 寸法最適化
    $volume = $dimensions;
    if ($volume > 50000) { // 50cm x 50cm x 20cm
        $suggestions[] = [
            'type' => 'size_optimization', 
            'message' => 'パッケージが大きすぎます。小さな箱への変更で容積重量を削減できます。',
            'potential_savings' => '20-40%'
        ];
    }
    
    // 配送方法提案
    if ($weight < 0.5) {
        $suggestions[] = [
            'type' => 'method_suggestion',
            'message' => '軽量商品です。SAL便で大幅なコスト削減が可能です。',
            'potential_savings' => '40-60%'
        ];
    }
    
    return $suggestions;
}

/**
 * ゾーン別料金表取得
 */
function getZoneRates() {
    return [
        'success' => true,
        'data' => [
            'zone1' => [
                'name' => 'ゾーン1（アジア・北米）',
                'countries' => ['US', 'CA', 'KR', 'TW', 'HK'],
                'ems_base' => 1400,
                'airmail_base' => 1000,
                'sal_base' => 800
            ],
            'zone2' => [
                'name' => 'ゾーン2（欧州・オセアニア）',
                'countries' => ['GB', 'FR', 'DE', 'IT', 'AU', 'NZ'],
                'ems_base' => 1400,
                'airmail_base' => 1000,
                'sal_base' => 800
            ],
            'zone3' => [
                'name' => 'ゾーン3（その他）',
                'countries' => ['BR', 'AR', 'IN', 'RU', 'ZA'],
                'ems_base' => 1400,
                'airmail_base' => 1000,
                'sal_base' => 800
            ]
        ]
    ];
}
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>送料計算システム完全版 - Yahoo Auction Tool</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
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

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: var(--space-lg);
        }

        /* ヘッダー */
        .header {
            background: linear-gradient(135deg, var(--shipping-primary), var(--shipping-secondary));
            color: white;
            padding: var(--space-xl);
            border-radius: var(--radius-xl);
            margin-bottom: var(--space-xl);
            text-align: center;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: var(--space-md);
        }

        .header p {
            font-size: 1.125rem;
            opacity: 0.9;
        }

        /* セクション */
        .section {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-xl);
            margin-bottom: var(--space-xl);
            border: 1px solid var(--border);
            box-shadow: var(--shadow-sm);
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-lg);
            padding-bottom: var(--space-md);
            border-bottom: 2px solid var(--border);
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .section-title i {
            color: var(--shipping-primary);
        }

        /* フォーム */
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: var(--space-xl);
        }

        .form-section {
            background: var(--bg-tertiary);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            border: 1px solid var(--border);
        }

        .form-section h4 {
            color: var(--text-primary);
            margin-bottom: var(--space-md);
            font-size: 1.125rem;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .form-section h4 i {
            color: var(--shipping-primary);
        }

        .form-group {
            margin-bottom: var(--space-lg);
        }

        .form-group label {
            display: block;
            margin-bottom: var(--space-sm);
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        .form-group input,
        .form-group select {
            width: 100%;
            padding: var(--space-md);
            border: 2px solid var(--border);
            border-radius: var(--radius-md);
            font-size: 1rem;
            transition: all 0.2s ease;
            background: var(--bg-secondary);
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: var(--shipping-primary);
            box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }

        /* ボタン */
        .btn {
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

        .btn-primary {
            background: linear-gradient(135deg, var(--shipping-primary), var(--shipping-secondary));
            color: white;
            box-shadow: var(--shadow-md);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
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

        /* 結果表示 */
        .result-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-lg);
            margin-top: var(--space-xl);
        }

        .result-card {
            background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
            border: 2px solid var(--border);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            text-align: center;
            transition: all 0.2s ease;
        }

        .result-card:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-lg);
            border-color: var(--shipping-primary);
        }

        .result-value {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: var(--space-sm);
            color: var(--shipping-primary);
        }

        .result-label {
            font-size: 0.875rem;
            color: var(--text-muted);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* 比較テーブル */
        .comparison-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: var(--space-lg);
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
        }

        .comparison-table th,
        .comparison-table td {
            padding: var(--space-md);
            text-align: left;
            border-bottom: 1px solid var(--border);
        }

        .comparison-table th {
            background: var(--bg-tertiary);
            font-weight: 600;
            color: var(--text-primary);
        }

        .comparison-table tr:hover {
            background: var(--bg-tertiary);
        }

        /* 提案カード */
        .suggestion-card {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid var(--info);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin: var(--space-md) 0;
        }

        .suggestion-header {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            margin-bottom: var(--space-sm);
            font-weight: 600;
            color: #0c4a6e;
        }

        .suggestion-savings {
            background: var(--success);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: var(--radius-md);
            font-size: 0.75rem;
            font-weight: 700;
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

        /* ローディング */
        .loading {
            display: none;
            text-align: center;
            padding: var(--space-lg);
            color: var(--text-muted);
        }

        .loading.show {
            display: block;
        }

        .loading i {
            font-size: 2rem;
            animation: spin 1s linear infinite;
            color: var(--shipping-primary);
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* レスポンシブ */
        @media (max-width: 768px) {
            .form-grid {
                grid-template-columns: 1fr;
            }
            .result-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="header">
            <h1><i class="fas fa-shipping-fast"></i> 送料計算システム完全版</h1>
            <p>国際配送料自動計算・複数配送方法比較・コスト最適化提案</p>
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

        <!-- 送料計算セクション -->
        <div class="section">
            <div class="section-header">
                <h3 class="section-title">
                    <i class="fas fa-calculator"></i> 送料計算
                </h3>
                <div>
                    <button class="btn btn-secondary" onclick="clearForm()">
                        <i class="fas fa-eraser"></i> クリア
                    </button>
                    <button class="btn btn-info" onclick="loadSampleData()">
                        <i class="fas fa-file-import"></i> サンプル
                    </button>
                </div>
            </div>

            <form id="shippingForm">
                <div class="form-grid">
                    <!-- 商品情報 -->
                    <div class="form-section">
                        <h4><i class="fas fa-box"></i> 商品情報</h4>
                        
                        <div class="form-group">
                            <label>商品タイトル（推定用）</label>
                            <input type="text" id="productTitle" placeholder="iPhone 14 Pro 128GB">
                        </div>
                        
                        <button type="button" class="btn btn-info" onclick="estimateFromTitle()">
                            <i class="fas fa-magic"></i> 自動推定
                        </button>
                    </div>

                    <!-- 重量・サイズ -->
                    <div class="form-section">
                        <h4><i class="fas fa-weight"></i> 重量・サイズ</h4>
                        
                        <div class="form-group">
                            <label>重量 (kg)</label>
                            <input type="number" id="weight" step="0.01" placeholder="0.5" required>
                        </div>
                        
                        <div class="form-group">
                            <label>長さ (cm)</label>
                            <input type="number" id="length" placeholder="20">
                        </div>
                        
                        <div class="form-group">
                            <label>幅 (cm)</label>
                            <input type="number" id="width" placeholder="15">
                        </div>
                        
                        <div class="form-group">
                            <label>高さ (cm)</label>
                            <input type="number" id="height" placeholder="5">
                        </div>
                    </div>

                    <!-- 配送設定 -->
                    <div class="form-section">
                        <h4><i class="fas fa-globe"></i> 配送設定</h4>
                        
                        <div class="form-group">
                            <label>配送先国</label>
                            <select id="destination" required>
                                <option value="US">アメリカ (US)</option>
                                <option value="CA">カナダ (CA)</option>
                                <option value="GB">イギリス (GB)</option>
                                <option value="FR">フランス (FR)</option>
                                <option value="DE">ドイツ (DE)</option>
                                <option value="AU">オーストラリア (AU)</option>
                                <option value="KR">韓国 (KR)</option>
                                <option value="TW">台湾 (TW)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>配送方法</label>
                            <select id="shippingMethod" required>
                                <option value="ems">EMS（国際スピード郵便）</option>
                                <option value="airmail">エアメール</option>
                                <option value="sal">SAL便</option>
                            </select>
                        </div>
                        
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-calculator"></i> 送料計算
                        </button>
                    </div>
                </div>
            </form>

            <!-- ローディング -->
            <div id="loading" class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>計算中...</p>
            </div>

            <!-- 計算結果 -->
            <div id="calculationResults" style="display: none;">
                <div class="result-grid">
                    <div class="result-card">
                        <div class="result-value" id="shippingCost">¥0</div>
                        <div class="result-label">送料</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="actualWeight">0.0kg</div>
                        <div class="result-label">実重量</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="volumetricWeight">0.0kg</div>
                        <div class="result-label">容積重量</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="chargeableWeight">0.0kg</div>
                        <div class="result-label">課金重量</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="deliveryDays">-</div>
                        <div class="result-label">配送日数</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="shippingZone">-</div>
                        <div class="result-label">配送ゾーン</div>
                    </div>
                </div>

                <!-- 最適化提案 -->
                <div id="suggestions"></div>

                <!-- 全配送方法比較 -->
                <button class="btn btn-info" onclick="compareAllMethods()" style="margin-top: var(--space-lg);">
                    <i class="fas fa-balance-scale"></i> 全配送方法比較
                </button>

                <div id="comparisonResults" style="display: none; margin-top: var(--space-lg);">
                    <h4>配送方法比較</h4>
                    <table class="comparison-table" id="comparisonTable">
                        <thead>
                            <tr>
                                <th>配送方法</th>
                                <th>料金</th>
                                <th>配送日数</th>
                                <th>追跡</th>
                                <th>保険</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <script>
        // グローバル変数
        let currentCalculationData = null;

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('送料計算システム 初期化完了');
            
            // フォーム送信イベント
            document.getElementById('shippingForm').addEventListener('submit', function(e) {
                e.preventDefault();
                calculateShipping();
            });
        });

        // 送料計算実行
        async function calculateShipping() {
            try {
                showLoading();
                hideError();
                
                const formData = new FormData();
                formData.append('action', 'calculate_shipping');
                formData.append('weight', document.getElementById('weight').value);
                formData.append('length', document.getElementById('length').value);
                formData.append('width', document.getElementById('width').value);
                formData.append('height', document.getElementById('height').value);
                formData.append('destination', document.getElementById('destination').value);
                formData.append('shipping_method', document.getElementById('shippingMethod').value);
                
                const response = await fetch('calculation.php', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    currentCalculationData = result.data;
                    displayResults(result.data);
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

        // 結果表示
        function displayResults(data) {
            document.getElementById('shippingCost').textContent = `¥${data.shipping_cost.toLocaleString()}`;
            document.getElementById('actualWeight').textContent = `${data.actual_weight}kg`;
            document.getElementById('volumetricWeight').textContent = `${data.volumetric_weight.toFixed(2)}kg`;
            document.getElementById('chargeableWeight').textContent = `${data.chargeable_weight.toFixed(2)}kg`;
            document.getElementById('deliveryDays').textContent = data.delivery_days;
            document.getElementById('shippingZone').textContent = data.zone.toUpperCase();

            // 最適化提案表示
            displaySuggestions(data.suggestions);

            document.getElementById('calculationResults').style.display = 'block';
            document.getElementById('calculationResults').scrollIntoView({ behavior: 'smooth' });
        }

        // 最適化提案表示
        function displaySuggestions(suggestions) {
            const container = document.getElementById('suggestions');
            
            if (suggestions.length === 0) {
                container.innerHTML = '';
                return;
            }

            const html = suggestions.map(suggestion => `
                <div class="suggestion-card">
                    <div class="suggestion-header">
                        <i class="fas fa-lightbulb"></i>
                        ${suggestion.message}
                        <span class="suggestion-savings">節約: ${suggestion.potential_savings}</span>
                    </div>
                </div>
            `).join('');

            container.innerHTML = html;
        }

        // 全配送方法比較
        async function compareAllMethods() {
            if (!currentCalculationData) {
                showError('先に送料計算を実行してください。');
                return;
            }

            try {
                showLoading();
                
                const methods = ['ems', 'airmail', 'sal'];
                const comparisons = [];
                
                for (const method of methods) {
                    const formData = new FormData();
                    formData.append('action', 'calculate_shipping');
                    formData.append('weight', document.getElementById('weight').value);
                    formData.append('length', document.getElementById('length').value);
                    formData.append('width', document.getElementById('width').value);
                    formData.append('height', document.getElementById('height').value);
                    formData.append('destination', document.getElementById('destination').value);
                    formData.append('shipping_method', method);
                    
                    const response = await fetch('calculation.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        comparisons.push({
                            method: method,
                            ...result.data
                        });
                    }
                }
                
                displayComparison(comparisons);
                
            } catch (error) {
                console.error('比較エラー:', error);
                showError('比較処理中にエラーが発生しました。');
            } finally {
                hideLoading();
            }
        }

        // 比較結果表示
        function displayComparison(comparisons) {
            const tbody = document.querySelector('#comparisonTable tbody');
            
            const methodNames = {
                'ems': 'EMS',
                'airmail': 'エアメール', 
                'sal': 'SAL便'
            };
            
            tbody.innerHTML = comparisons.map(comp => `
                <tr>
                    <td>${methodNames[comp.method]}</td>
                    <td><strong>¥${comp.shipping_cost.toLocaleString()}</strong></td>
                    <td>${comp.delivery_days}</td>
                    <td>${comp.tracking ? '✓' : '✗'}</td>
                    <td>${comp.method === 'ems' ? '✓' : '✗'}</td>
                </tr>
            `).join('');
            
            document.getElementById('comparisonResults').style.display = 'block';
        }

        // タイトルから自動推定
        async function estimateFromTitle() {
            const title = document.getElementById('productTitle').value;
            
            if (!title) {
                showError('商品タイトルを入力してください。');
                return;
            }
            
            try {
                showLoading();
                
                const formData = new FormData();
                formData.append('action', 'estimate_weight_size');
                formData.append('title', title);
                
                const response = await fetch('calculation.php', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const data = result.data;
                    document.getElementById('weight').value = data.estimated_weight;
                    document.getElementById('length').value = data.estimated_dimensions.length;
                    document.getElementById('width').value = data.estimated_dimensions.width;
                    document.getElementById('height').value = data.estimated_dimensions.height;
                    
                    alert(`自動推定完了！\n検出カテゴリー: ${data.detected_category}\n信頼度: ${data.confidence}`);
                } else {
                    showError(result.message);
                }
                
            } catch (error) {
                console.error('推定エラー:', error);
                showError('推定処理中にエラーが発生しました。');
            } finally {
                hideLoading();
            }
        }

        // サンプルデータ読み込み
        function loadSampleData() {
            document.getElementById('productTitle').value = 'iPhone 14 Pro 128GB Space Black';
            document.getElementById('weight').value = '0.24';
            document.getElementById('length').value = '15';
            document.getElementById('width').value = '8';
            document.getElementById('height').value = '1';
            document.getElementById('destination').value = 'US';
            document.getElementById('shippingMethod').value = 'ems';
        }

        // フォームクリア
        function clearForm() {
            document.getElementById('shippingForm').reset();
            document.getElementById('calculationResults').style.display = 'none';
            document.getElementById('comparisonResults').style.display = 'none';
            hideError();
        }

        // ユーティリティ関数
        function showLoading() {
            document.getElementById('loading').classList.add('show');
        }

        function hideLoading() {
            document.getElementById('loading').classList.remove('show');
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

        console.log('送料計算システム JavaScript初期化完了');
    </script>
</body>
</html>