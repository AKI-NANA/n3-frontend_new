// 🎯 Yahoo Auction Tool - 統合JavaScript（承認システム完全動作版）

// =============================
// グローバル変数
// =============================

let currentTab = 'dashboard';
let approvalData = [];
let selectedProducts = new Set();
let currentFilter = 'all';

// =============================
// サンプル承認データ（実際のシステムではAPIから取得）
// =============================

const sampleApprovalData = [
    {
        sku: 'YAH-001',
        title: 'Nintendo Switch 有機ELモデル ホワイト',
        price_jpy: 37980,
        price_usd: 254.92,
        risk_level: 'high',
        ai_status: 'pending',
        category: 'ゲーム',
        image: 'https://images-na.ssl-images-amazon.com/images/I/61fBz7L4kgL._AC_SL1000_.jpg',
        condition: 'new',
        watch_count: 15,
        source_platform: 'Yahoo'
    },
    {
        sku: 'YAH-002',
        title: 'iPhone 14 Pro Max 256GB ディープパープル',
        price_jpy: 164800,
        price_usd: 1106.21,
        risk_level: 'high',
        ai_status: 'rejected',
        category: 'スマートフォン',
        image: 'https://images-na.ssl-images-amazon.com/images/I/81c7DRHQAJL._AC_SL1500_.jpg',
        condition: 'new',
        watch_count: 8,
        source_platform: 'Yahoo'
    },
    {
        sku: 'YAH-003',
        title: 'Canon EOS R5 ミラーレス一眼カメラ ボディ',
        price_jpy: 398000,
        price_usd: 2671.14,
        risk_level: 'medium',
        ai_status: 'approved',
        category: 'カメラ',
        image: 'https://images-na.ssl-images-amazon.com/images/I/81c7DRHQAJL._AC_SL1500_.jpg',
        condition: 'new',
        watch_count: 22,
        source_platform: 'Yahoo'
    },
    {
        sku: 'YAH-004',
        title: 'Apple Watch Series 8 GPS 45mm',
        price_jpy: 54800,
        price_usd: 367.85,
        risk_level: 'medium',
        ai_status: 'approved',
        category: 'ウェアラブル',
        image: 'https://images-na.ssl-images-amazon.com/images/I/81c7DRHQAJL._AC_SL1500_.jpg',
        condition: 'new',
        watch_count: 12,
        source_platform: 'Yahoo'
    },
    {
        sku: 'YAH-005',
        title: 'MacBook Pro 13インチ M2チップ 256GB',
        price_jpy: 178800,
        price_usd: 1200.54,
        risk_level: 'medium',
        ai_status: 'approved',
        category: 'PC・タブレット',
        image: 'https://images-na.ssl-images-amazon.com/images/I/81c7DRHQAJL._AC_SL1500_.jpg',
        condition: 'new',
        watch_count: 18,
        source_platform: 'Yahoo'
    },
    {
        sku: 'YAH-006',
        title: 'DJI Mini 3 Pro ドローン RC付き',
        price_jpy: 116600,
        price_usd: 783.02,
        risk_level: 'medium',
        ai_status: 'approved',
        category: 'ドローン',
        image: 'https://images-na.ssl-images-amazon.com/images/I/81c7DRHQAJL._AC_SL1500_.jpg',
        condition: 'new',
        watch_count: 9,
        source_platform: 'Yahoo'
    },
    {
        sku: 'YAH-007',
        title: 'Sony α7 IV ILCE-7M4 ミラーレス一眼',
        price_jpy: 328000,
        price_usd: 2202.70,
        risk_level: 'medium',
        ai_status: 'approved',
        category: 'カメラ',
        image: 'https://images-na.ssl-images-amazon.com/images/I/81c7DRHQAJL._AC_SL1500_.jpg',
        condition: 'new',
        watch_count: 25,
        source_platform: 'Yahoo'
    },
    {
        sku: 'YAH-008',
        title: 'CHANEL シャネル N°5 オードゥ パルファム',
        price_jpy: 17600,
        price_usd: 118.24,
        risk_level: 'high',
        ai_status: 'rejected',
        category: 'コスメ・香水',
        image: 'https://images-na.ssl-images-amazon.com/images/I/81c7DRHQAJL._AC_SL1500_.jpg',
        condition: 'new',
        watch_count: 6,
        source_platform: 'Yahoo'
    },
    {
        sku: 'YAH-009',
        title: 'PlayStation 5 本体 CFI-1100A01',
        price_jpy: 66980,
        price_usd: 449.73,
        risk_level: 'high',
        ai_status: 'pending',
        category: 'ゲーム',
        image: 'https://images-na.ssl-images-amazon.com/images/I/81c7DRHQAJL._AC_SL1500_.jpg',
        condition: 'new',
        watch_count: 31,
        source_platform: 'Yahoo'
    },
    {
        sku: 'YAH-010',
        title: 'Dyson V15 Detect コードレス掃除機',
        price_jpy: 89800,
        price_usd: 603.02,
        risk_level: 'medium',
        ai_status: 'approved',
        category: '家電',
        image: 'https://images-na.ssl-images-amazon.com/images/I/81c7DRHQAJL._AC_SL1500_.jpg',
        condition: 'new',
        watch_count: 14,
        source_platform: 'Yahoo'
    }
];

