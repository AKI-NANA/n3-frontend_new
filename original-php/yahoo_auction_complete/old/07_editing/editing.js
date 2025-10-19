// Yahoo Auction Tool - データ編集システム JavaScript

// グローバル変数
let currentPage = 1;
let itemsPerPage = 20;
let totalItems = 0;
let allData = [];
let selectedItems = [];

// ログ追加関数
function addLog(message, type = 'info') {
    const logContainer = document.getElementById('logContainer');
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logContainer.appendChild(logEntry);
    
    // 最新ログを表示するため下にスクロール
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // ログが多くなりすぎたら古いものを削除
    const logs = logContainer.querySelectorAll('.log-entry');
    if (logs.length > 50) {
        logs[0].remove();
    }
}

// 未出品データ読み込み
async function loadEditingData() {
    try {
        addLog('未出品データの読み込みを開始します...', 'info');
        showLoading();
        
        const response = await fetch(`?action=get_scraped_products&page=${currentPage}&limit=${itemsPerPage}&mode=extended`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            allData = data.data.data || data.data;
            totalItems = data.data.total || data.data.length || 0;
            
            renderEditingTable();
            
            const note = data.data.note || 'データ読み込み完了';
            addLog(`${note} (${totalItems}件)`, 'success');
            showNotification(`未出品データを読み込みました（${totalItems}件）`, 'success');
        } else {
            throw new Error(data.message || 'データ取得に失敗しました');
        }
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        addLog(`データ読み込みエラー: ${error.message}`, 'error');
        showError('データの読み込みに失敗しました: ' + error.message);
    }
}

// データ読み込み（厳密モード）
async function loadEditingDataStrict() {
    addLog('厳密モード（URL有データのみ）でデータを読み込み中...', 'info');
    showNotification('厳密モード（URL有データのみ）でデータを読み込み中...', 'info');
}

// データ読み込み（全データ表示）
async function loadAllData() {
    try {
        addLog('全データ（出品済み含む）を読み込み中...', 'warning');
        showLoading();
        
        const response = await fetch(`?action=get_all_products&page=${currentPage}&limit=${itemsPerPage}&mode=all`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            allData = data.data.data || data.data;
            totalItems = data.data.total || data.data.length || 0;
            
            renderEditingTable();
            
            const note = data.data.note || 'データ読み込み完了';
            addLog(`${note} (${totalItems}件) - 出品済み含む`, 'success');
            showNotification(`全データを読み込みました（${totalItems}件）`, 'success');
        } else {
            throw new Error(data.message || 'データ取得に失敗しました');
        }
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        addLog(`データ読み込みエラー: ${error.message}`, 'error');
        showError('データの読み込みに失敗しました: ' + error.message);
    }
}

// ハイブリッド価格表示関数（円価格優先）
function formatHybridPrice(priceJpy, priceUsd, cacheRate) {
    // 円価格を主要表示、USD価格を補助表示
    if (priceJpy && priceJpy > 0) {
        const jpyFormatted = `¥${parseInt(priceJpy).toLocaleString()}`;
        
        if (priceUsd && priceUsd > 0) {
            const usdFormatted = `${parseFloat(priceUsd).toFixed(2)}`;
            const rateInfo = cacheRate ? ` (1$=${cacheRate}円)` : '';
            
            return `
                <div class="hybrid-price-display">
                    <div class="price-primary">${jpyFormatted}</div>
                    <div class="price-secondary">${usdFormatted}${rateInfo}</div>
                </div>
            `;
        } else {
            return `<div class="price-primary">${jpyFormatted}</div>`;
        }
    } else if (priceUsd && priceUsd > 0) {
        // 円価格がない場合はUSD価格のみ
        return `<div class="price-secondary">${parseFloat(priceUsd).toFixed(2)}</div>`;
    } else {
        return `<div class="price-error">価格不明</div>`;
    }
}

