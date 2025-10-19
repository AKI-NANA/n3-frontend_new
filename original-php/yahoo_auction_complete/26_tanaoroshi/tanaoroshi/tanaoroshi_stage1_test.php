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
    <title><?php echo safe_output('棚卸しシステム - Stage 1テスト版'); ?></title>
    
    <!-- 外部リソース -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    
    <!-- N3共通CSS（基本レイアウト） -->
    <link rel="stylesheet" href="common/css/core/common.css">
    
    <!-- 棚卸し専用CSS - 修正版 -->
    <link rel="stylesheet" href="modules/tanaoroshi/assets/tanaoroshi_inventory_fixed.css">
    
    <style>
    /* 緊急修正：上下余白を確実に削除 */
    body {
        margin: 0;
        padding: 0;
    }
    
    .main-content,
    main,
    .content {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
    }
    
    /* ヘッダーバーを一番上に配置 */
    .inventory__header {
        margin-top: 0 !important;
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
                    <?php echo safe_output('棚卸しシステム - Stage 1テスト'); ?>
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

        <!-- ビュー切り替えコントロール - テスト用 -->
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
            </div>
        </div>

        <!-- カードビュー（最小限） -->
        <div class="inventory__grid" id="card-view">
            <!-- サンプル商品カード1つだけ -->
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
        </div>

        <!-- Excel風リストビュー（最小限） -->
        <div class="excel-grid" id="list-view" style="display: none;">
            <div class="excel-toolbar">
                <div class="excel-toolbar__left">
                    <button class="excel-btn excel-btn--primary" id="add-product-from-list-btn">
                        <i class="fas fa-plus"></i>
                        <?php echo safe_output('新規商品登録'); ?>
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
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Stage 1: 基本機能のみのJavaScript -->
    <script src="modules/tanaoroshi/assets/tanaoroshi_stage1_basic.js"></script>
</body>
</html>