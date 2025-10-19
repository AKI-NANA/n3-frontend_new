/**
 * ゴルフ商品管理システム フロントエンド
 */

class GolfProductManager {
    constructor(apiEndpoint) {
        this.apiEndpoint = apiEndpoint || '/api/golf_products_api.php';
        this.clubTypes = ['ドライバー', 'フェアウェイウッド', 'ユーティリティ', 'アイアン', 'ウェッジ', 'パター'];
        this.flexOptions = ['R', 'S', 'SR', 'X', 'L', 'R2', 'S2'];
        this.conditionRanks = ['A+', 'A', 'B', 'C', 'D'];
    }
    
    async init() {
        await this.loadPlatformInfo();
        await this.loadBrands();
        this.setupEventListeners();
        this.renderUI();
    }
    
    async loadPlatformInfo() {
        try {
            const response = await fetch(`${this.apiEndpoint}?action=get_platform_info`);
            const data = await response.json();
            
            if (data.success) {
                this.platforms = data.platforms;
                this.categories = data.categories;
            }
        } catch (error) {
            console.error('プラットフォーム情報取得エラー:', error);
        }
    }
    
    async loadBrands() {
        try {
            const response = await fetch(`${this.apiEndpoint}?action=get_golf_brands`);
            const data = await response.json();
            
            if (data.success) {
                this.brands = data.brands;
            }
        } catch (error) {
            console.error('ブランド情報取得エラー:', error);
        }
    }
    
    async searchGolfClubs(filters) {
        const params = new URLSearchParams({
            action: 'search_golf_clubs',
            ...filters
        });
        
        try {
            const response = await fetch(`${this.apiEndpoint}?${params}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('検索エラー:', error);
            return { success: false, error: error.message };
        }
    }
    
    async getGolfSpecs(productId) {
        try {
            const response = await fetch(`${this.apiEndpoint}?action=get_golf_specs&product_id=${productId}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('仕様取得エラー:', error);
            return { success: false, error: error.message };
        }
    }
    
    async registerGolfSpecs(specsData) {
        const formData = new FormData();
        formData.append('action', 'register_golf_specs');
        
        for (const [key, value] of Object.entries(specsData)) {
            if (value !== null && value !== undefined) {
                formData.append(key, value);
            }
        }
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('仕様登録エラー:', error);
            return { success: false, error: error.message };
        }
    }
    
