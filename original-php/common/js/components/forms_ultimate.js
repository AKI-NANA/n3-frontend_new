
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
 * NAGANO-3 フォームコンポーネントシステム（最終強化版）
 * ファイル: common/js/components/forms_component.js
 * 
 * 🎯 重複宣言完全防止・Supreme Guardian連携
 * ✅ 高度なバリデーション・ファイルアップロード・自動保存機能
 */

"use strict";

console.log('📝 フォームコンポーネントシステム読み込み開始');

// ===== Supreme Guardian連携重複防止 =====
const FORMS_REGISTRY_RESULT = window.NAGANO3_SUPREME_GUARDIAN?.registry.safeRegisterFile('forms_component.js');

if (!FORMS_REGISTRY_RESULT?.success) {
    console.warn('⚠️ フォームコンポーネントファイル重複読み込み防止:', FORMS_REGISTRY_RESULT?.reason);
} else {
    // ===== フォームコンポーネントシステム（Supreme Guardian連携） =====
    const formsComponentSystem = {
        version: '5.0.0-ultimate',
        initialized: false,
        instances: new Map(),
        validators: new Map(),
        uploaders: new Map(),
        autoSavers: new Map(),
        
        // デフォルト設定
        defaultConfig: {
            // ファイルアップロード設定
            upload: {
                maxFileSize: 10 * 1024 * 1024, // 10MB
                allowedTypes: {
                    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
                    document: ['.pdf', '.doc', '.docx', '.txt'],
                    data: ['.csv', '.xlsx', '.json'],
                    archive: ['.zip', '.rar']
                },
                uploadUrl: window.location.href,
                multiple: true,
                dragDrop: true
            },
            
            // バリデーション設定
            validation: {
                realTime: true,
                showErrors: true,
                scrollToError: true,
                highlightErrors: true
            },
            
            // 自動保存設定
            autoSave: {
                enabled: false,
                interval: 30000, // 30秒
                key: 'nagano3-autosave',
                showStatus: true
            },
            
            // UI設定
            ui: {
                showProgress: true,
                enableAnimations: true,
                theme: 'default'
            },
            
            debug: window.NAGANO3_SUPREME_GUARDIAN?.debug?.enabled || false
        },
        
        /**
         * システム初期化
         */
        init() {
            if (this.initialized) {
                console.warn('⚠️ フォームコンポーネントシステムは既に初期化済みです');
                return;
            }
            
            try {
                this.setupValidators();
                this.injectStyles();
                this.setupGlobalEventListeners();
                this.initialized = true;
                
                console.log('📝 フォームコンポーネントシステム初期化完了');
            } catch (error) {
                console.error('❌ フォームコンポーネントシステム初期化失敗:', error);
                throw error;
            }
        },
        
        /**
         * ファイルアップロード設定
         */
        setupFileUpload(target, options = {}) {
            const element = typeof target === 'string' ? document.getElementById(target) : target;
            if (!element) {
                console.warn('⚠️ ファイルアップロード対象が見つかりません:', target);
                return null;
            }
            
            const config = { ...this.defaultConfig.upload, ...options };
            const uploaderId = this.generateId('uploader');
            
            try {
                const uploader = new FileUploaderComponent(element, config, uploaderId);
                this.uploaders.set(uploaderId, uploader);
                
                console.log(`📁 ファイルアップロード設定完了: ${element.id || 'unnamed'} (${uploaderId})`);
                return uploader;
                
            } catch (error) {
                console.error('❌ ファイルアップロード設定失敗:', error);
                if (window.NAGANO3_SUPREME_GUARDIAN?.errorHandler) {
                    window.NAGANO3_SUPREME_GUARDIAN.errorHandler.handle(error, 'forms_file_upload');
                }
                return null;
            }
        },
        
        /**
         * フォームバリデーション設定
         */
        setupValidation(target, rules = {}) {
            const form = typeof target === 'string' ? document.getElementById(target) : target;
            if (!form) {
                console.warn('⚠️ バリデーション対象フォームが見つかりません:', target);
                return null;
            }
            
            const config = { ...this.defaultConfig.validation, ...rules };
            const validatorId = this.generateId('validator');
            
            try {
                const validator = new FormValidatorComponent(form, config, validatorId);
                this.validators.set(validatorId, validator);
                
                console.log(`✅ フォームバリデーション設定完了: ${form.id || 'unnamed'} (${validatorId})`);
                return validator;
                
            } catch (error) {
                console.error('❌ フォームバリデーション設定失敗:', error);
                if (window.NAGANO3_SUPREME_GUARDIAN?.errorHandler) {
                    window.NAGANO3_SUPREME_GUARDIAN.errorHandler.handle(error, 'forms_validation');
                }
                return null;
            }
        },
        
        /**
         * 自動保存設定
         */
        setupAutoSave(target, options = {}) {
            const form = typeof target === 'string' ? document.getElementById(target) : target;
            if (!form) {
                console.warn('⚠️ 自動保存対象フォームが見つかりません:', target);
                return null;
            }
            
            const config = { ...this.defaultConfig.autoSave, ...options };
            const autoSaverId = this.generateId('autosaver');
            
            try {
                const autoSaver = new AutoSaveComponent(form, config, autoSaverId);
                this.autoSavers.set(autoSaverId, autoSaver);
                
                console.log(`💾 自動保存設定完了: ${form.id || 'unnamed'} (${autoSaverId})`);
                return autoSaver;
                
            } catch (error) {
                console.error('❌ 自動保存設定失敗:', error);
                if (window.NAGANO3_SUPREME_GUARDIAN?.errorHandler) {
                    window.NAGANO3_SUPREME_GUARDIAN.errorHandler.handle(error, 'forms_autosave');
                }
                return null;
            }
        },
        
        /**
         * バリデーター設定
         */
        setupValidators() {
            // 基本バリデーター
            const baseValidators = {
                required: (value) => {
                    return value !== null && value !== undefined && String(value).trim() !== '';
                },
                
                email: (value) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return !value || emailRegex.test(value);
                },
                
                url: (value) => {
                    try {
                        new URL(value);
                        return true;
                    } catch {
                        return !value; // 空の場合は有効
                    }
                },
                
                number: (value) => {
                    return !value || !isNaN(parseFloat(value));
                },
                
                integer: (value) => {
                    return !value || (Number.isInteger(parseFloat(value)) && parseFloat(value).toString() === value);
                },
                
                minLength: (value, min) => {
                    return !value || String(value).length >= min;
                },
                
                maxLength: (value, max) => {
                    return !value || String(value).length <= max;
                },
                
                min: (value, min) => {
                    return !value || parseFloat(value) >= min;
                },
                
                max: (value, max) => {
                    return !value || parseFloat(value) <= max;
                },
                
                pattern: (value, pattern) => {
                    if (!value) return true;
                    const regex = new RegExp(pattern);
                    return regex.test(value);
                },
                
                phone: (value) => {
                    const phoneRegex = /^[\d\-\+\(\)\s]+$/;
                    return !value || phoneRegex.test(value);
                },
                
                date: (value) => {
                    return !value || !isNaN(Date.parse(value));
                },
                
                custom: (value, validatorFunc) => {
                    return typeof validatorFunc === 'function' ? validatorFunc(value) : true;
                }
            };
            
            Object.entries(baseValidators).forEach(([name, validator]) => {
                this.validators.set(name, validator);
            });
        },
        
        /**
         * スタイル注入
         */
        injectStyles() {
            const styleId = 'nagano3-forms-styles';
            if (document.querySelector(`#${styleId}`)) return;
            
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* ファイルアップロード */
                .nagano3-file-upload {
                    border: 2px dashed var(--color-border, #dee2e6);
                    border-radius: 8px;
                    padding: 2rem;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                    background: var(--color-surface, #f8f9fa);
                }
                
                .nagano3-file-upload:hover {
                    border-color: var(--color-primary, #007cba);
                    background: var(--color-primary-10, rgba(0, 124, 186, 0.1));
                }
                
                .nagano3-file-upload.drag-over {
                    border-color: var(--color-primary, #007cba);
                    background: var(--color-primary-20, rgba(0, 124, 186, 0.2));
                    transform: scale(1.02);
                }
                
                .nagano3-file-upload-icon {
                    font-size: 3rem;
                    color: var(--color-text-secondary, #6c757d);
                    margin-bottom: 1rem;
                }
                
                .nagano3-file-upload-text {
                    color: var(--color-text, #212529);
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                }
                
                .nagano3-file-upload-hint {
                    color: var(--color-text-secondary, #6c757d);
                    font-size: 0.875rem;
                }
                
                /* プログレスバー */
                .nagano3-upload-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: var(--color-surface, #f8f9fa);
                    border-radius: 0 0 6px 6px;
                    overflow: hidden;
                }
                
                .nagano3-upload-progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, var(--color-primary, #007cba), var(--color-primary-70, rgba(0, 124, 186, 0.7)));
                    transition: width 0.3s ease;
                    border-radius: 0 0 6px 6px;
                }
                
                /* フォームエラー */
                .nagano3-form-error {
                    color: var(--color-danger, #dc3545);
                    font-size: 0.875rem;
                    margin-top: 0.25rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .nagano3-form-error-icon {
                    font-size: 1rem;
                }
                
                .nagano3-form-field.has-error {
                    border-color: var(--color-danger, #dc3545) !important;
                    box-shadow: 0 0 0 0.2rem var(--color-danger-20, rgba(220, 53, 69, 0.2)) !important;
                }
                
                /* 自動保存ステータス */
                .nagano3-autosave-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    padding: 0.25rem 0.75rem;
                    border-radius: 1rem;
                    transition: all 0.3s ease;
                }
                
                .nagano3-autosave-status.saving {
                    background: var(--color-warning-20, rgba(255, 193, 7, 0.2));
                    color: var(--color-warning, #ffc107);
                }
                
                .nagano3-autosave-status.saved {
                    background: var(--color-success-20, rgba(40, 167, 69, 0.2));
                    color: var(--color-success, #28a745);
                }
                
                .nagano3-autosave-status.error {
                    background: var(--color-danger-20, rgba(220, 53, 69, 0.2));
                    color: var(--color-danger, #dc3545);
                }
                
                /* ローディングスピナー */
                .nagano3-spinner {
                    display: inline-block;
                    width: 1rem;
                    height: 1rem;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: nagano3-spin 1s linear infinite;
                }
                
                @keyframes nagano3-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                /* アクセシビリティ対応 */
                @media (prefers-reduced-motion: reduce) {
                    .nagano3-file-upload {
                        transition: none;
                    }
                    
                    .nagano3-spinner {
                        animation: none;
                    }
                }
            `;
            
            document.head.appendChild(style);
        },
        
        /**
         * グローバルイベントリスナー設定
         */
        setupGlobalEventListeners() {
            // ページ離脱時の警告
            window.addEventListener('beforeunload', (e) => {
                const hasUnsavedChanges = Array.from(this.autoSavers.values()).some(saver => saver.hasUnsavedChanges);
                
                if (hasUnsavedChanges) {
                    e.preventDefault();
                    e.returnValue = '未保存の変更があります。本当にページを離れますか？';
                    return e.returnValue;
                }
            });
            
            // ドラッグ&ドロップのページ全体でのファイル処理防止
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                document.addEventListener(eventName, (e) => {
                    // ファイルアップロード領域以外での処理を防止
                    if (!e.target.closest('.nagano3-file-upload')) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                });
            });
        },
        
        /**
         * ユニークID生成
         */
        generateId(prefix = 'nagano3') {
            return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        },
        
        /**
         * インスタンス取得
         */
        getInstance(id) {
            return this.uploaders.get(id) || this.validators.get(id) || this.autoSavers.get(id);
        },
        
        /**
         * インスタンス削除
         */
        removeInstance(id) {
            return this.uploaders.delete(id) || this.validators.delete(id) || this.autoSavers.delete(id);
        },
        
        /**
         * デバッグ情報取得
         */
        getDebugInfo() {
            return {
                version: this.version,
                initialized: this.initialized,
                instances: {
                    uploaders: this.uploaders.size,
                    validators: this.validators.size,
                    autoSavers: this.autoSavers.size
                },
                config: this.defaultConfig
            };
        }
    };

    // ===== FileUploaderComponentクラス =====
    class FileUploaderComponent {
        constructor(element, config, id) {
            this.id = id;
            this.element = element;
            this.config = config;
            this.files = [];
            this.uploading = false;
            this.uploadQueue = [];
            this.progressCallbacks = new Set();
            
            this.init();
        }
        
        init() {
            this.setupElement();
            this.setupEventListeners();
        }
        
        setupElement() {
            this.element.classList.add('nagano3-file-upload');
            
            if (!this.element.innerHTML.trim()) {
                this.element.innerHTML = `
                    <div class="nagano3-file-upload-icon">📁</div>
                    <div class="nagano3-file-upload-text">ファイルをドラッグ&ドロップまたはクリックして選択</div>
                    <div class="nagano3-file-upload-hint">
                        対応形式: ${this.getAllowedExtensions().join(', ')} (最大 ${this.formatFileSize(this.config.maxFileSize)})
                    </div>
                `;
            }
        }
        
        setupEventListeners() {
            // ドラッグ&ドロップ
            this.element.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.element.classList.add('drag-over');
            });
            
            this.element.addEventListener('dragleave', (e) => {
                e.preventDefault();
                if (!this.element.contains(e.relatedTarget)) {
                    this.element.classList.remove('drag-over');
                }
            });
            
            this.element.addEventListener('drop', (e) => {
                e.preventDefault();
                this.element.classList.remove('drag-over');
                
                const files = Array.from(e.dataTransfer.files);
                this.handleFiles(files);
            });
            
            // クリックでファイル選択
            this.element.addEventListener('click', () => {
                const fileInput = this.createFileInput();
                fileInput.click();
            });
        }
        
        createFileInput() {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = this.config.multiple;
            input.accept = this.getAllowedExtensions().join(',');
            input.style.display = 'none';
            
            input.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                this.handleFiles(files);
                document.body.removeChild(input);
            });
            
            document.body.appendChild(input);
            return input;
        }
        
        handleFiles(files) {
            const validFiles = [];
            const errors = [];
            
            files.forEach(file => {
                const validation = this.validateFile(file);
                if (validation.valid) {
                    validFiles.push(file);
                } else {
                    errors.push({ file: file.name, error: validation.message });
                }
            });
            
            if (errors.length > 0) {
                this.showErrors(errors);
            }
            
            if (validFiles.length > 0) {
                this.uploadFiles(validFiles);
            }
        }
        
        validateFile(file) {
            // サイズチェック
            if (file.size > this.config.maxFileSize) {
                return {
                    valid: false,
                    message: `ファイルサイズが上限（${this.formatFileSize(this.config.maxFileSize)}）を超えています`
                };
            }
            
            // 拡張子チェック
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            const allowedExtensions = this.getAllowedExtensions();
            
            if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
                return {
                    valid: false,
                    message: `許可されていないファイル形式です（許可: ${allowedExtensions.join(', ')}）`
                };
            }
            
            return { valid: true };
        }
        
        async uploadFiles(files) {
            if (this.uploading) {
                this.uploadQueue.push(...files);
                return;
            }
            
            this.uploading = true;
            this.showProgress(0);
            
            try {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    await this.uploadSingleFile(file, i, files.length);
                }
                
                this.showSuccess(`${files.length}件のファイルのアップロードが完了しました`);
                
            } catch (error) {
                this.showError(`アップロードエラー: ${error.message}`);
            } finally {
                this.uploading = false;
                this.hideProgress();
                
                // キューの処理
                if (this.uploadQueue.length > 0) {
                    const queuedFiles = this.uploadQueue.splice(0);
                    setTimeout(() => this.uploadFiles(queuedFiles), 100);
                }
            }
        }
        
        async uploadSingleFile(file, index, total) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('action', this.config.action || 'file_upload');
            formData.append('upload_id', this.generateUploadId());
            
            // 追加データ
            if (this.config.data) {
                Object.entries(this.config.data).forEach(([key, value]) => {
                    formData.append(key, value);
                });
            }
            
            const response = await fetch(this.config.uploadUrl, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'アップロードエラー');
            }
            
            // プログレス更新
            const progress = ((index + 1) / total) * 100;
            this.showProgress(progress);
            
            return result;
        }
        
        showProgress(percent) {
            let progressBar = this.element.querySelector('.nagano3-upload-progress');
            if (!progressBar) {
                progressBar = document.createElement('div');
                progressBar.className = 'nagano3-upload-progress';
                progressBar.innerHTML = '<div class="nagano3-upload-progress-bar"></div>';
                this.element.appendChild(progressBar);
            }
            
            const bar = progressBar.querySelector('.nagano3-upload-progress-bar');
            bar.style.width = `${percent}%`;
            
            this.progressCallbacks.forEach(callback => callback(percent));
        }
        
        hideProgress() {
            const progressBar = this.element.querySelector('.nagano3-upload-progress');
            if (progressBar) {
                setTimeout(() => {
                    progressBar.remove();
                }, 1000);
            }
        }
        
        showErrors(errors) {
            errors.forEach(error => {
                if (window.showNotification) {
                    window.showNotification(`${error.file}: ${error.error}`, 'error', 5000);
                } else {
                    console.error(`ファイルエラー [${error.file}]:`, error.error);
                }
            });
        }
        
        showSuccess(message) {
            if (window.showNotification) {
                window.showNotification(message, 'success', 3000);
            } else {
                console.log('アップロード成功:', message);
            }
        }
        
        showError(message) {
            if (window.showNotification) {
                window.showNotification(message, 'error', 5000);
            } else {
                console.error('アップロードエラー:', message);
            }
        }
        
        getAllowedExtensions() {
            return Object.values(this.config.allowedTypes).flat();
        }
        
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        generateUploadId() {
            return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        onProgress(callback) {
            this.progressCallbacks.add(callback);
        }
        
        offProgress(callback) {
            this.progressCallbacks.delete(callback);
        }
        
        destroy() {
            this.element.classList.remove('nagano3-file-upload');
            this.progressCallbacks.clear();
            formsComponentSystem.removeInstance(this.id);
        }
    }

    // ===== FormValidatorComponentクラス =====
    class FormValidatorComponent {
        constructor(form, config, id) {
            this.id = id;
            this.form = form;
            this.config = config;
            this.errors = new Map();
            this.fields = new Map();
            
            this.init();
        }
        
        init() {
            this.setupFields();
            this.setupEventListeners();
        }
        
        setupFields() {
            const fields = this.form.querySelectorAll('[data-validate]');
            
            fields.forEach(field => {
                const rules = this.parseRules(field.getAttribute('data-validate'));
                this.fields.set(field, rules);
                
                if (this.config.realTime) {
                    this.setupFieldValidation(field);
                }
            });
        }
        
        setupFieldValidation(field) {
            const events = field.type === 'radio' || field.type === 'checkbox' ? ['change'] : ['blur', 'input'];
            
            events.forEach(eventType => {
                field.addEventListener(eventType, () => {
                    this.validateField(field);
                });
            });
        }
        
        setupEventListeners() {
            this.form.addEventListener('submit', (e) => {
                if (!this.validateForm()) {
                    e.preventDefault();
                    
                    if (this.config.scrollToError) {
                        this.scrollToFirstError();
                    }
                }
            });
        }
        
        parseRules(ruleString) {
            const rules = [];
            const ruleParts = ruleString.split('|');
            
            ruleParts.forEach(rule => {
                const [name, ...params] = rule.split(':');
                rules.push({
                    name: name.trim(),
                    params: params.length > 0 ? params.join(':').split(',').map(p => p.trim()) : []
                });
            });
            
            return rules;
        }
        
        validateField(field) {
            const rules = this.fields.get(field);
            if (!rules) return true;
            
            const value = this.getFieldValue(field);
            const errors = [];
            
            rules.forEach(rule => {
                const validator = formsComponentSystem.validators.get(rule.name);
                if (!validator) {
                    console.warn(`⚠️ バリデーター "${rule.name}" が見つかりません`);
                    return;
                }
                
                const isValid = validator(value, ...rule.params);
                if (!isValid) {
                    errors.push(this.getErrorMessage(rule.name, rule.params));
                }
            });
            
            if (errors.length > 0) {
                this.showFieldError(field, errors);
                this.errors.set(field, errors);
                return false;
            } else {
                this.hideFieldError(field);
                this.errors.delete(field);
                return true;
            }
        }
        
        validateForm() {
            let isValid = true;
            
            this.fields.forEach((rules, field) => {
                if (!this.validateField(field)) {
                    isValid = false;
                }
            });
            
            return isValid;
        }
        
        getFieldValue(field) {
            if (field.type === 'radio') {
                const checked = this.form.querySelector(`input[name="${field.name}"]:checked`);
                return checked ? checked.value : '';
            } else if (field.type === 'checkbox') {
                return field.checked ? field.value : '';
            } else {
                return field.value;
            }
        }
        
        showFieldError(field, errors) {
            if (!this.config.showErrors) return;
            
            // エラー表示クラス追加
            if (this.config.highlightErrors) {
                field.classList.add('nagano3-form-field', 'has-error');
            }
            
            // 既存のエラーメッセージ削除
            this.hideFieldError(field);
            
            // 新しいエラーメッセージ作成
            const errorDiv = document.createElement('div');
            errorDiv.className = 'nagano3-form-error';
            errorDiv.innerHTML = `
                <span class="nagano3-form-error-icon">⚠️</span>
                <span>${errors[0]}</span>
            `;
            
            // エラーメッセージ挿入
            if (field.parentNode) {
                field.parentNode.insertBefore(errorDiv, field.nextSibling);
            }
        }
        
        hideFieldError(field) {
            field.classList.remove('has-error');
            
            const errorDiv = field.parentNode?.querySelector('.nagano3-form-error');
            if (errorDiv) {
                errorDiv.remove();
            }
        }
        
        getErrorMessage(ruleName, params) {
            const messages = {
                required: 'この項目は必須です',
                email: '有効なメールアドレスを入力してください',
                url: '有効なURLを入力してください',
                number: '数値を入力してください',
                integer: '整数を入力してください',
                minLength: `${params[0]}文字以上で入力してください`,
                maxLength: `${params[0]}文字以下で入力してください`,
                min: `${params[0]}以上の値を入力してください`,
                max: `${params[0]}以下の値を入力してください`,
                pattern: '正しい形式で入力してください',
                phone: '有効な電話番号を入力してください',
                date: '有効な日付を入力してください'
            };
            
            return messages[ruleName] || '入力内容に問題があります';
        }
        
        scrollToFirstError() {
            const firstErrorField = Array.from(this.errors.keys())[0];
            if (firstErrorField) {
                firstErrorField.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                firstErrorField.focus();
            }
        }
        
        getErrors() {
            return Object.fromEntries(this.errors);
        }
        
        clearErrors() {
            this.errors.forEach((errors, field) => {
                this.hideFieldError(field);
            });
            this.errors.clear();
        }
        
        destroy() {
            this.clearErrors();
            formsComponentSystem.removeInstance(this.id);
        }
    }

    // ===== AutoSaveComponentクラス =====
    class AutoSaveComponent {
        constructor(form, config, id) {
            this.id = id;
            this.form = form;
            this.config = config;
            this.hasUnsavedChanges = false;
            this.saveTimer = null;
            this.lastSaveData = null;
            this.statusElement = null;
            
            this.init();
        }
        
        init() {
            if (this.config.enabled) {
                this.setupEventListeners();
                this.loadSavedData();
                
                if (this.config.showStatus) {
                    this.createStatusElement();
                }
            }
        }
        
        setupEventListeners() {
            // フォームの変更を監視
            this.form.addEventListener('input', () => {
                this.markAsChanged();
            });
            
            this.form.addEventListener('change', () => {
                this.markAsChanged();
            });
            
            // 手動保存ボタンがあれば設定
            const saveButton = this.form.querySelector('[data-autosave-trigger]');
            if (saveButton) {
                saveButton.addEventListener('click', () => {
                    this.saveNow();
                });
            }
        }
        
        markAsChanged() {
            this.hasUnsavedChanges = true;
            this.updateStatus('changed');
            
            // タイマーリセット
            if (this.saveTimer) {
                clearTimeout(this.saveTimer);
            }
            
            // 自動保存タイマー設定
            this.saveTimer = setTimeout(() => {
                this.saveNow();
            }, this.config.interval);
        }
        
        async saveNow() {
            if (!this.hasUnsavedChanges) return;
            
            try {
                this.updateStatus('saving');
                
                const formData = this.getFormData();
                const saveData = JSON.stringify(formData);
                
                // 前回と同じデータの場合はスキップ
                if (saveData === this.lastSaveData) {
                    this.updateStatus('saved');
                    return;
                }
                
                // ローカルストレージに保存
                localStorage.setItem(this.config.key, saveData);
                
                // サーバーに送信（設定されている場合）
                if (this.config.serverSave) {
                    await this.saveToServer(formData);
                }
                
                this.hasUnsavedChanges = false;
                this.lastSaveData = saveData;
                this.updateStatus('saved');
                
                if (this.saveTimer) {
                    clearTimeout(this.saveTimer);
                    this.saveTimer = null;
                }
                
            } catch (error) {
                console.error('自動保存エラー:', error);
                this.updateStatus('error');
                
                if (window.showNotification) {
                    window.showNotification('自動保存に失敗しました', 'error', 3000);
                }
            }
        }
        
        async saveToServer(data) {
            const response = await fetch(this.config.serverSave.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    action: 'autosave',
                    data: data,
                    key: this.config.key
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server save failed: ${response.status}`);
            }
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Server save failed');
            }
        }
        
        getFormData() {
            const formData = new FormData(this.form);
            const data = {};
            
            for (const [key, value] of formData.entries()) {
                if (data[key]) {
                    // 複数の値がある場合は配列にする
                    if (Array.isArray(data[key])) {
                        data[key].push(value);
                    } else {
                        data[key] = [data[key], value];
                    }
                } else {
                    data[key] = value;
                }
            }
            
            return data;
        }
        
        loadSavedData() {
            try {
                const saved = localStorage.getItem(this.config.key);
                if (!saved) return;
                
                const data = JSON.parse(saved);
                this.restoreFormData(data);
                this.lastSaveData = saved;
                
                if (window.showNotification) {
                    window.showNotification('保存されたデータを復元しました', 'info', 3000);
                }
                
            } catch (error) {
                console.warn('保存データの復元に失敗:', error);
            }
        }
        
        restoreFormData(data) {
            Object.entries(data).forEach(([key, value]) => {
                const field = this.form.querySelector(`[name="${key}"]`);
                if (field) {
                    if (field.type === 'radio' || field.type === 'checkbox') {
                        const targetField = this.form.querySelector(`[name="${key}"][value="${value}"]`);
                        if (targetField) {
                            targetField.checked = true;
                        }
                    } else {
                        field.value = Array.isArray(value) ? value[0] : value;
                    }
                }
            });
        }
        
        createStatusElement() {
            this.statusElement = document.createElement('div');
            this.statusElement.className = 'nagano3-autosave-status';
            this.statusElement.innerHTML = `
                <span class="nagano3-autosave-icon"></span>
                <span class="nagano3-autosave-text">自動保存準備完了</span>
            `;
            
            // フォームの前に挿入
            this.form.parentNode.insertBefore(this.statusElement, this.form);
        }
        
        updateStatus(status) {
            if (!this.statusElement) return;
            
            const iconElement = this.statusElement.querySelector('.nagano3-autosave-icon');
            const textElement = this.statusElement.querySelector('.nagano3-autosave-text');
            
            this.statusElement.className = `nagano3-autosave-status ${status}`;
            
            switch (status) {
                case 'saving':
                    iconElement.innerHTML = '<div class="nagano3-spinner"></div>';
                    textElement.textContent = '保存中...';
                    break;
                case 'saved':
                    iconElement.textContent = '✓';
                    textElement.textContent = '自動保存完了';
                    break;
                case 'error':
                    iconElement.textContent = '⚠️';
                    textElement.textContent = '保存エラー';
                    break;
                case 'changed':
                    iconElement.textContent = '●';
                    textElement.textContent = '未保存の変更があります';
                    break;
                default:
                    iconElement.textContent = '💾';
                    textElement.textContent = '自動保存準備完了';
            }
        }
        
        clearSavedData() {
            localStorage.removeItem(this.config.key);
            this.hasUnsavedChanges = false;
            this.lastSaveData = null;
            this.updateStatus('cleared');
        }
        
        destroy() {
            if (this.saveTimer) {
                clearTimeout(this.saveTimer);
            }
            
            if (this.statusElement) {
                this.statusElement.remove();
            }
            
            formsComponentSystem.removeInstance(this.id);
        }
    }

    // ===== NAGANO3名前空間に登録（Supreme Guardian連携） =====
    window.safeDefineNamespace('NAGANO3.components.forms', formsComponentSystem, 'forms_component');

    // ===== グローバル関数登録（後方互換性・上書き許可） =====
    window.safeDefineFunction('setupFileUpload', function(target, options) {
        return formsComponentSystem.setupFileUpload(target, options);
    }, 'forms_component', { allowOverwrite: true });

    window.safeDefineFunction('setupValidation', function(target, rules) {
        return formsComponentSystem.setupValidation(target, rules);
    }, 'forms_component', { allowOverwrite: true });

    window.safeDefineFunction('setupAutoSave', function(target, options) {
        return formsComponentSystem.setupAutoSave(target, options);
    }, 'forms_component', { allowOverwrite: true });

    // ===== Supreme Guardian初期化キューに登録 =====
    if (window.NAGANO3_SUPREME_GUARDIAN?.initializer) {
        window.NAGANO3_SUPREME_GUARDIAN.initializer.register(
            'forms',
            async () => {
                formsComponentSystem.init();
                console.log('✅ フォームコンポーネントシステム初期化完了');
            },
            { priority: 4, required: false, dependencies: ['notifications'] }
        );
    } else {
        // フォールバック初期化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    if (!formsComponentSystem.initialized) {
                        formsComponentSystem.init();
                    }
                }, 100);
            });
        } else {
            setTimeout(() => {
                if (!formsComponentSystem.initialized) {
                    formsComponentSystem.init();
                }
            }, 100);
        }
    }

    // ===== デバッグ機能（開発環境用） =====
    if (window.NAGANO3_SUPREME_GUARDIAN?.debug?.enabled) {
        window.safeDefineNamespace('NAGANO3_FORMS_DEBUG', {
            info: () => formsComponentSystem.getDebugInfo(),
            testUpload: () => {
                console.log('ファイルアップロードテストのため、テスト用要素を作成します');
                const testDiv = document.createElement('div');
                testDiv.id = 'test-upload';
                testDiv.style.cssText = 'margin: 20px; padding: 20px; border: 1px solid #ccc;';
                document.body.appendChild(testDiv);
                
                return formsComponentSystem.setupFileUpload(testDiv, {
                    maxFileSize: 5 * 1024 * 1024, // 5MB
                    allowedTypes: {
                        image: ['.jpg', '.png'],
                        document: ['.pdf', '.txt']
                    }
                });
            },
            testValidation: () => {
                console.log('フォームバリデーションテストのため、テスト用フォームを作成します');
                const testForm = document.createElement('form');
                testForm.id = 'test-form';
                testForm.innerHTML = `
                    <input type="email" name="email" data-validate="required|email" placeholder="メールアドレス" style="display: block; margin: 10px; padding: 10px;">
                    <input type="text" name="name" data-validate="required|minLength:2" placeholder="名前" style="display: block; margin: 10px; padding: 10px;">
                    <button type="submit" style="margin: 10px; padding: 10px;">送信</button>
                `;
                testForm.style.cssText = 'margin: 20px; padding: 20px; border: 1px solid #ccc;';
                document.body.appendChild(testForm);
                
                return formsComponentSystem.setupValidation(testForm);
            }
        }, 'forms-debug');
    }

    console.log('📝 NAGANO-3 forms_component.js 読み込み完了（Supreme Guardian連携版）');
}

console.log('📝 フォームコンポーネントシステムファイル処理完了');
                    