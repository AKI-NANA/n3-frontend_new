
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
 * 🏢 企業レベル動的モジュールローダー（Ajax統合版）
 * ファイル: common/js/module_loader.js
 * 
 * ✅ Ajax専用エンドポイント統合
 * ✅ 既存ハンドラー自動検出
 * ✅ モジュール別ルーティング
 * ✅ フォールバック機能
 */

"use strict";

// Ajax エンドポイント管理クラス
class AjaxEndpointManager {
    constructor() {
        this.endpoints = new Map();
        this.fallbackUrl = '/ajax_module_router.php';
        this.defaultTimeout = 15000;
        
        // 既存ハンドラーの登録
        this.registerKnownEndpoints();
    }
    
    /**
     * 既存のAjax ハンドラーを登録
     */
    registerKnownEndpoints() {
        const knownEndpoints = [
            // モジュール別専用ハンドラー
            { module: 'kicho', url: '/modules/kicho/kicho_ajax_handler.php', priority: 1 },
            { module: 'apikey', url: '/modules/apikey/apikey_ajax_handler.php', priority: 1 },
            { module: 'shohin', url: '/modules/shohin/shohin_ajax_handler.php', priority: 1 },
            { module: 'zaiko', url: '/modules/zaiko/zaiko_ajax_handler.php', priority: 1 },
            { module: 'juchu_kanri', url: '/modules/juchu_kanri/juchu_ajax_handler.php', priority: 1 },
            
            // 汎用ハンドラー
            { module: 'other', url: '/modules/other/other_modules_ajax_handler.php', priority: 2 },
            
            // 統合ハンドラー（フォールバック）
            { module: '*', url: '/ajax_module_router.php', priority: 3 },
            
            // 既存の一般的パターン
            { module: '*', url: '/?ajax=1', priority: 4 },
            { module: '*', url: '/ajax.php', priority: 5 }
        ];
        
        knownEndpoints.forEach(endpoint => {
            if (!this.endpoints.has(endpoint.module)) {
                this.endpoints.set(endpoint.module, []);
            }
            this.endpoints.get(endpoint.module).push(endpoint);
        });
        
        // 優先順位でソート
        this.endpoints.forEach(endpoints => {
            endpoints.sort((a, b) => a.priority - b.priority);
        });
        
        console.log('📡 Ajax エンドポイント登録完了:', this.endpoints);
    }
    
    /**
     * モジュール用のエンドポイント取得
     */
    getEndpointForModule(module) {
        // 専用エンドポイント優先
        const moduleEndpoints = this.endpoints.get(module);
        if (moduleEndpoints && moduleEndpoints.length > 0) {
            return moduleEndpoints[0].url;
        }
        
        // 汎用エンドポイント
        const genericEndpoints = this.endpoints.get('*');
        if (genericEndpoints && genericEndpoints.length > 0) {
            return genericEndpoints[0].url;
        }
        
        // 最終フォールバック
        return this.fallbackUrl;
    }
    
    /**
     * 自動エンドポイント検出
     */
    async detectBestEndpoint(module, action) {
        const candidates = [
            ...this.endpoints.get(module) || [],
            ...this.endpoints.get('*') || []
        ];
        
        console.log(`🔍 エンドポイント検出開始: ${module}#${action}`);
        
        for (const candidate of candidates) {
            try {
                const result = await this.testEndpoint(candidate.url, action, { module });
                if (result.success) {
                    console.log(`✅ 最適エンドポイント発見: ${candidate.url}`);
                    return candidate.url;
                }
            } catch (error) {
                console.log(`❌ エンドポイントテスト失敗: ${candidate.url} - ${error.message}`);
            }
        }
        
        console.warn(`⚠️ 最適エンドポイント未発見、フォールバック使用: ${module}`);
        return this.fallbackUrl;
    }
    
    /**
     * エンドポイントテスト
     */
    async testEndpoint(url, action = 'health_check', data = {}) {
        const formData = new FormData();
        formData.append('action', action);
        Object.keys(data).forEach(key => {
            formData.append(key, data[key]);
        });
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData,
            timeout: 5000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const text = await response.text();
        
        // JSON レスポンス確認
        try {
            const json = JSON.parse(text);
            return json;
        } catch (parseError) {
            // HTML レスポンスの場合はエラー
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                throw new Error('HTML response received');
            }
            throw parseError;
        }
    }
}

// 統合Ajax通信クラス
class UnifiedAjaxManager {
    constructor() {
        this.endpointManager = new AjaxEndpointManager();
        this.requestHistory = new Map();
        this.activeRequests = new Map();
        this.retryCount = 3;
        this.retryDelay = 1000;
    }
    
