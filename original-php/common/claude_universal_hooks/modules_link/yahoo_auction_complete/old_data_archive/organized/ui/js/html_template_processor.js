/**
 * 🎨 HTML差し込みシステム - テンプレート変数方式
 * 
 * 使用方法：
 * 1. HTMLテンプレートに {{変数名}} を記述
 * 2. 商品データを渡して自動置換
 * 3. 完成HTMLを生成・保存
 */

class HTMLTemplateProcessor {
    constructor() {
        this.variables = new Map();
        this.templates = new Map();
    }
    
    /**
     * 🎯 差し込み変数定義
     */
    defineVariables() {
        return {
            // 基本商品情報
            '{{TITLE}}': '商品タイトル',
            '{{PRICE}}': '販売価格（$99.99形式）',
            '{{BRAND}}': 'ブランド名',
            '{{CONDITION}}': '商品状態（New/Used等）',
            '{{DESCRIPTION}}': '商品説明文',
            
            // 画像関連
            '{{MAIN_IMAGE}}': 'メイン画像URL',
            '{{IMAGE_GALLERY}}': '画像ギャラリー（複数画像）',
            '{{IMAGE_1}}': '追加画像1',
            '{{IMAGE_2}}': '追加画像2',
            '{{IMAGE_3}}': '追加画像3',
            
            // 仕様・詳細
            '{{SPECIFICATIONS}}': '商品仕様（表形式）',
            '{{MODEL_NUMBER}}': '型番',
            '{{UPC}}': 'UPCコード',
            '{{EAN}}': 'EANコード',
            '{{COLOR}}': '色',
            '{{SIZE}}': 'サイズ',
            
            // 配送・価格情報
            '{{SHIPPING_INFO}}': '配送情報',
            '{{SHIPPING_COST}}': '送料',
            '{{WEIGHT}}': '重量',
            '{{DIMENSIONS}}': '寸法',
            '{{RETURN_POLICY}}': '返品ポリシー',
            
            // 販売者情報
            '{{SELLER_INFO}}': '販売者情報',
            '{{FEEDBACK_SCORE}}': 'フィードバック評価',
            '{{WARRANTY}}': '保証情報',
            
            // 動的コンテンツ
            '{{CURRENT_DATE}}': '現在日付',
            '{{CURRENCY}}': '通貨記号',
            '{{LOCATION}}': '発送元地域'
        };
    }
    
    /**
     * 🎨 HTMLテンプレート例
     */
    getTemplateExamples() {
        return {
            premium: `
<div class="ebay-listing premium-template">
    <div class="header-section">
        <h1 class="product-title">{{TITLE}}</h1>
        <div class="brand-badge">{{BRAND}}</div>
        <div class="price-display">${{PRICE}}</div>
    </div>
    
    <div class="image-section">
        <div class="main-image">
            <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}" class="primary-image">
        </div>
        <div class="image-gallery">
            {{IMAGE_GALLERY}}
        </div>
    </div>
    
    <div class="product-details">
        <div class="condition-info">
            <strong>Condition:</strong> {{CONDITION}}
        </div>
        
        <div class="specifications">
            <h3>Product Specifications</h3>
            {{SPECIFICATIONS}}
        </div>
        
        <div class="description">
            <h3>Product Description</h3>
            <p>{{DESCRIPTION}}</p>
        </div>
    </div>
    
    <div class="shipping-section">
        <h3>Shipping Information</h3>
        {{SHIPPING_INFO}}
        <div class="shipping-cost">Shipping: ${{SHIPPING_COST}}</div>
        <div class="weight-info">Weight: {{WEIGHT}} kg</div>
        <div class="dimensions">Dimensions: {{DIMENSIONS}}</div>
    </div>
    
    <div class="seller-section">
        {{SELLER_INFO}}
        <div class="return-policy">{{RETURN_POLICY}}</div>
        <div class="warranty-info">{{WARRANTY}}</div>
    </div>
</div>

<style>
.ebay-listing {
    max-width: 800px;
    margin: 0 auto;
    font-family: Arial, sans-serif;
    line-height: 1.6;
}

.header-section {
    text-align: center;
    margin-bottom: 2rem;
}

.product-title {
    font-size: 2rem;
    color: #333;
    margin-bottom: 1rem;
}

.brand-badge {
    display: inline-block;
    background: #0066cc;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    margin-bottom: 1rem;
}

.price-display {
    font-size: 2.5rem;
    font-weight: bold;
    color: #0066cc;
}

.image-section {
    margin-bottom: 2rem;
}

.primary-image {
    width: 100%;
    max-width: 500px;
    height: auto;
    margin: 0 auto;
    display: block;
}

.product-details {
    margin-bottom: 2rem;
}

.specifications table {
    width: 100%;
    border-collapse: collapse;
}

.specifications td {
    padding: 0.5rem;
    border: 1px solid #ddd;
}

.shipping-section, .seller-section {
    background: #f8f9fa;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 8px;
}
</style>
            `,
            
            standard: `
<div class="ebay-listing standard-template">
    <h1>{{TITLE}}</h1>
    <div class="price">${{PRICE}}</div>
    <div class="condition">{{CONDITION}}</div>
    
    <div class="product-image">
        <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}">
    </div>
    
    <div class="description">
        {{DESCRIPTION}}
    </div>
    
    <div class="specifications">
        {{SPECIFICATIONS}}
    </div>
    
    <div class="shipping">
        {{SHIPPING_INFO}}
    </div>
</div>
            `,
            
            minimal: `
<div class="simple-listing">
    <h1>{{TITLE}}</h1>
    <div class="price">${{PRICE}}</div>
    <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}">
    <p>{{DESCRIPTION}}</p>
    <p>{{SHIPPING_INFO}}</p>
</div>
            `
        };
    }
    
