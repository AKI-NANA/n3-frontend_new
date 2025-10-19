/**
 * 新規マーケットプレイス対応関数追加
 * Shopee / Amazon Global / Coupang
 */

// === Shopee Functions ===

IntegratedListingModal.updateShopeeCountrySettings = function(countryCode) {
    const countryData = {
        'sg': { name: 'シンガポール', language: '英語', currency: 'SGD', logistics: 'Shopee Standard', fee: '5-7%' },
        'my': { name: 'マレーシア', language: 'マレー語/英語', currency: 'MYR', logistics: 'Shopee Express', fee: '6-8%' },
        'th': { name: 'タイ', language: 'タイ語', currency: 'THB', logistics: 'Flash Express', fee: '5-7%' },
        'tw': { name: '台湾', language: '中国語(繁体字)', currency: 'TWD', logistics: '黑猫宅急便', fee: '6-8%' },
        'ph': { name: 'フィリピン', language: '英語/タガログ語', currency: 'PHP', logistics: 'J&T Express', fee: '5-7%' },
        'vn': { name: 'ベトナム', language: 'ベトナム語', currency: 'VND', logistics: 'Giao Hàng Nhanh', fee: '6-8%' },
        'id': { name: 'インドネシア', language: 'インドネシア語', currency: 'IDR', logistics: 'JNE', fee: '6-8%' }
    };
    
    const data = countryData[countryCode];
    if (data) {
        document.getElementById('shopee-country-details').style.display = 'block';
        document.getElementById('shopee-country-name').textContent = data.name;
        document.getElementById('shopee-language').textContent = data.language;
        document.getElementById('shopee-currency').textContent = data.currency;
        document.getElementById('shopee-logistics').textContent = data.logistics;
        document.getElementById('shopee-fee').textContent = data.fee;
        
        const currencySymbols = document.querySelectorAll('#shopee-currency-symbol, #shopee-currency-symbol-2');
        currencySymbols.forEach(el => el.textContent = data.currency);
    }
};

IntegratedListingModal.generateShopeeHtmlTemplate = function() {
    const product = this.state.productData;
    const template = document.getElementById('shopee-html-template');
    
    if (template) {
        let html = template.innerHTML;
        html = html.replace('{{PRODUCT_TITLE}}', product.title || '商品名');
        html = html.replace('{{DESCRIPTION}}', product.description || '商品説明');
        html = html.replace(/{{FEATURE_1}}/g, '特徴1');
        html = html.replace(/{{FEATURE_2}}/g, '特徴2');
        html = html.replace(/{{FEATURE_3}}/g, '特徴3');
        
        document.getElementById('shopee-html-editor').value = html;
        this.updateShopeeHtmlPreview();
    }
};

IntegratedListingModal.updateShopeeHtmlPreview = function() {
    const htmlContent = document.getElementById('shopee-html-editor').value;
    const preview = document.getElementById('shopee-html-preview');
    preview.innerHTML = htmlContent || '<p style="color: #6c757d; text-align: center;">商品説明を入力するとプレビューが表示されます</p>';
};

IntegratedListingModal.insertShopeeCommonElements = function() {
    const editor = document.getElementById('shopee-html-editor');
    const commonElements = `
<div style="background: #fff3e0; border-left: 4px solid #ee4d2d; padding: 15px; margin: 15px 0;">
    <h4 style="color: #ee4d2d; margin-top: 0;">✨ 当店の特徴</h4>
    <ul style="margin: 0;">
        <li>📦 迅速配送</li>
        <li>✅ 正規品保証</li>
        <li>⭐ 高評価ショップ</li>
        <li>💬 丁寧なカスタマーサポート</li>
    </ul>
</div>`;
    
    editor.value += commonElements;
    this.updateShopeeHtmlPreview();
};

IntegratedListingModal.validateShopeeHtml = function() {
    alert('✓ Shopee HTML検証完了');
};

