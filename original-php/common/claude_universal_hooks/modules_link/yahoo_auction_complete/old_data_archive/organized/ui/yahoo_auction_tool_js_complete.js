/**
 * Yahoo Auction Tool - 完全版JavaScript（eBayカテゴリー統合）
 * データベース統合・商品承認システム・フィルター管理・eBayカテゴリー自動判定
 * 作成日: 2025-09-14
 * 修正履歴: エラーハンドリング強化・eBayカテゴリー機能統合
 */

// グローバル設定
const API_BASE_URL = window.location.pathname;
const SYSTEM_VERSION = 'Phase5_EbayCategory_Integrated';

// グローバル変数
let currentProducts = [];
let selectedProducts = new Set();
let currentPage = 1;
let totalPages = 1;
let isLoading = false;

// システム初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('Yahoo Auction Tool Phase5 eBayカテゴリー統合システム初期化開始');
    
    // 初期データ読み込み
    updateDashboardStats();
    
    // イベントリスナー設定
    setupEventListeners();
    
    // 商品承認タブが選択されている場合、自動でデータ読み込み
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.dataset.tab === 'approval') {
        loadApprovalData();
    }
    
    console.log('Yahoo Auction Tool Phase5 eBayカテゴリー統合システム初期化完了');
    addLogEntry('success', 'システム初期化完了（eBayカテゴリー統合版）');
});

// イベントリスナー設定
function setupEventListeners() {
    // 検索フォーム
    const searchQuery = document.getElementById('searchQuery');
    if (searchQuery) {
        searchQuery.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchDatabase();
            }
        });
    }
    
    // フィルターボタン
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            applyFilter(this.dataset.filter);
        });
    });
    
    // ページネーション
    const pageButtons = document.querySelectorAll('.pagination-btn');
    pageButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (!this.disabled) {
                changePage(parseInt(this.dataset.page) || 0);
            }
        });
    });
}

// ダッシュボード統計更新
async function updateDashboardStats() {
    try {
        showLoading('統計データ更新中...');
        
        const response = await fetch(API_BASE_URL + '?action=get_dashboard_stats');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
            const stats = data.data;
            
            // 統計値を安全に更新
            safeUpdateElement('totalRecords', formatNumber(stats.total_records || 0));
            safeUpdateElement('scrapedCount', formatNumber(stats.scraped_count || 0));
            safeUpdateElement('calculatedCount', formatNumber(stats.calculated_count || 0));
            safeUpdateElement('filteredCount', formatNumber(stats.filtered_count || 0));
            safeUpdateElement('readyCount', formatNumber(stats.ready_count || 0));
            safeUpdateElement('listedCount', formatNumber(stats.listed_count || 0));
            
            console.log('ダッシュボード統計更新完了:', stats);
            addLogEntry('success', `統計更新完了: 総数${formatNumber(stats.total_records)}件`);
        } else {
            throw new Error(data.message || 'データ形式が不正です');
        }
    } catch (error) {
        console.error('ダッシュボード統計更新エラー:', error);
        addLogEntry('error', `統計更新エラー: ${error.message}`);
        showNotification('統計データの更新に失敗しました', 'error');
    } finally {
        hideLoading();
    }
}

// 商品承認データ読み込み
async function loadApprovalData() {
    if (isLoading) return;
    
    try {
        isLoading = true;
        showApprovalLoading();
        
        const response = await fetch(API_BASE_URL + '?action=get_approval_queue');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            currentProducts = data.data || [];
            displayApprovalProducts(currentProducts);
            updateApprovalStats();
            addLogEntry('success', `承認データ読み込み完了: ${currentProducts.length}件`);
        } else {
            throw new Error(data.message || '承認データの取得に失敗しました');
        }
    } catch (error) {
        console.error('承認データ読み込みエラー:', error);
        showApprovalError(error.message);
        addLogEntry('error', `承認データ読み込みエラー: ${error.message}`);
    } finally {
        isLoading = false;
        hideApprovalLoading();
    }
}

