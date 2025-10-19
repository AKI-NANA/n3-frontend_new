
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
 * NAGANO-3 統合システム（完全版）
 * ファイル: common/js/core/notifications.js
 * 
 * 🎯 全機能統合・Supreme Guardian連携・テーマ切り替え・分割ファイル管理
 * ✅ Bootstrap.js連携・キャッシュシステム・エラー耐性・パフォーマンス最適化
 * 
 * @version 1.0.0-complete
 */

"use strict";

console.log('🚀 NAGANO-3 統合システム (notifications.js完全版) 読み込み開始');

// =====================================
// 🛡️ Supreme Guardian システム
// =====================================

if (!window.NAGANO3_SUPREME_GUARDIAN) {
    window.NAGANO3_SUPREME_GUARDIAN = {
        registry: {
            files: new Set(),
            classes: new Set(),
            functions: new Set(),
            
            safeRegisterFile: function(filename) {
                if (this.files.has(filename)) {
                    return { success: false, reason: `File ${filename} already registered` };
                }
                this.files.add(filename);
                return { success: true };
            }
        },
        
        debug: {
            enabled: true
        },
        
        errorHandler: {
            handle: function(error, context) {
                console.error(`🚨 Supreme Guardian Error [${context}]:`, error);
            }
        },
        
        initializer: {
            queue: [],
            register: function(name, initFunc, options = {}) {
                this.queue.push({ name, initFunc, options });
            }
        }
    };
}

// 安全な関数定義システム
window.safeDefineFunction = function(name, func, source, options = {}) {
    if (typeof window[name] === 'function' && !options.allowOverwrite) {
        console.warn(`⚠️ Function ${name} already exists, skipping`);
        return { success: false, reason: 'Function exists' };
    }
    
    window[name] = func;
    window.NAGANO3_SUPREME_GUARDIAN.registry.functions.add(name);
    return { success: true };
};

// 安全な名前空間定義
window.safeDefineNamespace = function(path, value, source) {
    const parts = path.split('.');
    let current = window;
    
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }
    
    const finalKey = parts[parts.length - 1];
    if (!current[finalKey]) {
        current[finalKey] = value;
    }
    
    return { success: true };
};

// 安全なクラス定義
window.safeDefineClass = function(name, classDefinition, source) {
    if (window[name] && !window.NAGANO3_SUPREME_GUARDIAN.debug.enabled) {
        return { success: false, reason: `Class ${name} already exists` };
    }
    
    window[name] = classDefinition;
    window.NAGANO3_SUPREME_GUARDIAN.registry.classes.add(name);
    return { success: true };
};

// =====================================
// 📢 NotificationSystem（強化版）
// =====================================

