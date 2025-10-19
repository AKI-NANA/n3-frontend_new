/**
 * NAGANO3 在庫管理システム JavaScript - Hook統合版
 * Hook統合・Ajax通信・リアルタイム更新・エラーハンドリング
 * CAIDS準拠: 既存Hook活用・統合システム対応
 */

// グローバル変数
let inventoryData = [];
let filteredData = [];
let systemIntegrationStatus = {};

// API エンドポイント設定（N3準拠: index.php経由）
const API_ENDPOINTS = {
    getInventory: 'index.php',
    addItem: 'index.php',
    updateItem: 'index.php',
    searchInventory: 'index.php',
    systemStatus: 'index.php',
    ebaySync: 'index.php'
};

// CSRF トークンを設定（N3準拠）
const CSRF_TOKEN = document.querySelector('meta[name="csrf-token"]')?.content || window.CSRF_TOKEN || '';

/**
 * 在庫データ読み込み - Hook統合版
 */
async function loadInventoryData(filters = {}) {
    try {
        showLoadingSpinner('在庫データ読み込み中...');
        
        // N3準拠 FormData使用・CSRFトークン付き
        const formData = new FormData();
        formData.append('action', 'get_inventory');
        formData.append('csrf_token', CSRF_TOKEN);
        formData.append('filters', JSON.stringify(filters));
        formData.append('use_hook_integration', 'true');
        
        const response = await fetch(API_ENDPOINTS.getInventory, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            inventoryData = result.data || [];
            filteredData = [...inventoryData];
            
            renderInventoryTable();
            updateStatistics();
            
            // Hook統合情報表示
            if (result.hook_integrations_used && result.hook_integrations_used.length > 0) {
                console.log('🔗 Hook統合でデータ取得:', result.hook_integrations_used);
            } else if (result.fallback_used) {
                console.log('📦 フォールバックデータ使用:', result.fallback_reason || 'Hook統合未利用');
            }
            
        } else {
            throw new Error(result.error || '在庫データ取得失敗');
        }
        
    } catch (error) {
        console.error('在庫データ読み込みエラー:', error);
        showMessage(`データ読み込みエラー: ${error.message}`, 'error');
        
        // エラー時はデモデータを表示
        loadDemoData();
    }
}

/**
 * デモデータ読み込み
 */