// テーブルレンダリング
function renderEditingTable() {
    const tbody = document.getElementById('editingTableBody');
    
    if (!allData || allData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: var(--space-4);">
                    <i class="fas fa-exclamation-triangle" style="margin-right: var(--space-2); color: var(--warning-accent);"></i>
                    未出品データがありません
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
                           data-product-id="${item.id || item.item_id}"
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
                    <div style="font-family: 'Courier New', monospace; font-size: 0.65rem; background: var(--bg-tertiary); padding: 1px 3px; border-radius: var(--radius-sm);">${item.item_id || item.id || 'N/A'}</div>
                </td>
                <td>
                    <div style="font-weight: 500; color: var(--text-primary); font-size: 0.75rem; line-height: 1.2;">${item.title || 'タイトルなし'}</div>
                    ${item.source_url ? `<a href="${item.source_url}" target="_blank" style="color: var(--info-accent); margin-left: var(--space-1); font-size: 0.65rem; text-decoration: none;"><i class="fas fa-external-link-alt"></i></a>` : ''}
                </td>
                <td>
                    ${formatHybridPrice(item.price, item.current_price, item.cache_rate)}
                </td>
                <td>
                    <div class="category-tag">${item.category_name || item.category || 'N/A'}</div>
                </td>
                <td>
                    <div style="padding: 2px 6px; border-radius: var(--radius-sm); font-size: 0.65rem; font-weight: 600; background: var(--warning-accent); color: var(--text-primary);">${item.condition_name || 'N/A'}</div>
                </td>
                <td>
                    <div class="source-badge ${sourceClass}">${item.platform === 'ヤフオク' ? 'ヤフオク' : (item.platform || 'Unknown')}</div>
                </td>
                <td>
                    <div style="font-size: 0.65rem; color: var(--text-muted);">${formatDateTime(item.updated_at)}</div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info" onclick="viewProductDetails('${item.item_id || item.id}')" title="詳細表示">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="editProduct('${item.id || item.item_id}')" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${item.id || item.item_id}')" title="削除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    addLog(`テーブルレンダリング完了: ${allData.length}件表示`, 'success');
}

// ダミーデータ削除（データベースから実際に削除）
async function cleanupDummyData() {
    if (!confirm('ダミーデータをデータベースから削除してもよろしいですか？この操作は取り消せません。')) {
        return;
    }
    
    try {
        addLog('ダミーデータ削除処理を開始します...', 'warning');
        
        const response = await fetch('?action=cleanup_dummy_data', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            addLog(data.message, 'success');
            showNotification(data.message, 'success');
            loadEditingData(); // データ再読み込み
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('ダミーデータ削除エラー:', error);
        addLog(`ダミーデータ削除エラー: ${error.message}`, 'error');
        showError('ダミーデータの削除に失敗しました: ' + error.message);
    }
}

// CSV出力（表示中のデータのみ）
function downloadEditingCSV() {
    if (!allData || allData.length === 0) {
        addLog('出力するデータがありません', 'warning');
        showError('出力するデータがありません');
        return;
    }
    
    const url = '?action=export_csv&type=scraped&mode=extended';
    const link = document.createElement('a');
    link.href = url;
    link.download = `scraped_data_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addLog(`CSV出力開始: ${allData.length}件のデータ`, 'info');
    showNotification(`${allData.length}件のデータをCSV出力しています`, 'success');
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

// ステータスクラス取得関数（追加）
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

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP');
    } catch (e) {
        return dateString;
    }
}

function showLoading() {
    const tbody = document.getElementById('editingTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="10" style="text-align: center; padding: var(--space-4);">
                <i class="fas fa-spinner fa-spin" style="margin-right: var(--space-2);"></i>
                データを読み込み中...
            </td>
        </tr>
    `;
    addLog('データ読み込み中...', 'info');
}

function showNotification(message, type = 'info') {
    // 上部通知を削除し、ログエリアのみに表示
    addLog(message, type);
}

function showError(message) {
    showNotification(message, 'error');
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-triangle';
        case 'warning': return 'exclamation-triangle';
        case 'info': 
        default: return 'info-circle';
    }
}

// 選択・編集・削除機能（変数統合版）
// selectedItems は既に上部で宣言済み（重複削除）

function toggleSelection(productId) {
    const checkbox = document.querySelector(`input[value="${productId}"]`);
    if (checkbox.checked) {
        if (!selectedItems.includes(productId)) {
            selectedItems.push(productId);
        }
    } else {
        const index = selectedItems.indexOf(productId);
        if (index > -1) {
            selectedItems.splice(index, 1);
        }
    }
    updateSelectedCount();
    addLog(`商品選択切替: ${productId} (${selectedItems.length}件選択中)`, 'info');
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-product-id]');
    
    selectedItems.length = 0; // 配列をクリア
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        const productId = checkbox.value;
        
        if (selectAllCheckbox.checked) {
            selectedItems.push(productId);
        }
    });
    
    updateSelectedCount();
    addLog(`全選択切替: ${selectedItems.length}件選択中`, 'info');
}

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
    addLog('選択解除', 'info');
}