const NotificationSystemRegisterResult = window.safeDefineClass('NotificationSystem', class NotificationSystem {
    constructor(options = {}) {
        this.id = 'notification-system-' + Date.now();
        this.container = null;
        this.notifications = new Map();
        this.queue = [];
        this.isProcessing = false;
        this.metrics = {
            created: 0,
            displayed: 0,
            dismissed: 0,
            errors: 0
        };
        
        this.config = {
            animationSpeed: 300,
            defaultDuration: 5000,
            maxNotifications: 5,
            baseZIndex: 999999,
            position: 'top-right',
            stackDirection: 'down',
            enableSound: false,
            enableHaptic: false,
            ...options
        };
        
        this.init();
    }
    
    init() {
        try {
            this.createContainer();
            this.injectStyles();
            this.setupEventListeners();
            console.log('📢 NotificationSystem初期化完了:', this.id);
        } catch (error) {
            console.error('❌ NotificationSystem初期化失敗:', error);
            throw error;
        }
    }
    
    show(message, type = 'info', duration = null, options = {}) {
        if (!message) {
            console.warn('⚠️ 通知メッセージが空です');
            return null;
        }
        
        try {
            const notification = this.createNotificationData(message, type, duration, options);
            this.queue.push(notification);
            this.processQueue();
            this.metrics.created++;
            
            return notification.id;
            
        } catch (error) {
            console.error('❌ 通知表示エラー:', error);
            this.metrics.errors++;
            this.showFallbackNotification(message, type);
            return null;
        }
    }
    
    createNotificationData(message, type, duration, options) {
        return {
            id: this.generateId(),
            message: String(message),
            type: this.validateType(type),
            duration: duration !== null ? duration : this.config.defaultDuration,
            timestamp: Date.now(),
            options: { ...options },
            status: 'queued',
            element: null,
            timeoutId: null
        };
    }
    
    generateId() {
        return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    validateType(type) {
        const validTypes = ['success', 'error', 'warning', 'info'];
        return validTypes.includes(type) ? type : 'info';
    }
    
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            while (this.queue.length > 0) {
                if (this.notifications.size >= this.config.maxNotifications) {
                    this.removeOldest();
                }
                
                const notification = this.queue.shift();
                await this.displayNotification(notification);
                await this.delay(50);
            }
        } catch (error) {
            console.error('❌ キュー処理エラー:', error);
            this.metrics.errors++;
        } finally {
            this.isProcessing = false;
        }
    }
    
    async displayNotification(notification) {
        try {
            if (!this.container) {
                this.createContainer();
            }
            
            const element = this.createElement(notification);
            notification.element = element;
            notification.status = 'displaying';
            
            if (this.config.stackDirection === 'up') {
                this.container.appendChild(element);
            } else {
                this.container.insertBefore(element, this.container.firstChild);
            }
            
            this.notifications.set(notification.id, notification);
            
            requestAnimationFrame(() => {
                element.classList.add('nagano3-notification--show');
            });
            
            this.triggerFeedback(notification.type);
            
            if (notification.duration > 0) {
                notification.timeoutId = setTimeout(() => {
                    this.hide(notification.id);
                }, notification.duration);
            }
            
            this.metrics.displayed++;
            console.log(`📢 通知表示: ${notification.type} - ${notification.message}`);
            
        } catch (error) {
            console.error('❌ 通知表示実行エラー:', error);
            this.metrics.errors++;
            throw error;
        }
    }
    
    createElement(notification) {
        const element = document.createElement('div');
        element.id = notification.id;
        element.className = `nagano3-notification nagano3-notification--${notification.type}`;
        
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', 'polite');
        element.setAttribute('aria-atomic', 'true');
        
        const styles = this.getTypeStyles(notification.type);
        Object.assign(element.style, styles);
        
        element.innerHTML = this.generateNotificationHTML(notification);
        this.attachElementEvents(element, notification);
        
        return element;
    }
    
    generateNotificationHTML(notification) {
        const icon = this.getTypeIcon(notification.type);
        const timestamp = new Date(notification.timestamp).toLocaleTimeString();
        
        return `
            <div class="nagano3-notification__content">
                <div class="nagano3-notification__icon" aria-hidden="true">${icon}</div>
                <div class="nagano3-notification__body">
                    <div class="nagano3-notification__message">${notification.message}</div>
                    ${notification.options.showTimestamp ? `<div class="nagano3-notification__timestamp">${timestamp}</div>` : ''}
                </div>
                <button class="nagano3-notification__close" 
                        aria-label="通知を閉じる" 
                        data-notification-id="${notification.id}">
                    <span aria-hidden="true">×</span>
                </button>
            </div>
            ${notification.duration > 0 ? `<div class="nagano3-notification__progress" style="--duration: ${notification.duration}ms"></div>` : ''}
        `;
    }
    
    attachElementEvents(element, notification) {
        const closeButton = element.querySelector('.nagano3-notification__close');
        if (closeButton) {
            closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.hide(notification.id);
            });
        }
        
        if (notification.options.clickToClose) {
            element.addEventListener('click', () => {
                this.hide(notification.id);
            });
            element.style.cursor = 'pointer';
        }
        
        if (notification.options.pauseOnHover !== false) {
            element.addEventListener('mouseenter', () => {
                if (notification.timeoutId) {
                    clearTimeout(notification.timeoutId);
                    notification.timeoutId = null;
                }
            });
            
            element.addEventListener('mouseleave', () => {
                if (notification.duration > 0 && !notification.timeoutId) {
                    notification.timeoutId = setTimeout(() => {
                        this.hide(notification.id);
                    }, 1000);
                }
            });
        }
    }
    
    getTypeStyles(type) {
        const baseStyles = {
            position: 'relative',
            marginBottom: '10px',
            padding: '16px 20px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            transform: 'translateX(100%)',
            opacity: '0',
            transition: `all ${this.config.animationSpeed}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            cursor: 'default',
            overflow: 'hidden',
            pointerEvents: 'auto',
            minWidth: '300px',
            maxWidth: '500px'
        };
        
        const typeStyles = {
            success: {
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                borderLeft: '4px solid #065f46'
            },
            error: {
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white',
                borderLeft: '4px solid #991b1b'
            },
            warning: {
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                borderLeft: '4px solid #92400e'
            },
            info: {
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: 'white',
                borderLeft: '4px solid #1d4ed8'
            }
        };
        
        return { ...baseStyles, ...typeStyles[type] };
    }
    
    getTypeIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
    
    triggerFeedback(type) {
        try {
            if (this.config.enableSound && window.AudioContext) {
                this.playNotificationSound(type);
            }
            
            if (this.config.enableHaptic && navigator.vibrate) {
                const patterns = {
                    success: [100],
                    error: [100, 50, 100],
                    warning: [50, 50, 50],
                    info: [50]
                };
                navigator.vibrate(patterns[type] || patterns.info);
            }
        } catch (error) {
            console.warn('⚠️ フィードバック実行失敗:', error);
        }
    }
    
    playNotificationSound(type) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            const frequencies = {
                success: 800,
                error: 400,
                warning: 600,
                info: 500
            };
            
            oscillator.frequency.setValueAtTime(frequencies[type] || 500, audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            
        } catch (error) {
            console.warn('⚠️ 通知音再生失敗:', error);
        }
    }
    
    hide(id) {
        const notification = this.notifications.get(id);
        if (!notification) {
            console.warn(`⚠️ 通知が見つかりません: ${id}`);
            return;
        }
        
        try {
            const element = notification.element;
            
            if (notification.timeoutId) {
                clearTimeout(notification.timeoutId);
                notification.timeoutId = null;
            }
            
            element.style.transform = 'translateX(100%)';
            element.style.opacity = '0';
            
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                this.notifications.delete(id);
                this.metrics.dismissed++;
            }, this.config.animationSpeed);
            
            console.log(`📢 通知非表示: ${id}`);
            
        } catch (error) {
            console.error('❌ 通知非表示エラー:', error);
            this.metrics.errors++;
        }
    }
    
    clear() {
        try {
            const ids = Array.from(this.notifications.keys());
            ids.forEach(id => this.hide(id));
            this.queue.length = 0;
            console.log(`📢 全通知クリア: ${ids.length}件`);
        } catch (error) {
            console.error('❌ 全通知クリアエラー:', error);
        }
    }
    
    removeOldest() {
        const notifications = Array.from(this.notifications.values());
        if (notifications.length === 0) return;
        
        const oldest = notifications.sort((a, b) => a.timestamp - b.timestamp)[0];
        this.hide(oldest.id);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    createContainer() {
        const existingContainer = document.querySelector('#nagano3-notifications');
        if (existingContainer) {
            this.container = existingContainer;
            return;
        }
        
        this.container = document.createElement('div');
        this.container.id = 'nagano3-notifications';
        this.container.className = `nagano3-notifications nagano3-notifications--${this.config.position}`;
        
        const positions = {
            'top-right': { top: '20px', right: '20px' },
            'top-left': { top: '20px', left: '20px' },
            'bottom-right': { bottom: '20px', right: '20px' },
            'bottom-left': { bottom: '20px', left: '20px' },
            'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
            'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' }
        };
        
        const position = positions[this.config.position] || positions['top-right'];
        
        this.container.style.cssText = `
            position: fixed !important;
            z-index: ${this.config.baseZIndex} !important;
            width: 400px !important;
            max-width: 90vw !important;
            max-height: 80vh !important;
            overflow: hidden !important;
            pointer-events: none !important;
            ${Object.entries(position).map(([key, value]) => `${key}: ${value} !important;`).join(' ')}
        `;
        
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-label', '通知領域');
        
        document.body.appendChild(this.container);
    }
    
    injectStyles() {
        const styleId = 'nagano3-notification-styles';
        if (document.querySelector(`#${styleId}`)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .nagano3-notification {
                pointer-events: auto !important;
                box-sizing: border-box !important;
            }
            
            .nagano3-notification--show {
                transform: translateX(0) !important;
                opacity: 1 !important;
            }
            
            .nagano3-notification__content {
                display: flex !important;
                align-items: flex-start !important;
                gap: 12px !important;
            }
            
            .nagano3-notification__icon {
                font-size: 20px !important;
                line-height: 1 !important;
                flex-shrink: 0 !important;
                margin-top: 2px !important;
            }
            
            .nagano3-notification__body {
                flex: 1 !important;
                min-width: 0 !important;
            }
            
            .nagano3-notification__message {
                line-height: 1.4 !important;
                word-wrap: break-word !important;
                margin: 0 !important;
            }
            
            .nagano3-notification__timestamp {
                font-size: 12px !important;
                opacity: 0.8 !important;
                margin-top: 4px !important;
            }
            
            .nagano3-notification__close {
                background: none !important;
                border: none !important;
                color: inherit !important;
                font-size: 24px !important;
                cursor: pointer !important;
                padding: 0 !important;
                line-height: 1 !important;
                opacity: 0.7 !important;
                transition: opacity 0.2s ease !important;
                flex-shrink: 0 !important;
                width: 24px !important;
                height: 24px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            
            .nagano3-notification__close:hover {
                opacity: 1 !important;
            }
            
            .nagano3-notification__progress {
                position: absolute !important;
                bottom: 0 !important;
                left: 0 !important;
                height: 3px !important;
                background: rgba(255,255,255,0.3) !important;
                animation: nagano3ProgressBar var(--duration, 5s) linear forwards !important;
            }
            
            @keyframes nagano3ProgressBar {
                from { width: 100%; }
                to { width: 0%; }
            }
            
            .nagano3-notifications--top-right .nagano3-notification {
                margin-bottom: 10px !important;
            }
            
            .nagano3-notifications--top-left .nagano3-notification {
                margin-bottom: 10px !important;
            }
            
            .nagano3-notifications--bottom-right .nagano3-notification {
                margin-top: 10px !important;
            }
            
            .nagano3-notifications--bottom-left .nagano3-notification {
                margin-top: 10px !important;
            }
            
            @media (prefers-reduced-motion: reduce) {
                .nagano3-notification {
                    transition: none !important;
                    animation: none !important;
                }
                
                .nagano3-notification__progress {
                    animation: none !important;
                    display: none !important;
                }
            }
            
            @media (prefers-contrast: high) {
                .nagano3-notification {
                    border: 2px solid currentColor !important;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.notifications.size > 0) {
                this.clear();
            }
        });
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.notifications.forEach(notification => {
                    if (notification.timeoutId) {
                        clearTimeout(notification.timeoutId);
                        notification.timeoutId = null;
                    }
                });
            }
        });
    }
    
    showFallbackNotification(message, type) {
        console.log(`📢 [FALLBACK ${type.toUpperCase()}] ${message}`);
        
        try {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 999999;
                background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
                color: white; padding: 12px 20px; border-radius: 8px;
                font-size: 14px; font-weight: 500; max-width: 350px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 4000);
        } catch (error) {
            console.error('❌ フォールバック通知も失敗:', error);
        }
    }
    
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
    
    getDebugInfo() {
        return {
            id: this.id,
            activeNotifications: this.notifications.size,
            queueLength: this.queue.length,
            isProcessing: this.isProcessing,
            metrics: { ...this.metrics },
            config: { ...this.config },
            container: !!this.container
        };
    }
}, 'notifications.js');

