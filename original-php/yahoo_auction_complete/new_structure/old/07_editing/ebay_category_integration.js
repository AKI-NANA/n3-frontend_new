/**
 * eBayカテゴリー統合JavaScript
 * 05editing.php専用・Claude編集性重視
 */

// eBayカテゴリーシステム設定
const EBAY_CATEGORY_API_BASE = '../06_ebay_category_system/backend/api/detect_category.php';

/**
 * 単一商品カテゴリー判定
 */
async function detectProductCategory(productId) {
    try {
        showProductLoading(productId, 'カテゴリー判定中...');
        logEntry('info', `商品 ${productId} のカテゴリー判定開始...`);
        
        // 商品データ取得
        const productData = await getProductData(productId);
        
        // eBayカテゴリー判定API呼び出し
        const response = await fetch(EBAY_CATEGORY_API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'detect_single',
                title: productData.title,
                price: productData.price,
                description: productData.description || ''
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // UI更新
            updateProductCategoryDisplay(productId, result.result);
            updateProductItemSpecifics(productId, result.result.item_specifics);
            updateCompletionStatus(productId);
            
            // データベース保存
            await saveProductCategoryData(productId, result.result);
            
            logEntry('success', `商品 ${productId} のカテゴリー判定完了: ${result.result.category_name} (${result.result.confidence}%)`);
            showNotification(`商品 ${productId} のカテゴリー判定完了: ${result.result.category_name} (${result.result.confidence}%)`, 'success');
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('カテゴリー判定エラー:', error);
        logEntry('error', `カテゴリー判定エラー: ${error.message}`);
        showNotification(`カテゴリー判定エラー: ${error.message}`, 'error');
    } finally {
        hideProductLoading(productId);
    }
}

/**
 * 一括カテゴリー判定
 */
async function runBatchCategoryDetection() {
    const uncategorizedProducts = getUncategorizedProducts();
    
    if (uncategorizedProducts.length === 0) {
        showNotification('未設定のカテゴリーはありません', 'info');
        return;
    }
    
    if (!confirm(`${uncategorizedProducts.length}件の商品に対してカテゴリー判定を実行しますか？`)) {
        return;
    }
    
    let processed = 0;
    const total = uncategorizedProducts.length;
    
    logEntry('info', `一括カテゴリー判定開始: ${total}件`);
    showNotification(`一括カテゴリー判定開始: ${total}件`, 'info');
    
    for (const productId of uncategorizedProducts) {
        try {
            await detectProductCategory(productId);
            processed++;
            
            // 進行状況更新
            updateBatchProgress(processed, total);
            
            // API負荷軽減のため1秒待機
            await sleep(1000);
            
        } catch (error) {
            console.error(`商品 ${productId} の判定失敗:`, error);
            logEntry('warning', `商品 ${productId} の判定失敗: ${error.message}`);
        }
    }
    
    logEntry('success', `一括カテゴリー判定完了: ${processed}/${total}件`);
    showNotification(`一括カテゴリー判定完了: ${processed}/${total}件`, 'success');
    refreshEditingData();
}

/**
 * 商品編集モーダル表示
 */
function openEditModal(productId) {
    const modalUrl = `product_edit_modal.php?product_id=${productId}`;
    
    fetch(modalUrl)
        .then(response => response.text())
        .then(html => {
            showModal(html);
            initializeEditModal(productId);
        })
        .catch(error => {
            showNotification(`モーダル表示エラー: ${error.message}`, 'error');
        });
}

/**
 * 必須項目編集
 */
function editItemSpecifics(productId) {
    const currentSpecifics = getProductItemSpecifics(productId);
    const categoryId = getProductCategoryId(productId);
    
    openItemSpecificsEditor(productId, categoryId, currentSpecifics);
}

/**
 * 商品データ取得
 */
async function getProductData(productId) {
    const response = await fetch(`?action=get_product_details&item_id=${productId}`);
    const result = await response.json();
    
    if (!result.success) {
        throw new Error('商品データ取得失敗');
    }
    
    return result.data;
}

/**
 * カテゴリーデータ保存
 */
async function saveProductCategoryData(productId, categoryResult) {
    const response = await fetch('?action=update_product_enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            product_id: productId,
            ebay_category_id: categoryResult.category_id,
            item_specifics: categoryResult.item_specifics || 'Brand=Unknown■Condition=Used'
        })
    });
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error('カテゴリーデータ保存失敗');
    }
    
    return result;
}

/**
 * 商品ローディング表示
 */
