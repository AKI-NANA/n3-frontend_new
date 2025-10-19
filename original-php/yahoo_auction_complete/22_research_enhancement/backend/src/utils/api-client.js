// frontend/js/api-client.js - APIクライアント統合
class ResearchAPIClient {
  constructor() {
    this.baseUrl = 'http://localhost:3000/api';
    this.token = localStorage.getItem('research_auth_token');
    this.user = JSON.parse(localStorage.getItem('research_user') || 'null');
    
    // 初期化時にトークン検証
    if (this.token) {
      this.verifyToken();
    }
  }
  
  // 基本HTTP リクエストメソッド
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      },
      ...options
    };
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      // 認証エラーの場合はログアウト
      if (response.status === 401) {
        this.handleAuthError();
        throw new Error('Authentication failed');
      }
      
      // レート制限エラーの場合
      if (response.status === 429) {
        this.showNotification('API制限に達しました。しばらく待ってから再試行してください。', 'warning');
        throw new Error('Rate limit exceeded');
      }
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      this.showNotification(`API エラー: ${error.message}`, 'error');
      throw error;
    }
  }
  
  // 認証関連メソッド
  async register(userData) {
    const response = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (response.success) {
      this.setAuthData(response.data.token, response.data.user);
      this.showNotification('登録が完了しました！', 'success');
    }
    
    return response;
  }
  
  async login(email, password, rememberMe = false) {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe })
    });
    
    if (response.success) {
      this.setAuthData(response.data.token, response.data.user);
      this.showNotification('ログインしました！', 'success');
    }
    
    return response;
  }
  
  async logout() {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      this.clearAuthData();
      this.showNotification('ログアウトしました。', 'info');
    }
  }
  
  async verifyToken() {
    if (!this.token) return false;
    
    try {
      const response = await this.makeRequest('/auth/verify-token', {
        method: 'POST'
      });
      
      if (response.success) {
        this.user = response.data.user;
        localStorage.setItem('research_user', JSON.stringify(this.user));
        return true;
      }
    } catch (error) {
      console.warn('Token verification failed:', error);
      this.clearAuthData();
    }
    
    return false;
  }
  
  // 研究関連メソッド
  async searchByKeyword(query, filters = {}, options = {}) {
    const response = await this.makeRequest('/research/search/keyword', {
      method: 'POST',
      body: JSON.stringify({ query, filters, options })
    });
    
    if (response.success) {
      this.showNotification(`${response.data.totalResults}件の商品が見つかりました`, 'success');
      
      // クォータ情報更新
      if (this.user) {
        this.user.apiQuota.remaining -= 1;
        localStorage.setItem('research_user', JSON.stringify(this.user));
        this.updateQuotaDisplay();
      }
    }
    
    return response;
  }
  
  async analyzeSeller(sellerUsername, filters = {}, options = {}) {
    const response = await this.makeRequest('/research/search/seller', {
      method: 'POST',
      body: JSON.stringify({ sellerUsername, filters, options })
    });
    
    if (response.success) {
      this.showNotification(`${sellerUsername}の分析が完了しました`, 'success');
    }
    
    return response;
  }
  
  async searchCompletedItems(query = '', filters = {}, options = {}) {
    const response = await this.makeRequest('/research/search/completed', {
      method: 'POST',
      body: JSON.stringify({ query, filters, options })
    });
    
    if (response.success) {
      this.showNotification(`${response.data.totalResults}件の売れた商品が見つかりました`, 'success');
    }
    
    return response;
  }
  
  async getItemDetails(itemId, includeSuppliers = false, includeProfitCalc = false) {
    const params = new URLSearchParams({
      includeSuppliers: includeSuppliers.toString(),
      includeProfitCalc: includeProfitCalc.toString()
    });
    
    return await this.makeRequest(`/research/item/${itemId}?${params}`);
  }
  
  async getResearchHistory(page = 1, limit = 20, filters = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    
    return await this.makeRequest(`/research/history?${params}`);
  }
  
  // ユーザー管理メソッド
  async getProfile() {
    return await this.makeRequest('/auth/profile');
  }
  
  async updateProfile(updates) {
    const response = await this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    
    if (response.success) {
      this.user = response.data;
      localStorage.setItem('research_user', JSON.stringify(this.user));
      this.showNotification('プロフィールを更新しました', 'success');
    }
    
    return response;
  }
  
  async changePassword(currentPassword, newPassword, confirmNewPassword) {
    const response = await this.makeRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword })
    });
    
    if (response.success) {
      this.showNotification('パスワードを変更しました', 'success');
    }
    
    return response;
  }
  
  // 認証データ管理
  setAuthData(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('research_auth_token', token);
    localStorage.setItem('research_user', JSON.stringify(user));
    this.updateAuthDisplay();
    this.updateQuotaDisplay();
  }
  
  clearAuthData() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('research_auth_token');
    localStorage.removeItem('research_user');
    this.updateAuthDisplay();
    this.updateQuotaDisplay();
  }
  
  handleAuthError() {
    this.clearAuthData();
    this.showNotification('認証が必要です。ログインしてください。', 'warning');
    
    // ログインモーダル表示
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
      loginModal.style.display = 'block';
    }
  }
  
  // UI更新メソッド
  updateAuthDisplay() {
    const loginSection = document.getElementById('loginSection');
    const userSection = document.getElementById('userSection');
    const userEmail = document.getElementById('userEmail');
    const subscriptionBadge = document.getElementById('subscriptionBadge');
    
    if (this.isAuthenticated()) {
      if (loginSection) loginSection.style.display = 'none';
      if (userSection) userSection.style.display = 'block';
      if (userEmail) userEmail.textContent = this.user.email;
      if (subscriptionBadge) {
        subscriptionBadge.textContent = this.user.subscriptionPlan.toUpperCase();
        subscriptionBadge.className = `subscription-badge ${this.user.subscriptionPlan}`;
      }
    } else {
      if (loginSection) loginSection.style.display = 'block';
      if (userSection) userSection.style.display = 'none';
    }
  }
  
  updateQuotaDisplay() {
    const quotaInfo = document.getElementById('quotaInfo');
    if (quotaInfo && this.isAuthenticated()) {
      const remaining = this.user.apiQuota.remaining;
      const daily = this.user.apiQuota.daily;
      const percentage = Math.round((remaining / daily) * 100);
      
      quotaInfo.innerHTML = `
        <div class="quota-bar">
          <div class="quota-fill" style="width: ${percentage}%"></div>
        </div>
        <small>API残量: ${remaining}/${daily}</small>
      `;
      
      // 残量が少ない場合の警告
      if (percentage < 20) {
        quotaInfo.className = 'quota-info warning';
      } else if (percentage < 50) {
        quotaInfo.className = 'quota-info caution';
      } else {
        quotaInfo.className = 'quota-info';
      }
    }
  }
  
  // 通知表示
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    const container = document.getElementById('notificationContainer') || document.body;
    container.appendChild(notification);
    
    // 自動削除
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }
  
  // ユーティリティメソッド
  isAuthenticated() {
    return !!(this.token && this.user);
  }
  
  getUser() {
    return this.user;
  }
  
  getSubscriptionPlan() {
    return this.user?.subscriptionPlan || 'free';
  }
}

