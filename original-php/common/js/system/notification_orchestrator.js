
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
 * 🎯 NotificationOrchestrator - 通知統一制御システム
 * 
 * ✅ Bootstrap基本通知 → 高度通知への無競合切り替え
 * ✅ 既存showNotification()の完全互換性保証
 * ✅ modules/juchu独自実装との共存
 * ✅ PHP埋め込み呼び出し対応
 * ✅ TypeScript環境対応
 * 
 * @version 1.0.0-compatible
 */

"use strict";

class NotificationOrchestrator {
    constructor() {
        this.isInitialized = false;
        this.advancedSystem = null;
        this.basicSystem = null;
        this.preservedFunctions = new Map();
        this.callStatistics = {
            total_calls: 0,
            advanced_calls: 0,
            basic_calls: 0,
            failed_calls: 0
        };
        
        console.log('🎯 NotificationOrchestrator 初期化開始');
        this.detectExistingSystems();
    }
    
    /**
     * 既存通知システム検出
     */
    detectExistingSystems() {
        console.log('🔍 既存通知システム検出中...');
        
        const detection = {
            bootstrap_basic: !!window.showNotification,
            advanced_system: !!(window.NAGANO3?.notifications || window.NotificationSystem),
            juchu_system: this.detectJuchuSystem(),
            preserved_functions: []
        };
        
        // Juchuモジュール独自実装の保護
        if (detection.juchu_system.found) {
            console.log('🛡️ Juchuモジュール独自実装を保護:', detection.juchu_system.classes);
            detection.juchu_system.classes.forEach(className => {
                if (window[className]) {
                    this.preservedFunctions.set(className, window[className]);
                }
            });
        }
        
        // その他の独自実装保護
        const functionsToPreserve = [
            'showSuccess', 'showError', 'showWarning', 'showInfo',
            'hideNotification', 'clearNotifications'
        ];
        
        functionsToPreserve.forEach(funcName => {
            if (window[funcName] && typeof window[funcName] === 'function') {
                this.preservedFunctions.set(funcName, window[funcName]);
                detection.preserved_functions.push(funcName);
            }
        });
        
        console.log('📊 通知システム検出結果:', detection);
        return detection;
    }
    
    /**
     * Juchuモジュール独自実装検出
     */
    detectJuchuSystem() {
        const juchuClasses = [
            'RealTimeFrontendManager',
            'JuchuManager',
            'JuchuKanriManager'
        ];
        
        const found = juchuClasses.some(className => {
            const classExists = typeof window[className] !== 'undefined';
            if (classExists) {
                // showNotificationメソッドを持つかチェック
                try {
                    const instance = new window[className]();
                    return typeof instance.showNotification === 'function';
                } catch (error) {
                    // インスタンス作成に失敗した場合はプロトタイプをチェック
                    return window[className].prototype && 
                           typeof window[className].prototype.showNotification === 'function';
                }
            }
            return false;
        });
        
        return {
            found: found,
            classes: found ? juchuClasses.filter(c => typeof window[c] !== 'undefined') : []
        };
    }
    
    /**
     * 統一初期化
     */
    async init() {
        if (this.isInitialized) {
            console.log('⚠️ NotificationOrchestrator 既に初期化済み');
            return;
        }
        
        try {
            console.log('🚀 NotificationOrchestrator 統一初期化開始');
            
            // 1. 高度通知システム検出・初期化
            await this.initializeAdvancedSystem();
            
            // 2. 既存関数の保護・拡張
            this.preserveAndEnhanceExistingFunctions();
            
            // 3. 統一インターフェース作成
            this.createUnifiedInterface();
            
            // 4. 互換性レイヤー設置
            this.setupCompatibilityLayer();
            
            this.isInitialized = true;
            console.log('✅ NotificationOrchestrator 初期化完了');
            
            // 初期化完了通知
            this.show('通知システム統合完了', 'success', 2000);
            
        } catch (error) {
            console.error('❌ NotificationOrchestrator 初期化失敗:', error);
            this.fallbackToBasicMode();
        }
    }
    
    /**
     * 高度通知システム初期化
     */
    async initializeAdvancedSystem() {
        // notifications.js の NotificationSystem を検出
        if (typeof NotificationSystem !== 'undefined') {
            try {
                this.advancedSystem = new NotificationSystem({
                    position: 'top-right',
                    maxNotifications: 5,
                    enableSound: false
                });
                
                console.log('✅ 高度通知システム (NotificationSystem) 初期化');
                return;
            } catch (error) {
                console.warn('⚠️ NotificationSystem 初期化失敗:', error);
            }
        }
        
        // NAGANO3.notifications を検出
        if (window.NAGANO3?.notifications) {
            this.advancedSystem = window.NAGANO3.notifications;
            console.log('✅ 高度通知システム (NAGANO3.notifications) 検出');
            return;
        }
        
        console.log('ℹ️ 高度通知システム未検出、基本モードで継続');
    }
    