    /**
     * 🔄 商品データをHTMLに差し込み
     */
    processTemplate(templateHtml, productData) {
        let processedHtml = templateHtml;
        
        // 基本変数の置換
        const variableMap = {
            '{{TITLE}}': productData.title || '',
            '{{PRICE}}': this.formatPrice(productData.start_price),
            '{{BRAND}}': productData.brand || '',
            '{{CONDITION}}': this.getConditionText(productData.condition_id),
            '{{DESCRIPTION}}': productData.description || '',
            '{{MAIN_IMAGE}}': productData.pic_url || '',
            '{{MODEL_NUMBER}}': productData.mpn || '',
            '{{UPC}}': productData.upc || '',
            '{{EAN}}': productData.ean || '',
            '{{COLOR}}': productData.color || '',
            '{{WEIGHT}}': productData.weight_kg || '',
            '{{DIMENSIONS}}': this.formatDimensions(productData),
            '{{CURRENT_DATE}}': new Date().toLocaleDateString(),
            '{{CURRENCY}}': '$'
        };
        
        // 複雑な変数の生成
        variableMap['{{IMAGE_GALLERY}}'] = this.generateImageGallery(productData);
        variableMap['{{SPECIFICATIONS}}'] = this.generateSpecifications(productData);
        variableMap['{{SHIPPING_INFO}}'] = this.generateShippingInfo(productData);
        variableMap['{{SELLER_INFO}}'] = this.generateSellerInfo();
        variableMap['{{RETURN_POLICY}}'] = this.generateReturnPolicy();
        variableMap['{{WARRANTY}}'] = this.generateWarranty();
        
        // 変数置換実行
        Object.entries(variableMap).forEach(([variable, value]) => {
            const regex = new RegExp(this.escapeRegex(variable), 'g');
            processedHtml = processedHtml.replace(regex, value || '');
        });
        
        // 空の変数を削除
        processedHtml = processedHtml.replace(/\{\{[^}]+\}\}/g, '');
        
