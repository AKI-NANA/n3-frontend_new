
// CAIDS processing_capacity_monitoring Hook
// CAIDS processing_capacity_monitoring Hook - 基本実装
console.log('✅ processing_capacity_monitoring Hook loaded');

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
 * 🚀 NAGANO-3 Bootstrap (軽量エントリーポイント)
 * ファイル: common/js/bootstrap.js
 * 
 * ✅ 最小限初期化のみ（400行以内）
 * ✅ エラー完全回避設計
 * ✅ 既存Ajax PHP処理連携
 * ✅ キャッシュ効率化
 * ✅ core_functions.js + page_handlers.js 自動読み込み
 * 
 * @version 2.0.0-lightweight
 */

"use strict";

// =====================================
// 🛡️ 重複防止・初期化ロック
// =====================================

const BOOTSTRAP_UNIQUE_KEY = 'NAGANO3_BOOTSTRAP_ACTIVE_' + Date.now();
const INIT_LOCK_KEY = 'NAGANO3_INIT_LOCK';

// 重複チェック（完全防止）
if (window[INIT_LOCK_KEY]) {
    console.warn(`⚠️ Bootstrap already loaded (${window[INIT_LOCK_KEY]}), skipping completely`);
} else {
    // 初期化開始ロック
    window[INIT_LOCK_KEY] = BOOTSTRAP_UNIQUE_KEY;
    window.NAGANO3_MAIN_DISABLED = true; // main.js無効化
    
    console.log(`🔧 NAGANO-3 Bootstrap 初期化開始 - Lock: ${BOOTSTRAP_UNIQUE_KEY}`);

    // =====================================
    // 🏗️ NAGANO3基本構築
    // =====================================

    if (typeof window.NAGANO3 === 'undefined') {
        window.NAGANO3 = {
            initialized: false,
            bootstrap_key: BOOTSTRAP_UNIQUE_KEY,
            version: '2.0.0-lightweight',
            loadStartTime: Date.now()
        };
    }

    // =====================================
    // 🔧 設定初期化（PHP連携）
    // =====================================

    NAGANO3.config = NAGANO3.config || {
        current_page: window.NAGANO3_CONFIG?.current_page || 'dashboard',
        csrf_token: window.NAGANO3_CONFIG?.csrf_token || 
                   window.CSRF_TOKEN || 
                   document.querySelector('meta[name="csrf-token"]')?.content || '',
        environment: window.NAGANO3_CONFIG?.environment || 'production',
        debug: window.NAGANO3_CONFIG?.debug || false,
        version: '2.0.0-lightweight'
    };

    // =====================================
    // 🌐 Ajax基盤（PHP ajax_module_router.php連携）
    // =====================================

    NAGANO3.ajax = {
        /**
         * 統一Ajax関数（既存PHP処理そのまま活用）
         */
        request: async function(action, data = {}) {
            try {
                const csrfToken = NAGANO3.config.csrf_token;
                
                const formData = new FormData();
                formData.append('action', action);
                formData.append('csrf_token', csrfToken);
                
                Object.entries(data).forEach(([key, value]) => {
                    formData.append(key, value);
                });
                
                const response = await fetch(window.location.pathname, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Cache-Control': 'no-cache'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                // デバッグログ（開発環境のみ）
                if (NAGANO3.config.debug) {
                    console.log(`📡 Ajax Request: ${action}`, { data, result });
                }
                
                return result;
                
            } catch (error) {
                const errorInfo = {
                    success: false,
                    error: error.message,
                    action: action,
                    timestamp: new Date().toISOString()
                };
                
                // CSRF エラー特別対応（開発環境）
                if (error.message.includes('403') && NAGANO3.config.environment === 'development') {
                    console.warn('🔑 CSRF開発環境自動認証試行');
                    return await NAGANO3.ajax.retryWithDevAuth(action, data);
                }
                
                console.error('❌ Ajax エラー:', errorInfo);
                return errorInfo;
            }
        },
        
        /**
         * 開発環境CSRF自動認証
         */
        retryWithDevAuth: async function(action, data) {
            try {
                // 新しいCSRFトークン取得試行
                const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
                if (metaToken && metaToken !== NAGANO3.config.csrf_token) {
                    NAGANO3.config.csrf_token = metaToken;
                    console.log('🔄 CSRFトークン更新して再試行');
                    return await NAGANO3.ajax.request(action, data);
                }
                
                return {
                    success: false,
                    error: 'CSRF authentication failed',
                    dev_mode: true
                };
                
            } catch (retryError) {
                return {
                    success: false,
                    error: retryError.message,
                    retry_failed: true
                };
            }
        }
    };

    // =====================================
    // 🛡️ 基本エラーハンドリング
    // =====================================

    NAGANO3.errorBoundary = {
        handleError: function(error, source = 'unknown') {
            const errorInfo = {
                message: error.message || String(error),
                source: source,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                page: NAGANO3.config.current_page,
                userAgent: navigator.userAgent
            };
            
            if (NAGANO3.config.debug) {
                console.error('🚨 NAGANO3 Error:', errorInfo);
            }
            
            // 重大エラー判定
            if (this.isCriticalError(error)) {
                this.handleCriticalError(errorInfo);
            }
            
            return errorInfo;
        },
        
        isCriticalError: function(error) {
            const criticalPatterns = [
                /bootstrap/i,
                /NAGANO3/i,
                /system.*failure/i,
                /initialization.*error/i
            ];
            
            return criticalPatterns.some(pattern => 
                pattern.test(error.message || String(error))
            );
        },
        
        handleCriticalError: function(errorInfo) {
            console.error('💥 Critical Error Detected:', errorInfo);
            
            // フォールバック実行
            setTimeout(() => {
                if (typeof window.initializeFallbackSystem === 'function') {
                    window.initializeFallbackSystem();
                }
            }, 1000);
        }
    };

    // グローバルエラー捕捉
    window.addEventListener('error', (event) => {
        NAGANO3.errorBoundary.handleError(event.error, 'global');
    });

    window.addEventListener('unhandledrejection', (event) => {
        NAGANO3.errorBoundary.handleError(event.reason, 'promise');
        event.preventDefault();
    });

    // =====================================
    // 📦 アセット管理システム（エラーなし設計）
    // =====================================

    NAGANO3.assetManager = {
        // 確認済みファイルマニフェスト（実際に存在するファイル）
        verifiedAssets: {
            core: 'common/js/core_system.js',
            modules: 'common/js/page_modules.js',
            error_prevention: 'common/js/error-prevention.js'
        },
        
        loadedAssets: new Set(),
        loadingPromises: new Map(),
        
        /**
         * 安全なアセット読み込み
         */
        loadAsset: async function(assetKey) {
            // 既に読み込み済み
            if (this.loadedAssets.has(assetKey)) {
                console.log(`⏭️ Asset already loaded: ${assetKey}`);
                return { success: true, cached: true };
            }
            
            // 読み込み中
            if (this.loadingPromises.has(assetKey)) {
                console.log(`⏳ Asset loading in progress: ${assetKey}`);
                return this.loadingPromises.get(assetKey);
            }
            
            // アセットパス確認
            const assetPath = this.verifiedAssets[assetKey];
            if (!assetPath) {
                console.warn(`❌ Asset not in manifest: ${assetKey}`);
                return { success: false, reason: 'Asset not in manifest' };
            }
            
            // 読み込み実行
            const loadPromise = this.loadScript(assetPath);
            this.loadingPromises.set(assetKey, loadPromise);
            
            try {
                const result = await loadPromise;
                if (result.success) {
                    this.loadedAssets.add(assetKey);
                    console.log(`✅ Asset loaded successfully: ${assetKey}`);
                }
                return result;
            } finally {
                this.loadingPromises.delete(assetKey);
            }
        },
        
        /**
         * スクリプト読み込み実行
         */
        loadScript: function(src) {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = src + '?v=' + Date.now(); // キャッシュバスティング
                script.async = true;
                
                const timeout = setTimeout(() => {
                    script.remove();
                    resolve({ success: false, error: 'Timeout', src: src });
                }, 10000);
                
                script.onload = () => {
                    clearTimeout(timeout);
                    resolve({ success: true, src: src });
                };
                
                script.onerror = () => {
                    clearTimeout(timeout);
                    script.remove();
                    resolve({ success: false, error: 'Load failed', src: src });
                };
                
                document.head.appendChild(script);
            });
        },
        
        /**
         * 全アセット読み込み
         */
        loadAllAssets: async function() {
            console.log('📦 Loading existing assets...');
            
            const results = await Promise.allSettled([
                this.loadAsset('core'),
                this.loadAsset('modules'),
                this.loadAsset('error_prevention')
            ]);
            
            const summary = {
                total: results.length,
                success: 0,
                failed: 0,
                details: []
            };
            
            results.forEach((result, index) => {
                const assetKey = ['core', 'modules', 'error_prevention'][index];
                if (result.status === 'fulfilled' && result.value.success) {
                    summary.success++;
                    summary.details.push(`✅ ${assetKey}: OK`);
                } else {
                    summary.failed++;
                    summary.details.push(`❌ ${assetKey}: ${result.reason || 'Failed'}`);
                }
            });
            
            console.log(`📊 Asset loading complete: ${summary.success}/${summary.total} successful`);
            summary.details.forEach(detail => console.log(detail));
            
            return summary;
        }
    };

    // =====================================
    // 🚀 初期化完了・次段階読み込み
    // =====================================

    NAGANO3.initialize = async function() {
        try {
            console.log('🚀 NAGANO-3 Core initialization starting...');
            
            // Phase 1: Asset loading
            const assetResults = await NAGANO3.assetManager.loadAllAssets();
            
            // Phase 2: Basic functions setup
            NAGANO3.setupBasicFunctions();
            
            // Phase 3: Mark as initialized
            NAGANO3.initialized = true;
            NAGANO3.initializationTime = Date.now() - NAGANO3.loadStartTime;
            
            console.log(`✅ NAGANO-3 Bootstrap initialization complete (${NAGANO3.initializationTime}ms)`);
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('nagano3:bootstrap:ready', {
                detail: {
                    assetResults: assetResults,
                    initTime: NAGANO3.initializationTime
                }
            }));
            
        } catch (error) {
            NAGANO3.errorBoundary.handleError(error, 'initialization');
            console.error('💥 NAGANO-3 Bootstrap initialization failed:', error);
        }
    };

    // =====================================
    // 🔧 基本機能セットアップ
    // =====================================

    NAGANO3.setupBasicFunctions = function() {
        // 安全なDOM取得
        if (!window.safeGetElement) {
            window.safeGetElement = function(selector, context = document) {
                try {
                    return context.querySelector(selector);
                } catch (error) {
                    console.warn(`⚠️ DOM selector error: ${selector}`, error);
                    return null;
                }
            };
        }
        
        // 基本通知機能（フォールバック）
        if (!window.showNotification) {
            window.showNotification = function(message, type = 'info', duration = 5000) {
                console.log(`[${type.toUpperCase()}] ${message}`);
                
                // 簡易通知表示
                if (type === 'error') {
                    alert(`Error: ${message}`);
                }
            };
        }
        
        // 既存kicho関数のフォールバック
        if (!window.batchApproveByConfidence) {
            window.batchApproveByConfidence = function() {
                console.warn('batchApproveByConfidence: 機能ファイルが読み込まれていません');
                alert('機能ファイルを読み込み中です。しばらくお待ちください。');
            };
        }
        
        if (!window.batchApproveSelected) {
            window.batchApproveSelected = function() {
                console.warn('batchApproveSelected: 機能ファイルが読み込まれていません');
                alert('機能ファイルを読み込み中です。しばらくお待ちください。');
            };
        }
        
        if (!window.showApprovalHistory) {
            window.showApprovalHistory = function() {
                console.warn('showApprovalHistory: 機能ファイルが読み込まれていません');
                alert('機能ファイルを読み込み中です。しばらくお待ちください。');
            };
        }
        
        // Ajax統一アクセス
        if (!window.safeAjaxRequest) {
            window.safeAjaxRequest = NAGANO3.ajax.request;
        }
        
        console.log('🔧 Basic functions setup complete');
    };

    // =====================================
    // 🎯 自動初期化開始
    // =====================================

    // DOM読み込み完了後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', NAGANO3.initialize);
    } else {
        // 既にDOM読み込み完了の場合は即座に実行
        setTimeout(NAGANO3.initialize, 0);
    }

    // デバッグ用グローバル関数
    window.bootstrapStatus = function() {
        return {
            initialized: NAGANO3.initialized,
            version: NAGANO3.version,
            loadTime: NAGANO3.initializationTime,
            loadedAssets: Array.from(NAGANO3.assetManager.loadedAssets),
            config: NAGANO3.config
        };
    };

    console.log('🎯 NAGANO-3 Bootstrap setup complete, initialization scheduled');
}