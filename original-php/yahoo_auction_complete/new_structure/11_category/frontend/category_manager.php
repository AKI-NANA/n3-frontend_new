<?php
/**
 * eBayカテゴリーマネージャー - Excel風データ表示ツール
 * カテゴリー一覧・必須項目・手数料・出品枠の統合管理
 */

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// データベース接続
try {
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die('データベース接続失敗: ' . $e->getMessage());
}

// システム統計取得
$statsQuery = "
    SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN (ebay_api_data->>'category_id') IS NOT NULL THEN 1 END) as categorized_count,
        COUNT(CASE WHEN (ebay_api_data->>'stage') = 'basic' THEN 1 END) as stage1_count,
        COUNT(CASE WHEN (ebay_api_data->>'stage') = 'profit_enhanced' THEN 1 END) as stage2_count
    FROM yahoo_scraped_products
";
$statsStmt = $pdo->query($statsQuery);
$stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

// カテゴリー統計
$categoryStatsQuery = "
    SELECT COUNT(*) as category_count
    FROM ebay_categories 
    WHERE is_active = TRUE
";
$categoryStatsStmt = $pdo->query($categoryStatsQuery);
$categoryStats = $categoryStatsStmt->fetch(PDO::FETCH_ASSOC);

// 手数料統計
$feeStatsQuery = "
    SELECT COUNT(*) as fee_count,
           AVG(final_value_fee_percent) as avg_fee
    FROM ebay_category_fees 
    WHERE is_active = TRUE
