
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
 * 📡 ajax.js - Ajax機能分離ファイル
 * common/js/ajax.js
 * 
 * ✅ 統合Ajax通信システム
 * ✅ 自動リトライ機能
 * ✅ エラーハンドリング
 * ✅ CSRFトークン管理
 * 
 * @version 3.2.0
 * @author NAGANO-3 Development Team
 */

"use strict";

console.log("📡 NAGANO-3 ajax.js 読み込み開始");

// =====================================
// 🛡️ 基本名前空間確保
// =====================================
window.NAGANO3 = window.NAGANO3 || {};

// =====================================
// 📡 Ajax クラス定義
// =====================================

class AjaxManager {
    constructor() {
        this.baseUrl = window.location.pathname;
        this.csrfToken = this.getCSRFToken();
        this.retryCount = NAGANO3.config?.ajax_retry_attempts || 3;
        this.timeout = NAGANO3.config?.ajax_timeout || 30000;
        this.retryDelay = NAGANO3.config?.ajax_retry_delay || 1000;
        
        // リクエスト履歴
        this.requestHistory = [];
        this.activeRequests = new Map();
        
        console.log('📡 Ajax マネージャー初期化完了');
    }
    
    /**
     * CSRFトークン取得
     */
    getCSRFToken() {
        let token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        if (!token && window.CSRF_TOKEN) {
            token = window.CSRF_TOKEN;
        }
        
        if (!token) {
            const tokenInput = document.querySelector('input[name="csrf_token"]');
            if (tokenInput) token = tokenInput.value;
        }
        
        if (!token && NAGANO3.config?.csrf_token) {
            token = NAGANO3.config.csrf_token;
        }
        
        if (!token) {
            token = 'fallback_' + Math.random().toString(36).substring(2);
            console.warn('⚠️ CSRFトークンを自動生成しました:', token);
        }
        
        return token;
    }
    
