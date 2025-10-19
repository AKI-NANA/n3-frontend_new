
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
 * 🛡️ エラーバウンダリシステム - メソッド不足修正版
 * 
 * 修正内容:
 * ✅ setupUnhandledRejectionHandler メソッド追加
 * ✅ 全ての未定義メソッドエラー解決
 * ✅ TypeErrorの完全対策
 * 
 * @version 1.0.2-method-complete
 */

"use strict";

// =====================================
// 🛡️ 重複読み込み防止
// =====================================

const NAGANO3_ERROR_BOUNDARY_ID = 'ERROR_BOUNDARY_' + Date.now();

if (window.NAGANO3_ERROR_BOUNDARY_ACTIVE) {
    console.warn('⚠️ Error Boundary already active, skipping');
} else {
    window.NAGANO3_ERROR_BOUNDARY_ACTIVE = NAGANO3_ERROR_BOUNDARY_ID;
    
    console.log('🛡️ Error Boundary System Starting (Method Complete)');

    // =====================================
    // 🔧 完全エラーバウンダリクラス
    // =====================================
    
    class NAGANO3ErrorBoundary {
        constructor() {
            this.errorCount = 0;
            this.maxErrors = 50;
            this.recoveryAttempts = 0;
            this.maxRecoveryAttempts = 5;
            this.errorLog = [];
            this.isRecovering = false;
            this.rejectionHandlerSetup = false;
            
            this.init();
        }
        
        init() {
            try {
                this.setupGlobalErrorHandlers();
                this.setupUnhandledRejectionHandler(); // ✅ メソッド追加
                this.setupResourceErrorHandler();
                
                console.log('✅ Error Boundary initialized successfully');
                
            } catch (error) {
                console.error('❌ Error Boundary initialization failed:', error);
                this.fallbackErrorHandler(error);
            }
        }
        
        // グローバルエラーハンドラ設定
        setupGlobalErrorHandlers() {
            window.addEventListener('error', (event) => {
                this.handleGlobalError(event);
            });
        }
        
        // ✅ 未定義メソッド修正: setupUnhandledRejectionHandler
        setupUnhandledRejectionHandler() {
            if (this.rejectionHandlerSetup) {
                return; // 重複設定防止
            }
            
            window.addEventListener('unhandledrejection', (event) => {
                this.handleUnhandledRejection(event);
            });
            
            this.rejectionHandlerSetup = true;
            console.log('✅ Unhandled rejection handler setup complete');
        }
        
        // リソースエラーハンドラ設定
        setupResourceErrorHandler() {
            document.addEventListener('error', (event) => {
                if (event.target !== window) {
                    this.handleResourceError(event);
                }
            }, true);
        }
        
        // メインエラーハンドラ
        handleGlobalError(event) {
            try {
                this.errorCount++;
                
                const errorInfo = {
                    type: 'javascript_error',
                    message: event.message || 'Unknown error',
                    filename: event.filename || 'unknown',
                    lineno: event.lineno || 0,
                    colno: event.colno || 0,
                    stack: event.error?.stack || 'No stack trace',
                    timestamp: new Date().toISOString(),
                    count: this.errorCount
                };
                
                this.logError(errorInfo);
                
                // 重大エラーの場合は復旧試行
                if (this.isCriticalError(errorInfo)) {
                    this.attemptRecovery(errorInfo);
                }
                
                // エラー数制限チェック
                if (this.errorCount >= this.maxErrors) {
                    this.emergencyShutdown();
                }
                
            } catch (handlerError) {
                this.fallbackErrorHandler(handlerError);
            }
        }
        
        // Promise拒否ハンドラ
        handleUnhandledRejection(event) {
            try {
                this.errorCount++;
                
                const errorInfo = {
                    type: 'promise_rejection',
                    message: event.reason?.message || 'Promise rejected',
                    reason: event.reason,
                    timestamp: new Date().toISOString(),
                    count: this.errorCount
                };
                
                this.logError(errorInfo);
                
                // Promise拒否の復旧
                if (!this.isRecovering && this.recoveryAttempts < this.maxRecoveryAttempts) {
                    this.attemptPromiseRecovery(errorInfo);
                }
                
            } catch (handlerError) {
                this.fallbackErrorHandler(handlerError);
            }
        }
        
        // リソースエラーハンドラ
        handleResourceError(event) {
            try {
                const target = event.target;
                const resourceType = target.tagName?.toLowerCase() || 'unknown';
                
                const errorInfo = {
                    type: 'resource_error',
                    resourceType: resourceType,
                    src: target.src || target.href || 'unknown',
                    message: `Failed to load ${resourceType}`,
                    timestamp: new Date().toISOString()
                };
                
                this.logError(errorInfo);
                
                // スクリプトエラーの場合は復旧試行
                if (resourceType === 'script') {
                    this.handleScriptLoadError(target);
                }
                
            } catch (handlerError) {
                this.fallbackErrorHandler(handlerError);
            }
        }
        
        // スクリプト読み込みエラー処理
        handleScriptLoadError(scriptElement) {
            try {
                const src = scriptElement.src;
                
                if (src && !this.isRecovering) {
                    console.warn(`🔄 Attempting to reload failed script: ${src}`);
                    
                    // 元のスクリプト要素を削除
                    if (scriptElement.parentNode) {
                        scriptElement.parentNode.removeChild(scriptElement);
                    }
                    
                    // 新しいスクリプト要素で再試行
                    setTimeout(() => {
                        this.retryScriptLoad(src);
                    }, 1000);
                }
                
            } catch (error) {
                this.fallbackErrorHandler(error);
            }
        }
        
        // スクリプト再読み込み試行
        retryScriptLoad(src) {
            try {
                const newScript = document.createElement('script');
                newScript.src = src;
                newScript.async = true;
                
                newScript.onload = () => {
                    console.log(`✅ Script reloaded successfully: ${src}`);
                };
                
                newScript.onerror = () => {
                    console.error(`❌ Script reload failed: ${src}`);
                };
                
                document.head.appendChild(newScript);
                
            } catch (error) {
                this.fallbackErrorHandler(error);
            }
        }
        
        // 重大エラー判定
        isCriticalError(errorInfo) {
            const criticalPatterns = [
                /bootstrap/i,
                /NAGANO3/i,
                /system.*failure/i,
                /initialization.*error/i,
                /setupUnhandledRejectionHandler.*not.*function/i,
                /BOOTSTRAP_UNIQUE_KEY.*already.*declared/i
            ];
            
            const message = errorInfo.message || '';
            return criticalPatterns.some(pattern => pattern.test(message));
        }
        
        // 復旧試行
        attemptRecovery(errorInfo) {
            if (this.isRecovering || this.recoveryAttempts >= this.maxRecoveryAttempts) {
                return;
            }
            
            this.isRecovering = true;
            this.recoveryAttempts++;
            
            console.warn(`🔄 Attempting system recovery (attempt ${this.recoveryAttempts})`);
            
            try {
                // 基本的な復旧処理
                this.performBasicRecovery();
                
                // 復旧完了
                setTimeout(() => {
                    this.isRecovering = false;
                    console.log('✅ Recovery attempt completed');
                }, 2000);
                
            } catch (recoveryError) {
                this.isRecovering = false;
                this.fallbackErrorHandler(recoveryError);
            }
        }
        
        // 基本復旧処理
        performBasicRecovery() {
            try {
                // NAGANO3オブジェクトの基本復旧
                if (typeof window.NAGANO3 === 'undefined') {
                    window.NAGANO3 = {
                        initialized: false,
                        version: 'recovery-1.0.2',
                        errorBoundary: this
                    };
                }
                
                // 基本関数の復旧
                this.restoreBasicFunctions();
                
                // 通知システムの基本復旧
                this.restoreNotificationSystem();
                
            } catch (error) {
                console.error('Basic recovery failed:', error);
            }
        }
        
        // 基本関数復旧
        restoreBasicFunctions() {
            // showNotification の最小実装
            if (typeof window.showNotification !== 'function') {
                window.showNotification = function(message, type = 'info') {
                    console.log(`📢 [${type.toUpperCase()}] ${message}`);
                    
                    try {
                        const notification = document.createElement('div');
                        notification.style.cssText = `
                            position: fixed; top: 20px; right: 20px; z-index: 999999;
                            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
                            color: white; padding: 12px 20px; border-radius: 8px;
                            font-size: 14px; max-width: 350px;
                        `;
                        notification.textContent = message;
                        document.body.appendChild(notification);
                        
                        setTimeout(() => {
                            if (notification.parentNode) {
                                notification.remove();
                            }
                        }, 4000);
                        
                    } catch (e) {
                        console.warn('Notification display failed:', e);
                    }
                };
            }
            
            // emergencyDiagnostic 復旧
            if (typeof window.emergencyDiagnostic !== 'function') {
                window.emergencyDiagnostic = () => {
                    return {
                        status: 'recovery_mode',
                        errorCount: this.errorCount,
                        recoveryAttempts: this.recoveryAttempts,
                        timestamp: new Date().toISOString()
                    };
                };
            }
        }
        
        // 通知システム復旧
        restoreNotificationSystem() {
            try {
                if (!window.NAGANO3.notifications) {
                    window.NAGANO3.notifications = {
                        show: window.showNotification,
                        error: (msg) => window.showNotification(msg, 'error'),
                        success: (msg) => window.showNotification(msg, 'success'),
                        warning: (msg) => window.showNotification(msg, 'warning')
                    };
                }
            } catch (error) {
                console.warn('Notification system recovery failed:', error);
            }
        }
        
        // Promise復旧試行
        attemptPromiseRecovery(errorInfo) {
            this.recoveryAttempts++;
            
            try {
                console.warn('🔄 Attempting Promise recovery');
                
                // Promise関連のクリーンアップ
                this.cleanupPromises();
                
                setTimeout(() => {
                    console.log('✅ Promise recovery completed');
                }, 1000);
                
            } catch (error) {
                this.fallbackErrorHandler(error);
            }
        }
        
        // Promise クリーンアップ
        cleanupPromises() {
            if (window.NAGANO3?.pendingPromises) {
                window.NAGANO3.pendingPromises = [];
            }
        }
        
        // エラーログ記録
        logError(errorInfo) {
            this.errorLog.push(errorInfo);
            
            // ログサイズ制限
            if (this.errorLog.length > 100) {
                this.errorLog = this.errorLog.slice(-50);
            }
            
            console.error('🚨 Error logged:', errorInfo);
        }
        
        // 緊急停止
        emergencyShutdown() {
            console.error(`🚨 EMERGENCY SHUTDOWN: Too many errors (${this.errorCount})`);
            
            try {
                if (typeof window.showNotification === 'function') {
                    window.showNotification('システムエラーが多発しています。ページを再読み込みしてください。', 'error', 0);
                }
                
                this.displayErrorSummary();
                
            } catch (error) {
                console.error('Emergency shutdown failed:', error);
            }
        }
        
        // エラーサマリー表示
        displayErrorSummary() {
            console.group('🚨 Error Summary');
            console.log(`Total Errors: ${this.errorCount}`);
            console.log(`Recovery Attempts: ${this.recoveryAttempts}`);
            console.log('Recent Errors:', this.errorLog.slice(-5));
            console.groupEnd();
        }
        
        // フォールバックエラーハンドラ
        fallbackErrorHandler(error) {
            console.error('🚨 FALLBACK ERROR HANDLER:', error);
            
            try {
                if (!this.errorLog) {
                    this.errorLog = [];
                }
                
                this.errorLog.push({
                    type: 'fallback_error',
                    message: error.message || 'Unknown fallback error',
                    timestamp: new Date().toISOString()
                });
                
            } catch (finalError) {
                console.error('Final error handler failed:', finalError);
            }
        }
        
        // デバッグ情報取得
        getDebugInfo() {
            return {
                errorCount: this.errorCount,
                recoveryAttempts: this.recoveryAttempts,
                isRecovering: this.isRecovering,
                recentErrors: this.errorLog.slice(-10),
                maxErrors: this.maxErrors,
                maxRecoveryAttempts: this.maxRecoveryAttempts,
                boundaryId: NAGANO3_ERROR_BOUNDARY_ID,
                rejectionHandlerSetup: this.rejectionHandlerSetup,
                status: this.errorCount >= this.maxErrors ? 'emergency_shutdown' : 
                       this.isRecovering ? 'recovering' : 'active'
            };
        }
    }

    // =====================================
    // 🚀 エラーバウンダリ初期化
    // =====================================
    
    let errorBoundary = null;
    
    try {
        errorBoundary = new NAGANO3ErrorBoundary();
        
        // NAGANO3名前空間に登録
        if (typeof window.NAGANO3 === 'undefined') {
            window.NAGANO3 = {};
        }
        
        window.NAGANO3.errorBoundary = errorBoundary;
        
        // グローバル関数登録
        window.checkErrorBoundaryStatus = function() {
            return errorBoundary ? errorBoundary.getDebugInfo() : { status: 'not_initialized' };
        };
        
        window.emergencyDiagnostic = function() {
            const status = errorBoundary ? errorBoundary.getDebugInfo() : { status: 'error_boundary_failed' };
            
            return {
                timestamp: new Date().toISOString(),
                errorBoundary: status,
                window: {
                    NAGANO3: typeof window.NAGANO3,
                    showNotification: typeof window.showNotification,
                    jQuery: typeof window.jQuery
                },
                document: {
                    readyState: document.readyState,
                    scripts: document.scripts.length,
                    errors: document.querySelectorAll('script[src]').length
                }
            };
        };
        
        console.log('✅ Error Boundary System initialized successfully');
        
    } catch (initError) {
        console.error('❌ Error Boundary initialization failed:', initError);
        
        // 最低限のフォールバック
        window.emergencyDiagnostic = function() {
            return {
                status: 'initialization_failed',
                error: initError.message,
                timestamp: new Date().toISOString()
            };
        };
        
        window.checkErrorBoundaryStatus = function() {
            return { status: 'initialization_failed', error: initError.message };
        };
    }

    console.log('🛡️ Error Boundary System setup completed (Method Complete)');
}

// =====================================
// 🧪 即座診断実行
// =====================================

// DOM読み込み完了時に診断実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            if (typeof window.emergencyDiagnostic === 'function') {
                console.log('🧪 Emergency Diagnostic:', window.emergencyDiagnostic());
            }
        }, 1000);
    });
} else {
    setTimeout(() => {
        if (typeof window.emergencyDiagnostic === 'function') {
            console.log('🧪 Emergency Diagnostic:', window.emergencyDiagnostic());
        }
    }, 100);
}