function deleteSelectedProducts() {
    if (selectedItems.length === 0) {
        showNotification('削除する商品を選択してください', 'warning');
        return;
    }
    
    const confirmMessage = `選択した${selectedItems.length}件の商品を削除しますか？\nこの操作は取り消せません。`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    addLog(`一括削除処理開始: ${selectedItems.length}件`, 'warning');
    
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
            
            // データ配列からも削除
            allData = allData.filter(item => !selectedItems.includes(item.id || item.item_id));
            totalItems -= selectedItems.length;
            
            // 選択状態をクリア
            clearSelection();
            
        } else {
            showError(data.message);
            addLog(`一括削除失敗: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error('一括削除エラー:', error);
        showError('一括削除処理中にエラーが発生しました');
        addLog(`一括削除エラー: ${error.message}`, 'error');
    });
}

function showDeleteAllDialog() {
    const confirmMessage = `⚠️ 危険な操作 ⚠️\n\nすべての商品データを削除します。\nこの操作は絶対に取り消せません！\n\n実行する場合は、確認コード「DELETE_ALL_CONFIRM_2025」を入力してください。`;
    
    const confirmCode = prompt(confirmMessage);
    
    if (confirmCode === null) {
        // キャンセルされた
        return;
    }
    
    if (confirmCode !== 'DELETE_ALL_CONFIRM_2025') {
        showError('確認コードが正しくありません');
        return;
    }
    
    // 最終確認
    const finalConfirm = confirm('本当にすべてのデータを削除しますか？\nこの操作は取り消せません！');
    if (!finalConfirm) {
        return;
    }
    
    executeDeleteAll(confirmCode);
}

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
            
            // データ配列もクリア
            allData = [];
            totalItems = 0;
            
            // 選択状態をクリア
            clearSelection();
            
        } else {
            showError(data.message);
            addLog(`全データ削除失敗: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error('全データ削除エラー:', error);
        showError('全データ削除処理中にエラーが発生しました');
        addLog(`全データ削除エラー: ${error.message}`, 'error');
    });
}

function bulkApprove() {
    addLog('一括承認処理', 'info');
}

function bulkReject() {
    addLog('一括拒否処理', 'info');
}

function editProduct(productId) {
    addLog(`商品編集: ${productId}`, 'info');
}

