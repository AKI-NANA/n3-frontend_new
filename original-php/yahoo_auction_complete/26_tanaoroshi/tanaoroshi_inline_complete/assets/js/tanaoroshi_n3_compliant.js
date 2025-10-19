/**
 * 棚卸しシステム - N3準拠外部JavaScript
 * モーダル管理・データ通信・UI制御
 * CDN連携対応版
 */

// === N3準拠グローバル設定 ===
window.TANAOROSHI_CONFIG = {
    version: '3.0',
    ajax_endpoint: 'modules/tanaoroshi_inline_complete/tanaoroshi_ajax_handler.php',
    csrf_token: '',
    debug: false,
    api_timeout: 30000
};

// === モーダル管理システム ===
class ModalManager {
    constructor() {
        this.activeModals = new Set();
        this.init();
    }
    
    init() {
        // モーダル背景クリック時の動作
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') && e.target.classList.contains('modal--active')) {
                this.closeModal(e.target.id);
            }
        });
        
        // ESCキーでモーダル閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.size > 0) {
                const lastModal = Array.from(this.activeModals).pop();
                this.closeModal(lastModal);
            }
        });
    }
    
    openModal(modalId) {
        console.log('🔧 モーダル表示:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('modal--active'), 10);
            this.activeModals.add(modalId);
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeModal(modalId) {
        console.log('🔧 モーダル非表示:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('modal--active');
            setTimeout(() => {
                modal.style.display = 'none';
                this.activeModals.delete(modalId);
                if (this.activeModals.size === 0) {
                    document.body.style.overflow = '';
                }
            }, 300);
        }
    }
    
    closeAllModals() {
        this.activeModals.forEach(modalId => this.closeModal(modalId));
    }
}

// === Ajax通信マネージャー ===
class AjaxManager {
    constructor() {
        this.config = window.TANAOROSHI_CONFIG;
    }
    
    async request(action, data = {}, options = {}) {
        const requestData = {
            action: action,
            ...data
        };
        
        // CSRFトークン追加
        if (this.config.csrf_token) {
            requestData.csrf_token = this.config.csrf_token;
        }
        
        try {
            console.log('🌐 Ajax要求:', action, requestData);
            
            const response = await fetch(this.config.ajax_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(requestData),
                signal: options.signal
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const text = await response.text();
            console.log('🌐 生レスポンス長:', text.length);
            
            if (!text || text.trim() === '') {
                throw new Error('Empty response from server');
            }
            
            const result = JSON.parse(text);
            console.log('🌐 Ajax成功:', action, result.success);
            
            return result;
            
        } catch (error) {
            console.error('🌐 Ajax失敗:', action, error);
            throw error;
        }
    }
    
    async getInventoryData(limit = 30) {
        return await this.request('get_inventory', { limit });
    }
    
    async testDatabase() {
        return await this.request('database_status');
    }
    
    async healthCheck() {
        return await this.request('health_check');
    }
}

// === データ管理システム ===
class DataManager {
    constructor() {
        this.ajax = new AjaxManager();
        this.cache = new Map();
        this.loading = false;
    }
    
    async loadInventoryData(limit = 30, forceRefresh = false) {
        const cacheKey = `inventory_${limit}`;
        
        if (!forceRefresh && this.cache.has(cacheKey)) {
            console.log('📦 キャッシュからデータ取得');
            return this.cache.get(cacheKey);
        }
        
        if (this.loading) {
            console.log('📦 既に読み込み中...');
            return null;
        }
        
        try {
            this.loading = true;
            console.log('📦 在庫データ読み込み開始');
            
            const result = await this.ajax.getInventoryData(limit);
            
            if (result.success && result.data) {
                this.cache.set(cacheKey, result.data);
                console.log('📦 在庫データ読み込み成功:', result.data.length, '件');
                return result.data;
            } else {
                console.error('📦 在庫データ読み込み失敗:', result.error);
                return null;
            }
            
        } catch (error) {
            console.error('📦 在庫データ読み込みエラー:', error);
            return null;
        } finally {
            this.loading = false;
        }
    }
    
    clearCache() {
        this.cache.clear();
        console.log('📦 キャッシュクリア完了');
    }
}

// === UI制御システム ===
class UIController {
    constructor() {
        this.modalManager = new ModalManager();
        this.dataManager = new DataManager();
        this.currentView = 'card';
        this.currentData = [];
    }
    
    async initializeSystem() {
        console.log('🎯 棚卸しシステム初期化開始');
        
        // CSRFトークン取得
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
            window.TANAOROSHI_CONFIG.csrf_token = metaToken.getAttribute('content');
        }
        
        // 設定確認
        if (window.N3_CONFIG) {
            window.TANAOROSHI_CONFIG.csrf_token = window.N3_CONFIG.csrfToken;
            window.TANAOROSHI_CONFIG.debug = window.N3_CONFIG.debug;
        }
        
        // 初期データ読み込み
        await this.loadAndDisplayData();
        
        // 統計更新
        this.updateStatistics();
        
        console.log('🎯 棚卸しシステム初期化完了');
    }
    
    async loadAndDisplayData() {
        try {
            // ローディング表示
            this.showLoadingState();
            
            // データ読み込み
            const data = await this.dataManager.loadInventoryData(80);
            
            if (data && data.length > 0) {
                this.currentData = data;
                this.displayData(data);
                this.updatePagination(data.length);
            } else {
                this.showErrorState('データの読み込みに失敗しました');
            }
            
        } catch (error) {
            console.error('📊 データ表示エラー:', error);
            this.showErrorState('エラーが発生しました: ' + error.message);
        }
    }
    
    displayData(data) {
        if (this.currentView === 'card') {
            this.displayCardView(data);
        } else {
            this.displayExcelView(data);
        }
    }
    
    displayCardView(data) {
        const grid = document.querySelector('.js-inventory-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        data.forEach(item => {
            const card = this.createProductCard(item);
            grid.appendChild(card);
        });
        
        console.log('🎨 カードビュー表示完了:', data.length, '件');
    }
    
    createProductCard(item) {
        const card = document.createElement('div');
        card.className = 'inventory__card';
        card.onclick = () => this.showItemDetails(item);
        
        const typeClass = `inventory__badge--${item.type}`;
        const stockText = item.type === 'dropship' ? '無在庫' : `${item.stock || 0}個`;
        
        card.innerHTML = `
            <div class="inventory__card-image">
                ${item.image ? 
                    `<img src="${item.image}" alt="${item.title}" class="inventory__card-img">` :
                    `<div class="inventory__card-placeholder">
                        <i class="fas fa-image"></i>
                        <span>画像なし</span>
                    </div>`
                }
                <div class="inventory__badge ${typeClass}">${this.getTypeLabel(item.type)}</div>
            </div>
            <div class="inventory__card-info">
                <h3 class="inventory__card-title">${item.title || item.name}</h3>
                <div class="inventory__card-price">
                    <div class="inventory__card-price-main">$${item.priceUSD || item.price || '0.00'}</div>
                    <div class="inventory__card-price-sub">¥${Math.round((item.priceUSD || item.price || 0) * 150)}</div>
                </div>
                <div class="inventory__card-footer">
                    <span class="inventory__card-sku">${item.sku}</span>
                    <span class="inventory__card-stock">${stockText}</span>
                </div>
            </div>
        `;
        
        return card;
    }
    
    displayExcelView(data) {
        const tbody = document.querySelector('.js-excel-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        data.forEach((item, index) => {
            const row = this.createExcelRow(item, index);
            tbody.appendChild(row);
        });
        
        console.log('📊 Excelビュー表示完了:', data.length, '件');
    }
    
    createExcelRow(item, index) {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--border-light)';
        row.style.height = '40px';
        
        const stockText = item.type === 'dropship' ? '∞' : (item.stock || 0);
        const typeLabel = this.getTypeLabel(item.type);
        
        row.innerHTML = `
            <td style="border: 1px solid var(--border-light); padding: var(--space-xs); text-align: center;">
                <input type="checkbox" style="width: 14px; height: 14px;" />
            </td>
            <td style="border: 1px solid var(--border-light); padding: var(--space-xs); text-align: center;">
                ${item.image ? 
                    `<img src="${item.image}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 3px;" />` :
                    `<i class="fas fa-image" style="color: var(--text-muted);"></i>`
                }
            </td>
            <td style="border: 1px solid var(--border-light); padding: var(--space-xs); font-weight: 500; cursor: pointer;" onclick="window.uiController.showItemDetails(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                ${item.title || item.name}
            </td>
            <td style="border: 1px solid var(--border-light); padding: var(--space-xs); font-family: monospace; font-size: 0.7rem;">
                ${item.sku}
            </td>
            <td style="border: 1px solid var(--border-light); padding: var(--space-xs); text-align: center;">
                <span style="padding: 2px 6px; border-radius: 3px; font-size: 0.65rem; font-weight: 600; color: white; background: ${this.getTypeColor(item.type)};">
                    ${typeLabel}
                </span>
            </td>
            <td style="border: 1px solid var(--border-light); padding: var(--space-xs); text-align: right; font-weight: 600;">
                $${item.priceUSD || item.price || '0.00'}
            </td>
            <td style="border: 1px solid var(--border-light); padding: var(--space-xs); text-align: center; font-weight: 600;">
                ${stockText}
            </td>
            <td style="border: 1px solid var(--border-light); padding: var(--space-xs); text-align: center;">
                <button style="padding: 2px 6px; border: 1px solid var(--border-color); border-radius: 3px; background: var(--bg-secondary); cursor: pointer; font-size: 0.65rem;" onclick="window.uiController.editItem('${item.id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        
        return row;
    }
    
    getTypeLabel(type) {
        const labels = {
            'stock': '有在庫',
            'dropship': '無在庫',
            'set': 'セット',
            'hybrid': 'ハイブリッド'
        };
        return labels[type] || type;
    }
    
    getTypeColor(type) {
        const colors = {
            'stock': '#10b981',
            'dropship': '#0e7490',
            'set': '#7c3aed',
            'hybrid': '#f59e0b'
        };
        return colors[type] || '#64748b';
    }
    
    showLoadingState() {
        const grid = document.querySelector('.js-inventory-grid');
        const tbody = document.querySelector('.js-excel-tbody');
        
        const loadingHtml = `
            <div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>データを読み込み中...</p>
            </div>
        `;
        
        if (grid) grid.innerHTML = loadingHtml;
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="padding: 2rem; text-align: center; color: #64748b;"><i class="fas fa-spinner fa-spin"></i> データを読み込み中...</td></tr>`;
    }
    
    showErrorState(message) {
        const grid = document.querySelector('.js-inventory-grid');
        const tbody = document.querySelector('.js-excel-tbody');
        
        const errorHtml = `
            <div style="text-align: center; padding: 2rem; color: #dc2626; grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>${message}</p>
                <button onclick="window.uiController.loadAndDisplayData()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    再試行
                </button>
            </div>
        `;
        
        if (grid) grid.innerHTML = errorHtml;
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="padding: 2rem; text-align: center; color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> ${message}</td></tr>`;
    }
    
    updateStatistics() {
        if (!this.currentData.length) return;
        
        const stats = this.calculateStatistics(this.currentData);
        
        // 統計要素更新
        const elements = {
            'total-products': stats.total,
            'stock-products': stats.stock,
            'dropship-products': stats.dropship,
            'set-products': stats.set,
            'hybrid-products': stats.hybrid,
            'total-value': `$${stats.totalValue}K`
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }
    
    calculateStatistics(data) {
        const stats = {
            total: data.length,
            stock: 0,
            dropship: 0,
            set: 0,
            hybrid: 0,
            totalValue: 0
        };
        
        data.forEach(item => {
            stats[item.type]++;
            stats.totalValue += (item.priceUSD || item.price || 0) * (item.stock || 1);
        });
        
        stats.totalValue = Math.round(stats.totalValue / 1000 * 100) / 100;
        
        return stats;
    }
    
    updatePagination(totalItems) {
        const cardInfo = document.getElementById('card-pagination-info');
        const excelInfo = document.getElementById('excel-pagination-info');
        
        if (cardInfo) cardInfo.textContent = `商品: ${totalItems}件`;
        if (excelInfo) excelInfo.textContent = `商品: ${totalItems}件`;
    }
    
    // モーダル関連メソッド
    openModal(modalId) {
        this.modalManager.openModal(modalId);
    }
    
    closeModal(modalId) {
        this.modalManager.closeModal(modalId);
    }
    
    showItemDetails(item) {
        console.log('📋 商品詳細表示:', item);
        // 詳細モーダルの実装
        alert('商品詳細: ' + (item.title || item.name));
    }
    
    editItem(itemId) {
        console.log('✏️ アイテム編集:', itemId);
        alert('アイテム編集機能は実装中です');
    }
    
    // ビュー切り替え
    switchView(viewType) {
        this.currentView = viewType;
        
        const cardView = document.getElementById('card-view');
        const excelView = document.getElementById('list-view');
        const cardBtn = document.getElementById('card-view-btn');
        const excelBtn = document.getElementById('excel-view-btn');
        
        if (viewType === 'card') {
            cardView?.classList.add('inventory__view--visible');
            cardView?.classList.remove('inventory__view--hidden');
            excelView?.classList.add('inventory__view--hidden');
            excelView?.classList.remove('inventory__view--visible');
            
            cardBtn?.classList.add('inventory__view-btn--active');
            excelBtn?.classList.remove('inventory__view-btn--active');
        } else {
            excelView?.classList.add('inventory__view--visible');
            excelView?.classList.remove('inventory__view--hidden');
            cardView?.classList.add('inventory__view--hidden');
            cardView?.classList.remove('inventory__view--visible');
            
            excelBtn?.classList.add('inventory__view-btn--active');
            cardBtn?.classList.remove('inventory__view-btn--active');
        }
        
        this.displayData(this.currentData);
    }
}

