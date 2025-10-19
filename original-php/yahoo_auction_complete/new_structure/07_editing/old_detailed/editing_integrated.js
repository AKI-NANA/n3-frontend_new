/**
 * 商品編集システム JavaScript (直接パスアクセス用・統合版)
 */

// グローバル変数
let allData = [];
let selectedItems = [];
let currentPage = 1;
let currentLimit = 20;
let isLoading = false;

// ログ表示関数
function logMessage(message, type = 'info') {
    const logContainer = document.getElementById('logContainer');
    if (!logContainer) return;
    
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // 50行を超えたら古いログを削除
    const entries = logContainer.children;
    if (entries.length > 50) {
        logContainer.removeChild(entries[0]);
    }
    
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// 未出品データ読み込み
async function loadEditingData() {
    if (isLoading) return;
    
    isLoading = true;
    logMessage('未出品データの読み込みを開始します...');
    
    try {
        const response = await fetch('editing.php?action=get_scraped_products&page=1&limit=50');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            allData = result.data.data || [];
            logMessage(`データ読み込み完了: ${allData.length}件`, 'success');
            renderEditingTable();
        } else {
            throw new Error(result.message || '不明なエラー');
        }
    } catch (error) {
        logMessage(`データ読み込みエラー: ${error.message}`, 'error');
        console.error('データ読み込みエラー:', error);
    } finally {
        isLoading = false;
    }
}

// 全データ読み込み
async function loadAllData() {
    if (isLoading) return;
    
    isLoading = true;
    logMessage('全データ（出品済み含む）を読み込み中...');
    
    try {
        logMessage('データ読み込み中...');
        const response = await fetch('editing.php?action=get_all_products&page=1&limit=50');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            allData = result.data.data || [];
            logMessage(`全データ読み込み完了: ${allData.length}件（出品済み含む）`, 'success');
            renderEditingTable();
        } else {
            throw new Error(result.message || '不明なエラー');
        }
    } catch (error) {
        logMessage(`データ読み込みエラー: ${error.message}`, 'error');
        console.error('データ読み込みエラー:', error);
    } finally {
        isLoading = false;
    }
}

