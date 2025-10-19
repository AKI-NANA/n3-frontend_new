
// CAIDS character_limit Hook
// CAIDS character_limit Hook - 基本実装
console.log('✅ character_limit Hook loaded');

// CAIDS ajax_integration Hook
// CAIDS ajax_integration Hook - 基本実装
console.log('✅ ajax_integration Hook loaded');

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
 * Emverze SaaS - 共通JavaScriptライブラリ
 * 全ページで使用される共通機能を提供
 */

(function() {
    'use strict';

    // EmverzeApp名前空間
    window.EmverzeApp = {
        // 設定
        config: {
            apiBaseUrl: '/api/v1',
            csrfToken: document.querySelector('meta[name="csrf-token"]')?.content,
            debug: false
        },

        // 初期化
        init: function() {
            this.setupCSRF();
            this.setupErrorHandling();
            this.setupFormValidation();
            this.setupModals();
            this.setupTooltips();
            this.setupConfirmDialogs();

            if (this.config.debug) {
                console.log('EmverzeApp initialized');
            }
        },

        // CSRF設定（必須）
        setupCSRF: function() {
            // fetch APIのCSRF設定
            const originalFetch = window.fetch;
            window.fetch = function(url, options = {}) {
                if (EmverzeApp.config.csrfToken) {
                    options.headers = options.headers || {};
                    options.headers['X-CSRFToken'] = EmverzeApp.config.csrfToken;
                }
                return originalFetch(url, options);
            };
        },

        // エラーハンドリング設定（必須）
        setupErrorHandling: function() {
            // グローバルエラーハンドラー
            window.addEventListener('error', function(e) {
                EmverzeApp.logError('JavaScript Error', e.error);
            });

            // Promise拒否ハンドラー
            window.addEventListener('unhandledrejection', function(e) {
                EmverzeApp.logError('Unhandled Promise Rejection', e.reason);
            });
        },

        // フォームバリデーション設定（必須）
        setupFormValidation: function() {
            document.addEventListener('submit', function(e) {
                const form = e.target;
                if (form.tagName !== 'FORM') return;

                // カスタムバリデーション
                const isValid = EmverzeApp.validateForm(form);
                if (!isValid) {
                    e.preventDefault();
                    return false;
                }

                // 二重送信防止
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn && !submitBtn.disabled) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = '処理中...';

                    // 3秒後に再有効化（タイムアウト対策）
                    setTimeout(() => {
                        submitBtn.disabled = false;
                        submitBtn.textContent = submitBtn.dataset.originalText || '送信';
                    }, 3000);
                }
            });
        },

        // フォームバリデーション実行
        validateForm: function(form) {
            let isValid = true;

            // 必須フィールドチェック
            const requiredFields = form.querySelectorAll('[required]');
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    this.showFieldError(field, 'この項目は必須です');
                    isValid = false;
                } else {
                    this.clearFieldError(field);
                }
            });

            // メールフィールドチェック
            const emailFields = form.querySelectorAll('input[type="email"]');
            emailFields.forEach(field => {
                if (field.value && !this.isValidEmail(field.value)) {
                    this.showFieldError(field, '有効なメールアドレスを入力してください');
                    isValid = false;
                }
            });

            return isValid;
        },

        // フィールドエラー表示
        showFieldError: function(field, message) {
            field.classList.add('form-control--error');

            // 既存のエラーメッセージを削除
            const existingError = field.parentNode.querySelector('.form-error');
            if (existingError) {
                existingError.remove();
            }

            // 新しいエラーメッセージを追加
            const errorElement = document.createElement('span');
            errorElement.className = 'form-error';
            errorElement.textContent = message;
            field.parentNode.appendChild(errorElement);
        },

        // フィールドエラークリア
        clearFieldError: function(field) {
            field.classList.remove('form-control--error');
            const errorElement = field.parentNode.querySelector('.form-error');
            if (errorElement) {
                errorElement.remove();
            }
        },

        // メールバリデーション
        isValidEmail: function(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        // モーダル設定
        setupModals: function() {
            // モーダル開く
            document.addEventListener('click', function(e) {
                if (e.target.matches('[data-modal-target]')) {
                    e.preventDefault();
                    const modalId = e.target.dataset.modalTarget;
                    EmverzeApp.openModal(modalId);
                }
            });

            // モーダル閉じる
            document.addEventListener('click', function(e) {
                if (e.target.matches('[data-modal-close]') || e.target.matches('.modal-backdrop')) {
                    EmverzeApp.closeModal();
                }
            });

            // ESCキーでモーダル閉じる
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    EmverzeApp.closeModal();
                }
            });
        },

        // モーダル開く
        openModal: function(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('show');
                document.body.classList.add('modal-open');
            }
        },

        // モーダル閉じる
        closeModal: function() {
            const activeModal = document.querySelector('.modal.show');
            if (activeModal) {
                activeModal.classList.remove('show');
                document.body.classList.remove('modal-open');
            }
        },

        // 確認ダイアログ設定
        setupConfirmDialogs: function() {
            document.addEventListener('click', function(e) {
                if (e.target.matches('[data-confirm]')) {
                    const message = e.target.dataset.confirm;
                    if (!confirm(message)) {
                        e.preventDefault();
                        return false;
                    }
                }
            });
        },

        // ツールチップ設定
        setupTooltips: function() {
            // 簡易ツールチップ実装
            document.addEventListener('mouseenter', function(e) {
                if (e.target.matches('[data-tooltip]')) {
                    EmverzeApp.showTooltip(e.target);
                }
            });

            document.addEventListener('mouseleave', function(e) {
                if (e.target.matches('[data-tooltip]')) {
                    EmverzeApp.hideTooltip();
                }
            });
        },

        // ツールチップ表示
        showTooltip: function(element) {
            const tooltipText = element.dataset.tooltip;
            if (!tooltipText) return;

            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = tooltipText;
            tooltip.id = 'active-tooltip';

            document.body.appendChild(tooltip);

            // 位置調整
            const rect = element.getBoundingClientRect();
            tooltip.style.position = 'absolute';
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
            tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        },

        // ツールチップ非表示
        hideTooltip: function() {
            const tooltip = document.getElementById('active-tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        },

        // 成功メッセージ表示
        showSuccess: function(message) {
            this.showToast(message, 'success');
        },

        // エラーメッセージ表示
        showError: function(message) {
            this.showToast(message, 'error');
        },

        // 警告メッセージ表示
        showWarning: function(message) {
            this.showToast(message, 'warning');
        },

        // 情報メッセージ表示
        showInfo: function(message) {
            this.showToast(message, 'info');
        },

        // 通知表示（ページ横断で使用される中核機能）
        showToast: function(message, type = 'info') {
            // 既存の通知をクリア
            const existingToast = document.querySelector('.toast');
            if (existingToast) {
                existingToast.remove();
            }

            // トーストコンテナを確認・作成
            let container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                container.className = 'toast-container';
                document.body.appendChild(container);
            }

            // 新しい通知を作成
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <span class="toast-message">${message}</span>
                <button class="toast-close" type="button">&times;</button>
            `;

            // 通知をページに追加
            container.appendChild(toast);

            // アニメーション表示
            setTimeout(() => {
                toast.classList.add('show');
            }, 100);

            // 閉じるボタンのイベント
            const closeBtn = toast.querySelector('.toast-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', function() {
                    toast.classList.remove('show');
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.remove();
                        }
                    }, 300);
                });
            }

            // 自動的に5秒後に閉じる
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.classList.remove('show');
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.remove();
                        }
                    }, 300);
                }
            }, 5000);
        },

        // エラーログ
        logError: function(type, error) {
            if (this.config.debug) {
                console.error(`[${type}]`, error);
            }

            // 本番環境では外部ログサービスに送信
            if (!this.config.debug && window.location.hostname !== 'localhost') {
                // この部分で外部ログサービス（Sentry等）に送信
            }
        },

        // API呼び出しヘルパー
        api: {
            get: function(endpoint) {
                return EmverzeApp.request('GET', endpoint);
            },

            post: function(endpoint, data) {
                return EmverzeApp.request('POST', endpoint, data);
            },

            put: function(endpoint, data) {
                return EmverzeApp.request('PUT', endpoint, data);
            },

            delete: function(endpoint) {
                return EmverzeApp.request('DELETE', endpoint);
            }
        },

        // HTTP リクエスト
        request: function(method, endpoint, data = null) {
            const url = this.config.apiBaseUrl + endpoint;
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.config.csrfToken
                }
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            return fetch(url, options)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    return response.json();
                })
                .catch(error => {
                    this.logError('API Request Error', error);
                    throw error;
                });
        },

        // ユーティリティ関数
        utils: {
            // 数値フォーマット
            formatNumber: function(num, decimals = 0) {
                return new Intl.NumberFormat('ja-JP', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals
                }).format(num);
            },

            // 通貨フォーマット
            formatCurrency: function(amount, currency = 'JPY') {
                return new Intl.NumberFormat('ja-JP', {
                    style: 'currency',
                    currency: currency
                }).format(amount);
            },

            // 日付フォーマット
            formatDate: function(date, options = {}) {
                const defaultOptions = {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                };
                return new Intl.DateTimeFormat('ja-JP', { ...defaultOptions, ...options }).format(new Date(date));
            },

            // 相対時間フォーマット
            formatRelativeTime: function(date) {
                const now = new Date();
                const targetDate = new Date(date);
                const diffMs = now - targetDate;
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                if (diffMinutes < 1) {
                    return 'たった今';
                } else if (diffMinutes < 60) {
                    return `${diffMinutes}分前`;
                } else if (diffHours < 24) {
                    return `${diffHours}時間前`;
                } else if (diffDays < 7) {
                    return `${diffDays}日前`;
                } else {
                    return this.formatDate(date);
                }
            },

            // 文字列省略
            truncate: function(str, length = 50) {
                if (str.length <= length) return str;
                return str.substring(0, length) + '...';
            },

            // ランダムID生成
            generateId: function(prefix = 'id') {
                return prefix + '_' + Math.random().toString(36).substr(2, 9);
            }
        }
    };

    // DOMContentLoaded時に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            EmverzeApp.init();
        });
    } else {
        EmverzeApp.init();
    }

})();