/**
 * IntegratedListingModal - データ読み込み機能
 * 保存済みデータをUIに復元する処理
 */

Object.assign(IntegratedListingModal, {
    
    /**
     * 🔴 保存データ読み込み（モーダルopen時に自動実行）
     * getProductDetails APIで取得したデータをUIに復元
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
                
                console.log('[IntegratedListingModal] Manual data restored:', manualData);
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
                    console.log('[IntegratedListingModal] 選択画像URL:', selectedImagesData);
                }
            } catch (e) {
                console.error('[IntegratedListingModal] 選択画像データのパースエラー:', e);
            }
        }
        
        // 🔴 出品情報の復元（eBay）
        if (product.ebay_listing_data) {
            try {
                const listingData = typeof product.ebay_listing_data === 'string' 
                    ? JSON.parse(product.ebay_listing_data) 
                    : product.ebay_listing_data;
                
                Object.assign(fields, {
                    'ebay-category-id': listingData.ebay_category_id || product.ebay_category_id || '',
                    'ebay-title': listingData.ebay_title || '',
                    'ebay-subtitle': listingData.ebay_subtitle || '',
                    'ebay-price': listingData.price_usd || '',
                    'ebay-quantity': listingData.quantity || '1',
                    'ebay-condition-id': listingData.condition_id || '',
                    'ebay-duration': listingData.duration || 'GTC',
                    'ebay-format': listingData.listing_format || 'FixedPriceItem'
                });
                
                // Best Offer設定
                if (listingData.best_offer) {
                    const bestOfferEl = document.getElementById('ebay-best-offer');
                    if (bestOfferEl) bestOfferEl.value = 'enabled';
                    
                    if (listingData.auto_accept_price) {
                        fields['auto-accept-price'] = listingData.auto_accept_price;
                    }
                    if (listingData.auto_decline_price) {
                        fields['auto-decline-price'] = listingData.auto_decline_price;
                    }
                }
                
                // Item Specifics復元
                if (listingData.item_specifics && typeof listingData.item_specifics === 'object') {
                    setTimeout(() => {
                        Object.entries(listingData.item_specifics).forEach(([name, value]) => {
                            const el = document.querySelector(`[data-specific-name="${name}"]`);
                            if (el) el.value = value;
                        });
                    }, 500);
                }
                
                console.log('[IntegratedListingModal] Listing data restored:', listingData);
            } catch (e) {
                console.error('[IntegratedListingModal] 出品情報データのパースエラー:', e);
            }
        } else if (product.ebay_category_id) {
            // ebay_category_idのみ存在する場合
            fields['ebay-category-id'] = product.ebay_category_id;
        }
        
        // 🔴 配送設定の復元
        if (product.shipping_data) {
            try {
                const shippingData = typeof product.shipping_data === 'string' 
                    ? JSON.parse(product.shipping_data) 
                    : product.shipping_data;
                
                Object.assign(fields, {
                    'ebay-shipping-policy': shippingData.shipping_policy_id || '',
                    'ebay-handling-time': shippingData.handling_time || '3',
                    'ebay-package-type': shippingData.package_type || '',
                    'weight-lbs': shippingData.weight_major || '0',
                    'weight-oz': shippingData.weight_minor || '0',
                    'length-inches': shippingData.dimensions_length || '',
                    'width-inches': shippingData.dimensions_width || '',
                    'height-inches': shippingData.dimensions_height || ''
                });
                
                if (shippingData.international_shipping) {
                    const intlShippingEl = document.getElementById('intl-shipping');
                    if (intlShippingEl) intlShippingEl.checked = true;
                }
                
                console.log('[IntegratedListingModal] Shipping data restored:', shippingData);
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
                    console.log('[IntegratedListingModal] HTML description restored');
                }
            }, 500);
        }
        
        console.log('[IntegratedListingModal] Fields to set:', fields);
        
        // すべてのフィールドに値を設定
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
        
        // 画像選択の復元をloadImages()で実行
        this.loadImages();
    }
});

console.log('✅ IntegratedListingModal - Load Saved Data Functions loaded');
