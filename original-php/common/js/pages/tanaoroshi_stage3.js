/**
 * 棚卸しシステム JavaScript - Stage 3: カードレイアウト機能追加版
 * N3フレームワーク準拠版
 */

(function() {
    'use strict';
    
    console.log('📜 棚卸しシステム Stage 3: カードレイアウト機能追加版 読み込み開始');
    
    // グローバル変数の初期化
    window.TanaoroshiSystem = window.TanaoroshiSystem || {};
    window.TanaoroshiSystem.isInitialized = false;
    window.TanaoroshiSystem.exchangeRate = 150.25;
    
    // DOM初期化（一回限り実行保証）
    document.addEventListener('DOMContentLoaded', function() {
        if (window.TanaoroshiSystem.isInitialized) {
            console.log('⚠️ 重複初期化を防止');
            return;
        }
        window.TanaoroshiSystem.isInitialized = true;
        
        console.log('🚀 棚卸しシステム Stage 3 初期化開始');
        initializeStage3();
        console.log('✅ 棚卸しシステム Stage 3 初期化完了');
    });
    
    // Stage 3初期化
    function initializeStage3() {
        // 3秒後にAjax処理開始
        setTimeout(function() {
            loadEbayInventoryData();
        }, 3000);
    }
    
    // eBayデータ読み込み（Ajax機能）
    function loadEbayInventoryData() {
        console.log('📂 Stage 3: eBayデータベース連携開始');
        
        try {
            showLoadingMessage();
            
            // N3準拠でindex.php経由Ajax
            if (typeof window.executeAjax === 'function') {
                console.log('🔗 Stage 3: N3 executeAjax関数が利用可能です');
                
                window.executeAjax('ebay_inventory_get_data', {
                    page: 'tanaoroshi_inline_complete',
                    limit: 10,
                    with_images: true
                }).then(function(result) {
                    console.log('📊 Stage 3: Ajax応答受信:', result);
                    handleDataResponse(result);
                }).catch(function(error) {
                    console.error('❌ Stage 3: Ajax エラー:', error);
                    showErrorMessage('Ajax通信エラー: ' + error.message);
                    loadDemoData();
                });
            } else {
                console.log('⚠️ Stage 3: N3 executeAjax関数が使用できません');
                showErrorMessage('executeAjax関数が利用できません。デモデータを表示します。');
                loadDemoData();
            }
            
        } catch (error) {
            console.error('❌ Stage 3: データ取得例外:', error);
            showErrorMessage('データ取得エラー: ' + error.message);
            loadDemoData();
        }
    }
    
    // データ応答処理
    function handleDataResponse(result) {
        console.log('📊 Stage 3: データ応答処理開始:', result);
        
        if (result && result.success && result.data && Array.isArray(result.data)) {
            if (result.data.length > 0) {
                console.log('✅ Stage 3: eBayデータ取得成功:', result.data.length, '件');
                var convertedData = convertEbayData(result.data);
                displayProductCards(convertedData);
                updateStatistics(convertedData);
            } else {
                console.log('⚠️ Stage 3: eBayデータが空です');
                loadDemoData();
            }
        } else {
            console.error('❌ Stage 3: eBayデータ構造エラー:', result);
            loadDemoData();
        }
    }
    
    // eBayデータ変換
    function convertEbayData(ebayData) {
        console.log('🔄 Stage 3: eBayデータ変換開始');
        
        return ebayData.map(function(item, index) {
            return {
                id: item.item_id || index + 1,
                name: item.title || item.name || 'タイトル不明',
                sku: item.sku || item.custom_label || 'SKU-' + (index + 1).toString().padStart(6, '0'),
                type: determineProductType(item),
                condition: item.condition || 'used',
                priceUSD: parseFloat(item.price || item.start_price || 0),
                costUSD: parseFloat(item.cost || item.price * 0.7 || 0),
                stock: parseInt(item.quantity || item.available_quantity || 0),
                category: item.category || item.primary_category || 'その他',
                image: item.gallery_url || item.picture_url || item.image_url || '',
                listing_status: item.listing_status || item.status || 'アクティブ'
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
        console.log('🔄 Stage 3: デモデータ表示開始');
        
        var demoData = [
            {
                id: 1,
                name: 'iPhone 15 Pro Max 256GB - Collector\'s Item',
                sku: 'eBay-IPHONE15PM-256',
                type: 'stock',
                condition: 'new',
                priceUSD: 278.72,
                costUSD: 195.10,
                stock: 0,
                category: 'Cell Phones & Smartphones',
                image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=200&fit=crop',
                listing_status: '売切れ'
            },
            {
                id: 2,
                name: 'Samsung Galaxy S24 Ultra - Excellent Condition',
                sku: 'eBay-SAMSUNG-S24U',
                type: 'hybrid',
                condition: 'new',
                priceUSD: 1412.94,
                costUSD: 989.06,
                stock: 3,
                category: 'Cell Phones & Smartphones',
                image: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=300&h=200&fit=crop',
                listing_status: 'アクティブ'
            },
            {
                id: 3,
                name: 'MacBook Pro M3 16-inch - Vintage',
                sku: 'eBay-MBP-M3-16',
                type: 'stock',
                condition: 'used',
                priceUSD: 685.44,
                costUSD: 480.81,
                stock: 4,
                category: 'Computers/Tablets & Networking',
                image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=300&h=200&fit=crop',
                listing_status: 'アクティブ'
            }
        ];
        
        displayProductCards(demoData);
        updateStatistics(demoData);
        console.log('📋 Stage 3: デモデータ表示完了:', demoData.length, '件');
    }
    
    // 商品カード表示
    function displayProductCards(products) {
        console.log('🎨 Stage 3: カード表示開始:', products.length, '件');
        
        var container = document.getElementById('card-view');
        if (!container) {
            console.error('❌ card-view要素が見つかりません');
            return;
        }
        
        var cardsHtml = products.map(function(product) {
            return createProductCard(product);
        }).join('');
        
        container.innerHTML = cardsHtml;
        console.log('✅ Stage 3: カード表示完了:', products.length, '件');
    }
    
    // 商品カード作成
    function createProductCard(product) {
        var badgeClass = 'inventory__badge--' + product.type;
        var badgeText = {
            'stock': '有在庫',
            'dropship': '無在庫', 
            'set': 'セット品',
            'hybrid': 'ハイブリッド'
        }[product.type] || '不明';
        
        var priceJPY = Math.round(product.priceUSD * window.TanaoroshiSystem.exchangeRate);
        
        // 画像表示部分
        var imageHtml;
        if (product.image && product.image.trim() !== '') {
            imageHtml = '<img src="' + product.image + '" alt="' + product.name + '" class="inventory__card-img" onerror="this.style.display=\'none\'; this.parentNode.innerHTML=\'<div class=\\\"inventory__card-placeholder\\\"><i class=\\\"fas fa-image\\\"></i><span>画像エラー</span></div>\'">';
        } else {
            imageHtml = '<div class="inventory__card-placeholder"><i class="fas fa-image"></i><span>画像なし</span></div>';
        }
        
        var stockInfo = (product.type === 'stock' || product.type === 'hybrid') ?
            '<span style="color: #10b981; font-size: 0.75rem; font-weight: 600;">在庫:' + product.stock + '</span>' :
            '<span style="color: #06b6d4; font-size: 0.75rem;">' + product.listing_status + '</span>';
        
        return [
            '<div class="inventory__card" data-id="' + product.id + '">',
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
    
    // 統計情報更新
    function updateStatistics(products) {
        console.log('📈 Stage 3: 統計情報更新開始');
        
        var stats = {
            total: products.length,
            stock: products.filter(function(p) { return p.type === 'stock'; }).length,
            dropship: products.filter(function(p) { return p.type === 'dropship'; }).length,
            set: products.filter(function(p) { return p.type === 'set'; }).length,
            hybrid: products.filter(function(p) { return p.type === 'hybrid'; }).length,
            totalValue: products.reduce(function(sum, p) { return sum + p.priceUSD; }, 0)
        };
        
        var totalProductsEl = document.getElementById('total-products');
        var stockProductsEl = document.getElementById('stock-products');
        var dropshipProductsEl = document.getElementById('dropship-products');
        var setProductsEl = document.getElementById('set-products');
        var hybridProductsEl = document.getElementById('hybrid-products');
        var totalValueEl = document.getElementById('total-value');
        
        if (totalProductsEl) totalProductsEl.textContent = stats.total.toLocaleString();
        if (stockProductsEl) stockProductsEl.textContent = stats.stock.toLocaleString();
        if (dropshipProductsEl) dropshipProductsEl.textContent = stats.dropship.toLocaleString();
        if (setProductsEl) setProductsEl.textContent = stats.set.toLocaleString();
        if (hybridProductsEl) hybridProductsEl.textContent = stats.hybrid.toLocaleString();
        if (totalValueEl) totalValueEl.textContent = '$' + (stats.totalValue / 1000).toFixed(1) + 'K';
        
        console.log('✅ Stage 3: 統計情報更新完了:', stats);
    }
    
    // ローディングメッセージ表示
    function showLoadingMessage() {
        var container = document.getElementById('card-view');
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i><p>eBayデータベースから読み込み中...</p></div>';
        }
    }
    
    // エラーメッセージ表示
    function showErrorMessage(message) {
        console.log('📊 Stage 3: エラーメッセージ表示:', message);
        var container = document.getElementById('card-view');
        if (container) {
            container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #ef4444;"><p>エラー: ' + message + '</p></div>';
        }
    }
    
    // グローバル関数として公開
    window.loadEbayInventoryData = loadEbayInventoryData;
    
    console.log('📜 棚卸しシステム Stage 3: カードレイアウト機能追加版 読み込み完了');
    
})();