function showProductLoading(productId, message) {
    const categoryCell = document.querySelector(`#category-${productId}`);
    if (categoryCell) {
        categoryCell.innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <span style="font-size: 0.65rem; margin-left: 4px;">${message}</span>
            </div>
        `;
    }
}

/**
 * 商品ローディング非表示
 */
function hideProductLoading(productId) {
    // ローディングは updateProductCategoryDisplay で上書きされるので何もしない
}

/**
 * 商品カテゴリー表示更新
 */
function updateProductCategoryDisplay(productId, categoryResult) {
    const categoryCell = document.querySelector(`#category-${productId}`);
    if (categoryCell) {
        categoryCell.innerHTML = `
            <div class="category-info">
                <span class="category-name">${categoryResult.category_name}</span>
                <div class="category-id" style="font-size: 0.6rem; color: #6c757d;">ID: ${categoryResult.category_id}</div>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${categoryResult.confidence}%;">
                        ${categoryResult.confidence}%
                    </div>
                </div>
            </div>
        `;
    }
}

/**
 * 商品必須項目更新
 */
function updateProductItemSpecifics(productId, itemSpecifics) {
    const specificsCell = document.querySelector(`#specifics-${productId}`);
    if (specificsCell) {
        const preview = itemSpecifics && itemSpecifics.length > 50 ? 
            itemSpecifics.substring(0, 50) + '...' : itemSpecifics || 'Brand=Unknown■Condition=Used';
            
        specificsCell.querySelector('.specifics-preview').textContent = preview;
        specificsCell.setAttribute('data-full-specifics', itemSpecifics || 'Brand=Unknown■Condition=Used');
    }
}

/**
 * 完了度ステータス更新
 */
function updateCompletionStatus(productId) {
    const hasCategory = !document.querySelector(`#category-${productId} .category-name`).textContent.includes('未設定');
    const hasSpecifics = document.querySelector(`#specifics-${productId}`).getAttribute('data-full-specifics');
    
    let completionRate = 20; // 基本項目（タイトルなど）
    if (hasCategory) completionRate += 40;
    if (hasSpecifics && hasSpecifics !== 'Brand=Unknown■Condition=Used') completionRate += 40;
    
    const completionCell = document.querySelector(`#completion-${productId}`);
    if (completionCell) {
        completionCell.querySelector('.completion-percentage').textContent = `${completionRate}%`;
        completionCell.querySelector('.completion-fill').style.width = `${completionRate}%`;
        
        // 色分け
        const fillElement = completionCell.querySelector('.completion-fill');
        if (completionRate >= 80) {
            fillElement.style.backgroundColor = '#28a745';
        } else if (completionRate >= 50) {
            fillElement.style.backgroundColor = '#ffc107';
        } else {
            fillElement.style.backgroundColor = '#dc3545';
        }
    }
}

/**
 * 未カテゴリー商品取得
 */
function getUncategorizedProducts() {
    const rows = document.querySelectorAll('tr[data-product-id]');
    const uncategorized = [];
    
    rows.forEach(row => {
        const categoryCell = row.querySelector('.category-name');
        if (!categoryCell || categoryCell.textContent.includes('未設定')) {
            uncategorized.push(row.dataset.productId);
        }
    });
    
    return uncategorized;
}

/**
 * バッチ処理進行状況更新
 */
function updateBatchProgress(processed, total) {
    const percentage = Math.round((processed / total) * 100);
    logEntry('info', `進行状況: ${processed}/${total} (${percentage}%)`);
    
    // プログレスバー表示（簡易版）
    if (!document.getElementById('batch-progress')) {
        const progressBar = document.createElement('div');
        progressBar.id = 'batch-progress';
        progressBar.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 3000;
            min-width: 300px;
            text-align: center;
        `;
        document.body.appendChild(progressBar);
    }
    
    const progressBar = document.getElementById('batch-progress');
    progressBar.innerHTML = `
        <h4>一括カテゴリー判定中</h4>
        <div style="background: #e9ecef; border-radius: 4px; height: 8px; margin: 10px 0;">
            <div style="background: #0B1D51; height: 100%; border-radius: 4px; width: ${percentage}%; transition: width 0.3s ease;"></div>
        </div>
        <p>${processed} / ${total} 完了 (${percentage}%)</p>
    `;
    
    if (processed >= total) {
        setTimeout(() => {
            if (progressBar.parentNode) {
                progressBar.remove();
            }
        }, 2000);
    }
}

/**
 * 商品を出品準備完了としてマーク
 */
function markProductAsReady(productId) {
    const row = document.querySelector(`tr[data-product-id="${productId}"]`);
    if (row) {
        row.style.backgroundColor = '#d4edda';
        setTimeout(() => {
            row.style.backgroundColor = '';
        }, 3000);
    }
}

/**
 * 商品完了度取得
 */
function getProductCompletionRate(productId) {
    const completionCell = document.querySelector(`#completion-${productId}`);
    if (completionCell) {
        const percentageText = completionCell.querySelector('.completion-percentage').textContent;
        return parseInt(percentageText.replace('%', '')) || 0;
    }
    return 0;
}

/**
 * 商品必須項目取得
 */
function getProductItemSpecifics(productId) {
    const specificsCell = document.querySelector(`#specifics-${productId}`);
    return specificsCell ? 
        (specificsCell.getAttribute('data-full-specifics') || 'Brand=Unknown■Condition=Used') :
        'Brand=Unknown■Condition=Used';
}

/**
 * 商品カテゴリーID取得
 */
function getProductCategoryId(productId) {
    const categoryCell = document.querySelector(`#category-${productId} .category-id`);
    if (categoryCell) {
        const text = categoryCell.textContent;
        const match = text.match(/ID: (\d+)/);
        return match ? match[1] : '';
    }
    return '';
}

/**
 * モーダル表示
 */
function showModal(html) {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    
    container.innerHTML = html;
    overlay.style.display = 'flex';
    
    // ESCキーで閉じる
    document.addEventListener('keydown', function closeOnEsc(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', closeOnEsc);
        }
    });
}

/**
 * モーダル閉じる
 */
function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.style.display = 'none';
}

