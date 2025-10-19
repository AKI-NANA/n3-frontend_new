/**
 * IntegratedListingModal - デバッグ機能
 * データベース保存・読み込み状態の確認
 */

Object.assign(IntegratedListingModal, {
    
    /**
     * 🔴 保存データの確認（デバッグ用）
     */
    async debugSavedData() {
        const itemId = this.state.productData.item_id || this.state.productData.id;
        
        console.log('🔍 [DEBUG] Checking saved data for item:', itemId);
        
        try {
            const response = await fetch(`api/check_saved_data.php?item_id=${itemId}`);
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ [DEBUG] Data found in database');
                console.log('📊 [DEBUG] Full record:', result.data);
                console.log('🔴 [DEBUG] manual_input_data (raw):', result.data.manual_input_data);
                console.log('🔴 [DEBUG] manual_input_data (decoded):', result.data.manual_input_data_decoded);
                console.log('🔴 [DEBUG] selected_images (raw):', result.data.selected_images);
                console.log('🔴 [DEBUG] selected_images (decoded):', result.data.selected_images_decoded);
                
                // UIの状態確認
                console.log('🔴 [DEBUG] UI Field values:');
                console.log('  - manual-weight:', document.getElementById('manual-weight')?.value);
                console.log('  - manual-cost:', document.getElementById('manual-cost')?.value);
                console.log('  - manual-length:', document.getElementById('manual-length')?.value);
                console.log('  - manual-width:', document.getElementById('manual-width')?.value);
                console.log('  - manual-height:', document.getElementById('manual-height')?.value);
                
                // productData の状態確認
                console.log('🔴 [DEBUG] this.state.productData.manual_input_data:', this.state.productData.manual_input_data);
                
                return result.data;
            } else {
                console.error('❌ [DEBUG] Error:', result.error);
                return null;
            }
        } catch (error) {
            console.error('❌ [DEBUG] Fetch error:', error);
            return null;
        }
    },
    
    /**
     * 🔴 loadProductData()のデバッグ版
     */
    async debugLoadProductData() {
        console.log('🔍 [DEBUG] === loadProductData() Debug Start ===');
        
        const product = this.state.productData;
        console.log('🔴 [DEBUG] product object:', product);
        console.log('🔴 [DEBUG] product.manual_input_data:', product.manual_input_data);
        console.log('🔴 [DEBUG] typeof manual_input_data:', typeof product.manual_input_data);
        
        if (product.manual_input_data) {
            try {
                let manualData;
                if (typeof product.manual_input_data === 'string') {
                    console.log('🔴 [DEBUG] Parsing string:', product.manual_input_data);
                    manualData = JSON.parse(product.manual_input_data);
                } else {
                    console.log('🔴 [DEBUG] Already object:', product.manual_input_data);
                    manualData = product.manual_input_data;
                }
                
                console.log('🔴 [DEBUG] Parsed manualData:', manualData);
                console.log('🔴 [DEBUG] manualData.weight:', manualData.weight);
                console.log('🔴 [DEBUG] manualData.cost:', manualData.cost);
                console.log('🔴 [DEBUG] manualData.dimensions:', manualData.dimensions);
                
                // フィールドに設定を試行
                const weightEl = document.getElementById('manual-weight');
                const costEl = document.getElementById('manual-cost');
                const lengthEl = document.getElementById('manual-length');
                
                console.log('🔴 [DEBUG] manual-weight element:', weightEl);
                console.log('🔴 [DEBUG] manual-cost element:', costEl);
                console.log('🔴 [DEBUG] manual-length element:', lengthEl);
                
                if (weightEl) {
                    weightEl.value = manualData.weight || '';
                    console.log('✅ [DEBUG] Set manual-weight to:', weightEl.value);
                }
                
                if (costEl) {
                    costEl.value = manualData.cost || '';
                    console.log('✅ [DEBUG] Set manual-cost to:', costEl.value);
                }
                
                if (lengthEl) {
                    lengthEl.value = manualData.dimensions?.length || '';
                    console.log('✅ [DEBUG] Set manual-length to:', lengthEl.value);
                }
                
            } catch (e) {
                console.error('❌ [DEBUG] Parse error:', e);
            }
        } else {
            console.log('⚠️ [DEBUG] No manual_input_data found in product');
        }
        
        console.log('🔍 [DEBUG] === loadProductData() Debug End ===');
    },
    
    /**
     * 🔴 open()時のデータ取得をデバッグ
     */
    async debugOpen(itemId) {
        console.log('🔍 [DEBUG] === Modal Open Debug ===');
        console.log('🔴 [DEBUG] Opening modal for item:', itemId);
        
        try {
            const response = await fetch(`?action=get_product_details&item_id=${encodeURIComponent(itemId)}`);
            const result = await response.json();
            
            console.log('🔴 [DEBUG] API Response:', result);
            
            if (result.success && result.data) {
                const productData = result.data;
                console.log('🔴 [DEBUG] Product data:', productData);
                console.log('🔴 [DEBUG] manual_input_data in response:', productData.manual_input_data);
                console.log('🔴 [DEBUG] typeof:', typeof productData.manual_input_data);
                
                this.state.productData = productData;
                
                // loadProductData()を実行
                await this.loadAllData();
                
                // データが復元されたか確認
                console.log('🔴 [DEBUG] After loadAllData():');
                console.log('  - manual-weight:', document.getElementById('manual-weight')?.value);
                console.log('  - manual-cost:', document.getElementById('manual-cost')?.value);
                
            } else {
                console.error('❌ [DEBUG] API Error:', result.message);
            }
        } catch (error) {
            console.error('❌ [DEBUG] Fetch error:', error);
        }
        
        console.log('🔍 [DEBUG] === Modal Open Debug End ===');
    }
});

console.log('✅ IntegratedListingModal - Debug Functions loaded');
