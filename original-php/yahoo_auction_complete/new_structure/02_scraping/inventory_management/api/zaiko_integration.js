/**
 * 10_zaiko/assets/inventory_integration.js
 * 
 * 02_scrapingとの連携JavaScript
 * 在庫管理UIから02_scrapingエンジンを操作
 */

class InventoryScrapingIntegration {
    constructor() {
        this.scrapingApiBase = '../02_scraping/api/inventory_monitor.php';
        this.inventoryApiBase = 'api/inventory.php';
        this.isMonitoring = false;
    }
    
    /**
     * 出品済み商品一覧取得
     */
    async getListedProducts() {
        try {
            const response = await fetch(this.inventoryApiBase + '?action=get_listed_products');
            const data = await response.json();
            
            if (data.success) {
                this.renderProductList(data.products);
            } else {
                this.showError('商品一覧取得エラー: ' + data.message);
            }
        } catch (error) {
            this.showError('API通信エラー: ' + error.message);
        }
    }
    
    /**
     * 監視開始
     */
    async startMonitoring(productIds) {
        if (this.isMonitoring) {
            this.showWarning('監視は既に実行中です');
            return;
        }
        
        try {
            this.isMonitoring = true;
            this.showLoading('監視を開始しています...');
            
            const response = await fetch(this.scrapingApiBase, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'start_monitoring',
                    product_ids: productIds
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(`${productIds.length}商品の監視を開始しました`);
                this.updateMonitoringStatus(productIds, true);
            } else {
                this.showError('監視開始エラー: ' + data.message);
            }
            
        } catch (error) {
            this.showError('監視開始に失敗しました: ' + error.message);
        } finally {
            this.isMonitoring = false;
            this.hideLoading();
        }
    }
    
