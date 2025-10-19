<?php
/**
 * 棚卸しシステム - データ同期修正版
 * 修正日: 2025-08-17
 * 修正内容: ExcelビューとカードビューのfilteredData完全同期
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

function safe_output($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
?>

<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo safe_output('棚卸しシステム - データ同期修正版'); ?></title>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- 内蔵スタイル -->
    <style>
    /* === CSS変数定義 === */
    :root {
        --bg-primary: #f8fafc;
        --bg-secondary: #ffffff;
        --bg-tertiary: #f1f5f9;
        --text-primary: #1e293b;
        --text-secondary: #475569;
        --text-muted: #64748b;
        --border-color: #e2e8f0;
        --border-light: #f1f5f9;
        --radius-lg: 0.75rem;
        --radius-md: 0.5rem;
        --radius-sm: 0.25rem;
        --space-xs: 0.5rem;
        --space-sm: 0.75rem;
        --space-md: 1rem;
        --space-lg: 1.5rem;
        --color-success: #059669;
        --color-warning: #dc6803;
        --color-info: #0e7490;
        --color-purple: #7c3aed;
        --color-primary: #3b82f6;
        --color-danger: #dc2626;
    }

    /* === ベースレイアウト === */
    body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        background: var(--bg-primary);
        color: var(--text-primary);
        line-height: 1.6;
    }

    /* === ビューコンテナ統一システム === */
    .inventory__main-content {
        position: relative;
        min-height: 500px;
        width: 100%;
    }
    
    .inventory__view {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        min-height: 100%;
        background: var(--bg-primary);
    }
    
    .inventory__view--hidden {
        display: none !important;
    }
    
    .inventory__view--visible {
        display: block !important;
    }

    /* === カードビュー === */
    .inventory__grid {
        display: grid !important;
        grid-template-columns: repeat(8, 1fr) !important;
        gap: 1rem !important;
        padding: var(--space-lg) !important;
        background: var(--bg-primary) !important;
        min-height: calc(100vh - 400px) !important;
    }

    .inventory__card {
        background: var(--bg-secondary) !important;
        border: 1px solid var(--border-color) !important;
        border-radius: var(--radius-lg) !important;
        overflow: hidden !important;
        cursor: pointer !important;
        transition: all 0.2s ease-in-out !important;
        position: relative !important;
        display: flex !important;
        flex-direction: column !important;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
        height: 280px !important;
    }

    .inventory__card:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.15) !important;
    }

    .inventory__card-image {
        position: relative !important;
        height: 150px !important;
        background: var(--bg-tertiary) !important;
        overflow: hidden !important;
        flex-shrink: 0 !important;
    }

    .inventory__card-img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
    }

    .inventory__card-placeholder {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 100% !important;
        background: var(--bg-tertiary) !important;
        color: var(--text-muted) !important;
        flex-direction: column !important;
        gap: 0.5rem !important;
        font-size: 0.875rem;
    }

    .inventory__badge {
        position: absolute !important;
        top: 0.5rem !important;
        right: 0.5rem !important;
        padding: 0.25rem 0.5rem !important;
        border-radius: var(--radius-sm) !important;
        font-size: 0.7rem !important;
        font-weight: 600 !important;
        color: white !important;
    }

    .inventory__badge--stock { background: var(--color-success) !important; }
    .inventory__badge--dropship { background: var(--color-info) !important; }
    .inventory__badge--set { background: var(--color-purple) !important; }
    .inventory__badge--hybrid { background: var(--color-warning) !important; }

    .inventory__card-info {
        padding: var(--space-sm) !important;
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 0.5rem !important;
    }

    .inventory__card-title {
        font-size: 0.875rem !important;
        font-weight: 600 !important;
        color: var(--text-primary) !important;
        line-height: 1.25 !important;
        margin: 0 !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        overflow: hidden !important;
        height: 2.5rem !important;
    }

    .inventory__card-price {
        display: flex !important;
        flex-direction: column !important;
        gap: 0.25rem !important;
    }

    .inventory__card-price-main {
        font-size: 1rem !important;
        font-weight: 700 !important;
        color: var(--text-primary) !important;
    }

    .inventory__card-price-sub {
        font-size: 0.75rem !important;
        color: var(--text-muted) !important;
    }

    .inventory__card-footer {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-top: auto !important;
        padding-top: 0.5rem !important;
        border-top: 1px solid var(--border-light) !important;
        font-size: 0.75rem !important;
    }

    .inventory__card-sku {
        font-family: monospace !important;
        background: var(--bg-tertiary) !important;
        padding: 0.125rem 0.25rem !important;
        border-radius: var(--radius-sm) !important;
        color: var(--text-muted) !important;
    }

    .inventory__card-stock {
        font-weight: 600 !important;
        color: var(--text-secondary) !important;
    }

    /* === Excelビュー === */
    .inventory__excel-container {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        margin: var(--space-lg);
    }

    .excel-table {
        width: 100%;
        border-collapse: collapse;
        background: var(--bg-secondary);
        font-size: 0.75rem;
        line-height: 1.2;
        table-layout: fixed;
    }

    .excel-table th {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        padding: var(--space-xs) var(--space-sm);
        text-align: left;
        font-weight: 600;
        color: var(--text-primary);
        font-size: 0.7rem;
        height: 28px;
        position: sticky;
        top: 0;
        z-index: 10;
    }

    .excel-table td {
        border: 1px solid var(--border-light);
        padding: 1px 2px;
        height: 22px;
    }

    .excel-cell {
        width: 100%;
        height: 100%;
        border: none;
        background: transparent;
        font-size: 0.75rem;
        padding: 2px 4px;
        outline: none;
        color: var(--text-primary);
    }

    .excel-select {
        width: 100%;
        height: 20px;
        border: none;
        background: transparent;
        font-size: 0.75rem;
        outline: none;
        cursor: pointer;
    }

    .excel-btn {
        padding: 2px var(--space-xs);
        font-size: 0.7rem;
        height: 24px;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        background: var(--bg-secondary);
        cursor: pointer;
        color: var(--text-primary);
    }

    .excel-btn--small {
        padding: 2px 4px;
    }

    .excel-btn--warning {
        background: var(--color-warning);
        color: white;
    }

    /* === ヘッダー === */
    .inventory__header {
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border-color);
        padding: var(--space-lg);
    }

    .inventory__header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-md);
    }

    .inventory__title {
        font-size: 1.875rem;
        font-weight: 700;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        margin: 0;
    }

    .inventory__title-icon {
        color: var(--color-info);
    }

    .inventory__stats {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: var(--space-md);
    }

    .inventory__stat {
        text-align: center;
        background: var(--bg-tertiary);
        padding: var(--space-md);
        border-radius: var(--radius-md);
    }

    .inventory__stat-number {
        display: block;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
    }

    .inventory__stat-label {
        font-size: 0.875rem;
        color: var(--text-muted);
    }

    /* === フィルターバー === */
    .inventory__filter-bar {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: var(--space-lg);
        margin: var(--space-md);
    }

    .inventory__filter-title {
        margin: 0 0 var(--space-md) 0;
        font-size: 1.25rem;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }

    .inventory__filter-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--space-md);
        margin-bottom: var(--space-md);
    }

    .inventory__filter-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .inventory__filter-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-secondary);
    }

    .inventory__filter-select {
        padding: 0.5rem;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        background: var(--bg-secondary);
        color: var(--text-primary);
    }

    .inventory__filter-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .inventory__filter-left {
        display: flex;
        gap: var(--space-sm);
    }

    .inventory__search-box {
        position: relative;
        display: flex;
        align-items: center;
    }

    .inventory__search-input {
        padding: 0.5rem 1rem 0.5rem 2.5rem;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        background: var(--bg-secondary);
        min-width: 300px;
    }

    .inventory__search-icon {
        position: absolute;
        left: 0.75rem;
        color: var(--text-muted);
    }

    /* === ビューコントロール === */
    .inventory__view-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: var(--space-md);
    }

    .inventory__view-toggle {
        display: flex;
        background: var(--bg-tertiary);
        border-radius: var(--radius-md);
        padding: 0.25rem;
    }

    .inventory__view-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border: none;
        background: transparent;
        border-radius: var(--radius-sm);
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .inventory__view-btn--active {
        background: var(--bg-secondary);
        color: var(--text-primary);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .inventory__actions {
        display: flex;
        gap: var(--space-sm);
    }

    /* === ボタン === */
    .btn {
        display: inline-flex;
        align-items: center;
        gap: var(--space-xs);
        padding: 0.5rem 1rem;
        border: none;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
    }

    .btn--primary { background: var(--color-primary); color: white; }
    .btn--secondary { background: var(--bg-tertiary); color: var(--text-secondary); }
    .btn--success { background: var(--color-success); color: white; }
    .btn--warning { background: var(--color-warning); color: white; }
    .btn--info { background: var(--color-info); color: white; }

    .btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }

    /* === レスポンシブ === */
    @media (max-width: 1600px) {
        .inventory__grid { grid-template-columns: repeat(6, 1fr) !important; }
    }

    @media (max-width: 1200px) {
        .inventory__grid { grid-template-columns: repeat(4, 1fr) !important; }
        .inventory__stats { grid-template-columns: repeat(3, 1fr); }
    }

    @media (max-width: 768px) {
        .inventory__grid { 
            grid-template-columns: repeat(2, 1fr) !important; 
            gap: 0.5rem !important; 
        }
        .inventory__card { height: 240px !important; }
        .inventory__stats { grid-template-columns: repeat(2, 1fr); }
        .inventory__filter-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 480px) {
        .inventory__grid { grid-template-columns: 1fr !important; }
        .inventory__card { height: 220px !important; }
        .inventory__stats { grid-template-columns: 1fr; }
    }
    </style>