// Emergency Parser 詳細表示関数（修正版）
function viewProductDetails(itemId) {
    addLog(`商品詳細表示開始: ${itemId}`, 'info');
    
    // まず、現在のテーブルデータから該当商品を探す
    const currentProduct = allData.find(item => (item.item_id || item.id) === itemId);
    
    if (currentProduct) {
        addLog(`テーブルデータから商品発見: ${currentProduct.title}`, 'success');
        console.log('Current product data:', currentProduct);
        
        // テーブルデータを使用してモーダル表示
        createProductDetailsModalFromTable(currentProduct);
    } else {
        addLog(`テーブルデータにない商品、API取得試行: ${itemId}`, 'warning');
        
        // APIから詳細データを取得
        fetch(`?action=get_product_details&item_id=${encodeURIComponent(itemId)}`)
            .then(response => response.json())
            .then(data => {
                console.log('API response:', data);
                if (data.success && data.data) {
                    addLog(`API取得成功: ${data.data.title}`, 'success');
                    createProductDetailsModal(data.data);
                } else {
                    addLog(`商品詳細取得失敗: ${data.message}`, 'error');
                    showError('商品詳細を取得できませんでした: ' + (data.message || ''));
                }
            })
            .catch(error => {
                console.error('商品詳細取得エラー:', error);
                addLog(`商品詳細取得エラー: ${error.message}`, 'error');
                showError('商品詳細の取得中にエラーが発生しました');
            });
    }
}

