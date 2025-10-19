// === N3準拠 汎用基盤システム ===
// ファイル: base.js
// 作成日: 2025-08-17
// 目的: どんなシステムでも使える汎用基盤・フレームワーク

/**
 * N3Base - 汎用システム基盤クラス
 * どんなWebアプリでも使えるベースフレームワーク
 */
class N3Base {
    constructor(config = {}) {
        this.config = {
            // デフォルト設定
            debug: false,
            autoInit: true,
            defaultView: 'card',
            enableModals: true,
            enableNotifications: true,
            ...config
        };
        
        // 汎用状態管理
        this.state = {
            currentView: this.config.defaultView,
            isInitialized: false,
            activeModals: [],
            eventListeners: []
        };
        
        // データストレージ
        this.data = {
            raw: [],
            filtered: [],
            config: {}
        };
        
        // コールバック登録
        this.callbacks = {
            onInit: [],
            onViewChange: [],
            onDataChange: [],
            onError: []
        };
        
        if (this.config.autoInit) {
            this.init();
        }
        
        this.log('N3Base initialized', this.config);
    }
    
    /**
     * システム初期化（汎用）
     */
    init() {
        this.log('🚀 N3Base システム初期化開始');
        
        try {
            // 依存関係チェック
            this.checkDependencies();
            
            // DOM準備待ち
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.onDomReady());
            } else {
                this.onDomReady();
            }
            
        } catch (error) {
            this.handleError('初期化エラー', error);
        }
    }
    
    /**
     * DOM準備完了時の処理
     */
    onDomReady() {
        try {
            // イベントリスナー設定
            this.setupEventListeners();
            
            // モーダルシステム初期化
            if (this.config.enableModals) {
                this.setupModalSystem();
            }
            
            // 初期化完了
            this.state.isInitialized = true;
            this.triggerCallbacks('onInit', { base: this });
            
            this.log('✅ N3Base 初期化完了');
            
            if (this.config.enableNotifications) {
                this.showNotification('システム初期化完了', 'success');
            }
            
        } catch (error) {
            this.handleError('DOM初期化エラー', error);
        }
    }
    
    /**
     * 依存関係チェック
     */
    checkDependencies() {
        const required = ['N3Utils', 'N3API'];
        const missing = [];
        
        required.forEach(dep => {
            if (!window[dep]) {
                missing.push(dep);
            }
        });
        
        if (missing.length > 0) {
            throw new Error(`必要な依存関係が見つかりません: ${missing.join(', ')}`);
        }
        
        this.log('✅ 依存関係チェック完了', required);
    }
    
    /**
     * 汎用イベントリスナー設定
     */
    setupEventListeners() {
        this.log('🔧 汎用イベントリスナー設定開始');
        
        // ビュー切り替えボタン
        this.setupViewSwitching();
        
        // フィルター・検索
        this.setupFilteringAndSearch();
        
        // フォーム制御
        this.setupFormControls();
        
        // グローバルキーボードイベント
        this.setupGlobalKeyboard();
        
        this.log('✅ イベントリスナー設定完了');
    }
    
    /**
     * ビュー切り替えシステム（汎用）
     */
    setupViewSwitching() {
        const viewButtons = document.querySelectorAll('.js-view-btn');
        
        viewButtons.forEach(button => {
            const viewType = button.dataset.view || this.extractViewType(button);
            
            this.addEventListener(button, 'click', (e) => {
                e.preventDefault();
                this.switchToView(viewType, button);
            });
        });
        
        this.log('🔧 ビュー切り替えシステム設定完了', { buttons: viewButtons.length });
    }
    
    /**
     * ビュー切り替え実行（汎用）
     */
    switchToView(viewType, clickedButton = null) {
        this.log(`🔧 ビュー切り替え: ${this.state.currentView} → ${viewType}`);
        
        try {
            // 現在のビューを非表示
            const currentViewElement = document.querySelector(`#${this.state.currentView}-view`);
            if (currentViewElement) {
                currentViewElement.style.display = 'none';
                currentViewElement.classList.remove('inventory__view--visible');
                currentViewElement.classList.add('inventory__view--hidden');
            }
            
            // 新しいビューを表示
            const newViewElement = document.querySelector(`#${viewType}-view`);
            if (newViewElement) {
                newViewElement.style.display = 'block';
                newViewElement.classList.remove('inventory__view--hidden');
                newViewElement.classList.add('inventory__view--visible');
            }
            
            // ボタン状態更新
            this.updateViewButtons(viewType);
            
            // 状態更新
            const oldView = this.state.currentView;
            this.state.currentView = viewType;
            
            // コールバック実行
            this.triggerCallbacks('onViewChange', { 
                oldView, 
                newView: viewType, 
                button: clickedButton 
            });
            
            this.log(`✅ ビュー切り替え完了: ${viewType}`);
            return true;
            
        } catch (error) {
            this.handleError('ビュー切り替えエラー', error);
            return false;
        }
    }
    
    /**
     * ビューボタン状態更新
     */
    updateViewButtons(activeViewType) {
        const viewButtons = document.querySelectorAll('.js-view-btn');
        
        viewButtons.forEach(button => {
            const viewType = button.dataset.view || this.extractViewType(button);
            
            if (viewType === activeViewType) {
                button.classList.add('inventory__view-btn--active');
            } else {
                button.classList.remove('inventory__view-btn--active');
            }
        });
    }
    
    /**
     * ビュータイプ抽出（ボタンから）
     */
    extractViewType(button) {
        // js-view-btn--card → card
        const classList = Array.from(button.classList);
        const viewClass = classList.find(cls => cls.startsWith('js-view-btn--'));
        return viewClass ? viewClass.replace('js-view-btn--', '') : 'default';
    }
    
    /**
     * フィルター・検索システム（汎用）
     */
    setupFilteringAndSearch() {
        // 検索入力
        const searchInputs = document.querySelectorAll('.js-search-input');
        searchInputs.forEach(input => {
            const debouncedSearch = window.N3Utils.debounce((e) => {
                this.performSearch(e.target.value, input);
            }, 300);
            
            this.addEventListener(input, 'input', debouncedSearch);
        });
        
        // フィルター選択
        const filterSelects = document.querySelectorAll('.js-filter-select');
        filterSelects.forEach(select => {
            this.addEventListener(select, 'change', (e) => {
                this.applyFilter(select.id, e.target.value, select);
            });
        });
        
        // フィルターリセットボタン
        const resetButtons = document.querySelectorAll('.js-filter-reset-btn');
        resetButtons.forEach(button => {
            this.addEventListener(button, 'click', () => this.resetFilters());
        });
        
        this.log('🔧 フィルター・検索システム設定完了');
    }
    
    /**
     * 汎用検索実行
     */
    performSearch(query, inputElement = null) {
        this.log(`🔍 検索実行: "${query}"`);
        
        try {
            const searchEvent = {
                query,
                element: inputElement,
                timestamp: new Date().toISOString()
            };
            
            // 検索イベントを発火（具体的な検索処理は外部で実装）
            this.triggerEvent('search', searchEvent);
            
            return true;
        } catch (error) {
            this.handleError('検索エラー', error);
            return false;
        }
    }
    
    /**
     * 汎用フィルター適用
     */
    applyFilter(filterId, value, selectElement = null) {
        this.log(`🔍 フィルター適用: ${filterId} = "${value}"`);
        
        try {
            const filterEvent = {
                filterId,
                value,
                element: selectElement,
                timestamp: new Date().toISOString()
            };
            
            // フィルターイベントを発火
            this.triggerEvent('filter', filterEvent);
            
            return true;
        } catch (error) {
            this.handleError('フィルターエラー', error);
            return false;
        }
    }
    
    /**
     * フィルターリセット
     */
    resetFilters() {
        this.log('🔄 フィルターリセット');
        
        try {
            // 全フィルター要素をリセット
            const filterElements = document.querySelectorAll('.js-filter-select');
            filterElements.forEach(element => {
                element.value = '';
            });
            
            // 検索入力もリセット
            const searchInputs = document.querySelectorAll('.js-search-input');
            searchInputs.forEach(input => {
                input.value = '';
            });
            
            // リセットイベントを発火
            this.triggerEvent('filtersReset', {
                timestamp: new Date().toISOString()
            });
            
            if (this.config.enableNotifications) {
                this.showNotification('フィルターをリセットしました', 'info');
            }
            
            return true;
        } catch (error) {
            this.handleError('フィルターリセットエラー', error);
            return false;
        }
    }
    
    /**
     * フォーム制御（汎用）
     */
    setupFormControls() {
        // フォーム送信防止（ページリロード防止）
        this.addEventListener(document, 'submit', (e) => {
            e.preventDefault();
            this.log('📋 フォーム送信防止', e.target);
            
            // フォーム送信イベントを発火
            this.triggerEvent('formSubmit', {
                form: e.target,
                timestamp: new Date().toISOString()
            });
        });
        
        this.log('📋 フォーム制御設定完了');
    }
    
    /**
     * グローバルキーボードイベント
     */
    setupGlobalKeyboard() {
        this.addEventListener(document, 'keydown', (e) => {
            // Escapeキーでモーダルを閉じる
            if (e.key === 'Escape' && this.state.activeModals.length > 0) {
                const activeModal = this.state.activeModals[this.state.activeModals.length - 1];
                this.closeModal(activeModal);
            }
            
            // その他のグローバルキーボードイベント
            this.triggerEvent('globalKeyboard', {
                key: e.key,
                code: e.code,
                event: e
            });
        });
        
        this.log('⌨️ グローバルキーボードイベント設定完了');
    }
    
    /**
     * モーダルシステム（汎用）
     */
    setupModalSystem() {
        // モーダル外クリックで閉じる
        this.addEventListener(window, 'click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
        
        this.log('🪟 モーダルシステム設定完了');
    }
    
    /**
     * モーダル表示（汎用）
     */
    openModal(modalId, options = {}) {
        this.log(`🪟 モーダル表示: ${modalId}`);
        
        try {
            const modal = document.getElementById(modalId);
            if (!modal) {
                throw new Error(`モーダル要素が見つかりません: ${modalId}`);
            }
            
            // モーダル表示
            modal.style.display = 'flex';
            modal.classList.add('modal--active');
            
            // アクティブモーダル追跡
            if (!this.state.activeModals.includes(modalId)) {
                this.state.activeModals.push(modalId);
            }
            
            // フォーカス管理
            const firstFocusable = modal.querySelector('input, button, select, textarea');
            if (firstFocusable && options.autoFocus !== false) {
                firstFocusable.focus();
            }
            
            // モーダル表示イベント発火
            this.triggerEvent('modalOpen', {
                modalId,
                modal,
                options
            });
            
            this.log(`✅ モーダル表示完了: ${modalId}`);
            return true;
            
        } catch (error) {
            this.handleError('モーダル表示エラー', error);
            return false;
        }
    }
    
    /**
     * モーダル非表示（汎用）
     */
    closeModal(modalId) {
        this.log(`🪟 モーダル非表示: ${modalId}`);
        
        try {
            const modal = document.getElementById(modalId);
            if (!modal) {
                this.log(`⚠️ モーダル要素未発見: ${modalId}`);
                return false;
            }
            
            // アニメーション付きで非表示
            modal.classList.remove('modal--active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
            
            // アクティブモーダルから削除
            this.state.activeModals = this.state.activeModals.filter(id => id !== modalId);
            
            // モーダル非表示イベント発火
            this.triggerEvent('modalClose', {
                modalId,
                modal
            });
            
            this.log(`✅ モーダル非表示完了: ${modalId}`);
            return true;
            
        } catch (error) {
            this.handleError('モーダル非表示エラー', error);
            return false;
        }
    }
    
    /**
     * 通知表示（汎用）
     */
    showNotification(message, type = 'info') {
        if (!this.config.enableNotifications) return;
        
        try {
            // N3Utils.showToastN3を使用
            if (window.N3Utils && window.N3Utils.showToastN3) {
                window.N3Utils.showToastN3(message, type);
            } else {
                // フォールバック
                alert(`[N3 ${type.toUpperCase()}] ${message}`);
            }
            
            this.log(`📢 通知表示: ${type} - ${message}`);
            
        } catch (error) {
            this.handleError('通知表示エラー', error);
        }
    }
    
    /**
     * データ管理（汎用）
     */
    setData(data, config = {}) {
        this.log('💾 データ設定', { count: data.length, config });
        
        try {
            this.data.raw = Array.isArray(data) ? data : [];
            this.data.filtered = [...this.data.raw];
            this.data.config = { ...this.data.config, ...config };
            
            // データ変更イベント発火
            this.triggerCallbacks('onDataChange', {
                data: this.data,
                config
            });
            
            return true;
        } catch (error) {
            this.handleError('データ設定エラー', error);
            return false;
        }
    }
    
    /**
     * データ取得
     */
    getData(filtered = true) {
        return filtered ? this.data.filtered : this.data.raw;
    }
    
    /**
     * イベント登録・管理
     */
    addEventListener(element, event, handler) {
        try {
            element.addEventListener(event, handler);
            
            // イベントリスナーを追跡（メモリリーク防止）
            this.state.eventListeners.push({
                element,
                event,
                handler,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.handleError('イベントリスナー登録エラー', error);
        }
    }
    
    /**
     * カスタムイベント発火
     */
    triggerEvent(eventName, data = {}) {
        try {
            const customEvent = new CustomEvent(`n3:${eventName}`, {
                detail: { ...data, base: this }
            });
            
            document.dispatchEvent(customEvent);
            this.log(`🔥 イベント発火: n3:${eventName}`, data);
            
        } catch (error) {
            this.handleError('イベント発火エラー', error);
        }
    }
    
    /**
     * コールバック登録
     */
    on(eventType, callback) {
        if (this.callbacks[eventType]) {
            this.callbacks[eventType].push(callback);
            this.log(`📞 コールバック登録: ${eventType}`);
        }
    }
    
    /**
     * コールバック実行
     */
    triggerCallbacks(eventType, data = {}) {
        if (this.callbacks[eventType]) {
            this.callbacks[eventType].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.handleError(`コールバックエラー: ${eventType}`, error);
                }
            });
        }
    }
    
    /**
     * エラーハンドリング（汎用）
     */
    handleError(message, error) {
        console.error(`❌ N3Base エラー: ${message}`, error);
        
        // エラーコールバック実行
        this.triggerCallbacks('onError', { message, error });
        
        // 通知表示
        if (this.config.enableNotifications) {
            this.showNotification(`エラー: ${message}`, 'error');
        }
    }
    
    /**
     * ログ出力
     */
    log(message, data = null) {
        if (this.config.debug) {
            if (data) {
                console.log(`🔧 N3Base: ${message}`, data);
            } else {
                console.log(`🔧 N3Base: ${message}`);
            }
        }
    }
    
    /**
     * 現在の状態取得
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * 設定取得
     */
    getConfig() {
        return { ...this.config };
    }
    
    /**
     * 破棄処理
     */
    destroy() {
        this.log('🗑️ N3Base 破棄処理開始');
        
        try {
            // イベントリスナー削除
            this.state.eventListeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            
            // 状態クリア
            this.state = {};
            this.data = {};
            this.callbacks = {};
            
            this.log('✅ N3Base 破棄完了');
            
        } catch (error) {
            console.error('❌ N3Base 破棄エラー:', error);
        }
    }
}

