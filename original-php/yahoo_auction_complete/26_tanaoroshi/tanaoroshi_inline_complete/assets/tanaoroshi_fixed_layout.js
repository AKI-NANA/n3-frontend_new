// 棚卸しシステム JavaScript - N3準拠外部化版
// PostgreSQL統合・エラー修正・8枚グリッド対応

// グローバル変数
let allInventoryData = [];
let filteredData = [];
let currentView = 'card';
let exchangeRate = 150.25;
let isLoading = false;

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 棚卸しシステム初期化開始');
    initializeSystem();
});

// システム初期化
function initializeSystem() {
    console.log('📊 システム初期化');
    
    // イベントリスナー設定
    setupEventListeners();
    
    // 初期データ読み込み
    loadInitialData();
    
    // 統計初期化
    updateStatistics();
    
    console.log('✅ システム初期化完了');
}

// イベントリスナー設定
function setupEventListeners() {
    // フィルター要素
    const filterElements = ['filter-type', 'filter-channel', 'filter-stock-status', 'filter-price-range'];
    filterElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', applyFilters);
        }
    });
    
    // 検索
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => performSearch(e.target.value));
    }
}

// PostgreSQLデータ読み込み
async function loadPostgreSQLData() {
    console.log('🗄️ PostgreSQLデータ読み込み開始');
    
    try {
        showLoading(true);
        
        const response = await fetch('modules/tanaoroshi_inline_complete/tanaoroshi_ajax_handler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                action: 'get_inventory',
                limit: '30',
                csrf_token: 'dev_token_safe',
                dev_mode: '1'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📊 PostgreSQL応答:', result);
        
        if (result.success && result.data) {
            allInventoryData = result.data;
            filteredData = [...allInventoryData];
            
            console.log(`✅ データ読み込み成功: ${allInventoryData.length}件`);
            
            renderInventoryCards();
            updateStatistics();
            showSuccessMessage(`データ読み込み完了: ${allInventoryData.length}件`);
            
        } else {
            throw new Error(result.error || 'データ取得に失敗');
        }
        
    } catch (error) {
        console.error('❌ PostgreSQLエラー:', error);
        showErrorMessage(`データ読み込みエラー: ${error.message}`);
        loadDemoData();
        
    } finally {
        showLoading(false);
    }
}

// 初期データ読み込み
function loadInitialData() {
    console.log('📊 初期データ読み込み');
    loadDemoData();
}

// デモデータ読み込み
function loadDemoData() {
    console.log('📊 デモデータ生成');
    
    const demoProducts = [
        {id: 1, title: 'iPhone 15 Pro Max 256GB', sku: 'IPH15-256', type: 'stock', priceUSD: 1199.00, stock: 5},
        {id: 2, title: 'MacBook Pro M3 16inch', sku: 'MBP16-M3', type: 'stock', priceUSD: 2899.00, stock: 3},
        {id: 3, title: 'Nike Air Jordan 1 High', sku: 'AIR-J1-CHI', type: 'dropship', priceUSD: 450.00, stock: 0},
        {id: 4, title: 'Gaming Setup Bundle RTX4090', sku: 'GAME-SET-RTX90', type: 'set', priceUSD: 2499.00, stock: 2},
        {id: 5, title: 'Sony WH-1000XM5 Wireless', sku: 'SONY-WH1000XM5', type: 'hybrid', priceUSD: 399.99, stock: 8},
        {id: 6, title: 'iPad Pro 12.9 M2 256GB', sku: 'IPD129-M2-256', type: 'stock', priceUSD: 1099.00, stock: 4},
        {id: 7, title: 'Rolex Submariner Date', sku: 'ROL-SUB-BK41', type: 'dropship', priceUSD: 12500.00, stock: 0},
        {id: 8, title: 'Photography Studio Kit Pro', sku: 'PHOTO-STUDIO-PRO', type: 'set', priceUSD: 4999.00, stock: 1}
    ];
    
    allInventoryData = demoProducts;
    filteredData = [...allInventoryData];
    
    console.log(`✅ デモデータ読み込み完了: ${demoProducts.length}件`);
    
    renderInventoryCards();
    updateStatistics();
}

// カード表示
function renderInventoryCards() {
    console.log('🎨 カード表示開始');
    
    const container = document.getElementById('card-view');
    if (!container) return;
    
    if (!filteredData || filteredData.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;">
                <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>商品データがありません</p>
            </div>
        `;
        return;
    }
    
    const cardsHTML = filteredData.map(item => `
        <div class="inventory__card" onclick="showItemDetails(${item.id})">
            <div class="inventory__card-image">
                ${item.image ? 
                    `<img src="${item.image}" alt="${item.title}" class="inventory__card-img">` :
                    `<div class="inventory__card-placeholder">
                        <i class="fas fa-image"></i>
                        <span>画像なし</span>
                    </div>`
                }
                <div class="inventory__badge inventory__badge--${item.type}">
                    ${getTypeBadgeText(item.type)}
                </div>
            </div>
            
            <div class="inventory__card-info">
                <h3 class="inventory__card-title">${escapeHtml(item.title)}</h3>
                
                <div class="inventory__card-price">
                    <div class="inventory__card-price-main">$${item.priceUSD.toFixed(2)}</div>
                    <div class="inventory__card-price-sub">¥${Math.round(item.priceUSD * exchangeRate).toLocaleString()}</div>
                </div>
                
                <div class="inventory__card-footer">
                    <span class="inventory__card-sku">${item.sku}</span>
                    <span class="inventory__card-stock">在庫: ${item.stock}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = cardsHTML;
    console.log(`✅ カード表示完了: ${filteredData.length}件`);
}

// フィルター適用
function applyFilters() {
    console.log('🔍 フィルター適用');
    
    let filtered = [...allInventoryData];
    
    const typeFilter = document.getElementById('filter-type')?.value;
    if (typeFilter) {
        filtered = filtered.filter(item => item.type === typeFilter);
    }
    
    filteredData = filtered;
    renderInventoryCards();
    updateStatistics();
    
    console.log(`✅ フィルター適用完了: ${filteredData.length}件`);
}

// フィルターリセット
function resetFilters() {
    console.log('🔄 フィルターリセット');
    
    document.getElementById('filter-type').value = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    filteredData = [...allInventoryData];
    renderInventoryCards();
    updateStatistics();
}

// 検索実行
function performSearch(query) {
    if (!query.trim()) {
        filteredData = [...allInventoryData];
    } else {
        const searchTerm = query.toLowerCase();
        filteredData = allInventoryData.filter(item =>
            item.title.toLowerCase().includes(searchTerm) ||
            item.sku.toLowerCase().includes(searchTerm)
        );
    }
    
    renderInventoryCards();
    updateStatistics();
}

// 統計更新
function updateStatistics() {
    const totalProducts = allInventoryData.length;
    const stockProducts = allInventoryData.filter(item => item.type === 'stock').length;
    const dropshipProducts = allInventoryData.filter(item => item.type === 'dropship').length;
    const setProducts = allInventoryData.filter(item => item.type === 'set').length;
    const hybridProducts = allInventoryData.filter(item => item.type === 'hybrid').length;
    
    const totalValue = allInventoryData.reduce((sum, item) => 
        sum + (item.priceUSD * item.stock), 0);
    
    updateStatElement('total-products', totalProducts);
    updateStatElement('stock-products', stockProducts);
    updateStatElement('dropship-products', dropshipProducts);
    updateStatElement('set-products', setProducts);
    updateStatElement('hybrid-products', hybridProducts);
    updateStatElement('total-value', `$${(totalValue / 1000).toFixed(1)}K`);
}

// 統計要素更新
function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

// ローディング表示
function showLoading(show) {
    let loadingElement = document.getElementById('loading-overlay');
    
    if (show) {
        if (!loadingElement) {
            loadingElement = document.createElement('div');
            loadingElement.id = 'loading-overlay';
            loadingElement.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.5); display: flex;
                align-items: center; justify-content: center;
                z-index: 9999; color: white; font-size: 1.2rem;
            `;
            loadingElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> データ読み込み中...';
            document.body.appendChild(loadingElement);
        }
    } else {
        if (loadingElement) loadingElement.remove();
    }
}

// メッセージ表示
function showSuccessMessage(message) {
    showToast(message, 'success');
}

function showErrorMessage(message) {
    showToast(message, 'error');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 15px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white; border-radius: 8px; z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 5000);
}

// ユーティリティ関数
function getTypeBadgeText(type) {
    const badges = {
        stock: '有在庫',
        dropship: '無在庫', 
        set: 'セット品',
        hybrid: 'ハイブリッド'
    };
    return badges[type] || '不明';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// アイテム詳細表示
function showItemDetails(itemId) {
    const item = allInventoryData.find(i => i.id === itemId);
    if (item) {
        alert(`商品詳細: ${item.title}\nSKU: ${item.sku}\n価格: $${item.priceUSD}\n在庫: ${item.stock}`);
    }
}

console.log('✅ 棚卸しシステム JavaScript読み込み完了');