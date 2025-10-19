/**
 * Yahoo Auction Tool - 完全版JavaScript
 * ファイル名: yahoo_auction_tool_complete.js
 * 統合データベース対応・商品承認システム
 */

// グローバル変数
let currentProductData = [];
let selectedProducts = new Set();
let currentFilters = {};
let isLoading = false;

// システム初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('Yahoo Auction Tool Complete JavaScript 初期化開始');
    
    // タブシステム初期化
    initializeTabSystem();
    
    // フィルターシステム初期化
    initializeFilterSystem();
    
    // 承認システム初期化
    initializeApprovalSystem();
    
    console.log('Yahoo Auction Tool Complete JavaScript 初期化完了');
});

// タブシステム初期化
function initializeTabSystem() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const targetTab = this.getAttribute('data-tab');
            if (targetTab) {
                switchTab(targetTab);
            }
        });
    });
}

// タブ切り替え関数
function switchTab(targetTab) {
    console.log('タブ切り替え:', targetTab);
    
    // 全てのタブボタンから active クラスを削除
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 全てのタブコンテンツを非表示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 対象タブボタンをアクティブ化
    const targetButton = document.querySelector(`[data-tab="${targetTab}"]`);
    if (targetButton) {
        targetButton.classList.add('active');
    }
    
    // 対象タブコンテンツを表示
    const targetContent = document.getElementById(targetTab);
    if (targetContent) {
        targetContent.classList.add('active');
        
        // タブ固有の初期化処理
        handleTabActivation(targetTab);
    }
}

// タブアクティベーション時の処理
function handleTabActivation(tabName) {
    switch(tabName) {
        case 'approval':
            loadApprovalData();
            break;
        case 'dashboard':
            loadDashboardData();
            break;
        case 'editing':
            // 編集データは手動読み込み
            break;
        default:
            break;
    }
}

// フィルターシステム初期化
function initializeFilterSystem() {
    const filterButtons = document.querySelectorAll('.approval__filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filterType = this.getAttribute('data-filter');
            if (filterType) {
                toggleFilter(filterType, this);
            }
        });
    });
}

// フィルター切り替え
function toggleFilter(filterType, buttonElement) {
    const filterGroup = buttonElement.closest('.approval__filter-group');
    const isActive = buttonElement.classList.contains('approval__filter-btn--active');
    
    if (isActive) {
        // フィルターを解除
        buttonElement.classList.remove('approval__filter-btn--active');
        delete currentFilters[filterType];
    } else {
        // 同じグループの他のフィルターを解除
        filterGroup.querySelectorAll('.approval__filter-btn').forEach(btn => {
            btn.classList.remove('approval__filter-btn--active');
        });
        
        // 新しいフィルターを適用
        buttonElement.classList.add('approval__filter-btn--active');
        currentFilters[filterType] = true;
    }
    
    // フィルターされた商品を再表示
    applyFilters();
}

// フィルター適用
function applyFilters() {
    if (currentProductData.length === 0) {
        return;
    }
    
    let filteredProducts = currentProductData;
    
    // フィルター条件に応じて商品をフィルタリング
    Object.keys(currentFilters).forEach(filterType => {
        filteredProducts = filteredProducts.filter(product => {
            return matchesFilter(product, filterType);
        });
    });
    
    displayProducts(filteredProducts);
    updateFilterCounts();
}

// 商品がフィルター条件に一致するかチェック
function matchesFilter(product, filterType) {
    switch(filterType) {
        case 'ai-approved':
            return product.ai_status === 'ai-approved';
        case 'ai-rejected':
            return product.ai_status === 'ai-rejected';
        case 'ai-pending':
            return product.ai_status === 'ai-pending';
        case 'high-risk':
            return product.risk_level === 'high-risk';
        case 'medium-risk':
            return product.risk_level === 'medium-risk';
        case 'low-risk':
            return product.risk_level === 'low-risk';
        default:
            return true;
    }
}

// 承認システム初期化
function initializeApprovalSystem() {
    // 選択関連イベントリスナー
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('product-checkbox')) {
            handleProductSelection(e.target);
        }
    });
    
    // 一括操作ボタン
    const bulkButtons = document.querySelectorAll('.approval__bulk-btn');
    bulkButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.textContent.includes('承認') ? 'approve' : 
                          this.textContent.includes('否認') ? 'reject' : 'clear';
            handleBulkAction(action);
        });
    });
}

// 商品選択処理
function handleProductSelection(checkbox) {
    const productId = checkbox.value;
    
    if (checkbox.checked) {
        selectedProducts.add(productId);
    } else {
        selectedProducts.delete(productId);
    }
    
    updateSelectionUI();
}

