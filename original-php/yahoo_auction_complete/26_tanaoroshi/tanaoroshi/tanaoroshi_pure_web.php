<?php
/**
 * 棚卸しシステム 純粋Webツール版
 * ファイル: tanaoroshi_pure_web.php
 * 方針: hooks完全排除・標準Web技術・シンプルな構成
 * 参照: inventory_system_fixed.html の完全再現
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

// XSS対策関数
function safe_output($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
?>

<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo safe_output('NAGANO-3 棚卸しシステム - 純粋Webツール版'); ?></title>
    
    <!-- 外部リソース -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    
    <!-- inventory_system_fixed.html準拠のCSS -->
    <style>
    /* ===== NAGANO-3統一CSS変数 ===== */
    :root {
        --space-xs: 0.25rem;
        --space-sm: 0.5rem;
        --space-md: 1rem;
        --space-lg: 1.5rem;
        --space-xl: 2rem;
        --space-2xl: 3rem;
        
        --color-primary: #3b82f6;
        --color-secondary: #6366f1;
        --color-success: #10b981;
        --color-warning: #f59e0b;
        --color-danger: #ef4444;
        --color-info: #06b6d4;
        
        --bg-primary: #f8fafc;
        --bg-secondary: #ffffff;
        --bg-tertiary: #f1f5f9;
        --bg-hover: #e2e8f0;
        --bg-active: #cbd5e1;
        
        --text-primary: #1e293b;
        --text-secondary: #475569;
        --text-tertiary: #64748b;
        --text-muted: #94a3b8;
        --text-white: #ffffff;
        
        --border-color: #e2e8f0;
        --border-light: #f1f5f9;
        --border-dark: #cbd5e1;
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        
        --radius-sm: 0.25rem;
        --radius-md: 0.375rem;
        --radius-lg: 0.5rem;
        --radius-xl: 0.75rem;
        --radius-full: 9999px;
        --transition-fast: all 0.15s ease-in-out;
        --transition-normal: all 0.2s ease-in-out;
        
        --text-xs: 0.75rem;
        --text-sm: 0.875rem;
        --text-base: 1rem;
        --text-lg: 1.125rem;
        --text-xl: 1.25rem;
        --text-2xl: 1.5rem;
        
        /* 棚卸し専用カラー */
        --inventory-stock: #059669;
        --inventory-dropship: #7c3aed;
        --inventory-set: #dc6803;
        --inventory-hybrid: #0e7490;
        --inventory-out: #dc2626;
        --inventory-used: #8b5cf6;

        /* Excel基盤カラー */
        --excel-primary: #dc2626;
        --excel-primary-rgb: 220, 38, 38;
        --excel-secondary: #f59e0b;
        --excel-success: #10b981;
        --excel-warning: #f59e0b;
        --excel-danger: #dc2626;
        --excel-info: #06b6d4;
    }

    * { box-sizing: border-box; }

    body {
        margin: 0; padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Yu Gothic', sans-serif;
        background: var(--bg-primary); color: var(--text-primary); line-height: 1.5;
    }

    .content { margin: 0; max-width: 100vw; padding: var(--space-lg); overflow-x: hidden; }

    /* ===== ボタンシステム ===== */
    .btn {
        display: inline-flex; align-items: center; justify-content: center; gap: var(--space-sm);
        padding: var(--space-sm) var(--space-md); border: 1px solid var(--border-color);
        border-radius: var(--radius-md); background: var(--bg-secondary); color: var(--text-primary);
        font-size: var(--text-sm); font-weight: 500; text-decoration: none; cursor: pointer;
        transition: var(--transition-fast); white-space: nowrap; font-family: inherit;
    }
    .btn:hover { background: var(--bg-hover); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .btn--small { padding: var(--space-xs) var(--space-sm); font-size: var(--text-xs); }
    .btn--primary { background: var(--color-primary); color: var(--text-white); border-color: var(--color-primary); }
    .btn--success { background: var(--color-success); color: var(--text-white); border-color: var(--color-success); }
    .btn--warning { background: var(--color-warning); color: var(--text-white); border-color: var(--color-warning); }
    .btn--danger { background: var(--color-danger); color: var(--text-white); border-color: var(--color-danger); }
    .btn--secondary { background: transparent; color: var(--color-primary); border: 1px solid var(--color-primary); }
    .btn--info { background: var(--color-info); color: var(--text-white); border-color: var(--color-info); }

    /* ===== ヘッダー ===== */
    .inventory__header {
        background: var(--bg-secondary); border-radius: var(--radius-lg); padding: var(--space-lg);
        margin-bottom: var(--space-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);
    }
    .inventory__title {
        font-size: var(--text-xl); font-weight: 700; color: var(--text-primary);
        margin: 0 0 var(--space-md) 0; display: flex; align-items: center; gap: var(--space-md);
    }
    .inventory__title-icon { color: var(--color-primary); font-size: var(--text-xl); }
    .inventory__header-top {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: var(--space-lg); flex-wrap: wrap; gap: var(--space-md);
    }
    .inventory__exchange-rate {
        display: flex; align-items: center; gap: var(--space-sm);
        padding: var(--space-sm) var(--space-md); background: var(--bg-tertiary);
        border-radius: var(--radius-md); border: 1px solid var(--border-color);
    }
    .inventory__exchange-icon { color: var(--color-warning); }
    .inventory__exchange-text { font-size: var(--text-sm); color: var(--text-secondary); }
    .inventory__exchange-value { font-weight: 700; color: var(--text-primary); }
    .inventory__stats {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: var(--space-sm); margin-bottom: var(--space-md);
    }
    .inventory__stat {
        text-align: center; padding: var(--space-sm); background: var(--bg-tertiary);
        border-radius: var(--radius-md); border: 1px solid var(--border-light);
    }
    .inventory__stat-number {
        display: block; font-size: var(--text-lg); font-weight: 700; color: var(--text-primary);
    }
    .inventory__stat-label {
        font-size: var(--text-xs); color: var(--text-muted);
        text-transform: uppercase; letter-spacing: 0.02em;
    }

    /* ===== フィルターバー ===== */
    .inventory__filter-bar {
        background: var(--bg-secondary); border-radius: var(--radius-lg); padding: var(--space-lg);
        margin-bottom: var(--space-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);
    }
    .inventory__filter-title {
        font-size: var(--text-lg); font-weight: 600; color: var(--text-primary);
        margin: 0 0 var(--space-md) 0; display: flex; align-items: center; gap: var(--space-sm);
    }
    .inventory__filter-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-md); margin-bottom: var(--space-md);
    }
    .inventory__filter-group { display: flex; flex-direction: column; gap: var(--space-xs); }
    .inventory__filter-label { font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); }
    .inventory__filter-select {
        padding: var(--space-sm); border: 1px solid var(--border-color);
        border-radius: var(--radius-md); background: var(--bg-primary);
        font-size: var(--text-sm); transition: var(--transition-fast);
    }
    .inventory__filter-select:focus {
        outline: none; border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
    .inventory__filter-actions {
        display: flex; gap: var(--space-md); align-items: center;
        justify-content: space-between; flex-wrap: wrap;
    }
    .inventory__filter-left, .inventory__filter-right {
        display: flex; gap: var(--space-sm); align-items: center;
    }
    .inventory__search-box { position: relative; min-width: 250px; }
    .inventory__search-input {
        width: 100%; padding: var(--space-sm) var(--space-md) var(--space-sm) var(--space-xl);
        border: 1px solid var(--border-color); border-radius: var(--radius-md);
        background: var(--bg-primary); font-size: var(--text-sm); transition: var(--transition-fast);
    }
    .inventory__search-input:focus {
        outline: none; border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
    .inventory__search-icon {
        position: absolute; left: var(--space-md); top: 50%;
        transform: translateY(-50%); color: var(--text-muted);
    }

    /* ===== ビュー切り替え ===== */
    .inventory__view-controls {
        background: var(--bg-secondary); border-radius: var(--radius-lg); padding: var(--space-md);
        margin-bottom: var(--space-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);
        display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-md);
    }
    .inventory__view-toggle {
        display: flex; border: 1px solid var(--border-color); border-radius: var(--radius-md);
        overflow: hidden; background: var(--bg-primary);
    }
    .inventory__view-btn {
        padding: var(--space-sm) var(--space-md); border: none; background: transparent;
        color: var(--text-secondary); cursor: pointer; transition: var(--transition-fast);
        font-size: var(--text-sm); display: flex; align-items: center; gap: var(--space-sm);
    }
    .inventory__view-btn--active { background: var(--color-primary); color: var(--text-white); }
    .inventory__view-btn:hover:not(.inventory__view-btn--active) {
        background: var(--bg-hover); color: var(--text-primary);
    }
    .inventory__actions {
        display: flex; gap: var(--space-sm); align-items: center; flex-wrap: wrap;
    }

    /* ===== カードビュー ===== */
    .inventory__grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: var(--space-md); margin-bottom: var(--space-lg);
    }
    .inventory__card {
        background: var(--bg-secondary); border: 1px solid var(--border-color);
        border-radius: var(--radius-lg); overflow: hidden; cursor: pointer;
        transition: var(--transition-normal); position: relative;
        display: flex; flex-direction: column; box-shadow: var(--shadow-sm);
    }
    .inventory__card:hover {
        transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--color-info);
    }
    .inventory__card--selected {
        border-color: var(--excel-primary); background: rgba(var(--excel-primary-rgb), 0.05);
        box-shadow: 0 0 0 3px rgba(var(--excel-primary-rgb), 0.3); transform: translateY(-2px);
    }
    .inventory__card--selected::after {
        content: '✓'; position: absolute; top: 8px; right: 8px;
        background: var(--excel-primary); color: white; width: 20px; height: 20px;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        font-size: 0.8rem; font-weight: 700; z-index: 10; box-shadow: var(--shadow-md);
    }
    .inventory__card-image {
        position: relative; height: 160px; background: var(--bg-tertiary);
        overflow: hidden; flex-shrink: 0;
    }
    .inventory__card-img {
        width: 100%; height: 100%; object-fit: cover; object-position: center;
        transition: var(--transition-normal);
    }
    .inventory__card:hover .inventory__card-img { transform: scale(1.05); }
    .inventory__card-placeholder {
        color: var(--text-muted); font-size: 2rem; display: flex; align-items: center;
        justify-content: center; height: 100%; flex-direction: column; gap: var(--space-sm);
    }
    .inventory__card-placeholder span { font-size: var(--text-xs); }
    .inventory__card-badges {
        position: absolute; top: 8px; left: 8px; right: 40px;
        display: flex; flex-wrap: wrap; gap: 4px; z-index: 5; pointer-events: none;
    }
    .inventory__badge {
        padding: 2px 6px; border-radius: var(--radius-sm); font-size: 0.6rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.03em; box-shadow: var(--shadow-sm);
        color: var(--text-white);
    }
    .inventory__badge--stock { background: var(--inventory-stock); }
    .inventory__badge--dropship { background: var(--inventory-dropship); }
    .inventory__badge--set { background: var(--inventory-set); }
    .inventory__badge--hybrid { background: var(--inventory-hybrid); }
    .inventory__channel-badges { display: flex; gap: 2px; margin-top: 4px; }
    .inventory__channel-badge {
        padding: 2px 4px; border-radius: 2px; font-size: 0.5rem; font-weight: 700;
        background: rgba(255, 255, 255, 0.9); color: var(--text-primary); box-shadow: var(--shadow-sm);
    }
    .inventory__channel-badge--ebay { background: #0064d2; color: white; }
    .inventory__channel-badge--mercari { background: #d63384; color: white; }
    .inventory__channel-badge--shopify { background: #96bf48; color: white; }
    .inventory__card-info {
        padding: var(--space-md); flex: 1; display: flex; flex-direction: column;
        gap: var(--space-sm); justify-content: space-between;
    }
    .inventory__card-title {
        font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); line-height: 1.3;
        margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .inventory__card-price { display: flex; flex-direction: column; gap: 2px; }
    .inventory__card-price-main { font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); }
    .inventory__card-price-sub { font-size: var(--text-xs); color: var(--text-muted); }
    .inventory__card-meta {
        display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); font-size: var(--text-xs);
    }
    .inventory__meta-item { display: flex; justify-content: space-between; color: var(--text-secondary); }
    .inventory__meta-value { font-weight: 600; color: var(--text-primary); }
    .inventory__card-footer {
        display: flex; justify-content: space-between; align-items: center; margin-top: auto;
        padding-top: var(--space-sm); border-top: 1px solid var(--border-light);
    }
    .inventory__card-sku {
        font-size: 0.7rem; color: var(--text-muted); font-family: monospace;
        background: var(--bg-tertiary); padding: 2px 4px; border-radius: var(--radius-sm);
    }

    /* ===== Excel風テーブル ===== */
    .excel-grid {
        background: var(--bg-secondary); border: 1px solid var(--border-color);
        border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-md);
        margin-bottom: var(--space-lg);
    }
    .excel-toolbar {
        background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);
        padding: var(--space-sm) var(--space-md); display: flex; justify-content: space-between;
        align-items: center; gap: var(--space-md); min-height: 40px; flex-wrap: wrap;
    }
    .excel-toolbar__left, .excel-toolbar__right {
        display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap;
    }
    .excel-btn {
        padding: var(--space-xs) var(--space-sm); border: 1px solid var(--border-color);
        border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-primary);
        font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: var(--transition-fast);
        height: 28px; display: inline-flex; align-items: center; gap: var(--space-xs); white-space: nowrap;
    }
    .excel-btn:hover { background: var(--bg-hover); border-color: var(--excel-primary); }
    .excel-btn--primary { background: var(--excel-primary); border-color: var(--excel-primary); color: var(--text-white); }
    .excel-btn--success { background: var(--excel-success); border-color: var(--excel-success); color: var(--text-white); }
    .excel-btn--warning { background: var(--excel-warning); border-color: var(--excel-warning); color: var(--text-white); }
    .excel-btn--small { padding: 2px var(--space-xs); font-size: 0.7rem; height: 24px; }
    .excel-table-wrapper { overflow: auto; max-height: 600px; border-top: 1px solid var(--border-color); }
    .excel-table {
        width: 100%; border-collapse: collapse; background: var(--bg-secondary);
        font-size: 0.75rem; line-height: 1.2; table-layout: fixed;
    }
    .excel-table th {
        background: var(--bg-tertiary); border: 1px solid var(--border-color);
        padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600;
        color: var(--text-primary); font-size: 0.7rem; height: 28px; position: sticky;
        top: 0; z-index: 10; user-select: none; cursor: pointer;
    }
    .excel-table th:hover { background: var(--bg-hover); }
    .excel-table td {
        border: 1px solid var(--border-light); padding: 1px 2px; height: 22px;
        vertical-align: middle; position: relative;
    }
    .excel-table tr:hover { background: rgba(var(--excel-primary-rgb), 0.02); }
    .excel-table tr:nth-child(even) { background: rgba(0, 0, 0, 0.01); }
    .excel-table tr:nth-child(even):hover { background: rgba(var(--excel-primary-rgb), 0.03); }
    .excel-checkbox { width: 14px; height: 14px; cursor: pointer; }

    /* ===== レスポンシブ対応 ===== */
    @media (max-width: 1200px) {
        .inventory__grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
    }
    @media (max-width: 768px) {
        .content { padding: var(--space-md); }
        .inventory__header-top { flex-direction: column; align-items: stretch; }
        .inventory__filter-grid { grid-template-columns: 1fr; }
        .inventory__filter-actions { flex-direction: column; align-items: stretch; }
        .inventory__view-controls { flex-direction: column; align-items: stretch; }
        .inventory__grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-sm); }
        .inventory__card-image { height: 120px; }
        .inventory__actions { flex-wrap: wrap; width: 100%; }
    }
    @media (max-width: 480px) {
        .inventory__stats { grid-template-columns: repeat(3, 1fr); }
    }
    </style>
