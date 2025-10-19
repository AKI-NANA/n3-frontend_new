<?php
if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

// XSS対策関数（重複定義回避）
if (!function_exists('safe_output')) {
    function safe_output($str) {
        return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
    }
}
?>

<!-- ヘッダー -->
<header class="inventory__header">
    <div class="inventory__header-top">
        <h1 class="inventory__title">
            <i class="fas fa-warehouse inventory__title-icon"></i>
            <?php echo safe_output('棚卸しシステム'); ?>
        </h1>
        
        <div class="inventory__exchange-rate">
            <i class="fas fa-exchange-alt inventory__exchange-icon"></i>
            <span class="inventory__exchange-text">USD/JPY:</span>
            <span class="inventory__exchange-value" id="exchange-rate">¥150.25</span>
        </div>
    </div>
    
    <div class="inventory__stats">
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="total-products">1,284</span>
            <span class="inventory__stat-label"><?php echo safe_output('総商品数'); ?></span>
        </div>
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="stock-products">912</span>
            <span class="inventory__stat-label"><?php echo safe_output('有在庫'); ?></span>
        </div>
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="dropship-products">203</span>
            <span class="inventory__stat-label"><?php echo safe_output('無在庫'); ?></span>
        </div>
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="set-products">169</span>
            <span class="inventory__stat-label"><?php echo safe_output('セット品'); ?></span>
        </div>
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="hybrid-products">45</span>
            <span class="inventory__stat-label"><?php echo safe_output('ハイブリッド'); ?></span>
        </div>
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="total-value">$102.5K</span>
            <span class="inventory__stat-label"><?php echo safe_output('総在庫価値'); ?></span>
        </div>
    </div>
</header>

<!-- 独立フィルターバー -->
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

<!-- 価格チャートセクション -->
<div class="inventory__chart-section">
    <div class="inventory__chart-header">
        <h2 class="inventory__chart-title">
            <i class="fas fa-chart-pie"></i>
            <?php echo safe_output('有在庫価格分析'); ?>
        </h2>
        <div class="inventory__chart-controls">
            <div class="inventory__currency-toggle">
                <button class="inventory__currency-btn inventory__currency-btn--active" id="currency-usd">USD</button>
                <button class="inventory__currency-btn" id="currency-jpy">JPY</button>
            </div>
        </div>
    </div>
    
    <div class="inventory__chart-container">
        <div class="inventory__chart-canvas-wrapper">
            <canvas id="price-chart" class="inventory__chart-canvas"></canvas>
        </div>
        
        <div class="inventory__chart-stats">
            <div class="inventory__chart-stat">
                <span class="inventory__chart-stat-label"><?php echo safe_output('合計金額'); ?></span>
                <span class="inventory__chart-stat-value" id="total-amount">$102,500</span>
            </div>
            <div class="inventory__chart-stat">
                <span class="inventory__chart-stat-label"><?php echo safe_output('平均単価'); ?></span>
                <span class="inventory__chart-stat-value" id="average-price">$112.3</span>
            </div>
            <div class="inventory__chart-stat">
                <span class="inventory__chart-stat-label"><?php echo safe_output('最高額商品'); ?></span>
                <span class="inventory__chart-stat-value" id="highest-price">$899</span>
            </div>
            <div class="inventory__chart-stat">
                <span class="inventory__chart-stat-label">$100<?php echo safe_output('以上'); ?></span>
                <span class="inventory__chart-stat-value" id="high-value-count">342<?php echo safe_output('点'); ?></span>
            </div>
            <div class="inventory__chart-stat">
                <span class="inventory__chart-stat-label">$50-$100</span>
                <span class="inventory__chart-stat-value" id="mid-value-count">298<?php echo safe_output('点'); ?></span>
            </div>
            <div class="inventory__chart-stat">
                <span class="inventory__chart-stat-label">$50<?php echo safe_output('未満'); ?></span>
                <span class="inventory__chart-stat-value" id="low-value-count">272<?php echo safe_output('点'); ?></span>
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
        
        <button class="btn btn--secondary" onclick="exportData()">
            <i class="fas fa-download"></i>
            <?php echo safe_output('エクスポート'); ?>
        </button>
    </div>
</div>

<!-- CSVインポート -->
<div class="inventory__import" id="csv-import-area">
    <input type="file" class="inventory__import-input" id="csv-import" accept=".csv">
    <div class="inventory__import-content">
        <i class="fas fa-cloud-upload-alt inventory__import-icon"></i>
        <span class="inventory__import-text"><?php echo safe_output('CSVファイルをインポート (eBay、メルカリ、Shopify、テンプレート対応)'); ?></span>
    </div>
</div>

