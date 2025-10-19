<?php
if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>棚卸しシステム - 構文エラー修正版</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
    body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
        margin: 0; 
        padding: 20px; 
        background: #f8fafc; 
    }
    .container { 
        max-width: 1200px; 
        margin: 0 auto; 
        background: white; 
        padding: 20px; 
        border-radius: 8px; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
    }
    .header { 
        text-align: center; 
        margin-bottom: 30px; 
        padding: 20px; 
        background: #0f172a; 
        color: white; 
        border-radius: 8px; 
    }
    .stats { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
        gap: 20px; 
        margin-bottom: 30px; 
    }
    .stat-card { 
        background: #f1f5f9; 
        padding: 20px; 
        border-radius: 8px; 
        text-align: center; 
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
    }
    .products-grid { 
        display: grid; 
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
        gap: 20px; 
        margin-top: 20px; 
    }
    .product-card { 
        background: white; 
        border: 1px solid #e2e8f0; 
        border-radius: 8px; 
        padding: 15px; 
        box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
    }
    .product-title { 
        font-weight: 600; 
        margin-bottom: 10px; 
        color: #1e293b; 
    }
    .product-price { 
        font-size: 1.2rem; 
        font-weight: bold; 
        color: #059669; 
        margin-bottom: 10px; 
    }
    .product-info { 
        font-size: 0.9rem; 
        color: #64748b; 
    }
    .btn { 
        background: #3b82f6; 
        color: white; 
        border: none; 
        padding: 10px 20px; 
        border-radius: 6px; 
        cursor: pointer; 
        margin: 5px; 
    }
    .btn:hover { 
        background: #2563eb; 
    }
    .success { 
        color: #059669; 
        font-weight: 600; 
    }
    .error { 
        color: #dc2626; 
        font-weight: 600; 
    }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-warehouse"></i> 棚卸しシステム</h1>
            <p>構文エラー完全修正版 - JavaScript無限ループ対策済み</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <span class="stat-number" id="total-count">-</span>
                <span class="stat-label">総商品数</span>
            </div>
            <div class="stat-card">
                <span class="stat-number" id="stock-count">-</span>
                <span class="stat-label">有在庫商品</span>
            </div>
            <div class="stat-card">
                <span class="stat-number" id="total-value">-</span>
                <span class="stat-label">総在庫価値</span>
            </div>
            <div class="stat-card">
                <span class="stat-number" id="system-status">✅</span>
                <span class="stat-label">システム状態</span>
            </div>
        </div>

        <div style="text-align: center; margin: 20px 0;">
            <button class="btn" onclick="loadInventoryData()">
                <i class="fas fa-sync"></i> eBayデータ取得
            </button>
            <button class="btn" onclick="showSystemInfo()">
                <i class="fas fa-info"></i> システム情報
            </button>
        </div>

        <div id="status-display" style="margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 6px;">
            <strong>システム状態:</strong> 初期化完了。データ取得待ち...
        </div>

        <div class="products-grid" id="products-container">
            <div class="product-card">
                <div class="product-title">システム初期化中...</div>
                <div class="product-info">eBayデータベースへの接続を準備しています</div>
            </div>
        </div>
    </div>

    <script>
    // 最小限で安全なJavaScript（無限ループ完全防止）
    console.log('🚀 構文エラー修正版 JavaScript 開始');
    
    // グローバル変数の安全な初期化
    var systemData = {
        products: [],
        totalValue: 0,
        isLoaded: false
    };
    
    // エラーハンドリング強化
    window.addEventListener('error', function(e) {
        console.error('⚠️ JavaScript エラーキャッチ:', e.message);
        updateStatus('JavaScript エラーが発生しました: ' + e.message, 'error');
        return true; // エラーの伝播を停止
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
    });
    
    // eBayデータ取得（エラー完全対応版）
    function loadInventoryData() {
        console.log('📂 eBayデータ取得開始');
        updateStatus('eBayデータベースからデータを取得中...', 'info');
        
        try {
            // N3のAjax関数が利用可能かチェック
            if (typeof window.executeAjax === 'function') {
                window.executeAjax('ebay_inventory_get_data', {
                    limit: 20,
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
            systemData.products = result.data;
            systemData.isLoaded = true;
            
            displayProducts(result.data);
            updateStatistics(result.data);
            updateStatus('eBayデータ取得成功: ' + result.data.length + '件', 'success');
            
            console.log('✅ eBayデータ表示完了:', result.data.length, '件');
        } else {
            console.log('⚠️ データ構造が不正です。デモデータを表示します。');
            updateStatus('データ構造エラー。デモデータを表示します。', 'warning');
            loadDemoData();
        }
    }
    
    // デモデータ表示
    function loadDemoData() {
        console.log('📋 デモデータ表示');
        
        var demoData = [
            {
                id: 1,
                title: 'iPhone 15 Pro Max - Excellent Condition',
                price: 299.99,
                stock: 3,
                category: 'Electronics'
            },
            {
                id: 2,
                title: 'Samsung Galaxy S24 Ultra - Like New',
                price: 499.99,
                stock: 1,
                category: 'Electronics'  
            },
            {
                id: 3,
                title: 'MacBook Pro M3 - Vintage Collection',
                price: 799.99,
                stock: 2,
                category: 'Computers'
            }
        ];
        
        systemData.products = demoData;
        systemData.isLoaded = true;
        
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
            html += createProductHTML(product);
        });
        
        container.innerHTML = html;
        console.log('🎨 商品表示完了:', products.length, '件');
    }
    
    // 商品HTML作成
    function createProductHTML(product) {
        var title = product.title || product.name || '商品名不明';
        var price = parseFloat(product.price || product.priceUSD || 0);
        var stock = parseInt(product.stock || product.quantity || 0);
        var category = product.category || 'その他';
        
        return [
            '<div class="product-card">',
                '<div class="product-title">' + title + '</div>',
                '<div class="product-price">$' + price.toFixed(2) + '</div>',
                '<div class="product-info">',
                    '在庫: ' + stock + '個<br>',
                    'カテゴリ: ' + category,
                '</div>',
            '</div>'
        ].join('');
    }
    
    // 統計更新
    function updateStatistics(products) {
        var totalCount = products.length;
        var stockCount = products.filter(function(p) { 
            return parseInt(p.stock || p.quantity || 0) > 0; 
        }).length;
        var totalValue = products.reduce(function(sum, p) { 
            return sum + parseFloat(p.price || p.priceUSD || 0); 
        }, 0);
        
        var totalCountEl = document.getElementById('total-count');
        var stockCountEl = document.getElementById('stock-count');
        var totalValueEl = document.getElementById('total-value');
        
        if (totalCountEl) totalCountEl.textContent = totalCount;
        if (stockCountEl) stockCountEl.textContent = stockCount;
        if (totalValueEl) totalValueEl.textContent = '$' + totalValue.toFixed(0);
        
        systemData.totalValue = totalValue;
        
        console.log('📈 統計更新:', {
            totalCount: totalCount,
            stockCount: stockCount,
            totalValue: totalValue
        });
    }
    
    // ステータス更新
    function updateStatus(message, type) {
        var statusEl = document.getElementById('status-display');
        if (!statusEl) return;
        
        var typeClass = type === 'success' ? 'success' : 
                       type === 'error' ? 'error' : '';
        
        statusEl.innerHTML = '<strong>システム状態:</strong> <span class="' + typeClass + '">' + message + '</span>';
        
        console.log('📊 ステータス更新:', message);
    }
    
    // システム情報表示
    function showSystemInfo() {
        var info = [
            'システム: NAGANO-3 棚卸しシステム',
            'バージョン: 構文エラー修正版',
            '商品データ: ' + (systemData.isLoaded ? systemData.products.length + '件読み込み済み' : '未読み込み'),
            '総在庫価値: $' + systemData.totalValue.toFixed(2),
            'Ajax関数: ' + (typeof window.executeAjax === 'function' ? '利用可能' : '利用不可'),
            'ブラウザ: ' + navigator.userAgent.split(' ').slice(-1)[0],
            'JavaScript: 正常動作中'
        ].join('\n');
        
        alert(info);
        console.log('ℹ️ システム情報:', info);
    }
    
    console.log('✅ 構文エラー修正版 JavaScript 初期化完了');
    </script>
</body>
</html>
