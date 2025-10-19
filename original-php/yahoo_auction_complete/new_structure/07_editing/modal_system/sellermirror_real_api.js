/**
 * SellerMirror実装 - 実際のeBay API連携版
 * 英語タイトル・カテゴリーIDから競合分析を実行
 */

Object.assign(IntegratedListingModal, {
    
    /**
     * 🔴 SellerMirror実行（実際のAPI連携版）
     */
    async runSellerMirrorTool() {
        const product = this.state.productData;
        
        if (!product) {
            this.showNotification('商品データが読み込まれていません', 'error');
            return;
        }
        
        const productId = product.db_id || product.id;
        const ebayTitle = document.getElementById('ebay-title')?.value;
        const ebayCategory = document.getElementById('ebay-category-id')?.value;
        
        if (!ebayTitle) {
            this.showNotification('eBayタイトルが必要です。先にカテゴリ判定を実行してください', 'warning');
            return;
        }
        
        this.showNotification('SellerMirror分析中...', 'info');
        
        console.log('[SellerMirror] Starting analysis...');
        console.log('[SellerMirror] Product ID:', productId);
        console.log('[SellerMirror] eBay Title:', ebayTitle);
        console.log('[SellerMirror] eBay Category:', ebayCategory);
        
        try {
            const response = await fetch('../11_category/backend/api/sell_mirror_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'analyze_product',
                    product_id: productId,
                    ebay_title: ebayTitle,
                    ebay_category_id: ebayCategory,
                    yahoo_price: product.current_price || 0
                })
            });
            
            const text = await response.text();
            console.log('[SellerMirror] Raw response:', text);
            
            const result = JSON.parse(text);
            console.log('[SellerMirror] Result:', result);
            
            if (result.success) {
                const mirrorData = result.analysis_result || result;
                this.state.toolResults.sellermirror = mirrorData;
                this.displaySellerMirrorResults(mirrorData);
                this.showNotification('✅ SellerMirror分析完了', 'success');
                this.updateStepStatus('ilm-step4-status', '完了', 'complete');
            } else {
                throw new Error(result.error || result.message || 'Analysis failed');
            }
        } catch (error) {
            console.error('[SellerMirror] Error:', error);
            this.showNotification('SellerMirror分析エラー: ' + error.message, 'error');
        }
    }
});

console.log('✅ SellerMirror Real API Implementation loaded');
