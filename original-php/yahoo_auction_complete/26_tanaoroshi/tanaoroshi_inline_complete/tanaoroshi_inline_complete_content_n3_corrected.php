<?php
/**
 * 棚卸しシステム - N3準拠完全修正版（共通CSS/JS連携）
 * 修正内容: 共通ファイル連携・正しいN3ルール準拠
 * 修正日: 2025-08-18
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

function safe_output($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
?>

<!-- 🎯 N3準拠共通ファイル読み込み -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link rel="stylesheet" href="common/css/unified_modal_system.css">

<!-- 🎯 N3準拠メインスタイル（ページ専用CSS） -->
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
    --color-ebay: #0064d2;
    --color-primary: #3b82f6;
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
    min-height: auto;
    width: 100%;
}

.inventory__view {
    position: relative;
    top: 0;
    left: 0;
    width: 100%;
    min-height: 100%;
    background: var(--bg-primary);
    opacity: 1;
    visibility: visible;
    transition: opacity 0.3s ease, visibility 0.3s ease;
    z-index: 1;
}

.inventory__view--hidden {
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    z-index: 1 !important;
    position: absolute !important;
    top: 0;
    left: -9999px;
}

.inventory__view--visible {
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
    z-index: 10 !important;
    position: relative !important;
    top: auto;
    left: auto;
}

/* === CSS Grid完全対応版 === */
.inventory__grid {
    display: grid !important;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
    gap: 1rem !important;
    padding: var(--space-lg) !important;
    background: var(--bg-primary) !important;
    min-height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    grid-auto-rows: max-content !important;
    justify-content: center !important;
}

/* === カードデザイン === */
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

/* === その他のスタイル（簡潔版） === */
.inventory__header {
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    padding: var(--space-lg);
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

.inventory__filter-bar {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    margin-bottom: var(--space-md);
}

.inventory__view-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
}

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

.btn--success { background: var(--color-success); color: white; }
.btn--warning { background: var(--color-warning); color: white; }
.btn--info { background: var(--color-info); color: white; }
.btn--primary { background: var(--color-primary); color: white; }
.btn--secondary { background: var(--bg-tertiary); color: var(--text-secondary); }

.btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
}

/* === 商品タイプ選択（共通CSS利用） === */
.inventory__product-type-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
}

.inventory__product-type-option {
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
}

.inventory__product-type-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg) var(--space-md);
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    text-align: center;
    transition: all 0.2s ease;
    min-height: 100px;
}

.inventory__product-type-card i {
    font-size: 1.5rem;
    margin-bottom: var(--space-sm);
    color: var(--text-muted);
    transition: color 0.2s ease;
}

.inventory__product-type-card span {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
}

.inventory__product-type-option:hover .inventory__product-type-card {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.inventory__product-type-option--active .inventory__product-type-card {
    border-color: var(--color-primary);
    background: rgba(59, 130, 246, 0.05);
}

/* === レスポンシブ === */
@media (max-width: 768px) {
    .inventory__grid { 
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important; 
        gap: 0.5rem !important; 
    }
    .inventory__card { height: 240px !important; }
}
</style>

<div class="inventory__header">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
        <h1 class="inventory__title">
            <i class="fas fa-warehouse" style="color: var(--color-info);"></i>
            <?php echo safe_output('棚卸しシステム（N3準拠・共通ファイル連携版）'); ?>
        </h1>
        
        <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-tertiary); padding: 0.5rem 1rem; border-radius: var(--radius-md);">
            <i class="fas fa-exchange-alt"></i>
            <span>USD/JPY:</span>
            <span id="exchange-rate">¥150.25</span>
        </div>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--space-md);">
        <div style="text-align: center; background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md);">
            <span style="display: block; font-size: 1.5rem; font-weight: 700; color: var(--text-primary);" id="total-products">30</span>
            <span style="font-size: 0.875rem; color: var(--text-muted);"><?php echo safe_output('総商品数'); ?></span>
        </div>
        <div style="text-align: center; background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md);">
            <span style="display: block; font-size: 1.5rem; font-weight: 700; color: var(--text-primary);" id="stock-products">8</span>
            <span style="font-size: 0.875rem; color: var(--text-muted);"><?php echo safe_output('有在庫'); ?></span>
        </div>
        <div style="text-align: center; background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md);">
            <span style="display: block; font-size: 1.5rem; font-weight: 700; color: var(--text-primary);" id="dropship-products">8</span>
            <span style="font-size: 0.875rem; color: var(--text-muted);"><?php echo safe_output('無在庫'); ?></span>
        </div>
        <div style="text-align: center; background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md);">
            <span style="display: block; font-size: 1.5rem; font-weight: 700; color: var(--text-primary);" id="set-products">6</span>
            <span style="font-size: 0.875rem; color: var(--text-muted);"><?php echo safe_output('セット品'); ?></span>
        </div>
        <div style="text-align: center; background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md);">
            <span style="display: block; font-size: 1.5rem; font-weight: 700; color: var(--text-primary);" id="hybrid-products">8</span>
            <span style="font-size: 0.875rem; color: var(--text-muted);"><?php echo safe_output('ハイブリッド'); ?></span>
        </div>
        <div style="text-align: center; background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md);">
            <span style="display: block; font-size: 1.5rem; font-weight: 700; color: var(--text-primary);" id="total-value">$608.4K</span>
            <span style="font-size: 0.875rem; color: var(--text-muted);"><?php echo safe_output('総在庫価値'); ?></span>
        </div>
    </div>