";
$feeStatsStmt = $pdo->query($feeStatsQuery);
$feeStats = $feeStatsStmt->fetch(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBayカテゴリーマネージャー</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        /* 基本設定（filters.cssから継承） */
        :root {
            --filters-primary: #8b5cf6;
            --filters-secondary: #3b82f6;
            --filters-success: #10b981;
            --filters-warning: #f59e0b;
            --filters-danger: #ef4444;
            --filters-info: #3b82f6;
            
            --filters-gradient: linear-gradient(135deg, #8b5cf6, #3b82f6);
            --filters-gradient-hover: linear-gradient(135deg, #3b82f6, #8b5cf6);
            
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-tertiary: #f1f5f9;
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-tertiary: #64748b;
            --shadow-dark: #e2e8f0;
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --radius-md: 0.375rem;
            --radius-lg: 0.5rem;
            --radius-xl: 0.75rem;
            --space-2: 0.5rem;
            --space-3: 0.75rem;
            --space-4: 1rem;
            --space-6: 1.5rem;
            --space-8: 2rem;
            --transition: all 0.2s ease;
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
            padding: var(--space-6);
        }

        /* ヘッダー */
        .filters__header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: var(--space-6);
            padding: var(--space-6);
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-md);
            border: 1px solid var(--shadow-dark);
        }

        .filters__title {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0;
            display: flex;
            align-items: center;
            gap: var(--space-3);
            background: var(--filters-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .filters__title-icon {
            font-size: 2rem;
            background: var(--filters-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .filters__header-actions {
            display: flex;
            gap: var(--space-3);
            align-items: center;
        }

        .btn {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-3) var(--space-4);
            border: none;
            border-radius: var(--radius-md);
            cursor: pointer;
            font-weight: 600;
            transition: var(--transition);
            text-decoration: none;
            font-size: 0.875rem;
        }

        .btn-primary {
            background: var(--filters-gradient);
            color: white;
            box-shadow: var(--shadow-md);
        }

        .btn-primary:hover {
            background: var(--filters-gradient-hover);
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .btn-secondary {
            background: var(--bg-tertiary);
            color: var(--text-secondary);
            border: 1px solid var(--shadow-dark);
        }

        .btn-secondary:hover {
            background: var(--bg-secondary);
            color: var(--text-primary);
        }

        /* 統計カード */
        .filters__stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: var(--space-4);
            margin-bottom: var(--space-8);
        }

        .filters__stat-card {
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            padding: var(--space-6);
            box-shadow: var(--shadow-md);
            border: 1px solid var(--shadow-dark);
            transition: var(--transition);
            position: relative;
            overflow: hidden;
        }

        .filters__stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--filters-primary);
            transition: var(--transition);
        }

        .filters__stat-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
        }

        .filters__stat-card--primary::before {
            background: var(--filters-primary);
        }

        .filters__stat-card--success::before {
            background: var(--filters-success);
        }

        .filters__stat-card--warning::before {
            background: var(--filters-warning);
        }

        .filters__stat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-4);
        }

        .filters__stat-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .filters__stat-icon {
            width: 48px;
            height: 48px;
            border-radius: var(--radius-lg);
            background: var(--filters-gradient);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.125rem;
            box-shadow: var(--shadow-md);
        }

        .filters__stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: var(--space-2);
            background: var(--filters-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .filters__stat-trend {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        /* タブナビゲーション */
        .tab-nav {
            display: flex;
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-2);
            margin-bottom: var(--space-6);
            box-shadow: var(--shadow-md);
            border: 1px solid var(--shadow-dark);
        }

        .tab-nav button {
            flex: 1;
            padding: var(--space-3) var(--space-4);
            border: none;
            background: none;
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: var(--radius-md);
            transition: var(--transition);
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-2);
        }

        .tab-nav button.active {
            background: var(--filters-gradient);
            color: white;
            box-shadow: var(--shadow-md);
        }

        .tab-nav button:hover:not(.active) {
            background: var(--bg-tertiary);
            color: var(--text-primary);
        }

        /* タブコンテンツ */
        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        /* テーブルスタイル */
        .data-table-container {
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-md);
            border: 1px solid var(--shadow-dark);
            overflow: hidden;
            margin-bottom: var(--space-6);
        }

        .data-table-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-4) var(--space-6);
            background: var(--bg-tertiary);
            border-bottom: 1px solid var(--shadow-dark);
        }

        .data-table-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: var(--space-2);
        }

        .search-container {
            display: flex;
            gap: var(--space-2);
            align-items: center;
        }

        .search-input {
            padding: var(--space-2) var(--space-3);
            border: 1px solid var(--shadow-dark);
            border-radius: var(--radius-md);
            background: var(--bg-primary);
            color: var(--text-primary);
            font-size: 0.875rem;
            min-width: 250px;
        }

        .search-input:focus {
            outline: none;
            border-color: var(--filters-primary);
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }

        .data-table th {
            background: var(--bg-tertiary);
            padding: var(--space-3) var(--space-4);
            text-align: left;
            font-weight: 600;
            color: var(--text-primary);
            border-bottom: 1px solid var(--shadow-dark);
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .data-table td {
            padding: var(--space-3) var(--space-4);
            border-bottom: 1px solid var(--shadow-dark);
            vertical-align: middle;
        }

        .data-table tbody tr {
            transition: var(--transition);
        }

        .data-table tbody tr:hover {
            background: var(--bg-tertiary);
        }

        .table-scroll {
            max-height: 600px;
            overflow-y: auto;
        }

        /* バッジ */
        .badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: var(--radius-md);
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.025em;
        }

        .badge-primary {
            background: rgba(139, 92, 246, 0.1);
            color: var(--filters-primary);
        }

        .badge-success {
            background: rgba(16, 185, 129, 0.1);
            color: var(--filters-success);
        }

        .badge-warning {
            background: rgba(245, 158, 11, 0.1);
            color: var(--filters-warning);
        }

        .badge-danger {
            background: rgba(239, 68, 68, 0.1);
            color: var(--filters-danger);
        }

        /* ローディング */
        .loading {
            text-align: center;
            padding: var(--space-8);
            color: var(--text-secondary);
        }

        .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--bg-tertiary);
            border-top: 3px solid var(--filters-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto var(--space-4);
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* レスポンシブ */
        @media (max-width: 768px) {
            .filters__header {
                flex-direction: column;
                gap: var(--space-4);
            }

            .filters__stats-grid {
                grid-template-columns: 1fr;
            }

            .tab-nav {
                flex-direction: column;
            }

            .data-table-container {
                overflow-x: auto;
            }

            .data-table {
                min-width: 800px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="filters__header">
            <div>
                <h1 class="filters__title">
                    <i class="fas fa-sitemap filters__title-icon"></i>
                    eBayカテゴリーマネージャー
                </h1>
                <p style="color: var(--text-secondary); margin-top: var(--space-2);">
                    カテゴリー・必須項目・手数料・出品枠の統合管理システム
                </p>
            </div>
            <div class="filters__header-actions">
                <button class="btn btn-secondary" onclick="exportData()">
                    <i class="fas fa-download"></i>
                    データ出力
                </button>
                <button class="btn btn-primary" onclick="refreshData()">
                    <i class="fas fa-sync"></i>
                    データ更新
                </button>
            </div>
        </div>

        <!-- 統計カード -->
        <div class="filters__stats-grid">
            <div class="filters__stat-card filters__stat-card--primary">
                <div class="filters__stat-header">
                    <span class="filters__stat-title">総商品数</span>
                    <div class="filters__stat-icon">
                        <i class="fas fa-database"></i>
                    </div>
                </div>
                <div class="filters__stat-value"><?= number_format($stats['total_products']) ?></div>
                <div class="filters__stat-trend">
                    <i class="fas fa-arrow-up"></i>
                    <span>Yahoo Auctionから取得済み</span>
                </div>
            </div>

            <div class="filters__stat-card filters__stat-card--success">
                <div class="filters__stat-header">
                    <span class="filters__stat-title">カテゴリー判定済み</span>
                    <div class="filters__stat-icon">
                        <i class="fas fa-tags"></i>
                    </div>
                </div>
                <div class="filters__stat-value"><?= number_format($stats['categorized_count']) ?></div>
                <div class="filters__stat-trend">
                    <i class="fas fa-arrow-up"></i>
                    <span><?= $stats['total_products'] > 0 ? round(($stats['categorized_count'] / $stats['total_products']) * 100, 1) : 0 ?>% 完了</span>
                </div>
            </div>

            <div class="filters__stat-card filters__stat-card--warning">
                <div class="filters__stat-header">
                    <span class="filters__stat-title">利用可能カテゴリー</span>
                    <div class="filters__stat-icon">
                        <i class="fas fa-sitemap"></i>
                    </div>
                </div>
                <div class="filters__stat-value"><?= number_format($categoryStats['category_count']) ?></div>
                <div class="filters__stat-trend">
                    <i class="fas fa-check"></i>
                    <span>eBayカテゴリー</span>
                </div>
            </div>

            <div class="filters__stat-card filters__stat-card--primary">
                <div class="filters__stat-header">
                    <span class="filters__stat-title">平均手数料率</span>
                    <div class="filters__stat-icon">
                        <i class="fas fa-percentage"></i>
                    </div>
                </div>
                <div class="filters__stat-value"><?= number_format($feeStats['avg_fee'] ?? 0, 1) ?>%</div>
                <div class="filters__stat-trend">
                    <i class="fas fa-info-circle"></i>
                    <span>Final Value Fee</span>
                </div>
            </div>
        </div>

        <!-- タブナビゲーション -->
        <div class="tab-nav">
            <button class="active" onclick="switchTab('categories')">
                <i class="fas fa-sitemap"></i>
                カテゴリー一覧
            </button>
            <button onclick="switchTab('requirements')">
                <i class="fas fa-list-check"></i>
                必須項目
            </button>
            <button onclick="switchTab('fees')">
                <i class="fas fa-dollar-sign"></i>
                手数料データ
            </button>
            <button onclick="switchTab('processing')">
                <i class="fas fa-cogs"></i>
                処理状況
            </button>
        </div>

        <!-- タブコンテンツ: カテゴリー一覧 -->
        <div id="categories" class="tab-content active">
            <div class="data-table-container">
                <div class="data-table-header">
                    <h3 class="data-table-title">
                        <i class="fas fa-sitemap"></i>
                        eBayカテゴリー一覧
                    </h3>
                    <div class="search-container">
                        <input type="text" class="search-input" placeholder="カテゴリー名で検索..." id="categorySearch">
                        <button class="btn btn-secondary" onclick="searchCategories()">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
                <div class="table-scroll">
                    <table class="data-table" id="categoriesTable">
                        <thead>
                            <tr>
                                <th>カテゴリーID</th>
                                <th>カテゴリー名</th>
                                <th>親カテゴリー</th>
                                <th>レベル</th>
                                <th>状態</th>
                                <th>作成日</th>
                            </tr>
                        </thead>
                        <tbody id="categoriesTableBody">
                            <tr>
                                <td colspan="6">
                                    <div class="loading">
                                        <div class="spinner"></div>
                                        データを読み込み中...
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- タブコンテンツ: 必須項目 -->
        <div id="requirements" class="tab-content">
            <div class="data-table-container">
                <div class="data-table-header">
                    <h3 class="data-table-title">
                        <i class="fas fa-list-check"></i>
                        カテゴリー別必須項目
                    </h3>
                    <div class="search-container">
                        <input type="text" class="search-input" placeholder="カテゴリーIDで検索..." id="requirementSearch">
                        <button class="btn btn-secondary" onclick="searchRequirements()">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
                <div class="table-scroll">
                    <table class="data-table" id="requirementsTable">
                        <thead>
                            <tr>
                                <th>カテゴリーID</th>
                                <th>カテゴリー名</th>
                                <th>必須項目名</th>
                                <th>項目タイプ</th>
                                <th>デフォルト値</th>
                                <th>選択肢</th>
                                <th>順序</th>
                            </tr>
                        </thead>
                        <tbody id="requirementsTableBody">
                            <tr>
                                <td colspan="7">
                                    <div class="loading">
                                        <div class="spinner"></div>
                                        データを読み込み中...
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- タブコンテンツ: 手数料データ -->
        <div id="fees" class="tab-content">
            <div class="data-table-container">
                <div class="data-table-header">
                    <h3 class="data-table-title">
                        <i class="fas fa-dollar-sign"></i>
                        カテゴリー別手数料
                    </h3>
                    <div class="search-container">
                        <input type="text" class="search-input" placeholder="カテゴリーIDで検索..." id="feeSearch">
                        <button class="btn btn-secondary" onclick="searchFees()">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
                <div class="table-scroll">
                    <table class="data-table" id="feesTable">
                        <thead>
                            <tr>
                                <th>カテゴリーID</th>
                                <th>カテゴリー名</th>
                                <th>出品タイプ</th>
                                <th>Final Value Fee</th>
                                <th>Insertion Fee</th>
                                <th>手数料グループ</th>
                                <th>更新日</th>
                            </tr>
                        </thead>
                        <tbody id="feesTableBody">
                            <tr>
                                <td colspan="7">
                                    <div class="loading">
                                        <div class="spinner"></div>
                                        データを読み込み中...
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- タブコンテンツ: 処理状況 -->
        <div id="processing" class="tab-content">
            <div class="data-table-container">
                <div class="data-table-header">
                    <h3 class="data-table-title">
                        <i class="fas fa-cogs"></i>
                        商品処理状況
                    </h3>
                    <div class="search-container">
                        <input type="text" class="search-input" placeholder="商品名で検索..." id="processingSearch">
                        <button class="btn btn-secondary" onclick="searchProcessing()">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
                <div class="table-scroll">
                    <table class="data-table" id="processingTable">
                        <thead>
                            <tr>
                                <th>商品ID</th>
                                <th>商品名</th>
                                <th>判定カテゴリー</th>
                                <th>信頼度</th>
                                <th>処理段階</th>
                                <th>必須項目</th>
                                <th>更新日</th>
                            </tr>
                        </thead>
                        <tbody id="processingTableBody">
                            <tr>
                                <td colspan="7">
                                    <div class="loading">
                                        <div class="spinner"></div>
                                        データを読み込み中...
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <script>
        // グローバル変数
        let currentTab = 'categories';
        let currentData = {};

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            loadCategoriesData();
        });

        // タブ切り替え
        function switchTab(tabId) {
            // タブボタンの状態更新
            document.querySelectorAll('.tab-nav button').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');

            // タブコンテンツの表示切り替え
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');

            currentTab = tabId;

            // データ読み込み
            switch(tabId) {
                case 'categories':
                    loadCategoriesData();
                    break;
                case 'requirements':
                    loadRequirementsData();
                    break;
                case 'fees':
                    loadFeesData();
                    break;
                case 'processing':
                    loadProcessingData();
                    break;
            }
        }

        // カテゴリーデータ読み込み
        async function loadCategoriesData() {
            const tbody = document.getElementById('categoriesTableBody');
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="loading">
                            <div class="spinner"></div>
                            データを読み込み中...
                        </div>
                    </td>
                </tr>
            `;

            try {
                const response = await fetch('../backend/api/data_viewer_api.php?action=get_categories');
                const data = await response.json();

                if (data.success) {
                    currentData.categories = data.categories;
                    renderCategoriesTable(data.categories);
                } else {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" style="text-align: center; color: var(--filters-danger);">
                                <i class="fas fa-exclamation-triangle"></i>
                                データの読み込みに失敗しました: ${data.error}
                            </td>
                        </tr>
                    `;
                }
            } catch (error) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: var(--filters-danger);">
                            <i class="fas fa-exclamation-triangle"></i>
                            通信エラーが発生しました
                        </td>
                    </tr>
                `;
            }
        }

        // カテゴリーテーブル描画
        function renderCategoriesTable(categories) {
            const tbody = document.getElementById('categoriesTableBody');
            
            if (!categories || categories.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: var(--text-secondary);">
                            データがありません
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = categories.map(category => `
                <tr>
                    <td><strong>${category.category_id}</strong></td>
                    <td>${category.category_name}</td>
                    <td>${category.parent_id || '-'}</td>
                    <td><span class="badge badge-primary">${category.category_level}</span></td>
                    <td>
                        ${category.is_active ? 
                            '<span class="badge badge-success">アクティブ</span>' : 
                            '<span class="badge badge-danger">非アクティブ</span>'
                        }
                    </td>
                    <td>${new Date(category.created_at).toLocaleDateString('ja-JP')}</td>
                </tr>
            `).join('');
        }

        // 必須項目データ読み込み
        async function loadRequirementsData() {
            const tbody = document.getElementById('requirementsTableBody');
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="loading">
                            <div class="spinner"></div>
                            データを読み込み中...
                        </div>
                    </td>
                </tr>
            `;

            try {
                const response = await fetch('../backend/api/data_viewer_api.php?action=get_requirements');
                const data = await response.json();

                if (data.success) {
                    currentData.requirements = data.requirements;
                    renderRequirementsTable(data.requirements);
                } else {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" style="text-align: center; color: var(--filters-danger);">
                                データの読み込みに失敗しました: ${data.error}
                            </td>
                        </tr>
                    `;
                }
            } catch (error) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; color: var(--filters-danger);">
                            通信エラーが発生しました
                        </td>
                    </tr>
                `;
            }
        }

        // 必須項目テーブル描画
        function renderRequirementsTable(requirements) {
            const tbody = document.getElementById('requirementsTableBody');
            
            if (!requirements || requirements.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; color: var(--text-secondary);">
                            データがありません
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = requirements.map(req => `
                <tr>
                    <td><strong>${req.category_id}</strong></td>
                    <td>${req.category_name || '-'}</td>
                    <td>${req.field_name}</td>
                    <td>
                        ${req.field_type === 'required' ? 
                            '<span class="badge badge-danger">必須</span>' : 
                            req.field_type === 'recommended' ?
                            '<span class="badge badge-warning">推奨</span>' :
                            '<span class="badge badge-primary">オプション</span>'
                        }
                    </td>
                    <td>${req.default_value || '-'}</td>
                    <td>${req.possible_values ? req.possible_values.slice(0, 3).join(', ') + (req.possible_values.length > 3 ? '...' : '') : '-'}</td>
                    <td><span class="badge badge-primary">${req.sort_order}</span></td>
                </tr>
            `).join('');
        }

        // 手数料データ読み込み
        async function loadFeesData() {
            const tbody = document.getElementById('feesTableBody');
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="loading">
                            <div class="spinner"></div>
                            データを読み込み中...
                        </div>
                    </td>
                </tr>
            `;

            try {
                const response = await fetch('../backend/api/data_viewer_api.php?action=get_fees');
                const data = await response.json();

                if (data.success) {
                    currentData.fees = data.fees;
                    renderFeesTable(data.fees);
                } else {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" style="text-align: center; color: var(--filters-danger);">
                                データの読み込みに失敗しました: ${data.error}
                            </td>
                        </tr>
                    `;
                }
            } catch (error) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; color: var(--filters-danger);">
                            通信エラーが発生しました
                        </td>
                    </tr>
                `;
            }
        }

        // 手数料テーブル描画
        function renderFeesTable(fees) {
            const tbody = document.getElementById('feesTableBody');
            
            if (!fees || fees.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; color: var(--text-secondary);">
                            データがありません
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = fees.map(fee => `
                <tr>
                    <td><strong>${fee.category_id}</strong></td>
                    <td>${fee.category_name || '-'}</td>
                    <td>
                        ${fee.listing_type === 'fixed_price' ? 
                            '<span class="badge badge-primary">固定価格</span>' : 
                            '<span class="badge badge-warning">オークション</span>'
                        }
                    </td>
                    <td><strong>${parseFloat(fee.final_value_fee_percent || 0).toFixed(2)}%</strong></td>
                    <td>$${parseFloat(fee.insertion_fee || 0).toFixed(2)}</td>
                    <td>${fee.fee_group || '-'}</td>
                    <td>${new Date(fee.updated_at).toLocaleDateString('ja-JP')}</td>
                </tr>
            `).join('');
        }

        // 処理状況データ読み込み
        async function loadProcessingData() {
            const tbody = document.getElementById('processingTableBody');
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="loading">
                            <div class="spinner"></div>
                            データを読み込み中...
                        </div>
                    </td>
                </tr>
            `;

            try {
                const response = await fetch('../backend/api/data_viewer_api.php?action=get_processing_status');
                const data = await response.json();

                if (data.success) {
                    currentData.processing = data.products;
                    renderProcessingTable(data.products);
                } else {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" style="text-align: center; color: var(--filters-danger);">
                                データの読み込みに失敗しました: ${data.error}
                            </td>
                        </tr>
                    `;
                }
            } catch (error) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; color: var(--filters-danger);">
                            通信エラーが発生しました
                        </td>
                    </tr>
                `;
            }
        }

        // 処理状況テーブル描画
        function renderProcessingTable(products) {
            const tbody = document.getElementById('processingTableBody');
            
            if (!products || products.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; color: var(--text-secondary);">
                            データがありません
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = products.map(product => `
                <tr>
                    <td><strong>${product.id}</strong></td>
                    <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${product.title}">
                        ${product.title}
                    </td>
                    <td>${product.category_name || '-'}</td>
                    <td>
                        ${product.confidence ? 
                            `<strong style="color: ${product.confidence >= 80 ? 'var(--filters-success)' : product.confidence >= 60 ? 'var(--filters-warning)' : 'var(--filters-danger)'}">${product.confidence}%</strong>` : 
                            '-'
                        }
                    </td>
                    <td>
                        ${product.stage === 'profit_enhanced' ? 
                            '<span class="badge badge-success">Stage 2完了</span>' : 
                            product.stage === 'basic' ?
                            '<span class="badge badge-warning">Stage 1完了</span>' :
                            '<span class="badge badge-danger">未処理</span>'
                        }
                    </td>
                    <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${product.item_specifics || ''}">
                        ${product.item_specifics || '-'}
                    </td>
                    <td>${new Date(product.updated_at).toLocaleDateString('ja-JP')}</td>
                </tr>
            `).join('');
        }

        // 検索機能
        function searchCategories() {
            const query = document.getElementById('categorySearch').value.toLowerCase();
            if (!currentData.categories) return;

            const filtered = currentData.categories.filter(category => 
                category.category_name.toLowerCase().includes(query) ||
                category.category_id.toLowerCase().includes(query)
            );
            renderCategoriesTable(filtered);
        }

        function searchRequirements() {
            const query = document.getElementById('requirementSearch').value.toLowerCase();
            if (!currentData.requirements) return;

            const filtered = currentData.requirements.filter(req => 
                req.category_id.toLowerCase().includes(query) ||
                (req.category_name && req.category_name.toLowerCase().includes(query)) ||
                req.field_name.toLowerCase().includes(query)
            );
            renderRequirementsTable(filtered);
        }

        function searchFees() {
            const query = document.getElementById('feeSearch').value.toLowerCase();
            if (!currentData.fees) return;

            const filtered = currentData.fees.filter(fee => 
                fee.category_id.toLowerCase().includes(query) ||
                (fee.category_name && fee.category_name.toLowerCase().includes(query))
            );
            renderFeesTable(filtered);
        }

        function searchProcessing() {
            const query = document.getElementById('processingSearch').value.toLowerCase();
            if (!currentData.processing) return;

            const filtered = currentData.processing.filter(product => 
                product.title.toLowerCase().includes(query) ||
                (product.category_name && product.category_name.toLowerCase().includes(query))
            );
            renderProcessingTable(filtered);
        }

        // データ更新
        function refreshData() {
            switch(currentTab) {
                case 'categories':
                    loadCategoriesData();
                    break;
                case 'requirements':
                    loadRequirementsData();
                    break;
                case 'fees':
                    loadFeesData();
                    break;
                case 'processing':
                    loadProcessingData();
                    break;
            }
        }

        // データ出力
        function exportData() {
            const data = currentData[currentTab];
            if (!data) {
                alert('エクスポートするデータがありません');
                return;
            }

            const csv = arrayToCsv(data);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${currentTab}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // 配列をCSVに変換
        function arrayToCsv(data) {
            if (!data || data.length === 0) return '';
            
            const headers = Object.keys(data[0]);
            const csvHeaders = headers.join(',');
            
            const csvRows = data.map(row => 
                headers.map(header => {
                    let value = row[header];
                    if (Array.isArray(value)) {
                        value = value.join(';');
                    }
                    if (typeof value === 'string' && value.includes(',')) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value || '';
                }).join(',')
            );
            
            return [csvHeaders, ...csvRows].join('\n');
        }

        // Enterキーでの検索
        document.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const activeInput = document.activeElement;
                if (activeInput.id === 'categorySearch') {
                    searchCategories();
                } else if (activeInput.id === 'requirementSearch') {
                    searchRequirements();
                } else if (activeInput.id === 'feeSearch') {
                    searchFees();
                } else if (activeInput.id === 'processingSearch') {
                    searchProcessing();
                }
            }
        });
    </script>
</body>
</html>