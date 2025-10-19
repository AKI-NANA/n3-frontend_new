/**
 * 在庫管理システム JavaScript
 * クライアントサイド機能とAPI通信
 */

// グローバル設定
const InventoryConfig = {
    apiBase: 'api/',
    updateInterval: 30000, // 30秒
    maxRetries: 3,
    timeout: 10000 // 10秒
};

// ユーティリティ関数
const Utils = {
    /**
     * 安全なDOM要素取得
     */
    safeGetElement: function(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    },

    /**
     * 数値フォーマット
     */
    formatNumber: function(number) {
        if (typeof number !== 'number') return '0';
        return number.toLocaleString('ja-JP');
    },

    /**
     * 通貨フォーマット
     */
    formatCurrency: function(amount) {
        if (typeof amount !== 'number') return '¥0';
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY'
        }).format(amount);
    },

    /**
     * 日時フォーマット
     */
    formatDateTime: function(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('ja-JP');
    },

    /**
     * 相対時間表示
     */
    formatRelativeTime: function(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'たった今';
        if (minutes < 60) return `${minutes}分前`;
        if (hours < 24) return `${hours}時間前`;
        return `${days}日前`;
    },

    /**
     * ステータスバッジ生成
     */
    createStatusBadge: function(status) {
        const statusMap = {
            'active': { class: 'badge-success', text: 'アクティブ', icon: 'fas fa-check-circle' },
            'inactive': { class: 'badge-secondary', text: '非アクティブ', icon: 'fas fa-pause-circle' },
            'error': { class: 'badge-danger', text: 'エラー', icon: 'fas fa-exclamation-triangle' },
            'warning': { class: 'badge-warning', text: '警告', icon: 'fas fa-exclamation-circle' },
            'pending': { class: 'badge-info', text: '待機中', icon: 'fas fa-clock' }
        };
        
        const config = statusMap[status] || statusMap['pending'];
        return `<span class="badge ${config.class}">
                    <i class="${config.icon}"></i> ${config.text}
                </span>`;
    }
};

// API通信クラス
class InventoryAPI {
    constructor() {
        this.baseURL = InventoryConfig.apiBase;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
    }

    /**
     * API リクエスト実行
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            timeout: InventoryConfig.timeout,
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout);

            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('リクエストがタイムアウトしました');
            }
            throw error;
        }
    }

    /**
     * ダッシュボードデータ取得
     */
    async getDashboardData(action = 'overview') {
        return this.request(`dashboard.php?action=${action}`);
    }

    /**
     * 商品一覧取得
     */
    async getProducts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`products.php?action=list&${queryString}`);
    }

    /**
     * 商品詳細取得
     */
    async getProductDetail(productId) {
        return this.request(`products.php?action=detail&product_id=${productId}`);
    }

    /**
     * 商品監視登録
     */
    async registerProduct(productData) {
        return this.request('products.php?action=register', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }

    /**
     * 在庫数更新
     */
    async updateStock(productId, newStock, platform = null) {
        return this.request('products.php?action=update_stock', {
            method: 'POST',
            body: JSON.stringify({
                product_id: productId,
                new_stock: newStock,
                platform: platform
            })
        });
    }

    /**
     * 価格更新
     */
    async updatePrice(productId, newPrice, platform = null) {
        return this.request('products.php?action=update_price', {
            method: 'POST',
            body: JSON.stringify({
                product_id: productId,
                new_price: newPrice,
                platform: platform
            })
        });
    }

    /**
     * 監視状態切り替え
     */
    async toggleMonitoring(productId, enabled) {
        return this.request('products.php?action=toggle_monitoring', {
            method: 'PUT',
            body: JSON.stringify({
                product_id: productId,
                enabled: enabled ? 1 : 0
            })
        });
    }
}

// 通知システム
class NotificationManager {
    constructor() {
        this.container = this.createContainer();
        this.notifications = new Map();
    }

    createContainer() {
        let container = document.getElementById('notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = 5000) {
        const id = Date.now().toString();
        const notification = this.createNotification(id, message, type);
        
        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        // アニメーション
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        });

        // 自動削除
        if (duration > 0) {
            setTimeout(() => this.hide(id), duration);
        }

