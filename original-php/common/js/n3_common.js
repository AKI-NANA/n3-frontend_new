/**
 * 🎯 N3共通JavaScript - Phase1対応版
 * N3準拠: 全システム共通機能・名前空間管理・ユーティリティ
 * 
 * 機能:
 * - N3システム共通初期化
 * - CSRF トークン管理
 * - Ajax共通処理
 * - エラーハンドリング
 * - ユーティリティ関数
 * 
 * 作成日: 2025年8月25日 Phase 1対応版
 */

// 🎯 N3共通システム初期化
(function() {
    'use strict';
    
    // 🎯 N3システム名前空間
    window.N3 = window.N3 || {};
    
    // 🎯 N3共通設定
    window.N3.config = {
        version: '2.0',
        phase: 'phase1',
        debug: false,
        apiEndpoint: '/index.php',
        csrfToken: null
    };
    
    // 🎯 CSRF トークン管理
    window.N3.csrf = {
        // トークン取得
        getToken: function() {
            // metaタグから取得
            const metaToken = document.querySelector('meta[name="csrf-token"]');
            if (metaToken) return metaToken.content;
            
            // グローバル変数から取得
            if (window.CSRF_TOKEN) return window.CSRF_TOKEN;
            
            // NAGANO3_CONFIGから取得
            if (window.NAGANO3_CONFIG && window.NAGANO3_CONFIG.csrfToken) {
                return window.NAGANO3_CONFIG.csrfToken;
            }
            
            return '';
        },
        
        // トークン設定
        setToken: function(token) {
            window.CSRF_TOKEN = token;
            window.N3.config.csrfToken = token;
        }
    };
    
    // 🎯 Ajax共通処理
    window.N3.ajax = {
        // 共通Ajax実行
        execute: function(action, data = {}) {
            console.log('🎯 N3 Ajax実行:', action, data);
            
            const formData = new FormData();
            formData.append('action', action);
            formData.append('csrf_token', window.N3.csrf.getToken());
            
            // データを追加
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'object') {
                    formData.append(key, JSON.stringify(data[key]));
                } else {
                    formData.append(key, data[key]);
                }
            });
            
            return fetch(window.N3.config.apiEndpoint, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(result => {
                console.log('🎯 N3 Ajax結果:', result);
                
                if (!result.success) {
                    throw new Error(result.error || 'Ajax処理に失敗しました');
                }
                
                return result;
            })
            .catch(error => {
                console.error('❌ N3 Ajaxエラー:', error);
                throw error;
            });
        },
        
        // PythonHook実行
        executeHook: function(hookPath, hookData) {
            console.log('🎯 N3 Hook実行:', hookPath, hookData);
            
            return this.execute('execute_python_hook', {
                hook_path: hookPath,
                hook_data: JSON.stringify(hookData)
            });
        }
    };
    
    // 🎯 ユーティリティ関数
    window.N3.utils = {
        // HTML エスケープ
        escapeHtml: function(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        
        // 数値フォーマット
        formatNumber: function(num, decimals = 0) {
            if (isNaN(num)) return '0';
            return parseFloat(num).toFixed(decimals);
        },
        
        // 通貨フォーマット
        formatCurrency: function(amount, currency = 'USD') {
            if (isNaN(amount)) return '$0.00';
            const formatted = parseFloat(amount).toFixed(2);
            return currency === 'USD' ? '$' + formatted : formatted + ' ' + currency;
        },
        
        // 日付フォーマット
        formatDate: function(date, locale = 'ja-JP') {
            if (!date) return '';
            if (typeof date === 'string') date = new Date(date);
            return date.toLocaleDateString(locale);
        },
        
        // ローディング表示
        showLoading: function(element, message = 'データ読み込み中...') {
            if (!element) return;
            
            const loadingHTML = `
                <div class="n3-loading" style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    color: #64748b;
                    font-size: 0.875rem;
                ">
                    <i class="fas fa-spinner fa-spin" style="margin-right: 0.5rem;"></i>
                    ${message}
                </div>
            `;
            
            element.innerHTML = loadingHTML;
        },
        
        // エラー表示
        showError: function(element, message) {
            if (!element) return;
            
            const errorHTML = `
                <div class="n3-error" style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    color: #dc2626;
                    font-size: 0.875rem;
                    text-align: center;
                ">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
                    ${message}
                </div>
            `;
            
            element.innerHTML = errorHTML;
        },
        
        // 空データ表示
        showEmpty: function(element, message = 'データが見つかりません') {
            if (!element) return;
            
            const emptyHTML = `
                <div class="n3-empty" style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    color: #64748b;
                    font-size: 0.875rem;
                    text-align: center;
                ">
                    <i class="fas fa-inbox" style="margin-right: 0.5rem;"></i>
                    ${message}
                </div>
            `;
            
            element.innerHTML = emptyHTML;
        },
        
        // デバウンス関数
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        // スロットル関数
        throttle: function(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            }
        }
    };
    
    // 🎯 N3イベントシステム
    window.N3.events = {
        listeners: {},
        
        // イベント登録
        on: function(event, callback) {
            if (!this.listeners[event]) {
                this.listeners[event] = [];
            }
            this.listeners[event].push(callback);
        },
        
        // イベント発火
        emit: function(event, data) {
            if (!this.listeners[event]) return;
            
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('❌ N3イベントエラー:', error);
                }
            });
        },
        
        // イベント削除
        off: function(event, callback) {
            if (!this.listeners[event]) return;
            
            if (callback) {
                this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
            } else {
                delete this.listeners[event];
            }
        }
    };
    
    // 🎯 N3ログシステム
    window.N3.log = {
        // デバッグログ
        debug: function(...args) {
            if (window.N3.config.debug) {
                console.log('🐛 N3 Debug:', ...args);
            }
        },
        
        // 情報ログ
        info: function(...args) {
            console.log('ℹ️ N3 Info:', ...args);
        },
        
        // 警告ログ
        warn: function(...args) {
            console.warn('⚠️ N3 Warning:', ...args);
        },
        
        // エラーログ
        error: function(...args) {
            console.error('❌ N3 Error:', ...args);
        }
    };
    
    // 🎯 N3システム初期化
    window.N3.init = function() {
        console.log('🎯 N3共通システム初期化開始');
        
        // CSRFトークン取得
        const token = this.csrf.getToken();
        if (token) {
            this.config.csrfToken = token;
            console.log('✅ CSRFトークン取得完了');
        } else {
            console.warn('⚠️ CSRFトークンが見つかりません');
        }
        
        // デバッグモード確認
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === '1' || window.location.hostname === 'localhost') {
            this.config.debug = true;
            console.log('🐛 N3デバッグモード有効');
        }
        
        // グローバルエラーハンドラー
        window.addEventListener('error', (event) => {
            this.log.error('グローバルエラー:', event.error);
        });
        
        // Promise拒否ハンドラー
        window.addEventListener('unhandledrejection', (event) => {
            this.log.error('Promise拒否:', event.reason);
        });
        
        console.log('✅ N3共通システム初期化完了');
    };
    
    // 🎯 DOM読み込み完了時に初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.N3.init();
        });
    } else {
        window.N3.init();
    }
    
    // 🎯 N3システム準備完了通知
    console.log('✅ N3共通JavaScript準備完了 - Phase 1対応版');
    
})();