function loadDemoData() {
    console.log('📋 デモデータを読み込み中...');
    
    inventoryData = [
        {
            id: 1,
            sku_id: 'DEMO_001',
            title: 'iPhone 12 64GB - デモ商品',
            category: 'Electronics',
            stock_quantity: 5,
            stock_type: '有在庫',
            condition_status: '中古',
            selling_price: 450.00,
            purchase_price: 300.00,
            expected_profit: 150.00,
            currency: 'USD',
            listing_status: '未出品',
            watchers_count: 12,
            views_count: 89,
            danger_level: 1,
            data_source: 'demo',
            ebay_item_id: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: 2,
            sku_id: 'DEMO_002',
            title: 'MacBook Air M1 - デモ商品',
            category: 'Electronics',
            stock_quantity: 0,
            stock_type: '無在庫',
            condition_status: '新品',
            selling_price: 899.00,
            purchase_price: 750.00,
            expected_profit: 149.00,
            currency: 'USD',
            listing_status: '出品中',
            watchers_count: 25,
            views_count: 156,
            danger_level: 0,
            data_source: 'demo',
            ebay_item_id: 'DEMO_EBAY_123',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ];
    
    filteredData = [...inventoryData];
    renderInventoryTable();
    updateStatistics();
    
    showMessage('デモデータを表示中 - Hook統合有効化で実データ利用可能', 'info');
}

/**
 * 在庫テーブル描画
 */
function renderInventoryTable() {
    const tbody = document.getElementById('inventory-tbody');
    
    if (filteredData.length === 0) {
        showNoDataMessage();
        return;
    }
    
    tbody.innerHTML = filteredData.map(item => `
        <tr>
            <td><input type="checkbox" class="item-checkbox" value="${item.id}"></td>
            <td><strong>${escapeHtml(item.sku_id)}</strong></td>
            <td>
                <div class="fw-bold">${truncateText(escapeHtml(item.title), 40)}</div>
                ${renderListingPlatforms(item.listing_platforms)}
            </td>
            <td><span class="badge bg-light text-dark">${escapeHtml(item.category || '未分類')}</span></td>
            <td class="text-center">
                <input type="number" class="form-control form-control-sm" 
                       value="${item.stock_quantity}" 
                       min="0" 
                       style="width: 70px; display: inline-block;"
                       onchange="updateStock(${item.id}, this.value)"
                       data-item-id="${item.id}"
                       ${item.data_source === 'demo' ? 'disabled' : ''}>
            </td>
            <td>
                <select class="form-select form-select-sm" 
                        onchange="updateStockType(${item.id}, this.value)"
                        ${item.data_source === 'demo' ? 'disabled' : ''}>
                    <option value="有在庫" ${item.stock_type === '有在庫' ? 'selected' : ''}>有在庫</option>
                    <option value="無在庫" ${item.stock_type === '無在庫' ? 'selected' : ''}>無在庫</option>
                    <option value="ハイブリッド" ${item.stock_type === 'ハイブリッド' ? 'selected' : ''}>ハイブリッド</option>
                </select>
            </td>
            <td><span class="badge bg-info">${escapeHtml(item.condition_status)}</span></td>
            <td class="text-end">$${(item.selling_price || 0).toFixed(2)}</td>
            <td class="text-end">$${(item.purchase_price || 0).toFixed(2)}</td>
            <td class="text-end">
                <span class="fw-bold ${(item.expected_profit || 0) > 0 ? 'text-success' : 'text-danger'}">
                    $${(item.expected_profit || 0).toFixed(2)}
                </span>
            </td>
            <td>
                <span class="badge ${getListingStatusBadgeClass(item.listing_status)}">${item.listing_status}</span>
            </td>
            <td class="text-center">${item.watchers_count || 0}</td>
            <td class="text-center">${item.views_count || 0}</td>
            <td class="text-center">
                <span class="badge ${getDangerLevelBadgeClass(item.danger_level)}">${item.danger_level || 0}</span>
            </td>
            <td>
                <span class="badge ${getDataSourceBadgeClass(item.data_source)}">${item.data_source || 'manual'}</span>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" 
                            onclick="editItem(${item.id})" 
                            title="編集"
                            ${item.data_source === 'demo' ? 'disabled' : ''}>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-info" 
                            onclick="viewItemDetails(${item.id})" 
                            title="詳細">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${item.ebay_item_id ? `
                        <a href="https://www.ebay.com/itm/${item.ebay_item_id}" 
                           target="_blank" 
                           class="btn btn-outline-secondary" 
                           title="eBayで表示">
                            <i class="fab fa-ebay"></i>
                        </a>
                    ` : ''}
                    ${item.data_source === 'ebay_sync' ? `
                        <button class="btn btn-outline-warning" 
                                onclick="syncSingleEbayItem(${item.id})" 
                                title="eBay再同期">
                            <i class="fas fa-sync"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
    
    // アイテム数更新
    document.getElementById('items-count').textContent = `${filteredData.length} 件`;
}

/**
 * 統計情報更新
 */
function updateStatistics() {
    const total = inventoryData.length;
    const inStock = inventoryData.filter(item => item.stock_type === '有在庫').length;
    const outOfStock = inventoryData.filter(item => item.stock_type === '無在庫').length;
    const listed = inventoryData.filter(item => item.listing_status === '出品中').length;
    
    document.getElementById('total-items').textContent = total;
    document.getElementById('in-stock-items').textContent = inStock;
    document.getElementById('out-of-stock-items').textContent = outOfStock;
    document.getElementById('listed-items').textContent = listed;
}

/**
 * 検索実行 - Hook統合版
 */
async function searchItems() {
    const query = document.getElementById('search-input').value.trim();
    
    if (!query) {
        applyFilters();
        return;
    }
    
    try {
        showLoadingSpinner('検索中...');
        
        // N3準拠 FormData使用
        const formData = new FormData();
        formData.append('action', 'search_inventory');
        formData.append('csrf_token', CSRF_TOKEN);
        formData.append('query', query);
        formData.append('filters', JSON.stringify(getCurrentFilters()));
        formData.append('use_hook_integration', 'true');
        
        const response = await fetch(API_ENDPOINTS.searchInventory, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            filteredData = result.data || [];
            renderInventoryTable();
            
            showMessage(`検索結果: ${filteredData.length}件`, 'info');
            
            // Hook統合情報表示
            if (result.hook_integrations_used) {
                console.log('🔍 検索完了 (Hook統合):', result.hook_integrations_used);
            }
        } else {
            // フォールバック: クライアント側検索
            filteredData = inventoryData.filter(item => {
                return item.title.toLowerCase().includes(query.toLowerCase()) ||
                       item.sku_id.toLowerCase().includes(query.toLowerCase());
            });
            renderInventoryTable();
            showMessage(`ローカル検索結果: ${filteredData.length}件`, 'warning');
        }
        
    } catch (error) {
        console.error('検索エラー:', error);
        
        // エラー時はローカル検索にフォールバック
        filteredData = inventoryData.filter(item => {
            return item.title.toLowerCase().includes(query.toLowerCase()) ||
                   item.sku_id.toLowerCase().includes(query.toLowerCase());
        });
        renderInventoryTable();
        showMessage(`検索エラー - ローカル検索実行: ${filteredData.length}件`, 'warning');
    }
}

/**
 * フィルタ適用
 */
function applyFilters() {
    const filters = getCurrentFilters();
    
    filteredData = inventoryData.filter(item => {
        let matches = true;
        
        if (filters.stock_type && item.stock_type !== filters.stock_type) {
            matches = false;
        }
        
        if (filters.listing_status && item.listing_status !== filters.listing_status) {
            matches = false;
        }
        
        return matches;
    });
    
    renderInventoryTable();
    showMessage(`フィルタ適用: ${filteredData.length}件表示`, 'info');
}

/**
 * 現在のフィルタ設定取得
 */
function getCurrentFilters() {
    return {
        stock_type: document.getElementById('stock-type-filter').value,
        listing_status: document.getElementById('listing-status-filter').value
    };
}

/**
 * 新規アイテム追加モーダル表示
 */
function showAddItemModal() {
    const modal = new bootstrap.Modal(document.getElementById('addItemModal'));
    modal.show();
}

/**
 * 新規アイテム追加 - Hook統合版
 */
async function addNewItem() {
    const form = document.getElementById('add-item-form');
    const formData = new FormData(form);
    
    // フォームデータをオブジェクトに変換
    const itemData = {};
    for (let [key, value] of formData.entries()) {
        if (value !== '') {
            // 数値フィールドの変換
            if (['stock_quantity', 'selling_price', 'purchase_price', 'danger_level'].includes(key)) {
                itemData[key] = parseFloat(value) || 0;
            } else {
                itemData[key] = value;
            }
        }
    }
    
    // 見込み利益計算
    if (itemData.selling_price && itemData.purchase_price) {
        itemData.expected_profit = itemData.selling_price - itemData.purchase_price;
    }
    
    // Hook統合フラグ
    itemData.data_source = 'manual';
    
    try {
        showLoadingSpinner('追加中...');
        
        const response = await fetch(API_ENDPOINTS.addItem, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                action: 'add_item',
                item_data: itemData,
                use_hook_integration: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // モーダルを閉じる
            const modal = bootstrap.Modal.getInstance(document.getElementById('addItemModal'));
            modal.hide();
            
            // フォームリセット
            form.reset();
            
            // 在庫データ再読み込み
            await loadInventoryData();
            
            // Hook統合情報表示
            let message = '新規アイテム追加完了';
            if (result.hook_integrations_used && result.hook_integrations_used.length > 0) {
                message += ` (Hook統合: ${result.hook_integrations_used.join(', ')})`;
            }
            showMessage(message, 'success');
            
        } else {
            showMessage(`追加エラー: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('アイテム追加エラー:', error);
        showMessage(`追加エラー: ${error.message}`, 'error');
    }
}

/**
 * 在庫数更新 - Hook統合版
 */
async function updateStock(itemId, newQuantity) {
    try {
        const response = await fetch(API_ENDPOINTS.updateItem, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                action: 'update_item',
                item_id: itemId,
                update_data: {
                    stock_quantity: parseInt(newQuantity)
                },
                use_hook_integration: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // ローカルデータ更新
            const item = inventoryData.find(item => item.id == itemId);
            if (item) {
                item.stock_quantity = parseInt(newQuantity);
                item.updated_at = new Date().toISOString();
                updateStatistics();
            }
            
            showMessage('在庫数更新完了', 'success');
            
            // Hook統合情報ログ出力
            if (result.hook_integrations_used) {
                console.log('📦 在庫更新完了 (Hook統合):', result.hook_integrations_used);
            }
            
        } else {
            showMessage(`更新エラー: ${result.error}`, 'error');
            // 元の値に戻す
            const input = document.querySelector(`input[data-item-id="${itemId}"]`);
            const originalItem = inventoryData.find(item => item.id == itemId);
            if (input && originalItem) {
                input.value = originalItem.stock_quantity;
            }
        }
        
    } catch (error) {
        console.error('在庫更新エラー:', error);
        showMessage(`更新エラー: ${error.message}`, 'error');
    }
}

/**
 * 在庫タイプ更新 - Hook統合版
 */
async function updateStockType(itemId, newStockType) {
    try {
        const response = await fetch(API_ENDPOINTS.updateItem, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                action: 'update_item',
                item_id: itemId,
                update_data: {
                    stock_type: newStockType
                },
                use_hook_integration: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // ローカルデータ更新
            const item = inventoryData.find(item => item.id == itemId);
            if (item) {
                item.stock_type = newStockType;
                item.updated_at = new Date().toISOString();
                updateStatistics();
            }
            
            showMessage('在庫タイプ更新完了', 'success');
        } else {
            showMessage(`更新エラー: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('在庫タイプ更新エラー:', error);
        showMessage(`更新エラー: ${error.message}`, 'error');
    }
}

/**
 * 在庫データ更新
 */
async function refreshInventory() {
    showMessage('在庫データ更新中...', 'info');
    await loadInventoryData();
}

/**
 * eBay同期実行 - Hook統合版
 */
async function syncWithEbay() {
    try {
        showLoadingSpinner('eBay同期中...');
        
        const response = await fetch(API_ENDPOINTS.ebaySync, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                action: 'full_sync',
                use_hook_integration: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(`eBay同期完了: ${result.sync_statistics?.items_processed || 0}件処理`, 'success');
            
            // 在庫データ再読み込み
            await loadInventoryData();
            
            console.log('🔄 eBay同期完了:', result);
        } else {
            showMessage(`eBay同期エラー: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('eBay同期エラー:', error);
        showMessage(`eBay同期エラー: ${error.message}`, 'error');
    }
}

/**
 * 単一eBayアイテム同期
 */
async function syncSingleEbayItem(itemId) {
    const item = inventoryData.find(i => i.id == itemId);
    if (!item || !item.ebay_item_id) {
        showMessage('eBayアイテムIDが見つかりません', 'warning');
        return;
    }
    
    try {
        showMessage(`eBayアイテム同期中: ${item.ebay_item_id}`, 'info');
        
        const response = await fetch(API_ENDPOINTS.ebaySync, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                action: 'sync_single_item',
                ebay_item_id: item.ebay_item_id,
                inventory_item_id: itemId,
                use_hook_integration: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('eBayアイテム同期完了', 'success');
            await loadInventoryData();
        } else {
            showMessage(`eBayアイテム同期エラー: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('eBayアイテム同期エラー:', error);
        showMessage(`eBayアイテム同期エラー: ${error.message}`, 'error');
    }
}

/**
 * システム状態表示
 */
async function showSystemStatus() {
    const modal = new bootstrap.Modal(document.getElementById('systemStatusModal'));
    modal.show();
    
    await refreshSystemStatus();
}

/**
 * システム状態更新
 */
async function refreshSystemStatus() {
    const contentDiv = document.getElementById('system-status-content');
    
    contentDiv.innerHTML = `
        <div class="text-center">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">読み込み中...</span>
            </div>
            <p class="mt-2">システム状態を取得中...</p>
        </div>
    `;
    
    try {
        const response = await fetch(API_ENDPOINTS.systemStatus, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                action: 'get_system_status'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            systemIntegrationStatus = result.data;
            renderSystemStatus(result.data);
        } else {
            throw new Error(result.error || 'システム状態取得失敗');
        }
        
    } catch (error) {
        console.error('システム状態取得エラー:', error);
        contentDiv.innerHTML = `
            <div class="alert alert-danger">
                <h6>システム状態取得エラー</h6>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * システム状態描画
 */
function renderSystemStatus(statusData) {
    const contentDiv = document.getElementById('system-status-content');
    
    const hookStatus = statusData.hook_availability || {};
    const capabilities = statusData.integration_capabilities || [];
    const recommendations = statusData.system_recommendations || [];
    const performance = statusData.performance_metrics || {};
    
    contentDiv.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6><i class="fas fa-cogs"></i> Hook統合状況</h6>
                <div class="list-group list-group-flush">
                    ${Object.entries(hookStatus).map(([hookName, status]) => `
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${status.description || hookName}</strong>
                                <br><small class="text-muted">${hookName}</small>
                            </div>
                            <span class="badge ${status.available ? 'bg-success' : 'bg-secondary'}">
                                ${status.status}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="col-md-6">
                <h6><i class="fas fa-chart-line"></i> パフォーマンス</h6>
                <div class="card">
                    <div class="card-body">
                        <div class="row text-center">
                            <div class="col-6">
                                <h4 class="text-primary">${performance.success_rate?.toFixed(1) || 0}%</h4>
                                <small>成功率</small>
                            </div>
                            <div class="col-6">
                                <h4 class="text-info">${performance.total_operations || 0}</h4>
                                <small>総操作数</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <hr>
        
        <div class="row">
            <div class="col-md-6">
                <h6><i class="fas fa-star"></i> 利用可能機能</h6>
                <div class="d-flex flex-wrap gap-1">
                    ${capabilities.map(capability => `
                        <span class="badge bg-primary">${capability}</span>
                    `).join('')}
                </div>
            </div>
            <div class="col-md-6">
                <h6><i class="fas fa-lightbulb"></i> 推奨事項</h6>
                <ul class="list-unstyled">
                    ${recommendations.map(rec => `
                        <li><i class="fas fa-arrow-right text-warning"></i> ${rec}</li>
                    `).join('')}
                </ul>
            </div>
        </div>
        
        <hr>
        
        <div class="row">
            <div class="col-12">
                <h6><i class="fas fa-info-circle"></i> システム情報</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <tr>
                            <td><strong>最終更新:</strong></td>
                            <td>${new Date(statusData.timestamp).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td><strong>統合アクティブ:</strong></td>
                            <td>${statusData.system_status?.integration_active ? '✅ はい' : '❌ いいえ'}</td>
                        </tr>
                        <tr>
                            <td><strong>読み込み済みHook数:</strong></td>
                            <td>${statusData.system_status?.hooks_loaded || 0}</td>
                        </tr>
                        <tr>
                            <td><strong>最終同期:</strong></td>
                            <td>${statusData.system_status?.last_sync ? new Date(statusData.system_status.last_sync).toLocaleString() : '未実行'}</td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
    `;
}

/**
 * アイテム編集
 */
function editItem(itemId) {
    const item = inventoryData.find(item => item.id == itemId);
    if (!item) return;
    
    if (item.data_source === 'demo') {
        showMessage('デモデータは編集できません', 'warning');
        return;
    }
    
    // 編集モーダルを表示（簡易版）
    const newTitle = prompt('商品名を編集:', item.title);
    if (newTitle && newTitle !== item.title) {
        updateItemField(itemId, 'title', newTitle);
    }
}

/**
 * アイテム詳細表示
 */
function viewItemDetails(itemId) {
    const item = inventoryData.find(item => item.id == itemId);
    if (!item) return;
    
    const details = `
アイテム詳細:

SKU: ${item.sku_id}
商品名: ${item.title}
カテゴリ: ${item.category || '未分類'}
在庫数: ${item.stock_quantity}
在庫タイプ: ${item.stock_type}
商品状態: ${item.condition_status}
販売価格: $${item.selling_price || 0}
仕入れ価格: $${item.purchase_price || 0}
見込み利益: $${item.expected_profit || 0}
出品状況: ${item.listing_status}
危険度: ${item.danger_level}/5
データソース: ${item.data_source}
${item.ebay_item_id ? `eBayアイテムID: ${item.ebay_item_id}` : ''}
作成日: ${item.created_at ? new Date(item.created_at).toLocaleString() : '不明'}
更新日: ${item.updated_at ? new Date(item.updated_at).toLocaleString() : '不明'}
    `;
    
    alert(details);
}

/**
 * アイテムフィールド更新
 */
async function updateItemField(itemId, fieldName, newValue) {
    try {
        const updateData = {};
        updateData[fieldName] = newValue;
        
        const response = await fetch(API_ENDPOINTS.updateItem, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                action: 'update_item',
                item_id: itemId,
                update_data: updateData,
                use_hook_integration: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // ローカルデータ更新
            const item = inventoryData.find(item => item.id == itemId);
            if (item) {
                item[fieldName] = newValue;
                item.updated_at = new Date().toISOString();
                renderInventoryTable();
            }
            
            showMessage('フィールド更新完了', 'success');
        } else {
            showMessage(`更新エラー: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('フィールド更新エラー:', error);
        showMessage(`更新エラー: ${error.message}`, 'error');
    }
}

/**
 * 全選択切り替え
 */
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('select-all');
    const itemCheckboxes = document.querySelectorAll('.item-checkbox');
    
    itemCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

/**
 * CSV出力
 */
function exportToCSV() {
    if (filteredData.length === 0) {
        showMessage('出力するデータがありません', 'warning');
        return;
    }
    
    // CSV ヘッダー
    const headers = [
        'SKU ID', '商品名', 'カテゴリ', '在庫数', '在庫タイプ', '商品状態',
        '販売価格', '仕入れ価格', '見込み利益', '通貨', '出品状況',
        'ウォッチャー数', 'ビュー数', '危険度', 'データソース', 'eBayアイテムID',
        '作成日', '更新日'
    ];
    
    // CSV データ
    const csvData = filteredData.map(item => [
        item.sku_id,
        item.title,
        item.category || '',
        item.stock_quantity,
        item.stock_type,
        item.condition_status,
        item.selling_price || '',
        item.purchase_price || '',
        item.expected_profit || '',
        item.currency || 'USD',
        item.listing_status,
        item.watchers_count || 0,
        item.views_count || 0,
        item.danger_level || 0,
        item.data_source || 'manual',
        item.ebay_item_id || '',
        item.created_at || '',
        item.updated_at || ''
    ]);
    
    // CSV文字列作成
    const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    
    // ダウンロード
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    
    showMessage(`CSV出力完了: ${filteredData.length}件`, 'success');
}

/**
 * ユーティリティ関数
 */

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getListingStatusBadgeClass(status) {
    switch (status) {
        case '出品中': return 'bg-success';
        case '未出品': return 'bg-secondary';
        case '在庫切れ': return 'bg-danger';
        default: return 'bg-light text-dark';
    }
}

function getDangerLevelBadgeClass(level) {
    if (level >= 4) return 'bg-danger';
    if (level >= 2) return 'bg-warning';
    return 'bg-success';
}

function getDataSourceBadgeClass(source) {
    switch (source) {
        case 'ebay_sync': return 'bg-info';
        case 'hook_integration': return 'bg-primary';
        case 'demo': return 'bg-warning';
        default: return 'bg-secondary';
    }
}

function renderListingPlatforms(platforms) {
    if (!platforms || platforms.length === 0) return '';
    
    const platformIcons = {
        'ebay': '<i class="fab fa-ebay"></i>',
        'mercari': '<i class="fas fa-store"></i>',
        'shopify': '<i class="fab fa-shopify"></i>'
    };
    
    return '<div class="mt-1">' + 
        platforms.map(platform => 
            `<small class="badge bg-light text-dark me-1">${platformIcons[platform] || ''} ${platform}</small>`
        ).join('') + 
        '</div>';
}

function showLoadingSpinner(message = '読み込み中...') {
    const tbody = document.getElementById('inventory-tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="16" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">読み込み中...</span>
                </div>
                <p class="mt-3">${message}</p>
            </td>
        </tr>
    `;
}

function showNoDataMessage() {
    const tbody = document.getElementById('inventory-tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="16" class="text-center text-muted py-5">
                <i class="fas fa-inbox fa-3x mb-3"></i>
                <p>在庫データがありません</p>
                <button class="btn btn-primary" onclick="showAddItemModal()">
                    <i class="fas fa-plus"></i> 最初のアイテムを追加
                </button>
            </td>
        </tr>
    `;
}

function showMessage(message, type) {
    // 既存のメッセージを削除
    const existingAlert = document.querySelector('.alert-dismissible');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type] || 'alert-info';
    
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show position-fixed" 
             style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', alertHtml);
    
    // 5秒後に自動削除
    setTimeout(() => {
        const alert = document.querySelector('.alert-dismissible');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

// 検索フィールドでのEnterキー対応
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchItems();
            }
        });
    }
});