// =============================
// システム初期化
// =============================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Yahoo Auction Tool統合システム初期化開始');
    
    // 承認システムデータ初期化
    initializeApprovalData();
    
    // タブシステム初期化
    initializeTabSystem();
    
    // 検索機能初期化
    initializeSearchSystem();
    
    console.log('✅ システム初期化完了');
});

// =============================
// 承認システム
// =============================

function initializeApprovalData() {
    approvalData = [...sampleApprovalData];
    console.log(`📊 承認データ初期化: ${approvalData.length}件のサンプルデータ読み込み完了`);
}

function initializeApprovalSystem() {
    if (!document.getElementById('productGrid')) {
        console.warn('⚠️ productGrid要素が見つかりません。承認タブがアクティブではない可能性があります。');
        return;
    }
    
    renderApprovalGrid();
    updateFilterCounts();
    setupFilterButtons();
    updateStatistics();
    
    console.log('🎯 承認システム完全初期化完了');
}

function renderApprovalGrid() {
    const grid = document.getElementById('productGrid');
    if (!grid) {
        console.warn('⚠️ productGrid要素が見つかりません');
        return;
    }
    
    const filteredProducts = getFilteredProducts();
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = `
            <div class="no-data-container">
                <div class="no-data-icon">
                    <i class="fas fa-inbox"></i>
                </div>
                <h3>該当する商品がありません</h3>
                <p>フィルター条件に一致する商品が見つかりませんでした。フィルターを変更してお試しください。</p>
                <div class="no-data-actions">
                    <button class="btn btn-primary" onclick="applyFilter('all')">
                        <i class="fas fa-refresh"></i> 全件表示
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredProducts.map(product => {
        const isSelected = selectedProducts.has(product.sku);
        const riskBadge = getRiskBadge(product.risk_level);
        const aiBadge = getAIBadge(product.ai_status);
        
        return `
            <div class="product-card ${isSelected ? 'selected' : ''}" 
                 data-sku="${product.sku}" 
                 onclick="toggleProductSelection('${product.sku}')">
                
                <div class="product-image-container" 
                     style="background-image: url('${product.image}')">
                    <div class="product-badges">
                        ${riskBadge}
                        ${aiBadge}
                    </div>
                    <div class="product-overlay">
                        <div class="product-title">${product.title}</div>
                        <div class="product-price">¥${product.price_jpy.toLocaleString()}</div>
                    </div>
                </div>
                
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <div class="product-footer">
                        <span class="product-condition condition-${product.condition}">
                            ${product.condition === 'new' ? '新品' : '中古'}
                        </span>
                        <span class="product-sku">${product.sku}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    updateSelectionCount();
    updateDisplayInfo(filteredProducts.length);
}

function getRiskBadge(riskLevel) {
    const badges = {
        high: '<span class="badge badge-risk-high">高リスク</span>',
        medium: '<span class="badge badge-risk-medium">中リスク</span>',
        low: '<span class="badge badge-risk-low">低リスク</span>'
    };
    return badges[riskLevel] || '';
}

function getAIBadge(aiStatus) {
    const badges = {
        approved: '<span class="badge badge-ai-approved">AI承認</span>',
        rejected: '<span class="badge badge-ai-rejected">AI却下</span>',
        pending: '<span class="badge badge-ai-pending">AI判定中</span>'
    };
    return badges[aiStatus] || '';
}

