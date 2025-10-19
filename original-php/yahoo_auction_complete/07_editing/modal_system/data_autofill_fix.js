/**
 * データ自動入力修正パッチ
 * Yahooスクレイピングデータから仕入れコストと商品説明を正しく取得
 */

Object.assign(IntegratedListingModal, {
    
    /**
     * 🔴 商品データ表示（修正版 - Yahoo価格を仕入れコストに自動設定）
     */
    loadProductData() {
        const product = this.state.productData;
        const source = this.state.currentSource;
        
        console.log('[IntegratedListingModal] 🔴 loadProductData() START (FIXED)');
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
        
        // 🔴 Yahoo価格を取得（スクレイピングデータから）
        const yahooPrice = product.current_price || product.price_jpy || 0;
        
        // 🔴 商品説明を取得（複数のフィールドから優先順位で取得）
        const description = product.description || 
                           product.active_description || 
                           (product.scraped_yahoo_data?.description) || 
                           '';
        
        console.log('[IntegratedListingModal] Yahoo price (仕入れコスト):', yahooPrice);
        console.log('[IntegratedListingModal] Description:', description ? description.substring(0, 100) + '...' : 'なし');
        
        // 共通フィールド設定
        const fields = {
            'common-product-id': product.item_id || product.id || '',
            'common-db-id': product.db_id || product.id || '',
            'common-title': product.title || '',
            'common-price': yahooPrice, // 🔴 Yahoo価格（仕入れコスト）
            'common-condition': product.condition || '',
            'common-description': description, // 🔴 商品説明
            'generated-sku': this.generateSKU(),
            'manual-cost': yahooPrice // 🔴 手動入力欄のデフォルト値も設定
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
    }
});

console.log('✅ Data Auto-Fill Fix Patch loaded');