</head>
<body>
    <!-- ヘッダー -->
    <header class="inventory__header">
        <div class="inventory__header-top">
            <h1 class="inventory__title">
                <i class="fas fa-warehouse inventory__title-icon"></i>
                <?php echo safe_output('棚卸しシステム（データ同期修正版）'); ?>
            </h1>
            
            <div style="background: var(--bg-tertiary); padding: 0.5rem 1rem; border-radius: var(--radius-md);">
                <span style="color: var(--text-secondary);">USD/JPY:</span>
                <span id="exchange-rate">¥150.25</span>
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
                    <option value="amazon">Amazon</option>
                    <option value="mercari">メルカリ</option>
                </select>
            </div>
            
            <div class="inventory__filter-group">
                <label class="inventory__filter-label"><?php echo safe_output('在庫状況'); ?></label>
                <select class="inventory__filter-select" id="filter-stock-status">
                    <option value=""><?php echo safe_output('すべて'); ?></option>
                    <option value="in-stock"><?php echo safe_output('在庫あり'); ?></option>
                    <option value="low-stock"><?php echo safe_output('在庫僅少'); ?></option>
                    <option value="out-of-stock"><?php echo safe_output('在庫切れ'); ?></option>
                </select>
            </div>
            
            <div class="inventory__filter-group">
                <label class="inventory__filter-label"><?php echo safe_output('価格範囲 (USD)'); ?></label>
                <select class="inventory__filter-select" id="filter-price-range">
                    <option value=""><?php echo safe_output('すべて'); ?></option>
                    <option value="0-100">$0 - $100</option>
                    <option value="100-500">$100 - $500</option>
                    <option value="500-1000">$500 - $1,000</option>
                    <option value="1000+">$1,000以上</option>
                </select>
            </div>
        </div>
        
        <div class="inventory__filter-actions">
            <div class="inventory__filter-left">
                <button class="btn btn--secondary" onclick="resetFilters()">
                    <i class="fas fa-undo"></i>
                    <?php echo safe_output('リセット'); ?>
                </button>
                <button class="btn btn--info" onclick="applyFilters()">
                    <i class="fas fa-search"></i>
                    <?php echo safe_output('適用'); ?>
                </button>
            </div>
            
            <div class="inventory__search-box">
                <i class="fas fa-search inventory__search-icon"></i>
                <input type="text" class="inventory__search-input" id="search-input" 
                       placeholder="<?php echo safe_output('商品名・SKU・カテゴリで検索...'); ?>">
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
            <button class="inventory__view-btn" id="excel-view-btn">
                <i class="fas fa-table"></i>
                <?php echo safe_output('Excelビュー'); ?>
            </button>
        </div>
        
        <div class="inventory__actions">
            <button class="btn btn--success" onclick="showDemoMessage()">
                <i class="fas fa-plus"></i>
                <?php echo safe_output('新規商品登録'); ?>
            </button>
            
            <button class="btn btn--warning" onclick="showDemoMessage()">
                <i class="fas fa-layer-group"></i>
                <?php echo safe_output('新規セット品作成'); ?>
            </button>
            
            <button class="btn btn--info" onclick="loadDemoData()">
                <i class="fas fa-database"></i>
                <?php echo safe_output('デモデータ読み込み'); ?>
            </button>
        </div>
    </div>

    <!-- 🔧 修正: ビュー統一メインコンテナ -->
    <div class="inventory__main-content">
        <!-- カードビュー -->
        <div class="inventory__view inventory__view--visible" id="card-view">
            <div class="inventory__grid">
                <div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;">
                    <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>「デモデータ読み込み」ボタンをクリックしてください</p>
                </div>
            </div>
        </div>

        <!-- Excelビュー -->
        <div class="inventory__view inventory__view--hidden" id="excel-view">
            <div class="inventory__excel-container">
                <div style="background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); padding: var(--space-sm) var(--space-md); display: flex; justify-content: space-between; align-items: center; gap: var(--space-md); min-height: 40px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap;">
                        <button class="btn btn--success btn--small" onclick="showDemoMessage()" style="height: 28px; font-size: 0.75rem;">
                            <i class="fas fa-plus"></i>
                            新規登録
                        </button>
                        <button class="btn btn--secondary btn--small" onclick="showDemoMessage()" style="height: 28px; font-size: 0.75rem;">
                            <i class="fas fa-trash"></i>
                            選択削除
                        </button>
                        <button class="btn btn--warning btn--small" onclick="showDemoMessage()" style="height: 28px; font-size: 0.75rem;">
                            <i class="fas fa-layer-group"></i>
                            セット品作成
                        </button>
                    </div>
                    <div style="display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap;">
                        <div style="position: relative; display: flex; align-items: center;">
                            <i class="fas fa-search" style="position: absolute; left: var(--space-sm); color: var(--text-muted); font-size: 0.8rem;"></i>
                            <input type="text" style="padding: var(--space-xs) var(--space-sm) var(--space-xs) var(--space-xl); border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary); font-size: 0.8rem; width: 200px; height: 28px;" placeholder="商品検索..." id="excel-search-input" />
                        </div>
                        <button class="btn btn--info btn--small" onclick="showDemoMessage()" style="height: 28px; font-size: 0.75rem;">
                            <i class="fas fa-download"></i>
                            エクスポート
                        </button>
                    </div>
                </div>
                
                <div style="overflow: auto; max-height: 600px; border-top: 1px solid var(--border-color);">
                    <table class="excel-table">
                        <thead>
                            <tr>
                                <th style="width: 40px;">
                                    <input type="checkbox" style="width: 14px; height: 14px; cursor: pointer;" />
                                </th>
                                <th style="width: 60px;">画像</th>
                                <th style="width: 250px;">商品名</th>
                                <th style="width: 120px;">SKU</th>
                                <th style="width: 80px;">種類</th>
                                <th style="width: 100px;">販売価格(USD)</th>
                                <th style="width: 80px;">在庫数</th>
                                <th style="width: 80px;">操作</th>
                            </tr>
                        </thead>
                        <tbody id="excel-table-body">
                            <tr>
                                <td colspan="8" style="text-align: center; padding: 2rem; color: #64748b;">
                                    <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                                    「デモデータ読み込み」ボタンをクリックしてください
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div style="background: var(--bg-tertiary); border-top: 1px solid var(--border-color); padding: var(--space-sm) var(--space-md); display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; min-height: 32px;">
                    <div style="color: var(--text-secondary);" id="excel-stats">商品: 0 / 0件表示</div>
                    <div style="display: flex; gap: var(--space-xs);">
                        <button class="excel-btn" disabled>
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="excel-btn" style="background: var(--color-primary); color: white;">1</button>
                        <button class="excel-btn" disabled>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript（データ同期修正版） -->
    <script>
    // === 🔧 修正: データ同期統一システム ===
    
    // グローバル変数
    let allInventoryData = [];
    let filteredData = [];
    let currentView = 'card'; // 'card' または 'excel'
    let exchangeRate = 150.25;

    // === 初期化 ===
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 データ同期修正版システム初期化開始');
        initializeSystem();
    });

    function initializeSystem() {
        console.log('📊 システム初期化');
        
        // イベントリスナー設定
        setupEventListeners();
        
        // 統計初期化
        updateStatistics();
        
        console.log('✅ システム初期化完了');
    }

    // === イベントリスナー設定 ===
    function setupEventListeners() {
        // フィルター要素
        const filterElements = ['filter-type', 'filter-channel', 'filter-stock-status', 'filter-price-range'];
        filterElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', applyFilters);
            }
        });
        
        // 検索（メインとExcel両方）
        const searchInput = document.getElementById('search-input');
        const excelSearchInput = document.getElementById('excel-search-input');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => performSearch(e.target.value));
        }
        
        if (excelSearchInput) {
            excelSearchInput.addEventListener('input', (e) => performSearch(e.target.value));
        }
        
        // ビュー切り替えボタン
        const cardViewBtn = document.getElementById('card-view-btn');
        const excelViewBtn = document.getElementById('excel-view-btn');
        
        if (cardViewBtn) {
            cardViewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                switchToCardView();
            });
        }
        
        if (excelViewBtn) {
            excelViewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                switchToExcelView();
            });
        }
    }

    // === 🎯 修正1: renderInventoryData()統合関数 - すべての描画の起点 ===
    function renderInventoryData() {
        console.log('🎨 データ表示処理開始 - 現在のビュー:', currentView);
        
        // 🔧 修正: currentViewに応じて適切な描画関数を呼び出し
        if (currentView === 'card') {
            renderCardView(); // カードビュー描画
        } else {
            renderExcelTable(); // Excelビュー描画（新規実装）
        }
        
        // 統計更新
        updateStatistics();
        
        console.log(`✅ データ表示完了: ${filteredData.length}件 (${currentView}ビュー)`);
    }

    // === 🎯 修正2: renderCardView()関数 - filteredDataを使用 ===
    function renderCardView() {
        console.log('🎨 カードビュー描画開始');
        
        const container = document.querySelector('#card-view .inventory__grid');
        if (!container) {
            console.error('❌ カードコンテナが見つかりません');
            return;
        }
        
        // 🔧 修正: 必ずfilteredDataを使用
        if (!filteredData || filteredData.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;">
                    <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>表示するデータがありません</p>
                </div>
            `;
            return;
        }
        
        // filteredDataからカードHTMLを生成
        const cardsHTML = filteredData.map(item => `
            <div class="inventory__card" onclick="showItemDetails(${item.id})">
                <div class="inventory__card-image">
                    ${item.image ? 
                        `<img src="${item.image}" alt="${escapeHtml(item.title)}" class="inventory__card-img">` :
                        `<div class="inventory__card-placeholder">
                            <i class="fas fa-image"></i>
                            <span>商品画像</span>
                        </div>`
                    }
                    <div class="inventory__badge inventory__badge--${item.type}">
                        ${getTypeBadgeText(item.type)}
                    </div>
                </div>
                
                <div class="inventory__card-info">
                    <h3 class="inventory__card-title">${escapeHtml(item.title)}</h3>
                    
                    <div class="inventory__card-price">
                        <div class="inventory__card-price-main">$${item.priceUSD.toFixed(2)}</div>
                        <div class="inventory__card-price-sub">¥${Math.round(item.priceUSD * exchangeRate).toLocaleString()}</div>
                    </div>
                    
                    <div class="inventory__card-footer">
                        <span class="inventory__card-sku">${item.sku}</span>
                        <span class="inventory__card-stock">在庫: ${item.stock}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = cardsHTML;
        console.log(`✅ カードビュー描画完了: ${filteredData.length}件`);
    }

    // === 🎯 修正3: renderExcelTable()関数 - 新規実装（filteredData使用） ===
    function renderExcelTable() {
        console.log('🎨 Excelビュー描画開始');
        
        const tableBody = document.getElementById('excel-table-body');
        if (!tableBody) {
            console.error('❌ Excelテーブルボディが見つかりません');
            return;
        }
        
        // 🔧 修正: 必ずfilteredDataを使用してテーブル行を生成
        if (!filteredData || filteredData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: #64748b;">
                        <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5; display: block;"></i>
                        表示するデータがありません
                    </td>
                </tr>
            `;
            return;
        }
        
        // filteredDataからテーブル行HTMLを生成
        const tableRows = filteredData.map(item => `
            <tr data-id="${item.id}">
                <td><input type="checkbox" class="excel-checkbox product-checkbox" data-id="${item.id}"></td>
                <td>
                    ${item.image ? 
                        `<img src="${item.image}" alt="商品画像" style="width: 40px; height: 32px; object-fit: cover; border-radius: 4px;">` :
                        `<div style="width: 40px; height: 32px; background: #f1f5f9; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #64748b;">
                            <i class="fas fa-image" style="font-size: 0.7rem;"></i>
                        </div>`
                    }
                </td>
                <td><input type="text" class="excel-cell" value="${escapeHtml(item.title)}"></td>
                <td><input type="text" class="excel-cell" value="${item.sku}"></td>
                <td>
                    <select class="excel-select">
                        <option value="stock" ${item.type === 'stock' ? 'selected' : ''}>有在庫</option>
                        <option value="dropship" ${item.type === 'dropship' ? 'selected' : ''}>無在庫</option>
                        <option value="set" ${item.type === 'set' ? 'selected' : ''}>セット品</option>
                        <option value="hybrid" ${item.type === 'hybrid' ? 'selected' : ''}>ハイブリッド</option>
                    </select>
                </td>
                <td><input type="number" class="excel-cell" value="${item.priceUSD.toFixed(2)}" style="text-align: right;" step="0.01"></td>
                <td>
                    ${item.type === 'set' ? 
                        `<span style="text-align: center; color: var(--text-secondary);">${item.stock}セット</span>` :
                        `<input type="number" class="excel-cell" value="${item.stock}" style="text-align: center;">`
                    }
                </td>
                <td>
                    <div style="display: flex; gap: 2px;">
                        <button class="excel-btn excel-btn--small" onclick="showItemDetails(${item.id})" title="詳細">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${item.type === 'set' ? 
                            `<button class="excel-btn excel-btn--small excel-btn--warning" onclick="showDemoMessage()" title="セット編集">
                                <i class="fas fa-layer-group"></i>
                            </button>` :
                            `<button class="excel-btn excel-btn--small" onclick="showDemoMessage()" title="削除" style="color: var(--color-danger);">
                                <i class="fas fa-trash"></i>
                            </button>`
                        }
                    </div>
                </td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = tableRows;
        
        // フッター統計更新
        updateExcelTableFooter();
        
        console.log(`✅ Excelビュー描画完了: ${filteredData.length}件`);
    }

    // === 🎯 修正4: Excelテーブルフッター更新関数 ===
    function updateExcelTableFooter() {
        const statsElement = document.getElementById('excel-stats');
        
        if (statsElement) {
            const totalCount = allInventoryData.length;
            const filteredCount = filteredData.length;
            statsElement.textContent = `商品: ${filteredCount} / ${totalCount}件表示`;
        }
    }

    // === 🎯 修正5: フィルター適用関数 - renderInventoryData()を呼び出し ===
    function applyFilters() {
        console.log('🔍 フィルター適用開始');
        
        let filtered = [...allInventoryData];
        
        // タイプフィルター
        const typeFilter = document.getElementById('filter-type')?.value;
        if (typeFilter) {
            filtered = filtered.filter(item => item.type === typeFilter);
        }
        
        // チャネルフィルター
        const channelFilter = document.getElementById('filter-channel')?.value;
        if (channelFilter) {
            filtered = filtered.filter(item => 
                item.channels && item.channels.includes(channelFilter)
            );
        }
        
        // 在庫状況フィルター
        const stockFilter = document.getElementById('filter-stock-status')?.value;
        if (stockFilter) {
            switch(stockFilter) {
                case 'in-stock':
                    filtered = filtered.filter(item => item.stock > 10);
                    break;
                case 'low-stock':
                    filtered = filtered.filter(item => item.stock > 0 && item.stock <= 10);
                    break;
                case 'out-of-stock':
                    filtered = filtered.filter(item => item.stock === 0);
                    break;
            }
        }
        
        // 価格範囲フィルター
        const priceFilter = document.getElementById('filter-price-range')?.value;
        if (priceFilter) {
            switch(priceFilter) {
                case '0-100':
                    filtered = filtered.filter(item => item.priceUSD <= 100);
                    break;
                case '100-500':
                    filtered = filtered.filter(item => item.priceUSD > 100 && item.priceUSD <= 500);
                    break;
                case '500-1000':
                    filtered = filtered.filter(item => item.priceUSD > 500 && item.priceUSD <= 1000);
                    break;
                case '1000+':
                    filtered = filtered.filter(item => item.priceUSD > 1000);
                    break;
            }
        }
        
        // 🔧 修正: filteredDataを更新し、統一描画関数を呼び出し
        filteredData = filtered;
        renderInventoryData(); // ★重要：両ビューで同じデータが表示される
        
        console.log(`✅ フィルター適用完了: ${filteredData.length}件`);
    }

    // === 🎯 修正6: 検索実行関数 - renderInventoryData()を呼び出し ===
    function performSearch(query) {
        console.log('🔍 検索実行:', query);
        
        if (!query.trim()) {
            filteredData = [...allInventoryData];
        } else {
            const searchTerm = query.toLowerCase();
            filteredData = allInventoryData.filter(item =>
                item.title.toLowerCase().includes(searchTerm) ||
                item.sku.toLowerCase().includes(searchTerm) ||
                (item.category && item.category.toLowerCase().includes(searchTerm))
            );
        }
        
        // 🔧 修正: 統一描画関数を呼び出し
        renderInventoryData(); // ★重要：検索結果が両ビューで同期
        
        console.log(`✅ 検索完了: ${filteredData.length}件`);
    }

    // === 🎯 修正7: フィルターリセット関数 - renderInventoryData()を呼び出し ===
    function resetFilters() {
        console.log('🔄 フィルターリセット');
        
        // フィルター要素をリセット
        document.getElementById('filter-type').value = '';
        document.getElementById('filter-channel').value = '';
        document.getElementById('filter-stock-status').value = '';
        document.getElementById('filter-price-range').value = '';
        
        // 検索ボックスをリセット
        const searchInput = document.getElementById('search-input');
        const excelSearchInput = document.getElementById('excel-search-input');
        if (searchInput) searchInput.value = '';
        if (excelSearchInput) excelSearchInput.value = '';
        
        // 🔧 修正: 全データを表示し、統一描画関数を呼び出し
        filteredData = [...allInventoryData];
        renderInventoryData(); // ★重要：リセット後も両ビューで同期
        
        console.log('✅ フィルターリセット完了');
    }

    // === 🎯 修正8: ビュー切り替え関数の修正 ===
    function switchToCardView() {
        console.log('🔧 カードビュー切り替え');
        
        const cardView = document.getElementById('card-view');
        const excelView = document.getElementById('excel-view');
        const cardViewBtn = document.getElementById('card-view-btn');
        const excelViewBtn = document.getElementById('excel-view-btn');
        
        if (!cardView || !excelView || !cardViewBtn || !excelViewBtn) {
            console.error('❌ ビュー要素が見つかりません');
            return;
        }
        
        // ビュー表示切り替え
        cardView.classList.remove('inventory__view--hidden');
        cardView.classList.add('inventory__view--visible');
        excelView.classList.remove('inventory__view--visible');
        excelView.classList.add('inventory__view--hidden');
        
        // ボタン状態更新
        cardViewBtn.classList.add('inventory__view-btn--active');
        excelViewBtn.classList.remove('inventory__view-btn--active');
        
        // 🔧 修正: currentViewを更新し、データを再描画
        currentView = 'card';
        renderInventoryData(); // ★重要：カードビューでfilteredDataを再描画
        
        console.log('✅ カードビュー表示完了');
    }

    function switchToExcelView() {
        console.log('🔧 Excelビュー切り替え');
        
        const cardView = document.getElementById('card-view');
        const excelView = document.getElementById('excel-view');
        const cardViewBtn = document.getElementById('card-view-btn');
        const excelViewBtn = document.getElementById('excel-view-btn');
        
        if (!cardView || !excelView || !cardViewBtn || !excelViewBtn) {
            console.error('❌ ビュー要素が見つかりません');
            return;
        }
        
        // ビュー表示切り替え
        excelView.classList.remove('inventory__view--hidden');
        excelView.classList.add('inventory__view--visible');
        cardView.classList.remove('inventory__view--visible');
        cardView.classList.add('inventory__view--hidden');
        
        // ボタン状態更新
        excelViewBtn.classList.add('inventory__view-btn--active');
        cardViewBtn.classList.remove('inventory__view-btn--active');
        
        // 🔧 修正: currentViewを更新し、データを再描画
        currentView = 'excel';
        renderInventoryData(); // ★重要：ExcelビューでfilteredDataを再描画
        
        console.log('✅ Excelビュー表示完了');
    }

    // === 🎯 修正9: データ読み込み関数も統一描画を呼び出し ===
    function loadDemoData() {
        console.log('📊 デモデータ生成');
        
        const demoProducts = [
            {id: 1, title: 'Nike Air Jordan 1 High OG Chicago', sku: 'AIR-J1-CHI', type: 'dropship', priceUSD: 450.00, stock: 0, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop'},
            {id: 2, title: 'Rolex Submariner Date Black', sku: 'ROL-SUB-BK41', type: 'dropship', priceUSD: 12500.00, stock: 0},
            {id: 3, title: 'Louis Vuitton Neverfull MM', sku: 'LV-NEVERFULL-MM', type: 'dropship', priceUSD: 1690.00, stock: 0},
            {id: 4, title: 'iPhone 15 Pro Max 256GB Titanium', sku: 'IPH15-256-TI', type: 'stock', priceUSD: 1199.00, stock: 5, image: 'https://images.unsplash.com/photo-1596558450268-9c27524ba856?w=300&h=200&fit=crop'},
            {id: 5, title: 'MacBook Pro M3 16inch Black', sku: 'MBP16-M3-BK', type: 'stock', priceUSD: 2899.00, stock: 3},
            {id: 6, title: 'Gaming Setup Bundle RTX 4090', sku: 'GAME-SET-RTX90', type: 'set', priceUSD: 2499.00, stock: 2, image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&h=200&fit=crop'},
            {id: 7, title: 'Sony WH-1000XM5 Wireless Headphones', sku: 'SONY-WH1000XM5', type: 'hybrid', priceUSD: 399.99, stock: 8},
            {id: 8, title: 'Tesla Model S Plaid Red', sku: 'TES-MS-PLD-RED', type: 'hybrid', priceUSD: 89990.00, stock: 1},
            {id: 9, title: 'Photography Studio Kit Professional', sku: 'PHOTO-STUDIO-PRO', type: 'set', priceUSD: 4999.00, stock: 1},
            {id: 10, title: 'Smart Home Kit Google Nest', sku: 'SMART-START-GOOG', type: 'set', priceUSD: 799.99, stock: 5}
        ];
        
        allInventoryData = demoProducts;
        filteredData = [...allInventoryData]; // 🔧 修正: 必ずfilteredDataに同期
        
        console.log(`✅ デモデータ読み込み完了: ${demoProducts.length}件`);
        
        // 🔧 修正: 統一描画関数を呼び出し
        renderInventoryData(); // ★重要：データ読み込み後に両ビューで表示
        
        showSuccessMessage('デモデータが正常に読み込まれました！');
    }

    // === 統計更新 ===
    function updateStatistics() {
        const totalProducts = allInventoryData.length;
        const stockProducts = allInventoryData.filter(item => item.type === 'stock').length;
        const dropshipProducts = allInventoryData.filter(item => item.type === 'dropship').length;
        const setProducts = allInventoryData.filter(item => item.type === 'set').length;
        const hybridProducts = allInventoryData.filter(item => item.type === 'hybrid').length;
        
        const totalValue = allInventoryData.reduce((sum, item) => 
            sum + (item.priceUSD * item.stock), 0);
        
        updateStatElement('total-products', totalProducts);
        updateStatElement('stock-products', stockProducts);
        updateStatElement('dropship-products', dropshipProducts);
        updateStatElement('set-products', setProducts);
        updateStatElement('hybrid-products', hybridProducts);
        updateStatElement('total-value', `$${(totalValue / 1000).toFixed(1)}K`);
    }

    function updateStatElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    // === その他の機能 ===
    function showItemDetails(itemId) {
        const item = allInventoryData.find(i => i.id === itemId);
        if (!item) return;
        
        alert(`商品詳細:\n\n商品名: ${item.title}\nSKU: ${item.sku}\n種類: ${getTypeBadgeText(item.type)}\n価格: $${item.priceUSD.toFixed(2)}\n在庫: ${item.stock}`);
    }

    function showDemoMessage() {
        alert('デモ版では、この機能は実装されていません。\n実際のシステムでは、対応する機能が動作します。');
    }

    function showSuccessMessage(message) {
        showToast(message, 'success');
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6'
        };
        
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 15px 20px;
            background: ${colors[type]}; color: white; border-radius: 8px;
            z-index: 10000; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease-out;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // === ユーティリティ関数 ===
    function getTypeBadgeText(type) {
        const badges = {
            stock: '有在庫',
            dropship: '無在庫', 
            set: 'セット品',
            hybrid: 'ハイブリッド'
        };
        return badges[type] || '不明';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // === スタイル追加 ===
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .btn--small {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
        }
    `;
    document.head.appendChild(style);
    </script>
</body>
</html>