</div>

<!-- フィルターバー -->
<div class="inventory__filter-bar">
    <h2 style="margin: 0 0 var(--space-md) 0; font-size: 1.25rem; color: var(--text-primary); display: flex; align-items: center; gap: var(--space-sm);">
        <i class="fas fa-filter"></i>
        <?php echo safe_output('フィルター設定'); ?>
    </h2>
    
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-md); margin-bottom: var(--space-md);">
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <label style="font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);"><?php echo safe_output('商品種類'); ?></label>
            <select style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-primary);" id="filter-type">
                <option value=""><?php echo safe_output('すべて'); ?></option>
                <option value="stock"><?php echo safe_output('有在庫'); ?></option>
                <option value="dropship"><?php echo safe_output('無在庫'); ?></option>
                <option value="set"><?php echo safe_output('セット品'); ?></option>
                <option value="hybrid"><?php echo safe_output('ハイブリッド'); ?></option>
            </select>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <label style="font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);"><?php echo safe_output('出品モール'); ?></label>
            <select style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-primary);" id="filter-channel">
                <option value=""><?php echo safe_output('すべて'); ?></option>
                <option value="ebay">eBay</option>
                <option value="amazon">Amazon</option>
                <option value="mercari">メルカリ</option>
            </select>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <label style="font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);"><?php echo safe_output('在庫状況'); ?></label>
            <select style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-primary);" id="filter-stock-status">
                <option value=""><?php echo safe_output('すべて'); ?></option>
                <option value="in-stock"><?php echo safe_output('在庫あり'); ?></option>
                <option value="low-stock"><?php echo safe_output('在庫僅少'); ?></option>
                <option value="out-of-stock"><?php echo safe_output('在庫切れ'); ?></option>
            </select>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <label style="font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);"><?php echo safe_output('価格範囲 (USD)'); ?></label>
            <select style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-primary);" id="filter-price-range">
                <option value=""><?php echo safe_output('すべて'); ?></option>
                <option value="0-100">$0 - $100</option>
                <option value="100-500">$100 - $500</option>
                <option value="500-1000">$500 - $1,000</option>
                <option value="1000+">$1,000以上</option>
            </select>
        </div>
    </div>
    
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: var(--space-sm);">
            <button class="btn btn--secondary" id="js-reset-filters-btn">
            <i class="fas fa-undo"></i>
            <?php echo safe_output('リセット'); ?>
            </button>
            <button class="btn btn--info" id="js-apply-filters-btn">
            <i class="fas fa-search"></i>
            <?php echo safe_output('適用'); ?>
            </button>
        </div>
        
        <div style="position: relative; display: flex; align-items: center;">
            <i class="fas fa-search" style="position: absolute; left: 0.75rem; color: var(--text-muted);"></i>
            <input type="text" style="padding: 0.5rem 1rem 0.5rem 2.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary); min-width: 300px;" id="search-input" placeholder="<?php echo safe_output('商品名・SKU・カテゴリで検索...'); ?>">
        </div>
    </div>
</div>

