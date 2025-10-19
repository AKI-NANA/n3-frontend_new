/**
 * 拡張プラットフォームスクレイピング管理
 * 新規5プラットフォーム対応フロントエンド
 */

class ExtendedPlatformManager {
    constructor(apiEndpoint) {
        this.apiEndpoint = apiEndpoint || '/api/extended_platform_api.php';
        this.supportedPlatforms = [];
        this.platformNames = {
            'pokemon_center': 'ポケモンセンター',
            'yodobashi': 'ヨドバシ',
            'monotaro': 'モノタロウ',
            'surugaya': '駿河屋',
            'offmall': 'オフモール',
            'mercari': 'メルカリ',
            'yahoo_fleamarket': 'Yahoo！フリマ',
            'second_street': 'セカンドストリート'
        };
    }
    
    async init() {
        await this.loadSupportedPlatforms();
        this.setupEventListeners();
        this.renderUI();
    }
    
    async loadSupportedPlatforms() {
        try {
            const response = await fetch(`${this.apiEndpoint}?action=get_supported_platforms`);
            const data = await response.json();
            
            if (data.success) {
                this.supportedPlatforms = data.platforms;
                this.renderPlatformStats(data.stats);
            }
        } catch (error) {
            console.error('プラットフォーム読み込みエラー:', error);
            this.showError('プラットフォーム情報の取得に失敗しました');
        }
    }
    
