/**
 * 棚卸しシステム JavaScript - Stage 3.3: 完全版（構文エラー修正済み）
 * N3フレームワーク準拠版
 */

(function() {
    'use strict';
    
    console.log('📜 棚卸しシステム Stage 3.3: 完全版（構文エラー修正済み）読み込み開始');
    
    // グローバル変数の初期化
    window.TanaoroshiSystem = window.TanaoroshiSystem || {};
    window.TanaoroshiSystem.isInitialized = false;
    window.TanaoroshiSystem.exchangeRate = 150.25;
    window.TanaoroshiSystem.selectedProducts = [];
    
    // DOM初期化（一回限り実行保証）
    document.addEventListener('DOMContentLoaded', function() {
        if (window.TanaoroshiSystem.isInitialized) {
            console.log('⚠️ 重複初期化を防止');
            return;
        }
        window.TanaoroshiSystem.isInitialized = true;
        
        console.log('🚀 棚卸しシステム Stage 3.3 初期化開始');
        initializeStage33();
        console.log('✅ 棚卸しシステム Stage 3.3 初期化完了');
    });
    
    // Stage 3.3初期化
    function initializeStage33() {
        setupEventListeners();
        
        // 3秒後にAjax処理開始
        setTimeout(function() {
            loadEbayInventoryData();
        }, 3000);
    }
    
    // イベントリスナー設定
    function setupEventListeners() {
        // 検索機能
        var searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
        
        // フィルター機能
        var filterSelects = document.querySelectorAll('.inventory__filter-select');
        for (var i = 0; i < filterSelects.length; i++) {
            filterSelects[i].addEventListener('change', applyFilters);
        }
        
        console.log('🔧 Stage 3.3: イベントリスナー設定完了');
    }
    
    // eBayデータ読み込み（Ajax機能）
    function loadEbayInventoryData() {
        console.log('📂 Stage 3.3: eBayデータベース連携開始');
        
        try {
            showLoadingMessage();
            
            // N3準拠でindex.php経由Ajax
            if (typeof window.executeAjax === 'function') {
                console.log('🔗 Stage 3.3: N3 executeAjax関数が利用可能です');
                
                window.executeAjax('ebay_inventory_get_data', {
                    page: 'tanaoroshi_inline_complete',
                    limit: 50,
                    with_images: true
                }).then(function(result) {
                    console.log('📊 Stage 3.3: Ajax応答受信:', result);
                    handleDataResponse(result);
                }).catch(function(error) {
                    console.error('❌ Stage 3.3: Ajax エラー:', error);
                    loadDemoData();
                });
            } else {
                console.log('⚠️ Stage 3.3: N3 executeAjax関数が使用できません');
                loadDemoData();
            }
            
        } catch (error) {
            console.error('❌ Stage 3.3: データ取得例外:', error);
            loadDemoData();
        }
    }
    
    // データ応答処理
    function handleDataResponse(result) {
        console.log('📊 Stage 3.3: データ応答処理開始:', result);
        
        if (result && result.success && result.data && Array.isArray(result.data)) {
            if (result.data.length > 0) {
                console.log('✅ Stage 3.3: eBayデータ取得成功:', result.data.length, '件');
                var convertedData = convertEbayDataToInventory(result.data);
                displayProductCards(convertedData);
                updateStatistics(convertedData);
            } else {
                console.log('⚠️ Stage 3.3: eBayデータが空です');
                loadDemoData();
            }
        } else {
            console.error('❌ Stage 3.3: eBayデータ構造エラー:', result);
            loadDemoData();
        }
    }
    
    // eBayデータ変換（完全版）
    function convertEbayDataToInventory(ebayData) {
        console.log('🔄 Stage 3.3: eBayデータ完全変換開始');
        
        var convertedData = [];
        for (var i = 0; i < ebayData.length; i++) {
            var item = ebayData[i];
            convertedData.push({
                id: item.item_id || i + 1,
                name: item.title || item.name || 'タイトル不明',
                sku: item.sku || item.custom_label || 'SKU-' + (i + 1).toString().padStart(6, '0'),
                type: determineProductType(item),
                condition: item.condition || 'used',
                priceUSD: parseFloat(item.price || item.start_price || 0),
                costUSD: parseFloat(item.cost || item.price * 0.7 || 0),
                stock: parseInt(item.quantity || item.available_quantity || 0),
                category: item.category || item.primary_category || 'その他',
                image: item.gallery_url || item.picture_url || item.image_url || '',
                listing_status: item.listing_status || item.status || 'アクティブ',
                watchers_count: parseInt(item.watch_count || 0),
                views_count: parseInt(item.hit_count || 0),
                ebay_item_id: item.item_id,
                ebay_url: item.view_item_url || ''
            });
        }
        
        return convertedData;
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
        console.log('🔄 Stage 3.3: デモデータ表示開始');
        
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
                listing_status: '売切れ',
                watchers_count: 36,
                views_count: 380,
                ebay_item_id: '123456789',
                ebay_url: 'https://www.ebay.com/itm/123456789'
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
                listing_status: 'アクティブ',
                watchers_count: 10,
                views_count: 1434,
                ebay_item_id: '123456790',
                ebay_url: 'https://www.ebay.com/itm/123456790'
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
                listing_status: 'アクティブ',
                watchers_count: 111,
                views_count: 464,
                ebay_item_id: '123456791',
                ebay_url: 'https://www.ebay.com/itm/123456791'
            }
        ];
        
        displayProductCards(demoData);
        updateStatistics(demoData);
        console.log('📋 Stage 3.3: デモデータ表示完了:', demoData.length, '件');
    }
    
    // 商品カード表示（完全版）
    function displayProductCards(products) {
        console.log('🎨 Stage 3.3: 商品カード表示開始:', products.length, '件');
        
        var container = document.getElementById('card-view');
        if (!container) {
            console.error('❌ card-view要素が見つかりません');
            return;
        }
        
        var cardsHtml = '';
        for (var i = 0; i < products.length; i++) {
            var product = products[i];
            cardsHtml += createProductCard(product);
        }
        
        console.log('🔧 Stage 3.3: HTML生成完了、DOM挿入実行');
        container.innerHTML = cardsHtml;
        
        // カードクリックイベント設定
        setupCardEvents();
        
        console.log('✅ Stage 3.3: 商品カード表示完了:', products.length, '件');
    }
    
    // 商品カード作成（完全版・構文エラー修正済み）
    function createProductCard(product) {
        var badgeText = {
            'stock': '有在庫',
            'dropship': '無在庫', 
            'set': 'セット品',
            'hybrid': 'ハイブリッド'
        }[product.type] || '不明';
        
        var badgeClass = 'inventory__badge--' + product.type;
        var priceJPY = Math.round(product.priceUSD * window.TanaoroshiSystem.exchangeRate);
        
        var html = '<div class="inventory__card" data-id="' + product.id + '" data-ebay-url="' + (product.ebay_url || '') + '">';
        html += '<div class="inventory__card-image">';
        
        // 画像表示部分（構文エラー修正版）
        if (product.image && product.image.trim() !== '') {
            html += '<img src="' + product.image + '" alt="' + escapeHtml(product.name) + '" class="inventory__card-img" onload="console.log(\'画像読み込み成功\')" onerror="handleImageError(this)">';
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
        html += '<h3 class="inventory__card-title" title="' + escapeHtml(product.name) + '">' + escapeHtml(product.name) + '</h3>';
        html += '<div class="inventory__card-price">';
        html += '<div class="inventory__card-price-main">$' + product.priceUSD.toFixed(2) + '</div>';
        html += '<div class="inventory__card-price-sub">¥' + priceJPY.toLocaleString() + '</div>';
        html += '</div>';
        html += '<div class="inventory__card-footer">';
        html += '<span class="inventory__card-sku" title="' + escapeHtml(product.sku) + '">' + escapeHtml(product.sku) + '</span>';
        
        var stockInfo = (product.type === 'stock' || product.type === 'hybrid') ?
            '<span style="color: #10b981; font-size: 0.75rem; font-weight: 600;">在庫:' + product.stock + '</span>' :
            '<span style="color: #06b6d4; font-size: 0.75rem;">' + escapeHtml(product.listing_status) + '</span>';
        
        html += stockInfo;
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        return html;
    }
    
    // HTML エスケープ関数（構文エラー回避）
    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    
    // カードイベント設定
    function setupCardEvents() {
        var cards = document.querySelectorAll('.inventory__card');
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            card.addEventListener('click', function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                selectCard(this);
            });
        }
    }
    
    // カード選択
    function selectCard(card) {
        var productId = parseInt(card.dataset.id);
        
        card.classList.toggle('inventory__card--selected');
        
        if (card.classList.contains('inventory__card--selected')) {
            if (window.TanaoroshiSystem.selectedProducts.indexOf(productId) === -1) {
                window.TanaoroshiSystem.selectedProducts.push(productId);
            }
        } else {
            var index = window.TanaoroshiSystem.selectedProducts.indexOf(productId);
            if (index > -1) {
                window.TanaoroshiSystem.selectedProducts.splice(index, 1);
            }
        }
        
        console.log('📦 Stage 3.3: 選択中の商品:', window.TanaoroshiSystem.selectedProducts);
    }
    
    // 統計情報更新（完全版）
    function updateStatistics(products) {
        console.log('📈 Stage 3.3: 統計情報更新開始');
        
        var stats = {
            total: products.length,
            stock: 0,
            dropship: 0,
            set: 0,
            hybrid: 0,
            totalValue: 0
        };
        
        for (var i = 0; i < products.length; i++) {
            var product = products[i];
            if (product.type === 'stock') stats.stock++;
            else if (product.type === 'dropship') stats.dropship++;
            else if (product.type === 'set') stats.set++;
            else if (product.type === 'hybrid') stats.hybrid++;
            
            stats.totalValue += product.priceUSD;
        }
        
        // DOM要素更新（安全版）
        updateElementText('total-products', stats.total.toLocaleString());
        updateElementText('stock-products', stats.stock.toLocaleString());
        updateElementText('dropship-products', stats.dropship.toLocaleString());
        updateElementText('set-products', stats.set.toLocaleString());
        updateElementText('hybrid-products', stats.hybrid.toLocaleString());
        updateElementText('total-value', '$' + (stats.totalValue / 1000).toFixed(1) + 'K');
        
        console.log('✅ Stage 3.3: 統計情報更新完了:', stats);
    }
    
    // DOM要素テキスト更新（安全版）
    function updateElementText(elementId, text) {
        var element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }
    
    // 検索処理
    function handleSearch(event) {
        var query = event.target.value.toLowerCase();
        console.log('🔍 Stage 3.3: 検索:', query);
        
        var cards = document.querySelectorAll('.inventory__card');
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var title = card.querySelector('.inventory__card-title');
            var sku = card.querySelector('.inventory__card-sku');
            var titleText = title ? title.textContent.toLowerCase() : '';
            var skuText = sku ? sku.textContent.toLowerCase() : '';
            
            if (titleText.indexOf(query) !== -1 || skuText.indexOf(query) !== -1) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        }
    }
    
    // フィルター適用
    function applyFilters() {
        console.log('🎯 Stage 3.3: フィルター適用');
        
        var typeFilter = document.getElementById('filter-type');
        var channelFilter = document.getElementById('filter-channel');
        var typeValue = typeFilter ? typeFilter.value : '';
        var channelValue = channelFilter ? channelFilter.value : '';
        
        var cards = document.querySelectorAll('.inventory__card');
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var show = true;
            
            // 種類フィルター
            if (typeValue) {
                var badges = card.querySelectorAll('.inventory__badge');
                var hasType = false;
                for (var j = 0; j < badges.length; j++) {
                    if (badges[j].classList.contains('inventory__badge--' + typeValue)) {
                        hasType = true;
                        break;
                    }
                }
                if (!hasType) show = false;
            }
            
            card.style.display = show ? 'flex' : 'none';
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
    window.resetFilters = function() {
        console.log('🔄 Stage 3.3: フィルターリセット');
        var filterSelects = document.querySelectorAll('.inventory__filter-select');
        for (var i = 0; i < filterSelects.length; i++) {
            filterSelects[i].value = '';
        }
        applyFilters();
    };
    window.applyFilters = applyFilters;
    
    console.log('📜 棚卸しシステム Stage 3.3: 完全版（構文エラー修正済み）読み込み完了');
    
})();