function getFilteredProducts() {
    if (currentFilter === 'all') {
        return approvalData;
    }
    
    const filters = {
        'ai-approved': product => product.ai_status === 'approved',
        'ai-rejected': product => product.ai_status === 'rejected',
        'ai-pending': product => product.ai_status === 'pending',
        'high-risk': product => product.risk_level === 'high',
        'medium-risk': product => product.risk_level === 'medium',
        'low-risk': product => product.risk_level === 'low'
    };
    
    return approvalData.filter(filters[currentFilter] || (() => true));
}

function applyFilter(filterType) {
    currentFilter = filterType;
    
    // フィルターボタンのアクティブ状態更新
    document.querySelectorAll('.approval__filter-btn').forEach(btn => {
        if (btn.getAttribute('data-filter') === filterType) {
            btn.classList.add('approval__filter-btn--active');
        } else {
            btn.classList.remove('approval__filter-btn--active');
        }
    });
    
    // グリッド再描画
    renderApprovalGrid();
    
    console.log(`🔍 フィルター適用: ${filterType}`);
}

function setupFilterButtons() {
    document.querySelectorAll('.approval__filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const filterType = btn.getAttribute('data-filter');
            applyFilter(filterType);
        });
    });
}

function updateFilterCounts() {
    const counts = {
        all: approvalData.length,
        'ai-approved': approvalData.filter(p => p.ai_status === 'approved').length,
        'ai-rejected': approvalData.filter(p => p.ai_status === 'rejected').length,
        'ai-pending': approvalData.filter(p => p.ai_status === 'pending').length,
        'high-risk': approvalData.filter(p => p.risk_level === 'high').length,
        'medium-risk': approvalData.filter(p => p.risk_level === 'medium').length,
        'low-risk': approvalData.filter(p => p.risk_level === 'low').length
    };
    
    // フィルターボタンのカウント更新
    Object.entries(counts).forEach(([filter, count]) => {
        const btn = document.querySelector(`[data-filter="${filter}"]`);
        if (btn) {
            const countSpan = btn.querySelector('.approval__filter-count');
            if (countSpan) {
                countSpan.textContent = count;
            }
        }
    });
    
    console.log('📊 フィルターカウント更新完了:', counts);
}

function updateStatistics() {
    const stats = {
        totalCount: approvalData.length,
        pendingCount: approvalData.filter(p => p.ai_status === 'pending').length,
        highRiskCount: approvalData.filter(p => p.risk_level === 'high').length,
        mediumRiskCount: approvalData.filter(p => p.risk_level === 'medium').length,
        approvedCount: approvalData.filter(p => p.ai_status === 'approved').length
    };
    
    // 統計値更新
    updateElementText('totalProductCount', stats.totalCount);
    updateElementText('pendingCount', stats.pendingCount);
    updateElementText('highRiskCount', stats.highRiskCount);
    updateElementText('mediumRiskCount', stats.mediumRiskCount);
    
    // カウント表示も更新
    updateElementText('countAll', stats.totalCount);
    updateElementText('countAiApproved', stats.approvedCount);
    updateElementText('countAiRejected', approvalData.filter(p => p.ai_status === 'rejected').length);
    updateElementText('countAiPending', stats.pendingCount);
    updateElementText('countHighRisk', stats.highRiskCount);
    updateElementText('countMediumRisk', stats.mediumRiskCount);
}

function updateElementText(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function updateDisplayInfo(filteredCount) {
    const displayRange = document.getElementById('displayRange');
    const totalCount = document.getElementById('totalCount');
    
    if (displayRange) {
        displayRange.textContent = `1-${filteredCount}件表示`;
    }
    if (totalCount) {
        totalCount.textContent = filteredCount;
    }
}

// =============================
// 商品選択システム
// =============================

function toggleProductSelection(sku) {
    if (selectedProducts.has(sku)) {
        selectedProducts.delete(sku);
    } else {
        selectedProducts.add(sku);
    }
    
    renderApprovalGrid();
    updateBulkActions();
    
    console.log(`🎯 商品選択切り替え: ${sku}, 選択数: ${selectedProducts.size}`);
}

function selectAllVisible() {
    const filteredProducts = getFilteredProducts();
    filteredProducts.forEach(product => {
        selectedProducts.add(product.sku);
    });
    
    renderApprovalGrid();
    updateBulkActions();
    
    console.log(`✅ 全選択実行: ${selectedProducts.size}件選択`);
}

function deselectAll() {
    selectedProducts.clear();
    renderApprovalGrid();
    updateBulkActions();
    
    console.log('🔄 全選択解除');
}

function clearSelection() {
    deselectAll();
}

function updateSelectionCount() {
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = selectedProducts.size;
    }
}