    /**
     * 在庫チェック実行
     */
    async checkInventory(productIds = null) {
        try {
            this.showLoading('在庫をチェックしています...');
            
            const response = await fetch(this.scrapingApiBase, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'check_inventory',
                    product_ids: productIds,
                    force_check: true
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showCheckResults(data.check_results);
                this.refreshProductList();
            } else {
                this.showError('在庫チェックエラー: ' + data.message);
            }
            
        } catch (error) {
            this.showError('在庫チェックに失敗しました: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * 価格履歴取得・表示
     */
    async showPriceHistory(productId) {
        try {
            const response = await fetch(
                `${this.scrapingApiBase}?action=get_price_history&product_id=${productId}&days=30`
            );
            const data = await response.json();
            
            if (data.success) {
                this.renderPriceChart(data.history);
            } else {
                this.showError('価格履歴取得エラー: ' + data.message);
            }
        } catch (error) {
            this.showError('価格履歴取得に失敗しました: ' + error.message);
        }
    }
    
    /**
     * 監視ステータス取得
     */
    async getMonitoringStatus() {
        try {
            const response = await fetch(this.scrapingApiBase + '?action=get_monitoring_status');
            const data = await response.json();
            
            if (data.success) {
                this.updateDashboardStats(data);
            }
        } catch (error) {
            console.error('監視ステータス取得エラー:', error);
        }
    }
    
    /**
     * 商品一覧レンダリング
     */
    renderProductList(products) {
        const container = document.getElementById('products-list');
        if (!container) return;
        
        container.innerHTML = products.map(product => `
            <div class="product-item" data-product-id="${product.id}">
                <div class="product-info">
                    <h4>${this.escapeHtml(product.title)}</h4>
                    <div class="product-meta">
                        <span class="price">¥${product.price.toLocaleString()}</span>
                        <span class="ebay-id">eBay: ${product.ebay_item_id}</span>
                        <span class="listed-date">${this.formatDate(product.listed_at)}</span>
                    </div>
                </div>
                <div class="product-controls">
                    <label class="monitoring-toggle">
                        <input type="checkbox" ${product.monitoring_enabled ? 'checked' : ''} 
                               onchange="inventory.toggleMonitoring(${product.id}, this.checked)">
                        監視
                    </label>
                    <button onclick="inventory.checkSingleProduct(${product.id})" 
                            class="btn btn-sm btn-outline">チェック</button>
                    <button onclick="inventory.showPriceHistory(${product.id})" 
                            class="btn btn-sm btn-info">履歴</button>
                </div>
                <div class="monitoring-status ${product.monitoring_enabled ? 'active' : 'inactive'}">
                    <span class="status-indicator"></span>
                    <span class="last-check">
                        最終チェック: ${product.last_checked || '未実行'}
                    </span>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * チェック結果表示
     */
    showCheckResults(results) {
        const modal = document.getElementById('check-results-modal');
        const content = document.getElementById('check-results-content');
        
        if (!modal || !content) return;
        
        content.innerHTML = `
            <div class="check-summary">
                <h3>在庫チェック結果</h3>
                <div class="summary-stats">
                    <div class="stat">
                        <span class="label">チェック商品数</span>
                        <span class="value">${results.total}</span>
                    </div>
                    <div class="stat">
                        <span class="label">変更検知</span>
                        <span class="value">${results.updated}</span>
                    </div>
                    <div class="stat">
                        <span class="label">エラー</span>
                        <span class="value">${results.errors}</span>
                    </div>
                </div>
            </div>
            
            ${results.changes.length > 0 ? `
                <div class="changes-list">
                    <h4>変更詳細</h4>
                    ${results.changes.map(change => `
                        <div class="change-item">
                            <strong>商品ID: ${change.product_id}</strong>
                            <ul>
                                ${change.changes.map(detail => `
                                    <li>${this.formatChangeDetail(detail)}</li>
                                `).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            ` : '<p>変更は検知されませんでした。</p>'}
        `;
        
        modal.style.display = 'block';
    }
    
    /**
     * 価格チャート表示
     */
    renderPriceChart(history) {
        // Chart.jsやD3.jsを使用した価格推移グラフ
        const ctx = document.getElementById('price-chart').getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: history.map(h => this.formatDate(h.created_at)),
                datasets: [{
                    label: '価格推移',
                    data: history.map(h => h.new_price),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return '¥' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * ダッシュボード統計更新
     */
    updateDashboardStats(data) {
        document.getElementById('total-monitored').textContent = data.total_monitored || 0;
        document.getElementById('active-monitoring').textContent = data.active_monitoring || 0;
        document.getElementById('price-changes-today').textContent = data.price_changes_today || 0;
        document.getElementById('dead-links').textContent = data.dead_links || 0;
    }
    
    /**
     * 監視ステータス更新
     */
    updateMonitoringStatus(productIds, enabled) {
        productIds.forEach(id => {
            const item = document.querySelector(`[data-product-id="${id}"]`);
            if (item) {
                const status = item.querySelector('.monitoring-status');
                status.className = `monitoring-status ${enabled ? 'active' : 'inactive'}`;
            }
        });
    }
    
    /**
     * 単一商品チェック
     */
    async checkSingleProduct(productId) {
        await this.checkInventory([productId]);
    }
    
    /**
     * 監視切り替え
     */
    async toggleMonitoring(productId, enabled) {
        try {
            const response = await fetch(this.scrapingApiBase, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: enabled ? 'start_monitoring' : 'stop_monitoring',
                    product_ids: [productId]
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.updateMonitoringStatus([productId], enabled);
                this.showSuccess(`商品ID ${productId} の監視を${enabled ? '開始' : '停止'}しました`);
            } else {
                this.showError('監視設定更新エラー: ' + data.message);
            }
        } catch (error) {
            this.showError('監視設定更新に失敗しました: ' + error.message);
        }
    }
    
    /**
     * 商品一覧更新
     */
    async refreshProductList() {
        await this.getListedProducts();
    }
    
    // UI ヘルパーメソッド
    showLoading(message) {
        // ローディング表示
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.style.display = 'flex';
            loader.querySelector('.loading-message').textContent = message;
        }
    }
    
    hideLoading() {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.style.display = 'none';
        }
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showWarning(message) {
        this.showNotification(message, 'warning');
    }
    
    showNotification(message, type) {
        // 通知表示ロジック
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('ja-JP');
    }
    
    formatChangeDetail(detail) {
        switch (detail.type) {
            case 'price_change':
                return `価格変動: ¥${detail.old_price.toLocaleString()} → ¥${detail.new_price.toLocaleString()} (${detail.change_percent > 0 ? '+' : ''}${detail.change_percent.toFixed(1)}%)`;
            case 'stock_change':
                return `在庫状況変更: ${detail.old_status} → ${detail.new_status}`;
            case 'url_dead':
                return `リンク無効化: ${detail.detected_at}`;
            default:
                return `変更: ${detail.type}`;
        }
    }
}

// グローバルインスタンス作成
const inventory = new InventoryScrapingIntegration();

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    inventory.getListedProducts();
    inventory.getMonitoringStatus();
    
    // 定期更新（5分毎）
    setInterval(() => {
        inventory.getMonitoringStatus();
    }, 5 * 60 * 1000);
});