<!-- ビュー切り替えコントロール -->
<div class="inventory__view-controls">
    <div style="display: flex; background: var(--bg-tertiary); border-radius: var(--radius-md); padding: 0.25rem;">
        <button style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border: none; background: var(--bg-secondary); border-radius: var(--radius-sm); color: var(--text-primary); cursor: pointer; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);" id="card-view-btn">
            <i class="fas fa-th-large"></i>
            <?php echo safe_output('カードビュー'); ?>
        </button>
        <button style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border: none; background: transparent; border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer;" id="excel-view-btn">
            <i class="fas fa-table"></i>
            <?php echo safe_output('Excelビュー'); ?>
        </button>
    </div>
    
    <div style="display: flex; gap: var(--space-sm);">
        <button class="btn btn--success" id="js-add-product-btn">
            <i class="fas fa-plus"></i>
            <?php echo safe_output('新規商品登録'); ?>
        </button>
        
        <button class="btn btn--warning" id="js-create-set-btn">
            <i class="fas fa-layer-group"></i>
            <?php echo safe_output('新規セット品作成'); ?>
        </button>
        
        <button class="btn btn--info" id="js-load-data-btn">
            <i class="fas fa-database"></i>
            <?php echo safe_output('eBay PostgreSQLデータ取得'); ?>
        </button>
        
        <button class="btn btn--primary" id="js-sync-btn">
            <i class="fas fa-sync"></i>
            <?php echo safe_output('eBay同期実行'); ?>
        </button>
    </div>
</div>

<!-- ビュー統一メインコンテナ -->
<div class="inventory__main-content">
    <!-- カードビュー -->
    <div class="inventory__view inventory__view--visible" id="card-view">        
        <div class="inventory__grid js-inventory-grid">
            <div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>N3準拠システムでデータを読み込み中...</p>
            </div>
        </div>
    </div>

    <!-- Excelビュー -->
    <div class="inventory__view inventory__view--hidden" id="list-view">
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <div style="background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); padding: var(--space-sm) var(--space-md); display: flex; justify-content: space-between; align-items: center; gap: var(--space-md); min-height: 40px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap;">
                    <button style="padding: var(--space-xs) var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--color-success); color: white; font-size: 0.75rem; font-weight: 500; cursor: pointer; height: 28px; display: inline-flex; align-items: center; gap: var(--space-xs);" onclick="openAddProductModal()">
                        <i class="fas fa-plus"></i>
                        新規登録
                    </button>
                    <button style="padding: var(--space-xs) var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.75rem; cursor: pointer; height: 28px;">
                        <i class="fas fa-trash"></i>
                        選択削除
                    </button>
                    <button style="padding: var(--space-xs) var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--color-warning); color: white; font-size: 0.75rem; cursor: pointer; height: 28px;" onclick="createNewSet()">
                        <i class="fas fa-layer-group"></i>
                        セット品作成
                    </button>
                </div>
            </div>
            
            <div id="excel-table-container">
                <table id="excel-table" style="width: 100%; border-collapse: collapse; background: var(--bg-secondary); font-size: 0.75rem; line-height: 1.2;">
                    <thead>
                        <tr>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px;">
                                <input type="checkbox" style="width: 14px; height: 14px; cursor: pointer;" />
                            </th>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px;">画像</th>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px;">商品名</th>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px;">SKU</th>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px;">種類</th>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px;">販売価格(USD)</th>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px;">在庫数</th>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px;">操作</th>
                        </tr>
                    </thead>
                    <tbody id="excel-table-body">
                        <tr>
                            <td colspan="8" style="border: 1px solid var(--border-color); padding: 1rem; text-align: center; color: var(--text-muted);">
                                <i class="fas fa-spinner fa-spin" style="margin-right: 0.5rem;"></i>
                                N3準拠システムでデータを読み込み中...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- モーダル群（共通CSS使用） -->
<!-- 商品詳細モーダル -->
<div id="itemModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title" id="modalTitle">商品詳細</h2>
            <button class="modal-close" id="js-close-item-modal">&times;</button>
        </div>
        <div class="modal-body" id="modalBody">
            <!-- 商品詳細がここに表示されます -->
        </div>
        <div class="modal-footer">
            <button class="btn btn--secondary" id="js-close-item-btn">閉じる</button>
            <button class="btn btn--primary" id="js-edit-item-btn">編集</button>
        </div>
    </div>
</div>

