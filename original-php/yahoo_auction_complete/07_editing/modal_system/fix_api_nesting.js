/**
 * 🔴 緊急修正: APIレスポンスの二重ネスト対応（完全版）
 * integrated_modal_full.jsの`open()`関数を上書き
 */

(function() {
    console.log('🔴 [API Nesting Fix] Loading...');
    
    // IntegratedListingModalが存在することを確認
    if (typeof IntegratedListingModal === 'undefined') {
        console.error('❌ [API Nesting Fix] IntegratedListingModal not found!');
        return;
    }
    
    // 修正版open()関数（bindを使用してthisコンテキストを保持）
    IntegratedListingModal.open = async function(itemId) {
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
                // パターン1: result.data.data が存在する場合（二重ネスト）
                // パターン2: result.data が直接商品データの場合
                let productData = result.data.data || result.data;
                
                // 🔴 重要: すべてのフィールドを確実に保持
                // もし result.data に manual_input_data があれば、それを使う
                if (result.data.manual_input_data && !productData.manual_input_data) {
                    productData.manual_input_data = result.data.manual_input_data;
                }
                if (result.data.ebay_listing_data && !productData.ebay_listing_data) {
                    productData.ebay_listing_data = result.data.ebay_listing_data;
                }
                if (result.data.selected_images && !productData.selected_images) {
                    productData.selected_images = result.data.selected_images;
                }
                if (result.data.shipping_data && !productData.shipping_data) {
                    productData.shipping_data = result.data.shipping_data;
                }
                if (result.data.html_description && !productData.html_description) {
                    productData.html_description = result.data.html_description;
                }
                
                console.log('[IntegratedListingModal] ✅ Extracted product data:', productData);
                console.log('[IntegratedListingModal] 🔴 manual_input_data:', productData.manual_input_data);
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
    };
    
    console.log('✅ [API Nesting Fix] IntegratedListingModal.open() patched (Full Version)');
})();
