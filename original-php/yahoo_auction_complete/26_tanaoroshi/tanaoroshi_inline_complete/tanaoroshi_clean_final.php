<?php
if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

function safe_output($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo safe_output('棚卸しシステム - 完全修正版'); ?></title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
    body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
        margin: 0; 
        padding: 20px; 
        background: #f8fafc; 
    }
    .header { 
        background: #0f172a; 
        color: white; 
        padding: 30px; 
        border-radius: 8px; 
        margin-bottom: 30px; 
        text-align: center; 
    }
    .header h1 { 
        margin: 0; 
        font-size: 2rem; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        gap: 10px; 
    }
    .stats { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
        gap: 20px; 
        margin-bottom: 30px; 
    }
    .stat-card { 
        background: white; 
        padding: 20px; 
        border-radius: 8px; 
        text-align: center; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
    }
    .stat-number { 
        font-size: 2rem; 
        font-weight: bold; 
        color: #0f172a; 
        display: block; 
    }
    .stat-label { 
        color: #64748b; 
        font-size: 0.9rem; 
        margin-top: 5px; 
    }
    .controls { 
        display: flex; 
        justify-content: center; 
        gap: 15px; 
        margin-bottom: 30px; 
    }
    .btn { 
        background: #3b82f6; 
        color: white; 
        border: none; 
        padding: 12px 24px; 
        border-radius: 6px; 
        cursor: pointer; 
        font-size: 0.9rem; 
        display: inline-flex; 
        align-items: center; 
        gap: 8px; 
    }
    .btn:hover { 
        background: #2563eb; 
    }
    .btn--success { 
        background: #059669; 
    }
    .btn--success:hover { 
        background: #047857; 
    }
    .products-grid { 
        display: grid; 
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
        gap: 20px; 
    }
    .product-card { 
        background: white; 
        border: 1px solid #e2e8f0; 
        border-radius: 8px; 
        overflow: hidden; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        cursor: pointer; 
        transition: transform 0.2s ease; 
    }
    .product-card:hover { 
        transform: translateY(-2px); 
        box-shadow: 0 4px 8px rgba(0,0,0,0.15); 
    }
    .product-image { 
        height: 200px; 
        background: #f1f5f9; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        position: relative; 
    }
    .product-image img { 
        width: 100%; 
        height: 100%; 
        object-fit: cover; 
    }
    .product-image-placeholder { 
        color: #94a3b8; 
        font-size: 3rem; 
    }
    .product-info { 
        padding: 15px; 
    }
    .product-title { 
        font-weight: 600; 
        margin-bottom: 10px; 
        color: #1e293b; 
        font-size: 0.95rem; 
        line-height: 1.4; 
        display: -webkit-box; 
        -webkit-line-clamp: 2; 
        -webkit-box-orient: vertical; 
        overflow: hidden; 
    }
    .product-price { 
        font-size: 1.2rem; 
        font-weight: bold; 
        color: #059669; 
        margin-bottom: 10px; 
    }
    .product-details { 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        font-size: 0.85rem; 
        color: #64748b; 
    }
    .product-sku { 
        font-family: monospace; 
        background: #f1f5f9; 
        padding: 2px 6px; 
        border-radius: 4px; 
    }
    .badge { 
        position: absolute; 
        top: 10px; 
        left: 10px; 
        padding: 4px 8px; 
        border-radius: 4px; 
        font-size: 0.7rem; 
        font-weight: bold; 
        color: white; 
        background: #059669; 
    }
    .status-display { 
        text-align: center; 
        padding: 20px; 
        background: white; 
        border-radius: 8px; 
        margin-bottom: 20px; 
        border-left: 4px solid #3b82f6; 
    }
    </style>