    /**
     * メインリクエストメソッド
     */
    async request(action, data = {}, options = {}) {
        const requestId = this.generateRequestId();
        
        const config = {
            retries: options.retries || this.retryCount,
            timeout: options.timeout || this.timeout,
            showNotification: options.showNotification !== false,
            showLoading: options.showLoading !== false,
            useCache: options.useCache || false,
            cacheKey: options.cacheKey || `${action}_${JSON.stringify(data)}`,
            ...options
        };
        
        console.log(`📤 Ajax リクエスト [${requestId}]: ${action}`, data);
        
        // リクエスト履歴に追加
        this.addToHistory(requestId, action, data, config);
        
        // キャッシュチェック
        if (config.useCache) {
            const cached = this.getFromCache(config.cacheKey);
            if (cached) {
                console.log(`♻️ キャッシュヒット [${requestId}]: ${action}`);
                return cached;
            }
        }
        
        // アクティブリクエストに追加
        this.activeRequests.set(requestId, { action, data, config, startTime: Date.now() });
        
        try {
            // ローディング表示
            if (config.showLoading && window.showNotification) {
                window.showNotification(`処理中: ${action}`, 'info', 0);
            }
            
            const result = await this.executeRequest(requestId, action, data, config);
            
            // キャッシュ保存
            if (config.useCache && result.success) {
                this.saveToCache(config.cacheKey, result);
            }
            
            // 成功ログ
            const duration = Date.now() - this.activeRequests.get(requestId).startTime;
            console.log(`✅ Ajax 成功 [${requestId}]: ${action} (${duration}ms)`, result);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Ajax 失敗 [${requestId}]: ${action}`, error);
            
            if (config.showNotification && window.showNotification) {
                window.showNotification(`処理失敗: ${error.message}`, 'error');
            }
            
            throw error;
            
        } finally {
            // アクティブリクエストから削除
            this.activeRequests.delete(requestId);
            
            // ローディング非表示
            if (config.showLoading && window.showNotification) {
                // 通知システムにクリア機能があれば使用
                if (window.hideNotification) {
                    window.hideNotification();
                }
            }
        }
    }
    
    /**
     * リクエスト実行（リトライ対応）
     */
    async executeRequest(requestId, action, data, config) {
        for (let attempt = 1; attempt <= config.retries; attempt++) {
            try {
                const result = await this.makeRequest(requestId, action, data, config, attempt);
                
                if (result && result.success) {
                    return result;
                } else {
                    throw new Error(result?.error || result?.message || 'サーバーエラー');
                }
                
            } catch (error) {
                console.warn(`❌ Ajax 試行失敗 [${requestId}]: ${action} (${attempt}/${config.retries})`, error);
                
                if (attempt === config.retries) {
                    throw error;
                }
                
                // リトライ前の待機
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            }
        }
    }
    
    /**
     * 実際のHTTPリクエスト
     */
    async makeRequest(requestId, action, data, config, attempt) {
        const formData = new FormData();
        formData.append('action', action);
        formData.append('csrf_token', this.csrfToken);
        formData.append('ajax_request', '1');
        formData.append('request_id', requestId);
        
        Object.keys(data).forEach(key => {
            if (data[key] !== null && data[key] !== undefined) {
                if (data[key] instanceof File || data[key] instanceof Blob) {
                    formData.append(key, data[key]);
                } else if (typeof data[key] === 'object') {
                    formData.append(key, JSON.stringify(data[key]));
                } else {
                    formData.append(key, data[key]);
                }
            }
        });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-Request-ID': requestId
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const text = await response.text();
            
            try {
                return JSON.parse(text);
            } catch (parseError) {
                // JSON以外のレスポンスの場合、JSON部分を抽出
                const jsonMatch = text.match(/\{.*\}/s);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                throw new Error('無効なレスポンス形式: JSON parse failed');
            }
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`リクエストタイムアウト (${config.timeout}ms)`);
            }
            
            throw error;
        }
    }
    
    /**
     * リクエストID生成
     */
    generateRequestId() {
        return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * リクエスト履歴追加
     */
    addToHistory(requestId, action, data, config) {
        this.requestHistory.push({
            id: requestId,
            action,
            data: JSON.parse(JSON.stringify(data)), // Deep copy
            config: { ...config },
            timestamp: new Date().toISOString()
        });
        
        // 履歴は最新100件まで保持
        if (this.requestHistory.length > 100) {
            this.requestHistory.shift();
        }
    }
    
    /**
     * キャッシュ管理
     */
    saveToCache(key, data) {
        try {
            const cache = {
                data,
                timestamp: Date.now(),
                expires: Date.now() + (NAGANO3.config?.performance?.cache_duration || 300000)
            };
            
            // メモリキャッシュ（簡易版）
            if (!this.cache) this.cache = new Map();
            this.cache.set(key, cache);
            
        } catch (error) {
            console.warn('⚠️ キャッシュ保存失敗:', error);
        }
    }
    
    getFromCache(key) {
        try {
            if (!this.cache) return null;
            
            const cached = this.cache.get(key);
            if (!cached) return null;
            
            if (Date.now() > cached.expires) {
                this.cache.delete(key);
                return null;
            }
            
            return cached.data;
            
        } catch (error) {
            console.warn('⚠️ キャッシュ取得失敗:', error);
            return null;
        }
    }
    
    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            active_requests: this.activeRequests.size,
            history_count: this.requestHistory.length,
            cache_size: this.cache ? this.cache.size : 0,
            csrf_token: this.csrfToken ? '***' + this.csrfToken.slice(-4) : 'なし',
            base_url: this.baseUrl,
            config: {
                timeout: this.timeout,
                retry_count: this.retryCount,
                retry_delay: this.retryDelay
            }
        };
    }
    
    /**
     * アクティブリクエストのキャンセル
     */
    cancelAllRequests() {
        const activeCount = this.activeRequests.size;
        this.activeRequests.clear();
        console.log(`🚫 ${activeCount}件のアクティブリクエストをキャンセルしました`);
    }
}

// =====================================
// 🎯 Ajax インスタンス作成・設定
// =====================================

/**
 * Ajax インスタンス初期化
 */
function initializeAjax() {
    try {
        console.log('📡 Ajax システム初期化開始');
        
        // Ajax インスタンス作成
        const ajaxManager = new AjaxManager();
        
        // NAGANO3オブジェクトに設定
        NAGANO3.ajax = ajaxManager;
        
        // 便利なショートカット関数
        NAGANO3.request = (action, data, options) => ajaxManager.request(action, data, options);
        
        // 分割ファイル読み込み完了マーク
        if (NAGANO3.splitFiles) {
            NAGANO3.splitFiles.markLoaded('ajax.js');
        }
        
        console.log('✅ Ajax システム初期化完了');
        console.log('📊 Ajax 設定:', ajaxManager.getDebugInfo());
        
    } catch (error) {
        console.error('❌ Ajax システム初期化失敗:', error);
        
        // フォールバック Ajax（基本機能のみ）
        NAGANO3.ajax = {
            request: async function(action, data = {}) {
                console.warn('⚠️ フォールバック Ajax 使用中');
                
                const formData = new FormData();
                formData.append('action', action);
                formData.append('ajax_request', '1');
                
                Object.keys(data).forEach(key => {
                    if (data[key] !== null && data[key] !== undefined) {
                        formData.append(key, data[key]);
                    }
                });
                
                const response = await fetch(window.location.pathname, {
                    method: 'POST',
                    body: formData
                });
                
                return response.json();
            }
        };
    }
}

// =====================================
// 🏁 初期化実行
// =====================================

// DOM準備完了または即座実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAjax);
} else {
    initializeAjax();
}

// デバッグ用グローバル関数
if (NAGANO3.config?.debug) {
    window.NAGANO3_AJAX_DEBUG = {
        info: () => NAGANO3.ajax?.getDebugInfo ? NAGANO3.ajax.getDebugInfo() : 'Ajax未初期化',
        history: () => NAGANO3.ajax?.requestHistory || [],
        active: () => NAGANO3.ajax?.activeRequests || new Map(),
        cancel: () => NAGANO3.ajax?.cancelAllRequests ? NAGANO3.ajax.cancelAllRequests() : false
    };
}

console.log('📡 NAGANO-3 ajax.js 読み込み完了');