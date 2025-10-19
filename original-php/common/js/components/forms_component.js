
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
 * 汎用フォーム機能（Bootstrap.js対応版）
 * ファイル: common/js/components/forms.js
 * 
 * 🎯 目的: 全モジュール共通のフォーム機能
 * ✅ ファイルアップロード（ドラッグ&ドロップ）
 * ✅ フォームバリデーション
 * ✅ 自動保存機能
 * ✅ プログレス表示
 */

"use strict";

console.log("📝 汎用フォーム機能読み込み開始");

// ===== NAGANO3.components.forms として登録 =====
window.NAGANO3 = window.NAGANO3 || {};
window.NAGANO3.components = window.NAGANO3.components || {};

window.NAGANO3.components.forms = {
    version: '1.0.0',
    initialized: false,
    
    // 設定
    config: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: {
            csv: ['.csv'],
            excel: ['.xlsx', '.xls'],
            text: ['.txt'],
            image: ['.jpg', '.jpeg', '.png', '.gif'],
            document: ['.pdf', '.doc', '.docx']
        },
        autoSaveInterval: 30000, // 30秒
        debug: window.location.hostname.includes('localhost')
    },
    
    // 状態管理
    state: {
        activeUploads: new Map(),
        autoSaveTimers: new Map(),
        validationRules: new Map()
    },
    
    // 初期化
    init() {
        if (this.initialized) return;
        
        console.log('🔧 フォーム機能初期化開始');
        
        try {
            this.setupGlobalEventListeners();
            this.setupAutoDiscovery();
            this.initialized = true;
            
            console.log('✅ フォーム機能初期化完了');
            
        } catch (error) {
            console.error('❌ フォーム機能初期化エラー:', error);
        }
    },
    
    // グローバルイベントリスナー設定
    setupGlobalEventListeners() {
        // ファイル入力の自動設定
        document.addEventListener('change', (e) => {
            if (e.target.type === 'file' && e.target.hasAttribute('data-auto-upload')) {
                this.handleFileChange(e.target);
            }
        });
        
        // フォーム送信の自動処理
        document.addEventListener('submit', (e) => {
            if (e.target.hasAttribute('data-auto-validate')) {
                if (!this.validateForm(e.target)) {
                    e.preventDefault();
                }
            }
        });
    },
    
    // 自動発見機能
    setupAutoDiscovery() {
        // ドラッグ&ドロップエリアの自動設定
        document.querySelectorAll('[data-file-drop]').forEach(element => {
            this.setupFileUpload(element.id || element);
        });
        
        // 自動保存フォームの設定
        document.querySelectorAll('[data-auto-save]').forEach(form => {
            this.setupAutoSave(form.id || form);
        });
    },
    
    // ===== ファイルアップロード機能 =====
    
    /**
     * ファイルアップロード設定
     * @param {string|Element} target - 対象要素またはID
     * @param {Object} options - オプション設定
     */
    setupFileUpload(target, options = {}) {
        const element = typeof target === 'string' ? document.getElementById(target) : target;
        if (!element) {
            console.warn('ファイルアップロード対象が見つかりません:', target);
            return;
        }
        
        const config = { ...this.config, ...options };
        
        // ドラッグ&ドロップイベント設定
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('drag-over');
            
            if (config.debug) {
                console.log('📁 ファイルドラッグオーバー');
            }
        });
        
        element.addEventListener('dragleave', (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');
        });
        
        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files, element, config);
        });
        
        // クリックでファイル選択
        element.addEventListener('click', () => {
            const fileInput = this.createFileInput(config);
            fileInput.click();
            
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                this.handleFiles(files, element, config);
            });
        });
        
        console.log('📁 ファイルアップロード設定完了:', element.id || 'unnamed');
    },
    
    /**
     * ファイル処理
     * @param {File[]} files - ファイル配列
     * @param {Element} target - 対象要素
     * @param {Object} config - 設定
     */
    handleFiles(files, target, config) {
        files.forEach(file => {
            // ファイル検証
            const validation = this.validateFile(file, config);
            if (!validation.valid) {
                this.showFileError(validation.message, target);
                return;
            }
            
            // アップロード処理
            this.uploadFile(file, target, config);
        });
    },
    
    /**
     * ファイル検証
     * @param {File} file - ファイル
     * @param {Object} config - 設定
     * @returns {Object} 検証結果
     */
    validateFile(file, config) {
        // サイズチェック
        if (file.size > config.maxFileSize) {
            return {
                valid: false,
                message: `ファイルサイズが上限（${this.formatFileSize(config.maxFileSize)}）を超えています`
            };
        }
        
        // 拡張子チェック
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        const allowedExtensions = Object.values(config.allowedTypes).flat();
        
        if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
            return {
                valid: false,
                message: `許可されていないファイル形式です（${allowedExtensions.join(', ')}）`
            };
        }
        
        return { valid: true };
    },
    
    /**
     * ファイルアップロード実行
     * @param {File} file - ファイル
     * @param {Element} target - 対象要素
     * @param {Object} config - 設定
     */
    async uploadFile(file, target, config) {
        const uploadId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        try {
            // プログレス表示開始
            this.showUploadProgress(uploadId, file.name, target);
            
            // FormData作成
            const formData = new FormData();
            formData.append('file', file);
            formData.append('action', config.action || 'file_upload');
            formData.append('upload_id', uploadId);
            
            // 追加データ
            if (config.data) {
                Object.entries(config.data).forEach(([key, value]) => {
                    formData.append(key, value);
                });
            }
            
            // アップロード実行
            const response = await fetch(config.uploadUrl || window.location.href, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showUploadSuccess(uploadId, result.message || 'アップロード完了', target);
                
                // コールバック実行
                if (config.onSuccess) {
                    config.onSuccess(result, file);
                }
                
            } else {
                throw new Error(result.message || 'アップロードエラー');
            }
            
        } catch (error) {
            console.error('ファイルアップロードエラー:', error);
            this.showUploadError(uploadId, error.message, target);
            
            if (config.onError) {
                config.onError(error, file);
            }
        }
    },
    
    // ===== フォームバリデーション機能 =====
    
    /**
     * フォームバリデーション設定
     * @param {string|Element} target - 対象フォーム
     * @param {Object} rules - バリデーションルール
     */
    setupValidation(target, rules = {}) {
        const form = typeof target === 'string' ? document.getElementById(target) : target;
        if (!form) return;
        
        this.state.validationRules.set(form, rules);
        
        // リアルタイムバリデーション
        form.addEventListener('input', (e) => {
            if (e.target.name && rules[e.target.name]) {
                this.validateField(e.target, rules[e.target.name]);
            }
        });
        
        console.log('✅ フォームバリデーション設定完了:', form.id || 'unnamed');
    },
    
    /**
     * フォーム全体バリデーション
     * @param {Element} form - フォーム要素
     * @returns {boolean} バリデーション結果
     */
    validateForm(form) {
        const rules = this.state.validationRules.get(form);
        if (!rules) return true;
        
        let isValid = true;
        
        Object.entries(rules).forEach(([fieldName, fieldRules]) => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field && !this.validateField(field, fieldRules)) {
                isValid = false;
            }
        });
        
        return isValid;
    },
    
    /**
     * フィールドバリデーション
     * @param {Element} field - フィールド要素
     * @param {Object} rules - ルール
     * @returns {boolean} バリデーション結果
     */
    validateField(field, rules) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        // 必須チェック
        if (rules.required && !value) {
            isValid = false;
            errorMessage = rules.messages?.required || 'この項目は必須です';
        }
        
        // 最小長チェック
        if (isValid && rules.minLength && value.length < rules.minLength) {
            isValid = false;
            errorMessage = rules.messages?.minLength || `${rules.minLength}文字以上入力してください`;
        }
        
        // 最大長チェック
        if (isValid && rules.maxLength && value.length > rules.maxLength) {
            isValid = false;
            errorMessage = rules.messages?.maxLength || `${rules.maxLength}文字以内で入力してください`;
        }
        
        // パターンチェック
        if (isValid && rules.pattern && !rules.pattern.test(value)) {
            isValid = false;
            errorMessage = rules.messages?.pattern || '入力形式が正しくありません';
        }
        
        // カスタムバリデーション
        if (isValid && rules.custom) {
            const customResult = rules.custom(value, field);
            if (!customResult.valid) {
                isValid = false;
                errorMessage = customResult.message;
            }
        }
        
        this.showFieldValidation(field, isValid, errorMessage);
        return isValid;
    },
    
    // ===== 自動保存機能 =====
    
    /**
     * 自動保存設定
     * @param {string|Element} target - 対象フォーム
     * @param {Object} options - オプション
     */
    setupAutoSave(target, options = {}) {
        const form = typeof target === 'string' ? document.getElementById(target) : target;
        if (!form) return;
        
        const config = {
            interval: options.interval || this.config.autoSaveInterval,
            action: options.action || 'auto_save',
            showNotification: options.showNotification !== false,
            ...options
        };
        
        // 変更監視
        let hasChanges = false;
        form.addEventListener('input', () => {
            hasChanges = true;
        });
        
        // 定期保存
        const timer = setInterval(() => {
            if (hasChanges) {
                this.performAutoSave(form, config);
                hasChanges = false;
            }
        }, config.interval);
        
        this.state.autoSaveTimers.set(form, timer);
        
        console.log('💾 自動保存設定完了:', form.id || 'unnamed');
    },
    
    /**
     * 自動保存実行
     * @param {Element} form - フォーム
     * @param {Object} config - 設定
     */
    async performAutoSave(form, config) {
        try {
            const formData = new FormData(form);
            formData.append('action', config.action);
            formData.append('auto_save', '1');
            
            const response = await fetch(config.saveUrl || window.location.href, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success && config.showNotification) {
                    this.showAutoSaveNotification('自動保存しました');
                }
            }
            
        } catch (error) {
            console.warn('自動保存エラー:', error);
        }
    },
    
    // ===== UI機能 =====
    
    /**
     * ファイル入力作成
     * @param {Object} config - 設定
     * @returns {Element} ファイル入力要素
     */
    createFileInput(config) {
        const input = document.createElement('input');
        input.type = 'file';
        input.style.display = 'none';
        
        if (config.multiple) {
            input.multiple = true;
        }
        
        if (config.accept) {
            input.accept = config.accept;
        }
        
        return input;
    },
    
    /**
     * アップロードプログレス表示
     * @param {string} uploadId - アップロードID
     * @param {string} fileName - ファイル名
     * @param {Element} target - 対象要素
     */
    showUploadProgress(uploadId, fileName, target) {
        const progress = document.createElement('div');
        progress.id = `upload-progress-${uploadId}`;
        progress.className = 'upload-progress';
        progress.innerHTML = `
            <div class="upload-progress__info">
                <span class="upload-progress__name">${this.escapeHtml(fileName)}</span>
                <span class="upload-progress__status">アップロード中...</span>
            </div>
            <div class="upload-progress__bar">
                <div class="upload-progress__fill"></div>
            </div>
        `;
        
        target.appendChild(progress);
    },
    
    /**
     * アップロード成功表示
     * @param {string} uploadId - アップロードID
     * @param {string} message - メッセージ
     * @param {Element} target - 対象要素
     */
    showUploadSuccess(uploadId, message, target) {
        const progress = document.getElementById(`upload-progress-${uploadId}`);
        if (progress) {
            progress.innerHTML = `
                <div class="upload-success">
                    <i class="fas fa-check-circle"></i>
                    ${this.escapeHtml(message)}
                </div>
            `;
            
            setTimeout(() => {
                progress.remove();
            }, 3000);
        }
    },
    
    /**
     * アップロードエラー表示
     * @param {string} uploadId - アップロードID
     * @param {string} message - エラーメッセージ
     * @param {Element} target - 対象要素
     */
    showUploadError(uploadId, message, target) {
        const progress = document.getElementById(`upload-progress-${uploadId}`);
        if (progress) {
            progress.innerHTML = `
                <div class="upload-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${this.escapeHtml(message)}
                </div>
            `;
            
            setTimeout(() => {
                progress.remove();
            }, 5000);
        }
    },
    
    /**
     * ファイルエラー表示
     * @param {string} message - エラーメッセージ
     * @param {Element} target - 対象要素
     */
    showFileError(message, target) {
        if (window.NAGANO3?.components?.notifications?.show) {
            window.NAGANO3.components.notifications.show(message, 'error');
        } else {
            alert(`ファイルエラー: ${message}`);
        }
    },
    
    /**
     * フィールドバリデーション表示
     * @param {Element} field - フィールド要素
     * @param {boolean} isValid - バリデーション結果
     * @param {string} errorMessage - エラーメッセージ
     */
    showFieldValidation(field, isValid, errorMessage) {
        // 既存のエラー表示削除
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // バリデーション状態のクラス設定
        field.classList.toggle('field-valid', isValid);
        field.classList.toggle('field-invalid', !isValid);
        
        // エラーメッセージ表示
        if (!isValid && errorMessage) {
            const error = document.createElement('div');
            error.className = 'field-error';
            error.textContent = errorMessage;
            field.parentNode.appendChild(error);
        }
    },
    
    /**
     * 自動保存通知表示
     * @param {string} message - メッセージ
     */
    showAutoSaveNotification(message) {
        // 軽量通知（右下に小さく表示）
        const notification = document.createElement('div');
        notification.className = 'auto-save-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        
        document.body.appendChild(notification);
        
        // フェードイン・アウト
        setTimeout(() => notification.style.opacity = '1', 10);
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    },
    
    // ===== ユーティリティ =====
    
    /**
     * ファイルサイズフォーマット
     * @param {number} bytes - バイト数
     * @returns {string} フォーマット済みサイズ
     */
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${Math.round(size * 100) / 100}${units[unitIndex]}`;
    },
    
    /**
     * HTMLエスケープ
     * @param {string} text - テキスト
     * @returns {string} エスケープ済みテキスト
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * フォーム機能停止
     * @param {string|Element} target - 対象要素
     */
    destroy(target) {
        const element = typeof target === 'string' ? document.getElementById(target) : target;
        if (!element) return;
        
        // タイマー停止
        if (this.state.autoSaveTimers.has(element)) {
            clearInterval(this.state.autoSaveTimers.get(element));
            this.state.autoSaveTimers.delete(element);
        }
        
        // バリデーションルール削除
        this.state.validationRules.delete(element);
        
        console.log('🗑️ フォーム機能停止:', element.id || 'unnamed');
    }
};

// ===== グローバル関数登録（HTML利用用） =====
window.setupFileUpload = function(target, options) {
    return window.NAGANO3.components.forms.setupFileUpload(target, options);
};

window.setupValidation = function(target, rules) {
    return window.NAGANO3.components.forms.setupValidation(target, rules);
};

window.setupAutoSave = function(target, options) {
    return window.NAGANO3.components.forms.setupAutoSave(target, options);
};

// ===== 自動初期化（NAGANO3 ready後） =====
document.addEventListener('nagano3:ready', function() {
    console.log('🚀 フォーム機能自動初期化開始');
    window.NAGANO3.components.forms.init();
});

// フォールバック初期化（Bootstrap.js未使用環境用）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            if (!window.NAGANO3.components.forms.initialized) {
                window.NAGANO3.components.forms.init();
            }
        }, 100);
    });
} else {
    setTimeout(() => {
        if (!window.NAGANO3.components.forms.initialized) {
            window.NAGANO3.components.forms.init();
        }
    }, 100);
}

console.log("✅ 汎用フォーム機能読み込み完了");