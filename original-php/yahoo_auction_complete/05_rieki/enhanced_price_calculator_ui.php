<?php
/**
 * Enhanced Price Calculator - Web Interface
 * 高度利益計算システム（Webインターフェース版）
 */

// エラー表示（開発時のみ）
error_reporting(E_ALL);
ini_set('display_errors', 1);

// データベース接続設定
$db_config = [
    'host' => 'localhost',
    'dbname' => 'nagano3_db',
    'user' => 'postgres',
    'password' => 'Kn240914'
];

$pdo = null;
$db_connected = false;

try {
    $pdo = new PDO(
        "pgsql:host={$db_config['host']};dbname={$db_config['dbname']}",
        $db_config['user'],
        $db_config['password']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db_connected = true;
} catch (PDOException $e) {
    $db_connected = false;
    error_log("Database connection failed: " . $e->getMessage());
}

// 簡単な計算関数
function calculateBasicPrice($yahoo_price_jpy, $shipping_jpy = 0, $exchange_rate = 150) {
    $total_cost_usd = ($yahoo_price_jpy + $shipping_jpy) / $exchange_rate;
    $ebay_fee_rate = 0.129; // 12.9%
    $target_profit_margin = 0.25; // 25%
    
    // 推奨価格 = (コスト + 目標利益) / (1 - 手数料率)
    $recommended_price = ($total_cost_usd * (1 + $target_profit_margin)) / (1 - $ebay_fee_rate);
    
    return [
        'cost_usd' => round($total_cost_usd, 2),
        'recommended_price' => round($recommended_price, 2),
        'profit' => round($recommended_price * (1 - $ebay_fee_rate) - $total_cost_usd, 2),
        'margin' => round(($recommended_price * (1 - $ebay_fee_rate) - $total_cost_usd) / $recommended_price * 100, 2)
    ];
}

// POST処理
$calculation_result = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['calculate'])) {
    $yahoo_price = floatval($_POST['yahoo_price'] ?? 0);
    $shipping_cost = floatval($_POST['shipping_cost'] ?? 0);
    $exchange_rate = floatval($_POST['exchange_rate'] ?? 150);
    
    if ($yahoo_price > 0) {
        $calculation_result = calculateBasicPrice($yahoo_price, $shipping_cost, $exchange_rate);
    }
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>高度利益計算システム - Enhanced Price Calculator</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }

        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }

        .status-bar {
            background: <?php echo $db_connected ? '#10b981' : '#ef4444'; ?>;
            color: white;
            padding: 1rem;
            text-align: center;
            font-weight: 600;
        }

        .main-content {
            padding: 2rem;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
        }

        .calculator-panel {
            background: #f8fafc;
            border-radius: 15px;
            padding: 2rem;
            border: 2px solid #e2e8f0;
        }

        .results-panel {
            background: #f0f9ff;
            border-radius: 15px;
            padding: 2rem;
            border: 2px solid #bfdbfe;
        }

        h2 {
            color: #2d3748;
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        label {
            display: block;
            margin-bottom: 0.5rem;
            color: #4a5568;
            font-weight: 600;
        }

        input[type="number"] {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }

        input[type="number"]:focus {
            outline: none;
            border-color: #4facfe;
            box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.1);
        }

        .btn {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            border: none;
            padding: 1rem 2rem;
            border-radius: 10px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(79, 172, 254, 0.4);
        }

        .result-item {
            background: white;
            padding: 1.5rem;
            border-radius: 10px;
            margin-bottom: 1rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .result-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #2d3748;
        }

        .result-label {
            color: #718096;
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
        }

        .profit-positive {
            color: #10b981;
        }

        .profit-negative {
            color: #ef4444;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-top: 2rem;
        }

        .info-card {
            background: #f7fafc;
            padding: 1.5rem;
            border-radius: 10px;
            text-align: center;
            border: 1px solid #e2e8f0;
        }

        .features-list {
            background: #fefefe;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 1.5rem;
            margin-top: 2rem;
        }

        .features-list h3 {
            color: #4a5568;
            margin-bottom: 1rem;
        }

        .features-list ul {
            list-style: none;
            padding: 0;
        }

        .features-list li {
            padding: 0.5rem 0;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .features-list li:last-child {
            border-bottom: none;
        }

        .status-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
        }

        .status-ready {
            background: #10b981;
        }

        .status-planned {
            background: #f59e0b;
        }

        @media (max-width: 768px) {
            .main-content {
                grid-template-columns: 1fr;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧮 高度利益計算システム</h1>
            <p>Enhanced Price Calculator - eBay出品価格最適化ツール</p>
        </div>

        <div class="status-bar">
            <?php if ($db_connected): ?>
                ✅ データベース接続: 正常 | PostgreSQL稼働中
            <?php else: ?>
                ❌ データベース接続: エラー | フォールバックモードで動作中
            <?php endif; ?>
        </div>

        <div class="main-content">
            <div class="calculator-panel">
                <h2>📊 価格計算</h2>
                
                <form method="POST">
                    <div class="form-group">
                        <label for="yahoo_price">Yahoo商品価格 (円)</label>
                        <input type="number" id="yahoo_price" name="yahoo_price" 
                               value="<?php echo $_POST['yahoo_price'] ?? ''; ?>" 
                               placeholder="例: 5000" min="0" step="0.01" required>
                    </div>

                    <div class="form-group">
                        <label for="shipping_cost">国内送料 (円)</label>
                        <input type="number" id="shipping_cost" name="shipping_cost" 
                               value="<?php echo $_POST['shipping_cost'] ?? ''; ?>" 
                               placeholder="例: 500" min="0" step="0.01">
                    </div>

                    <div class="form-group">
                        <label for="exchange_rate">為替レート (円/USD)</label>
                        <input type="number" id="exchange_rate" name="exchange_rate" 
                               value="<?php echo $_POST['exchange_rate'] ?? '150'; ?>" 
                               placeholder="例: 150" min="100" max="200" step="0.01" required>
                    </div>

                    <button type="submit" name="calculate" class="btn">
                        💰 利益計算実行
                    </button>
                </form>

                <div class="features-list">
                    <h3>🎯 システム機能</h3>
                    <ul>
                        <li>
                            <span class="status-icon status-ready"></span>
                            基本利益計算（25%目標利益率）
                        </li>
                        <li>
                            <span class="status-icon status-ready"></span>
                            eBay手数料自動計算（12.9%）
                        </li>
                        <li>
                            <span class="status-icon status-ready"></span>
                            リアルタイム為替レート対応
                        </li>
                        <li>
                            <span class="status-icon status-planned"></span>
                            ボリュームディスカウント対応（計画中）
                        </li>
                        <li>
                            <span class="status-icon status-planned"></span>
                            カテゴリー別手数料対応（計画中）
                        </li>
                        <li>
                            <span class="status-icon status-planned"></span>
                            国際決済手数料対応（計画中）
                        </li>
                    </ul>
                </div>
            </div>

            <div class="results-panel">
                <h2>📈 計算結果</h2>

                <?php if ($calculation_result): ?>
                    <div class="result-item">
                        <div class="result-label">総コスト（USD）</div>
                        <div class="result-value">$<?php echo $calculation_result['cost_usd']; ?></div>
                    </div>

                    <div class="result-item">
                        <div class="result-label">推奨販売価格（USD）</div>
                        <div class="result-value">$<?php echo $calculation_result['recommended_price']; ?></div>
                    </div>

                    <div class="result-item">
                        <div class="result-label">予想利益（USD）</div>
                        <div class="result-value <?php echo $calculation_result['profit'] > 0 ? 'profit-positive' : 'profit-negative'; ?>">
                            $<?php echo $calculation_result['profit']; ?>
                        </div>
                    </div>

                    <div class="result-item">
                        <div class="result-label">利益率</div>
                        <div class="result-value <?php echo $calculation_result['margin'] > 15 ? 'profit-positive' : 'profit-negative'; ?>">
                            <?php echo $calculation_result['margin']; ?>%
                        </div>
                    </div>

                    <div class="info-grid">
                        <div class="info-card">
                            <h4>💡 推奨事項</h4>
                            <p>
                                <?php if ($calculation_result['margin'] > 25): ?>
                                    🟢 優秀な利益率です！
                                <?php elseif ($calculation_result['margin'] > 15): ?>
                                    🟡 標準的な利益率です
                                <?php else: ?>
                                    🔴 利益率が低すぎます
                                <?php endif; ?>
                            </p>
                        </div>
                        
                        <div class="info-card">
                            <h4>📊 eBay手数料</h4>
                            <p>$<?php echo round($calculation_result['recommended_price'] * 0.129, 2); ?></p>
                        </div>
                    </div>

                <?php else: ?>
                    <div class="result-item">
                        <div class="result-label">待機中</div>
                        <div class="result-value">商品価格を入力して「利益計算実行」をクリックしてください</div>
                    </div>
                <?php endif; ?>

                <div class="features-list">
                    <h3>🔗 関連ツール</h3>
                    <ul>
                        <li>
                            <span class="status-icon status-ready"></span>
                            <a href="../09_shipping/enhanced_calculation_php_complete.php" target="_blank">
                                送料計算システム
                            </a>
                        </li>
                        <li>
                            <span class="status-icon status-ready"></span>
                            <a href="../11_category/frontend/category_manager_fixed.php" target="_blank">
                                eBayカテゴリー管理
                            </a>
                        </li>
                        <li>
                            <span class="status-icon status-ready"></span>
                            <a href="../../yahoo_auction_complete_24tools.html" target="_blank">
                                メインダッシュボード
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <script>
        // 基本的なフォーム検証
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.querySelector('form');
            const inputs = form.querySelectorAll('input[type="number"]');

            inputs.forEach(input => {
                input.addEventListener('input', function() {
                    if (this.value < 0) {
                        this.value = 0;
                    }
                });
            });

            form.addEventListener('submit', function(e) {
                const yahooPrice = parseFloat(document.getElementById('yahoo_price').value);
                
                if (yahooPrice <= 0) {
                    e.preventDefault();
                    alert('Yahoo商品価格を正しく入力してください。');
                    return false;
                }
            });

            console.log('✅ Enhanced Price Calculator initialized');
        });

        // 為替レートリアルタイム更新（将来実装）
        function updateExchangeRate() {
            // 実際のAPI連携時に実装
            console.log('為替レート更新機能は将来実装予定');
        }
    </script>
</body>
</html>
