
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
 * NAGANO-3 Unified Config System【完全実装版】
 * ファイル: common/js/system/unified_config.js
 * 
 * 🔧 設定統一管理・環境別設定・動的設定更新・設定検証
 * ✅ 複数設定ファイル統合・CSRF対応・デバッグモード・キャッシュ管理
 * 
 * @version 1.0.0-complete
 */

"use strict";

console.log('🔧 NAGANO-3 Unified Config System 読み込み開始');

// =====================================
// 🎯 UnifiedConfig メインクラス
// =====================================

class UnifiedConfig {
    constructor() {
        this.config = new Map();
        this.schema = new Map();
        this.watchers = new Map();
        this.history = [];
        this.maxHistorySize = 100;
        
        // 環境検出
        this.environment = this.detectEnvironment();
        
        // デフォルト設定
        this.defaultConfig = {
            // システム基本設定
            system: {
                name: 'NAGANO-3',
                version: '1.0.0-unified',
                environment: this.environment,
                debug: this.environment === 'development',
                maintenance_mode: false,
                session_timeout: 28800, // 8時間
                max_file_size: 10485760, // 10MB
                supported_languages: ['ja', 'en']
            },
            
            // CSRF・セキュリティ設定
            security: {
                csrf_enabled: true,
                csrf_token_lifetime: 3600,
                session_name: 'NAGANO3_SESSID',
                cookie_secure: this.environment === 'production',
                cookie_httponly: true,
                cookie_samesite: 'Strict',
                password_min_length: 8,
                max_login_attempts: 5,
                lockout_duration: 900 // 15分
            },
            
            // Ajax・通信設定
            ajax: {
                timeout: 30000,
                retry_count: 3,
                retry_delay: 1000,
                concurrent_requests: 5,
                cache_duration: 300000, // 5分
                compression: true,
                cors_enabled: false
            },
            
            // UI・表示設定
            ui: {
                theme: 'light',
                language: 'ja',
                timezone: 'Asia/Tokyo',
                date_format: 'YYYY-MM-DD',
                time_format: 'HH:mm:ss',
                items_per_page: 50,
                animation_enabled: true,
                sound_enabled: false,
                notification_position: 'top-right',
                notification_duration: 5000
            },
            
            // 通知設定
            notifications: {
                enabled: true,
                max_notifications: 5,
                auto_close: true,
                sound_enabled: false,
                position: 'top-right',
                animation_speed: 300,
                base_z_index: 999999,
                stack_direction: 'down'
            },
            
            // ファイル読み込み設定
            loader: {
                parallel_loading: true,
                max_parallel_requests: 10,
                timeout: 10000,
                cache_enabled: true,
                preload_critical: true,
                lazy_load_modules: true,
                retry_failed: true,
                max_retries: 3
            },
            
            // モジュール設定
            modules: {
                juchu: {
                    enabled: true,
                    real_time_enabled: true,
                    notification_override: true,
                    batch_size: 100
                },
                kicho: {
                    enabled: true,
                    typescript_enabled: true,
                    csv_max_size: 5242880, // 5MB
                    ai_enabled: true
                }
            },
            
            // デバッグ設定
            debug: {
                enabled: this.environment === 'development',
                log_level: this.environment === 'development' ? 'debug' : 'error',
                console_output: true,
                performance_monitoring: true,
                error_reporting: true,
                verbose_ajax: this.environment === 'development'
            },
            
            // キャッシュ設定
            cache: {
                enabled: true,
                ttl: 3600000, // 1時間
                max_size: 50,
                storage_type: 'memory', // memory, localStorage, sessionStorage
                compression: false,
                versioning: true
            }
        };
        
        this.init();
    }
    