        return id;
    }

    createNotification(id, message, type) {
        const iconMap = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-triangle',
            'warning': 'fas fa-exclamation-circle',
            'info': 'fas fa-info-circle'
        };

        const colorMap = {
            'success': '#137333',
            'error': '#d33b01',
            'warning': '#f57c00',
            'info': '#1a73e8'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            padding: 16px;
            margin-bottom: 12px;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
            border-left: 4px solid ${colorMap[type]};
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        notification.innerHTML = `
            <i class="${iconMap[type]}" style="color: ${colorMap[type]}; font-size: 18px;"></i>
            <span style="flex: 1; font-size: 14px; line-height: 1.4;">${message}</span>
            <button onclick="window.notifications.hide('${id}')" 
                    style="background: none; border: none; font-size: 18px; color: #666; cursor: pointer; padding: 0;">
                ×
            </button>
        `;

        return notification;
    }

    hide(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }

    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 8000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }
}

// モーダル管理
class ModalManager {
    static show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    static hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    static create(options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${options.title || 'モーダル'}</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    ${options.content || ''}
                </div>
                ${options.showFooter !== false ? `
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="ModalManager.hide('${modal.id}')">${options.confirmText || 'OK'}</button>
                    <button class="btn btn-outline" onclick="ModalManager.hide('${modal.id}')">${options.cancelText || 'キャンセル'}</button>
                </div>
                ` : ''}
            </div>
        `;
        
        modal.id = options.id || 'modal-' + Date.now();
        document.body.appendChild(modal);
        
        // イベントリスナー
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close')) {
                ModalManager.hide(modal.id);
            }
        });
        
        return modal.id;
    }
}

// 商品管理クラス
class ProductManager {
    constructor(api, notifications) {
        this.api = api;
        this.notifications = notifications;
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.filters = {};
    }

    /**
     * 商品一覧読み込み
     */
    async loadProducts(page = 1) {
        try {
            this.showLoading('product-list');
            
            const params = {
                page: page,
                limit: this.itemsPerPage,
                ...this.filters
            };
            
            const response = await this.api.getProducts(params);
            
            if (response.success) {
                this.renderProductList(response.data);
                this.renderPagination(response.pagination);
                this.currentPage = page;
            } else {
                throw new Error(response.error?.message || 'データの取得に失敗しました');
            }
            
        } catch (error) {
            this.notifications.error(`商品一覧の読み込みに失敗しました: ${error.message}`);
        } finally {
            this.hideLoading('product-list');
        }
    }

    /**
     * 商品一覧レンダリング
     */
    renderProductList(products) {
        const container = Utils.safeGetElement('product-list');
        if (!container) return;

        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="text-center p-3">
                    <i class="fas fa-box-open text-muted" style="font-size: 3rem;"></i>
                    <p class="text-muted mt-2">監視中の商品がありません</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>商品情報</th>
                            <th>プラットフォーム</th>
                            <th>在庫数</th>
                            <th>価格</th>
                            <th>状態</th>
                            <th>最終更新</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(product => this.renderProductRow(product)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    }

    /**
     * 商品行レンダリング
     */
    renderProductRow(product) {
        const title = product.product_title || `Product #${product.product_id}`;
        const truncatedTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;
        
        return `
            <tr data-product-id="${product.product_id}">
                <td>
                    <div class="d-flex align-items-center gap-2">
                        ${product.product_image ? 
                            `<img src="${product.product_image}" alt="" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">` : 
                            '<div style="width: 40px; height: 40px; background: #f1f3f4; border-radius: 4px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-image text-muted"></i></div>'
                        }
                        <div>
                            <div class="font-weight-bold" title="${title}">${truncatedTitle}</div>
                            <small class="text-muted">ID: ${product.product_id}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge badge-info">${product.source_platform.toUpperCase()}</span>
                </td>
                <td>
                    <span class="font-weight-bold ${product.current_stock > 0 ? 'text-success' : 'text-danger'}">
                        ${Utils.formatNumber(product.current_stock)}
                    </span>
                </td>
                <td>${Utils.formatCurrency(product.current_price)}</td>
                <td>
                    ${Utils.createStatusBadge(product.url_status)}
                    ${product.monitoring_enabled ? 
                        '<span class="badge badge-success ml-1">監視中</span>' : 
                        '<span class="badge badge-secondary ml-1">停止中</span>'
                    }
                </td>
                <td>
                    <small>${Utils.formatRelativeTime(product.updated_at)}</small>
                </td>
                <td>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-outline" onclick="productManager.showProductDetail(${product.product_id})" title="詳細">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="productManager.editStock(${product.product_id}, ${product.current_stock})" title="在庫編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm ${product.monitoring_enabled ? 'btn-danger' : 'btn-success'}" 
                                onclick="productManager.toggleMonitoring(${product.product_id}, ${!product.monitoring_enabled})" 
                                title="${product.monitoring_enabled ? '監視停止' : '監視開始'}">
                            <i class="fas fa-${product.monitoring_enabled ? 'pause' : 'play'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * ページネーションレンダリング
     */
    renderPagination(pagination) {
        const container = Utils.safeGetElement('pagination');
        if (!container || !pagination) return;

        const { current_page, total_pages, has_prev_page, has_next_page } = pagination;

        let paginationHTML = '<div class="d-flex justify-content-center gap-1">';
        
        // 前のページ
        if (has_prev_page) {
            paginationHTML += `<button class="btn btn-outline btn-sm" onclick="productManager.loadProducts(${current_page - 1})">前へ</button>`;
        }
        
        // ページ番号
        const startPage = Math.max(1, current_page - 2);
        const endPage = Math.min(total_pages, current_page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === current_page;
            paginationHTML += `
                <button class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}" 
                        onclick="productManager.loadProducts(${i})" 
                        ${isActive ? 'disabled' : ''}>
                    ${i}
                </button>
            `;
        }
        
        // 次のページ
        if (has_next_page) {
            paginationHTML += `<button class="btn btn-outline btn-sm" onclick="productManager.loadProducts(${current_page + 1})">次へ</button>`;
        }
        
        paginationHTML += '</div>';
        
        if (total_pages > 1) {
            container.innerHTML = paginationHTML;
        } else {
            container.innerHTML = '';
        }
    }