<!-- 新規商品登録モーダル（共通CSS使用） -->
<div id="addProductModal" class="modal">
    <div class="modal-content" style="max-width: 900px; width: 95vw;">
        <div class="modal-header">
            <h2 class="modal-title">
                <i class="fas fa-plus-circle"></i>
                新規商品登録
            </h2>
            <button class="modal-close" id="js-close-add-modal">&times;</button>
        </div>
        
        <div class="modal-body">
            <!-- 商品タイプ選択 -->
            <div style="margin-bottom: var(--space-lg);">
                <h3 style="margin-bottom: var(--space-md); display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-tag"></i>
                    商品タイプ
                </h3>
                <div class="inventory__product-type-grid">
                    <label class="inventory__product-type-option inventory__product-type-option--active" data-type="stock">
                        <input type="radio" name="product-type" value="stock" checked style="display: none;">
                        <div class="inventory__product-type-card">
                            <i class="fas fa-warehouse"></i>
                            <span>有在庫</span>
                        </div>
                    </label>
                    <label class="inventory__product-type-option" data-type="dropship">
                        <input type="radio" name="product-type" value="dropship" style="display: none;">
                        <div class="inventory__product-type-card">
                            <i class="fas fa-truck"></i>
                            <span>無在庫</span>
                        </div>
                    </label>
                    <label class="inventory__product-type-option" data-type="set">
                        <input type="radio" name="product-type" value="set" style="display: none;">
                        <div class="inventory__product-type-card">
                            <i class="fas fa-layer-group"></i>
                            <span>セット品</span>
                        </div>
                    </label>
                    <label class="inventory__product-type-option" data-type="hybrid">
                        <input type="radio" name="product-type" value="hybrid" style="display: none;">
                        <div class="inventory__product-type-card">
                            <i class="fas fa-sync-alt"></i>
                            <span>ハイブリッド</span>
                        </div>
                    </label>
                </div>
            </div>

            <!-- 基本情報入力フォーム -->
            <div class="unified-form-grid">
                <div class="unified-form-group">
                    <label class="unified-form-label unified-form-label--required">商品名</label>
                    <input type="text" class="unified-form-input" id="new-product-name" placeholder="商品名を入力" required>
                </div>
                <div class="unified-form-group">
                    <label class="unified-form-label unified-form-label--required">SKU</label>
                    <input type="text" class="unified-form-input" id="new-product-sku" placeholder="SKU-XXX-001" required>
                </div>
                <div class="unified-form-group">
                    <label class="unified-form-label">販売価格 (USD)</label>
                    <input type="number" class="unified-form-input" id="new-product-price" placeholder="0.00" min="0" step="0.01">
                </div>
                <div class="unified-form-group">
                    <label class="unified-form-label">仕入価格 (USD)</label>
                    <input type="number" class="unified-form-input" id="new-product-cost" placeholder="0.00" min="0" step="0.01">
                </div>
                <div class="unified-form-group" id="stock-field">
                    <label class="unified-form-label">在庫数</label>
                    <input type="number" class="unified-form-input" id="new-product-stock" placeholder="0" min="0" value="0">
                </div>
                <div class="unified-form-group">
                    <label class="unified-form-label">状態</label>
                    <select class="unified-form-input" id="new-product-condition">
                        <option value="new">新品</option>
                        <option value="used">中古</option>
                        <option value="refurbished">整備済み</option>
                    </select>
                </div>
            </div>

            <!-- 商品説明 -->
            <div class="unified-form-group" style="margin: var(--space-lg) 0;">
                <label class="unified-form-label">商品説明</label>
                <textarea class="unified-form-input" id="new-product-description" placeholder="商品の詳細な説明を入力してください..." style="min-height: 80px; resize: vertical;"></textarea>
            </div>
        </div>
        
        <div class="modal-footer">
            <button class="btn btn--secondary" id="js-cancel-add-btn">キャンセル</button>
            <button class="btn btn--success" id="js-save-product-btn">
                <i class="fas fa-save"></i>
                商品を保存
            </button>
        </div>
    </div>
</div>

