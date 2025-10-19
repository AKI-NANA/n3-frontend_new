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
    <title><?php echo safe_output('棚卸しシステム - PostgreSQL完全統合版'); ?></title>
    
    <!-- 外部リソース -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    
    <!-- 絶対パス指定によるCSS読み込み -->
    <link rel="stylesheet" href="/modules/tanaoroshi_inline_complete/assets/tanaoroshi_inventory_complete.css?v=<?php echo time(); ?>">
    
    <!-- ブラウザキャッシュ強制クリア用のランダムパラメーター -->
    <style>
    /* キャッシュクリア用ダミースタイル */
    .cache-clear-v<?php echo time(); ?> { display: none; }
    </style>
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
                <?php echo safe_output('棚卸しシステム（PostgreSQL完全統合版）'); ?>
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
            
            <button class="btn btn--info" onclick="loadPostgreSQLData()">
                <i class="fas fa-database"></i>
                <?php echo safe_output('PostgreSQLデータ取得'); ?>
            </button>
            
            <button class="btn btn--warning" onclick="syncEbayData()">
                <i class="fas fa-sync"></i>
                <?php echo safe_output('eBay同期実行'); ?>
            </button>
        </div>
    </div>

    <!-- カードビュー -->
    <div class="inventory__grid" id="card-view">
        <!-- データはJavaScriptで動的に生成されます -->
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
                <span id="table-info"><?php echo safe_output('PostgreSQL接続中...'); ?></span>
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

    <!-- JavaScript - PostgreSQL完全統合版 -->
    <script>
    // グローバル変数の安全な初期化
    window.inventorySystem = window.inventorySystem || {};
    window.inventorySystem.selectedProducts = [];
    window.inventorySystem.exchangeRate = 150.25;
    window.inventorySystem.currentData = [];
    window.inventorySystem.databaseConnected = false;
    
    // エラーハンドリング強化
    window.addEventListener('error', function(e) {
        console.error('⚠️ JavaScript エラーキャッチ:', e.message);
        return true;
    });

    // DOM初期化
    var isInventoryInitialized = false;
    document.addEventListener('DOMContentLoaded', function() {
        if (isInventoryInitialized) {
            console.log('⚠️ 重複初期化を防止');
            return;
        }
        isInventoryInitialized = true;
        
        console.log('🚀 棚卸しシステム（PostgreSQL完全統合版）初期化開始');
        setupEventListeners();
        
        // 初期データベース状態確認
        checkDatabaseStatus();
        
        // 自動的にPostgreSQLデータを読み込み
        setTimeout(loadPostgreSQLData, 1000);
        
        console.log('✅ PostgreSQL統合版初期化完了');
    });
    
    // PostgreSQLデータ読み込み（メイン機能）
    async function loadPostgreSQLData() {
        console.log('🐘 PostgreSQLデータ読み込み開始');
        
        try {
            showLoading();
            updateDatabaseStatus('connecting', 'PostgreSQL接続中...');
            
            // N3準拠でPOSTリクエスト
            const response = await fetch(window.location.href, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: new URLSearchParams({
                    'ajax_action': 'get_inventory',
                    'handler': 'postgresql_ebay',
                    'limit': '100'
                })
            });
            
            console.log('📡 Response Status:', response.status);
            console.log('📡 Response Headers:', response.headers.get('content-type'));
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            console.log('🔍 PostgreSQLデータ取得結果:', {
                success: result.success,
                dataCount: result.data ? result.data.length : 0,
                message: result.message
            });
            
            if (result.success && result.data && Array.isArray(result.data)) {
                if (result.data.length > 0) {
                    console.log('✅ PostgreSQLデータ取得成功:', result.data.length, '件');
                    const convertedData = convertPostgreSQLDataToInventory(result.data);
                    window.inventorySystem.currentData = convertedData;
                    updateProductCards(convertedData);
                    updateStatistics(convertedData);
                    updateDatabaseStatus('connected', `PostgreSQL接続済み (${result.data.length}件)`);
                    
                    // 成功通知
                    showNotification('PostgreSQLデータ読み込み完了', 
                        result.data.length + '件のeBayデータを取得しました', 'success');
                } else {
                    console.log('⚠️ PostgreSQLデータが空です');
                    updateDatabaseStatus('connected', 'PostgreSQL接続済み (データなし)');
                    showNotification('PostgreSQLデータが空です', 
                        'eBay同期を実行してデータを取得してください', 'warning');
                }
            } else {
                console.error('❌ PostgreSQLデータ取得エラー:', result.error || result.message);
                updateDatabaseStatus('error', 'PostgreSQL接続エラー');
                showNotification('PostgreSQLデータ取得エラー', 
                    result.error || result.message || 'データベース接続に失敗しました', 'error');
            }
            
        } catch (error) {
            console.error('❌ PostgreSQL処理エラー:', error.name, error.message);
            updateDatabaseStatus('error', 'PostgreSQL接続失敗');
            
            // エラー通知
            showNotification('PostgreSQL接続エラー', 
                'データベースに接続できませんでした: ' + error.message, 'error');
            
        } finally {
            hideLoading();
        }
    }
    
    // eBay API同期実行
    async function syncEbayData() {
        console.log('🔄 eBay API同期開始');
        
        try {
            showLoading();
            updateDatabaseStatus('syncing', 'eBay API同期中...');
            
            const response = await fetch(window.location.href, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: new URLSearchParams({
                    'ajax_action': 'sync_ebay_data',
                    'handler': 'postgresql_ebay'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            console.log('🔄 eBay同期結果:', result);
            
            if (result.success) {
                console.log('✅ eBay API同期成功');
                showNotification('eBay API同期完了', result.message, 'success');
                updateDatabaseStatus('connected', 'PostgreSQL接続済み (同期完了)');
                
                // 同期後にデータを再読み込み
                setTimeout(loadPostgreSQLData, 2000);
            } else {
                console.error('❌ eBay同期エラー:', result.error);
                showNotification('eBay API同期エラー', result.error, 'error');
                updateDatabaseStatus('error', 'eBay同期失敗');
            }
            
        } catch (error) {
            console.error('❌ eBay同期処理エラー:', error);
            showNotification('eBay同期エラー', error.message, 'error');
            updateDatabaseStatus('error', 'eBay同期失敗');
        } finally {
            hideLoading();
        }
    }
    
    // データベース状態確認
    async function checkDatabaseStatus() {
        try {
            const response = await fetch(window.location.href, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: new URLSearchParams({
                    'ajax_action': 'database_status',
                    'handler': 'postgresql_ebay'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('📊 データベース状態:', result.data);
                
                if (result.success && result.data) {
                    const status = result.data;
                    if (status.postgresql_connected && status.table_exists) {
                        updateDatabaseStatus('connected', 
                            `PostgreSQL接続済み (${status.record_count}件)`);
                        window.inventorySystem.databaseConnected = true;
                    } else {
                        updateDatabaseStatus('error', 'PostgreSQL未設定');
                        window.inventorySystem.databaseConnected = false;
                    }
                }
            }
        } catch (error) {
            console.log('⚠️ データベース状態確認失敗:', error.message);
            updateDatabaseStatus('error', 'PostgreSQL接続確認失敗');
            window.inventorySystem.databaseConnected = false;
        }
    }
    
    // データベース状態UI更新
    function updateDatabaseStatus(status, text) {
        const statusEl = document.getElementById('database-status');
        const textEl = document.getElementById('database-status-text');
        
        if (!statusEl || !textEl) return;
        
        // 既存クラス削除
        statusEl.classList.remove('database-status--connected', 'database-status--disconnected', 'database-status--connecting');
        
        switch (status) {
            case 'connected':
                statusEl.classList.add('database-status--connected');
                break;
            case 'syncing':
            case 'connecting':
                statusEl.classList.add('database-status--connecting');
                break;
            case 'error':
            default:
                statusEl.classList.add('database-status--disconnected');
                break;
        }
        
        textEl.textContent = text;
    }
    
    // PostgreSQLデータを棚卸し形式に変換
    function convertPostgreSQLDataToInventory(postgresqlData) {
        return postgresqlData.map(function(item, index) {
            // PostgreSQLデータ構造を棚卸し形式に変換
            return {
                id: item.item_id || item.id || index + 1,
                name: item.title || item.name || 'タイトル不明',
                sku: item.sku || item.item_id || 'SKU-' + (index + 1).toString().padStart(6, '0'),
                type: determineProductType(item),
                condition: item.condition || item.condition_name || 'used',
                priceUSD: parseFloat(item.priceUSD || item.current_price || item.price || 0),
                costUSD: parseFloat(item.costUSD || item.start_price || 0),
                stock: parseInt(item.stock || item.quantity || 0),
                category: item.category || item.category_name || 'その他',
                channels: ['ebay'],
                image: item.image || item.gallery_url || item.image_url || '',
                listing_status: item.listing_status || 'アクティブ',
                watchers_count: parseInt(item.watchers_count || item.watch_count || 0),
                views_count: parseInt(item.views_count || item.view_count || 0),
                ebay_item_id: item.ebay_item_id || item.item_id,
                ebay_url: item.ebay_url || '',
                data_source: 'postgresql_live',
                created_at: item.created_at,
                updated_at: item.updated_at
            };
        });
    }
    
    // 商品種別判定
    function determineProductType(item) {
        const quantity = parseInt(item.quantity || item.stock || 0);
        const title = (item.title || item.name || '').toLowerCase();
        
        if (title.indexOf('set') !== -1 || title.indexOf('bundle') !== -1) {
            return 'set';
        } else if (quantity > 10) {
            return 'stock';
        } else if (quantity === 0) {
            return 'dropship';
        } else {
            return 'hybrid';
        }
    }
    
    // 商品カード作成
    function createProductCard(product) {
        const badgeClass = 'inventory__badge--' + product.type;
        const badgeText = {
            'stock': '有在庫',
            'dropship': '無在庫', 
            'set': 'セット品',
            'hybrid': 'ハイブリッド'
        }[product.type] || '不明';
        
        const priceJPY = Math.round(product.priceUSD * window.inventorySystem.exchangeRate);
        
        // 画像表示部分
        let imageHtml;
        if (product.image && product.image.trim() !== '') {
            imageHtml = '<img src="' + product.image + '" alt="' + product.name + '" class="inventory__card-img" onload="console.log(\'画像読み込み成功\')" onerror="this.style.display=\'none\'; this.parentNode.innerHTML=\'<div class=\\\"inventory__card-placeholder\\\"><i class=\\\"fas fa-image\\\"></i><span>画像エラー</span></div>\'">';
        } else {
            imageHtml = '<div class="inventory__card-placeholder"><i class="fas fa-image"></i><span>画像なし</span></div>';
        }
        
        const stockInfo = (product.type === 'stock' || product.type === 'hybrid') ?
            '<span style="color: #10b981; font-size: 0.75rem; font-weight: 600;">在庫:' + product.stock + '</span>' :
            '<span style="color: #06b6d4; font-size: 0.75rem;">' + product.listing_status + '</span>';
        
        return [
            '<div class="inventory__card" data-id="' + product.id + '" data-ebay-url="' + (product.ebay_url || '') + '">',
                '<div class="inventory__card-image">',
                    imageHtml,
                    '<div class="inventory__card-badges">',
                        '<span class="inventory__badge ' + badgeClass + '">' + badgeText + '</span>',
                        '<div class="inventory__channel-badges">',
                            '<span class="inventory__channel-badge inventory__channel-badge--ebay">E</span>',
                        '</div>',
                    '</div>',
                '</div>',
                '<div class="inventory__card-info">',
                    '<h3 class="inventory__card-title" title="' + product.name + '">' + product.name + '</h3>',
                    '<div class="inventory__card-price">',
                        '<div class="inventory__card-price-main">$' + product.priceUSD.toFixed(2) + '</div>',
                        '<div class="inventory__card-price-sub">¥' + priceJPY.toLocaleString() + '</div>',
                    '</div>',
                    '<div class="inventory__card-footer">',
                        '<span class="inventory__card-sku" title="' + product.sku + '">' + product.sku + '</span>',
                        stockInfo,
                    '</div>',
                '</div>',
            '</div>'
        ].join('');
    }
    
    // 商品カード更新
    function updateProductCards(products) {
        const cardContainer = document.getElementById('card-view');
        if (!cardContainer) return;
        
        const cardsHtml = products.map(function(product) {
            return createProductCard(product);
        }).join('');
        
        cardContainer.innerHTML = cardsHtml;
        
        // カードイベントリスナー再設定
        const cards = cardContainer.querySelectorAll('.inventory__card');
        cards.forEach(function(card) {
            card.addEventListener('click', function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                selectCard(this);
            });
        });
        
        // Excelビューも更新
        updateProductTable(products);
    }
    
    // Excelビューテーブル更新
    function updateProductTable(products) {
        const tableBody = document.getElementById('products-table-body');
        if (!tableBody) return;
        
        const rowsHtml = products.map(function(product) {
            return createProductTableRow(product);
        }).join('');
        
        tableBody.innerHTML = rowsHtml;
        
        // テーブル情報更新
        const tableInfo = document.getElementById('table-info');
        if (tableInfo) {
            tableInfo.textContent = 'PostgreSQL連携: 合計 ' + products.length + ' 件の商品';
        }
    }
    
    // 商品テーブル行作成
    function createProductTableRow(product) {
        const typeOptions = {
            'stock': '有在庫',
            'dropship': '無在庫',
            'set': 'セット品',
            'hybrid': 'ハイブリッド'
        };
        
        const conditionText = product.condition === 'new' ? '新品' : '中古';
        const profit = (product.priceUSD - product.costUSD).toFixed(2);
        
        const imageHtml = product.image ? 
            '<img src="' + product.image + '" alt="商品画像" style="width: 40px; height: 32px; object-fit: cover; border-radius: 4px;" onerror="this.style.display=\'none\'">' :
            '<div style="width: 40px; height: 32px; background: #f1f5f9; border-radius: 4px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-image" style="color: #94a3b8;"></i></div>';
        
        return [
            '<tr data-id="' + product.id + '">',
                '<td><input type="checkbox" class="excel-checkbox product-checkbox" data-id="' + product.id + '" /></td>',
                '<td>' + imageHtml + '</td>',
                '<td>' + product.name + '</td>',
                '<td>' + product.sku + '</td>',
                '<td>' + (typeOptions[product.type] || product.type) + '</td>',
                '<td>' + conditionText + '</td>',
                '<td>$' + product.priceUSD.toFixed(2) + '</td>',
                '<td>' + product.stock + '</td>',
                '<td>$' + product.costUSD.toFixed(2) + '</td>',
                '<td style="color: #10b981; font-weight: 600;">$' + profit + '</td>',
                '<td>eBay</td>',
                '<td>' + product.category + '</td>',
                '<td>',
                    '<div style="display: flex; gap: 2px;">',
                        '<button class="excel-btn excel-btn--small" onclick="showProductDetail(' + product.id + ')" title="詳細">',
                            '<i class="fas fa-eye"></i>',
                        '</button>',
                        '<button class="excel-btn excel-btn--small" onclick="deleteProduct(' + product.id + ')" title="削除" style="color: #ef4444;">',
                            '<i class="fas fa-trash"></i>',
                        '</button>',
                    '</div>',
                '</td>',
            '</tr>'
        ].join('');
    }
    
    // 統計情報更新
    function updateStatistics(products) {
        const stats = {
            total: products.length,
            stock: products.filter(function(p) { return p.type === 'stock'; }).length,
            dropship: products.filter(function(p) { return p.type === 'dropship'; }).length,
            set: products.filter(function(p) { return p.type === 'set'; }).length,
            hybrid: products.filter(function(p) { return p.type === 'hybrid'; }).length,
            totalValue: products.reduce(function(sum, p) { return sum + p.priceUSD; }, 0)
        };
        
        const totalProductsEl = document.getElementById('total-products');
        const stockProductsEl = document.getElementById('stock-products');
        const dropshipProductsEl = document.getElementById('dropship-products');
        const setProductsEl = document.getElementById('set-products');
        const hybridProductsEl = document.getElementById('hybrid-products');
        const totalValueEl = document.getElementById('total-value');
        
        if (totalProductsEl) totalProductsEl.textContent = stats.total.toLocaleString();
        if (stockProductsEl) stockProductsEl.textContent = stats.stock.toLocaleString();
        if (dropshipProductsEl) dropshipProductsEl.textContent = stats.dropship.toLocaleString();
        if (setProductsEl) setProductsEl.textContent = stats.set.toLocaleString();
        if (hybridProductsEl) hybridProductsEl.textContent = stats.hybrid.toLocaleString();
        if (totalValueEl) totalValueEl.textContent = '$' + (stats.totalValue / 1000).toFixed(1) + 'K';
        
        console.log('📈 PostgreSQL統計情報更新完了:', stats);
    }

    // イベントリスナー設定
    function setupEventListeners() {
        // ビュー切り替え
        const cardViewBtn = document.getElementById('card-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        
        if (cardViewBtn) {
            cardViewBtn.addEventListener('click', function() {
                switchView('grid');
            });
        }
        if (listViewBtn) {
            listViewBtn.addEventListener('click', function() {
                switchView('list');
            });
        }
        
        // セット品作成ボタン
        const createSetBtn = document.getElementById('create-set-btn');
        if (createSetBtn) {
            createSetBtn.addEventListener('click', handleSetCreation);
        }
        
        // 検索
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
        
        // フィルター
        const filterSelects = document.querySelectorAll('.inventory__filter-select');
        filterSelects.forEach(function(select) {
            select.addEventListener('change', applyFilters);
        });
    }

    // ビュー切り替え
    function switchView(view) {
        console.log('🔄 ビュー切り替え: ' + view);
        
        const cardView = document.getElementById('card-view');
        const listView = document.getElementById('list-view');
        const cardViewBtn = document.getElementById('card-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        
        if (!cardView || !listView || !cardViewBtn || !listViewBtn) {
            console.error('ビュー要素が見つかりません');
            return;
        }
        
        cardViewBtn.classList.remove('inventory__view-btn--active');
        listViewBtn.classList.remove('inventory__view-btn--active');
        
        if (view === 'grid') {
            cardView.style.display = 'grid';
            listView.style.display = 'none';
            cardViewBtn.classList.add('inventory__view-btn--active');
            console.log('✅ カードビューに切り替え完了');
        } else {
            cardView.style.display = 'none';
            listView.style.display = 'block';
            listViewBtn.classList.add('inventory__view-btn--active');
            console.log('✅ リストビューに切り替え完了');
        }
    }
    
    // カード選択処理
    function selectCard(card) {
        const productId = parseInt(card.dataset.id);
        
        card.classList.toggle('inventory__card--selected');
        
        if (card.classList.contains('inventory__card--selected')) {
            if (window.inventorySystem.selectedProducts.indexOf(productId) === -1) {
                window.inventorySystem.selectedProducts.push(productId);
            }
        } else {
            window.inventorySystem.selectedProducts = window.inventorySystem.selectedProducts.filter(function(id) {
                return id !== productId;
            });
        }
        
        updateSelectionUI();
        console.log('📦 選択中の商品:', window.inventorySystem.selectedProducts);
    }
    
    // 選択UI更新
    function updateSelectionUI() {
        const createSetBtn = document.getElementById('create-set-btn');
        const setBtnText = document.getElementById('set-btn-text');
        
        if (createSetBtn && setBtnText) {
            if (window.inventorySystem.selectedProducts.length >= 2) {
                createSetBtn.disabled = false;
                setBtnText.textContent = 'セット品作成 (' + window.inventorySystem.selectedProducts.length + '点選択)';
                createSetBtn.classList.add('btn--warning');
            } else {
                createSetBtn.disabled = true;
                setBtnText.textContent = '新規セット品作成';
                createSetBtn.classList.remove('btn--warning');
            }
        }
    }

    // セット品作成処理
    function handleSetCreation() {
        if (window.inventorySystem.selectedProducts.length < 2) {
            alert('セット品を作成するには2つ以上の商品を選択してください。');
            return;
        }
        
        console.log('🎯 セット品作成開始:', window.inventorySystem.selectedProducts);
        alert(window.inventorySystem.selectedProducts.length + '点の商品でセット品を作成します。');
    }

    // 検索処理
    function handleSearch(event) {
        const query = event.target.value.toLowerCase();
        console.log('🔍 検索:', query);
        
        const cards = document.querySelectorAll('.inventory__card');
        cards.forEach(function(card) {
            const title = card.querySelector('.inventory__card-title');
            const sku = card.querySelector('.inventory__card-sku');
            const titleText = title ? title.textContent.toLowerCase() : '';
            const skuText = sku ? sku.textContent.toLowerCase() : '';
            
            if (titleText.indexOf(query) !== -1 || skuText.indexOf(query) !== -1) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // フィルター適用
    function applyFilters() {
        console.log('🎯 フィルター適用');
        
        const typeFilter = document.getElementById('filter-type');
        const channelFilter = document.getElementById('filter-channel');
        const typeValue = typeFilter ? typeFilter.value : '';
        const channelValue = channelFilter ? channelFilter.value : '';
        
        const cards = document.querySelectorAll('.inventory__card');
        cards.forEach(function(card) {
            let show = true;
            
            // 種類フィルター
            if (typeValue) {
                const badges = card.querySelectorAll('.inventory__badge');
                let hasType = false;
                badges.forEach(function(badge) {
                    if (badge.classList.contains('inventory__badge--' + typeValue)) {
                        hasType = true;
                    }
                });
                if (!hasType) show = false;
            }
            
            // モールフィルター
            if (channelValue) {
                const channelBadges = card.querySelectorAll('.inventory__channel-badge');
                let hasChannel = false;
                channelBadges.forEach(function(badge) {
                    if (badge.classList.contains('inventory__channel-badge--' + channelValue)) {
                        hasChannel = true;
                    }
                });
                if (!hasChannel) show = false;
            }
            
            card.style.display = show ? 'flex' : 'none';
        });
    }

    // フィルターリセット
    function resetFilters() {
        console.log('🔄 フィルターリセット');
        const filterSelects = document.querySelectorAll('.inventory__filter-select');
        filterSelects.forEach(function(select) {
            select.value = '';
        });
        
        const cards = document.querySelectorAll('.inventory__card');
        cards.forEach(function(card) {
            card.style.display = 'flex';
        });
        
        // 検索もリセット
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
    }

    // エクスポート処理
    function exportData() {
        console.log('📥 データエクスポート開始');
        
        if (window.inventorySystem.currentData && window.inventorySystem.currentData.length > 0) {
            // CSVエクスポート実装
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Item ID,Title,SKU,Price USD,Stock,Condition,Category,Listing Status\n";
            
            window.inventorySystem.currentData.forEach(function(product) {
                csvContent += '"' + product.id + '","' + product.name + '","' + product.sku + 
                    '",' + product.priceUSD + ',' + product.stock + ',"' + product.condition + 
                    '","' + product.category + '","' + product.listing_status + '"\n';
            });
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "inventory_export_" + new Date().toISOString().slice(0,10) + ".csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification('エクスポート完了', 'CSVファイルがダウンロードされました', 'success');
        } else {
            alert('エクスポートするデータがありません。');
        }
    }

    // 商品詳細表示
    function showProductDetail(productId) {
        console.log('👁️ 商品詳細表示:', productId);
        
        // eBay URLがあれば開く
        const cards = document.querySelectorAll('.inventory__card');
        cards.forEach(function(card) {
            if (parseInt(card.dataset.id) === productId) {
                const ebayUrl = card.dataset.ebayUrl;
                if (ebayUrl) {
                    window.open(ebayUrl, '_blank');
                } else {
                    alert('商品ID ' + productId + ' の詳細を表示します。\n（eBay URLが設定されていません）');
                }
            }
        });
    }

    // 商品削除
    function deleteProduct(productId) {
        if (confirm('この商品を削除しますか？')) {
            console.log('🗑️ 商品削除:', productId);
            alert('商品ID ' + productId + ' を削除しました。\n（実際の削除機能は開発中です）');
        }
    }
    
    // ローディング表示
    function showLoading() {
        const cardContainer = document.getElementById('card-view');
        if (cardContainer) {
            cardContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i><p>PostgreSQL eBayデータベースから読み込み中...</p></div>';
        }
    }
    
    function hideLoading() {
        // ローディングは updateProductCards で除去される
    }
    
    // 通知表示関数
    function showNotification(title, message, type) {
        const colors = {
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#06b6d4'
        };
        
        const icons = {
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = [
            'position: fixed',
            'top: 20px',
            'right: 250px', // データベース状態表示との重複回避
            'background: ' + (colors[type] || colors.info),
            'color: white',
            'padding: 12px 20px',
            'border-radius: 8px',
            'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            'z-index: 999',
            'font-size: 0.9rem',
            'max-width: 350px'
        ].join('; ');
        
        notification.innerHTML = [
            '<div style="display: flex; align-items: center; gap: 8px;">',
                '<i class="' + (icons[type] || icons.info) + '"></i>',
                '<div>',
                    '<strong>' + title + '</strong><br>',
                    message,
                '</div>',
            '</div>'
        ].join('');
        
        document.body.appendChild(notification);
        
        // 5秒後に消す
        setTimeout(function() {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100px)';
                notification.style.transition = 'all 0.3s ease';
                setTimeout(function() {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
    
    console.log('📜 棚卸しシステム（PostgreSQL完全統合版）JavaScript読み込み完了');
    </script>
</body>
</html>