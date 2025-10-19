/**
 * 🎯 棚卸しシステム 完全新規JavaScript v2.0
 * Ajax エラー修正 + 新レイアウト対応
 */

// ===== グローバル設定 =====
window.TanaoroshiSystem = {
    version: '2.0',
    debug: true,
    currentData: [],
    filteredData: [],
    isLoading: false
};

// ===== 🔧 Ajax エラー修正：正しいアクション名使用 =====
async function fetchInventoryData() {
    console.log('🔗 在庫データ取得開始...');
    
    try {
        showLoading(true);
        
        // 🎯 修正：正しいアクション名を使用
        const formData = new FormData();
        formData.append('action', 'tanaoroshi_get_inventory'); // 修正されたアクション名
        formData.append('csrf_token', window.CSRF_TOKEN || 'test_token');
        formData.append('limit', '50');
        formData.append('with_images', 'true');
        formData.append('use_hook_integration', 'true');
        
        console.log('📤 送信データ:', {
            action: 'tanaoroshi_get_inventory',
            limit: 50,
            with_images: true
        });
        
        const response = await fetch(window.location.pathname + window.location.search, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-N3-Ajax-Request': 'true'
            }
        });
        
        console.log('📥 レスポンス状況:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseText = await response.text();
        console.log('📄 レスポンステキスト長:', responseText.length);
        console.log('📄 レスポンステキストプレビュー:', responseText.substring(0, 500));
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ JSON解析エラー:', parseError);
            console.log('❌ 解析失敗テキスト:', responseText);
            throw new Error('サーバーレスポンスのJSON解析に失敗しました');
        }
        
        console.log('✅ 解析済み結果:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'サーバーエラーが発生しました');
        }
        
        window.TanaoroshiSystem.currentData = result.data || [];
        window.TanaoroshiSystem.filteredData = [...window.TanaoroshiSystem.currentData];
        
        updateStatistics(result);
        renderProductGrid(window.TanaoroshiSystem.currentData);
        
        console.log('🎉 データ取得・表示完了:', {
            dataCount: window.TanaoroshiSystem.currentData.length,
            source: result.source || 'unknown'
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ データ取得エラー:', error);
        showError('データ取得に失敗しました: ' + error.message);
        
        // フォールバックデータ表示
        showFallbackData();
        
        throw error;
    } finally {
        showLoading(false);
    }
}

