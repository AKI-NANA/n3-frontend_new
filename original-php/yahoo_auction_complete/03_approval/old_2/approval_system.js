// 🎯 承認システム JavaScript統合版 - N3準拠高密度グリッド版

let selectedProducts = new Set();
let currentFilter = 'all';
let approvalData = [];

// サンプル承認データ（8件の高・中リスク商品）
const sampleApprovalData = [
    { sku: 'YAH-001', title: 'Nintendo Switch ゲーム機本体', price_jpy: 35000, risk_level: 'high', ai_status: 'pending', category: 'ゲーム', image: 'https://via.placeholder.com/140x120?text=Switch', condition: 'new' },
    { sku: 'YAH-002', title: 'iPhone 14 Pro Max 256GB', price_jpy: 120000, risk_level: 'high', ai_status: 'rejected', category: 'スマホ', image: 'https://via.placeholder.com/140x120?text=iPhone', condition: 'new' },
    { sku: 'YAH-003', title: 'Canon EOS R5 ミラーレス一眼', price_jpy: 450000, risk_level: 'medium', ai_status: 'approved', category: 'カメラ', image: 'https://via.placeholder.com/140x120?text=Canon+R5', condition: 'new' },
    { sku: 'YAH-004', title: 'Apple Watch Series 8', price_jpy: 45000, risk_level: 'medium', ai_status: 'approved', category: 'ウェアラブル', image: 'https://via.placeholder.com/140x120?text=Watch', condition: 'new' },
    { sku: 'YAH-005', title: 'MacBook Pro 13インチ M2', price_jpy: 180000, risk_level: 'medium', ai_status: 'approved', category: 'PC', image: 'https://via.placeholder.com/140x120?text=MacBook', condition: 'new' },
    { sku: 'YAH-006', title: 'DJI Mini 3 Pro ドローン', price_jpy: 110000, risk_level: 'medium', ai_status: 'approved', category: 'ドローン', image: 'https://via.placeholder.com/140x120?text=DJI', condition: 'new' },
    { sku: 'YAH-007', title: 'Sony α7 IV ミラーレス', price_jpy: 320000, risk_level: 'medium', ai_status: 'approved', category: 'カメラ', image: 'https://via.placeholder.com/140x120?text=Sony+a7', condition: 'new' },
    { sku: 'YAH-008', title: 'シャネル 香水 No.5', price_jpy: 15000, risk_level: 'high', ai_status: 'rejected', category: 'コスメ', image: 'https://via.placeholder.com/140x120?text=Chanel', condition: 'new' }
];

// 承認システム初期化
function initializeApprovalSystem() {
    approvalData = sampleApprovalData;
    renderApprovalGrid();
    updateFilterCounts();
    setupFilterButtons();
    console.log('✅ 承認システム初期化完了 - 8件のサンプルデータ読み込み');
}

// 承認グリッド描画
function renderApprovalGrid() {
    const grid = document.getElementById('productGrid');
    if (!grid) {
        console.error('❌ productGrid要素が見つかりません');
        return;
    }
    
    const filteredProducts = getFilteredProducts();
    
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
                        <span class="product-condition condition-${product.condition}">${product.condition === 'new' ? '新品' : '中古'}</span>
                        <span class="product-sku">${product.sku}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    updateSelectionCount();
}

// リスクバッジ生成
function getRiskBadge(riskLevel) {
    const badges = {
        high: '<span class="badge badge-risk-high">高リスク</span>',
        medium: '<span class="badge badge-risk-medium">中リスク</span>',
        low: ''
    };
    return badges[riskLevel] || '';
}

// AIステータスバッジ生成
function getAIBadge(aiStatus) {
    const badges = {
        approved: '<span class="badge badge-ai-approved">AI承認</span>',
        rejected: '<span class="badge badge-ai-rejected">AI却下</span>',
        pending: '<span class="badge badge-ai-pending">AI判定中</span>'
    };
    return badges[aiStatus] || '';
}

// フィルター適用済み商品取得
function getFilteredProducts() {
    if (currentFilter === 'all') {
        return approvalData;
    }
    
    const filters = {
        'ai-approved': product => product.ai_status === 'approved',
        'ai-rejected': product => product.ai_status === 'rejected', 
        'ai-pending': product => product.ai_status === 'pending',
        'high-risk': product => product.risk_level === 'high',
        'medium-risk': product => product.risk_level === 'medium'
    };
    
    return approvalData.filter(filters[currentFilter] || (() => true));
}

