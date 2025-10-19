<?php
header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>16. Amazon統合システム</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #ff7675, #e84393); min-height: 100vh; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; color: white; margin-bottom: 2rem; }
        .header h1 { font-size: 2.5rem; margin-bottom: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .content { background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 8px 16px rgba(0,0,0,0.1); }
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
        .feature-card { background: #f8fafc; border-radius: 12px; padding: 1.5rem; border: 2px solid #e2e8f0; transition: all 0.3s ease; }
        .feature-card:hover { border-color: #ff7675; transform: translateY(-4px); }
        .feature-icon { width: 3rem; height: 3rem; background: linear-gradient(135deg, #ff7675, #e84393); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; margin-bottom: 1rem; }
        .status-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: #fef9c3; color: #92400e; }
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; background: linear-gradient(135deg, #ff7675, #e84393); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; border: none; cursor: pointer; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
        .navigation { display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fab fa-amazon"></i> Amazon統合システム</h1>
            <p>Amazon API連携・商品同期・統合管理システム</p>
        </div>

        <div class="content">
            <div class="status-badge">
                <i class="fas fa-star"></i> NEW - 開発中
            </div>

            <h2 style="margin: 1.5rem 0;">🚀 システム概要</h2>
            <p style="line-height: 1.6; margin-bottom: 2rem;">
                Amazon Marketplaceとの完全統合を実現するシステムです。
                商品の自動同期、在庫管理、価格監視、売上分析などの包括的な機能を提供します。
            </p>

            <div class="feature-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-sync"></i>
                    </div>
                    <h3>API連携</h3>
                    <p>Amazon Selling Partner APIとの完全統合による商品データの自動同期</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-boxes"></i>
                    </div>
                    <h3>在庫統合管理</h3>
                    <p>リアルタイム在庫監視と複数プラットフォーム間での在庫同期</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3>売上分析</h3>
                    <p>詳細な売上レポートとパフォーマンス分析ダッシュボード</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <h3>自動化機能</h3>
                    <p>価格調整、在庫補充、出品管理の完全自動化</p>
                </div>
            </div>

            <div class="navigation">
                <a href="ui/amazon_editor_ui.php" class="btn">
                    <i class="fas fa-edit"></i> Amazon商品編集UI
                </a>
                <a href="../17_amazon_integration_system/" class="btn">
                    <i class="fas fa-cogs"></i> 拡張システム
                </a>
                <a href="../18_amazon_inventory_listing/" class="btn">
                    <i class="fas fa-list"></i> 在庫・出品管理
                </a>
                <a href="../../yahoo_auction_complete_24tools.html" class="btn">
                    <i class="fas fa-home"></i> メインシステムに戻る
                </a>
            </div>
        </div>
    </div>
</body>
</html>