// ===== 🎯 新レイアウト対応：商品グリッド描画 =====
function renderProductGrid(products) {
    console.log('🎨 商品グリッド描画開始:', products.length + '件');
    
    const container = document.getElementById('productsGrid');
    if (!container) {
        console.error('❌ 商品グリッドコンテナが見つかりません');
        return;
    }
    
    // 空状態の場合
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <div class="empty-state-text">商品データがありません</div>
                <div class="empty-state-subtext">データを再読み込みしてください</div>
            </div>
        `;
        return;
    }
    
    // 🎯 新設計：カード分割防止HTMLジェネレーター
    const cardsHtml = products.map(product => {
        const imageUrl = product.image || product.gallery_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop';
        const title = product.name || product.title || '商品名不明';
        const sku = product.sku || 'SKU不明';
        const price = parseFloat(product.priceUSD || product.price || 0);
        const stock = parseInt(product.stock || product.quantity || 0);
        const condition = product.condition || 'used';
        const status = product.listing_status || 'active';
        const watchers = parseInt(product.watchers_count || product.watch_count || 0);
        
        return `
            <div class="product-card" data-sku="${sku}">
                <div class="product-image-area">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" alt="${title}" class="product-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="image-placeholder" style="display:none;">📦</div>` :
                        `<div class="image-placeholder">📦</div>`
                    }
                </div>
                
                <div class="product-info">
                    <div class="product-title">${title}</div>
                    
                    <div class="product-details">
                        <div class="detail-row">
                            <span class="detail-label">SKU:</span>
                            <span class="detail-value">${sku}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">価格:</span>
                            <span class="detail-value price-value">$${price.toFixed(2)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">在庫:</span>
                            <span class="detail-value stock-value">${stock}個</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">状態:</span>
                            <span class="detail-value">${condition === 'new' ? '新品' : '中古'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="product-status">
                    <span class="status-badge ${status === 'active' ? 'status-active' : 'status-inactive'}">
                        ${status === 'active' ? 'アクティブ' : '非アクティブ'}
                    </span>
                    <div class="watchers-info">
                        <i class="fas fa-eye"></i>
                        <span>${watchers}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = cardsHtml;
    
    console.log('✅ 商品グリッド描画完了:', container.children.length + '枚のカード');
}

// ===== 統計情報更新 =====
function updateStatistics(result) {
    const data = result.data || [];
    const totalItems = data.length;
    const activeItems = data.filter(item => (item.listing_status || 'active') === 'active').length;
    const totalValue = data.reduce((sum, item) => sum + parseFloat(item.priceUSD || item.price || 0), 0);
    const averagePrice = totalItems > 0 ? totalValue / totalItems : 0;
    
    // DOM更新
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateElement('totalItems', totalItems.toLocaleString());
    updateElement('activeItems', activeItems.toLocaleString());
    updateElement('totalValue', '$' + totalValue.toLocaleString('en-US', {minimumFractionDigits: 2}));
    updateElement('averagePrice', '$' + averagePrice.toFixed(2));
    
    console.log('📊 統計情報更新:', { totalItems, activeItems, totalValue, averagePrice });
}

// ===== 検索・フィルター機能 =====
function setupSearchAndFilter() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const conditionFilter = document.getElementById('conditionFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(performSearch, 300));
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', performSearch);
    }
    
    if (conditionFilter) {
        conditionFilter.addEventListener('change', performSearch);
    }
}

function performSearch() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const conditionFilter = document.getElementById('conditionFilter')?.value || '';
    
    window.TanaoroshiSystem.filteredData = window.TanaoroshiSystem.currentData.filter(item => {
        const matchesSearch = !searchTerm || 
            (item.name || item.title || '').toLowerCase().includes(searchTerm) ||
            (item.sku || '').toLowerCase().includes(searchTerm);
            
        const matchesCategory = !categoryFilter || 
            (item.category || '').toLowerCase().includes(categoryFilter.toLowerCase());
            
        const matchesCondition = !conditionFilter || 
            (item.condition || '') === conditionFilter;
            
        return matchesSearch && matchesCategory && matchesCondition;
    });
    
    renderProductGrid(window.TanaoroshiSystem.filteredData);
    
    console.log('🔍 検索実行:', {
        searchTerm,
        categoryFilter,
        conditionFilter,
        resultCount: window.TanaoroshiSystem.filteredData.length
    });
}

// ===== ユーティリティ関数 =====
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

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
    window.TanaoroshiSystem.isLoading = show;
}

function showError(message) {
    const container = document.getElementById('errorContainer');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                ${message}
                <button onclick="this.parentElement.style.display='none'" style="float: right; background: none; border: none; color: inherit; cursor: pointer;">&times;</button>
            </div>
        `;
        container.style.display = 'block';
    }
}

function showFallbackData() {
    console.log('🔄 フォールバックデータ表示');
    
    const fallbackData = [
        {
            id: 1,
            name: 'サンプル商品 1',
            sku: 'SAMPLE-001',
            priceUSD: 99.99,
            stock: 5,
            condition: 'new',
            category: 'エレクトロニクス',
            listing_status: 'active',
            watchers_count: 3,
            image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop'
        },
        {
            id: 2,
            name: 'サンプル商品 2',
            sku: 'SAMPLE-002',
            priceUSD: 149.99,
            stock: 2,
            condition: 'used',
            category: 'ホビー',
            listing_status: 'active',
            watchers_count: 7,
            image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=200&fit=crop'
        },
        {
            id: 3,
            name: 'サンプル商品 3',
            sku: 'SAMPLE-003',
            priceUSD: 79.99,
            stock: 0,
            condition: 'new',
            category: 'スポーツ',
            listing_status: 'inactive',
            watchers_count: 1,
            image: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=300&h=200&fit=crop'
        }
    ];
    
    window.TanaoroshiSystem.currentData = fallbackData;
    window.TanaoroshiSystem.filteredData = [...fallbackData];
    
    updateStatistics({ data: fallbackData });
    renderProductGrid(fallbackData);
}

// ===== 初期化処理 =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 棚卸しシステム v2.0 初期化開始');
    
    // 検索・フィルター設定
    setupSearchAndFilter();
    
    // 初期データ読み込み
    setTimeout(() => {
        fetchInventoryData().catch(() => {
            console.log('🔄 初期データ読み込み失敗 - フォールバック表示');
        });
    }, 500);
    
    console.log('✅ 棚卸しシステム v2.0 初期化完了');
});

// ===== グローバル関数エクスポート =====
window.TanaoroshiSystem.fetchData = fetchInventoryData;
window.TanaoroshiSystem.renderGrid = renderProductGrid;
window.TanaoroshiSystem.performSearch = performSearch;
window.TanaoroshiSystem.showFallback = showFallbackData;
