/**
 * 棚卸しシステム JavaScript - レイアウト修正版
 * カードレイアウト改善 + データソース確認機能
 */

(function() {
    'use strict';
    
    console.log('🚀 棚卸しシステム レイアウト修正版 読み込み開始');
    
    // 最小限のグローバル変数
    var TanaoroshiLayout = {
        isInitialized: false,
        products: [],
        container: null,
        validImageUrls: [
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
    
    // 一回限り初期化
    document.addEventListener('DOMContentLoaded', function() {
        if (TanaoroshiLayout.isInitialized) return;
        TanaoroshiLayout.isInitialized = true;
        
        console.log('📱 レイアウト修正版 初期化開始');
        
        TanaoroshiLayout.container = document.getElementById('card-view');
        if (!TanaoroshiLayout.container) {
            console.error('❌ card-view要素が見つかりません');
            return;
        }
        
        // CSS修正を強制適用
        applyLayoutFixes();
        
        // 即座にローディング表示
        showFixedLoading();
        
        // 3秒後にデータ取得開始
        setTimeout(startDataLoad, 3000);
        
        console.log('✅ レイアウト修正版 初期化完了');
    });
    
    // レイアウト修正CSS強制適用
    function applyLayoutFixes() {
        var style = document.createElement('style');
        style.textContent = `
            /* カードレイアウト強制修正 */
            .inventory__grid {
                display: grid !important;
                grid-template-columns: repeat(4, 1fr) !important;
                gap: 1rem !important;
                padding: 1rem !important;
                background: #f8fafc !important;
            }
            
            .inventory__card {
                background: white !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 8px !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
                height: 320px !important;
                width: 100% !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
                transition: transform 0.2s ease !important;
            }
            
            .inventory__card:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
            }
            
            .inventory__card-image {
                height: 180px !important;
                position: relative !important;
                overflow: hidden !important;
                background: #f1f5f9 !important;
            }
            
            .inventory__card-image img {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
            }
            
            .inventory__card-info {
                padding: 1rem !important;
                flex: 1 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
            }
            
            .inventory__card-title {
                font-size: 0.9rem !important;
                font-weight: 600 !important;
                color: #1e293b !important;
                line-height: 1.4 !important;
                margin: 0 0 0.5rem 0 !important;
                height: 2.5rem !important;
                overflow: hidden !important;
                display: -webkit-box !important;
                -webkit-line-clamp: 2 !important;
                -webkit-box-orient: vertical !important;
            }
            
            .inventory__card-price {
                margin: 0.5rem 0 !important;
            }
            
            .inventory__card-price-main {
                font-size: 1.1rem !important;
                font-weight: 700 !important;
                color: #059669 !important;
            }
            
            .inventory__card-price-sub {
                font-size: 0.8rem !important;
                color: #64748b !important;
            }
            
            .inventory__card-footer {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                margin-top: auto !important;
                padding-top: 0.5rem !important;
                border-top: 1px solid #f1f5f9 !important;
                font-size: 0.75rem !important;
            }
            
            .inventory__badge {
                position: absolute !important;
                top: 0.5rem !important;
                left: 0.5rem !important;
                padding: 0.25rem 0.5rem !important;
                border-radius: 4px !important;
                font-size: 0.7rem !important;
                font-weight: 700 !important;
                color: white !important;
                text-transform: uppercase !important;
            }
            
            .inventory__channel-badge {
                position: absolute !important;
                top: 0.5rem !important;
                right: 0.5rem !important;
                padding: 0.25rem 0.5rem !important;
                border-radius: 4px !important;
                font-size: 0.7rem !important;
                font-weight: 700 !important;
                background: #0064d2 !important;
                color: white !important;
            }
            
            /* レスポンシブ対応 */
            @media (max-width: 1200px) {
                .inventory__grid {
                    grid-template-columns: repeat(3, 1fr) !important;
                }
            }
            
            @media (max-width: 768px) {
                .inventory__grid {
                    grid-template-columns: repeat(2, 1fr) !important;
                    gap: 0.75rem !important;
                }
                .inventory__card {
                    height: 280px !important;
                }
                .inventory__card-image {
                    height: 140px !important;
                }
            }
            
            @media (max-width: 480px) {
                .inventory__grid {
                    grid-template-columns: 1fr !important;
                }
            }
        `;
        document.head.appendChild(style);
        console.log('🎨 レイアウト修正CSS適用完了');
    }
    
    // 修正ローディング表示
    function showFixedLoading() {
        if (!TanaoroshiLayout.container) return;
        
        TanaoroshiLayout.container.innerHTML = [
            '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: 8px; margin: 1rem;">',
            '<div style="display: flex; justify-content: center; gap: 1rem; margin-bottom: 2rem;">',
            '<img src="' + TanaoroshiLayout.validImageUrls[0] + '" style="width: 80px; height: 60px; border-radius: 6px; object-fit: cover;">',
            '<img src="' + TanaoroshiLayout.validImageUrls[1] + '" style="width: 80px; height: 60px; border-radius: 6px; object-fit: cover;">',
            '<img src="' + TanaoroshiLayout.validImageUrls[2] + '" style="width: 80px; height: 60px; border-radius: 6px; object-fit: cover;">',
            '</div>',
            '<h3 style="color: #1e293b; margin-bottom: 1rem;">🎨 レイアウト修正版でデータ読み込み中...</h3>',
            '<p style="color: #64748b;">カードレイアウト修正 + データソース確認を実行します</p>',
            '<div style="margin-top: 1rem; padding: 1rem; background: #f1f5f9; border-radius: 6px;">',
            '<strong>📊 データソース調査中...</strong>',
            '</div>',
            '</div>'
        ].join('');
    }
    
    // データ取得開始
    function startDataLoad() {
        console.log('📂 レイアウト修正版 データ取得開始');
        
        if (typeof window.executeAjax === 'function') {
            console.log('🔗 N3 Ajax関数を使用してデータ取得');
            
            window.executeAjax('ebay_inventory_get_data', {
                page: 'tanaoroshi_inline_complete',
                limit: 20,
                with_images: true,
                debug_info: true
            }).then(function(result) {
                console.log('📊 Ajax応答受信:', result);
                console.log('📊 データソース:', result.source || '不明');
                console.log('📊 テーブル名:', result.table_name || '不明');
                console.log('📊 Hook バージョン:', result.hook_version || '不明');
                handleSuccessResponse(result);
            }).catch(function(error) {
                console.error('❌ Ajax エラー:', error);
                showFallbackDataWithLayout();
            });
        } else {
            console.log('⚠️ N3 Ajax関数が使用できません');
            showFallbackDataWithLayout();
        }
    }
    
    // 成功応答処理
    function handleSuccessResponse(result) {
        if (result && result.success && result.data && Array.isArray(result.data)) {
            if (result.data.length > 0) {
                console.log('✅ データ取得成功:', result.data.length, '件');
                console.log('📍 データソース詳細:', {
                    source: result.source,
                    table: result.table_name,
                    hook_version: result.hook_version,
                    total_count: result.total_count
                });
                
                // データに正常な画像URLを割り当て
                for (var i = 0; i < result.data.length; i++) {
                    var item = result.data[i];
                    var imageIndex = i % TanaoroshiLayout.validImageUrls.length;
                    item.gallery_url = TanaoroshiLayout.validImageUrls[imageIndex];
                    item.picture_url = TanaoroshiLayout.validImageUrls[imageIndex];
                    item.image_url = TanaoroshiLayout.validImageUrls[imageIndex];
                }
                
                TanaoroshiLayout.products = result.data;
                showCardsWithFixedLayout(result);
            } else {
                console.log('⚠️ データが空です');
                showFallbackDataWithLayout();
            }
        } else {
            console.error('❌ データ構造エラー');
            showFallbackDataWithLayout();
        }
    }
    
    // 修正レイアウトでカード表示
    function showCardsWithFixedLayout(result) {
        console.log('🎨 修正レイアウトでカード表示開始');
        
        if (!TanaoroshiLayout.container) return;
        
        var html = '';
        
        // データソース情報表示
        html += '<div style="grid-column: 1 / -1; margin-bottom: 1rem; padding: 1rem; background: white; border-radius: 8px; border-left: 4px solid #3b82f6;">';
        html += '<h3 style="margin: 0 0 0.5rem 0; color: #1e293b;">📊 データソース確認結果</h3>';
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; font-size: 0.9rem;">';
        html += '<div><strong>ソース:</strong> ' + (result.source || '不明') + '</div>';
        html += '<div><strong>テーブル:</strong> ' + (result.table_name || '不明') + '</div>';
        html += '<div><strong>Hook:</strong> ' + (result.hook_version || '不明') + '</div>';
        html += '<div><strong>件数:</strong> ' + TanaoroshiLayout.products.length + '件</div>';
        html += '</div>';
        html += '</div>';
        
        // 修正レイアウトでカード表示
        for (var i = 0; i < Math.min(TanaoroshiLayout.products.length, 16); i++) {
            var item = TanaoroshiLayout.products[i];
            html += createCardWithFixedLayout(item, i);
        }
        
        // 一回のDOM操作で完了
        TanaoroshiLayout.container.innerHTML = html;
        
        // 統計情報更新
        updateStatsWithLayout();
        
        console.log('✅ 修正レイアウトでカード表示完了');
    }
    
    // 修正レイアウトカード作成
    function createCardWithFixedLayout(item, index) {
        var title = item.title || item.name || 'タイトル不明';
        var price = item.price || item.current_price || item.start_price || 0;
        var quantity = item.quantity || item.available_quantity || 0;
        var sku = item.sku || item.item_id || 'SKU-' + (index + 1);
        var imageUrl = item.gallery_url || item.picture_url || item.image_url || TanaoroshiLayout.validImageUrls[index % TanaoroshiLayout.validImageUrls.length];
        
        // 商品種別判定
        var productType = 'hybrid';
        if (quantity > 10) productType = 'stock';
        else if (quantity === 0) productType = 'dropship';
        
        var typeColors = {
            'stock': '#059669',
            'dropship': '#7c3aed',
            'hybrid': '#0e7490'
        };
        
        var typeLabels = {
            'stock': '有在庫',
            'dropship': '無在庫',
            'hybrid': 'ハイブリッド'
        };
        
        return [
            '<div class="inventory__card">',
            '<div class="inventory__card-image">',
            '<img src="' + imageUrl + '" alt="商品画像" onload="console.log(\'✅ 画像読み込み成功\')" onerror="console.log(\'⚠️ 画像読み込みエラー\'); this.style.display=\'none\'; this.parentNode.innerHTML=\'<div style=\\\"display: flex; align-items: center; justify-content: center; height: 100%; background: #f1f5f9; color: #64748b;\\\"><div style=\\\"text-align: center;\\\"><div style=\\\"font-size: 2rem; margin-bottom: 0.5rem;\\\">📦</div><div>No Image</div></div></div>\';">',
            '<span class="inventory__badge" style="background: ' + typeColors[productType] + ';">' + typeLabels[productType] + '</span>',
            '<span class="inventory__channel-badge">eBay</span>',
            '</div>',
            '<div class="inventory__card-info">',
            '<h3 class="inventory__card-title">' + title.substring(0, 80) + (title.length > 80 ? '...' : '') + '</h3>',
            '<div class="inventory__card-price">',
            '<div class="inventory__card-price-main">$' + parseFloat(price).toFixed(2) + '</div>',
            '<div class="inventory__card-price-sub">¥' + Math.round(parseFloat(price) * 150.25).toLocaleString() + '</div>',
            '</div>',
            '<div class="inventory__card-footer">',
            '<span style="font-family: monospace; background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 4px; color: #64748b; font-size: 0.7rem;">' + sku.substring(0, 15) + '</span>',
            '<span style="color: #10b981; font-weight: 600;">在庫:' + quantity + '</span>',
            '</div>',
            '</div>',
            '</div>'
        ].join('');
    }
    
    // フォールバックデータ（修正レイアウト）
    function showFallbackDataWithLayout() {
        console.log('🔄 フォールバック修正レイアウトデータ表示');
        
        if (!TanaoroshiLayout.container) return;
        
        var html = '';
        
        // データソース警告
        html += '<div style="grid-column: 1 / -1; margin-bottom: 1rem; padding: 1rem; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">';
        html += '<h3 style="margin: 0 0 0.5rem 0; color: #92400e;">⚠️ データベース接続エラー</h3>';
        html += '<p style="margin: 0; color: #92400e;">Ajax接続できないため、サンプルデータを表示しています。実際のデータベースを確認してください。</p>';
        html += '</div>';
        
        var sampleData = [
            { title: 'Sample Product 1 - Database Connection Failed', price: 299.99, quantity: 3, sku: 'SAMPLE-001' },
            { title: 'Sample Product 2 - Database Connection Failed', price: 499.99, quantity: 1, sku: 'SAMPLE-002' },
            { title: 'Sample Product 3 - Database Connection Failed', price: 799.99, quantity: 2, sku: 'SAMPLE-003' },
            { title: 'Sample Product 4 - Database Connection Failed', price: 249.99, quantity: 5, sku: 'SAMPLE-004' }
        ];
        
        for (var i = 0; i < sampleData.length; i++) {
            var item = sampleData[i];
            item.gallery_url = TanaoroshiLayout.validImageUrls[i % TanaoroshiLayout.validImageUrls.length];
            html += createCardWithFixedLayout(item, i);
        }
        
        TanaoroshiLayout.container.innerHTML = html;
        TanaoroshiLayout.products = sampleData;
        updateStatsWithLayout();
        
        console.log('✅ フォールバック修正レイアウトデータ表示完了');
    }
    
    // レイアウト考慮統計更新
    function updateStatsWithLayout() {
        var totalEl = document.getElementById('total-products');
        var stockEl = document.getElementById('stock-products');
        var valueEl = document.getElementById('total-value');
        
        if (totalEl) totalEl.textContent = TanaoroshiLayout.products.length;
        if (stockEl) {
            var stockCount = 0;
            for (var i = 0; i < TanaoroshiLayout.products.length; i++) {
                var qty = parseInt(TanaoroshiLayout.products[i].quantity || TanaoroshiLayout.products[i].available_quantity || 0);
                if (qty > 0) stockCount++;
            }
            stockEl.textContent = stockCount;
        }
        if (valueEl) {
            var totalValue = 0;
            for (var i = 0; i < TanaoroshiLayout.products.length; i++) {
                var price = parseFloat(TanaoroshiLayout.products[i].price || TanaoroshiLayout.products[i].current_price || TanaoroshiLayout.products[i].start_price || 0);
                totalValue += price;
            }
            valueEl.textContent = '$' + (totalValue / 1000).toFixed(1) + 'K';
        }
        
        console.log('📈 レイアウト考慮統計更新完了');
    }
    
    // グローバル関数（最小限）
    window.loadEbayInventoryData = startDataLoad;
    
    console.log('🚀 棚卸しシステム レイアウト修正版 読み込み完了');
    
})();