// テーブルデータから商品詳細モーダル作成（優先版）
function createProductDetailsModalFromTable(product) {
    addLog(`テーブルデータでモーダル作成: ${product.title}`, 'info');
    
    const qualityScore = 85; // デフォルト品質スコア
    const accuracyColor = '#28a745'; // 緑色
    
    // 画像URLの処理
    let imageUrl = product.picture_url || product.active_image_url || '';
    if (!imageUrl || imageUrl.includes('placehold')) {
        imageUrl = 'https://placehold.co/300x200/725CAD/FFFFFF/png?text=No+Image';
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10000; overflow-y: auto;
        padding: 20px; box-sizing: border-box;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 900px; margin: 0 auto; position: relative;">
            <div style="display: flex; align-items: center; justify-content: between; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #1f2937;">📋 商品詳細情報 - ${product.item_id || product.id}</h3>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="position: absolute; top: 15px; right: 15px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px;">×</button>
            </div>
            
            <!-- テーブルデータ表示メッセージ -->
            <div class="notification success" style="margin-bottom: 20px; padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 10px; background: #d4edda; border: 1px solid #c3e6cb; color: #155724;">
                <i class="fas fa-table"></i>
                <span>📊 テーブルデータから詳細表示</span>
            </div>
            
            <!-- 精度バー -->
            <div class="accuracy-bar" style="width: 100%; height: 30px; background: #e9ecef; border-radius: 15px; overflow: hidden; margin: 15px 0; position: relative;">
                <div class="accuracy-fill" style="height: 100%; width: ${qualityScore}%; background: ${accuracyColor}; transition: width 0.5s ease; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 14px;">
                    ${qualityScore}%
                </div>
            </div>
            
            <!-- 基本情報 -->
            <div class="product-basic-info" style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #1f2937;">📋 基本情報</h4>
                        <p style="margin: 5px 0;"><strong>タイトル:</strong> ${product.title || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>価格:</strong> ¥${(product.current_price || product.price || 0).toLocaleString()}</p>
                        <p style="margin: 5px 0;"><strong>状態:</strong> ${product.condition_name || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>カテゴリ:</strong> ${product.category_name || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>プラットフォーム:</strong> ${product.platform || 'Yahoo'}</p>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #1f2937;">🔑 データベース情報</h4>
                        <p style="margin: 5px 0;"><strong>Item ID:</strong> ${product.item_id || product.id || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>SKU:</strong> ${product.master_sku || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>ステータス:</strong> ${product.listing_status || 'not_listed'}</p>
                        <p style="margin: 5px 0;"><strong>在庫:</strong> ${product.current_stock || '1'}</p>
                        <p style="margin: 5px 0;"><strong>更新日:</strong> ${formatDateTime(product.updated_at)}</p>
                    </div>
                </div>
                
                <!-- 画像表示 -->
                ${imageUrl ? `
                <div style="margin-top: 15px;">
                    <h4 style="margin: 0 0 10px 0; color: #1f2937;">🖼️ 商品画像</h4>
                    <div style="text-align: center;">
                        <img src="${imageUrl}" alt="商品画像" style="max-width: 300px; max-height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;" onclick="openImagePreview('${imageUrl}')" style="cursor: pointer;">
                    </div>
                </div>
                ` : ''}
                
                <div style="margin-top: 15px; text-align: center;">
                    <button class="btn btn-primary" onclick="editProductModalEditing('${product.item_id || product.id}')">
                        <i class="fas fa-edit"></i> 詳細編集
                    </button>
                    ${product.source_url ? `
                    <button class="btn btn-info" onclick="window.open('${product.source_url}', '_blank')">
                        <i class="fas fa-external-link-alt"></i> 元ページ
                    </button>
                    ` : ''}
                    <button class="btn btn-danger" onclick="deleteProduct('${product.id || product.item_id}', '${(product.title || '').replace(/'/g, "\\'")}')">  
                        <i class="fas fa-trash"></i> 削除
                    </button>
                </div>
            </div>
            
            <!-- 詳細データ -->
            <details style="margin-top: 20px;">
                <summary style="cursor: pointer; padding: 10px; background: #f8f9fa; border-radius: 4px;"><strong>🔍 全データ表示</strong></summary>
                <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 11px; max-height: 300px; overflow-y: auto; margin-top: 10px;">${JSON.stringify(product, null, 2)}</pre>
            </details>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 現在の商品データをグローバルに保存（編集用）
    window.currentProductData = {
        item_id: product.item_id || product.id,
        title: product.title || '',
        current_price: product.current_price || product.price || 0,
        condition: product.condition_name || '',
        category: product.category_name || '',
        description: '',
        data_quality: qualityScore,
        scraping_method: 'Table Data'
    };
    
    addLog(`テーブルデータモーダル表示完了: ${product.title}`, 'success');
}

// 商品詳細モーダル作成（API版・フォールバック用）
function createProductDetailsModal(product) {
    const qualityScore = product.data_quality || 85;
    const accuracyClass = qualityScore >= 90 ? 'success' : (qualityScore >= 75 ? 'warning' : 'error');
    const accuracyColor = qualityScore >= 90 ? '#28a745' : (qualityScore >= 75 ? '#ffc107' : '#dc3545');
    
    // 画像表示グリッド
    let imagesHtml = '';
    if (product.images && product.images.length > 0) {
        imagesHtml = `
            <div class="emergency-images-section" style="margin: 20px 0;">
                <h4 style="color: #28a745; margin-bottom: 10px;">
                    🖼️ 抽出された画像: ${product.images.length}枚
                    <button class="btn btn-info btn-sm" onclick="showAllImages('${product.item_id}')" style="margin-left: 10px;">
                        <i class="fas fa-images"></i> 全画像表示
                    </button>
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;">
                    ${product.images.slice(0, 8).map((img, index) => `
                        <div style="border: 1px solid #ddd; padding: 3px; border-radius: 4px; text-align: center; cursor: pointer;" onclick="previewImage('${img}', ${index + 1})">
                            <img src="${img}" style="max-width: 100%; height: 80px; object-fit: cover; border-radius: 3px;" alt="商品画像${index + 1}" loading="lazy">
                            <div style="font-size: 10px; color: #666; margin-top: 2px;">画像${index + 1}</div>
                        </div>
                    `).join('')}
                    ${product.images.length > 8 ? `
                        <div style="border: 1px dashed #ccc; padding: 3px; border-radius: 4px; text-align: center; display: flex; align-items: center; justify-content: center; color: #666; cursor: pointer;" onclick="showAllImages('${product.item_id}')">
                            <div style="font-size: 10px;">+${product.images.length - 8}枚を表示</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10000; overflow-y: auto;
        padding: 20px; box-sizing: border-box;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 900px; margin: 0 auto; position: relative;">
            <div style="display: flex; align-items: center; justify-content: between; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #1f2937;">📋 商品詳細情報 - ${product.item_id}</h3>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="position: absolute; top: 15px; right: 15px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px;">×</button>
            </div>
            
            <!-- Emergency Parser 成功メッセージ -->
            <div class="notification ${accuracyClass}" style="margin-bottom: 20px; padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-check-circle"></i>
                <span>🎉 Emergency Parser データ表示成功！</span>
            </div>
            
            <!-- 精度バー -->
            <div class="accuracy-bar" style="width: 100%; height: 30px; background: #e9ecef; border-radius: 15px; overflow: hidden; margin: 15px 0; position: relative;">
                <div class="accuracy-fill" style="height: 100%; width: ${qualityScore}%; background: ${accuracyColor}; transition: width 0.5s ease; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 14px;">
                    ${qualityScore}%
                </div>
            </div>
            
            <!-- 基本情報 -->
            <div class="product-basic-info" style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #1f2937;">📋 基本情報</h4>
                        <p style="margin: 5px 0;"><strong>タイトル:</strong> ${product.title || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>価格:</strong> ¥${(product.current_price || 0).toLocaleString()}</p>
                        <p style="margin: 5px 0;"><strong>状態:</strong> ${product.condition || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>カテゴリ:</strong> ${product.category || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #1f2937;">🔑 データベース情報</h4>
                        <p style="margin: 5px 0;"><strong>Item ID:</strong> ${product.item_id || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>SKU:</strong> ${product.sku || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>ソース:</strong> ヤフオク</p>
                        <p style="margin: 5px 0;"><strong>品質スコア:</strong> ${qualityScore}%</p>
                        <p style="margin: 5px 0;"><strong>抽出方法:</strong> ${product.scraping_method || 'Emergency Parser'}</p>
                    </div>
                </div>
                <div style="margin-top: 15px; text-align: center;">
                    <button class="btn btn-primary" onclick="editProductModalEditing('${product.item_id}')">
                        <i class="fas fa-edit"></i> 詳細編集
                    </button>
                    <button class="btn btn-info" onclick="viewDatabaseRecord('${product.item_id}')">
                        <i class="fas fa-database"></i> DBレコード表示
                    </button>
                </div>
            </div>
            
            ${imagesHtml}
            
            <!-- 詳細データ -->
            <details style="margin-top: 20px;">
                <summary style="cursor: pointer; padding: 10px; background: #f8f9fa; border-radius: 4px;"><strong>🔍 全データ表示</strong></summary>
                <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 11px; max-height: 300px; overflow-y: auto; margin-top: 10px;">${JSON.stringify(product, null, 2)}</pre>
            </details>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 現在の商品データをグローバルに保存
    window.currentProductData = product;
    
    addLog(`商品詳細モーダル表示: ${product.item_id}`, 'success');
}

// 画像プレビュー関数
function openImagePreview(imageUrl) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.9); z-index: 10001; display: flex; 
        align-items: center; justify-content: center; cursor: pointer;
    `;
    
    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%;">
            <img src="${imageUrl}" style="max-width: 100%; max-height: 100%; border-radius: 8px;" alt="商品画像">
            <div style="position: absolute; top: -40px; right: 0; color: white; font-size: 24px; cursor: pointer;" onclick="this.closest('div').parentElement.remove()">×</div>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
}

// editing.php用の編集モーダル（修正版）
function editProductModalEditing(itemId) {
    let product = window.currentProductData;
    
    // currentProductDataがない場合、テーブルデータから取得
    if (!product) {
        product = allData.find(item => (item.item_id || item.id) === itemId);
        if (!product) {
            alert('商品データが見つかりません');
            addLog(`編集対象商品不明: ${itemId}`, 'error');
            return;
        }
        
        // テーブルデータを編集用形式に変換
        window.currentProductData = {
            item_id: product.item_id || product.id,
            title: product.title || '',
            current_price: product.current_price || product.price || 0,
            condition: product.condition_name || '',
            category: product.category_name || '',
            description: ''
        };
        product = window.currentProductData;
    }
    
    addLog(`編集モーダル作成: ${itemId} - ${product.title}`, 'info');
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10001; overflow-y: auto;
        padding: 20px; box-sizing: border-box;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 800px; margin: 0 auto; position: relative;">
            <div style="display: flex; align-items: center; justify-content: between; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #1f2937;">✏️ 商品データ編集 - ${itemId}</h3>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="position: absolute; top: 15px; right: 15px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px;">×</button>
            </div>
            
            <form onsubmit="return saveProductEditEditing(event, '${itemId}')">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">タイトル:</label>
                        <input type="text" name="title" value="${(product.title || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">価格 (¥):</label>
                        <input type="number" name="price" value="${product.current_price || 0}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">状態:</label>
                        <select name="condition" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="新品" ${product.condition === '新品' ? 'selected' : ''}>新品</option>
                            <option value="未使用に近い" ${product.condition === '未使用に近い' ? 'selected' : ''}>未使用に近い</option>
                            <option value="目立った傷や汚れなし" ${product.condition === '目立った傷や汚れなし' ? 'selected' : ''}>目立った傷や汚れなし</option>
                            <option value="やや傷や汚れあり" ${product.condition === 'やや傷や汚れあり' ? 'selected' : ''}>やや傷や汚れあり</option>
                            <option value="傷や汚れあり" ${product.condition === '傷や汚れあり' ? 'selected' : ''}>傷や汚れあり</option>
                            <option value="全体的に状態が悪い" ${product.condition === '全体的に状態が悪い' ? 'selected' : ''}>全体的に状態が悪い</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">カテゴリ:</label>
                        <input type="text" name="category" value="${(product.category || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">説明:</label>
                    <textarea name="description" rows="4" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${(product.description || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}</textarea>
                </div>
                
                <div style="text-align: center;">
                    <button type="submit" class="btn btn-primary" style="margin-right: 10px;">
                        <i class="fas fa-save"></i> 保存
                    </button>
                    <button type="button" onclick="this.closest('div').parentElement.parentElement.parentElement.remove()" class="btn btn-secondary">
                        <i class="fas fa-times"></i> キャンセル
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// editing.php用の保存関数
function saveProductEditEditing(event, itemId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const updateData = {
        item_id: itemId,
        title: formData.get('title'),
        price: formData.get('price'),
        condition: formData.get('condition'),
        category: formData.get('category'),
        description: formData.get('description')
    };
    
    addLog(`商品データ更新開始: ${itemId}`, 'info');
    
    // editing.phpのupdate_product APIを使用
    fetch('', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `action=update_product&${new URLSearchParams(updateData).toString()}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addLog(`商品データ更新成功: ${itemId}`, 'success');
            showNotification('商品データを更新しました', 'success');
            
            // モーダルを閉じる
            event.target.closest('div').parentElement.parentElement.remove();
            
            // データを再読み込み
            loadEditingData();
            
        } else {
            addLog(`商品データ更新失敗: ${data.message}`, 'error');
            showError('更新に失敗しました: ' + data.message);
        }
    })
    .catch(error => {
        addLog(`商品データ更新エラー: ${error.message}`, 'error');
        showError('エラーが発生しました: ' + error.message);
    });
    
    return false;
}

function deleteProduct(productId, productTitle = '') {
    if (!productId) {
        showError('商品IDが不正です');
        return;
    }
    
    const confirmMessage = productTitle 
        ? `商品「${productTitle}」を削除しますか？\nこの操作は取り消せません。`
        : `商品ID「${productId}」を削除しますか？\nこの操作は取り消せません。`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    addLog(`商品削除処理開始: ID ${productId}`, 'warning');
    
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
            
            // データ配列からも削除
            allData = allData.filter(item => (item.id || item.item_id) !== productId);
            totalItems--;
            
        } else {
            showError(data.message);
            addLog(`商品削除失敗: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error('削除エラー:', error);
        showError('削除処理中にエラーが発生しました');
        addLog(`商品削除エラー: ${error.message}`, 'error');
    });
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    addLog('Yahoo Auction データ編集システム起動完了', 'success');
});