    /**
     * 商品詳細表示
     */
    async showProductDetail(productId) {
        try {
            const response = await this.api.getProductDetail(productId);
            
            if (response.success) {
                this.renderProductDetailModal(response.data);
            } else {
                throw new Error(response.error?.message || '詳細情報の取得に失敗しました');
            }
            
        } catch (error) {
            this.notifications.error(`商品詳細の取得に失敗しました: ${error.message}`);
        }
    }

    /**
     * 商品詳細モーダル表示
     */
    renderProductDetailModal(data) {
        const { product, recent_history, stats } = data;
        
        const modalId = ModalManager.create({
            id: 'product-detail-modal',
            title: `商品詳細 - ${product.product_title || 'Product #' + product.product_id}`,
            content: `
                <div class="grid grid-2 mb-3">
                    <div class="card">
                        <h4>基本情報</h4>
                        <p><strong>商品ID:</strong> ${product.product_id}</p>
                        <p><strong>プラットフォーム:</strong> ${product.source_platform}</p>
                        <p><strong>現在の在庫:</strong> ${Utils.formatNumber(product.current_stock)}</p>
                        <p><strong>現在の価格:</strong> ${Utils.formatCurrency(product.current_price)}</p>
                        <p><strong>URL状態:</strong> ${Utils.createStatusBadge(product.url_status)}</p>
                        <p><strong>監視状態:</strong> ${product.monitoring_enabled ? 
                            '<span class="badge badge-success">有効</span>' : 
                            '<span class="badge badge-secondary">無効</span>'}</p>
                    </div>
                    <div class="card">
                        <h4>統計情報</h4>
                        <p><strong>総変更回数:</strong> ${Utils.formatNumber(stats.total_changes)}</p>
                        <p><strong>24h在庫変更:</strong> ${Utils.formatNumber(stats.stock_changes_24h)}</p>
                        <p><strong>24h価格変更:</strong> ${Utils.formatNumber(stats.price_changes_24h)}</p>
                        <p><strong>最終確認:</strong> ${Utils.formatDateTime(product.last_verified_at)}</p>
                        <p><strong>最終更新:</strong> ${Utils.formatDateTime(product.updated_at)}</p>
                        <p><strong>登録日:</strong> ${Utils.formatDateTime(product.created_at)}</p>
                    </div>
                </div>
                
                <div class="card">
                    <h4>最近の履歴</h4>
                    ${recent_history.length > 0 ? `
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>日時</th>
                                        <th>変更タイプ</th>
                                        <th>変更前</th>
                                        <th>変更後</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${recent_history.map(h => `
                                        <tr>
                                            <td>${Utils.formatDateTime(h.created_at)}</td>
                                            <td>${this.getChangeTypeLabel(h.change_type)}</td>
                                            <td>${this.formatHistoryValue(h, 'previous')}</td>
                                            <td>${this.formatHistoryValue(h, 'new')}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p class="text-muted">履歴がありません</p>'}
                </div>
            `,
            showFooter: false
        });
        
        ModalManager.show(modalId);
    }

    /**
     * 変更タイプラベル取得
     */
    getChangeTypeLabel(type) {
        const labels = {
            'stock_change': '<span class="badge badge-info">在庫変更</span>',
            'price_change': '<span class="badge badge-warning">価格変更</span>',
            'both': '<span class="badge badge-primary">在庫・価格変更</span>'
        };
        return labels[type] || type;
    }

    /**
     * 履歴値フォーマット
     */
    formatHistoryValue(history, prefix) {
        const stock = history[prefix + '_stock'];
        const price = history[prefix + '_price'];
        
        let result = [];
        if (stock !== null) result.push(`在庫: ${Utils.formatNumber(stock)}`);
        if (price !== null) result.push(`価格: ${Utils.formatCurrency(price)}`);
        
        return result.length > 0 ? result.join('<br>') : '-';
    }

    /**
     * 在庫編集
     */
    editStock(productId, currentStock) {
        const modalId = ModalManager.create({
            id: 'edit-stock-modal',
            title: '在庫数編集',
            content: `
                <form id="edit-stock-form">
                    <div class="form-group">
                        <label class="form-label">現在の在庫数</label>
                        <input type="number" class="form-control" value="${currentStock}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">新しい在庫数</label>
                        <input type="number" id="new-stock" class="form-control" value="${currentStock}" min="0" required>
                    </div>
                </form>
            `,
            confirmText: '更新'
        });
        
        ModalManager.show(modalId);
        
        // フォーム送信処理
        document.getElementById('edit-stock-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newStock = parseInt(document.getElementById('new-stock').value);
            
            try {
                const response = await this.api.updateStock(productId, newStock);
                
                if (response.success) {
                    this.notifications.success('在庫数を更新しました');
                    ModalManager.hide(modalId);
                    this.loadProducts(this.currentPage);
                } else {
                    throw new Error(response.error?.message || '更新に失敗しました');
                }
                
            } catch (error) {
                this.notifications.error(`在庫更新に失敗しました: ${error.message}`);
            }
        });
    }

    /**
     * 監視状態切り替え
     */
    async toggleMonitoring(productId, enabled) {
        try {
            const response = await this.api.toggleMonitoring(productId, enabled);
            
            if (response.success) {
                const status = enabled ? '有効' : '無効';
                this.notifications.success(`監視を${status}にしました`);
                this.loadProducts(this.currentPage);
            } else {
                throw new Error(response.error?.message || '状態変更に失敗しました');
            }
            
        } catch (error) {
            this.notifications.error(`監視状態の変更に失敗しました: ${error.message}`);
        }
    }

    /**
     * ローディング表示
     */
    showLoading(containerId) {
        const container = Utils.safeGetElement(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-overlay">
                    <div class="loading"></div>
                </div>
            `;
        }
    }

    /**
     * ローディング非表示
     */
    hideLoading(containerId) {
        const container = Utils.safeGetElement(containerId);
        if (container) {
            const overlay = container.querySelector('.loading-overlay');
            if (overlay) {
                overlay.remove();
            }
        }
    }
}

// グローバルインスタンス
let api, notifications, productManager;

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('在庫管理システム JavaScript 初期化開始');
    
    // インスタンス作成
    api = new InventoryAPI();
    notifications = new NotificationManager();
    productManager = new ProductManager(api, notifications);
    
    // グローバルアクセス用
    window.api = api;
    window.notifications = notifications;
    window.productManager = productManager;
    window.ModalManager = ModalManager;
    window.Utils = Utils;
    
    console.log('在庫管理システム JavaScript 初期化完了');
});

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('JavaScript Error:', event.error);
    if (window.notifications) {
        notifications.error('システムエラーが発生しました');
    }
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
    if (window.notifications) {
        notifications.error('通信エラーが発生しました');
    }
});

// サービスワーカー登録（将来のオフライン対応用）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // 現在は無効化
        // navigator.serviceWorker.register('/sw.js');
    });
}