// === グローバル関数（既存コードとの互換性） ===
function openModal(modalId) {
    window.uiController?.openModal(modalId);
}

function closeModal(modalId) {
    window.uiController?.closeModal(modalId);
}

function openAddProductModal() {
    openModal('addProductModal');
}

function createNewSet() {
    openModal('setModal');
}

function openTestModal() {
    openModal('testModal');
}

function closeSetModal() {
    closeModal('setModal');
}

async function testPostgreSQL() {
    try {
        const result = await window.uiController.dataManager.ajax.testDatabase();
        
        const testBody = document.getElementById('testModalBody');
        if (testBody) {
            testBody.innerHTML = `
                <div style="font-family: monospace; background: #f8f9fa; padding: 1rem; border-radius: 4px;">
                    <h4>PostgreSQL接続テスト結果</h4>
                    <pre>${JSON.stringify(result, null, 2)}</pre>
                </div>
            `;
        }
        openModal('testModal');
    } catch (error) {
        alert('PostgreSQLテストエラー: ' + error.message);
    }
}

// その他の関数（モック実装）
function saveNewProduct() { alert('商品登録機能は実装中です'); }
function previewProductImage(event) { console.log('画像プレビュー'); }
function removeNewProductImage() { console.log('画像削除'); }
function syncWithEbay() { alert('eBay同期機能は実装中です'); }
function editItem() { alert('アイテム編集機能は実装中です'); }
function saveSetProduct() { alert('セット品保存機能は実装中です'); }
function fetchIndividualProductsForSet() { alert('個別商品検索機能は実装中です'); }
function filterComponentProducts() { alert('構成商品フィルター機能は実装中です'); }
function searchExcelTable(value) { console.log('Excel検索:', value); }
function changeExcelPage(direction) { console.log('Excelページ変更:', direction); }
function changeExcelItemsPerPage(newValue) { console.log('Excel表示件数変更:', newValue); }
function changeCardPage(direction) { console.log('カードページ変更:', direction); }
function changeCardsPerPage(newValue) { console.log('カード表示件数変更:', newValue); }
function applyFilters() { console.log('フィルター適用'); }
function resetFilters() { console.log('フィルターリセット'); }

// === 初期化処理 ===
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎯 N3準拠棚卸しシステム開始');
    
    // UIコントローラー初期化
    window.uiController = new UIController();
    await window.uiController.initializeSystem();
    
    // ビュー切り替えイベント
    document.getElementById('card-view-btn')?.addEventListener('click', () => {
        window.uiController.switchView('card');
    });
    
    document.getElementById('excel-view-btn')?.addEventListener('click', () => {
        window.uiController.switchView('excel');
    });
    
    console.log('✅ N3準拠棚卸しシステム初期化完了');
});

console.log('✅ N3準拠外部JavaScript読み込み完了');
