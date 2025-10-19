/**
 * 棚卸しシステム JavaScript（文字化け修正・完全版）
 * モーダル機能とExcel/Card表示切り替えを統合
 */

(function() {
    'use strict';
    
    // システム初期化
    document.addEventListener('DOMContentLoaded', function() {
        console.log('棚卸しシステム初期化開始');
        initializeSystem();
    });
    
    function initializeSystem() {
        // イベントリスナー設定
        setupEventListeners();
        // チャート初期化
        initializePriceChart();
        // サンプルデータ設定
        setupSampleData();
        
        console.log('棚卸しシステム初期化完了');
    }
    
    // イベントリスナー設定
    function setupEventListeners() {
        // ビュー切り替えボタン
        const cardViewBtn = document.getElementById('card-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        
        if (cardViewBtn) {
            cardViewBtn.addEventListener('click', function() {
                switchView('card');
            });
        }
        
        if (listViewBtn) {
            listViewBtn.addEventListener('click', function() {
                switchView('list');
            });
        }
        
        // 通貨切り替え
        const currencyUsdBtn = document.getElementById('currency-usd');
        const currencyJpyBtn = document.getElementById('currency-jpy');
        
        if (currencyUsdBtn) {
            currencyUsdBtn.addEventListener('click', function() {
                switchCurrency('USD');
            });
        }
        
        if (currencyJpyBtn) {
            currencyJpyBtn.addEventListener('click', function() {
                switchCurrency('JPY');
            });
        }
        
        // 全選択チェックボックス
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                toggleAllProducts(this.checked);
            });
        }
    }
    
    // ビュー切り替え機能
    function switchView(view) {
        const cardView = document.getElementById('card-view');
        const listView = document.getElementById('list-view');
        const cardViewBtn = document.getElementById('card-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        
        if (!cardView || !listView || !cardViewBtn || !listViewBtn) return;
        
        // ボタンの状態をリセット
        cardViewBtn.classList.remove('inventory__view-btn--active');
        listViewBtn.classList.remove('inventory__view-btn--active');
        
        if (view === 'card') {
            cardView.style.display = 'grid';
            listView.style.display = 'none';
            cardViewBtn.classList.add('inventory__view-btn--active');
            console.log('カードビューに切り替え');
        } else {
            cardView.style.display = 'none';
            listView.style.display = 'block';
            listViewBtn.classList.add('inventory__view-btn--active');
            console.log('リストビューに切り替え');
        }
    }
    
    // 通貨切り替え機能
    function switchCurrency(currency) {
        const usdBtn = document.getElementById('currency-usd');
        const jpyBtn = document.getElementById('currency-jpy');
        
        if (currency === 'USD') {
            if (usdBtn) usdBtn.classList.add('inventory__currency-btn--active');
            if (jpyBtn) jpyBtn.classList.remove('inventory__currency-btn--active');
        } else {
            if (jpyBtn) jpyBtn.classList.add('inventory__currency-btn--active');
            if (usdBtn) usdBtn.classList.remove('inventory__currency-btn--active');
        }
        
        updatePriceDisplay(currency);
        console.log('通貨を切り替え:', currency);
    }
    
    // 価格表示更新
    function updatePriceDisplay(currency) {
        // 価格表示を更新する処理（実装に応じてカスタマイズ）
        console.log('価格表示を更新:', currency);
    }
    
    // 全選択機能
    function toggleAllProducts(checked) {
        const productCheckboxes = document.querySelectorAll('.product-checkbox');
        productCheckboxes.forEach(function(checkbox) {
            checkbox.checked = checked;
        });
        console.log('全選択:', checked);
    }
    
    // 価格チャート初期化
    function initializePriceChart() {
        const ctx = document.getElementById('price-chart');
        if (!ctx || typeof Chart === 'undefined') {
            console.log('チャートの初期化をスキップ');
            return;
        }
        
        try {
            const data = {
                labels: ['$0-$25', '$25-$50', '$50-$100', '$100+'],
                datasets: [{
                    data: [272, 298, 234, 342],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 0
                }]
            };
            
            const config = {
                type: 'doughnut',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            };
            
            new Chart(ctx.getContext('2d'), config);
            console.log('価格チャート初期化完了');
        } catch (error) {
            console.error('チャート初期化エラー:', error);
        }
    }
    
    // サンプルデータ設定
    function setupSampleData() {
        window.currentProductData = [
            {
                id: 1,
                title: 'Wireless Gaming Mouse RGB LED 7 Buttons',
                sku: 'MS-WR70-001',
                current_price_value: '21.84',
                ebay_item_id: '123456789',
                picture_urls: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=200&fit=crop'],
                condition_display_name: '新品',
                quantity: '48',
                listing_status: 'Active'
            },
            {
                id: 2,
                title: 'Gaming PC Accessories Bundle (3 Items)',
                sku: 'SET-PC01-003',
                current_price_value: '59.26',
                ebay_item_id: '123456790',
                picture_urls: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&h=200&fit=crop'],
                condition_display_name: '新品',
                quantity: '15',
                listing_status: 'Active'
            }
        ];
    }
    
    // グローバル関数として公開
    window.showProductDetail = function(index) {
        const product = window.currentProductData[index - 1]; // 1-basedインデックス対応
        if (!product) {
            N3Modal.alert({ 
                title: 'エラー', 
                message: '商品データが見つかりません', 
                type: 'error' 
            });
            return;
        }
        
        // 商品詳細HTMLを生成
        const detailHtml = generateProductDetailHTML(product);
        
        // モーダルにコンテンツを設定
        N3Modal.setContent('product-detail-modal', {
            body: detailHtml
        });
        
        // モーダルを開く
        N3Modal.open('product-detail-modal');
        
        console.log('商品詳細表示:', product.title);
    };
    
    // 商品詳細HTML生成
    function generateProductDetailHTML(product) {
        return `
            <div class="product-detail-container">
                <div class="product-header">
                    <div class="product-image">
                        <img src="${product.picture_urls[0]}" alt="商品画像" style="width: 200px; height: 150px; object-fit: cover; border-radius: 8px;">
                    </div>
                    <div class="product-info">
                        <h3>${product.title}</h3>
                        <p><strong>SKU:</strong> ${product.sku}</p>
                        <p><strong>価格:</strong> $${product.current_price_value}</p>
                        <p><strong>状態:</strong> ${product.condition_display_name}</p>
                        <p><strong>在庫:</strong> ${product.quantity}個</p>
                        <p><strong>ステータス:</strong> ${product.listing_status}</p>
                    </div>
                </div>
                
                <div class="product-actions" style="margin-top: 2rem; text-align: center;">
                    <button class="btn btn--primary" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i> 編集
                    </button>
                    <button class="btn btn--warning" onclick="duplicateProduct(${product.id})">
                        <i class="fas fa-copy"></i> 複製
                    </button>
                    <button class="btn btn--danger" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i> 削除
                    </button>
                </div>
            </div>
            
            <style>
                .product-detail-container {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .product-header {
                    display: flex;
                    gap: 2rem;
                    margin-bottom: 2rem;
                }
                .product-info {
                    flex: 1;
                }
                .product-info h3 {
                    margin: 0 0 1rem 0;
                    color: #1f2937;
                    font-size: 1.25rem;
                }
                .product-info p {
                    margin: 0.5rem 0;
                    color: #4b5563;
                }
                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    border: none;
                    border-radius: 6px;
                    font-weight: 500;
                    cursor: pointer;
                    margin: 0 0.25rem;
                    transition: all 0.2s ease;
                }
                .btn--primary {
                    background: #3b82f6;
                    color: white;
                }
                .btn--primary:hover {
                    background: #2563eb;
                }
                .btn--warning {
                    background: #f59e0b;
                    color: white;
                }
                .btn--warning:hover {
                    background: #d97706;
                }
                .btn--danger {
                    background: #ef4444;
                    color: white;
                }
                .btn--danger:hover {
                    background: #dc2626;
                }
            </style>
        `;
    }
    
    // その他のグローバル関数
    window.editProduct = function(id) {
        console.log('商品編集:', id);
        alert('編集機能は開発中です');
    };
    
    window.duplicateProduct = function(id) {
        console.log('商品複製:', id);
        alert('複製機能は開発中です');
    };
    
    window.deleteProduct = function(id) {
        if (confirm('この商品を削除しますか？')) {
            console.log('商品削除:', id);
            alert('削除機能は開発中です');
        }
    };
    
    window.exportData = function() {
        console.log('データエクスポート');
        alert('エクスポート機能は開発中です');
    };
    
    window.resetFilters = function() {
        console.log('フィルターリセット');
        alert('フィルターをリセットしました');
    };
    
})();
