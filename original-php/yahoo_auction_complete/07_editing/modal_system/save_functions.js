/**
 * IntegratedListingModal - 保存機能実装
 * データベース保存・読み込み機能の完全実装
 */

// IntegratedListingModalへの保存機能追加
Object.assign(IntegratedListingModal, {
    
    /**
     * 🔴 データ確認タブの保存
     * 基本情報 + 手動入力データ（重量・サイズ）を保存
     */
    async saveDataTab() {
        const itemId = this.state.productData.item_id || this.state.productData.id;
        
        const data = {
            // 基本情報
            title: document.getElementById('common-title')?.value || '',
            price: document.getElementById('common-price')?.value || 0,
            description: document.getElementById('common-description')?.value || '',
            condition: document.getElementById('common-condition')?.value || '',
            sku: document.getElementById('generated-sku')?.value || '',
            
            // 🔴 手動入力データ（重量・サイズ）
            manual_weight: document.getElementById('manual-weight')?.value || '',
            manual_cost: document.getElementById('manual-cost')?.value || '',
            manual_length: document.getElementById('manual-length')?.value || '',
            manual_width: document.getElementById('manual-width')?.value || '',
            manual_height: document.getElementById('manual-height')?.value || ''
        };
        
        console.log('🔴 [DEBUG] saveDataTab:', data);
        
        const result = await this.saveToDatabase(itemId, 'data', data);
        
        if (result.success) {
            this.showNotification('データを保存しました', 'success');
            this.updateStepStatus('ilm-step2-status', '保存完了', 'complete');
        } else {
            this.showNotification('保存エラー: ' + result.message, 'error');
        }
        
        return result;
    },

    /**
     * 🔴 画像選択タブの保存
     * 選択された画像のURLを配列で保存（インデックスではなくURL）
     */
    async saveImagesTab() {
        const itemId = this.state.productData.item_id || this.state.productData.id;
        const images = this.state.productData.images || [];
        
        // 🔴 重要: インデックスではなくURLの配列を保存
        const selectedImageUrls = this.state.selectedImages.map(index => images[index]);
        
        const data = {
            selected_images: selectedImageUrls
        };
        
        console.log('🔴 [DEBUG] saveImagesTab:', data);
        console.log('🔴 [DEBUG] Selected image URLs:', selectedImageUrls);
        
        const result = await this.saveToDatabase(itemId, 'images', data);
        
        if (result.success) {
            this.showNotification(`${selectedImageUrls.length}枚の画像を保存しました`, 'success');
            this.updateStepStatus('ilm-step3-status', '保存完了', 'complete');
        } else {
            this.showNotification('画像保存エラー: ' + result.message, 'error');
        }
        
        return result;
    },

    /**
     * 🔴 出品情報タブの保存
     * マーケットプレイス別の出品データを保存
     */
    async saveListingTab() {
        const itemId = this.state.productData.item_id || this.state.productData.id;
        const marketplace = this.state.currentMarketplace;
        
        let data = {
            marketplace: marketplace
        };
        
        // マーケットプレイス別データ取得
        if (marketplace === 'ebay') {
            data = {
                ...data,
                ebay_category_id: document.getElementById('ebay-category-id')?.value || '',
                ebay_title: document.getElementById('ebay-title')?.value || '',
                ebay_subtitle: document.getElementById('ebay-subtitle')?.value || '',
                price_usd: document.getElementById('ebay-price')?.value || 0,
                quantity: document.getElementById('ebay-quantity')?.value || 1,
                condition_id: document.getElementById('ebay-condition-id')?.value || '',
                duration: document.getElementById('ebay-duration')?.value || 'GTC',
                listing_format: document.getElementById('ebay-format')?.value || 'FixedPriceItem',
                best_offer: document.getElementById('ebay-best-offer')?.value === 'enabled',
                auto_accept_price: document.getElementById('auto-accept-price')?.value || null,
                auto_decline_price: document.getElementById('auto-decline-price')?.value || null,
                item_specifics: this.getEbayItemSpecifics()
            };
        } else if (marketplace === 'shopee') {
            data = {
                ...data,
                shopee_category_id: document.getElementById('shopee-category')?.value || '',
                shopee_title: document.getElementById('shopee-title')?.value || '',
                price: document.getElementById('shopee-price')?.value || 0,
                stock: document.getElementById('shopee-stock')?.value || 1
            };
        } else if (marketplace === 'amazon-jp') {
            data = {
                ...data,
                amazon_category: document.getElementById('amazon-jp-category')?.value || '',
                amazon_title: document.getElementById('amazon-jp-title')?.value || '',
                price: document.getElementById('amazon-jp-price')?.value || 0,
                condition: document.getElementById('amazon-jp-condition')?.value || ''
            };
        }
        // 他のマーケットプレイスも同様に実装
        
        console.log('🔴 [DEBUG] saveListingTab:', data);
        
        const result = await this.saveToDatabase(itemId, 'listing', data);
        
        if (result.success) {
            this.showNotification('出品情報を保存しました', 'success');
            this.updateStepStatus('ilm-step5-status', '保存完了', 'complete');
        } else {
            this.showNotification('出品情報保存エラー: ' + result.message, 'error');
        }
        
        return result;
    },

    /**
     * 🔴 配送設定タブの保存
     * マーケットプレイス別の配送データを保存
     */
    async saveShippingTab() {
        const itemId = this.state.productData.item_id || this.state.productData.id;
        const marketplace = this.state.currentMarketplace;
        
        let data = {
            marketplace: marketplace
        };
        
        if (marketplace === 'ebay') {
            data = {
                ...data,
                shipping_policy_id: document.getElementById('ebay-shipping-policy')?.value || '',
                handling_time: document.getElementById('ebay-handling-time')?.value || '3',
                package_type: document.getElementById('ebay-package-type')?.value || '',
                weight_major: document.getElementById('weight-lbs')?.value || '0',
                weight_minor: document.getElementById('weight-oz')?.value || '0',
                dimensions_length: document.getElementById('length-inches')?.value || '',
                dimensions_width: document.getElementById('width-inches')?.value || '',
                dimensions_height: document.getElementById('height-inches')?.value || '',
                international_shipping: document.getElementById('intl-shipping')?.checked || false
            };
        } else if (marketplace === 'shopee') {
            data = {
                ...data,
                shipping_method: document.getElementById('shopee-shipping')?.value || '',
                weight_kg: document.getElementById('shopee-weight')?.value || '0'
            };
        } else if (marketplace === 'amazon-jp') {
            data = {
                ...data,
                shipping_template: document.getElementById('amazon-jp-shipping')?.value || '',
                weight_g: document.getElementById('amazon-jp-weight')?.value || '0'
            };
        }
        
        console.log('🔴 [DEBUG] saveShippingTab:', data);
        
        const result = await this.saveToDatabase(itemId, 'shipping', data);
        
        if (result.success) {
            this.showNotification('配送設定を保存しました', 'success');
            this.updateStepStatus('ilm-step6-status', '保存完了', 'complete');
        } else {
            this.showNotification('配送設定保存エラー: ' + result.message, 'error');
        }
        
        return result;
    },

    /**
     * 🔴 HTMLタブの保存
     * マーケットプレイス別のHTML説明文を保存
     */
    async saveHtmlTab() {
        const itemId = this.state.productData.item_id || this.state.productData.id;
        const marketplace = this.state.currentMarketplace;
        
        let htmlContent = '';
        
        if (marketplace === 'ebay') {
            htmlContent = document.getElementById('html-editor')?.value || '';
        } else if (marketplace === 'amazon-jp') {
            htmlContent = document.getElementById('amazon-jp-html-editor')?.value || '';
        } else if (marketplace === 'shopify') {
            htmlContent = document.getElementById('shopify-html-editor')?.value || '';
        }
        
        const data = {
            marketplace: marketplace,
            html_description: htmlContent
        };
        
        console.log('🔴 [DEBUG] saveHtmlTab:', data);
        
        const result = await this.saveToDatabase(itemId, 'html', data);
        
        if (result.success) {
            this.showNotification('HTML説明文を保存しました', 'success');
            this.updateStepStatus('ilm-step7-status', '保存完了', 'complete');
        } else {
            this.showNotification('HTML保存エラー: ' + result.message, 'error');
        }
        
        return result;
    },

    /**
     * 🔴 データベースへの共通保存処理
     * PHPバックエンドへAjax送信
     */
    async saveToDatabase(itemId, tab, data) {
        try {
            const payload = {
                action: 'save_product_data',
                item_id: itemId,
                tab: tab,
                data: data
            };
            
            console.log('🔴 [DEBUG] saveToDatabase payload:', payload);
            
            const response = await fetch('api/save_product.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const responseText = await response.text();
            console.log('🔴 [DEBUG] Response text:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('🔴 [ERROR] JSON parse failed:', parseError);
                console.error('🔴 [ERROR] Response was:', responseText);
                throw new Error('サーバーレスポンスが不正です');
            }
            
            return result;
            
        } catch (error) {
            console.error('🔴 [ERROR] saveToDatabase:', error);
            return {
                success: false,
                message: error.message
            };
        }
    },

    /**
     * 🔴 eBay Item Specifics取得
     */
    getEbayItemSpecifics() {
        const specifics = {};
        const specificInputs = document.querySelectorAll('[data-specific-name]');
        
        specificInputs.forEach(input => {
            const name = input.getAttribute('data-specific-name');
            const value = input.value;
            if (name && value) {
                specifics[name] = value;
            }
        });
        
        return specifics;
    },

    /**
     * 🔴 保存データの読み込み（モーダル表示時に実行）
     * データベースから保存済みデータを取得して各フィールドに復元
     */
    async loadProductData() {
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
        }
        
        if (sourceNameElement) {
            sourceNameElement.textContent = sourceConfig.name;
        }
        
        // 共通フィールド設定
        const fields = {
            'common-product-id': product.item_id || product.id || '',
            'common-db-id': product.db_id || product.id || '',
            'common-title': product.active_title || product.title || '',
            'common-price': product.price_jpy || product.current_price || 0,
            'common-condition': product.condition || '',
            'common-description': product.active_description || product.description || '',
            'generated-sku': product.sku || this.generateSKU()
        };
        
        // 🔴 手動入力データの復元
        if (product.manual_input_data) {
            try {
                const manualData = typeof product.manual_input_data === 'string' 
                    ? JSON.parse(product.manual_input_data) 
                    : product.manual_input_data;
                
                fields['manual-weight'] = manualData.weight || '';
                fields['manual-cost'] = manualData.cost || '';
                fields['manual-length'] = manualData.dimensions?.length || '';
                fields['manual-width'] = manualData.dimensions?.width || '';
                fields['manual-height'] = manualData.dimensions?.height || '';
            } catch (e) {
                console.error('[IntegratedListingModal] 手動入力データのパースエラー:', e);
            }
        }
        
        // 🔴 選択画像の復元
        if (product.selected_images) {
            try {
                const selectedImagesData = typeof product.selected_images === 'string' 
                    ? JSON.parse(product.selected_images) 
                    : product.selected_images;
                
                if (Array.isArray(selectedImagesData) && selectedImagesData.length > 0) {
                    // URLの配列の場合、画像インデックスを逆引き
                    const images = product.images || [];
                    this.state.selectedImages = selectedImagesData
                        .map(url => images.indexOf(url))
                        .filter(index => index !== -1);
                    
                    console.log('[IntegratedListingModal] 選択画像復元:', this.state.selectedImages);
                }
            } catch (e) {
                console.error('[IntegratedListingModal] 選択画像データのパースエラー:', e);
            }
        }
        
        // 🔴 出品情報の復元
        if (product.ebay_listing_data) {
            try {
                const listingData = typeof product.ebay_listing_data === 'string' 
                    ? JSON.parse(product.ebay_listing_data) 
                    : product.ebay_listing_data;
                
                Object.assign(fields, {
                    'ebay-category-id': listingData.ebay_category_id || product.ebay_category_id || '',
                    'ebay-title': listingData.ebay_title || '',
                    'ebay-price': listingData.price_usd || ''
                });
            } catch (e) {
                console.error('[IntegratedListingModal] 出品情報データのパースエラー:', e);
            }
        }
        
        // 🔴 配送設定の復元
        if (product.shipping_data) {
            try {
                const shippingData = typeof product.shipping_data === 'string' 
                    ? JSON.parse(product.shipping_data) 
                    : product.shipping_data;
                
                Object.assign(fields, {
                    'ebay-shipping-policy': shippingData.shipping_policy_id || '',
                    'ebay-handling-time': shippingData.handling_time || '3'
                });
            } catch (e) {
                console.error('[IntegratedListingModal] 配送設定データのパースエラー:', e);
            }
        }
        
        // 🔴 HTML説明文の復元
        if (product.html_description) {
            setTimeout(() => {
                const htmlEditor = document.getElementById('html-editor');
                if (htmlEditor) {
                    htmlEditor.value = product.html_description;
                    this.updateHtmlPreview();
                }
            }, 500);
        }
        
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
     * 🔴 通知表示
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `ilm-notification ilm-notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            z-index: 100000;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    /**
     * 🔴 すべてのタブを保存（一括保存）
     */
    async saveAllTabs() {
        const results = {
            data: await this.saveDataTab(),
            images: await this.saveImagesTab(),
            listing: await this.saveListingTab(),
            shipping: await this.saveShippingTab(),
            html: await this.saveHtmlTab()
        };
        
        const allSuccess = Object.values(results).every(r => r.success);
        
        if (allSuccess) {
            this.showNotification('すべてのデータを保存しました', 'success');
            this.updateStepStatus('ilm-step8-status', '保存完了', 'complete');
        } else {
            const failedTabs = Object.entries(results)
                .filter(([_, r]) => !r.success)
                .map(([tab, _]) => tab)
                .join(', ');
            this.showNotification(`保存失敗: ${failedTabs}`, 'error');
        }
        
        return results;
    }
});

// アニメーションCSS追加
const style = document.createElement('style');
style.textContent = `
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;
document.head.appendChild(style);

console.log('✅ IntegratedListingModal - Save Functions loaded');
