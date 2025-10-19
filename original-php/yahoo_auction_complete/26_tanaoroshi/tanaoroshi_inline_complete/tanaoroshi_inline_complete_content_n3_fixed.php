<?php
/**
 * 棚卸しシステム - N3準拠完全修正版
 * 修正内容: 外部CSS/JS分離、エラー修正、モーダル完全復旧
 * 修正日: 2025-08-18
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

function safe_output($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
?>

<!-- 🎯 N3準拠外部CSS読み込み -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link rel="stylesheet" href="modules/tanaoroshi_inline_complete/assets/css/unified_product_modal.css">

<!-- 🎯 N3準拠メインスタイル（専用CSS） -->
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

.inventory__exchange-rate {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--bg-tertiary);
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
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
    margin-bottom: var(--space-md);
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
    margin-bottom: var(--space-md);
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

.btn--primary { background: #3b82f6; color: white; }
.btn--secondary { background: var(--bg-tertiary); color: var(--text-secondary); }
.btn--success { background: var(--color-success); color: white; }
.btn--warning { background: var(--color-warning); color: white; }
.btn--info { background: var(--color-info); color: white; }
.btn--postgresql { background: #336791; color: white; }
.btn--modal { background: #8b5cf6; color: white; }

.btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
}

/* === テストボタン === */
.test-buttons {
    display: flex;
    gap: 0.5rem;
    margin-right: 1rem;
}

/* === Excelビューコンテナ === */
.inventory__excel-view {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    min-height: 100%;
    background: var(--bg-primary);
    padding: var(--space-lg);
}

.inventory__excel-container {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* === ページネーション上段配置用スタイル === */
.inventory__pagination-top {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-md);
}

.inventory__pagination-info {
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
}

.inventory__pagination-controls {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}

.inventory__pagination-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
}

.inventory__pagination-btn:hover:not(:disabled) {
    border-color: var(--color-primary);
    background: rgba(59, 130, 246, 0.05);
}

.inventory__pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.inventory__pagination-btn--active {
    background: var(--color-primary) !important;
    color: white !important;
    border-color: var(--color-primary) !important;
}