    /**
     * 統合Ajax リクエスト
     */
    async request(module, action, data = {}, options = {}) {
        const requestId = this.generateRequestId();
        const config = {
            timeout: options.timeout || 15000,
            retries: options.retries || this.retryCount,
            autoDetect: options.autoDetect !== false,
            endpoint: options.endpoint || null,
            ...options
        };
        
        console.log(`📤 統合Ajax [${requestId}]: ${module}#${action}`, data);
        
        try {
            // エンドポイント決定
            let endpoint;
            if (config.endpoint) {
                endpoint = config.endpoint;
            } else if (config.autoDetect) {
                endpoint = await this.endpointManager.detectBestEndpoint(module, action);
            } else {
                endpoint = this.endpointManager.getEndpointForModule(module);
            }
            
            // リクエスト実行
            const result = await this.executeRequest(endpoint, module, action, data, config);
            
            console.log(`✅ 統合Ajax成功 [${requestId}]: ${module}#${action}`, result);
            return result;
            
        } catch (error) {
            console.error(`❌ 統合Ajax失敗 [${requestId}]: ${module}#${action}`, error);
            throw error;
        }
    }
    
    /**
     * リクエスト実行（リトライ対応）
     */
    async executeRequest(endpoint, module, action, data, config) {
        let lastError;
        
        for (let attempt = 1; attempt <= config.retries; attempt++) {
            try {
                console.log(`🔄 試行 ${attempt}/${config.retries}: ${endpoint}`);
                
                const formData = new FormData();
                formData.append('action', action);
                formData.append('module', module);
                
                // CSRF トークン追加
                const csrfToken = this.getCSRFToken();
                if (csrfToken) {
                    formData.append('csrf_token', csrfToken);
                }
                
                // データ追加
                Object.keys(data).forEach(key => {
                    if (data[key] !== null && data[key] !== undefined) {
                        formData.append(key, data[key]);
                    }
                });
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: formData,
                    timeout: config.timeout
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const text = await response.text();
                
                // JSON 解析
                try {
                    const json = JSON.parse(text);
                    return json;
                } catch (parseError) {
                    // HTML レスポンスからJSON部分を抽出試行
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            return JSON.parse(jsonMatch[0]);
                        } catch (e) {
                            throw new Error('Invalid JSON in response');
                        }
                    }
                    throw new Error('No valid JSON found in response');
                }
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ 試行${attempt}失敗: ${error.message}`);
                
                if (attempt < config.retries) {
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }
        
        throw lastError;
    }
    
    /**
     * CSRF トークン取得
     */
    getCSRFToken() {
        return window.NAGANO3_CSRF_TOKEN || 
               document.querySelector('meta[name="csrf-token"]')?.content ||
               '';
    }
    
    /**
     * リクエストID生成
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 遅延関数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// DynamicModuleLoader にAjax機能を統合
class DynamicModuleLoader {
    constructor(options = {}) {
        this.config = {
            baseUrl: options.baseUrl || this.getBaseUrl(),
            timeout: options.timeout || 15000,
            enableAjax: options.enableAjax !== false,
            ...options
        };
        
        this.loadedModules = new Map();
        this.log = new UnifiedLogger('ModuleLoader');
        
        // Ajax機能統合
        if (this.config.enableAjax) {
            this.ajax = new UnifiedAjaxManager();
            this.log.info('Ajax機能統合完了');
        }
    }
    
    /**
     * モジュール用Ajax実行
     */
    async executeModuleAjax(moduleName, action, data = {}, options = {}) {
        if (!this.ajax) {
            throw new Error('Ajax機能が無効です');
        }
        
        this.log.debug(`モジュールAjax実行: ${moduleName}#${action}`);
        return await this.ajax.request(moduleName, action, data, options);
    }
    
    /**
     * ベースURL取得
     */
    getBaseUrl() {
        if (typeof window === 'undefined') return '/';
        
        const baseElement = document.querySelector('base[href]');
        if (baseElement) {
            return baseElement.href;
        }
        
        return window.location.origin + '/';
    }
}

// グローバル登録
window.NAGANO3 = window.NAGANO3 || {};
window.NAGANO3.ModuleLoader = DynamicModuleLoader;
window.NAGANO3.AjaxManager = UnifiedAjaxManager;

// インスタンス作成
const moduleLoader = new DynamicModuleLoader();
window.NAGANO3.moduleLoader = moduleLoader;

// 使用方法ログ出力
console.log(`
📦 統合モジュールローダー + Ajax Manager
=======================================

使用方法:
1. NAGANO3.moduleLoader.executeModuleAjax('kicho', 'health_check')
2. NAGANO3.moduleLoader.ajax.request('kicho', 'get_stats', {limit: 10})

特徴:
✅ 既存ハンドラー自動検出
✅ エンドポイント最適化
✅ 自動フォールバック
✅ リトライ機能
✅ 統合ログ

既存エンドポイント:
- modules/kicho/kicho_ajax_handler.php
- modules/other/other_modules_ajax_handler.php  
- ajax_module_router.php (統合)
`);

// グローバル公開（ES6構文削除）
// =====================================
window.DynamicModuleLoader = DynamicModuleLoader;
window.UnifiedAjaxManager = UnifiedAjaxManager;
window.AjaxEndpointManager = AjaxEndpointManager;

// NAGANO3システムへの統合
if (window.NAGANO3) {
    window.NAGANO3.DynamicModuleLoader = DynamicModuleLoader;
    window.NAGANO3.UnifiedAjaxManager = UnifiedAjaxManager; 
    window.NAGANO3.AjaxEndpointManager = AjaxEndpointManager;
}

console.log('✅ モジュールローダークラスをグローバル変数として公開完了');