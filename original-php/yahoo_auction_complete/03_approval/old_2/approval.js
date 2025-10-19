/**
 * Yahoo Auction Tool - 商品承認システム JavaScript
 * 機能: 承認待ち商品の表示・フィルタリング・一括操作
 */

// グローバル変数
let currentProducts = [];
let selectedProducts = new Set();
let currentFilter = 'all';

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('商品承認システム初期化開始');
    loadApprovalData();
    setupEventListeners();
});

// イベントリスナー設定
function setupEventListeners() {
    // フィルターボタンのイベント
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            applyFilter(filter);
        });
    });
    
    // 選択状態変更の監視
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('product-checkbox')) {
            updateSelectionState();
        }
    });
}

// 承認データ読み込み
function loadApprovalData() {
    console.log('承認データ読み込み開始');
    
    showLoadingState();
    
    fetch('approval.php?action=get_approval_queue')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data) {
                currentProducts = data.data.data || [];
                displayApprovalProducts(currentProducts);
                updateStatistics(data.data);
                showProductsContainer();
            } else {
                showNoDataState();
            }
        })
        .catch(error => {
            console.error('承認データ読み込みエラー:', error);
            showErrorState(error.message);
        });
}

// ローディング状態表示
function showLoadingState() {
    document.getElementById('loadingContainer').style.display = 'flex';
    document.getElementById('noDataContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'none';
    document.getElementById('productsContainer').style.display = 'none';
}

// 商品コンテナ表示
function showProductsContainer() {
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('noDataContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'none';
    document.getElementById('productsContainer').style.display = 'block';
}

// データなし状態表示
function showNoDataState() {
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('noDataContainer').style.display = 'flex';
    document.getElementById('errorContainer').style.display = 'none';
    document.getElementById('productsContainer').style.display = 'none';
}

// エラー状態表示
function showErrorState(message) {
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('noDataContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'flex';
    document.getElementById('productsContainer').style.display = 'none';
    
    const errorMessageEl = document.getElementById('errorMessage');
    if (errorMessageEl) {
        errorMessageEl.textContent = message;
    }
}

// 承認商品表示
function displayApprovalProducts(products) {
    const container = document.getElementById('productsContainer');
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p class="no-products">表示する商品がありません</p>';
        return;
    }
    
    const html = products.map(product => createProductCard(product)).join('');
    container.innerHTML = html;
}

// 商品カード生成
function createProductCard(product) {
    const itemId = product.item_id || product.id || 'unknown';
    const title = product.title || product.item_title || '商品名なし';
    const price = product.current_price || product.price || '0.00';
    const imageUrl = product.picture_url || product.gallery_url || 'https://via.placeholder.com/150x150?text=No+Image';
    const condition = product.condition_name || 'Unknown';
    const category = product.category_name || 'Uncategorized';
    const aiStatus = product.ai_status || 'ai-pending';
    const riskLevel = product.risk_level || 'medium-risk';
    
    return `
        <div class="product-card" data-product-id="${itemId}" data-ai-status="${aiStatus}" data-risk-level="${riskLevel}">
            <div class="product-header">
                <input type="checkbox" class="product-checkbox" value="${itemId}" id="product-${itemId}">
                <label for="product-${itemId}" class="product-select-label">選択</label>
                <div class="product-badges">
                    <span class="badge badge-${aiStatus}">${getAIStatusText(aiStatus)}</span>
                    <span class="badge badge-${riskLevel}">${getRiskLevelText(riskLevel)}</span>
                </div>
            </div>
            
            <div class="product-image">
                <img src="${imageUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/150x150?text=No+Image'">
            </div>
            
            <div class="product-info">
                <h4 class="product-title" title="${title}">${title}</h4>
                <div class="product-details">
                    <div class="product-price">$${price}</div>
                    <div class="product-condition">${condition}</div>
                    <div class="product-category">${category}</div>
                </div>
            </div>
            
            <div class="product-actions">
                <button class="btn btn-success btn-sm" onclick="approveProduct('${itemId}')">
                    <i class="fas fa-check"></i> 承認
                </button>
                <button class="btn btn-danger btn-sm" onclick="rejectProduct('${itemId}')">
                    <i class="fas fa-times"></i> 否認
                </button>
                <button class="btn btn-info btn-sm" onclick="viewProductDetail('${itemId}')">
                    <i class="fas fa-eye"></i> 詳細
                </button>
            </div>
        </div>
    `;
}

// AI判定ステータステキスト取得
function getAIStatusText(status) {
    const statusMap = {
        'ai-approved': 'AI承認',
        'ai-rejected': 'AI否認',
        'ai-pending': 'AI判定待ち'
    };
    return statusMap[status] || 'Unknown';
}

// リスクレベルテキスト取得
function getRiskLevelText(level) {
    const levelMap = {
        'high-risk': '高リスク',
        'medium-risk': '中リスク',
        'low-risk': '低リスク'
    };
    return levelMap[level] || 'Unknown';
}

// フィルター適用
function applyFilter(filterType) {
    currentFilter = filterType;
    
    // フィルターボタンの状態更新
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filterType}"]`).classList.add('active');
    
    // 商品の表示/非表示切り替え
    const products = document.querySelectorAll('.product-card');
    let visibleCount = 0;
    
    products.forEach(product => {
        const shouldShow = shouldShowProduct(product, filterType);
        product.style.display = shouldShow ? 'block' : 'none';
        if (shouldShow) visibleCount++;
    });
    
    console.log(`フィルター "${filterType}" 適用: ${visibleCount}件表示`);
}

// 商品表示判定
function shouldShowProduct(productElement, filterType) {
    if (filterType === 'all') return true;
    
    const aiStatus = productElement.dataset.aiStatus;
    const riskLevel = productElement.dataset.riskLevel;
    
    switch (filterType) {
        case 'ai-approved':
        case 'ai-rejected':
        case 'ai-pending':
            return aiStatus === filterType;
        case 'high-risk':
        case 'medium-risk':
        case 'low-risk':
            return riskLevel === filterType;
        default:
            return true;
    }
}

// 統計更新
function updateStatistics(data) {
    const stats = data.stats || {};
    
    document.getElementById('pendingCount').textContent = stats.pending || 0;
    document.getElementById('highRiskCount').textContent = stats.high_risk || 0;
    document.getElementById('mediumRiskCount').textContent = stats.medium_risk || 0;
    document.getElementById('totalRegistered').textContent = stats.total || 0;
    document.getElementById('totalProductCount').textContent = stats.pending || 0;
    
    // フィルターカウント更新
    document.getElementById('filterAllCount').textContent = stats.total || 0;
    document.getElementById('filterApprovedCount').textContent = stats.ai_approved || 0;
    document.getElementById('filterRejectedCount').textContent = stats.ai_rejected || 0;
    document.getElementById('filterPendingCount').textContent = stats.ai_pending || 0;
    document.getElementById('filterHighRiskCount').textContent = stats.high_risk || 0;
    document.getElementById('filterMediumRiskCount').textContent = stats.medium_risk || 0;
    document.getElementById('filterLowRiskCount').textContent = stats.low_risk || 0;
}

// 選択状態更新
function updateSelectionState() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    const selectedCount = checkboxes.length;
    
    selectedProducts.clear();
    checkboxes.forEach(cb => selectedProducts.add(cb.value));
    
    document.getElementById('selectedCount').textContent = selectedCount;
    
    const bulkActions = document.getElementById('bulkActions');
    const actionButtons = document.querySelectorAll('.main-actions .btn:not(.btn-info)');
    
    if (selectedCount > 0) {
        bulkActions.style.display = 'flex';
        actionButtons.forEach(btn => btn.disabled = false);
    } else {
        bulkActions.style.display = 'none';
        actionButtons.forEach(btn => btn.disabled = true);
    }
}