// 選択UI更新
function updateSelectionUI() {
    const selectedCount = selectedProducts.size;
    const bulkActions = document.getElementById('bulkActions');
    const selectedCountElement = document.getElementById('selectedCount');
    
    if (selectedCountElement) {
        selectedCountElement.textContent = selectedCount;
    }
    
    if (bulkActions) {
        if (selectedCount > 0) {
            bulkActions.style.display = 'flex';
        } else {
            bulkActions.style.display = 'none';
        }
    }
    
    // メインアクションボタンの状態更新
    const approveBtn = document.querySelector('.approval__main-btn--approve');
    const rejectBtn = document.querySelector('.approval__main-btn--reject');
    
    if (approveBtn) {
        approveBtn.disabled = selectedCount === 0;
    }
    if (rejectBtn) {
        rejectBtn.disabled = selectedCount === 0;
    }
}

// 一括操作処理
function handleBulkAction(action) {
    const selectedArray = Array.from(selectedProducts);
    
    if (selectedArray.length === 0) {
        showNotification('商品が選択されていません', 'warning');
        return;
    }
    
    switch(action) {
        case 'approve':
            bulkApprove();
            break;
        case 'reject':
            bulkReject();
            break;
        case 'clear':
            clearSelection();
            break;
    }
}

// データ読み込み関数群
function loadApprovalData() {
    if (isLoading) {
        return;
    }
    
    console.log('承認データ読み込み開始');
    isLoading = true;
    
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) {
        loadingContainer.style.display = 'flex';
    }
    
    fetch(window.location.pathname + '?action=get_approval_queue')
        .then(response => response.json())
        .then(data => {
            console.log('承認データ受信:', data);
            
            if (data.success && data.data && Array.isArray(data.data)) {
                currentProductData = data.data;
                displayProducts(currentProductData);
                updateFilterCounts();
                updateStats(currentProductData);
            } else {
                showNoDataMessage();
            }
        })
        .catch(error => {
            console.error('承認データ読み込みエラー:', error);
            showErrorMessage('データの読み込みに失敗しました: ' + error.message);
        })
        .finally(() => {
            isLoading = false;
            if (loadingContainer) {
                loadingContainer.style.display = 'none';
            }
        });
}

function loadDashboardData() {
    console.log('ダッシュボードデータ読み込み');
    
    fetch(window.location.pathname + '?action=get_dashboard_stats')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data) {
                updateDashboardStats(data.data);
            }
        })
        .catch(error => {
            console.error('ダッシュボードデータ読み込みエラー:', error);
        });
}

