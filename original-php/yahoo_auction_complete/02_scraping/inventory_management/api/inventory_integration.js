/**
 * 10_zaiko/assets/js/inventory_integration.js
 * 
 * 02_scrapingとの統合JavaScript
 * 在庫管理UIから02_scrapingエンジンを操作
 */

class InventoryScrapingIntegration {
    constructor(options = {}) {
        this.options = {
            scrapingApiBase: '../02_scraping/api/inventory_monitor.php',
            inventoryApiBase: 'api/inventory.php',
            autoRefreshInterval: 5 * 60 * 1000, // 5分
            notificationDuration: 5000,
            maxConcurrentRequests: 3,
            ...options
        };
        
        this.isMonitoring = false;
        this.activeRequests = new Set();
        this.eventListeners = new Map();
        this.cache = new Map();
        
        this.initializeEventSystem();
        this.startAutoRefresh();
    }
    
    // ===============================================
    // 公開API
    // ===============================================
    
    /**
     * 出品済み商品一覧取得
     */
    async getListedProducts(options = {}) {
        try {
            this.showLoading('商品一覧を取得しています...');
            
            const cacheKey = 'listed_products';
            if (!options.forceRefresh && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < 60000) { // 1分キャッシュ
                    this.hideLoading();
                    return cached.data;
                }
            }
            
            const response = await this.makeRequest(this.options.inventoryApiBase, {
                method: 'GET',
                params: { action: 'get_listed_products', ...options }
            });
            
            if (response.success) {
                this.cache.set(cacheKey, {
                    data: response,
                    timestamp: Date.now()
                });
                
                this.renderProductList(response.products);
                this.emit('productsLoaded', response.products);
                return response;
            } else {
                throw new Error(response.message || '商品一覧取得に失敗しました');
            }
            
        } catch (error) {
            this.handleError('商品一覧取得エラー', error);
            throw error;
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * 監視開始
     */
    async startMonitoring(productIds, options = {}) {
        if (this.isMonitoring) {
            this.showWarning('監視は既に実行中です');
            return;
        }
        
        if (!Array.isArray(productIds) || productIds.length === 0) {
            this.showError('監視する商品を選択してください');
            return;
        }
        
        try {
            this.isMonitoring = true;
            this.showLoading(`${productIds.length}件の商品で監視を開始しています...`);
            
            const response = await this.makeRequest(this.options.scrapingApiBase, {
                method: 'POST',
                data: {
                    action: 'start_monitoring',
                    product_ids: productIds,
                    options: options
                }
            });
            
            if (response.success) {
                this.showSuccess(`${productIds.length}件の商品で監視を開始しました`);
                this.updateMonitoringStatus(productIds, true);
                this.emit('monitoringStarted', { productIds, response });
                
                // リアルタイム更新開始
                this.startRealTimeUpdates();
                
                return response;
            } else {
                throw new Error(response.message || '監視開始に失敗しました');
            }
            
        } catch (error) {
            this.handleError('監視開始エラー', error);
            throw error;
        } finally {
            this.isMonitoring = false;
            this.hideLoading();
        }
    }
    
    /**
     * 監視停止
     */
    async stopMonitoring(productIds) {
        if (!Array.isArray(productIds) || productIds.length === 0) {
            this.showError('停止する商品を選択してください');
            return;
        }
        
        try {
            this.showLoading(`${productIds.length}件の商品で監視を停止しています...`);
            
            const response = await this.makeRequest(this.options.scrapingApiBase, {
                method: 'POST',
                data: {
                    action: 'stop_monitoring',
                    product_ids: productIds
                }
            });
            
            if (response.success) {
                this.showSuccess(`${productIds.length}件の商品で監視を停止しました`);
                this.updateMonitoringStatus(productIds, false);
                this.emit('monitoringStopped', { productIds, response });
                return response;
            } else {
                throw new Error(response.message || '監視停止に失敗しました');
            }
            
        } catch (error) {
            this.handleError('監視停止エラー', error);
            throw error;
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * 在庫チェック実行
     */
    async checkInventory(productIds = null, options = {}) {
        try {
            this.showLoading('在庫をチェックしています...');
            
            const response = await this.makeRequest(this.options.scrapingApiBase, {
                method: 'POST',
                data: {
                    action: 'check_inventory',
                    product_ids: productIds,
                    force_check: options.forceCheck || true,
                    ...options
                }
            });
            
            if (response.success) {
                this.showCheckResults(response.check_results);
                this.refreshProductList();
                this.emit('inventoryChecked', response.check_results);
                return response;
            } else {
                throw new Error(response.message || '在庫チェックに失敗しました');
            }
            
        } catch (error) {
            this.handleError('在庫チェックエラー', error);
            throw error;
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * 価格履歴取得・表示
     */
    async showPriceHistory(productId, days = 30) {
        try {
            this.showLoading('価格履歴を取得しています...');
            
            const response = await this.makeRequest(this.options.scrapingApiBase, {
                method: 'GET',
                params: {
                    action: 'get_price_history',
                    product_id: productId,
                    days: days
                }
            });
            
            if (response.success) {
                this.displayPriceHistoryModal(productId, response.price_history);
                this.emit('priceHistoryLoaded', { productId, history: response.price_history });
                return response;
            } else {
                throw new Error(response.message || '価格履歴取得に失敗しました');
            }
            
        } catch (error) {
            this.handleError('価格履歴取得エラー', error);
            throw error;
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * 監視ステータス取得
     */
    async getMonitoringStatus(productIds = null) {
        try {
            const params = { action: 'get_monitoring_status' };
            if (productIds) {
                params.product_ids = productIds.join(',');
            }
            
            const response = await this.makeRequest(this.options.scrapingApiBase, {
                method: 'GET',
                params: params
            });
            
            if (response.success) {
                this.updateDashboardStats(response.monitoring_status);
                this.emit('statusUpdated', response.monitoring_status);
                return response;
            } else {
                throw new Error(response.message || 'ステータス取得に失敗しました');
            }
            
        } catch (error) {
            this.handleError('ステータス取得エラー', error, false); // 静かにエラー処理
            throw error;
        }
    }
    
    /**
     * 統計情報取得
     */
    async getStatistics() {
        try {
            const response = await this.makeRequest(this.options.scrapingApiBase, {
                method: 'GET',
                params: { action: 'get_statistics' }
            });
            
            if (response.success) {
                this.updateStatisticsDisplay(response.statistics);
                this.emit('statisticsUpdated', response.statistics);
                return response;
            } else {
                throw new Error(response.message || '統計情報取得に失敗しました');
            }
            
        } catch (error) {
            this.handleError('統計情報取得エラー', error, false);
            throw error;
        }
    }
    
    // ===============================================
    // UI更新メソッド
    // ===============================================
    
    /**
     * 商品一覧レンダリング
     */
    renderProductList(products) {
        const container = document.getElementById('products-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!products || products.length === 0) {
            container.innerHTML = '<div class="no-products">監視対象の商品がありません</div>';
            return;
        }
        
        products.forEach(product => {
            const productElement = this.createProductElement(product);
            container.appendChild(productElement);
        });
    }
    
    /**
     * 商品要素作成
     */
    createProductElement(product) {
        const element = document.createElement('div');
        element.className = 'product-item';
        element.dataset.productId = product.product_id;
        
        const monitoringStatus = product.monitoring_enabled ? 'active' : 'inactive';
        const urlStatus = product.url_status || 'unknown';
        
        element.innerHTML = `
            <div class="product-header">
                <h3 class="product-title">${this.escapeHtml(product.title)}</h3>
                <div class="product-status">
                    <span class="monitoring-status ${monitoringStatus}">${monitoringStatus === 'active' ? '監視中' : '停止中'}</span>
                    <span class="url-status ${urlStatus}">${this.getUrlStatusText(urlStatus)}</span>
                </div>
            </div>
            
            <div class="product-details">
                <div class="price-info">
                    <span class="current-price">¥${this.formatNumber(product.current_price || 0)}</span>
                    <span class="price-change" data-change="0">-</span>
                </div>
                
                <div class="monitoring-info">
                    <span class="last-checked">${this.formatDate(product.last_verified_at)}</span>
                    <span class="ebay-id">${product.ebay_item_id || '-'}</span>
                </div>
            </div>
            
            <div class="product-actions">
                <button class="btn btn-sm btn-primary" onclick="inventory.checkSingleProduct(${product.product_id})">
                    <i class="icon-refresh"></i> チェック
                </button>
                <button class="btn btn-sm btn-secondary" onclick="inventory.showPriceHistory(${product.product_id})">
                    <i class="icon-chart"></i> 履歴
                </button>
                <button class="btn btn-sm ${monitoringStatus === 'active' ? 'btn-warning' : 'btn-success'}" 
                        onclick="inventory.toggleMonitoring(${product.product_id}, ${!product.monitoring_enabled})">
                    <i class="icon-${monitoringStatus === 'active' ? 'pause' : 'play'}"></i>
                    ${monitoringStatus === 'active' ? '停止' : '開始'}
                </button>
            </div>
        `;
        
        return element;
    }
    
    /**
     * チェック結果表示
     */
    showCheckResults(results) {
        const modal = document.getElementById('check-results-modal') || this.createCheckResultsModal();
        const content = modal.querySelector('.modal-content');
        
        content.innerHTML = `
            <div class="modal-header">
                <h3>在庫チェック結果</h3>
                <button class="modal-close" onclick="this.closest('.modal').style.display='none'">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="results-summary">
                    <div class="stat-item">
                        <span class="stat-label">総数</span>
                        <span class="stat-value">${results.total || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">処理済み</span>
                        <span class="stat-value">${results.processed || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">更新</span>
                        <span class="stat-value">${results.updated || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">エラー</span>
                        <span class="stat-value error">${results.errors || 0}</span>
                    </div>
                </div>
                
                ${results.changes && results.changes.length > 0 ? `
                <div class="changes-section">
                    <h4>変更詳細</h4>
                    <div class="changes-list">
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
                </div>
                ` : '<p>変更は検知されませんでした。</p>'}
            </div>
        `;
        
        modal.style.display = 'block';
    }
    
    /**
     * 価格履歴モーダル表示
     */
    displayPriceHistoryModal(productId, history) {
        const modal = document.getElementById('price-history-modal') || this.createPriceHistoryModal();
        const content = modal.querySelector('.modal-content');
        
        content.innerHTML = `
            <div class="modal-header">
                <h3>価格履歴 - 商品ID: ${productId}</h3>
                <button class="modal-close" onclick="this.closest('.modal').style.display='none'">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="chart-container">
                    <canvas id="price-chart" width="400" height="200"></canvas>
                </div>
                
                <div class="history-table">
                    <table>
                        <thead>
                            <tr>
                                <th>日時</th>
                                <th>価格</th>
                                <th>変動</th>
                                <th>変動率</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${history.map(record => `
                                <tr>
                                    <td>${this.formatDate(record.created_at)}</td>
                                    <td>¥${this.formatNumber(record.new_price)}</td>
                                    <td class="${record.new_price > record.previous_price ? 'positive' : 'negative'}">
                                        ${record.new_price > record.previous_price ? '+' : ''}¥${this.formatNumber(record.new_price - record.previous_price)}
                                    </td>
                                    <td class="${record.new_price > record.previous_price ? 'positive' : 'negative'}">
                                        ${((record.new_price - record.previous_price) / record.previous_price * 100).toFixed(2)}%
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
        
        // チャート描画
        this.renderPriceChart(history);
    }
    
    /**
     * 価格チャート描画
     */
    renderPriceChart(history) {
        const canvas = document.getElementById('price-chart');
        if (!canvas || typeof Chart === 'undefined') return;
        
        const ctx = canvas.getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: history.map(h => this.formatDate(h.created_at, 'short')),
                datasets: [{
                    label: '価格推移',
                    data: history.map(h => h.new_price),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    fill: true
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
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '価格: ¥' + context.parsed.y.toLocaleString();
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
    updateDashboardStats(statusData) {
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value || 0;