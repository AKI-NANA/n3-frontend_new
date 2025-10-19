/* 
 * 棚卸しシステム - PostgreSQL eBay API統合JavaScript（統一データソース版）
 * 修正: カード・エクセルビュー共通データソース使用
 * Hook依存完全除去・PostgreSQL直接接続版
 */

// グローバル変数
let allProducts = [];
let filteredProducts = [];
let currentView = 'card'; // 'card' | 'excel'

// 統一データロード関数（カード・エクセルビュー共通データソース）
async function loadEbayData() {
    showLoading('eBayデータを読み込み中...');
    
    try {
        console.log('📦 統一eBayデータ取得開始');
        
        // 単一データソース: API経由で一括取得
        const response = await fetch('/api/get_ebay_inventory.php?limit=1000', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
            console.log(`✅ データ取得成功: ${data.data.length}件`);
            
            // 統一データとして保存
            allProducts = data.data;
            
            // カードビューとエクセルビュー両方を同じデータで更新
            updateCardView(allProducts);
            updateExcelView(allProducts);
            
            updateDataSourceIndicator('success', `${data.data.length}件`);
            
        } else {
            console.error('❌ データ取得失敗または空のレスポンス');
            allProducts = [];
            updateCardView(allProducts);
            updateExcelView(allProducts);
            updateDataSourceIndicator('error', 'データなし');
        }
        
    } catch (error) {
        console.error('❌ eBayデータ取得エラー:', error);
        allProducts = [];
        updateCardView(allProducts);
        updateExcelView(allProducts);
        updateDataSourceIndicator('error', error.message);
    } finally {
        hideLoading();
    }
}

// カードビュー更新（統一データ使用）
function updateCardView(products) {
    const cardGrid = document.querySelector('.inventory__grid');
    if (!cardGrid) return;
    
    if (!products || products.length === 0) {
        cardGrid.innerHTML = '<div class="no-data">データが見つかりません</div>';
        return;
    }
    
    // カード表示用HTML生成
    const cardsHTML = products.map(item => renderProductCard(item)).join('');
    cardGrid.innerHTML = cardsHTML;
    
    // 統計情報更新
    updateStats(products);
    adjustGridLayout();
    
    console.log(`✅ カードビュー更新完了: ${products.length}件`);
}

// エクセルビュー更新（統一データ使用）
function updateExcelView(products) {
    const excelTable = document.querySelector('#excel-view-table tbody');
    if (!excelTable) return;
    
    if (!products || products.length === 0) {
        excelTable.innerHTML = '<tr><td colspan="8">データが見つかりません</td></tr>';
        return;
    }
    
    // テーブル行生成
    const rowsHTML = products.map(item => `
        <tr data-id="${item.id}" onclick="showProductDetails(${item.id})">
            <td><img src="${item.image || '/common/images/no-image.jpg'}" alt="${item.name}" style="width:40px;height:40px;object-fit:cover;"></td>
            <td>${item.name}</td>
            <td>${item.sku || 'N/A'}</td>
            <td>$${item.priceUSD || '0.00'}</td>
            <td>${item.stock || 0}</td>
            <td>${item.condition}</td>
            <td><span class="status-badge status-${item.listing_status}">${item.listing_status}</span></td>
            <td>${item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'N/A'}</td>
        </tr>
    `).join('');
    
    excelTable.innerHTML = rowsHTML;
    
    console.log(`✅ エクセルビュー更新完了: ${products.length}件`);
}

// 商品カード描画（拡張版）
function renderProductCard(item) {
    return `
        <div class="inventory__card" data-id="${item.id}">
            <div class="inventory__card-image">
                <img src="${item.image || '/common/images/no-image.jpg'}" 
                     alt="${item.name}" 
                     onerror="this.src='/common/images/no-image.jpg'">
                <div class="inventory__card-badge">
                    <span class="condition-badge condition-${item.condition}">${item.condition}</span>
                </div>
            </div>
            <div class="inventory__card-content">
                <h3 class="inventory__card-title">${item.name}</h3>
                <div class="inventory__card-sku">SKU: ${item.sku || 'N/A'}</div>
                <div class="inventory__card-prices">
                    <span class="price-usd">$${item.priceUSD}</span>
                    <span class="price-jpy">¥${(item.priceUSD * 150).toLocaleString()}</span>
                </div>
                <div class="inventory__card-stock">
                    <span class="stock-count">在庫: ${item.stock}個</span>
                    <span class="status-${item.listing_status}">${item.listing_status}</span>
                </div>
                <div class="inventory__card-meta">
                    <span class="watchers">👁 ${item.watchers_count || 0}</span>
                    <span class="views">👀 ${item.views_count || 0}</span>
                </div>
            </div>
            <div class="inventory__card-actions">
                <button onclick="showProductDetails(${item.id})" class="btn btn--sm btn--primary">
                    <i class="fas fa-eye"></i> 詳細
                </button>
                <button onclick="editProduct(${item.id})" class="btn btn--sm btn--outline">
                    <i class="fas fa-edit"></i> 編集
                </button>
            </div>
        </div>
    `;
}

