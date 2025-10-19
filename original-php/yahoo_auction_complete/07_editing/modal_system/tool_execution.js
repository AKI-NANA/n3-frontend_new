/**
 * IntegratedListingModal - ツール実行機能
 * カテゴリ判定・送料計算・利益計算・フィルター判定・SellerMirror分析
 */

Object.assign(IntegratedListingModal, {
    
    /**
     * 🔴 送料計算ツール実行
     */
    async runShippingCalculator() {
        const product = this.state.productData;
        
        if (!product) {
            this.showNotification('商品データが読み込まれていません', 'error');
            return;
        }
        
        const manualData = product.manual_input_data || {};
        const weight = parseFloat(document.getElementById('manual-weight')?.value || manualData.weight || 0);
        const length = parseFloat(document.getElementById('manual-length')?.value || manualData.dimensions?.length || 0);
        const width = parseFloat(document.getElementById('manual-width')?.value || manualData.dimensions?.width || 0);
        const height = parseFloat(document.getElementById('manual-height')?.value || manualData.dimensions?.height || 0);
        
        if (!weight || weight <= 0) {
            this.showNotification('重量を入力してください', 'error');
            return;
        }
        
        if (!length || !width || !height) {
            this.showNotification('サイズ（長さ・幅・高さ）を入力してください', 'error');
            return;
        }
        
        this.showNotification('送料計算中...', 'info');
        
        try {
            const response = await fetch('../09_shipping/api/calculate_shipping.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'calculate_shipping',
                    weight: weight,
                    length: length,
                    width: width,
                    height: height,
                    destination: 'US'
                })
            });
            
            const text = await response.text();
            const result = JSON.parse(text);
            
            if (result.success) {
                this.state.toolResults.shipping = result.data;
                this.displayShippingResults(result.data);
                this.showNotification('送料計算完了', 'success');
                this.updateStepStatus('ilm-step4-status', '完了', 'complete');
            } else {
                this.showNotification('送料計算エラー: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('[ShippingCalculator] Error:', error);
            this.showNotification('送料計算エラー: ' + error.message, 'error');
        }
    },
    
    displayShippingResults(data) {
        const container = document.getElementById('shipping-results-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="ilm-results-card">
                <h4><i class="fas fa-shipping-fast"></i> 送料計算結果</h4>
                <div class="ilm-results-grid">
                    <div class="ilm-result-item">
                        <span class="label">推奨配送方法:</span>
                        <span class="value">${data.recommended_method || 'N/A'}</span>
                    </div>
                    <div class="ilm-result-item">
                        <span class="label">送料:</span>
                        <span class="value">$${data.shipping_cost || 0}</span>
                    </div>
                    <div class="ilm-result-item">
                        <span class="label">配送日数:</span>
                        <span class="value">${data.delivery_days || 'N/A'}日</span>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * 🔴 カテゴリ判定ツール実行
     */
    async runCategoryTool() {
        const product = this.state.productData;
        
        if (!product) {
            this.showNotification('商品データが読み込まれていません', 'error');
            return;
        }
        
        const title = document.getElementById('common-title')?.value || product.title;
        
        if (!title) {
            this.showNotification('商品タイトルが必要です', 'error');
            return;
        }
        
        this.showNotification('カテゴリ判定中...', 'info');
        
        try {
            const response = await fetch('../11_category/backend/api/detect_category.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'detect_single',
                    title: title,
                    price: product.current_price || 0,
                    description: product.description || ''
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const categoryData = result.result || result;
                this.state.toolResults.category = categoryData;
                
                const categoryIdField = document.getElementById('ebay-category-id');
                if (categoryIdField && categoryData.category_id) {
                    categoryIdField.value = categoryData.category_id;
                }
                
                this.displayCategoryResults(categoryData);
                this.showNotification('カテゴリ判定完了', 'success');
                this.updateStepStatus('ilm-step4-status', '完了', 'complete');
            } else {
                this.showNotification('カテゴリ判定エラー: ' + (result.error || result.message), 'error');
            }
        } catch (error) {
            console.error('[CategoryTool] Error:', error);
            this.showNotification('カテゴリ判定エラー: ' + error.message, 'error');
        }
    },
    
    displayCategoryResults(data) {
        const container = document.getElementById('category-results-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="ilm-results-card">
                <h4><i class="fas fa-tags"></i> カテゴリ判定結果</h4>
                <div class="ilm-results-grid">
                    <div class="ilm-result-item">
                        <span class="label">カテゴリID:</span>
                        <span class="value">${data.category_id || 'N/A'}</span>
                    </div>
                    <div class="ilm-result-item">
                        <span class="label">カテゴリ名:</span>
                        <span class="value">${data.category_name || 'N/A'}</span>
                    </div>
                    <div class="ilm-result-item">
                        <span class="label">信頼度:</span>
                        <span class="value">${data.confidence || 0}%</span>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * 🔴 利益計算ツール実行
     */
    async runProfitCalculator() {
        const product = this.state.productData;
        
        if (!product) {
            this.showNotification('商品データが読み込まれていません', 'error');
            return;
        }
        
        const costJpy = parseFloat(document.getElementById('manual-cost')?.value || product.manual_input_data?.cost || product.current_price || 0);
        const priceUsd = parseFloat(document.getElementById('ebay-price')?.value || 0);
        const shippingCost = this.state.toolResults.shipping?.shipping_cost || 0;
        
        if (!costJpy || !priceUsd) {
            this.showNotification('仕入れコストと販売価格を入力してください', 'error');
            return;
        }
        
        this.showNotification('利益計算中...', 'info');
        
        try {
            const response = await fetch('../05_rieki/profit_calculator_complete_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'ebay_calculate',
                    purchasePrice: costJpy,
                    sellPrice: priceUsd,
                    shipping: shippingCost,
                    category: 'electronics',
                    condition: 'used'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const profitData = result.data || result;
                this.state.toolResults.profit = profitData;
                this.displayProfitResults(profitData);
                this.showNotification('利益計算完了', 'success');
                this.updateStepStatus('ilm-step4-status', '完了', 'complete');
            } else {
                this.showNotification('利益計算エラー: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('[ProfitCalculator] Error:', error);
            this.showNotification('利益計算エラー: ' + error.message, 'error');
        }
    },
    
    displayProfitResults(data) {
        const container = document.getElementById('profit-results-container');
        if (!container) return;
        
        const profitJPY = data.profitJPY || 0;
        const marginPercent = data.marginPercent || 0;
        const roiPercent = data.roiPercent || 0;
        const profitColor = profitJPY >= 0 ? '#28a745' : '#dc3545';
        
        container.innerHTML = `
            <div class="ilm-results-card">
                <h4><i class="fas fa-calculator"></i> 利益計算結果</h4>
                <div class="ilm-results-grid">
                    <div class="ilm-result-item">
                        <span class="label">純利益:</span>
                        <span class="value" style="color: ${profitColor}; font-weight: bold;">
                            ¥${Math.round(profitJPY).toLocaleString()}
                        </span>
                    </div>
                    <div class="ilm-result-item">
                        <span class="label">利益率:</span>
                        <span class="value">${marginPercent}%</span>
                    </div>
                    <div class="ilm-result-item">
                        <span class="label">ROI:</span>
                        <span class="value">${roiPercent}%</span>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * 🔴 フィルターツール実行
     */
    async runFilterTool() {
        const product = this.state.productData;
        
        if (!product) {
            this.showNotification('商品データが読み込まれていません', 'error');
            return;
        }
        
        this.showNotification('フィルター判定中...', 'info');
        
        try {
            const response = await fetch('../07_filters/api/check_filters.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: product.title,
                    description: product.description,
                    category: product.category,
                    price: product.current_price
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.state.toolResults.filter = result.data;
                this.displayFilterResults(result.data);
                this.showNotification('フィルター判定完了', 'success');
            } else {
                this.showNotification('フィルター判定エラー: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('[FilterTool] Error:', error);
            this.showNotification('フィルター判定エラー: ' + error.message, 'error');
        }
    },
    
    displayFilterResults(data) {
        const container = document.getElementById('filter-results-container');
        if (!container) return;
        
        const statusColor = data.passed ? '#28a745' : '#dc3545';
        const statusText = data.passed ? '承認' : '却下';
        
        container.innerHTML = `
            <div class="ilm-results-card">
                <h4><i class="fas fa-filter"></i> フィルター判定結果</h4>
                <div class="ilm-results-grid">
                    <div class="ilm-result-item">
                        <span class="label">判定:</span>
                        <span class="value" style="color: ${statusColor}; font-weight: bold;">
                            ${statusText}
                        </span>
                    </div>
                    <div class="ilm-result-item">
                        <span class="label">スコア:</span>
                        <span class="value">${data.score || 0}/100</span>
                    </div>
                    ${data.blocked_keywords?.length > 0 ? `
                    <div class="ilm-result-item">
                        <span class="label">NGキーワード:</span>
                        <span class="value">${data.blocked_keywords.join(', ')}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    /**
     * 🔴 SellerMirror競合分析ツール実行（修正版）
     */
    async runSellerMirrorTool() {
        const product = this.state.productData;
        
        if (!product) {
            this.showNotification('商品データが読み込まれていません', 'error');
            return;
        }
        
        // db_idを優先的に使用
        const productId = product.db_id || product.id;
        
        if (!productId) {
            this.showNotification('商品IDが取得できません', 'error');
            return;
        }
        
        this.showNotification('SellerMirror競合分析中...', 'info');
        
        try {
            const response = await fetch('../11_category/backend/api/sell_mirror_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'test_single_search',
                    product_id: productId
                })
            });
            
            const text = await response.text();
            console.log('[SellerMirror] Raw response:', text);
            
            const result = JSON.parse(text);
            console.log('[SellerMirror] Result:', result);
            
            if (result.success) {
                const mirrorData = result.mirror_result || result;
                this.state.toolResults.sellermirror = mirrorData;
                this.displaySellerMirrorResults(mirrorData);
                this.showNotification('SellerMirror分析完了', 'success');
            } else {
                this.showNotification('SellerMirror分析エラー: ' + (result.error || result.message), 'error');
            }
        } catch (error) {
            console.error('[SellerMirror] Error:', error);
            this.showNotification('SellerMirror分析エラー: ' + error.message, 'error');
        }
    },
    
    /**
     * 🔴 SellerMirror結果表示
     */
    displaySellerMirrorResults(data) {
        const container = document.getElementById('sellermirror-results-container');
        if (!container) return;
        
        const competitorCount = data.competitor_count || 0;
        const priceDiff = data.price_difference_percent || 0;
        const competitorColor = competitorCount > 30 ? '#dc3545' : competitorCount > 15 ? '#f59e0b' : '#28a745';
        const priceDiffColor = priceDiff > 0 ? '#28a745' : '#dc3545';
        
        container.innerHTML = `
            <div class="ilm-results-card">
                <h4><i class="fas fa-search-dollar"></i> SellerMirror競合分析</h4>
                <div class="ilm-results-grid">
                    <div class="ilm-result-item">
                        <span class="label">競合商品数:</span>
                        <span class="value" style="color: ${competitorColor}; font-weight: bold;">
                            ${competitorCount}件
                        </span>
                    </div>
                    <div class="ilm-result-item">
                        <span class="label">価格差:</span>
                        <span class="value" style="color: ${priceDiffColor};">
                            ${priceDiff > 0 ? '+' : ''}${priceDiff}%
                        </span>
                    </div>
                    <div class="ilm-result-item">
                        <span class="label">市場競争度:</span>
                        <span class="value">
                            ${competitorCount > 30 ? '高' : competitorCount > 15 ? '中' : '低'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * 🔴 すべてのツールを一括実行
     */
    async runAllTools() {
        this.showNotification('すべてのツールを実行中...', 'info');
        
        // 順番に実行
        await this.runCategoryTool();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await this.runShippingCalculator();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await this.runProfitCalculator();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await this.runFilterTool();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await this.runSellerMirrorTool();
        
        this.showNotification('すべてのツール実行完了', 'success');
    }
});

console.log('✅ IntegratedListingModal - Tool Execution Functions loaded (with SellerMirror fix)');
