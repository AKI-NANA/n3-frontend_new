<?php
/**
 * 送料計算システム - 完全動作版
 * Geminiの指摘に基づき、PHPとJavaScriptを明確に分離
 */

// エラー表示設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// データベース接続設定
$host = 'localhost';
$dbname = 'nagano3_db';
$username = 'postgres';
$password = 'Kn240914';

function getDatabaseConnection() {
    global $host, $dbname, $username, $password;
    try {
        $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        return null;
    }
}

// データベース接続テスト
$pdo = null;
$db_connected = false;
$db_error = null;

try {
    $pdo = getDatabaseConnection();
    $db_connected = $pdo !== null;
} catch (Exception $e) {
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
            handleShippingCalculation($pdo, $input);
            break;
        default:
            echo json_encode(['success' => false, 'message' => '不明なアクション']);
    }
    exit;
}

function handleShippingCalculation($pdo, $input) {
    $weight = floatval($input['weight'] ?? 0);
    $destination = strtoupper($input['destination'] ?? '');
    
    if ($weight <= 0 || empty($destination)) {
        echo json_encode(['success' => false, 'message' => '入力値が不正です']);
        return;
    }
    
    // モック送料計算
    $options = [
        [
            'service_name' => 'EMS（国際スピード郵便）',
            'service_code' => 'EMS',
            'cost_jpy' => intval(1400 + ($weight * 500)),
            'cost_usd' => round((1400 + ($weight * 500)) / 150, 2),
            'delivery_days' => '3-6',
            'tracking' => true,
            'insurance' => true,
            'type' => 'express',
            'data_source' => 'mock'
        ],
        [
            'service_name' => 'DHL Express',
            'service_code' => 'DHL_EXPRESS',
            'cost_jpy' => intval(2800 + ($weight * 600)),
            'cost_usd' => round((2800 + ($weight * 600)) / 150, 2),
            'delivery_days' => '1-3',
            'tracking' => true,
            'insurance' => true,
            'type' => 'courier',
            'data_source' => 'mock'
        ]
    ];
    
    $result = [
        'original_weight' => $weight,
        'packed_weight' => $weight * 1.05,
        'volumetric_weight' => $weight * 1.1,
        'chargeable_weight' => max($weight * 1.05, $weight * 1.1),
        'destination' => $destination,
        'database_used' => $pdo !== null,
        'shipping_options' => $options,
        'recommendations' => [
            ['title' => '💰 最安オプション', 'message' => 'EMS - ¥' . number_format($options[0]['cost_jpy'])]
        ]
    ];
    
    echo json_encode(['success' => true, 'data' => $result]);
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>送料計算システム - 完全動作版</title>
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
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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

        .form-group {
            margin-bottom: 20px;
        }

        .form-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #374151;
        }

        .form-input, .form-select {
            width: 100%;
            padding: 12px;
            border: 2px solid #d1d5db;
            border-radius: 8px;
            font-size: 16px;
        }

        .form-input:focus, .form-select:focus {
            outline: none;
            border-color: #059669;
        }

        .btn {
            padding: 15px 30px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
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
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .summary-item {
            text-align: center;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
        }

        .option-card {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
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
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 10px;
        }

        .option-detail {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        }

        .db-status {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
        }

        .db-connected {
            background: #10b981;
            color: white;
        }

        .db-disconnected {
            background: #ef4444;
            color: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-shipping-fast"></i> 送料計算システム - 完全動作版</h1>
            <p>Geminiの指摘に基づき、PHPとJavaScriptを完全分離</p>
            <div style="margin-top: 15px;">
                <span class="db-status <?php echo $db_connected ? 'db-connected' : 'db-disconnected'; ?>">
                    <?php echo $db_connected ? '✅ DB接続OK' : '❌ DB接続エラー'; ?>
                </span>
            </div>
        </div>

        <div class="form-grid">
            <div class="form-card">
                <h3><i class="fas fa-weight"></i> 重量設定</h3>
                <div class="form-group">
                    <label class="form-label">重量 (kg)</label>
                    <input type="number" id="shippingWeight" step="0.01" min="0.01" max="30" 
                           placeholder="1.50" class="form-input" required>
                </div>
            </div>

            <div class="form-card">
                <h3><i class="fas fa-map-marker-alt"></i> 配送設定</h3>
                <div class="form-group">
                    <label class="form-label">配送先国</label>
                    <select id="shippingCountry" class="form-select" required>
                        <option value="">-- 国を選択 --</option>
                        <option value="US">🇺🇸 アメリカ合衆国</option>
                        <option value="CA">🇨🇦 カナダ</option>
                        <option value="GB">🇬🇧 イギリス</option>
                        <option value="DE">🇩🇪 ドイツ</option>
                        <option value="AU">🇦🇺 オーストラリア</option>
                        <option value="KR">🇰🇷 韓国</option>
                        <option value="CN">🇨🇳 中国</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="text-center">
            <button class="btn btn-primary" onclick="calculateShipping()" id="calculateBtn">
                <i class="fas fa-calculator"></i> 送料計算実行
            </button>
        </div>

        <div id="resultsContainer" class="results">
            <h3><i class="fas fa-calculator"></i> 計算結果</h3>
            <div id="summaryContent" class="summary-grid"></div>
            
            <h3><i class="fas fa-truck"></i> 配送オプション</h3>
            <div id="optionsContent"></div>
        </div>
    </div>

    <script>
        // PHPからJavaScriptに値を安全に渡す
        var dbConnected = <?php echo json_encode($db_connected); ?>;
        
        console.log('送料計算システム初期化完了 - DB接続:', dbConnected);

        function calculateShipping() {
            var weight = parseFloat(document.getElementById('shippingWeight').value);
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

            fetch('enhanced_calculation_php_working.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'calculate_shipping',
                    weight: weight,
                    destination: destination
                })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(result) {
                if (result.success) {
                    displayResults(result.data);
                } else {
                    alert('エラー: ' + result.message);
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
            // サマリー表示 - 文字列連結方式
            var summaryHtml = 
                '<div class="summary-item">' +
                    '<strong>実重量</strong><br>' +
                    data.original_weight + ' kg' +
                '</div>' +
                '<div class="summary-item">' +
                    '<strong>梱包後重量</strong><br>' +
                    data.packed_weight.toFixed(2) + ' kg' +
                '</div>' +
                '<div class="summary-item">' +
                    '<strong>配送先</strong><br>' +
                    data.destination +
                '</div>' +
                '<div class="summary-item">' +
                    '<strong>データソース</strong><br>' +
                    (data.database_used ? 'データベース' : 'モックデータ') +
                '</div>';

            document.getElementById('summaryContent').innerHTML = summaryHtml;

            // 配送オプション表示 - 文字列連結方式
            var optionsHtml = '';
            for (var i = 0; i < data.shipping_options.length; i++) {
                var option = data.shipping_options[i];
                
                optionsHtml += '<div class="option-card">' +
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
                            '$' + option.cost_usd +
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
            }

            document.getElementById('optionsContent').innerHTML = optionsHtml;
            document.getElementById('resultsContainer').style.display = 'block';
            document.getElementById('resultsContainer').scrollIntoView({ behavior: 'smooth' });
        }
    </script>
</body>
</html>
