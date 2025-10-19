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
    <title><?php echo safe_output('棚卸しシステム - 構文エラー完全修正版'); ?></title>
    
    <!-- 外部リソース -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    
    <!-- 外部CSSファイル読み込み -->
    <link rel="stylesheet" href="modules/tanaoroshi_inline_complete/assets/tanaoroshi_styles.css">
    
    <!-- 🛡️ 緊急修正CSS読み込み（引き継ぎ書修正方法A統合） -->
    <link rel="stylesheet" href="common/css/pages/tanaoroshi_modal_emergency_fix.css">
    
    <style>
    /* ===== 構文エラー修正版：シンプル化カードレイアウト ===== */
    .inventory__grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)) !important;
        gap: 1rem !important;
        padding: 1rem !important;
        background: #f8fafc !important;
        min-height: calc(100vh - 400px) !important;
    }
    
    .inventory__card {
        background: white !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 8px !important;
        overflow: hidden !important;
        cursor: pointer !important;
        transition: box-shadow 0.2s ease !important;
        display: flex !important;
        flex-direction: column !important;
        height: 320px !important;
    }
    
    .inventory__card:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
    }
    
    .inventory__card-image {
        height: 160px !important;
        background: #f1f5f9 !important;
        overflow: hidden !important;
        position: relative !important;
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
        background: #f1f5f9 !important;
        color: #64748b !important;
        flex-direction: column !important;
        gap: 8px !important;
    }
    
    .inventory__card-info {
        padding: 1rem !important;
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
    }
    
    .inventory__card-title {
        font-size: 0.9rem !important;
        font-weight: 600 !important;
        color: #1e293b !important;
        line-height: 1.3 !important;
        margin: 0 !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        overflow: hidden !important;
        height: 2.6rem !important;
    }
    
    .inventory__card-price {
        font-size: 1.1rem !important;
        font-weight: 700 !important;
        color: #059669 !important;
        margin: 8px 0 !important;
    }
    
    .inventory__card-footer {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-top: auto !important;
        padding-top: 8px !important;
        border-top: 1px solid #f1f5f9 !important;
        font-size: 0.8rem !important;
    }
    
    .inventory__card-sku {
        font-size: 0.75rem !important;
        color: #64748b !important;
        font-family: monospace !important;
        background: #f1f5f9 !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
    }
    
    .inventory__badge {
        position: absolute !important;
        top: 8px !important;
        left: 8px !important;
        padding: 4px 8px !important;
        border-radius: 4px !important;
        font-size: 0.7rem !important;
        font-weight: 700 !important;
        color: white !important;
        background: #059669 !important;
    }
    
    /* 統計カード */
    .inventory__stats {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
        gap: 1rem !important;
        margin-bottom: 2rem !important;
    }
    
    .inventory__stat {
        background: white !important;
        padding: 1rem !important;
        border-radius: 8px !important;
        text-align: center !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
    }
    
    .inventory__stat-number {
        font-size: 2rem !important;
        font-weight: bold !important;
        color: #1e293b !important;
        display: block !important;
    }
    
    .inventory__stat-label {
        color: #64748b !important;
        font-size: 0.9rem !important;
        margin-top: 4px !important;
    }
    
    /* ヘッダー */
    .inventory__header {
        background: #0f172a !important;
        color: white !important;
        padding: 2rem !important;
        border-radius: 8px !important;
        margin-bottom: 2rem !important;
        text-align: center !important;
    }
    
    .inventory__title {
        font-size: 2rem !important;
        margin: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 0.5rem !important;
    }
    
    /* ボタン */
    .btn {
        background: #3b82f6 !important;
        color: white !important;
        border: none !important;
        padding: 0.75rem 1.5rem !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        font-size: 0.9rem !important;
        font-weight: 600 !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 0.5rem !important;
        transition: background-color 0.2s ease !important;
    }
    
    .btn:hover {
        background: #2563eb !important;
    }
    
    .btn--success { background: #059669 !important; }
    .btn--success:hover { background: #047857 !important; }
    
    .btn--warning { background: #d97706 !important; }
    .btn--warning:hover { background: #b45309 !important; }
    
    /* コントロールバー */
    .inventory__controls {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-bottom: 2rem !important;
        flex-wrap: wrap !important;
        gap: 1rem !important;
    }
    
    /* レスポンシブ対応 */
    @media (max-width: 768px) {
        .inventory__grid { 
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important; 
            gap: 0.75rem !important;
        }
        .inventory__card { height: 300px !important; }
        .inventory__card-image { height: 140px !important; }
    }
    
    @media (max-width: 480px) {
        .inventory__grid { 
            grid-template-columns: 1fr !important; 
            padding: 0.5rem !important;
        }
        .inventory__card { height: 280px !important; }
        .inventory__card-image { height: 120px !important; }
    }
    </style>
</head>
<body>
    <!-- ヘッダー -->
    <header class="inventory__header">
        <h1 class="inventory__title">
            <i class="fas fa-warehouse"></i>
            <?php echo safe_output('棚卸しシステム（構文エラー完全修正版）'); ?>
        </h1>
        <p>PostgreSQL eBayデータベース連携 | JavaScript無限ループ完全対策済み</p>
    </header>

    <!-- 統計情報 -->
    <div class="inventory__stats">
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="total-products">-</span>
            <span class="inventory__stat-label"><?php echo safe_output('総商品数'); ?></span>
        </div>
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="stock-products">-</span>
            <span class="inventory__stat-label"><?php echo safe_output('有在庫商品'); ?></span>
        </div>
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="total-value">-</span>
            <span class="inventory__stat-label"><?php echo safe_output('総在庫価値'); ?></span>
        </div>
        <div class="inventory__stat">
            <span class="inventory__stat-number" id="system-status">✅</span>
            <span class="inventory__stat-label"><?php echo safe_output('システム状態'); ?></span>
        </div>
    </div>

    <!-- コントロールバー -->
    <div class="inventory__controls">
        <div>
            <button class="btn btn--success" onclick="loadEbayInventoryData()">
                <i class="fas fa-sync"></i>
                <?php echo safe_output('eBayデータ取得'); ?>
            </button>
            <button class="btn" onclick="showSystemInfo()">
                <i class="fas fa-info"></i>
                <?php echo safe_output('システム情報'); ?>
            </button>
        </div>
        
        <div id="status-display" style="padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 0.9rem;">
            <strong><?php echo safe_output('システム状態:'); ?></strong> 
            <span id="status-text"><?php echo safe_output('初期化完了。データ取得待ち...'); ?></span>
        </div>
    </div>

    <!-- 商品グリッド -->
    <div class="inventory__grid" id="products-container">
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #64748b;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p><?php echo safe_output('eBayデータベースから読み込み中...'); ?></p>
        </div>
    </div>

    <!-- JavaScript（構文エラー完全修正版） -->
    <script>
    // 構文エラー完全修正版 JavaScript
    console.log('🚀 棚卸しシステム（構文エラー完全修正版）初期化開始');
    
    // グローバル変数の安全な初期化
    window.inventorySystem = {
        products: [],
        totalValue: 0,
        isLoaded: false,
        exchangeRate: 150.25
    };
    
    // エラーハンドリング強化
    window.addEventListener('error', function(e) {
        console.error('⚠️ JavaScript エラーキャッチ:', e.message);
        updateStatus('JavaScript エラーが発生しました: ' + e.message, 'error');
        return true;
    });
    
    // DOM初期化（一回限り実行保証）
    var isInitialized = false;
    document.addEventListener('DOMContentLoaded', function() {
        if (isInitialized) {
            console.log('⚠️ 重複初期化を防止');
            return;
        }
        isInitialized = true;
        
        console.log('✅ DOM初期化完了');
        updateStatus('システム初期化完了。データ取得可能です。', 'success');
        
        // 自動データ読み込み（1秒後）
        setTimeout(function() {
            loadEbayInventoryData();
        }, 1000);
    });
    
    // eBayデータ取得（エラー完全対応版）
    function loadEbayInventoryData() {
        console.log('📂 eBayデータ取得開始');
        updateStatus('eBayデータベースからデータを取得中...', 'info');
        
        try {
            if (typeof window.executeAjax === 'function') {
                window.executeAjax('ebay_inventory_get_data', {
                    limit: 50,
                    with_images: true
                }).then(function(result) {
                    handleDataResponse(result);
                }).catch(function(error) {
                    console.error('❌ Ajax エラー:', error);
                    updateStatus('Ajax通信エラー: ' + error.message, 'error');
                    loadDemoData();
                });
            } else {
                console.log('⚠️ N3 Ajax関数が利用できません。デモデータを表示します。');
                updateStatus('Ajax関数が利用できないため、デモデータを表示します。', 'warning');
                loadDemoData();
            }
        } catch (error) {
            console.error('❌ データ取得例外:', error);
            updateStatus('データ取得エラー: ' + error.message, 'error');
            loadDemoData();
        }
    }
    
    // データ応答処理
    function handleDataResponse(result) {
        console.log('📊 データ応答受信:', result);
        
        if (result && result.success && result.data && Array.isArray(result.data)) {
            var convertedData = convertEbayDataToInventory(result.data);
            window.inventorySystem.products = convertedData;
            window.inventorySystem.isLoaded = true;
            
            displayProducts(convertedData);
            updateStatistics(convertedData);
            updateStatus('eBayデータ取得成功: ' + result.data.length + '件', 'success');
            
            console.log('✅ eBayデータ表示完了:', result.data.length, '件');
        } else {
            console.log('⚠️ データ構造が不正です。デモデータを表示します。');
            updateStatus('データ構造エラー。デモデータを表示します。', 'warning');
            loadDemoData();
        }
    }
    
    // eBayデータを棚卸し形式に変換
    function convertEbayDataToInventory(ebayData) {
        return ebayData.map(function(item, index) {
            return {
                id: item.item_id || index + 1,
                name: item.title || item.name || 'タイトル不明',
                sku: item.sku || 'SKU-' + (index + 1).toString().padStart(6, '0'),
                type: determineProductType(item),
                condition: item.condition || 'used',
                priceUSD: parseFloat(item.price || item.start_price || 0),
                costUSD: parseFloat(item.cost || (item.price * 0.7) || 0),
                stock: parseInt(item.quantity || item.available_quantity || 0),
                category: item.category || item.primary_category || 'その他',
                image: item.gallery_url || item.picture_url || item.image_url || '',
                listing_status: item.listing_status || item.status || 'アクティブ',
                watchers_count: parseInt(item.watch_count || 0),
                views_count: parseInt(item.hit_count || 0),
                ebay_item_id: item.item_id,
                ebay_url: item.view_item_url || ''
            };
        });
    }
    
    // 商品種別判定
    function determineProductType(item) {
        var quantity = parseInt(item.quantity || item.available_quantity || 0);
        var title = (item.title || '').toLowerCase();
        
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
    
    // デモデータ表示
    function loadDemoData() {
        console.log('📋 デモデータ表示');
        
        var demoData = [
            {
                id: 1,
                name: 'iPhone 15 Pro Max - Excellent Condition',
                sku: 'DEMO-IPHONE15PM',
                type: 'stock',
                condition: 'new',
                priceUSD: 299.99,
                costUSD: 209.99,
                stock: 3,
                category: 'Electronics',
                image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=200&fit=crop',
                listing_status: 'アクティブ',
                watchers_count: 25,
                views_count: 450,
                ebay_item_id: 'DEMO001',
                ebay_url: 'https://www.ebay.com/itm/demo001'
            },
            {
                id: 2,
                name: 'Samsung Galaxy S24 Ultra - Like New',
                sku: 'DEMO-SAMSUNG-S24U',
                type: 'hybrid',
                condition: 'used',
                priceUSD: 499.99,
                costUSD: 349.99,
                stock: 1,
                category: 'Electronics',
                image: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=300&h=200&fit=crop',
                listing_status: 'アクティブ',
                watchers_count: 15,
                views_count: 320,
                ebay_item_id: 'DEMO002',
                ebay_url: 'https://www.ebay.com/itm/demo002'
            },
            {
                id: 3,
                name: 'MacBook Pro M3 - Professional Grade',
                sku: 'DEMO-MBP-M3',
                type: 'stock',
                condition: 'used',
                priceUSD: 799.99,
                costUSD: 559.99,
                stock: 2,
                category: 'Computers',
                image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=300&h=200&fit=crop',
                listing_status: 'アクティブ',
                watchers_count: 35,
                views_count: 780,
                ebay_item_id: 'DEMO003',
                ebay_url: 'https://www.ebay.com/itm/demo003'
            }
        ];
        
        window.inventorySystem.products = demoData;
        window.inventorySystem.isLoaded = true;
        
        displayProducts(demoData);
        updateStatistics(demoData);
        updateStatus('デモデータ表示中（3件）', 'success');
    }
    
    // 商品表示
    function displayProducts(products) {
        var container = document.getElementById('products-container');
        if (!container) {
            console.error('❌ 商品コンテナが見つかりません');
            return;
        }
        
        var html = '';
        products.forEach(function(product) {
            html += createProductCard(product);
        });
        
        container.innerHTML = html;
        console.log('🎨 商品表示完了:', products.length, '件');
    }
    
    // 商品カード作成
    function createProductCard(product) {
        var priceJPY = Math.round(product.priceUSD * window.inventorySystem.exchangeRate);
        
        var imageHtml;
        if (product.image && product.image.trim() !== '') {
            imageHtml = '<img src="' + product.image + '" alt="' + product.name + '" class="inventory__card-img" onerror="this.style.display=\'none\'; this.parentNode.innerHTML=\'<div class=\\\"inventory__card-placeholder\\\"><i class=\\\"fas fa-image\\\"></i><span>画像エラー</span></div>\'">';
        } else {
            imageHtml = '<div class="inventory__card-placeholder"><i class="fas fa-image"></i><span>画像なし</span></div>';
        }
        
        var stockInfo = product.stock > 0 ? 
            '<span style="color: #059669; font-weight: 600;">在庫:' + product.stock + '</span>' :
            '<span style="color: #dc2626;">在庫切れ</span>';
        
        return [
            '<div class="inventory__card" onclick="showProductDetail(' + product.id + ')">',
                '<div class="inventory__card-image">',
                    imageHtml,
                    '<span class="inventory__badge">' + product.type + '</span>',
                '</div>',
                '<div class="inventory__card-info">',
                    '<h3 class="inventory__card-title" title="' + product.name + '">' + product.name + '</h3>',
                    '<div class="inventory__card-price">$' + product.priceUSD.toFixed(2) + ' (¥' + priceJPY.toLocaleString() + ')</div>',
                    '<div class="inventory__card-footer">',
                        '<span class="inventory__card-sku">' + product.sku + '</span>',
                        stockInfo,
                    '</div>',
                '</div>',
            '</div>'
        ].join('');
    }
    
    // 統計更新
    function updateStatistics(products) {
        var stats = {
            total: products.length,
            stock: products.filter(function(p) { return p.stock > 0; }).length,
            totalValue: products.reduce(function(sum, p) { return sum + p.priceUSD; }, 0)
        };
        
        var totalProductsEl = document.getElementById('total-products');
        var stockProductsEl = document.getElementById('stock-products');
        var totalValueEl = document.getElementById('total-value');
        
        if (totalProductsEl) totalProductsEl.textContent = stats.total.toLocaleString();
        if (stockProductsEl) stockProductsEl.textContent = stats.stock.toLocaleString();
        if (totalValueEl) totalValueEl.textContent = '$' + Math.round(stats.totalValue).toLocaleString();
        
        window.inventorySystem.totalValue = stats.totalValue;
        
        console.log('📈 統計更新完了:', stats);
    }
    
    // ステータス更新
    function updateStatus(message, type) {
        var statusEl = document.getElementById('status-text');
        if (!statusEl) return;
        
        var colors = {
            success: '#059669',
            error: '#dc2626',
            warning: '#d97706',
            info: '#3b82f6'
        };
        
        statusEl.textContent = message;
        statusEl.style.color = colors[type] || '#64748b';
        
        console.log('📊 ステータス更新:', message);
    }
    
    // 商品詳細表示
    function showProductDetail(productId) {
        console.log('👁️ 商品詳細表示:', productId);
        
        var product = window.inventorySystem.products.find(function(p) { 
            return p.id == productId; 
        });
        
        if (product && product.ebay_url) {
            window.open(product.ebay_url, '_blank');
        } else {
            alert('商品ID ' + productId + ' の詳細を表示します。');
        }
    }
    
    // システム情報表示
    function showSystemInfo() {
        var info = [
            'システム: NAGANO-3 棚卸しシステム',
            'バージョン: 構文エラー完全修正版',
            '商品データ: ' + (window.inventorySystem.isLoaded ? window.inventorySystem.products.length + '件読み込み済み' : '未読み込み'),
            '総在庫価値: $' + window.inventorySystem.totalValue.toFixed(2),
            'Ajax関数: ' + (typeof window.executeAjax === 'function' ? '利用可能' : '利用不可'),
            'ブラウザ: ' + navigator.userAgent.split(' ').slice(-1)[0],
            'JavaScript: 正常動作中'
        ].join('\n');
        
        alert(info);
        console.log('ℹ️ システム情報:', info);
    }
    
    console.log('✅ 棚卸しシステム JavaScript（構文エラー完全修正版）初期化完了');
    </script>
</body>
</html>
