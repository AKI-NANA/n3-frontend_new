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
    <title><?php echo safe_output('棚卸しシステム - UI修正版'); ?></title>
    
    <!-- 外部リソース -->    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- 棚卸しシステムCSS -->
    <style>
    /* === 基本レイアウト === */
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0;
        padding: 20px;
        background: #f8fafc;
        color: #1e293b;
    }
    
    .inventory__header {
        background: white;
        padding: 24px;
        border-radius: 12px;
        margin-bottom: 24px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .inventory__title {
        font-size: 2rem;
        font-weight: 800;
        color: #1e293b;
        margin: 0 0 24px 0;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .inventory__title-icon {
        color: #3b82f6;
    }
    
    .inventory__stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 16px;
    }
    
    .inventory__stat {
        text-align: center;
        padding: 16px;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
    }
    
    .inventory__stat-number {
        display: block;
        font-size: 1.75rem;
        font-weight: 800;
        color: #1e293b;
        margin-bottom: 4px;
    }
    
    .inventory__stat-label {
        font-size: 0.875rem;
        color: #64748b;
        font-weight: 500;
    }
    
    /* === フィルターバー === */
    .inventory__filter-bar {
        background: white;
        padding: 24px;
        border-radius: 12px;
        margin-bottom: 24px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .inventory__filter-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 20px 0;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .inventory__filter-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
    }
    
    .inventory__filter-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    
    .inventory__filter-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
    }
    
    .inventory__filter-select {
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: white;
        font-size: 0.875rem;
        color: #1f2937;
        transition: border-color 0.2s;
    }
    
    .inventory__filter-select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .inventory__filter-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
    }
    
    .inventory__filter-left {
        display: flex;
        gap: 12px;
    }
    
    .inventory__search-box {
        position: relative;
        min-width: 300px;
    }
    
    .inventory__search-input {
        width: 100%;
        padding: 10px 12px 10px 40px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 0.875rem;
        transition: border-color 0.2s;
    }
    
    .inventory__search-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .inventory__search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #9ca3af;
    }
    
    /* === ビューコントロール === */
    .inventory__view-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        flex-wrap: wrap;
        gap: 16px;
    }
    
    .inventory__view-toggle {
        display: flex;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .inventory__view-btn, .js-view-btn {
        padding: 12px 20px;
        background: white;
        border: none;
        color: #6b7280;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .inventory__view-btn--active {
        background: #3b82f6;
        color: white;
    }
    
    .inventory__view-btn:hover:not(.inventory__view-btn--active) {
        background: #f3f4f6;
        color: #374151;
    }
    
    /* === ボタンスタイル === */
    .btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
    }
    
    .btn--primary { background: #3b82f6; color: white; }
    .btn--primary:hover { background: #2563eb; }
    
    .btn--success { background: #10b981; color: white; }
    .btn--success:hover { background: #059669; }
    
    .btn--secondary {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
    }
    .btn--secondary:hover { background: #e5e7eb; }
    
    .btn--warning { background: #f59e0b; color: white; }
    .btn--warning:hover { background: #d97706; }
    
    .btn--info { background: #06b6d4; color: white; }
    .btn--info:hover { background: #0891b2; }
    
    .btn--danger { background: #ef4444; color: white; }
    .btn--danger:hover { background: #dc2626; }
    
    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
    }
    
    .inventory__actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }
    
    /* === カードビュー === */
    .inventory__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
        padding: 0;
    }
    
    .inventory__card {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.3s;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    
    .inventory__card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
    
    .inventory__card-image {
        position: relative;
        height: 200px;
        overflow: hidden;
        background: #f8fafc;
    }
    
    .inventory__card-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s;
    }
    
    .inventory__card:hover .inventory__card-img {
        transform: scale(1.05);
    }
    
    .inventory__card-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        background: #f1f5f9;
    }
    
    .inventory__card-placeholder i {
        font-size: 2rem;
        margin-bottom: 8px;
    }
    
    .inventory__badge {
        position: absolute;
        top: 12px;
        right: 12px;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        color: white;
    }
    
    .inventory__badge--single,
    .inventory__badge--stock {
        background: #10b981;
    }
    
    .inventory__badge--dropship {
        background: #06b6d4;
    }
    
    .inventory__badge--set {
        background: #8b5cf6;
    }
    
    .inventory__badge--hybrid {
        background: #f59e0b;
    }
    
    .inventory__card-info {
        padding: 16px;
        flex: 1;
        display: flex;
        flex-direction: column;
    }
    
    .inventory__card-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 12px 0;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        flex: 1;
    }
    
    .inventory__card-price {
        margin-bottom: 12px;
    }
    
    .inventory__card-price-main {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 2px;
    }
    
    .inventory__card-price-sub {
        font-size: 0.75rem;
        color: #64748b;
    }
    
    .inventory__card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid #f1f5f9;
    }
    
    .inventory__card-sku {
        font-size: 0.75rem;
        color: #64748b;
        font-family: monospace;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    /* === Excelビュー === */
    .inventory__view {
        transition: all 0.3s;
    }
    
    .inventory__view--hidden {
        display: none !important;
    }
    
    .inventory__view--visible {
        display: block !important;
    }
    
    .excel-table-wrapper {
        background: white;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }
    
    .excel-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
    }
    
    .excel-table th {
        background: #f8fafc;
        padding: 12px 8px;
        text-align: left;
        font-weight: 600;
        color: #374151;
        border-bottom: 2px solid #e2e8f0;
        position: sticky;
        top: 0;
        z-index: 10;
    }
    
    .excel-table td {
        padding: 8px;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
    }
    
    .excel-table tr:hover {
        background: #f8fafc;
    }
    
    /* === ローディング状態 === */
    .inventory__loading-state {
        text-align: center;
        padding: 4rem 2rem;
        color: #64748b;
        grid-column: 1 / -1;
    }
    
    .inventory__loading-state i {
        font-size: 3rem;
        margin-bottom: 1rem;
        display: block;
    }
    
    .inventory__loading-state p {
        font-size: 1.125rem;
        margin: 0;
    }
    
    /* === レスポンシブデザイン === */
    @media (max-width: 768px) {
        body {
            padding: 10px;
        }
        
        .inventory__header {
            padding: 16px;
        }
        
        .inventory__title {
            font-size: 1.5rem;
        }
        
        .inventory__stats {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .inventory__filter-grid {
            grid-template-columns: 1fr;
        }
        
        .inventory__search-box {
            min-width: auto;
        }
        
        .inventory__view-controls {
            flex-direction: column;
            align-items: stretch;
        }
        
        .inventory__actions {
            justify-content: stretch;
        }
        
        .inventory__actions .btn {
            flex: 1;
            justify-content: center;
        }
        
        .inventory__grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 16px;
        }
    }
    
    @media (max-width: 480px) {
        .inventory__stats {
            grid-template-columns: 1fr;
        }
        
        .inventory__grid {
            grid-template-columns: 1fr;
        }
    }
    </style>
</head>
<body>
    <!-- ヘッダー -->
    <header class="inventory__header">
        <h1 class="inventory__title">
            <i class="fas fa-warehouse inventory__title-icon"></i>
            <?php echo safe_output('棚卸しシステム（UI修正版）'); ?>
        </h1>
        
        <div class="inventory__stats">
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="total-products">5</span>
                <span class="inventory__stat-label"><?php echo safe_output('総商品数'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="stock-products">3</span>
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
                <span class="inventory__stat-number" id="hybrid-products">1</span>
                <span class="inventory__stat-label"><?php echo safe_output('ハイブリッド'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="total-value">$1.5K</span>
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
                    <option value="single"><?php echo safe_output('有在庫'); ?></option>
                    <option value="dropship"><?php echo safe_output('無在庫'); ?></option>
                    <option value="set"><?php echo safe_output('セット品'); ?></option>
                    <option value="hybrid"><?php echo safe_output('ハイブリッド'); ?></option>
                </select>
            </div>
        </div>
        
        <div class="inventory__filter-actions">
            <div class="inventory__filter-left">
                <button class="btn btn--secondary" data-action="reset-filters">
                    <i class="fas fa-undo"></i>
                    <?php echo safe_output('リセット'); ?>
                </button>
                <button class="btn btn--info" data-action="apply-filters">
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
            <button class="inventory__view-btn inventory__view-btn--active js-view-btn" data-view="card" data-action="switch-view">
                <i class="fas fa-th-large"></i>
                <?php echo safe_output('カードビュー'); ?>
            </button>
            <button class="inventory__view-btn js-view-btn" data-view="excel" data-action="switch-view">
                <i class="fas fa-table"></i>
                <?php echo safe_output('Excelビュー'); ?>
            </button>
        </div>
        
        <div class="inventory__actions">
            <button class="btn btn--primary" data-action="load-inventory-data">
                <i class="fas fa-database"></i>
                <?php echo safe_output('データ取得'); ?>
            </button>
        </div>
    </div>

    <!-- カードビュー -->
    <div class="inventory__grid inventory__view inventory__view--visible" id="card-view">
        <!-- データはJavaScriptで動的に生成されます -->
    </div>

    <!-- Excelビュー -->
    <div class="inventory__view inventory__view--hidden" id="excel-view">
        <div class="excel-table-wrapper">
            <table class="excel-table">
                <thead>
                    <tr>
                        <th style="width: 60px;"><?php echo safe_output('画像'); ?></th>
                        <th style="width: 200px;"><?php echo safe_output('商品名'); ?></th>
                        <th style="width: 120px;">SKU</th>
                        <th style="width: 80px;"><?php echo safe_output('種類'); ?></th>
                        <th style="width: 80px;"><?php echo safe_output('価格(USD)'); ?></th>
                        <th style="width: 60px;"><?php echo safe_output('在庫'); ?></th>
                        <th style="width: 100px;"><?php echo safe_output('操作'); ?></th>
                    </tr>
                </thead>
                <tbody id="excel-table-body">
                    <!-- データはJavaScriptで動的に生成 -->
                </tbody>
            </table>
        </div>
    </div>

    <!-- JavaScript - UI修正版 -->
    <script src="common/js/tanaoroshi_n3_main_ui_fixed.js"></script>
</body>
</html>