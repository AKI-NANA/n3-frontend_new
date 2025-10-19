/**
 * Yahoo Auction Tool - JavaScript (Complete Fixed Version)
 * エラー修正版・モジュール化・高機能承認システム
 * 最終更新: 2025-09-14
 */

console.log('🚀 Yahoo Auction Tool JavaScript (エラー修正版) 読み込み開始');

// グローバル設定
const YahooAuctionTool = {
    config: {
        API_BASE_URL: window.location.pathname,
        CSRF_TOKEN: '',
        DEBUG_MODE: true,
        AUTO_REFRESH_INTERVAL: 30000, // 30秒
        MAX_RETRY_COUNT: 3
    },
    
    // 状態管理
    state: {
        currentTab: 'dashboard',
        selectedProducts: new Set(),
        isLoading: false,
        lastUpdate: null
    },
    
    // 初期化
    init() {
        console.log('📊 Yahoo Auction Tool 初期化開始');
        
        // CSRF トークン設定
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        if (csrfMeta) {
            this.config.CSRF_TOKEN = csrfMeta.getAttribute('content');
        }
        
        // イベントリスナー設定
        this.setupEventListeners();
        
        // 初期データ読み込み
        this.updateDashboardStats();
        
        // 自動更新設定
        if (this.config.AUTO_REFRESH_INTERVAL > 0) {
            setInterval(() => {
                if (this.state.currentTab === 'dashboard' || this.state.currentTab === 'approval') {
                    this.updateDashboardStats();
                }
            }, this.config.AUTO_REFRESH_INTERVAL);
        }
        
        console.log('✅ Yahoo Auction Tool 初期化完了');
    },
    
    // イベントリスナー設定
    setupEventListeners() {
        // タブ切り替え
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });
        
        // 検索フォーム
        const searchInput = document.getElementById('searchQuery');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchDatabase();
                }
            });
        }
        
        console.log('📋 イベントリスナー設定完了');
    },
    
    // タブ切り替え
    switchTab(targetTab) {
        console.log('🔄 タブ切り替え:', targetTab);
        
        // 現在の状態を更新
        this.state.currentTab = targetTab;
        
        // 全てのタブとコンテンツのアクティブ状態をリセット
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // 指定されたタブをアクティブ化
        const targetButton = document.querySelector(`[data-tab="${targetTab}"]`);
        const targetContent = document.getElementById(targetTab);
        
        if (targetButton) {
            targetButton.classList.add('active');
        }
        if (targetContent) {
            targetContent.classList.add('active');
        }
        
        // タブ固有の初期化処理
        this.initializeTab(targetTab);
    },
    
    // タブ固有の初期化
    initializeTab(tabName) {
        switch(tabName) {
            case 'approval':
                setTimeout(() => this.loadApprovalData(), 100);
                break;
            case 'dashboard':
                this.updateDashboardStats();
                break;
            case 'analysis':
                this.loadAnalysisData();
                break;
            case 'ebay-category':
                console.log('🏷️ eBayカテゴリタブ初期化');
                // eBayカテゴリシステムが利用可能な場合の初期化
                if (typeof ebayCategorySystem !== 'undefined') {
                    console.log('✅ eBayカテゴリシステム準備完了');
                }
                break;
            default:
                console.log(`📋 タブ "${tabName}" の初期化処理はありません`);
        }
    },
    
    // API呼び出し共通関数
    async apiCall(endpoint, options = {}) {
        const {
            method = 'GET',
            data = null,
            retryCount = 0
        } = options;
        
        try {
            const fetchOptions = {
                method: method,
                headers: {
                    'Content-Type': method === 'POST' ? 'application/x-www-form-urlencoded' : 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };
            
            if (method === 'POST' && data) {
                if (data instanceof FormData) {
                    fetchOptions.body = data;
                } else {
                    fetchOptions.body = new URLSearchParams(data).toString();
                }
            }
            
            const response = await fetch(endpoint, fetchOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const responseData = await response.json();
            
            if (this.config.DEBUG_MODE) {
                console.log('📡 API Response:', responseData);
            }
            
            return responseData;
            
        } catch (error) {
            console.error('❌ API呼び出しエラー:', error);
            
            // リトライ機能
            if (retryCount < this.config.MAX_RETRY_COUNT) {
                console.log(`🔄 リトライ (${retryCount + 1}/${this.config.MAX_RETRY_COUNT})`);
                await this.sleep(1000 * (retryCount + 1)); // 指数バックオフ
                return this.apiCall(endpoint, { ...options, retryCount: retryCount + 1 });
            }
            
            throw error;
        }
    },
    
    // ユーティリティ: スリープ
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // ダッシュボード統計更新
    async updateDashboardStats() {
        try {
            console.log('📊 ダッシュボード統計更新開始');
            
            const data = await this.apiCall(`${this.config.API_BASE_URL}?action=get_dashboard_stats`);
            
            if (data.success && data.data) {
                const stats = data.data;
                
                // DOM更新
                this.updateStatElement('totalRecords', stats.total_records || 0);
                this.updateStatElement('scrapedCount', stats.scraped_count || 0);
                this.updateStatElement('calculatedCount', stats.calculated_count || 0);
                this.updateStatElement('filteredCount', stats.filtered_count || 0);
                this.updateStatElement('readyCount', stats.ready_count || 0);
                this.updateStatElement('listedCount', stats.listed_count || 0);
                
                this.state.lastUpdate = new Date();
                
                console.log('✅ ダッシュボード統計更新完了', stats);
            }
            
        } catch (error) {
            console.error('❌ 統計更新エラー:', error);
            this.showNotification('統計の更新に失敗しました', 'error');
        }
    },
    
    // 統計要素更新
    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
        }
    },
    
    // 承認データ読み込み
    async loadApprovalData() {
        console.log('🔍 承認データ読み込み開始');
        
        const container = document.getElementById('approval-product-grid');
        if (!container) return;
        
        // ローディング状態表示
        this.showLoadingState(container, '承認待ち商品を読み込み中...');
        
        try {
            const data = await this.apiCall(`${this.config.API_BASE_URL}?action=get_approval_queue`);
            
            if (data.success && data.data && data.data.length > 0) {
                this.displayApprovalProducts(data.data);
                this.updateApprovalStats(data.data);
                console.log('✅ 承認データ読み込み完了:', data.data.length, '件');
            } else {
                this.displayEmptyApprovalState();
                console.log('📭 承認待ち商品なし');
            }
            
        } catch (error) {
            console.error('❌ 承認データ読み込みエラー:', error);
            this.displayApprovalError(error.message);
        }
    },
    
    // ローディング状態表示
    showLoadingState(container, message = '読み込み中...') {
        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
    },
    
    // 承認商品表示
    displayApprovalProducts(products) {
        const container = document.getElementById('approval-product-grid');
        
        const productsHtml = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
                ${products.map(product => this.createProductCard(product)).join('')}
            </div>
        `;
        
        container.innerHTML = productsHtml;
    },
    
    // 商品カード作成
    createProductCard(product) {
        const riskColor = this.getRiskColor(product.risk_level);
        const imageUrl = product.picture_url || product.gallery_url;
        
        return `
            <div class="product-card" data-product-id="${product.item_id}">
                <div class="product-image-container">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" class="product-image" alt="${product.title || '商品画像'}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="product-image-placeholder" style="display: none;">
                             <i class="fas fa-image"></i>
                         </div>` :
                        `<div class="product-image-placeholder">
                             <i class="fas fa-image"></i>
                         </div>`
                    }
                    <div class="product-risk-badge" style="background: ${riskColor};">
                        ${product.risk_level || 'medium'}
                    </div>
                </div>
                <div class="product-content">
                    <h5 class="product-title" title="${product.title || 'タイトル不明'}">
                        ${this.truncateText(product.title || 'タイトル不明', 50)}
                    </h5>
                    <div class="product-meta">
                        <div class="product-price">$${product.current_price || '0.00'}</div>
                        <div class="product-reason">${product.approval_reason || 'review_needed'}</div>
                    </div>
                    <div class="product-details">
                        <div>状態: ${product.condition_name || 'N/A'}</div>
                        <div>カテゴリ: ${this.truncateText(product.category_name || 'N/A', 20)}</div>
                        <div>SKU: ${product.master_sku || product.item_id}</div>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-success" onclick="YahooAuctionTool.approveProduct('${product.item_id}')">
                            <i class="fas fa-check"></i> 承認
                        </button>
                        <button class="btn btn-danger" onclick="YahooAuctionTool.rejectProduct('${product.item_id}')">
                            <i class="fas fa-times"></i> 否認
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    
    // テキスト切り詰め
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },
    
    // リスクレベル色取得
    getRiskColor(riskLevel) {
        const colors = {
            'high': '#ef4444',
            'medium': '#f59e0b', 
            'low': '#10b981',
            'default': '#6b7280'
        };
        return colors[riskLevel] || colors.default;
    },
    
    // 空状態表示
    displayEmptyApprovalState() {
        const container = document.getElementById('approval-product-grid');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3 class="empty-state-title">承認待ち商品がありません</h3>
                <p class="empty-state-text">現在、承認が必要な商品はありません。新しいデータを取得するか、商品を手動で追加してください。</p>
                <div class="empty-state-actions">
                    <button class="btn btn-primary" onclick="YahooAuctionTool.loadApprovalData()">
                        <i class="fas fa-sync"></i> データを再読み込み
                    </button>
                    <button class="btn btn-success" onclick="YahooAuctionTool.openNewProductModal()">
                        <i class="fas fa-plus"></i> 新規商品追加
                    </button>
                </div>
            </div>
        `;
    },
    
    // エラー状態表示
    displayApprovalError(errorMessage) {
        const container = document.getElementById('approval-product-grid');
        container.innerHTML = `
            <div class="error-state">
                <div class="error-state-icon">⚠️</div>
                <h3 class="error-state-title">データ読み込みエラー</h3>
                <p class="error-state-text">${errorMessage}</p>
                <div class="error-state-actions">
                    <button class="btn btn-primary" onclick="YahooAuctionTool.loadApprovalData()">
                        <i class="fas fa-redo"></i> 再試行
                    </button>
                    <button class="btn btn-secondary" onclick="YahooAuctionTool.checkDatabaseConnection()">
                        <i class="fas fa-database"></i> 接続確認
                    </button>
                </div>
            </div>
        `;
    },
    
    // 承認統計更新
    updateApprovalStats(products) {
        const stats = {
            pending: products.length,
            highRisk: products.filter(p => p.risk_level === 'high').length,
            mediumRisk: products.filter(p => p.risk_level === 'medium').length,
            lowRisk: products.filter(p => p.risk_level === 'low').length,
            aiApproved: products.filter(p => p.ai_status === 'ai-approved').length,
            aiRejected: products.filter(p => p.ai_status === 'ai-rejected').length
        };
        
        this.updateStatElement('pendingCount', stats.pending);
        this.updateStatElement('highRiskCount', stats.highRisk);
        this.updateStatElement('mediumRiskCount', stats.mediumRisk);
        this.updateStatElement('autoApprovedCount', stats.aiApproved);
        
        console.log('📊 承認統計更新:', stats);
    },
    
    // 商品検索
    async searchDatabase() {
        const queryInput = document.getElementById('searchQuery');
        const resultsContainer = document.getElementById('searchResults');
        
        if (!queryInput || !resultsContainer) return;
        
        const query = queryInput.value.trim();
        
        if (!query) {
            this.showNotification('検索キーワードを入力してください', 'warning', resultsContainer);
            return;
        }
        
        console.log('🔍 検索実行:', query);
        
        // 検索中表示
        this.showNotification('データベースを検索中...', 'info', resultsContainer, true);
        
        try {
            const data = await this.apiCall(`${this.config.API_BASE_URL}?action=search_products&query=${encodeURIComponent(query)}`);
            
            if (data.success && data.data && data.data.length > 0) {
                this.displaySearchResults(data.data, query);
                console.log('✅ 検索完了:', data.data.length, '件見つかりました');
            } else {
                this.showNotification(`"${query}" の検索結果が見つかりませんでした`, 'info', resultsContainer);
            }
            
        } catch (error) {
            console.error('❌ 検索エラー:', error);
            this.showNotification(`検索エラー: ${error.message}`, 'error', resultsContainer);
        }
    },
    
    // 検索結果表示
    displaySearchResults(results, query) {
        const container = document.getElementById('searchResults');
        
        const resultsHtml = `
            <div class="search-results">
                <h4 class="search-results-header">"${query}" の検索結果: ${results.length}件</h4>
                <div class="search-results-grid">
                    ${results.map(result => `
                        <div class="search-result-item">
                            <h5 class="search-result-title">${result.title}</h5>
                            <div class="search-result-meta">
                                <span class="search-result-price">価格: $${result.current_price || '0.00'}</span>
                                <span class="search-result-sku">SKU: ${result.master_sku || result.item_id}</span>
                                <span class="search-result-category">カテゴリ: ${result.category_name || 'N/A'}</span>
                                <span class="search-result-system">システム: ${result.source_system || 'database'}</span>
                            </div>
                            ${result.picture_url ? 
                                `<img src="${result.picture_url}" class="search-result-image" alt="${result.title}">` : 
                                ''
                            }
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = resultsHtml;
    },
    
    // 通知表示
    showNotification(message, type = 'info', container = null, hasSpinner = false) {
        const iconMap = {
            info: 'fas fa-info-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle',
            success: 'fas fa-check-circle'
        };
        
        const icon = hasSpinner ? 'fas fa-spinner fa-spin' : iconMap[type];
        
        const html = `
            <div class="notification ${type}">
                <i class="${icon}"></i>
                <span>${message}</span>
            </div>
        `;
        
        if (container) {
            container.innerHTML = html;
        } else {
            // デフォルトの通知表示ロジック
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    },
    
    // 個別商品承認
    async approveProduct(itemId) {
        console.log('✅ 商品承認:', itemId);
        
        try {
            const data = await this.apiCall(this.config.API_BASE_URL, {
                method: 'POST',
                data: {
                    action: 'approve_products',
                    'skus[]': itemId,
                    decision: 'approve',
                    reviewer: 'user'
                }
            });
            
            if (data.success) {
                console.log('✅ 承認成功:', data.message);
                this.showNotification('商品を承認しました', 'success');
                
                // UI更新
                this.removeProductCard(itemId);
                this.loadApprovalData(); // データ再読み込み
            } else {
                console.error('❌ 承認失敗:', data.message);
                this.showNotification('承認に失敗しました', 'error');
            }
            
        } catch (error) {
            console.error('❌ 承認エラー:', error);
            this.showNotification('承認処理でエラーが発生しました', 'error');
        }
    },
    
    // 個別商品否認
    async rejectProduct(itemId) {
        console.log('❌ 商品否認:', itemId);
        
        try {
            const data = await this.apiCall(this.config.API_BASE_URL, {
                method: 'POST',
                data: {
                    action: 'approve_products',
                    'skus[]': itemId,
                    decision: 'reject',
                    reviewer: 'user'
                }
            });
            
            if (data.success) {
                console.log('✅ 否認成功:', data.message);
                this.showNotification('商品を否認しました', 'success');
                
                // UI更新
                this.removeProductCard(itemId);
                this.loadApprovalData(); // データ再読み込み
            } else {
                console.error('❌ 否認失敗:', data.message);
                this.showNotification('否認に失敗しました', 'error');
            }
            
        } catch (error) {
            console.error('❌ 否認エラー:', error);
            this.showNotification('否認処理でエラーが発生しました', 'error');
        }
    },
    
    // 商品カード削除
    removeProductCard(itemId) {
        const card = document.querySelector(`[data-product-id="${itemId}"]`);
        if (card) {
            card.style.transition = 'all 0.3s ease';
            card.style.transform = 'scale(0.8)';
            card.style.opacity = '0';
            setTimeout(() => {
                card.remove();
            }, 300);
        }
    },
    
    // データベース接続確認
    async checkDatabaseConnection() {
        console.log('🔌 データベース接続確認');
        
        try {
            const data = await this.apiCall(`${this.config.API_BASE_URL}?action=get_dashboard_stats`);
            
            if (data.success) {
                this.showNotification('データベース接続正常', 'success');
                console.log('✅ データベース接続確認完了');
            } else {
                this.showNotification('データベース接続に問題があります', 'warning');
            }
            
        } catch (error) {
            console.error('❌ 接続確認エラー:', error);
            this.showNotification('データベース接続エラー', 'error');
        }
    },
    
    // 分析データ読み込み
    async loadAnalysisData() {
        console.log('📊 分析データ読み込み');
        // 分析機能の実装は今後追加予定
        this.showNotification('分析機能は開発中です', 'info');
    },
    
    // 新規商品モーダル開く
    openNewProductModal() {
        console.log('➕ 新規商品登録モーダル');
        this.showNotification('新規商品登録機能は開発中です', 'info');
    },
    
    // プレースホルダー関数群
    selectAllVisible() { console.log('全選択'); },
    deselectAll() { console.log('全解除'); },
    bulkApprove() { console.log('一括承認'); },
    bulkReject() { console.log('一括否認'); },
    exportSelectedProducts() { console.log('CSV出力'); },
    loadEditingData() { console.log('編集データ読み込み'); },
    downloadEditingCSV() { console.log('CSV出力'); },
    testConnection() { console.log('接続テスト'); }
};

