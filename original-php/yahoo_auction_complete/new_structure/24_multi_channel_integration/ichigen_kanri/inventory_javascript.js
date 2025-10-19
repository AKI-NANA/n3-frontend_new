
// CAIDS character_limit Hook
// CAIDS character_limit Hook - 基本実装
console.log('✅ character_limit Hook loaded');

// CAIDS ajax_integration Hook
// CAIDS ajax_integration Hook - 基本実装
console.log('✅ ajax_integration Hook loaded');

// CAIDS error_handling Hook

// CAIDS エラー処理Hook - 完全実装
window.CAIDS_ERROR_HANDLER = {
    isActive: true,
    errorCount: 0,
    errorHistory: [],
    
    initialize: function() {
        this.setupGlobalErrorHandler();
        this.setupUnhandledPromiseRejection();
        this.setupNetworkErrorHandler();
        console.log('⚠️ CAIDS エラーハンドリングシステム完全初期化');
    },
    
    setupGlobalErrorHandler: function() {
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
    },
    
    setupUnhandledPromiseRejection: function() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack
            });
        });
    },
    
    setupNetworkErrorHandler: function() {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            try {
                const response = await originalFetch.apply(this, args);
                if (!response.ok) {
                    window.CAIDS_ERROR_HANDLER.handleError({
                        type: 'Network Error',
                        message: `HTTP ${response.status}: ${response.statusText}`,
                        url: args[0]
                    });
                }
                return response;
            } catch (error) {
                window.CAIDS_ERROR_HANDLER.handleError({
                    type: 'Network Fetch Error',
                    message: error.message,
                    url: args[0]
                });
                throw error;
            }
        };
    },
    
    handleError: function(errorInfo) {
        this.errorCount++;
        this.errorHistory.push({...errorInfo, timestamp: new Date().toISOString()});
        
        console.error('🚨 CAIDS Error Handler:', errorInfo);
        this.showErrorNotification(errorInfo);
        this.reportError(errorInfo);
    },
    
    showErrorNotification: function(errorInfo) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 10px; right: 10px; z-index: 999999;
            background: linear-gradient(135deg, #ff4444, #cc0000);
            color: white; padding: 15px 20px; border-radius: 8px;
            max-width: 350px; box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            border: 2px solid #ff6666; animation: caids-error-shake 0.5s ease-in-out;
        `;
        errorDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">🚨</span>
                <div>
                    <strong>エラーが発生しました</strong><br>
                    <small style="opacity: 0.9;">${errorInfo.type}: ${errorInfo.message}</small>
                </div>
            </div>
        `;
        
        // CSS Animation
        if (!document.getElementById('caids-error-styles')) {
            const style = document.createElement('style');
            style.id = 'caids-error-styles';
            style.textContent = `
                @keyframes caids-error-shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 7000);
    },
    
    reportError: function(errorInfo) {
        // エラーレポート生成・送信（将来の拡張用）
        const report = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            errorCount: this.errorCount,
            sessionId: this.getSessionId(),
            ...errorInfo
        };
        
        console.log('📋 CAIDS Error Report:', report);
        localStorage.setItem('caids_last_error', JSON.stringify(report));
    },
    
    getSessionId: function() {
        let sessionId = sessionStorage.getItem('caids_session_id');
        if (!sessionId) {
            sessionId = 'caids_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('caids_session_id', sessionId);
        }
        return sessionId;
    },
    
    getErrorStats: function() {
        return {
            totalErrors: this.errorCount,
            recentErrors: this.errorHistory.slice(-10),
            sessionId: this.getSessionId()
        };
    }
};

window.CAIDS_ERROR_HANDLER.initialize();

/**
 * 在庫管理JavaScript
 * Emverze SaaS - 在庫管理ページ専用スクリプト
 */

// デモモード設定
const DEMO_MODE = true;

// CSRFトークン取得関数
function getCSRFToken() {
    return window.NAGANO3_CONFIG?.csrf_token ||
           window.CSRF_TOKEN ||
           window.csrf_token ||
           document.querySelector('meta[name="csrf-token"]')?.content ||
           document.querySelector('input[name="csrf_token"]')?.value ||
           '';
}

// 在庫管理クラス
class InventoryManager {
    constructor() {
        this.filters = {};
        this.selectedProducts = new Set();
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.demoData = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        
        if (DEMO_MODE) {
            // デモデータを初期化
            this.initDemoData();
        } else {
            // 実際のAPIからデータを取得
            await this.loadInventoryData();
        }
    }

    setupEventListeners() {
        // 在庫入力フィールドの変更監視
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('stock-input') && !e.target.classList.contains('readonly')) {
                this.handleStockInputChange(e.target);
            }
        });

        // 在庫追加フォーム送信
        const addForm = document.getElementById('add-inventory-form');
        if (addForm) {
            addForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addInventory();
            });
        }

        // 在庫編集フォーム送信
        const editForm = document.getElementById('edit-inventory-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateInventory();
            });
        }

        // 同期フォーム送信
        const syncForm = document.getElementById('sync-form');
        if (syncForm) {
            syncForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.syncInventory();
            });
        }
    }

    initDemoData() {
        // デモデータはすでにHTMLに埋め込まれているので、
        // 統計情報の更新のみ行う
        this.updateStatistics();
    }

    async loadInventoryData() {
        try {
            this.showUpdateIndicator();
            
            // APIから在庫データを取得
            const queryParams = new URLSearchParams();
            Object.entries(this.filters).forEach(([key, value]) => {
                if (value) {
                    queryParams.append(key, value);
                }
            });
            queryParams.append('page', this.currentPage);
            queryParams.append('per_page', this.itemsPerPage);
            
            const response = await fetch(`/api/inventory?${queryParams.toString()}`);
            if (!response.ok) {
                throw new Error('在庫データの取得に失敗しました');
            }
            
            const data = await response.json();
            this.renderInventoryTable(data.items);
            this.renderPagination(data.total_pages);
            this.updateStatistics(data.statistics);
            
            document.getElementById('last-update').textContent = new Date().toLocaleString();
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideUpdateIndicator();
        }
    }

    handleStockInputChange(input) {
        const productId = input.dataset.productId;
        const stockType = input.dataset.stockType;
        const value = parseInt(input.value) || 0;
        
        const row = input.closest('tr');
        
        // 表示在庫を自動更新
        const physicalStockInput = row.querySelector('[data-stock-type="physical"]');
        const virtualStockInput = row.querySelector('[data-stock-type="virtual"]');
        
        if (physicalStockInput && virtualStockInput) {
            const physicalStock = parseInt(physicalStockInput.value) || 0;
            const virtualStock = parseInt(virtualStockInput.value) || 0;
            
            let displayStock = 0;
            if (physicalStock > 0) {
                displayStock = Math.max(0, physicalStock - 1); // 安全マージン
            } else {
                displayStock = Math.max(0, virtualStock - 1);
            }
            
            // 表示在庫を更新
            const stockBadge = row.querySelector('.stock-badge');
            if (stockBadge) {
                stockBadge.textContent = displayStock;
                
                // スタイルも更新
                stockBadge.classList.remove('out-of-stock', 'low-stock', 'in-stock');
                if (displayStock <= 0) {
                    stockBadge.classList.add('out-of-stock');
                } else if (displayStock <= 3) {
                    stockBadge.classList.add('low-stock');
                } else {
                    stockBadge.classList.add('in-stock');
                }
            }
            
            if (DEMO_MODE) {
                // デモモードでは即時表示を反映
                this.showToast('在庫を更新しました', 'success');
            } else {
                // 実際のAPIに在庫更新をリクエスト
                this.updateStockViaApi(productId, stockType, value);
            }
        }
    }

    async updateStockViaApi(productId, stockType, value) {
        try {
            const response = await fetch(`/api/inventory/${productId}/stock`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    stock_type: stockType,
                    value: value
                })
            });

            if (!response.ok) {
                throw new Error('在庫更新に失敗しました');
            }

            const result = await response.json();
            this.showToast('在庫を更新しました', 'success');
            
            // 統計情報を更新
            this.updateStatistics();
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async addInventory() {
        const formData = {
            product_id: document.getElementById('product-select').value,
            physical_stock: parseInt(document.getElementById('physical-stock-input').value) || 0,
            virtual_stock: parseInt(document.getElementById('virtual-stock-input').value) || 0,
            reason: document.getElementById('adjustment-reason').value
        };

        if (!formData.product_id) {
            this.showToast('商品を選択してください', 'error');
            return;
        }

        try {
            if (DEMO_MODE) {
                // デモモード: 成功をシミュレート
                this.showToast('在庫を追加しました', 'success');
                this.closeModal('add-inventory-modal');
                return;
            }

            const response = await fetch('/api/inventory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('在庫追加に失敗しました');
            }

            const result = await response.json();
            this.showToast('在庫を追加しました', 'success');
            this.closeModal('add-inventory-modal');
            await this.loadInventoryData(); // テーブル再読み込み
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async updateInventory() {
        const productId = document.getElementById('edit-product-id').value;
        const formData = {
            physical_stock: parseInt(document.getElementById('edit-physical-stock').value) || 0,
            virtual_stock: parseInt(document.getElementById('edit-virtual-stock').value) || 0,
            price: parseFloat(document.getElementById('edit-price').value) || 0,
            risk_level: parseInt(document.getElementById('edit-risk-level').value),
            reason: document.getElementById('edit-reason').value
        };

        try {
            if (DEMO_MODE) {
                // デモモード: 成功をシミュレート
                this.showToast('在庫を更新しました', 'success');
                this.closeModal('edit-inventory-modal');
                return;
            }

            const response = await fetch(`/api/inventory/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('在庫更新に失敗しました');
            }

            const result = await response.json();
            this.showToast('在庫を更新しました', 'success');
            this.closeModal('edit-inventory-modal');
            await this.loadInventoryData(); // テーブル再読み込み
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async syncInventory() {
        const syncData = {
            target: document.getElementById('sync-target').value,
            platforms: {
                shopify: document.getElementById('sync-shopify').checked,
                ebay: document.getElementById('sync-ebay').checked,
                amazon: document.getElementById('sync-amazon').checked
            },
            options: {
                inventory_only: document.getElementById('sync-inventory-only').checked,
                include_price: document.getElementById('sync-price').checked
            }
        };

        try {
            if (DEMO_MODE) {
                // デモモード: 同期プロセスをシミュレート
                this.showToast('同期を開始しました', 'info');
                this.closeModal('sync-modal');
                
                setTimeout(() => {
                    this.showToast('同期が完了しました', 'success');
                    this.updateStatistics();
                }, 3000);
                return;
            }

            const response = await fetch('/api/inventory/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify(syncData)
            });

            if (!response.ok) {
                throw new Error('同期開始に失敗しました');
            }

            const result = await response.json();
            this.showToast('同期を開始しました', 'info');
            this.closeModal('sync-modal');
            
            // 同期状況を定期的にチェック
            this.checkSyncStatus(result.task_id);
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async checkSyncStatus(taskId) {
        try {
            const response = await fetch(`/api/inventory/sync/${taskId}/status`);
            const result = await response.json();
            
            if (result.status === 'completed') {
                this.showToast('同期が完了しました', 'success');
                await this.loadInventoryData();
            } else if (result.status === 'failed') {
                this.showToast('同期に失敗しました', 'error');
            } else {
                // まだ進行中の場合、3秒後に再チェック
                setTimeout(() => this.checkSyncStatus(taskId), 3000);
            }
        } catch (error) {
            this.showToast('同期状況の確認に失敗しました', 'error');
        }
    }

    updateStatistics(stats = null) {
        if (DEMO_MODE && !stats) {
            // デモデータの統計を更新
            const demoStats = {
                total_products: 65,
                in_stock: 48,
                low_stock: 12,
                out_of_stock: 5,
                inventory_value: 540000
            };
            
            document.getElementById('total-products').textContent = demoStats.total_products;
            document.getElementById('in-stock-products').textContent = demoStats.in_stock;
            document.getElementById('low-stock-products').textContent = demoStats.low_stock;
            document.getElementById('out-of-stock-products').textContent = demoStats.out_of_stock;
            document.getElementById('inventory-value').textContent = `¥${demoStats.inventory_value.toLocaleString()}`;
            
            return;
        }

        if (stats) {
            document.getElementById('total-products').textContent = stats.total_products;
            document.getElementById('in-stock-products').textContent = stats.in_stock;
            document.getElementById('low-stock-products').textContent = stats.low_stock;
            document.getElementById('out-of-stock-products').textContent = stats.out_of_stock;
            document.getElementById('inventory-value').textContent = `¥${stats.inventory_value.toLocaleString()}`;
        }
    }

    showUpdateIndicator() {
        const indicator = document.getElementById('update-indicator');
        if (indicator) {
            indicator.classList.add('show');
        }
    }

    hideUpdateIndicator() {
        const indicator = document.getElementById('update-indicator');
        if (indicator) {
            indicator.classList.remove('show');
        }
    }

    showToast(message, type = 'info') {
        // EmverzeApp.showToast関数を使用（app.jsで定義済み）
        if (window.EmverzeApp && window.EmverzeApp.showToast) {
            window.EmverzeApp.showToast(message, type);
        } else {
            // フォールバック: 簡易通知
            console.log(`${type.toUpperCase()}: ${message}`);
            alert(message);
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            // フォームリセット
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    }
}

// グローバル関数（HTMLから呼び出し用）
let inventoryManager;

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', function() {
    inventoryManager = new InventoryManager();
});