<!-- カードビュー -->
<div class="inventory__grid" id="card-view">
    <!-- サンプル商品カード1 -->
    <div class="inventory__card" data-id="1">
        <div class="inventory__card-image">
            <img src="https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=200&fit=crop" alt="<?php echo safe_output('ワイヤレスマウス'); ?>" class="inventory__card-img">
            <div class="inventory__card-badges">
                <span class="inventory__badge inventory__badge--stock"><?php echo safe_output('有在庫'); ?></span>
                <div class="inventory__channel-badges">
                    <span class="inventory__channel-badge inventory__channel-badge--ebay">E</span>
                    <span class="inventory__channel-badge inventory__channel-badge--shopify">S</span>
                </div>
            </div>
        </div>
        <div class="inventory__card-info">
            <h3 class="inventory__card-title">Wireless Gaming Mouse RGB LED 7 Buttons</h3>
            <div class="inventory__card-price">
                <div class="inventory__card-price-main">$21.84</div>
                <div class="inventory__card-price-sub">¥3,280</div>
            </div>
            <div class="inventory__card-meta">
                <div class="inventory__meta-item">
                    <span><?php echo safe_output('仕入価格:'); ?></span>
                    <span class="inventory__meta-value">$12.33</span>
                </div>
                <div class="inventory__meta-item">
                    <span><?php echo safe_output('利益:'); ?></span>
                    <span class="inventory__meta-value">$9.51</span>
                </div>
                <div class="inventory__meta-item">
                    <span><?php echo safe_output('状態:'); ?></span>
                    <span class="inventory__meta-value"><?php echo safe_output('新品'); ?></span>
                </div>
                <div class="inventory__meta-item">
                    <span><?php echo safe_output('カテゴリ:'); ?></span>
                    <span class="inventory__meta-value">Electronics</span>
                </div>
            </div>
            <div class="inventory__card-footer">
                <span class="inventory__card-sku">MS-WR70-001</span>
                <div class="inventory__stock-edit">
                    <span style="font-size: 0.7rem; color: var(--text-secondary);"><?php echo safe_output('在庫:'); ?></span>
                    <input type="number" class="inventory__stock-input" value="48">
                </div>
            </div>
        </div>
    </div>

    <!-- サンプル商品カード2 -->
    <div class="inventory__card" data-id="2">
        <div class="inventory__card-image">
            <img src="https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&h=200&fit=crop" alt="<?php echo safe_output('PCセット'); ?>" class="inventory__card-img">
            <div class="inventory__card-badges">
                <span class="inventory__badge inventory__badge--set"><?php echo safe_output('セット品'); ?></span>
                <div class="inventory__channel-badges">
                    <span class="inventory__channel-badge inventory__channel-badge--ebay">E</span>
                </div>
            </div>
        </div>
        <div class="inventory__card-info">
            <h3 class="inventory__card-title">Gaming PC Accessories Bundle (3 Items)</h3>
            <div class="inventory__card-price">
                <div class="inventory__card-price-main">$59.26</div>
                <div class="inventory__card-price-sub">¥8,900</div>
            </div>
            <div class="inventory__card-meta">
                <div class="inventory__meta-item">
                    <span><?php echo safe_output('構成品:'); ?></span>
                    <span class="inventory__meta-value">3<?php echo safe_output('点'); ?></span>
                </div>
                <div class="inventory__meta-item">
                    <span><?php echo safe_output('利益:'); ?></span>
                    <span class="inventory__meta-value">$21.30</span>
                </div>
                <div class="inventory__meta-item">
                    <span><?php echo safe_output('作成可能:'); ?></span>
                    <span class="inventory__meta-value">15<?php echo safe_output('セット'); ?></span>
                </div>
                <div class="inventory__meta-item">
                    <span><?php echo safe_output('カテゴリ:'); ?></span>
                    <span class="inventory__meta-value">Bundle</span>
                </div>
            </div>
            <div class="inventory__card-footer">
                <span class="inventory__card-sku">SET-PC01-003</span>
                <button class="btn btn--small btn--warning" onclick="event.stopPropagation(); showProductDetail(2);">
                    <i class="fas fa-edit"></i>
                    <?php echo safe_output('編集'); ?>
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Excel風リストビュー -->
<div class="excel-grid" id="list-view" style="display: none;">
    <div class="excel-toolbar">
        <div class="excel-toolbar__left">
            <button class="excel-btn excel-btn--primary" id="add-product-from-list-btn">
                <i class="fas fa-plus"></i>
                <?php echo safe_output('新規商品登録'); ?>
            </button>
            <button class="excel-btn" id="delete-selected-btn">
                <i class="fas fa-trash"></i>
                <?php echo safe_output('選択削除'); ?>
            </button>
        </div>
        
        <div class="excel-toolbar__right">
            <div class="excel-toolbar__search">
                <i class="fas fa-search excel-toolbar__search-icon"></i>
                <input type="text" class="excel-toolbar__search-input" placeholder="<?php echo safe_output('商品検索...'); ?>" />
            </div>
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
                    <th style="width: 40px;">
                        <input type="checkbox" class="excel-checkbox" id="select-all-checkbox" />
                    </th>
                    <th style="width: 60px;"><?php echo safe_output('画像'); ?></th>
                    <th style="width: 250px;"><?php echo safe_output('商品名'); ?></th>
                    <th style="width: 120px;">SKU</th>
                    <th style="width: 100px;"><?php echo safe_output('販売価格(USD)'); ?></th>
                    <th style="width: 80px;"><?php echo safe_output('在庫数'); ?></th>
                    <th style="width: 80px;"><?php echo safe_output('操作'); ?></th>
                </tr>
            </thead>
            <tbody id="products-table-body">
                <tr data-id="1">
                    <td><input type="checkbox" class="excel-checkbox product-checkbox" data-id="1" /></td>
                    <td>
                        <img src="https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=50&h=40&fit=crop" alt="<?php echo safe_output('商品画像'); ?>" style="width: 40px; height: 32px; object-fit: cover; border-radius: 4px;">
                    </td>
                    <td><input type="text" class="excel-cell" value="Wireless Gaming Mouse RGB LED 7 Buttons" /></td>
                    <td><input type="text" class="excel-cell" value="MS-WR70-001" /></td>
                    <td><input type="number" class="excel-cell" value="21.84" style="text-align: right;" step="0.01" /></td>
                    <td><input type="number" class="excel-cell" value="48" style="text-align: center;" /></td>
                    <td>
                        <div style="display: flex; gap: 2px;">
                            <button class="excel-btn excel-btn--small" onclick="showProductDetail(1)" title="<?php echo safe_output('詳細'); ?>">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                <tr data-id="2">
                    <td><input type="checkbox" class="excel-checkbox product-checkbox" data-id="2" /></td>
                    <td>
                        <img src="https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=50&h=40&fit=crop" alt="<?php echo safe_output('商品画像'); ?>" style="width: 40px; height: 32px; object-fit: cover; border-radius: 4px;">
                    </td>
                    <td><input type="text" class="excel-cell" value="Gaming PC Accessories Bundle (3 Items)" /></td>
                    <td><input type="text" class="excel-cell" value="SET-PC01-003" /></td>
                    <td><input type="number" class="excel-cell" value="59.26" style="text-align: right;" step="0.01" /></td>
                    <td style="text-align: center; color: var(--text-secondary);">15<?php echo safe_output('セット'); ?></td>
                    <td>
                        <div style="display: flex; gap: 2px;">
                            <button class="excel-btn excel-btn--small" onclick="showProductDetail(2)" title="<?php echo safe_output('詳細'); ?>">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<!-- モーダルはJavaScriptで動的生成 -->