// 既存UI関数の更新バージョン
class ResearchUIManager {
  constructor() {
    this.api = new ResearchAPIClient();
    this.currentResults = [];
    this.currentSession = null;
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.api.updateAuthDisplay();
    this.api.updateQuotaDisplay();
    
    // 認証状態確認
    if (this.api.isAuthenticated()) {
      this.api.verifyToken();
    }
  }
  
  setupEventListeners() {
    // 既存の検索フォーム統合
    const keywordForm = document.getElementById('keywordSearchForm');
    if (keywordForm) {
      keywordForm.addEventListener('submit', (e) => this.handleKeywordSearch(e));
    }
    
    const sellerForm = document.getElementById('sellerAnalysisForm');
    if (sellerForm) {
      sellerForm.addEventListener('submit', (e) => this.handleSellerAnalysis(e));
    }
    
    // 認証フォーム
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
    
    // ログアウトボタン
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }
  
  async handleKeywordSearch(event) {
    event.preventDefault();
    
    if (!this.api.isAuthenticated()) {
      this.api.showNotification('ログインが必要です', 'warning');
      return;
    }
    
    const formData = new FormData(event.target);
    const query = formData.get('query');
    const filters = {
      category: formData.get('category'),
      minPrice: formData.get('minPrice') ? parseFloat(formData.get('minPrice')) : undefined,
      maxPrice: formData.get('maxPrice') ? parseFloat(formData.get('maxPrice')) : undefined,
      condition: formData.getAll('condition'),
      sellerCountry: formData.get('sellerCountry'),
      limit: formData.get('limit') ? parseInt(formData.get('limit')) : 50
    };
    
    // 空の値を除去
    Object.keys(filters).forEach(key => {
      if (filters[key] === '' || filters[key] === undefined || 
          (Array.isArray(filters[key]) && filters[key].length === 0)) {
        delete filters[key];
      }
    });
    
    try {
      this.showLoading(true);
      
      const response = await this.api.searchByKeyword(query, filters, {
        saveResults: true
      });
      
      if (response.success) {
        this.currentResults = response.data.items;
        this.currentSession = response.data.session;
        this.displayResults(this.currentResults, 'keyword');
        this.showResultsControls();
      }
      
    } catch (error) {
      console.error('Keyword search failed:', error);
    } finally {
      this.showLoading(false);
    }
  }
  