/**
 * 必須項目エディター表示
 */
function openItemSpecificsEditor(productId, categoryId, currentSpecifics) {
    const modalHtml = `
        <div class="modal-content" style="width: 600px; padding: 20px;">
            <div class="modal-header" style="margin-bottom: 20px; border-bottom: 1px solid #dee2e6; padding-bottom: 10px;">
                <h3>必須項目編集 - 商品ID: ${productId}</h3>
                <button class="modal-close" onclick="closeModal()" style="float: right; background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Item Specifics (Maru9形式)</label>
                    <textarea id="item-specifics-input" rows="4" style="width: 100%; padding: 8px; border: 1px solid #dee2e6; border-radius: 4px;" 
                              placeholder="Brand=Unknown■Color=Black■Condition=Used">${currentSpecifics}</textarea>
                </div>
                
                <div class="form-help" style="font-size: 0.8rem; color: #6c757d; margin-bottom: 20px;">
                    <strong>形式:</strong> Key=Value■Key=Value■... 
                    <br><strong>例:</strong> Brand=Sony■Color=Black■Condition=Used■Model=WH-1000XM4
                </div>
            </div>
            
            <div class="modal-footer" style="text-align: right; padding-top: 15px; border-top: 1px solid #dee2e6;">
                <button class="btn btn-secondary" onclick="closeModal()" style="margin-right: 10px;">
                    <i class="fas fa-times"></i> キャンセル
                </button>
                <button class="btn btn-primary" onclick="saveItemSpecifics(${productId})">
                    <i class="fas fa-save"></i> 保存
                </button>
            </div>
        </div>
    `;
    
    showModal(modalHtml);
}

/**
 * 必須項目保存
 */