// 承認商品表示
function displayApprovalProducts(products) {
    const container = document.getElementById('approval-product-grid');
    if (!container) return;
    
    // ローディング・エラー表示をクリア
    hideApprovalLoading();
    hideApprovalError();
    
    if (!products || products.length === 0) {
        showNoDataMessage();
        return;
    }
    
    // 商品データ表示
    showProductsContainer();
    const productsContainer = document.getElementById('productsContainer');
    
    productsContainer.innerHTML = products.map(product => createProductCard(product)).join('');
    
    // チェックボックスイベント設定
    setupProductCheckboxes();
    
    updateFilterCounts(products);
}

// 商品カード作成
function createProductCard(product) {
    const imageUrl = product.picture_url || product.gallery_url || 'https://via.placeholder.com/150x150?text=No+Image';
    const price = parseFloat(product.current_price) || 0;
    const condition = product.condition_name || 'Unknown';
    const aiStatus = product.ai_status || 'ai-pending';
    const riskLevel = product.risk_level || 'medium-risk';
    
    return `
        <div class="approval-product-card" data-product-id="${product.item_id}" data-ai-status="${aiStatus}" data-risk-level="${riskLevel}">
            <div class="product-checkbox-container">
                <input type="checkbox" class="product-checkbox" value="${product.item_id}" onchange="handleProductSelection()">
            </div>
            
            <div class="product-image-container" style="background-image: url('${imageUrl}')">
                <div class="product-badges">
                    <span class="badge badge-${riskLevel}">${riskLevel === 'high-risk' ? '高リスク' : riskLevel === 'medium-risk' ? '中リスク' : '低リスク'}</span>
                    <span class="badge badge-${aiStatus}">${aiStatus === 'ai-approved' ? 'AI承認' : aiStatus === 'ai-rejected' ? 'AI非承認' : 'AI待機'}</span>
                </div>
                <div class="product-overlay">
                    <div class="product-title">${escapeHtml(product.title || 'タイトルなし')}</div>
                    <div class="product-price">$${price.toFixed(2)}</div>
                </div>
            </div>
            
            <div class="product-info">
                <div class="product-category">${escapeHtml(product.category_name || 'カテゴリーなし')}</div>
                <div class="product-meta">
                    <span class="product-condition condition-${condition.toLowerCase()}">${condition}</span>
                    <span class="product-sku">${product.item_id}</span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-sm btn-success" onclick="approveProduct('${product.item_id}')">
                        <i class="fas fa-check"></i> 承認
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="rejectProduct('${product.item_id}')">
                        <i class="fas fa-times"></i> 否認
                    </button>
                </div>
            </div>
        </div>
    `;
}

