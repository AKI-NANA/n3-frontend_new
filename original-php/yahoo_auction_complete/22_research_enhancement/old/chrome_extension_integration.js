// chrome-extension/background.js
class BackgroundService {
    constructor() {
        this.apiBaseUrl = 'https://research-api.your-domain.com/api';
        this.authToken = null;
        this.researchCache = new Map();
        this.init();
    }

    init() {
        // インストール時の初期化
        chrome.runtime.onInstalled.addListener(this.handleInstall.bind(this));
        
        // メッセージリスナー
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
        
        // コンテキストメニュー作成
        this.createContextMenus();
        
        // 定期的なデータ同期
        this.startPeriodicSync();
        
        // 認証トークン復元
        this.restoreAuthToken();
    }

    async handleInstall(details) {
        if (details.reason === 'install') {
            // 初回インストール時の処理
            await this.showWelcomeTab();
            await this.initializeSettings();
        } else if (details.reason === 'update') {
            // アップデート時の処理
            await this.migrateSettings();
        }
    }

    async showWelcomeTab() {
        const welcomeUrl = chrome.runtime.getURL('welcome.html');
        await chrome.tabs.create({ url: welcomeUrl });
    }

    async initializeSettings() {
        const defaultSettings = {
            autoResearch: true,
            notifications: true,
            minProfitMargin: 15,
            maxRisk: 0.7,
            preferredSuppliers: ['amazon', 'rakuten'],
            currency: 'JPY',
            theme: 'light'
        };
        
        await chrome.storage.sync.set({ settings: defaultSettings });
    }

    createContextMenus() {
        chrome.contextMenus.create({
            id: 'research-product',
            title: '商品をリサーチ',
            contexts: ['selection', 'link'],
            documentUrlPatterns: [
                '*://www.ebay.com/*',
                '*://www.amazon.com/*',
                '*://www.amazon.co.jp/*'
            ]
        });

        chrome.contextMenus.onClicked.addListener(this.handleContextMenu.bind(this));
    }