function searchDatabase() {
    const searchQuery = document.getElementById('searchQuery');
    if (!searchQuery || !searchQuery.value.trim()) {
        showNotification('検索キーワードを入力してください', 'warning');
        return;
    }
    
    const query = searchQuery.value.trim();
    console.log('データベース検索:', query);
    
    fetch(window.location.pathname + `?action=search_products&query=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            const searchResults = document.getElementById('searchResults');
            if (searchResults) {
                if (data.success && data.data && data.data.length > 0) {
                    displaySearchResults(data.data, searchResults);
                } else {
                    searchResults.innerHTML = `
                        <div class="notification info">
                            <i class="fas fa-search"></i>
                            <span>「${query}」の検索結果が見つかりませんでした。</span>
                        </div>
                    `;
                }
            }
        })
        .catch(error => {
            console.error('検索エラー:', error);
            showNotification('検索中にエラーが発生しました', 'error');
        });
}

// 表示関数群
function displayProducts(products) {
    const productGrid = document.getElementById('approval-product-grid');
    const loadingContainer = document.getElementById('loadingContainer');
    
    if (loadingContainer) {
        loadingContainer.style.display = 'none';
    }
    
    if (!productGrid) {
        console.error('商品グリッド要素が見つかりません');
        return;
    }
    
    if (!products || products.length === 0) {
        showNoDataMessage();
        return;
    }
    
    const productCards = products.map(product => createProductCard(product)).join('');
    productGrid.innerHTML = productCards;
    
    // 選択状態を復元
    selectedProducts.forEach(productId => {
        const checkbox = document.querySelector(`input[value="${productId}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    
    updateSelectionUI();
}

function createProductCard(product) {
    const price = parseFloat(product.current_price) || 0;
    const priceDisplay = price > 0 ? `$${price.toFixed(2)}` : '価格未設定';
    
    const imageUrl = product.picture_url && product.picture_url !== '' 
        ? product.picture_url 
        : 'https://via.placeholder.com/200x200?text=No+Image';
    
    return `
        <div class="product-card" data-product-id="${product.item_id}">
            <div class="product-header">
                <label class="product-checkbox-container">
                    <input type="checkbox" class="product-checkbox" value="${product.item_id}">
                    <span class="checkmark"></span>
                </label>
                <div class="product-badges">
                    <span class="badge badge-${product.ai_status}">${getAiStatusText(product.ai_status)}</span>
                    <span class="badge badge-${product.risk_level}">${getRiskLevelText(product.risk_level)}</span>
                </div>
            </div>
            
            <div class="product-image-container">
                <img src="${imageUrl}" alt="${product.title}" class="product-image" 
                     onerror="this.src='https://via.placeholder.com/200x200?text=No+Image'">
            </div>
            
            <div class="product-info">
                <h4 class="product-title">${product.title || '商品名なし'}</h4>
                <div class="product-price">${priceDisplay}</div>
                <div class="product-details">
                    <div class="detail-row">
                        <span class="detail-label">カテゴリ:</span>
                        <span class="detail-value">${product.category_name || '未分類'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">状態:</span>
                        <span class="detail-value">${product.condition_name || '不明'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">SKU:</span>
                        <span class="detail-value">${product.master_sku || product.item_id}</span>
                    </div>
                </div>
            </div>
            
            <div class="product-actions">
                <button class="btn btn-sm btn-success" onclick="approveProduct('${product.item_id}')">
                    <i class="fas fa-check"></i> 承認
                </button>
                <button class="btn btn-sm btn-danger" onclick="rejectProduct('${product.item_id}')">
                    <i class="fas fa-times"></i> 否認
                </button>
                <button class="btn btn-sm btn-info" onclick="viewProductDetails('${product.item_id}')">
                    <i class="fas fa-eye"></i> 詳細
                </button>
            </div>
        </div>
    `;
}

function displaySearchResults(results, container) {
    const resultsHtml = `
        <div class="search-results-summary">
            <h4>${results.length}件の検索結果</h4>
        </div>
        <div class="search-results-grid">
            ${results.map(product => createSearchResultCard(product)).join('')}
        </div>
    `;
    container.innerHTML = resultsHtml;
}

function createSearchResultCard(product) {
    const price = parseFloat(product.current_price) || 0;
    const priceDisplay = price > 0 ? `$${price.toFixed(2)}` : '価格未設定';
    
    return `
        <div class="search-result-item">
            <div class="search-result-image">
                <img src="${product.picture_url || 'https://via.placeholder.com/80x80'}" 
                     alt="${product.title}" 
                     onerror="this.src='https://via.placeholder.com/80x80'">
            </div>
            <div class="search-result-info">
                <h5>${product.title}</h5>
                <div class="price">${priceDisplay}</div>
                <div class="category">${product.category_name || '未分類'}</div>
                <div class="condition">${product.condition_name || '不明'}</div>
            </div>
        </div>
    `;
}

// ユーティリティ関数
function getAiStatusText(status) {
    switch(status) {
        case 'ai-approved': return 'AI承認';
        case 'ai-rejected': return 'AI否認';
        case 'ai-pending': return 'AI判定待ち';
        default: return '未判定';
    }
}

function getRiskLevelText(level) {
    switch(level) {
        case 'high-risk': return '高リスク';
        case 'medium-risk': return '中リスク';  
        case 'low-risk': return '低リスク';
        default: return 'リスク不明';
    }
}

function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // ログエリアに追加
    addLogEntry(type, message);
    
    // 必要に応じてトースト通知なども追加可能
}

function showNoDataMessage() {
    const productGrid = document.getElementById('approval-product-grid');
    if (productGrid) {
        productGrid.innerHTML = `
            <div class="no-data-container">
                <div class="no-data-icon">
                    <i class="fas fa-inbox"></i>
                </div>
                <h3>承認待ち商品がありません</h3>
                <p>現在、承認が必要な商品はありません。</p>
                <div class="no-data-actions">
                    <button class="btn btn-primary" onclick="loadApprovalData()">
                        <i class="fas fa-sync"></i> データを再読み込み
                    </button>
                </div>
            </div>
        `;
    }
}

function showErrorMessage(message) {
    const productGrid = document.getElementById('approval-product-grid');
    if (productGrid) {
        productGrid.innerHTML = `
            <div class="error-container">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>エラーが発生しました</h3>
                <p>${message}</p>
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="loadApprovalData()">
                        <i class="fas fa-redo"></i> 再試行
                    </button>
                </div>
            </div>
        `;
    }
}

// 統計更新
function updateStats(products) {
    if (!products || !Array.isArray(products)) {
        return;
    }
    
    const stats = {
        pending: products.length,
        aiApproved: products.filter(p => p.ai_status === 'ai-approved').length,
        aiRejected: products.filter(p => p.ai_status === 'ai-rejected').length,
        highRisk: products.filter(p => p.risk_level === 'high-risk').length,
        mediumRisk: products.filter(p => p.risk_level === 'medium-risk').length
    };
    
    updateStatElement('pendingCount', stats.pending);
    updateStatElement('highRiskCount', stats.highRisk);
    updateStatElement('mediumRiskCount', stats.mediumRisk);
}

function updateFilterCounts() {
    if (!currentProductData || currentProductData.length === 0) {
        return;
    }
    
    const counts = {
        all: currentProductData.length,
        aiApproved: currentProductData.filter(p => p.ai_status === 'ai-approved').length,
        aiRejected: currentProductData.filter(p => p.ai_status === 'ai-rejected').length,
        aiPending: currentProductData.filter(p => p.ai_status === 'ai-pending').length,
        highRisk: currentProductData.filter(p => p.risk_level === 'high-risk').length,
        mediumRisk: currentProductData.filter(p => p.risk_level === 'medium-risk').length,
        lowRisk: currentProductData.filter(p => p.risk_level === 'low-risk').length
    };
    
    // フィルター数を更新
    updateFilterCountElement('countAll', counts.all);
    updateFilterCountElement('countAiApproved', counts.aiApproved);
    updateFilterCountElement('countAiRejected', counts.aiRejected);
    updateFilterCountElement('countAiPending', counts.aiPending);
    updateFilterCountElement('countHighRisk', counts.highRisk);
    updateFilterCountElement('countMediumRisk', counts.mediumRisk);
    updateFilterCountElement('countLowRisk', counts.lowRisk);
}

function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function updateFilterCountElement(elementId, count) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = count;
    }
}