// 統計情報更新
function updateStats(products) {
    const totalElement = document.getElementById('total-products');
    const valueElement = document.getElementById('total-value');
    
    if (totalElement) {
        totalElement.textContent = products.length.toLocaleString();
    }
    
    if (valueElement && products.length > 0) {
        const totalValue = products.reduce((sum, product) => {
            return sum + (parseFloat(product.priceUSD) || 0);
        }, 0);
        valueElement.textContent = '$' + totalValue.toLocaleString();
    }
}

// 手動同期（Hook依存除去版）
async function syncEbayData() {
    showLoading('手動同期を実行中...');
    
    try {
        console.log('🔄 手動同期開始');
        
        const response = await fetch('modules/tanaoroshi/tanaoroshi_ajax_handler_postgresql_ebay.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'action=sync_ebay_data'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ 手動同期成功:', result.message);
            showNotification('success', '手動同期完了: ' + result.message);
            
            // 同期後にデータを再読み込み
            await loadEbayData();
        } else {
            throw new Error(result.error || '手動同期失敗');
        }
        
    } catch (error) {
        console.error('❌ 手動同期エラー:', error);
        showNotification('error', '手動同期失敗: ' + error.message);
    } finally {
        hideLoading();
    }
}

// データソース表示更新
function updateDataSourceIndicator(status, message) {
    const indicator = document.getElementById('data-source-indicator');
    if (!indicator) return;
    
    indicator.className = `data-source-indicator status-${status}`;
    indicator.innerHTML = `
        <i class="fas fa-${status === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
        <span>${message}</span>
    `;
}

// フィルター機能
function applyFilters() {
    const searchInput = document.getElementById('search-input');
    const filterType = document.getElementById('filter-type');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const typeFilter = filterType ? filterType.value : '';
    
    filteredProducts = allProducts.filter(product => {
        const matchesSearch = !searchTerm || 
            product.name.toLowerCase().includes(searchTerm) ||
            (product.sku && product.sku.toLowerCase().includes(searchTerm));
        
        const matchesType = !typeFilter || product.type === typeFilter;
        
        return matchesSearch && matchesType;
    });
    
    // 現在のビューに応じて更新
    if (currentView === 'card') {
        updateCardView(filteredProducts);
    } else {
        updateExcelView(filteredProducts);
    }
}

// ビュー切り替え
function switchView(viewType) {
    currentView = viewType;
    
    const cardView = document.querySelector('.inventory__grid');
    const excelView = document.querySelector('#excel-view-table');
    const cardButton = document.querySelector('[data-view="card"]');
    const excelButton = document.querySelector('[data-view="excel"]');
    
    if (viewType === 'card') {
        if (cardView) cardView.style.display = 'grid';
        if (excelView) excelView.style.display = 'none';
        if (cardButton) cardButton.classList.add('active');
        if (excelButton) excelButton.classList.remove('active');
        
        updateCardView(filteredProducts.length > 0 ? filteredProducts : allProducts);
    } else {
        if (cardView) cardView.style.display = 'none';
        if (excelView) excelView.style.display = 'table';
        if (excelButton) excelButton.classList.add('active');
        if (cardButton) cardButton.classList.remove('active');
        
        updateExcelView(filteredProducts.length > 0 ? filteredProducts : allProducts);
    }
}

// ローディング表示
function showLoading(message = 'データを読み込み中...') {
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) {
        loadingElement.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${message}</span>
            </div>
        `;
        loadingElement.style.display = 'block';
    }
}

function hideLoading() {
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

// 通知表示
function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// グリッドレイアウト調整
function adjustGridLayout() {
    const grid = document.querySelector('.inventory__grid');
    if (!grid) return;
    
    const containerWidth = grid.offsetWidth;
    if (containerWidth > 1200) {
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    } else if (containerWidth > 800) {
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
    } else {
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(140px, 1fr))';
    }
}

// イベントリスナー設定
function setupEventListeners() {
    // 検索フィールド
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 300));
    }
    
    // フィルター選択
    const filterType = document.getElementById('filter-type');
    if (filterType) {
        filterType.addEventListener('change', applyFilters);
    }
    
    // ビュー切り替えボタン
    const viewButtons = document.querySelectorAll('[data-view]');
    viewButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const viewType = e.target.getAttribute('data-view');
            switchView(viewType);
        });
    });
    
    // ウィンドウリサイズ
    window.addEventListener('resize', debounce(adjustGridLayout, 200));
}

// Debounce関数（検索の最適化）
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 棚卸しシステム（統一データソース版）初期化開始');
    
    // イベントリスナー設定
    setupEventListeners();
    
    // 初期化シーケンス
    setTimeout(async () => {
        // 統一データロード実行
        await loadEbayData();
        
        // 初期ビューをカードビューに設定
        switchView('card');
        
    }, 1000);
    
    console.log('✅ 初期化完了 - 統一データソース準備完了');
});

// グローバル関数として公開
window.loadEbayData = loadEbayData;
window.syncEbayData = syncEbayData;
window.switchView = switchView;
window.applyFilters = applyFilters;
window.showProductDetails = function(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (product) {
        console.log('商品詳細表示:', product);
        // 詳細モーダル表示処理（後で実装）
    }
};

console.log('📜 棚卸しシステム 統一データソース版 読み込み完了');