// 全選択
function selectAllVisible() {
    const visibleCheckboxes = document.querySelectorAll('.product-card:not([style*="display: none"]) .product-checkbox');
    visibleCheckboxes.forEach(cb => cb.checked = true);
    updateSelectionState();
}

// 全解除
function deselectAll() {
    document.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = false);
    updateSelectionState();
}

// 選択クリア
function clearSelection() {
    deselectAll();
}

// 個別商品承認
function approveProduct(productId) {
    if (!confirm('この商品を承認しますか？')) return;
    
    bulkApproveProducts([productId]);
}

// 個別商品否認
function rejectProduct(productId) {
    const reason = prompt('否認理由を入力してください（任意）:', '');
    if (reason === null) return; // キャンセル
    
    bulkRejectProducts([productId], reason);
}

// 一括承認
function bulkApprove() {
    if (selectedProducts.size === 0) {
        alert('承認する商品を選択してください。');
        return;
    }
    
    if (!confirm(`選択した${selectedProducts.size}件の商品を承認しますか？`)) return;
    
    bulkApproveProducts(Array.from(selectedProducts));
}

// 一括否認
function bulkReject() {
    if (selectedProducts.size === 0) {
        alert('否認する商品を選択してください。');
        return;
    }
    
    const reason = prompt('否認理由を入力してください（任意）:', '');
    if (reason === null) return; // キャンセル
    
    if (!confirm(`選択した${selectedProducts.size}件の商品を否認しますか？`)) return;
    
    bulkRejectProducts(Array.from(selectedProducts), reason);
}

