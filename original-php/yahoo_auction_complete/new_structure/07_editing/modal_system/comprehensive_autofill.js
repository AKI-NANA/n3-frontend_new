/**
 * 統合データ自動入力システム - 完全版
 * 全てのフィールドに自動的にデータを入力
 */

(function() {
    console.log('🔥 Comprehensive Auto-Fill System Loading...');
    
    // IntegratedListingModalが読み込まれるまで待機
    const waitForModal = setInterval(() => {
        if (typeof IntegratedListingModal !== 'undefined' && IntegratedListingModal.state) {
            clearInterval(waitForModal);
            initAutoFill();
        }
    }, 100);
    
    function initAutoFill() {
        console.log('✅ IntegratedListingModal detected, initializing auto-fill...');
        
        // 元のopen関数を拡張
        const originalOpen = IntegratedListingModal.open;
        IntegratedListingModal.open = async function(itemId) {
            await originalOpen.call(this, itemId);
            
            // データ読み込み完了後に自動入力を実行
            setTimeout(() => {
                autoFillAllFields();
            }, 500);
        };
        
        console.log('✅ Auto-fill system initialized');
    }
    
    function autoFillAllFields() {
        const product = IntegratedListingModal.state.productData;
        
        if (!product) {
            console.error('[AutoFill] No product data available');
            return;
        }
        
        console.log('[AutoFill] Starting comprehensive auto-fill for:', product.title);
        
        // 1. 基本データ自動入力
        autoFillBasicData(product);
        
        // 2. 手動入力データ自動設定
        autoFillManualInputs(product);
        
        // 3. eBay出品情報自動生成
        autoFillEbayListing(product);
        
        // 4. 配送情報自動設定
        autoFillShippingData(product);
        
        console.log('[AutoFill] ✅ Comprehensive auto-fill completed');
    }
    
    /**
     * 基本データ自動入力
     */
    function autoFillBasicData(product) {
        const yahooPrice = product.current_price || product.price_jpy || 0;
        const description = product.description || product.active_description || '';
        
        const fields = {
            'common-product-id': product.item_id || '',
            'common-db-id': product.db_id || product.id || '',
            'common-title': product.title || '',
            'common-price': yahooPrice,
            'common-condition': product.condition || '',
            'common-description': description,
            'generated-sku': generateSKU(product)
        };
        
        setFormFields(fields);
        console.log('[AutoFill] ✅ Basic data filled');
    }
    
    /**
     * 手動入力データ自動設定
     */
    function autoFillManualInputs(product) {
        const yahooPrice = product.current_price || product.price_jpy || 0;
        
        const fields = {
            'manual-cost': yahooPrice,  // 🔴 仕入れコスト
            'manual-weight': product.manual_input_data?.weight || '',
            'manual-length': product.manual_input_data?.dimensions?.length || '',
            'manual-width': product.manual_input_data?.dimensions?.width || '',
            'manual-height': product.manual_input_data?.dimensions?.height || ''
        };
        
        setFormFields(fields);
        console.log('[AutoFill] ✅ Manual inputs filled, cost:', yahooPrice);
    }
    
    /**
     * eBay出品情報自動生成
     */
    function autoFillEbayListing(product) {
        const yahooPrice = product.current_price || product.price_jpy || 0;
        const exchangeRate = 150;  // USD/JPY
        const markup = 1.3;  // 30%マークアップ
        const priceUsd = Math.round((yahooPrice / exchangeRate) * markup * 100) / 100;
        
        // タイトルを英語風に変換（簡易版）
        let ebayTitle = product.title || '';
        ebayTitle = ebayTitle.substring(0, 80);  // 80文字制限
        
        const fields = {
            'ebay-title': ebayTitle,
            'ebay-subtitle': '',
            'ebay-price': priceUsd,  // 🔴 自動計算価格
            'ebay-quantity': '1',
            'ebay-condition': '3000',  // Used
            'ebay-duration': 'GTC',
            'ebay-format': 'FixedPriceItem',
            'ebay-category-id': product.ebay_category_id || ''
        };
        
        setFormFields(fields);
        console.log('[AutoFill] ✅ eBay listing filled, price:', priceUsd, 'USD');
    }
    
    /**
     * 配送情報自動設定
     */
    function autoFillShippingData(product) {
        const fields = {
            'ebay-handling-time': '3',
            'ebay-package-type': 'PackageThickEnvelope'
        };
        
        setFormFields(fields);
        console.log('[AutoFill] ✅ Shipping data filled');
    }
    
    /**
     * フォームフィールドに値を設定
     */
    function setFormFields(fields) {
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
                console.log(`[AutoFill] Set ${id} = ${value}`);
            } else {
                console.warn(`[AutoFill] Element not found: ${id}`);
            }
        });
    }
    
    /**
     * SKU生成
     */
    function generateSKU(product) {
        const timestamp = Date.now().toString().slice(-8);
        const itemId = (product.item_id || product.id || '').toString().slice(-6);
        return `YA-${itemId}-${timestamp}`;
    }
    
    console.log('✅ Comprehensive Auto-Fill System Loaded');
})();
