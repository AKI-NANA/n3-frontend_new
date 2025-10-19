
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
 * NAGANO-3 Compatibility Layer System【完全実装版】
 * ファイル: common/js/system/compatibility_layer.js
 * 
 * 🔗 既存HTML・PHP呼び出し完全保護・段階的移行サポート
 * ✅ modules/juchu独自実装保護・TypeScript互換性・エイリアス管理
 * 
 * @version 1.0.0-complete
 */

"use strict";

console.log('🔗 NAGANO-3 Compatibility Layer System 読み込み開始');

// =====================================
// 🛡️ CompatibilityLayer メインクラス
// =====================================

class CompatibilityLayer {
    constructor() {
        this.preservedFunctions = new Map();
        this.aliases = new Map();
        this.usageMonitoring = new Map();
        this.moduleImplementations = new Map();
        this.migrationStatus = new Map();
        
        // 既存システムとの互換性設定
        this.compatibilityMode = 'strict'; // strict, loose, migration
        this.preserveOriginals = true;
        this.monitorUsage = true;
        
        // 初期化実行
        this.init();
    }
    
    /**
     * 初期化メイン処理
     */
    async init() {
        try {
            console.log('🔗 Compatibility Layer 初期化開始');
            
            // 1. 既存関数の完全保護
            await this.preserveExistingFunctions();
            
            // 2. モジュール独自実装の保護
            await this.protectModuleImplementations();
            
            // 3. エイリアス作成
            await this.createAliases();
            
            // 4. TypeScript互換性確保
            await this.setupTypeScriptCompatibility();
            
            // 5. 使用状況監視開始
            if (this.monitorUsage) {
                this.startUsageMonitoring();
            }
            
            // 6. 段階的移行サポート設定
            this.setupMigrationSupport();
            
            console.log('✅ Compatibility Layer 初期化完了');
            
        } catch (error) {
            console.error('❌ Compatibility Layer 初期化エラー:', error);
            throw error;
        }
    }
    
    /**
     * 既存関数の完全保護（最重要）
     */
    async preserveExistingFunctions() {
        console.log('🛡️ 既存関数保護開始');
        
        // showNotification系の完全保護
        await this.preserveNotificationFunctions();
        
        // ダッシュボード関連関数保護
        await this.preserveDashboardFunctions();
        
        // API関連関数保護
        await this.preserveAPIFunctions();
        
        // その他重要関数保護
        await this.preserveUtilityFunctions();
        
        console.log(`🛡️ 既存関数保護完了: ${this.preservedFunctions.size}個の関数を保護`);
    }
    
    /**
     * 通知関数系の保護
     */
    async preserveNotificationFunctions() {
        const notificationFunctions = [
            'showNotification',
            'showSuccess', 
            'showError',
            'showWarning', 
            'showInfo',
            'hideNotification',
            'clearNotifications'
        ];
        
        notificationFunctions.forEach(funcName => {
            if (window[funcName] && typeof window[funcName] === 'function') {
                // 元の関数を保護
                this.preservedFunctions.set(funcName, window[funcName]);
                
                // 互換性レイヤーでラップ
                const originalFunc = window[funcName];
                window[funcName] = this.createCompatibilityWrapper(funcName, originalFunc);
                
                console.log(`✅ 保護完了: ${funcName}`);
            } else {
                // 関数が存在しない場合、基本実装を提供
                this.createBasicImplementation(funcName);
                console.log(`🔧 基本実装作成: ${funcName}`);
            }
        });
        
        // showNotification の特別処理（全呼び出しパターン対応）
        this.enhanceShowNotification();
    }
    