</head>
<body>
    <div class="content">
        <!-- ヘッダー -->
        <header class="inventory__header">
            <div class="inventory__header-top">
                <h1 class="inventory__title">
                    <i class="fas fa-warehouse inventory__title-icon"></i>
                    <?php echo safe_output('棚卸しシステム - 純粋Webツール版'); ?>
                </h1>
                
                <div class="inventory__exchange-rate">
                    <i class="fas fa-exchange-alt inventory__exchange-icon"></i>
                    <span class="inventory__exchange-text">USD/JPY:</span>
                    <span class="inventory__exchange-value" id="exchange-rate">¥150.25</span>
                </div>
            </div>
            
            <div class="inventory__stats">
                <div class="inventory__stat">
                    <span class="inventory__stat-number" id="total-products">0</span>
                    <span class="inventory__stat-label"><?php echo safe_output('総商品数'); ?></span>
                </div>
                <div class="inventory__stat">
                    <span class="inventory__stat-number" id="stock-products">0</span>
                    <span class="inventory__stat-label"><?php echo safe_output('有在庫'); ?></span>
                </div>
                <div class="inventory__stat">
                    <span class="inventory__stat-number" id="dropship-products">0</span>
                    <span class="inventory__stat-label"><?php echo safe_output('無在庫'); ?></span>
                </div>
                <div class="inventory__stat">
                    <span class="inventory__stat-number" id="set-products">0</span>
                    <span class="inventory__stat-label"><?php echo safe_output('セット品'); ?></span>
                </div>
                <div class="inventory__stat">
                    <span class="inventory__stat-number" id="hybrid-products">0</span>
                    <span class="inventory__stat-label"><?php echo safe_output('ハイブリッド'); ?></span>
                </div>
                <div class="inventory__stat">
                    <span class="inventory__stat-number" id="total-value">$0</span>
                    <span class="inventory__stat-label"><?php echo safe_output('総在庫価値'); ?></span>
                </div>
            </div>
        </header>

        <!-- フィルターバー -->
        <div class="inventory__filter-bar">
            <h2 class="inventory__filter-title">
                <i class="fas fa-filter"></i>
                <?php echo safe_output('フィルター設定'); ?>
            </h2>
            
            <div class="inventory__filter-grid">
                <div class="inventory__filter-group">
                    <label class="inventory__filter-label"><?php echo safe_output('商品種類'); ?></label>
                    <select class="inventory__filter-select" id="filter-type">
                        <option value=""><?php echo safe_output('すべて'); ?></option>
                        <option value="stock"><?php echo safe_output('有在庫'); ?></option>
                        <option value="dropship"><?php echo safe_output('無在庫'); ?></option>
                        <option value="set"><?php echo safe_output('セット品'); ?></option>
                        <option value="hybrid"><?php echo safe_output('ハイブリッド'); ?></option>
                    </select>
                </div>
                
                <div class="inventory__filter-group">
                    <label class="inventory__filter-label"><?php echo safe_output('出品モール'); ?></label>
                    <select class="inventory__filter-select" id="filter-channel">
                        <option value=""><?php echo safe_output('すべて'); ?></option>
                        <option value="ebay">eBay</option>
                        <option value="shopify">Shopify</option>
                        <option value="mercari"><?php echo safe_output('メルカリ'); ?></option>
                    </select>
                </div>
                
                <div class="inventory__filter-group">
                    <label class="inventory__filter-label"><?php echo safe_output('在庫状況'); ?></label>
                    <select class="inventory__filter-select" id="filter-stock-status">
                        <option value=""><?php echo safe_output('すべて'); ?></option>
                        <option value="sufficient"><?php echo safe_output('十分'); ?></option>
                        <option value="warning"><?php echo safe_output('注意'); ?></option>
                        <option value="low"><?php echo safe_output('少量'); ?></option>
                        <option value="out"><?php echo safe_output('在庫切れ'); ?></option>
                    </select>
                </div>
                
                <div class="inventory__filter-group">
                    <label class="inventory__filter-label"><?php echo safe_output('価格範囲 (USD)'); ?></label>
                    <select class="inventory__filter-select" id="filter-price-range">
                        <option value=""><?php echo safe_output('すべて'); ?></option>
                        <option value="0-25">$0 - $25</option>
                        <option value="25-50">$25 - $50</option>
                        <option value="50-100">$50 - $100</option>
                        <option value="100+">$100+</option>
                    </select>
                </div>
            </div>
            
            <div class="inventory__filter-actions">
                <div class="inventory__filter-left">
                    <button class="btn btn--secondary" id="reset-filters-btn">
                        <i class="fas fa-undo"></i>
                        <?php echo safe_output('リセット'); ?>
                    </button>
                    <button class="btn btn--info" id="apply-filters-btn">
                        <i class="fas fa-search"></i>
                        <?php echo safe_output('適用'); ?>
                    </button>
                </div>
                
                <div class="inventory__filter-right">
                    <div class="inventory__search-box">
                        <i class="fas fa-search inventory__search-icon"></i>
                        <input type="text" class="inventory__search-input" id="search-input" 
                               placeholder="<?php echo safe_output('商品名・SKU・カテゴリで検索...'); ?>">
                    </div>
                </div>
            </div>
        </div>

        <!-- ビュー切り替えコントロール -->
        <div class="inventory__view-controls">
            <div class="inventory__view-toggle">
                <button class="inventory__view-btn inventory__view-btn--active" id="card-view-btn">
                    <i class="fas fa-th-large"></i>
                    <?php echo safe_output('カードビュー'); ?>
                </button>
                <button class="inventory__view-btn" id="list-view-btn">
                    <i class="fas fa-table"></i>
                    <?php echo safe_output('Excelビュー'); ?>
                </button>
            </div>
            
            <div class="inventory__actions">
                <button class="btn btn--success" id="add-product-btn">
                    <i class="fas fa-plus"></i>
                    <?php echo safe_output('新規商品登録'); ?>
                </button>
                
                <button class="btn btn--warning" id="create-set-btn">
                    <i class="fas fa-layer-group"></i>
                    <span id="set-btn-text"><?php echo safe_output('新規セット品作成'); ?></span>
                </button>
                
                <button class="btn btn--secondary" onclick="exportData()">
                    <i class="fas fa-download"></i>
                    <?php echo safe_output('エクスポート'); ?>
                </button>
            </div>
        </div>

        <!-- カードビュー -->
        <div class="inventory__grid" id="card-view">
            <!-- データはJavaScriptで動的に生成 -->
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="fas fa-spinner fa-spin" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.1rem;">PostgreSQLからデータを読み込み中...</p>
            </div>
        </div>

        <!-- Excel風リストビュー -->
        <div class="excel-grid" id="list-view" style="display: none;">
            <div class="excel-toolbar">
                <div class="excel-toolbar__left">
                    <button class="excel-btn excel-btn--primary">
                        <i class="fas fa-plus"></i>
                        <?php echo safe_output('新規商品登録'); ?>
                    </button>
                    <button class="excel-btn">
                        <i class="fas fa-trash"></i>
                        <?php echo safe_output('選択削除'); ?>
                    </button>
                    <button class="excel-btn excel-btn--warning">
                        <i class="fas fa-layer-group"></i>
                        <?php echo safe_output('セット品作成'); ?>
                    </button>
                </div>
                
                <div class="excel-toolbar__right">
                    <button class="excel-btn" onclick="exportData()">
                        <i class="fas fa-download"></i>
                        <?php echo safe_output('エクスポート'); ?>
                    </button>
                </div>
            </div>

            <div class="excel-table-wrapper">
                <table class="excel-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;"><input type="checkbox" id="select-all-checkbox"></th>
                            <th style="width: 60px;"><?php echo safe_output('画像'); ?></th>
                            <th style="width: 200px;"><?php echo safe_output('商品名'); ?></th>
                            <th style="width: 120px;">SKU</th>
                            <th style="width: 80px;"><?php echo safe_output('種類'); ?></th>
                            <th style="width: 80px;"><?php echo safe_output('状態'); ?></th>
                            <th style="width: 80px;"><?php echo safe_output('価格(USD)'); ?></th>
                            <th style="width: 60px;"><?php echo safe_output('在庫'); ?></th>
                            <th style="width: 80px;"><?php echo safe_output('仕入価格'); ?></th>
                            <th style="width: 80px;"><?php echo safe_output('利益'); ?></th>
                            <th style="width: 80px;"><?php echo safe_output('モール'); ?></th>
                            <th style="width: 100px;"><?php echo safe_output('カテゴリ'); ?></th>
                            <th style="width: 100px;"><?php echo safe_output('操作'); ?></th>
                        </tr>
                    </thead>
                    <tbody id="products-table-body">
                        <!-- データはJavaScriptで動的に生成 -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- 純粋Webツール版 JavaScript -->
    <script src="common/js/tanaoroshi_inventory.js"></script>
</body>
</html>