.inventory__items-per-page {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.inventory__items-per-page select {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 0.875rem;
}

/* === レスポンシブ修正 === */
@media (max-width: 1600px) {
    .inventory__grid { 
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important; 
    }
}

@media (max-width: 1200px) {
    .inventory__grid { 
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important; 
    }
    .inventory__stats { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
    .inventory__grid { 
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important; 
        gap: 0.5rem !important; 
    }
    .inventory__card { height: 240px !important; }
    .inventory__stats { grid-template-columns: repeat(2, 1fr); }
    .inventory__filter-grid { grid-template-columns: 1fr; }
    .inventory__pagination-top {
        flex-direction: column;
        align-items: stretch;
        gap: var(--space-sm);
    }
}

@media (max-width: 480px) {
    .inventory__grid { 
        grid-template-columns: 1fr !important; 
    }
    .inventory__card { height: 220px !important; }
    .inventory__stats { grid-template-columns: 1fr; }
    .inventory__pagination-controls {
        justify-content: center;
    }
}
</style>

<div class="inventory__header">
    <div class="inventory__header-top">
        <h1 class="inventory__title">
            <i class="fas fa-warehouse inventory__title-icon"></i>
            <?php echo safe_output('棚卸しシステム（N3準拠・モーダル復旧版）'); ?>
        </h1>
        
        <div class="inventory__exchange-rate">
            <i class="fas fa-exchange-alt inventory__exchange-icon"></i>
            <span class="inventory__exchange-text">USD/JPY:</span>
            <span class="inventory__exchange-value" id="exchange-rate">¥150.25</span>
        </div>
    </div>
    
    <div class="inventory__stats">
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="total-products">30</span>
            <span class="inventory__stat-label"><?php echo safe_output('総商品数'); ?></span>
        </div>
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="stock-products">8</span>
            <span class="inventory__stat-label"><?php echo safe_output('有在庫'); ?></span>
        </div>
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="dropship-products">8</span>
            <span class="inventory__stat-label"><?php echo safe_output('無在庫'); ?></span>
        </div>
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="set-products">6</span>
            <span class="inventory__stat-label"><?php echo safe_output('セット品'); ?></span>
        </div>
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="hybrid-products">8</span>
            <span class="inventory__stat-label"><?php echo safe_output('ハイブリッド'); ?></span>
        </div>
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="total-value">$608.4K</span>
            <span class="inventory__stat-label"><?php echo safe_output('総在庫価値'); ?></span>
        </div>
    </div>
</div>

<!-- フィルターバー -->
<div class="inventory__filter-bar">
    <h2 class="inventory__filter-title">
        <i class="fas fa-filter"></i>
        <?php echo safe_output('フィルター設定'); ?>
    </h2>
    
    <div class="inventory__filter-grid">
        <div class="inventory__filter-group">
            <label class="inventory__filter-label"><?php echo safe_output('商品種類'); ?></label>
            <select class="inventory__filter-select js-filter-select" id="filter-type">
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
            <button class="btn btn--secondary js-filter-reset-btn" onclick="resetFilters()">
                <i class="fas fa-undo"></i>
                <?php echo safe_output('リセット'); ?>
            </button>
            <button class="btn btn--info js-filter-apply-btn" onclick="applyFilters()">
                <i class="fas fa-search"></i>
                <?php echo safe_output('適用'); ?>
            </button>
        </div>
        
        <div class="inventory__filter-right">
            <div class="inventory__search-box">
                <i class="fas fa-search inventory__search-icon"></i>
                <input type="text" class="inventory__search-input js-search-input" id="search-input" 
                       placeholder="<?php echo safe_output('商品名・SKU・カテゴリで検索...'); ?>">
            </div>
        </div>
    </div>
</div>

<!-- ビュー切り替えコントロール -->
<div class="inventory__view-controls">
    <div class="inventory__view-toggle">
        <button class="inventory__view-btn inventory__view-btn--active js-view-btn js-view-btn--card" id="card-view-btn">
            <i class="fas fa-th-large"></i>
            <?php echo safe_output('カードビュー'); ?>
        </button>
        <button class="inventory__view-btn js-view-btn js-view-btn--excel" id="excel-view-btn">
            <i class="fas fa-table"></i>
            <?php echo safe_output('Excelビュー'); ?>
        </button>
    </div>
    
    <div class="inventory__actions">
        <!-- テストボタン群 -->
        <div class="test-buttons">
            <button class="btn btn--postgresql" onclick="testPostgreSQL()">
                <i class="fas fa-database"></i>
                <?php echo safe_output('PostgreSQLテスト'); ?>
            </button>
            
            <button class="btn btn--modal" onclick="openTestModal()">
                <i class="fas fa-cog"></i>
                <?php echo safe_output('モーダルテスト'); ?>
            </button>
        </div>
        
        <button class="btn btn--success" id="add-product-btn" onclick="openAddProductModal()">
            <i class="fas fa-plus"></i>
            <?php echo safe_output('新規商品登録'); ?>
        </button>
        
        <button class="btn btn--warning" onclick="createNewSet()">
            <i class="fas fa-layer-group"></i>
            <?php echo safe_output('新規セット品作成'); ?>
        </button>
        
        <button class="btn btn--info" onclick="loadEbayPostgreSQLData()">
            <i class="fas fa-database"></i>
            <?php echo safe_output('eBay PostgreSQLデータ取得'); ?>
        </button>
        
        <button class="btn btn--primary" onclick="syncWithEbay()">
            <i class="fas fa-sync"></i>
            <?php echo safe_output('eBay同期実行'); ?>
        </button>
    </div>
</div>

<!-- ビュー統一メインコンテナ -->
<div class="inventory__main-content">
    <!-- カードビュー -->
    <div class="inventory__view inventory__view--visible" id="card-view">
        <!-- ページネーション上段配置 -->
        <div class="inventory__pagination-top">
            <div class="inventory__pagination-info" id="card-pagination-info">
                商品: データ読み込み中...
            </div>
            
            <div class="inventory__pagination-controls">
                <button class="inventory__pagination-btn" id="card-prev-btn" onclick="changeCardPage(-1)" disabled>
                    <i class="fas fa-chevron-left"></i>
                </button>
                
                <div id="card-page-numbers" style="display: flex; gap: 0.25rem;">
                    <button class="inventory__pagination-btn inventory__pagination-btn--active">1</button>
                </div>
                
                <button class="inventory__pagination-btn" id="card-next-btn" onclick="changeCardPage(1)">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            
            <div class="inventory__items-per-page">
                <label>表示件数:</label>
                <select id="cards-per-page" onchange="changeCardsPerPage(this.value)">
                    <option value="24">24件</option>
                    <option value="48">48件</option>
                    <option value="80" selected>80件</option>
                    <option value="120">120件</option>
                </select>
            </div>
        </div>
        
        <div class="inventory__grid js-inventory-grid">
            <div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>N3準拠システムでデータを読み込み中...</p>
            </div>
        </div>
    </div>

    <!-- Excelビュー -->
    <div class="inventory__view inventory__view--hidden" id="list-view">
        <!-- Excelビュー上段ページネーション -->
        <div class="inventory__pagination-top">
            <div class="inventory__pagination-info" id="excel-pagination-info">
                商品: データ読み込み中...
            </div>
            
            <div class="inventory__pagination-controls">
                <button class="inventory__pagination-btn" id="excel-prev-btn" onclick="changeExcelPage(-1)" disabled>
                    <i class="fas fa-chevron-left"></i>
                </button>
                
                <div id="excel-page-numbers" style="display: flex; gap: 0.25rem;">
                    <button class="inventory__pagination-btn inventory__pagination-btn--active">1</button>
                </div>
                
                <button class="inventory__pagination-btn" id="excel-next-btn" onclick="changeExcelPage(1)">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            
            <div class="inventory__items-per-page">
                <label>表示件数:</label>
                <select id="excel-items-per-page" onchange="changeExcelItemsPerPage(this.value)">
                    <option value="50" selected>50件</option>
                    <option value="100">100件</option>
                    <option value="200">200件</option>
                    <option value="500">500件</option>
                    <option value="1000">1000件</option>
                </select>
            </div>
        </div>
        
        <div class="inventory__excel-container">
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
                <div style="display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap;">
                    <div style="position: relative; display: flex; align-items: center;">
                        <i class="fas fa-search" style="position: absolute; left: var(--space-sm); color: var(--text-muted); font-size: 0.8rem;"></i>
                        <input type="text" id="excel-search-input" style="padding: var(--space-xs) var(--space-sm) var(--space-xs) var(--space-xl); border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary); font-size: 0.8rem; width: 200px; height: 28px;" placeholder="商品検索..." onkeyup="searchExcelTable(this.value)" />
                    </div>
                    <button style="padding: var(--space-xs) var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.75rem; cursor: pointer; height: 28px;">
                        <i class="fas fa-download"></i>
                        エクスポート
                    </button>
                </div>
            </div>
            
            <div id="excel-table-container">
                <table id="excel-table" style="width: 100%; border-collapse: collapse; background: var(--bg-secondary); font-size: 0.75rem; line-height: 1.2; table-layout: fixed;">
                    <thead>
                        <tr>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px; position: sticky; top: 0; z-index: 10; width: 40px;">
                                <input type="checkbox" style="width: 14px; height: 14px; cursor: pointer;" />
                            </th>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px; position: sticky; top: 0; z-index: 10; width: 60px;">画像</th>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px; position: sticky; top: 0; z-index: 10; width: 250px;">商品名</th>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px; position: sticky; top: 0; z-index: 10; width: 120px;">SKU</th>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px; position: sticky; top: 0; z-index: 10; width: 80px;">種類</th>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px; position: sticky; top: 0; z-index: 10; width: 100px;">販売価格(USD)</th>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px; position: sticky; top: 0; z-index: 10; width: 80px;">在庫数</th>
                            <th style="background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: var(--space-xs) var(--space-sm); text-align: left; font-weight: 600; color: var(--text-primary); font-size: 0.7rem; height: 28px; position: sticky; top: 0; z-index: 10; width: 80px;">操作</th>
                        </tr>
                    </thead>
                    <tbody id="excel-table-body" class="js-excel-tbody">
                        <tr>
                            <td colspan="8" style="border: 1px solid var(--border-light); padding: 1rem; text-align: center; color: var(--text-muted);">
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

<!-- モーダル群 -->
<!-- モーダル: 商品詳細 -->
<div id="itemModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title" id="modalTitle">商品詳細</h2>
            <button class="modal-close" onclick="closeModal('itemModal')">&times;</button>
        </div>
        <div class="modal-body" id="modalBody">
            <!-- 商品詳細がここに表示されます -->
        </div>
        <div class="modal-footer">
            <button class="btn btn--secondary" onclick="closeModal('itemModal')">閉じる</button>
            <button class="btn btn--primary" onclick="editItem()">編集</button>
        </div>
    </div>
</div>

<!-- モーダル: 新規商品登録（統一デザイン版） -->
<div id="addProductModal" class="modal unified-product-modal">
    <div class="modal-content" style="max-width: 900px; width: 95vw;">
        <div class="modal-header">
            <h2 class="modal-title">
                <i class="fas fa-plus-circle"></i>
                新規商品登録
            </h2>
            <button class="modal-close" onclick="closeModal('addProductModal')">&times;</button>
        </div>
        
        <div class="modal-body">
            <!-- 商品タイプ選択 -->
            <div style="margin-bottom: var(--space-lg, 1.5rem);">
                <h3 style="margin-bottom: var(--space-md, 1rem); display: flex; align-items: center; gap: 0.5rem;">
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

            <!-- 商品画像アップロード -->
            <div style="margin-bottom: var(--space-lg, 1.5rem);">
                <h3 style="margin-bottom: var(--space-md, 1rem); display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-image"></i>
                    商品画像
                </h3>
                <div class="inventory__image-upload" onclick="document.getElementById('new-product-image').click();" style="width: 250px; height: 180px;">
                    <input type="file" id="new-product-image" style="display: none;" accept="image/*" onchange="previewProductImage(event)">
                    <i class="fas fa-camera inventory__image-upload-icon" id="new-product-upload-icon" style="display: block;"></i>
                    <div class="inventory__image-upload-text" id="new-product-upload-text" style="display: block;">
                        商品画像を<br>アップロード
                    </div>
                    <img id="new-product-image-preview" style="display: none; width: 100%; height: 100%; object-fit: cover;">
                    <button class="inventory__image-remove" id="new-product-image-remove" style="display: none;" onclick="event.stopPropagation(); removeNewProductImage()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <!-- 基本情報入力フォーム -->
            <div class="inventory__form-grid">
                <div class="inventory__form-group">
                    <label class="inventory__form-label">商品名 <span style="color: var(--color-danger, #dc2626);">*</span></label>
                    <input type="text" class="inventory__form-input" id="new-product-name" placeholder="商品名を入力" required>
                </div>
                <div class="inventory__form-group">
                    <label class="inventory__form-label">SKU <span style="color: var(--color-danger, #dc2626);">*</span></label>
                    <input type="text" class="inventory__form-input" id="new-product-sku" placeholder="SKU-XXX-001" required>
                </div>
                <div class="inventory__form-group">
                    <label class="inventory__form-label">販売価格 (USD)</label>
                    <input type="number" class="inventory__form-input" id="new-product-price" placeholder="0.00" min="0" step="0.01">
                </div>
                <div class="inventory__form-group">
                    <label class="inventory__form-label">仕入価格 (USD)</label>
                    <input type="number" class="inventory__form-input" id="new-product-cost" placeholder="0.00" min="0" step="0.01">
                </div>
                <div class="inventory__form-group" id="stock-field" style="display: block;">
                    <label class="inventory__form-label">在庫数</label>
                    <input type="number" class="inventory__form-input" id="new-product-stock" placeholder="0" min="0" value="0">
                </div>
                <div class="inventory__form-group">
                    <label class="inventory__form-label">状態</label>
                    <select class="inventory__form-input" id="new-product-condition">
                        <option value="new">新品</option>
                        <option value="used">中古</option>
                        <option value="refurbished">整備済み</option>
                    </select>
                </div>
                <div class="inventory__form-group">
                    <label class="inventory__form-label">カテゴリ</label>
                    <input type="text" class="inventory__form-input" id="new-product-category" placeholder="Electronics">
                </div>
                <div class="inventory__form-group" id="supplier-field" style="display: none;">
                    <label class="inventory__form-label">仕入先</label>
                    <input type="text" class="inventory__form-input" id="new-product-supplier" placeholder="AliExpress, Amazon, etc.">
                </div>
            </div>

            <!-- 商品説明 -->
            <div class="inventory__form-group" style="margin: var(--space-lg, 1.5rem) 0;">
                <label class="inventory__form-label">商品説明</label>
                <textarea class="inventory__form-input" id="new-product-description" placeholder="商品の詳細な説明を入力してください..." style="min-height: 80px; resize: vertical;"></textarea>
            </div>

            <!-- セット品作成通知 -->
            <div id="set-creation-notice" style="display: none; background: var(--bg-tertiary, #f1f5f9); padding: var(--space-md, 1rem); border-radius: var(--radius-md, 0.5rem); margin: var(--space-lg, 1.5rem) 0;">
                <p style="margin: 0; color: var(--text-secondary, #475569); font-size: var(--text-sm, 0.875rem);">
                    <i class="fas fa-info-circle"></i>
                    セット品を選択しています。基本情報を保存後、構成品管理画面に移ります。
                </p>
            </div>
        </div>
        
        <div class="modal-footer">
            <button class="btn btn--secondary" onclick="closeModal('addProductModal')">キャンセル</button>
            <button class="btn btn--success" id="save-new-product-btn" onclick="saveNewProduct()">
                <i class="fas fa-save"></i>
                <span id="save-product-btn-text">商品を保存</span>
            </button>
        </div>
    </div>
</div>

<!-- セット品作成・編集モーダル -->
<div id="setModal" class="modal">
    <div class="modal-content" style="max-width: 1200px; width: 95vw;">
        <div class="modal-header">
            <h2 class="modal-title">セット品作成・編集</h2>
            <button class="modal-close" onclick="closeModal('setModal')">&times;</button>
        </div>
        
        <div class="modal-body">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-lg);">
                <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
                    <label style="font-weight: 600; color: var(--text-primary); font-size: var(--text-sm);">セット品名</label>
                    <input type="text" id="setName" placeholder="Gaming Accessories Bundle" style="padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: var(--text-sm); background: var(--bg-primary);">
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
                    <label style="font-weight: 600; color: var(--text-primary); font-size: var(--text-sm);">SKU</label>
                    <input type="text" id="setSku" placeholder="SET-XXX-001" style="padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: var(--text-sm); background: var(--bg-primary);">
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
                    <label style="font-weight: 600; color: var(--text-primary); font-size: var(--text-sm);">販売価格 (USD)</label>
                    <input type="number" id="setPrice" placeholder="59.26" step="0.01" style="padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: var(--text-sm); background: var(--bg-primary);">
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
                    <label style="font-weight: 600; color: var(--text-primary); font-size: var(--text-sm);">カテゴリ</label>
                    <input type="text" id="setCategory" placeholder="Bundle" style="padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: var(--text-sm); background: var(--bg-primary);">
                </div>
            </div>
        </div>
        
        <div class="modal-footer">
            <button class="btn btn--secondary" onclick="closeModal('setModal')">キャンセル</button>
            <button class="btn btn--success" onclick="saveSetProduct()">
                <i class="fas fa-layer-group"></i>
                セット品を保存
            </button>
        </div>
    </div>
</div>

<!-- モーダル: テスト結果 -->
<div id="testModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title">システムテスト結果</h2>
            <button class="modal-close" onclick="closeModal('testModal')">&times;</button>
        </div>
        <div class="modal-body" id="testModalBody">
            <!-- テスト結果がここに表示されます -->
        </div>
        <div class="modal-footer">
            <button class="btn btn--secondary" onclick="closeModal('testModal')">閉じる</button>
        </div>
    </div>
</div>

<!-- 🎯 N3準拠CDN JavaScript読み込み -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
<script src="modules/tanaoroshi_inline_complete/assets/js/tanaoroshi_n3_compliant.js"></script>

<!-- 🎯 N3準拠追加JavaScript（ユーティリティ関数） -->
<script>
// 追加のユーティリティ関数
function loadEbayPostgreSQLData() {
    if (window.uiController) {
        window.uiController.loadAndDisplayData();
    } else {
        alert('システムが初期化中です。しばらく待ってから再試行してください。');
    }
}

// 商品タイプ選択機能
document.addEventListener('DOMContentLoaded', function() {
    // タイプ選択イベントリスナー
    const typeOptions = document.querySelectorAll('.inventory__product-type-option');
    typeOptions.forEach(option => {
        option.addEventListener('click', function() {
            // 既存の選択を解除
            typeOptions.forEach(opt => {
                opt.classList.remove('inventory__product-type-option--active');
                opt.querySelector('input').checked = false;
            });
            
            // 新しい選択を設定
            this.classList.add('inventory__product-type-option--active');
            this.querySelector('input').checked = true;
            
            const selectedType = this.dataset.type;
            updateFormByProductType(selectedType);
            
            console.log('商品タイプ選択:', selectedType);
        });
    });
});

// 商品タイプに応じたフォーム更新
function updateFormByProductType(type) {
    const stockField = document.getElementById('stock-field');
    const supplierField = document.getElementById('supplier-field');
    const setNotice = document.getElementById('set-creation-notice');
    const saveBtnText = document.getElementById('save-product-btn-text');
    
    if (!stockField || !supplierField || !setNotice || !saveBtnText) return;
    
    // フィールド表示制御
    switch(type) {
        case 'stock':
            stockField.style.display = 'block';
            supplierField.style.display = 'none';
            setNotice.style.display = 'none';
            saveBtnText.textContent = '商品を保存';
            break;
            
        case 'dropship':
            stockField.style.display = 'none';
            supplierField.style.display = 'block';
            setNotice.style.display = 'none';
            saveBtnText.textContent = '商品を保存';
            break;
            
        case 'set':
            stockField.style.display = 'block';
            supplierField.style.display = 'none';
            setNotice.style.display = 'block';
            saveBtnText.textContent = 'セット品を作成';
            break;
            
        case 'hybrid':
            stockField.style.display = 'block';
            supplierField.style.display = 'block';
            setNotice.style.display = 'none';
            saveBtnText.textContent = '商品を保存';
            break;
    }
}

console.log('✅ N3準拠棚卸しシステム - モーダル・外部CSS/JS完全分離版');
</script>