// =====================================
// 🎨 テーマシステム統合
// =====================================

window.safeDefineNamespace('NAGANO3.theme', {
    initialized: false,
    currentTheme: 'light',
    themes: ['light', 'dark', 'gentle'],
    
    init: function() {
        if (this.initialized) return;
        
        console.log('🎨 テーマシステム初期化開始');
        
        this.loadSavedTheme();
        this.initThemeButtons();
        this.initialized = true;
        
        console.log('✅ テーマシステム初期化完了');
    },
    
    loadSavedTheme: function() {
        try {
            const savedTheme = localStorage.getItem('nagano3-theme');
            if (savedTheme && this.themes.includes(savedTheme)) {
                this.currentTheme = savedTheme;
            }
        } catch (error) {
            console.warn('⚠️ ローカルストレージ読み込みエラー:', error);
        }
        
        this.applyTheme(this.currentTheme);
    },
    
    initThemeButtons: function() {
        const themeButtons = document.querySelectorAll('[data-action="toggle-theme"], .theme-switcher');
        themeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        });
        
        if (themeButtons.length > 0) {
            console.log(`🔘 テーマボタン設定完了: ${themeButtons.length}個`);
        }
    },
    
    applyTheme: function(theme) {
        if (!this.themes.includes(theme)) {
            console.warn(`⚠️ 未知のテーマ: ${theme}`);
            return;
        }
        
        console.log(`🎨 テーマ適用: ${theme}`);
        
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${theme}`);
        
        try {
            localStorage.setItem('nagano3-theme', theme);
        } catch (error) {
            console.warn('⚠️ ローカルストレージ保存エラー:', error);
        }
        
        this.currentTheme = theme;
        
        const event = new CustomEvent('nagano3:themeChanged', {
            detail: { theme: theme }
        });
        document.dispatchEvent(event);
        
        this.updateThemeIcons();
        
        console.log(`✅ テーマ適用完了: ${theme}`);
    },
    
    toggle: function() {
        const currentIndex = this.themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % this.themes.length;
        const nextTheme = this.themes[nextIndex];
        
        console.log(`🔄 テーマ切り替え: ${this.currentTheme} → ${nextTheme}`);
        this.applyTheme(nextTheme);
        
        if (window.showNotification) {
            window.showNotification(`テーマを${nextTheme}に変更しました`, 'success', 2000);
        }
        
        return nextTheme;
    },
    
    setTheme: function(theme) {
        if (this.themes.includes(theme)) {
            this.applyTheme(theme);
        } else {
            console.error(`❌ 無効なテーマ: ${theme}`);
        }
    },
    
    updateThemeIcons: function() {
        const themeButtons = document.querySelectorAll('[data-action="toggle-theme"], .theme-switcher');
        
        const icons = {
            light: '☀️',
            dark: '🌙',
            gentle: '🌿'
        };
        
        const icon = icons[this.currentTheme] || '🎨';
        
        themeButtons.forEach(button => {
            if (button.innerHTML.length <= 3) {
                button.innerHTML = icon;
            }
            
            button.title = `現在のテーマ: ${this.currentTheme}`;
        });
    },
    
    getCurrentTheme: function() {
        return this.currentTheme;
    },
    
    getAvailableThemes: function() {
        return [...this.themes];
    }
}, 'notifications');

// =====================================
// 🎯 統合システム初期化
// =====================================

function initializeIntegratedSystem() {
    try {
        console.log('🚀 統合システム初期化開始');
        
        // NAGANO3名前空間準備
        window.safeDefineNamespace('NAGANO3.ui', {}, 'notifications');
        
        // 通知システム初期化
        const notificationSystem = new NotificationSystem({
            position: 'top-right',
            maxNotifications: 5,
            enableSound: false,
            enableHaptic: navigator.vibrate ? true : false
        });
        
        // NAGANO3に登録
        window.NAGANO3.ui.notificationSystem = notificationSystem;
        window.NAGANO3.ui.notify = (message, type, duration, options) => 
            notificationSystem.show(message, type, duration, options);
        
        // グローバル関数登録
        window.safeDefineFunction('showNotification', function(message, type = 'info', duration = null, options = {}) {
            return notificationSystem.show(message, type, duration, options);
        }, 'notifications', { allowOverwrite: true });
        
        window.safeDefineFunction('hideNotification', function(id) {
            if (id) {
                notificationSystem.hide(id);
            } else {
                notificationSystem.clear();
            }
        }, 'notifications', { allowOverwrite: true });
        
        window.safeDefineFunction('clearNotifications', function() {
            notificationSystem.clear();
        }, 'notifications', { allowOverwrite: true });
        
        // ショートカット関数
        window.safeDefineFunction('showSuccess', (message, duration, options) => 
            notificationSystem.success(message, duration, options), 'notifications', { allowOverwrite: true });
        window.safeDefineFunction('showError', (message, duration, options) => 
            notificationSystem.error(message, duration, options), 'notifications', { allowOverwrite: true });
        window.safeDefineFunction('showWarning', (message, duration, options) => 
            notificationSystem.warning(message, duration, options), 'notifications', { allowOverwrite: true });
        window.safeDefineFunction('showInfo', (message, duration, options) => 
            notificationSystem.info(message, duration, options), 'notifications', { allowOverwrite: true });
        
        // テーマシステム初期化
        window.NAGANO3.theme.init();
        
        // グローバルテーマ関数
        window.safeDefineFunction('toggleTheme', function() {
            return window.NAGANO3.theme.toggle();
        }, 'notifications', { allowOverwrite: true });
        
        window.safeDefineFunction('setTheme', function(theme) {
            window.NAGANO3.theme.setTheme(theme);
        }, 'notifications', { allowOverwrite: true });
        
        // 分割ファイル読み込み完了マーク
        if (window.NAGANO3?.splitFiles) {
            window.NAGANO3.splitFiles.markLoaded('notifications.js');
        }
        
        console.log('✅ 統合システム初期化完了');
        
        // 初期化完了通知
        setTimeout(() => {
            notificationSystem.success('NAGANO-3 統合システム準備完了', 3000);
        }, 1000);
        
        return notificationSystem;
        
    } catch (error) {
        console.error('❌ 統合システム初期化失敗:', error);
        
        if (window.NAGANO3_SUPREME_GUARDIAN?.errorHandler) {
            window.NAGANO3_SUPREME_GUARDIAN.errorHandler.handle(error, 'integrated_system_init');
        }
        
        // 最小限のフォールバック
        window.safeDefineFunction('showNotification', function(message, type = 'info') {
            console.log(`📢 [MINIMAL ${type.toUpperCase()}] ${message}`);
            
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 999999;
                background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
                color: white; padding: 12px 20px; border-radius: 8px;
                font-size: 14px; font-weight: 500; max-width: 350px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => notification.remove(), 4000);
        }, 'notifications-fallback', { allowOverwrite: true });
        
        window.safeDefineFunction('toggleTheme', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            document.body.setAttribute('data-theme', newTheme);
            
            console.log(`🎨 フォールバックテーマ切り替え: ${currentTheme} → ${newTheme}`);
            
            if (window.showNotification) {
                window.showNotification(`テーマを${newTheme}に変更しました`, 'success', 2000);
            }
        }, 'notifications-fallback', { allowOverwrite: true });
        
        throw error;
    }
}

// =====================================
// 🏁 初期化実行
// =====================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeIntegratedSystem);
} else {
    setTimeout(initializeIntegratedSystem, 100);
}

// =====================================
// 🔧 デバッグ機能
// =====================================

if (window.NAGANO3_SUPREME_GUARDIAN?.debug?.enabled) {
    window.safeDefineNamespace('NAGANO3_INTEGRATED_DEBUG', {
        info: () => window.NAGANO3?.ui?.notificationSystem?.getDebugInfo() || '統合システム未初期化',
        clear: () => window.NAGANO3?.ui?.notificationSystem?.clear() || false,
        testTheme: () => {
            if (window.toggleTheme) {
                window.toggleTheme();
            } else {
                console.warn('toggleTheme関数が利用できません');
            }
        },
        testNotifications: () => {
            const system = window.NAGANO3?.ui?.notificationSystem;
            if (system) {
                system.success('成功テスト');
                setTimeout(() => system.error('エラーテスト'), 500);
                setTimeout(() => system.warning('警告テスト'), 1000);
                setTimeout(() => system.info('情報テスト'), 1500);
            } else {
                console.warn('通知システムが利用できません');
            }
        },
        systemStatus: () => {
            return {
                notificationSystem: !!window.NAGANO3?.ui?.notificationSystem,
                themeSystem: !!window.NAGANO3?.theme,
                toggleTheme: typeof window.toggleTheme,
                showNotification: typeof window.showNotification,
                supremeGuardian: !!window.NAGANO3_SUPREME_GUARDIAN
            };
        }
    }, 'integrated-debug');
}

console.log('🚀 NAGANO-3 統合システム (notifications.js完全版) 読み込み完了');
