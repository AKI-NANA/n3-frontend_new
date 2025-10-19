
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
 * 📡 ajax.js - Ajax機能分離ファイル + KICHO data-action拡張
 * common/js/ajax.js
 * 
 * ✅ 統合Ajax通信システム
 * ✅ 自動リトライ機能
 * ✅ エラーハンドリング
 * ✅ CSRFトークン管理
 * ✅ KICHO data-action対応
 * 
 * @version 3.2.0 + KICHO Extension
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
            throw error;
            
        } finally {
            // アクティブリクエストから削除
            this.activeRequests.delete(requestId);
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
// 🎯 KICHO data-action ハンドラー追加
// =====================================

/**
 * KICHO data-action ハンドラークラス
 */
class KichoDataActionHandler {
    constructor(ajaxManager) {
        this.ajaxManager = ajaxManager || window.NAGANO3?.ajaxManager;
        this.actionConfig = this.getActionConfig();
        
        if (!this.ajaxManager) {
            console.error('❌ Ajax Manager が見つかりません');
            return;
        }
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupUIHelpers();
        
        console.log('✅ KICHO data-action ハンドラー初期化完了');
    }
    
    getActionConfig() {
        // 40個のアクション設定
        return {
            "health_check": {
                "success_message": "システムヘルスチェックが完了しました",
                "loading": true
            },
            "get_statistics": {
                "success_message": "統計データを取得しました",
                "refresh_stats": true,
                "loading": true
            },
            "refresh-all": {
                "success_message": "画面を更新しました",
                "loading": true
            },
            "execute-mf-import": {
                "success_message": "MFデータを取得しました",
                "confirmation": "MFクラウドからデータを取得します。よろしいですか？",
                "loading": true
            },
            "execute-integrated-ai-learning": {
                "success_message": "AI学習が完了しました",
                "clear_input": "#aiTextInput",
                "refresh_stats": true,
                "loading": true,
                "min_text_length": 10
            },
            "delete-data-item": {
                "success_message": "データを削除しました",
                "confirmation": "削除してもよろしいですか？",
                "delete_animation": true
            },
            "bulk-approve-transactions": {
                "success_message": "取引を一括承認しました",
                "confirmation": "選択した取引をすべて承認します。よろしいですか？",
                "loading": true
            },
            "download-rules-csv": {
                "success_message": "ルールCSVをダウンロードしました",
                "trigger_download": true
            },
            "debug": {
                "success_message": "デバッグ情報を取得しました",
                "show_results": true
            }
        };
    }
    
    setupEventListeners() {
        // data-action ボタンのイベント委譲
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.getAttribute('data-action');
            
            // KICHO関連アクションのみ処理
            if (this.isKichoAction(action)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                
                console.log(`🎯 KICHO アクション実行: ${action}`);
                this.executeAction(action, target);
            }
        }, true); // キャプチャフェーズで先に捕獲
        
        console.log('✅ data-action イベントリスナー設定完了');
    }
    
    isKichoAction(action) {
        // 設定されたアクション + よく使われるアクション
        const configActions = Object.keys(this.actionConfig);
        const commonActions = [
            'process-csv-upload', 'show-import-history', 'create-new-rule',
            'save-uploaded-rules-as-database', 'view-transaction-details'
        ];
        
        return configActions.includes(action) || commonActions.includes(action);
    }
    
    async executeAction(actionName, target) {
        const config = this.actionConfig[actionName] || {};
        
        try {
            // 1. 確認ダイアログ
            if (config.confirmation && !confirm(config.confirmation)) {
                console.log(`⏹️ ユーザーキャンセル: ${actionName}`);
                return;
            }
            
            // 2. 入力値検証
            if (config.min_text_length) {
                const textInput = document.querySelector('#aiTextInput, [name="text_content"]');
                if (textInput && textInput.value.length < config.min_text_length) {
                    this.showError(`テキストは${config.min_text_length}文字以上で入力してください`);
                    return;
                }
            }
            
            // 3. ローディング開始
            if (config.loading) {
                this.showLoading(target);
            }
            
            // 4. データ抽出
            const data = this.extractData(target);
            
            // 5. Ajax実行（既存のajaxManagerを使用）
            const result = await this.ajaxManager.request(actionName, data, {
                showNotification: false, // 独自通知を使用
                timeout: 30000
            });
            
            // 6. 成功処理
            await this.handleSuccess(result, config, target);
            
        } catch (error) {
            // 7. エラー処理
            console.error(`❌ アクション実行エラー: ${actionName}`, error);
            this.handleError(error, config, target);
        } finally {
            // 8. ローディング終了
            if (config.loading) {
                this.hideLoading(target);
            }
        }
    }
    
    extractData(target) {
        const data = {};
        
        // data-* 属性抽出
        if (target.dataset) {
            Object.entries(target.dataset).forEach(([key, value]) => {
                if (key !== 'action') {
                    // camelCase → snake_case 変換
                    const phpKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    data[phpKey] = value;
                }
            });
        }
        
        // フォーム入力値抽出
        const form = target.closest('form');
        if (form) {
            const formData = new FormData(form);
            for (const [key, value] of formData.entries()) {
                data[key] = value;
            }
        }
        
        // 関連入力フィールド抽出
        const inputsSelector = target.getAttribute('data-inputs');
        if (inputsSelector) {
            inputsSelector.split(',').forEach(selector => {
                const input = document.querySelector(selector.trim());
                if (input) {
                    const name = input.name || input.id || selector.replace(/[#.]/, '');
                    data[name] = input.value;
                }
            });
        }
        
        return data;
    }
    
    async handleSuccess(result, config, target) {
        console.log(`✅ アクション成功処理`, result);
        
        // 1. 成功メッセージ表示
        if (config.success_message) {
            this.showSuccess(config.success_message);
        }
        
        // 2. 統計更新
        if (config.refresh_stats && result.data) {
            this.updateStatistics(result.data);
        }
        
        // 3. 入力フィールドクリア
        if (config.clear_input) {
            const input = document.querySelector(config.clear_input);
            if (input) {
                input.value = '';
                // 成功フィードバック
                input.style.borderColor = '#4caf50';
                setTimeout(() => input.style.borderColor = '', 2000);
            }
        }
        
        // 4. 削除アニメーション
        if (config.delete_animation && (result.deleted_id || result.deleted_ids)) {
            this.handleDeleteAnimation(result);
        }
        
        // 5. ダウンロード処理
        if (config.trigger_download && result.download_url) {
            this.triggerDownload(result.download_url, result.filename);
        }
        
        // 6. デバッグ結果表示
        if (config.show_results && result.debug_info) {
            console.table(result.debug_info);
        }
    }
    
    handleError(error, config, target) {
        const message = error.message || 'エラーが発生しました';
        this.showError(message);
    }
    
    updateStatistics(stats) {
        Object.entries(stats).forEach(([key, value]) => {
            const selectors = [`#${key}`, `[data-stat="${key}"]`, `.stat-${key}`];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    element.textContent = value;
                    
                    // 更新アニメーション
                    element.style.color = '#4caf50';
                    element.style.fontWeight = 'bold';
                    setTimeout(() => {
                        element.style.color = '';
                        element.style.fontWeight = '';
                    }, 1500);
                });
            }
        });
        
        console.log('📊 統計更新完了:', stats);
    }
    
    handleDeleteAnimation(result) {
        const deletedIds = result.deleted_ids || (result.deleted_id ? [result.deleted_id] : []);
        
        deletedIds.forEach(id => {
            const selectors = [
                `[data-item-id="${id}"]`,
                `[data-id="${id}"]`,
                `tr[data-id="${id}"]`,
                `#item-${id}`
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    this.animateDelete(element);
                    break;
                }
            }
        });
    }
    
    animateDelete(element) {
        element.style.transition = 'all 0.3s ease-out';
        element.style.opacity = '0.3';
        element.style.transform = 'translateX(-20px)';
        element.style.backgroundColor = '#ffebee';
        
        setTimeout(() => {
            if (element.parentNode) {
                element.remove();
                console.log('🗑️ 要素削除完了');
            }
        }, 500);
    }
    
    triggerDownload(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || '';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`📁 ダウンロード実行: ${filename}`);
    }
    
    // =====================================
    // 🎨 UI ヘルパー関数
    // =====================================
    
    setupUIHelpers() {
        // 通知表示用のスタイルを追加
        if (!document.getElementById('kicho-data-action-styles')) {
            const style = document.createElement('style');
            style.id = 'kicho-data-action-styles';
            style.textContent = `
                .kicho-loading {
                    opacity: 0.6 !important;
                    pointer-events: none;
                    position: relative;
                }
                
                .kicho-loading::after {
                    content: "⟳";
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 16px;
                    animation: kicho-spin 1s linear infinite;
                    z-index: 10;
                }
                
                @keyframes kicho-spin {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
                
                .kicho-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    padding: 12px 16px;
                    border-radius: 4px;
                    color: white;
                    font-size: 14px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    animation: slideInFromRight 0.3s ease-out;
                }
                
                .kicho-notification.success { background: #4CAF50; }
                .kicho-notification.error { background: #f44336; }
                
                @keyframes slideInFromRight {
                    0% { transform: translateX(100%); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    showLoading(element) {
        if (element) {
            element.classList.add('kicho-loading');
            element.disabled = true;
        }
    }
    
    hideLoading(element) {
        if (element) {
            element.classList.remove('kicho-loading');
            element.disabled = false;
        }
    }
    
    showSuccess(message) {
        this.showNotification('success', `✅ ${message}`);
    }
    
    showError(message) {
        this.showNotification('error', `❌ ${message}`);
    }
    
    showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `kicho-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 3秒後に削除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInFromRight 0.3s ease-in reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
        
        console.log(`💬 通知表示: ${type} - ${message}`);
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
        NAGANO3.ajaxManager = ajaxManager; // data-action handler用
        
        // 便利なショートカット関数
        NAGANO3.request = (action, data, options) => ajaxManager.request(action, data, options);
        
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
        NAGANO3.ajaxManager = NAGANO3.ajax;
    }
}

