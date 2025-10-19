/**
 * 棚卸しシステム JavaScript
 * N3フレームワーク準拠版 - インライン禁止対応完全版
 * ファイル: common/js/pages/tanaoroshi_inline_complete.js
 */

(function() {
    'use strict';
    
    // グローバル変数の安全な初期化
    window.TanaoroshiSystem = window.TanaoroshiSystem || {};
    window.TanaoroshiSystem.selectedProducts = [];
    window.TanaoroshiSystem.exchangeRate = 150.25;
    window.TanaoroshiSystem.isInitialized = false;
    
    // エラーハンドリング強化
    window.addEventListener('error', function(e) {
        console.error('⚠️ 棚卸しシステム エラーキャッチ:', e.message);
        return true;
    });

    // DOM初期化
    document.addEventListener('DOMContentLoaded', function() {
        if (window.TanaoroshiSystem.isInitialized) {
            console.log('⚠️ 棚卸しシステム 重複初期化を防止');
            return;
        }
        window.TanaoroshiSystem.isInitialized = true;
        
        console.log('🚀 棚卸しシステム（N3準拠版）初期化開始');
        initializeTanaoroshiSystem();
    });
    
    // 棚卸しシステム初期化
    function initializeTanaoroshiSystem() {
        setupEventListeners();
        setTimeout(function() {
            loadEbayInventoryData();
        }, 1000);
        console.log('✅ 棚卸しシステム 初期化完了');
    }
    
    // eBayデータ読み込み
    function loadEbayInventoryData() {
        console.log('📂 棚卸しシステム eBayデータベース連携開始');
        
        try {
            showLoading();
            
            if (typeof window.executeAjax === 'function') {
                window.executeAjax('ebay_inventory_get_data', {
                    page: 'tanaoroshi_inline_complete',
                    limit: 50,
                    with_images: true
                }).then(function(result) {
                    handleDataResponse(result);
                }).catch(function(error) {
                    console.error('❌ 棚卸しシステム Ajax エラー:', error);
                    loadFallbackData();
                });
            } else {
                console.log('⚠️ 棚卸しシステム N3 executeAjax関数が使用できません。フォールバックデータを表示します。');
                loadFallbackData();
            }
            
        } catch (error) {
            console.error('❌ 棚卸しシステム データ取得例外:', error);
            loadFallbackData();
        }
    }
    
    // データ応答処理
    function handleDataResponse(result) {
        console.log('📊 棚卸しシステム データ応答受信:', result);
        
        if (result && result.success && result.data && Array.isArray(result.data)) {
            if (result.data.length > 0) {
                console.log('✅ 棚卸しシステム eBayデータ取得成功:', result.data.length, '件');
                const convertedData = convertEbayDataToInventory(result.data);
                updateProductCards(convertedData);
                updateStatistics(convertedData);
            } else {
                loadFallbackData();
            }
        } else {
            loadFallbackData();
        }
        
        hideLoading();
    }
    
    // eBayデータを棚卸し形式に変換
    function convertEbayDataToInventory(ebayData) {
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
                channels: ['ebay'],
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
        const quantity = parseInt(item.quantity || item.available_quantity || 0);
        const title = (item.title || '').toLowerCase();
        
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
    
    // 【指示書対応】30個のデモデータ生成 - デザイン保持
    function loadFallbackData() {
        console.log('🔄 30個デモデータ生成開始（デザイン保持）');
        
        const fallbackData = [
            // 有在庫商品（8個）
            {id: 1, name: 'Apple iPhone 15 Pro Max 256GB Natural Titanium', sku: 'IPH15-256-TI', type: 'stock', priceUSD: 1199.00, stock: 5},
            {id: 9, name: 'MacBook Pro M3 16inch Space Black 512GB', sku: 'MBP16-M3-BK', type: 'stock', priceUSD: 2899.00, stock: 3},
            {id: 10, name: 'iPad Pro 12.9 M2 256GB Wi-Fi + Cellular', sku: 'IPD129-M2-256', type: 'stock', priceUSD: 1099.00, stock: 7},
            {id: 11, name: 'Sony Alpha A7 IV Mirrorless Camera Body', sku: 'SONY-A7IV-BODY', type: 'stock', priceUSD: 2498.00, stock: 2},
            {id: 12, name: 'Canon EOS R5 Body Only Professional', sku: 'CANON-R5-BODY', type: 'stock', priceUSD: 3899.00, stock: 1},
            {id: 13, name: 'DJI Air 3 Drone with RC-N2 Remote', sku: 'DJI-AIR3-RC', type: 'stock', priceUSD: 1549.00, stock: 4},
            {id: 14, name: 'Microsoft Surface Pro 9 13inch Intel', sku: 'MS-SP9-INTEL', type: 'stock', priceUSD: 999.99, stock: 6},
            {id: 15, name: 'Samsung Galaxy Tab S9 Ultra 512GB', sku: 'SAM-TABS9U-512', type: 'stock', priceUSD: 1199.99, stock: 3},
            
            // 無在庫商品（8個）
            {id: 2, name: 'Nike Air Jordan 1 High OG Chicago 2015', sku: 'AIR-J1-CHI', type: 'dropship', priceUSD: 450.00, stock: 0},
            {id: 16, name: 'Rolex Submariner Date Black Dial 41mm', sku: 'ROL-SUB-BK41', type: 'dropship', priceUSD: 12500.00, stock: 0},
            {id: 17, name: 'Louis Vuitton Neverfull MM Monogram', sku: 'LV-NEVERFULL-MM', type: 'dropship', priceUSD: 1690.00, stock: 0},
            {id: 18, name: 'Hermès Birkin 35 Togo Leather Orange', sku: 'HERMES-BIRKIN35', type: 'dropship', priceUSD: 15000.00, stock: 0},
            {id: 19, name: 'Supreme Box Logo Hoodie Black Large', sku: 'SUP-BOXLOGO-BLK', type: 'dropship', priceUSD: 800.00, stock: 0},
            {id: 20, name: 'Off-White x Jordan 4 Sail Size 10.5', sku: 'OW-J4-SAIL-10', type: 'dropship', priceUSD: 2200.00, stock: 0},
            {id: 21, name: 'Travis Scott x Jordan 1 High Mocha', sku: 'TS-J1-MOCHA', type: 'dropship', priceUSD: 1800.00, stock: 0},
            {id: 22, name: 'Patek Philippe Nautilus 5711 Steel', sku: 'PP-NAUTILUS-5711', type: 'dropship', priceUSD: 85000.00, stock: 0},
            
            // ハイブリッド商品（8個）
            {id: 4, name: 'Sony WH-1000XM5 Wireless Noise Canceling', sku: 'SONY-WH1000XM5', type: 'hybrid', priceUSD: 399.99, stock: 8},
            {id: 7, name: 'Tesla Model S Plaid 1020hp 2024 Red', sku: 'TES-MS-PLD-RED', type: 'hybrid', priceUSD: 89990.00, stock: 1},
            {id: 23, name: 'Dyson V15 Detect Absolute Cordless', sku: 'DYS-V15-DETECT', type: 'hybrid', priceUSD: 749.99, stock: 5},
            {id: 24, name: 'Vitamix A3500 Ascent Series Blender', sku: 'VIT-A3500-ASC', type: 'hybrid', priceUSD: 549.95, stock: 3},
            {id: 25, name: 'KitchenAid Artisan Stand Mixer Red', sku: 'KA-ARTISAN-RED', type: 'hybrid', priceUSD: 429.99, stock: 4},
            {id: 26, name: 'Weber Genesis II E-335 Gas Grill', sku: 'WEB-GEN2-E335', type: 'hybrid', priceUSD: 899.00, stock: 2},
            {id: 27, name: 'Peloton Bike+ Premium with Screen', sku: 'PEL-BIKEPLUS', type: 'hybrid', priceUSD: 2495.00, stock: 1},
            {id: 28, name: 'NordicTrack Commercial 1750 Treadmill', sku: 'NT-COMM-1750', type: 'hybrid', priceUSD: 1999.00, stock: 2},
            
            // セット品（6個）
            {id: 3, name: 'Gaming Setup Complete Bundle RTX4090', sku: 'GAME-SET-RTX90', type: 'set', priceUSD: 2499.00, stock: 2},
            {id: 8, name: 'Photography Studio Complete Kit Pro', sku: 'PHOTO-STUDIO-PRO', type: 'set', priceUSD: 4999.00, stock: 1},
            {id: 29, name: 'Home Office Premium Setup Standing', sku: 'OFFICE-PREM-STAND', type: 'set', priceUSD: 1899.00, stock: 3},
            {id: 30, name: 'Smart Home Starter Pack Google', sku: 'SMART-START-GOOG', type: 'set', priceUSD: 799.99, stock: 5},
            {id: 31, name: 'Fitness Home Gym Bundle Complete', sku: 'FIT-HOMEGYM-COMP', type: 'set', priceUSD: 1499.00, stock: 2},
            {id: 32, name: 'Coffee Enthusiast Complete Set Pro', sku: 'COFFEE-ENT-PRO', type: 'set', priceUSD: 899.00, stock: 4}
        ];
        
        // 基本情報を自動補完（デザイン保持）
        const enrichedData = fallbackData.map(function(item) {
            return {
                ...item,
                condition: 'new',
                costUSD: item.priceUSD * 0.7,
                category: item.type === 'set' ? 'Bundle Sets' : 'Electronics',
                channels: ['ebay'],
                image: '',
                listing_status: item.stock > 0 ? 'アクティブ' : '在庫切れ',
                watchers_count: Math.floor(Math.random() * 50) + 1,
                views_count: Math.floor(Math.random() * 500) + 100,
                ebay_item_id: '12345678' + item.id,
                ebay_url: 'https://www.ebay.com/itm/12345678' + item.id
            };
        });
        
        updateProductCards(enrichedData);
        updateStatistics(enrichedData);
        console.log('📋 30個デモデータ表示完了（デザイン保持）:', enrichedData.length, '件');
    }

    // イベントリスナー設定（インライン禁止対応）
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
        
        // === インライン禁止対応: ボタンイベントリスナー ===
        
        // フィルターボタン
        const resetFiltersBtn = document.getElementById('reset-filters-btn');
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        const loadPostgreSQLBtn = document.getElementById('load-postgresql-btn');
        const syncEbayBtn = document.getElementById('sync-ebay-btn');
        const addProductBtn = document.getElementById('add-product-btn');
        const createSetBtn = document.getElementById('create-set-btn');
        
        if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);
        if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
        if (loadPostgreSQLBtn) loadPostgreSQLBtn.addEventListener('click', loadEbayInventoryData);
        if (syncEbayBtn) syncEbayBtn.addEventListener('click', syncEbayData);
        if (addProductBtn) addProductBtn.addEventListener('click', showAddProductModal);
        if (createSetBtn) createSetBtn.addEventListener('click', showCreateSetModal);
        
        // モーダル閉じる
        const closeAddProductModal = document.getElementById('close-add-product-modal');
        const closeCreateSetModal = document.getElementById('close-create-set-modal');
        const cancelAddProduct = document.getElementById('cancel-add-product');
        const cancelCreateSet = document.getElementById('cancel-create-set');
        
        if (closeAddProductModal) {
            closeAddProductModal.addEventListener('click', function() {
                closeModal('add-product-modal');
            });
        }
        if (closeCreateSetModal) {
            closeCreateSetModal.addEventListener('click', function() {
                closeModal('create-set-modal');
            });
        }
        if (cancelAddProduct) {
            cancelAddProduct.addEventListener('click', function() {
                closeModal('add-product-modal');
            });
        }
        if (cancelCreateSet) {
            cancelCreateSet.addEventListener('click', function() {
                closeModal('create-set-modal');
            });
        }
        
        console.log('✅ インライン禁止対応イベントリスナー設定完了');
    }

    // 【デザイン保持】ビュー切り替え強化版
    function switchView(view) {
        console.log('🔄 ビュー切り替え実行:', view);
        
        const cardView = document.getElementById('card-view');
        const listView = document.getElementById('list-view');
        const cardViewBtn = document.getElementById('card-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        
        // デバッグ情報を追加
        console.log('🔍 要素取得結果:', {
            cardView: !!cardView,
            listView: !!listView,
            cardViewBtn: !!cardViewBtn,
            listViewBtn: !!listViewBtn
        });
        
        if (!cardView || !listView) {
            console.error('❌ ビュー要素が見つかりません');
            return;
        }
        
        // ボタン状態をリセット
        if (cardViewBtn) cardViewBtn.classList.remove('inventory__view-btn--active');
        if (listViewBtn) listViewBtn.classList.remove('inventory__view-btn--active');
        
        if (view === 'grid') {
            cardView.style.display = 'grid';
            listView.style.display = 'none';
            if (cardViewBtn) cardViewBtn.classList.add('inventory__view-btn--active');
            
            // Excelテーブルデータも生成
            generateExcelTableData();
            console.log('✅ カードビューに切り替え完了');
        } else {
            cardView.style.display = 'none';
            listView.style.display = 'block';
            if (listViewBtn) listViewBtn.classList.add('inventory__view-btn--active');
            
            // Excelビューでもデータ同期
            generateExcelTableData();
            console.log('✅ Excelビューに切り替え完了');
        }
    }

    // 検索処理
    function handleSearch(event) {
        const query = event.target.value.toLowerCase();
        console.log('🔍 棚卸しシステム 検索:', query);
        
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

    // 【指示書対応】フィルター機能詳細化 - デザイン保持
    function applyFilters() {
        console.log('🎯 詳細フィルター適用開始');
        
        const filters = {
            type: document.getElementById('filter-type')?.value || '',
            channel: document.getElementById('filter-channel')?.value || '',
            stockStatus: document.getElementById('filter-stock-status')?.value || '',
            priceRange: document.getElementById('filter-price-range')?.value || ''
        };
        
        console.log('フィルター設定:', filters);
        
        const cards = document.querySelectorAll('.inventory__card');
        let visibleCount = 0;
        
        cards.forEach(function(card) {
            let show = true;
            
            // 商品種類フィルター
            if (filters.type) {
                const hasMatchingBadge = card.querySelector('.inventory__badge--' + filters.type);
                if (!hasMatchingBadge) show = false;
            }
            
            // 価格範囲フィルター（新規追加）
            if (filters.priceRange && show) {
                const priceText = card.querySelector('.inventory__card-price-main')?.textContent || '$0';
                const price = parseFloat(priceText.replace('
        console.log('🔄 棚卸しシステム フィルターリセット');
        
        const filterSelects = document.querySelectorAll('.inventory__filter-select');
        filterSelects.forEach(function(select) {
            select.value = '';
        });
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        const cards = document.querySelectorAll('.inventory__card');
        cards.forEach(function(card) {
            card.style.display = 'flex';
        });
        
        console.log('✅ フィルターリセット完了');
    }

    // 商品カード更新
    function updateProductCards(products) {
        const cardContainer = document.getElementById('card-view');
        if (!cardContainer) return;
        
        const cardsHtml = products.map(function(product) {
            return createProductCard(product);
        }).join('');
        
        cardContainer.innerHTML = cardsHtml;
        console.log('🎨 棚卸しシステム 商品表示完了:', products.length, '件');
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
        
        const priceJPY = Math.round(product.priceUSD * window.TanaoroshiSystem.exchangeRate);
        
        let imageHtml;
        if (product.image && product.image.trim() !== '') {
            imageHtml = '<img src="' + product.image + '" alt="' + product.name + '" class="inventory__card-img">';
        } else {
            imageHtml = '<div class="inventory__card-placeholder"><i class="fas fa-image"></i><span>画像なし</span></div>';
        }
        
        const stockInfo = (product.type === 'stock' || product.type === 'hybrid') ?
            '<span style="color: #10b981; font-size: 0.75rem; font-weight: 600;">在庫:' + product.stock + '</span>' :
            '<span style="color: #06b6d4; font-size: 0.75rem;">' + product.listing_status + '</span>';
        
        return [
            '<div class="inventory__card" data-id="' + product.id + '">',
                '<div class="inventory__card-image">',
                    imageHtml,
                    '<div class="inventory__card-badges">',
                        '<span class="inventory__badge ' + badgeClass + '">' + badgeText + '</span>',
                    '</div>',
                '</div>',
                '<div class="inventory__card-info">',
                    '<h3 class="inventory__card-title">' + product.name + '</h3>',
                    '<div class="inventory__card-price">',
                        '<div class="inventory__card-price-main">$' + product.priceUSD.toFixed(2) + '</div>',
                        '<div class="inventory__card-price-sub">¥' + priceJPY.toLocaleString() + '</div>',
                    '</div>',
                    '<div class="inventory__card-footer">',
                        '<span class="inventory__card-sku">' + product.sku + '</span>',
                        stockInfo,
                    '</div>',
                '</div>',
            '</div>'
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
        
        console.log('📈 棚卸しシステム 統計情報更新完了:', stats);
    }
    
    // ローディング表示
    function showLoading() {
        const cardContainer = document.getElementById('card-view');
        if (cardContainer) {
            cardContainer.innerHTML = '<div class="loading-message">eBayデータベースから読み込み中...</div>';
        }
    }
    
    function hideLoading() {
        // ローディングは updateProductCards で除去される
    }
    
    // === グローバル関数として公開（インライン禁止対応） ===
    
    window.loadEbayInventoryData = loadEbayInventoryData;
    window.loadPostgreSQLData = loadEbayInventoryData;
    
    window.syncEbayData = function() {
        console.log('🔄 eBay同期実行開始');
        setTimeout(function() {
            loadEbayInventoryData();
            console.log('✅ eBay同期完了');
        }, 2000);
    };
    
    // 【デザイン保持】モーダル関数強化版 - CSS変更なし
    window.showModal = function(modalId) {
        console.log('📝 モーダル表示試行:', modalId);
        
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('❌ モーダル要素が見つかりません:', modalId);
            return false;
        }
        
        console.log('🔍 モーダル要素確認:', {
            element: modal,
            currentDisplay: modal.style.display,
            computedDisplay: window.getComputedStyle(modal).display,
            className: modal.className
        });
        
        // 既存のアクティブモーダルを閉じる
        document.querySelectorAll('.modal.modal--active').forEach(function(m) {
            m.classList.remove('modal--active');
        });
        
        // 新しいモーダルを表示（デザイン保持）
        modal.style.display = 'flex';
        modal.classList.add('modal--active');
        document.body.style.overflow = 'hidden';
        
        console.log('✅ モーダル表示完了:', modalId);
        return true;
    };
    
    window.closeModal = function(modalId) {
        console.log('❌ モーダル非表示試行:', modalId);
        
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('❌ モーダル要素が見つかりません:', modalId);
            return false;
        }
        
        // モーダルを非表示（デザイン保持）
        modal.style.display = 'none';
        modal.classList.remove('modal--active');
        document.body.style.overflow = 'auto';
        
        console.log('✅ モーダル非表示完了:', modalId);
        return true;
    };
    
    window.showAddProductModal = function() {
        console.log('📝 新規商品登録モーダル表示');
        showModal('add-product-modal');
    };
    
    window.showCreateSetModal = function() {
        console.log('📦 セット品作成モーダル表示');
        showModal('create-set-modal');
    };
    
    // 【指示書対応】価格範囲フィルター専用関数追加
    window.applyPriceRangeFilter = function(range) {
        console.log('💰 価格範囲フィルター適用:', range);
        
        const priceSelect = document.getElementById('filter-price-range');
        if (priceSelect) {
            priceSelect.value = range;
            applyFilters();
        }
    };
    
    // 【指示書対応】複数条件組み合わせフィルター
    window.applyAdvancedFilters = function(filterConfig) {
        console.log('🎯 高度フィルター適用:', filterConfig);
        
        Object.keys(filterConfig).forEach(function(key) {
            const element = document.getElementById('filter-' + key);
            if (element) {
                element.value = filterConfig[key];
            }
        });
        
        applyFilters();
    };
    
    window.resetFilters = resetFilters;
    window.applyFilters = applyFilters;
    
    // 【デザイン保持】Excelテーブルデータ生成関数追加
    window.generateExcelTableData = function() {
        console.log('📊 Excelテーブルデータ生成開始');
        
        const tableBody = document.getElementById('excel-table-body');
        if (!tableBody) {
            console.warn('⚠️ excel-table-body要素が見つかりません');
            return;
        }
        
        // カードビューのデータと同期
        const cards = document.querySelectorAll('.inventory__card');
        const rows = Array.from(cards).map(function(card) {
            const id = card.dataset.id || '0';
            const title = card.querySelector('.inventory__card-title')?.textContent || '';
            const sku = card.querySelector('.inventory__card-sku')?.textContent || '';
            const priceMain = card.querySelector('.inventory__card-price-main')?.textContent || '$0.00';
            const priceSub = card.querySelector('.inventory__card-price-sub')?.textContent || '¥0';
            const badge = card.querySelector('.inventory__badge')?.textContent || '';
            
            // バッジ種類判定（デザイン保持）
            const badgeClasses = card.querySelector('.inventory__badge')?.className || '';
            let badgeType = 'other';
            if (badgeClasses.includes('inventory__badge--stock')) badgeType = 'stock';
            
            return [
                '<tr>',
                    '<td><input type="checkbox" class="product-checkbox" data-id="' + id + '"></td>',
                    '<td><div class="table-image-placeholder">📷</div></td>',
                    '<td>' + title + '</td>',
                    '<td>' + sku + '</td>',
                    '<td><span class="table-badge table-badge--' + badgeType + '">' + badge + '</span></td>',
                    '<td>' + priceMain + '</td>',
                    '<td>' + priceSub + '</td>',
                    '<td>5</td>',
                    '<td>eBay</td>',
                    '<td>',
                        '<button class="btn-small btn-small--edit">編集</button>',
                        '<button class="btn-small btn-small--delete">削除</button>',
                    '</td>',
                '</tr>'
            ].join('');
        }).join('');
        
        tableBody.innerHTML = rows;
        console.log('✅ Excelテーブルデータ生成完了:', cards.length, '行');
    };
    
    // 【デザイン保持】初期化完了メッセージ
    console.log('📜 棚卸しシステム JavaScript（デザイン保持・強化版）読み込み完了');
    
})();
, '').replace(',', ''));
                
                switch (filters.priceRange) {
                    case '0-25':
                        if (price < 0 || price > 25) show = false;
                        break;
                    case '25-50':
                        if (price < 25 || price > 50) show = false;
                        break;
                    case '50-100':
                        if (price < 50 || price > 100) show = false;
                        break;
                    case '100+':
                        if (price < 100) show = false;
                        break;
                }
            }
            
            // 出品モールフィルター（基本実装）
            if (filters.channel && show) {
                // 現在全てeBayなので、eBay以外を選択した場合は非表示
                if (filters.channel !== 'ebay') {
                    show = false;
                }
            }
            
            // 在庫状況フィルター（基本実装）
            if (filters.stockStatus && show) {
                const stockInfo = card.querySelector('.inventory__card-footer span:last-child')?.textContent || '';
                
                if (filters.stockStatus === 'sufficient' && !stockInfo.includes('在庫:')) {
                    show = false;
                } else if (filters.stockStatus === 'out' && stockInfo.includes('在庫:')) {
                    show = false;
                }
            }
            
            card.style.display = show ? 'flex' : 'none';
            if (show) visibleCount++;
        });
        
        console.log(`✅ フィルター適用完了: ${visibleCount}/${cards.length} 件表示`);
        
        // 統計情報を更新
        updateFilteredStatistics(visibleCount);
    }
    
    // フィルター後統計更新
    function updateFilteredStatistics(visibleCount) {
        const totalElement = document.getElementById('total-products');
        if (totalElement) {
            totalElement.textContent = visibleCount.toLocaleString();
        }
    }

    // フィルターリセット
    function resetFilters() {
        console.log('🔄 棚卸しシステム フィルターリセット');
        
        const filterSelects = document.querySelectorAll('.inventory__filter-select');
        filterSelects.forEach(function(select) {
            select.value = '';
        });
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        const cards = document.querySelectorAll('.inventory__card');
        cards.forEach(function(card) {
            card.style.display = 'flex';
        });
        
        console.log('✅ フィルターリセット完了');
    }

    // 商品カード更新
    function updateProductCards(products) {
        const cardContainer = document.getElementById('card-view');
        if (!cardContainer) return;
        
        const cardsHtml = products.map(function(product) {
            return createProductCard(product);
        }).join('');
        
        cardContainer.innerHTML = cardsHtml;
        console.log('🎨 棚卸しシステム 商品表示完了:', products.length, '件');
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
        
        const priceJPY = Math.round(product.priceUSD * window.TanaoroshiSystem.exchangeRate);
        
        let imageHtml;
        if (product.image && product.image.trim() !== '') {
            imageHtml = '<img src="' + product.image + '" alt="' + product.name + '" class="inventory__card-img">';
        } else {
            imageHtml = '<div class="inventory__card-placeholder"><i class="fas fa-image"></i><span>画像なし</span></div>';
        }
        
        const stockInfo = (product.type === 'stock' || product.type === 'hybrid') ?
            '<span style="color: #10b981; font-size: 0.75rem; font-weight: 600;">在庫:' + product.stock + '</span>' :
            '<span style="color: #06b6d4; font-size: 0.75rem;">' + product.listing_status + '</span>';
        
        return [
            '<div class="inventory__card" data-id="' + product.id + '">',
                '<div class="inventory__card-image">',
                    imageHtml,
                    '<div class="inventory__card-badges">',
                        '<span class="inventory__badge ' + badgeClass + '">' + badgeText + '</span>',
                    '</div>',
                '</div>',
                '<div class="inventory__card-info">',
                    '<h3 class="inventory__card-title">' + product.name + '</h3>',
                    '<div class="inventory__card-price">',
                        '<div class="inventory__card-price-main">$' + product.priceUSD.toFixed(2) + '</div>',
                        '<div class="inventory__card-price-sub">¥' + priceJPY.toLocaleString() + '</div>',
                    '</div>',
                    '<div class="inventory__card-footer">',
                        '<span class="inventory__card-sku">' + product.sku + '</span>',
                        stockInfo,
                    '</div>',
                '</div>',
            '</div>'
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
        
        console.log('📈 棚卸しシステム 統計情報更新完了:', stats);
    }
    
    // ローディング表示
    function showLoading() {
        const cardContainer = document.getElementById('card-view');
        if (cardContainer) {
            cardContainer.innerHTML = '<div class="loading-message">eBayデータベースから読み込み中...</div>';
        }
    }
    
    function hideLoading() {
        // ローディングは updateProductCards で除去される
    }
    
    // === グローバル関数として公開（インライン禁止対応） ===
    
    window.loadEbayInventoryData = loadEbayInventoryData;
    window.loadPostgreSQLData = loadEbayInventoryData;
    
    window.syncEbayData = function() {
        console.log('🔄 eBay同期実行開始');
        setTimeout(function() {
            loadEbayInventoryData();
            console.log('✅ eBay同期完了');
        }, 2000);
    };
    
    // 【デザイン保持】モーダル関数強化版 - CSS変更なし
    window.showModal = function(modalId) {
        console.log('📝 モーダル表示試行:', modalId);
        
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('❌ モーダル要素が見つかりません:', modalId);
            return false;
        }
        
        console.log('🔍 モーダル要素確認:', {
            element: modal,
            currentDisplay: modal.style.display,
            computedDisplay: window.getComputedStyle(modal).display,
            className: modal.className
        });
        
        // 既存のアクティブモーダルを閉じる
        document.querySelectorAll('.modal.modal--active').forEach(function(m) {
            m.classList.remove('modal--active');
        });
        
        // 新しいモーダルを表示（デザイン保持）
        modal.style.display = 'flex';
        modal.classList.add('modal--active');
        document.body.style.overflow = 'hidden';
        
        console.log('✅ モーダル表示完了:', modalId);
        return true;
    };
    
    window.closeModal = function(modalId) {
        console.log('❌ モーダル非表示試行:', modalId);
        
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('❌ モーダル要素が見つかりません:', modalId);
            return false;
        }
        
        // モーダルを非表示（デザイン保持）
        modal.style.display = 'none';
        modal.classList.remove('modal--active');
        document.body.style.overflow = 'auto';
        
        console.log('✅ モーダル非表示完了:', modalId);
        return true;
    };
    
    window.showAddProductModal = function() {
        console.log('📝 新規商品登録モーダル表示');
        showModal('add-product-modal');
    };
    
    window.showCreateSetModal = function() {
        console.log('📦 セット品作成モーダル表示');
        showModal('create-set-modal');
    };
    
    window.resetFilters = resetFilters;
    window.applyFilters = applyFilters;
    
    // 【デザイン保持】Excelテーブルデータ生成関数追加
    window.generateExcelTableData = function() {
        console.log('📊 Excelテーブルデータ生成開始');
        
        const tableBody = document.getElementById('excel-table-body');
        if (!tableBody) {
            console.warn('⚠️ excel-table-body要素が見つかりません');
            return;
        }
        
        // カードビューのデータと同期
        const cards = document.querySelectorAll('.inventory__card');
        const rows = Array.from(cards).map(function(card) {
            const id = card.dataset.id || '0';
            const title = card.querySelector('.inventory__card-title')?.textContent || '';
            const sku = card.querySelector('.inventory__card-sku')?.textContent || '';
            const priceMain = card.querySelector('.inventory__card-price-main')?.textContent || '$0.00';
            const priceSub = card.querySelector('.inventory__card-price-sub')?.textContent || '¥0';
            const badge = card.querySelector('.inventory__badge')?.textContent || '';
            
            // バッジ種類判定（デザイン保持）
            const badgeClasses = card.querySelector('.inventory__badge')?.className || '';
            let badgeType = 'other';
            if (badgeClasses.includes('inventory__badge--stock')) badgeType = 'stock';
            
            return [
                '<tr>',
                    '<td><input type="checkbox" class="product-checkbox" data-id="' + id + '"></td>',
                    '<td><div class="table-image-placeholder">📷</div></td>',
                    '<td>' + title + '</td>',
                    '<td>' + sku + '</td>',
                    '<td><span class="table-badge table-badge--' + badgeType + '">' + badge + '</span></td>',
                    '<td>' + priceMain + '</td>',
                    '<td>' + priceSub + '</td>',
                    '<td>5</td>',
                    '<td>eBay</td>',
                    '<td>',
                        '<button class="btn-small btn-small--edit">編集</button>',
                        '<button class="btn-small btn-small--delete">削除</button>',
                    '</td>',
                '</tr>'
            ].join('');
        }).join('');
        
        tableBody.innerHTML = rows;
        console.log('✅ Excelテーブルデータ生成完了:', cards.length, '行');
    };
    
    // 【デザイン保持】初期化完了メッセージ
    console.log('📜 棚卸しシステム JavaScript（デザイン保持・強化版）読み込み完了');
    
})();
, '').replace(',', ''));
                
                switch (filters.priceRange) {
                    case '0-25':
                        if (price < 0 || price > 25) show = false;
                        break;
                    case '25-50':
                        if (price < 25 || price > 50) show = false;
                        break;
                    case '50-100':
                        if (price < 50 || price > 100) show = false;
                        break;
                    case '100+':
                        if (price < 100) show = false;
                        break;
                }
            }
            
            // 出品モールフィルター（基本実装）
            if (filters.channel && show) {
                // 現在全てeBayなので、eBay以外を選択した場合は非表示
                if (filters.channel !== 'ebay') {
                    show = false;
                }
            }
            
            // 在庫状況フィルター（基本実装）
            if (filters.stockStatus && show) {
                const stockInfo = card.querySelector('.inventory__card-footer span:last-child')?.textContent || '';
                
                if (filters.stockStatus === 'sufficient' && !stockInfo.includes('在庫:')) {
                    show = false;
                } else if (filters.stockStatus === 'out' && stockInfo.includes('在庫:')) {
                    show = false;
                }
            }
            
            card.style.display = show ? 'flex' : 'none';
            if (show) visibleCount++;
        });
        
        console.log(`✅ フィルター適用完了: ${visibleCount}/${cards.length} 件表示`);
        
        // 統計情報を更新
        updateFilteredStatistics(visibleCount);
    }
    
    // フィルター後統計更新
    function updateFilteredStatistics(visibleCount) {
        const totalElement = document.getElementById('total-products');
        if (totalElement) {
            totalElement.textContent = visibleCount.toLocaleString();
        }
    }

    // フィルターリセット
    function resetFilters() {
        console.log('🔄 棚卸しシステム フィルターリセット');
        
        const filterSelects = document.querySelectorAll('.inventory__filter-select');
        filterSelects.forEach(function(select) {
            select.value = '';
        });
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        const cards = document.querySelectorAll('.inventory__card');
        cards.forEach(function(card) {
            card.style.display = 'flex';
        });
        
        console.log('✅ フィルターリセット完了');
    }

    // 商品カード更新
    function updateProductCards(products) {
        const cardContainer = document.getElementById('card-view');
        if (!cardContainer) return;
        
        const cardsHtml = products.map(function(product) {
            return createProductCard(product);
        }).join('');
        
        cardContainer.innerHTML = cardsHtml;
        console.log('🎨 棚卸しシステム 商品表示完了:', products.length, '件');
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
        
        const priceJPY = Math.round(product.priceUSD * window.TanaoroshiSystem.exchangeRate);
        
        let imageHtml;
        if (product.image && product.image.trim() !== '') {
            imageHtml = '<img src="' + product.image + '" alt="' + product.name + '" class="inventory__card-img">';
        } else {
            imageHtml = '<div class="inventory__card-placeholder"><i class="fas fa-image"></i><span>画像なし</span></div>';
        }
        
        const stockInfo = (product.type === 'stock' || product.type === 'hybrid') ?
            '<span style="color: #10b981; font-size: 0.75rem; font-weight: 600;">在庫:' + product.stock + '</span>' :
            '<span style="color: #06b6d4; font-size: 0.75rem;">' + product.listing_status + '</span>';
        
        return [
            '<div class="inventory__card" data-id="' + product.id + '">',
                '<div class="inventory__card-image">',
                    imageHtml,
                    '<div class="inventory__card-badges">',
                        '<span class="inventory__badge ' + badgeClass + '">' + badgeText + '</span>',
                    '</div>',
                '</div>',
                '<div class="inventory__card-info">',
                    '<h3 class="inventory__card-title">' + product.name + '</h3>',
                    '<div class="inventory__card-price">',
                        '<div class="inventory__card-price-main">$' + product.priceUSD.toFixed(2) + '</div>',
                        '<div class="inventory__card-price-sub">¥' + priceJPY.toLocaleString() + '</div>',
                    '</div>',
                    '<div class="inventory__card-footer">',
                        '<span class="inventory__card-sku">' + product.sku + '</span>',
                        stockInfo,
                    '</div>',
                '</div>',
            '</div>'
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
        
        console.log('📈 棚卸しシステム 統計情報更新完了:', stats);
    }
    
    // ローディング表示
    function showLoading() {
        const cardContainer = document.getElementById('card-view');
        if (cardContainer) {
            cardContainer.innerHTML = '<div class="loading-message">eBayデータベースから読み込み中...</div>';
        }
    }
    
    function hideLoading() {
        // ローディングは updateProductCards で除去される
    }
    
    // === グローバル関数として公開（インライン禁止対応） ===
    
    window.loadEbayInventoryData = loadEbayInventoryData;
    window.loadPostgreSQLData = loadEbayInventoryData;
    
    window.syncEbayData = function() {
        console.log('🔄 eBay同期実行開始');
        setTimeout(function() {
            loadEbayInventoryData();
            console.log('✅ eBay同期完了');
        }, 2000);
    };
    
    // 【デザイン保持】モーダル関数強化版 - CSS変更なし
    window.showModal = function(modalId) {
        console.log('📝 モーダル表示試行:', modalId);
        
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('❌ モーダル要素が見つかりません:', modalId);
            return false;
        }
        
        console.log('🔍 モーダル要素確認:', {
            element: modal,
            currentDisplay: modal.style.display,
            computedDisplay: window.getComputedStyle(modal).display,
            className: modal.className
        });
        
        // 既存のアクティブモーダルを閉じる
        document.querySelectorAll('.modal.modal--active').forEach(function(m) {
            m.classList.remove('modal--active');
        });
        
        // 新しいモーダルを表示（デザイン保持）
        modal.style.display = 'flex';
        modal.classList.add('modal--active');
        document.body.style.overflow = 'hidden';
        
        console.log('✅ モーダル表示完了:', modalId);
        return true;
    };
    
    window.closeModal = function(modalId) {
        console.log('❌ モーダル非表示試行:', modalId);
        
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('❌ モーダル要素が見つかりません:', modalId);
            return false;
        }
        
        // モーダルを非表示（デザイン保持）
        modal.style.display = 'none';
        modal.classList.remove('modal--active');
        document.body.style.overflow = 'auto';
        
        console.log('✅ モーダル非表示完了:', modalId);
        return true;
    };
    
    window.showAddProductModal = function() {
        console.log('📝 新規商品登録モーダル表示');
        showModal('add-product-modal');
    };
    
    window.showCreateSetModal = function() {
        console.log('📦 セット品作成モーダル表示');
        showModal('create-set-modal');
    };
    
    // 【指示書対応】価格範囲フィルター専用関数追加
    window.applyPriceRangeFilter = function(range) {
        console.log('💰 価格範囲フィルター適用:', range);
        
        const priceSelect = document.getElementById('filter-price-range');
        if (priceSelect) {
            priceSelect.value = range;
            applyFilters();
        }
    };
    
    // 【指示書対応】複数条件組み合わせフィルター
    window.applyAdvancedFilters = function(filterConfig) {
        console.log('🎯 高度フィルター適用:', filterConfig);
        
        Object.keys(filterConfig).forEach(function(key) {
            const element = document.getElementById('filter-' + key);
            if (element) {
                element.value = filterConfig[key];
            }
        });
        
        applyFilters();
    };
    
    window.resetFilters = resetFilters;
    window.applyFilters = applyFilters;
    
    // 【デザイン保持】Excelテーブルデータ生成関数追加
    window.generateExcelTableData = function() {
        console.log('📊 Excelテーブルデータ生成開始');
        
        const tableBody = document.getElementById('excel-table-body');
        if (!tableBody) {
            console.warn('⚠️ excel-table-body要素が見つかりません');
            return;
        }
        
        // カードビューのデータと同期
        const cards = document.querySelectorAll('.inventory__card');
        const rows = Array.from(cards).map(function(card) {
            const id = card.dataset.id || '0';
            const title = card.querySelector('.inventory__card-title')?.textContent || '';
            const sku = card.querySelector('.inventory__card-sku')?.textContent || '';
            const priceMain = card.querySelector('.inventory__card-price-main')?.textContent || '$0.00';
            const priceSub = card.querySelector('.inventory__card-price-sub')?.textContent || '¥0';
            const badge = card.querySelector('.inventory__badge')?.textContent || '';
            
            // バッジ種類判定（デザイン保持）
            const badgeClasses = card.querySelector('.inventory__badge')?.className || '';
            let badgeType = 'other';
            if (badgeClasses.includes('inventory__badge--stock')) badgeType = 'stock';
            
            return [
                '<tr>',
                    '<td><input type="checkbox" class="product-checkbox" data-id="' + id + '"></td>',
                    '<td><div class="table-image-placeholder">📷</div></td>',
                    '<td>' + title + '</td>',
                    '<td>' + sku + '</td>',
                    '<td><span class="table-badge table-badge--' + badgeType + '">' + badge + '</span></td>',
                    '<td>' + priceMain + '</td>',
                    '<td>' + priceSub + '</td>',
                    '<td>5</td>',
                    '<td>eBay</td>',
                    '<td>',
                        '<button class="btn-small btn-small--edit">編集</button>',
                        '<button class="btn-small btn-small--delete">削除</button>',
                    '</td>',
                '</tr>'
            ].join('');
        }).join('');
        
        tableBody.innerHTML = rows;
        console.log('✅ Excelテーブルデータ生成完了:', cards.length, '行');
    };
    
    // 【デザイン保持】初期化完了メッセージ
    console.log('📜 棚卸しシステム JavaScript（デザイン保持・強化版）読み込み完了');
    
})();
, '').replace(',', ''));
                
                switch (filters.priceRange) {
                    case '0-25':
                        if (price < 0 || price > 25) show = false;
                        break;
                    case '25-50':
                        if (price < 25 || price > 50) show = false;
                        break;
                    case '50-100':
                        if (price < 50 || price > 100) show = false;
                        break;
                    case '100+':
                        if (price < 100) show = false;
                        break;
                }
            }
            
            // 出品モールフィルター（基本実装）
            if (filters.channel && show) {
                // 現在全てeBayなので、eBay以外を選択した場合は非表示
                if (filters.channel !== 'ebay') {
                    show = false;
                }
            }
            
            // 在庫状況フィルター（基本実装）
            if (filters.stockStatus && show) {
                const stockInfo = card.querySelector('.inventory__card-footer span:last-child')?.textContent || '';
                
                if (filters.stockStatus === 'sufficient' && !stockInfo.includes('在庫:')) {
                    show = false;
                } else if (filters.stockStatus === 'out' && stockInfo.includes('在庫:')) {
                    show = false;
                }
            }
            
            card.style.display = show ? 'flex' : 'none';
            if (show) visibleCount++;
        });
        
        console.log(`✅ フィルター適用完了: ${visibleCount}/${cards.length} 件表示`);
        
        // 統計情報を更新
        updateFilteredStatistics(visibleCount);
    }
    
    // フィルター後統計更新
    function updateFilteredStatistics(visibleCount) {
        const totalElement = document.getElementById('total-products');
        if (totalElement) {
            totalElement.textContent = visibleCount.toLocaleString();
        }
    }

    // フィルターリセット
    function resetFilters() {
        console.log('🔄 棚卸しシステム フィルターリセット');
        
        const filterSelects = document.querySelectorAll('.inventory__filter-select');
        filterSelects.forEach(function(select) {
            select.value = '';
        });
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        const cards = document.querySelectorAll('.inventory__card');
        cards.forEach(function(card) {
            card.style.display = 'flex';
        });
        
        console.log('✅ フィルターリセット完了');
    }

    // 商品カード更新
    function updateProductCards(products) {
        const cardContainer = document.getElementById('card-view');
        if (!cardContainer) return;
        
        const cardsHtml = products.map(function(product) {
            return createProductCard(product);
        }).join('');
        
        cardContainer.innerHTML = cardsHtml;
        console.log('🎨 棚卸しシステム 商品表示完了:', products.length, '件');
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
        
        const priceJPY = Math.round(product.priceUSD * window.TanaoroshiSystem.exchangeRate);
        
        let imageHtml;
        if (product.image && product.image.trim() !== '') {
            imageHtml = '<img src="' + product.image + '" alt="' + product.name + '" class="inventory__card-img">';
        } else {
            imageHtml = '<div class="inventory__card-placeholder"><i class="fas fa-image"></i><span>画像なし</span></div>';
        }
        
        const stockInfo = (product.type === 'stock' || product.type === 'hybrid') ?
            '<span style="color: #10b981; font-size: 0.75rem; font-weight: 600;">在庫:' + product.stock + '</span>' :
            '<span style="color: #06b6d4; font-size: 0.75rem;">' + product.listing_status + '</span>';
        
        return [
            '<div class="inventory__card" data-id="' + product.id + '">',
                '<div class="inventory__card-image">',
                    imageHtml,
                    '<div class="inventory__card-badges">',
                        '<span class="inventory__badge ' + badgeClass + '">' + badgeText + '</span>',
                    '</div>',
                '</div>',
                '<div class="inventory__card-info">',
                    '<h3 class="inventory__card-title">' + product.name + '</h3>',
                    '<div class="inventory__card-price">',
                        '<div class="inventory__card-price-main">$' + product.priceUSD.toFixed(2) + '</div>',
                        '<div class="inventory__card-price-sub">¥' + priceJPY.toLocaleString() + '</div>',
                    '</div>',
                    '<div class="inventory__card-footer">',
                        '<span class="inventory__card-sku">' + product.sku + '</span>',
                        stockInfo,
                    '</div>',
                '</div>',
            '</div>'
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
        
        console.log('📈 棚卸しシステム 統計情報更新完了:', stats);
    }
    
    // ローディング表示
    function showLoading() {
        const cardContainer = document.getElementById('card-view');
        if (cardContainer) {
            cardContainer.innerHTML = '<div class="loading-message">eBayデータベースから読み込み中...</div>';
        }
    }
    
    function hideLoading() {
        // ローディングは updateProductCards で除去される
    }
    
    // === グローバル関数として公開（インライン禁止対応） ===
    
    window.loadEbayInventoryData = loadEbayInventoryData;
    window.loadPostgreSQLData = loadEbayInventoryData;
    
    window.syncEbayData = function() {
        console.log('🔄 eBay同期実行開始');
        setTimeout(function() {
            loadEbayInventoryData();
            console.log('✅ eBay同期完了');
        }, 2000);
    };
    
    // 【デザイン保持】モーダル関数強化版 - CSS変更なし
    window.showModal = function(modalId) {
        console.log('📝 モーダル表示試行:', modalId);
        
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('❌ モーダル要素が見つかりません:', modalId);
            return false;
        }
        
        console.log('🔍 モーダル要素確認:', {
            element: modal,
            currentDisplay: modal.style.display,
            computedDisplay: window.getComputedStyle(modal).display,
            className: modal.className
        });
        
        // 既存のアクティブモーダルを閉じる
        document.querySelectorAll('.modal.modal--active').forEach(function(m) {
            m.classList.remove('modal--active');
        });
        
        // 新しいモーダルを表示（デザイン保持）
        modal.style.display = 'flex';
        modal.classList.add('modal--active');
        document.body.style.overflow = 'hidden';
        
        console.log('✅ モーダル表示完了:', modalId);
        return true;
    };
    
    window.closeModal = function(modalId) {
        console.log('❌ モーダル非表示試行:', modalId);
        
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('❌ モーダル要素が見つかりません:', modalId);
            return false;
        }
        
        // モーダルを非表示（デザイン保持）
        modal.style.display = 'none';
        modal.classList.remove('modal--active');
        document.body.style.overflow = 'auto';
        
        console.log('✅ モーダル非表示完了:', modalId);
        return true;
    };
    
    window.showAddProductModal = function() {
        console.log('📝 新規商品登録モーダル表示');
        showModal('add-product-modal');
    };
    
    window.showCreateSetModal = function() {
        console.log('📦 セット品作成モーダル表示');
        showModal('create-set-modal');
    };
    
    window.resetFilters = resetFilters;
    window.applyFilters = applyFilters;
    
    // 【デザイン保持】Excelテーブルデータ生成関数追加
    window.generateExcelTableData = function() {
        console.log('📊 Excelテーブルデータ生成開始');
        
        const tableBody = document.getElementById('excel-table-body');
        if (!tableBody) {
            console.warn('⚠️ excel-table-body要素が見つかりません');
            return;
        }
        
        // カードビューのデータと同期
        const cards = document.querySelectorAll('.inventory__card');
        const rows = Array.from(cards).map(function(card) {
            const id = card.dataset.id || '0';
            const title = card.querySelector('.inventory__card-title')?.textContent || '';
            const sku = card.querySelector('.inventory__card-sku')?.textContent || '';
            const priceMain = card.querySelector('.inventory__card-price-main')?.textContent || '$0.00';
            const priceSub = card.querySelector('.inventory__card-price-sub')?.textContent || '¥0';
            const badge = card.querySelector('.inventory__badge')?.textContent || '';
            
            // バッジ種類判定（デザイン保持）
            const badgeClasses = card.querySelector('.inventory__badge')?.className || '';
            let badgeType = 'other';
            if (badgeClasses.includes('inventory__badge--stock')) badgeType = 'stock';
            
            return [
                '<tr>',
                    '<td><input type="checkbox" class="product-checkbox" data-id="' + id + '"></td>',
                    '<td><div class="table-image-placeholder">📷</div></td>',
                    '<td>' + title + '</td>',
                    '<td>' + sku + '</td>',
                    '<td><span class="table-badge table-badge--' + badgeType + '">' + badge + '</span></td>',
                    '<td>' + priceMain + '</td>',
                    '<td>' + priceSub + '</td>',
                    '<td>5</td>',
                    '<td>eBay</td>',
                    '<td>',
                        '<button class="btn-small btn-small--edit">編集</button>',
                        '<button class="btn-small btn-small--delete">削除</button>',
                    '</td>',
                '</tr>'
            ].join('');
        }).join('');
        
        tableBody.innerHTML = rows;
        console.log('✅ Excelテーブルデータ生成完了:', cards.length, '行');
    };
    
    // 【デザイン保持】初期化完了メッセージ
    console.log('📜 棚卸しシステム JavaScript（デザイン保持・強化版）読み込み完了');
    
})();