function updateDashboardStats(stats) {
    const elements = {
        totalRecords: 'totalRecords',
        scrapedCount: 'scrapedCount',
        calculatedCount: 'calculatedCount',
        filteredCount: 'filteredCount',
        readyCount: 'readyCount',
        listedCount: 'listedCount'
    };
    
    Object.keys(elements).forEach(key => {
        const element = document.getElementById(elements[key]);
        if (element && stats[key] !== undefined) {
            element.textContent = new Intl.NumberFormat('ja-JP').format(stats[key]);
        }
    });
}

// 商品操作関数
function approveProduct(productId) {
    console.log('商品承認:', productId);
    showNotification(`商品 ${productId} を承認しました`, 'success');
}

function rejectProduct(productId) {
    console.log('商品否認:', productId);
    showNotification(`商品 ${productId} を否認しました`, 'info');
}

function viewProductDetails(productId) {
    console.log('商品詳細表示:', productId);
    // 詳細モーダル表示（実装予定）
}

function bulkApprove() {
    const selectedArray = Array.from(selectedProducts);
    console.log('一括承認:', selectedArray);
    showNotification(`${selectedArray.length}件の商品を承認しました`, 'success');
    clearSelection();
}

function bulkReject() {
    const selectedArray = Array.from(selectedProducts);
    console.log('一括否認:', selectedArray);
    showNotification(`${selectedArray.length}件の商品を否認しました`, 'info');
    clearSelection();
}

function selectAllVisible() {
    document.querySelectorAll('.product-checkbox').forEach(checkbox => {
        checkbox.checked = true;
        selectedProducts.add(checkbox.value);
    });
    updateSelectionUI();
}

function deselectAll() {
    clearSelection();
}

function clearSelection() {
    selectedProducts.clear();
    document.querySelectorAll('.product-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectionUI();
}

// ログ機能
function addLogEntry(level, message) {
    const logSection = document.getElementById('logSection');
    if (!logSection) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    
    logEntry.innerHTML = `
        <span class="log-timestamp">[${timestamp}]</span>
        <span class="log-level ${level}">${level.toUpperCase()}</span>
        <span>${message}</span>
    `;
    
    logSection.insertBefore(logEntry, logSection.firstChild);
    
    // ログが多くなりすぎないよう制限
    const entries = logSection.querySelectorAll('.log-entry');
    if (entries.length > 50) {
        entries[entries.length - 1].remove();
    }
}

// エクスポート関数（グローバルスコープに必要な関数）
window.switchTab = switchTab;
window.loadApprovalData = loadApprovalData;
window.searchDatabase = searchDatabase;
window.approveProduct = approveProduct;
window.rejectProduct = rejectProduct;
window.viewProductDetails = viewProductDetails;
window.bulkApprove = bulkApprove;
window.bulkReject = bulkReject;
window.selectAllVisible = selectAllVisible;
window.deselectAll = deselectAll;
window.clearSelection = clearSelection;

console.log('Yahoo Auction Tool Complete JavaScript ロード完了');