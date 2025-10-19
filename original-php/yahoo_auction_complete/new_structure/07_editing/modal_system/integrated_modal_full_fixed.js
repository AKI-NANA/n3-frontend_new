/**
 * 統合出品モーダル - 完全版コントローラー（画像データ修正版）
 * 🔴 修正ポイント: APIレスポンスの二重ネストに対応
 */

const IntegratedListingModal = {
    // ... (既存のstate, sources, marketplaces設定は同じ)
    state: {
        currentMarketplace: 'ebay',
        currentTab: 'tab-overview',
        currentSource: null,
        productData: null,
        selectedImages: [],
        toolResults: {},
        processingStartTime: Date.now()
    },

    sources: {
        yahoo: {
            name: 'Yahoo オークション',
            icon: 'fas fa-gavel',
            color: '#0B1D51',
            detector: (data) => {
                const platform = (data.platform || '').toLowerCase();
                const sourceUrl = (data.source_url || '').toLowerCase();
                const hasYahooData = !!data.scraped_yahoo_data;
                
                return platform.includes('yahoo') || 
                       platform.includes('ヤフオク') ||
                       sourceUrl.includes('yahoo.co.jp') ||
                       sourceUrl.includes('auctions.yahoo') ||
                       hasYahooData;
            }
        },
        amazon: {
            name: 'Amazon API',
            icon: 'fab fa-amazon',
            color: '#ff9900',
            detector: (data) => {
                const platform = (data.platform || '').toLowerCase();
                const hasAsin = !!data.asin || !!data.item_id?.match(/^[A-Z0-9]{10}$/);
                const hasAmazonData = !!data.amazon_product_data;
                const sourceUrl = (data.source_url || '').toLowerCase();
                
                return platform.includes('amazon') || 
                       hasAsin ||
                       hasAmazonData ||
                       sourceUrl.includes('amazon.');
            }
        }
    },

    marketplaces: {
        ebay: { name: 'eBay', icon: 'fab fa-ebay', color: '#0064d2', maxImages: 12 },
        shopee: { name: 'Shopee', icon: 'fas fa-shopping-bag', color: '#ee4d2d', maxImages: 10 },
        'amazon-global': { name: 'Amazon海外', icon: 'fab fa-amazon', color: '#ff9900', maxImages: 9 },
        'amazon-jp': { name: 'Amazon日本', icon: 'fab fa-amazon', color: '#232f3e', maxImages: 9 },
        coupang: { name: 'Coupang', icon: 'fas fa-store', color: '#ff6600', maxImages: 20 },
        shopify: { name: 'Shopify', icon: 'fab fa-shopify', color: '#95bf47', maxImages: 25 }
    },

    /**
     * モーダルを開く（🔴 修正版）
     */
    async open(itemId) {
        console.log('[IntegratedListingModal] Opening modal for item:', itemId);
        
        const modal = document.getElementById('integrated-listing-modal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        this.state.processingStartTime = Date.now();
        this.startProcessingTimer();
        
        try {
            const response = await fetch(`?action=get_product_details&item_id=${encodeURIComponent(itemId)}`);
            const result = await response.json();
            
            console.log('[IntegratedListingModal] 🔴 API Response:', result);
            
            if (result.success && result.data) {
                // 🔴 修正: APIレスポンスが二重ネストの場合を考慮
                // result = {success: true, data: {success: true, data: {...}, ...}, ...}
                // または result = {success: true, data: {...}, ...}
                const productData = result.data.data || result.data;
                
                console.log('[IntegratedListingModal] ✅ Extracted product data:', productData);
                console.log('[IntegratedListingModal] Title:', productData.title);
                console.log('[IntegratedListingModal] Images:', productData.images);
                console.log('[IntegratedListingModal] Images count:', productData.images?.length);
                
                this.state.productData = productData;
                this.state.currentSource = this.detectSource(productData);
                console.log('[IntegratedListingModal] Detected source:', this.state.currentSource);
                
                await this.loadAllTabContents();
                await this.loadAllData();
                
                this.updateStepStatus('ilm-step1-status', '完了', 'complete');
            } else {
                this.showError(result.message || 'データ取得失敗');
            }
        } catch (error) {
            console.error('[IntegratedListingModal] Error:', error);
            this.showError('データ読み込みエラー: ' + error.message);
        }
    },
    
    // ... (残りの関数は元のファイルと同じ - 省略)
};

// 既存のintegrated_modal_full.jsの内容をここにコピー
// (detectSource, loadAllTabContents, loadImages など全ての関数)

console.log('✅ IntegratedListingModal controller loaded (FIXED VERSION - API Response Nesting)');
