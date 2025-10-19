<?php
/**
 * Enhanced Price Calculator - UI統合版
 * 高度利益計算システム with フロントエンド
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
} catch (PDOException $e) {
    $pdo = null;
    $db_error = $e->getMessage();
}

// JSON APIリクエスト処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && 
    strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
    
    header('Content-Type: application/json; charset=UTF-8');
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
        
        switch ($action) {
            case 'calculate_enhanced_profit':
                echo json_encode(handleEnhancedProfitCalculation($input, $pdo));
                break;
                
            case 'get_calculation_history':
                echo json_encode(getCalculationHistory($pdo));
                break;
                
            default:
                echo json_encode(['success' => false, 'error' => '不明なアクション: ' . $action]);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'APIエラー: ' . $e->getMessage()]);
    }
    
    exit;
}

/**
 * 高度利益計算処理
 */
function handleEnhancedProfitCalculation($input, $pdo) {
    try {
        // 基本データ取得
        $yahoo_price = floatval($input['yahoo_price'] ?? 0);
        $sell_price = floatval($input['sell_price'] ?? 0);
        $shipping_cost = floatval($input['shipping_cost'] ?? 0);
        $ebay_site = $input['ebay_site'] ?? 'ebay.com';
        $category = $input['category'] ?? 'electronics';
        
        if ($yahoo_price <= 0 || $sell_price <= 0) {
            return ['success' => false, 'error' => '価格を正しく入力してください'];
        }
        
        // 為替レート（安全マージン込み）
        $base_exchange_rate = 150.0;
        $safety_margin = 5.0; // 5%
        $safe_exchange_rate = $base_exchange_rate * (1 + $safety_margin / 100);
        
        // 手数料計算
        $final_value_fee_rate = getFinalValueFeeRate($category);
        $final_value_fee = $sell_price * $final_value_fee_rate;
        $paypal_fee = $sell_price * 0.034 + 0.30; // PayPal手数料
        $international_fee = $sell_price * 0.013; // 国際取引手数料
        $total_fees = $final_value_fee + $paypal_fee + $international_fee;
        
        // 利益計算
        $total_revenue_usd = $sell_price + $shipping_cost;
        $total_cost_jpy = $yahoo_price + 300; // 国内送料
        $total_cost_usd = $total_cost_jpy / $safe_exchange_rate;
        $net_profit_usd = $total_revenue_usd - $total_cost_usd - $total_fees - $shipping_cost;
        $net_profit_jpy = $net_profit_usd * $safe_exchange_rate;
        
        // 比率計算
        $profit_margin = ($net_profit_usd / $total_revenue_usd) * 100;
        $roi = ($net_profit_usd / $total_cost_usd) * 100;
        
        // 推奨価格計算
        $target_margin = 25; // 目標利益率25%
        $recommended_price = ($total_cost_usd + $shipping_cost + $total_fees) / (1 - $target_margin / 100);
        
        $result = [
            'success' => true,
            'data' => [
                'profit_usd' => round($net_profit_usd, 2),
                'profit_jpy' => round($net_profit_jpy, 0),
                'profit_margin' => round($profit_margin, 2),
                'roi' => round($roi, 2),
                'total_cost_usd' => round($total_cost_usd, 2),
                'total_revenue_usd' => round($total_revenue_usd, 2),
                'total_fees' => round($total_fees, 2),
                'recommended_price' => round($recommended_price, 2),
                'exchange_rate' => $safe_exchange_rate,
                'fees_breakdown' => [
                    'final_value_fee' => round($final_value_fee, 2),
                    'paypal_fee' => round($paypal_fee, 2),
                    'international_fee' => round($international_fee, 2)
                ]
            ]
        ];
        
        // 計算履歴保存
        if ($pdo) {
            saveCalculationHistory($pdo, $input, $result['data']);
        }
        
        return $result;
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => '計算エラー: ' . $e->getMessage()];
    }
}

/**
 * eBayカテゴリー別手数料率取得
 */
