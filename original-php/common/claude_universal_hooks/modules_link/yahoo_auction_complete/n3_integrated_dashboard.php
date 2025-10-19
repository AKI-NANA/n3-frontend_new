<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction Tool - 統合システム</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #3b82f6;
            --secondary-color: #1e293b;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --info-color: #06b6d4;
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --border-color: #e2e8f0;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
        }

        .header h1 {
            font-size: 2.5rem;
            color: var(--text-primary);
            margin-bottom: 1rem;
            background: linear-gradient(135deg, var(--primary-color), var(--info-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .header p {
            font-size: 1.125rem;
            color: var(--text-secondary);
            max-width: 600px;
            margin: 0 auto;
        }

        .systems-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
        }

        .system-card {
            background: var(--bg-secondary);
            border-radius: 1rem;
            padding: 2rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
            border: 1px solid var(--border-color);
        }

        .system-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 25px rgba(0, 0, 0, 0.1);
        }

        .system-icon {
            width: 4rem;
            height: 4rem;
            border-radius: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.75rem;
            margin-bottom: 1.5rem;
            color: white;
        }

        .icon-dashboard { background: linear-gradient(135deg, #667eea, #764ba2); }
        .icon-scraping { background: linear-gradient(135deg, #f093fb, #f5576c); }
        .icon-approval { background: linear-gradient(135deg, #4facfe, #00f2fe); }
        .icon-analysis { background: linear-gradient(135deg, #43e97b, #38f9d7); }
        .icon-editing { background: linear-gradient(135deg, #fa709a, #fee140); }
        .icon-calculation { background: linear-gradient(135deg, #a8edea, #fed6e3); }
        .icon-filters { background: linear-gradient(135deg, #d299c2, #fef9d7); }
        .icon-listing { background: linear-gradient(135deg, #89f7fe, #66a6ff); }
        .icon-inventory { background: linear-gradient(135deg, #fdbb2d, #22c1c3); }
        .icon-profit { background: linear-gradient(135deg, #ee9ca7, #ffdde1); }
        .icon-html { background: linear-gradient(135deg, #667eea, #764ba2); }

        .system-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }

        .system-description {
            color: var(--text-secondary);
            margin-bottom: 1.5rem;
            line-height: 1.6;
        }

        .system-features {
            list-style: none;
            margin-bottom: 2rem;
        }

        .system-features li {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .system-features i {
            color: var(--success-color);
            width: 16px;
        }

        .system-actions {
            display: flex;
            gap: 1rem;
        }

        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 0.5rem;
            font-weight: 600;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .btn-primary {
            background: var(--primary-color);
            color: white;
        }

        .btn-secondary {
            background: var(--bg-primary);
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
        }

        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .stats-bar {
            background: var(--bg-secondary);
            border-radius: 1rem;
            padding: 2rem;
            margin-top: 3rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 2rem;
        }

        .stat-item {
            text-align: center;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 0.5rem;
        }

        .stat-label {
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }

            .header h1 {
                font-size: 2rem;
            }

            .systems-grid {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }

            .system-actions {
                flex-direction: column;
            }

            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1><i class="fas fa-rocket"></i> Yahoo Auction Tool</h1>
            <p>Yahoo オークション → eBay 自動出品システム<br>統合ワークフロー管理プラットフォーム</p>
        </header>

        <div class="systems-grid">
            <!-- ダッシュボード -->
            <div class="system-card">
                <div class="system-icon icon-dashboard">
                    <i class="fas fa-tachometer-alt"></i>
                </div>
                <h3 class="system-title">ダッシュボード</h3>
                <p class="system-description">システム全体の統計・商品検索・データ概要を一元管理</p>
                <ul class="system-features">
                    <li><i class="fas fa-check"></i> リアルタイム統計</li>
                    <li><i class="fas fa-check"></i> 商品検索機能</li>
                    <li><i class="fas fa-check"></i> システム状態監視</li>
                </ul>
                <div class="system-actions">
                    <a href="01_dashboard/dashboard.php" class="btn btn-primary">
                        <i class="fas fa-arrow-right"></i> 開く
                    </a>
                </div>
            </div>

            <!-- データ取得 -->
            <div class="system-card">
                <div class="system-icon icon-scraping">
                    <i class="fas fa-spider"></i>
                </div>
                <h3 class="system-title">データ取得</h3>
                <p class="system-description">Yahoo オークションからの商品データスクレイピング</p>
                <ul class="system-features">
                    <li><i class="fas fa-check"></i> URL一括取得</li>
                    <li><i class="fas fa-check"></i> CSV取込対応</li>
                    <li><i class="fas fa-check"></i> 自動データ検証</li>
                </ul>
                <div class="system-actions">
                    <a href="02_scraping/scraping.php" class="btn btn-primary">
                        <i class="fas fa-arrow-right"></i> 開く
                    </a>
                </div>
            </div>

            <!-- 商品承認 -->
            <div class="system-card">
                <div class="system-icon icon-approval">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 class="system-title">商品承認</h3>
                <p class="system-description">AI推奨による商品承認・否認システム</p>
                <ul class="system-features">
                    <li><i class="fas fa-check"></i> AI判定システム</li>
                    <li><i class="fas fa-check"></i> 一括操作対応</li>
                    <li><i class="fas fa-check"></i> リスク分析</li>
                </ul>
                <div class="system-actions">
                    <a href="03_approval/approval.php" class="btn btn-primary">
                        <i class="fas fa-arrow-right"></i> 開く
                    </a>
                </div>
            </div>

            <!-- 承認分析 -->
            <div class="system-card">
                <div class="system-icon icon-analysis">
                    <i class="fas fa-chart-bar"></i>
                </div>
                <h3 class="system-title">承認分析</h3>
                <p class="system-description">商品承認データの分析・レポート機能</p>
                <ul class="system-features">
                    <li><i class="fas fa-check"></i> 承認率分析</li>
                    <li><i class="fas fa-check"></i> カテゴリ別統計</li>
                    <li><i class="fas fa-check"></i> トレンド分析</li>
                </ul>
                <div class="system-actions">
                    <a href="04_analysis/analysis.php" class="btn btn-primary">
                        <i class="fas fa-arrow-right"></i> 開く
                    </a>
                </div>
            </div>

            <!-- データ編集 -->
            <div class="system-card">
                <div class="system-icon icon-editing">
                    <i class="fas fa-edit"></i>
                </div>
                <h3 class="system-title">データ編集</h3>
                <p class="system-description">商品データの編集・検証・CSV出力機能</p>
                <ul class="system-features">
                    <li><i class="fas fa-check"></i> Excelライク編集</li>
                    <li><i class="fas fa-check"></i> 一括更新機能</li>
                    <li><i class="fas fa-check"></i> データ検証</li>
                </ul>
                <div class="system-actions">
                    <a href="05_editing/editing.php" class="btn btn-primary">
                        <i class="fas fa-arrow-right"></i> 開く
                    </a>
                </div>
            </div>

            <!-- 送料計算 -->
            <div class="system-card">
                <div class="system-icon icon-calculation">
                    <i class="fas fa-calculator"></i>
                </div>
                <h3 class="system-title">送料計算</h3>
                <p class="system-description">国際配送料計算・最適配送方法提案</p>
                <ul class="system-features">
                    <li><i class="fas fa-check"></i> 重量・サイズ計算</li>
                    <li><i class="fas fa-check"></i> 配送候補表示</li>
                    <li><i class="fas fa-check"></i> コスト最適化</li>
                </ul>
                <div class="system-actions">
                    <a href="06_calculation/calculation.php" class="btn btn-primary">
                        <i class="fas fa-arrow-right"></i> 開く
                    </a>
                </div>
            </div>

            <!-- フィルター管理 -->
            <div class="system-card">
                <div class="system-icon icon-filters">
                    <i class="fas fa-filter"></i>
                </div>
                <h3 class="system-title">フィルター管理</h3>
                <p class="system-description">禁止キーワード管理・商品フィルタリング</p>
                <ul class="system-features">
                    <li><i class="fas fa-check"></i> 禁止キーワード管理</li>
                    <li><i class="fas fa-check"></i> CSV一括登録</li>
                    <li><i class="fas fa-check"></i> リアルタイムチェック</li>
                </ul>
                <div class="system-actions">
                    <a href="07_filters/filters.php" class="btn btn-primary">
                        <i class="fas fa-arrow-right"></i> 開く
                    </a>
                </div>
            </div>

            <!-- 出品管理 -->
            <div class="system-card">
                <div class="system-icon icon-listing">
                    <i class="fas fa-store"></i>
                </div>
                <h3 class="system-title">出品管理</h3>
                <p class="system-description">eBay一括出品・進行状況管理・エラーハンドリング</p>
                <ul class="system-features">
                    <li><i class="fas fa-check"></i> CSV一括出品</li>
                    <li><i class="fas fa-check"></i> リアルタイム進行状況</li>
                    <li><i class="fas fa-check"></i> エラー分離処理</li>
                </ul>
                <div class="system-actions">
                    <a href="08_listing/listing.php" class="btn btn-primary">
                        <i class="fas fa-arrow-right"></i> 開く
                    </a>
                </div>
            </div>

            <!-- 在庫管理 -->
            <div class="system-card">
                <div class="system-icon icon-inventory">
                    <i class="fas fa-warehouse"></i>
                </div>
                <h3 class="system-title">在庫管理</h3>
                <p class="system-description">在庫分析・価格監視・売上統計ダッシュボード</p>
                <ul class="system-features">
                    <li><i class="fas fa-check"></i> リアルタイム在庫監視</li>
                    <li><i class="fas fa-check"></i> 価格変動アラート</li>
                    <li><i class="fas fa-check"></i> 売上分析チャート</li>
                </ul>
                <div class="system-actions">
                    <a href="09_inventory/inventory.php" class="btn btn-primary">
                        <i class="fas fa-arrow-right"></i> 開く
                    </a>
                </div>
            </div>

            <!-- 利益計算 -->
            <div class="system-card">
                <div class="system-icon icon-profit">
                    <i class="fas fa-chart-pie"></i>
                </div>
                <h3 class="system-title">利益計算</h3>
                <p class="system-description">ROI分析・マージン管理・利益最適化ツール</p>
                <ul class="system-features">
                    <li><i class="fas fa-check"></i> リアルタイム利益計算</li>
                    <li><i class="fas fa-check"></i> ROI分析</li>
                    <li><i class="fas fa-check"></i> カテゴリ別収益性</li>
                </ul>
                <div class="system-actions">
                    <a href="10_riekikeisan/riekikeisan.php" class="btn btn-primary">
                        <i class="fas fa-arrow-right"></i> 開く
                    </a>
                </div>
            </div>

            <!-- HTML編集 -->
            <div class="system-card">
                <div class="system-icon icon-html">
                    <i class="fas fa-code"></i>
                </div>
                <h3 class="system-title">HTML編集</h3>
                <p class="system-description">商品説明HTMLテンプレート作成・編集・プレビュー</p>
                <ul class="system-features">
                    <li><i class="fas fa-check"></i> HTMLテンプレート編集</li>
                    <li><i class="fas fa-check"></i> リアルタイムプレビュー</li>
                    <li><i class="fas fa-check"></i> 変数差し込み機能</li>
                </ul>
                <div class="system-actions">
                    <a href="11_html_editor/html_editor.php" class="btn btn-primary">
                        <i class="fas fa-arrow-right"></i> 開く
                    </a>
                </div>
            </div>
        </div>

        <div class="stats-bar">
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">11</div>
                    <div class="stat-label">システム数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">100%</div>
                    <div class="stat-label">完成率</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">独立</div>
                    <div class="stat-label">ページ構成</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">統合</div>
                    <div class="stat-label">ワークフロー</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        console.log('🚀 Yahoo Auction Tool 統合システム初期化完了');
        console.log('📊 利用可能システム: 11個');
        console.log('✅ 全システム独立稼働可能');
    </script>
</body>
</html>