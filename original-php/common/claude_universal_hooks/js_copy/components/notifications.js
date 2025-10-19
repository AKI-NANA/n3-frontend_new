
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
 * 📢 notifications.js - 通知システム分離ファイル
 * common/js/notifications.js
 * 
 * ✅ 統合通知システム
 * ✅ 複数通知管理
 * ✅ アニメーション対応
 * ✅ 自動消去機能
 * 
 * @version 3.2.0
 * @author NAGANO-3 Development Team
 */

"use strict";

console.log("📢 NAGANO-3 notifications.js 読み込み開始");

// =====================================
// 🛡️ 基本名前空間確保
// =====================================
window.NAGANO3 = window.NAGANO3 || {};

// =====================================
// 📢 通知システムクラス定義
// =====================================

class NotificationSystem {
    constructor() {
        this.notifications = new Map();
        this.container = null;
        this.baseZIndex = 999999;
        this.defaultDuration = NAGANO3.config?.notification_duration || 5000;
        this.maxNotifications = NAGANO3.config?.notification_max_count || 5;
        this.animationSpeed = NAGANO3.config?.animation_speed || 300;
        
        this.init();
        console.log('📢 通知システム初期化完了');
    }
    
    /**
     * 初期化処理
     */
    init() {
        this.createContainer();
        this.injectStyles();
        this.setupGlobalHandlers();
    }
    