        return processedHtml;
    }
    
    /**
     * 🖼️ 画像ギャラリー生成
     */
    generateImageGallery(productData) {
        const images = [];
        
        // 追加画像を収集（ebay_image_url_1から24まで）
        for (let i = 1; i <= 24; i++) {
            const imageUrl = productData[`ebay_image_url_${i}`];
            if (imageUrl) {
                images.push(`<img src="${imageUrl}" alt="Product Image ${i}" class="gallery-image">`);
            }
        }
        
        if (images.length === 0) {
            return '<p>No additional images available</p>';
        }
        
        return `
            <div class="image-gallery-container">
                ${images.join('\n')}
            </div>
            <style>
            .image-gallery-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                gap: 10px;
                margin: 1rem 0;
            }
            .gallery-image {
                width: 100%;
                height: auto;
                border-radius: 4px;
                cursor: pointer;
            }
            </style>
        `;
    }
    
    /**
     * 📋 商品仕様表生成
     */
    generateSpecifications(productData) {
        const specs = [];
        
        if (productData.brand) specs.push(['Brand', productData.brand]);
        if (productData.mpn) specs.push(['Model', productData.mpn]);
        if (productData.color) specs.push(['Color', productData.color]);
        if (productData.upc) specs.push(['UPC', productData.upc]);
        if (productData.ean) specs.push(['EAN', productData.ean]);
        if (productData.weight_kg) specs.push(['Weight', productData.weight_kg + ' kg']);
        
        if (specs.length === 0) {
            return '<p>No specifications available</p>';
        }
        
        const tableRows = specs.map(([key, value]) => 
            `<tr><td><strong>${key}</strong></td><td>${value}</td></tr>`
        ).join('');
        
        return `
            <table class="specifications-table">
                ${tableRows}
            </table>
            <style>
            .specifications-table {
                width: 100%;
                border-collapse: collapse;
                margin: 1rem 0;
            }
            .specifications-table td {
                padding: 0.5rem;
                border: 1px solid #ddd;
            }
            .specifications-table tr:nth-child(even) {
                background: #f9f9f9;
            }
            </style>
        `;
    }
    
    /**
     * 🚚 配送情報生成
     */
    generateShippingInfo(productData) {
        const shippingCost = productData.shipping_international_usd || 0;
        const weight = productData.weight_kg || 0;
        
        if (shippingCost === 0) {
            return `
                <div class="shipping-info">
                    <h4>🚚 FREE International Shipping!</h4>
                    <p>Ships worldwide from Japan</p>
                    <p>Weight: ${weight} kg</p>
                    <p>Estimated delivery: 7-14 business days</p>
                </div>
            `;
        }
        
        return `
            <div class="shipping-info">
                <h4>🚚 International Shipping: $${shippingCost}</h4>
                <p>Ships worldwide from Japan</p>
                <p>Weight: ${weight} kg</p>
                <p>Estimated delivery: 7-14 business days</p>
                <p>Tracking number provided</p>
            </div>
        `;
    }
    
    // ヘルパーメソッド
    formatPrice(price) {
        return price ? parseFloat(price).toFixed(2) : '0.00';
    }
    
    getConditionText(conditionId) {
        const conditions = {
            1000: 'Brand New',
            1500: 'New Other',
            2000: 'Manufacturer Refurbished',
            3000: 'Used',
            4000: 'Very Good',
            5000: 'Good'
        };
        return conditions[conditionId] || 'Unknown';
    }
    
    formatDimensions(productData) {
        const l = productData.length_cm || 0;
        const w = productData.width_cm || 0;
        const h = productData.height_cm || 0;
        return `${l} x ${w} x ${h} cm`;
    }
    
    generateSellerInfo() {
        return `
            <div class="seller-info">
                <h4>👤 Seller Information</h4>
                <p>Trusted Japanese seller with 99.8% positive feedback</p>
                <p>Fast shipping • Excellent packaging • Great communication</p>
            </div>
        `;
    }
    
    generateReturnPolicy() {
        return `
            <div class="return-policy">
                <h4>↩️ Return Policy</h4>
                <p>30-day return guarantee</p>
                <p>Item must be in original condition</p>
                <p>Buyer pays return shipping</p>
            </div>
        `;
    }
    
    generateWarranty() {
        return `
            <div class="warranty">
                <h4>🛡️ Warranty</h4>
                <p>Manufacturer warranty applies</p>
                <p>Contact us for warranty claims</p>
            </div>
        `;
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// 使用例
const processor = new HTMLTemplateProcessor();

// 商品データ例
const sampleProductData = {
    title: 'iPhone 15 Pro 128GB Natural Titanium Unlocked',
    start_price: 650.00,
    brand: 'Apple',
    condition_id: 1000,
    description: 'Brand new iPhone 15 Pro in Natural Titanium. Factory unlocked, works with any carrier worldwide.',
    pic_url: 'https://example.com/iphone15pro.jpg',
    mpn: 'A2848',
    weight_kg: 0.187,
    shipping_international_usd: 25.00
};

// HTML生成
const templates = processor.getTemplateExamples();
const premiumHtml = processor.processTemplate(templates.premium, sampleProductData);

console.log('🎨 HTML差し込み完了');
console.log('生成されたHTML:', premiumHtml.substring(0, 200) + '...');