  async handleSellerAnalysis(event) {
    event.preventDefault();
    
    if (!this.api.isAuthenticated()) {
      this.api.showNotification('ログインが必要です', 'warning');
      return;
    }
    
    const formData = new FormData(event.target);
    const sellerUsername = formData.get('sellerUsername');
    const filters = {
      includeCompleted: formData.get('includeCompleted') === 'true',
      category: formData.get('category'),
      limit: formData.get('limit') ? parseInt(formData.get('limit')) : 100
    };
    
    const options = {
      detailedAnalysis: formData.get('detailedAnalysis') === 'true',
      saveResults: true
    };
    
    try {
      this.showLoading(true);
      
      const response = await this.api.analyzeSeller(sellerUsername, filters, options);
      
      if (response.success) {
        const seller = response.data.seller;
        this.displaySellerAnalysis(seller);
        this.currentResults = seller.currentListings.items;
        this.currentSession = response.data.session;
      }
      
    } catch (error) {
      console.error('Seller analysis failed:', error);
    } finally {
      this.showLoading(false);
    }
  }
  
  async handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const rememberMe = formData.get('rememberMe') === 'true';
    
    try {
      const response = await this.api.login(email, password, rememberMe);
      
      if (response.success) {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
          loginModal.style.display = 'none';
        }
        
        // フォームリセット
        event.target.reset();
      }
      
    } catch (error) {
      console.error('Login failed:', error);
    }
  }
  
  async handleRegister(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
      subscriptionPlan: formData.get('subscriptionPlan') || 'free',
      agreeToTerms: formData.get('agreeToTerms') === 'true'
    };
    
    try {
      const response = await this.api.register(userData);
      
      if (response.success) {
        const registerModal = document.getElementById('registerModal');
        if (registerModal) {
          registerModal.style.display = 'none';
        }
        
        // フォームリセット
        event.target.reset();
      }
      
    } catch (error) {
      console.error('Registration failed:', error);
    }
  }
  
  async handleLogout() {
    try {
      await this.api.logout();
      
      // 結果をクリア
      this.currentResults = [];
      this.currentSession = null;
      this.clearResults();
      
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
  
  displayResults(items, searchType) {
    const resultsContainer = document.getElementById('resultsContainer');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = `
      <div class="results-header">
        <h3>${items.length}件の商品結果</h3>
        <div class="results-controls">
          <button onclick="researchUI.exportResults('csv')" class="btn-secondary">CSV出力</button>
          <button onclick="researchUI.exportResults('json')" class="btn-secondary">JSON出力</button>
        </div>
      </div>
      <div class="results-grid" id="resultsGrid">
        ${items.map(item => this.createResultCard(item)).join('')}
      </div>
    `;
  }
  
  createResultCard(item) {
    const price = item.currentPrice?.value || 0;
    const currency = item.currentPrice?.currency || 'USD';
    const soldQuantity = item.sellingStatus?.quantitySold || 0;
    const watchers = item.listingInfo?.watchCount || 0;
    
    return `
      <div class="result-card" data-item-id="${item.ebayItemId}">
        <div class="result-image">
          <img src="${item.galleryURL || item.pictureURLLarge || '/images/no-image.png'}" 
               alt="${item.title}" loading="lazy">
        </div>
        <div class="result-content">
          <h4 class="result-title">${item.title}</h4>
          <div class="result-price">${currency} $${price.toFixed(2)}</div>
          <div class="result-stats">
            <span class="stat">売上: ${soldQuantity}</span>
            <span class="stat">ウォッチ: ${watchers}</span>
          </div>
          <div class="result-seller">
            セラー: ${item.sellerInfo?.sellerUserName || 'Unknown'}
            (${item.country || 'Unknown'})
          </div>
          <div class="result-actions">
            <button onclick="researchUI.viewItemDetails('${item.ebayItemId}')" 
                    class="btn-primary btn-sm">詳細表示</button>
            <button onclick="researchUI.addToNotes('${item.ebayItemId}')" 
                    class="btn-secondary btn-sm">メモ追加</button>
          </div>
        </div>
      </div>
    `;
  }
  
  displaySellerAnalysis(sellerData) {
    const analysisContainer = document.getElementById('sellerAnalysisContainer');
    if (!analysisContainer) return;
    
    const seller = sellerData;
    const currentListings = seller.currentListings;
    const analysis = seller.analysis;
    
    analysisContainer.innerHTML = `
      <div class="seller-analysis">
        <h3>セラー分析: ${seller.username}</h3>
        
        <div class="seller-stats">
          <div class="stat-card">
            <h4>現在の出品数</h4>
            <div class="stat-value">${currentListings.totalResults}</div>
          </div>
          <div class="stat-card">
            <h4>平均価格</h4>
            <div class="stat-value">$${(analysis?.listingStats?.averageCurrentPrice || 0).toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <h4>売上成功率</h4>
            <div class="stat-value">${(analysis?.performanceMetrics?.successRate || 0).toFixed(1)}%</div>
          </div>
        </div>
        
        ${analysis?.categoryAnalysis ? `
          <div class="category-analysis">
            <h4>主要カテゴリ</h4>
            <div class="category-list">
              ${analysis.categoryAnalysis.topCategories.map(cat => 
                `<span class="category-tag">${cat.name} (${cat.count})</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  async viewItemDetails(itemId) {
    try {
      this.showLoading(true, 'アイテム詳細を取得中...');
      
      const response = await this.api.getItemDetails(itemId, true, true);
      
      if (response.success) {
        this.showItemDetailsModal(response.data);
      }
      
    } catch (error) {
      console.error('Failed to get item details:', error);
    } finally {
      this.showLoading(false);
    }
  }
  
  showItemDetailsModal(itemData) {
    const modal = document.getElementById('itemDetailsModal') || this.createItemDetailsModal();
    const modalContent = modal.querySelector('.modal-content');
    
    const ebayDetails = itemData.ebayDetails;
    const savedProduct = itemData.savedProduct;
    
    modalContent.innerHTML = `
      <div class="modal-header">
        <h3>商品詳細</h3>
        <button class="modal-close" onclick="this.closest('.modal').style.display='none'">&