/**
 * N3 Core JavaScript Library v2.1 - 統一版
 * 旧n3_core.jsとの完全互換性を保ちながら新機能追加
 */

(function(window) {
    'use strict';
    
    /**
     * N3 Core Class
     */
    class N3CoreUnified {
        constructor() {
            // 最小限の初期設定
            this.debug_enabled = window.NAGANO3_CONFIG?.debug || false;
            
            this.config = {
                baseUrl: window.location.origin + window.location.pathname,
                csrfToken: '',  // 後で設定
                currentPage: window.NAGANO3_CONFIG?.currentPage || 'dashboard',
                debug: this.debug_enabled,
                ajaxTimeout: 15000,
                retryAttempts: 3,
                retryDelay: 1000
            };
            
            // CSRF トークンを安全に取得
            this.config.csrfToken = this.getCSRFToken();
            
            this.requestQueue = [];
            this.isProcessingQueue = false;
            this.ollamaStatus = null;
            this.lastStatusCheck = 0;
            
            this.init();
        }
        
        /**
         * CSRF トークン取得
         */
        getCSRFToken() {
            // 複数のソースからCSRFトークンを取得
            let token = '';
            
            // 1. NAGANO3_CONFIG から取得
            if (window.NAGANO3_CONFIG?.csrfToken) {
                token = window.NAGANO3_CONFIG.csrfToken;
            }
            // 2. CSRF_TOKEN から取得
            else if (window.CSRF_TOKEN) {
                token = window.CSRF_TOKEN;
            }
            // 3. meta タグから取得
            else {
                const metaTag = document.querySelector('meta[name="csrf-token"]');
                if (metaTag) {
                    token = metaTag.getAttribute('content');
                }
            }
            
            if (!token) {
                console.warn('[N3-CORE] CSRF token not found - generating fallback');
                // フォールバック: 簡易トークン生成
                token = 'fallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }
            
            this.log('CSRF Token acquired:', token.substring(0, 10) + '...');
            return token;
        }
        
        /**
         * 初期化
         */
        init() {
            this.log('N3 Core Library v2.1 統一版 初期化開始');
            
            // N3新ライブラリとの統合確認
            this.checkN3Libraries();
            
            // CSRF トークン確認
            if (!this.config.csrfToken) {
                this.warn('CSRF token not found - Ajax requests may fail');
            }
            
            // エラーハンドラー設定
            this.setupErrorHandlers();
            
            // Ollama状態定期チェック開始
            this.startOllamaStatusMonitoring();
            
            this.log('N3 Core 統一版 初期化完了');
        }
        
        /**
         * N3新ライブラリとの統合確認
         */
        checkN3Libraries() {
            const libraries = ['N3Utils', 'N3API', 'N3UI'];
            const loadedLibraries = [];
            
            libraries.forEach(lib => {
                if (window[lib]) {
                    loadedLibraries.push(lib);
                    this.log(`${lib} library detected`);
                }
            });
            
            if (loadedLibraries.length > 0) {
                this.log('N3新ライブラリとの統合モード有効:', loadedLibraries);
                this.newLibrariesAvailable = true;
            } else {
                this.log('旧互換モードで動作');
                this.newLibrariesAvailable = false;
            }
        }
        
        /**
         * Ajax実行（メインメソッド）- 新ライブラリとの統合
         */
        async ajax(action, data = {}, options = {}) {
            // N3APIが利用可能な場合は優先使用
            if (this.newLibrariesAvailable && window.N3API) {
                try {
                    return await window.N3API.executeAjax(action, data, options);
                } catch (error) {
                    this.warn('N3API failed, falling back to legacy method:', error);
                    // フォールバック: 旧実装を使用
                }
            }
            
            // 旧実装
            const requestConfig = {
                action,
                data,
                page: options.page || this.config.currentPage,
                timeout: options.timeout || this.config.ajaxTimeout,
                retries: options.retries !== undefined ? options.retries : this.config.retryAttempts,
                priority: options.priority || 'normal',
                queue: options.queue !== false
            };
            
            if (requestConfig.queue) {
                return this.queueRequest(requestConfig);
            } else {
                return this.executeRequest(requestConfig);
            }
        }
        
        /**
         * リクエストキュー管理
         */
        async queueRequest(requestConfig) {
            return new Promise((resolve, reject) => {
                requestConfig.resolve = resolve;
                requestConfig.reject = reject;
                requestConfig.id = Date.now() + Math.random();
                
                if (requestConfig.priority === 'high') {
                    this.requestQueue.unshift(requestConfig);
                } else {
                    this.requestQueue.push(requestConfig);
                }
                
                this.processQueue();
            });
        }
        
        /**
         * キュー処理
         */
        async processQueue() {
            if (this.isProcessingQueue || this.requestQueue.length === 0) {
                return;
            }
            
            this.isProcessingQueue = true;
            
            while (this.requestQueue.length > 0) {
                const request = this.requestQueue.shift();
                
                try {
                    const result = await this.executeRequest(request);
                    request.resolve(result);
                } catch (error) {
                    request.reject(error);
                }
                
                // 短い間隔を空ける（サーバー負荷軽減）
                await this.sleep(100);
            }
            
            this.isProcessingQueue = false;
        }
        
        /**
         * リクエスト実行
         */
        async executeRequest(requestConfig) {
            const { action, data, page, timeout, retries } = requestConfig;
            
            let lastError = null;
            
            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    const result = await this.performAjaxRequest(action, data, page, timeout);
                    
                    if (attempt > 0) {
                        this.log(`Ajax retry successful on attempt ${attempt + 1}: ${action}`);
                    }
                    
                    return result;
                    
                } catch (error) {
                    lastError = error;
                    
                    if (attempt < retries) {
                        const delay = this.config.retryDelay * Math.pow(2, attempt);
                        this.warn(`Ajax attempt ${attempt + 1} failed: ${action} - Retrying in ${delay}ms`);
                        await this.sleep(delay);
                    }
                }
            }
            
            // 全ての試行が失敗
            this.error(`Ajax request failed after ${retries + 1} attempts: ${action}`, lastError);
            throw lastError;
        }
        
        /**
         * 実際のAjax実行
         */
        async performAjaxRequest(action, data, page, timeout) {
            // CSRF トークン再確認・更新
            const currentToken = this.getCSRFToken();
            if (currentToken !== this.config.csrfToken) {
                this.log('CSRF token updated:', currentToken.substring(0, 10) + '...');
                this.config.csrfToken = currentToken;
            }
            
            const formData = new FormData();
            formData.append('action', action);
            formData.append('csrf_token', this.config.csrfToken);
            
            // データ追加
            Object.entries(data).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    formData.append(key, value);
                }
            });
            
            const url = this.config.baseUrl + (page ? `?page=${encodeURIComponent(page)}` : '');
            
            // AbortController でタイムアウト制御
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    throw new Error(`Expected JSON response, got: ${contentType}. Response: ${text.substring(0, 200)}...`);
                }
                
                const result = await response.json();
                
                if (result.success === false) {
                    throw new Error(result.error || 'Unknown server error');
                }
                
                this.log(`Ajax success: ${action}`, result);
                return result;
                
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                    throw new Error(`Request timeout after ${timeout}ms: ${action}`);
                }
                
                throw error;
            }
        }
        
        /**
         * メッセージ表示 - N3Utilsとの統合
         */
        showMessage(message, type = 'info', duration = 5000) {
            // N3Utilsが利用可能な場合は優先使用
            if (this.newLibrariesAvailable && window.N3Utils && window.N3Utils.showMessage) {
                window.N3Utils.showMessage(message, type, duration);
                return;
            }
            
            // 旧実装のフォールバック
            const messageContainer = this.getOrCreateMessageContainer();
            const messageElement = document.createElement('div');
            
            messageElement.className = `n3-message n3-message--${type}`;
            messageElement.textContent = message;
            
            messageContainer.appendChild(messageElement);
            
            // 自動削除
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, duration);
        }
        
        /**
         * Ollama専用メソッド
         */
        async ollamaRequest(action, data = {}) {
            return this.ajax(action, data, {
                page: 'maru9_tool',
                priority: 'high',
                timeout: 20000
            });
        }
        
        /**
         * Ollama状態確認
         */
        async checkOllamaStatus(forceRefresh = false) {
            const now = Date.now();
            
            // キャッシュチェック（5秒間）
            if (!forceRefresh && this.ollamaStatus && (now - this.lastStatusCheck) < 5000) {
                return this.ollamaStatus;
            }
            
            try {
                const result = await this.ollamaRequest('ollama_status_check');
                this.ollamaStatus = result.result || result;
                this.lastStatusCheck = now;
                
                // 状態変化イベント発火
                this.triggerEvent('ollama_status_changed', this.ollamaStatus);
                
                return this.ollamaStatus;
                
            } catch (error) {
                this.warn('Ollama status check failed:', error);
                
                // エラー時のデフォルト状態
                this.ollamaStatus = {
                    running: false,
                    api_accessible: false,
                    models: [],
                    error_message: error.message
                };
                
                return this.ollamaStatus;
            }
        }
        
        /**
         * Ollama起動
         */
        async startOllama() {
            try {
                this.log('Ollama起動開始...');
                const result = await this.ollamaRequest('start_ollama');
                
                if (result.result?.started) {
                    this.log('Ollama起動成功');
                    await this.checkOllamaStatus(true); // 強制更新
                } else {
                    throw new Error(result.result?.message || 'Ollama start failed');
                }
                
                return result;
                
            } catch (error) {
                this.error('Ollama起動失敗:', error);
                throw error;
            }
        }
        
        /**
         * CSV処理
         */
        async processCSV(csvData, options = {}) {
            const data = {
                csv_data: csvData,
                enable_ai: options.enableAI !== false,
                processing_options: JSON.stringify(options)
            };
            
            try {
                this.log('CSV処理開始...', { dataLength: csvData.length });
                
                const result = await this.ollamaRequest('maru9_auto_process', data);
                
                this.log('CSV処理完了', result.result?.statistics);
                return result;
                
            } catch (error) {
                this.error('CSV処理失敗:', error);
                throw error;
            }
        }
        
        /**
         * UI更新メソッド
         */
        updateOllamaStatusUI(status) {
            const statusIcon = document.getElementById('aiStatusIcon');
            const statusText = document.getElementById('aiStatusText');
            
            if (statusIcon && statusText) {
                if (status.running && status.api_accessible) {
                    statusIcon.style.color = '#28a745';
                    statusText.textContent = `Ollama稼働中 (${status.models?.length || 0}モデル)`;
                } else if (status.running) {
                    statusIcon.style.color = '#ffc107';
                    statusText.textContent = 'Ollama起動中（API未準備）';
                } else {
                    statusIcon.style.color = '#dc3545';
                    statusText.textContent = 'Ollama停止中';
                }
            }
        }
        
        /**
         * プログレスバー更新
         */
        updateProgress(percentage, message = '') {
            const progressBar = document.getElementById('progressBar');
            const progressMessage = document.getElementById('progressMessage');
            const progressStats = document.getElementById('progressStats');
            
            if (progressBar) {
                progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
            }
            
            if (progressMessage && message) {
                progressMessage.textContent = message;
            }
            
            if (progressStats) {
                progressStats.textContent = `進捗: ${Math.round(percentage)}%`;
            }
        }
        
        /**
         * エラーハンドラー設定
         */
        setupErrorHandlers() {
            // グローバルエラーハンドラー
            window.addEventListener('error', (event) => {
                this.error('Global JavaScript Error:', event.error);
            });
            
            // Promise rejection ハンドラー
            window.addEventListener('unhandledrejection', (event) => {
                this.error('Unhandled Promise Rejection:', event.reason);
                event.preventDefault();
            });
        }
        
        /**
         * Ollama状態監視（無効化 - コンソールスパム防止）
         */
        startOllamaStatusMonitoring() {
            // Ollama監視を無効化（2025-08-19 - コンソールスパム防止）
            this.log('Ollama status monitoring disabled - preventing console spam');
            
            // 必要な場合は手動で this.checkOllamaStatus() を呼び出し
            // setTimeout(() => this.checkOllamaStatus(), 2000);
            
            // 定期チェックを無効化
            // setInterval(() => {
            //     if (document.visibilityState === 'visible') {
            //         this.checkOllamaStatus().then(status => {
            //             this.updateOllamaStatusUI(status);
            //         });
            //     }
            // }, 30000);
        }
        
        /**
         * イベント管理
         */
        triggerEvent(eventName, data = null) {
            const event = new CustomEvent(`n3:${eventName}`, { detail: data });
            window.dispatchEvent(event);
        }
        
        addEventListener(eventName, callback) {
            window.addEventListener(`n3:${eventName}`, callback);
        }
        
        /**
         * ユーティリティメソッド
         */
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        getOrCreateMessageContainer() {
            let container = document.getElementById('n3-messages');
            if (!container) {
                container = document.createElement('div');
                container.id = 'n3-messages';
                container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                `;
                document.body.appendChild(container);
                
                // CSS動的追加
                const style = document.createElement('style');
                style.textContent = `
                    .n3-message {
                        margin-bottom: 10px;
                        padding: 12px 16px;
                        border-radius: 6px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                        font-size: 14px;
                        animation: slideIn 0.3s ease;
                    }
                    .n3-message--info {
                        background: #d1ecf1;
                        color: #0c5460;
                        border-left: 4px solid #17a2b8;
                    }
                    .n3-message--success {
                        background: #d4edda;
                        color: #155724;
                        border-left: 4px solid #28a745;
                    }
                    .n3-message--warning {
                        background: #fff3cd;
                        color: #856404;
                        border-left: 4px solid #ffc107;
                    }
                    .n3-message--error {
                        background: #f8d7da;
                        color: #721c24;
                        border-left: 4px solid #dc3545;
                    }
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
            return container;
        }
        
        /**
         * ログメソッド
         */
        log(message, data = null) {
            const debug = this.config?.debug || this.debug_enabled || false;
            if (debug) {
                console.log(`[N3-CORE] ${message}`, data || '');
            }
        }
        
        warn(message, data = null) {
            console.warn(`[N3-CORE] ${message}`, data || '');
        }
        
        error(message, data = null) {
            console.error(`[N3-CORE] ${message}`, data || '');
        }
    }
    
    /**
     * グローバル露出
     */
    const n3Core = new N3CoreUnified();
    
    // グローバルオブジェクトとして露出
    window.N3 = n3Core;
    
    // 後方互換性のためのエイリアス
    window.executeAjax = (action, data) => n3Core.ajax(action, data);
    window.healthCheck = () => n3Core.ajax('health_check');
    window.testSystem = async () => {
        try {
            const health = await n3Core.ajax('health_check');
            const stats = await n3Core.ajax('get_statistics');
            
            n3Core.showMessage('システム正常動作中！', 'success');
            console.log('Health:', health, 'Stats:', stats);
            
        } catch (error) {
            n3Core.showMessage(`テスト失敗: ${error.message}`, 'error');
        }
    };
    
    /**
     * 初期化完了イベント
     */
    document.addEventListener('DOMContentLoaded', function() {
        n3Core.log('DOMContentLoaded - N3 Core Unified ready');
        n3Core.triggerEvent('core_ready');
        
        // N3新ライブラリとの統合完了通知
        if (n3Core.newLibrariesAvailable) {
            console.log('✅ N3統合モード: 新ライブラリと旧システムの統合完了');
        } else {
            console.log('✅ N3互換モード: 旧システム互換性確保');
        }
    });
    
})(window);
