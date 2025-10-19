/**
 * N3 API Library v2.0
 * 統一API通信ライブラリ
 * Ajax通信・データ取得・エラーハンドリングの標準化
 */

(function(window) {
    'use strict';
    
    /**
     * N3 API クラス
     */
    const N3API = {
        // 設定
        config: {
            timeout: 15000,
            retryAttempts: 3,
            retryDelay: 1000
        },
        
        /**
         * 基本的なfetch実行
         */
        async fetchData(endpoint, options = {}) {
            const defaultOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-N3-API-Request': 'true'
                },
                timeout: this.config.timeout
            };
            
            // CSRFトークン追加
            if (window.CSRF_TOKEN) {
                defaultOptions.headers['X-CSRF-Token'] = window.CSRF_TOKEN;
            }
            
            const finalOptions = { ...defaultOptions, ...options };
            
            // Headerマージ
            if (options.headers) {
                finalOptions.headers = { ...defaultOptions.headers, ...options.headers };
            }
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout);
                
                const response = await fetch(endpoint, {
                    ...finalOptions,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return await response.json();
                } else {
                    return await response.text();
                }
                
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error(`Request timeout after ${finalOptions.timeout}ms`);
                }
                throw error;
            }
        },
        
        /**
         * POSTデータ送信
         */
        async postData(endpoint, data = {}, options = {}) {
            const formData = new FormData();
            
            // CSRFトークン追加
            if (window.CSRF_TOKEN) {
                formData.append('csrf_token', window.CSRF_TOKEN);
            }
            
            // データをFormDataに変換
            Object.entries(data).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    if (value instanceof File || value instanceof Blob) {
                        formData.append(key, value);
                    } else if (typeof value === 'object') {
                        formData.append(key, JSON.stringify(value));
                    } else {
                        formData.append(key, String(value));
                    }
                }
            });
            
            const postOptions = {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-N3-API-Request': 'true'
                    // Content-Typeはブラウザが自動設定（multipart/form-data）
                },
                ...options
            };
            
            // CSRFトークンをヘッダーにも追加
            if (window.CSRF_TOKEN) {
                postOptions.headers['X-CSRF-Token'] = window.CSRF_TOKEN;
            }
            
            return this.fetchData(endpoint, postOptions);
        },
        
        /**
         * JSONデータPOST送信
         */
        async postJSON(endpoint, data = {}, options = {}) {
            const jsonData = {
                csrf_token: window.CSRF_TOKEN,
                ...data
            };
            
            const jsonOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-N3-API-Request': 'true'
                },
                body: JSON.stringify(jsonData),
                ...options
            };
            
            // CSRFトークンをヘッダーにも追加
            if (window.CSRF_TOKEN) {
                jsonOptions.headers['X-CSRF-Token'] = window.CSRF_TOKEN;
            }
            
            return this.fetchData(endpoint, jsonOptions);
        },
        
        /**
         * Ajax実行（N3コア互換）
         */
        async executeAjax(action, data = {}, options = {}) {
            const ajaxData = {
                action: action,
                ...data
            };
            
            const page = options.page || (window.NAGANO3_CONFIG && window.NAGANO3_CONFIG.currentPage) || 'dashboard';
            const endpoint = options.endpoint || `${window.location.pathname}?page=${encodeURIComponent(page)}`;
            
            try {
                const result = await this.postData(endpoint, ajaxData, options);
                
                // レスポンス検証
                if (result && typeof result === 'object' && result.success === false) {
                    throw new Error(result.error || result.message || 'Unknown server error');
                }
                
                return result;
                
            } catch (error) {
                console.error(`N3API Ajax Error [${action}]:`, error);
                throw error;
            }
        },
        
        /**
         * リトライ機能付きリクエスト
         */
        async requestWithRetry(requestFunc, maxRetries = null) {
            const retries = maxRetries || this.config.retryAttempts;
            let lastError = null;
            
            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    return await requestFunc();
                } catch (error) {
                    lastError = error;
                    
                    if (attempt < retries) {
                        const delay = this.config.retryDelay * Math.pow(2, attempt);
                        console.warn(`Request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
                        await this.sleep(delay);
                    }
                }
            }
            
            throw lastError;
        },
        
        /**
         * 並列リクエスト実行
         */
        async parallel(requests) {
            try {
                const results = await Promise.all(requests);
                return results;
            } catch (error) {
                console.error('Parallel requests failed:', error);
                throw error;
            }
        },
        
        /**
         * 順次リクエスト実行
         */
        async sequence(requests) {
            const results = [];
            
            for (const request of requests) {
                try {
                    const result = await request();
                    results.push(result);
                } catch (error) {
                    console.error('Sequence request failed:', error);
                    throw error;
                }
            }
            
            return results;
        },
        
        /**
         * ファイルアップロード
         */
        async uploadFile(endpoint, file, additionalData = {}, onProgress = null) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('csrf_token', window.CSRF_TOKEN);
            
            // 追加データを追加
            Object.entries(additionalData).forEach(([key, value]) => {
                formData.append(key, value);
            });
            
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                
                // プログレスイベント
                if (onProgress && xhr.upload) {
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            const percentage = (e.loaded / e.total) * 100;
                            onProgress(percentage, e.loaded, e.total);
                        }
                    });
                }
                
                // 完了イベント
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response);
                        } catch (e) {
                            resolve(xhr.responseText);
                        }
                    } else {
                        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
                    }
                });
                
                // エラーイベント
                xhr.addEventListener('error', () => {
                    reject(new Error('Upload failed: Network error'));
                });
                
                // タイムアウトイベント
                xhr.addEventListener('timeout', () => {
                    reject(new Error('Upload failed: Timeout'));
                });
                
                // リクエスト送信
                xhr.open('POST', endpoint);
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                xhr.setRequestHeader('X-CSRF-Token', window.CSRF_TOKEN);
                xhr.timeout = 30000; // 30秒
                xhr.send(formData);
            });
        },
        
        /**
         * WebSocketクライアント作成
         */
        createWebSocket(url, options = {}) {
            const defaultOptions = {
                reconnect: true,
                reconnectInterval: 5000,
                maxReconnectAttempts: 5
            };
            
            const config = { ...defaultOptions, ...options };
            let ws = null;
            let reconnectAttempts = 0;
            
            const connect = () => {
                try {
                    ws = new WebSocket(url);
                    
                    ws.onopen = (event) => {
                        reconnectAttempts = 0;
                        if (config.onOpen) config.onOpen(event);
                    };
                    
                    ws.onmessage = (event) => {
                        if (config.onMessage) config.onMessage(event);
                    };
                    
                    ws.onclose = (event) => {
                        if (config.onClose) config.onClose(event);
                        
                        // 自動再接続
                        if (config.reconnect && reconnectAttempts < config.maxReconnectAttempts) {
                            reconnectAttempts++;
                            console.log(`WebSocket reconnecting... (${reconnectAttempts}/${config.maxReconnectAttempts})`);
                            setTimeout(connect, config.reconnectInterval);
                        }
                    };
                    
                    ws.onerror = (event) => {
                        console.error('WebSocket error:', event);
                        if (config.onError) config.onError(event);
                    };
                    
                } catch (error) {
                    console.error('WebSocket connection failed:', error);
                    if (config.onError) config.onError(error);
                }
            };
            
            connect();
            
            return {
                send: (data) => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(typeof data === 'string' ? data : JSON.stringify(data));
                    }
                },
                close: () => {
                    config.reconnect = false;
                    if (ws) ws.close();
                },
                getState: () => ws ? ws.readyState : null
            };
        },
        
        /**
         * ヘルスチェック
         */
        async healthCheck() {
            try {
                const result = await this.executeAjax('health_check');
                return result;
            } catch (error) {
                console.error('Health check failed:', error);
                return { success: false, error: error.message };
            }
        },
        
        /**
         * システムステータス確認
         */
        async getSystemStatus() {
            try {
                const result = await this.executeAjax('system_status');
                return result;
            } catch (error) {
                console.error('System status check failed:', error);
                return { success: false, error: error.message };
            }
        },
        
        /**
         * ユーティリティ: スリープ
         */
        sleep: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        
        /**
         * エラーハンドリング統一
         */
        handleError: function(error, context = '') {
            const errorMessage = error.message || String(error);
            const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
            
            console.error('N3API Error:', fullMessage);
            
            // N3Utilsが利用可能な場合はメッセージ表示
            if (window.N3Utils && typeof window.N3Utils.showError === 'function') {
                window.N3Utils.showError(fullMessage);
            }
            
            return {
                success: false,
                error: errorMessage,
                context: context
            };
        },
        
        /**
         * デバッグ情報出力
         */
        debug: function(message, data = null) {
            if (window.NAGANO3_CONFIG && window.NAGANO3_CONFIG.debug) {
                console.log(`[N3API-DEBUG] ${message}`, data || '');
            }
        }
    };
    
    // グローバル露出
    window.N3API = N3API;
    
    // 後方互換性のためのエイリアス
    window.executeAjax = N3API.executeAjax.bind(N3API);
    window.healthCheck = N3API.healthCheck.bind(N3API);
    
    console.log('✅ N3API Library v2.0 loaded');
    
})(window);
