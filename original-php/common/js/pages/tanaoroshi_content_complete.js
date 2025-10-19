/**
 * 棚卸しシステム JavaScript完全外部化版
 * N3準拠: common/js/pages/tanaoroshi_content_complete.js
 * バージョン: v2.0
 */

(function() {
    'use strict';
    
    // グローバル変数の安全な初期化
    window.TanaoroshiCompleteSystem = window.TanaoroshiCompleteSystem || {};
    let selectedProducts = [];
    let currentDetailProductId = null;
    let currentSetComponents = [];
    let componentCounter = 0;
    let exchangeRate = 150.25;
    let priceChart = null;
    
    // サンプルデータ
    const sampleProducts = [
        {
            id: 1,
            name: "Wireless Gaming Mouse RGB LED 7 Buttons",
            sku: "MS-WR70-001",
            type: "stock",
            condition: "new",
            priceUSD: 21.84,
            costUSD: 12.33,
            stock: 48,
            category: "Electronics",
            channels: ["ebay", "shopify"],
            image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=200&fit=crop",
            description: "高性能なワイヤレスゲーミングマウス。RGB LED搭載で7つのボタンを配置。"
        },
        {
            id: 2,
            name: "Gaming PC Accessories Bundle (3 Items)",
            sku: "SET-PC01-003",
            type: "set",
            condition: "new",
            priceUSD: 59.26,
            costUSD: 37.96,
            stock: 15,
            category: "Bundle",
            channels: ["ebay"],
            image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&h=200&fit=crop",
            description: "ゲーミングPC周辺機器の3点セット商品。",
            components: [
                { productId: 1, quantity: 1 },
                { productId: 3, quantity: 1 },
                { productId: 4, quantity: 1 }
            ]
        },
        {
            id: 3,
            name: "Mechanical Keyboard RGB Backlit",
            sku: "KB-MR88-002",
            type: "dropship",
            condition: "new",
            priceUSD: 52.24,
            costUSD: 34.67,
            stock: "∞",
            category: "Electronics",
            channels: ["mercari"],
            image: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=300&h=200&fit=crop",
            description: "RGBバックライト付きメカニカルキーボード。"
        },
        {
            id: 4,
            name: "Gaming Headset with Microphone",
            sku: "HS-GM55-004",
            type: "hybrid",
            condition: "new",
            priceUSD: 35.20,
            costUSD: 22.62,
            stock: 3,
            category: "Electronics",
            channels: ["ebay", "shopify", "mercari"],
            image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300&h=200&fit=crop",
            description: "マイク付きゲーミングヘッドセット。"
        }
    ];
    
    // エラーハンドリング強化
    window.addEventListener('error', function(e) {
        console.error('⚠️ 棚卸しシステム エラーキャッチ:', e.message);
        return true;
    });

    // DOM初期化（一回限り実行保証）
    document.addEventListener('DOMContentLoaded', function() {
        if (window.TanaoroshiCompleteSystem.isInitialized) {
            console.log('⚠️ 棚卸しシステム 重複初期化を防止');
            return;
        }
        window.TanaoroshiCompleteSystem.isInitialized = true;
        
        console.log('🚀 棚卸しシステム（N3準拠完全版）初期化開始');
        initializeSystem();
    });
    
    // システム初期化
    function initializeSystem() {
        try {
            setupEventListeners();
            setupDragAndDrop();
            initializePriceChart();
            updateExchangeRate();
            console.log('✅ 棚卸しシステムが正常に初期化されました');
        } catch (error) {
            console.error('⚠️ 棚卸しシステム初期化エラー:', error);
            console.log('ℹ️ 基本表示は継続します。一部機能が制限される場合があります。');
        }
    }

    // イベントリスナー設定
    function setupEventListeners() {
        try {
            // ビュー切り替えボタン
            const cardViewBtn = document.getElementById('card-view-btn');
            const listViewBtn = document.getElementById('list-view-btn');
            
            if (cardViewBtn) {
                cardViewBtn.addEventListener('click', function() { switchView('grid'); });
            }
            if (listViewBtn) {
                listViewBtn.addEventListener('click', function() { switchView('list'); });
            }
            
            // カード選択
            const cards = document.querySelectorAll('.inventory__card');
            cards.forEach(function(card) {
                card.addEventListener('click', function(e) {
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
                        return;
                    }
                    selectCard(this);
                });
            });
            
            // 検索機能
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.addEventListener('input', handleSearch);
            }
            
            // フィルター機能
            const filterSelects = document.querySelectorAll('.inventory__filter-select');
            filterSelects.forEach(function(select) {
                select.addEventListener('change', applyFilters);
            });
            
            // 通貨切り替え
            const currencyUsdBtn = document.getElementById('currency-usd');
            const currencyJpyBtn = document.getElementById('currency-jpy');
            
            if (currencyUsdBtn) {
                currencyUsdBtn.addEventListener('click', function() { switchCurrency('USD'); });
            }
            if (currencyJpyBtn) {
                currencyJpyBtn.addEventListener('click', function() { switchCurrency('JPY'); });
            }
            
            // CSV インポート
            const csvImportArea = document.getElementById('csv-import-area');
            const csvImport = document.getElementById('csv-import');
            
            if (csvImportArea && csvImport) {
                csvImportArea.addEventListener('click', function() { csvImport.click(); });
                csvImport.addEventListener('change', handleCSVImport);
            }
            
            // チェックボックス関連
            const selectAllCheckbox = document.getElementById('select-all-checkbox');
            if (selectAllCheckbox) {
                selectAllCheckbox.addEventListener('change', function() {
                    toggleAllProducts(this.checked);
                });
            }
            
            const productCheckboxes = document.querySelectorAll('.product-checkbox');
            productCheckboxes.forEach(function(checkbox) {
                checkbox.addEventListener('change', function() {
                    const productId = parseInt(this.dataset.id);
                    toggleProductSelection(productId, this.checked);
                });
            });
            
            console.log('✅ イベントリスナー設定完了');
        } catch (error) {
            console.error('⚠️ イベントリスナー設定エラー:', error);
        }
    }

    // ビュー切り替え
    function switchView(view) {
        const cardView = document.getElementById('card-view');
        const listView = document.getElementById('list-view');
        const cardViewBtn = document.getElementById('card-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        
        if (!cardView || !listView || !cardViewBtn || !listViewBtn) {
            console.error('ビュー要素が見つかりません');
            return;
        }
        
        cardViewBtn.classList.remove('inventory__view-btn--active');
        listViewBtn.classList.remove('inventory__view-btn--active');
        
        if (view === 'grid') {
            cardView.style.display = 'grid';
            listView.style.display = 'none';
            cardViewBtn.classList.add('inventory__view-btn--active');
            console.log('カードビューに切り替えました');
        } else {
            cardView.style.display = 'none';
            listView.style.display = 'block';
            listViewBtn.classList.add('inventory__view-btn--active');
            console.log('リストビューに切り替えました');
        }
    }

    // カード選択
    function selectCard(card) {
        const productId = parseInt(card.dataset.id);
        
        card.classList.toggle('inventory__card--selected');
        
        if (card.classList.contains('inventory__card--selected')) {
            if (selectedProducts.indexOf(productId) === -1) {
                selectedProducts.push(productId);
            }
        } else {
            selectedProducts = selectedProducts.filter(function(id) { return id !== productId; });
        }
        
        updateSelectionUI();
        console.log('選択中の商品:', selectedProducts);
    }

    // 商品選択（チェックボックス）
    function toggleProductSelection(productId, checked) {
        if (checked) {
            if (selectedProducts.indexOf(productId) === -1) {
                selectedProducts.push(productId);
            }
        } else {
            selectedProducts = selectedProducts.filter(function(id) { return id !== productId; });
        }
        updateSelectionUI();
        console.log('選択中の商品:', selectedProducts);
    }

    // 全選択
    function toggleAllProducts(checked) {
        const productCheckboxes = document.querySelectorAll('.product-checkbox');
        productCheckboxes.forEach(function(checkbox) {
            checkbox.checked = checked;
            const productId = parseInt(checkbox.dataset.id);
            
            if (checked) {
                if (selectedProducts.indexOf(productId) === -1) {
                    selectedProducts.push(productId);
                }
            } else {
                selectedProducts = selectedProducts.filter(function(id) { return id !== productId; });
            }
        });
        
        updateSelectionUI();
        console.log('全選択:', checked, '選択中の商品:', selectedProducts);
    }

    // 選択UI更新
    function updateSelectionUI() {
        const selectedCount = selectedProducts.length;
        const createSetBtn = document.getElementById('create-set-btn');
        const setBtnText = document.getElementById('set-btn-text');
        
        if (createSetBtn && setBtnText) {
            if (selectedCount >= 2) {
                createSetBtn.disabled = false;
                createSetBtn.classList.remove('btn--secondary');
                createSetBtn.classList.add('btn--warning');
                setBtnText.textContent = '選択商品からセット品作成 (' + selectedCount + '点)';
            } else {
                createSetBtn.disabled = false;
                createSetBtn.classList.remove('btn--warning');
                createSetBtn.classList.add('btn--secondary');
                setBtnText.textContent = '新規セット品作成';
            }
        }
        
        console.log('選択商品数: ' + selectedCount + '件');
    }

    // ドラッグ&ドロップ設定
    function setupDragAndDrop() {
        try {
            const importArea = document.getElementById('csv-import-area');
            const csvImport = document.getElementById('csv-import');
            
            if (!importArea || !csvImport) {
                console.log('ℹ️ CSVインポート要素が見つかりません');
                return;
            }
            
            importArea.addEventListener('click', function() { csvImport.click(); });
            csvImport.addEventListener('change', handleCSVImport);
            
            console.log('✅ ドラッグ&ドロップ設定完了');
        } catch (error) {
            console.error('⚠️ ドラッグ&ドロップ設定エラー:', error);
        }
    }

    // CSV インポート
    function handleCSVImport(event) {
        const file = event.target.files[0];
        if (file) {
            console.log('CSVファイルを読み込み:', file.name);
            showNotification('CSVインポート機能は開発中です', 'info');
        }
    }

    // 価格チャート初期化
    function initializePriceChart() {
        try {
            const ctx = document.getElementById('price-chart');
            if (!ctx) {
                console.log('ℹ️ 価格チャート要素が見つかりません');
                return;
            }
            
            if (typeof Chart === 'undefined') {
                console.log('ℹ️ Chart.jsが読み込まれていません');
                return;
            }
            
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
            
            priceChart = new Chart(ctx.getContext('2d'), config);
            console.log('✅ 価格チャート初期化完了');
            
        } catch (error) {
            console.error('⚠️ 価格チャート初期化エラー:', error);
            console.log('ℹ️ チャートなしで継続します');
        }
    }

    // 価格チャート更新
    function updatePriceChart(currency) {
        if (!priceChart) return;
        
        if (currency === 'JPY') {
            priceChart.data.labels = ['¥0-¥3,750', '¥3,750-¥7,500', '¥7,500-¥15,000', '¥15,000+'];
            const totalAmountEl = document.getElementById('total-amount');
            const averagePriceEl = document.getElementById('average-price');
            const highestPriceEl = document.getElementById('highest-price');
            
            if (totalAmountEl) totalAmountEl.textContent = '¥15,407,500';
            if (averagePriceEl) averagePriceEl.textContent = '¥16,869';
            if (highestPriceEl) highestPriceEl.textContent = '¥135,122';
        } else {
            priceChart.data.labels = ['$0-$25', '$25-$50', '$50-$100', '$100+'];
            const totalAmountEl = document.getElementById('total-amount');
            const averagePriceEl = document.getElementById('average-price');
            const highestPriceEl = document.getElementById('highest-price');
            
            if (totalAmountEl) totalAmountEl.textContent = '$102,500';
            if (averagePriceEl) averagePriceEl.textContent = '$112.3';
            if (highestPriceEl) highestPriceEl.textContent = '$899';
        }
        
        priceChart.update();
    }

    // 通貨切り替え
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
        
        updatePriceChart(currency);
        console.log('通貨を切り替え:', currency);
    }

    // 為替レート更新
    function updateExchangeRate() {
        const rate = 150.25;
        exchangeRate = rate;
        const exchangeRateEl = document.getElementById('exchange-rate');
        if (exchangeRateEl) {
            exchangeRateEl.textContent = '¥' + rate;
        }
        console.log('為替レート更新:', rate);
    }

    // 検索機能
    function handleSearch(event) {
        const query = event.target.value.toLowerCase();
        console.log('検索クエリ:', query);
        showNotification('"' + query + '"で検索中...', 'info');
    }

    // フィルター適用
    function applyFilters() {
        const typeFilter = document.getElementById('filter-type');
        const channelFilter = document.getElementById('filter-channel');
        const stockFilter = document.getElementById('filter-stock-status');
        const priceFilter = document.getElementById('filter-price-range');
        
        console.log('フィルター適用:', {
            type: typeFilter ? typeFilter.value : '',
            channel: channelFilter ? channelFilter.value : '',
            stock: stockFilter ? stockFilter.value : '',
            price: priceFilter ? priceFilter.value : ''
        });
        
        showNotification('フィルターを適用しました', 'info');
    }

    // 通知システム
    function showNotification(message, type) {
        type = type || 'info';
        
        const notification = document.createElement('div');
        notification.style.cssText = [
            'position: fixed',
            'top: 20px',
            'right: 20px',
            'padding: 12px 20px',
            'border-radius: 6px',
            'color: white',
            'font-weight: 500',
            'z-index: 10000',
            'opacity: 0',
            'transition: opacity 0.3s ease',
            'max-width: 300px'
        ].join(';');
        
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(function() {
            notification.style.opacity = '1';
        }, 10);
        
        setTimeout(function() {
            notification.style.opacity = '0';
            setTimeout(function() {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
        console.log('通知: ' + type + ' - ' + message);
    }

    // グローバル関数として公開（N3準拠）
    window.showProductDetail = function(productId) {
        const product = sampleProducts.find(function(p) { return p.id === productId; });
        if (!product) {
            showNotification('商品が見つかりません', 'error');
            return;
        }
        
        currentDetailProductId = productId;
        console.log('商品詳細表示:', productId);
        showNotification('商品詳細機能は開発中です', 'info');
    };

    window.deleteProduct = function(productId) {
        if (confirm('この商品を削除しますか？')) {
            console.log('商品を削除:', productId);
            showNotification('商品を削除しました', 'success');
        }
    };

    window.exportData = function() {
        console.log('データをエクスポート');
        showNotification('エクスポート機能は開発中です', 'info');
    };

    window.resetFilters = function() {
        const filterType = document.getElementById('filter-type');
        const filterChannel = document.getElementById('filter-channel');
        const filterStock = document.getElementById('filter-stock-status');
        const filterPrice = document.getElementById('filter-price-range');
        const searchInput = document.getElementById('search-input');
        
        if (filterType) filterType.value = '';
        if (filterChannel) filterChannel.value = '';
        if (filterStock) filterStock.value = '';
        if (filterPrice) filterPrice.value = '';
        if (searchInput) searchInput.value = '';
        
        console.log('フィルターをリセット');
        showNotification('フィルターをリセットしました', 'info');
    };
    
    console.log('📜 棚卸しシステム JavaScript（N3準拠完全外部化版）読み込み完了');
    
})();