    /**
     * showNotification の完全互換性強化
     */
    enhanceShowNotification() {
        const originalShowNotification = this.preservedFunctions.get('showNotification') || window.showNotification;
        
        window.showNotification = function(message, type = 'info', duration = 5000, options = {}) {
            try {
                // 使用状況記録
                if (window.NAGANO3?.compatibilityLayer?.monitorUsage) {
                    window.NAGANO3.compatibilityLayer.recordUsage('showNotification', arguments);
                }
                
                // 引数パターン検証・正規化
                const normalizedArgs = window.NAGANO3?.compatibilityLayer?.normalizeNotificationArgs(
                    message, type, duration, options
                ) || { message, type, duration, options };
                
                // 高度システムが利用可能な場合
                if (window.NAGANO3?.notifications?.show && typeof window.NAGANO3.notifications.show === 'function') {
                    return window.NAGANO3.notifications.show(
                        normalizedArgs.message, 
                        normalizedArgs.type, 
                        normalizedArgs.duration, 
                        normalizedArgs.options
                    );
                }
                
                // 元の実装を呼び出し
                if (originalShowNotification) {
                    return originalShowNotification.call(this, 
                        normalizedArgs.message, 
                        normalizedArgs.type, 
                        normalizedArgs.duration
                    );
                }
                
                // フォールバック実装
                return window.NAGANO3?.compatibilityLayer?.fallbackNotification(
                    normalizedArgs.message, 
                    normalizedArgs.type, 
                    normalizedArgs.duration
                );
                
            } catch (error) {
                console.error('showNotification error:', error);
                
                // 最終フォールバック
                console.log(`📢 [FALLBACK ${type?.toUpperCase() || 'INFO'}] ${message}`);
                return false;
            }
        };
        
        console.log('🔧 showNotification 完全互換性強化完了');
    }
    
    /**
     * 通知引数の正規化
     */
    normalizeNotificationArgs(message, type, duration, options) {
        // 引数パターンの検出・正規化
        
        // パターン1: showNotification(message, type, duration, options)
        if (typeof message === 'string' && typeof type === 'string') {
            return {
                message: message,
                type: type || 'info',
                duration: duration || 5000,
                options: options || {}
            };
        }
        
        // パターン2: showNotification(type, title, message, duration) - juchu独自
        if (['success', 'error', 'warning', 'info'].includes(message) && typeof type === 'string') {
            return {
                message: `${type}: ${duration || ''}`,
                type: message,
                duration: options || 5000,
                options: {}
            };
        }
        
        // パターン3: showNotification(message) - 基本
        if (typeof message === 'string' && !type) {
            return {
                message: message,
                type: 'info',
                duration: 5000,
                options: {}
            };
        }
        
        // デフォルト
        return {
            message: String(message || ''),
            type: type || 'info',
            duration: duration || 5000,
            options: options || {}
        };
    }
    
