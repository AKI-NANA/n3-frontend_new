<?php
header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>22. リサーチ強化システム</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #a29bfe, #74b9ff); min-height: 100vh; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; color: white; margin-bottom: 2rem; }
        .header h1 { font-size: 2.5rem; margin-bottom: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .content { background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 8px 16px rgba(0,0,0,0.1); }
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
        .feature-card { background: #f8fafc; border-radius: 12px; padding: 1.5rem; border: 2px solid #e2e8f0; transition: all 0.3s ease; }
        .feature-card:hover { border-color: #a29bfe; transform: translateY(-4px); }
        .feature-icon { width: 3rem; height: 3rem; background: linear-gradient(135deg, #a29bfe, #74b9ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; margin-bottom: 1rem; }
        .status-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: #fef9c3; color: #92400e; }
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; background: linear-gradient(135deg, #a29bfe, #74b9ff); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; border: none; cursor: pointer; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
        .navigation { display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap; }
        .research-tool { background: #f0f4ff; border: 2px solid #a29bfe; border-radius: 12px; padding: 1.5rem; margin: 2rem 0; }
        .search-form { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .search-input { flex: 1; min-width: 200px; padding: 0.8rem; border: 2px solid #e2e8f0; border-radius: 6px; }
        .trend-chart { background: white; border-radius: 8px; padding: 1rem; margin: 1rem 0; border: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-search-plus"></i> リサーチ強化システム</h1>
            <p>市場調査・競合分析・トレンド予測・データマイニング</p>
        </div>

        <div class="content">
            <div class="status-badge">
                <i class="fas fa-star"></i> NEW - 高度分析機能
            </div>

            <h2 style="margin: 1.5rem 0;">🔍 高度リサーチシステム</h2>
            <p style="line-height: 1.6; margin-bottom: 2rem;">
                AI駆動の市場調査と競合分析システムです。
                トレンド予測、価格動向分析、商品需要予測など、データに基づいた戦略的意思決定を支援します。
            </p>

            <div class="research-tool">
                <h3 style="margin-bottom: 1rem;">🎯 商品リサーチツール</h3>
                <div class="search-form">
                    <input type="text" class="search-input" placeholder="商品キーワードを入力..." id="searchKeyword">
                    <select class="search-input" style="flex: 0 0 150px;" id="platform">
                        <option value="all">全プラットフォーム</option>
                        <option value="ebay">eBay</option>
                        <option value="amazon">Amazon</option>
                        <option value="yahoo">Yahoo Auction</option>
                        <option value="shopee">Shopee</option>
                    </select>
                    <button class="btn" onclick="performResearch()">
                        <i class="fas fa-search"></i> 分析開始
                    </button>
                </div>
                <div id="researchResults" style="display: none;">
                    <div class="trend-chart">
                        <h4>📈 価格トレンド分析</h4>
                        <div id="priceChart" style="height: 200px; background: #f9fafb; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #6b7280;">
                            チャートデータを読み込み中...
                        </div>
                    </div>
                    <div class="trend-chart">
                        <h4>🏆 競合商品分析</h4>
                        <div id="competitorAnalysis"></div>
                    </div>
                </div>
            </div>

            <div class="feature-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3>市場調査機能</h3>
                    <p>リアルタイム市場データ分析と需要予測システム</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <h3>競合分析</h3>
                    <p>競合他社の価格戦略、販売動向、市場シェア分析</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-crystal-ball"></i>
                    </div>
                    <h3>トレンド予測</h3>
                    <p>AI機械学習による売れ筋商品とトレンド予測</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-database"></i>
                    </div>
                    <h3>データマイニング</h3>
                    <p>大量商品データからの有益な洞察とパターン発見</p>
                </div>
            </div>

            <div class="navigation">
                <a href="../../yahoo_auction_complete_24tools.html" class="btn">
                    <i class="fas fa-home"></i> メインシステム
                </a>
            </div>
        </div>
    </div>

    <script>
        function performResearch() {
            const keyword = document.getElementById('searchKeyword').value;
            const platform = document.getElementById('platform').value;
            
            if (!keyword.trim()) {
                alert('検索キーワードを入力してください');
                return;
            }
            
            // デモデータの表示
            document.getElementById('researchResults').style.display = 'block';
            
            // 価格チャートのデモ
            document.getElementById('priceChart').innerHTML = `
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                    <div style="background: linear-gradient(135deg, #a29bfe, #74b9ff); width: 80%; height: 120px; border-radius: 4px; position: relative; overflow: hidden;">
                        <div style="position: absolute; bottom: 10px; left: 10px; color: white; font-size: 0.8rem;">
                            ${keyword} - 価格推移 (30日間)
                        </div>
                        <div style="position: absolute; top: 10px; right: 10px; color: white; font-size: 0.9rem; font-weight: bold;">
                            平均価格: ¥${Math.floor(Math.random() * 50000 + 10000).toLocaleString()}
                        </div>
                    </div>
                    <div style="margin-top: 1rem; font-size: 0.9rem; color: #6b7280;">
                        📊 過去30日間の価格変動: +${Math.floor(Math.random() * 20 + 5)}%
                    </div>
                </div>
            `;
            
            // 競合分析のデモ
            const competitors = [
                { name: '競合店舗A', price: Math.floor(Math.random() * 30000 + 15000), sales: Math.floor(Math.random() * 100 + 50) },
                { name: '競合店舗B', price: Math.floor(Math.random() * 30000 + 15000), sales: Math.floor(Math.random() * 100 + 50) },
                { name: '競合店舗C', price: Math.floor(Math.random() * 30000 + 15000), sales: Math.floor(Math.random() * 100 + 50) }
            ];
            
            document.getElementById('competitorAnalysis').innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    ${competitors.map(comp => `
                        <div style="background: white; padding: 1rem; border-radius: 6px; border: 1px solid #e2e8f0;">
                            <h5>${comp.name}</h5>
                            <p>平均価格: ¥${comp.price.toLocaleString()}</p>
                            <p>月間販売数: ${comp.sales}点</p>
                            <p style="color: #10b981; font-size: 0.8rem;">市場シェア: ${Math.floor(Math.random() * 30 + 10)}%</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    </script>
</body>
</html>