async function saveItemSpecifics(productId) {
    try {
        const input = document.getElementById('item-specifics-input');
        const itemSpecifics = input.value.trim();
        
        if (!itemSpecifics) {
            alert('必須項目を入力してください');
            return;
        }
        
        const response = await fetch('?action=update_product_enhanced', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: productId,
                item_specifics: itemSpecifics
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // UI更新
            updateProductItemSpecifics(productId, itemSpecifics);
            updateCompletionStatus(productId);
            
            closeModal();
            logEntry('success', `商品 ${productId} の必須項目を更新`);
            showNotification(`商品 ${productId} の必須項目を更新しました`, 'success');
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('必須項目保存エラー:', error);
        logEntry('error', `必須項目保存エラー: ${error.message}`);
        showNotification(`保存エラー: ${error.message}`, 'error');
    }
}

/**
 * データリフレッシュ
 */
function refreshEditingData() {
    logEntry('info', 'データをリフレッシュ中...');
    loadEditingData();
}

/**
 * スリープ関数
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 必須項目チェック
 */
function validateAllItemSpecifics() {
    const rows = document.querySelectorAll('tr[data-product-id]');
    let validCount = 0;
    let invalidCount = 0;
    
    rows.forEach(row => {
        const productId = row.dataset.productId;
        const specifics = getProductItemSpecifics(productId);
        
        if (specifics && specifics !== 'Brand=Unknown■Condition=Used' && specifics.includes('■')) {
            validCount++;
            // 有効な行をハイライト
            row.style.backgroundColor = '#d4edda';
            setTimeout(() => {
                row.style.backgroundColor = '';
            }, 2000);
        } else {
            invalidCount++;
            // 無効な行をハイライト
            row.style.backgroundColor = '#f8d7da';
            setTimeout(() => {
                row.style.backgroundColor = '';
            }, 2000);
        }
    });
    
    logEntry('info', `必須項目チェック完了: 有効 ${validCount}件, 要修正 ${invalidCount}件`);
    showNotification(`必須項目チェック完了: 有効 ${validCount}件, 要修正 ${invalidCount}件`, 
        invalidCount > 0 ? 'warning' : 'success');
}

/**
 * 一括編集モーダル
 */
function openBulkEditModal() {
    const selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked')).map(cb => cb.value);
    
    if (selectedProducts.length === 0) {
        showNotification('商品を選択してください', 'warning');
        return;
    }
    
    const modalHtml = `
        <div class="modal-content" style="width: 700px; padding: 20px;">
            <div class="modal-header" style="margin-bottom: 20px; border-bottom: 1px solid #dee2e6; padding-bottom: 10px;">
                <h3>一括編集 - ${selectedProducts.length}件選択中</h3>
                <button class="modal-close" onclick="closeModal()" style="float: right; background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">
                        <input type="checkbox" id="bulk-condition"> 状態を一括変更
                    </label>
                    <select id="bulk-condition-value" style="width: 100%; padding: 8px; border: 1px solid #dee2e6; border-radius: 4px;" disabled>
                        <option value="New">新品</option>
                        <option value="Like New">ほぼ新品</option>
                        <option value="Very Good">とても良い</option>
                        <option value="Good">良い</option>
                        <option value="Acceptable">可</option>
                        <option value="For parts or not working">ジャンク</option>
                    </select>
                </div>
                
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">
                        <input type="checkbox" id="bulk-specifics"> 必須項目を一括設定
                    </label>
                    <textarea id="bulk-specifics-value" rows="3" style="width: 100%; padding: 8px; border: 1px solid #dee2e6; border-radius: 4px;" 
                              placeholder="Brand=Unknown■Condition=Used" disabled>Brand=Unknown■Condition=Used</textarea>
                </div>
            </div>
            
            <div class="modal-footer" style="text-align: right; padding-top: 15px; border-top: 1px solid #dee2e6;">
                <button class="btn btn-secondary" onclick="closeModal()" style="margin-right: 10px;">
                    <i class="fas fa-times"></i> キャンセル
                </button>
                <button class="btn btn-primary" onclick="executeBulkEdit([${selectedProducts.map(id => `'${id}'`).join(',')}])">
                    <i class="fas fa-save"></i> 一括適用
                </button>
            </div>
        </div>
    `;
    
    showModal(modalHtml);
    
    // チェックボックス連動
    document.getElementById('bulk-condition').addEventListener('change', function() {
        document.getElementById('bulk-condition-value').disabled = !this.checked;
    });
    
    document.getElementById('bulk-specifics').addEventListener('change', function() {
        document.getElementById('bulk-specifics-value').disabled = !this.checked;
    });
}

/**
 * 一括編集実行
 */
async function executeBulkEdit(productIds) {
    const conditionChecked = document.getElementById('bulk-condition').checked;
    const specificsChecked = document.getElementById('bulk-specifics').checked;
    
    if (!conditionChecked && !specificsChecked) {
        alert('変更する項目を選択してください');
        return;
    }
    
    if (!confirm(`${productIds.length}件の商品に一括編集を適用しますか？`)) {
        return;
    }
    
    closeModal();
    
    let processed = 0;
    const total = productIds.length;
    
    logEntry('info', `一括編集開始: ${total}件`);
    showNotification(`一括編集開始: ${total}件`, 'info');
    
    for (const productId of productIds) {
        try {
            const updateData = { product_id: productId };
            
            if (conditionChecked) {
                updateData.condition = document.getElementById('bulk-condition-value').value;
            }
            
            if (specificsChecked) {
                updateData.item_specifics = document.getElementById('bulk-specifics-value').value;
            }
            
            const response = await fetch('?action=update_product_enhanced', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                processed++;
                
                // UI更新
                if (specificsChecked) {
                    updateProductItemSpecifics(productId, updateData.item_specifics);
                    updateCompletionStatus(productId);
                }
            }
            
            // 進行状況表示
            updateBatchProgress(processed, total);
            
            // API負荷軽減
            await sleep(300);
            
        } catch (error) {
            console.error(`商品 ${productId} の一括編集失敗:`, error);
            logEntry('warning', `商品 ${productId} の一括編集失敗: ${error.message}`);
        }
    }
    
    logEntry('success', `一括編集完了: ${processed}/${total}件`);
    showNotification(`一括編集完了: ${processed}/${total}件`, 'success');
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ eBayカテゴリー統合システム初期化完了');
    logEntry('success', 'eBayカテゴリー統合システム初期化完了');
});