    /**
     * フォールバック通知実装
     */
    fallbackNotification(message, type, duration) {
        try {
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
                font-weight: 500 !important;
                max-width: 350px !important;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                word-wrap: break-word !important;
                transition: all 0.3s ease !important;
                transform: translateX(100%) !important;
                opacity: 0 !important;
            `;
            
            notification.textContent = message;
            
            if (document.body) {
                document.body.appendChild(notification);
                
                // アニメーション
                requestAnimationFrame(() => {
                    notification.style.transform = 'translateX(0)';
                    notification.style.opacity = '1';
                });
                
                // 自動削除
                setTimeout(() => {
                    notification.style.transform = 'translateX(100%)';
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                }, duration);
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Fallback notification error:', error);
            console.log(`📢 [CONSOLE ${type?.toUpperCase() || 'INFO'}] ${message}`);
            return false;
        }
    }
    
    /**
     * 通知タイプの色取得
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
     * ダッシュボード関連関数保護
     */
    async preserveDashboardFunctions() {
        const dashboardFunctions = [
            'updateDashboardStats',
            'loadDashboardStats',
            'refreshDashboard',
            'updateStatCards'
        ];
        
        dashboardFunctions.forEach(funcName => {
            if (window[funcName] && typeof window[funcName] === 'function') {
                this.preservedFunctions.set(funcName, window[funcName]);
                
                // ラッパー作成
                const originalFunc = window[funcName];
                window[funcName] = this.createCompatibilityWrapper(funcName, originalFunc);
                
                console.log(`✅ ダッシュボード関数保護: ${funcName}`);
            }
        });
        
        // updateDashboardStats の特別処理
        if (!window.updateDashboardStats) {
            window.updateDashboardStats = function(data) {
                console.log('📊 Dashboard stats update:', data);
                
                if (window.NAGANO3?.dashboard?.updateStats) {
                    return window.NAGANO3.dashboard.updateStats(data);
                }
                
                // フォールバック: safeUpdateStats 使用
                if (window.safeUpdateStats) {
                    return window.safeUpdateStats(data);
                }
                
                return 0;
            };
        }
    }
    
    /**
     * API関連関数保護
     */
    async preserveAPIFunctions() {
        const apiFunctions = [
            'testAPIKey',
            'deleteAPIKey',
            'saveAPIKey',
            'loadAPIKeys'
        ];
        
        apiFunctions.forEach(funcName => {
            if (window[funcName] && typeof window[funcName] === 'function') {
                this.preservedFunctions.set(funcName, window[funcName]);
                
                const originalFunc = window[funcName];
                window[funcName] = this.createCompatibilityWrapper(funcName, originalFunc);
                
                console.log(`✅ API関数保護: ${funcName}`);
            }
        });
        
        // 基本実装の提供
        if (!window.testAPIKey) {
            window.testAPIKey = function(keyId, keyName = 'Unknown') {
                console.log(`🔑 API Key Test: ${keyName} (ID: ${keyId})`);
                
                if (window.NAGANO3?.ajax?.request) {
                    return window.NAGANO3.ajax.request('test_api_key', { 
                        key_id: keyId, 
                        key_name: keyName 
                    });
                }
                
                return Promise.resolve({ success: false, error: 'Ajax system unavailable' });
            };
        }
        
        if (!window.deleteAPIKey) {
            window.deleteAPIKey = function(keyId) {
                console.log(`🗑️ API Key Delete: ID ${keyId}`);
                
                if (confirm('本当にこのAPIキーを削除しますか？')) {
                    if (window.NAGANO3?.ajax?.request) {
                        return window.NAGANO3.ajax.request('delete_api_key', { key_id: keyId });
                    }
                }
                
                return Promise.resolve({ success: false, error: 'User cancelled or Ajax unavailable' });
            };
        }
    }
    
    /**
     * モジュール独自実装の保護
     */
    async protectModuleImplementations() {
        console.log('🛡️ モジュール独自実装保護開始');
        
        // Juchuモジュールの保護
        await this.protectJuchuImplementation();
        
        // Kichoモジュールの保護
        await this.protectKichoImplementation();
        
        // その他モジュールの保護
        await this.protectOtherModules();
        
        console.log('✅ モジュール独自実装保護完了');
    }
    
    /**
     * Juchuモジュール専用実装保護
     */
    async protectJuchuImplementation() {
        // juchu/real_time_frontend_manager.js の showNotification(type, title, message, duration) 保護
        // juchu/juchu_kanri.js の showNotification(message, type) 保護
        
        const juchuElements = document.querySelectorAll('[data-module="juchu"], .juchu-module');
        
        if (juchuElements.length > 0) {
            console.log('🛡️ Juchuモジュール検出、独自実装を保護');
            
            // Juchuモジュール専用名前空間作成
            if (!window.JuchuCompat) {
                window.JuchuCompat = {
                    originalShowNotification: null,
                    
                    // Juchu専用showNotification（独自引数パターン対応）
                    showNotification: function(arg1, arg2, arg3, arg4) {
                        // パターン1: showNotification(type, title, message, duration)
                        if (['success', 'error', 'warning', 'info'].includes(arg1)) {
                            const message = arg2 ? `${arg2}: ${arg3 || ''}` : arg3 || '';
                            const type = arg1;
                            const duration = arg4 || 5000;
                            
                            return window.showNotification(message, type, duration);
                        }
                        
                        // パターン2: showNotification(message, type)  
                        return window.showNotification(arg1, arg2 || 'info', arg3 || 5000);
                    }
                };
                
                this.moduleImplementations.set('juchu', window.JuchuCompat);
            }
        }
    }
    
    /**
     * Kichoモジュール保護（TypeScript対応）
     */
    async protectKichoImplementation() {
        const kichoElements = document.querySelectorAll('[data-module="kicho"], .kicho-module');
        
        if (kichoElements.length > 0) {
            console.log('🛡️ Kichoモジュール検出、TypeScript互換性確保');
            
            if (!window.KichoCompat) {
                window.KichoCompat = {
                    // TypeScript用の型安全なshowNotification
                    showNotification: function(message, type, duration, options) {
                        // TypeScript からの呼び出しを標準形式に変換
                        return window.showNotification(
                            String(message),
                            String(type || 'info'),
                            Number(duration || 5000),
                            options || {}
                        );
                    }
                };
                
                this.moduleImplementations.set('kicho', window.KichoCompat);
            }
        }
    }
    
    /**
     * 互換性ラッパー作成
     */
    createCompatibilityWrapper(funcName, originalFunc) {
        const self = this;
        
        return function(...args) {
            try {
                // 使用状況記録
                if (self.monitorUsage) {
                    self.recordUsage(funcName, args);
                }
                
                // 元の関数実行
                const result = originalFunc.apply(this, args);
                
                // 移行状況更新
                self.updateMigrationStatus(funcName, 'success');
                
                return result;
                
            } catch (error) {
                console.error(`Compatibility wrapper error for ${funcName}:`, error);
                
                // エラー状況記録
                self.updateMigrationStatus(funcName, 'error');
                
                // フォールバック実行
                return self.executeFallback(funcName, args);
            }
        };
    }
    
    /**
     * 基本実装作成
     */
    createBasicImplementation(funcName) {
        if (funcName === 'showNotification') {
            window.showNotification = (message, type = 'info', duration = 5000) => {
                return this.fallbackNotification(message, type, duration);
            };
        } else if (funcName.startsWith('show')) {
            // show系関数の基本実装
            const notificationType = funcName.replace('show', '').toLowerCase();
            window[funcName] = (message, duration = 5000) => {
                return window.showNotification(message, notificationType, duration);
            };
        } else {
            // 汎用基本実装
            window[funcName] = function(...args) {
                console.warn(`Basic implementation called: ${funcName}`, args);
                return false;
            };
        }
        
        this.preservedFunctions.set(funcName, window[funcName]);
    }
    
    /**
     * エイリアス作成
     */
    async createAliases() {
        console.log('🔗 エイリアス作成開始');
        
        // 旧関数名のエイリアス
        const functionAliases = {
            'displayNotification': 'showNotification',
            'notify': 'showNotification',
            'alert': 'showNotification',
            'updateStats': 'updateDashboardStats',
            'refreshStats': 'loadDashboardStats'
        };
        
        Object.entries(functionAliases).forEach(([alias, targetFunc]) => {
            if (!window[alias] && window[targetFunc]) {
                window[alias] = window[targetFunc];
                this.aliases.set(alias, targetFunc);
                console.log(`🔗 エイリアス作成: ${alias} → ${targetFunc}`);
            }
        });
        
        console.log(`✅ エイリアス作成完了: ${this.aliases.size}個`);
    }
    
    /**
     * TypeScript互換性設定
     */
    async setupTypeScriptCompatibility() {
        console.log('📘 TypeScript互換性設定開始');
        
        // TypeScript用の型安全ラッパー
        if (!window.TypeScriptCompat) {
            window.TypeScriptCompat = {
                showNotification: (message, type, duration) => {
                    return window.showNotification(
                        String(message),
                        String(type || 'info'),
                        Number(duration || 5000)
                    );
                },
                
                updateDashboardStats: (data) => {
                    return window.updateDashboardStats(data || {});
                }
            };
        }
        
        console.log('✅ TypeScript互換性設定完了');
    }
    
    /**
     * 使用状況監視開始
     */
    startUsageMonitoring() {
        console.log('📊 使用状況監視開始');
        
        // 定期的な使用状況レポート
        setInterval(() => {
            this.generateUsageReport();
        }, 300000); // 5分間隔
    }
    
    /**
     * 使用状況記録
     */
    recordUsage(funcName, args) {
        if (!this.usageMonitoring.has(funcName)) {
            this.usageMonitoring.set(funcName, {
                count: 0,
                lastUsed: null,
                arguments: []
            });
        }
        
        const usage = this.usageMonitoring.get(funcName);
        usage.count++;
        usage.lastUsed = Date.now();
        
        // 引数パターンの記録（最新10件）
        usage.arguments.unshift({
            args: Array.from(args),
            timestamp: Date.now()
        });
        
        if (usage.arguments.length > 10) {
            usage.arguments = usage.arguments.slice(0, 10);
        }
    }
    
    /**
     * 移行状況更新
     */
    updateMigrationStatus(funcName, status) {
        if (!this.migrationStatus.has(funcName)) {
            this.migrationStatus.set(funcName, {
                successCount: 0,
                errorCount: 0,
                lastStatus: null
            });
        }
        
        const migration = this.migrationStatus.get(funcName);
        if (status === 'success') {
            migration.successCount++;
        } else if (status === 'error') {
            migration.errorCount++;
        }
        migration.lastStatus = status;
    }
    
    /**
     * フォールバック実行
     */
    executeFallback(funcName, args) {
        console.warn(`Executing fallback for ${funcName}`);
        
        if (funcName === 'showNotification') {
            return this.fallbackNotification(args[0], args[1], args[2]);
        }
        
        if (funcName === 'updateDashboardStats') {
            return window.safeUpdateStats ? window.safeUpdateStats(args[0]) : 0;
        }
        
        return null;
    }
    
    /**
     * 使用状況レポート生成
     */
    generateUsageReport() {
        const report = {
            timestamp: Date.now(),
            preservedFunctions: this.preservedFunctions.size,
            aliases: this.aliases.size,
            moduleImplementations: this.moduleImplementations.size,
            usage: {}
        };
        
        this.usageMonitoring.forEach((usage, funcName) => {
            report.usage[funcName] = {
                count: usage.count,
                lastUsed: usage.lastUsed,
                recentArguments: usage.arguments.length
            };
        });
        
        console.log('📊 Compatibility Layer Usage Report:', report);
        return report;
    }
    
    /**
     * 段階的移行サポート設定
     */
    setupMigrationSupport() {
        console.log('🔄 段階的移行サポート設定開始');
        
        // 移行ヘルパー関数
        window.NAGANO3_MIGRATION = {
            // 関数の移行状況確認
            checkFunctionStatus: (funcName) => {
                return {
                    exists: typeof window[funcName] === 'function',
                    preserved: this.preservedFunctions.has(funcName),
                    usage: this.usageMonitoring.get(funcName) || null,
                    migration: this.migrationStatus.get(funcName) || null
                };
            },
            
            // 全体移行状況
            getMigrationReport: () => {
                return {
                    preservedFunctions: Array.from(this.preservedFunctions.keys()),
                    aliases: Array.from(this.aliases.entries()),
                    moduleImplementations: Array.from(this.moduleImplementations.keys()),
                    usageStats: Object.fromEntries(this.usageMonitoring),
                    migrationStatus: Object.fromEntries(this.migrationStatus)
                };
            },
            
            // 安全な移行実行
            safeMigrate: (funcName, newImplementation) => {
                try {
                    // 元の実装を保護
                    if (window[funcName] && !this.preservedFunctions.has(funcName)) {
                        this.preservedFunctions.set(funcName, window[funcName]);
                    }
                    
                    // 新しい実装をラップして設定
                    window[funcName] = this.createCompatibilityWrapper(funcName, newImplementation);
                    
                    console.log(`🔄 安全移行完了: ${funcName}`);
                    return true;
                    
                } catch (error) {
                    console.error(`❌ 移行失敗: ${funcName}`, error);
                    return false;
                }
            }
        };
        
        console.log('✅ 段階的移行サポート設定完了');
    }
    
    /**
     * その他モジュール保護
     */
    async protectOtherModules() {
        // 他のモジュールの独自実装を検出・保護
        const moduleElements = document.querySelectorAll('[data-module]');
        
        moduleElements.forEach(element => {
            const moduleName = element.getAttribute('data-module');
            if (moduleName && !this.moduleImplementations.has(moduleName)) {
                console.log(`🛡️ モジュール検出: ${moduleName}`);
                
                // モジュール専用の保護設定
                this.setupModuleProtection(moduleName);
            }
        });
    }
    
    /**
     * モジュール専用保護設定
     */
    setupModuleProtection(moduleName) {
        const moduleCompat = {
            name: moduleName,
            protectedAt: Date.now(),
            originalFunctions: new Map()
        };
        
        // モジュール固有の関数を検出・保護
        Object.keys(window).forEach(key => {
            if (key.toLowerCase().includes(moduleName.toLowerCase()) && 
                typeof window[key] === 'function') {
                moduleCompat.originalFunctions.set(key, window[key]);
            }
        });
        
        this.moduleImplementations.set(moduleName, moduleCompat);
        console.log(`✅ モジュール保護設定: ${moduleName}`);
    }
    
    /**
     * ユーティリティ関数保護
     */
    async preserveUtilityFunctions() {
        const utilityFunctions = [
            'safeGetElement',
            'safeUpdateStats', 
            'safeAjaxRequest',
            'toggleTheme',
            'setTheme'
        ];
        
        utilityFunctions.forEach(funcName => {
            if (window[funcName] && typeof window[funcName] === 'function') {
                this.preservedFunctions.set(funcName, window[funcName]);
                console.log(`✅ ユーティリティ関数保護: ${funcName}`);
            }
        });
    }
    
    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            preservedFunctions: Array.from(this.preservedFunctions.keys()),
            aliases: Array.from(this.aliases.entries()),
            moduleImplementations: Array.from(this.moduleImplementations.keys()),
            usageMonitoring: Object.fromEntries(this.usageMonitoring),
            migrationStatus: Object.fromEntries(this.migrationStatus),
            compatibilityMode: this.compatibilityMode,
            preserveOriginals: this.preserveOriginals,
            monitorUsage: this.monitorUsage
        };
    }
    
    /**
     * 互換性検証
     */
    validateCompatibility() {
        console.log('🧪 互換性検証開始');
        
        const results = {
            criticalFunctions: {},
            moduleImplementations: {},
            aliasValidation: {},
            overallScore: 0
        };
        
        // 重要関数の検証
        const criticalFunctions = [
            'showNotification', 'updateDashboardStats', 'testAPIKey', 'deleteAPIKey'
        ];
        
        criticalFunctions.forEach(funcName => {
            results.criticalFunctions[funcName] = {
                exists: typeof window[funcName] === 'function',
                preserved: this.preservedFunctions.has(funcName),
                callable: false
            };
            
            // 呼び出し可能性テスト
            try {
                if (funcName === 'showNotification') {
                    window[funcName]('テスト', 'info', 1000);
                    results.criticalFunctions[funcName].callable = true;
                } else if (funcName === 'updateDashboardStats') {
                    window[funcName]({});
                    results.criticalFunctions[funcName].callable = true;
                } else {
                    results.criticalFunctions[funcName].callable = typeof window[funcName] === 'function';
                }
            } catch (error) {
                console.warn(`Function test failed: ${funcName}`, error);
            }
        });
        
        // スコア計算
        const validFunctions = Object.values(results.criticalFunctions).filter(f => f.exists && f.callable).length;
        results.overallScore = (validFunctions / criticalFunctions.length) * 100;
        
        console.log('✅ 互換性検証完了:', results);
        return results;
    }
}

// =====================================
// 🚀 自動初期化
// =====================================

// グローバル初期化（DOM準備後に実行）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCompatibilityLayer);
} else {
    setTimeout(initializeCompatibilityLayer, 0);
}

async function initializeCompatibilityLayer() {
    try {
        if (!window.NAGANO3_COMPATIBILITY_LAYER) {
            window.NAGANO3_COMPATIBILITY_LAYER = new CompatibilityLayer();
            
            // NAGANO3名前空間への登録
            if (typeof window.NAGANO3 === 'object') {
                window.NAGANO3.compatibilityLayer = window.NAGANO3_COMPATIBILITY_LAYER;
            }
            
            console.log('✅ Compatibility Layer 初期化完了・グローバル設定完了');
        } else {
            console.log('⚠️ Compatibility Layer は既に初期化済みです');
        }
    } catch (error) {
        console.error('❌ Compatibility Layer 初期化エラー:', error);
        
        // 最小限の互換性確保
        ensureMinimalCompatibility();
    }
}

/**
 * 最小限の互換性確保（緊急時）
 */
function ensureMinimalCompatibility() {
    console.log('🆘 最小限互換性モード有効化');
    
    // showNotification の最小実装
    if (typeof window.showNotification !== 'function') {
        window.showNotification = function(message, type = 'info', duration = 5000) {
            console.log(`📢 [${type.toUpperCase()}] ${message}`);
            
            try {
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed; top: 20px; right: 20px; z-index: 999999;
                    background: #3b82f6; color: white; padding: 12px 20px;
                    border-radius: 8px; font-size: 14px;
                `;
                notification.textContent = message;
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), duration);
            } catch (error) {
                console.error('Minimal notification failed:', error);
            }
        };
    }
    
    // updateDashboardStats の最小実装
    if (typeof window.updateDashboardStats !== 'function') {
        window.updateDashboardStats = function(data) {
            console.log('📊 Dashboard stats (minimal):', data);
            return 0;
        };
    }
}