<div id="product-detail-modal" class="n3-modal n3-modal--large" aria-hidden="true" role="dialog" aria-modal="true">
    <div class="n3-modal__container">
        <div class="n3-modal__header">
            <h2 class="n3-modal__title">
                <i class="fas fa-eye"></i> 商品詳細情報
            </h2>
            <button class="n3-modal__close" onclick="N3Modal.close('product-detail-modal')">
                <span class="n3-sr-only">閉じる</span>
                &times;
            </button>
        </div>
        <div class="n3-modal__body">
            <!-- JavaScriptで動的生成される -->
        </div>
        <div class="n3-modal__footer">
            <button class="n3-btn n3-btn--secondary" onclick="N3Modal.close('product-detail-modal')">
                閉じる
            </button>
        </div>
    </div>
</div>

<!-- 必要なCSS読み込み -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link rel="stylesheet" href="modules/tanaoroshi/assets/tanaoroshi_inventory.css">

<!-- JavaScript読み込み -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
<script>
// CSRF Token設定
window.CSRF_TOKEN = '<?php echo bin2hex(random_bytes(32)); ?>';

// N3Modal基本機能
window.N3Modal = {
    open: function(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'block';
            modal.setAttribute('aria-hidden', 'false');
        }
    },
    close: function(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        }
    },
    setContent: function(id, options) {
        const modal = document.getElementById(id);
        if (modal && options.body) {
            const bodyElement = modal.querySelector('.n3-modal__body');
            if (bodyElement) {
                bodyElement.innerHTML = options.body;
            }
        }
    },
    alert: function(options) {
        alert(options.message);
    },
    confirm: function(options) {
        return new Promise(resolve => {
            resolve(confirm(options.message));
        });
    }
};
</script>

<!-- 棚卸しJavaScript（文字化け修正版使用） -->
<script src="modules/tanaoroshi/assets/tanaoroshi.js"></script>