<!-- セット品作成モーダル -->
<div id="setModal" class="modal">
    <div class="modal-content" style="max-width: 1200px; width: 95vw;">
        <div class="modal-header">
            <h2 class="modal-title">セット品作成・編集</h2>
            <button class="modal-close" id="js-close-set-modal">&times;</button>
        </div>
        
        <div class="modal-body">
            <div class="unified-form-grid">
                <div class="unified-form-group">
                    <label class="unified-form-label">セット品名</label>
                    <input type="text" class="unified-form-input" id="setName" placeholder="Gaming Accessories Bundle">
                </div>
                <div class="unified-form-group">
                    <label class="unified-form-label">SKU</label>
                    <input type="text" class="unified-form-input" id="setSku" placeholder="SET-XXX-001">
                </div>
                <div class="unified-form-group">
                    <label class="unified-form-label">販売価格 (USD)</label>
                    <input type="number" class="unified-form-input" id="setPrice" placeholder="59.26" step="0.01">
                </div>
                <div class="unified-form-group">
                    <label class="unified-form-label">カテゴリ</label>
                    <input type="text" class="unified-form-input" id="setCategory" placeholder="Bundle">
                </div>
            </div>
        </div>
        
        <div class="modal-footer">
            <button class="btn btn--secondary" id="js-cancel-set-btn">キャンセル</button>
            <button class="btn btn--success" id="js-save-set-btn">
                <i class="fas fa-layer-group"></i>
                セット品を保存
            </button>
        </div>
    </div>
</div>

<!-- テスト結果モーダル -->
<div id="testModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title">システムテスト結果</h2>
            <button class="modal-close" id="js-close-test-modal">&times;</button>
        </div>
        <div class="modal-body" id="testModalBody">
            <!-- テスト結果がここに表示されます -->
        </div>
        <div class="modal-footer">
            <button class="btn btn--secondary" id="js-close-test-btn">閉じる</button>
        </div>
    </div>
</div>

<!-- 🎯 N3準拠共通JavaScript読み込み -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
<script src="common/js/ui/modal_system.js"></script>
<script src="common/js/hooks/modal_integration.js"></script>
<script src="common/js/tanaoroshi_inventory.js"></script>

<!-- 🎯 N3準拠ページ専用JavaScript -->
<script>
// N3準拠棚卸しシステム - メイン制御
class TanaoroshiController {
    constructor() {
        this.currentView = 'card';
        this.inventoryData = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.itemsPerPage = 24;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.log('棚卸しシステム初期化完了');
    }
    
