// background.js - Service Worker
class ExtensionAPIManager {
  constructor() {
    this.baseUrl = 'http://localhost:3000/api';
    this.token = null;
    this.user = null;
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    this.init();
  }
  
  async init() {
    // 保存されたトークンとユーザー情報を復元
    const stored = await chrome.storage.local.get(['auth_token', 'user_data']);
    this.token = stored.auth_token;
    this.user = stored.user_data;
    
    // トークン検証
    if (this.token) {
      await this.verifyToken();
    }
    
    this.setupMessageListeners();
  }
  
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 非同期応答を示す
    });
  }
  
  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'authenticate':
          const authResult = await this.authenticate(request.credentials);
          sendResponse({ success: true, data: authResult });
          break;
          
        case 'research_product':
          const researchResult = await this.researchProduct(request.productData);
          sendResponse({ success: true, data: researchResult });
          break;
          
        case 'find_suppliers':
          const suppliersResult = await this.findSuppliers(request.productData);
          sendResponse({ success: true, data: suppliersResult });
          break;
          
        case 'calculate_profit':
          const profitResult = await this.calculateProfit(request.calculationData);
          sendResponse({ success: true, data: profitResult });
          break;
          
        case 'get_user_data':
          sendResponse({ success: true, data: { user: this.user, authenticated: !!this.token } });
          break;
          
        case 'logout':
          await this.logout();
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      },
      ...options
    };
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          await this.logout();
          throw new Error('Authentication required');
        }
        throw new Error(data.message || `HTTP error ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
  
  async authenticate(credentials) {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    if (response.success) {
      this.token = response.data.token;
      this.user = response.data.user;
      
      await chrome.storage.local.set({
        auth_token: this.token,
        user_data: this.user
      });
      
      // アクティブなタブに認証状態を通知
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'auth_status_changed',
            authenticated: true,
            user: this.user
          });
        }
      });
    }
    
    return response;
  }
  
  async verifyToken() {
    if (!this.token) return false;
    
    try {
      const response = await this.makeRequest('/auth/verify-token', {
        method: 'POST'
      });
      
      if (response.success) {
        this.user = response.data.user;
        await chrome.storage.local.set({ user_data: this.user });
        return true;
      }
    } catch (error) {
      console.warn('Token verification failed:', error);
      await this.logout();
    }
    
    return false;
  }
  
  async logout() {
    if (this.token) {
      try {
        await this.makeRequest('/auth/logout', { method: 'POST' });
      } catch (error) {
        console.warn('Logout request failed:', error);
      }
    }
    
    this.token = null;
    this.user = null;
    
    await chrome.storage.local.remove(['auth_token', 'user_data']);
    
    // アクティブなタブに認証状態を通知
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'auth_status_changed',
          authenticated: false
        });
      }
    });
  }
  
  async researchProduct(productData) {
    if (!this.isAuthenticated()) {
      throw new Error('Authentication required');
    }
    
    // キーワード検索実行
    const response = await this.makeRequest('/research/search/keyword', {
      method: 'POST',
      body: JSON.stringify({
        query: productData.title || productData.keywords,
        filters: {
          category: productData.category,
          minPrice: productData.minPrice,
          maxPrice: productData.maxPrice,
          limit: 20
        },
        options: {
          saveResults: true
        }
      })
    });
    
    return response;
  }
  
  async findSuppliers(productData) {
    if (!this.isAuthenticated()) {
      throw new Error('Authentication required');
    }
    
    // 商品を一時保存
    const productResponse = await this.makeRequest('/products', {
      method: 'POST',
      body: JSON.stringify({
        ebayTitle: productData.title,
        ebayItemId: productData.itemId,
        ebaySellingPrice: productData.price,
        ebayCurrency: productData.currency,
        ebayListingUrl: productData.url,
        brand: productData.brand,
        model: productData.model,
        status: 'active'
      })
    });
    
    if (!productResponse.success) {
      throw new Error('Failed to save product');
    }
    
    const productId = productResponse.data.id;
    
    // 仕入先検索実行
    const suppliersResponse = await this.makeRequest(`/suppliers/search/${productId}`, {
      method: 'POST',
      body: JSON.stringify({
        options: {
          bypassCache: false,
          maxResults: 20
        }
      })
    });
    
    return suppliersResponse;
  }
  
  async calculateProfit(calculationData) {
    if (!this.isAuthenticated()) {
      throw new Error('Authentication required');
    }
    
    const response = await this.makeRequest('/profits/calculate', {
      method: 'POST',
      body: JSON.stringify(calculationData)
    });
    
    return response;
  }
  
  isAuthenticated() {
    return !!(this.token && this.user);
  }
  
  // リクエストキューイング（レート制限対応）
  async queueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }
  
  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const { requestFn, resolve, reject } = this.requestQueue.shift();
      
      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
      
      // レート制限対応のため少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    this.isProcessingQueue = false;
  }
}

// グローバルインスタンス作成
const apiManager = new ExtensionAPIManager();

// インストール/アップデート時の処理
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Research Tool Extension installed');
    chrome.tabs.create({ url: 'http://localhost:8080' });
  } else if (details.reason === 'update') {
    console.log('Research Tool Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// タブ更新時の処理
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // サポートされているサイトかチェック
    const supportedSites = [
      'ebay.com',
      'amazon.co.jp',
      'rakuten.co.jp',
      'mercari.com',
      'shopping.yahoo.co.jp'
    ];
    
    const isSupported = supportedSites.some(site => tab.url.includes(site));
    
    if (isSupported) {
      // コンテンツスクリプトに認証状態を送信
      chrome.tabs.sendMessage(tabId, {
        action: 'extension_ready',
        authenticated: apiManager.isAuthenticated(),
        user: apiManager.user
      });
    }
  }
});

// popup.html - 拡張機能ポップアップ
const popupHTML = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>リサーチツール</title>
    <style>
        body {
            width: 350px;
            min-height: 400px;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .container {
            padding: 20px;
            color: white;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .subtitle {
            font-size: 12px;
            opacity: 0.8;
        }
        
        .auth-section {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .user-info {
            display: none;
        }
        
        .login-form {
            display: block;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-size: 14px;
        }
        
        input {
            width: 100%;
            padding: 8px;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            box-sizing: border-box;
        }
        
        .btn {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: #4CAF50;
            color: white;
        }
        
        .btn-primary:hover {
            background: #45a049;
        }
        
        .btn-secondary {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            margin-top: 10px;
        }
        
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        .actions {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .action-btn {
            display: block;
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            border: none;
            border-radius: 5px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .action-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        .action-btn:last-child {
            margin-bottom: 0;
        }
        
        .status {
            text-align: center;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            font-size: 14px;
        }
        
        .status.success {
            background: rgba(76, 175, 80, 0.3);
        }
        
        .status.error {
            background: rgba(244, 67, 54, 0.3);
        }
        
        .status.info {
            background: rgba(33, 150, 243, 0.3);
        }
        
        .quota-info {
            text-align: center;
            font-size: 12px;
            opacity: 0.8;
            margin-top: 10px;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .spinner {
            width: 30px;
            height: 30px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .hidden {
            display: none !important;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔍 リサーチツール</div>
            <div class="subtitle">eBay×国内EC統合プラットフォーム</div>
        </div>
        
        <div id="statusMessage" class="status hidden"></div>
        
        <div class="auth-section">
            <div id="loginForm" class="login-form">
                <div class="form-group">
                    <label for="email">メールアドレス</label>
                    <input type="email" id="email" placeholder="user@example.com">
                </div>
                <div class="form-group">
                    <label for="password">パスワード</label>
                    <input type="password" id="password" placeholder="パスワード">
                </div>
                <button id="loginBtn" class="btn btn-primary">ログイン</button>
                <button id="openWebBtn" class="btn btn-secondary">Webで開く</button>
            </div>
            
            <div id="userInfo" class="user-info">
                <div>ログイン中: <span id="userEmail"></span></div>
                <div>プラン: <span id="userPlan"></span></div>
                <div class="quota-info">
                    API残量: <span id="quotaRemaining">-</span>/<span id="quotaDaily">-</span>
                </div>
                <button id="logoutBtn" class="btn btn-secondary">ログアウト</button>
            </div>
        </div>
        
        <div id="actions" class="actions hidden">
            <button id="analyzePageBtn" class="action-btn">📊 このページを分析</button>
            <button id="findSuppliersBtn" class="action-btn">🔍 仕入先を検索</button>
            <button id="calculateProfitBtn" class="action-btn">💰 利益を計算</button>
            <button id="openDashboardBtn" class="action-btn">📈 ダッシュボード</button>
        </div>
        
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <div>処理中...</div>
        </div>
    </div>
    
    <script src="popup.js"></script>
</body>
</html>
`;

// popup.js - ポップアップスクリプト
const popupJS = `
class PopupManager {
  constructor() {
    this.authenticated = false;
    this.user = null;
    this.currentTab = null;
    
    this.init();
  }
  
  async init() {
    await this.getCurrentTab();
    await this.checkAuthStatus();
    this.setupEventListeners();
    this.updateUI();
  }
  
  async getCurrentTab() {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    this.currentTab = tabs[0];
  }
  
  async checkAuthStatus() {
    try {
      const response = await this.sendMessage({ action: 'get_user_data' });
      if (response.success) {
        this.authenticated = response.data.authenticated;
        this.user = response.data.user;
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    }
  }
  
  setupEventListeners() {
    document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
    document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
    document.getElementById('openWebBtn').addEventListener('click', () => this.openWebApp());
    
    document.getElementById('analyzePageBtn').addEventListener('click', () => this.analyzePage());
    document.getElementById('findSuppliersBtn').addEventListener('click', () => this.findSuppliers());
    document.getElementById('calculateProfitBtn').addEventListener('click', () => this.calculateProfit());
    document.getElementById('openDashboardBtn').addEventListener('click', () => this.openDashboard());
    
    // Enter キーでログイン
    document.getElementById('password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleLogin();
      }
    });
  }
  
  async handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      this.showStatus('メールアドレスとパスワードを入力してください', 'error');
      return;
    }
    
    this.showLoading(true);
    
    try {
      const response = await this.sendMessage({
        action: 'authenticate',
        credentials: { email, password }
      });
      
      if (response.success) {
        this.authenticated = true;
        this.user = response.data.user;
        this.updateUI();
        this.showStatus('ログインしました', 'success');
      } else {
        this.showStatus('ログインに失敗しました', 'error');
      }
    } catch (error) {
      this.showStatus(\`ログインエラー: \${error.message}\`, 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  async handleLogout() {
    this.showLoading(true);
    
    try {
      await this.sendMessage({ action: 'logout' });
      this.authenticated = false;
      this.user = null;
      this.updateUI();
      this.showStatus('ログアウトしました', 'info');
    } catch (error) {
      this.showStatus(\`ログアウトエラー: \${error.message}\`, 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  async analyzePage() {
    if (!this.currentTab) return;
    
    this.showLoading(true);
    
    try {
      // コンテンツスクリプトに商品データの抽出を要求
      const productData = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'extract_product_data'
      });
      
      if (productData) {
        const response = await this.sendMessage({
          action: 'research_product',
          productData: productData
        });
        
        if (response.success) {
          this.showStatus(\`\${response.data.totalResults}件の類似商品が見つかりました\`, 'success');
        }
      } else {
        this.showStatus('商品データを取得できませんでした', 'error');
      }
    } catch (error) {
      this.showStatus(\`分析エラー: \${error.message}\`, 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  async findSuppliers() {
    if (!this.currentTab) return;
    
    this.showLoading(true);
    
    try {
      const productData = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'extract_product_data'
      });
      
      if (productData) {
        const response = await this.sendMessage({
          action: 'find_suppliers',
          productData: productData
        });
        
        if (response.success) {
          this.showStatus(\`\${response.data.suppliers.length}件の仕入先が見つかりました\`, 'success');
        }
      }
    } catch (error) {
      this.showStatus(\`仕入先検索エラー: \${error.message}\`, 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  async calculateProfit() {
    this.showStatus('利益計算機能は開発中です', 'info');
  }
  
  openWebApp() {
    chrome.tabs.create({ url: 'http://localhost:8080' });
  }
  
  openDashboard() {
    chrome.tabs.create({ url: 'http://localhost:8080/#dashboard' });
  }
  
  updateUI() {
    const loginForm = document.getElementById('loginForm');
    const userInfo = document.getElementById('userInfo');
    const actions = document.getElementById('actions');
    
    if (this.authenticated && this.user) {
      loginForm.classList.add('hidden');
      userInfo.classList.remove('hidden');
      actions.classList.remove('hidden');
      
      document.getElementById('userEmail').textContent = this.user.email;
      document.getElementById('userPlan').textContent = this.user.subscriptionPlan.toUpperCase();
      document.getElementById('quotaRemaining').textContent = this.user.apiQuota.remaining;
      document.getElementById('quotaDaily').textContent = this.user.apiQuota.daily;
    } else {
      loginForm.classList.remove('hidden');
      userInfo.classList.add('hidden');
      actions.classList.add('hidden');
    }
  }
  
  showStatus(message, type) {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = \`status \${type}\`;
    statusElement.classList.remove('hidden');
    
    setTimeout(() => {
      statusElement.classList.add('hidden');
    }, 3000);
  }
  
  showLoading(show) {
    const loading = document.getElementById('loading');
    const container = document.querySelector('.container > *:not(#loading)');
    
    if (show) {
      loading.classList.remove('hidden');
      container.style.opacity = '0.5';
    } else {
      loading.classList.add('hidden');
      container.style.opacity = '1';
    }
  }
  
  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Unknown error'));
        }
      });
    });
  }
}

// ポップアップ初期化
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
`;