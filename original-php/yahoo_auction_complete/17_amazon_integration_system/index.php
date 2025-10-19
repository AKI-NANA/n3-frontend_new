<?php
header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>17. Amazon統合システム拡張</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #636e72, #2d3436); min-height: 100vh; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; color: white; margin-bottom: 2rem; }
        .header h1 { font-size: 2.5rem; margin-bottom: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .content { background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 8px 16px rgba(0,0,0,0.1); }
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
        .feature-card { background: #f8fafc; border-radius: 12px; padding: 1.5rem; border: 2px solid #e2e8f0; transition: all 0.3s ease; }
        .feature-card:hover { border-color: #636e72; transform: translateY(-4px); }
        .feature-icon { width: 3rem; height: 3rem; background: linear-gradient(135deg, #636e72, #2d3436); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; margin-bottom: 1rem; }
        .status-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: #fef9c3; color: #92400e; }
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; background: linear-gradient(135deg, #636e72, #2d3436); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; border: none; cursor: pointer; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
        .navigation { display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-cogs"></i> Amazon統合システム拡張</h1>
            <p>Amazon高度統合・自動化・最適化システム</p>
        </div>

        <div class="content">
            <div class="status-badge">
                <i class="fas fa-star"></i> NEW - 高度機能
            </div>

            <h2 style="margin: 1.5rem 0;">⚡ 拡張機能概要</h2>
            <p style="line-height: 1.6; margin-bottom: 2rem;">
                基本Amazon統合システムをさらに強化した拡張システムです。
                高度な自動化機能、パフォーマンス最適化、AI駆動の分析機能を提供します。
            </p>

            <div class="feature-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-brain"></i>
                    </div>
                    <h3>AI駆動分析</h3>
                    <p>機械学習による売上予測、需要分析、価格最適化提案</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-rocket"></i>
                    </div>
                    <h3>高速処理</h3>
                    <p>大量データの高速処理とリアルタイム同期機能</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h3>リスク管理</h3>
                    <p>自動リスク検出、アカウント保護、コンプライアンス監視</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-chart-pie"></i>
                    </div>
                    <h3>高度レポート</h3>
                    <p>カスタマイズ可能なダッシュボードと詳細分析レポート</p>
                </div>
            </div>

            <div class="navigation">
                <a href="../16_amazon_integration/" class="btn">
                    <i class="fas fa-arrow-left"></i> 基本システム
                </a>
                <a href="../18_amazon_inventory_listing/" class="btn">
                    <i class="fas fa-list"></i> 在庫・出品管理
                </a>
                <a href="../../yahoo_auction_complete_24tools.html" class="btn">
                    <i class="fas fa-home"></i> メインシステム
                </a>
            </div>
        </div>
    </div>
</body>
</html>