    async handleContextMenu(info, tab) {
        if (info.menuItemId === 'research-product') {
            let searchQuery = info.selectionText;
            
            if (info.linkUrl) {
                // リンクから商品情報を抽出
                searchQuery = await this.extractProductFromUrl(info.linkUrl);
            }
            
            if (searchQuery) {
                await this.performQuickResearch(searchQuery, tab);
            }
        }
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'authenticate':
                    return await this.authenticate(request.credentials);
                
                case 'research_product':
                    return await this.researchProduct(request.productData);
                
                case 'get_suppliers':
                    return await this.getSuppliers(request.productId);
                
                case 'calculate_profit':
                    return await this.calculateProfit(request.productId, request.supplierId);
                
                case 'get_market_trends':
                    return await this.getMarketTrends(request.category);
                
                case 'export_data':
                    return await this.exportData(request.products);
                
                case 'get_notifications':
                    return await this.getNotifications();
                
                default:
                    throw new Error(`Unknown action: ${request.action}`);
            }
        } catch (error) {
            console.error('Background script error:', error);
            return { success: false, error: error.message };
        }
    }

    async authenticate(credentials) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();
            
            if (data.success) {
                this.authToken = data.token;
                await chrome.storage.sync.set({ authToken: data.token });
                
                // ユーザープロファイル取得
                const userProfile = await this.getUserProfile();
                await chrome.storage.sync.set({ userProfile });
                
                return { success: true, user: userProfile };
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async researchProduct(productData) {
        try {
            // キャッシュ確認
            const cacheKey = this.generateCacheKey(productData);
            if (this.researchCache.has(cacheKey)) {
                return this.researchCache.get(cacheKey);
            }

            const response = await this.apiCall('POST', '/research/comprehensive', {
                product: productData,
                options: {
                    includeDomesticSuppliers: true,
                    includeProfitCalculation: true,
                    includeRiskAssessment: true,
                    includeMarketAnalysis: true
                }
            });

            if (response.success) {
                // 結果をキャッシュ（15分間）
                this.researchCache.set(cacheKey, response);
                setTimeout(() => this.researchCache.delete(cacheKey), 15 * 60 * 1000);
                
                // 高利益商品の場合は通知
                if (response.data.profitAnalysis.margin > 30) {
                    await this.showProfitNotification(response.data);
                }
                
                return response;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getSuppliers(productId) {
        return await this.apiCall('GET', `/products/${productId}/suppliers`);
    }

    async calculateProfit(productId, supplierId) {
        return await this.apiCall('POST', '/calculations/profit', {
            productId,
            supplierId
        });
    }

    async getMarketTrends(category) {
        return await this.apiCall('GET', `/market/trends?category=${category}`);
    }

    async exportData(products) {
        try {
            const response = await this.apiCall('POST', '/export/products', {
                products,
                format: 'csv'
            });

            if (response.success) {
                // ダウンロード開始
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                
                await chrome.downloads.download({
                    url,
                    filename: `products_${Date.now()}.csv`
                });
                
                return { success: true };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async apiCall(method, endpoint, data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (this.authToken) {
            options.headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
        return await response.json();
    }

    generateCacheKey(productData) {
        return btoa(JSON.stringify(productData)).substr(0, 20);
    }

    async showProfitNotification(data) {
        const settings = await chrome.storage.sync.get(['settings']);
        
        if (settings.settings?.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon-128.png',
                title: '🎯 高利益商品を発見！',
                message: `${data.product.title}\n利益率: ${data.profitAnalysis.margin.toFixed(1)}%`,
                buttons: [
                    { title: '詳細を見る' },
                    { title: 'ウォッチリストに追加' }
                ]
            });
        }
    }

    async restoreAuthToken() {
        const result = await chrome.storage.sync.get(['authToken']);
        if (result.authToken) {
            this.authToken = result.authToken;
            
            // トークンの有効性を確認
            try {
                await this.getUserProfile();
            } catch (error) {
                // トークンが無効な場合は削除
                await chrome.storage.sync.remove(['authToken']);
                this.authToken = null;
            }
        }
    }

    async getUserProfile() {
        return await this.apiCall('GET', '/auth/profile');
    }

    startPeriodicSync() {
        // 30分おきにデータを同期
        setInterval(async () => {
            try {
                if (this.authToken) {
                    await this.syncUserData();
                }
            } catch (error) {
                console.error('Periodic sync error:', error);
            }
        }, 30 * 60 * 1000);
    }

    async syncUserData() {
        // ウォッチリストの更新通知など
        const notifications = await this.apiCall('GET', '/notifications/recent');
        
        if (notifications.success && notifications.data.length > 0) {
            for (const notification of notifications.data) {
                if (notification.type === 'price_drop') {
                    await this.showPriceDropNotification(notification);
                }
            }
        }
    }

    async showPriceDropNotification(notification) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-128.png',
            title: '📉 価格変動アラート',
            message: `${notification.product.title}の価格が${notification.changePercent}%下落しました`,
            buttons: [
                { title: '今すぐ確認' },
                { title: '購入検討' }
            ]
        });
    }
}

// バックグラウンドサービス初期化
new BackgroundService();

// chrome-extension/content-scripts/universal.js
class UniversalContentScript {
    constructor() {
        this.platform = this.detectPlatform();
        this.initialized = false;
        this.observerActive = false;
        this.init();
    }

    detectPlatform() {
        const hostname = window.location.hostname;
        
        if (hostname.includes('ebay.com')) return 'ebay';
        if (hostname.includes('amazon.co.jp')) return 'amazon_jp';
        if (hostname.includes('amazon.com')) return 'amazon_us';
        if (hostname.includes('rakuten.co.jp')) return 'rakuten';
        if (hostname.includes('mercari.com')) return 'mercari';
        if (hostname.includes('auctions.yahoo.co.jp')) return 'yahoo_auctions';
        
        return 'unknown';
    }

    async init() {
        if (this.initialized) return;
        
        try {
            // プラットフォーム固有の初期化
            switch (this.platform) {
                case 'ebay':
                    await this.initEbayIntegration();
                    break;
                case 'amazon_jp':
                case 'amazon_us':
                    await this.initAmazonIntegration();
                    break;
                case 'rakuten':
                    await this.initRakutenIntegration();
                    break;
                case 'mercari':
                    await this.initMercariIntegration();
                    break;
                default:
                    console.log('Unsupported platform:', this.platform);
                    return;
            }
            
            this.initialized = true;
            this.startDOMObserver();
            
        } catch (error) {
            console.error('Content script initialization error:', error);
        }
    }

    async initEbayIntegration() {
        // eBay用の統合機能
        if (this.isProductDetailPage()) {
            await this.enhanceEbayProductPage();
        } else if (this.isSearchResultsPage()) {
            await this.enhanceEbaySearchResults();
        }
    }

    async enhanceEbayProductPage() {
        const productData = this.extractEbayProductData();
        if (!productData) return;

        // 逆リサーチパネルを追加
        const reverseResearchPanel = this.createReverseResearchPanel();
        const priceSection = document.querySelector('#prcIsum, .u-flL.condText');
        
        if (priceSection) {
            priceSection.parentNode.insertBefore(reverseResearchPanel, priceSection.nextSibling);
            
            // リサーチ開始
            await this.performReverseResearch(productData, reverseResearchPanel);
        }
    }

    createReverseResearchPanel() {
        const panel = document.createElement('div');
        panel.className = 'reverse-research-panel';
        panel.innerHTML = `
            <div class="research-header">
                <h3>🔄 逆リサーチ - 日本国内仕入れ候補</h3>
                <div class="research-status" id="researchStatus">
                    <div class="loading-spinner"></div>
                    <span>リサーチ中...</span>
                </div>
            </div>
            <div class="research-content" id="researchContent">
                <!-- 結果はここに表示される -->
            </div>
        `;

        // スタイリング
        panel.style.cssText = `
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border: 2px solid #667eea;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
        `;

        return panel;
    }

    async performReverseResearch(productData, panel) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'research_product',
                productData: productData
            });

            if (response.success) {
                this.displayReverseResearchResults(response.data, panel);
            } else {
                this.displayResearchError(response.error, panel);
            }
        } catch (error) {
            this.displayResearchError(error.message, panel);
        }
    }

    displayReverseResearchResults(data, panel) {
        const statusDiv = panel.querySelector('#researchStatus');
        const contentDiv = panel.querySelector('#researchContent');
        
        statusDiv.innerHTML = `
            <span style="color: #4CAF50;">✅ リサーチ完了</span>
            <div style="font-size: 0.9em; color: #666;">
                ${data.suppliers?.length || 0}件の仕入先候補を発見
            </div>
        `;

        let contentHTML = '';

        // 利益分析セクション
        if (data.profitAnalysis) {
            const profit = data.profitAnalysis;
            const profitClass = profit.margin > 30 ? 'high-profit' : profit.margin > 15 ? 'medium-profit' : 'low-profit';
            
            contentHTML += `
                <div class="profit-analysis-section">
                    <h4>💰 利益分析</h4>
                    <div class="profit-metrics">
                        <div class="metric">
                            <span class="metric-label">推定利益:</span>
                            <span class="metric-value profit ${profitClass}">¥${profit.estimated.toLocaleString()}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">利益率:</span>
                            <span class="metric-value ${profitClass}">${profit.margin.toFixed(1)}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">ROI:</span>
                            <span class="metric-value">${profit.roi.toFixed(1)}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">信頼度:</span>
                            <span class="metric-value">${(profit.confidence * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // サプライヤー情報セクション
        if (data.suppliers && data.suppliers.length > 0) {
            contentHTML += `
                <div class="suppliers-section">
                    <h4>🏪 仕入先候補 (上位${Math.min(5, data.suppliers.length)}社)</h4>
                    <div class="suppliers-list">
                        ${data.suppliers.slice(0, 5).map(supplier => `
                            <div class="supplier-item">
                                <div class="supplier-info">
                                    <div class="supplier-header">
                                        <span class="supplier-name">${supplier.name}</span>
                                        <span class="supplier-price">¥${supplier.price.toLocaleString()}</span>
                                    </div>
                                    <div class="supplier-details">
                                        <span class="availability ${supplier.availability}">${this.getAvailabilityText(supplier.availability)}</span>
                                        <span class="reliability">信頼度: ${(supplier.reliability * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                                <div class="supplier-actions">
                                    <a href="${supplier.url}" target="_blank" class="btn-supplier-link">
                                        商品を見る
                                    </a>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // リスク評価セクション
        if (data.riskAssessment) {
            const risk = data.riskAssessment;
            const riskClass = risk.overallRiskScore < 0.3 ? 'low-risk' : risk.overallRiskScore < 0.7 ? 'medium-risk' : 'high-risk';
            
            contentHTML += `
                <div class="risk-assessment-section">
                    <h4>⚠️ リスク評価</h4>
                    <div class="risk-overall">
                        <span class="risk-label">総合リスク:</span>
                        <span class="risk-score ${riskClass}">${this.getRiskLevelText(risk.overallRiskScore)}</span>
                        <div class="risk-bar">
                            <div class="risk-fill ${riskClass}" style="width: ${risk.overallRiskScore * 100}%"></div>
                        </div>
                    </div>
                    <div class="risk-factors">
                        ${risk.riskFactors?.slice(0, 3).map(factor => `
                            <div class="risk-factor">
                                <span class="factor-name">${factor.factor}:</span>
                                <span class="factor-impact impact-${factor.impact}">${factor.impact}</span>
                            </div>
                        `).join('') || ''}
                    </div>
                </div>
            `;
        }

        // アクションボタン
        contentHTML += `
            <div class="action-section">
                <button class="btn-action primary" onclick="window.open('${data.detailReportUrl || '#'}', '_blank')">
                    📊 詳細レポート
                </button>
                <button class="btn-action secondary" onclick="this.addToWatchlist('${data.product?.id}')">
                    ⭐ ウォッチリスト追加
                </button>
                <button class="btn-action secondary" onclick="this.exportData([${JSON.stringify(data)}])">
                    📥 データ出力
                </button>
            </div>
        `;

        contentDiv.innerHTML = contentHTML;
        
        // 追加スタイルを適用
        this.applyPanelStyles(panel);
    }

    displayResearchError(error, panel) {
        const statusDiv = panel.querySelector('#researchStatus');
        const contentDiv = panel.querySelector('#researchContent');
        
        statusDiv.innerHTML = `
            <span style="color: #f44336;">❌ リサーチエラー</span>
        `;
        
        contentDiv.innerHTML = `
            <div class="error-message">
                <p>リサーチ処理中にエラーが発生しました:</p>
                <p><code>${error}</code></p>
                <button class="btn-retry" onclick="location.reload()">
                    🔄 再試行
                </button>
            </div>
        `;
    }

    applyPanelStyles(panel) {
        const style = document.createElement('style');
        style.textContent = `
            .research-header h3 {
                margin: 0 0 15px 0;
                color: #333;
                font-size: 1.2em;
            }
            
            .loading-spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 8px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .profit-analysis-section, .suppliers-section, .risk-assessment-section {
                background: white;
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .profit-analysis-section h4, .suppliers-section h4, .risk-assessment-section h4 {
                margin: 0 0 12px 0;
                color: #333;
                font-size: 1.1em;
            }
            
            .profit-metrics {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 10px;
            }
            
            .metric {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 6px;
            }
            
            .metric-label {
                font-size: 0.9em;
                color: #666;
            }
            
            .metric-value {
                font-weight: bold;
            }
            
            .high-profit { color: #4CAF50; }
            .medium-profit { color: #FF9800; }
            .low-profit { color: #f44336; }
            
            .supplier-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                margin-bottom: 10px;
                background: white;
            }
            
            .supplier-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
            }
            
            .supplier-name {
                font-weight: bold;
                color: #333;
            }
            
            .supplier-price {
                font-weight: bold;
                color: #4CAF50;
            }
            
            .supplier-details {
                font-size: 0.85em;
                color: #666;
            }
            
            .availability.available { color: #4CAF50; }
            .availability.limited { color: #FF9800; }
            .availability.out_of_stock { color: #f44336; }
            
            .btn-supplier-link {
                background: #667eea;
                color: white;
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                text-decoration: none;
                font-size: 0.9em;
                transition: background 0.3s;
            }
            
            .btn-supplier-link:hover {
                background: #5a67d8;
            }
            
            .risk-overall {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .risk-bar {
                flex: 1;
                height: 8px;
                background: #e0e0e0;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .risk-fill {
                height: 100%;
                transition: width 0.3s ease;
            }
            
            .risk-fill.low-risk { background: #4CAF50; }
            .risk-fill.medium-risk { background: #FF9800; }
            .risk-fill.high-risk { background: #f44336; }
            
            .risk-factor {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px solid #f0f0f0;
            }
            
            .impact-low { color: #4CAF50; }
            .impact-medium { color: #FF9800; }
            .impact-high { color: #f44336; }
            
            .action-section {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-top: 20px;
                flex-wrap: wrap;
            }
            
            .btn-action {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            
            .btn-action.primary {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
            }
            
            .btn-action.primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            
            .btn-action.secondary {
                background: #f8f9fa;
                color: #333;
                border: 1px solid #e0e0e0;
            }
            
            .btn-action.secondary:hover {
                background: #e9ecef;
            }
            
            .error-message {
                text-align: center;
                padding: 20px;
                color: #666;
            }
            
            .btn-retry {
                background: #667eea;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                margin-top: 15px;
            }
        `;
        
        document.head.appendChild(style);
    }

    extractEbayProductData() {
        try {
            return {
                platform: 'ebay',
                itemId: this.extractEbayItemId(),
                title: this.extractEbayTitle(),
                price: this.extractEbayPrice(),
                condition: this.extractEbayCondition(),
                category: this.extractEbayCategory(),
                seller: this.extractEbaySeller(),
                watchers: this.extractEbayWatchers(),
                images: this.extractEbayImages(),
                url: window.location.href,
                extractedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('eBay product data extraction error:', error);
            return null;
        }
    }

    extractEbayItemId() {
        const match = window.location.pathname.match(/\/itm\/([^\/\?]+)/);
        return match ? match[1] : null;
    }

    extractEbayTitle() {
        const titleElement = document.querySelector('h1[id="x-title-label-lbl"]');
        return titleElement ? titleElement.textContent.trim() : null;
    }

    extractEbayPrice() {
        const priceElement = document.querySelector('.display-price');
        if (priceElement) {
            const priceText = priceElement.textContent.replace(/[^\d.]/g, '');
            return parseFloat(priceText) || 0;
        }
        return 0;
    }

    extractEbayCondition() {
        const conditionElement = document.querySelector('.u-flL.condText');
        return conditionElement ? conditionElement.textContent.trim() : null;
    }

    extractEbayCategory() {
        const breadcrumb = document.querySelector('#vi-VR-brumb-lnkLst');
        return breadcrumb ? breadcrumb.textContent.trim() : null;
    }

    extractEbaySeller() {
        const sellerElement = document.querySelector('.mbg-nw');
        return sellerElement ? sellerElement.textContent.trim() : null;
    }

    extractEbayWatchers() {
        const watchElement = document.querySelector('#vi-acc-del-range');
        if (watchElement) {
            const match = watchElement.textContent.match(/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }
        return 0;
    }

    extractEbayImages() {
        const images = [];
        const imageElements = document.querySelectorAll('#vi_main_img_fs img, #vi-image-1 img');
        
        imageElements.forEach(img => {
            if (img.src && !img.src.includes('transparent')) {
                images.push(img.src);
            }
        });
        
        return images;
    }

    getAvailabilityText(availability) {
        const texts = {
            'available': '在庫あり',
            'limited': '在庫限定',
            'out_of_stock': '在庫なし',
            'unknown': '不明'
        };
        return texts[availability] || availability;
    }

    getRiskLevelText(score) {
        if (score < 0.3) return '低リスク';
        if (score < 0.7) return '中リスク';
        return '高リスク';
    }

    isProductDetailPage() {
        return /\/itm\//.test(window.location.pathname);
    }

    isSearchResultsPage() {
        return /\/sch\//.test(window.location.pathname);
    }

    startDOMObserver() {
        if (this.observerActive) return;
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // 動的に追加された要素に対する処理
                    this.handleDynamicContent(mutation.addedNodes);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.observerActive = true;
    }

    handleDynamicContent(addedNodes) {
        addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // 新しく追加された商品要素をチェック
                if (node.matches && node.matches('.s-item, .item')) {
                    this.enhanceProductItem(node);
                }
            }
        });
    }

    enhanceProductItem(itemElement) {
        // 個別商品アイテムの拡張処理
        if (itemElement.querySelector('.research-enhanced')) return; // 既に処理済み
        
        const quickResearchButton = document.createElement('button');
        quickResearchButton.className = 'quick-research-btn research-enhanced';
        quickResearchButton.innerHTML = '🔍 クイックリサーチ';
        quickResearchButton.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            background: #667eea;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 0.8em;
            cursor: pointer;
            z-index: 1000;
        `;
        
        quickResearchButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const productData = this.extractItemData(itemElement);
            if (productData) {
                await this.performQuickResearch(productData);
            }
        });
        
        itemElement.style.position = 'relative';
        itemElement.appendChild(quickResearchButton);
    }

    extractItemData(itemElement) {
        // アイテム要素から商品データを抽出
        const titleElement = itemElement.querySelector('.s-item__title, .item__title');
        const priceElement = itemElement.querySelector('.s-item__price, .item__price');
        const linkElement = itemElement.querySelector('.s-item__link, .item__link');
        
        return {
            title: titleElement ? titleElement.textContent.trim() : null,
            price: priceElement ? this.parsePrice(priceElement.textContent) : 0,
            url: linkElement ? linkElement.href : null,
            platform: this.platform
        };
    }

    parsePrice(priceText) {
        const cleaned = priceText.replace(/[^\d.]/g, '');
        return parseFloat(cleaned) || 0;
    }

    async performQuickResearch(productData) {
        // クイックリサーチモーダルを表示
        this.showQuickResearchModal(productData);
    }

    showQuickResearchModal(productData) {
        // 既存のモーダルがあれば削除
        const existingModal = document.querySelector('#quickResearchModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'quickResearchModal';
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>クイックリサーチ結果</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="research-loading">
                            <div class="loading-spinner"></div>
                            <p>商品をリサーチ中...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // モーダルスタイル
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;

        // スタイル追加
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            #quickResearchModal .modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            #quickResearchModal .modal-content {
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            
            #quickResearchModal .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #e0e0e0;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border-radius: 12px 12px 0 0;
            }
            
            #quickResearchModal .modal-header h3 {
                margin: 0;
                font-size: 1.3em;
            }
            
            #quickResearchModal .modal-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.3s;
            }
            
            #quickResearchModal .modal-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            #quickResearchModal .modal-body {
                padding: 20px;
            }
            
            #quickResearchModal .research-loading {
                text-align: center;
                padding: 40px 20px;
            }
            
            #quickResearchModal .loading-spinner {
                display: inline-block;
                width: 32px;
                height: 32px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            }
        `;

        document.head.appendChild(modalStyle);
        document.body.appendChild(modal);

        // イベントリスナー
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
            modalStyle.remove();
        });

        modal.querySelector('.modal-backdrop').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                modal.remove();
                modalStyle.remove();
            }
        });

        // リサーチ実行
        this.executeQuickResearch(productData, modal);
    }

    async executeQuickResearch(productData, modal) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'research_product',
                productData: productData
            });

            if (response.success) {
                this.displayQuickResearchResults(response.data, modal);
            } else {
                this.displayQuickResearchError(response.error, modal);
            }
        } catch (error) {
            this.displayQuickResearchError(error.message, modal);
        }
    }

    displayQuickResearchResults(data, modal) {
        const modalBody = modal.querySelector('.modal-body');
        
        let resultsHTML = `
            <div class="quick-results">
                <div class="product-info">
                    <h4>${data.product.title}</h4>
                    <div class="product-metrics">
                        <span class="metric">
                            <strong>推定利益:</strong> 
                            <span class="profit-value">¥${data.profitAnalysis?.estimated?.toLocaleString() || 'N/A'}</span>
                        </span>
                        <span class="metric">
                            <strong>利益率:</strong> 
                            <span class="margin-value">${data.profitAnalysis?.margin?.toFixed(1) || 'N/A'}%</span>
                        </span>
                    </div>
                </div>
        `;

        if (data.suppliers && data.suppliers.length > 0) {
            resultsHTML += `
                <div class="suppliers-preview">
                    <h5>主要仕入先候補:</h5>
                    <div class="suppliers-list">
                        ${data.suppliers.slice(0, 3).map(supplier => `
                            <div class="supplier-quick-item">
                                <span class="supplier-name">${supplier.name}</span>
                                <span class="supplier-price">¥${supplier.price.toLocaleString()}</span>
                                <a href="${supplier.url}" target="_blank" class="supplier-link">確認</a>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (data.riskAssessment) {
            const riskLevel = data.riskAssessment.overallRiskScore < 0.3 ? '低' : 
                           data.riskAssessment.overallRiskScore < 0.7 ? '中' : '高';
            const riskClass = data.riskAssessment.overallRiskScore < 0.3 ? 'low' : 
                            data.riskAssessment.overallRiskScore < 0.7 ? 'medium' : 'high';
            
            resultsHTML += `
                <div class="risk-preview">
                    <h5>リスク評価:</h5>
                    <span class="risk-indicator risk-${riskClass}">
                        ${riskLevel}リスク (${(data.riskAssessment.overallRiskScore * 100).toFixed(0)}%)
                    </span>
                </div>
            `;
        }

        resultsHTML += `
                <div class="quick-actions">
                    <button class="btn-detailed" onclick="this.openDetailedReport('${data.product.id}')">
                        詳細レポートを表示
                    </button>
                    <button class="btn-watchlist" onclick="this.addToQuickWatchlist('${data.product.id}')">
                        ウォッチリストに追加
                    </button>
                </div>
            </div>
        `;

        modalBody.innerHTML = resultsHTML;

        // クイック結果用スタイル追加
        const quickStyle = document.createElement('style');
        quickStyle.textContent = `
            .quick-results .product-info {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 15px;
            }
            
            .quick-results .product-info h4 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 1.1em;
            }
            
            .quick-results .product-metrics {
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
            }
            
            .quick-results .metric {
                font-size: 0.9em;
                color: #666;
            }
            
            .quick-results .profit-value {
                color: #4CAF50;
                font-weight: bold;
            }
            
            .quick-results .margin-value {
                color: #667eea;
                font-weight: bold;
            }
            
            .quick-results .suppliers-preview,
            .quick-results .risk-preview {
                margin: 15px 0;
                padding: 12px;
                border-left: 3px solid #667eea;
                background: #f5f7fa;
            }
            
            .quick-results h5 {
                margin: 0 0 8px 0;
                color: #333;
                font-size: 1em;
            }
            
            .quick-results .supplier-quick-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .quick-results .supplier-quick-item:last-child {
                border-bottom: none;
            }
            
            .quick-results .supplier-name {
                font-weight: 500;
                color: #333;
            }
            
            .quick-results .supplier-price {
                color: #4CAF50;
                font-weight: bold;
            }
            
            .quick-results .supplier-link {
                background: #667eea;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                text-decoration: none;
                font-size: 0.8em;
            }
            
            .quick-results .risk-indicator {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 0.9em;
                font-weight: bold;
            }
            
            .quick-results .risk-indicator.risk-low {
                background: #e8f5e8;
                color: #4CAF50;
            }
            
            .quick-results .risk-indicator.risk-medium {
                background: #fff3e0;
                color: #FF9800;
            }
            
            .quick-results .risk-indicator.risk-high {
                background: #ffebee;
                color: #f44336;
            }
            
            .quick-results .quick-actions {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid #e0e0e0;
            }
            
            .quick-results .btn-detailed,
            .quick-results .btn-watchlist {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.3s;
            }
            
            .quick-results .btn-detailed {
                background: #667eea;
                color: white;
            }
            
            .quick-results .btn-detailed:hover {
                background: #5a67d8;
                transform: translateY(-1px);
            }
            
            .quick-results .btn-watchlist {
                background: #f8f9fa;
                color: #333;
                border: 1px solid #e0e0e0;
            }
            
            .quick-results .btn-watchlist:hover {
                background: #e9ecef;
            }
        `;

        document.head.appendChild(quickStyle);
    }

    displayQuickResearchError(error, modal) {
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <h4>リサーチエラー</h4>
                <p>商品のリサーチ中にエラーが発生しました:</p>
                <code>${error}</code>
                <button class="btn-retry" onclick="location.reload()">
                    再試行
                </button>
            </div>
        `;

        const errorStyle = document.createElement('style');
        errorStyle.textContent = `
            .error-content {
                text-align: center;
                padding: 30px 20px;
            }
            
            .error-content .error-icon {
                font-size: 48px;
                margin-bottom: 15px;
            }
            
            .error-content h4 {
                color: #f44336;
                margin: 0 0 15px 0;
            }
            
            .error-content code {
                display: block;
                background: #f5f5f5;
                padding: 10px;
                border-radius: 4px;
                margin: 15px 0;
                font-size: 0.9em;
                word-break: break-word;
            }
            
            .error-content .btn-retry {
                background: #667eea;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                margin-top: 15px;
            }
        `;

        document.head.appendChild(errorStyle);
    }

    // Amazon統合機能
    async initAmazonIntegration() {
        if (this.isAmazonProductPage()) {
            await this.enhanceAmazonProductPage();
        }
    }

    isAmazonProductPage() {
        return /\/dp\/|\/gp\/product\//.test(window.location.pathname);
    }

    async enhanceAmazonProductPage() {
        const productData = this.extractAmazonProductData();
        if (!productData) return;

        // eBay転売ポテンシャル分析パネルを追加
        const potentialPanel = this.createEbayPotentialPanel();
        const priceSection = document.querySelector('#priceblock_dealprice, #priceblock_ourprice, .a-price');
        
        if (priceSection) {
            priceSection.parentNode.insertBefore(potentialPanel, priceSection.nextSibling);
            await this.analyzeEbayPotential(productData, potentialPanel);
        }
    }

    createEbayPotentialPanel() {
        const panel = document.createElement('div');
        panel.className = 'ebay-potential-panel';
        panel.innerHTML = `
            <div class="potential-header">
                <h3>🌟 eBay転売ポテンシャル分析</h3>
                <div class="analysis-status" id="analysisStatus">
                    <div class="loading-spinner"></div>
                    <span>分析中...</span>
                </div>
            </div>
            <div class="potential-content" id="potentialContent">
                <!-- 分析結果がここに表示される -->
            </div>
        `;

        panel.style.cssText = `
            background: linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%);
            border: 2px solid #FF9800;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
        `;

        return panel;
    }

    async analyzeEbayPotential(productData, panel) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'analyze_ebay_potential',
                productData: productData
            });

            if (response.success) {
                this.displayEbayPotentialResults(response.data, panel);
            } else {
                this.displayPotentialError(response.error, panel);
            }
        } catch (error) {
            this.displayPotentialError(error.message, panel);
        }
    }

    displayEbayPotentialResults(data, panel) {
        const statusDiv = panel.querySelector('#analysisStatus');
        const contentDiv = panel.querySelector('#potentialContent');
        
        statusDiv.innerHTML = `
            <span style="color: #4CAF50;">✅ 分析完了</span>
        `;

        const potentialScore = data.potentialScore || 0;
        const scoreClass = potentialScore > 80 ? 'high' : potentialScore > 60 ? 'medium' : 'low';
        
        let contentHTML = `
            <div class="potential-score-section">
                <div class="score-circle score-${scoreClass}">
                    <span class="score-value">${potentialScore}/100</span>
                    <span class="score-label">転売ポテンシャル</span>
                </div>
                <div class="score-details">
                    <h4>分析結果</h4>
                    <div class="analysis-metrics">
        `;

        // eBay価格比較
        if (data.priceComparison) {
            const priceDiff = data.priceComparison.priceDifference || 0;
            const profitMargin = data.priceComparison.estimatedMargin || 0;
            
            contentHTML += `
                        <div class="metric-row">
                            <span class="metric-label">eBay平均価格:</span>
                            <span class="metric-value">${data.priceComparison.ebayAveragePrice ? ' + data.priceComparison.ebayAveragePrice.toFixed(2) : 'データ不足'}</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">価格差:</span>
                            <span class="metric-value ${priceDiff > 0 ? 'positive' : 'negative'}">${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(2)}%</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">推定利益率:</span>
                            <span class="metric-value profit-margin">${profitMargin.toFixed(1)}%</span>
                        </div>
            `;
        }

        // 競合状況
        if (data.competition) {
            contentHTML += `
                        <div class="metric-row">
                            <span class="metric-label">eBay出品数:</span>
                            <span class="metric-value">${data.competition.activeListings || 0}件</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">月間売上:</span>
                            <span class="metric-value">${data.competition.monthlySales || 0}件</span>
                        </div>
            `;
        }

        contentHTML += `
                    </div>
                </div>
            </div>
        `;

        // 推奨アクション
        contentHTML += `
            <div class="recommendations-section">
                <h4>推奨アクション</h4>
                <div class="recommendations">
        `;

        if (potentialScore > 80) {
            contentHTML += `
                    <div class="recommendation high-potential">
                        <span class="rec-icon">🚀</span>
                        <span class="rec-text">高収益が期待できます。積極的な検討をお勧めします。</span>
                    </div>
            `;
        } else if (potentialScore > 60) {
            contentHTML += `
                    <div class="recommendation medium-potential">
                        <span class="rec-icon">⚖️</span>
                        <span class="rec-text">適度なポテンシャルがあります。リスクと利益のバランスを検討してください。</span>
                    </div>
            `;
        } else {
            contentHTML += `
                    <div class="recommendation low-potential">
                        <span class="rec-icon">⚠️</span>
                        <span class="rec-text">転売ポテンシャルは限定的です。他の商品を検討することをお勧めします。</span>
                    </div>
            `;
        }

        contentHTML += `
                </div>
            </div>
        `;

        // アクションボタン
        contentHTML += `
            <div class="potential-actions">
                <button class="btn-ebay-search" onclick="window.open('https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(data.searchKeywords || '')}', '_blank')">
                    eBayで確認
                </button>
                <button class="btn-detailed-analysis" onclick="this.openDetailedAnalysis('${data.productId}')">
                    詳細分析
                </button>
                <button class="btn-price-alert" onclick="this.setPriceAlert('${data.productId}')">
                    価格アラート設定
                </button>
            </div>
        `;

        contentDiv.innerHTML = contentHTML;
        this.applyPotentialPanelStyles(panel);
    }

    applyPotentialPanelStyles(panel) {
        const style = document.createElement('style');
        style.textContent = `
            .potential-score-section {
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .score-circle {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                position: relative;
            }
            
            .score-circle.score-high {
                background: linear-gradient(135deg, #4CAF50, #45a049);
            }
            
            .score-circle.score-medium {
                background: linear-gradient(135deg, #FF9800, #f57c00);
            }
            
            .score-circle.score-low {
                background: linear-gradient(135deg, #f44336, #d32f2f);
            }
            
            .score-value {
                font-size: 1.8em;
                line-height: 1;
            }
            
            .score-label {
                font-size: 0.8em;
                margin-top: 5px;
            }
            
            .score-details {
                flex: 1;
            }
            
            .score-details h4 {
                margin: 0 0 15px 0;
                color: #333;
            }
            
            .analysis-metrics {
                background: white;
                border-radius: 8px;
                padding: 15px;
            }
            
            .metric-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #f0f0f0;
            }
            
            .metric-row:last-child {
                border-bottom: none;
            }
            
            .metric-label {
                color: #666;
                font-size: 0.9em;
            }
            
            .metric-value {
                font-weight: bold;
            }
            
            .metric-value.positive {
                color: #4CAF50;
            }
            
            .metric-value.negative {
                color: #f44336;
            }
            
            .metric-value.profit-margin {
                color: #667eea;
            }
            
            .recommendations-section {
                background: white;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
            }
            
            .recommendations-section h4 {
                margin: 0 0 12px 0;
                color: #333;
            }
            
            .recommendation {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                border-radius: 6px;
                margin-bottom: 8px;
            }
            
            .recommendation.high-potential {
                background: #e8f5e8;
                border-left: 4px solid #4CAF50;
            }
            
            .recommendation.medium-potential {
                background: #fff3e0;
                border-left: 4px solid #FF9800;
            }
            
            .recommendation.low-potential {
                background: #ffebee;
                border-left: 4px solid #f44336;
            }
            
            .rec-icon {
                font-size: 1.2em;
            }
            
            .rec-text {
                font-size: 0.9em;
                color: #333;
                line-height: 1.4;
            }
            
            .potential-actions {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .potential-actions button {
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 0.9em;
            }
            
            .btn-ebay-search {
                background: #0064d2;
                color: white;
            }
            
            .btn-ebay-search:hover {
                background: #0056b3;
                transform: translateY(-2px);
            }
            
            .btn-detailed-analysis {
                background: #667eea;
                color: white;
            }
            
            .btn-detailed-analysis:hover {
                background: #5a67d8;
                transform: translateY(-2px);
            }
            
            .btn-price-alert {
                background: #f8f9fa;
                color: #333;
                border: 1px solid #e0e0e0;
            }
            
            .btn-price-alert:hover {
                background: #e9ecef;
            }
        `;
        
        document.head.appendChild(style);
    }

    extractAmazonProductData() {
        try {
            return {
                platform: 'amazon',
                asin: this.extractAmazonASIN(),
                title: this.extractAmazonTitle(),
                price: this.extractAmazonPrice(),
                brand: this.extractAmazonBrand(),
                category: this.extractAmazonCategory(),
                availability: this.extractAmazonAvailability(),
                rating: this.extractAmazonRating(),
                reviewCount: this.extractAmazonReviewCount(),
                images: this.extractAmazonImages(),
                url: window.location.href,
                extractedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Amazon product data extraction error:', error);
            return null;
        }
    }

    extractAmazonASIN() {
        const match = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
        return match ? match[1] : null;
    }

    extractAmazonTitle() {
        const titleElement = document.querySelector('#productTitle');
        return titleElement ? titleElement.textContent.trim() : null;
    }

    extractAmazonPrice() {
        const priceSelectors = [
            '.a-price-whole',
            '#priceblock_dealprice',
            '#priceblock_ourprice',
            '.a-offscreen'
        ];
        
        for (const selector of priceSelectors) {
            const priceElement = document.querySelector(selector);
            if (priceElement) {
                const priceText = priceElement.textContent.replace(/[^\d.]/g, '');
                const price = parseFloat(priceText);
                if (price && price > 0) return price;
            }
        }
        return 0;
    }

    extractAmazonBrand() {
        const brandElement = document.querySelector('#bylineInfo');
        return brandElement ? brandElement.textContent.trim().replace('Brand: ', '') : null;
    }

    extractAmazonCategory() {
        const breadcrumbElement = document.querySelector('#wayfinding-breadcrumbs_feature_div');
        return breadcrumbElement ? breadcrumbElement.textContent.trim() : null;
    }

    extractAmazonAvailability() {
        const availabilityElement = document.querySelector('#availability span');
        return availabilityElement ? availabilityElement.textContent.trim() : null;
    }

    extractAmazonRating() {
        const ratingElement = document.querySelector('[data-hook="average-star-rating"]');
        if (ratingElement) {
            const match = ratingElement.textContent.match(/([0-9.]+)/);
            return match ? parseFloat(match[1]) : null;
        }
        return null;
    }

    extractAmazonReviewCount() {
        const reviewElement = document.querySelector('[data-hook="total-review-count"]');
        if (reviewElement) {
            const match = reviewElement.textContent.match(/([0-9,]+)/);
            return match ? parseInt(match[1].replace(/,/g, '')) : null;
        }
        return null;
    }

    extractAmazonImages() {
        const images = [];
        const imageElements = document.querySelectorAll('#altImages img, #landingImage');
        
        imageElements.forEach(img => {
            if (img.src && !img.src.includes('transparent-pixel')) {
                images.push(img.src);
            }
        });
        
        return images;
    }

    // 楽天統合（簡略版）
    async initRakutenIntegration() {
        if (this.isRakutenProductPage()) {
            await this.enhanceRakutenProductPage();
        }
    }

    isRakutenProductPage() {
        return /item\.rakuten\.co\.jp/.test(window.location.hostname);
    }

    async enhanceRakutenProductPage() {
        const productData = this.extractRakutenProductData();
        if (productData) {
            // 楽天商品用の拡張機能を追加
            console.log('Rakuten product enhanced:', productData.title);
        }
    }

    extractRakutenProductData() {
        const titleElement = document.querySelector('h1');
        const priceElement = document.querySelector('.price');
        
        return {
            platform: 'rakuten',
            title: titleElement ? titleElement.textContent.trim() : null,
            price: priceElement ? this.parsePrice(priceElement.textContent) : 0,
            url: window.location.href,
            extractedAt: new Date().toISOString()
        };
    }

    // メルカリ統合（簡略版）
    async initMercariIntegration() {
        if (this.isMercariProductPage()) {
            await this.enhanceMercariProductPage();
        }
    }

    isMercariProductPage() {
        return /jp\.mercari\.com/.test(window.location.hostname) && /\/items\//.test(window.location.pathname);
    }

    async enhanceMercariProductPage() {
        const productData = this.extractMercariProductData();
        if (productData) {
            console.log('Mercari product enhanced:', productData.title);
        }
    }

    extractMercariProductData() {
        const titleElement = document.querySelector('h1');
        const priceElement = document.querySelector('.item-price');
        
        return {
            platform: 'mercari',
            title: titleElement ? titleElement.textContent.trim() : null,
            price: priceElement ? this.parsePrice(priceElement.textContent) : 0,
            url: window.location.href,
            extractedAt: new Date().toISOString()
        };
    }
}

// ユニバーサルコンテンツスクリプト初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new UniversalContentScript();
    });
} else {
    new UniversalContentScript();
}