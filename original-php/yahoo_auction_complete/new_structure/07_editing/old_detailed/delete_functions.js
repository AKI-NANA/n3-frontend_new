/**
 * 削除機能統合版JavaScript
 * 既存システムと互換性を保ちつつ、変数競合を解決
 */

// selectedItems変数は editing.js で既に宣言済みのため、ここでは宣言しない

// selectedProducts変数は使用しない（selectedItemsに統一）

/**
 * 個別商品削除
 */
function deleteProduct(productId, productTitle = '') {
    if (!productId) {
        showNotification('商品IDが不正です', 'error');
        return;
    }
    
    const confirmMessage = productTitle 
        ? `商品「${productTitle}」を削除しますか？\nこの操作は取り消せません。`
        : `商品ID「${productId}」を削除しますか？\nこの操作は取り消せません。`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    addLog(`商品削除処理開始: ID ${productId}`, 'info');
    
    fetch('', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            action: 'delete_product',
            product_id: productId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            addLog(`商品削除成功: ${data.message}`, 'success');
            
            // テーブルから該当行を削除
            const row = document.querySelector(`tr[data-product-id="${productId}"]`);
            if (row) {
                row.remove();
            }
            
            // 選択状態からも削除（既存のselectedItems配列を使用）
            const index = selectedItems.indexOf(productId);
            if (index > -1) {
                selectedItems.splice(index, 1);
            }
            updateSelectedCount();
            
        } else {
            showNotification(data.message, 'error');
            addLog(`商品削除失敗: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error('削除エラー:', error);
        showNotification('削除処理中にエラーが発生しました', 'error');
        addLog(`商品削除エラー: ${error.message}`, 'error');
    });
}

/**
 * 選択商品一括削除（既存システム互換）
 */
function deleteSelectedProducts() {
    if (selectedItems.length === 0) {
        showNotification('削除する商品を選択してください', 'warning');
        return;
    }
    
    const confirmMessage = `選択した${selectedItems.length}件の商品を削除しますか？\nこの操作は取り消せません。`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    addLog(`一括削除処理開始: ${selectedItems.length}件`, 'info');
    
    fetch('', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            action: 'delete_multiple_products',
            product_ids: JSON.stringify(selectedItems)
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            addLog(`一括削除成功: ${data.message}`, 'success');
            
            // 削除された商品の行をテーブルから削除
            selectedItems.forEach(productId => {
                const row = document.querySelector(`tr[data-product-id="${productId}"]`);
                if (row) {
                    row.remove();
                }
            });
            
            // 選択状態をクリア
            clearSelection();
            
        } else {
            showNotification(data.message, 'error');
            addLog(`一括削除失敗: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error('一括削除エラー:', error);
        showNotification('一括削除処理中にエラーが発生しました', 'error');
        addLog(`一括削除エラー: ${error.message}`, 'error');
    });
}

/**
 * 全データ削除ダイアログ表示
 */
function showDeleteAllDialog() {
    const confirmMessage = `⚠️ 危険な操作 ⚠️\n\nすべての商品データを削除します。\nこの操作は絶対に取り消せません！\n\n実行する場合は、確認コード「DELETE_ALL_CONFIRM_2025」を入力してください。`;
    
    const confirmCode = prompt(confirmMessage);
    
    if (confirmCode === null) {
        return;
    }
    
    if (confirmCode !== 'DELETE_ALL_CONFIRM_2025') {
        showNotification('確認コードが正しくありません', 'error');
        return;
    }
    
    const finalConfirm = confirm('本当にすべてのデータを削除しますか？\nこの操作は取り消せません！');
    if (!finalConfirm) {
        return;
    }
    
    executeDeleteAll(confirmCode);
}

/**
 * 全データ削除実行
 */
function executeDeleteAll(confirmCode) {
    addLog(`全データ削除処理開始 - 危険操作実行中`, 'warning');
    
    fetch('', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            action: 'delete_all_products',
            confirm_code: confirmCode
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            addLog(`全データ削除成功: ${data.message}`, 'success');
            
            // テーブルをクリア
            const tableBody = document.getElementById('editingTableBody');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="11" style="text-align: center; padding: var(--space-4);">
                            <i class="fas fa-check-circle" style="font-size: 2rem; color: #28a745; margin-bottom: var(--space-2);"></i><br>
                            <strong>全データが削除されました</strong><br>
                            <small>新しいデータを取得するには「未出品データ表示」ボタンをクリックしてください</small>
                        </td>
                    </tr>
                `;
            }
            
            // 選択状態をクリア
            clearSelection();
            
        } else {
            showNotification(data.message, 'error');
            addLog(`全データ削除失敗: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error('全データ削除エラー:', error);
        showNotification('全データ削除処理中にエラーが発生しました', 'error');
        addLog(`全データ削除エラー: ${error.message}`, 'error');
    });
}

/**
 * 選択状態管理（既存システム互換）
 */
function updateSelectedCount() {
    const count = selectedItems.length;
    const selectedCountElement = document.getElementById('selectedCount');
    const bulkActionsPanel = document.getElementById('bulkActionsPanel');
    
    if (selectedCountElement) {
        selectedCountElement.textContent = count;
    }
    
    if (bulkActionsPanel) {
        bulkActionsPanel.style.display = count > 0 ? 'flex' : 'none';
    }
}

function clearSelection() {
    selectedItems.length = 0; // 配列をクリア
    
    // すべてのチェックボックスを解除
    const checkboxes = document.querySelectorAll('input[type="checkbox"][value]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // 全選択チェックボックスも解除
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
    }
    
    updateSelectedCount();
}

/**
 * ログ表示（既存のaddLog関数が無い場合のフォールバック）
 */
function addLog(message, type = 'info') {
    const logContainer = document.getElementById('logContainer');
    if (!logContainer) {
        console.log(`[${type.toUpperCase()}] ${message}`);
        return;
    }
    
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logContainer.appendChild(logEntry);
    
    // 自動スクロール
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // ログが多すぎる場合は古いものを削除
    const entries = logContainer.querySelectorAll('.log-entry');
    if (entries.length > 100) {
        entries[0].remove();
    }
}

console.log('🗑️ 削除機能統合JavaScript読み込み完了（変数競合解決版）');