// 商品選択切り替え
function toggleProductSelection(sku) {
    if (selectedProducts.has(sku)) {
        selectedProducts.delete(sku);
    } else {
        selectedProducts.add(sku);
    }
    
    renderApprovalGrid();
    updateBulkActions();
}

// 全選択
function selectAllVisible() {
    const filteredProducts = getFilteredProducts();
    filteredProducts.forEach(product => {
        selectedProducts.add(product.sku);
    });
    renderApprovalGrid();
    updateBulkActions();
}

// 全解除
function deselectAll() {
    selectedProducts.clear();
    renderApprovalGrid();
    updateBulkActions();
}

// 選択クリア
function clearSelection() {
    deselectAll();
}

// 選択数更新
function updateSelectionCount() {
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = selectedProducts.size;
    }
}

// 一括操作バー表示制御
function updateBulkActions() {
    const bulkActions = document.getElementById('bulkActions');
    if (bulkActions) {
        if (selectedProducts.size > 0) {
            bulkActions.classList.add('show');
        } else {
            bulkActions.classList.remove('show');
        }
    }
}

// フィルターボタン設定
function setupFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // アクティブ状態切り替え
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // フィルター適用
            currentFilter = btn.getAttribute('data-filter');
            renderApprovalGrid();
            console.log(`フィルター適用: ${currentFilter}`);
        });
    });
}

// フィルター件数更新
function updateFilterCounts() {
    const counts = {
        all: approvalData.length,
        'ai-approved': approvalData.filter(p => p.ai_status === 'approved').length,
        'ai-rejected': approvalData.filter(p => p.ai_status === 'rejected').length,
        'ai-pending': approvalData.filter(p => p.ai_status === 'pending').length,
        'high-risk': approvalData.filter(p => p.risk_level === 'high').length,
        'medium-risk': approvalData.filter(p => p.risk_level === 'medium').length
    };
    
    Object.entries(counts).forEach(([filter, count]) => {
        const btn = document.querySelector(`[data-filter="${filter}"]`);
        if (btn) {
            const span = btn.querySelector('span');
            if (span) span.textContent = count;
        }
    });
    
    // 統計値更新
    const totalCountElement = document.getElementById('totalProductCount');
    const pendingCountElement = document.getElementById('pendingCount');
    const highRiskCountElement = document.getElementById('highRiskCount');
    const mediumRiskCountElement = document.getElementById('mediumRiskCount');
    
    if (totalCountElement) totalCountElement.textContent = counts.all;
    if (pendingCountElement) pendingCountElement.textContent = counts.all;
    if (highRiskCountElement) highRiskCountElement.textContent = counts['high-risk'];
    if (mediumRiskCountElement) mediumRiskCountElement.textContent = counts['medium-risk'];
}

// 一括承認
function bulkApprove() {
    if (selectedProducts.size === 0) {
        alert('商品を選択してください。');
        return;
    }
    
    if (confirm(`選択中の${selectedProducts.size}件の商品を承認しますか？`)) {
        console.log('一括承認実行:', Array.from(selectedProducts));
        
        // 承認処理（実際のAPI コール）
        selectedProducts.forEach(sku => {
            const product = approvalData.find(p => p.sku === sku);
            if (product) {
                product.ai_status = 'approved';
            }
        });
        
        console.log(`✅ ${selectedProducts.size}件の商品を承認しました`);
        selectedProducts.clear();
        renderApprovalGrid();
        updateFilterCounts();
        updateBulkActions();
    }
}

// 一括否認
function bulkReject() {
    if (selectedProducts.size === 0) {
        alert('商品を選択してください。');
        return;
    }
    
    if (confirm(`選択中の${selectedProducts.size}件の商品を否認しますか？`)) {
        console.log('一括否認実行:', Array.from(selectedProducts));
        
        // 否認処理（実際のAPI コール）
        selectedProducts.forEach(sku => {
            const product = approvalData.find(p => p.sku === sku);
            if (product) {
                product.ai_status = 'rejected';
            }
        });
        
        console.log(`⚠️ ${selectedProducts.size}件の商品を否認しました`);
        selectedProducts.clear();
        renderApprovalGrid();
        updateFilterCounts();
        updateBulkActions();
    }
}

// グローバル登録（他のスクリプトからアクセス可能）
window.initializeApprovalSystem = initializeApprovalSystem;
window.selectAllVisible = selectAllVisible;
window.deselectAll = deselectAll;
window.clearSelection = clearSelection;
window.bulkApprove = bulkApprove;
window.bulkReject = bulkReject;

console.log('🎯 承認システムJavaScript読み込み完了');
