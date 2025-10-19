/**
 * 多モールデータビューアー - JavaScript統合版（エラー解決版）
 * HTML分離による Syntax Error 完全解決
 */

// ===== グローバル設定 =====
let allProducts = [];
let filteredProducts = [];

// ===== データ取得関数（統合版） =====
async function loadMultiPlatformData(source = 'ebay') {
    showAdvancedLoader('データを取得中...');
    
    try {
        // 実際のデータファイル取得
        const response = await fetch(`data.json?source=${source}&timestamp=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data && data.success) {
            allProducts = data.products || [];
            filteredProducts = [...allProducts];
            
            displayPlatformResults(data);
            hideAdvancedLoader();
            showSuccessNotification(`✅ ${allProducts.length}件のデータを取得しました`);
            
        } else {
            throw new Error(data.message || 'データ形式が不正です');
        }
        
    } catch (error) {
        console.error('データ取得エラー:', error);
        hideAdvancedLoader();
        showErrorNotification(`データ取得エラー: ${error.message}`);
        
        // フォールバック処理
        loadFallbackSampleData();
    }
}

// ===== フォールバックデータ（サンプル） =====
function loadFallbackSampleData() {
    console.log('📦 フォールバックサンプルデータを読み込み中...');
    
    const sampleData = {
        success: true,
        message: 'サンプルデータ（フォールバック）',
        products: [
            {
                title: 'Japanese Vintage Camera - Nikon F2 with 50mm Lens',
                asin: 'SAMPLE-CAM-001',
                status: 'Active',
                stock: 1,
                price: 299.99,
                category: 'Cameras',
                condition: 'Used - Excellent'
            },
            {
                title: 'Traditional Japanese Ceramic Tea Set - Blue and White',
                asin: 'SAMPLE-TEA-002',
                status: 'Active', 
                stock: 3,
                price: 89.99,
                category: 'Home & Kitchen',
                condition: 'New'
            },
            {
                title: 'Authentic Japanese Katana - Decorative Samurai Sword',
                asin: 'SAMPLE-SWD-003',
                status: 'Ended',
                stock: 0,
                price: 199.99,
                category: 'Collectibles',
                condition: 'New'
            },
            {
                title: 'Pokemon Cards - Japanese Edition Booster Pack',
                asin: 'SAMPLE-PKM-004',
                status: 'Active',
                stock: 12,
                price: 45.00,
                category: 'Trading Cards',
                condition: 'New'
            },
            {
                title: 'Japanese Woodblock Print - Hokusai Wave Reproduction',
                asin: 'SAMPLE-ART-005',
                status: 'Sold',
                stock: 2,
                price: 75.00,
                category: 'Art',
                condition: 'New'
            }
        ]
    };
    
    allProducts = sampleData.products;
    filteredProducts = [...allProducts];
    displayPlatformResults(sampleData);
    
    showWarningNotification('⚠️ サンプルデータを表示中（元データ取得に失敗）');
}

// ===== 結果表示（統合版） =====
function displayPlatformResults(data) {
    const currentView = window.CURRENT_VIEW || 'excel';
    
    console.log(`📊 ${currentView}ビューでデータ表示開始:`, data.products.length, '件');
    
    if (currentView === 'excel') {
        displayEnhancedExcelView(data.products);
    } else if (currentView === 'card') {
        displayEnhancedCardView(data.products);
    }
    
    // JSON出力（デバッグ用）
    updateJsonOutput(data);
}

// ===== 強化Excelビュー =====
function displayEnhancedExcelView(products) {
    const tbody = document.getElementById('excel-tbody');
    if (!tbody) {
        console.error('❌ Excel tbody要素が見つかりません');
        return;
    }
    
    tbody.innerHTML = '';
    
    products.forEach((product, index) => {
        const row = document.createElement('tr');
        row.className = 'product-row';
        
        row.innerHTML = `
            <td class="checkbox-cell">
                <input type="checkbox" class="item-checkbox" data-index="${index}">
            </td>
            <td class="image-cell">
                <img src="https://via.placeholder.com/60" 
                     alt="${escapeHtml(product.title)}" 
                     class="product-thumbnail"
                     onerror="this.src='https://via.placeholder.com/60/cccccc/666666?text=No+Image'"
                     loading="lazy">
            </td>
            <td class="title-cell">
                <div class="product-title-main">${escapeHtml(product.title)}</div>
                ${product.category ? `<div class="product-category">${escapeHtml(product.category)}</div>` : ''}
            </td>
            <td class="id-cell">
                <span class="product-id">${escapeHtml(product.asin)}</span>
            </td>
            <td class="status-cell">
                <span class="status-badge ${getStatusBadgeClass(product.status)}">
                    ${escapeHtml(product.status)}
                </span>
            </td>
            <td class="stock-cell">
                <input type="number" 
                       value="${product.stock}" 
                       class="stock-input" 
                       min="0"
                       onchange="updateStockQuantity(${index}, this.value)"
                       ${product.status === 'Ended' ? 'disabled' : ''}>
            </td>
            <td class="price-cell">
                <div class="price-display">$${product.price.toFixed(2)}</div>
                ${product.condition ? `<div class="condition-text">${escapeHtml(product.condition)}</div>` : ''}
            </td>
            <td class="date-cell">
                <span class="date-display">${formatDateDisplay(new Date())}</span>
            </td>
            <td class="action-cell">
                <div class="action-buttons">
                    <button class="action-btn action-btn--edit" 
                            onclick="openProductEditor(${index})"
                            title="商品を編集">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn action-btn--info" 
                            onclick="showProductDetails(${index})"
                            title="詳細を表示">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`✅ Excelビュー表示完了: ${products.length}行`);
}

// ===== 強化カードビュー =====
function displayEnhancedCardView(products) {
    const container = document.getElementById('card-container');
    if (!container) {
        console.error('❌ Card container要素が見つかりません');
        return;
    }
    
    container.innerHTML = '';
    
    products.forEach((product, index) => {
        const card = document.createElement('div');
        card.className = 'product-card enhanced-card';
        
        card.innerHTML = `
            <div class="card-image-container">
                <img src="https://via.placeholder.com/250x200" 
                     alt="${escapeHtml(product.title)}"
                     class="card-image"
                     onerror="this.src='https://via.placeholder.com/250x200/cccccc/666666?text=No+Image'"
                     loading="lazy">
                <div class="card-badge">
                    <span class="status-badge ${getStatusBadgeClass(product.status)}">
                        ${escapeHtml(product.status)}
                    </span>
                </div>
            </div>
            <div class="card-content">
                <div class="card-header">
                    <h3 class="card-title">${escapeHtml(product.title)}</h3>
                    ${product.category ? `<span class="card-category">${escapeHtml(product.category)}</span>` : ''}
                </div>
                <div class="card-details">
                    <div class="card-detail-row">
                        <span class="detail-label">ID:</span>
                        <span class="detail-value">${escapeHtml(product.asin)}</span>
                    </div>
                    <div class="card-detail-row">
                        <span class="detail-label">価格:</span>
                        <span class="detail-value price-highlight">$${product.price.toFixed(2)}</span>
                    </div>
                    <div class="card-detail-row">
                        <span class="detail-label">在庫:</span>
                        <span class="detail-value stock-display ${product.stock === 0 ? 'stock-zero' : ''}">${product.stock}</span>
                    </div>
                    ${product.condition ? `
                    <div class="card-detail-row">
                        <span class="detail-label">状態:</span>
                        <span class="detail-value">${escapeHtml(product.condition)}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="card-actions">
                    <button class="card-btn card-btn--primary" onclick="openProductEditor(${index})">
                        <i class="fas fa-edit"></i> 編集
                    </button>
                    <button class="card-btn card-btn--secondary" onclick="showProductDetails(${index})">
                        <i class="fas fa-info-circle"></i> 詳細
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    console.log(`✅ カードビュー表示完了: ${products.length}枚`);
}

// ===== 商品操作関数 =====
function openProductEditor(index) {
    const product = allProducts[index];
    if (!product) {
        showErrorNotification('商品データが見つかりません');
        return;
    }
    
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = `
        <div class="product-editor-form">
            <div class="editor-header">
                <h4>商品編集</h4>
                <p class="editor-subtitle">${escapeHtml(product.title)}</p>
            </div>
            
            <div class="editor-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">商品ID</label>
                        <input type="text" value="${escapeHtml(product.asin)}" readonly class="form-input readonly">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">商品名</label>
                        <input type="text" value="${escapeHtml(product.title)}" id="edit-title-${index}" class="form-input">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">価格 (USD)</label>
                        <input type="number" value="${product.price}" step="0.01" id="edit-price-${index}" class="form-input">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">在庫数</label>
                        <input type="number" value="${product.stock}" min="0" id="edit-stock-${index}" class="form-input">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">ステータス</label>
                        <select id="edit-status-${index}" class="form-input">
                            <option value="Active" ${product.status === 'Active' ? 'selected' : ''}>Active</option>
                            <option value="Ended" ${product.status === 'Ended' ? 'selected' : ''}>Ended</option>
                            <option value="Sold" ${product.status === 'Sold' ? 'selected' : ''}>Sold</option>
                            <option value="Inactive" ${product.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                    
                    ${product.category ? `
                    <div class="form-group">
                        <label class="form-label">カテゴリ</label>
                        <input type="text" value="${escapeHtml(product.category)}" id="edit-category-${index}" class="form-input">
                    </div>
                    ` : ''}
                </div>
                
                <div class="editor-actions">
                    <button class="btn btn--success" onclick="saveProductChanges(${index})">
                        <i class="fas fa-save"></i> 変更を保存
                    </button>
                    <button class="btn btn--warning" onclick="resetProductForm(${index})">
                        <i class="fas fa-undo"></i> リセット
                    </button>
                </div>
            </div>
        </div>
    `;
    
    openModal();
}

function showProductDetails(index) {
    const product = allProducts[index];
    if (!product) {
        showErrorNotification('商品データが見つかりません');
        return;
    }
    
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = `
        <div class="product-details-display">
            <div class="details-header">
                <h4>商品詳細情報</h4>
            </div>
            
            <div class="details-grid">
                <div class="detail-section">
                    <h5>基本情報</h5>
                    <div class="detail-item">
                        <span class="detail-key">商品名:</span>
                        <span class="detail-value">${escapeHtml(product.title)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-key">ID:</span>
                        <span class="detail-value">${escapeHtml(product.asin)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-key">価格:</span>
                        <span class="detail-value">$${product.price.toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-key">在庫:</span>
                        <span class="detail-value">${product.stock}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-key">ステータス:</span>
                        <span class="detail-value status-badge ${getStatusBadgeClass(product.status)}">${escapeHtml(product.status)}</span>
                    </div>
                </div>
                
                ${product.category || product.condition ? `
                <div class="detail-section">
                    <h5>追加情報</h5>
                    ${product.category ? `
                    <div class="detail-item">
                        <span class="detail-key">カテゴリ:</span>
                        <span class="detail-value">${escapeHtml(product.category)}</span>
                    </div>
                    ` : ''}
                    ${product.condition ? `
                    <div class="detail-item">
                        <span class="detail-key">状態:</span>
                        <span class="detail-value">${escapeHtml(product.condition)}</span>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    openModal();
}

function updateStockQuantity(index, newValue) {
    const numValue = parseInt(newValue) || 0;
    
    if (numValue < 0) {
        showErrorNotification('在庫数は0以上で入力してください');
        return;
    }
    
    if (allProducts[index]) {
        const oldValue = allProducts[index].stock;
        allProducts[index].stock = numValue;
        
        console.log(`📦 在庫更新: Index ${index}, ${oldValue} → ${numValue}`);
        showSuccessNotification(`在庫を ${numValue} に更新しました`);
    }
}

function saveProductChanges(index) {
    // 実装予定: 実際の保存処理
    showSuccessNotification('変更保存機能は実装予定です');
    closeModal();
}

function resetProductForm(index) {
    // フォームリセット処理
    showInfoNotification('フォームをリセットしました');
}

// ===== ユーティリティ関数 =====
function escapeHtml(text) {
    if (typeof text !== 'string') return String(text);
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getStatusBadgeClass(status) {
    const statusClasses = {
        'Active': 'status-badge--active',
        'Ended': 'status-badge--ended',
        'Sold': 'status-badge--sold',
        'Inactive': 'status-badge--inactive'
    };
    return statusClasses[status] || 'status-badge--unknown';
}

function formatDateDisplay(date) {
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// ===== UI制御関数 =====
function switchViewMode(newView) {
    if (newView === window.CURRENT_VIEW) return;
    
    const url = new URL(window.location);
    url.searchParams.set('view', newView);
    window.location.href = url.toString();
}

function refreshDataDisplay() {
    const refreshButton = document.getElementById('refresh-btn');
    if (refreshButton) {
        const originalText = refreshButton.innerHTML;
        refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 更新中';
        refreshButton.disabled = true;
        
        setTimeout(() => {
            loadMultiPlatformData(window.CURRENT_SOURCE || 'ebay');
            refreshButton.innerHTML = originalText;
            refreshButton.disabled = false;
        }, 1000);
    } else {
        loadMultiPlatformData(window.CURRENT_SOURCE || 'ebay');
    }
}

function exportDataToJson() {
    if (allProducts.length === 0) {
        showWarningNotification('エクスポートするデータがありません');
        return;
    }
    
    const exportData = {
        export_date: new Date().toISOString(),
        source: window.CURRENT_SOURCE || 'ebay',
        view_mode: window.CURRENT_VIEW || 'excel',
        total_products: allProducts.length,
        products: allProducts
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${window.CURRENT_SOURCE || 'platform'}_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showSuccessNotification(`${allProducts.length}件のデータをエクスポートしました`);
}

// ===== モーダル制御 =====
function openModal() {
    const modal = document.getElementById('data-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('data-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function refreshModalData() {
    showInfoNotification('モーダルデータ更新機能は実装予定です');
}

// ===== 通知システム =====
function showSuccessNotification(message) {
    showNotification(message, 'success', 5000);
}

function showErrorNotification(message) {
    showNotification(message, 'error', 10000);
}

function showWarningNotification(message) {
    showNotification(message, 'warning', 7000);
}

function showInfoNotification(message) {
    showNotification(message, 'info', 5000);
}

function showNotification(message, type = 'info', duration = 5000) {
    const notificationContainer = getNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    
    const icon = getNotificationIcon(type);
    notification.innerHTML = `
        <div class="notification-content">
            <i class="${icon}"></i>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    notificationContainer.appendChild(notification);
    
    // 自動削除
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
}

function getNotificationContainer() {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    return container;
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-triangle',
        warning: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
}

// ===== ローディング制御 =====
function showAdvancedLoader(message = 'データ処理中...') {
    const loader = document.getElementById('advanced-loader');
    const messageEl = document.getElementById('loading-message');
    
    if (loader && messageEl) {
        messageEl.textContent = message;
        loader.style.display = 'flex';
    }
}

function hideAdvancedLoader() {
    const loader = document.getElementById('advanced-loader');
    if (loader) {
        loader.style.display = 'none';
    }
}

// ===== JSON出力更新 =====
function updateJsonOutput(data) {
    const jsonElement = document.getElementById('json-output');
    if (jsonElement) {
        jsonElement.textContent = JSON.stringify(data, null, 2);
    }
}

// ===== 初期化とイベントリスナー =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 多モールデータビューアー - JavaScript統合版 初期化開始');
    
    // 設定確認
    console.log('Current View:', window.CURRENT_VIEW);
    console.log('Current Source:', window.CURRENT_SOURCE);
    
    // 初期データ読み込み
    loadMultiPlatformData(window.CURRENT_SOURCE || 'ebay');
    
    // モーダル外クリックイベント
    const modal = document.getElementById('data-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
    
    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
    
    // チェックボックス全選択
    const masterCheckbox = document.getElementById('master-checkbox');
    if (masterCheckbox) {
        masterCheckbox.addEventListener('change', function() {
            const itemCheckboxes = document.querySelectorAll('.item-checkbox');
            itemCheckboxes.forEach(cb => cb.checked = this.checked);
        });
    }
    
    console.log('✅ 多モールデータビューアー - JavaScript統合版 初期化完了');
});

// ===== グローバル関数（後方互換性） =====
window.editProduct = openProductEditor;
window.updateQuantityDirect = updateStockQuantity;
window.refreshData = refreshDataDisplay;
window.exportData = exportDataToJson;
window.switchView = switchViewMode;