/**
 * eBay出品タブ - 自動翻訳・価格変換機能
 */

Object.assign(IntegratedListingModal, {
    
    /**
     * 🔴 eBay出品タブのデータ自動生成
     */
    async populateEbayListingTab() {
        const product = this.state.productData;
        
        if (!product) {
            console.error('[eBay Auto-Fill] No product data');
            return;
        }
        
        console.log('[eBay Auto-Fill] Populating eBay listing tab...');
        
        // 1. タイトル生成（日本語 → 英語変換）
        const ebayTitle = await this.generateEbayTitle(product.title);
        const ebayTitleField = document.getElementById('ebay-title');
        if (ebayTitleField && !ebayTitleField.value) {
            ebayTitleField.value = ebayTitle;
            console.log('[eBay Auto-Fill] eBay title set:', ebayTitle);
        }
        
        // 2. 価格変換（円 → USD）
        const priceUsd = this.convertJpyToUsd(product.current_price || product.price_jpy || 0);
        const ebayPriceField = document.getElementById('ebay-price');
        if (ebayPriceField && !ebayPriceField.value) {
            ebayPriceField.value = priceUsd;
            console.log('[eBay Auto-Fill] eBay price set:', priceUsd, 'USD');
        }
        
        // 3. 商品説明の英語翻訳
        const ebayDescription = await this.translateDescription(product.description || '');
        
        // HTML説明文に設定
        setTimeout(() => {
            const htmlEditor = document.getElementById('html-editor');
            if (htmlEditor && !htmlEditor.value) {
                const htmlTemplate = this.generateEbayHtmlDescription(ebayDescription, product);
                htmlEditor.value = htmlTemplate;
                this.updateHtmlPreview();
                console.log('[eBay Auto-Fill] HTML description generated');
            }
        }, 500);
        
        // 4. 商品状態の変換
        const ebayCondition = this.convertConditionToEbay(product.condition);
        const conditionField = document.getElementById('ebay-condition');
        if (conditionField && !conditionField.value) {
            conditionField.value = ebayCondition;
            console.log('[eBay Auto-Fill] Condition set:', ebayCondition);
        }
        
        // 5. Item Specificsの生成
        if (this.state.toolResults.category?.item_specifics) {
            const itemSpecificsField = document.getElementById('ebay-item-specifics');
            if (itemSpecificsField && !itemSpecificsField.value) {
                itemSpecificsField.value = this.state.toolResults.category.item_specifics;
            }
        }
    },
    
    /**
     * 🔴 eBayタイトル生成（日本語 → 英語、80文字以内）
     */
    async generateEbayTitle(japaneseTitle) {
        if (!japaneseTitle) return '';
        
        // 簡易翻訳（実際はGoogle Translate APIを使用）
        try {
            // DeepL/Google Translate APIがある場合はここで翻訳
            // 今はシンプルな変換のみ
            let englishTitle = japaneseTitle;
            
            // 日本語文字を削除し、英数字のみ抽出
            englishTitle = englishTitle.replace(/[^\x00-\x7F]/g, ' '); // 非ASCII削除
            englishTitle = englishTitle.replace(/\s+/g, ' ').trim();
            
            // 80文字制限
            if (englishTitle.length > 80) {
                englishTitle = englishTitle.substring(0, 77) + '...';
            }
            
            // 翻訳APIが利用可能な場合
            if (window.translateToEnglish) {
                englishTitle = await window.translateToEnglish(japaneseTitle, 80);
            }
            
            return englishTitle || japaneseTitle.substring(0, 80);
            
        } catch (error) {
            console.error('[Title Translation] Error:', error);
            return japaneseTitle.substring(0, 80);
        }
    },
    
    /**
     * 🔴 価格変換（円 → USD）
     */
    convertJpyToUsd(priceJpy) {
        const exchangeRate = 150; // デフォルトレート（実際はAPI取得）
        const priceUsd = (priceJpy / exchangeRate) * 1.3; // 30%マークアップ
        return Math.round(priceUsd * 100) / 100; // 小数点2桁
    },
    
    /**
     * 🔴 商品説明の翻訳
     */
    async translateDescription(japaneseDescription) {
        if (!japaneseDescription) return 'No description available.';
        
        try {
            // 翻訳APIがある場合
            if (window.translateToEnglish) {
                return await window.translateToEnglish(japaneseDescription);
            }
            
            // フォールバック: 簡易変換
            let englishDesc = japaneseDescription.replace(/[^\x00-\x7F]/g, ' ');
            englishDesc = englishDesc.replace(/\s+/g, ' ').trim();
            
            return englishDesc || 'Japanese product. Please contact for details.';
            
        } catch (error) {
            console.error('[Description Translation] Error:', error);
            return 'Item from Japan. Contact seller for details.';
        }
    },
    
    /**
     * 🔴 eBay HTML説明文生成
     */
    generateEbayHtmlDescription(description, product) {
        return `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #0064d2; border-bottom: 3px solid #0064d2; padding-bottom: 10px;">
        ${product.title || 'Product from Japan'}
    </h2>
    
    <div style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-left: 5px solid #0064d2;">
        <h3 style="margin-top: 0;">Product Description</h3>
        <p style="line-height: 1.6;">${description}</p>
    </div>
    
    <div style="background: #e3f2fd; padding: 20px; margin: 15px 0; border-radius: 8px;">
        <h3 style="margin-top: 0;">Shipping Information</h3>
        <ul style="margin: 0;">
            <li>📦 Ships from Japan</li>
            <li>🚚 Standard international shipping (7-14 business days)</li>
            <li>📋 Tracking number provided</li>
            <li>💰 Import duties may apply (buyer's responsibility)</li>
        </ul>
    </div>
    
    <div style="background: #fff3cd; padding: 20px; margin: 15px 0; border-radius: 8px;">
        <h3 style="margin-top: 0;">Product Condition</h3>
        <p><strong>Condition:</strong> ${this.getConditionLabel(product.condition)}</p>
        <p>Item is sold as-is. Please review photos carefully.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f0f0; border-radius: 8px;">
        <p style="margin: 0; color: #666; font-size: 16px;">
            <strong>🌏 Authentic Japanese Product</strong><br>
            Questions? Feel free to contact us!
        </p>
    </div>
</div>
        `.trim();
    },
    
    /**
     * 🔴 商品状態変換（日本語 → eBay Code）
     */
    convertConditionToEbay(japaneseCondition) {
        const conditionMap = {
            '新品': '1000',
            '未使用': '1000',
            '未使用に近い': '1500',
            '目立った傷や汚れなし': '3000',
            'やや傷や汚れあり': '3000',
            '傷や汚れあり': '4000',
            '全体的に状態が悪い': '5000',
            'ジャンク': '7000'
        };
        
        return conditionMap[japaneseCondition] || '3000'; // デフォルト: Used
    },
    
    /**
     * 🔴 商品状態ラベル取得
     */
    getConditionLabel(condition) {
        const labels = {
            '新品': 'New',
            '未使用': 'New',
            '未使用に近い': 'Like New',
            '目立った傷や汚れなし': 'Very Good',
            'やや傷や汚れあり': 'Good',
            '傷や汚れあり': 'Acceptable',
            '全体的に状態が悪い': 'Poor',
            'ジャンク': 'For Parts'
        };
        
        return labels[condition] || 'Used';
    }
});

// タブ切り替え時にeBayタブが開かれたら自動生成
const originalSwitchTab = IntegratedListingModal.switchTab;
IntegratedListingModal.switchTab = function(tabId) {
    originalSwitchTab.call(this, tabId);
    
    // eBay出品タブに切り替えた時に自動生成
    if (tabId === 'tab-listing' && this.state.currentMarketplace === 'ebay') {
        setTimeout(() => {
            this.populateEbayListingTab();
        }, 300);
    }
};

console.log('✅ eBay Auto-Fill & Translation Functions loaded');
