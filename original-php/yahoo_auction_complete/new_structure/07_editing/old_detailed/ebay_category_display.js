/**
 * ユーティリティ関数群（不足関数を補完）
 */
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

// 通知関数が存在しない場合のフォールバック
if (typeof showNotification !== 'function') {
    function showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        alert(message);
    }
}

/**
 * eBayカテゴリー表示機能追加
 * editing.jsに追加するeBayカテゴリー表示機能
 */

// 既存のrenderEditingTable関数を拡張（変数統一版）
function renderEditingTableWithCategory() {
    const tbody = document.getElementById('editingTableBody');
    
    if (!allData || allData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: var(--space-4);">
                    <i class="fas fa-exclamation-triangle" style="margin-right: var(--space-2); color: var(--editing-warning);"></i>
                    表示するデータがありません
                </td>
            </tr>
        `;
        return;
    }
    
    // 既存のselectedItems変数を使用（グローバル変数）
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
                    <div class="price-value">${item.current_price || item.price || '0'}</div>
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
}

/**
 * eBayカテゴリー情報を表示
 */
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
                ${item.category_detection_at ? 
                    `<div class="detection-time" style="font-size: 0.55rem; color: var(--text-muted);">
                        ${formatDateTime(item.category_detection_at, true)}
                    </div>` : ''
                }
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

/**
 * カテゴリーパスを短縮
 */
function shortenCategoryPath(fullPath) {
    if (!fullPath) return 'N/A';
    
    const parts = fullPath.split(' > ');
    if (parts.length <= 2) return fullPath;
    
    // 最初と最後の2つを表示
    return parts[0] + ' > ... > ' + parts[parts.length - 1];
}

/**
 * 信頼度に応じた色を取得
 */
function getConfidenceColor(confidence) {
    const conf = parseInt(confidence);
    if (conf >= 80) return '#28a745';      // 緑 - 高信頼度
    if (conf >= 60) return '#ffc107';      // 黄 - 中信頼度
    if (conf >= 40) return '#fd7e14';      // オレンジ - 低信頼度
    return '#dc3545';                      // 赤 - 非常に低い
}

/**
 * eBayカテゴリー判定ツールを開く
 */
function openCategoryTool(itemId) {
    const categoryToolUrl = '../06_ebay_category_system/frontend/ebay_category_tool.php';
    const url = `${categoryToolUrl}?item_id=${encodeURIComponent(itemId)}&source=editing`;
    
    // 新しいタブで開く
    window.open(url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    
    showNotification(`商品 ${itemId} のカテゴリー判定ツールを開きました`, 'info');
}

/**
 * 日時フォーマット（短縮版オプション付き）
 */
function formatDateTime(dateString, short = false) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (short) {
            return date.toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return date.toLocaleDateString('ja-JP') + ' ' + date.toLocaleTimeString('ja-JP', {hour12: false});
    } catch (e) {
        return dateString;
    }
}

/**
 * 操作パネルにeBayカテゴリー関連ボタンを追加
 */
function addCategoryButtons() {
    const editingActions = document.querySelector('.editing-actions');
    if (editingActions) {
        const categoryButtonsHTML = `
            <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                <button class="btn btn-warning" onclick="openBatchCategoryTool()">
                    <i class="fas fa-magic"></i> 一括カテゴリー判定
                </button>
                <button class="btn btn-info" onclick="refreshCategoryData()">
                    <i class="fas fa-sync"></i> カテゴリー情報更新
                </button>
            </div>
        `;
        
        // 最後のdivの後に追加
        const lastDiv = editingActions.querySelector('div:last-child');
        if (lastDiv) {
            lastDiv.insertAdjacentHTML('afterend', categoryButtonsHTML);
        }
    }
}

/**
 * 一括カテゴリー判定ツールを開く（selectedItems使用）
 */
function openBatchCategoryTool() {
    if (selectedItems.length === 0) {
        showNotification('カテゴリー判定を行う商品を選択してください', 'warning');
        return;
    }
    
    const categoryToolUrl = '../06_ebay_category_system/frontend/ebay_category_tool.php';
    const itemIds = selectedItems.join(',');
    const url = `${categoryToolUrl}?item_ids=${encodeURIComponent(itemIds)}&mode=batch&source=editing`;
    
    // 新しいタブで開く
    window.open(url, '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
    
    showNotification(`選択した ${selectedItems.length} 件の商品の一括カテゴリー判定ツールを開きました`, 'info');
}

/**
 * カテゴリー情報を更新
 */
async function refreshCategoryData() {
    showNotification('カテゴリー情報を更新中...', 'info');
    
    try {
        // 現在表示中のデータを再読み込み
        await loadEditingData();
        showNotification('カテゴリー情報を更新しました', 'success');
    } catch (error) {
        console.error('カテゴリー情報更新エラー:', error);
        showNotification('カテゴリー情報の更新に失敗しました', 'error');
    }
}

// 既存のrenderEditingTable関数を置き換え
if (typeof renderEditingTable === 'function') {
    renderEditingTable = renderEditingTableWithCategory;
}

// ページ読み込み時にカテゴリーボタンを追加
document.addEventListener('DOMContentLoaded', function() {
    addCategoryButtons();
});

// CSS追加
const categoryStyles = `
<style>
.ebay-category-info {
    font-size: 0.65rem;
    line-height: 1.2;
}

.category-path {
    cursor: help;
}

.confidence-badge {
    display: inline-block;
    font-weight: 600;
}

.detection-time {
    margin-top: 2px;
}

.btn-link {
    padding: 0;
    margin-top: 2px;
}

.btn-link:hover {
    text-decoration: none !important;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', categoryStyles);