/**
 * 統合出品モーダル - 完全版コントローラー（マーケットプレイス別タブ切り替え対応）
 * 名前空間: IntegratedListingModal
 */

const IntegratedListingModal = {
    // 状態管理
    state: {
        currentMarketplace: 'ebay',
        currentTab: 'tab-overview',
        currentSource: null,
        productData: null,
        selectedImages: [],
        toolResults: {},
        processingStartTime: Date.now()
    },

    // 仕入れ先設定
    sources: {
        yahoo: {
            name: 'Yahoo オークション',
            icon: 'fas fa-gavel',
            color: '#0B1D51',
            detector: (data) => {
                // 複数の条件でYahooを判定
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
                // 複数の条件でAmazonを判定
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

    // マーケットプレイス設定
    marketplaces: {
        ebay: { name: 'eBay', icon: 'fab fa-ebay', color: '#0064d2', maxImages: 12 },
        shopee: { name: 'Shopee', icon: 'fas fa-shopping-bag', color: '#ee4d2d', maxImages: 10 },
        'amazon-global': { name: 'Amazon海外', icon: 'fab fa-amazon', color: '#ff9900', maxImages: 9 },
        'amazon-jp': { name: 'Amazon日本', icon: 'fab fa-amazon', color: '#232f3e', maxImages: 9 },
        coupang: { name: 'Coupang', icon: 'fas fa-store', color: '#ff6600', maxImages: 20 },
        shopify: { name: 'Shopify', icon: 'fab fa-shopify', color: '#95bf47', maxImages: 25 }
    },

    // マーケットプレイス別タブファイルマッピング
    marketplaceTabsMap: {
        ebay: {
            listing: 'tabs/ebay_listing_tab.html',
            shipping: 'tabs/ebay_shipping_tab.html',
            html: 'tabs/ebay_html_tab.html'
        },
        shopee: {
            listing: 'tabs/shopee_listing_tab.html',
            shipping: 'tabs/shopee_shipping_tab.html',
            html: 'tabs/shopee_html_tab.html'
        },
        'amazon-global': {
            listing: 'tabs/amazon_global_listing_tab.html',
            shipping: 'tabs/amazon_global_shipping_tab.html',
            html: 'tabs/amazon_global_html_tab.html'
        },
        'amazon-jp': {
            listing: 'tabs/amazon_jp_listing_tab.html',
            shipping: 'tabs/amazon_jp_shipping_tab.html',
            html: 'tabs/amazon_jp_html_tab.html'
        },
        coupang: {
            listing: 'tabs/coupang_listing_tab.html',
            shipping: 'tabs/coupang_shipping_tab.html',
            html: 'tabs/coupang_html_tab.html'
        },
        shopify: {
            listing: 'tabs/shopify_listing_tab.html',
            shipping: 'tabs/shopify_shipping_tab.html',
            html: 'tabs/shopify_html_tab.html'
        }
    },

    /**
     * モーダルを開く
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
            
            console.log('[IntegratedListingModal] API Response:', result);
            
            if (result.success && result.data) {
                // 重要：resultがAPIレスポンス全体の場合、result.dataが実際の商品データ
                // result = {success: true, data: {...商品情報...}, message: ...}
                // この場合、result.dataを格納する
                const productData = result.data;
                
                console.log('[IntegratedListingModal] Extracted product data:', productData);
                console.log('[IntegratedListingModal] Title check:', productData.title);
                
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

    /**
     * 仕入れ先判定
     */
    detectSource(productData) {
        console.log('[IntegratedListingModal] Detecting source for product:', productData);
        console.log('[IntegratedListingModal] Platform field:', productData.platform);
        console.log('[IntegratedListingModal] Source URL:', productData.source_url);
        console.log('[IntegratedListingModal] Has ASIN:', !!productData.asin);
        console.log('[IntegratedListingModal] Has Yahoo data:', !!productData.scraped_yahoo_data);
        console.log('[IntegratedListingModal] Has Amazon data:', !!productData.amazon_product_data);
        
        for (const [key, source] of Object.entries(this.sources)) {
            const isMatch = source.detector(productData);
            console.log(`[IntegratedListingModal] ${key} detector result:`, isMatch);
            
            if (isMatch) {
                console.log(`[IntegratedListingModal] ✅ Detected source: ${key}`);
                return key;
            }
        }
        
        console.warn('[IntegratedListingModal] ⚠️ No source detected, defaulting to yahoo');
        return 'yahoo';
    },

    /**
     * 全タブコンテンツをロード（共通タブ＋マーケットプレイス別タブ）
     */
    async loadAllTabContents() {
        console.log('[IntegratedListingModal] Loading all tab contents...');
        
        // 共通タブ
        await this.loadTabContent('data', 'tabs/data_tab.html');
        await this.loadTabContent('images', 'tabs/images_tab.html');
        await this.loadTabContent('tools', 'tabs/tools_tab.html');
        
        // マーケットプレイス別タブ（デフォルトはeBay）
        await this.loadMarketplaceSpecificTabs(this.state.currentMarketplace);
        
        console.log('[IntegratedListingModal] All tab contents loaded');
    },

    /**
     * マーケットプレイス別タブをロード
     */
    async loadMarketplaceSpecificTabs(marketplace) {
        console.log('[IntegratedListingModal] Loading marketplace-specific tabs for:', marketplace);
        
        const tabsMap = this.marketplaceTabsMap[marketplace];
        
        if (tabsMap) {
            await this.loadTabContent('listing', tabsMap.listing);
            await this.loadTabContent('shipping', tabsMap.shipping);
            await this.loadTabContent('html', tabsMap.html);
        } else {
            console.warn(`[IntegratedListingModal] No specific tabs for marketplace: ${marketplace}`);
        }
    },

    /**
     * タブコンテンツをロード
     */
    async loadTabContent(tabName, templatePath) {
        try {
            const response = await fetch(`modal_system/${templatePath}`);
            const html = await response.text();
            
            // タブによって異なるコンテナを使用
            let targetContainer;
            
            if (tabName === 'listing') {
                targetContainer = document.getElementById('ilm-marketplace-content');
            } else if (tabName === 'shipping') {
                targetContainer = document.getElementById('ilm-shipping-content');
            } else if (tabName === 'html') {
                targetContainer = document.getElementById('ilm-html-editor-container');
            } else {
                targetContainer = document.getElementById(`ilm-tab-${tabName}`);
            }
            
            if (targetContainer) {
                targetContainer.innerHTML = html;
                console.log(`[IntegratedListingModal] Loaded tab: ${tabName} from ${templatePath}`);
            } else {
                console.error(`[IntegratedListingModal] Target container not found for tab: ${tabName}`);
            }
        } catch (error) {
            console.error(`[IntegratedListingModal] Failed to load tab ${tabName}:`, error);
        }
    },

    /**
     * 全データロード
     */
    async loadAllData() {
        const product = this.state.productData;
        const source = this.sources[this.state.currentSource];
        
        // 🔴 デバッグ: 商品データの詳細をコンソールに出力
        console.log('[IntegratedListingModal] 🔴 loadAllData() START');
        console.log('[IntegratedListingModal] product:', product);
        console.log('[IntegratedListingModal] product.title:', product?.title);
        console.log('[IntegratedListingModal] product.item_id:', product?.item_id);
        console.log('[IntegratedListingModal] product.images:', product?.images);
        console.log('[IntegratedListingModal] source:', source);
        
        // 商品データの表示
        const titleElement = document.getElementById('ilm-title-text');
        const metaElement = document.getElementById('ilm-product-meta');
        const thumbnailElement = document.getElementById('ilm-product-thumbnail');
        
        console.log('[IntegratedListingModal] titleElement found:', !!titleElement);
        console.log('[IntegratedListingModal] metaElement found:', !!metaElement);
        console.log('[IntegratedListingModal] thumbnailElement found:', !!thumbnailElement);
        
        if (titleElement) {
            titleElement.textContent = product.title || '商品名不明';
            console.log('[IntegratedListingModal] Title set to:', titleElement.textContent);
        }
        
        if (metaElement) {
            metaElement.textContent = 
                `ID: ${product.item_id || product.id} | 取得日: ${product.scraped_at || product.created_at || 'N/A'} | ソース: ${source.name}`;
            console.log('[IntegratedListingModal] Meta set to:', metaElement.textContent);
        }
        
        if (thumbnailElement && product.images && product.images.length > 0) {
            thumbnailElement.src = product.images[0];
            console.log('[IntegratedListingModal] Thumbnail set to:', product.images[0]);
        }
        
        this.loadProductData();
        this.loadImages();
        this.updateToolStatusGrid();
        
        console.log('[IntegratedListingModal] All data loaded successfully');
        console.log('[IntegratedListingModal] Current source:', this.state.currentSource);
        console.log('[IntegratedListingModal] Product data for source specific:', product);
    },

    /**
     * 商品データ表示
     */
    loadProductData() {
        const product = this.state.productData;
        const source = this.state.currentSource;
        
        console.log('[IntegratedListingModal] 🔴 loadProductData() START');
        console.log('[IntegratedListingModal] product:', product);
        console.log('[IntegratedListingModal] source:', source);
        
        const sourceConfig = this.sources[source];
        
        // 元ソースアイコンと名前設定
        const sourceIconElement = document.getElementById('data-source-icon');
        const sourceNameElement = document.getElementById('data-source-name');
        
        if (sourceIconElement) {
            sourceIconElement.className = sourceConfig.icon;
            console.log('[IntegratedListingModal] Source icon set to:', sourceConfig.icon);
        } else {
            console.warn('[IntegratedListingModal] data-source-icon element not found');
        }
        
        if (sourceNameElement) {
            sourceNameElement.textContent = sourceConfig.name;
            console.log('[IntegratedListingModal] Source name set to:', sourceConfig.name);
        } else {
            console.warn('[IntegratedListingModal] data-source-name element not found');
        }
        
        // 共通フィールド設定
        const fields = {
            'common-product-id': product.item_id || product.id || '',
            'common-db-id': product.db_id || product.id || '',
            'common-title': product.title || '',
            'common-price': product.current_price || 0,
            'common-condition': product.condition || '',
            'common-description': product.description || '',
            'generated-sku': this.generateSKU()
        };
        
        console.log('[IntegratedListingModal] Fields to set:', fields);
        
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
                console.log(`[IntegratedListingModal] Set ${id} = ${value}`);
            } else {
                console.warn(`[IntegratedListingModal] Element not found: ${id}`);
            }
        });
        
        this.renderSourceSpecific(source, product);
    },

    /**
     * 仕入れ先固有セクション表示
     */
    renderSourceSpecific(source, data) {
        const container = document.getElementById('source-specific-section');
        
        if (!container) {
            console.error('[IntegratedListingModal] source-specific-section not found');
            return;
        }
        
        // コンテナをクリア
        container.innerHTML = '';
        
        console.log('[IntegratedListingModal] Rendering source specific section for:', source);
        console.log('[IntegratedListingModal] Product data:', data);
        
        if (source === 'yahoo') {
            const template = document.getElementById('yahoo-specific-template');
            if (template) {
                const clone = template.content.cloneNode(true);
                container.appendChild(clone);
                
                // Yahooデータを解析
                let yahooData = {};
                if (data.scraped_yahoo_data) {
                    if (typeof data.scraped_yahoo_data === 'string') {
                        try {
                            yahooData = JSON.parse(data.scraped_yahoo_data);
                        } catch (e) {
                            console.error('Failed to parse scraped_yahoo_data:', e);
                        }
                    } else {
                        yahooData = data.scraped_yahoo_data;
                    }
                }
                
                // フィールドに値を設定
                const setFieldValue = (id, value) => {
                    const el = document.getElementById(id);
                    if (el) {
                        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                            el.value = value || '';
                        } else if (el.tagName === 'A') {
                            el.href = value || '#';
                        } else {
                            el.textContent = value || '';
                        }
                    }
                };
                
                setFieldValue('yahoo-source-url', yahooData.url || data.source_url || '');
                setFieldValue('yahoo-url-link', yahooData.url || data.source_url || '#');
                setFieldValue('yahoo-category', data.category || yahooData.category || 'N/A');
                setFieldValue('yahoo-scraped-at', data.scraped_at || data.created_at || 'N/A');
                setFieldValue('yahoo-image-count', (data.images?.length || 0) + '枚');
                
                // データ完全性ステータス
                setFieldValue('yahoo-title-status', data.title ? '✓' : '✗');
                setFieldValue('yahoo-price-status', data.current_price ? '✓' : '✗');
                setFieldValue('yahoo-image-status', data.images?.length > 0 ? '✓' : '✗');
                setFieldValue('yahoo-desc-status', data.description ? '✓' : '✗');
                
                console.log('[IntegratedListingModal] Yahoo specific section rendered');
            } else {
                console.error('[IntegratedListingModal] yahoo-specific-template not found');
            }
        } else if (source === 'amazon') {
            const template = document.getElementById('amazon-specific-template');
            if (template) {
                const clone = template.content.cloneNode(true);
                container.appendChild(clone);
                
                // Amazonデータを解析
                let amazonData = data;
                if (data.amazon_product_data) {
                    if (typeof data.amazon_product_data === 'string') {
                        try {
                            amazonData = JSON.parse(data.amazon_product_data);
                        } catch (e) {
                            console.error('Failed to parse amazon_product_data:', e);
                        }
                    } else {
                        amazonData = data.amazon_product_data;
                    }
                }
                
                // フィールドに値を設定
                const setFieldValue = (id, value) => {
                    const el = document.getElementById(id);
                    if (el) {
                        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                            el.value = value || '';
                        } else {
                            el.textContent = value || '';
                        }
                    }
                };
                
                setFieldValue('amazon-asin', amazonData.asin || data.asin || data.item_id || '');
                setFieldValue('amazon-brand', amazonData.brand || data.brand || '');
                setFieldValue('amazon-model', amazonData.model || amazonData.model_number || data.model || '');
                setFieldValue('amazon-manufacturer', amazonData.manufacturer || data.manufacturer || '');
                setFieldValue('amazon-category-path', amazonData.category || data.category || 'N/A');
                setFieldValue('amazon-api-date', data.scraped_at || data.created_at || 'N/A');
                setFieldValue('amazon-image-count', (data.images?.length || 0) + '枚');
                
                // パッケージ情報（APIから取得できる場合）
                setFieldValue('amazon-weight', amazonData.weight || amazonData.package_weight || '');
                setFieldValue('amazon-length', amazonData.length || amazonData.package_length || '');
                setFieldValue('amazon-width', amazonData.width || amazonData.package_width || '');
                setFieldValue('amazon-height', amazonData.height || amazonData.package_height || '');
                
                console.log('[IntegratedListingModal] Amazon specific section rendered');
            } else {
                console.error('[IntegratedListingModal] amazon-specific-template not found');
            }
        } else {
            console.warn('[IntegratedListingModal] Unknown source:', source);
            container.innerHTML = '<div class="ilm-data-section" style="padding: 1rem; text-align: center; color: #6c757d;">仕入れ元情報がありません</div>';
        }
    },

    /**
     * SKU生成
     */
    generateSKU() {
        const prefix = this.state.currentMarketplace.toUpperCase().replace(/-/g, '');
        const productId = (this.state.productData.item_id || this.state.productData.id || '').toString().replace(/[^a-zA-Z0-9]/g, '');
        const timestamp = Date.now().toString().slice(-6);
        return `${prefix}-${productId}-${timestamp}`;
    },

    /**
     * 画像ロード
     */
    loadImages() {
        const product = this.state.productData;
        const images = product.images || [];
        const availableContainer = document.getElementById('ilm-available-images');
        
        console.log('[IntegratedListingModal] 🔴 loadImages() START');
        console.log('[IntegratedListingModal] product.images:', images);
        console.log('[IntegratedListingModal] images.length:', images.length);
        console.log('[IntegratedListingModal] availableContainer found:', !!availableContainer);
        
        if (!availableContainer) {
            console.error('[IntegratedListingModal] ilm-available-images container not found!');
            return;
        }
        
        const availableCountElement = document.getElementById('ilm-available-image-count');
        const maxImagesElement = document.getElementById('ilm-max-images');
        
        if (availableCountElement) {
            availableCountElement.textContent = images.length;
            console.log('[IntegratedListingModal] Available image count set to:', images.length);
        } else {
            console.warn('[IntegratedListingModal] ilm-available-image-count element not found');
        }
        
        if (maxImagesElement) {
            maxImagesElement.textContent = this.marketplaces[this.state.currentMarketplace].maxImages;
            console.log('[IntegratedListingModal] Max images set to:', this.marketplaces[this.state.currentMarketplace].maxImages);
        } else {
            console.warn('[IntegratedListingModal] ilm-max-images element not found');
        }
        
        if (images.length === 0) {
            console.warn('[IntegratedListingModal] No images available!');
            availableContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: #6c757d;">画像がありません</div>';
            return;
        }
        
        availableContainer.innerHTML = images.map((url, index) => `
            <div class="ilm-image-item ${this.state.selectedImages.includes(index) ? 'selected' : ''}" 
                 onclick="IntegratedListingModal.toggleImage(${index})">
                <img src="${url}" alt="画像${index + 1}">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); color: white; padding: 0.25rem; font-size: 0.7rem; text-align: center;">
                    ${index + 1}${this.state.selectedImages.includes(index) ? ' ✓' : ''}
                </div>
            </div>
        `).join('');
        
        console.log('[IntegratedListingModal] Images HTML generated, count:', images.length);
        
        this.updateSelectedImages();
    },

    /**
     * 画像選択切替
     */
    toggleImage(imageIndex) {
        const maxImages = this.marketplaces[this.state.currentMarketplace].maxImages;
        
        if (this.state.selectedImages.includes(imageIndex)) {
            this.state.selectedImages = this.state.selectedImages.filter(i => i !== imageIndex);
        } else {
            if (this.state.selectedImages.length < maxImages) {
                this.state.selectedImages.push(imageIndex);
            } else {
                alert(`${this.marketplaces[this.state.currentMarketplace].name}では最大${maxImages}枚まで選択できます。`);
                return;
            }
        }
        
        this.loadImages();
    },

    /**
     * 選択画像更新
     */
    updateSelectedImages() {
        const container = document.getElementById('ilm-selected-images');
        if (!container) return;
        
        const maxImages = this.marketplaces[this.state.currentMarketplace].maxImages;
        const images = this.state.productData.images || [];
        
        container.innerHTML = '';
        
        this.state.selectedImages.forEach((imageIndex, position) => {
            const div = document.createElement('div');
            div.className = 'ilm-image-item selected';
            div.onclick = () => this.toggleImage(imageIndex);
            div.innerHTML = `
                <img src="${images[imageIndex]}" alt="選択${position + 1}">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); color: white; padding: 0.25rem; font-size: 0.7rem; text-align: center;">
                    ${position + 1}番目 <i class="fas fa-times"></i>
                </div>
            `;
            container.appendChild(div);
        });
        
        for (let i = this.state.selectedImages.length; i < maxImages; i++) {
            const div = document.createElement('div');
            div.style.cssText = 'border: 2px dashed #ddd; display: flex; align-items: center; justify-content: center; height: 80px; color: #999; font-size: 0.8rem; border-radius: 6px;';
            div.innerHTML = `<div>${i + 1}</div>`;
            container.appendChild(div);
        }
        
        document.getElementById('ilm-selected-image-count').textContent = this.state.selectedImages.length;
    },

    /**
     * 全画像選択
     */
    selectAllImages() {
        const maxImages = this.marketplaces[this.state.currentMarketplace].maxImages;
        const imageCount = this.state.productData.images?.length || 0;
        
        this.state.selectedImages = [];
        for (let i = 0; i < Math.min(imageCount, maxImages); i++) {
            this.state.selectedImages.push(i);
        }
        
        this.loadImages();
    },

    /**
     * 選択画像クリア
     */
    clearSelectedImages() {
        this.state.selectedImages = [];
        this.loadImages();
    },

    /**
     * 追加画像処理
     */
    handleAdditionalImages(input) {
        console.log('[IntegratedListingModal] Additional images:', input.files);
    },

    /**
     * マーケットプレイス切り替え（タブも動的に切り替え）
     */
    async switchMarketplace(marketplace) {
        console.log('[IntegratedListingModal] Switching to:', marketplace);
        
        this.state.currentMarketplace = marketplace;
        
        // ボタン状態更新
        document.querySelectorAll('.ilm-marketplace-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.ilm-marketplace-btn.${marketplace}`).classList.add('active');
        
        // マーケットプレイス別タブをロード
        await this.loadMarketplaceSpecificTabs(marketplace);
        
        // 表示名更新
        const config = this.marketplaces[marketplace];
        document.getElementById('ilm-current-marketplace-name').textContent = config.name;
        document.getElementById('ilm-shipping-marketplace-name').textContent = config.name;
        document.getElementById('ilm-html-marketplace-name').textContent = config.name;
        document.getElementById('ilm-current-marketplace-submit').textContent = config.name;
        
        const maxImagesEl = document.getElementById('ilm-max-images');
        if (maxImagesEl) maxImagesEl.textContent = config.maxImages;
        
        const skuEl = document.getElementById('generated-sku');
        if (skuEl) skuEl.value = this.generateSKU();
        
        this.updateSelectedImages();
        
        console.log('[IntegratedListingModal] Marketplace switched and tabs reloaded');
    },

    /**
     * タブ切り替え
     */
    switchTab(tabId) {
        console.log('[IntegratedListingModal] Switching to tab:', tabId);
        
        this.state.currentTab = tabId;
        
        // タブリンクのactiveクラス更新
        document.querySelectorAll('.ilm-tab-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = Array.from(document.querySelectorAll('.ilm-tab-link')).find(link => 
            link.getAttribute('onclick')?.includes(tabId)
        );
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // タブペインのactiveクラス更新
        document.querySelectorAll('.ilm-tab-pane').forEach(pane => {
            pane.classList.remove('active');
            pane.style.display = 'none';  // ✅ 強制的に非表示
        });
        
        const targetPane = document.getElementById(`ilm-${tabId}`);
        if (targetPane) {
            targetPane.classList.add('active');
            targetPane.style.display = 'block';  // ✅ 強制的に表示
            targetPane.style.opacity = '1';  // ✅ 不透明度設定
            targetPane.style.visibility = 'visible';  // ✅ 可視性設定
            
            console.log('[IntegratedListingModal] ✅ Tab activated:', tabId);
            console.log('[IntegratedListingModal] Target pane display:', targetPane.style.display);
            console.log('[IntegratedListingModal] Target pane classList:', targetPane.classList.toString());
        } else {
            console.error('[IntegratedListingModal] ❌ Target pane not found:', `ilm-${tabId}`);
        }
    },

    /**
     * 次のタブへ
     */
    goToNextTab() {
        const tabs = ['tab-overview', 'tab-data', 'tab-images', 'tab-tools', 'tab-listing', 'tab-shipping', 'tab-html', 'tab-final'];
        const currentIndex = tabs.indexOf(this.state.currentTab);
        
        if (currentIndex < tabs.length - 1) {
            this.switchTab(tabs[currentIndex + 1]);
        }
    },

    /**
     * モーダルを閉じる
     */
    close() {
        const modal = document.getElementById('integrated-listing-modal');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        this.state.selectedImages = [];
        this.state.currentTab = 'tab-overview';
        
        console.log('[IntegratedListingModal] Modal closed');
    },

    /**
     * ツールステータス更新
     */
    updateToolStatusGrid() {
        const statusGrid = document.getElementById('ilm-tool-status-grid');
        
        const tools = [
            { name: 'データ取得', icon: 'fas fa-database', status: this.state.productData ? 'complete' : 'missing' },
            { name: '画像取得', icon: 'fas fa-images', status: this.state.productData?.images?.length > 0 ? 'complete' : 'missing' },
            { name: 'カテゴリ判定', icon: 'fas fa-tags', status: this.state.toolResults.category ? 'complete' : 'missing' },
            { name: '利益計算', icon: 'fas fa-yen-sign', status: this.state.toolResults.profit ? 'complete' : 'missing' }
        ];
        
        statusGrid.innerHTML = tools.map(tool => `
            <div class="ilm-status-card ${tool.status}">
                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem;"><i class="${tool.icon}"></i> ${tool.name}</h4>
                <div style="font-size: 1.2rem; font-weight: 600;">${tool.status === 'complete' ? '完了' : '未実行'}</div>
            </div>
        `).join('');
    },

    // === マーケットプレイス別HTML関数 ===
    
    /**
     * Amazon日本 HTMLテンプレート生成
     */
    generateAmazonJpHtmlTemplate() {
        const product = this.state.productData;
        const template = document.getElementById('amazon-jp-html-template');
        
        if (template) {
            let html = template.innerHTML;
            html = html.replace('{{PRODUCT_TITLE}}', product.title || '商品名');
            html = html.replace('{{CONDITION}}', product.condition || '中古');
            html = html.replace('{{BRAND}}', product.brand || 'ブランド名');
            html = html.replace(/{{FEATURE_1}}/g, '特徴1');
            html = html.replace(/{{FEATURE_2}}/g, '特徴2');
            html = html.replace(/{{FEATURE_3}}/g, '特徴3');
            
            document.getElementById('amazon-jp-html-editor').value = html;
            this.updateAmazonJpHtmlPreview();
        }
    },

    /**
     * Amazon日本 HTMLプレビュー更新
     */
    updateAmazonJpHtmlPreview() {
        const htmlContent = document.getElementById('amazon-jp-html-editor').value;
        const preview = document.getElementById('amazon-jp-html-preview');
        preview.innerHTML = htmlContent || '<p style="color: #6c757d; text-align: center;">商品説明を入力するとプレビューが表示されます</p>';
    },

    /**
     * Shopify HTMLテンプレート生成
     */
    generateShopifyHtmlTemplate() {
        const product = this.state.productData;
        const template = document.getElementById('shopify-html-template');
        
        if (template) {
            let html = template.innerHTML;
            html = html.replace('{{PRODUCT_TITLE}}', product.title || '商品名');
            html = html.replace('{{CONDITION}}', product.condition || '中古');
            html = html.replace('{{BRAND}}', product.brand || 'ブランド名');
            html = html.replace(/{{FEATURE_1}}/g, '特徴1');
            html = html.replace(/{{FEATURE_2}}/g, '特徴2');
            html = html.replace(/{{FEATURE_3}}/g, '特徴3');
            
            document.getElementById('shopify-html-editor').value = html;
            this.updateShopifyHtmlPreview();
        }
    },

    /**
     * Shopify HTMLプレビュー更新
     */
    updateShopifyHtmlPreview() {
        const htmlContent = document.getElementById('shopify-html-editor').value;
        const preview = document.getElementById('shopify-html-preview');
        preview.innerHTML = htmlContent || '<p style="color: #6c757d; text-align: center;">商品説明を入力するとプレビューが表示されます</p>';
    },

    /**
     * Shopify配送詳細更新
     */
    updateShopifyShippingDetails(policyValue) {
        console.log('[IntegratedListingModal] Update Shopify shipping policy:', policyValue);
    },

    /**
     * Amazon日本配送詳細更新
     */
    updateAmazonJpShippingDetails(templateValue) {
        console.log('[IntegratedListingModal] Update Amazon JP shipping template:', templateValue);
    },

    // === eBay HTML関数（既存） ===
    
    generateHtmlTemplate() {
        const product = this.state.productData;
        const template = document.getElementById('ebay-html-template');
        
        if (template) {
            let html = template.innerHTML;
            html = html.replace('{{PRODUCT_TITLE}}', product.title || 'Product Title');
            html = html.replace('{{CONDITION}}', product.condition || 'Used');
            html = html.replace('{{CATEGORY}}', product.category || 'Trading Cards');
            
            document.getElementById('html-editor').value = html;
            this.updateHtmlPreview();
        }
    },

    insertCommonElements() {
        const editor = document.getElementById('html-editor');
        const commonElements = `
<div style="background: #fffbf0; border: 1px solid #ffd700; padding: 15px; margin: 10px 0; border-radius: 5px;">
    <h4 style="color: #ff8c00; margin-top: 0;">🎯 Why Choose Us?</h4>
    <ul style="margin: 0;">
        <li>📦 Professional packaging</li>
        <li>🚚 Fast worldwide shipping</li>
        <li>⭐ 100% authentic products</li>
        <li>💬 Excellent customer service</li>
    </ul>
</div>`;
        
        editor.value += commonElements;
        this.updateHtmlPreview();
    },

    updateHtmlPreview() {
        const htmlContent = document.getElementById('html-editor').value;
        const preview = document.getElementById('html-preview');
        preview.innerHTML = htmlContent || '<p style="color: #6c757d; text-align: center;">HTMLを入力するとプレビューが表示されます</p>';
    },

    validateHtml() {
        const htmlContent = document.getElementById('html-editor').value;
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const errors = doc.querySelectorAll('parsererror');
        
        if (errors.length === 0) {
            alert('✓ HTMLは正常です');
        } else {
            alert('⚠ HTML構文エラーが検出されました。修正してください。');
        }
    },

    formatHtml() {
        const editor = document.getElementById('html-editor');
        let html = editor.value;
        html = html.replace(/></g, '>\n<');
        html = html.replace(/^\s+|\s+$/gm, '');
        editor.value = html;
        this.updateHtmlPreview();
    },

    insertTable() {
        const editor = document.getElementById('html-editor');
        const product = this.state.productData;
        const tableHtml = `
<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
    <tr>
        <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2;">項目</th>
        <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2;">詳細</th>
    </tr>
    <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">状態</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${product.condition || 'Used'}</td>
    </tr>
    <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">カテゴリ</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${product.category || 'N/A'}</td>
    </tr>
</table>`;
        
        editor.value += tableHtml;
        this.updateHtmlPreview();
    },

    insertImage() {
        if (this.state.selectedImages.length > 0) {
            const editor = document.getElementById('html-editor');
            const imageUrl = this.state.productData.images[this.state.selectedImages[0]];
            const imageHtml = `<img src="${imageUrl}" alt="商品画像" style="max-width: 800px; width: 100%; height: auto; margin: 10px 0;">`;
            editor.value += imageHtml;
            this.updateHtmlPreview();
        } else {
            alert('画像を選択してください');
        }
    },

    copyHtmlToClipboard() {
        const htmlContent = document.getElementById('html-editor').value;
        navigator.clipboard.writeText(htmlContent).then(() => {
            alert('HTMLをクリップボードにコピーしました');
        });
    },

    togglePreviewMode() {
        console.log('[IntegratedListingModal] Toggle preview mode');
    },

    // === その他 ===
    
    updateCharCounter(textarea, counterId) {
        const counter = document.getElementById(counterId);
        if (counter) {
            const current = textarea.value.length;
            const max = textarea.maxLength || 80;
            counter.textContent = `${current}/${max}`;
            
            if (current > max * 0.9) {
                counter.style.color = '#dc3545';
            } else if (current > max * 0.8) {
                counter.style.color = '#ffc107';
            } else {
                counter.style.color = '#6c757d';
            }
        }
    },

    toggleOfferSettings() {
        const bestOffer = document.getElementById('ebay-best-offer').value;
        const offerSettings = document.getElementById('offer-settings');
        
        if (offerSettings) {
            offerSettings.style.display = bestOffer === 'enabled' ? 'block' : 'none';
        }
    },

    updateShippingPolicyDetails(policyValue) {
        console.log('[IntegratedListingModal] Update shipping policy:', policyValue);
    },

    openCategoryTool() {
        const itemId = this.state.productData.item_id || this.state.productData.id;
        const categoryToolUrl = `../11_category/frontend/ebay_category_tool.php?item_id=${encodeURIComponent(itemId)}&source=integrated_modal`;
        window.open(categoryToolUrl, '_blank', 'width=1200,height=800,scrollbars=yes');
    },

    runCategoryTool() { console.log('カテゴリ判定ツール実行'); },
    runFilterTool() { console.log('フィルターツール実行'); },
    runProfitTool() { console.log('利益計算ツール実行'); },
    runSellerMirror() { console.log('SellerMirror実行'); },
    runAllTools() { console.log('全ツール実行'); },
    submitListing() { console.log('出品実行'); },

    updateStepStatus(elementId, text, type) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            element.style.color = `var(--ilm-${type})`;
        }
    },

    startProcessingTimer() {
        setInterval(() => {
            const elapsed = (Date.now() - this.state.processingStartTime) / 1000;
            const timeElement = document.getElementById('ilm-processing-time');
            if (timeElement) {
                timeElement.textContent = elapsed.toFixed(2);
            }
        }, 1000);
    },

    showError(message) {
        alert('エラー: ' + message);
        console.error('[IntegratedListingModal] Error:', message);
    },

    /**
     * 🔴 通知表示
     */
    showNotification(message, type = 'info') {
        console.log(`[IntegratedListingModal] ${type.toUpperCase()}: ${message}`);
        
        // シンプルな通知システム
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            border-radius: 6px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 999999;
            font-size: 0.9rem;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
        notification.innerHTML = `<strong>${icon}</strong> ${message}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// ESCキーでモーダルを閉じる
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('integrated-listing-modal');
        if (modal && modal.classList.contains('active')) {
            IntegratedListingModal.close();
        }
    }
});

console.log('✅ IntegratedListingModal controller loaded (Full Version with Marketplace-Specific Tab Switching)');