    setupEventListeners() {
        // ビュー切り替え
        document.getElementById('card-view-btn')?.addEventListener('click', () => {
            this.switchView('card');
        });
        
        document.getElementById('excel-view-btn')?.addEventListener('click', () => {
            this.switchView('excel');
        });
        
        // 商品タイプ選択
        document.querySelectorAll('.inventory__product-type-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectProductType(option);
            });
        });
    }
    
    switchView(viewType) {
        const cardView = document.getElementById('card-view');
        const excelView = document.getElementById('list-view');
        const cardBtn = document.getElementById('card-view-btn');
        const excelBtn = document.getElementById('excel-view-btn');
        
        if (viewType === 'card') {
            cardView?.classList.remove('inventory__view--hidden');
            cardView?.classList.add('inventory__view--visible');
            excelView?.classList.remove('inventory__view--visible');
            excelView?.classList.add('inventory__view--hidden');
            
            // ボタンスタイル更新
            cardBtn?.setAttribute('style', 'display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border: none; background: var(--bg-secondary); border-radius: var(--radius-sm); color: var(--text-primary); cursor: pointer; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);');
            excelBtn?.setAttribute('style', 'display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border: none; background: transparent; border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer;');
        } else {
            excelView?.classList.remove('inventory__view--hidden');
            excelView?.classList.add('inventory__view--visible');
            cardView?.classList.remove('inventory__view--visible');
            cardView?.classList.add('inventory__view--hidden');
            
            // ボタンスタイル更新
            excelBtn?.setAttribute('style', 'display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border: none; background: var(--bg-secondary); border-radius: var(--radius-sm); color: var(--text-primary); cursor: pointer; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);');
            cardBtn?.setAttribute('style', 'display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border: none; background: transparent; border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer;');
        }
        
        this.currentView = viewType;
        this.log(`ビュー切り替え: ${viewType}`);
    }
    
    selectProductType(option) {
        // 既存選択解除
        document.querySelectorAll('.inventory__product-type-option').forEach(opt => {
            opt.classList.remove('inventory__product-type-option--active');
            opt.querySelector('input').checked = false;
        });
        
        // 新しい選択設定
        option.classList.add('inventory__product-type-option--active');
        option.querySelector('input').checked = true;
        
        const selectedType = option.dataset.type;
        this.updateFormByProductType(selectedType);
        this.log(`商品タイプ選択: ${selectedType}`);
    }
    
    updateFormByProductType(type) {
        const stockField = document.getElementById('stock-field');
        
        if (stockField) {
            if (type === 'dropship') {
                stockField.style.display = 'none';
            } else {
                stockField.style.display = 'block';
            }
        }
    }
    
    async loadInitialData() {
        try {
            this.log('データ読み込み開始');
            
            // N3Core使用してAjax実行
            if (window.N3) {
                const result = await window.N3.ajax('tanaoroshi_get_inventory', { limit: 30 });
                this.inventoryData = result.data || [];
            } else {
                // フォールバック
                const response = await fetch('modules/tanaoroshi_inline_complete/tanaoroshi_ajax_handler.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'action=get_inventory&limit=30'
                });
                
                const result = await response.json();
                this.inventoryData = result.data || [];
            }
            
            this.filteredData = [...this.inventoryData];
            this.renderData();
            this.updateStats();
            
            this.log(`データ読み込み完了: ${this.inventoryData.length}件`);
            
        } catch (error) {
            this.error('データ読み込みエラー:', error);
            this.showError('データの読み込みに失敗しました');
        }
    }
    
    renderData() {
        if (this.currentView === 'card') {
            this.renderCardView();
        } else {
            this.renderExcelView();
        }
    }
    
    renderCardView() {
        const container = document.querySelector('.js-inventory-grid');
        if (!container) return;
        
        if (this.filteredData.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;">
                    <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>データがありません</p>
                </div>
            `;
            return;
        }
        
        const cards = this.filteredData.map(item => this.createCardHTML(item)).join('');
        container.innerHTML = cards;
    }
    
    createCardHTML(item) {
        const typeClass = `inventory__badge--${item.type}`;
        const typeLabel = {
            stock: '有在庫',
            dropship: '無在庫',
            set: 'セット品',
            hybrid: 'ハイブリッド'
        }[item.type] || item.type;
        
        return `
            <div class="inventory__card" onclick="openItemModal('${item.id}')">
                <div class="inventory__card-image">
                    ${item.image ? 
                        `<img src="${item.image}" alt="${item.title}" class="inventory__card-img">` :
                        `<div class="inventory__card-placeholder">
                            <i class="fas fa-image"></i>
                            <span>画像なし</span>
                        </div>`
                    }
                    <div class="inventory__badge ${typeClass}">${typeLabel}</div>
                </div>
                <div class="inventory__card-info">
                    <h3 class="inventory__card-title">${item.title || item.name}</h3>
                    <div class="inventory__card-price">
                        <div class="inventory__card-price-main">$${item.priceUSD || item.price}</div>
                        <div class="inventory__card-price-sub">¥${Math.round((item.priceUSD || item.price) * 150)}</div>
                    </div>
                </div>
                <div class="inventory__card-footer">
                    <span class="inventory__card-sku">${item.sku}</span>
                    <span class="inventory__card-stock">在庫: ${item.stock || item.quantity || 0}</span>
                </div>
            </div>
        `;
    }
    
    renderExcelView() {
        const tbody = document.getElementById('excel-table-body');
        if (!tbody) return;
        
        if (this.filteredData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="border: 1px solid var(--border-color); padding: 1rem; text-align: center; color: var(--text-muted);">
                        データがありません
                    </td>
                </tr>
            `;
            return;
        }
        
        const rows = this.filteredData.map(item => this.createRowHTML(item)).join('');
        tbody.innerHTML = rows;
    }
    
    createRowHTML(item) {
        const typeLabel = {
            stock: '有在庫',
            dropship: '無在庫',
            set: 'セット品',
            hybrid: 'ハイブリッド'
        }[item.type] || item.type;
        
        return `
            <tr style="border-bottom: 1px solid var(--border-color); cursor: pointer;" onclick="openItemModal('${item.id}')">
                <td style="border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm);">
                    <input type="checkbox" onclick="event.stopPropagation();" style="width: 14px; height: 14px;">
                </td>
                <td style="border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm);">
                    ${item.image ? 
                        `<img src="${item.image}" style="width: 40px; height: 30px; object-fit: cover; border-radius: 4px;">` :
                        `<div style="width: 40px; height: 30px; background: var(--bg-tertiary); border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-image" style="color: var(--text-muted); font-size: 0.7rem;"></i>
                        </div>`
                    }
                </td>
                <td style="border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${item.title || item.name}
                </td>
                <td style="border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); font-family: monospace; font-size: 0.7rem;">
                    ${item.sku}
                </td>
                <td style="border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm);">
                    <span style="padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.6rem; font-weight: 600; background: var(--bg-tertiary); color: var(--text-secondary);">
                        ${typeLabel}
                    </span>
                </td>
                <td style="border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: right; font-weight: 600;">
                    $${item.priceUSD || item.price}
                </td>
                <td style="border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: center;">
                    ${item.stock || item.quantity || 0}
                </td>
                <td style="border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: center;">
                    <button style="padding: 0.125rem 0.25rem; border: 1px solid var(--border-color); border-radius: 0.25rem; background: var(--bg-secondary); color: var(--text-primary); font-size: 0.6rem; cursor: pointer;" onclick="event.stopPropagation(); editItem('${item.id}')">
                        編集
                    </button>
                </td>
            </tr>
        `;
    }
    
    updateStats() {
        const total = this.inventoryData.length;
        const stock = this.inventoryData.filter(item => item.type === 'stock').length;
        const dropship = this.inventoryData.filter(item => item.type === 'dropship').length;
        const set = this.inventoryData.filter(item => item.type === 'set').length;
        const hybrid = this.inventoryData.filter(item => item.type === 'hybrid').length;
        
        const totalValue = this.inventoryData.reduce((sum, item) => {
            const price = parseFloat(item.priceUSD || item.price || 0);
            const quantity = parseInt(item.stock || item.quantity || 0);
            return sum + (price * quantity);
        }, 0);
        
        // DOM更新
        document.getElementById('total-products').textContent = total;
        document.getElementById('stock-products').textContent = stock;
        document.getElementById('dropship-products').textContent = dropship;
        document.getElementById('set-products').textContent = set;
        document.getElementById('hybrid-products').textContent = hybrid;
        document.getElementById('total-value').textContent = `$${(totalValue / 1000).toFixed(1)}K`;
    }
    
    showError(message) {
        if (window.N3Modal) {
            window.N3Modal.alert(message, 'エラー', 'error');
        } else {
            alert(message);
        }
    }
    
    log(message, data = null) {
        if (window.N3?.config?.debug) {
            console.log(`[TANAOROSHI] ${message}`, data || '');
        }
    }
    
    error(message, data = null) {
        console.error(`[TANAOROSHI] ${message}`, data || '');
    }
}

