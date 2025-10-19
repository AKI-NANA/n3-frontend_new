/**
 * 棚卸しシステム JavaScript - グリッドレイアウト完全修正版
 * カード分割問題解決 + データソース修正対応
 * Version: 2.0 - Complete Grid Layout Fix
 */

(function() {
    'use strict';
    
    console.log('🚀 棚卸しシステム グリッドレイアウト完全修正版 読み込み開始');
    
    // システム状態管理
    const TanaoroshiFixed = {
        isInitialized: false,
        products: [],
        container: null,
        statsContainer: null,
        currentDataSource: 'unknown',
        layoutVersion: '2.0_complete_fix',
        imageUrls: [
            'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop',
            'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=200&fit=crop',
            'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=300&h=200&fit=crop',
            'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=300&h=200&fit=crop',
            'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=300&h=200&fit=crop',
            'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&h=200&fit=crop',
            'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=300&h=200&fit=crop',
            'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop'
        ]
    };
    
    // DOMContentLoaded時の初期化（一回限り）
    document.addEventListener('DOMContentLoaded', function() {
        if (TanaoroshiFixed.isInitialized) {
            console.log('⚠️ 既に初期化済み - 重複実行回避');
            return;
        }
        
        TanaoroshiFixed.isInitialized = true;
        console.log('📱 グリッドレイアウト完全修正版 初期化開始');
        
        initializeSystem();
    });
    
    /**
     * システム初期化
     */
    function initializeSystem() {
        // DOM要素取得
        TanaoroshiFixed.container = document.getElementById('card-view');
        TanaoroshiFixed.statsContainer = {
            total: document.getElementById('total-products'),
            stock: document.getElementById('stock-products'),
            dropship: document.getElementById('dropship-products'),
            set: document.getElementById('set-products'),
            hybrid: document.getElementById('hybrid-products'),
            value: document.getElementById('total-value')
        };
        
        if (!TanaoroshiFixed.container) {
            console.error('❌ card-view要素が見つかりません');
            return;
        }
        
        // レイアウト修正CSS強制適用
        forceApplyFixedLayout();
        
        // immediate修正ローディング表示
        showFixedLayoutLoading();
        
        // 3秒後にデータ取得開始
        setTimeout(function() {
            startDataFetch();
        }, 3000);
        
        console.log('✅ グリッドレイアウト完全修正版 初期化完了');
    }
    
    /**
     * 修正レイアウトCSS強制適用
     */
    function forceApplyFixedLayout() {
        console.log('🎨 修正レイアウトCSS強制適用開始');
        
        // 既存のインラインスタイルをクリア
        const existingStyles = document.querySelectorAll('style[data-tanaoroshi]');
        existingStyles.forEach(style => style.remove());
        
        // 完全修正版CSS注入
        const fixedLayoutCSS = `
            /* グリッドレイアウト完全修正版 */
            .inventory__grid {
                display: grid !important;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
                gap: 1.25rem !important;
                padding: 1.5rem !important;
                background: #f8fafc !important;
                min-height: 500px !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* カード分割問題完全解決 */
            .inventory__card {
                background: white !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 12px !important;
                overflow: hidden !important;
                cursor: pointer !important;
                transition: all 0.2s ease-in-out !important;
                position: relative !important;
                display: flex !important;
                flex-direction: column !important;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
                height: 380px !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                /* カード分割防止 */
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                contain: layout style !important;
            }
            
            .inventory__card:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
                border-color: #3b82f6 !important;
            }
            
            /* 画像セクション固定 */
            .inventory__card-image {
                position: relative !important;
                height: 200px !important;
                background: #f1f5f9 !important;
                overflow: hidden !important;
                flex-shrink: 0 !important;
                width: 100% !important;
            }
            
            .inventory__card-image img {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                object-position: center !important;
                display: block !important;
                transition: transform 0.2s ease !important;
            }
            
            .inventory__card:hover .inventory__card-image img {
                transform: scale(1.05) !important;
            }
            
            /* 情報セクション固定 */
            .inventory__card-info {
                padding: 1rem !important;
                flex: 1 !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 0.75rem !important;
                justify-content: space-between !important;
                min-height: 0 !important;
                width: 100% !important;
                box-sizing: border-box !important;
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
                word-wrap: break-word !important;
            }
            
            .inventory__card-price {
                display: flex !important;
                flex-direction: column !important;
                gap: 0.25rem !important;
                margin: 0.5rem 0 !important;
            }
            
            .inventory__card-price-main {
                font-size: 1.125rem !important;
                font-weight: 700 !important;
                color: #059669 !important;
                line-height: 1 !important;
            }
            
            .inventory__card-price-sub {
                font-size: 0.8rem !important;
                color: #64748b !important;
                line-height: 1 !important;
            }
            
            /* フッター固定 */
            .inventory__card-footer {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                margin-top: auto !important;
                padding-top: 0.75rem !important;
                border-top: 1px solid #f1f5f9 !important;
                font-size: 0.8rem !important;
                min-height: 2rem !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* バッジ位置固定 */
            .inventory__badge {
                position: absolute !important;
                top: 0.75rem !important;
                left: 0.75rem !important;
                padding: 0.25rem 0.5rem !important;
                border-radius: 0.375rem !important;
                font-size: 0.7rem !important;
                font-weight: 700 !important;
                text-transform: uppercase !important;
                color: white !important;
                z-index: 10 !important;
                max-width: calc(100% - 4rem) !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }
            
            .inventory__channel-badge {
                position: absolute !important;
                top: 0.75rem !important;
                right: 0.75rem !important;
                padding: 0.25rem 0.5rem !important;
                border-radius: 0.375rem !important;
                font-size: 0.7rem !important;
                font-weight: 700 !important;
                background: #0064d2 !important;
                color: white !important;
                z-index: 10 !important;
            }
            
            /* レスポンシブ調整 */
            @media (max-width: 1200px) {
                .inventory__grid {
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important;
                    gap: 1rem !important;
                }
                .inventory__card {
                    height: 350px !important;
                }
                .inventory__card-image {
                    height: 180px !important;
                }
            }
            
            @media (max-width: 768px) {
                .inventory__grid {
                    grid-template-columns: repeat(2, 1fr) !important;
                    gap: 0.75rem !important;
                    padding: 1rem !important;
                }
                .inventory__card {
                    height: 320px !important;
                }
                .inventory__card-image {
                    height: 160px !important;
                }
            }
            
            @media (max-width: 480px) {
                .inventory__grid {
                    grid-template-columns: 1fr !important;
                    padding: 0.75rem !important;
                }
                .inventory__card {
                    height: 300px !important;
                }
                .inventory__card-image {
                    height: 140px !important;
                }
            }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.setAttribute('data-tanaoroshi', 'fixed-layout');
        styleElement.textContent = fixedLayoutCSS;
        document.head.appendChild(styleElement);
        
        console.log('🎨 修正レイアウトCSS適用完了');
    }
    
    /**
     * 修正版ローディング表示
     */
    function showFixedLayoutLoading() {
        if (!TanaoroshiFixed.container) return;
        
        const loadingHTML = `
            <div class="loading-container">
                <div class="loading-images">
                    <img src="${TanaoroshiFixed.imageUrls[0]}" alt="Sample 1">
                    <img src="${TanaoroshiFixed.imageUrls[1]}" alt="Sample 2">
                    <img src="${TanaoroshiFixed.imageUrls[2]}" alt="Sample 3">
                </div>
                <h3 class="loading-title">🔧 グリッドレイアウト完全修正版でデータ読み込み中...</h3>
                <p class="loading-subtitle">カード分割問題解決 + データソース修正を実行します</p>
                <div class="loading-status">
                    <strong>📊 データソース調査中...</strong><br>
                    <span style="font-size: 0.8rem; color: #64748b;">
                        Version: ${TanaoroshiFixed.layoutVersion} | 
                        問題: mystical_japan_treasures_inventory → 実際のeBayデータに変更予定
                    </span>
                </div>
            </div>
        `;
        
        TanaoroshiFixed.container.innerHTML = loadingHTML;
        console.log('📱 修正版ローディング表示完了');
    }
    
    /**
     * データ取得開始
     */
    function startDataFetch() {
        console.log('📂 グリッドレイアウト完全修正版 データ取得開始');
        
        // N3 Ajax関数を使用してデータ取得
        if (typeof window.executeAjax === 'function') {
            console.log('🔗 N3 Ajax関数でデータ取得実行');
            
            window.executeAjax('ebay_inventory_get_data', {
                page: 'tanaoroshi_inline_complete',
                layout_version: TanaoroshiFixed.layoutVersion,
                fix_grid_layout: true,
                limit: 24,
                with_images: true,
                debug_database_source: true
            }).then(function(result) {
                console.log('📊 Ajax応答受信:', result);
                handleDataResponse(result);
            }).catch(function(error) {
                console.error('❌ Ajax データ取得エラー:', error);
                showFixedLayoutFallback();
            });
        } else {
            console.log('⚠️ N3 Ajax関数が使用できません - フォールバック実行');
            showFixedLayoutFallback();
        }
    }
    
    /**
     * データ応答処理
     */
    function handleDataResponse(result) {
        if (result && result.success && result.data && Array.isArray(result.data)) {
            if (result.data.length > 0) {
                console.log('✅ データ取得成功:', result.data.length, '件');
                
                // データソース情報記録
                TanaoroshiFixed.currentDataSource = result.source || 'unknown';
                
                // 画像URL割り当て
                assignValidImageUrls(result.data);
                
                TanaoroshiFixed.products = result.data;
                showFixedLayoutCards(result);
                updateFixedLayoutStats();
                
                console.log('📍 データソース詳細:', {
                    source: result.source,
                    table_name: result.table_name,
                    hook_version: result.hook_version,
                    layout_version: TanaoroshiFixed.layoutVersion
                });
            } else {
                console.log('⚠️ データが空 - フォールバック実行');
                showFixedLayoutFallback();
            }
        } else {
            console.error('❌ データ構造エラー - フォールバック実行');
            showFixedLayoutFallback();
        }
    }
    
    /**
     * 有効な画像URL割り当て
     */
    function assignValidImageUrls(data) {
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const imageIndex = i % TanaoroshiFixed.imageUrls.length;
            const imageUrl = TanaoroshiFixed.imageUrls[imageIndex];
            
            item.gallery_url = imageUrl;
            item.picture_url = imageUrl;
            item.image_url = imageUrl;
        }
        console.log('🖼️ 画像URL割り当て完了:', data.length, '件');
    }
    
    /**
     * 修正レイアウトでカード表示
     */
    function showFixedLayoutCards(result) {
        console.log('🎨 修正レイアウトでカード表示開始');
        
        if (!TanaoroshiFixed.container) return;
        
        let html = '';
        
        // データソース情報表示
        html += createDataSourceInfo(result);
        
        // カード生成（最大24件）
        const displayCount = Math.min(TanaoroshiFixed.products.length, 24);
        for (let i = 0; i < displayCount; i++) {
            html += createFixedLayoutCard(TanaoroshiFixed.products[i], i);
        }
        
        // DOM更新（一回のみ）
        TanaoroshiFixed.container.innerHTML = html;
        
        console.log('✅ 修正レイアウトでカード表示完了:', displayCount, '件');
    }
    
    /**
     * データソース情報作成
     */
    function createDataSourceInfo(result) {
        const isCorrectData = result.source !== 'postgresql_mystical_japan_treasures';
        const statusClass = isCorrectData ? 'data-source-info' : 'warning-message';
        const statusIcon = isCorrectData ? '✅' : '⚠️';
        const statusText = isCorrectData ? 'データソース確認結果' : 'データソース問題検出';
        
        return `
            <div class="${statusClass}">
                <h3>${statusIcon} ${statusText}</h3>
                <div class="data-source-grid">
                    <div><strong>ソース:</strong> ${result.source || '不明'}</div>
                    <div><strong>テーブル:</strong> ${result.table_name || '不明'}</div>
                    <div><strong>Hook:</strong> ${result.hook_version || '不明'}</div>
                    <div><strong>件数:</strong> ${TanaoroshiFixed.products.length}件</div>
                    <div><strong>レイアウト:</strong> ${TanaoroshiFixed.layoutVersion}</div>
                    <div><strong>修正状況:</strong> ${isCorrectData ? '✅ 正常' : '❌ 修正必要'}</div>
                </div>
                ${!isCorrectData ? '<p>mystical_japan_treasures_inventory は当店データではありません。実際のeBayデータテーブルへの変更が必要です。</p>' : ''}
            </div>
        `;
    }
    
    /**
     * 修正レイアウトカード作成
     */
    function createFixedLayoutCard(item, index) {
        const title = item.title || item.name || 'タイトル不明';
        const price = parseFloat(item.price || item.current_price || item.start_price || 0);
        const quantity = parseInt(item.quantity || item.available_quantity || 0);
        const sku = item.sku || item.item_id || `SKU-${String(index + 1).padStart(3, '0')}`;
        const imageUrl = item.gallery_url || item.picture_url || item.image_url || TanaoroshiFixed.imageUrls[index % TanaoroshiFixed.imageUrls.length];
        
        // 商品種別判定
        let productType = 'hybrid';
        let typeColor = '#0e7490';
        let typeLabel = 'ハイブリッド';
        
        if (quantity > 10) {
            productType = 'stock';
            typeColor = '#059669';
            typeLabel = '有在庫';
        } else if (quantity === 0) {
            productType = 'dropship';
            typeColor = '#7c3aed';
            typeLabel = '無在庫';
        }
        
        // 価格表示
        const priceUSD = price.toFixed(2);
        const priceJPY = Math.round(price * 150.25).toLocaleString();
        
        // 在庫表示色
        let stockColor = '#10b981';
        if (quantity === 0) stockColor = '#ef4444';
        else if (quantity < 5) stockColor = '#f59e0b';
        
        return `
            <div class="inventory__card" data-index="${index}" data-type="${productType}">
                <div class="inventory__card-image">
                    <img src="${imageUrl}" 
                         alt="商品画像" 
                         loading="lazy"
                         onload="console.log('✅ 画像読み込み成功: ${index}')" 
                         onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=\\"display: flex; align-items: center; justify-content: center; height: 100%; background: #f1f5f9; color: #64748b;\\"><div style=\\"text-align: center;\\"><div style=\\"font-size: 2rem; margin-bottom: 0.5rem;\\">📦</div><div>No Image</div></div></div>';">
                    <span class="inventory__badge" style="background: ${typeColor};">${typeLabel}</span>
                    <span class="inventory__channel-badge">eBay</span>
                </div>
                <div class="inventory__card-info">
                    <h3 class="inventory__card-title">${escapeHtml(title.substring(0, 100))}</h3>
                    <div class="inventory__card-price">
                        <div class="inventory__card-price-main">$${priceUSD}</div>
                        <div class="inventory__card-price-sub">¥${priceJPY}</div>
                    </div>
                    <div class="inventory__card-footer">
                        <span class="inventory__card-sku">${escapeHtml(sku.substring(0, 20))}</span>
                        <span style="color: ${stockColor}; font-weight: 600;">在庫: ${quantity}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * フォールバックデータ表示（修正レイアウト）
     */
    function showFixedLayoutFallback() {
        console.log('🔄 修正レイアウト フォールバックデータ表示');
        
        if (!TanaoroshiFixed.container) return;
        
        const sampleData = [
            { title: 'Sample Product 1 - Grid Layout Fixed (Database Connection Failed)', price: 299.99, quantity: 3, sku: 'SAMPLE-001' },
            { title: 'Sample Product 2 - Grid Layout Fixed (Database Connection Failed)', price: 499.99, quantity: 1, sku: 'SAMPLE-002' },
            { title: 'Sample Product 3 - Grid Layout Fixed (Database Connection Failed)', price: 799.99, quantity: 2, sku: 'SAMPLE-003' },
            { title: 'Sample Product 4 - Grid Layout Fixed (Database Connection Failed)', price: 249.99, quantity: 5, sku: 'SAMPLE-004' },
            { title: 'Sample Product 5 - Grid Layout Fixed (Database Connection Failed)', price: 699.99, quantity: 0, sku: 'SAMPLE-005' },
            { title: 'Sample Product 6 - Grid Layout Fixed (Database Connection Failed)', price: 399.99, quantity: 8, sku: 'SAMPLE-006' }
        ];
        
        // 画像URL割り当て
        assignValidImageUrls(sampleData);
        TanaoroshiFixed.products = sampleData;
        TanaoroshiFixed.currentDataSource = 'fallback_sample';
        
        let html = '';
        
        // 接続エラー警告
        html += `
            <div class="warning-message">
                <h3>⚠️ データベース接続エラー</h3>
                <p>Ajax接続できないため、グリッドレイアウト修正版のサンプルデータを表示しています。実際のデータベースを確認してください。</p>
                <div style="margin-top: 0.5rem; font-size: 0.8rem;">
                    <strong>レイアウト修正:</strong> カード分割問題は解決されました ✅
                </div>
            </div>
        `;
        
        // カード生成
        for (let i = 0; i < sampleData.length; i++) {
            html += createFixedLayoutCard(sampleData[i], i);
        }
        
        TanaoroshiFixed.container.innerHTML = html;
        updateFixedLayoutStats();
        
        console.log('✅ 修正レイアウト フォールバックデータ表示完了:', sampleData.length, '件');
    }
    
    /**
     * 統計情報更新（修正レイアウト対応）
     */
    function updateFixedLayoutStats() {
        if (!TanaoroshiFixed.products.length || !TanaoroshiFixed.statsContainer) return;
        
        const stats = {
            total: TanaoroshiFixed.products.length,
            stock: 0,
            dropship: 0,
            set: 0,
            hybrid: 0,
            totalValue: 0
        };
        
        TanaoroshiFixed.products.forEach(product => {
            const quantity = parseInt(product.quantity || product.available_quantity || 0);
            const price = parseFloat(product.price || product.current_price || product.start_price || 0);
            
            stats.totalValue += price;
            
            if (quantity > 10) {
                stats.stock++;
            } else if (quantity === 0) {
                stats.dropship++;
            } else {
                stats.hybrid++;
            }
        });
        
        // DOM更新
        if (TanaoroshiFixed.statsContainer.total) {
            TanaoroshiFixed.statsContainer.total.textContent = stats.total;
        }
        if (TanaoroshiFixed.statsContainer.stock) {
            TanaoroshiFixed.statsContainer.stock.textContent = stats.stock;
        }
        if (TanaoroshiFixed.statsContainer.dropship) {
            TanaoroshiFixed.statsContainer.dropship.textContent = stats.dropship;
        }
        if (TanaoroshiFixed.statsContainer.hybrid) {
            TanaoroshiFixed.statsContainer.hybrid.textContent = stats.hybrid;
        }
        if (TanaoroshiFixed.statsContainer.value) {
            TanaoroshiFixed.statsContainer.value.textContent = '$' + (stats.totalValue / 1000).toFixed(1) + 'K';
        }
        
        console.log('📈 統計情報更新完了:', stats);
    }
    
    /**
     * HTMLエスケープ
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * フィルター・検索機能（基本実装）
     */
    function setupFilterFunctions() {
        // フィルターリセット
        window.resetFilters = function() {
            const selects = document.querySelectorAll('.inventory__filter-select');
            selects.forEach(select => select.value = '');
            
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.value = '';
            
            showAllProducts();
            console.log('🔄 フィルターリセット完了');
        };
        
        // フィルター適用
        window.applyFilters = function() {
            const filters = {
                type: document.getElementById('filter-type')?.value || '',
                channel: document.getElementById('filter-channel')?.value || '',
                stockStatus: document.getElementById('filter-stock-status')?.value || '',
                priceRange: document.getElementById('filter-price-range')?.value || '',
                searchTerm: document.getElementById('search-input')?.value.toLowerCase() || ''
            };
            
            applyProductFilters(filters);
            console.log('🔍 フィルター適用:', filters);
        };
        
        // eBayデータ再取得
        window.loadEbayInventoryData = function() {
            console.log('🔄 eBayデータ再取得開始');
            showFixedLayoutLoading();
            setTimeout(startDataFetch, 1000);
        };
    }
    
    /**
     * 全商品表示
     */
    function showAllProducts() {
        const cards = TanaoroshiFixed.container?.querySelectorAll('.inventory__card');
        if (cards) {
            cards.forEach(card => {
                card.style.display = 'flex';
            });
        }
    }
    
    /**
     * 商品フィルター適用
     */
    function applyProductFilters(filters) {
        const cards = TanaoroshiFixed.container?.querySelectorAll('.inventory__card');
        if (!cards) return;
        
        let visibleCount = 0;
        
        cards.forEach((card, index) => {
            const product = TanaoroshiFixed.products[index];
            if (!product) return;
            
            let shouldShow = true;
            
            // 種類フィルター
            if (filters.type && card.dataset.type !== filters.type) {
                shouldShow = false;
            }
            
            // 検索フィルター
            if (filters.searchTerm) {
                const title = product.title?.toLowerCase() || '';
                const sku = product.sku?.toLowerCase() || '';
                if (!title.includes(filters.searchTerm) && !sku.includes(filters.searchTerm)) {
                    shouldShow = false;
                }
            }
            
            // 価格フィルター
            if (filters.priceRange) {
                const price = parseFloat(product.price || product.current_price || product.start_price || 0);
                const [min, max] = filters.priceRange.split('-').map(p => p.replace('+', '').replace('$', ''));
                
                if (max) {
                    if (price < parseFloat(min) || price > parseFloat(max)) {
                        shouldShow = false;
                    }
                } else {
                    if (price < parseFloat(min)) {
                        shouldShow = false;
                    }
                }
            }
            
            card.style.display = shouldShow ? 'flex' : 'none';
            if (shouldShow) visibleCount++;
        });
        
        console.log('📊 フィルター結果:', visibleCount, '/', cards.length, '件表示');
    }
    
    /**
     * ビュー切り替え機能
     */
    function setupViewToggle() {
        const cardViewBtn = document.getElementById('card-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        const cardView = document.getElementById('card-view');
        const listView = document.getElementById('list-view');
        
        if (cardViewBtn && listViewBtn && cardView && listView) {
            cardViewBtn.addEventListener('click', function() {
                cardView.style.display = 'grid';
                listView.style.display = 'none';
                cardViewBtn.classList.add('inventory__view-btn--active');
                listViewBtn.classList.remove('inventory__view-btn--active');
                console.log('🎨 カードビューに切り替え');
            });
            
            listViewBtn.addEventListener('click', function() {
                cardView.style.display = 'none';
                listView.style.display = 'block';
                listViewBtn.classList.add('inventory__view-btn--active');
                cardViewBtn.classList.remove('inventory__view-btn--active');
                updateTableView();
                console.log('📊 リストビューに切り替え');
            });
        }
    }
    
    /**
     * テーブルビュー更新
     */
    function updateTableView() {
        const tableBody = document.getElementById('products-table-body');
        if (!tableBody || !TanaoroshiFixed.products.length) return;
        
        let html = '';
        
        TanaoroshiFixed.products.forEach((product, index) => {
            const title = product.title || product.name || 'タイトル不明';
            const price = parseFloat(product.price || product.current_price || product.start_price || 0);
            const quantity = parseInt(product.quantity || product.available_quantity || 0);
            const sku = product.sku || product.item_id || `SKU-${index + 1}`;
            const cost = price * 0.7; // 仮想仕入価格
            const profit = price - cost;
            
            html += `
                <tr>
                    <td><input type="checkbox" data-index="${index}"></td>
                    <td><img src="${product.gallery_url || TanaoroshiFixed.imageUrls[index % TanaoroshiFixed.imageUrls.length]}" style="width: 40px; height: 30px; object-fit: cover; border-radius: 4px;"></td>
                    <td>${escapeHtml(title.substring(0, 50))}${title.length > 50 ? '...' : ''}</td>
                    <td><code>${escapeHtml(sku.substring(0, 15))}</code></td>
                    <td><span class="badge badge--${quantity > 10 ? 'stock' : quantity === 0 ? 'dropship' : 'hybrid'}">${quantity > 10 ? '有在庫' : quantity === 0 ? '無在庫' : 'ハイブリッド'}</span></td>
                    <td><span class="badge badge--${quantity > 0 ? 'active' : 'inactive'}">${quantity > 0 ? 'アクティブ' : '在庫切れ'}</span></td>
                    <td>$${price.toFixed(2)}</td>
                    <td>${quantity}</td>
                    <td>$${cost.toFixed(2)}</td>
                    <td style="color: ${profit > 0 ? '#059669' : '#ef4444'}">$${profit.toFixed(2)}</td>
                    <td><span class="badge badge--ebay">eBay</span></td>
                    <td>${product.category || 'その他'}</td>
                    <td>
                        <button class="btn btn--small btn--primary" onclick="editProduct(${index})">編集</button>
                        <button class="btn btn--small btn--secondary" onclick="duplicateProduct(${index})">複製</button>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
        // テーブル情報更新
        const tableInfo = document.getElementById('table-info');
        if (tableInfo) {
            tableInfo.textContent = `${TanaoroshiFixed.products.length}件の商品を表示中`;
        }
        
        console.log('📊 テーブルビュー更新完了:', TanaoroshiFixed.products.length, '件');
    }
    
    /**
     * 商品操作関数（プレースホルダー）
     */
    window.editProduct = function(index) {
        console.log('✏️ 商品編集:', index, TanaoroshiFixed.products[index]);
        alert(`商品編集機能（実装予定）\nインデックス: ${index}`);
    };
    
    window.duplicateProduct = function(index) {
        console.log('📋 商品複製:', index, TanaoroshiFixed.products[index]);
        alert(`商品複製機能（実装予定）\nインデックス: ${index}`);
    };
    
    // フィルター・ビュー機能初期化
    setTimeout(function() {
        setupFilterFunctions();
        setupViewToggle();
        console.log('🔧 フィルター・ビュー機能初期化完了');
    }, 500);
    
    // グローバル関数エクスポート
    window.TanaoroshiFixed = TanaoroshiFixed;
    
    console.log('🚀 棚卸しシステム グリッドレイアウト完全修正版 読み込み完了');
    
})();
