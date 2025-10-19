<?php
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
    <title><?php echo safe_output('棚卸しシステム - レイアウト修正版'); ?></title>
    
    <!-- 外部リソース -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    
    <!-- 外部CSSファイル読み込み -->
    <link rel="stylesheet" href="modules/tanaoroshi_inline_complete/assets/tanaoroshi_styles.css">
    
    <style>
    /* ===== N3準拠: カードレイアウト最適化 ===== */
    .inventory__grid {
        display: grid !important;
        grid-template-columns: repeat(8, 1fr) !important;
        gap: 0.75rem !important;
        padding: 1rem !important;
        background: var(--bg-primary, #f8fafc) !important;
        min-height: calc(100vh - 400px) !important;
    }
    
    .inventory__card {
        background: var(--bg-secondary, #ffffff) !important;
        border: 1px solid var(--border-color, #e2e8f0) !important;
        border-radius: var(--radius-lg, 0.75rem) !important;
        overflow: hidden !important;
        cursor: pointer !important;
        transition: all 0.2s ease-in-out !important;
        position: relative !important;
        display: flex !important;
        flex-direction: column !important;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
        height: 280px !important;
        width: 100% !important;
    }
    
    .inventory__card-image {
        position: relative !important;
        height: 140px !important;
        background: var(--bg-tertiary, #f1f5f9) !important;
        overflow: hidden !important;
        flex-shrink: 0 !important;
    }
    
    .inventory__card-img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        object-position: center !important;
    }
    
    .inventory__card-placeholder {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 100% !important;
        background: var(--bg-tertiary, #f1f5f9) !important;
        color: var(--text-muted, #64748b) !important;
        flex-direction: column !important;
        gap: 0.5rem !important;
    }
    
    .inventory__card-info {
        padding: 0.75rem !important;
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 0.5rem !important;
        justify-content: space-between !important;
    }
    
    .inventory__card-title {
        font-size: 0.875rem !important;
        font-weight: 600 !important;
        color: var(--text-primary, #1e293b) !important;
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
        color: var(--text-primary, #1e293b) !important;
    }
    
    .inventory__card-price-sub {
        font-size: 0.75rem !important;
        color: var(--text-muted, #64748b) !important;
    }
    
    .inventory__card-footer {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-top: auto !important;
        padding-top: 0.5rem !important;
        border-top: 1px solid var(--border-light, #f1f5f9) !important;
        font-size: 0.75rem !important;
        min-height: 1.5rem !important;
    }
    
    .inventory__card-sku {
        font-size: 0.7rem !important;
        color: var(--text-muted, #64748b) !important;
        font-family: monospace !important;
        background: var(--bg-tertiary, #f1f5f9) !important;
        padding: 0.125rem 0.25rem !important;
        border-radius: 0.25rem !important;
        max-width: 80px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }
    
    .inventory__badge {
        padding: 0.125rem 0.375rem !important;
        border-radius: 0.25rem !important;
        font-size: 0.625rem !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
        color: white !important;
    }
    
    .inventory__badge--stock { background: #059669 !important; }
    .inventory__badge--dropship { background: #7c3aed !important; }
    .inventory__badge--set { background: #dc6803 !important; }
    .inventory__badge--hybrid { background: #0e7490 !important; }
    
    .inventory__card-badges {
        position: absolute !important;
        top: 0.5rem !important;
        left: 0.5rem !important;
        right: 2.5rem !important;
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 0.25rem !important;
        z-index: 5 !important;
        pointer-events: none !important;
    }
    
    .inventory__channel-badges {
        display: flex !important;
        gap: 0.125rem !important;
        margin-top: 0.25rem !important;
    }
    
    .inventory__channel-badge {
        padding: 0.125rem 0.25rem !important;
        border-radius: 0.125rem !important;
        font-size: 0.5rem !important;
        font-weight: 700 !important;
        background: rgba(255, 255, 255, 0.9) !important;
        color: var(--text-primary, #1e293b) !important;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
    }
    
    .inventory__channel-badge--ebay { background: #0064d2 !important; color: white !important; }
    .inventory__channel-badge--mercari { background: #d63384 !important; color: white !important; }
    .inventory__channel-badge--shopify { background: #96bf48 !important; color: white !important; }
    
    /* レスポンシブ対応 */
    @media (max-width: 1600px) {
        .inventory__grid { grid-template-columns: repeat(6, 1fr) !important; }
    }
    
    @media (max-width: 1200px) {
        .inventory__grid { grid-template-columns: repeat(4, 1fr) !important; }
    }
    
    @media (max-width: 768px) {
        .inventory__grid { grid-template-columns: repeat(2, 1fr) !important; gap: 0.5rem !important; }
        .inventory__card { height: 240px !important; }
        .inventory__card-image { height: 120px !important; }
    }
    
    @media (max-width: 480px) {
        .inventory__grid { grid-template-columns: 1fr !important; }
        .inventory__card { height: 220px !important; }
        .inventory__card-image { height: 100px !important; }
    }
    </style>
</head>
<body>
    <!-- ヘッダー -->
    <header class="inventory__header">
        <div class="inventory__header-top">
            <h1 class="inventory__title">
                <i class="fas fa-warehouse inventory__title-icon"></i>
                <?php echo safe_output('棚卸しシステム（レイアウト修正版）'); ?>
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
                <button class="btn btn--secondary" onclick="resetFilters()">
                    <i class="fas fa-undo"></i>
                    <?php echo safe_output('リセット'); ?>
                </button>
                <button class="btn btn--info" onclick="applyFilters()">
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
            
            <button class="btn btn--warning" id="create-set-btn" disabled>
                <i class="fas fa-layer-group"></i>
                <span id="set-btn-text"><?php echo safe_output('新規セット品作成'); ?></span>
            </button>
            
            <button class="btn btn--info" onclick="loadEbayInventoryData()">
                <i class="fas fa-sync"></i>
                <?php echo safe_output('eBayデータ取得'); ?>
            </button>
        </div>
    </div>

    <!-- カードビュー -->
    <div class="inventory__grid" id="card-view">
        <!-- データはJavaScriptで動的に生成 -->
        <div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>eBayデータベースから読み込み中...</p>
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

        <div class="excel-pagination">
            <div class="excel-pagination__info">
                <span id="table-info"><?php echo safe_output('読み込み中...'); ?></span>
            </div>
            <div class="excel-pagination__controls">
                <button class="excel-btn excel-btn--small" id="prev-page" disabled>
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span id="page-info">1 / 1</span>
                <button class="excel-btn excel-btn--small" id="next-page" disabled>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- レイアウト修正版: カードレイアウト改善 + データソース確認機能 -->
    <script src="common/js/pages/tanaoroshi_layout_fixed.js"></script>
</body>
</html>