// HTMLから呼び出されるグローバル関数
function showAddInventoryModal() {
    const modal = document.getElementById('add-inventory-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

function showSyncModal() {
    const modal = document.getElementById('sync-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

function editInventory(productId) {
    // 編集データを取得してモーダルに表示
    const row = document.querySelector(`tr[data-id="${productId}"]`);
    if (!row) return;

    const productName = row.querySelector('.product-cell div div').textContent;
    const physicalStock = row.querySelector('[data-stock-type="physical"]').value;
    const virtualStock = row.querySelector('[data-stock-type="virtual"]').value;
    
    // 価格を取得（デモデータから）
    const priceText = row.querySelector('td:nth-child(7) div').textContent;
    const price = parseInt(priceText.replace(/[¥,]/g, ''));

    // モーダルに値を設定
    document.getElementById('edit-product-id').value = productId;
    document.getElementById('edit-product-name').value = productName;
    document.getElementById('edit-physical-stock').value = physicalStock;
    document.getElementById('edit-virtual-stock').value = virtualStock;
    document.getElementById('edit-price').value = price;
    document.getElementById('edit-risk-level').value = 2; // デフォルト値

    // モーダルを表示
    const modal = document.getElementById('edit-inventory-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

function checkStock(productId) {
    if (inventoryManager) {
        inventoryManager.showToast(`商品ID: ${productId} の在庫をチェック中...`, 'info');
        
        // デモモード: 2秒後にチェック完了
        setTimeout(() => {
            inventoryManager.showToast('在庫チェックが完了しました', 'success');
        }, 2000);
    }
}

function exportInventory() {
    if (DEMO_MODE) {
        // デモモード: CSVダウンロードをシミュレート
        const csvContent = "商品名,SKU,実在庫,仮想在庫,表示在庫,価格\n" +
                          "Nintendo Switch Pro コントローラー,EMV-GAME-NEW-7200,2,1,2,7200\n" +
                          "PlayStation 5 デジタルエディション,EMV-GAME-NEW-49980,1,0,1,49980\n";
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        inventoryManager.showToast('在庫データをエクスポートしました', 'success');
    } else {
        // 実際のエクスポート処理
        window.location.href = '/api/inventory/export';
    }
}

function filterInventory(filterType) {
    const statusFilter = document.getElementById('stock-status-filter');
    if (statusFilter) {
        statusFilter.value = filterType;
        applyFilters();
    }
}

function applyFilters() {
    if (inventoryManager) {
        inventoryManager.filters = {
            category: document.getElementById('category-filter').value,
            risk_level: document.getElementById('risk-filter').value,
            stock_status: document.getElementById('stock-status-filter').value,
            search: document.getElementById('search-input').value
        };
        
        if (DEMO_MODE) {
            inventoryManager.showToast('フィルターを適用しました', 'info');
        } else {
            inventoryManager.loadInventoryData();
        }
    }
}

function resetFilters() {
    document.getElementById('category-filter').value = '';
    document.getElementById('risk-filter').value = '';
    document.getElementById('stock-status-filter').value = '';
    document.getElementById('search-input').value = '';
    
    if (inventoryManager) {
        inventoryManager.filters = {};
        
        if (DEMO_MODE) {
            inventoryManager.showToast('フィルターをリセットしました', 'info');
        } else {
            inventoryManager.loadInventoryData();
        }
    }
}

function toggleSelectAll() {
    const selectAll = document.getElementById('select-all');
    const items = document.querySelectorAll('.select-item');
    
    items.forEach(item => {
        item.checked = selectAll.checked;
        if (selectAll.checked) {
            inventoryManager.selectedProducts.add(item.dataset.id);
        } else {
            inventoryManager.selectedProducts.delete(item.dataset.id);
        }
    });
}

function closeModal(modalId) {
    if (inventoryManager) {
        inventoryManager.closeModal(modalId);
    }
}