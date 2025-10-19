/**
 * 統合モーダルシステム - メインコントローラー
 * 仕入れ先と出品先を動的に切り替える拡張可能な設計
 */

const IntegratedModal = {
    // 状態管理
    state: {
        currentSource: null,        // 現在の仕入れ先 (yahoo, amazon, etc)
        currentMarketplace: 'ebay',  // 現在の出品先 (ebay, shopee, etc)
        currentTab: 'overview',      // 現在のタブ
        productData: null,           // 商品データ
        selectedImages: [],          // 選択された画像
        toolResults: {}              // ツール実行結果
    },

    // 仕入れ先設定
    sources: {
        yahoo: {
            name: 'Yahoo オークション',
            icon: 'fas fa-gavel',
            color: '#0B1D51',
            templatePath: 'modal_system/sources/yahoo_template.html',
            dataHandler: 'handleYahooData'
        },
        amazon: {
            name: 'Amazon API',
            icon: 'fab fa-amazon',
            color: '#ff9900',
            templatePath: 'modal_system/sources/amazon_template.html',
            dataHandler: 'handleAmazonData'
        },
        generic: {
            name: '汎用データ',
            icon: 'fas fa-database',
            color: '#6c757d',
            templatePath: 'modal_system/sources/generic_template.html',
            dataHandler: 'handleGenericData'
        }
    },

    // マーケットプレイス設定
    marketplaces: {
        ebay: {
            name: 'eBay',
            icon: 'fab fa-ebay',
            color: '#0064d2',
            maxImages: 12,
            templatePath: 'modal_system/marketplaces/ebay_template.html'
        },
        shopee: {
            name: 'Shopee',
            icon: 'fas fa-shopping-bag',
            color: '#ee4d2d',
            maxImages: 10,
            templatePath: 'modal_system/marketplaces/shopee_template.html'
        },
        'amazon-global': {
            name: 'Amazon海外',
            icon: 'fab fa-amazon',
            color: '#ff9900',
            maxImages: 9,
            templatePath: 'modal_system/marketplaces/amazon_template.html'
        }
    },

    /**
     * モーダルを開く
     */
    async open(itemId) {
        console.log('[IntegratedModal] Opening modal for item:', itemId);
        
        // モーダル表示
        document.getElementById('integrated-modal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // データ取得
        try {
            const response = await fetch(`?action=get_product_details&item_id=${encodeURIComponent(itemId)}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                this.state.productData = result.data;
                
                // 仕入れ先判定
                this.state.currentSource = this.detectSource(result.data);
                console.log('[IntegratedModal] Detected source:', this.state.currentSource);
                
                // データロード
                await this.loadAllData();
            } else {
                this.showError(result.message || 'データ取得失敗');
            }
        } catch (error) {
            console.error('[IntegratedModal] Error:', error);
            this.showError('データ読み込みエラー: ' + error.message);
        }
    },

    /**
     * モーダルを閉じる
     */
    close() {
        document.getElementById('integrated-modal').style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // 状態リセット
        this.state.selectedImages = [];
        this.state.currentTab = 'overview';
        
        console.log('[IntegratedModal] Modal closed');
    },

    /**
     * 仕入れ先判定
     */
    detectSource(productData) {
        const platform = (productData.platform || '').toLowerCase();
        
        if (platform.includes('yahoo') || platform.includes('ヤフオク')) {
            return 'yahoo';
        } else if (platform.includes('amazon')) {
            return 'amazon';
        } else {
            return 'generic';
        }
    },

    /**
     * 全データロード
     */
    async loadAllData() {
        const product = this.state.productData;
        const source = this.sources[this.state.currentSource];
        const marketplace = this.marketplaces[this.state.currentMarketplace];
        
        // ヘッダー更新
        document.getElementById('integrated-title-text').textContent = product.title || '商品名不明';
        document.getElementById('integrated-source-icon').className = source.icon;
        document.getElementById('integrated-source-name').textContent = source.name;
        document.getElementById('integrated-marketplace-icon').className = marketplace.icon;
        document.getElementById('integrated-marketplace-name').textContent = marketplace.name;
        
        // 画像更新
        if (product.images && product.images.length > 0) {
            document.getElementById('integrated-product-thumbnail').src = product.images[0];
        }
        
        // 仕入れ先別テンプレートロード
        await this.loadSourceTemplate();
        
        // マーケットプレイス別テンプレートロード
        await this.loadMarketplaceTemplate();
        
        // 画像データロード
        this.loadImages();
        
        // ツールステータス更新
        this.updateToolStatus();
        
        // フッター更新
        document.getElementById('integrated-footer-source').textContent = source.name;
        document.getElementById('integrated-footer-marketplace').textContent = marketplace.name;
        
        console.log('[IntegratedModal] All data loaded successfully');
    },

    /**
     * 仕入れ先テンプレートロード
     */
    async loadSourceTemplate() {
        const source = this.sources[this.state.currentSource];
        const container = document.getElementById('integrated-source-content');
        
        try {
            const response = await fetch(source.templatePath);
            const html = await response.text();
            container.innerHTML = html;
            
            // データハンドラー実行
            if (this[source.dataHandler]) {
                this[source.dataHandler](this.state.productData);
            }
        } catch (error) {
            console.error('[IntegratedModal] Failed to load source template:', error);
            container.innerHTML = `<div style="padding: 2rem; text-align: center; color: #dc3545;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>テンプレート読み込みエラー</p>
            </div>`;
        }
    },

    /**
     * マーケットプレイステンプレートロード
     */
    async loadMarketplaceTemplate() {
        const marketplace = this.marketplaces[this.state.currentMarketplace];
        const container = document.getElementById('integrated-marketplace-content');
        
        try {
            const response = await fetch(marketplace.templatePath);
            const html = await response.text();
            container.innerHTML = html;
            
            // 最大画像数更新
            document.getElementById('integrated-max-images').textContent = marketplace.maxImages;
        } catch (error) {
            console.error('[IntegratedModal] Failed to load marketplace template:', error);
            container.innerHTML = `<div style="padding: 2rem; text-align: center; color: #dc3545;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>テンプレート読み込みエラー</p>
            </div>`;
        }
    },

    /**
     * Yahooデータハンドラー
     */
    handleYahooData(data) {
        console.log('[IntegratedModal] Handling Yahoo data:', data);
        
        document.getElementById('yahoo-item-id').value = data.item_id || '';
        document.getElementById('yahoo-db-id').value = data.db_id || '';
        document.getElementById('yahoo-sku').value = data.sku || '';
        document.getElementById('yahoo-title').value = data.title || '';
        document.getElementById('yahoo-price').value = data.current_price || 0;
        document.getElementById('yahoo-condition').value = data.condition || '';
        document.getElementById('yahoo-category').value = data.category || '';
        document.getElementById('yahoo-description').value = data.description || '';
        
        // Yahoo固有情報
        document.getElementById('yahoo-acquired-date').textContent = data.scraped_at || 'N/A';
        document.getElementById('yahoo-image-count').textContent = (data.images?.length || 0) + '枚';
        
        if (data.source_url) {
            const urlLink = document.getElementById('yahoo-source-url');
            urlLink.href = data.source_url;
            urlLink.style.display = 'inline';
        }
    },

    /**
     * Amazonデータハンドラー
     */
    handleAmazonData(data) {
        console.log('[IntegratedModal] Handling Amazon data:', data);
        
        document.getElementById('amazon-asin').value = data.asin || data.item_id || '';
        document.getElementById('amazon-db-id').value = data.db_id || '';
        document.getElementById('amazon-sku').value = data.sku || '';
        document.getElementById('amazon-title').value = data.title || '';
        document.getElementById('amazon-price').value = data.current_price || 0;
        document.getElementById('amazon-brand').value = data.brand || '';
        document.getElementById('amazon-model').value = data.model || '';
        document.getElementById('amazon-description').value = data.description || '';
        
        // Amazon固有情報
        document.getElementById('amazon-category-path').textContent = data.category || 'N/A';
        document.getElementById('amazon-manufacturer').textContent = data.manufacturer || 'N/A';
        document.getElementById('amazon-image-count').textContent = (data.images?.length || 0) + '枚';
        document.getElementById('amazon-api-date').textContent = data.scraped_at || 'N/A';
    },

    /**
     * 汎用データハンドラー
     */
    handleGenericData(data) {
        console.log('[IntegratedModal] Handling Generic data:', data);
        // 汎用テンプレートの処理（今後実装）
    },

    /**
     * マーケットプレイス切り替え
     */
    async switchMarketplace(marketplace) {
        console.log('[IntegratedModal] Switching marketplace to:', marketplace);
        
        this.state.currentMarketplace = marketplace;
        
        // ボタン状態更新
        document.querySelectorAll('.marketplace-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.marketplace-btn[data-marketplace="${marketplace}"]`).classList.add('active');
        
        // ヘッダー・フッター更新
        const marketplaceConfig = this.marketplaces[marketplace];
        document.getElementById('integrated-marketplace-icon').className = marketplaceConfig.icon;
        document.getElementById('integrated-marketplace-name').textContent = marketplaceConfig.name;
        document.getElementById('integrated-listing-marketplace-name').textContent = marketplaceConfig.name;
        document.getElementById('integrated-submit-marketplace').textContent = marketplaceConfig.name;
        document.getElementById('integrated-footer-marketplace').textContent = marketplaceConfig.name;
        
        // 最大画像数更新
        document.getElementById('integrated-max-images').textContent = marketplaceConfig.maxImages;
        
        // テンプレート再ロード
        await this.loadMarketplaceTemplate();
    },

    /**
     * タブ切り替え
     */
    switchTab(tabName) {
        console.log('[IntegratedModal] Switching to tab:', tabName);
        
        this.state.currentTab = tabName;
        
        // タブリンク更新
        document.querySelectorAll('.integrated-tab-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`.integrated-tab-link[data-tab="${tabName}"]`).classList.add('active');
        
        // タブパネル更新
        document.querySelectorAll('.integrated-tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`integrated-tab-${tabName}`).classList.add('active');
    },

    /**
     * 次のタブへ移動
     */
    goToNextTab() {
        const tabs = ['overview', 'data', 'images', 'tools', 'listing', 'final'];
        const currentIndex = tabs.indexOf(this.state.currentTab);
        
        if (currentIndex < tabs.length - 1) {
            this.switchTab(tabs[currentIndex + 1]);
        }
    },

    /**
     * 画像ロード
     */
    loadImages() {
        const images = this.state.productData.images || [];
        const availableContainer = document.getElementById('integrated-available-images');
        
        document.getElementById('integrated-available-image-count').textContent = images.length;
        
        // 利用可能画像表示
        availableContainer.innerHTML = images.map((url, index) => `
            <div class="integrated-image-item ${this.state.selectedImages.includes(index) ? 'selected' : ''}" 
                 onclick="IntegratedModal.toggleImage(${index})">
                <img src="${url}" alt="画像${index + 1}">
                <div class="integrated-image-overlay">${index + 1}</div>
            </div>
        `).join('');
        
        // 選択画像表示
        this.updateSelectedImages();
    },

    /**
     * 画像選択切替
     */
    toggleImage(imageIndex) {
        const maxImages = this.marketplaces[this.state.currentMarketplace].maxImages;
        
        if (this.state.selectedImages.includes(imageIndex)) {
            // 選択解除
            this.state.selectedImages = this.state.selectedImages.filter(i => i !== imageIndex);
        } else {
            // 選択追加
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
     * 選択画像表示更新
     */
    updateSelectedImages() {
        const selectedContainer = document.getElementById('integrated-selected-images');
        const maxImages = this.marketplaces[this.state.currentMarketplace].maxImages;
        const images = this.state.productData.images || [];
        
        selectedContainer.innerHTML = '';
        
        // 選択済み画像
        this.state.selectedImages.forEach((imageIndex, position) => {
            const div = document.createElement('div');
            div.className = 'integrated-image-item selected';
            div.onclick = () => this.toggleImage(imageIndex);
            div.innerHTML = `
                <img src="${images[imageIndex]}" alt="選択${position + 1}">
                <div class="integrated-image-overlay">${position + 1}番目</div>
            `;
            selectedContainer.appendChild(div);
        });
        
        // 空きスロット
        for (let i = this.state.selectedImages.length; i < maxImages; i++) {
            const div = document.createElement('div');
            div.className = 'integrated-image-item';
            div.style.border = '2px dashed #ddd';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'center';
            div.style.color = '#999';
            div.style.fontSize = '0.8rem';
            div.innerHTML = `<div>${i + 1}</div>`;
            selectedContainer.appendChild(div);
        }
        
        document.getElementById('integrated-selected-image-count').textContent = this.state.selectedImages.length;
    },

    /**
     * ツールステータス更新
     */
    updateToolStatus() {
        const statusGrid = document.getElementById('integrated-tool-status-grid');
        
        const tools = [
            {
                name: 'データ取得',
                icon: 'fas fa-database',
                status: this.state.productData ? 'complete' : 'missing',
                value: this.state.productData ? '完了' : '未実行'
            },
            {
                name: '画像取得',
                icon: 'fas fa-images',
                status: this.state.productData?.images?.length > 0 ? 'complete' : 'missing',
                value: this.state.productData?.images?.length || 0
            },
            {
                name: 'カテゴリ判定',
                icon: 'fas fa-tags',
                status: this.state.toolResults.category ? 'complete' : 'missing',
                value: this.state.toolResults.category ? '判定済み' : '未実行'
            },
            {
                name: '利益計算',
                icon: 'fas fa-yen-sign',
                status: this.state.toolResults.profit ? 'complete' : 'missing',
                value: this.state.toolResults.profit ? '計算済み' : '未実行'
            }
        ];
        
        statusGrid.innerHTML = tools.map(tool => `
            <div class="integrated-status-card status-${tool.status}" style="background: white; border-radius: 8px; padding: 1rem; border-left: 4px solid var(--integrated-${tool.status === 'complete' ? 'success' : 'warning'});">
                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">
                    <i class="${tool.icon}"></i> ${tool.name}
                </h4>
                <div style="font-size: 1.2rem; font-weight: 600;">${tool.value}</div>
            </div>
        `).join('');
    },

    /**
     * ツール実行
     */
    runCategoryTool() {
        console.log('[IntegratedModal] Running category tool');
        addLogEntry('カテゴリ判定ツールを実行中...', 'info');
        
        // カテゴリツールURL（既存のツールを開く）
        const itemId = this.state.productData.item_id;
        const categoryToolUrl = `../11_category/frontend/ebay_category_tool.php?item_id=${encodeURIComponent(itemId)}`;
        window.open(categoryToolUrl, '_blank', 'width=1200,height=800');
    },

    runProfitTool() {
        console.log('[IntegratedModal] Running profit tool');
        addLogEntry('利益計算ツールは実装予定です', 'info');
    },

    /**
     * 文字数カウンター更新
     */
    updateCharCounter(textareaId, counterId) {
        const textarea = document.getElementById(textareaId);
        const counter = document.getElementById(counterId);
        
        if (textarea && counter) {
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

    /**
     * Best Offer設定表示切替
     */
    toggleOfferSettings() {
        const bestOffer = document.getElementById('ebay-best-offer').value;
        const minOfferContainer = document.getElementById('ebay-min-offer-container');
        const autoAcceptContainer = document.getElementById('ebay-auto-accept-container');
        
        if (bestOffer === 'enabled') {
            minOfferContainer.style.display = 'block';
            autoAcceptContainer.style.display = 'block';
        } else {
            minOfferContainer.style.display = 'none';
            autoAcceptContainer.style.display = 'none';
        }
    },

    /**
     * カテゴリツールを開く
     */
    openCategoryTool() {
        const itemId = this.state.productData.item_id;
        const categoryToolUrl = `../11_category/frontend/ebay_category_tool.php?item_id=${encodeURIComponent(itemId)}&source=integrated_modal`;
        window.open(categoryToolUrl, '_blank', 'width=1200,height=800,scrollbars=yes');
        addLogEntry(`カテゴリ判定ツールを開きました: ${itemId}`, 'info');
    },

    /**
     * 出品実行
     */
    submitListing() {
        console.log('[IntegratedModal] Submitting listing');
        
        const marketplace = this.marketplaces[this.state.currentMarketplace];
        const confirmMessage = `${marketplace.name}に出品します。よろしいですか？`;
        
        if (confirm(confirmMessage)) {
            addLogEntry(`${marketplace.name}への出品処理を開始...`, 'info');
            // 実際の出品処理は今後実装
            alert('出品機能は実装予定です');
        }
    },

    /**
     * エラー表示
     */
    showError(message) {
        const container = document.getElementById('integrated-source-content');
        container.innerHTML = `
            <div style="background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 6px; margin: 1rem; border: 1px solid #f5c6cb;">
                <i class="fas fa-exclamation-triangle"></i>
                ${message}
            </div>
        `;
    }
};

// ESCキーでモーダルを閉じる
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('integrated-modal');
        if (modal && modal.style.display === 'flex') {
            IntegratedModal.close();
        }
    }
});

// モーダル外クリックで閉じる
document.addEventListener('click', function(e) {
    const modal = document.getElementById('integrated-modal');
    if (e.target === modal) {
        IntegratedModal.close();
    }
});

console.log('✅ IntegratedModal controller loaded');