function updateBulkActions() {
    const bulkActions = document.getElementById('bulkActions');
    const actionButtons = document.querySelectorAll('.action-btn-success, .action-btn-danger, .action-btn-warning');
    
    if (selectedProducts.size > 0) {
        if (bulkActions) bulkActions.classList.add('show');
        actionButtons.forEach(btn => btn.disabled = false);
    } else {
        if (bulkActions) bulkActions.classList.remove('show');
        actionButtons.forEach(btn => btn.disabled = true);
    }
    
    updateSelectionCount();
}

// =============================
// 一括操作
// =============================

function bulkApprove() {
    if (selectedProducts.size === 0) {
        alert('商品を選択してください。');
        return;
    }
    
    const selectedCount = selectedProducts.size;
    
    if (confirm(`選択中の${selectedCount}件の商品を承認しますか？`)) {
        // 承認処理
        selectedProducts.forEach(sku => {
            const product = approvalData.find(p => p.sku === sku);
            if (product) {
                product.ai_status = 'approved';
            }
        });
        
        console.log(`✅ ${selectedCount}件の商品を承認しました`);
        
        // リセットと再描画
        selectedProducts.clear();
        renderApprovalGrid();
        updateFilterCounts();
        updateStatistics();
        updateBulkActions();
        
        // 成功メッセージ
        showNotification(`${selectedCount}件の商品を承認しました。`, 'success');
    }
}

function bulkReject() {
    if (selectedProducts.size === 0) {
        alert('商品を選択してください。');
        return;
    }
    
    const selectedCount = selectedProducts.size;
    
    if (confirm(`選択中の${selectedCount}件の商品を否認しますか？`)) {
        // 否認処理
        selectedProducts.forEach(sku => {
            const product = approvalData.find(p => p.sku === sku);
            if (product) {
                product.ai_status = 'rejected';
            }
        });
        
        console.log(`⚠️ ${selectedCount}件の商品を否認しました`);
        
        // リセットと再描画
        selectedProducts.clear();
        renderApprovalGrid();
        updateFilterCounts();
        updateStatistics();
        updateBulkActions();
        
        // 警告メッセージ
        showNotification(`${selectedCount}件の商品を否認しました。`, 'warning');
    }
}

function bulkHold() {
    if (selectedProducts.size === 0) {
        alert('商品を選択してください。');
        return;
    }
    
    const selectedCount = selectedProducts.size;
    
    if (confirm(`選択中の${selectedCount}件の商品を保留にしますか？`)) {
        selectedProducts.forEach(sku => {
            const product = approvalData.find(p => p.sku === sku);
            if (product) {
                product.ai_status = 'pending';
            }
        });
        
        console.log(`⏸️ ${selectedCount}件の商品を保留にしました`);
        
        selectedProducts.clear();
        renderApprovalGrid();
        updateFilterCounts();
        updateStatistics();
        updateBulkActions();
        
        showNotification(`${selectedCount}件の商品を保留にしました。`, 'info');
    }
}

// =============================
// 通知システム
// =============================