// =====================================
// 🧪 デバッグ・テスト機能
// =====================================

// 互換性テスト関数
window.testCompatibilityLayer = function() {
    console.log('🧪 Compatibility Layer テスト開始');
    
    const tests = [
        {
            name: 'showNotification基本',
            test: () => window.showNotification('テスト通知', 'success', 2000)
        },
        {
            name: 'showNotification引数パターン',
            test: () => window.showNotification('success', 'タイトル', 'メッセージ', 3000)
        },
        {
            name: 'updateDashboardStats',
            test: () => window.updateDashboardStats({testStat: 100})
        },
        {
            name: 'testAPIKey',
            test: () => window.testAPIKey && window.testAPIKey('test123', 'Test Key')
        }
    ];
    
    const results = tests.map(test => {
        try {
            const result = test.test();
            return {
                name: test.name,
                success: true,
                result: result
            };
        } catch (error) {
            return {
                name: test.name,
                success: false,
                error: error.message
            };
        }
    });
    
    console.log('🧪 テスト結果:', results);
    return results;
};

// 互換性状況確認
window.checkCompatibilityStatus = function() {
    if (window.NAGANO3_COMPATIBILITY_LAYER) {
        const status = window.NAGANO3_COMPATIBILITY_LAYER.getDebugInfo();
        console.log('🔗 Compatibility Layer Status:', status);
        
        // 検証実行
        const validation = window.NAGANO3_COMPATIBILITY_LAYER.validateCompatibility();
        console.log('🧪 互換性検証結果:', validation);
        
        return { status, validation };
    } else {
        console.error('❌ Compatibility Layer not initialized');
        return null;
    }
};

console.log('🔗 NAGANO-3 Compatibility Layer System 読み込み完了');