// グローバル関数（既存コードとの互換性）
function openAddProductModal() {
    if (window.N3Modal) {
        window.N3Modal.openModal('addProductModal');
    } else {
        document.getElementById('addProductModal').style.display = 'flex';
    }
}

function closeModal(modalId) {
    if (window.N3Modal) {
        window.N3Modal.closeModal(modalId);
    } else {
        document.getElementById(modalId).style.display = 'none';
    }
}

function createNewSet() {
    if (window.N3Modal) {
        window.N3Modal.openModal('setModal');
    } else {
        document.getElementById('setModal').style.display = 'flex';
    }
}

function openItemModal(itemId) {
    console.log('商品詳細表示:', itemId);
    // TODO: 商品詳細モーダル実装
}

function editItem(itemId) {
    console.log('商品編集:', itemId);
    // TODO: 商品編集機能実装
}

function saveNewProduct() {
    console.log('商品保存処理');
    // TODO: 商品保存処理実装
    closeModal('addProductModal');
}

function saveSetProduct() {
    console.log('セット品保存処理');
    // TODO: セット品保存処理実装
    closeModal('setModal');
}

function loadEbayPostgreSQLData() {
    if (window.tanaoroshiController) {
        window.tanaoroshiController.loadInitialData();
    }
}

function syncWithEbay() {
    console.log('eBay同期処理');
    // TODO: eBay同期処理実装
}

function testPostgreSQL() {
    console.log('PostgreSQLテスト');
    // TODO: PostgreSQLテスト実装
}

function resetFilters() {
    console.log('フィルターリセット');
    // TODO: フィルターリセット実装
}

function applyFilters() {
    console.log('フィルター適用');
    // TODO: フィルター適用実装
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    window.tanaoroshiController = new TanaoroshiController();
    console.log('✅ N3準拠棚卸しシステム初期化完了（共通ファイル連携版）');
});
</script>