function showNotification(message, type = 'info') {
    // 既存の通知を削除
    const existingNotification = document.querySelector('.notification-toast');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 新しい通知を作成
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                <i class="fas ${getNotificationIcon(type)}"></i>
            </div>
            <div class="notification-message">${message}</div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // スタイルを設定
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        max-width: 400px;
        border-left: 4px solid ${getNotificationColor(type)};
        animation: slideInRight 0.3s ease;
        padding: 1rem;
    `;
    
    const content = notification.querySelector('.notification-content');
    content.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.75rem;
    `;
    
    const icon = notification.querySelector('.notification-icon');
    icon.style.cssText = `
        color: ${getNotificationColor(type)};
        font-size: 1.2rem;
    `;
    
    const messageEl = notification.querySelector('.notification-message');
    messageEl.style.cssText = `
        flex: 1;
        color: #374151;
        font-size: 0.9rem;
    `;
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
    `;
    
    document.body.appendChild(notification);
    
    // 5秒後に自動削除
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#06b6d4'
    };
    return colors[type] || colors.info;
}

// =============================
// タブシステム
// =============================

function initializeTabSystem() {
    // タブボタンのクリックイベントを設定
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) {
                switchTab(tabName);
            }
        });
    });
    
    console.log('🎯 タブシステム初期化完了');
}

function switchTab(targetTab) {
    currentTab = targetTab;
    
    // すべてのタブボタンからactiveクラスを削除
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // すべてのタブコンテンツを非表示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // アクティブなタブボタンとコンテンツを表示
    const activeTabBtn = document.querySelector(`[data-tab="${targetTab}"]`);
    const activeTabContent = document.getElementById(targetTab);
    
    if (activeTabBtn) {
        activeTabBtn.classList.add('active');
    }
    
    if (activeTabContent) {
        activeTabContent.classList.add('active');
    }
    
    // 承認タブの場合は承認システムを初期化
    if (targetTab === 'approval') {
        // 少し遅延してから初期化（DOM更新後）
        setTimeout(() => {
            initializeApprovalSystem();
        }, 100);
    }
    
    console.log(`🔄 タブ切り替え: ${targetTab}`);
}

// =============================
// 検索システム
// =============================

function initializeSearchSystem() {
    const searchInput = document.getElementById('searchQuery');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchDatabase();
            }
        });
    }
    
    console.log('🔍 検索システム初期化完了');
}

function searchDatabase() {
    const searchQuery = document.getElementById('searchQuery')?.value || '';
    const searchResults = document.getElementById('searchResults');
    
    if (!searchResults) {
        console.warn('⚠️ 検索結果表示エリアが見つかりません');
        return;
    }
    
    if (!searchQuery.trim()) {
        searchResults.innerHTML = `
            <div class="notification info">
                <i class="fas fa-info-circle"></i>
                <span>検索キーワードを入力してください。</span>
            </div>
        `;
        return;
    }
    
    // 承認データから検索
    const filteredResults = approvalData.filter(product => 
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filteredResults.length === 0) {
        searchResults.innerHTML = `
            <div class="notification warning">
                <i class="fas fa-exclamation-triangle"></i>
                <span>「${searchQuery}」に一致する商品が見つかりませんでした。</span>
            </div>
        `;
        return;
    }
    
    // 検索結果を表示
    searchResults.innerHTML = `
        <div class="notification success">
            <i class="fas fa-check-circle"></i>
            <span>「${searchQuery}」で${filteredResults.length}件の商品が見つかりました。</span>
        </div>
        <div class="search-results-grid">
            ${filteredResults.map(product => `
                <div class="search-result-card" onclick="highlightProduct('${product.sku}')">
                    <div class="result-image">
                        <img src="${product.image}" alt="${product.title}" onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
                        <div class="data-type-badge">検索結果</div>
                    </div>
                    <div class="result-info">
                        <h5>${product.title}</h5>
                        <div class="result-price">¥${product.price_jpy.toLocaleString()}</div>
                        <div class="result-meta">
                            <span>${product.category}</span>
                            <span>${product.sku}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    console.log(`🔍 検索実行: "${searchQuery}" - ${filteredResults.length}件見つかりました`);
}

function highlightProduct(sku) {
    // 承認タブに切り替え
    switchTab('approval');
    
    // 商品を選択状態にする
    setTimeout(() => {
        selectedProducts.clear();
        selectedProducts.add(sku);
        renderApprovalGrid();
        updateBulkActions();
        
        // 該当商品にスクロール
        const productCard = document.querySelector(`[data-sku="${sku}"]`);
        if (productCard) {
            productCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 一時的にハイライト効果
            productCard.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
            setTimeout(() => {
                productCard.style.boxShadow = '';
            }, 2000);
        }
        
        console.log(`🎯 商品ハイライト: ${sku}`);
    }, 200);
}

// =============================
// その他のユーティリティ関数
// =============================

// CSV出力機能（既存のものを維持）
function exportSelectedProducts() {
    if (selectedProducts.size === 0) {
        alert('出力する商品を選択してください。');
        return;
    }
    
    console.log('📄 CSV出力機能は開発中です');
    showNotification('CSV出力機能は開発中です。', 'info');
}

// グローバル関数として公開
window.switchTab = switchTab;
window.searchDatabase = searchDatabase;
window.applyFilter = applyFilter;
window.selectAllVisible = selectAllVisible;
window.deselectAll = deselectAll;
window.clearSelection = clearSelection;
window.bulkApprove = bulkApprove;
window.bulkReject = bulkReject;
window.bulkHold = bulkHold;
window.toggleProductSelection = toggleProductSelection;
window.exportSelectedProducts = exportSelectedProducts;
window.highlightProduct = highlightProduct;

console.log('🎯 Yahoo Auction Tool統合JavaScript読み込み完了');