// データ表示をレンダリング
function renderEditingTable() {
    const tbody = document.getElementById('editingTableBody');
    
    if (!allData || allData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: var(--space-4);">
                    <i class="fas fa-exclamation-triangle" style="margin-right: var(--space-2); color: var(--warning-accent);"></i>
                    表示するデータがありません
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = allData.map(item => {
        const isSelected = selectedItems.includes(item.id || item.item_id);
        const sourceClass = getSourceClass(item.platform || 'unknown');
        
        return `
            <tr data-product-id="${item.id || item.item_id}" ${isSelected ? 'class="selected"' : ''}>
                <td>
                    <input type="checkbox" 
                           value="${item.id || item.item_id}" 
                           ${isSelected ? 'checked' : ''}
                           onchange="toggleSelection('${item.id || item.item_id}')">
                </td>
                <td>
                    ${item.picture_url ? 
                        `<img src="${item.picture_url}" alt="商品画像" class="product-thumbnail" style="width: 60px; height: 60px; object-fit: cover;">` : 
                        '<div style="width: 60px; height: 60px; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm);"><i class="fas fa-image" style="color: var(--text-muted);"></i></div>'
                    }
                </td>
                <td>
                    <div class="item-id">${item.item_id || item.id || 'N/A'}</div>
                    ${item.master_sku ? `<div class="master-sku">${item.master_sku}</div>` : ''}
                </td>
                <td>
                    <div class="product-title">${item.title || 'タイトルなし'}</div>
                    ${item.source_url ? `<a href="${item.source_url}" target="_blank" class="source-link"><i class="fas fa-external-link-alt"></i></a>` : ''}
                </td>
                <td>
                    <div class="hybrid-price-display">
                        ${renderHybridPrice(item)}
                    </div>
                </td>
                <td>
                    <div class="category-tag">${item.category_name || item.category || 'N/A'}</div>
                </td>
                <td>
                    ${rendereBayCategory(item)}
                </td>
                <td>
                    <div class="status-badge status-${getStatusClass(item.condition_name)}">${item.condition_name || 'N/A'}</div>
                </td>
                <td>
                    <div class="source-badge ${sourceClass}">${item.platform || 'Unknown'}</div>
                </td>
                <td>
                    <div class="update-time">${formatDateTime(item.updated_at)}</div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editProduct('${item.id || item.item_id}')" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="openCategoryTool('${item.id || item.item_id}')" title="カテゴリー判定">
                            <i class="fas fa-tags"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${item.id || item.item_id}')" title="削除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    updateBulkActionsPanel();
}

// ハイブリッド価格表示
function renderHybridPrice(item) {
    const price_jpy = item.price || item.price_jpy;
    const price_usd = item.current_price || item.cached_price_usd;
    
    if (!price_jpy && !price_usd) {
        return '<div class="price-error">価格情報なし</div>';
    }
    
    return `
        <div class="price-primary">¥${(price_jpy || 0).toLocaleString()}</div>
        <div class="price-secondary">$${(price_usd || 0).toFixed(2)}</div>
    `;
}

// eBayカテゴリー情報表示
function rendereBayCategory(item) {
    if (item.ebay_category_path && item.category_confidence) {
        const confidenceColor = getConfidenceColor(item.category_confidence);
        const shortPath = shortenCategoryPath(item.ebay_category_path);
        
        return `
            <div class="ebay-category-info">
                <div class="category-path" style="font-size: 0.65rem; color: var(--text-secondary); margin-bottom: 2px;" title="${item.ebay_category_path}">
                    ${shortPath}
                </div>
                <div class="confidence-badge" style="background: ${confidenceColor}; color: white; padding: 1px 4px; border-radius: 3px; font-size: 0.6rem;">
                    ${item.category_confidence}%
                </div>
            </div>
        `;
    } else {
        return `
            <div class="ebay-category-info">
                <div style="color: var(--text-muted); font-size: 0.65rem;">
                    <i class="fas fa-question-circle"></i> 未判定
                </div>
                <button class="btn-link" onclick="openCategoryTool('${item.id || item.item_id}')" style="font-size: 0.6rem; color: var(--accent-purple); text-decoration: underline; background: none; border: none; cursor: pointer;">
                    判定実行
                </button>
            </div>
        `;
    }
}

// ユーティリティ関数
function getSourceClass(platform) {
    const platformLower = (platform || '').toLowerCase();
    if (platformLower.includes('yahoo')) return 'source-yahoo';
    if (platformLower.includes('ebay')) return 'source-ebay';
    if (platformLower.includes('inventory')) return 'source-inventory';
    if (platformLower.includes('mystical')) return 'source-mystical';
    return 'source-unknown';
}

function getStatusClass(condition) {
    const conditionLower = (condition || '').toLowerCase();
    if (conditionLower.includes('新品') || conditionLower.includes('new')) return 'new';
    if (conditionLower.includes('未使用') || conditionLower.includes('unused')) return 'like-new';
    if (conditionLower.includes('目立った傷') || conditionLower.includes('excellent')) return 'excellent';
    if (conditionLower.includes('やや傷') || conditionLower.includes('good')) return 'good';
    if (conditionLower.includes('傷や汚れ') || conditionLower.includes('fair')) return 'fair';
    if (conditionLower.includes('全体的に状態') || conditionLower.includes('poor')) return 'poor';
    return 'unknown';
}

function getConfidenceColor(confidence) {
    const conf = parseInt(confidence);
    if (conf >= 80) return '#28a745';      // 緑
    if (conf >= 60) return '#ffc107';      // 黄
    if (conf >= 40) return '#fd7e14';      // オレンジ
    return '#dc3545';                      // 赤
}

function shortenCategoryPath(fullPath) {
    if (!fullPath) return 'N/A';
    
    const parts = fullPath.split(' > ');
    if (parts.length <= 2) return fullPath;
    
    return parts[0] + ' > ... > ' + parts[parts.length - 1];
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP');
    } catch (e) {
        return dateString;
    }
}

// 選択管理
function toggleSelection(itemId) {
    const index = selectedItems.indexOf(itemId);
    if (index === -1) {
        selectedItems.push(itemId);
    } else {
        selectedItems.splice(index, 1);
    }
    
    updateBulkActionsPanel();
    updateSelectAllCheckbox();
    logMessage(`商品 ${itemId} を${index === -1 ? '選択' : '選択解除'}しました`);
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
    
    if (selectAllCheckbox.checked) {
        selectedItems = [];
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            selectedItems.push(checkbox.value);
        });
        logMessage(`全 ${selectedItems.length} 件を選択しました`);
    } else {
        selectedItems = [];
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        logMessage('選択を解除しました');
    }
    
    updateBulkActionsPanel();
}

function clearSelection() {
    selectedItems = [];
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateBulkActionsPanel();
    logMessage('選択を解除しました');
}

function updateBulkActionsPanel() {
    const panel = document.getElementById('bulkActionsPanel');
    const countSpan = document.getElementById('selectedCount');
    
    if (selectedItems.length > 0) {
        panel.style.display = 'flex';
        countSpan.textContent = selectedItems.length;
    } else {
        panel.style.display = 'none';
    }
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const totalCheckboxes = document.querySelectorAll('tbody input[type="checkbox"]').length;
    
    if (selectedItems.length === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (selectedItems.length === totalCheckboxes) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
    }
}

// 商品操作
function editProduct(itemId) {
    logMessage(`商品 ${itemId} の編集画面を開きます...`);
    const modalUrl = `modal.html?item_id=${encodeURIComponent(itemId)}`;
    window.open(modalUrl, '_blank', 'width=1000,height=700,scrollbars=yes,resizable=yes');
}

function openCategoryTool(itemId) {
    const categoryToolUrl = `../06_ebay_category_system/frontend/ebay_category_tool.php?item_id=${encodeURIComponent(itemId)}&source=editing`;
    window.open(categoryToolUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    logMessage(`商品 ${itemId} のカテゴリー判定ツールを開きました`);
}

async function deleteProduct(itemId) {
    if (!confirm(`商品 ${itemId} を削除しますか？\n\nこの操作は取り消せません。`)) {
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('action', 'delete_product');
        formData.append('product_id', itemId);
        
        const response = await fetch('editing.php', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            logMessage(`商品 ${itemId} を削除しました`, 'success');
            // 表示データから削除
            allData = allData.filter(item => (item.id || item.item_id) !== itemId);
            selectedItems = selectedItems.filter(id => id !== itemId);
            renderEditingTable();
        } else {
            throw new Error(result.message || '削除に失敗しました');
        }
    } catch (error) {
        logMessage(`削除エラー: ${error.message}`, 'error');
        console.error('削除エラー:', error);
    }
}

// 一括操作
async function deleteSelectedProducts() {
    if (selectedItems.length === 0) {
        logMessage('削除する商品を選択してください', 'warning');
        return;
    }
    
    if (!confirm(`選択した ${selectedItems.length} 件の商品を削除しますか？\n\nこの操作は取り消せません。`)) {
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('action', 'delete_multiple_products');
        formData.append('product_ids', JSON.stringify(selectedItems));
        
        const response = await fetch('editing.php', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            logMessage(`${result.deleted_count} 件の商品を削除しました`, 'success');
            // 表示データから削除
            allData = allData.filter(item => !selectedItems.includes(item.id || item.item_id));
            selectedItems = [];
            renderEditingTable();
        } else {
            throw new Error(result.message || '削除に失敗しました');
        }
    } catch (error) {
        logMessage(`一括削除エラー: ${error.message}`, 'error');
        console.error('一括削除エラー:', error);
    }
}

// CSV出力
function downloadEditingCSV() {
    if (!allData || allData.length === 0) {
        logMessage('出力するデータがありません', 'warning');
        return;
    }
    
    const csvUrl = `editing.php?action=export_csv&type=current&mode=editing`;
    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = '';
    link.click();
    
    logMessage(`現在表示中の ${allData.length} 件をCSV出力しました`, 'success');
}

// その他の操作
async function cleanupDummyData() {
    if (!confirm('ダミーデータを削除しますか？\n\nサンプルやテストデータが削除されます。')) {
        return;
    }
    
    try {
        const response = await fetch('editing.php?action=cleanup_dummy_data');
        const result = await response.json();
        
        if (result.success) {
            logMessage(`${result.deleted_count} 件のダミーデータを削除しました`, 'success');
            loadEditingData(); // データ再読み込み
        } else {
            throw new Error(result.message || '削除に失敗しました');
        }
    } catch (error) {
        logMessage(`ダミーデータ削除エラー: ${error.message}`, 'error');
        console.error('ダミーデータ削除エラー:', error);
    }
}

// 全データ削除
function showDeleteAllDialog() {
    const confirmCode = prompt(`全データを削除します。\n\n確認のため「DELETE_ALL_CONFIRM_2025」と入力してください:`);
    
    if (confirmCode === 'DELETE_ALL_CONFIRM_2025') {
        deleteAllProducts(confirmCode);
    } else if (confirmCode !== null) {
        logMessage('確認コードが正しくありません', 'warning');
    }
}

async function deleteAllProducts(confirmCode) {
    try {
        const response = await fetch(`editing.php?action=delete_all_products&confirm_code=${encodeURIComponent(confirmCode)}`);
        const result = await response.json();
        
        if (result.success) {
            logMessage(`${result.deleted_count} 件の全データを削除しました`, 'success');
            allData = [];
            selectedItems = [];
            renderEditingTable();
        } else {
            throw new Error(result.message || '削除に失敗しました');
        }
    } catch (error) {
        logMessage(`全データ削除エラー: ${error.message}`, 'error');
        console.error('全データ削除エラー:', error);
    }
}

// 親ウィンドウから呼ばれる関数
function refreshProductList() {
    logMessage('データを再読み込み中...');
    loadEditingData();
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    logMessage('Yahoo Auction データ編集システム起動完了');
    console.log('編集システム初期化完了');
});