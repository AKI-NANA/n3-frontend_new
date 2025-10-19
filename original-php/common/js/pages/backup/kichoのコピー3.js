
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
 * 🎨 KICHO記帳ツール UI制御システム
 * common/js/pages/kicho.js
 * 
 * ✅ Ajax + UI制御統合システム
 * ✅ PostgreSQL優先・セッションフォールバック対応
 * ✅ リアルタイム表示/非表示制御
 * ✅ アニメーション・通知システム
 * ✅ エラーハンドリング完備
 * 
 * @version 5.0.0-UI-CONTROL-COMPLETE
 */

// 名前空間定義
window.NAGANO3_KICHO = window.NAGANO3_KICHO || {
    version: '5.0.0-UI-CONTROL',
    initialized: false,
    ajaxManager: null,
    uiController: null,
    dataCache: {
        statistics: {},
        transactions: [],
        aiSessions: [],
        lastUpdate: null
    }
};

// =====================================
// 🎨 UI制御システム
// =====================================

class KichoUIController {
    constructor() {
        this.activeModals = [];
        this.loadingStates = new Set();
        this.notifications = [];
        this.animationQueue = [];
        
        this.initializeUI();
    }
    
    initializeUI() {
        console.log('🎨 UI制御システム初期化開始...');
        
        // UI要素の初期状態設定
        this.setupInitialStates();
        
        // イベントリスナー設定
        this.setupEventListeners();
        
        // 通知システム初期化
        this.initializeNotificationSystem();
        
        console.log('✅ UI制御システム初期化完了');
    }
    
    setupInitialStates() {
        // モーダル・パネルの初期非表示
        const modals = document.querySelectorAll('.kicho__modal, .kicho__overlay, .kicho__popup');
        modals.forEach(modal => {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        });
        
        // タブの初期状態
        const tabs = document.querySelectorAll('.kicho__tab');
        tabs.forEach((tab, index) => {
            if (index === 0) {
                tab.classList.add('kicho__tab--active');
            } else {
                tab.classList.remove('kicho__tab--active');
            }
        });
        
        // 折りたたみ要素の初期状態
        const collapsibles = document.querySelectorAll('.kicho__collapsible');
        collapsibles.forEach(item => {
            const content = item.querySelector('.kicho__collapsible-content');
            if (content && !item.classList.contains('kicho__collapsible--open')) {
                content.style.maxHeight = '0';
                content.style.overflow = 'hidden';
            }
        });
    }
    
