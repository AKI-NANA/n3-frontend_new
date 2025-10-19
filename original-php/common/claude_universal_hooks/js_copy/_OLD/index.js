
// CAIDS character_limit Hook
// CAIDS character_limit Hook - 基本実装
console.log('✅ character_limit Hook loaded');

// CAIDS error_handling Hook

// CAIDS エラー処理Hook - 完全実装
window.CAIDS_ERROR_HANDLER = {
    isActive: true,
    errorCount: 0,
    errorHistory: [],
    
    initialize: function() {
        this.setupGlobalErrorHandler();
        this.setupUnhandledPromiseRejection();
        this.setupNetworkErrorHandler();
        console.log('⚠️ CAIDS エラーハンドリングシステム完全初期化');
    },
    
    setupGlobalErrorHandler: function() {
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
    },
    
    setupUnhandledPromiseRejection: function() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack
            });
        });
    },
    
    setupNetworkErrorHandler: function() {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            try {
                const response = await originalFetch.apply(this, args);
                if (!response.ok) {
                    window.CAIDS_ERROR_HANDLER.handleError({
                        type: 'Network Error',
                        message: `HTTP ${response.status}: ${response.statusText}`,
                        url: args[0]
                    });
                }
                return response;
            } catch (error) {
                window.CAIDS_ERROR_HANDLER.handleError({
                    type: 'Network Fetch Error',
                    message: error.message,
                    url: args[0]
                });
                throw error;
            }
        };
    },
    
    handleError: function(errorInfo) {
        this.errorCount++;
        this.errorHistory.push({...errorInfo, timestamp: new Date().toISOString()});
        
        console.error('🚨 CAIDS Error Handler:', errorInfo);
        this.showErrorNotification(errorInfo);
        this.reportError(errorInfo);
    },
    
    showErrorNotification: function(errorInfo) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 10px; right: 10px; z-index: 999999;
            background: linear-gradient(135deg, #ff4444, #cc0000);
            color: white; padding: 15px 20px; border-radius: 8px;
            max-width: 350px; box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            border: 2px solid #ff6666; animation: caids-error-shake 0.5s ease-in-out;
        `;
        errorDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">🚨</span>
                <div>
                    <strong>エラーが発生しました</strong><br>
                    <small style="opacity: 0.9;">${errorInfo.type}: ${errorInfo.message}</small>
                </div>
            </div>
        `;
        
        // CSS Animation
        if (!document.getElementById('caids-error-styles')) {
            const style = document.createElement('style');
            style.id = 'caids-error-styles';
            style.textContent = `
                @keyframes caids-error-shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 7000);
    },
    
    reportError: function(errorInfo) {
        // エラーレポート生成・送信（将来の拡張用）
        const report = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            errorCount: this.errorCount,
            sessionId: this.getSessionId(),
            ...errorInfo
        };
        
        console.log('📋 CAIDS Error Report:', report);
        localStorage.setItem('caids_last_error', JSON.stringify(report));
    },
    
    getSessionId: function() {
        let sessionId = sessionStorage.getItem('caids_session_id');
        if (!sessionId) {
            sessionId = 'caids_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('caids_session_id', sessionId);
        }
        return sessionId;
    },
    
    getErrorStats: function() {
        return {
            totalErrors: this.errorCount,
            recentErrors: this.errorHistory.slice(-10),
            sessionId: this.getSessionId()
        };
    }
};

window.CAIDS_ERROR_HANDLER.initialize();

/**
 * 🎯 NAGANO-3 ページコントローラー（競合回避版）
 * 
 * ✅ ページ初期化処理
 * ✅ イベント管理
 * ✅ ライフサイクル管理
 * ✅ エラーハンドリング
 */

(function() {
    'use strict';
    
    // 重複初期化防止
    if (window.NAGANO3_PAGE_CONTROLLER_LOADED) {
        console.warn('⚠️ NAGANO-3ページコントローラーが重複読み込みされました');
        return;
    }
    
    // ✅ ページコントローラークラス
    class NAGANO3PageController {
        constructor() {
            this.initialized = false;
            this.currentPage = '';
            this.pageStartTime = Date.now();
            this.eventListeners = new Map();
            this.pageSpecificHandlers = new Map();
        }
        
        async initialize() {
            if (this.initialized) {
                return;
            }
            
            try {
                // 基本設定取得
                this.currentPage = window.NAGANO3_CONFIG?.current_page || 'dashboard';
                
                // DOM読み込み完了待機
                if (document.readyState === 'loading') {
                    await new Promise(resolve => {
                        document.addEventListener('DOMContentLoaded', resolve, { once: true });
                    });
                }
                
                // 基本初期化
                await this.initializeBasicFeatures();
                
                // ページ固有初期化
                await this.initializePageSpecificFeatures();
                
                // イベントリスナー設定
                this.setupEventListeners();
                
                // ローディング画面非表示
                this.hideLoadingScreen();
                
                this.initialized = true;
                
                // 初期化完了イベント発行
                this.firePageEvent('nagano3-page-initialized', {
                    page: this.currentPage,
                    loadTime: Date.now() - this.pageStartTime
                });
                
                if (window.NAGANO3_CONFIG?.debug) {
                    console.log('✅ NAGANO-3ページコントローラー初期化完了');
                    console.log(`📄 現在のページ: ${this.currentPage}`);
                    console.log(`⏱️ 初期化時間: ${Date.now() - this.pageStartTime}ms`);
                }
                
            } catch (error) {
                console.error('❌ ページコントローラー初期化エラー:', error);
                this.handleInitializationError(error);
            }
        }
        
        async initializeBasicFeatures() {
            // 基本UI機能初期化
            this.initializeNotificationSystem();
            this.initializeModalSystem();
            this.initializeKeyboardShortcuts();
            this.initializeThemeController();
            this.initializeSidebarController();
        }
        
        async initializePageSpecificFeatures() {
            const pageInitializers = {
                'dashboard': this.initializeDashboard.bind(this),
                'kicho_content': this.initializeKicho.bind(this),
                'shohin_content': this.initializeShohin.bind(this),
                'zaiko_content': this.initializeZaiko.bind(this),
                'juchu_kanri_content': this.initializeJuchuKanri.bind(this),
                'apikey_content': this.initializeApikey.bind(this),
                'debug_dashboard': this.initializeDebugDashboard.bind(this)
            };
            
            const initializer = pageInitializers[this.currentPage];
            if (initializer) {
                try {
                    await initializer();
                } catch (error) {
                    console.error(`❌ ページ固有初期化エラー (${this.currentPage}):`, error);
                }
            }
        }
        
        // ✅ 基本機能初期化メソッド
        initializeNotificationSystem() {
            if (!window.NAGANO3) window.NAGANO3 = {};
            
            window.NAGANO3.notify = function(message, type = 'info', duration = 5000) {
                const notificationArea = document.getElementById('notificationArea');
                if (!notificationArea) return;
                
                const notification = document.createElement('div');
                notification.className = `notification notification--${type}`;
                notification.innerHTML = `
                    <div class="notification__content">
                        <span class="notification__message">${message}</span>
                        <button class="notification__close">&times;</button>
                    </div>
                `;
                
                notificationArea.appendChild(notification);
                
                // 自動削除
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, duration);
                
                // 手動削除
                notification.querySelector('.notification__close').onclick = () => {
                    notification.remove();
                };
            };
        }
        
        initializeModalSystem() {
            if (!window.NAGANO3) window.NAGANO3 = {};
            
            window.NAGANO3.modal = {
                show: function(title, content, options = {}) {
                    const modalArea = document.getElementById('modalArea');
                    if (!modalArea) return;
                    
                    const modal = document.createElement('div');
                    modal.className = 'modal modal--active';
                    modal.innerHTML = `
                        <div class="modal__overlay">
                            <div class="modal__content">
                                <div class="modal__header">
                                    <h3 class="modal__title">${title}</h3>
                                    <button class="modal__close">&times;</button>
                                </div>
                                <div class="modal__body">${content}</div>
                                ${options.buttons ? `<div class="modal__footer">${options.buttons}</div>` : ''}
                            </div>
                        </div>
                    `;
                    
                    modalArea.appendChild(modal);
                    
                    // 閉じるボタン
                    modal.querySelector('.modal__close').onclick = () => modal.remove();
                    modal.querySelector('.modal__overlay').onclick = (e) => {
                        if (e.target === e.currentTarget) modal.remove();
                    };
                    
                    return modal;
                },
                
                hide: function() {
                    const modals = document.querySelectorAll('.modal');
                    modals.forEach(modal => modal.remove());
                }
            };
        }
        
        initializeKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Ctrl+/ でヘルプ表示
                if (e.ctrlKey && e.key === '/') {
                    e.preventDefault();
                    this.showKeyboardShortcuts();
                }
                
                // Esc でモーダル・通知を閉じる
                if (e.key === 'Escape') {
                    e.preventDefault();
                    window.NAGANO3?.modal?.hide();
                    document.querySelectorAll('.notification').forEach(n => n.remove());
                }
                
                // Alt+D でデバッグパネル表示（デバッグモード時）
                if (e.altKey && e.key === 'd' && window.NAGANO3_CONFIG?.debug) {
                    e.preventDefault();
                    const debugPanel = document.getElementById('debugPanel');
                    if (debugPanel) {
                        debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
                    }
                }
            });
        }
        
        initializeThemeController() {
            const themeToggle = document.querySelector('[data-action="toggle-theme"]');
            if (themeToggle) {
                themeToggle.addEventListener('click', () => {
                    const currentTheme = document.documentElement.getAttribute('data-theme');
                    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                    
                    document.documentElement.setAttribute('data-theme', newTheme);
                    document.body.setAttribute('data-theme', newTheme);
                    
                    // テーマをサーバーに保存
                    this.saveUserPreference('theme', newTheme);
                });
            }
        }
        
        initializeSidebarController() {
            const sidebarToggle = document.querySelector('[data-action="toggle-sidebar"]');
            const sidebar = document.getElementById('sidebar');
            
            if (sidebarToggle && sidebar) {
                sidebarToggle.addEventListener('click', () => {
                    const currentState = sidebar.getAttribute('data-state');
                    const newState = currentState === 'collapsed' ? 'expanded' : 'collapsed';
                    
                    sidebar.setAttribute('data-state', newState);
                    document.body.setAttribute('data-sidebar', newState);
                    
                    // サイドバー状態をサーバーに保存
                    this.saveUserPreference('sidebar_state', newState);
                });
            }
        }
        
        // ✅ ページ固有初期化メソッド
        async initializeDashboard() {
            console.log('🏠 ダッシュボード初期化中...');
            
            // ダッシュボードウィジェット初期化
            this.initializeDashboardWidgets();
            
            // リアルタイム更新設定
            this.setupDashboardRealTimeUpdates();
        }
        
        async initializeKicho() {
            console.log('💰 記帳システム初期化中...');
            
            // CSV アップロード機能
            this.initializeCSVUpload();
            
            // AI学習機能
            this.initializeAILearning();
            
            // MF連携機能
            this.initializeMFIntegration();
        }
        
        async initializeShohin() {
            console.log('📦 商品管理システム初期化中...');
            
            // 商品検索機能
            this.initializeProductSearch();
            
            // 在庫同期機能
            this.initializeInventorySync();
        }
        
        async initializeZaiko() {
            console.log('📊 在庫管理システム初期化中...');
            
            // 在庫アラート機能
            this.initializeStockAlerts();
            
            // 在庫レポート機能
            this.initializeInventoryReports();
        }
        
        async initializeJuchuKanri() {
            console.log('📋 受注管理システム初期化中...');
            
            // 注文処理機能
            this.initializeOrderProcessing();
            
            // 配送追跡機能
            this.initializeShippingTracking();
        }
        
        async initializeApikey() {
            console.log('🔑 APIキー管理システム初期化中...');
            
            // APIキー管理機能
            this.initializeAPIKeyManagement();
            
            // OAuth設定機能
            this.initializeOAuthSetup();
        }
        
        async initializeDebugDashboard() {
            console.log('🔧 デバッグダッシュボード初期化中...');
            
            // システム監視機能
            this.initializeSystemMonitoring();
            
            // パフォーマンス監視
            this.initializePerformanceMonitoring();
        }
        
        // ✅ 個別機能初期化メソッド
        initializeDashboardWidgets() {
            const widgets = document.querySelectorAll('[data-widget]');
            widgets.forEach(widget => {
                const widgetType = widget.getAttribute('data-widget');
                this.loadWidget(widgetType, widget);
            });
        }
        
        initializeCSVUpload() {
            const csvUploadElements = document.querySelectorAll('[data-action="csv-upload"]');
            csvUploadElements.forEach(element => {
                element.addEventListener('change', this.handleCSVUpload.bind(this));
            });
        }
        
        initializeAILearning() {
            const aiLearningButtons = document.querySelectorAll('[data-action="ai-learn"]');
            aiLearningButtons.forEach(button => {
                button.addEventListener('click', this.handleAILearning.bind(this));
            });
        }
        
        // ✅ イベントハンドラー
        setupEventListeners() {
            // Ajax フォーム送信
            document.addEventListener('submit', this.handleFormSubmit.bind(this));
            
            // Ajax ボタンクリック
            document.addEventListener('click', this.handleButtonClick.bind(this));
            
            // ファイルアップロード
            document.addEventListener('change', this.handleFileChange.bind(this));
            
            // ページ離脱時の処理
            window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        }
        
        async handleFormSubmit(e) {
            const form = e.target;
            if (!form.hasAttribute('data-ajax')) return;
            
            e.preventDefault();
            
            try {
                const formData = new FormData(form);
                const response = await this.sendAjaxRequest('POST', formData);
                
                if (response.success) {
                    this.showNotification(response.message || '処理が完了しました', 'success');
                    
                    // フォームリセット
                    if (form.hasAttribute('data-reset-on-success')) {
                        form.reset();
                    }
                    
                    // ページリロード
                    if (form.hasAttribute('data-reload-on-success')) {
                        setTimeout(() => location.reload(), 1000);
                    }
                } else {
                    this.showNotification(response.error || '処理に失敗しました', 'error');
                }
            } catch (error) {
                console.error('❌ フォーム送信エラー:', error);
                this.showNotification('通信エラーが発生しました', 'error');
            }
        }
        
        async handleButtonClick(e) {
            const button = e.target.closest('[data-action]');
            if (!button) return;
            
            const action = button.getAttribute('data-action');
            const module = button.getAttribute('data-module') || this.detectModuleFromAction(action);
            
            // 特別なアクション処理
            if (action === 'toggle-theme' || action === 'toggle-sidebar') {
                return; // 既に初期化済み
            }
            
            if (!action.startsWith('ajax-')) return;
            
            e.preventDefault();
            
            try {
                button.disabled = true;
                button.textContent = button.getAttribute('data-loading-text') || '処理中...';
                
                const data = this.collectButtonData(button);
                const response = await this.sendAjaxRequest('POST', data);
                
                if (response.success) {
                    this.showNotification(response.message || '処理が完了しました', 'success');
                    
                    // カスタムコールバック実行
                    const callback = button.getAttribute('data-callback');
                    if (callback && typeof window[callback] === 'function') {
                        window[callback](response);
                    }
                } else {
                    this.showNotification(response.error || '処理に失敗しました', 'error');
                }
            } catch (error) {
                console.error('❌ ボタンアクションエラー:', error);
                this.showNotification('通信エラーが発生しました', 'error');
            } finally {
                button.disabled = false;
                button.textContent = button.getAttribute('data-original-text') || button.textContent;
            }
        }
        
        async handleFileChange(e) {
            const input = e.target;
            if (!input.hasAttribute('data-upload')) return;
            
            const files = input.files;
            if (!files || files.length === 0) return;
            
            try {
                const uploadType = input.getAttribute('data-upload');
                await this.handleFileUpload(files, uploadType);
            } catch (error) {
                console.error('❌ ファイルアップロードエラー:', error);
                this.showNotification('ファイルアップロードに失敗しました', 'error');
            }
        }
        
        // ✅ Ajax通信メソッド
        async sendAjaxRequest(method, data) {
            const url = window.NAGANO3_CONFIG?.ajax_endpoint || window.location.pathname;
            
            // CSRFトークン追加
            if (data instanceof FormData) {
                data.append('csrf_token', window.NAGANO3_CONFIG?.csrf_token || '');
            } else if (typeof data === 'object') {
                data.csrf_token = window.NAGANO3_CONFIG?.csrf_token || '';
            }
            
            const options = {
                method: method,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-Token': window.NAGANO3_CONFIG?.csrf_token || ''
                }
            };
            
            if (data instanceof FormData) {
                options.body = data;
            } else {
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                options.body = new URLSearchParams(data).toString();
            }
            
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            return await response.json();
        }
        
        // ✅ ユーティリティメソッド
        showNotification(message, type = 'info', duration = 5000) {
            if (window.NAGANO3?.notify) {
                window.NAGANO3.notify(message, type, duration);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        }
        
        hideLoadingScreen() {
            setTimeout(() => {
                const loadingScreen = document.getElementById('loadingScreen');
                if (loadingScreen) {
                    loadingScreen.style.opacity = '0';
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                    }, 300);
                }
            }, 500);
        }
        
        firePageEvent(eventName, detail) {
            window.dispatchEvent(new CustomEvent(eventName, { detail }));
        }
        
        async saveUserPreference(key, value) {
            try {
                await this.sendAjaxRequest('POST', {
                    action: 'save_user_preference',
                    preference_key: key,
                    preference_value: value
                });
            } catch (error) {
                console.error('❌ ユーザー設定保存エラー:', error);
            }
        }
        
        detectModuleFromAction(action) {
            const actionMap = {
                'mf-import': 'kicho',
                'csv-upload': 'kicho',
                'ai-learn': 'kicho',
                'create-product': 'shohin',
                'update-inventory': 'zaiko',
                'process-order': 'juchu_kanri',
                'create-api-key': 'apikey',
                'system-test': 'backend_tools'
            };
            
            return actionMap[action] || 'system';
        }
        
        collectButtonData(button) {
            const data = {
                action: button.getAttribute('data-action'),
                module: button.getAttribute('data-module')
            };
            
            // data-* 属性を収集
            for (let attr of button.attributes) {
                if (attr.name.startsWith('data-param-')) {
                    const key = attr.name.replace('data-param-', '');
                    data[key] = attr.value;
                }
            }
            
            return data;
        }
        
        handleInitializationError(error) {
            console.error('❌ 重大な初期化エラー:', error);
            
            const emergencyErrorArea = document.getElementById('emergencyErrorArea');
            if (emergencyErrorArea) {
                emergencyErrorArea.innerHTML = `
                    <div class="emergency-error">
                        <h3>⚠️ システム初期化エラー</h3>
                        <p>システムの初期化中にエラーが発生しました。</p>
                        <p>ページをリロードしてください。</p>
                        <button onclick="location.reload()">ページをリロード</button>
                    </div>
                `;
                emergencyErrorArea.style.display = 'block';
            }
        }
        
        cleanup() {
            // イベントリスナー削除
            this.eventListeners.forEach((listener, element) => {
                element.removeEventListener(listener.event, listener.handler);
            });
            this.eventListeners.clear();
            
            // タイマー停止
            if (this.updateTimer) {
                clearInterval(this.updateTimer);
            }
            
            console.log('🧹 NAGANO-3ページコントローラー終了処理完了');
        }
    }
    
    // ✅ グローバルページコントローラーインスタンス作成
    if (!window.NAGANO3) {
        window.NAGANO3 = {};
    }
    
    window.NAGANO3.pageController = new NAGANO3PageController();
    
    // ✅ DOMContentLoaded時の自動初期化
    let initializationStarted = false;
    
    document.addEventListener('DOMContentLoaded', async () => {
        if (initializationStarted) return;
        initializationStarted = true;
        
        try {
            // 設定ファイル読み込み待機
            let configWaitCount = 0;
            while (!window.NAGANO3_CONFIG_LOADED && configWaitCount < 100) {
                await new Promise(resolve => setTimeout(resolve, 50));
                configWaitCount++;
            }
            
            // モジュールシステム読み込み待機
            let moduleWaitCount = 0;
            while (!window.NAGANO3_MODULE_SYSTEM_LOADED && moduleWaitCount < 100) {
                await new Promise(resolve => setTimeout(resolve, 50));
                moduleWaitCount++;
            }
            
            // ページコントローラー初期化
            await window.NAGANO3.pageController.initialize();
            
            // モジュールシステム初期化（利用可能な場合）
            if (window.NAGANO3?.moduleLoaderSafe) {
                const result = await window.NAGANO3.moduleLoaderSafe.initialize();
                
                if (result?.success && window.NAGANO3?.notify) {
                    window.NAGANO3.notify(
                        `🎯 ${result.loadedModules?.length || 0}個のモジュール読み込み完了`, 
                        'success', 
                        3000
                    );
                }
            }
            
            // 統合初期化完了イベント
            window.dispatchEvent(new CustomEvent('nagano3-fully-initialized', {
                detail: {
                    timestamp: Date.now(),
                    loadTime: Date.now() - window.NAGANO3_LOAD_START,
                    page: window.NAGANO3_CONFIG?.current_page
                }
            }));
            
        } catch (error) {
            console.error('❌ 統合初期化エラー:', error);
            
            // フォールバック処理
            if (window.NAGANO3?.pageController) {
                window.NAGANO3.pageController.handleInitializationError(error);
            }
        }
    });
    
    // ✅ ページ離脱時の処理
    window.addEventListener('beforeunload', function(e) {
        if (window.NAGANO3?.pageController?.cleanup) {
            window.NAGANO3.pageController.cleanup();
        }
    });
    
    // ✅ 読み込み完了フラグ
    window.NAGANO3_PAGE_CONTROLLER_LOADED = true;
    
    // ✅ ページコントローラー読み込み完了イベント
    window.dispatchEvent(new CustomEvent('nagano3-page-controller-loaded', {
        detail: {
            pageController: window.NAGANO3.pageController,
            timestamp: Date.now()
        }
    }));
    
    if (window.NAGANO3_CONFIG?.debug) {
        console.log('📋 NAGANO-3ページコントローラー読み込み完了');
    }
    
})();