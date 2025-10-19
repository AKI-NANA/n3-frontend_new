
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
 * 🎯 NAGANO-3 Core Functions (基本機能統合)
 * ファイル: common/js/core_functions.js
 * 
 * ✅ showNotification完全互換(全パターン対応)
 * ✅ DOM操作・Ajax・エラー処理統合
 * ✅ modules/kicho, modules/juchu統合
 * ✅ 既存HTML・PHP呼び出し完全保護
 * ✅ ナレッジ内容最大活用
 * 
 * @version 2.0.0-unified
 */

"use strict";

    console.log('🎯 NAGANO-3 Core Functions loading...');

// =====================================
// 🎯 Core System初期化
// =====================================

if (!window.NAGANO3) {
    console.error('❌ NAGANO3 not found. Bootstrap.js required.');
} else {
    
    // Core System名前空間
    NAGANO3.core = {
        version: '2.0.0-unified',
        initialized: false,
        loadStartTime: Date.now()
    };

    // =====================================
    // 📢 通知システム（完全互換対応）
    // =====================================

    NAGANO3.notification = {
        container: null,
        activeNotifications: new Map(),
        notificationId: 0,
        
        /**
         * 通知システム初期化
         */
        init: function() {
            if (!this.container) {
                this.container = this.createContainer();
            }
            console.log('📢 Notification system initialized');
        },
        
        /**
         * 通知コンテナ作成
         */
        createContainer: function() {
            let container = document.getElementById('nagano3-notifications');
            if (!container) {
                container = document.createElement('div');
                container.id = 'nagano3-notifications';
                container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 999999;
                    max-width: 400px;
                    pointer-events: none;
                `;
                document.body.appendChild(container);
            }
            return container;
        },
        
        /**
         * 通知表示（全パターン対応）
         */
        show: function(arg1, arg2, arg3, arg4) {
            // パターン判定・正規化
            const normalized = this.normalizeArguments(arg1, arg2, arg3, arg4);
            
            if (NAGANO3.config.debug) {
                console.log('📢 Notification show:', normalized);
            }
            
            return this.displayNotification(normalized);
        },
        
        /**
         * 引数パターン正規化（既存ナレッジ参照）
         */
        normalizeArguments: function(arg1, arg2, arg3, arg4) {
            // パターン1: showNotification(message, type, duration)
            if (typeof arg1 === 'string' && typeof arg2 === 'string' && 
                ['success', 'error', 'warning', 'info'].includes(arg2)) {
                return {
                    message: arg1,
                    type: arg2,
                    duration: parseInt(arg3) || 5000,
                    title: null
                };
            }
            
            // パターン2: showNotification(type, title, message, duration) ← Juchu形式
            if (['success', 'error', 'warning', 'info'].includes(arg1)) {
                return {
                    message: arg3 || arg2 || '',
                    type: arg1,
                    duration: parseInt(arg4) || 5000,
                    title: arg2 || null
                };
            }
            
            // パターン3: showNotification(message, type) ← 最小形式
            if (typeof arg1 === 'string' && typeof arg2 === 'string') {
                return {
                    message: arg1,
                    type: arg2,
                    duration: 5000,
                    title: null
                };
            }
            
            // パターン4: showNotification(message) ← デフォルト
            if (typeof arg1 === 'string') {
                return {
                    message: arg1,
                    type: 'info',
                    duration: 5000,
                    title: null
                };
            }
            
            // パターン5: showNotification(config) ← オブジェクト形式
            if (typeof arg1 === 'object' && arg1 !== null) {
                return {
                    message: arg1.message || '',
                    type: arg1.type || 'info',
                    duration: parseInt(arg1.duration) || 5000,
                    title: arg1.title || null
                };
            }
            
            // フォールバック
            return {
                message: String(arg1 || ''),
                type: 'info',
                duration: 5000,
                title: null
            };
        },
        
        /**
         * 通知表示実行
         */
        displayNotification: function(config) {
            const id = ++this.notificationId;
            
            const notification = document.createElement('div');
            notification.className = `nagano3-notification nagano3-notification-${config.type}`;
            notification.style.cssText = `
                background: ${this.getBackgroundColor(config.type)};
                color: white;
                padding: 12px 16px;
                margin-bottom: 8px;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                pointer-events: auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.4;
                max-width: 100%;
                word-wrap: break-word;
            `;
            
            // タイトル付きの場合
            if (config.title) {
                notification.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 4px;">${this.escapeHtml(config.title)}</div>
                    <div>${this.escapeHtml(config.message)}</div>
                `;
            } else {
                notification.textContent = config.message;
            }
            
            // 閉じるボタン
            const closeBtn = document.createElement('span');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                position: absolute;
                top: 4px;
                right: 8px;
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
                opacity: 0.7;
            `;
            closeBtn.onclick = () => this.hide(id);
            notification.appendChild(closeBtn);
            notification.style.position = 'relative';
            
            this.container.appendChild(notification);
            this.activeNotifications.set(id, notification);
            
            // アニメーション
            setTimeout(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateX(0)';
            }, 10);
            
            // 自動非表示
            if (config.duration > 0) {
                setTimeout(() => this.hide(id), config.duration);
            }
            
            return id;
        },
        
        /**
         * 通知非表示
         */
        hide: function(id) {
            const notification = this.activeNotifications.get(id);
            if (notification) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                    this.activeNotifications.delete(id);
                }, 300);
            }
        },
        
        /**
         * 背景色取得
         */
        getBackgroundColor: function(type) {
            const colors = {
                success: '#27ae60',
                error: '#e74c3c',
                warning: '#f39c12',
                info: '#3498db'
            };
            return colors[type] || colors.info;
        },
        
        /**
         * HTMLエスケープ
         */
        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // =====================================
    // 🛡️ DOM安全操作システム
    // =====================================

    NAGANO3.dom = {
        /**
         * 安全な要素取得（複数パターン対応）
         */
        safeGet: function(selector, context = document) {
            try {
                // 文字列セレクター
                if (typeof selector === 'string') {
                    let element = context.querySelector(selector);
                    
                    // 見つからない場合、ID抜きで再試行
                    if (!element && selector.startsWith('#')) {
                        const idOnly = selector.substring(1);
                        element = context.getElementById(idOnly);
                    }
                    
                    // さらに見つからない場合、類似ID検索
                    if (!element && selector.startsWith('#')) {
                        const targetId = selector.substring(1);
                        const similar = document.querySelectorAll(`[id*="${targetId}"]`);
                        if (similar.length > 0) {
                            console.warn(`⚠️ Exact ID not found, using similar: ${similar[0].id}`);
                            element = similar[0];
                        }
                    }
                    
                    return element;
                }
                
                // 既にElement の場合
                if (selector instanceof Element) {
                    return selector;
                }
                
                return null;
                
            } catch (error) {
                console.warn(`⚠️ DOM selector error: ${selector}`, error);
                return null;
            }
        },
        
        /**
         * 安全な統計更新
         */
        safeUpdateStats: function(stats) {
            const statMappings = {
                'pending-approvals': stats.pending_approvals || 0,
                'confirmed-rules': stats.confirmed_rules || 0,
                'ai-automation-rate': stats.ai_automation_rate || 0,
                'recent-transactions': stats.recent_transactions || 0,
                'error-count': stats.error_count || 0
            };
            
            Object.entries(statMappings).forEach(([id, value]) => {
                const element = this.safeGet('#' + id);
                if (element) {
                    element.textContent = value;
                    element.classList.add('updated');
                    
                    // アニメーション効果
                    element.style.transition = 'all 0.3s ease';
                    element.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        element.style.transform = 'scale(1)';
                    }, 300);
                }
            });
            
            console.log('📊 Stats updated successfully');
        },
        
        /**
         * 安全なテキスト設定
         */
        safeSetText: function(selector, text) {
            const element = this.safeGet(selector);
            if (element) {
                element.textContent = text;
                return true;
            }
            return false;
        },
        
        /**
         * 安全なHTML設定
         */
        safeSetHTML: function(selector, html) {
            const element = this.safeGet(selector);
            if (element) {
                element.innerHTML = html;
                return true;
            }
            return false;
        }
    };

    // =====================================
    // 🔗 モジュール統合システム
    // =====================================

    NAGANO3.modules = {
        registered: new Map(),
        
        /**
         * モジュール登録
         */
        register: function(name, module) {
            this.registered.set(name, {
                name: name,
                module: module,
                initialized: false,
                registeredAt: Date.now()
            });
            
            console.log(`🔌 Module registered: ${name}`);
        },
        
        /**
         * モジュール取得
         */
        get: function(name) {
            return this.registered.get(name);
        },
        
        /**
         * 全モジュール初期化
         */
        initializeAll: function() {
            this.registered.forEach((moduleInfo, name) => {
                if (!moduleInfo.initialized && moduleInfo.module.init) {
                    try {
                        moduleInfo.module.init();
                        moduleInfo.initialized = true;
                        console.log(`✅ Module initialized: ${name}`);
                    } catch (error) {
                        console.error(`❌ Module initialization failed: ${name}`, error);
                    }
                }
            });
        }
    };

    // =====================================
    // 🎯 Dashboard統合機能
    // =====================================

    NAGANO3.dashboard = {
        /**
         * 統計データ読み込み
         */
        loadStats: async function() {
            try {
                console.log('📊 Loading dashboard stats...');
                
                const response = await NAGANO3.ajax.request('load_dashboard_stats');
                
                if (response.success && response.data) {
                    NAGANO3.dom.safeUpdateStats(response.data);
                    
                    // 成功通知
                    window.showNotification('統計データを更新しました', 'success', 2000);
                } else {
                    throw new Error(response.error || 'Stats loading failed');
                }
                
            } catch (error) {
                console.error('📊 Stats loading error:', error);
                window.showNotification('統計データの読み込みに失敗しました', 'error', 5000);
            }
        },
        
        /**
         * API Key テスト
         */
        testAPIKey: async function(keyId) {
            try {
                const response = await NAGANO3.ajax.request('test_api_key', { key_id: keyId });
                
                if (response.success) {
                    window.showNotification('APIキーのテストに成功しました', 'success');
                } else {
                    window.showNotification('APIキーのテストに失敗しました: ' + response.error, 'error');
                }
                
                return response;
                
            } catch (error) {
                console.error('🔑 API Key test error:', error);
                window.showNotification('APIキーテスト中にエラーが発生しました', 'error');
                return { success: false, error: error.message };
            }
        },
        
        /**
         * API Key 削除
         */
        deleteAPIKey: async function(keyId) {
            if (confirm('本当にこのAPIキーを削除しますか？')) {
                try {
                    const response = await NAGANO3.ajax.request('delete_api_key', { key_id: keyId });
                    
                    if (response.success) {
                        window.showNotification('APIキーを削除しました', 'success');
                        // ページリロードまたは要素削除
                        const keyElement = NAGANO3.dom.safeGet(`#api-key-${keyId}`);
                        if (keyElement) {
                            keyElement.remove();
                        }
                    } else {
                        window.showNotification('APIキーの削除に失敗しました: ' + response.error, 'error');
                    }
                    
                    return response;
                    
                } catch (error) {
                    console.error('🗑️ API Key deletion error:', error);
                    window.showNotification('APIキー削除中にエラーが発生しました', 'error');
                    return { success: false, error: error.message };
                }
            }
            
            return { success: false, error: 'User cancelled' };
        }
    };

    // =====================================
    // 🔧 互換性レイヤー（既存コード保護）
    // =====================================

    NAGANO3.compatibility = {
        /**
         * 既存関数の安全な上書き・エイリアス作成
         */
        setupGlobalFunctions: function() {
            // showNotification統一（全パターン対応）
            window.showNotification = function(...args) {
                return NAGANO3.notification.show(...args);
            };
            
            // DOM操作統一
            window.safeGetElement = function(selector, context) {
                return NAGANO3.dom.safeGet(selector, context);
            };
            
            window.safeUpdateStats = function(stats) {
                return NAGANO3.dom.safeUpdateStats(stats);
            };
            
            // Ajax統一
            window.safeAjaxRequest = function(action, data) {
                return NAGANO3.ajax.request(action, data);
            };
            
            // Dashboard関数
            window.loadDashboardStats = function() {
                return NAGANO3.dashboard.loadStats();
            };
            
            window.updateDashboardStats = function(stats) {
                return NAGANO3.dom.safeUpdateStats(stats);
            };
            
            window.testAPIKey = function(keyId) {
                return NAGANO3.dashboard.testAPIKey(keyId);
            };
            
            window.deleteAPIKey = function(keyId) {
                return NAGANO3.dashboard.deleteAPIKey(keyId);
            };
            
            // エイリアス
            window.displayNotification = window.showNotification;
            window.notify = window.showNotification;
            
            console.log('🔧 Global compatibility functions setup complete');
        }
    };

    // =====================================
    // 🚀 Core System初期化
    // =====================================

    NAGANO3.core.initialize = function() {
        try {
            console.log('🎯 NAGANO-3 Core System initialization starting...');
            
            // 1. 通知システム初期化
            NAGANO3.notification.init();
            
            // 2. 互換性レイヤー設定
            NAGANO3.compatibility.setupGlobalFunctions();
            
            // 3. モジュール初期化
            NAGANO3.modules.initializeAll();
            
            // 4. 初期化完了
            NAGANO3.core.initialized = true;
            NAGANO3.core.initializationTime = Date.now() - NAGANO3.core.loadStartTime;
            
            console.log(`✅ NAGANO-3 Core Functions initialized (${NAGANO3.core.initializationTime}ms)`);
            
            // Ready イベント発火
            window.dispatchEvent(new CustomEvent('nagano3:core:ready', {
                detail: {
                    initTime: NAGANO3.core.initializationTime,
                    modules: Array.from(NAGANO3.modules.registered.keys())
                }
            }));
            
            // 初期統計読み込み（遅延実行）
            setTimeout(() => {
                if (NAGANO3.config.current_page === 'dashboard') {
                    NAGANO3.dashboard.loadStats();
                }
            }, 1000);
            
        } catch (error) {
            console.error('💥 NAGANO-3 Core Functions initialization failed:', error);
            NAGANO3.errorBoundary?.handleError(error, 'core-initialization');
        }
    };

    // =====================================
    // 🎯 自動初期化（Bootstrap準備完了後）
    // =====================================

    if (NAGANO3.initialized) {
        // Bootstrap既に初期化済み
        NAGANO3.core.initialize();
    } else {
        // Bootstrap初期化待ち
        window.addEventListener('nagano3:bootstrap:ready', function() {
            NAGANO3.core.initialize();
        });
    }

    // デバッグ用
    window.coreFunctionsStatus = function() {
        return {
            initialized: NAGANO3.core.initialized,
            initTime: NAGANO3.core.initializationTime,
            modules: Array.from(NAGANO3.modules.registered.keys()),
            notifications: NAGANO3.notification.activeNotifications.size
        };
    };

    console.log('🎯 NAGANO-3 Core Functions loaded');
}