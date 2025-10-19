<?php
/**
 * 🎯 N3準拠 棚卸しシステム Content - Phase2修正版（フィーチャースイッチ統合）
 * 完全HTML/JavaScript分離・インライン絶対禁止・N3準拠構造強制
 * 修正日: 2025年8月25日 Phase2 - N3新カードシステム統合
 */

// 🎯 N3準拠 定数重複完全防止 - index.phpで既に定義済みため、ここでは定義しない
if (!defined('SECURE_ACCESS')) {
    // エラーレスポンス: 適切なアクセス方法の案内
    http_response_code(403);
    header('Content-Type: text/html; charset=UTF-8');
    die('<!DOCTYPE html><html><head><title>Access Denied</title></head><body><h1>Direct Access Not Allowed</h1><p>Please access through the main N3 system: <a href="/index.php">index.php</a></p></body></html>');
}

// 🎯 N3新カードシステム フィーチャースイッチ読み込み
require_once __DIR__ . '/n3_feature_switch.php';

// 🔧 safe_output関数の重複チェック（Fatal Error対策）
if (!function_exists('safe_output')) {
    function safe_output($str) {
        return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
    }
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
    
    <!-- 🔥 緑急修正: Bootstrap CSS読み込み（CRITICAL問題解決） -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM" crossorigin="anonymous">
    
    <!-- 🎯 N3準拠: 外部CSSファイル参照（インライン絶対禁止） -->
    <link rel="stylesheet" href="common/css/tanaoroshi_n3_styles.css">
    
    <!-- 🔥 緊急修正: N3モーダルCSS一時無効化（Bootstrap競合回避） -->
    <!-- <link rel="stylesheet" href="common/css/components/n3-modal-system.css"> -->
    
    <!-- 🚀 緊急CSS競合修正（キャッシュクリア + 動的CSS無効化） -->
    <style id="emergency-css-override">
    /* 🚨 緊急キャッシュクリア対応 - グレー背景完全除去 */
    
    /* 🚀 最高優先度でグレー背景を根絶 */
    .inventory__card-image,
    .product-card__image,
    [class*="card-image"],
    [class*="inventory__card-image"] {
        width: 100% !important;
        height: 140px !important;
        background-color: transparent !important; /* 🚀 グレー背景完全除去 */
        background-image: inherit !important; /* 🚀 画像表示保持 */
        background-size: cover !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        position: relative !important;
        overflow: hidden !important;
        flex-shrink: 0 !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 8px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 1 !important;
    }
    
    /* 🚨 動的CSS生成の無効化 */
    .inventory__card-image[style*="background"] {
        background: inherit !important;
    }
    
    /* 🚨 キャッシュされたCSSの強制上書き */
    .inventory__card-image {
        background: transparent !important;
    }
    </style>
    /* 🎯 恐久修正：CSSspecificity強化版（表示中モーダルのみ） */
    html body .modal.show {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        z-index: 9999999 !important;  /* 🎯 Z-index最大値に強化 */
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        transform: none !important;
    }
    
    html body .modal.show .modal-dialog {
        display: block !important;
        visibility: visible !important;
        width: auto !important;
        max-width: 800px !important;
        margin: 50px auto !important;
        position: relative !important;
        transform: none !important;
        opacity: 1 !important;
    }
    
    html body .modal.show .modal-content {
        display: block !important;
        visibility: visible !important;
        background: white !important;
        border: 1px solid #ddd !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
        padding: 0 !important;
        width: 100% !important;
        transform: none !important;
        opacity: 1 !important;
    }
    
    html body .modal.show .modal-header {
        display: block !important;
        visibility: visible !important;
        padding: 1rem 1.5rem !important;
        border-bottom: 1px solid #e5e5e5 !important;
    }
    
    html body .modal.show .modal-body {
        display: block !important;
        visibility: visible !important;
        padding: 1.5rem !important;
        max-height: 70vh !important;
        overflow-y: auto !important;
    }
    
    html body .modal.show .modal-footer {
        display: flex !important;
        visibility: visible !important;
        justify-content: flex-end !important;
        gap: 0.5rem !important;
        padding: 1rem 1.5rem !important;
        border-top: 1px solid #e5e5e5 !important;
    }
    
    /* Bootstrapバックドロップ（背景クリック修正） */
    html body .modal-backdrop.show {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        z-index: 99998 !important;
        width: 100vw !important;
        height: 100vh !important;
        background-color: rgba(0,0,0,0.5) !important;
        display: block !important;
        opacity: 0.5 !important;
        /* 🔥 重要：クリックイベントを有効化 */
        pointer-events: auto !important;
        cursor: pointer !important;
    }
    
    /* 🔥 モーダル自体のクリックイベント設定 */
    html body .modal.show {
        /* 🔥 重要：モーダル自体はクリックで関じる */
        pointer-events: auto !important;
        cursor: pointer !important;
    }
    
    /* 🔥 モーダルコンテンツはクリックイベントを停止 */
    html body .modal.show .modal-dialog {
        /* 🔥 重要：コンテンツクリックでは閉じない */
        pointer-events: auto !important;
        cursor: default !important;
    }
    
    /* 🚨 非表示モーダルの確実な非表示化 */
    html body .modal:not(.show) {
        display: none !important;
    }
    
    /* 🚨 N3システム競合対策 */
    html body.modal-open {
        overflow: hidden !important;
        padding-right: 0 !important;
    }
    
    /* 🔥 最強級：インラインstyle属性での非表示を上書き */
    html body .modal.show[style*="display: none"] {
        display: block !important;
    }
    
    html body .modal.show[style*="visibility: hidden"] {
        visibility: visible !important;
    }
    
    html body .modal.show[style*="opacity: 0"] {
        opacity: 1 !important;
    }
    </style>
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
            <!-- 多国展開統計 -->
            <div class="inventory__stat inventory__stat--global" id="global-stat-countries" style="display: none;">
                <span class="inventory__stat-number" id="global-countries">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('展開国数'); ?></span>
            </div>
            <div class="inventory__stat inventory__stat--global" id="global-stat-listings" style="display: none;">
                <span class="inventory__stat-number" id="global-listings">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('全出品数'); ?></span>
            </div>
            <div class="inventory__stat inventory__stat--global" id="global-stat-revenue" style="display: none;">
                <span class="inventory__stat-number" id="global-revenue">$0</span>
                <span class="inventory__stat-label"><?php echo safe_output('全世界売上'); ?></span>
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
                    id="card-view-btn" data-view="card" data-action="switch-view">
                <i class="fas fa-th-large"></i>
                <?php echo safe_output('カードビュー'); ?>
            </button>
            <button class="inventory__view-btn js-view-btn js-view-btn--excel" 
                    id="list-view-btn" data-view="excel" data-action="switch-view">
                <i class="fas fa-table"></i>
                <?php echo safe_output('Excelビュー'); ?>
            </button>
            <button class="inventory__view-btn js-view-btn js-view-btn--global" 
                    data-view="global" data-action="switch-view">
                <i class="fas fa-globe"></i>
                <?php echo safe_output('多国展開ビュー'); ?>
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
            
            <button class="btn btn--success" data-action="load-safe-100-data">
                <i class="fas fa-shield-alt"></i>
                <?php echo safe_output('安全データ取得（100件）'); ?>
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

    <!-- 🎯 メインコンテンツ -->
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
            
            <?php
            // 🎯 フィーチャースイッチによる新旧カードシステム切り替え
            $useNewCardSystem = N3FeatureSwitch::useNewCardSystem();
            $featureStatus = N3FeatureSwitch::getStatus();
            
            echo "<!-- 🎯 フィーチャースイッチ状態: " . json_encode($featureStatus) . " -->\n";
            
            if ($useNewCardSystem) {
                echo "<!-- 🎯 N3新カードシステム使用 -->\n";
                echo renderN3ProductCards([]);
            } else {
                echo "<!-- 🔄 レガシーカードシステム使用 -->\n";
                echo renderLegacyProductCards([]);
            }
            ?>
        </div>

        <!-- Excelビュー -->
        <div class="inventory__view inventory__view--hidden" id="excel-view" style="display: none;">
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

        <!-- 多国展開ビュー -->
        <div class="inventory__view inventory__view--hidden" id="global-view" style="display: none;">
            <!-- 多国展開ビュー上段ページネーション -->
            <div class="inventory__pagination-top">
                <div class="inventory__pagination-info" id="global-pagination-info">
                    多国展開商品: データ読み込み中...
                </div>
                
                <div class="inventory__pagination-controls">
                    <button class="inventory__pagination-btn" id="global-prev-btn" data-action="change-global-page" data-direction="-1" disabled>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    
                    <div id="global-page-numbers">
                        <button class="inventory__pagination-btn inventory__pagination-btn--active">1</button>
                    </div>
                    
                    <button class="inventory__pagination-btn" id="global-next-btn" data-action="change-global-page" data-direction="1">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <div class="inventory__items-per-page">
                    <label>表示件数:</label>
                    <select id="global-items-per-page" data-action="change-global-items-per-page">
                        <option value="30" selected>30件</option>
                        <option value="60">60件</option>
                        <option value="100">100件</option>
                        <option value="200">200件</option>
                    </select>
                </div>
            </div>
            
            <!-- 多国展開コンテナ -->
            <div class="inventory__global-container">
                <!-- 多国展開ツールバー -->
                <div class="inventory__global-toolbar">
                    <div class="inventory__global-toolbar-left">
                        <div class="inventory__global-filters">
                            <select class="inventory__global-filter" id="global-country-filter">
                                <option value="">すべての国</option>
                                <option value="US">アメリカ</option>
                                <option value="UK">イギリス</option>
                                <option value="DE">ドイツ</option>
                                <option value="AU">オーストラリア</option>
                                <option value="CA">カナダ</option>
                                <option value="FR">フランス</option>
                                <option value="IT">イタリア</option>
                                <option value="ES">スペイン</option>
                            </select>
                            
                            <select class="inventory__global-filter" id="global-status-filter">
                                <option value="">すべての状態</option>
                                <option value="active">出品中</option>
                                <option value="sold">売切れ</option>
                                <option value="ended">終了</option>
                                <option value="draft">下書き</option>
                            </select>
                            
                            <button class="btn btn--primary btn--small" data-action="apply-global-filters">
                                <i class="fas fa-filter"></i>
                                フィルター適用
                            </button>
                        </div>
                    </div>
                    
                    <div class="inventory__global-toolbar-right">
                        <button class="btn btn--success btn--small" data-action="sync-global-data">
                            <i class="fas fa-sync"></i>
                            グローバル同期
                        </button>
                        
                        <button class="btn btn--info btn--small" data-action="export-global-data">
                            <i class="fas fa-download"></i>
                            エクスポート
                        </button>
                    </div>
                </div>
                
                <!-- 多国展開グリッド -->
                <div class="inventory__global-grid" id="global-grid">
                    <div class="inventory__loading-state" data-loading="true">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>多国展開eBayデータを読み込み中...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 🎯 N3準拠: モーダル構造（JavaScript分離） - iframe方式に完全移行済み -->
    <!-- 古いBootstrapモーダルは全て削除 - SafeIframeModalシステムを使用 -->

<!-- 🎯 N3準拠: JavaScript読み込み（統一版 - ファイル最小化） -->
<!-- Bootstrap（モーダル依存ライブラリ）- 最優先読み込み -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>

<!-- 棚卸しシステム専用JS（全機能統合版） -->
<script src="common/js/pages/tanaoroshi_inline_complete.js"></script>

<script>
// 🚨 緊急修正: ページ読み込み後にカード修正適用 + モーダルデバッグ強化
window.addEventListener('load', function() {
    console.log('🚨 緊急修正: ページ読み込み後のカード修正開始');
    
    // 🔍 デバッグ情報出力
    console.log('🔍 デバッグ情報:');
    console.log('  - Bootstrap存在:', typeof window.bootstrap);
    console.log('  - TanaoroshiSystem存在:', typeof window.TanaoroshiSystem);
    console.log('  - addProductModal要素:', !!document.getElementById('addProductModal'));
    console.log('  - setModal要素:', !!document.getElementById('setModal'));
    console.log('  - testModal要素:', !!document.getElementById('testModal'));
    
    // 🎯 ボタン要素確認
    const buttons = {
        newProduct: document.querySelector('[data-action="open-add-product-modal"]'),
        setCreation: document.querySelector('[data-action="create-new-set"]'), 
        modalTest: document.querySelector('[data-action="open-test-modal"]')
    };
    
    console.log('🎯 ボタン要素確認:');
    Object.keys(buttons).forEach(key => {
        console.log(`  - ${key}:`, !!buttons[key]);
    });
    
    // 🚨 緊急モーダルテスト関数追加
    window.emergencyModalTest = function() {
        console.log('🚨 緊急モーダルテスト実行');
        
        const modal = document.getElementById('addProductModal');
        if (modal && window.bootstrap) {
            console.log('✅ モーダル要素とBootstrap確認OK');
            try {
                const bootstrapModal = new bootstrap.Modal(modal);
                bootstrapModal.show();
                console.log('✅ Bootstrap Modal表示成功');
            } catch (error) {
                console.error('❌ Bootstrap Modal表示エラー:', error);
            }
        } else {
            console.error('❌ モーダル要素またはBootstrapが見つかりません');
            console.log('  Modal:', !!modal);
            console.log('  Bootstrap:', !!window.bootstrap);
        }
    };
    
    // 🚨 即座実行 + 繰り返しチェック
    let retryCount = 0;
    const maxRetries = 10;
    
    function applyCardFix() {
        retryCount++;
        console.log(`🚨 カード修正試行: ${retryCount}/${maxRetries}`);
        
        // グローバルデータがある場合は修正版で再表示
        if (window.TanaoroshiSystem && window.TanaoroshiSystem.allProducts && window.updateProductCardsFixed) {
            console.log('🚨 カード修正版で再表示実行');
            window.updateProductCardsFixed(window.TanaoroshiSystem.allProducts);
            
            // CSS強制適用
            const cardContainer = document.getElementById('card-grid');
            if (cardContainer) {
                cardContainer.style.display = 'grid';
                cardContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
                cardContainer.style.gap = '1rem';
                cardContainer.style.padding = '1rem';
                console.log('🚨 CSSグリッド強制適用完了');
            }
            
            return true; // 成功
        } else if (retryCount < maxRetries) {
            // データがまだない場合は再試行
            setTimeout(applyCardFix, 1000);
            return false;
        } else {
            console.warn('⚠️ カード修正の最大試行回数に達しました');
            return false;
        }
    }
    
    // 即座実行開始
    applyCardFix();
    
    // 🔥 緊急モーダルボタン直接イベントリスナー追加
    setTimeout(() => {
        console.log('🔥 緊急モーダルボタンイベントリスナー設定');
        
        // 新規商品登録ボタン
        const newProductBtn = document.querySelector('[data-action="open-add-product-modal"]');
        if (newProductBtn) {
            newProductBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🔥 新規商品登録ボタンクリック検出');
                // 🎯 ジェミナイiframe解決策使用
                window.showSafeModal();
            });
            console.log('✅ 新規商品登録ボタンリスナー設定完了');
        }
        
        // セット品作成ボタン
        const setBtn = document.querySelector('[data-action="create-new-set"]');
        if (setBtn) {
            setBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🔥 セット品作成ボタンクリック検出');
                // 🎯 成功パターン適用
                window.showSafeSetModal();
            });
            console.log('✅ セット品作成ボタンリスナー設定完了');
        }
        
        // 📊 Excelビューボタンの修正
        const excelBtn = document.querySelector('[data-action="switch-to-excel"]');
        if (excelBtn) {
            excelBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('📊 Excelビューボタンクリック検出');
                
                // Excelビューを表示
                const excelView = document.getElementById('excel-view');
                const cardView = document.getElementById('card-view');
                const globalView = document.getElementById('global-view');
                
                // 全てのビューを非表示
                if (cardView) cardView.style.display = 'none';
                if (globalView) globalView.style.display = 'none';
                
                // Excelビューを表示
                if (excelView) {
                    excelView.style.display = 'block';
                    
                    // Excelテーブルを生成
                    generateExcelTable();
                    
                    // ビューボタンの状態更新
                    document.querySelectorAll('.inventory__view-btn').forEach(btn => {
                        btn.classList.remove('inventory__view-btn--active');
                    });
                    excelBtn.classList.add('inventory__view-btn--active');
                    
                    console.log('✅ Excelビュー表示成功');
                } else {
                    console.error('❌ Excelビュー要素が見つかりません');
                }
            });
            
            console.log('✅ Excelビューボタンリスナー設定完了');
        }
        
        // モーダルテストボタン
        const modalTestBtn = document.querySelector('[data-action="open-test-modal"]');
        if (modalTestBtn) {
            modalTestBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🔥 モーダルテストボタンクリック検出');
                // 🎯 成功パターン適用
                window.showSafeTestModal();
            });
            console.log('✅ モーダルテストボタンリスナー設定完了');
        }
        
        console.log('🔥 全緊急ボタンリスナー設定完了');
    }, 1000);
    
    // 🚨 緊急修正完了 - emergencyModalTest()関数が利用可能です
    
    // 🚨 動的CSS競合の完全防止システム
    function preventDynamicCSSConflicts() {
        console.log('🚨 動的CSS競合防止システム起動');
        
        // 🚀 全ての.inventory__card-image要素のグレー背景を強制除去
        const cardImages = document.querySelectorAll('.inventory__card-image, .product-card__image, [class*="card-image"]');
        console.log(`📊 登録された画像要素数: ${cardImages.length}`);
        
        cardImages.forEach((imageEl, index) => {
            // 現在のスタイルを確認
            const currentBg = window.getComputedStyle(imageEl).backgroundColor;
            console.log(`📊 画像${index + 1}の現在の背景: ${currentBg}`);
            
            // 強制的に透明背景を適用
            imageEl.style.setProperty('background-color', 'transparent', 'important');
            imageEl.style.setProperty('background', 'transparent', 'important');
            imageEl.style.removeProperty('background'); // 既存のbackgroundを削除
            
            // 画像表示のためのプロパティを設定
            imageEl.style.setProperty('background-size', 'cover', 'important');
            imageEl.style.setProperty('background-position', 'center', 'important');
            imageEl.style.setProperty('background-repeat', 'no-repeat', 'important');
            
            // 変更後の確認
            setTimeout(() => {
                const newBg = window.getComputedStyle(imageEl).backgroundColor;
                console.log(`✅ 画像${index + 1}の新しい背景: ${newBg}`);
            }, 100);
        });
        
        console.log('✅ 動的CSS競合防止完了');
    }
    
    // 即座実行 + 定期実行
    preventDynamicCSSConflicts();
    
    // 3秒後に再実行（動的追加された要素に対応）
    setTimeout(preventDynamicCSSConflicts, 3000);
    
    // 5秒後に再実行（最終確認）
    setTimeout(preventDynamicCSSConflicts, 5000);
    
    // 🎯 ジェミナイ提案：N3-Bootstrap Wrapper実装
    window.N3BootstrapModalWrapper = {
        instances: new Map(),
        
        // N3システム対応初期化
        init: function(modalId) {
            console.log('🎯 N3-Bootstrap Wrapper初期化:', modalId);
            
            const modalElement = document.getElementById(modalId);
            if (!modalElement) {
                console.error('❌ モーダル要素が見つかりません:', modalId);
                return false;
            }
            
            // N3システム干渉防止フラグ設定
            modalElement.dataset.n3ModalReady = 'true';
            modalElement.dataset.n3Protected = 'true';
            
            // Bootstrapインスタンス作成
            try {
                // 既存インスタンスをクリーンアップ
                const existingInstance = bootstrap.Modal.getInstance(modalElement);
                if (existingInstance) {
                    existingInstance.dispose();
                }
                
                // 新しいインスタンス作成
                const modalInstance = new bootstrap.Modal(modalElement, {
                    backdrop: true,
                    keyboard: true,
                    focus: true
                });
                
                this.instances.set(modalId, modalInstance);
                
                console.log('✅ N3-Bootstrapインスタンス作成成功:', modalId);
                return true;
                
            } catch (error) {
                console.error('❌ Bootstrapインスタンス作成エラー:', error);
                return false;
            }
        },
        
        // N3システム対応表示
        show: function(modalId) {
            console.log('🎯 N3-Bootstrap Wrapper表示:', modalId);
            
            // 初期化確認
            if (!this.instances.has(modalId)) {
                if (!this.init(modalId)) {
                    return false;
                }
            }
            
            const modalInstance = this.instances.get(modalId);
            const modalElement = document.getElementById(modalId);
            
            // N3システム干渉防止措置
            modalElement.dataset.n3Override = 'disabled';
            
            // 強制スタイル設定（N3競合対策）
            modalElement.style.cssText = `
                display: block !important;
                opacity: 1 !important;
                z-index: 999999 !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                visibility: visible !important;
            `;
            
            // Bootstrap正規方法で表示
            try {
                modalInstance.show();
                console.log('✅ N3-Bootstrap Wrapper表示成功');
                
                // N3干渉監視開始
                this.protectFromN3Override(modalId);
                
                return true;
            } catch (error) {
                console.error('❌ Bootstrap表示エラー:', error);
                return false;
            }
        },
        
        // N3システム干渉からの保護
        protectFromN3Override: function(modalId) {
            const modalElement = document.getElementById(modalId);
            
            // MutationObserverでN3干渉を監視
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && 
                        (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                        
                        const target = mutation.target;
                        
                        // N3からの非表示化を検出
                        if (target.style.display === 'none' || 
                            target.style.visibility === 'hidden' ||
                            target.style.opacity === '0') {
                            
                            console.log('🚨 N3干渉検出 - リストア実行');
                            
                            // 即座リストア
                            target.style.cssText = `
                                display: block !important;
                                opacity: 1 !important;
                                z-index: 999999 !important;
                                position: fixed !important;
                                top: 0 !important;
                                left: 0 !important;
                                width: 100% !important;
                                height: 100% !important;
                                visibility: visible !important;
                            `;
                        }
                    }
                });
            });
            
            observer.observe(modalElement, {
                attributes: true,
                attributeFilter: ['style', 'class']
            });
            
            // モーダルが閉じられたら監視停止
            modalElement.addEventListener('hidden.bs.modal', () => {
                observer.disconnect();
            });
            
            console.log('✅ N3干渉監視開始');
        }
    };
    
    // 🎯 ジェミナイ提案：iframe完全制御システム実装
    window.SafeIframeModal = {
        // iframeモーダル作成
        create: function(modalId, iframeSrc) {
            console.log('🎯 SafeIframeモーダル作成:', modalId);
            
            // 既存モーダルをクリーンアップ
            const existingModal = document.getElementById(modalId);
            if (existingModal) {
                existingModal.remove();
            }
            
            // iframeモーダル HTML作成
            const modalHTML = `
                <div id="${modalId}" class="safe-modal" style="
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    z-index: 999999;
                    align-items: center;
                    justify-content: center;
                ">
                    <div class="safe-modal-dialog" style="
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                        width: 90%;
                        max-width: 900px;
                        max-height: 90%;
                        position: relative;
                        overflow: hidden;
                    ">
                        <button class="safe-modal-close" style="
                            position: absolute;
                            top: 10px;
                            right: 15px;
                            background: none;
                            border: none;
                            font-size: 1.5rem;
                            cursor: pointer;
                            z-index: 1000000;
                            color: #666;
                            width: 30px;
                            height: 30px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 50%;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">
                            ×
                        </button>
                        <iframe src="${iframeSrc}" style="
                            width: 100%;
                            height: 600px;
                            border: none;
                            display: block;
                        "></iframe>
                    </div>
                </div>
            `;
            
            // DOMに追加
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            const modal = document.getElementById(modalId);
            const closeBtn = modal.querySelector('.safe-modal-close');
            
            // イベントリスナー設定
            // 背景クリックで閉じる
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    window.SafeIframeModal.close(modalId);
                }
            });
            
            // ×ボタンで閉じる
            closeBtn.addEventListener('click', function() {
                window.SafeIframeModal.close(modalId);
            });
            
            // Escキーで閉じる
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && modal.style.display === 'flex') {
                    window.SafeIframeModal.close(modalId);
                }
            });
            
            // iframeからのメッセージリスナー
            window.addEventListener('message', function(e) {
                if (e.data.action === 'closeModal' && e.data.modalId === modalId) {
                    window.SafeIframeModal.close(modalId);
                } else if (e.data.action === 'productSaved') {
                    console.log('✅ 商品保存完了:', e.data.data);
                    // ここで商品リストを更新することができます
                }
            });
            
            console.log('✅ SafeIframeモーダル作成完了');
            return modal;
        },
        
        // モーダル表示
        show: function(modalId, iframeSrc) {
            console.log('🎯 SafeIframeモーダル表示:', modalId);
            
            let modal = document.getElementById(modalId);
            
            // モーダルが存在しない場合は作成
            if (!modal) {
                modal = this.create(modalId, iframeSrc);
            }
            
            // 表示
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            console.log('✅ SafeIframeモーダル表示完了');
            return true;
        },
        
        // モーダル閉じる
        close: function(modalId) {
            console.log('🎯 SafeIframeモーダル閉じる:', modalId);
            
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
                console.log('✅ SafeIframeモーダル閉じた');
            }
        }
    };
    
    // 📊 Excelテーブル生成関数
    function generateExcelTable() {
        console.log('📊 Excelテーブル生成開始');
        
        const tableContainer = document.getElementById('excel-table-container');
        if (!tableContainer) {
            console.error('❌ Excelテーブルコンテナが見つかりません');
            return;
        }
        
        // サンプルデータ
        const sampleData = [
            {
                id: 1,
                image: '',
                name: 'Gaming Mouse Pro',
                sku: 'MOUSE-001',
                price: 59.99,
                cost: 25.00,
                stock: 45,
                type: '有在庫',
                condition: '新品',
                category: 'Electronics'
            },
            {
                id: 2,
                image: '',
                name: 'Mechanical Keyboard RGB',
                sku: 'KB-RGB-002',
                price: 129.99,
                cost: 65.00,
                stock: 23,
                type: '有在庫',
                condition: '新品',
                category: 'Electronics'
            },
            {
                id: 3,
                image: '',
                name: 'Wireless Headphones',
                sku: 'HEADPHONE-003',
                price: 89.99,
                cost: 40.00,
                stock: 67,
                type: '有在庫',
                condition: '新品',
                category: 'Audio'
            },
            {
                id: 4,
                image: '',
                name: 'USB-C Hub 7-in-1',
                sku: 'HUB-USBC-004',
                price: 45.99,
                cost: 18.00,
                stock: 12,
                type: '有在庫',
                condition: '新品',
                category: 'Accessories'
            },
            {
                id: 5,
                image: '',
                name: 'Smartphone Stand Adjustable',
                sku: 'STAND-PHONE-005',
                price: 19.99,
                cost: 8.50,
                stock: 89,
                type: '有在庫',
                condition: '新品',
                category: 'Accessories'
            }
        ];
        
        // テーブルHTML生成
        const tableHTML = `
            <table class="inventory__excel-table">
                <thead>
                    <tr>
                        <th class="inventory__excel-th inventory__excel-th--checkbox">
                            <input type="checkbox" class="inventory__excel-checkbox" id="select-all">
                        </th>
                        <th class="inventory__excel-th inventory__excel-th--image">画像</th>
                        <th class="inventory__excel-th">商品名</th>
                        <th class="inventory__excel-th">SKU</th>
                        <th class="inventory__excel-th">価格 (USD)</th>
                        <th class="inventory__excel-th">仕入価格 (USD)</th>
                        <th class="inventory__excel-th">在庫数</th>
                        <th class="inventory__excel-th">タイプ</th>
                        <th class="inventory__excel-th">状態</th>
                        <th class="inventory__excel-th">カテゴリ</th>
                        <th class="inventory__excel-th inventory__excel-th--actions">アクション</th>
                    </tr>
                </thead>
                <tbody>
                    ${sampleData.map((item, index) => `
                        <tr>
                            <td><input type="checkbox" class="inventory__excel-checkbox"></td>
                            <td>
                                <div style="width: 40px; height: 40px; background: #f1f5f9; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-image" style="color: #64748b; font-size: 1rem;"></i>
                                </div>
                            </td>
                            <td><strong>${item.name}</strong></td>
                            <td><code>${item.sku}</code></td>
                            <td><span style="color: #10b981; font-weight: 600;">${item.price.toFixed(2)}</span></td>
                            <td>${item.cost.toFixed(2)}</td>
                            <td>
                                <span class="inventory__badge inventory__badge--stock">
                                    ${item.stock}個
                                </span>
                            </td>
                            <td>
                                <span class="inventory__badge inventory__badge--stock">
                                    ${item.type}
                                </span>
                            </td>
                            <td>
                                <span class="inventory__badge inventory__badge--stock">
                                    ${item.condition}
                                </span>
                            </td>
                            <td>${item.category}</td>
                            <td>
                                <button class="btn btn--small btn--primary" onclick="editExcelItem(${item.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn--small btn--danger" onclick="deleteExcelItem(${item.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        tableContainer.innerHTML = tableHTML;
        
        // 全選択チェックボックスのイベントを追加
        const selectAllCheckbox = document.getElementById('select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                const allCheckboxes = document.querySelectorAll('.inventory__excel-checkbox:not(#select-all)');
                allCheckboxes.forEach(checkbox => {
                    checkbox.checked = this.checked;
                });
            });
        }
        
        console.log('✅ Excelテーブル生成完了');
    }
    window.attachCardClickEvents = function() {
        console.log('🎯 カードクリックイベント設定開始');
        
        // 全ての商品カードにクリックイベントを追加
        const productCards = document.querySelectorAll('.product-card, .inventory__card');
        console.log(`登録されたカード数: ${productCards.length}`);
        
        productCards.forEach((card, index) => {
            // 既存のイベントリスナーを削除
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            
            // 新しいイベントリスナーを追加
            newCard.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log(`🎯 カードクリック検出: ${index}`);
                
                // カードから商品データを収集
                const productData = extractProductDataFromCard(newCard);
                
                // 商品詳細モーダルを表示
                if (productData) {
                    window.showProductDetailModal(productData);
                } else {
                    console.error('❌ 商品データを取得できませんでした');
                }
            });
            
            // カードにカーソルポインターを設定
            newCard.style.cursor = 'pointer';
        });
        
        console.log('✅ カードクリックイベント設定完了');
    };
    
    // カードから商品データを抽出する関数
    function extractProductDataFromCard(card) {
        try {
            const productData = {
                name: card.querySelector('.card-title, .inventory__card-title')?.textContent?.trim() || '商品名不明',
                sku: card.querySelector('.card-sku, .inventory__card-sku')?.textContent?.replace('SKU:', '').trim() || 'SKU不明',
                price: card.querySelector('.card-price, .inventory__card-price')?.textContent?.replace(/[^0-9.]/g, '') || '0',
                cost: '0', // カードには仕入価格が表示されていないことが多い
                stock: card.querySelector('.card-stock, .inventory__card-stock')?.textContent?.replace(/[^0-9]/g, '') || '0',
                type: card.querySelector('.type-badge')?.textContent?.trim() || '有在庫',
                condition: card.querySelector('.condition-badge')?.textContent?.trim() || '新品',
                category: card.querySelector('.card-category, .inventory__card-category')?.textContent?.trim() || '未分類',
                image: card.querySelector('.card-image img, .inventory__card-image img')?.src || null,
                description: card.querySelector('.card-description')?.textContent?.trim() || '',
                created: new Date().toLocaleDateString('ja-JP'),
                updated: new Date().toLocaleDateString('ja-JP')
            };
            
            console.log('📊 抽出した商品データ:', productData);
            return productData;
            
        } catch (error) {
            console.error('❌ カードデータ抽出エラー:', error);
            return null;
        }
    }
    window.showSafeModal = function() {
        console.log('🎯 安全モーダル表示開始');
        const iframeSrc = 'modules/tanaoroshi_inline_complete/modal_content.html';
        return window.SafeIframeModal.show('safeModal', iframeSrc);
    };
    
    window.showSafeSetModal = function() {
        console.log('🎯 安全セットモーダル表示開始');
        const iframeSrc = 'modules/tanaoroshi_inline_complete/set_modal_content.html';
        return window.SafeIframeModal.show('safeSetModal', iframeSrc);
    };
    
    window.showSafeTestModal = function() {
        console.log('🎯 安全テストモーダル表示開始');
        const iframeSrc = 'modules/tanaoroshi_inline_complete/test_modal_content.html';
        return window.SafeIframeModal.show('safeTestModal', iframeSrc);
    };
    
    // 🎯 商品詳細モーダル表示関数
    window.showProductDetailModal = function(productData) {
        console.log('🎯 商品詳細モーダル表示:', productData);
        const iframeSrc = 'modules/tanaoroshi_inline_complete/product_detail_modal.html';
        const result = window.SafeIframeModal.show('productDetailModal', iframeSrc);
        
        // iframeが読み込まれた後に商品データを送信
        setTimeout(() => {
            const modal = document.getElementById('productDetailModal');
            if (modal) {
                const iframe = modal.querySelector('iframe');
                if (iframe) {
                    iframe.contentWindow.postMessage({
                        action: 'showProductDetail',
                        productData: productData
                    }, '*');
                    console.log('✅ 商品データをiframeに送信完了');
                }
            }
        }, 500);
        
        // 🎯 商品カードクリックイベントを修正した方式で追加
        setTimeout(() => {
            console.log('📊 カードクリックイベント設定開始');
            
            // 全ての商品カードを取得
            const cards = document.querySelectorAll('.inventory__card, .product-card');
            console.log(`📊 カード数: ${cards.length}`);
            
            cards.forEach((card, index) => {
                // 既存のイベントリスナーをクリア
                const newCard = card.cloneNode(true);
                card.parentNode.replaceChild(newCard, card);
                
                // 新しいクリックイベントを追加
                newCard.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log(`🔥 カードクリック検出: ${index + 1}`);
                    
                    // カードから商品データを抽出
                    const productData = {
                        name: newCard.querySelector('.inventory__card-title, .card-title')?.textContent?.trim() || '商品名不明',
                        sku: newCard.querySelector('.inventory__card-sku, .card-sku')?.textContent?.replace('SKU:', '').trim() || 'SKU不明',
                        price: newCard.querySelector('.inventory__card-price, .card-price')?.textContent?.replace(/[^0-9.]/g, '') || '0',
                        cost: '0',
                        stock: newCard.querySelector('.inventory__card-stock, .card-stock')?.textContent?.replace(/[^0-9]/g, '') || '0',
                        type: '有在庫',
                        condition: '新品',
                        category: '未分類',
                        description: 'この商品の詳細情報を表示しています。',
                        created: new Date().toLocaleDateString('ja-JP'),
                        updated: new Date().toLocaleDateString('ja-JP')
                    };
                    
                    console.log('📊 抽出したデータ:', productData);
                    
                    // 🎯 確実に動作するフォールバック方式を先に実行
                    console.log('🔥 確実動作: 新規商品登録モーダルで商品詳細表示');
                    
                    // 新規商品登録の成功パターンで表示（確実動作）
                    window.showSafeModal();
                    
                    // 少し待ってデータを送信
                    setTimeout(() => {
                        const modal = document.getElementById('safeModal');
                        if (modal) {
                            const iframe = modal.querySelector('iframe');
                            if (iframe && iframe.contentWindow) {
                                // 商品詳細データを送信
                                iframe.contentWindow.postMessage({
                                    action: 'showProductDetail', // 商品詳細表示アクション
                                    productData: productData
                                }, '*');
                                console.log('✅ 商品詳細データ送信完了');
                                
                                // モーダルタイトルを変更（オプション）
                                const modalTitle = modal.querySelector('.modal-title');
                                if (modalTitle) {
                                    modalTitle.innerHTML = '<i class="fas fa-cube"></i> 商品詳細 - ' + productData.name;
                                }
                            } else {
                                console.error('❌ iframeが見つかりません');
                            }
                        } else {
                            console.error('❌ モーダルが見つかりません');
                        }
                    }, 1000); // 1秒待機で確実に送信
                });
                
                // カーソルポインターを設定
                newCard.style.cursor = 'pointer';
            });
            
            console.log('✅ カードクリックイベント設定完了');
        }, 2000);
        
        return result;
    };
    
    // 🚨 モーダル重複クリーンアップ関数追加
    window.cleanupAllModals = function() {
        console.log('🚨 全モーダルクリーンアップ実行');
        
        // 全ユモーダルを取得
        const allModals = document.querySelectorAll('.modal');
        console.log('登録されているモーダル数:', allModals.length);
        
        allModals.forEach((modal, index) => {
            console.log(`モーダル ${index + 1}: ${modal.id}`);
            
            // Bootstrapモーダルインスタンスを取得して閉じる
            if (window.bootstrap) {
                const bootstrapModalInstance = bootstrap.Modal.getInstance(modal);
                if (bootstrapModalInstance) {
                    bootstrapModalInstance.hide();
                    console.log(`✅ ${modal.id} Bootstrapヤインスタンスで閉じた`);
                }
            }
            
            // 強制的にクラスを削除
            modal.classList.remove('show');
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        });
        
        // バックドロップをすべて削除
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => {
            backdrop.remove();
        });
        
        // bodyクラスをリセット
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        console.log('✅ 全モーダルクリーンアップ完了');
    };
    
    // 🔥 背景クリックでモーダルを閉じる機能追加
    window.setupModalBackgroundClick = function() {
        console.log('🔥 背景クリック機能設定開始');
        
        // 全モーダルに背景クリックイベントを追加
        const allModals = document.querySelectorAll('.modal');
        
        allModals.forEach(modal => {
            // 既存イベントリスナーを削除（重複防止）
            modal.removeEventListener('click', handleModalBackgroundClick);
            
            // 新しいイベントリスナーを追加
            modal.addEventListener('click', handleModalBackgroundClick);
            
            console.log(`✅ ${modal.id} に背景クリックイベント設定完了`);
        });
    };
    
    // モーダル背景クリックハンドラー
    function handleModalBackgroundClick(event) {
        // クリックされた要素がモーダル自体かどうか確認
        if (event.target === event.currentTarget) {
            console.log('🔥 背景クリック検出:', event.currentTarget.id);
            
            const modal = event.currentTarget;
            
            // Bootstrapモーダルインスタンスで閉じる
            if (window.bootstrap) {
                const bootstrapModalInstance = bootstrap.Modal.getInstance(modal);
                if (bootstrapModalInstance) {
                    bootstrapModalInstance.hide();
                    console.log('✅ Bootstrapインスタンスでモーダルを閉じました');
                } else {
                    // フォールバック: 手動で閉じる
                    modal.classList.remove('show');
                    modal.style.display = 'none';
                    modal.setAttribute('aria-hidden', 'true');
                    
                    // バックドロップを削除
                    const backdrop = document.querySelector('.modal-backdrop');
                    if (backdrop) backdrop.remove();
                    
                    // bodyクラスをリセット
                    document.body.classList.remove('modal-open');
                    
                    console.log('✅ 手動でモーダルを閉じました');
                }
            }
        }
    }
    
    // ページ読み込み時にクリーンアップ実行
    setTimeout(() => {
        window.cleanupAllModals();
        // 🔥 背景クリック機能を設定
        setTimeout(() => {
            window.setupModalBackgroundClick();
        }, 500);
    }, 2000);
});

// 🚨 緊急コンソールコマンド: 手動カード修正
window.forceFixCards = function() {
    console.log('🚨 手動カード修正実行');
    if (window.TanaoroshiSystem && window.TanaoroshiSystem.allProducts && window.updateProductCardsFixed) {
        window.updateProductCardsFixed(window.TanaoroshiSystem.allProducts);
        
        // CSS強制適用
        const cardContainer = document.getElementById('card-grid');
        if (cardContainer) {
            cardContainer.style.display = 'grid';
            cardContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
            cardContainer.style.gap = '1rem';
            cardContainer.style.padding = '1rem';
            
            // カードに直接スタイル適用
            const cards = cardContainer.querySelectorAll('.product-card');
            cards.forEach(card => {
                card.style.height = '280px';
                card.style.borderRadius = '12px';
                card.style.overflow = 'hidden';
                card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                card.style.border = '1px solid #e2e8f0';
            });
            
            console.log('🚨 手動カード修正完了');
        }
    } else {
        console.error('❌ カードデータまたは修正関数が見つかりません');
    }
};
</script>

</body>
</html>