    async scrapeUrl(url, options = {}) {
        const formData = new FormData();
        formData.append('action', 'scrape_new_platform');
        formData.append('url', url);
        formData.append('download_images', options.downloadImages || true);
        formData.append('force', options.force || false);
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('スクレイピングエラー:', error);
            return { success: false, error: error.message };
        }
    }
    
    async batchScrape(urls, options = {}) {
        const formData = new FormData();
        formData.append('action', 'batch_scrape');
        formData.append('urls', JSON.stringify(urls));
        formData.append('download_images', options.downloadImages || true);
        formData.append('force', options.force || false);
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('一括スクレイピングエラー:', error);
            return { success: false, error: error.message };
        }
    }
    
    async getPlatformProducts(platform, limit = 50, offset = 0) {
        try {
            const response = await fetch(
                `${this.apiEndpoint}?action=get_platform_products&platform=${platform}&limit=${limit}&offset=${offset}`
            );
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('商品取得エラー:', error);
            return { success: false, error: error.message };
        }
    }
    
    async checkInventory(productId) {
        const formData = new FormData();
        formData.append('action', 'check_inventory');
        formData.append('product_id', productId);
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('在庫確認エラー:', error);
            return { success: false, error: error.message };
        }
    }
    
    async getPlatformSummary() {
        try {
            const response = await fetch(`${this.apiEndpoint}?action=get_platform_summary`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('サマリー取得エラー:', error);
            return { success: false, error: error.message };
        }
    }
    
    async searchProducts(keyword, platform = '', status = '') {
        try {
            let url = `${this.apiEndpoint}?action=search_products&keyword=${encodeURIComponent(keyword)}`;
            if (platform) url += `&platform=${platform}`;
            if (status) url += `&status=${status}`;
            
            const response = await fetch(url);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('検索エラー:', error);
            return { success: false, error: error.message };
        }
    }
    
    renderUI() {
        const container = document.getElementById('extended-platform-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="extended-platform-ui">
                <div class="header">
                    <h2>拡張プラットフォーム管理</h2>
                </div>
                
                <div class="scrape-section">
                    <h3>商品スクレイピング</h3>
                    <form id="scrape-form">
                        <input type="url" id="scrape-url" placeholder="商品URLを入力" required>
                        <label>
                            <input type="checkbox" id="download-images" checked>
                            画像ダウンロード
                        </label>
                        <button type="submit">スクレイピング実行</button>
                    </form>
                    <div id="scrape-result"></div>
                </div>
                
                <div class="batch-section">
                    <h3>一括スクレイピング</h3>
                    <textarea id="batch-urls" placeholder="URLを1行ずつ入力" rows="5"></textarea>
                    <button id="batch-scrape-btn">一括実行</button>
                    <div id="batch-result"></div>
                </div>
                
                <div class="stats-section">
                    <h3>プラットフォーム統計</h3>
                    <div id="platform-stats"></div>
                </div>
                
                <div class="products-section">
                    <h3>商品一覧</h3>
                    <div class="filters">
                        <select id="platform-filter">
                            <option value="">全プラットフォーム</option>
                        </select>
                        <select id="status-filter">
                            <option value="">全ステータス</option>
                            <option value="available">在庫あり</option>
                            <option value="sold_out">売切</option>
                            <option value="dead">リンク切れ</option>
                        </select>
                        <input type="text" id="search-keyword" placeholder="キーワード検索">
                        <button id="search-btn">検索</button>
                    </div>
                    <div id="products-list"></div>
                </div>
            </div>
        `;
        
        // プラットフォームフィルター初期化
        this.initializePlatformFilter();
    }
    
    initializePlatformFilter() {
        const filterSelect = document.getElementById('platform-filter');
        if (!filterSelect) return;
        
        this.supportedPlatforms.forEach(platform => {
            const option = document.createElement('option');
            option.value = platform;
            option.textContent = this.platformNames[platform] || platform;
            filterSelect.appendChild(option);
        });
    }
    
    renderPlatformStats(stats) {
        const container = document.getElementById('platform-stats');
        if (!container) return;
        
        let html = '<div class="platform-stats-grid">';
        
        for (const [platform, stat] of Object.entries(stats)) {
            const name = this.platformNames[platform] || platform;
            const total = parseInt(stat.total) || 0;
            const available = parseInt(stat.available) || 0;
            const soldOut = parseInt(stat.sold_out) || 0;
            const avgPrice = parseFloat(stat.avg_price) || 0;
            
            html += `
                <div class="platform-card" data-platform="${platform}">
                    <h4>${name}</h4>
                    <div class="stats">
                        <div class="stat-item">
                            <span class="label">総数:</span>
                            <span class="value">${total}</span>
                        </div>
                        <div class="stat-item">
                            <span class="label">在庫あり:</span>
                            <span class="value available">${available}</span>
                        </div>
                        <div class="stat-item">
                            <span class="label">売切:</span>
                            <span class="value sold-out">${soldOut}</span>
                        </div>
                        <div class="stat-item">
                            <span class="label">平均価格:</span>
                            <span class="value">¥${avgPrice.toLocaleString()}</span>
                        </div>
                    </div>
                    <button class="btn-view-products" data-platform="${platform}">
                        商品一覧
                    </button>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    setupEventListeners() {
        // URL入力フォーム
        const scrapeForm = document.getElementById('scrape-form');
        if (scrapeForm) {
            scrapeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const url = document.getElementById('scrape-url').value;
                const downloadImages = document.getElementById('download-images').checked;
                
                this.showLoading('スクレイピング中...');
                const result = await this.scrapeUrl(url, { downloadImages });
                this.hideLoading();
                this.displayResult(result);
            });
        }
        
        // 一括スクレイピング
        const batchBtn = document.getElementById('batch-scrape-btn');
        if (batchBtn) {
            batchBtn.addEventListener('click', async () => {
                const textarea = document.getElementById('batch-urls');
                const urls = textarea.value.split('\n').filter(url => url.trim());
                
                if (urls.length === 0) {
                    this.showError('URLを入力してください');
                    return;
                }
                
                this.showLoading(`${urls.length}件のURLを処理中...`);
                const result = await this.batchScrape(urls);
                this.hideLoading();
                this.displayBatchResult(result);
            });
        }
        
        // プラットフォームカードのクリック
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-view-products')) {
                const platform = e.target.dataset.platform;
                const products = await this.getPlatformProducts(platform);
                this.displayProducts(products);
            }
            
            if (e.target.classList.contains('btn-check-inventory')) {
                const productId = e.target.dataset.id;
                this.showLoading('在庫確認中...');
                const result = await this.checkInventory(productId);
                this.hideLoading();
                this.displayResult(result);
            }
        });
        
        // 検索ボタン
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', async () => {
                const keyword = document.getElementById('search-keyword').value;
                const platform = document.getElementById('platform-filter').value;
                const status = document.getElementById('status-filter').value;
                
                const result = await this.searchProducts(keyword, platform, status);
                this.displayProducts(result);
            });
        }
    }
    
    displayResult(result) {
        const resultContainer = document.getElementById('scrape-result');
        if (!resultContainer) return;
        
        if (result.success) {
            resultContainer.innerHTML = `
                <div class="alert alert-success">
                    <h4>✓ スクレイピング成功</h4>
                    <p>商品ID: ${result.product_id}</p>
                    <p>タイトル: ${result.data.title}</p>
                    <p>価格: ¥${parseFloat(result.data.price).toLocaleString()}</p>
                    <p>処理時間: ${result.processing_time_ms}ms</p>
                    ${result.duplicate ? '<p class="warning">※既存の商品です</p>' : ''}
                </div>
            `;
        } else {
            resultContainer.innerHTML = `
                <div class="alert alert-error">
                    <h4>✗ エラー</h4>
                    <p>${result.error}</p>
                </div>
            `;
        }
    }
    
    displayBatchResult(result) {
        const resultContainer = document.getElementById('batch-result');
        if (!resultContainer) return;
        
        const summary = result.summary || {};
        resultContainer.innerHTML = `
            <div class="batch-summary">
                <h4>一括処理完了</h4>
                <div class="summary-stats">
                    <div>総数: ${summary.total || 0}</div>
                    <div>成功: ${summary.successful || 0}</div>
                    <div>失敗: ${summary.failed || 0}</div>
                    <div>重複: ${summary.duplicates || 0}</div>
                </div>
            </div>
        `;
    }
    
    displayProducts(response) {
        const productsContainer = document.getElementById('products-list');
        if (!productsContainer) return;
        
        if (!response.success || !response.products || response.products.length === 0) {
            productsContainer.innerHTML = '<p class="no-products">商品が見つかりません</p>';
            return;
        }
        
        let html = '<div class="products-grid">';
        
        response.products.forEach(product => {
            const statusClass = product.url_status === 'available' ? 'available' : 'sold-out';
            const platformName = this.platformNames[product.platform] || product.platform;
            
            html += `
                <div class="product-card">
                    <div class="product-platform">${platformName}</div>
                    <h4 class="product-title">${product.product_title}</h4>
                    <p class="product-price">¥${parseFloat(product.purchase_price).toLocaleString()}</p>
                    <p class="product-status ${statusClass}">${product.url_status}</p>
                    <p class="product-condition">${product.condition_type || ''}</p>
                    <p class="product-date">登録: ${new Date(product.created_at).toLocaleDateString('ja-JP')}</p>
                    <div class="product-actions">
                        <button class="btn-check-inventory" data-id="${product.id}">
                            在庫確認
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        if (response.total > response.products.length) {
            html += `<div class="pagination-info">表示: ${response.products.length} / ${response.total}件</div>`;
        }
        
        productsContainer.innerHTML = html;
    }
    
    showLoading(message = '処理中...') {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    }
    
    hideLoading() {
        const loading = document.getElementById('loading-overlay');
        if (loading) {
            loading.remove();
        }
    }
    
    showError(message) {
        alert(message); // 簡易実装、実際はトーストなどを使用
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    const manager = new ExtendedPlatformManager();
    manager.init();
});