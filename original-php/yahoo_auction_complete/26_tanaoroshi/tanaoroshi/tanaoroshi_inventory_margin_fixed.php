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
    <title><?php echo safe_output('棚卸しシステム - 上下余白修正版'); ?></title>
    
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
                        <option value="set"><?php echo safe_output('セット品