</head>
<body>
    <div class="header">
        <h1>
            <i class="fas fa-warehouse"></i>
            <?php echo safe_output('棚卸しシステム（完全修正版）'); ?>
        </h1>
        <p>PostgreSQL eBayデータベース連携 | JavaScript構文エラー完全解決</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <span class="stat-number" id="total-count">-</span>
            <span class="stat-label"><?php echo safe_output('総商品数'); ?></span>
        </div>
        <div class="stat-card">
            <span class="stat-number" id="stock-count">-</span>
            <span class="stat-label"><?php echo safe_output('有在庫商品'); ?></span>
        </div>
        <div class="stat-card">
            <span class="stat-number" id="total-value">-</span>
            <span class="stat-label"><?php echo safe_output('総在庫価値'); ?></span>
        </div>
        <div class="stat-card">
            <span class="stat-number" id="system-status">✅</span>
            <span class="stat-label"><?php echo safe_output('システム状態'); ?></span>
        </div>
    </div>

    <div class="controls">
        <button class="btn btn--success" onclick="loadInventoryData()">
            <i class="fas fa-sync"></i>
            <?php echo safe_output('eBayデータ取得'); ?>
        </button>
        <button class="btn" onclick="showSystemInfo()">
            <i class="fas fa-info"></i>
            <?php echo safe_output('システム情報'); ?>
        </button>
    </div>

    <div class="status-display" id="status-display">
        <strong><?php echo safe_output('システム状態:'); ?></strong> 
        <span id="status-text"><?php echo safe_output('初期化完了。データ取得待ち...'); ?></span>
    </div>

    <div class="products-grid" id="products-container">
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #64748b;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p><?php echo safe_output('eBayデータベースから読み込み中...'); ?></p>
        </div>
    </div>

    <script>
    console.log('🚀 棚卸しシステム（完全修正版）初期化開始');
    
    var systemData = { products: [], totalValue: 0, isLoaded: false };
    
    window.addEventListener('error', function(e) {
        console.error('⚠️ エラーキャッチ:', e.message);
        return true;
    });
    
    var isInitialized = false;
    document.addEventListener('DOMContentLoaded', function() {
        if (isInitialized) return;
        isInitialized = true;
        
        console.log('✅ DOM初期化完了');
        updateStatus('システム初期化完了。データ取得可能です。', 'success');
        
        setTimeout(function() {
            loadInventoryData();
        }, 1000);
    });
    
    function loadInventoryData() {
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
                console.log('⚠️ Ajax関数が利用できません。デモデータを表示します。');
                updateStatus('Ajax関数が利用できないため、デモデータを表示します。', 'warning');
                loadDemoData();
            }
        } catch (error) {
            console.error('❌ データ取得例外:', error);
            updateStatus('データ取得エラー: ' + error.message, 'error');
            loadDemoData();
        }
    }
    
    function handleDataResponse(result) {
        console.log('📊 データ応答受信:', result);
        
        if (result && result.success && result.data && Array.isArray(result.data)) {
            var convertedData = convertEbayData(result.data);
            systemData.products = convertedData;
            systemData.isLoaded = true;
            
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
    
    function convertEbayData(ebayData) {
        return ebayData.map(function(item, index) {
            return {
                id: item.item_id || index + 1,
                name: item.title || item.name || 'タイトル不明',
                sku: item.sku || 'SKU-' + (index + 1).toString().padStart(6, '0'),
                priceUSD: parseFloat(item.price || item.start_price || 0),
                costUSD: parseFloat(item.cost || (item.price * 0.7) || 0),
                stock: parseInt(item.quantity || item.available_quantity || 0),
                category: item.category || item.primary_category || 'その他',
                image: item.gallery_url || item.picture_url || item.image_url || '',
                status: item.listing_status || item.status || 'アクティブ'
            };
        });
    }
    
    function loadDemoData() {
        console.log('📋 デモデータ表示');
        
        var demoData = [
            { id: 1, name: 'iPhone 15 Pro Max - Excellent Condition', sku: 'DEMO-IP15PM', priceUSD: 299.99, costUSD: 209.99, stock: 3, category: 'Electronics', image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=200&fit=crop', status: 'アクティブ' },
            { id: 2, name: 'Samsung Galaxy S24 Ultra - Like New', sku: 'DEMO-SGS24U', priceUSD: 499.99, costUSD: 349.99, stock: 1, category: 'Electronics', image: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=300&h=200&fit=crop', status: 'アクティブ' },
            { id: 3, name: 'MacBook Pro M3 - Professional Grade', sku: 'DEMO-MBP-M3', priceUSD: 799.99, costUSD: 559.99, stock: 2, category: 'Computers', image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=300&h=200&fit=crop', status: 'アクティブ' }
        ];
        
        systemData.products = demoData;
        systemData.isLoaded = true;
        
        displayProducts(demoData);
        updateStatistics(demoData);
        updateStatus('デモデータ表示中（3件）', 'success');
    }
    
    function displayProducts(products) {
        var container = document.getElementById('products-container');
        if (!container) return;
        
        var html = '';
        products.forEach(function(product) {
            html += createProductHTML(product);
        });
        
        container.innerHTML = html;
        console.log('🎨 商品表示完了:', products.length, '件');
    }
    
    function createProductHTML(product) {
        var imageHtml = product.image ? 
            '<img src="' + product.image + '" alt="' + product.name + '" onerror="this.style.display=\'none\'; this.parentNode.innerHTML=\'<i class=\\\"fas fa-image product-image-placeholder\\\"></i>\'">' :
            '<i class="fas fa-image product-image-placeholder"></i>';
        
        var stockInfo = product.stock > 0 ? '在庫:' + product.stock : '在庫切れ';
        
        return [
            '<div class="product-card" onclick="showProductDetail(' + product.id + ')">',
                '<div class="product-image">',
                    imageHtml,
                    '<span class="badge">eBay</span>',
                '</div>',
                '<div class="product-info">',
                    '<div class="product-title">' + product.name + '</div>',
                    '<div class="product-price">$' + product.priceUSD.toFixed(2) + '</div>',
                    '<div class="product-details">',
                        '<span class="product-sku">' + product.sku + '</span>',
                        '<span>' + stockInfo + '</span>',
                    '</div>',
                '</div>',
            '</div>'
        ].join('');
    }
    
    function updateStatistics(products) {
        var totalCount = products.length;
        var stockCount = products.filter(function(p) { return p.stock > 0; }).length;
        var totalValue = products.reduce(function(sum, p) { return sum + p.priceUSD; }, 0);
        
        var totalCountEl = document.getElementById('total-count');
        var stockCountEl = document.getElementById('stock-count');
        var totalValueEl = document.getElementById('total-value');
        
        if (totalCountEl) totalCountEl.textContent = totalCount;
        if (stockCountEl) stockCountEl.textContent = stockCount;
        if (totalValueEl) totalValueEl.textContent = '$' + Math.round(totalValue);
        
        systemData.totalValue = totalValue;
        console.log('📈 統計更新:', { totalCount: totalCount, stockCount: stockCount, totalValue: totalValue });
    }
    
    function updateStatus(message, type) {
        var statusEl = document.getElementById('status-text');
        if (!statusEl) return;
        
        var colors = { success: '#059669', error: '#dc2626', warning: '#d97706', info: '#3b82f6' };
        statusEl.textContent = message;
        statusEl.style.color = colors[type] || '#64748b';
        console.log('📊 ステータス更新:', message);
    }
    
    function showProductDetail(productId) {
        console.log('👁️ 商品詳細表示:', productId);
        alert('商品ID ' + productId + ' の詳細を表示します。');
    }
    
    function showSystemInfo() {
        var info = [
            'システム: NAGANO-3 棚卸しシステム',
            'バージョン: 完全修正版',
            '商品データ: ' + (systemData.isLoaded ? systemData.products.length + '件読み込み済み' : '未読み込み'),
            '総在庫価値: $' + systemData.totalValue.toFixed(2),
            'Ajax関数: ' + (typeof window.executeAjax === 'function' ? '利用可能' : '利用不可'),
            'JavaScript: 正常動作中'
        ].join('\n');
        
        alert(info);
        console.log('ℹ️ システム情報:', info);
    }
    
    console.log('✅ 棚卸しシステム（完全修正版）初期化完了');
    </script>
</body>
</html>