    setupEventListeners() {
        // モーダル制御
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-modal-open]')) {
                e.preventDefault();
                const modalId = e.target.getAttribute('data-modal-open');
                this.showModal(modalId);
            }
            
            if (e.target.matches('[data-modal-close]') || e.target.matches('.kicho__modal-close')) {
                e.preventDefault();
                this.hideModal();
            }
            
            if (e.target.matches('.kicho__overlay')) {
                this.hideModal();
            }
        });
        
        // タブ制御
        document.addEventListener('click', (e) => {
            if (e.target.matches('.kicho__tab-button')) {
                e.preventDefault();
                const tabId = e.target.getAttribute('data-tab');
                this.switchTab(tabId);
            }
        });
        
        // 折りたたみ制御
        document.addEventListener('click', (e) => {
            if (e.target.matches('.kicho__collapsible-trigger')) {
                e.preventDefault();
                const collapsible = e.target.closest('.kicho__collapsible');
                this.toggleCollapsible(collapsible);
            }
        });
        
        // ESCキーでモーダル閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.length > 0) {
                this.hideModal();
            }
        });
    }
    
    // =====================================
    // 🖼️ モーダル制御
    // =====================================
    
    showModal(modalId) {
        const modal = document.getElementById(modalId) || document.querySelector(`[data-modal="${modalId}"]`);
        
        if (!modal) {
            console.warn(`⚠️ モーダルが見つかりません: ${modalId}`);
            return;
        }
        
        // オーバーレイ作成
        this.createOverlay();
        
        // モーダル表示
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('kicho__modal--active');
        
        // フェードインアニメーション
        requestAnimationFrame(() => {
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.9)';
            modal.style.transition = 'all 0.3s ease';
            
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            });
        });
        
        // アクティブモーダル追加
        this.activeModals.push(modal);
        
        // body スクロール防止
        document.body.style.overflow = 'hidden';
        
        // フォーカス管理
        const firstInput = modal.querySelector('input, textarea, select, button');
        if (firstInput) {
            firstInput.focus();
        }
        
        console.log(`✅ モーダル表示: ${modalId}`);
    }
    
    hideModal() {
        if (this.activeModals.length === 0) return;
        
        const modal = this.activeModals.pop();
        
        // フェードアウトアニメーション
        modal.style.transition = 'all 0.3s ease';
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            modal.classList.remove('kicho__modal--active');
            
            // オーバーレイ削除
            if (this.activeModals.length === 0) {
                this.removeOverlay();
                document.body.style.overflow = '';
            }
        }, 300);
        
        console.log('✅ モーダル非表示');
    }
    
    createOverlay() {
        if (document.querySelector('.kicho__overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'kicho__overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(overlay);
        
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
    }
    
    removeOverlay() {
        const overlay = document.querySelector('.kicho__overlay');
        if (!overlay) return;
        
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
    
    // =====================================
    // 📑 タブ制御
    // =====================================
    
    switchTab(targetTabId) {
        // 全タブ非アクティブ化
        const allTabs = document.querySelectorAll('.kicho__tab-button');
        const allContents = document.querySelectorAll('.kicho__tab-content');
        
        allTabs.forEach(tab => tab.classList.remove('kicho__tab-button--active'));
        allContents.forEach(content => {
            content.classList.remove('kicho__tab-content--active');
            content.style.display = 'none';
        });
        
        // 対象タブをアクティブ化
        const targetTab = document.querySelector(`[data-tab="${targetTabId}"]`);
        const targetContent = document.getElementById(targetTabId) || 
                             document.querySelector(`[data-tab-content="${targetTabId}"]`);
        
        if (targetTab) {
            targetTab.classList.add('kicho__tab-button--active');
        }
        
        if (targetContent) {
            targetContent.style.display = 'block';
            targetContent.classList.add('kicho__tab-content--active');
            
            // フェードインアニメーション
            targetContent.style.opacity = '0';
            requestAnimationFrame(() => {
                targetContent.style.transition = 'opacity 0.3s ease';
                targetContent.style.opacity = '1';
            });
        }
        
        console.log(`✅ タブ切り替え: ${targetTabId}`);
    }
    
    // =====================================
    // 📂 折りたたみ制御
    // =====================================
    
    toggleCollapsible(collapsible) {
        if (!collapsible) return;
        
        const content = collapsible.querySelector('.kicho__collapsible-content');
        const trigger = collapsible.querySelector('.kicho__collapsible-trigger');
        const icon = trigger?.querySelector('.kicho__collapsible-icon');
        
        if (!content) return;
        
        const isOpen = collapsible.classList.contains('kicho__collapsible--open');
        
        if (isOpen) {
            // 閉じる
            content.style.maxHeight = content.scrollHeight + 'px';
            requestAnimationFrame(() => {
                content.style.maxHeight = '0';
                collapsible.classList.remove('kicho__collapsible--open');
                if (icon) icon.style.transform = 'rotate(0deg)';
            });
        } else {
            // 開く
            content.style.maxHeight = '0';
            collapsible.classList.add('kicho__collapsible--open');
            requestAnimationFrame(() => {
                content.style.maxHeight = content.scrollHeight + 'px';
                if (icon) icon.style.transform = 'rotate(180deg)';
            });
            
            // アニメーション終了後に auto に変更
            setTimeout(() => {
                if (collapsible.classList.contains('kicho__collapsible--open')) {
                    content.style.maxHeight = 'auto';
                }
            }, 300);
        }
        
        console.log(`✅ 折りたたみ切り替え: ${isOpen ? '閉じる' : '開く'}`);
    }
    
    // =====================================
    // 🔔 通知システム
    // =====================================
    
    initializeNotificationSystem() {
        // 通知コンテナ作成
        if (!document.getElementById('kicho-notifications')) {
            const container = document.createElement('div');
            container.id = 'kicho-notifications';
            container.className = 'kicho__notifications';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
    }
    
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('kicho-notifications');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `kicho__notification kicho__notification--${type}`;
        notification.style.cssText = `
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
            word-break: break-word;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${message}</span>
                <button style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; margin-left: 8px;">×</button>
            </div>
        `;
        
        container.appendChild(notification);
        
        // 表示アニメーション
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        // クリックで閉じる
        notification.addEventListener('click', () => {
            this.hideNotification(notification);
        });
        
        // 自動削除
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }
        
        this.notifications.push(notification);
        
        console.log(`✅ 通知表示: ${type} - ${message}`);
        return notification;
    }
    
    hideNotification(notification) {
        if (!notification || !notification.parentNode) return;
        
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }
    
    getNotificationColor(type) {
        const colors = {
            'success': '#4caf50',
            'error': '#f44336', 
            'warning': '#ff9800',
            'info': '#2196f3'
        };
        return colors[type] || colors.info;
    }
    
    // =====================================
    // ⏳ ローディング制御
    // =====================================
    
    showLoading(target = 'body', message = '読み込み中...') {
        const targetElement = typeof target === 'string' ? 
                             document.querySelector(target) : target;
        
        if (!targetElement) return;
        
        // 既存ローディング除去
        this.hideLoading(targetElement);
        
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'kicho__loading-overlay';
        loadingOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            flex-direction: column;
        `;
        
        loadingOverlay.innerHTML = `
            <div class="kicho__spinner" style="
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 10px;
            "></div>
            <div style="color: #666; font-size: 14px;">${message}</div>
        `;
        
        // スピナーアニメーション追加
        if (!document.getElementById('kicho-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'kicho-spinner-style';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // ターゲットの position を relative に
        const originalPosition = targetElement.style.position;
        if (getComputedStyle(targetElement).position === 'static') {
            targetElement.style.position = 'relative';
        }
        
        targetElement.appendChild(loadingOverlay);
        this.loadingStates.add(targetElement);
        
        console.log(`✅ ローディング表示: ${message}`);
        return loadingOverlay;
    }
    
    hideLoading(target = 'body') {
        const targetElement = typeof target === 'string' ? 
                             document.querySelector(target) : target;
        
        if (!targetElement) return;
        
        const loadingOverlay = targetElement.querySelector('.kicho__loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
            }, 200);
        }
        
        this.loadingStates.delete(targetElement);
        console.log('✅ ローディング非表示');
    }
    
    // =====================================
    // 🎬 アニメーション制御
    // =====================================
    
    animateDelete(element) {
        if (!element) return Promise.resolve();
        
        return new Promise((resolve) => {
            element.style.transition = 'all 0.3s ease';
            element.style.transform = 'translateX(-20px)';
            element.style.opacity = '0.5';
            element.style.backgroundColor = '#ffebee';
            
            setTimeout(() => {
                element.style.transform = 'translateX(-100%)';
                element.style.opacity = '0';
                
                setTimeout(() => {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                    resolve();
                }, 200);
            }, 100);
        });
    }
    
    animateAdd(element, container) {
        if (!element || !container) return Promise.resolve();
        
        return new Promise((resolve) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(-20px)';
            element.style.backgroundColor = '#e8f5e8';
            
            container.insertBefore(element, container.firstChild);
            
            requestAnimationFrame(() => {
                element.style.transition = 'all 0.3s ease';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
                
                setTimeout(() => {
                    element.style.backgroundColor = '';
                    resolve();
                }, 300);
            });
        });
    }
    
    // =====================================
    // 📊 データ表示制御
    // =====================================
    
    updateCounter(selector, newValue, animated = true) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
            const currentValue = parseInt(element.textContent) || 0;
            
            if (animated && currentValue !== newValue) {
                // カウンターアニメーション
                element.style.transform = 'scale(1.2)';
                element.style.color = newValue > currentValue ? '#4caf50' : '#f44336';
                
                setTimeout(() => {
                    element.textContent = newValue;
                    element.style.transform = 'scale(1)';
                    element.style.color = '';
                }, 150);
            } else {
                element.textContent = newValue;
            }
        });
        
        console.log(`✅ カウンター更新: ${selector} = ${newValue}`);
    }
    
    updateStatistics(stats) {
        // 各統計値を更新
        Object.entries(stats).forEach(([key, value]) => {
            this.updateCounter(`[data-stat="${key}"]`, value);
        });
        
        // データソース表示
        const dataSourceElement = document.querySelector('[data-stat-source]');
        if (dataSourceElement && stats.data_source) {
            dataSourceElement.textContent = stats.data_source === 'postgresql_real' ? 
                'PostgreSQL' : 'セッション';
            dataSourceElement.className = stats.data_source === 'postgresql_real' ? 
                'data-source data-source--database' : 'data-source data-source--session';
        }
        
        console.log('✅ 統計データ更新完了');
    }
    
    checkEmptyState(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        const items = container.querySelectorAll('.data-item, tr[data-id], [data-item-id]');
        const emptyMessage = container.querySelector('.empty-state');
        
        if (items.length === 0) {
            if (!emptyMessage) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-state';
                emptyDiv.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                        <p>データがありません</p>
                    </div>
                `;
                container.appendChild(emptyDiv);
            }
        } else {
            if (emptyMessage) {
                emptyMessage.remove();
            }
        }
    }
}