function getFinalValueFeeRate($category) {
    $rates = [
        'electronics' => 0.129,      // 12.9%
        'clothing' => 0.135,         // 13.5%
        'collectibles' => 0.135,     // 13.5%
        'books' => 0.129,            // 12.9%
        'toys' => 0.129,             // 12.9%
        'sports' => 0.129,           // 12.9%
        'other' => 0.129             // 12.9%
    ];
    
    return $rates[$category] ?? $rates['other'];
}

/**
 * 計算履歴保存
 */
function saveCalculationHistory($pdo, $input, $result) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO enhanced_profit_calculations 
            (yahoo_price, sell_price, shipping_cost, ebay_site, category,
             profit_usd, profit_margin, roi, calculated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([
            $input['yahoo_price'],
            $input['sell_price'],
            $input['shipping_cost'],
            $input['ebay_site'],
            $input['category'],
            $result['profit_usd'],
            $result['profit_margin'],
            $result['roi']
        ]);
    } catch (Exception $e) {
        error_log('計算履歴保存エラー: ' . $e->getMessage());
    }
}

/**
 * 計算履歴取得
 */
function getCalculationHistory($pdo) {
    if (!$pdo) {
        return ['success' => false, 'error' => 'データベース接続エラー'];
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT yahoo_price, sell_price, profit_usd, profit_margin, 
                   roi, calculated_at, ebay_site, category
            FROM enhanced_profit_calculations 
            ORDER BY calculated_at DESC 
            LIMIT 20
        ");
        $stmt->execute();
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'data' => $history
        ];
    } catch (Exception $e) {
        return ['success' => false, 'error' => '履歴取得エラー: ' . $e->getMessage()];
    }
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>高度利益計算システム - Enhanced Version</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #667eea;
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
            --radius: 0.5rem;
            --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            
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

        .header {
            background: linear-gradient(135deg, var(--primary), #764ba2);
            color: white;
            padding: var(--space-xl);
            border-radius: var(--radius);
            margin-bottom: var(--space-xl);
            text-align: center;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: var(--space-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-md);
        }

        .status-bar {
            padding: var(--space-lg);
            margin-bottom: var(--space-lg);
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            gap: var(--space-md);
        }

        .status-connected {
            background: linear-gradient(135deg, #d1fae5, #a7f3d0);
            border: 2px solid var(--success);
            color: #065f46;
        }

        .status-error {
            background: linear-gradient(135deg, #fef2f2, #fee2e2);
            border: 2px solid var(--danger);
            color: #7f1d1d;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: var(--space-xl);
            margin-bottom: var(--space-xl);
        }

        .card {
            background: var(--bg-secondary);
            border-radius: var(--radius);
            padding: var(--space-xl);
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
        }

        .card-header {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: var(--space-lg);
            padding-bottom: var(--space-md);
            border-bottom: 2px solid var(--border);
        }

        .card-header i {
            color: var(--primary);
        }

        .form-group {
            margin-bottom: var(--space-lg);
        }

        .form-label {
            display: block;
            margin-bottom: var(--space-sm);
            font-weight: 600;
            color: var(--text-primary);
        }

        .form-input, .form-select {
            width: 100%;
            padding: var(--space-md);
            border: 2px solid var(--border);
            border-radius: var(--radius);
            font-size: 1rem;
            transition: all 0.2s ease;
        }

        .form-input:focus, .form-select:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-md) var(--space-lg);
            border: none;
            border-radius: var(--radius);
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--primary), #764ba2);
            color: white;
            box-shadow: var(--shadow);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
        }

        .btn-secondary {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 2px solid var(--border);
        }

        .calculation-actions {
            display: flex;
            justify-content: center;
            gap: var(--space-lg);
            margin-bottom: var(--space-xl);
        }

        .result-card {
            background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
            border: 2px solid var(--info);
            border-radius: var(--radius);
            padding: var(--space-xl);
            margin-bottom: var(--space-xl);
            display: none;
        }

        .result-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-lg);
        }

        .result-item {
            text-align: center;
            padding: var(--space-lg);
            background: white;
            border-radius: var(--radius);
            box-shadow: var(--shadow);
        }

        .result-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: var(--space-sm);
        }

        .result-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .profit-positive {
            color: var(--success);
        }

        .profit-negative {
            color: var(--danger);
        }

        .loading {
            display: none;
            text-align: center;
            padding: var(--space-xl);
        }

        .spinner {
            display: inline-block;
            width: 2rem;
            height: 2rem;
            border: 3px solid var(--border);
            border-radius: 50%;
            border-top-color: var(--primary);
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            .grid {
                grid-template-columns: 1fr;
            }
            
            .calculation-actions {
                flex-direction: column;
                align-items: center;
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
            <h1><i class="fas fa-chart-line"></i> 高度利益計算システム</h1>
            <p>Enhanced Price Calculator - ボリュームディスカウント・変動手数料対応</p>
        </div>

        <!-- ステータス表示 -->
        <?php if ($pdo && !$db_error): ?>
        <div class="status-bar status-connected">
            <i class="fas fa-database"></i>
            <div>
                <strong>✅ データベース接続成功</strong><br>
                高度計算機能・履歴保存が利用できます。
            </div>
        </div>
        <?php else: ?>
        <div class="status-bar status-error">
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <strong>❌ データベース接続エラー</strong><br>
                <?= htmlspecialchars($db_error ?? 'Unknown error') ?><br>
                基本計算機能のみ利用できます。
            </div>
        </div>
        <?php endif; ?>

        <!-- 計算フォーム -->
        <div class="grid">
            <!-- 基本設定 -->
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-cog"></i>
                    基本設定
                </div>
                
                <div class="form-group">
                    <label class="form-label">Yahoo価格（円）</label>
                    <input type="number" id="yahooPrice" class="form-input" 
                           placeholder="50000" min="0" step="100" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">eBay販売価格（USD）</label>
                    <input type="number" id="sellPrice" class="form-input" 
                           placeholder="400.00" min="0" step="0.01" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">送料（USD）</label>
                    <input type="number" id="shippingCost" class="form-input" 
                           placeholder="25.00" min="0" step="0.01">
                </div>
            </div>

            <!-- 詳細設定 -->
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-sliders-h"></i>
                    詳細設定
                </div>
                
                <div class="form-group">
                    <label class="form-label">eBayサイト</label>
                    <select id="ebaySite" class="form-select">
                        <option value="ebay.com">🇺🇸 eBay.com (USD)</option>
                        <option value="ebay.co.uk">🇬🇧 eBay.co.uk (GBP)</option>
                        <option value="ebay.de">🇩🇪 eBay.de (EUR)</option>
                        <option value="ebay.com.au">🇦🇺 eBay.com.au (AUD)</option>
                        <option value="ebay.ca">🇨🇦 eBay.ca (CAD)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">商品カテゴリー</label>
                    <select id="category" class="form-select">
                        <option value="electronics">📱 Electronics (12.9%)</option>
                        <option value="clothing">👕 Clothing (13.5%)</option>
                        <option value="collectibles">🎨 Collectibles (13.5%)</option>
                        <option value="books">📚 Books (12.9%)</option>
                        <option value="toys">🧸 Toys (12.9%)</option>
                        <option value="sports">⚽ Sports (12.9%)</option>
                        <option value="other">🔧 Other (12.9%)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">商品タイトル（任意）</label>
                    <input type="text" id="itemTitle" class="form-input" 
                           placeholder="iPhone 14 Pro 128GB">
                </div>
            </div>
        </div>

        <!-- 計算ボタン -->
        <div class="calculation-actions">
            <button class="btn btn-primary" onclick="calculateEnhancedProfit()" id="calculateBtn">
                <i class="fas fa-calculator"></i>
                高度利益計算実行
            </button>
            <button class="btn btn-secondary" onclick="clearForm()">
                <i class="fas fa-eraser"></i>
                フォームクリア
            </button>
        </div>

        <!-- ローディング -->
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p style="margin-top: var(--space-md);">計算処理中...</p>
        </div>

        <!-- 計算結果 -->
        <div class="result-card" id="resultCard">
            <div class="card-header">
                <i class="fas fa-chart-bar"></i>
                計算結果
            </div>
            
            <div class="result-grid" id="resultGrid">
                <!-- 動的に生成 -->
            </div>
            
            <div style="margin-top: var(--space-xl);">
                <h4>手数料内訳</h4>
                <div id="feesBreakdown"></div>
            </div>
        </div>
    </div>

    <script>
        // 計算実行
        async function calculateEnhancedProfit() {
            try {
                const data = {
                    action: 'calculate_enhanced_profit',
                    yahoo_price: parseFloat(document.getElementById('yahooPrice').value),
                    sell_price: parseFloat(document.getElementById('sellPrice').value),
                    shipping_cost: parseFloat(document.getElementById('shippingCost').value) || 0,
                    ebay_site: document.getElementById('ebaySite').value,
                    category: document.getElementById('category').value,
                    item_title: document.getElementById('itemTitle').value
                };

                if (!data.yahoo_price || !data.sell_price) {
                    alert('Yahoo価格とeBay販売価格を入力してください。');
                    return;
                }

                showLoading(true);

                const response = await fetch('', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    displayResults(result.data);
                } else {
                    alert('計算エラー: ' + result.error);
                }

            } catch (error) {
                console.error('計算エラー:', error);
                alert('計算処理中にエラーが発生しました。');
            } finally {
                showLoading(false);
            }
        }

        // 結果表示
        function displayResults(data) {
            const resultGrid = document.getElementById('resultGrid');
            const profitClass = data.profit_usd >= 0 ? 'profit-positive' : 'profit-negative';
            
            resultGrid.innerHTML = `
                <div class="result-item">
                    <div class="result-value ${profitClass}">$${data.profit_usd}</div>
                    <div class="result-label">純利益 (USD)</div>
                </div>
                <div class="result-item">
                    <div class="result-value ${profitClass}">¥${data.profit_jpy.toLocaleString()}</div>
                    <div class="result-label">純利益 (JPY)</div>
                </div>
                <div class="result-item">
                    <div class="result-value ${profitClass}">${data.profit_margin}%</div>
                    <div class="result-label">利益率</div>
                </div>
                <div class="result-item">
                    <div class="result-value ${profitClass}">${data.roi}%</div>
                    <div class="result-label">ROI</div>
                </div>
                <div class="result-item">
                    <div class="result-value">$${data.total_cost_usd}</div>
                    <div class="result-label">総コスト</div>
                </div>
                <div class="result-item">
                    <div class="result-value">$${data.recommended_price}</div>
                    <div class="result-label">推奨価格 (25%)</div>
                </div>
            `;

            // 手数料内訳
            const feesBreakdown = document.getElementById('feesBreakdown');
            feesBreakdown.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-md); margin-top: var(--space-md);">
                    <div>
                        <strong>Final Value Fee:</strong><br>
                        $${data.fees_breakdown.final_value_fee}
                    </div>
                    <div>
                        <strong>PayPal Fee:</strong><br>
                        $${data.fees_breakdown.paypal_fee}
                    </div>
                    <div>
                        <strong>International Fee:</strong><br>
                        $${data.fees_breakdown.international_fee}
                    </div>
                    <div>
                        <strong>総手数料:</strong><br>
                        $${data.total_fees}
                    </div>
                </div>
                <div style="margin-top: var(--space-lg); padding: var(--space-md); background: var(--bg-tertiary); border-radius: var(--radius);">
                    <strong>為替レート:</strong> ¥${data.exchange_rate} (安全マージン込み)
                </div>
            `;

            document.getElementById('resultCard').style.display = 'block';
            document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth' });
        }

        // ローディング表示制御
        function showLoading(show) {
            const loading = document.getElementById('loading');
            const btn = document.getElementById('calculateBtn');
            
            if (show) {
                loading.style.display = 'block';
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 計算中...';
            } else {
                loading.style.display = 'none';
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-calculator"></i> 高度利益計算実行';
            }
        }

        // フォームクリア
        function clearForm() {
            document.getElementById('yahooPrice').value = '';
            document.getElementById('sellPrice').value = '';
            document.getElementById('shippingCost').value = '';
            document.getElementById('itemTitle').value = '';
            document.getElementById('resultCard').style.display = 'none';
        }

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('高度利益計算システム 初期化完了');
        });
    </script>
</body>
</html>