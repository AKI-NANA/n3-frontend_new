<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle ?? 'Yahoo Auction Tool') ?></title>
    <meta name="description" content="<?= htmlspecialchars($pageDescription ?? 'Yahoo→eBay統合ワークフローシステム') ?>">
    
    <!-- N3 Core CSS -->
    <link rel="stylesheet" href="/assets/css/n3-core.css">
    <link rel="stylesheet" href="/assets/css/n3-components.css">
    
    <!-- FontAwesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- 共通CSS -->
    <link rel="stylesheet" href="../assets/css/common.css">
    
    <!-- カスタムCSS -->
    <?php if (isset($customCSS) && is_array($customCSS)): ?>
        <?php foreach ($customCSS as $css): ?>
            <link rel="stylesheet" href="<?= htmlspecialchars($css) ?>">
        <?php endforeach; ?>
    <?php endif; ?>
    
    <!-- CSS変数・基本スタイル -->
    <style>
        :root {
            --n3-primary: #3b82f6;
            --n3-success: #10b981;
            --n3-warning: #f59e0b;
            --n3-danger: #ef4444;
            --n3-info: #06b6d4;
            --n3-bg-primary: #f8fafc;
            --n3-bg-secondary: #ffffff;
            --n3-bg-tertiary: #f1f5f9;
            --n3-text-primary: #1e293b;
            --n3-text-secondary: #475569;
            --n3-text-muted: #64748b;
            --n3-border-color: #e2e8f0;
            --n3-spacing-xs: 0.25rem;
            --n3-spacing-sm: 0.5rem;
            --n3-spacing-md: 1rem;
            --n3-spacing-lg: 1.5rem;
            --n3-spacing-xl: 2rem;
            --n3-radius-sm: 0.25rem;
            --n3-radius-md: 0.375rem;
            --n3-radius-lg: 0.5rem;
            --n3-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --n3-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --n3-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--n3-bg-primary);
            color: var(--n3-text-primary);
            line-height: 1.6;
        }
        
        .n3-layout {
            display: flex;
            min-height: 100vh;
        }
        
        .n3-nav {
            background: var(--n3-bg-secondary);
            border-bottom: 1px solid var(--n3-border-color);
            padding: var(--n3-spacing-sm) 0;
            box-shadow: var(--n3-shadow-sm);
        }
        
        .n3-nav-container {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 var(--n3-spacing-lg);
        }
        
        .n3-nav-brand {
            display: flex;
            align-items: center;
            gap: var(--n3-spacing-sm);
        }
        
        .n3-brand-link {
            display: flex;
            align-items: center;
            gap: var(--n3-spacing-sm);
            text-decoration: none;
            color: var(--n3-text-primary);
            font-weight: 700;
            font-size: 1.25rem;
        }
        
        .n3-logo {
            height: 32px;
            width: auto;
        }
        
        .n3-nav-menu {
            display: flex;
            gap: var(--n3-spacing-lg);
        }
        
        .n3-nav-link {
            text-decoration: none;
            color: var(--n3-text-secondary);
            font-weight: 500;
            padding: var(--n3-spacing-sm) var(--n3-spacing-md);
            border-radius: var(--n3-radius-md);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: var(--n3-spacing-xs);
        }
        
        .n3-nav-link:hover {
            background: var(--n3-bg-tertiary);
            color: var(--n3-text-primary);
        }
        
        .n3-sidebar {
            width: 280px;
            background: var(--n3-bg-secondary);
            border-right: 1px solid var(--n3-border-color);
            flex-shrink: 0;
            overflow-y: auto;
        }
        
        .n3-sidebar-header {
            padding: var(--n3-spacing-lg);
            border-bottom: 1px solid var(--n3-border-color);
            background: linear-gradient(135deg, var(--n3-primary), #6366f1);
            color: white;
        }
        
        .n3-sidebar-header h3 {
            font-size: 1.1rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: var(--n3-spacing-sm);
        }
        
        .n3-sidebar-nav {
            padding: var(--n3-spacing-md);
        }
        
        .n3-sidebar-link {
            display: flex;
            align-items: center;
            gap: var(--n3-spacing-sm);
            padding: var(--n3-spacing-md);
            text-decoration: none;
            color: var(--n3-text-secondary);
            border-radius: var(--n3-radius-md);
            transition: all 0.2s ease;
            margin-bottom: var(--n3-spacing-xs);
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        .n3-sidebar-link:hover {
            background: var(--n3-bg-tertiary);
            color: var(--n3-text-primary);
            transform: translateX(2px);
        }
        
        .n3-sidebar-link.active {
            background: rgba(59, 130, 246, 0.1);
            color: var(--n3-primary);
            border-left: 3px solid var(--n3-primary);
        }
        
        .n3-sidebar-link i {
            width: 18px;
            text-align: center;
            font-size: 0.9rem;
        }
        
        .n3-main {
            flex: 1;
            overflow-y: auto;
            background: var(--n3-bg-primary);
        }
        
        .n3-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: var(--n3-spacing-lg);
        }
        
        /* N3 ボタンスタイル */
        .n3-btn {
            display: inline-flex;
            align-items: center;
            gap: var(--n3-spacing-xs);
            padding: var(--n3-spacing-sm) var(--n3-spacing-md);
            border: 1px solid var(--n3-border-color);
            border-radius: var(--n3-radius-md);
            background: var(--n3-bg-secondary);
            color: var(--n3-text-primary);
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        
        .n3-btn:hover {
            background: var(--n3-bg-tertiary);
            transform: translateY(-1px);
            box-shadow: var(--n3-shadow-sm);
        }
        
        .n3-btn-primary {
            background: var(--n3-primary);
            color: white;
            border-color: var(--n3-primary);
        }
        
        .n3-btn-primary:hover {
            background: #2563eb;
            border-color: #2563eb;
        }
        
        .n3-btn-success {
            background: var(--n3-success);
            color: white;
            border-color: var(--n3-success);
        }
        
        .n3-btn-warning {
            background: var(--n3-warning);
            color: white;
            border-color: var(--n3-warning);
        }
        
        .n3-btn-danger {
            background: var(--n3-danger);
            color: white;
            border-color: var(--n3-danger);
        }
        
        /* N3 入力フィールド */
        .n3-input {
            padding: var(--n3-spacing-sm);
            border: 1px solid var(--n3-border-color);
            border-radius: var(--n3-radius-md);
            font-size: 0.875rem;
            background: var(--n3-bg-secondary);
            transition: all 0.2s ease;
        }
        
        .n3-input:focus {
            outline: none;
            border-color: var(--n3-primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        /* レスポンシブ */
        @media (max-width: 768px) {
            .n3-layout {
                flex-direction: column;
            }
            
            .n3-sidebar {
                width: 100%;
                order: 2;
            }
            
            .n3-main {
                order: 1;
            }
            
            .n3-content {
                padding: var(--n3-spacing-md);
            }
        }
    </style>
</head>
<body class="n3-body">
    <!-- N3 Navigation -->
    <nav class="n3-nav">
        <div class="n3-nav-container">
            <div class="n3-nav-brand">
                <a href="/" class="n3-brand-link">
                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, var(--n3-primary), #6366f1); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1rem;">N3</div>
                    <span class="n3-brand-text">NAGANO-3</span>
                </a>
            </div>
            
            <div class="n3-nav-menu">
                <a href="/dashboard" class="n3-nav-link">
                    <i class="fas fa-home"></i> ホーム
                </a>
                <a href="/modules" class="n3-nav-link">
                    <i class="fas fa-puzzle-piece"></i> モジュール
                </a>
                <a href="/settings" class="n3-nav-link">
                    <i class="fas fa-cog"></i> 設定
                </a>
            </div>
        </div>
    </nav>

    <!-- N3 Layout -->
    <div class="n3-layout">
        <!-- N3 Sidebar -->
        <aside class="n3-sidebar">
            <div class="n3-sidebar-header">
                <h3>
                    <i class="fas fa-sync-alt"></i>
                    Yahoo→eBay ツール
                </h3>
            </div>
            
            <nav class="n3-sidebar-nav">
                <a href="../01_dashboard/dashboard.php" target="_blank" class="n3-sidebar-link">
                    <i class="fas fa-tachometer-alt"></i>
                    <span>ダッシュボード</span>
                </a>
                <a href="../02_scraping/scraping.php" target="_blank" class="n3-sidebar-link">
                    <i class="fas fa-spider"></i>
                    <span>データ取得</span>
                </a>
                <a href="../03_approval/approval.php" target="_blank" class="n3-sidebar-link">
                    <i class="fas fa-check-circle"></i>
                    <span>商品承認</span>
                </a>
                <a href="../04_analysis/analysis.php" target="_blank" class="n3-sidebar-link">
                    <i class="fas fa-chart-bar"></i>
                    <span>承認分析</span>
                </a>
                <a href="../05_editing/editing.php" target="_blank" class="n3-sidebar-link">
                    <i class="fas fa-edit"></i>
                    <span>データ編集</span>
                </a>
                <a href="../06_calculation/calculation.php" target="_blank" class="n3-sidebar-link">
                    <i class="fas fa-calculator"></i>
                    <span>送料計算</span>
                </a>
                <a href="../07_filters/filters.php" target="_blank" class="n3-sidebar-link">
                    <i class="fas fa-filter"></i>
                    <span>フィルター</span>
                </a>
                <a href="../08_listing/listing.php" target="_blank" class="n3-sidebar-link">
                    <i class="fas fa-store"></i>
                    <span>出品管理</span>
                </a>
                <a href="../09_inventory/inventory.php" target="_blank" class="n3-sidebar-link">
                    <i class="fas fa-warehouse"></i>
                    <span>在庫管理</span>
                </a>
                <a href="../10_ebay_category/ebay_category.php" target="_blank" class="n3-sidebar-link">
                    <i class="fas fa-tags"></i>
                    <span>eBayカテゴリ</span>
                </a>
            </nav>
            
            <!-- ワークフロー状況表示 -->
            <div style="padding: var(--n3-spacing-md); border-top: 1px solid var(--n3-border-color); margin-top: auto;">
                <h4 style="font-size: 0.8rem; color: var(--n3-text-muted); margin-bottom: var(--n3-spacing-sm);">
                    <i class="fas fa-tasks"></i> ワークフロー状況
                </h4>
                <div id="workflowStatus" style="font-size: 0.75rem; color: var(--n3-text-secondary);">
                    読み込み中...
                </div>
            </div>
        </aside>

        <main class="n3-main">
            <!-- ページコンテンツはここから開始 -->