// 商品検索
async function searchDatabase() {
    const query = document.getElementById('searchQuery').value.trim();
    if (!query) {
        showNotification('検索キーワードを入力してください', 'warning');
        return;
    }
    
    try {
        showSearchLoading();
        
        const response = await fetch(API_BASE_URL + `?action=search_products&query=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            displaySearchResults(data.data, query);
            addLogEntry('success', `検索完了: "${query}" - ${data.data.length}件ヒット`);
        } else {
            throw new Error(data.message || '検索に失敗しました');
        }
    } catch (error) {
        console.error('検索エラー:', error);
        showSearchError(error.message);
        addLogEntry('error', `検索エラー: "${query}" - ${error.message}`);
    }
}

// 検索結果表示
function displaySearchResults(results, query) {
    const container = document.getElementById('searchResults');
    if (!container) return;
    
    if (!results || results.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>"${escapeHtml(query)}"の検索結果が見つかりませんでした</h3>
                <p>別のキーワードで検索してみてください。</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="search-results-header">
            <h4>"${escapeHtml(query)}"の検索結果 (${results.length}件)</h4>
        </div>
        <div class="search-results-grid">
            ${results.map(product => createSearchResultCard(product)).join('')}
        </div>
    `;
}

// 検索結果カード作成
function createSearchResultCard(product) {
    const imageUrl = product.picture_url || product.gallery_url || 'https://via.placeholder.com/150x150?text=No+Image';
    const price = parseFloat(product.current_price) || 0;
    const sourceSystem = product.source_system || 'unknown';
    
    return `
        <div class="search-result-card" data-product-id="${product.item_id}">
            <div class="result-image">
                <img src="${imageUrl}" alt="商品画像" onerror="this.src='https://via.placeholder.com/150x150?text=No+Image'">
                <div class="data-type-badge">${getSourceSystemLabel(sourceSystem)}</div>
            </div>
            <div class="result-info">
                <h5>${escapeHtml(product.title || 'タイトルなし')}</h5>
                <div class="result-price">$${price.toFixed(2)}</div>
                <div class="result-meta">
                    <span>${escapeHtml(product.category_name || 'カテゴリーなし')}</span>
                    <span>${product.item_id}</span>
                </div>
            </div>
        </div>
    `;
}

// タブ切り替え
function switchTab(tabName) {
    console.log('タブ切り替え:', tabName);
    
    // 全てのタブボタンからactiveクラスを除去
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 全てのタブコンテンツを非表示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 指定されたタブをアクティブ化
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
    
    const targetContent = document.getElementById(tabName);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // タブ固有の初期化処理
    handleTabSpecificActions(tabName);
}

// タブ固有の処理
function handleTabSpecificActions(tabName) {
    switch (tabName) {
        case 'approval':
            if (currentProducts.length === 0) {
                loadApprovalData();
            }
            break;
        case 'ebay-category':
            updateEbayCategoryStats();
            addLogEntry('info', 'eBayカテゴリー自動判定システムを開きました');
            break;
        case 'dashboard':
            updateDashboardStats();
            break;
        case 'editing':
            loadEditingData();
            break;
        case 'inventory-mgmt':
            loadInventoryData();
            break;
        default:
            addLogEntry('info', `${tabName}タブを開きました`);
            break;
    }
}

// 商品選択処理
function handleProductSelection() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    selectedProducts.clear();
    
    checkboxes.forEach(checkbox => {
        selectedProducts.add(checkbox.value);
    });
    
    updateBulkActionsDisplay();
    updateActionButtonStates();
}

// 一括操作表示更新
function updateBulkActionsDisplay() {
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (bulkActions && selectedCount) {
        if (selectedProducts.size > 0) {
            selectedCount.textContent = selectedProducts.size;
            bulkActions.style.display = 'flex';
        } else {
            bulkActions.style.display = 'none';
        }
    }
}

// アクションボタン状態更新
function updateActionButtonStates() {
    const actionButtons = document.querySelectorAll('.action-btn-success, .action-btn-danger, .action-btn-warning');
    actionButtons.forEach(btn => {
        btn.disabled = selectedProducts.size === 0;
    });
}

// 一括承認
async function bulkApprove() {
    if (selectedProducts.size === 0) {
        showNotification('商品を選択してください', 'warning');
        return;
    }
    
    if (!confirm(`${selectedProducts.size}件の商品を一括承認しますか？`)) {
        return;
    }
    
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: new URLSearchParams({
                action: 'approve_products',
                skus: Array.from(selectedProducts).join(','),
                decision: 'approve'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`${selectedProducts.size}件の商品を承認しました`, 'success');
            selectedProducts.clear();
            loadApprovalData();
            addLogEntry('success', `一括承認完了: ${selectedProducts.size}件`);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('一括承認エラー:', error);
        showNotification('一括承認に失敗しました', 'error');
        addLogEntry('error', `一括承認エラー: ${error.message}`);
    }
}

// 一括否認
async function bulkReject() {
    if (selectedProducts.size === 0) {
        showNotification('商品を選択してください', 'warning');
        return;
    }
    
    if (!confirm(`${selectedProducts.size}件の商品を一括否認しますか？`)) {
        return;
    }
    
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: new URLSearchParams({
                action: 'approve_products',
                skus: Array.from(selectedProducts).join(','),
                decision: 'reject'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`${selectedProducts.size}件の商品を否認しました`, 'success');
            selectedProducts.clear();
            loadApprovalData();
            addLogEntry('success', `一括否認完了: ${selectedProducts.size}件`);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('一括否認エラー:', error);
        showNotification('一括否認に失敗しました', 'error');
        addLogEntry('error', `一括否認エラー: ${error.message}`);
    }
}

// フィルター適用
function applyFilter(filterType) {
    console.log('フィルター適用:', filterType);
    
    // フィルターボタンのアクティブ状態更新
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filterType}"]`).classList.add('active');
    
    // フィルター処理
    let filteredProducts = currentProducts;
    
    if (filterType !== 'all') {
        filteredProducts = currentProducts.filter(product => {
            switch (filterType) {
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
        });
    }
    
    displayApprovalProducts(filteredProducts);
    addLogEntry('info', `フィルター適用: ${filterType} (${filteredProducts.length}件表示)`);
}

// ユーティリティ関数群

// 安全なDOM更新
function safeUpdateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`要素が見つかりません: ${elementId}`);
    }
}