/**
 * KICHO data-action システム初期化
 */
function initializeKichoDataActions() {
    // 既存のajaxManagerを確認
    if (window.NAGANO3?.ajaxManager) {
        window.NAGANO3.kichoDataActionHandler = new KichoDataActionHandler(window.NAGANO3.ajaxManager);
        console.log('✅ KICHO data-action システム初期化完了');
        
        // グローバル参照（デバッグ用）
        window.KICHO_DATA_ACTION = window.NAGANO3.kichoDataActionHandler;
        
    } else {
        console.warn('⚠️ NAGANO3.ajaxManager が見つかりません - 3秒後に再試行');
        setTimeout(initializeKichoDataActions, 3000);
    }
}

// =====================================
// 🏁 初期化実行
// =====================================

// DOM準備完了または即座実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeAjax();
        setTimeout(initializeKichoDataActions, 500); // Ajax初期化後に実行
    });
} else {
    initializeAjax();
    setTimeout(initializeKichoDataActions, 500);
}

// デバッグ用グローバル関数
window.NAGANO3_AJAX_DEBUG = {
    info: () => NAGANO3.ajax?.getDebugInfo ? NAGANO3.ajax.getDebugInfo() : 'Ajax未初期化',
    history: () => NAGANO3.ajax?.requestHistory || [],
    active: () => NAGANO3.ajax?.activeRequests || new Map(),
    cancel: () => NAGANO3.ajax?.cancelAllRequests ? NAGANO3.ajax.cancelAllRequests() : false
};

// デバッグ用テスト関数
window.testKichoAction = function(action, data = {}) {
    if (window.KICHO_DATA_ACTION) {
        const testButton = document.createElement('button');
        testButton.setAttribute('data-action', action);
        Object.entries(data).forEach(([key, value]) => {
            testButton.setAttribute(`data-${key}`, value);
        });
        return window.KICHO_DATA_ACTION.executeAction(action, testButton);
    } else {
        console.error('❌ KICHO data-action システムが初期化されていません');
    }
};

console.log('📡 NAGANO-3 ajax.js + KICHO拡張 読み込み完了');
console.log('🧪 テスト方法: testKichoAction("health_check")');