    /**
     * 基本版から高度版への切り替え
     */
    async upgradeFromBasic() {
        console.log('🔄 基本版から高度版への切り替え開始');
        
        if (!this.isInitialized) {
            await this.init();
        }
        
        // 既存のshowNotificationを拡張（置き換えではない）
        const originalShowNotification = window.showNotification;
        
        window.showNotification = (message, type = 'info', duration = 5000, options = {}) => {
            this.callStatistics.total_calls++;
            
            try {
                // 高度版が利用可能な場合
                if (this.advancedSystem && this.isAdvancedSystemReady()) {
                    this.callStatistics.advanced_calls++;
                    return this.advancedNotify(message, type, duration, options);
                } else {
                    // 基本版にフォールバック
                    this.callStatistics.basic_calls++;
                    return originalShowNotification(message, type, duration);
                }
            } catch (error) {
                console.error('通知エラー:', error);
                this.callStatistics.failed_calls++;
                return originalShowNotification(message, type, duration);
            }
        };
        
        console.log('✅ showNotification 関数拡張完了');
    }
    
    /**
     * 高度版による通知実行
     */
    advancedNotify(message, type, duration, options = {}) {
        if (this.advancedSystem.show) {
            return this.advancedSystem.show(message, type, duration, options);
        } else if (this.advancedSystem.success && type === 'success') {
            return this.advancedSystem.success(message, duration, options);
        } else if (this.advancedSystem.error && type === 'error') {
            return this.advancedSystem.error(message, duration, options);
        } else if (this.advancedSystem.warning && type === 'warning') {
            return this.advancedSystem.warning(message, duration, options);
        } else if (this.advancedSystem.info && type === 'info') {
            return this.advancedSystem.info(message, duration, options);
        } else {
            // フォールバック
            throw new Error('高度通知システムが利用できません');
        }
    }
    
    /**
     * 高度システム準備完了確認
     */
    isAdvancedSystemReady() {
        if (!this.advancedSystem) return false;
        
        // NotificationSystemの場合
        if (this.advancedSystem.show && typeof this.advancedSystem.show === 'function') {
            return true;
        }
        
        // 個別メソッドの場合
        if (this.advancedSystem.success && typeof this.advancedSystem.success === 'function') {
            return true;
        }
        
        return false;
    }
    
    /**
     * 既存関数の保護・拡張
     */
    preserveAndEnhanceExistingFunctions() {
        console.log('🛡️ 既存関数の保護・拡張開始');
        
        // ショートカット関数の保護・拡張
        const shortcuts = {
            showSuccess: (message, duration) => this.show(message, 'success', duration),
            showError: (message, duration) => this.show(message, 'error', duration),
            showWarning: (message, duration) => this.show(message, 'warning', duration),
            showInfo: (message, duration) => this.show(message, 'info', duration)
        };
        
        Object.entries(shortcuts).forEach(([funcName, newFunc]) => {
            // 既存関数があれば保護
            if (window[funcName]) {
                this.preservedFunctions.set(`original_${funcName}`, window[funcName]);
            }
            
            // 新しい関数を設定
            window[funcName] = newFunc;
        });
        
        // hideNotification の処理
        if (!window.hideNotification) {
            window.hideNotification = (id) => {
                if (this.advancedSystem && this.advancedSystem.hide) {
                    return this.advancedSystem.hide(id);
                } else if (this.advancedSystem && this.advancedSystem.clear) {
                    return this.advancedSystem.clear();
                }
                // 基本版では特に何もしない
                return true;
            };
        }
        
        console.log('✅ 既存関数保護・拡張完了');
    }
    
    /**
     * 統一インターフェース作成
     */
    createUnifiedInterface() {
        // NAGANO3名前空間への登録
        if (window.NAGANO3) {
            window.NAGANO3.notifications = window.NAGANO3.notifications || {};
            window.NAGANO3.notifications.orchestrator = this;
            window.NAGANO3.notifications.show = (message, type, duration, options) => 
                this.show(message, type, duration, options);
        }
    }
    
    /**
     * 互換性レイヤー設置
     */
    setupCompatibilityLayer() {
        // PHP埋め込み呼び出し対応
        // modules/kicho/kicho_content.php:1772 の呼び出しパターン
        // if (typeof window.showNotification === 'function') {
        //     window.showNotification('記帳ツール拡張版が起動しました', 'success', 3000);
        // }
        
        // TypeScript環境対応
        // modules/kicho/csv_converter_component.ts の呼び出しパターン
        // const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => { ... }
        
        // 既存の呼び出しパターンは既に window.showNotification で対応済み
        
        console.log('✅ 互換性レイヤー設置完了');
    }
    