// =====================================
// 🔗 Ajax統合システム
// =====================================

class KichoAjaxManager {
    constructor(uiController) {
        this.uiController = uiController;
        this.pendingRequests = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
    }
    
    async sendRequest(action, data = {}, options = {}) {
        const requestId = `${action}_${Date.now()}`;
        
        try {
            // ローディング表示
            if (options.showLoading !== false) {
                this.uiController.showLoading(options.loadingTarget);
            }
            
            // CSRF トークン追加
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            if (csrfToken) {
                data.csrf_token = csrfToken;
            }
            
            // FormData 作成
            const formData = new FormData();
            formData.append('action', action);
            
            Object.entries(data).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    formData.append(key, value);
                }
            });
            
            // Ajax 送信
            const response = await fetch(window.location.pathname, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // UI 更新処理
            this.handleUIUpdate(result, options);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Ajax エラー [${action}]:`, error);
            
            // リトライ処理
            const retryCount = this.retryAttempts.get(requestId) || 0;
            if (retryCount < this.maxRetries && !options.noRetry) {
                this.retryAttempts.set(requestId, retryCount + 1);
                console.log(`🔄 リトライ ${retryCount + 1}/${this.maxRetries}: ${action}`);
                
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return this.sendRequest(action, data, { ...options, noRetry: false });
            }
            
            // エラー通知
            this.uiController.showNotification(
                `エラーが発生しました: ${error.message}`,
                'error'
            );
            
            throw error;
            
        } finally {
            // ローディング非表示
            if (options.showLoading !== false) {
                this.uiController.hideLoading(options.loadingTarget);
            }
            
            this.pendingRequests.delete(requestId);
            this.retryAttempts.delete(requestId);
        }
    }
    
    handleUIUpdate(result, options) {
        if (!result.success) {
            this.uiController.showNotification(result.message || 'エラーが発生しました', 'error');
            return;
        }
        
        // 成功通知
        if (options.showSuccessNotification !== false) {
            this.uiController.showNotification(result.message, 'success');
        }
        
        // UI更新指示実行
        if (result.data?.ui_update) {
            this.executeUIUpdate(result.data.ui_update);
        }
        
        // 統計データ更新
        if (result.data?.stats) {
            this.uiController.updateStatistics(result.data.stats);
        }
    }
    
    executeUIUpdate(uiUpdate) {
        switch (uiUpdate.action) {
            case 'remove_element':
                const elementToRemove = document.querySelector(uiUpdate.selector);
                if (elementToRemove) {
                    this.uiController.animateDelete(elementToRemove);
                }
                break;
                
            case 'ai_learning_complete':
                console.log('🎯 AI学習完了UI更新:', uiUpdate);
                
                // 1. 入力フィールドクリア
                const textInput = document.querySelector(uiUpdate.clear_input);
                if (textInput) {
                    textInput.value = '';
                    textInput.style.borderColor = '#4caf50';
                    textInput.style.backgroundColor = '#f8fff8';
                    setTimeout(() => {
                        textInput.style.borderColor = '';
                        textInput.style.backgroundColor = '';
                    }, 2000);
                }
                
                // 2. AI結果表示エリア作成/更新
                this.displayAILearningResults(uiUpdate);
                
                // 3. 学習履歴更新
                this.updateAIHistory({
                    session_id: uiUpdate.session_id,
                    accuracy: uiUpdate.accuracy,
                    confidence: uiUpdate.confidence,
                    timestamp: new Date().toLocaleString(),
                    status: 'completed'
                });
                
                break;

            case 'ai_learning_error':
                console.error('❌ AI学習エラー:', uiUpdate.message);
                
                // エラー時の入力フィールド表示
                const errorInput = document.querySelector('#aiTextInput');
                if (errorInput) {
                    errorInput.style.borderColor = '#f44336';
                    setTimeout(() => errorInput.style.borderColor = '', 3000);
                }
                break;
                
            case 'update_statistics':
                this.uiController.updateStatistics(uiUpdate.stats);
                break;
                
            case 'refresh_all_data':
                location.reload();
                break;
        }
    }

    // AI学習結果表示関数
    displayAILearningResults(uiUpdate) {
        // 結果表示エリア取得/作成
        let resultsContainer = document.getElementById('ai-learning-results');
        
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'ai-learning-results';
            resultsContainer.className = 'ai-learning-results';
            resultsContainer.style.cssText = `
                margin-top: 20px;
                padding: 15px;
                border: 2px solid #4caf50;
                border-radius: 8px;
                background: linear-gradient(135deg, #f8fff8 0%, #e8f5e8 100%);
            `;
            
            // AI学習セクションの下に追加
            const aiSection = document.querySelector('#aiTextInput').closest('.kicho__card');
            if (aiSection) {
                aiSection.appendChild(resultsContainer);
            }
        }
        
        // 結果HTML生成
        const resultHTML = `
            <div class="ai-result-header">
                <h4 style="margin: 0 0 10px 0; color: #4caf50;">
                    🤖 AI学習完了: ${uiUpdate.session_id}
                </h4>
                <div class="ai-metrics" style="display: flex; gap: 20px; margin-bottom: 15px;">
                    <div class="metric">
                        <strong>精度:</strong> ${(uiUpdate.accuracy * 100).toFixed(1)}%
                    </div>
                    <div class="metric">
                        <strong>信頼度:</strong> ${(uiUpdate.confidence * 100).toFixed(1)}%
                    </div>
                    <div class="metric">
                        <strong>処理時間:</strong> ${uiUpdate.processing_time}
                    </div>
                </div>
            </div>
            
            <div class="ai-visualization" style="margin-bottom: 15px;">
                <div class="charts-container" style="display: flex; gap: 10px; justify-content: center;">
                    <div class="accuracy-chart">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: conic-gradient(#4caf50 0deg ${uiUpdate.accuracy * 360}deg, #e0e0e0 ${uiUpdate.accuracy * 360}deg 360deg); display: flex; align-items: center; justify-content: center;">
                            <div style="width: 40px; height: 40px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
                                ${(uiUpdate.accuracy * 100).toFixed(0)}%
                            </div>
                        </div>
                        <div style="text-align: center; font-size: 12px; margin-top: 5px;">精度</div>
                    </div>
                    
                    <div class="confidence-chart">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: conic-gradient(#2196f3 0deg ${uiUpdate.confidence * 360}deg, #e0e0e0 ${uiUpdate.confidence * 360}deg 360deg); display: flex; align-items: center; justify-content: center;">
                            <div style="width: 40px; height: 40px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
                                ${(uiUpdate.confidence * 100).toFixed(0)}%
                            </div>
                        </div>
                        <div style="text-align: center; font-size: 12px; margin-top: 5px;">信頼度</div>
                    </div>
                </div>
            </div>
            
            <div class="ai-rules" style="background: white; padding: 10px; border-radius: 4px; border-left: 4px solid #4caf50;">
                <strong>生成ルール例:</strong><br>
                • Amazon購入 → 消耗品費 (精度: 95%)<br>
                • 電車代 → 旅費交通費 (精度: 92%)<br>
                • Google Ads → 広告宣伝費 (精度: 98%)
            </div>
        `;
        
        // アニメーション付きで表示
        resultsContainer.innerHTML = resultHTML;
        resultsContainer.style.opacity = '0';
        resultsContainer.style.transform = 'translateY(-20px)';
        
        requestAnimationFrame(() => {
            resultsContainer.style.transition = 'all 0.5s ease';
            resultsContainer.style.opacity = '1';
            resultsContainer.style.transform = 'translateY(0)';
        });
        
        // 5秒後に薄くする
        setTimeout(() => {
            resultsContainer.style.opacity = '0.7';
        }, 5000);
    }

    // AI履歴更新関数
    updateAIHistory(sessionData) {
        // 履歴テーブル検索
        const historyContainer = document.querySelector('#aiSessionList, [data-ai-history]');
        
        if (!historyContainer) {
            console.warn('⚠️ AI履歴コンテナが見つかりません');
            return;
        }
        
        // 新しい履歴項目作成
        const historyItem = document.createElement('div');
        historyItem.className = 'kicho__session-item';
        historyItem.innerHTML = `
            <span class="kicho__session-datetime">${sessionData.timestamp}</span>
            <span class="kicho__session-status--success">完了</span>
            <span class="kicho__session-accuracy">${(sessionData.accuracy * 100).toFixed(1)}%</span>
            <span class="kicho__session-id">${sessionData.session_id}</span>
        `;
        
        // 先頭に追加
        historyItem.style.backgroundColor = '#e8f5e8';
        historyContainer.insertBefore(historyItem, historyContainer.firstChild);
        
        // 背景色を元に戻す
        setTimeout(() => {
            historyItem.style.backgroundColor = '';
        }, 2000);
    }
}

// =====================================
// 🚀 初期化・イベント設定
// =====================================

// ページ読み込み完了を待つ
function initializeKicho() {
    console.log('🚀 KICHO UI制御システム初期化開始...');
    console.log('📊 ページ情報:', {
        readyState: document.readyState,
        bodyExists: !!document.body,
        dataPage: document.body?.getAttribute('data-page'),
        url: window.location.href
    });
    
    // ページ判定（より柔軟に）
    const isKichoPage = document.body?.matches('[data-page="kicho_content"]') ||
                       window.location.href.includes('kicho_content') ||
                       window.location.search.includes('page=kicho_content');
    
    if (!isKichoPage) {
        console.log('⚠️ KICHO: 他のページのため初期化スキップ');
        return;
    }
    
    try {
        // UI制御システム初期化
        console.log('🎨 UIController作成中...');
        const uiController = new KichoUIController();
        console.log('✅ UIController作成完了');
        
        console.log('🔄 AjaxManager作成中...');
        const ajaxManager = new KichoAjaxManager(uiController);
        console.log('✅ AjaxManager作成完了');
        
        // グローバルに設定
        window.NAGANO3_KICHO.uiController = uiController;
        window.NAGANO3_KICHO.ajaxManager = ajaxManager;
        
        console.log('🎯 イベントリスナー設定中...');
        
        // data-action ボタンイベント設定
        document.addEventListener('click', async function(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            e.preventDefault();
            e.stopImmediatePropagation(); // 競合防止
            
            const action = target.getAttribute('data-action');
            console.log(`🎯 アクション実行: ${action}`);
            
            try {
                // データ抽出
                const data = extractDataFromTarget(target);
                
                // Ajax送信
                const result = await ajaxManager.sendRequest(action, data, {
                    loadingTarget: target.closest('.kicho__card') || 'body'
                });
                
                console.log(`✅ アクション完了: ${action}`, result);
                
            } catch (error) {
                console.error(`❌ アクション失敗: ${action}`, error);
            }
            
            return false;
        }, true); // useCapture で最優先実行
        
        // データ抽出関数
        function extractDataFromTarget(target) {
            const data = {};
            
            // data-* 属性からの取得
            Object.entries(target.dataset).forEach(([key, value]) => {
                if (key !== 'action') {
                    // キャメルケース → スネークケース変換
                    const phpKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    data[phpKey] = value;
                }
            });
            
            // フォーム要素の値取得
            const action = target.getAttribute('data-action');
            
            if (action === 'execute-integrated-ai-learning') {
                const textArea = document.querySelector('#aiTextInput, [data-ai-input]');
                if (textArea && textArea.value.trim()) {
                    data.text_content = textArea.value.trim();
                }
            }
            
            return data;
        }
        
        // 初期統計データ取得
        setTimeout(() => {
            ajaxManager.sendRequest('get_statistics', {}, { showSuccessNotification: false });
        }, 1000);
        
        // 自動更新設定
        const autoRefresh = setInterval(() => {
            if (document.hidden) return; // 非アクティブ時はスキップ
            
            ajaxManager.sendRequest('get_statistics', {}, { 
                showSuccessNotification: false,
                showLoading: false 
            });
        }, 30000); // 30秒間隔
        
        // ページ離脱時にクリーンアップ
        window.addEventListener('beforeunload', () => {
            clearInterval(autoRefresh);
        });
        
        window.NAGANO3_KICHO.initialized = true;
        console.log('✅ KICHO UI制御システム初期化完了');
        console.log('📊 最終状態:', window.NAGANO3_KICHO);
        
        // グローバルテスト関数追加
        window.testKichoUI = function() {
            console.log('🧪 KICHO UIテスト開始...');
            
            if (!window.NAGANO3_KICHO.uiController) {
                console.error('❌ UIControllerが存在しません');
                return;
            }
            
            // 通知テスト
            window.NAGANO3_KICHO.uiController.showNotification('テスト通知：成功', 'success');
            setTimeout(() => {
                window.NAGANO3_KICHO.uiController.showNotification('テスト通知：エラー', 'error');
            }, 1000);
            
            // カウンター更新テスト
            setTimeout(() => {
                window.NAGANO3_KICHO.uiController.updateCounter('[data-stat="pending_count"]', Math.floor(Math.random() * 10));
            }, 2000);
            
            console