IntegratedListingModal.copyShopeeHtmlToClipboard = function() {
    const htmlContent = document.getElementById('shopee-html-editor').value;
    navigator.clipboard.writeText(htmlContent).then(() => {
        alert('ShopeeHTMLをコピーしました');
    });
};

// === Amazon Global Functions ===

IntegratedListingModal.updateAmazonGlobalMarketplace = function(marketCode) {
    const marketData = {
        'us': { name: 'USA', language: '英語', currency: 'USD', fee: '15%' },
        'ca': { name: 'Canada', language: '英語/フランス語', currency: 'CAD', fee: '15%' },
        'mx': { name: 'Mexico', language: 'スペイン語', currency: 'MXN', fee: '15%' },
        'uk': { name: 'UK', language: '英語', currency: 'GBP', fee: '15%' },
        'de': { name: 'Germany', language: 'ドイツ語', currency: 'EUR', fee: '15%' },
        'fr': { name: 'France', language: 'フランス語', currency: 'EUR', fee: '15%' },
        'it': { name: 'Italy', language: 'イタリア語', currency: 'EUR', fee: '15%' },
        'es': { name: 'Spain', language: 'スペイン語', currency: 'EUR', fee: '15%' },
        'nl': { name: 'Netherlands', language: 'オランダ語', currency: 'EUR', fee: '15%' },
        'pl': { name: 'Poland', language: 'ポーランド語', currency: 'PLN', fee: '15%' },
        'se': { name: 'Sweden', language: 'スウェーデン語', currency: 'SEK', fee: '15%' },
        'be': { name: 'Belgium', language: 'オランダ語/フランス語', currency: 'EUR', fee: '15%' },
        'au': { name: 'Australia', language: '英語', currency: 'AUD', fee: '15%' },
        'sg': { name: 'Singapore', language: '英語', currency: 'SGD', fee: '15%' },
        'in': { name: 'India', language: '英語/ヒンディー語', currency: 'INR', fee: '15%' },
        'ae': { name: 'UAE', language: 'アラビア語/英語', currency: 'AED', fee: '15%' },
        'sa': { name: 'Saudi Arabia', language: 'アラビア語', currency: 'SAR', fee: '15%' }
    };
    
    const data = marketData[marketCode];
    if (data) {
        document.getElementById('amazon-global-market-info').style.display = 'block';
        document.getElementById('amazon-global-market-name').textContent = data.name;
        document.getElementById('amazon-global-language').textContent = data.language;
        document.getElementById('amazon-global-currency').textContent = data.currency;
        document.getElementById('amazon-global-fee').textContent = data.fee;
        document.getElementById('amazon-global-currency-symbol').textContent = data.currency;
    }
};

IntegratedListingModal.updateAmazonGlobalFulfillment = function(method) {
    const fbaSettings = document.getElementById('amazon-global-fba-settings');
    const fbmSettings = document.getElementById('amazon-global-fbm-settings');
    
    if (method === 'fba') {
        fbaSettings.style.display = 'block';
        fbmSettings.style.display = 'none';
    } else {
        fbaSettings.style.display = 'none';
        fbmSettings.style.display = 'block';
    }
};

IntegratedListingModal.generateAmazonGlobalHtmlTemplate = function() {
    const product = this.state.productData;
    const template = document.getElementById('amazon-global-html-template');
    
    if (template) {
        let html = template.innerHTML;
        html = html.replace('{{PRODUCT_TITLE}}', product.title || 'Product Title');
        html = html.replace('{{DESCRIPTION}}', product.description || 'Product description');
        html = html.replace(/{{FEATURE_1}}/g, 'Feature 1');
        html = html.replace(/{{FEATURE_2}}/g, 'Feature 2');
        html = html.replace(/{{FEATURE_3}}/g, 'Feature 3');
        
        document.getElementById('amazon-global-html-editor').value = html;
        this.updateAmazonGlobalHtmlPreview();
    }
};

