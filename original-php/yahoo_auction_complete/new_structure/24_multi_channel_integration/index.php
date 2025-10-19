<?php
header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>24. 多販路一元化システム</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #fdcb6e, #e17055); min-height: 100vh; color: #333; }
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; color: white; margin-bottom: 2rem; }
        .header h1 { font-size: 3rem; margin-bottom: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .ultimate-badge { background: linear-gradient(135deg, #fff, #ffd700); color: #333; padding: 0.8rem 1.5rem; border-radius: 25px; font-weight: 700; font-size: 1rem; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 8px rgba(0,0,0,0.2); animation: glow 2s infinite; }
        @keyframes glow { 0%, 100% { box-shadow: 0 4px 8px rgba(0,0,0,0.2); } 50% { box-shadow: 0 8px 16px rgba(255,215,0,0.5); } }
        .content { background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 8px 16px rgba(0,0,0,0.1); }
        .platform-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
        .platform-card { background: #f8fafc; border-radius: 12px; padding: 1.5rem; border: 2px solid #e2e8f0; transition: all 0.3s ease; text-align: center; }
        .platform-card:hover { border-color: #fdcb6e; transform: translateY(-4px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); }
        .platform-icon { width: 4rem; height: 4rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; margin: 0 auto 1rem; }
        .ebay { background: linear-gradient(135deg, #0064d2, #00a650); }
        .amazon { background: linear-gradient(135deg, #ff9900, #232f3e); }
        .yahoo { background: linear-gradient(135deg, #430297, #7b0099); }
        .shopee { background: linear-gradient(135deg, #ee4d2d, #f05123); }
        .mercari { background: linear-gradient(135deg, #d84315, #ff5722); }
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
        .feature-card { background: #f8fafc; border-radius: 12px; padding: 2rem; border: 2px solid #e2e8f0; transition: all 0.3s ease; }
        .feature-card:hover { border-color: #fdcb6e; transform: translateY(-4px); }
        .feature-icon { width: 3.5rem; height: 3.5rem; background: linear-gradient(135deg, #fdcb6e, #e17055); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.3rem; margin-bottom: 1.5rem; }
        .status-indicator { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.8rem; border-radius: 15px; font-size: 0.8rem; font-weight: 600; }
        .status-online { background: #dcfce7; color: #166534; }
        .status-sync { background: #dbeafe; color: #1d4ed8; }
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; background: linear-gradient(135deg, #fdcb6e, #e17055); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; border: none; cursor: pointer; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
        .navigation { display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap; }
        .dashboard { background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 12px; padding: 2rem; margin: 2rem 0; color: white; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
        .metric-card { background: rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; text-align: center; }
        .metric-value { font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; }
        .sync-demo { background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 12px; padding: 1.5rem; margin: 2rem 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-crown"></i> 多販路一元化システム</h1>
            <div class="ultimate-badge">
                <i class="fas fa-crown"></i> ULTIMATE SYSTEM
            </div>
            <p style="margin-top: 1rem; font-size: 1.2rem;">全プラットフォーム統合・在庫同期・売上一元管理</p>
        </div>

        <div class="content">
            <h2 style="margin: 1.5rem 0; text-align: center;">🌐 統合プラットフォーム</h2>
            <p style="line-height: 1.6; margin-bottom: 2rem; text-align: center; font-size: 1.1rem;">
                複数のECプラットフォームを一元管理する究極のシステムです。<br>
                在庫の自動同期、価格の統一管理、売上の一括分析を実現します。
            </p>

            <div class="platform-grid">
                <div class="platform-card">
                    <div class="platform-icon ebay">
                        <i class="fab fa-ebay"></i>
                    </div>
                    <h3>eBay</h3>
                    <div class="status-indicator status-online">
                        <i class="fas fa-circle"></i> 接続済み
                    </div>
                    <p style="margin: 1rem 0; color: #6b7280;">グローバル市場への窓口</p>
                </div>

                <div class="platform-card">
                    <div class="platform-icon amazon">
                        <i class="fab fa-amazon"></i>
                    </div>
                    <h3>Amazon</h3>
                    <div class="status-indicator status-sync">
                        <i class="fas fa-sync-alt"></i> 同期中
                    </div>
                    <p style="margin: 1rem 0; color: #6b7280;">世界最大のマーケットプレイス</p>
                </div>

                <div class="platform-card">
                    <div class="platform-icon yahoo">
                        <i class="fas fa-yen-sign"></i>
                    </div>
                    <h3>Yahoo Auction</h3>
                    <div class="status-indicator status-online">
                        <i class="fas fa-circle"></i> 接続済み
                    </div>
                    <p style="margin: 1rem 0; color: #6b7280;">日本最大のオークションサイト</p>
                </div>

                <div class="platform-card">
                    <div class="platform-icon shopee">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <h3>Shopee</h3>
                    <div class="status-indicator status-online">
                        <i class="fas fa-circle"></i> 接続済み
                    </div>
                    <p style="margin: 1rem 0; color: #6b7280;">東南アジア最大のECプラットフォーム</p>
                </div>

                <div class="platform-card">
                    <div class="platform-icon mercari">
                        <i class="fas fa-mobile-alt"></i>
                    </div>
                    <h3>メルカリ</h3>
                    <div class="status-indicator status-sync">
                        <i class="fas fa-sync-alt"></i> 準備中
                    </div>
                    <p style="margin: 1rem 0; color: #6b7280;">日本のフリマアプリ</p>
                </div>
            </div>

            <div class="dashboard">
                <h3 style="margin-bottom: 1rem; text-align: center;">📊 統合ダッシュボード</h3>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${Math.floor(Math.random() * 500 + 200).toLocaleString()}</div>
                        <div>総出品数</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">¥${Math.floor(Math.random() * 5000000 + 1000000).toLocaleString()}</div>
                        <div>今月売上</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${Math.floor(Math.random() * 1000 + 500)}</div>
                        <div>在庫商品数</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${Math.floor(Math.random() * 50 + 20)}%</div>
                        <div>平均利益率</div>
                    </div>
                </div>
            </div>

            <div class="sync-demo">
                <h3 style="margin-bottom: 1rem;">⚡ リアルタイム同期デモ</h3>
                <button class="btn" onclick="simulateSync()" id="syncButton">
                    <i class="fas fa-sync-alt"></i> 同期実行
                </button>
                <div id="syncResults" style="display: none; margin-top: 1rem;">
                    <div style="background: white; border-radius: 8px; padding: 1rem;">
                        <h4>同期結果</h4>
                        <div id="syncLog"></div>
                    </div>
                </div>
            </div>

            <div class="feature-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-sync-alt"></i>
                    </div>
                    <h3>リアルタイム在庫同期</h3>
                    <p>全プラットフォーム間で在庫数をリアルタイムに同期。売り越しを防ぎ、機会損失を最小化します。</p>
                    <ul style="margin: 1rem 0; padding-left: 1.5rem; color: #6b7280;">
                        <li>自動在庫調整</li>
                        <li>売り越し防止アラート</li>
                        <li>在庫切れ自動停止</li>
                    </ul>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3>統合売上分析</h3>
                    <p>全プラットフォームの売上データを統合分析。利益率、トレンド、パフォーマンスを一元管理。</p>
                    <ul style="margin: 1rem 0; padding-left: 1.5rem; color: #6b7280;">
                        <li>プラットフォーム別売上比較</li>
                        <li>商品別利益率分析</li>
                        <li>トレンド予測</li>
                    </ul>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <h3>価格統一管理</h3>
                    <p>競合他社の価格を監視し、全プラットフォームで最適価格を自動設定・更新します。</p>
                    <ul style="margin: 1rem 0; padding-left: 1.5rem; color: #6b7280;">
                        <li>競合価格監視</li>
                        <li>自動価格調整</li>
                        <li>利益率保証</li>
                    </ul>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <h3>AI自動化システム</h3>
                    <p>機械学習による販売戦略最適化。需要予測、価格調整、在庫管理を完全自動化。</p>
                    <ul style="margin: 1rem 0; padding-left: 1.5rem; color: #6b7280;">
                        <li>需要予測AI</li>
                        <li>自動再出品</li>
                        <li>季節変動対応</li>
                    </ul>
                </div>
            </div>

            <div class="navigation">
                <a href="../16_amazon_integration/" class="btn">
                    <i class="fab fa-amazon"></i> Amazon統合
                </a>
                <a href="../19_shopee_shipping/" class="btn">
                    <i class="fas fa-truck"></i> Shopee配送
                </a>
                <a href="../../yahoo_auction_complete_24tools.html" class="btn">
                    <i class="fas fa-home"></i> メインシステム
                </a>
            </div>
        </div>
    </div>

    <script>
        function simulateSync() {
            const button = document.getElementById('syncButton');
            const results = document.getElementById('syncResults');
            const log = document.getElementById('syncLog');
            
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 同期中...';
            
            results.style.display = 'block';
            
            const platforms = ['eBay', 'Amazon', 'Yahoo Auction', 'Shopee'];
            let logContent = '';
            
            platforms.forEach((platform, index) => {
                setTimeout(() => {
                    const updated = Math.floor(Math.random() * 50 + 10);
                    const synced = Math.floor(Math.random() * 20 + 5);
                    
                    logContent += `
                        <div style="margin: 0.5rem 0; padding: 0.5rem; background: #f0f9ff; border-radius: 4px;">
                            <strong>${platform}</strong>: ${updated}商品更新, ${synced}在庫同期完了
                            <span style="color: #059669;">✓</span>
                        </div>
                    `;
                    log.innerHTML = logContent;
                    
                    if (index === platforms.length - 1) {
                        setTimeout(() => {
                            logContent += `
                                <div style="margin: 1rem 0; padding: 1rem; background: #dcfce7; border-radius: 6px; text-align: center; font-weight: 600; color: #166534;">
                                    <i class="fas fa-check-circle"></i> 全プラットフォーム同期完了！
                                </div>
                            `;
                            log.innerHTML = logContent;
                            
                            button.disabled = false;
                            button.innerHTML = '<i class="fas fa-sync-alt"></i> 同期実行';
                        }, 1000);
                    }
                }, (index + 1) * 800);
            });
        }
    </script>
</body>
</html>