// 数値フォーマット
function formatNumber(num) {
    return new Intl.NumberFormat('ja-JP').format(num);
}

// HTML エスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ソースシステムラベル取得
function getSourceSystemLabel(sourceSystem) {
    const labels = {
        'yahoo_scraped_confirmed': 'Yahoo',
        'scraped_data': 'Web取得',
        'real_scraped': 'リアル取得',
        'existing_data': '既存',
        'recent_data': '最新',
        'database_direct': 'DB直接'
    };
    return labels[sourceSystem] || sourceSystem;
}

// ログ追加
function addLogEntry(level, message) {
    const logSection = document.getElementById('logSection');
    if (!logSection) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    
    logEntry.innerHTML = `
        <span class="log-timestamp">[${timestamp}]</span>
        <span class="log-level ${level}">${level.toUpperCase()}</span>
        <span>${escapeHtml(message)}</span>
    `;
    
    logSection.insertBefore(logEntry, logSection.firstChild);
    
    // ログが多くなりすぎないよう制限
    const entries = logSection.querySelectorAll('.log-entry');
    if (entries.length > 50) {
        entries[entries.length - 1].remove();
    }
}

// 通知表示
function showNotification(message, type = 'info') {
    // 既存の通知があれば削除
    const existing = document.querySelector('.notification-popup');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification-popup notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        z-index: 1000;
        max-width: 400px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: slideIn 0.3s ease;
    `;
    
    const typeColors = {
        success: 'var(--success-color)',
        error: 'var(--danger-color)',
        warning: 'var(--warning-color)',
        info: 'var(--info-color)'
    };
    
    const typeIcons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="${typeIcons[type]}" style="color: ${typeColors[type]};"></i>
        <span style="flex: 1;">${escapeHtml(message)}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted);">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // 5秒後に自動削除
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// 承認システム表示制御関数群

function showApprovalLoading() {
    const container = document.getElementById('approval-product-grid');
    const loading = document.getElementById('loadingContainer');
    if (container && loading) {
        document.getElementById('noDataContainer').style.display = 'none';
        document.getElementById('errorContainer').style.display = 'none';
        document.getElementById('productsContainer').style.display = 'none';
        loading.style.display = 'flex';
    }
}

function hideApprovalLoading() {
    const loading = document.getElementById('loadingContainer');
    if (loading) {
        loading.style.display = 'none';
    }
}

function showApprovalError(message) {
    const container = document.getElementById('approval-product-grid');
    const error = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    
    if (container && error) {
        document.getElementById('loadingContainer').style.display = 'none';
        document.getElementById('noDataContainer').style.display = 'none';
        document.getElementById('productsContainer').style.display = 'none';
        
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        error.style.display = 'flex';
    }
}

function hideApprovalError() {
    const error = document.getElementById('errorContainer');
    if (error) {
        error.style.display = 'none';
    }
}

function showNoDataMessage() {
    const container = document.getElementById('approval-product-grid');
    const noData = document.getElementById('noDataContainer');
    
    if (container && noData) {
        document.getElementById('loadingContainer').style.display = 'none';
        document.getElementById('errorContainer').style.display = 'none';
        document.getElementById('productsContainer').style.display = 'none';
        noData.style.display = 'flex';
    }
}

function showProductsContainer() {
    const products = document.getElementById('productsContainer');
    if (products) {
        document.getElementById('loadingContainer').style.display = 'none';
        document.getElementById('errorContainer').style.display = 'none';
        document.getElementById('noDataContainer').style.display = 'none';
        products.style.display = 'block';
    }
}

// 検索関連表示制御

function showSearchLoading() {
    const container = document.getElementById('searchResults');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div class="loading-spinner" style="margin: 0 auto 1rem;"></div>
                <p>検索中...</p>
            </div>
        `;
    }
}