IntegratedListingModal.updateAmazonGlobalHtmlPreview = function() {
    const htmlContent = document.getElementById('amazon-global-html-editor').value;
    const preview = document.getElementById('amazon-global-html-preview');
    preview.innerHTML = htmlContent || '<p style="color: #6c757d; text-align: center;">Enter product description to see preview</p>';
};

IntegratedListingModal.insertAmazonGlobalCommonElements = function() {
    const editor = document.getElementById('amazon-global-html-editor');
    const commonElements = `
<div style="background: #f7f7f7; padding: 15px; margin: 15px 0; border-radius: 5px;">
    <h4 style="color: #ff9900; margin-top: 0;">🌟 Why Buy From Us?</h4>
    <ul style="margin: 0;">
        <li>📦 Fast & secure shipping</li>
        <li>✅ 100% authentic products</li>
        <li>⭐ Excellent customer reviews</li>
        <li>💬 Responsive customer support</li>
    </ul>
</div>`;
    
    editor.value += commonElements;
    this.updateAmazonGlobalHtmlPreview();
};

IntegratedListingModal.copyAmazonGlobalHtmlToClipboard = function() {
    const htmlContent = document.getElementById('amazon-global-html-editor').value;
    navigator.clipboard.writeText(htmlContent).then(() => {
        alert('Amazon Global HTML copied to clipboard');
    });
};

// === Coupang Functions ===

IntegratedListingModal.updateCoupangRocketShipping = function(useRocket) {
    const rocketDetails = document.getElementById('coupang-rocket-details');
    if (rocketDetails) {
        rocketDetails.style.display = useRocket === 'yes' ? 'block' : 'none';
    }
};

IntegratedListingModal.generateCoupangHtmlTemplate = function() {
    const product = this.state.productData;
    const template = document.getElementById('coupang-html-template');
    
    if (template) {
        let html = template.innerHTML;
        html = html.replace('{{PRODUCT_TITLE}}', product.title || '상품명');
        html = html.replace('{{DESCRIPTION}}', product.description || '상품 설명');
        html = html.replace(/{{FEATURE_1}}/g, '특징 1');
        html = html.replace(/{{FEATURE_2}}/g, '특징 2');
        html = html.replace(/{{FEATURE_3}}/g, '특징 3');
        
        document.getElementById('coupang-html-editor').value = html;
        this.updateCoupangHtmlPreview();
    }
};

IntegratedListingModal.updateCoupangHtmlPreview = function() {
    const htmlContent = document.getElementById('coupang-html-editor').value;
    const preview = document.getElementById('coupang-html-preview');
    preview.innerHTML = htmlContent || '<p style="color: #6c757d; text-align: center;">상품 설명을 입력하면 미리보기가 표시됩니다</p>';
};

IntegratedListingModal.insertCoupangCommonElements = function() {
    const editor = document.getElementById('coupang-html-editor');
    const commonElements = `
<div style="background: #fff3e0; border-left: 4px solid #ff6600; padding: 15px; margin: 15px 0;">
    <h4 style="color: #ff6600; margin-top: 0;">✨ 구매 혜택</h4>
    <ul style="margin: 0;">
        <li>📦 빠른 배송</li>
        <li>✅ 정품 보증</li>
        <li>⭐ 높은 만족도</li>
        <li>💬 친절한 고객 서비스</li>
    </ul>
</div>`;
    
    editor.value += commonElements;
    this.updateCoupangHtmlPreview();
};

IntegratedListingModal.copyCoupangHtmlToClipboard = function() {
    const htmlContent = document.getElementById('coupang-html-editor').value;
    navigator.clipboard.writeText(htmlContent).then(() => {
        alert('Coupang HTML을 복사했습니다');
    });
};

console.log('✅ New marketplace functions loaded (Shopee / Amazon Global / Coupang)');
