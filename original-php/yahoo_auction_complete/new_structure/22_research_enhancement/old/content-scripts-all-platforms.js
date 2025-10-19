// content-scripts/ebay.js - eBay用コンテンツスクリプト
class EbayContentScript {
  constructor() {
    this.isEnabled = false;
    this.panelVisible = false;
    this.productData = null;
    
    this.init();
  }
  
  init() {
    this.setupMessageListener();
    this.extractProductData();
    this.createResearchPanel();
    this.injectStyles();
    
    // ページ変更の監視（SPA対応）
    this.observePageChanges();
  }
  
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'extension_ready':
          this.isEnabled = true;
          this.updateAuthStatus(request.authenticated, request.user);
          sendResponse({ success: true });
          break;
          
        case 'extract_product_data':
          sendResponse(this.extractProductData());
          break;
          
        case 'auth_status_changed':
          this.updateAuthStatus(request.authenticated, request.user);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
      return true;
    });
  }
  
  extractProductData() {
    try {
      // eBay商品ページの場合
      if (this.isItemPage()) {
        const itemId = this.extractItemId();
        const title = this.extractTitle();
        const price = this.extractPrice();
        const currency = this.extractCurrency();
        const category = this.extractCategory();
        const condition = this.extractCondition();
        const seller = this.extractSeller();
        const images = this.extractImages();
        const description = this.extractDescription();
        const specifications = this.extractSpecifications();
        
        this.productData = {
          platform: 'ebay',
          itemId,
          title,
          price,
          currency,
          category,
          condition,
          seller,
          images,
          description,
          specifications,
          url: window.location.href,
          extractedAt: new Date().toISOString()
        };
        
        this.updatePanel();
        return this.productData;
      }
      
      // 検索結果ページの場合
      if (this.isSearchPage()) {
        return this.extractSearchResults();
      }
      
      return null;
    } catch (error) {
      console.error('Product data extraction failed:', error);
      return null;
    }
  }
  
  isItemPage() {
    return window.location.pathname.includes('/itm/') || 
           document.querySelector('[data-testid="x-price-primary"]') !== null;
  }
  
  isSearchPage() {
    return window.location.pathname.includes('/sch/') ||
           document.querySelector('.srp-results') !== null;
  }
  
  extractItemId() {
    const match = window.location.href.match(/\/itm\/([^\/\?]+)/);
    return match ? match[1] : null;
  }
  
  extractTitle() {
    const selectors = [
      '[data-testid="x-item-title-label"]',
      '.x-item-title-label',
      '#ebay-item-name',
      '.it-ttl h1'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent.trim();
      }
    }
    
    return document.title;
  }
  
  extractPrice() {
    const selectors = [
      '[data-testid="x-price-primary"] .notranslate',
      '.notranslate[data-testid="x-price-primary"]',
      '.u-flL.condText span',
      '.ebay-price .price'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent.trim();
        const match = priceText.match(/([0-9,]+\.?[0-9]*)/);
        return match ? parseFloat(match[1].replace(/,/g, '')) : null;
      }
    }
    
    return null;
  }
  
  extractCurrency() {
    const selectors = [
      '[data-testid="x-price-primary"] .notranslate',
      '.notranslate[data-testid="x-price-primary"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (text.includes('$')) return 'USD';
        if (text.includes('¥')) return 'JPY';
        if (text.includes('€')) return 'EUR';
        if (text.includes('£')) return 'GBP';
      }
    }
    
    return 'USD';
  }
  
  extractCategory() {
    const breadcrumb = document.querySelector('.breadcrumbs a:last-child');
    return breadcrumb ? breadcrumb.textContent.trim() : null;
  }
  
  extractCondition() {
    const conditionElement = document.querySelector('[data-testid="u-condition-text"]');
    return conditionElement ? conditionElement.textContent.trim() : 'Unknown';
  }
  
  extractSeller() {
    const sellerElement = document.querySelector('.seller-persona a');
    return sellerElement ? sellerElement.textContent.trim() : null;
  }
  
  extractImages() {
    const images = [];
    const imageElements = document.querySelectorAll('#PicturePanel img, .ux-image-carousel img');
    
    imageElements.forEach(img => {
      if (img.src && !img.src.includes('data:')) {
        images.push(img.src);
      }
    });
    
    return images;
  }
  
  extractDescription() {
    const descElement = document.querySelector('#desc_div, .u-flL.condText');
    return descElement ? descElement.textContent.trim().substring(0, 500) : null;
  }
  
  extractSpecifications() {
    const specs = {};
    const specElements = document.querySelectorAll('.u-flL .attrLabels');
    
    specElements.forEach(spec => {
      const label = spec.textContent.trim();
      const valueElement = spec.nextElementSibling;
      if (valueElement) {
        specs[label] = valueElement.textContent.trim();
      }
    });
    
    return specs;
  }
  
  extractSearchResults() {
    const results = [];
    const itemElements = document.querySelectorAll('.s-item');
    
    itemElements.forEach(item => {
      try {
        const titleElement = item.querySelector('.s-item__title');
        const priceElement = item.querySelector('.s-item__price');
        const linkElement = item.querySelector('.s-item__link');
        const imageElement = item.querySelector('.s-item__image img');
        
        if (titleElement && priceElement && linkElement) {
          results.push({
            title: titleElement.textContent.trim(),
            price: this.parsePrice(priceElement.textContent),
            url: linkElement.href,
            image: imageElement ? imageElement.src : null
          });
        }
      } catch (error) {
        console.warn('Failed to extract search result item:', error);
      }
    });
    
    return { searchResults: results, platform: 'ebay' };
  }
  
  parsePrice(priceText) {
    const match = priceText.match(/([0-9,]+\.?[0-9]*)/);
    return match ? parseFloat(match[1].replace(/,/g, '')) : null;
  }
  
  createResearchPanel() {
    if (document.getElementById('research-panel')) return;
    
    const panel = document.createElement('div');
    panel.id = 'research-panel';
    panel.className = 'research-panel';
    panel.innerHTML = \`
      <div class="research-panel-header">
        <h3>🔍 リサーチツール</h3>
        <button id="toggle-panel" class="toggle-btn">−</button>
      </div>
      <div class="research-panel-content">
        <div id="auth-required" class="auth-required">
          <p>ログインが必要です</p>
          <button id="open-popup">拡張機能を開く</button>
        </div>
        <div id="research-actions" class="research-actions" style="display: none;">
          <div class="product-info">
            <h4 id="product-title">商品を検出中...</h4>
            <p id="product-price"></p>
          </div>
          <div class="action-buttons">
            <button id="find-suppliers-btn" class="action-btn">仕入先検索</button>
            <button id="analyze-profit-btn" class="action-btn">利益分析</button>
            <button id="add-to-research-btn" class="action-btn">リサーチに追加</button>
          </div>
          <div id="results-area" class="results-area"></div>
        </div>
      </div>
    \`;
    
    document.body.appendChild(panel);
    this.setupPanelEvents();
  }
  
  setupPanelEvents() {
    document.getElementById('toggle-panel').addEventListener('click', () => {
      this.togglePanel();
    });
    
    document.getElementById('open-popup').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'open_popup' });
    });
    
    document.getElementById('find-suppliers-btn').addEventListener('click', () => {
      this.findSuppliers();
    });
    
    document.getElementById('analyze-profit-btn').addEventListener('click', () => {
      this.analyzeProfit();
    });
    
    document.getElementById('add-to-research-btn').addEventListener('click', () => {
      this.addToResearch();
    });
  }
  
  togglePanel() {
    const content = document.querySelector('.research-panel-content');
    const toggleBtn = document.getElementById('toggle-panel');
    
    if (this.panelVisible) {
      content.style.display = 'none';
      toggleBtn.textContent = '+';
      this.panelVisible = false;
    } else {
      content.style.display = 'block';
      toggleBtn.textContent = '−';
      this.panelVisible = true;
    }
  }
  
  updateAuthStatus(authenticated, user) {
    const authRequired = document.getElementById('auth-required');
    const researchActions = document.getElementById('research-actions');
    
    if (authenticated) {
      authRequired.style.display = 'none';
      researchActions.style.display = 'block';
    } else {
      authRequired.style.display = 'block';
      researchActions.style.display = 'none';
    }
  }
  
  updatePanel() {
    if (!this.productData) return;
    
    const titleElement = document.getElementById('product-title');
    const priceElement = document.getElementById('product-price');
    
    if (titleElement) {
      titleElement.textContent = this.productData.title || '商品タイトル不明';
    }
    
    if (priceElement) {
      const price = this.productData.price;
      const currency = this.productData.currency;
      priceElement.textContent = price ? \`\${currency} \${price}\` : '価格不明';
    }
  }
  
  async findSuppliers() {
    if (!this.productData) {
      this.showMessage('商品データが見つかりません', 'error');
      return;
    }
    
    this.showLoading(true);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'find_suppliers',
        productData: this.productData
      });
      
      if (response.success) {
        this.displaySuppliers(response.data.suppliers);
        this.showMessage(\`\${response.data.suppliers.length}件の仕入先が見つかりました\`, 'success');
      }
    } catch (error) {
      this.showMessage(\`仕入先検索エラー: \${error.message}\`, 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  async analyzeProfit() {
    this.showMessage('利益分析機能は開発中です', 'info');
  }
  
  async addToResearch() {
    if (!this.productData) {
      this.showMessage('商品データが見つかりません', 'error');
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'research_product',
        productData: this.productData
      });
      
      if (response.success) {
        this.showMessage('リサーチに追加しました', 'success');
      }
    } catch (error) {
      this.showMessage(\`追加エラー: \${error.message}\`, 'error');
    }
  }
  
  displaySuppliers(suppliers) {
    const resultsArea = document.getElementById('results-area');
    
    if (!suppliers.length) {
      resultsArea.innerHTML = '<p>仕入先が見つかりませんでした</p>';
      return;
    }
    
    const supplierHTML = suppliers.map(supplier => \`
      <div class="supplier-item">
        <div class="supplier-header">
          <span class="supplier-name">\${supplier.supplier.name}</span>
          <span class="supplier-price">¥\${supplier.pricing.currentPrice.toLocaleString()}</span>
        </div>
        <div class="supplier-details">
          <span class="supplier-type">\${supplier.supplier.type}</span>
          <span class="confidence">信頼度: \${Math.round(supplier.analysis.matchingConfidence * 100)}%</span>
        </div>
      </div>
    \`).join('');
    
    resultsArea.innerHTML = \`
      <h5>仕入先候補</h5>
      <div class="suppliers-list">
        \${supplierHTML}
      </div>
    \`;
  }
  
  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = \`message message-\${type}\`;
    messageDiv.textContent = message;
    
    const panel = document.getElementById('research-panel');
    panel.appendChild(messageDiv);
    
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }
  
  showLoading(show) {
    const buttons = document.querySelectorAll('.action-btn');
    buttons.forEach(btn => {
      btn.disabled = show;
      btn.textContent = show ? '処理中...' : btn.dataset.originalText || btn.textContent;
      if (!show && !btn.dataset.originalText) {
        btn.dataset.originalText = btn.textContent;
      }
    });
  }
  
  observePageChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          if (addedNodes.some(node => 
            node.nodeType === Node.ELEMENT_NODE && 
            (node.querySelector('[data-testid="x-price-primary"]') || 
             node.matches('[data-testid="x-price-primary"]'))
          )) {
            shouldUpdate = true;
          }
        }
      });
      
      if (shouldUpdate) {
        setTimeout(() => {
          this.extractProductData();
        }, 1000);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  injectStyles() {
    if (document.getElementById('research-panel-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'research-panel-styles';
    styles.textContent = \`
      .research-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 350px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: white;
      }
      
      .research-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .research-panel-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .toggle-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .research-panel-content {
        padding: 20px;
      }
      
      .auth-required {
        text-align: center;
      }
      
      .auth-required button {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        margin-top: 10px;
      }
      
      .product-info {
        margin-bottom: 15px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
      }
      
      .product-info h4 {
        margin: 0 0 5px 0;
        font-size: 14px;
        font-weight: 600;
      }
      
      .product-info p {
        margin: 0;
        font-size: 12px;
        opacity: 0.8;
      }
      
      .action-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 15px;
      }
      
      .action-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.3s ease;
      }
      
      .action-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .results-area {
        max-height: 300px;
        overflow-y: auto;
      }
      
      .suppliers-list {
        margin-top: 10px;
      }
      
      .supplier-item {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 10px;
        margin-bottom: 8px;
      }
      
      .supplier-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
      }
      
      .supplier-name {
        font-weight: 600;
        font-size: 14px;
      }
      
      .supplier-price {
        font-weight: 600;
        color: #4CAF50;
      }
      
      .supplier-details {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        opacity: 0.8;
      }
      
      .message {
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 10px 15px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 10001;
        animation: slideIn 0.3s ease-out;
      }
      
      .message-success {
        background: #4CAF50;
        color: white;
      }
      
      .message-error {
        background: #f44336;
        color: white;
      }
      
      .message-info {
        background: #2196F3;
        color: white;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    \`;
    
    document.head.appendChild(styles);
  }
}

// eBayコンテンツスクリプト初期化
const ebayScript = new EbayContentScript();

// content-scripts/amazon.js - Amazon用コンテンツスクリプト
class AmazonContentScript {
  constructor() {
    this.isEnabled = false;
    this.productData = null;
    
    this.init();
  }
  
  init() {
    this.setupMessageListener();
    this.extractProductData();
    this.createQuickAnalysisButton();
  }
  
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'extension_ready':
          this.isEnabled = true;
          sendResponse({ success: true });
          break;
          
        case 'extract_product_data':
          sendResponse(this.extractProductData());
          break;
          
        default:
          sendResponse({ success: false });
      }
      return true;
    });
  }
  
  extractProductData() {
    try {
      if (this.isProductPage()) {
        const asin = this.extractASIN();
        const title = this.extractTitle();
        const price = this.extractPrice();
        const category = this.extractCategory();
        const brand = this.extractBrand();
        const rating = this.extractRating();
        const availability = this.extractAvailability();
        
        this.productData = {
          platform: 'amazon',
          asin,
          title,
          price,
          currency: 'JPY',
          category,
          brand,
          rating,
          availability,
          url: window.location.href,
          extractedAt: new Date().toISOString()
        };
        
        this.updateQuickAnalysis();
        return this.productData;
      }
      
      return null;
    } catch (error) {
      console.error('Amazon product data extraction failed:', error);
      return null;
    }
  }
  
  isProductPage() {
    return window.location.pathname.includes('/dp/') || 
           document.querySelector('#productTitle') !== null;
  }
  
  extractASIN() {
    const match = window.location.href.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
  }
  
  extractTitle() {
    const titleElement = document.querySelector('#productTitle');
    return titleElement ? titleElement.textContent.trim() : null;
  }
  
  extractPrice() {
    const priceSelectors = [
      '.a-price-current .a-offscreen',
      '.a-price .a-offscreen',
      '#price_inside_buybox',
      '.a-price-range .a-price .a-offscreen'
    ];
    
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent.trim();
        const match = priceText.match(/[0-9,]+/);
        return match ? parseInt(match[0].replace(/,/g, '')) : null;
      }
    }
    
    return null;
  }
  
  extractCategory() {
    const breadcrumb = document.querySelector('#wayfinding-breadcrumbs_feature_div a:last-child');
    return breadcrumb ? breadcrumb.textContent.trim() : null;
  }
  
  extractBrand() {
    const brandElement = document.querySelector('#bylineInfo');
    return brandElement ? brandElement.textContent.replace('ブランド:', '').trim() : null;
  }
  
  extractRating() {
    const ratingElement = document.querySelector('.a-icon-alt');
    if (ratingElement) {
      const match = ratingElement.textContent.match(/([0-9.]+)/);
      return match ? parseFloat(match[1]) : null;
    }
    return null;
  }
  
  extractAvailability() {
    const availabilityElement = document.querySelector('#availability span');
    return availabilityElement ? availabilityElement.textContent.trim() : null;
  }
  
  createQuickAnalysisButton() {
    if (document.getElementById('ebay-analysis-btn')) return;
    
    const button = document.createElement('button');
    button.id = 'ebay-analysis-btn';
    button.className = 'ebay-analysis-btn';
    button.innerHTML = '🔍 eBay転売分析';
    
    // ボタンを商品情報エリアに挿入
    const insertTarget = document.querySelector('#desktop_buybox') || 
                        document.querySelector('#buybox') ||
                        document.querySelector('#rightCol');
    
    if (insertTarget) {
      insertTarget.insertBefore(button, insertTarget.firstChild);
      
      button.addEventListener('click', () => {
        this.analyzeEbayPotential();
      });
    }
    
    this.injectAmazonStyles();
  }
  
  async analyzeEbayPotential() {
    if (!this.productData) {
      alert('商品データを取得できませんでした');
      return;
    }
    
    const button = document.getElementById('ebay-analysis-btn');
    button.textContent = '分析中...';
    button.disabled = true;
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'research_product',
        productData: {
          title: this.productData.title,
          keywords: this.productData.title,
          category: this.productData.category,
          brand: this.productData.brand
        }
      });
      
      if (response.success) {
        this.showAnalysisResults(response.data);
      }
    } catch (error) {
      alert(\`分析エラー: \${error.message}\`);
    } finally {
      button.textContent = '🔍 eBay転売分析';
      button.disabled = false;
    }
  }
  
  showAnalysisResults(data) {
    const resultsHtml = \`
      <div id="ebay-analysis-results" class="ebay-analysis-results">
        <h3>eBay転売分析結果</h3>
        <p>類似商品: \${data.totalResults}件</p>
        <p>平均価格: $\${this.calculateAveragePrice(data.items)}</p>
        <div class="top-results">
          \${data.items.slice(0, 5).map(item => \`
            <div class="result-item">
              <div class="result-title">\${item.title.substring(0, 60)}...</div>
              <div class="result-price">$\${item.currentPrice?.value || 'N/A'}</div>
            </div>
          \`).join('')}
        </div>
        <button onclick="this.parentElement.remove()">閉じる</button>
      </div>
    \`;
    
    const existingResults = document.getElementById('ebay-analysis-results');
    if (existingResults) {
      existingResults.remove();
    }
    
    const container = document.querySelector('#desktop_buybox') || document.body;
    container.insertAdjacentHTML('afterbegin', resultsHtml);
  }
  
  calculateAveragePrice(items) {
    const prices = items.filter(item => item.currentPrice?.value).map(item => item.currentPrice.value);
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    return average ? average.toFixed(2) : 'N/A';
  }
  
  updateQuickAnalysis() {
    const button = document.getElementById('ebay-analysis-btn');
    if (button && this.productData) {
      button.style.display = 'block';
    }
  }
  
  injectAmazonStyles() {
    if (document.getElementById('amazon-extension-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'amazon-extension-styles';
    styles.textContent = \`
      .ebay-analysis-btn {
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        margin-bottom: 10px;
        transition: transform 0.2s ease;
      }
      
      .ebay-analysis-btn:hover {
        transform: translateY(-1px);
      }
      
      .ebay-analysis-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      
      .ebay-analysis-results {
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 15px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .ebay-analysis-results h3 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 16px;
      }
      
      .ebay-analysis-results p {
        margin: 5px 0;
        color: #666;
      }
      
      .top-results {
        margin-top: 15px;
      }
      
      .result-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }
      
      .result-title {
        flex: 1;
        font-size: 12px;
        color: #333;
      }
      
      .result-price {
        font-weight: 600;
        color: #B12704;
      }
      
      .ebay-analysis-results button {
        margin-top: 15px;
        padding: 8px 16px;
        background: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
      }
    \`;
    
    document.head.appendChild(styles);
  }
}

// Amazon用スクリプト初期化
if (window.location.hostname.includes('amazon.co.jp')) {
  const amazonScript = new AmazonContentScript();
}

// content-scripts/rakuten.js - 楽天用コンテンツスクリプト
class RakutenContentScript {
  constructor() {
    this.isEnabled = false;
    this.productData = null;
    
    this.init();
  }
  
  init() {
    this.setupMessageListener();
    this.extractProductData();
    this.createAnalysisWidget();
  }
  
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'extract_product_data':
          sendResponse(this.extractProductData());
          break;
        default:
          sendResponse({ success: false });
      }
      return true;
    });
  }
  
  extractProductData() {
    try {
      if (this.isProductPage()) {
        const itemCode = this.extractItemCode();
        const title = this.extractTitle();
        const price = this.extractPrice();
        const shopName = this.extractShopName();
        const rating = this.extractRating();
        const reviewCount = this.extractReviewCount();
        const availability = this.extractAvailability();
        
        this.productData = {
          platform: 'rakuten',
          itemCode,
          title,
          price,
          currency: 'JPY',
          shopName,
          rating,
          reviewCount,
          availability,
          url: window.location.href,
          extractedAt: new Date().toISOString()
        };
        
        return this.productData;
      }
      
      return null;
    } catch (error) {
      console.error('Rakuten product data extraction failed:', error);
      return null;
    }
  }
  
  isProductPage() {
    return window.location.pathname.includes('/item/') &&
           document.querySelector('.item_name') !== null;
  }
  
  extractItemCode() {
    const match = window.location.href.match(/\/item\/([^\/]+)\/([^\/\?]+)/);
    return match ? match[2] : null;
  }
  
  extractTitle() {
    const titleElement = document.querySelector('.item_name h1') || 
                        document.querySelector('.item_name');
    return titleElement ? titleElement.textContent.trim() : null;
  }
  
  extractPrice() {
    const priceSelectors = [
      '.price2',
      '.item_price .price',
      '.normalPrice .price'
    ];
    
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent.trim();
        const match = priceText.match(/[0-9,]+/);
        return match ? parseInt(match[0].replace(/,/g, '')) : null;
      }
    }
    
    return null;
  }
  
  extractShopName() {
    const shopElement = document.querySelector('.shop_name a') ||
                       document.querySelector('.shopOfTheYear a');
    return shopElement ? shopElement.textContent.trim() : null;
  }
  
  extractRating() {
    const ratingElement = document.querySelector('.star img');
    if (ratingElement && ratingElement.alt) {
      const match = ratingElement.alt.match(/([0-9.]+)/);
      return match ? parseFloat(match[1]) : null;
    }
    return null;
  }
  
  extractReviewCount() {
    const reviewElement = document.querySelector('.review_count a');
    if (reviewElement) {
      const match = reviewElement.textContent.match(/([0-9,]+)/);
      return match ? parseInt(match[1].replace(/,/g, '')) : null;
    }
    return null;
  }
  
  extractAvailability() {
    const stockElement = document.querySelector('.inventory_quantity') ||
                        document.querySelector('.attention_msg');
    return stockElement ? stockElement.textContent.trim() : null;
  }
  
  createAnalysisWidget() {
    if (document.getElementById('rakuten-ebay-widget')) return;
    
    const widget = document.createElement('div');
    widget.id = 'rakuten-ebay-widget';
    widget.className = 'rakuten-ebay-widget';
    widget.innerHTML = `
      <div class="widget-header">
        <h4>📈 eBay転売可能性</h4>
        <button id="analyze-ebay-btn" class="analyze-btn">分析開始</button>
      </div>
      <div id="analysis-results" class="analysis-results" style="display: none;">
        <div class="loading">分析中...</div>
      </div>
    `;
    
    // 商品情報エリアに挿入
    const insertTarget = document.querySelector('.item_price') ||
                        document.querySelector('.item_desc');
    
    if (insertTarget) {
      insertTarget.parentNode.insertBefore(widget, insertTarget.nextSibling);
      
      document.getElementById('analyze-ebay-btn').addEventListener('click', () => {
        this.analyzeEbayMarket();
      });
    }
    
    this.injectRakutenStyles();
  }
  
  async analyzeEbayMarket() {
    if (!this.productData) {
      alert('商品データを取得できませんでした');
      return;
    }
    
    const button = document.getElementById('analyze-ebay-btn');
    const results = document.getElementById('analysis-results');
    
    button.disabled = true;
    button.textContent = '分析中...';
    results.style.display = 'block';
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'research_product',
        productData: {
          title: this.productData.title,
          keywords: this.productData.title
        }
      });
      
      if (response.success) {
        this.displayAnalysisResults(response.data);
      }
    } catch (error) {
      results.innerHTML = `<div class="error">分析エラー: ${error.message}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = '再分析';
    }
  }
  
  displayAnalysisResults(data) {
    const results = document.getElementById('analysis-results');
    const rakutenPrice = this.productData.price;
    const avgEbayPrice = this.calculateAverageEbayPrice(data.items);
    const profitEstimate = this.estimateProfit(rakutenPrice, avgEbayPrice);
    
    results.innerHTML = `
      <div class="results-content">
        <div class="price-comparison">
          <div class="price-item">
            <span class="label">楽天価格:</span>
            <span class="price">¥${rakutenPrice?.toLocaleString() || 'N/A'}</span>
          </div>
          <div class="price-item">
            <span class="label">eBay平均:</span>
            <span class="price">${avgEbayPrice}</span>
          </div>
        </div>
        <div class="profit-estimate ${profitEstimate.profitable ? 'profitable' : 'unprofitable'}">
          <span class="label">予想利益:</span>
          <span class="profit">${profitEstimate.text}</span>
        </div>
        <div class="market-info">
          <span>eBay類似商品: ${data.totalResults}件</span>
        </div>
      </div>
    `;
  }
  
  calculateAverageEbayPrice(items) {
    const prices = items.filter(item => item.currentPrice?.value).map(item => item.currentPrice.value);
    if (prices.length === 0) return 'N/A';
    
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    return average.toFixed(2);
  }
  
  estimateProfit(rakutenPrice, ebayPriceUsd) {
    if (!rakutenPrice || ebayPriceUsd === 'N/A') {
      return { profitable: false, text: '計算不可' };
    }
    
    const exchangeRate = 142.50;
    const ebayPriceJpy = parseFloat(ebayPriceUsd) * exchangeRate;
    const grossProfit = ebayPriceJpy - rakutenPrice;
    const estimatedNetProfit = grossProfit * 0.7; // 手数料等を30%と仮定
    
    const profitable = estimatedNetProfit > 0;
    const text = profitable ? 
      `+¥${Math.round(estimatedNetProfit).toLocaleString()}` :
      `¥${Math.round(estimatedNetProfit).toLocaleString()}`;
    
    return { profitable, text };
  }
  
  injectRakutenStyles() {
    if (document.getElementById('rakuten-extension-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'rakuten-extension-styles';
    styles.textContent = `
      .rakuten-ebay-widget {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 15px;
        margin: 15px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .widget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }
      
      .widget-header h4 {
        margin: 0;
        color: #333;
        font-size: 16px;
      }
      
      .analyze-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      }
      
      .analyze-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      
      .analysis-results {
        border-top: 1px solid #dee2e6;
        padding-top: 15px;
      }
      
      .loading {
        text-align: center;
        color: #666;
        font-style: italic;
      }
      
      .price-comparison {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      
      .price-item {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .label {
        font-size: 12px;
        color: #666;
        margin-bottom: 2px;
      }
      
      .price {
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }
      
      .profit-estimate {
        text-align: center;
        padding: 10px;
        border-radius: 6px;
        margin-bottom: 10px;
      }
      
      .profit-estimate.profitable {
        background: #d4edda;
        color: #155724;
      }
      
      .profit-estimate.unprofitable {
        background: #f8d7da;
        color: #721c24;
      }
      
      .profit {
        font-size: 18px;
        font-weight: 700;
      }
      
      .market-info {
        text-align: center;
        font-size: 12px;
        color: #666;
      }
      
      .error {
        color: #721c24;
        background: #f8d7da;
        padding: 10px;
        border-radius: 6px;
        text-align: center;
      }
    `;
    
    document.head.appendChild(styles);
  }
}

// 楽天用スクリプト初期化
if (window.location.hostname.includes('rakuten.co.jp')) {
  const rakutenScript = new RakutenContentScript();
}

// content-scripts/mercari.js - メルカリ用コンテンツスクリプト
class MercariContentScript {
  constructor() {
    this.isEnabled = false;
    this.productData = null;
    
    this.init();
  }
  
  init() {
    this.setupMessageListener();
    this.extractProductData();
    this.createProfitCalculator();
  }
  
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'extract_product_data':
          sendResponse(this.extractProductData());
          break;
        default:
          sendResponse({ success: false });
      }
      return true;
    });
  }
  
  extractProductData() {
    try {
      if (this.isProductPage()) {
        const itemId = this.extractItemId();
        const title = this.extractTitle();
        const price = this.extractPrice();
        const condition = this.extractCondition();
        const seller = this.extractSeller();
        const category = this.extractCategory();
        const brand = this.extractBrand();
        const description = this.extractDescription();
        
        this.productData = {
          platform: 'mercari',
          itemId,
          title,
          price,
          currency: 'JPY',
          condition,
          seller,
          category,
          brand,
          description,
          url: window.location.href,
          extractedAt: new Date().toISOString()
        };
        
        return this.productData;
      }
      
      return null;
    } catch (error) {
      console.error('Mercari product data extraction failed:', error);
      return null;
    }
  }
  
  isProductPage() {
    return window.location.pathname.includes('/item/') &&
           document.querySelector('[data-testid="name"]') !== null;
  }
  
  extractItemId() {
    const match = window.location.href.match(/\/item\/m([0-9]+)/);
    return match ? match[1] : null;
  }
  
  extractTitle() {
    const titleElement = document.querySelector('[data-testid="name"]');
    return titleElement ? titleElement.textContent.trim() : null;
  }
  
  extractPrice() {
    const priceElement = document.querySelector('[data-testid="price"]');
    if (priceElement) {
      const priceText = priceElement.textContent.trim();
      const match = priceText.match(/[0-9,]+/);
      return match ? parseInt(match[0].replace(/,/g, '')) : null;
    }
    return null;
  }
  
  extractCondition() {
    const conditionElements = document.querySelectorAll('[data-testid="商品の状態"] + div');
    return conditionElements.length > 0 ? conditionElements[0].textContent.trim() : null;
  }
  
  extractSeller() {
    const sellerElement = document.querySelector('[data-testid="seller-name"]');
    return sellerElement ? sellerElement.textContent.trim() : null;
  }
  
  extractCategory() {
    const breadcrumbs = document.querySelectorAll('nav a');
    return breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 1].textContent.trim() : null;
  }
  
  extractBrand() {
    const brandElements = document.querySelectorAll('[data-testid="ブランド"] + div');
    return brandElements.length > 0 ? brandElements[0].textContent.trim() : null;
  }
  
  extractDescription() {
    const descElement = document.querySelector('[data-testid="description"]');
    return descElement ? descElement.textContent.trim().substring(0, 200) : null;
  }
  
  createProfitCalculator() {
    if (document.getElementById('mercari-profit-calc')) return;
    
    const calculator = document.createElement('div');
    calculator.id = 'mercari-profit-calc';
    calculator.className = 'mercari-profit-calc';
    calculator.innerHTML = `
      <div class="calc-header">
        <h4>💰 転売利益計算</h4>
        <button id="toggle-calc" class="toggle-btn">計算</button>
      </div>
      <div id="calc-content" class="calc-content" style="display: none;">
        <div class="input-group">
          <label>想定販売価格 (USD):</label>
          <input type="number" id="selling-price" placeholder="例: 50" step="0.01">
        </div>
        <div class="input-group">
          <label>為替レート (JPY/USD):</label>
          <input type="number" id="exchange-rate" value="142.50" step="0.01">
        </div>
        <button id="calculate-profit" class="calc-btn">利益を計算</button>
        <div id="profit-results" class="profit-results"></div>
      </div>
    `;
    
    // 価格表示エリアの近くに挿入
    const insertTarget = document.querySelector('[data-testid="price"]')?.parentElement;
    
    if (insertTarget) {
      insertTarget.appendChild(calculator);
      
      document.getElementById('toggle-calc').addEventListener('click', () => {
        this.toggleCalculator();
      });
      
      document.getElementById('calculate-profit').addEventListener('click', () => {
        this.calculateProfit();
      });
    }
    
    this.injectMercariStyles();
  }
  
  toggleCalculator() {
    const content = document.getElementById('calc-content');
    const button = document.getElementById('toggle-calc');
    
    if (content.style.display === 'none') {
      content.style.display = 'block';
      button.textContent = '閉じる';
    } else {
      content.style.display = 'none';
      button.textContent = '計算';
    }
  }
  
  calculateProfit() {
    const sellingPriceUsd = parseFloat(document.getElementById('selling-price').value);
    const exchangeRate = parseFloat(document.getElementById('exchange-rate').value);
    const mercariPrice = this.productData?.price;
    
    if (!sellingPriceUsd || !exchangeRate || !mercariPrice) {
      alert('全ての値を入力してください');
      return;
    }
    
    const sellingPriceJpy = sellingPriceUsd * exchangeRate;
    const ebayFees = sellingPriceUsd * 0.125; // 12.5%
    const paypalFees = sellingPriceUsd * 0.039 + 0.30; // 3.9% + $0.30
    const shippingCost = 3500; // 概算配送費
    const totalFeesJpy = (ebayFees + paypalFees) * exchangeRate + shippingCost;
    
    const grossProfit = sellingPriceJpy - mercariPrice;
    const netProfit = grossProfit - totalFeesJpy;
    const profitMargin = (netProfit / sellingPriceJpy) * 100;
    const roi = (netProfit / mercariPrice) * 100;
    
    const results = document.getElementById('profit-results');
    results.innerHTML = `
      <div class="calc-results">
        <h5>利益計算結果</h5>
        <div class="result-row">
          <span>総収入:</span>
          <span>¥${Math.round(sellingPriceJpy).toLocaleString()}</span>
        </div>
        <div class="result-row">
          <span>仕入価格:</span>
          <span>¥${mercariPrice.toLocaleString()}</span>
        </div>
        <div class="result-row">
          <span>手数料等:</span>
          <span>¥${Math.round(totalFeesJpy).toLocaleString()}</span>
        </div>
        <div class="result-row profit ${netProfit > 0 ? 'positive' : 'negative'}">
          <span>純利益:</span>
          <span>¥${Math.round(netProfit).toLocaleString()}</span>
        </div>
        <div class="result-row">
          <span>利益率:</span>
          <span>${profitMargin.toFixed(1)}%</span>
        </div>
        <div class="result-row">
          <span>ROI:</span>
          <span>${roi.toFixed(1)}%</span>
        </div>
      </div>
    `;
  }
  
  injectMercariStyles() {
    if (document.getElementById('mercari-extension-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'mercari-extension-styles';
    styles.textContent = `
      .mercari-profit-calc {
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 15px;
        margin: 15px 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .calc-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }
      
      .calc-header h4 {
        margin: 0;
        color: #333;
        font-size: 16px;
      }
      
      .toggle-btn, .calc-btn {
        background: #ff5722;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      }
      
      .calc-btn {
        width: 100%;
        margin-top: 15px;
      }
      
      .input-group {
        margin-bottom: 15px;
      }
      
      .input-group label {
        display: block;
        margin-bottom: 5px;
        color: #333;
        font-size: 14px;
        font-weight: 600;
      }
      
      .input-group input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
      }
      
      .calc-results {
        background: #f8f9fa;
        border-radius: 6px;
        padding: 15px;
        margin-top: 15px;
      }
      
      .calc-results h5 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 14px;
      }
      
      .result-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
      }
      
      .result-row.profit {
        font-weight: 700;
        font-size: 16px;
        border-top: 1px solid #ddd;
        padding-top: 8px;
        margin-top: 8px;
      }
      
      .result-row.positive {
        color: #4caf50;
      }
      
      .result-row.negative {
        color: #f44336;
      }
    `;
    
    document.head.appendChild(styles);
  }
}

// メルカリ用スクリプト初期化
if (window.location.hostname.includes('mercari.com')) {
  const mercariScript = new MercariContentScript();
}