/**
 * 統合在庫管理システム - タブ管理システム
 * Claude編集性重視・モジュール化設計
 */

// タブシステム管理クラス
class TabManager {
    constructor() {
        this.activeTab = 'inventory';
        this.tabCache = new Map();
        this.loadingStates = new Map();
        
        this.initializeEventListeners();
    }

    // イベントリスナー初期化
    initializeEventListeners() {
        // タブボタンクリックイベント
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                this.switchTab(tabId);
            });
        });

        // iframe間通信受信
        window.addEventListener('message', (event) => {
            this.handleIframeMessage(event);
        });

        // ページ離脱前の保存確認
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '未保存の変更があります。ページを離れてもよろしいですか？';
            }
        });
    }

    // タブ切り替え
    switchTab(tabId) {
        if (this.activeTab === tabId) return;

        console.log(`タブ切り替え: ${this.activeTab} → ${tabId}`);

        // 現在のアクティブタブを非表示
        const currentTab = document.getElementById(`${this.activeTab}-tab`);
        const currentBtn = document.querySelector(`[data-tab="${this.activeTab}"]`);
        
        if (currentTab) currentTab.classList.remove('active');
        if (currentBtn) currentBtn.classList.remove('active');

        // 新しいタブを表示
        const newTab = document.getElementById(`${tabId}-tab`);
        const newBtn = document.querySelector(`[data-tab="${tabId}"]`);
        
        if (newTab) newTab.classList.add('active');
        if (newBtn) newBtn.classList.add('active');

        // タブデータの遅延読み込み
        this.loadTabData(tabId);

        this.activeTab = tabId;
        
        // 履歴管理（ブラウザバック対応）
        history.pushState({tab: tabId}, '', `#${tabId}`);
    }

    // タブデータ読み込み
    async loadTabData(tabId) {
        // キャッシュチェック
        if (this.tabCache.has(tabId) && this.isTabDataFresh(tabId)) {
            console.log(`タブ ${tabId}: キャッシュから読み込み`);
            return;
        }

        // ローディング状態表示
        this.setLoadingState(tabId, true);

        try {
            // iframe の存在確認と再読み込み
            const iframe = document.getElementById(`${tabId}-iframe`);
            if (iframe) {
                // 初回読み込み時のみiframe srcを設定
                if (!iframe.src || iframe.src === window.location.href) {
                    iframe.src = `tabs/${tabId}_tab.php`;
                }

                // iframe読み込み完了を待つ
                await this.waitForIframeLoad(iframe);
            }

            // データ読み込み成功をキャッシュに記録
            this.tabCache.set(tabId, {
                loaded: true,
                timestamp: Date.now()
            });

            console.log(`タブ ${tabId}: データ読み込み完了`);

        } catch (error) {
            console.error(`タブ ${tabId} データ読み込みエラー:`, error);
            this.showTabError(tabId, error.message);
        } finally {
            this.setLoadingState(tabId, false);
        }
    }

    // iframe読み込み完了待機
    waitForIframeLoad(iframe) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('iframe読み込みタイムアウト'));
            }, 10000);

            iframe.onload = () => {
                clearTimeout(timeout);
                resolve();
            };

            iframe.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('iframe読み込みエラー'));
            };
        });
    }

    // ローディング状態管理
    setLoadingState(tabId, isLoading) {
        const loadingElement = document.getElementById(`${tabId}-loading`);
        this.loadingStates.set(tabId, isLoading);
        
        if (loadingElement) {
            if (isLoading) {
                loadingElement.classList.add('loading');
            } else {
                loadingElement.classList.remove('loading');
            }
        }
    }

    // タブデータ新鮮度チェック（5分間有効）
    isTabDataFresh(tabId) {
        const cached = this.tabCache.get(tabId);
        if (!cached) return false;
        
        const CACHE_DURATION = 5 * 60 * 1000; // 5分
        return (Date.now() - cached.timestamp) < CACHE_DURATION;
    }

    // iframe間通信処理
    handleIframeMessage(event) {
        const { action, data, tabId } = event.data;

        switch (action) {
            case 'data-updated':
                // データ更新通知を受信
                this.invalidateTabCache(tabId);
                this.updateTabBadge(tabId, data);
                break;

            case 'navigation-request':
                // 他タブへの移動要求
                this.switchTab(data.targetTab);
                break;

            case 'notification':
                // 通知表示要求
                showNotification(data.message, data.type, data.duration);
                break;

            case 'modal-request':
                // モーダル表示要求
                this.openCrossTabModal(data);
                break;
        }
    }

    // タブキャッシュ無効化
    invalidateTabCache(tabId) {
        this.tabCache.delete(tabId);
        console.log(`タブ ${tabId}: キャッシュを無効化`);
    }

    // 全タブキャッシュ無効化
    invalidateAllCache() {
        this.tabCache.clear();
        console.log('全タブキャッシュを無効化');
    }

    // タブバッジ更新
    updateTabBadge(tabId, data) {
        const badge = document.querySelector(`[data-tab="${tabId}"] .tab-badge`);
        if (badge && data.count !== undefined) {
            badge.textContent = new Intl.NumberFormat().format(data.count);
        }
    }

    // タブエラー表示
    showTabError(tabId, errorMessage) {
        const tabContent = document.getElementById(`${tabId}-tab`);
        if (tabContent) {
            const errorHtml = `
                <div class="tab-error" style="padding: 2rem; text-align: center; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <h3>データ読み込みエラー</h3>
                    <p style="margin: 1rem 0;">${errorMessage}</p>
                    <button class="btn btn-primary" onclick="tabManager.retryLoadTab('${tabId}')">
                        <i class="fas fa-sync"></i> 再試行
                    </button>
                </div>
            `;
            tabContent.innerHTML = errorHtml;
        }
    }

    // タブ再読み込み
    retryLoadTab(tabId) {
        this.invalidateTabCache(tabId);
        this.loadTabData(tabId);
    }

    // 未保存変更チェック
    hasUnsavedChanges() {
        // 各iframeに未保存変更があるかチェック
        const iframes = document.querySelectorAll('.tab-iframe');
        for (let iframe of iframes) {
            try {
                if (iframe.contentWindow.hasUnsavedChanges && 
                    iframe.contentWindow.hasUnsavedChanges()) {
                    return true;
                }
            } catch (e) {
                // Cross-origin制限によるエラーは無視
            }
        }
        return false;
    }

    // クロスタブモーダル表示
    openCrossTabModal(modalData) {
        const { modalId, title, content, actions } = modalData;
        
        const modalHtml = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                ${actions || ''}
            </div>
        `;
        
        showModal(modalHtml);
    }

    // 全タブ更新
    refreshAllTabs() {
        this.invalidateAllCache();
        
        // 現在表示中のタブを再読み込み
        this.loadTabData(this.activeTab);
        
        // 他のタブは次回アクセス時に再読み込み
        console.log('全タブリフレッシュ予約完了');
    }

    // アクティブタブ取得
    getActiveTab() {
        return this.activeTab;
    }

    // タブの有効/無効切り替え
    setTabEnabled(tabId, enabled) {
        const btn = document.querySelector(`[data-tab="${tabId}"]`);
        if (btn) {
            btn.disabled = !enabled;
            if (enabled) {
                btn.classList.remove('disabled');
            } else {
                btn.classList.add('disabled');
            }
        }
    }
}

// グローバルタブマネージャーインスタンス
let tabManager;

// タブシステム初期化関数
function initializeTabSystem() {
    tabManager = new TabManager();
    
    // URL ハッシュから初期タブを決定
    const hash = window.location.hash.substring(1);
    if (hash && ['inventory', 'editing', 'category', 'listing', 'scraping'].includes(hash)) {
        tabManager.switchTab(hash);
    }
    
    // ブラウザバック/フォワード対応
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.tab) {
            tabManager.switchTab(event.state.tab);
        }
    });
    
    console.log('✅ タブシステム初期化完了');
}

// 外部公開関数
window.loadTabData = (tabId) => tabManager.loadTabData(tabId);
window.refreshAllTabs = () => tabManager.refreshAllTabs();
window.switchTab = (tabId) => tabManager.switchTab(tabId);
window.getActiveTab = () => tabManager.getActiveTab();