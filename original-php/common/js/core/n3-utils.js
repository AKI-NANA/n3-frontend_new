/**
 * N3 Utilities Library v2.0
 * 汎用ユーティリティ関数集
 * 全プロジェクト共通で使用する基盤ライブラリ
 */

(function(window) {
    'use strict';
    
    /**
     * N3 ユーティリティクラス
     */
    const N3Utils = {
        /**
         * 日本語日付フォーマット
         */
        formatDateJP: function(date) {
            if (!date) return '';
            const d = new Date(date);
            return d.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        },
        
        /**
         * 通貨フォーマット
         */
        formatCurrency: function(amount, currency = 'USD') {
            if (isNaN(amount)) return '';
            return new Intl.NumberFormat('ja-JP', {
                style: 'currency',
                currency: currency
            }).format(amount);
        },
        
        /**
         * 数値フォーマット（カンマ区切り）
         */
        formatNumber: function(number) {
            if (isNaN(number)) return '';
            return new Intl.NumberFormat('ja-JP').format(number);
        },
        
        /**
         * デバウンス関数
         */
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
        
        /**
         * スロットル関数
         */
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
            };
        },
        
        /**
         * メールアドレス検証
         */
        validateEmail: function(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },
        
        /**
         * 電話番号検証（日本）
         */
        validatePhoneJP: function(phone) {
            const phoneRegex = /^(\+81|0)[0-9\-]{9,11}$/;
            return phoneRegex.test(phone.replace(/[\s\-]/g, ''));
        },
        
        /**
         * 文字列エスケープ
         */
        escapeHtml: function(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        },
        
        /**
         * UUID生成
         */
        generateUUID: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        
        /**
         * ランダム文字列生成
         */
        generateRandomString: function(length = 8) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },
        
        /**
         * 深いオブジェクトコピー
         */
        deepClone: function(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj);
            if (obj instanceof Array) return obj.map(item => this.deepClone(item));
            if (typeof obj === 'object') {
                const clonedObj = {};
                Object.keys(obj).forEach(key => {
                    clonedObj[key] = this.deepClone(obj[key]);
                });
                return clonedObj;
            }
        },
        
        /**
         * オブジェクト比較
         */
        isEqual: function(obj1, obj2) {
            return JSON.stringify(obj1) === JSON.stringify(obj2);
        },
        
        /**
         * 配列から重複削除
         */
        uniqueArray: function(array) {
            return [...new Set(array)];
        },
        
        /**
         * 配列のグループ化
         */
        groupBy: function(array, key) {
            return array.reduce((groups, item) => {
                const group = item[key];
                groups[group] = groups[group] || [];
                groups[group].push(item);
                return groups;
            }, {});
        },
        
        /**
         * ローカルストレージ操作（JSONサポート）
         */
        storage: {
            set: function(key, value) {
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (e) {
                    console.error('localStorage.setItem failed:', e);
                    return false;
                }
            },
            
            get: function(key, defaultValue = null) {
                try {
                    const item = localStorage.getItem(key);
                    return item ? JSON.parse(item) : defaultValue;
                } catch (e) {
                    console.error('localStorage.getItem failed:', e);
                    return defaultValue;
                }
            },
            
            remove: function(key) {
                try {
                    localStorage.removeItem(key);
                    return true;
                } catch (e) {
                    console.error('localStorage.removeItem failed:', e);
                    return false;
                }
            },
            
            clear: function() {
                try {
                    localStorage.clear();
                    return true;
                } catch (e) {
                    console.error('localStorage.clear failed:', e);
                    return false;
                }
            }
        },
        
        /**
         * クッキー操作
         */
        cookie: {
            set: function(name, value, days = 7) {
                const expires = new Date();
                expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
                document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
            },
            
            get: function(name) {
                const nameEQ = name + "=";
                const ca = document.cookie.split(';');
                for (let i = 0; i < ca.length; i++) {
                    let c = ca[i];
                    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
                }
                return null;
            },
            
            remove: function(name) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        },
        
        /**
         * 統一メッセージシステム
         */
        showMessage: function(message, type = 'info', duration = 5000) {
            const messageContainer = this.getOrCreateMessageContainer();
            const messageElement = document.createElement('div');
            
            const typeClasses = {
                success: 'n3-message--success',
                error: 'n3-message--error',
                warning: 'n3-message--warning',
                info: 'n3-message--info'
            };
            
            messageElement.className = `n3-message ${typeClasses[type] || typeClasses.info}`;
            messageElement.innerHTML = `
                <div class="n3-message__content">
                    <i class="fas fa-${this.getMessageIcon(type)}"></i>
                    <span>${this.escapeHtml(message)}</span>
                </div>
                <button class="n3-message__close" onclick="this.parentNode.remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            messageContainer.appendChild(messageElement);
            
            // 自動削除
            if (duration > 0) {
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.style.opacity = '0';
                        messageElement.style.transform = 'translateX(100%)';
                        setTimeout(() => {
                            if (messageElement.parentNode) {
                                messageElement.parentNode.removeChild(messageElement);
                            }
                        }, 300);
                    }
                }, duration);
            }
        },
        
        /**
         * メッセージアイコン取得
         */
        getMessageIcon: function(type) {
            const icons = {
                success: 'check-circle',
                error: 'exclamation-triangle',
                warning: 'exclamation-circle',
                info: 'info-circle'
            };
            return icons[type] || icons.info;
        },
        
        /**
         * メッセージコンテナ取得または作成
         */
        getOrCreateMessageContainer: function() {
            let container = document.getElementById('n3-messages');
            if (!container) {
                container = document.createElement('div');
                container.id = 'n3-messages';
                container.className = 'n3-messages';
                document.body.appendChild(container);
                
                // CSS注入
                this.injectMessageCSS();
            }
            return container;
        },
        
        /**
         * メッセージ用CSS注入
         */
        injectMessageCSS: function() {
            if (document.getElementById('n3-message-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'n3-message-styles';
            style.textContent = `
                .n3-messages {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                    pointer-events: none;
                }
                
                .n3-message {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    padding: 12px 16px;
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    font-size: 14px;
                    transition: all 0.3s ease;
                    pointer-events: auto;
                    min-width: 300px;
                }
                
                .n3-message__content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                }
                
                .n3-message__close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    margin-left: 8px;
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                }
                
                .n3-message__close:hover {
                    opacity: 1;
                }
                
                .n3-message--success {
                    background: #d4edda;
                    color: #155724;
                    border-left: 4px solid #28a745;
                }
                
                .n3-message--error {
                    background: #f8d7da;
                    color: #721c24;
                    border-left: 4px solid #dc3545;
                }
                
                .n3-message--warning {
                    background: #fff3cd;
                    color: #856404;
                    border-left: 4px solid #ffc107;
                }
                
                .n3-message--info {
                    background: #d1ecf1;
                    color: #0c5460;
                    border-left: 4px solid #17a2b8;
                }
            `;
            document.head.appendChild(style);
        },
        
        /**
         * エラーメッセージ表示（短縮メソッド）
         */
        showError: function(message, duration = 8000) {
            this.showMessage(message, 'error', duration);
        },
        
        /**
         * 成功メッセージ表示（短縮メソッド）
         */
        showSuccess: function(message, duration = 5000) {
            this.showMessage(message, 'success', duration);
        },
        
        /**
         * 警告メッセージ表示（短縮メソッド）
         */
        showWarning: function(message, duration = 6000) {
            this.showMessage(message, 'warning', duration);
        },
        
        /**
         * ローディング表示
         */
        showLoading: function(message = '読み込み中...') {
            const loadingId = 'n3-loading-' + this.generateRandomString(8);
            const loading = document.createElement('div');
            loading.id = loadingId;
            loading.className = 'n3-loading';
            loading.innerHTML = `
                <div class="n3-loading__backdrop"></div>
                <div class="n3-loading__content">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>${this.escapeHtml(message)}</span>
                </div>
            `;
            
            document.body.appendChild(loading);
            this.injectLoadingCSS();
            
            return {
                close: () => {
                    const element = document.getElementById(loadingId);
                    if (element) element.remove();
                }
            };
        },
        
        /**
         * ローディング用CSS注入
         */
        injectLoadingCSS: function() {
            if (document.getElementById('n3-loading-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'n3-loading-styles';
            style.textContent = `
                .n3-loading {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .n3-loading__backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                }
                
                .n3-loading__content {
                    position: relative;
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                    font-size: 1.1rem;
                    color: #333;
                }
                
                .n3-loading__content i {
                    font-size: 2rem;
                    color: #007bff;
                }
            `;
            document.head.appendChild(style);
        }
    };
    
    // グローバル露出
    window.N3Utils = N3Utils;
    
    console.log('✅ N3Utils Library v2.0 loaded');
    
})(window);
