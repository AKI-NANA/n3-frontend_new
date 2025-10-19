<?php
/**
 * 🎯 N3準拠 棚卸しシステム Content - Phase1修正版
 * 完全HTML/JavaScript分離・インライン絶対禁止・N3準拠構造強制
 * 修正日: 2025年8月18日 Phase1
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
    <title><?php echo safe_output('棚卸しシステム - N3準拠完全分離版'); ?></title>
    
    <!-- 🎯 N3準拠: 外部リソースのみ（CDN使用） -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- 🎯 N3準拠: 外部CSSファイル参照（インライン絶対禁止） -->
    <link rel="stylesheet" href="common/css/tanaoroshi_n3_styles.css">
</head>
<body>
    <!-- 🎯 N3準拠: HTML構造のみ（JavaScript完全分離） -->
    
    <!-- ヘッダー -->
    <header class="inventory__header">
        <div class="inventory__header-top">
            <h1 class="inventory__title">
                <i class="fas fa-warehouse inventory__title-icon"></i>
                <?php echo safe_output('棚卸しシステム（N3準拠完全分離版）'); ?>
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
                <button class="btn btn--secondary js-filter-reset-btn" data-action="reset-filters">
                    <i class="fas fa-undo"></i>
                    <?php echo safe_output('リセット'); ?>
                </button>
                <button class="btn btn--info js-filter-apply-btn" data-action="apply-filters">
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
            <button class="inventory__view-btn inventory__view-btn--active js-view-btn js-view-btn--card" 
                    data-view="card" data-action="switch-view">
                <i class="fas fa-th-large"></i>
                <?php echo safe_output('カードビュー'); ?>
            </button>
            <button class="inventory__view-btn js-view-btn js-view-btn--excel" 
                    data-view="excel" data-action="switch-view">
                <i class="fas fa-table"></i>
                <?php echo safe_output('Excelビュー'); ?>
            </button>
        </div>
        
        <div class="inventory__actions">
            <!-- テストボタン群 -->
            <div class="test-buttons">
                <button class="btn btn--postgresql" data-action="test-postgresql">
                    <i class="fas fa-database"></i>
                    <?php echo safe_output('PostgreSQLテスト'); ?>
                </button>
                
                <button class="btn btn--modal" data-action="open-test-modal">
                    <i class="fas fa-cog"></i>
                    <?php echo safe_output('モーダルテスト'); ?>
                </button>
            </div>
            
            <button class="btn btn--success" data-action="open-add-product-modal">
                <i class="fas fa-plus"></i>
                <?php echo safe_output('新規商品登録'); ?>
            </button>
            
            <button class="btn btn--warning" data-action="create-new-set">
                <i class="fas fa-layer-group"></i>
                <?php echo safe_output('新規セット品作成'); ?>
            </button>
            
            <button class="btn btn--info" data-action="load-ebay-postgresql-data">
                <i class="fas fa-database"></i>
                <?php echo safe_output('eBay PostgreSQLデータ取得'); ?>
            </button>
            
            <button class="btn btn--primary" data-action="sync-with-ebay">
                <i class="fas fa-sync"></i>
                <?php echo safe_output('eBay同期実行'); ?>
            </button>
        </div>
    </div>

    <!-- メインコンテンツ -->
    <div class="inventory__main-content">
        <!-- カードビュー -->
        <div class="inventory__view inventory__view--visible" id="card-view">
            <!-- ページネーション上段 -->
            <div class="inventory__pagination-top">
                <div class="inventory__pagination-info" id="card-pagination-info">
                    商品: データ読み込み中...
                </div>
                
                <div class="inventory__pagination-controls">
                    <button class="inventory__pagination-btn" id="card-prev-btn" data-action="change-card-page" data-direction="-1" disabled>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    
                    <div id="card-page-numbers">
                        <button class="inventory__pagination-btn inventory__pagination-btn--active">1</button>
                    </div>
                    
                    <button class="inventory__pagination-btn" id="card-next-btn" data-action="change-card-page" data-direction="1">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <div class="inventory__items-per-page">
                    <label>表示件数:</label>
                    <select id="cards-per-page" data-action="change-cards-per-page">
                        <option value="24">24件</option>
                        <option value="48">48件</option>
                        <option value="80" selected>80件</option>
                        <option value="120">120件</option>
                    </select>
                </div>
            </div>
            
            <div class="inventory__grid js-inventory-grid">
                <div class="inventory__loading-state" data-loading="true">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>N3準拠PostgreSQLデータベースから読み込み中...</p>
                </div>
            </div>
        </div>

        <!-- Excelビュー -->
        <div class="inventory__view inventory__view--hidden" id="excel-view">
            <!-- Excelビュー上段ページネーション -->
            <div class="inventory__pagination-top">
                <div class="inventory__pagination-info" id="excel-pagination-info">
                    商品: データ読み込み中...
                </div>
                
                <div class="inventory__pagination-controls">
                    <button class="inventory__pagination-btn" id="excel-prev-btn" data-action="change-excel-page" data-direction="-1" disabled>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    
                    <div id="excel-page-numbers">
                        <button class="inventory__pagination-btn inventory__pagination-btn--active">1</button>
                    </div>
                    
                    <button class="inventory__pagination-btn" id="excel-next-btn" data-action="change-excel-page" data-direction="1">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <div class="inventory__items-per-page">
                    <label>表示件数:</label>
                    <select id="excel-items-per-page" data-action="change-excel-items-per-page">
                        <option value="50" selected>50件</option>
                        <option value="100">100件</option>
                        <option value="200">200件</option>
                        <option value="500">500件</option>
                        <option value="1000">1000件</option>
                    </select>
                </div>
            </div>
            
            <div class="inventory__excel-container">
                <div class="inventory__excel-toolbar">
                    <div class="inventory__excel-toolbar-left">
                        <button class="btn btn--success btn--small" data-action="open-add-product-modal">
                            <i class="fas fa-plus"></i>
                            新規登録
                        </button>
                        <button class="btn btn--secondary btn--small" data-action="delete-selected">
                            <i class="fas fa-trash"></i>
                            選択削除
                        </button>
                        <button class="btn btn--warning btn--small" data-action="create-new-set">
                            <i class="fas fa-layer-group"></i>
                            セット品作成
                        </button>
                    </div>
                    <div class="inventory__excel-toolbar-right">
                        <div class="inventory__excel-search">
                            <i class="fas fa-search"></i>
                            <input type="text" id="excel-search-input" placeholder="商品検索..." data-action="search-excel-table" />
                        </div>
                        <button class="btn btn--secondary btn--small" data-action="export-excel">
                            <i class="fas fa-download"></i>
                            エクスポート
                        </button>
                    </div>
                </div>
                
                <div id="excel-table-container">
                    <table id="excel-table" class="inventory__excel-table">
                        <thead>
                            <tr>
                                <th class="inventory__excel-th inventory__excel-th--checkbox">
                                    <input type="checkbox" class="inventory__excel-checkbox" />
                                </th>
                                <th class="inventory__excel-th inventory__excel-th--image">画像</th>
                                <th class="inventory__excel-th inventory__excel-th--name">商品名</th>
                                <th class="inventory__excel-th inventory__excel-th--sku">SKU</th>
                                <th class="inventory__excel-th inventory__excel-th--type">種類</th>
                                <th class="inventory__excel-th inventory__excel-th--price">販売価格(USD)</th>
                                <th class="inventory__excel-th inventory__excel-th--stock">在庫数</th>
                                <th class="inventory__excel-th inventory__excel-th--actions">操作</th>
                            </tr>
                        </thead>
                        <tbody id="excel-table-body" class="js-excel-tbody">
                            <tr class="inventory__excel-loading">
                                <td colspan="8" class="inventory__excel-loading-cell">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    N3準拠データを読み込み中...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- 🎯 N3準拠: モーダル構造（JavaScript分離） -->
    
    <!-- モーダル: 商品詳細 -->
    <div id="itemModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title" id="modalTitle">商品詳細</h2>
                <button class="modal-close" data-action="close-modal" data-modal="itemModal">&times;</button>
            </div>
            <div class="modal-body" id="modalBody">
                <!-- 商品詳細がここに表示されます -->
            </div>
            <div class="modal-footer">
                <button class="btn btn--secondary" data-action="close-modal" data-modal="itemModal">閉じる</button>
                <button class="btn btn--primary" data-action="edit-item">編集</button>
            </div>
        </div>
    </div>

    <!-- モーダル: 新規商品登録 -->
    <div id="addProductModal" class="modal unified-product-modal">
        <div class="modal-content modal-content--large">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="fas fa-plus-circle"></i>
                    新規商品登録
                </h2>
                <button class="modal-close" data-action="close-modal" data-modal="addProductModal">&times;</button>
            </div>
            
            <div class="modal-body">
                <!-- 商品登録フォーム -->
                <form id="add-product-form" class="inventory__product-form">
                    <!-- 商品タイプ選択 -->
                    <div class="inventory__form-section">
                        <h3 class="inventory__form-section-title">
                            <i class="fas fa-tag"></i>
                            商品タイプ
                        </h3>
                        <div class="inventory__product-type-grid">
                            <label class="inventory__product-type-option inventory__product-type-option--active" data-type="stock">
                                <input type="radio" name="product-type" value="stock" checked>
                                <div class="inventory__product-type-card">
                                    <i class="fas fa-warehouse"></i>
                                    <span>有在庫</span>
                                </div>
                            </label>
                            <label class="inventory__product-type-option" data-type="dropship">
                                <input type="radio" name="product-type" value="dropship">
                                <div class="inventory__product-type-card">
                                    <i class="fas fa-truck"></i>
                                    <span>無在庫</span>
                                </div>
                            </label>
                            <label class="inventory__product-type-option" data-type="set">
                                <input type="radio" name="product-type" value="set">
                                <div class="inventory__product-type-card">
                                    <i class="fas fa-layer-group"></i>
                                    <span>セット品</span>
                                </div>
                            </label>
                            <label class="inventory__product-type-option" data-type="hybrid">
                                <input type="radio" name="product-type" value="hybrid">
                                <div class="inventory__product-type-card">
                                    <i class="fas fa-sync-alt"></i>
                                    <span>ハイブリッド</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- 基本情報入力 -->
                    <div class="inventory__form-section">
                        <h3 class="inventory__form-section-title">
                            <i class="fas fa-info-circle"></i>
                            基本情報
                        </h3>
                        <div class="inventory__form-grid">
                            <div class="inventory__form-group">
                                <label class="inventory__form-label">商品名 <span class="required">*</span></label>
                                <input type="text" class="inventory__form-input" id="new-product-name" name="name" placeholder="商品名を入力" required>
                            </div>
                            <div class="inventory__form-group">
                                <label class="inventory__form-label">SKU <span class="required">*</span></label>
                                <input type="text" class="inventory__form-input" id="new-product-sku" name="sku" placeholder="SKU-XXX-001" required>
                            </div>
                            <div class="inventory__form-group">
                                <label class="inventory__form-label">販売価格 (USD)</label>
                                <input type="number" class="inventory__form-input" id="new-product-price" name="price" placeholder="0.00" min="0" step="0.01">
                            </div>
                            <div class="inventory__form-group">
                                <label class="inventory__form-label">仕入価格 (USD)</label>
                                <input type="number" class="inventory__form-input" id="new-product-cost" name="cost" placeholder="0.00" min="0" step="0.01">
                            </div>
                            <div class="inventory__form-group" id="stock-field">
                                <label class="inventory__form-label">在庫数</label>
                                <input type="number" class="inventory__form-input" id="new-product-stock" name="stock" placeholder="0" min="0" value="0">
                            </div>
                            <div class="inventory__form-group">
                                <label class="inventory__form-label">状態</label>
                                <select class="inventory__form-input" id="new-product-condition" name="condition">
                                    <option value="new">新品</option>
                                    <option value="used">中古</option>
                                    <option value="refurbished">整備済み</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            
            <div class="modal-footer">
                <button class="btn btn--secondary" data-action="close-modal" data-modal="addProductModal">キャンセル</button>
                <button class="btn btn--success" data-action="save-new-product">
                    <i class="fas fa-save"></i>
                    商品を保存
                </button>
            </div>
        </div>
    </div>

    <!-- モーダル: セット品作成 -->
    <div id="setModal" class="modal">
        <div class="modal-content modal-content--large">
            <div class="modal-header">
                <h2 class="modal-title">セット品作成・編集</h2>
                <button class="modal-close" data-action="close-modal" data-modal="setModal">&times;</button>
            </div>
            <div class="modal-body">
                <!-- セット品フォーム -->
                <form id="set-product-form" class="inventory__set-form">
                    <!-- セット品基本情報入力 -->
                    <div class="inventory__form-grid">
                        <div class="inventory__form-group">
                            <label class="inventory__form-label">セット品名</label>
                            <input type="text" class="inventory__form-input" id="setName" name="setName" placeholder="Gaming Accessories Bundle">
                        </div>
                        <div class="inventory__form-group">
                            <label class="inventory__form-label">SKU</label>
                            <input type="text" class="inventory__form-input" id="setSku" name="setSku" placeholder="SET-XXX-001">
                        </div>
                        <div class="inventory__form-group">
                            <label class="inventory__form-label">販売価格 (USD)</label>
                            <input type="number" class="inventory__form-input" id="setPrice" name="setPrice" placeholder="59.26" step="0.01">
                        </div>
                        <div class="inventory__form-group">
                            <label class="inventory__form-label">カテゴリ</label>
                            <input type="text" class="inventory__form-input" id="setCategory" name="setCategory" placeholder="Bundle">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn--secondary" data-action="close-modal" data-modal="setModal">キャンセル</button>
                <button class="btn btn--success" data-action="save-set-product">
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
                <button class="modal-close" data-action="close-modal" data-modal="testModal">&times;</button>
            </div>
            <div class="modal-body" id="testModalBody">
                <!-- テスト結果がここに表示されます -->
            </div>
            <div class="modal-footer">
                <button class="btn btn--secondary" data-action="close-modal" data-modal="testModal">閉じる</button>
            </div>
        </div>
    </div>

<!-- 🎯 N3準拠: JavaScript完全外部化（インライン絶対禁止） -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
<script src="common/js/tanaoroshi_n3_main.js"></script>

</body>
</html>