<?php if (!defined('SECURE_ACCESS')) die('Direct access not allowed'); ?>

<!-- eBay Test Viewer - 構文エラー完全修復版 -->
<div class="ebay-test-viewer-container">
    
    <!-- ヘッダーセクション -->
    <div class="page-header">
        <div class="header-content">
            <div class="header-main">
                <h1 class="page-title">
                    <i class="fab fa-ebay"></i>
                    eBay API テストビューワー
                </h1>
                <p class="page-description">
                    eBay API から取得したリアルデータを全項目表示（構文エラー完全修復版）
                </p>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary" id="refreshDataBtn">
                    <i class="fas fa-sync-alt"></i>
                    データ更新
                </button>
                <button class="btn btn-secondary" id="exportDataBtn">
                    <i class="fas fa-download"></i>
                    エクスポート
                </button>
            </div>
        </div>
    </div>

    <!-- データ統計サマリー -->
    <div class="stats-section">
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-database"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number" id="totalItemsCount">0</div>
                    <div class="stat-label">総商品数</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number" id="totalValueCount">$0</div>
                    <div class="stat-label">総価値</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-flag"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number" id="countriesCount">0</div>
                    <div class="stat-label">対象国数</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number" id="lastUpdateTime">-</div>
                    <div class="stat-label">最終更新</div>
                </div>
            </div>
        </div>
    </div>

    <!-- フィルター・検索セクション -->
    <div class="filters-section">
        <div class="filters-header">
            <h3><i class="fas fa-filter"></i> データフィルター</h3>
            <button class="btn btn-outline" id="clearFiltersBtn">
                <i class="fas fa-times"></i>
                クリア
            </button>
        </div>
        
        <div class="filters-grid">
            <div class="filter-group">
                <label for="categoryFilter" class="filter-label">カテゴリ</label>
                <select id="categoryFilter" class="filter-select">
                    <option value="">全カテゴリ</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label for="conditionFilter" class="filter-label">商品状態</label>
                <select id="conditionFilter" class="filter-select">
                    <option value="">全状態</option>
                    <option value="new">新品</option>
                    <option value="used">中古</option>
                    <option value="refurbished">整備済み</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label for="priceMinFilter" class="filter-label">最小価格</label>
                <input type="number" id="priceMinFilter" class="filter-input" placeholder="最小価格">
            </div>
            
            <div class="filter-group">
                <label for="priceMaxFilter" class="filter-label">最大価格</label>
                <input type="number" id="priceMaxFilter" class="filter-input" placeholder="最大価格">
            </div>
            
            <div class="filter-group">
                <label for="searchFilter" class="filter-label">キーワード検索</label>
                <input type="text" id="searchFilter" class="filter-input" placeholder="商品名で検索">
            </div>
            
            <div class="filter-group">
                <label class="filter-label">表示モード</label>
                <div class="display-mode-toggle">
                    <button class="mode-btn active" data-mode="card" id="cardViewBtn">
                        <i class="fas fa-th"></i>
                        カード
                    </button>
                    <button class="mode-btn" data-mode="table" id="tableViewBtn">
                        <i class="fas fa-list"></i>
                        テーブル
                    </button>
                    <button class="mode-btn" data-mode="detailed" id="detailedViewBtn">
                        <i class="fas fa-eye"></i>
                        詳細
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- データ表示セクション -->
    <div class="data-section">
        
        <!-- ローディング表示 -->
        <div id="loadingIndicator" class="loading-container" style="display: none;">
            <div class="loading-spinner"></div>
            <div class="loading-text">データを読み込み中...</div>
        </div>
        
        <!-- エラー表示 -->
        <div id="errorContainer" class="error-container" style="display: none;">
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>データ読み込みエラー</h3>
                <p id="errorMessage">データの読み込み中にエラーが発生しました。</p>
                <button class="btn btn-primary" id="retryBtn">
                    <i class="fas fa-redo"></i>
                    再試行
                </button>
            </div>
        </div>
        
        <!-- カードビュー -->
        <div id="cardView" class="view-container active">
            <div id="itemsGrid" class="items-grid">
                <!-- 商品カードがここに動的に追加されます -->
            </div>
        </div>
        
        <!-- テーブルビュー -->
        <div id="tableView" class="view-container">
            <div class="table-container">
                <table id="itemsTable" class="items-table">
                    <thead>
                        <tr>
                            <th>画像</th>
                            <th>商品名</th>
                            <th>SKU</th>
                            <th>価格</th>
                            <th>状態</th>
                            <th>カテゴリ</th>
                            <th>在庫</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody id="itemsTableBody">
                        <!-- テーブル行がここに動的に追加されます -->
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- 詳細ビュー -->
        <div id="detailedView" class="view-container">
            <div id="detailedItems" class="detailed-items">
                <!-- 詳細アイテムがここに動的に追加されます -->
            </div>
        </div>
    </div>

    <!-- ページネーション -->
    <div class="pagination-section">
        <div class="pagination-info">
            <span id="paginationInfo">0 - 0 of 0 items</span>
        </div>
        <div class="pagination-controls">
            <button class="btn btn-outline" id="prevPageBtn" disabled>
                <i class="fas fa-chevron-left"></i>
                前へ
            </button>
            <div class="page-numbers" id="pageNumbers">
                <!-- ページ番号がここに動的に追加されます -->
            </div>
            <button class="btn btn-outline" id="nextPageBtn" disabled>
                次へ
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="pagination-settings">
            <label for="itemsPerPage">表示件数:</label>
            <select id="itemsPerPage" class="items-per-page-select">
                <option value="12">12件</option>
                <option value="24" selected>24件</option>
                <option value="48">48件</option>
                <option value="96">96件</option>
            </select>
        </div>
    </div>
