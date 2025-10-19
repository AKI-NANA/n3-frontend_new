<?php
if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

// XSS対策関数
function safe_output($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

// N3準拠Ajax処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['ajax_action'])) {
    // PostgreSQL eBay Ajax Handler統合
    if ($_POST['handler'] === 'postgresql_ebay') {
        $handler_path = __DIR__ . '/../tanaoroshi/tanaoroshi_ajax_handler_postgresql_ebay.php';
        
        if (file_exists($handler_path)) {
            // ルーティング情報設定
            if (!defined('_ROUTED_FROM_INDEX')) {
                define('_ROUTED_FROM_INDEX', true);
            }
            
            // Ajax Handlerを実行
            include $handler_path;
            exit;
        } else {
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode([
                'success' => false,
                'error' => 'PostgreSQL Ajax Handlerが見つかりません',
                'handler_path' => $handler_path
            ]);
            exit;
        }
    }
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
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    
    <!-- ✅ N3準拠: CSS読み込み順序（共通→専用） -->
    <link rel="stylesheet" href="common/css/core/common.css">
    <link rel="stylesheet" href="common/css/pages/tanaoroshi_inline_complete.css">
</head>
<body>
    <!-- データベース接続状態表示 -->
    <div class="database-status database-status--disconnected" id="database-status">
        <i class="fas fa-database"></i>
        <span id="database-status-text">PostgreSQL接続確認中...</span>
    </div>

    <!-- ヘッダー -->
    <header class="inventory__header">
        <div class="inventory__header-top">
            <h1 class="inventory__title">
                <i class="fas fa-warehouse inventory__title-icon"></i>
                <?php echo safe_output('棚卸しシステム（UI修正版）'); ?>
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
            <button class="inventory__view-btn inventory__view-btn--active js-view-btn" data-action="switch-view" data-view="card">
                <i class="fas fa-th-large"></i>
                <?php echo safe_output('カードビュー'); ?>
            </button>
            <button class="inventory__view-btn js-view-btn" data-action="switch-view" data-view="excel">
                <i class="fas fa-table"></i>
                <?php echo safe_output('Excelビュー'); ?>
            </button>
        </div>
        
        <div class="inventory__actions">
            <button class="btn btn--success" onclick="showAddProductModal()">
                <i class="fas fa-plus"></i>
                <?php echo safe_output('新規商品登録'); ?>
            </button>
            
            <button class="btn btn--warning" id="create-set-btn" disabled>
                <i class="fas fa-layer-group"></i>
                <span id="set-btn-text"><?php echo safe_output('新規セット品作成'); ?></span>
            </button>
            
            <button class="btn btn--info" data-action="load-inventory-data">
                <i class="fas fa-database"></i>
                <?php echo safe_output('データ読み込み'); ?>
            </button>
        </div>
    </div>

    <!-- カードビュー -->
    <div class="inventory__view inventory__view--visible" id="card-view">
        <div class="inventory__grid">
            <!-- データはJavaScriptで動的に生成されます -->
        </div>
        
        <!-- カードビューページネーション -->
        <div class="inventory__pagination">
            <div class="inventory__pagination-info">
                <span id="card-pagination-info">商品: 0件</span>
            </div>
            <div class="inventory__pagination-controls">
                <button class="inventory__pagination-btn" id="card-prev-btn" data-action="change-card-page" data-direction="-1" disabled>
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="inventory__pagination-numbers" id="card-page-numbers">
                    <!-- ページ番号はJavaScriptで生成 -->
                </div>
                <button class="inventory__pagination-btn" id="card-next-btn" data-action="change-card-page" data-direction="1" disabled>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- Excel風リストビュー -->
    <div class="inventory__view inventory__view--hidden" id="excel-view">
        <div class="excel-grid">
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
    </div>

    <!-- ✅ N3準拠: JavaScript専用ファイル読み込み -->
    <script src="common/js/pages/tanaoroshi_inline_complete.js?v=<?php echo time(); ?>"></script>
    
    <!-- 🔥 緊急修復: 強制実行スクリプト -->
    <script>
    console.log('🔥 緊急修復スクリプト実行中...');
    
    // 強制データ読み込み
    setTimeout(() => {
        if (window.TanaoroshiSystem && window.TanaoroshiSystem.loadInventoryData) {
            console.log('✅ TanaoroshiSystem検出、データ読み込み実行...');
            window.TanaoroshiSystem.loadInventoryData();
        } else {
            console.warn('⚠️ TanaoroshiSystem未検出、キャッシュクリアしてください');
        }
    }, 1000);
    
    // デバッグ情報表示
    setTimeout(() => {
        console.log('📊 デバッグ情報:');
        console.log('- window.TanaoroshiSystem:', !!window.TanaoroshiSystem);
        if (window.TanaoroshiSystem) {
            console.log('- config.version:', window.TanaoroshiSystem.config?.version);
            console.log('- 商品データ数:', window.TanaoroshiSystem.data?.allProducts?.length || 0);
        }
    }, 2000);
    </script>
</body>
</html>