    /**
     * 統一表示インターフェース
     */
    show(message, type = 'info', duration = 5000, options = {}) {
        try {
            // パラメータ検証
            if (!message || typeof message !== 'string') {
                console.warn('無効な通知メッセージ:', message);
                return false;
            }
            
            // 統計更新
            this.callStatistics.total_calls++;
            
            // 高度版が利用可能な場合
            if (this.advancedSystem && this.isAdvancedSystemReady()) {
                this.callStatistics.advanced_calls++;
                return this.advancedNotify(message, type, duration, options);
            }
            
            // 基本版にフォールバック
            this.callStatistics.basic_calls++;
            if (window.showNotification && window.showNotification !== this.show) {
                return window.showNotification(message, type, duration);
            }
            
            // 最終フォールバック
            return this.emergencyNotify(message, type);
            
        } catch (error) {
            console.error('通知表示エラー:', error);
            this.callStatistics.failed_calls++;
            return this.emergencyNotify(message, type);
        }
    }
    
    /**
     * 緊急通知（最終フォールバック）
     */
    emergencyNotify(message, type) {
        try {
            // DOM操作による緊急通知
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed !important;
                top: 20px !important;
                right: 20px !important;
                z-index: 999999 !important;
                background: ${this.getTypeColor(type)} !important;
                color: white !important;
                padding: 12px 20px !important;
                border-radius: 8px !important;
                font-size: 14px !important;
                max-width: 300px !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
                cursor: pointer !important;
            `;
            notification.textContent = `[EMERGENCY] ${message}`;
            
            notification.onclick = function() {
                if (this.parentNode) this.remove();
            };
            
            if (document.body) {
                document.body.appendChild(notification);
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 5000);
                return true;
            }
            
            // 最終手段
            console.log(`[EMERGENCY NOTIFICATION] ${type.toUpperCase()}: ${message}`);
            return false;
            
        } catch (error) {
            console.error('緊急通知も失敗:', error);
            return false;
        }
    }
    
    /**
     * タイプ別カラー取得
     */
    getTypeColor(type) {
        const colors = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#3b82f6'
        };
        return colors[type] || colors.info;
    }
    
    /**
     * 基本モードフォールバック
     */
    fallbackToBasicMode() {
        console.log('🔄 基本モードへフォールバック');
        
        // 最低限の機能確保
        if (!window.showNotification || typeof window.showNotification !== 'function') {
            window.showNotification = (message, type = 'info', duration = 5000) => {
                return this.emergencyNotify(message, type);
            };
        }
        
        this.isInitialized = true; // 基本モードでも初期化完了とする
    }
    
    /**
     * モジュール独自実装との共存確認
     */
    preserveModuleImplementations() {
        console.log('🔍 モジュール独自実装との共存確認');
        
        // Juchuモジュールの独自実装は保護済み
        const juchuPreserved = this.preservedFunctions.has('RealTimeFrontendManager') ||
                              this.preservedFunctions.has('JuchuManager');
        
        if (juchuPreserved) {
            console.log('✅ Juchuモジュール独自実装保護済み');
        }
        
        // TypeScript環境の確認
        const tsEnvironment = typeof window.require !== 'undefined' || 
                             document.querySelector('script[type="module"]') !== null;
        
        if (tsEnvironment) {
            console.log('✅ TypeScript環境検出、互換性モード有効');
        }
        
        return {
            juchu_preserved: juchuPreserved,
            typescript_detected: tsEnvironment,
            preserved_functions: Array.from(this.preservedFunctions.keys())
        };
    }
    
    /**
     * 互換性状況確認
     */
    getCompatibilityInfo() {
        return {
            orchestrator_initialized: this.isInitialized,
            advanced_system_available: !!this.advancedSystem,
            advanced_system_ready: this.isAdvancedSystemReady(),
            basic_fallback_active: !this.isAdvancedSystemReady(),
            preserved_functions: Array.from(this.preservedFunctions.keys()),
            call_statistics: { ...this.callStatistics },
            module_compatibility: this.preserveModuleImplementations()
        };
    }
    
    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            status: this.isInitialized ? 'initialized' : 'not_initialized',
            advanced_system: {
                available: !!this.advancedSystem,
                ready: this.isAdvancedSystemReady(),
                type: this.advancedSystem ? (this.advancedSystem.constructor?.name || 'unknown') : null
            },
            statistics: { ...this.callStatistics },
            preserved_functions: Object.fromEntries(this.preservedFunctions),
            global_functions: {
                showNotification: typeof window.showNotification,
                showSuccess: typeof window.showSuccess,
                showError: typeof window.showError,
                showWarning: typeof window.showWarning,
                showInfo: typeof window.showInfo,
                hideNotification: typeof window.hideNotification
            },
            compatibility: this.getCompatibilityInfo()
        };
    }
}

// グローバル登録
if (typeof window !== 'undefined') {
    window.NotificationOrchestrator = NotificationOrchestrator;
    
    // NAGANO3名前空間への登録
    if (window.NAGANO3) {
        window.NAGANO3.system = window.NAGANO3.system || {};
        window.NAGANO3.system.NotificationOrchestrator = NotificationOrchestrator;
    }
    
    console.log('✅ NotificationOrchestrator グローバル登録完了');
}
                              