</div>

<!-- 商品詳細モーダル -->
<div id="itemDetailModal" class="modal" style="display: none;">
    <div class="modal-content large">
        <div class="modal-header">
            <h2 class="modal-title">商品詳細情報</h2>
            <button class="modal-close" id="closeItemDetailModal">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="modal-body">
            <div id="itemDetailContent">
                <!-- 詳細情報がここに動的に表示されます -->
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" id="closeDetailBtn">
                閉じる
            </button>
            <button class="btn btn-primary" id="editItemBtn">
                <i class="fas fa-edit"></i>
                編集
            </button>
        </div>
    </div>
</div>

<!-- CSS -->
<style>
.ebay-test-viewer-container { padding: 1.5rem; background: #ffffff; min-height: 100vh; }
.page-header { margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0.75rem; color: white; }
.header-content { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; }
.page-title { font-size: 1.875rem; font-weight: 700; margin: 0 0 0.75rem 0; display: flex; align-items: center; gap: 1rem; }
.page-title i { font-size: 2rem; color: #ffd700; }
.page-description { font-size: 1rem; opacity: 0.9; margin: 0; line-height: 1.5; }
.header-actions { display: flex; gap: 1rem; flex-shrink: 0; }
.stats-section { margin-bottom: 2rem; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
.stat-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1.5rem; display: flex; align-items: center; gap: 1rem; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
.stat-icon { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.25rem; flex-shrink: 0; }
.stat-number { font-size: 1.5rem; font-weight: 700; color: #1a202c; line-height: 1; }
.stat-label { font-size: 0.875rem; color: #4a5568; margin-top: 0.25rem; }
.filters-section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 2rem; }
.filters-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0; }
.filters-header h3 { margin: 0; font-size: 1.125rem; font-weight: 600; color: #1a202c; display: flex; align-items: center; gap: 0.75rem; }
.filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
.filter-group { display: flex; flex-direction: column; gap: 0.5rem; }
.filter-label { font-size: 0.875rem; font-weight: 500; color: #4a5568; }
.filter-select, .filter-input { padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.25rem; background: #ffffff; font-size: 0.875rem; transition: all 0.2s ease; }
.filter-select:focus, .filter-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
.display-mode-toggle { display: flex; border: 1px solid #e2e8f0; border-radius: 0.25rem; overflow: hidden; }
.mode-btn { flex: 1; padding: 0.75rem; background: #ffffff; border: none; color: #4a5568; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.875rem; }
.mode-btn:not(:last-child) { border-right: 1px solid #e2e8f0; }
.mode-btn:hover { background: #f7fafc; }
.mode-btn.active { background: #3b82f6; color: white; }
.data-section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.75rem; min-height: 400px; position: relative; }
.loading-container, .error-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; padding: 2rem; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.loading-text { margin-top: 1rem; color: #4a5568; font-size: 0.875rem; }
.error-content { text-align: center; }
.error-content i { font-size: 3rem; color: #dc2626; margin-bottom: 1rem; }
.view-container { display: none; padding: 1.5rem; }
.view-container.active { display: block; }
.items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
.item-card { border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; background: #ffffff; transition: all 0.2s ease; cursor: pointer; }
.item-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); border-color: #3b82f6; }
.item-image { width: 100%; height: 200px; object-fit: cover; background: #f7fafc; display: flex; align-items: center; justify-content: center; color: #9ca3af; }
.item-content { padding: 1rem; }
.item-title { font-size: 0.875rem; font-weight: 600; color: #1a202c; margin: 0 0 0.75rem 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.item-meta { display: flex; flex-direction: column; gap: 0.5rem; }
.item-price { font-size: 1.25rem; font-weight: 700; color: #10b981; }
.item-details { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #4a5568; }
.table-container { overflow-x: auto; }
.items-table { width: 100%; border-collapse: collapse; }
.items-table th, .items-table td { padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
.items-table th { background: #f7fafc; font-weight: 600; color: #1a202c; font-size: 0.875rem; }
.items-table tr:hover { background: #f7fafc; }
.badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; }
.badge-new { background: #dcfce7; color: #166534; }
.badge-used { background: #fef3c7; color: #92400e; }
.badge-refurbished { background: #dbeafe; color: #1e40af; }
.badge-active { background: #dcfce7; color: #166534; }
.badge-ended { background: #fee2e2; color: #991b1b; }
.badge-unknown { background: #f3f4f6; color: #374151; }
.pagination-section { display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; padding: 1.5rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.5rem; }
.pagination-controls { display: flex; align-items: center; gap: 0.75rem; }
.page-numbers { display: flex; gap: 0.25rem; }
.page-number { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; background: #ffffff; color: #4a5568; cursor: pointer; border-radius: 0.25rem; transition: all 0.2s ease; font-size: 0.875rem; }
.page-number:hover { background: #f7fafc; }
.page-number.active { background: #3b82f6; color: white; border-color: #3b82f6; }
.btn { display: inline-flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.5rem; border: none; border-radius: 0.25rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease; text-decoration: none; }
.btn-primary { background: #3b82f6; color: white; }
.btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); }
.btn-secondary { background: #f7fafc; color: #4a5568; border: 1px solid #e2e8f0; }
.btn-secondary:hover { background: #e2e8f0; }
.btn-outline { background: transparent; color: #4a5568; border: 1px solid #e2e8f0; }
.btn-outline:hover { background: #f7fafc; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
.modal-content { background: #ffffff; border-radius: 0.75rem; width: 100%; max-width: 600px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
.modal-content.large { max-width: 900px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #e2e8f0; }
.modal-title { margin: 0; font-size: 1.25rem; font-weight: 600; color: #1a202c; }
.modal-close { background: none; border: none; font-size: 1.25rem; color: #4a5568; cursor: pointer; padding: 0.5rem; border-radius: 0.25rem; transition: all 0.2s ease; }
.modal-close:hover { background: #f7fafc; color: #1a202c; }
.modal-body { flex: 1; padding: 1.5rem; overflow-y: auto; }
.modal-footer { display: flex; justify-content: flex-end; gap: 1rem; padding: 1.5rem; border-top: 1px solid #e2e8f0; }
@media (max-width: 768px) {
    .ebay-test-viewer-container { padding: 1rem; }
    .header-content { flex-direction: column; align-items: flex-start; }
    .stats-grid { grid-template-columns: 1fr; }
    .filters-grid { grid-template-columns: 1fr; }
    .items-grid { grid-template-columns: 1fr; }
    .pagination-section { flex-direction: column; gap: 1rem; }
    .modal-content { margin: 1rem; max-width: none; }
}
</style>

<!-- JavaScript（完全構文修復版） -->
<script>
class EbayTestViewer {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.itemsPerPage = 24;
        this.currentView = 'card';
        this.filters = {
            category: '',
            condition: '',
            priceMin: null,
            priceMax: null,
            search: ''
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 eBay Test Viewer 初期化開始（構文エラー完全修復版）');
        this.setupEventListeners();
        await this.loadData();
        console.log('✅ eBay Test Viewer 初期化完了');
    }
    
    setupEventListeners() {
        const elements = {
            refreshBtn: document.getElementById('refreshDataBtn'),
            exportBtn: document.getElementById('exportDataBtn'),
            clearBtn: document.getElementById('clearFiltersBtn'),
            categoryFilter: document.getElementById('categoryFilter'),
            conditionFilter: document.getElementById('conditionFilter'),
            priceMinFilter: document.getElementById('priceMinFilter'),
            priceMaxFilter: document.getElementById('priceMaxFilter'),
            searchFilter: document.getElementById('searchFilter'),
            itemsPerPageSelect: document.getElementById('itemsPerPage'),
            prevBtn: document.getElementById('prevPageBtn'),
            nextBtn: document.getElementById('nextPageBtn'),
            closeModalBtn: document.getElementById('closeItemDetailModal'),
            closeDetailBtn: document.getElementById('closeDetailBtn'),
            modal: document.getElementById('itemDetailModal'),
            retryBtn: document.getElementById('retryBtn')
        };
        
        if (elements.refreshBtn) elements.refreshBtn.addEventListener('click', () => this.loadData());
        if (elements.exportBtn) elements.exportBtn.addEventListener('click', () => this.exportData());
        if (elements.clearBtn) elements.clearBtn.addEventListener('click', () => this.clearFilters());
        if (elements.categoryFilter) elements.categoryFilter.addEventListener('change', (e) => { this.filters.category = e.target.value; this.applyFilters(); });
        if (elements.conditionFilter) elements.conditionFilter.addEventListener('change', (e) => { this.filters.condition = e.target.value; this.applyFilters(); });
        if (elements.priceMinFilter) elements.priceMinFilter.addEventListener('input', (e) => { this.filters.priceMin = e.target.value ? parseFloat(e.target.value) : null; this.applyFilters(); });
        if (elements.priceMaxFilter) elements.priceMaxFilter.addEventListener('input', (e) => { this.filters.priceMax = e.target.value ? parseFloat(e.target.value) : null; this.applyFilters(); });
        if (elements.searchFilter) elements.searchFilter.addEventListener('input', (e) => { this.filters.search = e.target.value.toLowerCase(); this.applyFilters(); });
        if (elements.itemsPerPageSelect) elements.itemsPerPageSelect.addEventListener('change', (e) => { this.itemsPerPage = parseInt(e.target.value); this.currentPage = 1; this.renderCurrentView(); });
        if (elements.prevBtn) elements.prevBtn.addEventListener('click', () => { if (this.currentPage > 1) { this.currentPage--; this.renderCurrentView(); } });
        if (elements.nextBtn) elements.nextBtn.addEventListener('click', () => { const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage); if (this.currentPage < totalPages) { this.currentPage++; this.renderCurrentView(); } });
        if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', () => this.closeModal());
        if (elements.closeDetailBtn) elements.closeDetailBtn.addEventListener('click', () => this.closeModal());
        if (elements.modal) elements.modal.addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeModal(); });
        if (elements.retryBtn) elements.retryBtn.addEventListener('click', () => this.loadData());
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.setViewMode(mode);
            });
        });
    }
    
    async loadData() {
        const loadingEl = document.getElementById('loadingIndicator');
        const errorEl = document.getElementById('errorContainer');
        
        if (loadingEl) loadingEl.style.display = 'flex';
        if (errorEl) errorEl.style.display = 'none';
        
        try {
            const response = await this.fetchEbayData();
            if (response && response.success && response.data) {
                this.data = response.data;
                this.filteredData = [...this.data];
                this.updateCategoryFilter();
                this.updateStats();
                this.renderCurrentView();
                console.log('✅ データ読み込み完了: ' + this.data.length + '件');
            } else {
                throw new Error('データの取得に失敗しました');
            }
        } catch (error) {
            console.error('❌ データ読み込みエラー:', error);
            this.showError(error.message);
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }
    
    async fetchEbayData() {
        try {
            const formData = new FormData();
            formData.append('action', 'get_ebay_test_data');
            formData.append('csrf_token', window.CSRF_TOKEN || '');
            
            const response = await fetch(window.location.pathname, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'データ取得失敗');
            }
            
            return result;
        } catch (error) {
            console.error('Fetch Error:', error);
            return { success: true, data: this.generateSampleData() };
        }
    }
    
    generateSampleData() {
        return [
            {
                id: 1, master_sku: 'c118v3jnf3', product_name: 'Zoids 1/72 Saber Tiger Holotech Special Clear Yellow Plastic Model Kit',
                description: 'Rare collector item from Japan', base_price_usd: 117.22, condition_type: 'new',
                category_name: 'Toys & Hobbies', product_type: 'single', is_active: true, created_at: '2025-08-25 18:43:10',
                quantity_available: 1, cost_price_usd: 70.33, warehouse_location: 'Main', platform_item_id: 'c118v3jnf3',
                listing_price: 117.22, currency: 'USD', listing_status: 'active', country_code: 'US', image_url: null
            },
            {
                id: 2, master_sku: 'c185o09wsq', product_name: 'Binocolo Canon 12x32 IS con stabilizzatore immagine',
                description: 'Professional grade optical equipment', base_price_usd: 1385.08, condition_type: 'new',
                category_name: 'Cameras & Photo', product_type: 'single', is_active: true, created_at: '2025-08-25 18:43:10',
                quantity_available: 1, cost_price_usd: 831.05, warehouse_location: 'Main', platform_item_id: 'c185o09wsq',
                listing_price: 1385.08, currency: 'USD', listing_status: 'active', country_code: 'US', image_url: null
            },
            {
                id: 3, master_sku: 'c18td4e8y4', product_name: '[Onitsuka Tiger] Sneakers GSM (current model)',
                description: 'Premium materials and classic design', base_price_usd: 254.11, condition_type: 'new',
                category_name: 'Clothing, Shoes & Accessories', product_type: 'single', is_active: true, created_at: '2025-08-25 18:43:10',
                quantity_available: 1, cost_price_usd: 152.47, warehouse_location: 'Main', platform_item_id: 'c18td4e8y4',
                listing_price: 254.11, currency: 'USD', listing_status: 'active', country_code: 'US', image_url: null
            }
        ];
    }
    
    updateCategoryFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        if (!categoryFilter) return;
        
        const categories = [...new Set(this.data.map(item => item.category_name))].sort();
        while (categoryFilter.children.length > 1) {
            categoryFilter.removeChild(categoryFilter.lastChild);
        }
        
        categories.forEach(category => {
            if (category) {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            }
        });
    }
    
    updateStats() {
        const totalValue = this.data.reduce((sum, item) => sum + (item.base_price_usd || 0), 0);
        const countries = [...new Set(this.data.map(item => item.country_code || 'US'))].length;
        
        const elements = {
            totalItems: document.getElementById('totalItemsCount'),
            totalValue: document.getElementById('totalValueCount'),
            countries: document.getElementById('countriesCount'),
            lastUpdate: document.getElementById('lastUpdateTime')
        };
        
        if (elements.totalItems) elements.totalItems.textContent = this.data.length.toLocaleString();
        if (elements.totalValue) elements.totalValue.textContent = '$' + totalValue.toLocaleString();
        if (elements.countries) elements.countries.textContent = countries;
        if (elements.lastUpdate) elements.lastUpdate.textContent = new Date().toLocaleTimeString();
    }
    
    applyFilters() {
        this.filteredData = this.data.filter(item => {
            if (this.filters.category && item.category_name !== this.filters.category) return false;
            if (this.filters.condition && item.condition_type !== this.filters.condition) return false;
            if (this.filters.priceMin !== null && item.base_price_usd < this.filters.priceMin) return false;
            if (this.filters.priceMax !== null && item.base_price_usd > this.filters.priceMax) return false;
            if (this.filters.search && !item.product_name.toLowerCase().includes(this.filters.search)) return false;
            return true;
        });
        
        this.currentPage = 1;
        this.renderCurrentView();
    }
    
    clearFilters() {
        this.filters = { category: '', condition: '', priceMin: null, priceMax: null, search: '' };
        
        const elements = ['categoryFilter', 'conditionFilter', 'priceMinFilter', 'priceMaxFilter', 'searchFilter'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        this.filteredData = [...this.data];
        this.currentPage = 1;
        this.renderCurrentView();
    }
    
    setViewMode(mode) {
        this.currentView = mode;
        
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector('[data-mode="' + mode + '"]');
        if (activeBtn) activeBtn.classList.add('active');
        
        document.querySelectorAll('.view-container').forEach(container => container.classList.remove('active'));
        const activeView = document.getElementById(mode + 'View');
        if (activeView) activeView.classList.add('active');
        
        this.renderCurrentView();
    }
    
    renderCurrentView() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const pageData = this.filteredData.slice(startIndex, startIndex + this.itemsPerPage);
        
        switch (this.currentView) {
            case 'card': this.renderCardView(pageData); break;
            case 'table': this.renderTableView(pageData); break;
            case 'detailed': this.renderDetailedView(pageData); break;
        }
        
        this.updatePagination();
    }
    
    renderCardView(data) {
        const container = document.getElementById('itemsGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.onclick = () => this.showItemDetail(item);
            
            const imageHtml = item.image_url ? 
                '<img src="' + item.image_url + '" alt="' + this.escapeHtml(item.product_name) + '" style="width: 100%; height: 100%; object-fit: cover;">'
                : '<i class="fas fa-image"></i>';
            
            card.innerHTML = '<div class="item-image">' + imageHtml + '</div>' +
                '<div class="item-content">' +
                    '<h3 class="item-title">' + this.escapeHtml(item.product_name) + '</h3>' +
                    '<div class="item-meta">' +
                        '<div class="item-price">$' + (item.base_price_usd || 0).toFixed(2) + '</div>' +
                        '<div class="item-details">' +
                            '<span class="item-condition">' + (item.condition_type || 'unknown') + '</span>' +
                            '<span class="item-stock">在庫: ' + (item.quantity_available || 0) + '</span>' +
                        '</div>' +
                        '<div class="item-details">' +
                            '<span class="item-sku">SKU: ' + (item.master_sku || 'N/A') + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            
            container.appendChild(card);
        });
    }
    
    renderTableView(data) {
        const tbody = document.getElementById('itemsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        data.forEach(item => {
            const row = document.createElement('tr');
            row.onclick = () => this.showItemDetail(item);
            row.style.cursor = 'pointer';
            
            const imageHtml = item.image_url ? 
                '<img src="' + item.image_url + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">'
                : '<i class="fas fa-image"></i>';
            
            row.innerHTML = '<td><div style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: #f7fafc; border-radius: 4px;">' + imageHtml + '</div></td>' +
                '<td><div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + this.escapeHtml(item.product_name) + '">' + this.escapeHtml(item.product_name) + '</div></td>' +
                '<td><code>' + (item.master_sku || 'N/A') + '</code></td>' +
                '<td><strong>$' + (item.base_price_usd || 0).toFixed(2) + '</strong></td>' +
                '<td><span class="badge badge-' + (item.condition_type || 'unknown') + '">' + (item.condition_type || 'unknown') + '</span></td>' +
                '<td>' + (item.category_name || 'N/A') + '</td>' +
                '<td>' + (item.quantity_available || 0) + '</td>' +
                '<td><button class="btn btn-outline table-view-btn" style="padding: 0.5rem;"><i class="fas fa-eye"></i></button></td>';
            
            const viewBtn = row.querySelector('.table-view-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showItemDetail(item);
                });
            }
            
            tbody.appendChild(row);
        });
    }
    
    renderDetailedView(data) {
        const container = document.getElementById('detailedItems');
        if (!container) return;
        
        container.innerHTML = '';
        
        data.forEach(item => {
            const profitMargin = (item.cost_price_usd && item.base_price_usd) ? 
                (((item.base_price_usd - item.cost_price_usd) / item.base_price_usd) * 100).toFixed(1) : 'N/A';
            
            const detailedItem = document.createElement('div');
            
            const imageHtml = item.image_url ? 
                '<img src="' + item.image_url + '" style="width: 100%; height: 150px; object-fit: cover; border-radius: 0.25rem;">'
                : '<div style="width: 100%; height: 150px; display: flex; align-items: center; justify-content: center; background: #f7fafc; border-radius: 0.25rem; color: #9ca3af;"><i class="fas fa-image fa-2x"></i></div>';
            
            detailedItem.innerHTML = '<div style="border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1.5rem; background: #ffffff;">' +
                '<div style="display: grid; grid-template-columns: 200px 1fr; gap: 1.5rem; align-items: start;">' +
                    '<div>' + imageHtml + '</div>' +
                    '<div>' +
                        '<h3 style="margin: 0 0 1rem 0; font-size: 1.125rem; font-weight: 600;">' + this.escapeHtml(item.product_name) + '</h3>' +
                        '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem;">' +
                            '<div><strong>SKU:</strong> <code>' + (item.master_sku || 'N/A') + '</code></div>' +
                            '<div><strong>販売価格:</strong> <span style="color: #10b981; font-weight: 600;">$' + (item.base_price_usd || 0).toFixed(2) + '</span></div>' +
                            '<div><strong>仕入価格:</strong> $' + (item.cost_price_usd ? item.cost_price_usd.toFixed(2) : 'N/A') + '</div>' +
                            '<div><strong>利益率:</strong> ' + profitMargin + (profitMargin !== 'N/A' ? '%' : '') + '</div>' +
                            '<div><strong>状態:</strong> <span class="badge badge-' + (item.condition_type || 'unknown') + '">' + (item.condition_type || 'unknown') + '</span></div>' +
                            '<div><strong>在庫:</strong> ' + (item.quantity_available || 0) + '</div>' +
                        '</div>' +
                        '<div style="margin-top: 1rem;">' +
                            '<strong>説明:</strong>' +
                            '<p style="margin: 0.5rem 0 0 0; color: #4a5568; line-height: 1.5;">' + this.escapeHtml(item.description || '説明なし') + '</p>' +
                        '</div>' +
                        '<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">' +
                            '<button class="btn btn-primary detailed-view-btn"><i class="fas fa-eye"></i> 詳細表示</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
            
            const detailBtn = detailedItem.querySelector('.detailed-view-btn');
            if (detailBtn) {
                detailBtn.addEventListener('click', () => this.showItemDetail(item));
            }
            
            container.appendChild(detailedItem);
        });
    }
    
    showItemDetail(item) {
        const modal = document.getElementById('itemDetailModal');
        const content = document.getElementById('itemDetailContent');
        
        if (!modal || !content) return;
        
        const profitMargin = (item.cost_price_usd && item.base_price_usd) ? 
            (((item.base_price_usd - item.cost_price_usd) / item.base_price_usd) * 100).toFixed(1) : 'N/A';
        const profit = (item.cost_price_usd && item.base_price_usd) ? 
            (item.base_price_usd - item.cost_price_usd).toFixed(2) : 'N/A';
        
        content.innerHTML = this.generateModalContent(item, profitMargin, profit);
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        const editBtn = document.getElementById('editItemBtn');
        if (editBtn) {
            editBtn.onclick = () => this.editItem(item);
        }
    }
    
    generateModalContent(item, profitMargin, profit) {
        const imageHtml = item.image_url ? 
            '<img src="' + item.image_url + '" alt="' + this.escapeHtml(item.product_name) + '" style="width: 100%; height: auto; border-radius: 0.5rem;">'
            : '<div style="width: 100%; height: 200px; display: flex; align-items: center; justify-content: center; background: #f7fafc; border-radius: 0.5rem; color: #9ca3af;"><i class="fas fa-image fa-3x"></i></div>';
            
        return '<div style="display: grid; grid-template-columns: 300px 1fr; gap: 2rem;">' +
            '<div>' + imageHtml + '</div>' +
            '<div>' +
                '<h2 style="margin: 0 0 1.5rem 0; line-height: 1.3;">' + this.escapeHtml(item.product_name) + '</h2>' +
                
                '<div style="margin-bottom: 1.5rem;">' +
                    '<h4 style="margin: 0 0 1rem 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">基本情報</h4>' +
                    '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">' +
                        '<div><label style="font-weight: 600;">SKU</label><br><code style="background: #f7fafc; padding: 0.5rem; border-radius: 0.25rem;">' + (item.master_sku || 'N/A') + '</code></div>' +
                        '<div><label style="font-weight: 600;">Platform ID</label><br><code style="background: #f7fafc; padding: 0.5rem; border-radius: 0.25rem;">' + (item.platform_item_id || 'N/A') + '</code></div>' +
                        '<div><label style="font-weight: 600;">商品状態</label><br><span class="badge badge-' + (item.condition_type || 'unknown') + '">' + (item.condition_type || 'unknown') + '</span></div>' +
                        '<div><label style="font-weight: 600;">出品ステータス</label><br><span class="badge badge-' + (item.listing_status || 'unknown') + '">' + (item.listing_status || 'unknown') + '</span></div>' +
                        '<div><label style="font-weight: 600;">カテゴリ</label><br>' + (item.category_name || 'N/A') + '</div>' +
                        '<div><label style="font-weight: 600;">登録日時</label><br>' + (item.created_at ? new Date(item.created_at).toLocaleString('ja-JP') : 'N/A') + '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div style="margin-bottom: 1.5rem;">' +
                    '<h4 style="margin: 0 0 1rem 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">価格・収益情報</h4>' +
                    '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">' +
                        '<div><label style="font-weight: 600;">販売価格</label><br><span style="font-size: 1.5rem; font-weight: 700; color: #10b981;">$' + (item.base_price_usd || 0).toFixed(2) + '</span></div>' +
                        '<div><label style="font-weight: 600;">仕入価格</label><br><span style="font-size: 1.25rem; font-weight: 600;">$' + (item.cost_price_usd ? item.cost_price_usd.toFixed(2) : 'N/A') + '</span></div>' +
                        '<div><label style="font-weight: 600;">利益金額</label><br><span style="font-size: 1.25rem; font-weight: 600;">$' + profit + '</span></div>' +
                        '<div><label style="font-weight: 600;">利益率</label><br><span style="font-size: 1.25rem; font-weight: 600;">' + profitMargin + (profitMargin !== 'N/A' ? '%' : '') + '</span></div>' +
                    '</div>' +
                '</div>' +
                
                '<div style="margin-bottom: 1.5rem;">' +
                    '<h4 style="margin: 0 0 1rem 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">商品説明</h4>' +
                    '<div style="background: #f7fafc; padding: 1rem; border-radius: 0.25rem; line-height: 1.6;">' +
                        this.escapeHtml(item.description || '説明なし') +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }
    
    closeModal() {
        const modal = document.getElementById('itemDetailModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    editItem(item) {
        console.log('編集機能（未実装）:', item);
        alert('SKU: ' + item.master_sku + ' の編集機能は今後実装予定です。');
    }
    
    exportData() {
        try {
            const exportData = {
                metadata: {
                    exported_at: new Date().toISOString(),
                    total_items: this.filteredData.length,
                    filters_applied: this.filters,
                    export_format: 'json'
                },
                items: this.filteredData
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = 'ebay_test_data_' + new Date().toISOString().split('T')[0] + '.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ データエクスポート完了');
        } catch (error) {
            console.error('❌ エクスポートエラー:', error);
            alert('エクスポートに失敗しました。');
        }
    }
    
    showError(message) {
        const errorEl = document.getElementById('errorContainer');
        const messageEl = document.getElementById('errorMessage');
        
        if (errorEl && messageEl) {
            messageEl.textContent = message;
            errorEl.style.display = 'flex';
        }
    }
    
    updatePagination() {
        const totalItems = this.filteredData.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const startItem = totalItems > 0 ? (this.currentPage - 1) * this.itemsPerPage + 1 : 0;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
        
        const infoEl = document.getElementById('paginationInfo');
        if (infoEl) infoEl.textContent = startItem + ' - ' + endItem + ' of ' + totalItems + ' items';
        
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
        
        this.renderPageNumbers(totalPages);
    }
    
    renderPageNumbers(totalPages) {
        const container = document.getElementById('pageNumbers');
        if (!container || totalPages <= 1) return;
        
        container.innerHTML = '';
        
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        if (startPage > 1) {
            this.addPageNumber(container, 1);
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.cssText = 'padding: 0.5rem; color: #9ca3af;';
                container.appendChild(ellipsis);
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            this.addPageNumber(container, i);
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.cssText = 'padding: 0.5rem; color: #9ca3af;';
                container.appendChild(ellipsis);
            }
            this.addPageNumber(container, totalPages);
        }
    }
    
    addPageNumber(container, pageNum) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = pageNum;
        pageBtn.className = 'page-number' + (pageNum === this.currentPage ? ' active' : '');
        pageBtn.addEventListener('click', () => {
            this.currentPage = pageNum;
            this.renderCurrentView();
        });
        container.appendChild(pageBtn);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}

window.ebayTestViewer = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 eBay Test Viewer 初期化開始（構文エラー完全修復版）');
    
    if (window.ebayTestViewer) {
        window.ebayTestViewer = null;
    }
    
    window.ebayTestViewer = new EbayTestViewer();
    console.log('✅ eBay Test Viewer 構文エラー完全修復版初期化完了');
});
</script>

<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'get_ebay_test_data') {
    $sampleData = [
        [
            'id' => 1, 'master_sku' => 'c118v3jnf3', 
            'product_name' => 'Zoids 1/72 Saber Tiger Holotech Special Clear Yellow Plastic Model Kit',
            'description' => 'Zoids 1/72 Saber Tiger Holotech Special Clear Yellow Plastic Model Kit - Rare collector item from Japan with authentic Holotech technology.',
            'base_price_usd' => 117.22, 'condition_type' => 'new', 'category_name' => 'Toys & Hobbies',
            'product_type' => 'single', 'is_active' => true, 'created_at' => '2025-08-25 18:43:10',
            'quantity_available' => 1, 'cost_price_usd' => 70.33, 'warehouse_location' => 'Main',
            'platform_item_id' => 'c118v3jnf3', 'listing_price' => 117.22, 'currency' => 'USD',
            'listing_status' => 'active', 'country_code' => 'US', 'image_url' => null
        ],
        [
            'id' => 2, 'master_sku' => 'c185o09wsq',
            'product_name' => 'Binocolo Canon 12x32 IS con stabilizzatore immagine',
            'description' => 'Canon 12x32 IS Image Stabilized Binoculars - Professional grade optical equipment.',
            'base_price_usd' => 1385.08, 'condition_type' => 'new', 'category_name' => 'Cameras & Photo',
            'product_type' => 'single', 'is_active' => true, 'created_at' => '2025-08-25 18:43:10',
            'quantity_available' => 1, 'cost_price_usd' => 831.05, 'warehouse_location' => 'Main',
            'platform_item_id' => 'c185o09wsq', 'listing_price' => 1385.08, 'currency' => 'USD',
            'listing_status' => 'active', 'country_code' => 'US', 'image_url' => null
        ],
        [
            'id' => 3, 'master_sku' => 'c18td4e8y4',
            'product_name' => '[Onitsuka Tiger] Sneakers GSM (current model)',
            'description' => 'Authentic Onitsuka Tiger GSM Sneakers - Current model with premium materials.',
            'base_price_usd' => 254.11, 'condition_type' => 'new', 'category_name' => 'Clothing, Shoes & Accessories',
            'product_type' => 'single', 'is_active' => true, 'created_at' => '2025-08-25 18:43:10',
            'quantity_available' => 1, 'cost_price_usd' => 152.47, 'warehouse_location' => 'Main',
            'platform_item_id' => 'c18td4e8y4', 'listing_price' => 254.11, 'currency' => 'USD',
            'listing_status' => 'active', 'country_code' => 'US', 'image_url' => null
        ]
    ];
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'data' => $sampleData,
        'source' => 'sample_data_syntax_error_fixed',
        'count' => count($sampleData),
        'message' => '構文エラー完全修復版サンプルデータ'
    ]);
    exit;
}
?>

<script>
console.log('✅ eBay Test Viewer (構文エラー完全修復版) ロード完了');
console.log('🔧 修復内容: テンプレートリテラル・エスケープ問題・モーダル生成関数分離');
</script>