// 一括承認実行
function bulkApproveProducts(productIds) {
    fetch('approval.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'bulk_approve',
            product_ids: productIds
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`✅ ${productIds.length}件の商品を承認しました`);
            loadApprovalData(); // データ再読み込み
            clearSelection();
        } else {
            alert(`❌ 承認に失敗しました: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('承認エラー:', error);
        alert('承認処理中にエラーが発生しました。');
    });
}

// 一括否認実行
function bulkRejectProducts(productIds, reason) {
    fetch('approval.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'bulk_reject',
            product_ids: productIds,
            reason: reason || '手動否認'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`✅ ${productIds.length}件の商品を否認しました`);
            loadApprovalData(); // データ再読み込み
            clearSelection();
        } else {
            alert(`❌ 否認に失敗しました: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('否認エラー:', error);
        alert('否認処理中にエラーが発生しました。');
    });
}

// 商品詳細表示
function viewProductDetail(productId) {
    // 詳細モーダルまたは詳細ページに遷移
    alert(`商品詳細表示: ${productId}\n（詳細機能は実装予定）`);
}

// 選択商品CSV出力
function exportSelectedProducts() {
    if (selectedProducts.size === 0) {
        alert('出力する商品を選択してください。');
        return;
    }
    
    // CSV出力処理（簡易実装）
    const csvData = Array.from(selectedProducts).map(productId => {
        const product = currentProducts.find(p => (p.item_id || p.id) === productId);
        if (!product) return '';
        
        return [
            product.item_id || product.id,
            product.title || '',
            product.current_price || '',
            product.condition_name || '',
            product.category_name || '',
            product.ai_status || '',
            product.risk_level || ''
        ].join(',');
    }).filter(row => row).join('\n');
    
    const blob = new Blob(['\uFEFF' + 'ID,Title,Price,Condition,Category,AI_Status,Risk_Level\n' + csvData], 
                         { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `approval_products_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// 新規商品登録モーダル
function openNewProductModal() {
    alert('新規商品登録機能は実装予定です。');
}

// データベース接続確認
function checkDatabaseConnection() {
    fetch('approval.php?action=test_connection')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('✅ データベース接続正常');
                loadApprovalData();
            } else {
                alert('❌ データベース接続エラー: ' + data.message);
            }
        })
        .catch(error => {
            alert('❌ 接続テストエラー: ' + error.message);
        });
}

console.log('商品承認システム JavaScript 読み込み完了');