/**
 * 棚卸しシステム JavaScript - Stage 3.2: 画像表示強化版
 * 構文エラー原因特定版
 */

(function() {
    'use strict';
    
    console.log('📜 棚卸しシステム Stage 3.2: 画像表示強化版 読み込み開始');
    
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
        
        console.log('🚀 棚卸しシステム Stage 3.2 初期化開始');
        initializeStage32();
        console.log('✅ 棚卸しシステム Stage 3.2 初期化完了');
    });
    
    // Stage 3.2初期化
    function initializeStage32() {
        // 3秒後にAjax処理開始
        setTimeout(function() {
            loadEbayInventoryData();
        }, 3000);
    }
    
    // eBayデータ読み込み（Ajax機能）
    function loadEbayInventoryData() {
        console.log('📂 Stage 3.2: eBayデータベース連携開始');
        
        try {
            showLoadingMessage();
            
            // N3準拠でindex.php経由Ajax
            if (typeof window.executeAjax === 'function') {
                console.log('🔗 Stage 3.2: N3 executeAjax関数が利用可能です');
                
                window.executeAjax('ebay_inventory_get_data', {
                    page: 'tanaoroshi_inline_complete',
                    limit: 5,
                    with_images: true
                }).then(function(result) {
                    console.log('📊 Stage 3.2: Ajax応答受信:', result);
                    handleDataResponse(result);
                }).catch(function(error) {
                    console.error('❌ Stage 3.2: Ajax エラー:', error);
                    loadDemoData();
                });
            } else {
                console.log('⚠️ Stage 3.2: N3 executeAjax関数が使用できません');
                loadDemoData();
            }
            
        } catch (error) {
            console.error('❌ Stage 3.2: データ取得例外:', error);
            loadDemoData();
        }
    }
    
    // データ応答処理
    function handleDataResponse(result) {
        console.log('📊 Stage 3.2: データ応答処理開始:', result);
        
        if (result && result.success && result.data && Array.isArray(result.data)) {
            if (result.data.length > 0) {
                console.log('✅ Stage 3.2: eBayデータ取得成功:', result.data.length, '件');
                var convertedData = convertEbayDataWithImages(result.data);
                displayCardsWithImages(convertedData);
                updateBasicStatistics(convertedData);
            } else {
                console.log('⚠️ Stage 3.2: eBayデータが空です');
                loadDemoData();
            }
        } else {
            console.error('❌ Stage 3.2: eBayデータ構造エラー:', result);
            loadDemoData();
        }
    }
    
    // eBayデータ変換（画像情報付き）
    function convertEbayDataWithImages(ebayData) {
        console.log('🔄 Stage 3.2: eBayデータ画像付き変換開始');
        
        return ebayData.map(function(item, index) {
            return {
                id: item.item_id || index + 1,
                name: item.title || item.name || 'タイトル不明',
                sku: item.sku || item.custom_label || 'SKU-' + (index + 1),
                type: determineProductType(item),
                priceUSD: parseFloat(item.price || item.start_price || 0),
                stock: parseInt(item.quantity || item.available_quantity || 0),
                image: item.gallery_url || item.picture_url || item.image_url || '',
                status: item.listing_status || item.status || 'アクティブ'
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
        console.log('🔄 Stage 3.2: デモデータ表示開始');
        
        var demoData = [
            {
                id: 1,
                name: 'iPhone 15 Pro Max 256GB - Collector\'s Item',
                sku: 'eBay-IPHONE15PM-256',
                type: 'stock',
                priceUSD: 278.72,
                stock: 0,
                image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=200&fit=crop',
                status: '売切れ'
            },
            {
                id: 2,
                name: 'Samsung Galaxy S24 Ultra - Excellent Condition',
                sku: 'eBay-SAMSUNG-S24U',
                type: 'hybrid',
                priceUSD: 1412.94,
                stock: 3,
                image: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=300&h=200&fit=crop',
                status: 'アクティブ'
            },
            {
                id: 3,
                name: 'MacBook Pro M3 16-inch - Vintage',
                sku: 'eBay-MBP-M3-16',
                type: 'stock',
                priceUSD: 685.44,
                stock: 4,
                image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=300&h=200&fit=crop',
                status: 'アクティブ'
            }
        ];
        
        displayCardsWithImages(demoData);
        updateBasicStatistics(demoData);
        console.log('📋 Stage 3.2: デモデータ表示完了:', demoData.length, '件');
    }
    
    // 画像付きカード表示
    function displayCardsWithImages(products) {
        console.log('🎨 Stage 3.2: 画像付きカード表示開始:', products.length, '件');
        
        var container = document.getElementById('card-view');
        if (!container) {
            console.error('❌ card-view要素が見つかりません');
            return;
        }
        
        var cardsHtml = '';
        
        for (var i = 0; i < products.length; i++) {
            var product = products[i];
            cardsHtml += createCardWithImage(product);
        }
        
        console.log('🔧 Stage 3.2: HTML生成完了、DOM挿入実行');
        container.innerHTML = cardsHtml;
        console.log('✅ Stage 3.2: 画像付きカード表示完了:', products.length, '件');
    }
    
    // 画像付きカード作成（構文エラー回避版）
    function createCardWithImage(product) {
        console.log('🔧 Stage 3.2: 画像付きカード作成開始 - ID:', product.id);
        
        var badgeText = {
            'stock': '有在庫',
            'dropship': '無在庫', 
            'set': 'セット品',
            'hybrid': 'ハイブリッド'
        }[product.type] || '不明';
        
        var badgeClass = 'inventory__badge--' + product.type;
        var priceJPY = Math.round(product.priceUSD * window.TanaoroshiSystem.exchangeRate);
        
        var html = '<div class="inventory__card" data-id="' + product.id + '">';
        html += '<div class="inventory__card-image">';
        
        // 画像表示部分（構文エラー回避版）
        if (product.image && product.image.trim() !== '') {
            html += '<img src="' + product.image + '" alt="商品画像" class="inventory__card-img" onload="console.log(\'画像読み込み成功\')" onerror="handleImageError(this)">';
        } else {
            html += '<div class="inventory__card-placeholder">';
            html += '<i class="fas fa-image"></i>';
            html += '<span>画像なし</span>';
            html += '</div>';
        }
        
        // バッジ部分
        html += '<div class="inventory__card-badges">';
        html += '<span class="inventory__badge ' + badgeClass + '">' + badgeText + '</span>';
        html += '<div class="inventory__channel-badges">';
        html += '<span class="inventory__channel-badge inventory__channel-badge--ebay">E</span>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        // 商品情報部分
        html += '<div class="inventory__card-info">';
        html += '<h3 class="inventory__card-title" title="' + product.name + '">' + product.name + '</h3>';
        html += '<div class="inventory__card-price">';
        html += '<div class="inventory__card-price-main">$' + product.priceUSD.toFixed(2) + '</div>';
        html += '<div class="inventory__card-price-sub">¥' + priceJPY.toLocaleString() + '</div>';
        html += '</div>';
        html += '<div class="inventory__card-footer">';
        html += '<span class="inventory__card-sku" title="' + product.sku + '">' + product.sku + '</span>';
        
        var stockInfo = (product.type === 'stock' || product.type === 'hybrid') ?
            '<span style="color: #10b981; font-size: 0.75rem; font-weight: 600;">在庫:' + product.stock + '</span>' :
            '<span style="color: #06b6d4; font-size: 0.75rem;">' + product.status + '</span>';
        
        html += stockInfo;
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        console.log('🔧 Stage 3.2: 画像付きカード作成完了 - ID:', product.id);
        return html;
    }
    
    // 基本統計情報更新
    function updateBasicStatistics(products) {
        console.log('📈 Stage 3.2: 基本統計情報更新開始');
        
        var stats = {
            total: products.length,
            stock: products.filter(function(p) { return p.type === 'stock'; }).length,
            dropship: products.filter(function(p) { return p.type === 'dropship'; }).length,
            set: products.filter(function(p) { return p.type === 'set'; }).length,
            hybrid: products.filter(function(p) { return p.type === 'hybrid'; }).length,
            totalValue: products.reduce(function(sum, p) { return sum + p.priceUSD; }, 0)
        };
        
        // DOM要素更新（安全版）
        updateElementText('total-products', stats.total.toLocaleString());
        updateElementText('stock-products', stats.stock.toLocaleString());
        updateElementText('dropship-products', stats.dropship.toLocaleString());
        updateElementText('set-products', stats.set.toLocaleString());
        updateElementText('hybrid-products', stats.hybrid.toLocaleString());
        updateElementText('total-value', '$' + (stats.totalValue / 1000).toFixed(1) + 'K');
        
        console.log('✅ Stage 3.2: 基本統計情報更新完了:', stats);
    }
    
    // DOM要素テキスト更新（安全版）
    function updateElementText(elementId, text) {
        var element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        } else {
            console.warn('⚠️ 要素が見つかりません:', elementId);
        }
    }
    
    // 画像エラーハンドリング（グローバル関数）
    window.handleImageError = function(img) {
        console.log('⚠️ 画像読み込みエラー:', img.src);
        img.style.display = 'none';
        img.parentNode.innerHTML = '<div class="inventory__card-placeholder"><i class="fas fa-image"></i><span>画像エラー</span></div>';
    };
    
    // ローディングメッセージ表示
    function showLoadingMessage() {
        var container = document.getElementById('card-view');
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i><p>eBayデータベースから読み込み中...</p></div>';
        }
    }
    
    // グローバル関数として公開
    window.loadEbayInventoryData = loadEbayInventoryData;
    
    console.log('📜 棚卸しシステム Stage 3.2: 画像表示強化版 読み込み完了');
    
})();
