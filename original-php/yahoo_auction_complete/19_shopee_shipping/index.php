<?php
header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>19. Shopee送料計算システム</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #00cec9, #55efc4); min-height: 100vh; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; color: white; margin-bottom: 2rem; }
        .header h1 { font-size: 2.5rem; margin-bottom: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .content { background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 8px 16px rgba(0,0,0,0.1); }
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
        .feature-card { background: #f8fafc; border-radius: 12px; padding: 1.5rem; border: 2px solid #e2e8f0; transition: all 0.3s ease; }
        .feature-card:hover { border-color: #00cec9; transform: translateY(-4px); }
        .feature-icon { width: 3rem; height: 3rem; background: linear-gradient(135deg, #00cec9, #55efc4); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; margin-bottom: 1rem; }
        .status-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: #fef9c3; color: #92400e; }
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; background: linear-gradient(135deg, #00cec9, #55efc4); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; border: none; cursor: pointer; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
        .navigation { display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap; }
        .calculator { background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 12px; padding: 1.5rem; margin: 2rem 0; }
        .form-row { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .form-group { flex: 1; min-width: 200px; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
        .form-group input, .form-group select { width: 100%; padding: 0.8rem; border: 2px solid #e2e8f0; border-radius: 6px; }
        .result { background: #dcfce7; border: 2px solid #16a34a; border-radius: 8px; padding: 1rem; margin-top: 1rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-truck"></i> Shopee送料計算システム</h1>
            <p>Shopee専用送料計算・配送最適化・コスト分析</p>
        </div>

        <div class="content">
            <div class="status-badge">
                <i class="fas fa-star"></i> NEW - Shopee特化
            </div>

            <h2 style="margin: 1.5rem 0;">🚚 Shopee送料計算</h2>
            <p style="line-height: 1.6; margin-bottom: 2rem;">
                Shopee マーケットプレイス専用の送料計算システムです。
                東南アジア各国への配送料金を正確に計算し、配送最適化とコスト分析を実現します。
            </p>

            <div class="calculator">
                <h3 style="margin-bottom: 1rem;">📦 送料計算機</h3>
                <form id="shippingCalculator">
                    <div class="form-row">
                        <div class="form-group">
                            <label>配送先国</label>
                            <select id="country">
                                <option value="">選択してください</option>
                                <option value="singapore">シンガポール</option>
                                <option value="malaysia">マレーシア</option>
                                <option value="thailand">タイ</option>
                                <option value="vietnam">ベトナム</option>
                                <option value="philippines">フィリピン</option>
                                <option value="indonesia">インドネシア</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>重量 (kg)</label>
                            <input type="number" id="weight" min="0.1" step="0.1" placeholder="1.0">
                        </div>
                        <div class="form-group">
                            <label>配送方法</label>
                            <select id="method">
                                <option value="standard">スタンダード</option>
                                <option value="express">エクスプレス</option>
                                <option value="economy">エコノミー</option>
                            </select>
                        </div>
                    </div>
                    <button type="button" class="btn" onclick="calculateShipping()">
                        <i class="fas fa-calculator"></i> 送料計算
                    </button>
                </form>
                <div id="result" class="result" style="display: none;">
                    <h4>計算結果</h4>
                    <p id="resultText"></p>
                </div>
            </div>

            <div class="feature-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <h3>配送最適化</h3>
                    <p>東南アジア各国への最適配送ルートと料金比較</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3>コスト分析</h3>
                    <p>配送コストの詳細分析と利益率シミュレーション</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <h3>配送時間予測</h3>
                    <p>配送方法別の到着予定日計算と追跡機能</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-database"></i>
                    </div>
                    <h3>料金データベース</h3>
                    <p>リアルタイム料金更新と履歴管理システム</p>
                </div>
            </div>

            <div class="navigation">
                <a href="../09_shipping/" class="btn">
                    <i class="fas fa-shipping-fast"></i> eBay送料システム
                </a>
                <a href="../../yahoo_auction_complete_24tools.html" class="btn">
                    <i class="fas fa-home"></i> メインシステム
                </a>
            </div>
        </div>
    </div>

    <script>
        function calculateShipping() {
            const country = document.getElementById('country').value;
            const weight = parseFloat(document.getElementById('weight').value);
            const method = document.getElementById('method').value;
            
            if (!country || !weight) {
                alert('配送先国と重量を入力してください');
                return;
            }
            
            // 簡易計算ロジック（実際のAPIに置き換え可能）
            const rates = {
                singapore: { standard: 800, express: 1200, economy: 600 },
                malaysia: { standard: 900, express: 1400, economy: 700 },
                thailand: { standard: 1000, express: 1500, economy: 800 },
                vietnam: { standard: 1100, express: 1600, economy: 900 },
                philippines: { standard: 1200, express: 1800, economy: 1000 },
                indonesia: { standard: 1300, express: 2000, economy: 1100 }
            };
            
            const baseRate = rates[country][method];
            const totalCost = Math.round(baseRate * weight);
            
            const countryNames = {
                singapore: 'シンガポール',
                malaysia: 'マレーシア', 
                thailand: 'タイ',
                vietnam: 'ベトナム',
                philippines: 'フィリピン',
                indonesia: 'インドネシア'
            };
            
            const methodNames = {
                standard: 'スタンダード',
                express: 'エクスプレス',
                economy: 'エコノミー'
            };
            
            document.getElementById('resultText').innerHTML = `
                <strong>配送先:</strong> ${countryNames[country]}<br>
                <strong>重量:</strong> ${weight}kg<br>
                <strong>配送方法:</strong> ${methodNames[method]}<br>
                <strong>送料:</strong> ¥${totalCost.toLocaleString()}
            `;
            document.getElementById('result').style.display = 'block';
        }
    </script>
</body>
</html>