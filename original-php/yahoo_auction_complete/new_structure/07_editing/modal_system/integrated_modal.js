/**
 * 統合出品モーダル - メインコントローラー (完全版)
 * 名前空間: IntegratedListingModal
 */

const IntegratedListingModal = {
    // 状態管理
    state: {
        currentMarketplace: 'ebay',
        currentTab: 'tab-overview',
        productData: null,
        selectedImages: [],
        toolResults: {},
        processingStartTime: Date.now()
    },

    // マーケットプレイス設定
    marketplaces: {
        ebay: {
            name: 'eBay',
            icon: 'fab fa-ebay',
            color: '#0064d2',
            maxImages: 12,
            listingTemplate: 'marketplaces/ebay_listing.html',
            shippingTemplate: 'marketplaces/ebay_shipping.html'
        },
        shopee: {
            name: 'Shopee',
            icon: 'fas fa-shopping-bag',
            color: '#ee4d2d',
            maxImages: 10,
            listingTemplate: 'marketplaces/shopee_listing.html',
            shippingTemplate: 'marketplaces/shopee_shipping.html'
        },
        'amazon-global': {
            name: 'Amazon海外',
            icon: 'fab fa-amazon',
            color: '#ff9900',
            maxImages: 9,
            listingTemplate: 'marketplaces/amazon_listing.html',
            shippingTemplate: 'marketplaces/amazon_shipping.html'
        },
        'amazon-jp': {
            name: 'Amazon日本',
            icon: 'fab fa-amazon',
            color: '#232f3e',
            maxImages: 9,
            listingTemplate: 'marketplaces/amazon_jp_listing.html',
            shippingTemplate: 'marketplaces/amazon_jp_shipping.html'
        },
        coupang: {
            name: 'Coupang',
            icon: 'fas fa-store',
            color: '#ff6600',
            maxImages: 20,
            listingTemplate: 'marketplaces/coupang_listing.html',
            shippingTemplate: 'marketplaces/coupang_shipping.html'
        },
        shopify: {
            name: 'Shopify',
            icon: 'fab fa-shopify',
            color: '#95bf47',
            maxImages: 25,
            listingTemplate: 'marketplaces/shopify_listing.html',
            shippingTemplate: 'marketplaces/shopify_shipping.html'
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
        
        // データ取得
        try {
            const response = await fetch(`?action=get_product_details&item_id=${encodeURIComponent(itemId)}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                this.state.productData = result.data;
                await this.loadAllData();
                this.updateStepStatus('ilm-step1-status', '完了', 'success');
            } else {
                this.showError(result.message || 'データ取得失敗');
            }
        } catch (error) {
            console.error('[IntegratedListingModal] Error:', error);
            this.showError('データ読み込みエラー: ' + error.message);
        }
    },

    /**
     * モーダルを閉じる
     */
    close() {
        const modal = document.getElementById('integrated-listing-modal');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // 状態リセット
        this.state.selectedImages = [];
        this.state.currentTab = 'tab-overview';
        
        console.log('[IntegratedListingModal] Modal closed');
    },

    /**
     * 全データロード
     */
    async loadAllData() {
        const product = this.state.productData;
        const marketplace = this.marketplaces[this.state.currentMarketplace];
        
        // ヘッダー更新
        document.getElementById('ilm-title-text').textContent = product.title || '商品名不明';
        document.getElementById('ilm-product-meta').textContent = 
            `ID: ${product.item_id} | 取得日: ${product.scraped_at || 'N/A'} | プラットフォーム: Yahoo`;
        
        if (product.images && product.images.length > 0) {
            document.getElementById('ilm-product-thumbnail').src = product.images[0];
        }
        
        // データタブ更新
        this.loadProductData();
        
        // 画像ロード
        this.loadImages();
        
        // ツールステータス更新
        this.updateToolStatusGrid();
        
        // マーケットプレイス別コンテンツロード
        await this.loadMarketplaceContent();
        
        console.log('[IntegratedListingModal] All data loaded successfully');
    },

    /**
     * 商品データ表示
     */
    loadProductData() {
        const product = this.state.productData;
        const dataContainer = document.getElementById('ilm-scraped-data');
        
        dataContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #e9ecef;">
                <span style="font-weight: 500; color: var(--ilm-text-secondary);">商品ID</span>
                <span style="font-weight: 600; color: var(--ilm-text-primary);">${product.item_id}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #e9ecef;">
                <span style="font-weight: 500; color: var(--ilm-text-secondary);">元タイトル</span>
                <span style="font-weight: 600; color: var(--ilm-text-primary);">${product.title}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #e9ecef;">
                <span style="font-weight: 500; color: var(--ilm-text-secondary);">価格</span>
                <span style="font-weight: 600; color: var(--ilm-text-primary);">¥${(product.current_price || 0).toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #e9ecef;">
                <span style="font-weight: 500; color: var(--ilm-text-secondary);">商品状態</span>
                <span style="font-weight: 600; color: var(--ilm-text-primary);">${product.condition || 'N/A'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.4rem 0;">
                <span style="font-weight: 500; color: var(--ilm-text-secondary);">画像URL数</span>
                <span style="font-weight: 600; color: var(--ilm-text-primary);">${product.images?.length || 0}枚</span>
            </div>
        `;
    },

    /**
     * 画像ロード
     */
    loadImages() {
        const product = this.state.productData;
        const images = product.images || [];
        const availableContainer = document.getElementById('ilm-available-images');
        
        document.getElementById('ilm-available-image-count').textContent = images.length;
        document.getElementById('ilm-max-images').textContent = this.marketplaces[this.state.currentMarketplace].maxImages;
        
        availableContainer.innerHTML = images.map((url, index) => `
            <div class="ilm-image-item ${this.state.selectedImages.includes(index) ? 'selected' : ''}" 
                 onclick="IntegratedListingModal.toggleImage(${index})">
                <img src="${url}" alt="画像${index + 1}">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); color: white; padding: 0.25rem; font-size: 0.7rem; text-align: center;">
                    ${index + 1}番目
                </div>
            </div>
        `).join('');
        
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
        const maxImages = this.marketplaces[this.state.currentMarketplace].maxImages;
        const images = this.state.productData.images || [];
        
        container.innerHTML = '';
        
        // 選択済み画像
        this.state.selectedImages.forEach((imageIndex, position) => {
            const div = document.createElement('div');
            div.className = 'ilm-image-item selected';
            div.onclick = () => this.toggleImage(imageIndex);
            div.innerHTML = `
                <img src="${images[imageIndex]}" alt="選択${position + 1}">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); color: white; padding: 0.25rem; font-size: 0.7rem; text-align: center;">
                    ${position + 1}番目
                </div>
            `;
            container.appendChild(div);
        });
        
        // 空きスロット
        for (let i = this.state.selectedImages.length; i < maxImages; i++) {
            const div = document.createElement('div');
            div.style.cssText = 'border: 2px dashed #ddd; display: flex; align-items: center; justify-content: center; height: 80px; color: #999; font-size: 0.8rem; border-radius: 6px;';
            div.innerHTML = `<div>${i + 1}</div>`;
            container.appendChild(div);
        }
        
        document.getElementById('ilm-selected-image-count').textContent = this.state.selectedImages.length;
    },

    /**
     * マーケットプレイス切り替え
     */
    async switchMarketplace(marketplace) {
        console.log('[IntegratedListingModal] Switching to:', marketplace);
        
        this.state.currentMarketplace = marketplace;
        
        // ボタン状態更新
        document.querySelectorAll('.ilm-marketplace-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.ilm-marketplace-btn.${marketplace}`).classList.add('active');
        
        // 表示名更新
        const config = this.marketplaces[marketplace];
        document.getElementById('ilm-current-marketplace-name').textContent = config.name;
        document.getElementById('ilm-shipping-marketplace-name').textContent = config.name;
        document.getElementById('ilm-html-marketplace-name').textContent = config.name;
        document.getElementById('ilm-current-marketplace-submit').textContent = config.name;
        document.getElementById('ilm-max-images').textContent = config.maxImages;
        
        // コンテンツ再ロード
        await this.loadMarketplaceContent();
        this.updateSelectedImages();
    },

    /**
     * マーケットプレイス別コンテンツロード
     */
    async loadMarketplaceContent() {
        const config = this.marketplaces[this.state.currentMarketplace];
        
        // 出品情報コンテンツ
        const listingContainer = document.getElementById('ilm-marketplace-content');
        listingContainer.innerHTML = '<p style="color: var(--ilm-text-secondary); text-align: center; padding: 2rem;">出品フォームを読み込み中...</p>';
        
        // 配送情報コンテンツ
        const shippingContainer = document.getElementById('ilm-shipping-content');
        shippingContainer.innerHTML = '<p style="color: var(--ilm-text-secondary); text-align: center; padding: 2rem;">配送設定を読み込み中...</p>';
        
        // HTMLエディタコンテンツ
        const htmlContainer = document.getElementById('ilm-html-editor-container');
        htmlContainer.innerHTML = '<p style="color: var(--ilm-text-secondary); text-align: center; padding: 2rem;">HTMLエディタを読み込み中...</p>';
    },

    /**
     * タブ切り替え
     */
    switchTab(tabId) {
        console.log('[IntegratedListingModal] Switching to tab:', tabId);
        
        this.state.currentTab = tabId;
        
        // タブリンク更新
        document.querySelectorAll('.ilm-tab-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = Array.from(document.querySelectorAll('.ilm-tab-link')).find(link => 
            link.getAttribute('onclick').includes(tabId)
        );
        if (activeLink) activeLink.classList.add('active');
        
        // タブパネル更新
        document.querySelectorAll('.ilm-tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`ilm-${tabId}`).classList.add('active');
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

    /**
     * ツール実行（プレースホルダー）
     */
    runCategoryTool() { console.log('カテゴリ判定ツール実行'); },
    runFilterTool() { console.log('フィルターツール実行'); },
    runProfitTool() { console.log('利益計算ツール実行'); },
    runSellerMirror() { console.log('SellerMirror実行'); },
    runAllTools() { console.log('全ツール実行'); },
    submitListing() { console.log('出品実行'); },

    /**
     * ステップ状態更新
     */
    updateStepStatus(elementId, text, type) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            element.style.color = `var(--ilm-${type})`;
        }
    },

    /**
     * 処理時間タイマー
     */
    startProcessingTimer() {
        setInterval(() => {
            const elapsed = (Date.now() - this.state.processingStartTime) / 1000;
            const timeElement = document.getElementById('ilm-processing-time');
            if (timeElement) {
                timeElement.textContent = elapsed.toFixed(2);
            }
        }, 1000);
    },

    /**
     * エラー表示
     */
    showError(message) {
        alert('エラー: ' + message);
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

console.log('✅ IntegratedListingModal controller loaded');