// === グローバル関数インターフェース ===

/**
 * N3Base インスタンス（グローバル）
 */
let n3BaseInstance = null;

/**
 * N3Base初期化
 */
function initializeN3Base(config = {}) {
    if (!n3BaseInstance) {
        n3BaseInstance = new N3Base(config);
    }
    return n3BaseInstance;
}

/**
 * N3Base取得
 */
function getN3Base() {
    return n3BaseInstance;
}

// === 後方互換性 ===

/**
 * 既存関数との互換性維持
 */
function openModal(modalId, options = {}) {
    if (n3BaseInstance) {
        return n3BaseInstance.openModal(modalId, options);
    } else {
        console.warn('⚠️ N3Base not initialized, fallback modal');
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('modal--active');
            return true;
        }
        return false;
    }
}

function closeModal(modalId) {
    if (n3BaseInstance) {
        return n3BaseInstance.closeModal(modalId);
    } else {
        console.warn('⚠️ N3Base not initialized, fallback modal');
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('modal--active');
            return true;
        }
        return false;
    }
}

// === モジュール公開 ===
window.N3Base = N3Base;
window.initializeN3Base = initializeN3Base;
window.getN3Base = getN3Base;

// === 自動初期化（設定可能） ===
document.addEventListener('DOMContentLoaded', function() {
    // デフォルトで自動初期化（無効化も可能）
    if (!window.N3_DISABLE_AUTO_INIT) {
        initializeN3Base({
            debug: window.N3_DEBUG || false,
            autoInit: true
        });
    }
});

console.log('📦 N3準拠 base.js 読み込み完了 - 汎用基盤システム利用可能');