    /**
     * 初期化
     */
    async init() {
        try {
            console.log('🔧 Unified Config 初期化開始');
            
            // 1. デフォルト設定読み込み
            this.loadDefaultConfig();
            
            // 2. 環境別設定読み込み
            await this.loadEnvironmentConfig();
            
            // 3. ローカル設定読み込み
            await this.loadLocalConfig();
            
            // 4. 既存NAGANO3設定統合
            this.mergeExistingNAGANO3Config();
            
            // 5. 設定検証
            this.validateConfig();
            
            // 6. 設定監視開始
            this.startConfigWatching();
            
            // 7. グローバル設定適用
            this.applyGlobalConfig();
            
            console.log('✅ Unified Config 初期化完了');
            
        } catch (error) {
            console.error('❌ Unified Config 初期化エラー:', error);
            
            // フォールバック: デフォルト設定のみ使用
            this.loadDefaultConfig();
        }
    }
    
    /**
     * 環境検出
     */
    detectEnvironment() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        // 開発環境の判定
        if (hostname === 'localhost' || 
            hostname === '127.0.0.1' ||
            hostname.endsWith('.local') ||
            hostname.includes('dev.') ||
            port === '3000' || port === '8080') {
            return 'development';
        }
        
        // ステージング環境の判定
        if (hostname.includes('staging.') || 
            hostname.includes('test.') ||
            hostname.includes('beta.')) {
            return 'staging';
        }
        