    async getInventoryAlerts() {
        try {
            const response = await fetch(`${this.apiEndpoint}?action=get_golf_inventory_alerts`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('アラート取得エラー:', error);
            return { success: false, error: error.message };
        }
    }
    
    async getCategoryStats() {
        try {
            const response = await fetch(`${this.apiEndpoint}?action=get_category_stats`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('統計取得エラー:', error);
            return { success: false, error: error.message };
        }
    }
    
    async getPopularClubs(limit = 20) {
        try {
            const response = await fetch(`${this.apiEndpoint}?action=get_popular_clubs&limit=${limit}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('人気クラブ取得エラー:', error);
            return { success: false, error: error.message };
        }
    }
    
    renderUI() {
        const container = document.getElementById('golf-manager-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="golf-manager">
                <header class="golf-header">
                    <h1>ゴルフクラブ在庫管理システム</h1>
                    <div class="header-stats" id="header-stats"></div>
                </header>
                
                <div class="golf-content">
                    <aside class="golf-sidebar">
                        <nav class="golf-nav">
                            <button class="nav-btn active" data-view="search">検索</button>
                            <button class="nav-btn" data-view="inventory">在庫一覧</button>
                            <button class="nav-btn" data-view="alerts">アラート</button>
                            <button class="nav-btn" data-view="popular">人気クラブ</button>
                            <button class="nav-btn" data-view="scrape">スクレイピング</button>
                        </nav>
                    </aside>
                    
                    <main class="golf-main">
                        <div id="search-view" class="view-content active">
                            ${this.renderSearchView()}
                        </div>
                        
                        <div id="inventory-view" class="view-content">
                            <h2>在庫一覧</h2>
                            <div id="inventory-list"></div>
                        </div>
                        
                        <div id="alerts-view" class="view-content">
                            <h2>在庫アラート</h2>
                            <div id="alerts-list"></div>
                        </div>
                        
                        <div id="popular-view" class="view-content">
                            <h2>人気クラブランキング</h2>
                            <div id="popular-list"></div>
                        </div>
                        
                        <div id="scrape-view" class="view-content">
                            ${this.renderScrapeView()}
                        </div>
                    </main>
                </div>
            </div>
        `;
        
        this.loadCategoryStats();
    }
    
    renderSearchView() {
        return `
            <div class="search-section">
                <h2>ゴルフクラブ検索</h2>
                <form id="golf-search-form" class="search-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>クラブタイプ</label>
                            <select id="search-club-type">
                                <option value="">すべて</option>
                                ${this.clubTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>ブランド</label>
                            <select id="search-brand">
                                <option value="">すべて</option>
                                ${(this.brands || []).map(b => `<option value="${b.brand}">${b.brand} (${b.product_count})</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>フレックス</label>
                            <select id="search-flex">
                                <option value="">すべて</option>
                                ${this.flexOptions.map(flex => `<option value="${flex}">${flex}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>最低価格</label>
                            <input type="number" id="search-min-price" placeholder="0">
                        </div>
                        
                        <div class="form-group">
                            <label>最高価格</label>
                            <input type="number" id="search-max-price" placeholder="999999">
                        </div>
                        
                        <div class="form-group">
                            <label>ステータス</label>
                            <select id="search-status">
                                <option value="">すべて</option>
                                <option value="available">在庫あり</option>
                                <option value="sold_out">売切</option>
                            </select>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn-primary">検索</button>
                    <button type="button" id="reset-search" class="btn-secondary">リセット</button>
                </form>
                
                <div id="search-results"></div>
            </div>
        `;
    }
    
    renderScrapeView() {
        return `
            <div class="scrape-section">
                <h2>ゴルフクラブスクレイピング</h2>
                
                <div class="scrape-single">
                    <h3>単一URL</h3>
                    <form id="golf-scrape-form">
                        <input type="url" id="golf-scrape-url" placeholder="ゴルフ商品URL" required>
                        <button type="submit">スクレイピング</button>
                    </form>
                    <div id="scrape-result"></div>
                </div>
                
                <div class="scrape-batch">
                    <h3>一括スクレイピング</h3>
                    <textarea id="golf-batch-urls" placeholder="URLを1行ずつ入力" rows="8"></textarea>
                    <button id="golf-batch-scrape">一括実行</button>
                    <div id="batch-scrape-result"></div>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // ナビゲーション
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-btn')) {
                this.switchView(e.target.dataset.view);
            }
        });
        
        // 検索フォーム
        document.addEventListener('submit', async (e) => {
            if (e.target.id === 'golf-search-form') {
                e.preventDefault();
                await this.handleSearch();
            }
            
            if (e.target.id === 'golf-scrape-form') {
                e.preventDefault();
                await this.handleSingleScrape();
            }
        });
        
        // リセットボタン
        document.addEventListener('click', (e) => {
            if (e.target.id === 'reset-search') {
                document.getElementById('golf-search-form').reset();
            }
            
            if (e.target.id === 'golf-batch-scrape') {
                this.handleBatchScrape();
            }
        });
    }
    
    async handleSearch() {
        const filters = {
            club_type: document.getElementById('search-club-type').value,
            brand: document.getElementById('search-brand').value,
            flex: document.getElementById('search-flex').value,
            min_price: document.getElementById('search-min-price').value,
            max_price: document.getElementById('search-max-price').value,
            status: document.getElementById('search-status').value
        };
        
        this.showLoading('検索中...');
        const result = await this.searchGolfClubs(filters);
        this.hideLoading();
        
        if (result.success) {
            this.displaySearchResults(result.results);
        } else {
            this.showError(result.error);
        }
    }
    
    async handleSingleScrape() {
        const url = document.getElementById('golf-scrape-url').value;
        const formData = new FormData();
        formData.append('action', 'scrape_golf_product');
        formData.append('url', url);
        
        this.showLoading('スクレイピング中...');
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            this.hideLoading();
            this.displayScrapeResult(result);
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }
    
    async handleBatchScrape() {
        const textarea = document.getElementById('golf-batch-urls');
        const urls = textarea.value.split('\n').filter(url => url.trim());
        
        if (urls.length === 0) {
            this.showError('URLを入力してください');
            return;
        }
        
        const formData = new FormData();
        formData.append('action', 'batch_scrape_golf');
        formData.append('urls', JSON.stringify(urls));
        
        this.showLoading(`${urls.length}件のURLを処理中...`);
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            this.hideLoading();
            this.displayBatchScrapeResult(result);
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }
    
    switchView(viewName) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.view-content').forEach(view => view.classList.remove('active'));
        
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
        document.getElementById(`${viewName}-view`).classList.add('active');
        
        // ビュー切り替え時のデータ読み込み
        if (viewName === 'alerts') {
            this.loadAlerts();
        } else if (viewName === 'popular') {
            this.loadPopularClubs();
        }
    }
    
    async loadCategoryStats() {
        const result = await this.getCategoryStats();
        if (result.success) {
            this.displayCategoryStats(result.statistics);
        }
    }
    
    async loadAlerts() {
        const result = await this.getInventoryAlerts();
        if (result.success) {
            this.displayAlerts(result.alerts, result.summary);
        }
    }
    
    async loadPopularClubs() {
        const result = await this.getPopularClubs();
        if (result.success) {
            this.displayPopularClubs(result.popular_clubs);
        }
    }
    
    displaySearchResults(results) {
        const container = document.getElementById('search-results');
        
        if (!results || results.length === 0) {
            container.innerHTML = '<p class="no-results">検索結果がありません</p>';
            return;
        }
        
        let html = `<div class="results-header"><h3>検索結果: ${results.length}件</h3></div>`;
        html += '<div class="golf-clubs-grid">';
        
        results.forEach(club => {
            html += `
                <div class="golf-club-card">
                    <div class="club-header">
                        <span class="club-type">${club.club_type || '-'}</span>
                        <span class="platform-badge">${club.platform}</span>
                    </div>
                    <h4 class="club-title">${club.product_title}</h4>
                    <div class="club-specs">
                        <div class="spec-item"><label>ブランド:</label> ${club.brand || '-'}</div>
                        <div class="spec-item"><label>モデル:</label> ${club.model || '-'}</div>
                        <div class="spec-item"><label>ロフト:</label> ${club.loft || '-'}°</div>
                        <div class="spec-item"><label>フレックス:</label> ${club.flex || '-'}</div>
                        <div class="spec-item"><label>状態:</label> ${club.condition_rank || '-'}</div>
                    </div>
                    <div class="club-footer">
                        <span class="club-price">¥${parseFloat(club.purchase_price).toLocaleString()}</span>
                        <span class="club-status ${club.url_status}">${club.url_status}</span>
                    </div>
                    <a href="${club.source_url}" target="_blank" class="btn-view">詳細を見る</a>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    displayCategoryStats(stats) {
        const container = document.getElementById('header-stats');
        if (!container || !stats) return;
        
        let html = '<div class="stats-summary">';
        stats.forEach(stat => {
            html += `
                <div class="stat-card">
                    <div class="stat-label">${stat.category}</div>
                    <div class="stat-value">${stat.total_products}</div>
                    <div class="stat-detail">在庫: ${stat.available_count}</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }
    
    displayAlerts(alerts, summary) {
        const container = document.getElementById('alerts-list');
        
        let html = `
            <div class="alerts-summary">
                <div class="alert-stat">売切: ${summary.sold_out}</div>
                <div class="alert-stat">リンク切れ: ${summary.dead_link}</div>
                <div class="alert-stat">要確認: ${summary.needs_check}</div>
                <div class="alert-stat">低価格: ${summary.low_price}</div>
            </div>
            <div class="alerts-list">
        `;
        
        alerts.forEach(alert => {
            const alertClass = alert.alert_type.toLowerCase().replace('_', '-');
            html += `
                <div class="alert-item ${alertClass}">
                    <div class="alert-header">
                        <span class="alert-type">${alert.alert_type}</span>
                        <span class="alert-platform">${alert.platform_name}</span>
                    </div>
                    <div class="alert-content">
                        <h4>${alert.product_title}</h4>
                        <p>${alert.brand || ''} ${alert.model || ''}</p>
                        <p>¥${parseFloat(alert.purchase_price).toLocaleString()}</p>
                        <p class="alert-days">未確認: ${alert.days_unverified}日</p>
                    </div>
                    <a href="${alert.source_url}" target="_blank" class="btn-check">確認</a>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    displayPopularClubs(clubs) {
        const container = document.getElementById('popular-list');
        
        let html = '<div class="popular-clubs-list">';
        clubs.forEach((club, index) => {
            html += `
                <div class="popular-club-item">
                    <div class="rank">${index + 1}</div>
                    <div class="club-info">
                        <h4>${club.brand} ${club.model}</h4>
                        <p>${club.club_type}</p>
                        <div class="club-stats">
                            <span>出品数: ${club.listing_count}</span>
                            <span>平均: ¥${parseFloat(club.avg_price).toLocaleString()}</span>
                            <span>最安: ¥${parseFloat(club.min_price).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }
    
    displayScrapeResult(result) {
        const container = document.getElementById('scrape-result');
        
        if (result.success) {
            container.innerHTML = `
                <div class="alert alert-success">
                    <h4>✓ スクレイピング成功</h4>
                    <p>商品ID: ${result.product_id}</p>
                    <p>タイトル: ${result.data.title}</p>
                    <p>価格: ¥${parseFloat(result.data.price).toLocaleString()}</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="alert alert-error">
                    <h4>✗ エラー</h4>
                    <p>${result.error}</p>
                </div>
            `;
        }
    }
    
    displayBatchScrapeResult(result) {
        const container = document.getElementById('batch-scrape-result');
        
        container.innerHTML = `
            <div class="batch-summary">
                <h4>一括処理完了</h4>
                <div class="summary-stats">
                    <div>総数: ${result.summary.total}</div>
                    <div>成功: ${result.summary.successful}</div>
                    <div>失敗: ${result.summary.failed}</div>
                    <div>重複: ${result.summary.duplicates}</div>
                </div>
            </div>
        `;
    }
    
    showLoading(message) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'golf-loading';
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    }
    
    hideLoading() {
        const loading = document.getElementById('golf-loading');
        if (loading) loading.remove();
    }
    
    showError(message) {
        alert(message);
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    const manager = new GolfProductManager();
    manager.init();
});