function showSearchError(message) {
    const container = document.getElementById('searchResults');
    if (container) {
        container.innerHTML = `
            <div class="notification error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>検索エラー: ${escapeHtml(message)}</span>
            </div>
        `;
    }
}

// その他のスタブ関数（後で実装）

function showLoading(message) {
    console.log('Loading:', message);
    // 実装予定
}

function hideLoading() {
    console.log('Loading hidden');
    // 実装予定
}

function updateApprovalStats() {
    // 承認統計更新（実装予定）
    console.log('Updating approval stats');
}

function updateFilterCounts(products) {
    // フィルター数更新（実装予定）
    console.log('Updating filter counts for', products.length, 'products');
}

function setupProductCheckboxes() {
    // 商品チェックボックス設定（実装予定）
    console.log('Setting up product checkboxes');
}

function approveProduct(productId) {
    console.log('Approving product:', productId);
    // 個別承認（実装予定）
}

function rejectProduct(productId) {
    console.log('Rejecting product:', productId);
    // 個別否認（実装予定）
}

function loadEditingData() {
    console.log('Loading editing data');
    // 編集データ読み込み（実装予定）
}

function loadInventoryData() {
    console.log('Loading inventory data');
    // 在庫データ読み込み（実装予定）
}

function selectAllVisible() {
    document.querySelectorAll('.product-checkbox').forEach(checkbox => {
        checkbox.checked = true;
    });
    handleProductSelection();
    addLogEntry('info', '全商品を選択しました');
}

function deselectAll() {
    document.querySelectorAll('.product-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    handleProductSelection();
    addLogEntry('info', '全選択を解除しました');
}

function clearSelection() {
    deselectAll();
}

function exportSelectedProducts() {
    if (selectedProducts.size === 0) {
        showNotification('商品を選択してください', 'warning');
        return;
    }
    
    console.log('Exporting selected products:', Array.from(selectedProducts));
    showNotification(`${selectedProducts.size}件の商品をCSV出力します`, 'info');
    // CSV出力実装予定
}

function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        loadApprovalData();
        addLogEntry('info', `ページ${currentPage}に移動`);
    }
}

function checkDatabaseConnection() {
    console.log('Checking database connection');
    addLogEntry('info', 'データベース接続確認中...');
    // データベース接続確認（実装予定）
}

// CSSアニメーション追加
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .notification-popup {
        animation: slideIn 0.3s ease !important;
    }
    
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid var(--primary-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// エクスポート（モジュール形式での使用時）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateDashboardStats,
        loadApprovalData,
        searchDatabase,
        switchTab,
        bulkApprove,
        bulkReject,
        applyFilter
    };
}

console.log('Yahoo Auction Tool JavaScript（eBayカテゴリー統合版）読み込み完了');