        // 本番環境
        return 'production';
    }
    
    /**
     * デフォルト設定読み込み
     */
    loadDefaultConfig() {
        Object.entries(this.defaultConfig).forEach(([category, settings]) => {
            this.config.set(category, new Map(Object.entries(settings)));
        });
        
        console.log('✅ デフォルト設定読み込み完了');
    }
    
    /**
     * 環境別設定読み込み
     */
    async loadEnvironmentConfig() {
        const envConfigPaths = [
            `config/environment/${this.environment}.js`,
            `common/config/${this.environment}.js`,
            `config/${this.environment}.json`
        ];
        
        for (const configPath of envConfigPaths) {
            try {
                const config = await this.loadConfigFromFile(configPath);
                if (config) {
                    this.mergeConfig(config);
                    console.log(`✅ 環境別設定読み込み: ${configPath}`);
                    break;
                }
            } catch (error) {
                console.warn(`⚠️ 環境別設定読み込み失敗: ${configPath}`, error);
            }
        }
    }
    
    /**
     * ローカル設定読み込み
     */
    async loadLocalConfig() {
        try {
            // localStorage からの設定読み込み
            const localConfig = localStorage.getItem('nagano3_config');
            if (localConfig) {
                const parsed = JSON.parse(localConfig);
                this.mergeConfig(parsed);
                console.log('✅ ローカル設定読み込み完了');
            }
        } catch (error) {
            console.warn('⚠️ ローカル設定読み込み失敗:', error);
        }
        
        try {
            // URL パラメータからの設定読み込み
            const urlConfig = this.parseURLConfig();
            if (Object.keys(urlConfig).length > 0) {
                this.mergeConfig(urlConfig);
                console.log('✅ URL設定読み込み完了');
            }
        } catch (error) {
            console.warn('⚠️ URL設定読み込み失敗:', error);
        }
    }
    
    /**
     * ファイルから設定読み込み
     */
    async loadConfigFromFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                return null;
            }
            
            if (filePath.endsWith('.json')) {
                return await response.json();
            } else if (filePath.endsWith('.js')) {
                const text = await response.text();
                // 簡易的なJavaScript設定ファイル評価
                return this.evaluateConfigScript(text);
            }
            
            return null;
        } catch (error) {
            console.warn(`設定ファイル読み込みエラー: ${filePath}`, error);
            return null;
        }
    }
    
    /**
     * 設定スクリプト評価
     */
    evaluateConfigScript(scriptText) {
        try {
            // 安全な評価のための基本的なチェック
            if (scriptText.includes('window.') || 
                scriptText.includes('document.') ||
                scriptText.includes('eval(') ||
                scriptText.includes('Function(')) {
                console.warn('⚠️ 危険な設定スクリプトを検出、スキップします');
                return null;
            }
            
            // config オブジェクトを返すスクリプトを想定
            const configFunction = new Function('return ' + scriptText.replace(/^.*?=\s*/, ''));
            return configFunction();
            
        } catch (error) {
            console.error('設定スクリプト評価エラー:', error);
            return null;
        }
    }
    
    /**
     * URL設定解析
     */
    parseURLConfig() {
        const urlParams = new URLSearchParams(window.location.search);
        const config = {};
        
        // デバッグモード
        if (urlParams.has('debug')) {
            config.debug = { enabled: true };
        }
        
        // テーマ
        if (urlParams.has('theme')) {
            config.ui = { theme: urlParams.get('theme') };
        }
        
        // 言語
        if (urlParams.has('lang')) {
            config.ui = { ...config.ui, language: urlParams.get('lang') };
        }
        
        return config;
    }
    
    /**
     * 既存NAGANO3設定統合
     */
    mergeExistingNAGANO3Config() {
        try {
            // window.NAGANO3_CONFIG の統合
            if (window.NAGANO3_CONFIG) {
                this.mergeConfig({ system: window.NAGANO3_CONFIG });
            }
            
            // window.NAGANO3.config の統合
            if (window.NAGANO3?.config) {
                this.mergeConfig({ system: window.NAGANO3.config });
            }
            
            // CSRFトークン統合
            const csrfToken = this.getCSRFToken();
            if (csrfToken) {
                this.set('security.csrf_token', csrfToken);
            }
            
            console.log('✅ 既存NAGANO3設定統合完了');
            
        } catch (error) {
            console.warn('⚠️ 既存NAGANO3設定統合失敗:', error);
        }
    }
    
    /**
     * CSRFトークン取得
     */
    getCSRFToken() {
        return document.querySelector('meta[name="csrf-token"]')?.content ||
               window.CSRF_TOKEN ||
               window.NAGANO3_CONFIG?.csrf_token ||
               window.NAGANO3?.config?.csrf_token ||
               '';
    }
    
    /**
     * 設定統合
     */
    mergeConfig(newConfig) {
        Object.entries(newConfig).forEach(([category, settings]) => {
            if (!this.config.has(category)) {
                this.config.set(category, new Map());
            }
            
            const categoryConfig = this.config.get(category);
            
            if (typeof settings === 'object' && settings !== null) {
                Object.entries(settings).forEach(([key, value]) => {
                    categoryConfig.set(key, value);
                });
            }
        });
    }
    
    /**
     * 設定値取得
     */
    get(path, defaultValue = null) {
        try {
            const parts = path.split('.');
            
            if (parts.length === 1) {
                // カテゴリ全体を取得
                const category = this.config.get(parts[0]);
                return category ? Object.fromEntries(category) : defaultValue;
            } else if (parts.length === 2) {
                // 特定の設定値を取得
                const [category, key] = parts;
                const categoryConfig = this.config.get(category);
                return categoryConfig ? categoryConfig.get(key) ?? defaultValue : defaultValue;
            }
            
            return defaultValue;
            
        } catch (error) {
            console.error(`設定取得エラー: ${path}`, error);
            return defaultValue;
        }
    }
    
    /**
     * 設定値設定
     */
    set(path, value) {
        try {
            const parts = path.split('.');
            
            if (parts.length === 2) {
                const [category, key] = parts;
                
                if (!this.config.has(category)) {
                    this.config.set(category, new Map());
                }
                
                const categoryConfig = this.config.get(category);
                const oldValue = categoryConfig.get(key);
                
                categoryConfig.set(key, value);
                
                // 変更履歴記録
                this.recordChange(path, oldValue, value);
                
                // 監視者に通知
                this.notifyWatchers(path, value, oldValue);
                
                console.log(`🔧 設定更新: ${path} = ${value}`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error(`設定更新エラー: ${path}`, error);
            return false;
        }
    }
    
    /**
     * 設定検証
     */
    validateConfig() {
        console.log('🧪 設定検証開始');
        
        const issues = [];
        
        // 必須設定の存在確認
        const requiredSettings = [
            'system.name',
            'system.version',
            'security.csrf_enabled',
            'ajax.timeout',
            'ui.theme'
        ];
        
        requiredSettings.forEach(path => {
            if (this.get(path) === null) {
                issues.push({
                    type: 'missing_required',
                    path: path,
                    severity: 'error'
                });
            }
        });
        
        // 型検証
        const typeValidations = {
            'system.debug': 'boolean',
            'ajax.timeout': 'number',
            'ui.items_per_page': 'number',
            'security.csrf_enabled': 'boolean'
        };
        
        Object.entries(typeValidations).forEach(([path, expectedType]) => {
            const value = this.get(path);
            if (value !== null && typeof value !== expectedType) {
                issues.push({
                    type: 'invalid_type',
                    path: path,
                    expected: expectedType,
                    actual: typeof value,
                    severity: 'warning'
                });
            }
        });
        
        // 範囲検証
        const rangeValidations = {
            'ajax.timeout': { min: 1000, max: 300000 },
            'ui.items_per_page': { min: 10, max: 1000 },
            'security.csrf_token_lifetime': { min: 300, max: 86400 }
        };
        
        Object.entries(rangeValidations).forEach(([path, range]) => {
            const value = this.get(path);
            if (typeof value === 'number') {
                if (value < range.min || value > range.max) {
                    issues.push({
                        type: 'out_of_range',
                        path: path,
                        value: value,
                        range: range,
                        severity: 'warning'
                    });
                }
            }
        });
        
        if (issues.length > 0) {
            console.warn('⚠️ 設定検証で問題を検出:', issues);
        } else {
            console.log('✅ 設定検証: 問題なし');
        }
        
        return issues;
    }
    
    /**
     * 設定監視開始
     */
    startConfigWatching() {
        // 定期的な設定チェック
        setInterval(() => {
            this.checkConfigChanges();
        }, 30000); // 30秒間隔
        
        // 外部設定変更の監視
        this.watchExternalChanges();
        
        console.log('👁️ 設定監視開始');
    }
    
    /**
     * 設定変更チェック
     */
    checkConfigChanges() {
        try {
            // localStorage の変更チェック
            const localConfig = localStorage.getItem('nagano3_config');
            if (localConfig) {
                const parsed = JSON.parse(localConfig);
                // 差分があれば統合
                this.mergeConfig(parsed);
            }
        } catch (error) {
            console.warn('設定変更チェックエラー:', error);
        }
    }
    
    /**
     * 外部設定変更監視
     */
    watchExternalChanges() {
        // localStorage の変更を監視
        window.addEventListener('storage', (event) => {
            if (event.key === 'nagano3_config') {
                try {
                    const newConfig = JSON.parse(event.newValue);
                    this.mergeConfig(newConfig);
                    console.log('🔄 外部設定変更を検出・統合しました');
                } catch (error) {
                    console.warn('外部設定変更処理エラー:', error);
                }
            }
        });
    }
    
    /**
     * グローバル設定適用
     */
    applyGlobalConfig() {
        try {
            // NAGANO3グローバル設定の更新
            if (window.NAGANO3) {
                window.NAGANO3.config = this.getGlobalConfig();
            }
            
            // 個別設定の適用
            this.applyThemeConfig();
            this.applyDebugConfig();
            this.applyAjaxConfig();
            
            console.log('✅ グローバル設定適用完了');
            
        } catch (error) {
            console.error('❌ グローバル設定適用エラー:', error);
        }
    }
    
    /**
     * グローバル設定オブジェクト取得
     */
    getGlobalConfig() {
        const globalConfig = {};
        
        this.config.forEach((categoryConfig, category) => {
            globalConfig[category] = Object.fromEntries(categoryConfig);
        });
        
        return globalConfig;
    }
    
    /**
     * テーマ設定適用
     */
    applyThemeConfig() {
        const theme = this.get('ui.theme', 'light');
        
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        
        // CSS クラス適用
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${theme}`);
    }
    
    /**
     * デバッグ設定適用
     */
    applyDebugConfig() {
        const debugEnabled = this.get('debug.enabled', false);
        
        window.NAGANO3_DEBUG = debugEnabled;
        
        if (debugEnabled) {
            console.log('🐛 デバッグモード有効');
        }
    }
    
    /**
     * Ajax設定適用
     */
    applyAjaxConfig() {
        const ajaxConfig = this.get('ajax');
        
        if (window.NAGANO3?.ajax) {
            Object.assign(window.NAGANO3.ajax, ajaxConfig);
        }
    }
    
    /**
     * 設定監視者登録
     */
    watch(path, callback) {
        if (!this.watchers.has(path)) {
            this.watchers.set(path, []);
        }
        
        this.watchers.get(path).push(callback);
        
        console.log(`👁️ 設定監視登録: ${path}`);
    }
    
    /**
     * 設定監視者削除
     */
    unwatch(path, callback) {
        if (this.watchers.has(path)) {
            const callbacks = this.watchers.get(path);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
            
            if (callbacks.length === 0) {
                this.watchers.delete(path);
            }
        }
    }
    
    /**
     * 監視者通知
     */
    notifyWatchers(path, newValue, oldValue) {
        if (this.watchers.has(path)) {
            this.watchers.get(path).forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error(`設定監視コールバックエラー: ${path}`, error);
                }
            });
        }
    }
    
    /**
     * 変更履歴記録
     */
    recordChange(path, oldValue, newValue) {
        this.history.unshift({
            timestamp: Date.now(),
            path: path,
            oldValue: oldValue,
            newValue: newValue
        });
        
        // 履歴サイズ制限
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(0, this.maxHistorySize);
        }
    }
    
    /**
     * 設定保存
     */
    async save() {
        try {
            const config = this.getGlobalConfig();
            
            // localStorage に保存
            localStorage.setItem('nagano3_config', JSON.stringify(config));
            
            // サーバーへの保存（可能な場合）
            if (window.NAGANO3?.ajax?.request) {
                await window.NAGANO3.ajax.request('save_config', { config: config });
            }
            
            console.log('💾 設定保存完了');
            return true;
            
        } catch (error) {
            console.error('❌ 設定保存エラー:', error);
            return false;
        }
    }
    
    /**
     * 設定リセット
     */
    reset() {
        try {
            // localStorage をクリア
            localStorage.removeItem('nagano3_config');
            
            // デフォルト設定に戻す
            this.config.clear();
            this.loadDefaultConfig();
            
            // グローバル設定再適用
            this.applyGlobalConfig();
            
            console.log('🔄 設定リセット完了');
            return true;
            
        } catch (error) {
            console.error('❌ 設定リセットエラー:', error);
            return false;
        }
    }
    
    /**
     * 設定エクスポート
     */
    export() {
        const exportData = {
            timestamp: Date.now(),
            environment: this.environment,
            version: this.get('system.version'),
            config: this.getGlobalConfig()
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    /**
     * 設定インポート
     */
    import(configData) {
        try {
            const imported = typeof configData === 'string' ? JSON.parse(configData) : configData;
            
            if (imported.config) {
                this.mergeConfig(imported.config);
                this.applyGlobalConfig();
                
                console.log('📥 設定インポート完了');
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ 設定インポートエラー:', error);
            return false;
        }
    }
    
    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            environment: this.environment,
            config: this.getGlobalConfig(),
            watchers: Array.from(this.watchers.keys()),
            history: this.history.slice(0, 10), // 最新10件
            validation: this.validateConfig()
        };
    }
    
    /**
     * 設定統計取得
     */
    getStatistics() {
        const stats = {
            categories: this.config.size,
            totalSettings: 0,
            watchers: this.watchers.size,
            historyEntries: this.history.length,
            environment: this.environment
        };
        
        this.config.forEach(categoryConfig => {
            stats.totalSettings += categoryConfig.size;
        });
        
        return stats;
    }
}

// =====================================
// 🚀 自動初期化
// =====================================

// グローバル初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUnifiedConfig);
} else {
    setTimeout(initializeUnifiedConfig, 0);
}

async function initializeUnifiedConfig() {
    try {
        if (!window.NAGANO3_UNIFIED_CONFIG) {
            window.NAGANO3_UNIFIED_CONFIG = new UnifiedConfig();
            
            // NAGANO3名前空間への登録
            if (typeof window.NAGANO3 === 'object') {
                window.NAGANO3.unifiedConfig = window.NAGANO3_UNIFIED_CONFIG;
            }
            
            // グローバル設定関数
            window.getConfig = function(path, defaultValue) {
                return window.NAGANO3_UNIFIED_CONFIG.get(path, defaultValue);
            };
            
            window.setConfig = function(path, value) {
                return window.NAGANO3_UNIFIED_CONFIG.set(path, value);
            };
            
            console.log('✅ Unified Config 初期化完了・グローバル設定完了');
        } else {
            console.log('⚠️ Unified Config は既に初期化済みです');
        }
    } catch (error) {
        console.error('❌ Unified Config 初期化エラー:', error);
    }
}

// =====================================
// 🧪 デバッグ・テスト機能
// =====================================

// 設定システムテスト
window.testUnifiedConfig = function() {
    console.log('🧪 Unified Config テスト開始');
    
    if (window.NAGANO3_UNIFIED_CONFIG) {
        const config = window.NAGANO3_UNIFIED_CONFIG;
        
        const tests = [
            {
                name: '設定取得テスト',
                test: () => config.get('system.name') === 'NAGANO-3'
            },
            {
                name: '設定設定テスト',
                test: () => {
                    config.set('test.value', 'test123');
                    return config.get('test.value') === 'test123';
                }
            },
            {
                name: '環境検出テスト',
                test: () => ['development', 'staging', 'production'].includes(config.environment)
            },
            {
                name: '設定検証テスト',
                test: () => Array.isArray(config.validateConfig())
            }
        ];
        
        const results = tests.map(test => ({
            name: test.name,
            passed: test.test()
        }));
        
        console.log('🧪 テスト結果:', results);
        
        // 統計情報
        const stats = config.getStatistics();
        console.log('📊 設定統計:', stats);
        
        // デバッグ情報
        const debugInfo = config.getDebugInfo();
        console.log('🔧 デバッグ情報:', debugInfo);
        
        return { results, stats, debugInfo };
    } else {
        console.error('❌ Unified Config not initialized');
        return null;
    }
};

// 設定監視テスト
window.testConfigWatching = function() {
    if (window.NAGANO3_UNIFIED_CONFIG) {
        const config = window.NAGANO3_UNIFIED_CONFIG;
        
        // 監視者登録
        config.watch('test.watched_value', (newValue, oldValue, path) => {
            console.log(`👁️ 設定変更検出: ${path} = ${newValue} (前: ${oldValue})`);
        });
        
        // 設定変更
        config.set('test.watched_value', 'initial');
        config.set('test.watched_value', 'changed');
        config.set('test.watched_value', 'final');
        
        console.log('👁️ 設定監視テスト完了');
        return true;
    } else {
        console.error('❌ Unified Config not initialized');
        return false;
    }
};

// 設定状況確認
window.checkConfigStatus = function() {
    if (window.NAGANO3_UNIFIED_CONFIG) {
        const debugInfo = window.NAGANO3_UNIFIED_CONFIG.getDebugInfo();
        console.log('🔧 Config Status:', debugInfo);
        return debugInfo;
    } else {
        console.error('❌ Unified Config not initialized');
        return null;
    }
};

console.log('🔧 NAGANO-3 Unified Config System 読み込み完了');