// グローバル関数（後方互換性のため）
function switchTab(targetTab) {
    YahooAuctionTool.switchTab(targetTab);
}

function searchDatabase() {
    YahooAuctionTool.searchDatabase();
}

function loadApprovalData() {
    YahooAuctionTool.loadApprovalData();
}

function approveProduct(itemId) {
    YahooAuctionTool.approveProduct(itemId);
}

function rejectProduct(itemId) {
    YahooAuctionTool.rejectProduct(itemId);
}

function selectAllVisible() { YahooAuctionTool.selectAllVisible(); }
function deselectAll() { YahooAuctionTool.deselectAll(); }
function bulkApprove() { YahooAuctionTool.bulkApprove(); }
function bulkReject() { YahooAuctionTool.bulkReject(); }
function exportSelectedProducts() { YahooAuctionTool.exportSelectedProducts(); }
function openNewProductModal() { YahooAuctionTool.openNewProductModal(); }
function loadAnalysisData() { YahooAuctionTool.loadAnalysisData(); }
function loadEditingData() { YahooAuctionTool.loadEditingData(); }
function downloadEditingCSV() { YahooAuctionTool.downloadEditingCSV(); }
function testConnection() { YahooAuctionTool.testConnection(); }

// DOM読み込み完了時の初期化
document.addEventListener('DOMContentLoaded', function() {
    YahooAuctionTool.init();
});

// エクスポート（モジュール使用時）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YahooAuctionTool;
}

console.log('✅ Yahoo Auction Tool JavaScript 読み込み完了');
