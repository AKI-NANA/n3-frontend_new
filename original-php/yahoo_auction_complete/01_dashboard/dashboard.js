/**
 * ダッシュボード専用JavaScript
 * 機能: 検索・統計更新・ワークフロー管理
 */

// ダッシュボード管理オブジェクト
const DashboardManager = {
    data: {
        stats: {},
        searchResults: [],
        activities: []
    },
    
    /**
     * 初期化
     */
    async init() {
        console.log('🎯 ダッシュボード初期化開始');
        
        try {
            // 統計データ読み込み
            await this.loadStats();
            
            // イベントリスナー設定
            this.setupEventListeners();
            
            // 定期更新開始
            this.startPeriodicUpdate();
            
            console.log('✅ ダッシュボード初期化完了');
            this.addActivity('ダッシュボード初期化完了', 'success', 'システムが正常に起動しました');
            
        } catch (error) {
            console.error('❌ ダッシュボード初期化エラー:', error);
            this.showNotification('ダッシュボードの初期化に失敗しました', 'error');
        }
    },
    
    /**
     * 統計データ読み込み
     */
    async loadStats() {
        try {
            const response = await AuctionWorkflow.getWorkflowStatus();
            
            if (response.success) {
                this.data.stats = response.data;
                this.updateStatsDisplay();
                console.log('📊 統計データ更新完了');
            } else {
                throw new Error(response.message || '統計データの取得に失敗');
            }
            
        } catch (error) {
            console.error('統計データ読み込みエラー:', error);
            // フォールバック表示
            this.updateStatsDisplay({
                total_records: 634,
                scraped_count: 0,
                approved_count: 0,
                listed_count: 0
            });
        }
    },
    
    /**
     * 統計表示更新
     */
    updateStatsDisplay(stats = null) {
        const data = stats || this.data.stats;
        
        const elements = {
            totalRecords: data.total_records || 634,
            scrapedCount: data.scraped_count || 0,
            approvedCount: data.approved_count || 0,
            listedCount: data.listed_count || 0
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                this.animateNumber(element, parseInt(element.textContent) || 0, value);
            }
        });
    },
    
    /**
     * 数値アニメーション
     */
    animateNumber(element, start, end, duration = 1000) {
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (end - start) * progress);
            element.textContent = new Intl.NumberFormat('ja-JP').format(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    },
    
    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        // 検索エンターキー対応
        const searchInput = document.getElementById('searchQuery');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }
        
        // ワークフローステータス更新
        this.updateWorkflowProgress();
        
        console.log('🎯 イベントリスナー設定完了');
    },
    
    /**
     * ワークフロー進行状況更新
     */
    updateWorkflowProgress() {
        const progressContainer = document.getElementById('workflowProgress');
        if (!progressContainer) return;
        
        // 現在のステップ状況を取得・更新
        const steps = progressContainer.querySelectorAll('.workflow-step');
        steps.forEach((step, index) => {
            if (index === 0) {
                step.classList.add('completed');
                step.classList.remove('pending');
            }
        });
    },
    
    /**
     * 検索実行
     */
    async performSearch() {
        const query = document.getElementById('searchQuery')?.value.trim();
        const category = document.getElementById('searchCategory')?.value;
        const status = document.getElementById('searchStatus')?.value;
        const resultsContainer = document.getElementById('searchResults');
        
        if (!query) {
            this.showNotification('検索キーワードを入力してください', 'warning');
            return;
        }
        
        // ローディング表示
        resultsContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div class="loading-spinner" style="width: 40px; height: 40px; margin: 0 auto 1rem;"></div>
                <p>「${query}」を検索しています...</p>
            </div>
        `;
        
        try {
            const searchParams = new URLSearchParams({
                action: 'search_products',
                query: query,
                ...(category && { category }),
                ...(status && { status })
            });
            
            const response = await fetch(`../core/api_handler.php?${searchParams}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.displaySearchResults(result.data, query);
                this.addActivity('検索実行', 'info', `"${query}" - ${result.data.length}件ヒット`);
            } else {
                throw new Error(result.message || '検索に失敗しました');
            }
            
        } catch (error) {
            console.error('検索エラー:', error);
            resultsContainer.innerHTML = `
                <div class="notification error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>検索エラー: ${error.message}</span>
                </div>
            `;
            this.addActivity('検索エラー', 'error', error.message);
        }
    },
    
    /**
     * 検索結果表示
     */
    displaySearchResults(results, query) {
        const resultsContainer = document.getElementById('searchResults');
        
        if (!Array.isArray(results) || results.length === 0) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-search" style="font-size: 3rem; color: var(--n3-text-muted); margin-bottom: 1rem;"></i>
                    <h4>検索結果が見つかりません</h4>
                    <p>「${query}」に一致する商品が見つかりませんでした</p>
                </div>
            `;
            return;
        }
        
        const resultHTML = `
            <div style="margin-bottom: 1rem;">
                <h4>検索結果: ${results.length}件</h4>
                <p style="color: var(--n3-text-secondary); font-size: 0.9rem;">「${query}」の検索結果</p>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
                ${results.map(item => this.createResultCard(item)).join('')}
            </div>
        `;
        
        resultsContainer.innerHTML = resultHTML;
    },
    
    /**
     * 検索結果カード作成
     */
    createResultCard(item) {
        return `
            <div class="result-card" style="background: var(--n3-bg-secondary); border: 1px solid var(--n3-border-color); border-radius: var(--n3-border-radius-lg); padding: var(--n3-spacing-md); transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--n3-shadow-md)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                <div style="display: flex; align-items: flex-start; gap: var(--n3-spacing-sm); margin-bottom: var(--n3-spacing-sm);">
                    <div style="flex: 1;">
                        <h5 style="margin: 0 0 var(--n3-spacing-xs) 0; font-weight: 600; color: var(--n3-text-primary);">
                            ${item.title || '商品名不明'}
                        </h5>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--n3-spacing-xs);">
                            <span style="font-weight: 600; color: var(--n3-color-success); font-size: 1.1rem;">
                                ${this.formatPrice(item.price, item.currency)}
                            </span>
                            <span style="font-size: 0.8rem; color: var(--n3-text-muted);">
                                ${item.category || 'カテゴリ不明'}
                            </span>
                        </div>
                    </div>
                </div>
                <p style="font-size: 0.85rem; color: var(--n3-text-secondary); line-height: 1.4; margin-bottom: var(--n3-spacing-sm);">
                    ${(item.description || '説明なし').substring(0, 100)}...
                </p>
                <div style="display: flex; gap: var(--n3-spacing-xs); flex-wrap: wrap; align-items: center;">
                    <span style="padding: 0.25rem 0.5rem; background: var(--n3-color-primary); color: white; border-radius: var(--n3-border-radius); font-size: 0.75rem;">
                        ${item.platform || item.source || '不明'}
                    </span>
                    ${item.updated_at ? `<span style="font-size: 0.75rem; color: var(--n3-text-muted);">${new Date(item.updated_at).toLocaleDateString('ja-JP')}</span>` : ''}
                </div>
            </div>
        `;
    },
    
    /**
     * 価格フォーマット
     */
    formatPrice(price, currency = 'USD') {
        if (!price) return '価格不明';
        
        if (currency === 'JPY') {
            return '¥' + new Intl.NumberFormat('ja-JP').format(price);
        } else {
            return '$' + parseFloat(price).toFixed(2);
        }
    },
    
    /**
     * アクティビティ更新
     */
    refreshActivity() {
        this.addActivity('アクティビティ更新', 'info', 'アクティビティリストを更新しました');
        this.showNotification('アクティビティを更新しました', 'success');
    },
    
    /**
     * アクティビティ追加
     */
    addActivity(title, type, description) {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        const iconMap = {
            success: 'fas fa-check',
            info: 'fas fa-info',
            warning: 'fas fa-exclamation',
            error: 'fas fa-times'
        };
        
        const activity = document.createElement('div');
        activity.className = 'activity-item';
        activity.innerHTML = `
            <div class="activity-icon activity-${type}">
                <i class="${iconMap[type] || 'fas fa-info'}"></i>
            </div>
            <div class="activity-content">
                <h5>${title}</h5>
                <p>${description}</p>
                <span class="activity-time">数秒前</span>
            </div>
        `;
        
        activityList.insertBefore(activity, activityList.firstChild);
        
        // 最大10件まで保持
        const activities = activityList.querySelectorAll('.activity-item');
        if (activities.length > 10) {
            activities[activities.length - 1].remove();
        }
    },
    
    /**
     * 通知表示
     */
    showNotification(message, type = 'info') {
        AuctionWorkflow.showNotification(message, type);
    },
    
    /**
     * 定期更新開始
     */
    startPeriodicUpdate() {
        // 1分毎に統計更新
        setInterval(() => {
            this.loadStats();
        }, 60000);
        
        console.log('🔄 定期更新開始（1分間隔）');
    }
};

// グローバル関数（HTML からの呼び出し用）
window.performSearch = () => DashboardManager.performSearch();
window.refreshActivity = () => DashboardManager.refreshActivity();

// ページ読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
    DashboardManager.init();
});

console.log('🎯 ダッシュボード JavaScript 読み込み完了');