    /**
     * 通知コンテナ作成
     */
    createContainer() {
        const existing = document.querySelector('#nagano3-notification-container');
        if (existing) existing.remove();
        
        this.container = document.createElement('div');
        this.container.id = 'nagano3-notification-container';
        this.container.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: ${this.baseZIndex} !important;
            pointer-events: none !important;
            width: 400px !important;
            max-width: 90vw !important;
            max-height: 80vh !important;
            overflow: hidden !important;
        `;
        
        document.body.appendChild(this.container);
    }
    
    /**
     * 通知スタイル注入
     */
    injectStyles() {
        const styleId = 'nagano3-notification-styles';
        const existing = document.querySelector(`#${styleId}`);
        if (existing) existing.remove();
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .nagano3-notification {
                background: linear-gradient(135deg, #007cba, #0056b3) !important;
                color: white !important;
                padding: 16px 20px !important;
                margin-bottom: 10px !important;
                border-radius: 12px !important;
                box-shadow: 0 8px 32px rgba(0, 123, 186, 0.3) !important;
                pointer-events: auto !important;
                transform: translateX(100%) !important;
                opacity: 0 !important;
                transition: all ${this.animationSpeed}ms ease !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                border-left: 4px solid rgba(255,255,255,0.3) !important;
                position: relative !important;
                overflow: hidden !important;
            }
            
            .nagano3-notification.show {
                transform: translateX(0) !important;
                opacity: 1 !important;
            }
            
            .nagano3-notification.success {
                background: linear-gradient(135deg, #28a745, #20c997) !important;
                border-left-color: #d4edda !important;
            }
            
            .nagano3-notification.error {
                background: linear-gradient(135deg, #dc3545, #e91e63) !important;
                border-left-color: #f8d7da !important;
            }
            
            .nagano3-notification.warning {
                background: linear-gradient(135deg, #ffc107, #fd7e14) !important;
                color: #212529 !important;
                border-left-color: #fff3cd !important;
            }
            
            .nagano3-notification.info {
                background: linear-gradient(135deg, #17a2b8, #007bff) !important;
                border-left-color: #d1ecf1 !important;
            }
            
            .nagano3-notification::before {
                content: '';
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                height: 2px !important;
                background: rgba(255,255,255,0.5) !important;
                transform-origin: left !important;
            }
            
            .nagano3-notification.with-progress::before {
                animation: nagano3-progress linear !important;
            }
            
            @keyframes nagano3-progress {
                from { transform: scaleX(1); }
                to { transform: scaleX(0); }
            }
            
            .nagano3-notification-close {
                position: absolute !important;
                top: 8px !important;
                right: 12px !important;
                background: none !important;
                border: none !important;
                color: inherit !important;
                font-size: 18px !important;
                cursor: pointer !important;
                opacity: 0.7 !important;
                transition: opacity 0.2s !important;
                width: 20px !important;
                height: 20px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            
            .nagano3-notification-close:hover {
                opacity: 1 !important;
            }
            
            .nagano3-notification-content {
                padding-right: 30px !important;
                word-wrap: break-word !important;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * グローバルハンドラー設定
     */
    setupGlobalHandlers() {
        // ページ離脱時の通知クリア
        window.addEventListener('beforeunload', () => {
            this.clear();
        });
        
        // エスケープキーで全通知クリア
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.notifications.size > 0) {
                this.clear();
            }
        });
    }
    
    /**
     * 通知表示
     */
    show(message, type = 'info', duration = null, options = {}) {
        const showDuration = duration !== null ? duration : this.defaultDuration;
        const id = 'notification-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // 最大通知数チェック
        if (this.notifications.size >= this.maxNotifications) {
            const oldestId = this.notifications.keys().next().value;
            this.hide(oldestId);
        }
        
        const notification = this.createNotification(id, message, type, showDuration, options);
        this.container.appendChild(notification);
        
        this.notifications.set(id, {
            element: notification,
            timer: null,
            duration: showDuration,
            type,
            message,
            timestamp: new Date().toISOString()
        });
        
        // アニメーション開始
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // 自動消去設定
        if (showDuration > 0) {
            const timer = setTimeout(() => {
                this.hide(id);
            }, showDuration);
            
            this.notifications.get(id).timer = timer;
            
            // プログレスバー設定
            if (options.showProgress !== false) {
                notification.classList.add('with-progress');
                notification.style.setProperty('--progress-duration', showDuration + 'ms');
                const progressElement = notification.querySelector('::before');
                if (progressElement) {
                    progressElement.style.animationDuration = showDuration + 'ms';
                }
            }
        }
        
        // 統計記録
        this.recordStats(type);
        
        console.log(`📢 通知表示 [${id}]: ${type} - ${message}`);
        return id;
    }
    
    /**
     * 通知要素作成
     */
    createNotification(id, message, type, duration, options) {
        const notification = document.createElement('div');
        notification.className = `nagano3-notification ${type}`;
        notification.id = id;
        
        const content = document.createElement('div');
        content.className = 'nagano3-notification-content';
        content.textContent = message;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'nagano3-notification-close';
        closeButton.innerHTML = '×';
        closeButton.setAttribute('aria-label', '通知を閉じる');
        closeButton.addEventListener('click', () => {
            this.hide(id);
        });
        
        notification.appendChild(content);
        
        if (options.closable !== false) {
            notification.appendChild(closeButton);
        }
        
        // プログレスバー用スタイル設定
        if (duration > 0 && options.showProgress !== false) {
            notification.style.setProperty('--progress-duration', duration + 'ms');
        }
        
        // クリックアクション
        if (options.onClick && typeof options.onClick === 'function') {
            notification.style.cursor = 'pointer';
            notification.addEventListener('click', (e) => {
                if (e.target !== closeButton) {
                    options.onClick();
                    if (options.closeOnClick !== false) {
                        this.hide(id);
                    }
                }
            });
        }
        
        return notification;
    }
    
    /**
     * 通知非表示
     */
    hide(id) {
        const notificationData = this.notifications.get(id);
        if (!notificationData) return;
        
        const { element, timer } = notificationData;
        
        if (timer) {
            clearTimeout(timer);
        }
        
        element.classList.remove('show');
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.notifications.delete(id);
        }, this.animationSpeed);
        
        console.log(`📢 通知非表示 [${id}]`);
    }
    
    /**
     * 全通知クリア
     */
    clear() {
        const count = this.notifications.size;
        this.notifications.forEach((_, id) => {
            this.hide(id);
        });
        
        if (count > 0) {
            console.log(`📢 全通知クリア: ${count}件`);
        }
    }
    
    /**
     * 通知タイプ別ショートカット
     */
    success(message, duration, options) {
        return this.show(message, 'success', duration, options);
    }
    
    error(message, duration, options) {
        return this.show(message, 'error', duration, options);
    }
    
    warning(message, duration, options) {
        return this.show(message, 'warning', duration, options);
    }
    
    info(message, duration, options) {
        return this.show(message, 'info', duration, options);
    }
    
    /**
     * 統計記録
     */
    recordStats(type) {
        if (!this.stats) {
            this.stats = {
                total: 0,
                success: 0,
                error: 0,
                warning: 0,
                info: 0
            };
        }
        
        this.stats.total++;
        if (this.stats[type] !== undefined) {
            this.stats[type]++;
        }
    }
    
    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            active_notifications: this.notifications.size,
            max_notifications: this.maxNotifications,
            default_duration: this.defaultDuration,
            animation_speed: this.animationSpeed,
            stats: this.stats || { total: 0 },
            container_exists: !!this.container,
            z_index: this.baseZIndex
        };
    }
}

// =====================================
// 🎯 通知システム初期化・設定
// =====================================

/**
 * 通知システム初期化
 */
function initializeNotifications() {
    try {
        console.log('📢 通知システム初期化開始');
        
        // 通知システムインスタンス作成
        const notificationSystem = new NotificationSystem();
        
        // NAGANO3オブジェクトに設定
        NAGANO3.ui = NAGANO3.ui || {};
        NAGANO3.ui.notify = (message, type, duration, options) => notificationSystem.show(message, type, duration, options);
        NAGANO3.ui.notificationSystem = notificationSystem;
        
        // グローバル関数設定（後方互換性）
        window.showNotification = function(message, type = 'info', duration = null, options = {}) {
            return notificationSystem.show(message, type, duration, options);
        };
        
        window.hideNotification = function(id) {
            if (id) {
                notificationSystem.hide(id);
            } else {
                notificationSystem.clear();
            }
        };
        
        window.clearNotifications = function() {
            notificationSystem.clear();
        };
        
        // 便利なショートカット関数
        window.showSuccess = (message, duration, options) => notificationSystem.success(message, duration, options);
        window.showError = (message, duration, options) => notificationSystem.error(message, duration, options);
        window.showWarning = (message, duration, options) => notificationSystem.warning(message, duration, options);
        window.showInfo = (message, duration, options) => notificationSystem.info(message, duration, options);
        
        // 分割ファイル読み込み完了マーク
        if (NAGANO3.splitFiles) {
            NAGANO3.splitFiles.markLoaded('notifications.js');
        }
        
        console.log('✅ 通知システム初期化完了');
        console.log('📊 通知システム設定:', notificationSystem.getDebugInfo());
        
        // 初期化完了通知
        setTimeout(() => {
            notificationSystem.success('通知システム準備完了', 2000);
        }, 1000);
        
    } catch (error) {
        console.error('❌ 通知システム初期化失敗:', error);
        
        // フォールバック通知システム
        window.showNotification = function(message, type = 'info') {
            console.log(`📢 [${type.toUpperCase()}] ${message}`);
            
            // 既存の通知を削除
            const existingNotifications = document.querySelectorAll('.fallback-notification');
            existingNotifications.forEach(n => n.remove());
            
            // フォールバック通知作成
            const notification = document.createElement('div');
            notification.className = 'fallback-notification';
            notification.style.cssText = `
                position: fixed !important;
                top: 20px !important;
                right: 20px !important;
                background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007cba'} !important;
                color: white !important;
                padding: 12px 20px !important;
                border-radius: 8px !important;
                z-index: 999999 !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                max-width: 350px !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 4000);
        };
        
        // フォールバック用の他の関数
        window.hideNotification = () => {};
        window.clearNotifications = () => {};
        window.showSuccess = (message) => window.showNotification(message, 'success');
        window.showError = (message) => window.showNotification(message, 'error');
        window.showWarning = (message) => window.showNotification(message, 'warning');
        window.showInfo = (message) => window.showNotification(message, 'info');
    }
}

// =====================================
// 🏁 初期化実行
// =====================================

// DOM準備完了または即座実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNotifications);
} else {
    initializeNotifications();
}

// デバッグ用グローバル関数
if (NAGANO3.config?.debug) {
    window.NAGANO3_NOTIFICATIONS_DEBUG = {
        info: () => NAGANO3.ui?.notificationSystem?.getDebugInfo ? NAGANO3.ui.notificationSystem.getDebugInfo() : '通知システム未初期化',
        clear: () => NAGANO3.ui?.notificationSystem?.clear ? NAGANO3.ui.notificationSystem.clear() : false,
        test: () => {
            window.showSuccess('成功テスト');
            setTimeout(() => window.showError('エラーテスト'), 500);
            setTimeout(() => window.showWarning('警告テスト'), 1000);
            setTimeout(() => window.showInfo('情報テスト'), 1500);
        }
    };
}

console.log('📢 NAGANO-3 notifications.js 読み込み完了');