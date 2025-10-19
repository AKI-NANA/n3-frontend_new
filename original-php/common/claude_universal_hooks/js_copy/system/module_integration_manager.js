
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
 * 🚫 システムコンポーネント一括無効化
 * 
 * 目的: 404エラー完全撲滅と安定性確保
 * 戦略: 推測的検索機能を段階的に無効化
 * 
 * 無効化対象:
 * ✅ module_integration_manager.js
 * ✅ dependency_resolver.js  
 * ✅ unified_config.js
 * ✅ lifecycle_manager.js (一部)
 * 
 * @version 1.0.0-disable-strategy
 */

"use strict";

// =====================================
// 🛡️ システム無効化管理
// =====================================

const SYSTEM_DISABLE_MANAGER_ID = 'SYSTEM_DISABLE_' + Date.now();

if (window.NAGANO3_DISABLE_MANAGER_ACTIVE) {
    console.warn('⚠️ Disable Manager already active');
} else {
    window.NAGANO3_DISABLE_MANAGER_ACTIVE = SYSTEM_DISABLE_MANAGER_ID;
    
    console.log('🚫 System Components Disable Manager Starting');

    // =====================================
    // 📦 無効化管理クラス
    // =====================================
    
    class SystemDisableManager {
        constructor() {
            this.disabledComponents = new Map();
            this.fallbackFunctions = new Map();
            this.statistics = {
                disabled_count: 0,
                fallback_calls: 0,
                prevented_errors: 0,
                start_time: Date.now()
            };
            
            this.init();
        }
        
        init() {
            console.log('🚫 Initializing component disable strategy...');
            
            // 推測的検索機能を段階的に無効化
            this.disableModuleIntegrationManager();
            this.disableDependencyResolver();
            this.disableUnifiedConfig();
            this.disableLifecycleSearches();
            
            // データ不足エラーの寛容化
            this.setupGracefulDegradation();
            
            console.log(`✅ Disabled ${this.statistics.disabled_count} components`);
        }
        
        // 1. モジュール統合マネージャー無効化
        disableModuleIntegrationManager() {
            console.log('🚫 Disabling module_integration_manager.js...');
            
            // 無効化フラグ設定
            window.NAGANO3_MODULE_INTEGRATION_DISABLED = true;
            
            // フォールバック関数提供
            const fallbacks = {
                registerModule: (name, config) => {
                    console.log(`📝 Module '${name}' registration logged (disabled mode)`);
                    return { success: true, mode: 'disabled', message: 'Registration logged only' };
                },
                
                loadModule: (name) => {
                    console.log(`📦 Module '${name}' load request (disabled mode)`);
                    return Promise.resolve({ success: true, mode: 'disabled', message: 'Load request acknowledged' });
                },
                
                loadAllModules: () => {
                    console.log('📦 All modules load request (disabled mode)');
                    return Promise.resolve({ success: true, mode: 'disabled', modules: [] });
                },
                
                discoverModules: () => {
                    console.log('🚫 Module discovery disabled (404 prevention)');
                    this.statistics.prevented_errors++;
                    return Promise.resolve({ success: false, disabled: true, reason: '404 prevention' });
                },
                
                checkModuleIntegrationStatus: () => ({
                    status: 'disabled',
                    reason: '404_error_prevention',
                    timestamp: new Date().toISOString()
                })
            };
            
            // グローバル関数置換
            Object.entries(fallbacks).forEach(([name, func]) => {
                if (typeof window[name] !== 'function') {
                    window[name] = func;
                    this.fallbackFunctions.set(name, func);
                }
            });
            
            this.disabledComponents.set('module_integration_manager', {
                disabled_at: Date.now(),
                reason: '404_error_prevention',
                fallbacks: Object.keys(fallbacks)
            });
            
            this.statistics.disabled_count++;
        }
        
        // 2. 依存関係リゾルバー無効化
        disableDependencyResolver() {
            console.log('🚫 Disabling dependency_resolver.js...');
            
            window.NAGANO3_DEPENDENCY_RESOLVER_DISABLED = true;
            
            const fallbacks = {
                resolveDependencies: () => {
                    console.log('🚫 Dependency resolution disabled (404 prevention)');
                    this.statistics.prevented_errors++;
                    return Promise.resolve({ success: false, disabled: true, dependencies: [] });
                },
                
                checkDependencyStatus: () => ({
                    status: 'disabled',
                    reason: 'file_search_prevention'
                }),
                
                analyzeDependencies: () => {
                    console.log('🚫 Dependency analysis disabled');
                    return Promise.resolve({ success: false, disabled: true });
                }
            };
            
            Object.entries(fallbacks).forEach(([name, func]) => {
                if (typeof window[name] !== 'function') {
                    window[name] = func;
                    this.fallbackFunctions.set(name, func);
                }
            });
            
            this.disabledComponents.set('dependency_resolver', {
                disabled_at: Date.now(),
                reason: 'dependency_file_search_prevention'
            });
            
            this.statistics.disabled_count++;
        }
        
        // 3. 統合設定無効化
        disableUnifiedConfig() {
            console.log('🚫 Disabling unified_config.js file searches...');
            
            window.NAGANO3_UNIFIED_CONFIG_DISABLED = true;
            
            const fallbacks = {
                loadConfig: (configName) => {
                    console.log(`🚫 Config file loading disabled: ${configName}`);
                    this.statistics.prevented_errors++;
                    
                    // デフォルト設定を返す
                    return Promise.resolve({
                        success: true,
                        mode: 'fallback',
                        config: {
                            debug: true,
                            environment: 'development',
                            modules: [],
                            timestamp: Date.now()
                        }
                    });
                },
                
                searchConfigFiles: () => {
                    console.log('🚫 Config file search disabled (404 prevention)');
                    return Promise.resolve({ success: false, disabled: true, files: [] });
                },
                
                checkConfigStatus: () => ({
                    status: 'disabled_fallback',
                    mode: 'graceful_degradation'
                })
            };
            
            Object.entries(fallbacks).forEach(([name, func]) => {
                if (typeof window[name] !== 'function') {
                    window[name] = func;
                    this.fallbackFunctions.set(name, func);
                }
            });
            
            this.disabledComponents.set('unified_config', {
                disabled_at: Date.now(),
                reason: 'config_file_search_prevention'
            });
            
            this.statistics.disabled_count++;
        }
        
        // 4. ライフサイクル検索無効化
        disableLifecycleSearches() {
            console.log('🚫 Disabling lifecycle_manager.js file searches...');
            
            window.NAGANO3_LIFECYCLE_SEARCH_DISABLED = true;
            
            const fallbacks = {
                initializeLifecycle: () => {
                    console.log('🔧 Lifecycle initialized (search-disabled mode)');
                    return Promise.resolve({ success: true, mode: 'search_disabled' });
                },
                
                scanForModules: () => {
                    console.log('🚫 Module scanning disabled (404 prevention)');
                    this.statistics.prevented_errors++;
                    return Promise.resolve({ success: false, disabled: true });
                },
                
                checkLifecycleStatus: () => ({
                    status: 'search_disabled',
                    mode: 'graceful_degradation'
                })
            };
            
            Object.entries(fallbacks).forEach(([name, func]) => {
                if (typeof window[name] !== 'function') {
                    window[name] = func;
                    this.fallbackFunctions.set(name, func);
                }
            });
            
            this.disabledComponents.set('lifecycle_manager_searches', {
                disabled_at: Date.now(),
                reason: 'initialization_search_prevention'
            });
            
            this.statistics.disabled_count++;
        }
        
        // 5. 寛容なエラー処理設定
        setupGracefulDegradation() {
            console.log('🛡️ Setting up graceful degradation...');
            
            // データ不足時の寛容な処理
            window.safeDataAccess = function(data, path, defaultValue = null) {
                try {
                    const keys = path.split('.');
                    let current = data;
                    
                    for (const key of keys) {
                        if (current === null || current === undefined || !(key in current)) {
                            return defaultValue;
                        }
                        current = current[key];
                    }
                    
                    return current;
                } catch (error) {
                    console.debug(`Safe data access failed for path: ${path}`, error);
                    return defaultValue;
                }
            };
            
            // 寛容なファイル読み込み
            window.safeFileLoad = function(url) {
                return new Promise((resolve) => {
                    fetch(url, { method: 'HEAD' })
                        .then(response => {
                            if (response.ok) {
                                // ファイルが存在する場合のみ読み込み
                                const script = document.createElement('script');
                                script.src = url;
                                script.onload = () => resolve({ success: true, url });
                                script.onerror = () => resolve({ success: false, url, reason: 'load_failed' });
                                document.head.appendChild(script);
                            } else {
                                resolve({ success: false, url, reason: 'not_found' });
                            }
                        })
                        .catch(() => {
                            resolve({ success: false, url, reason: 'network_error' });
                        });
                });
            };
            
            // 寛容な初期化
            window.safeInitialize = function(initFunction, componentName) {
                try {
                    if (typeof initFunction === 'function') {
                        const result = initFunction();
                        console.log(`✅ ${componentName} initialized safely`);
                        return result;
                    } else {
                        console.warn(`⚠️ ${componentName} init function not available, skipping`);
                        return { success: false, skipped: true };
                    }
                } catch (error) {
                    console.warn(`⚠️ ${componentName} initialization failed gracefully:`, error.message);
                    return { success: false, error: error.message };
                }
            };
            
            console.log('✅ Graceful degradation setup complete');
        }
        
        // 無効化状況確認
        getDisableStatus() {
            return {
                manager_id: SYSTEM_DISABLE_MANAGER_ID,
                disabled_components: Array.from(this.disabledComponents.keys()),
                statistics: this.statistics,
                fallback_functions: Array.from(this.fallbackFunctions.keys()),
                graceful_degradation: true,
                timestamp: new Date().toISOString()
            };
        }
        
        // コンポーネント再有効化（将来用）
        enableComponent(componentName) {
            if (this.disabledComponents.has(componentName)) {
                console.log(`🔄 Re-enabling component: ${componentName}`);
                this.disabledComponents.delete(componentName);
                return { success: true, component: componentName };
            } else {
                return { success: false, error: 'Component not disabled' };
            }
        }
    }

    // =====================================
    // 🚀 無効化マネージャー初期化
    // =====================================
    
    let disableManager = null;
    
    try {
        disableManager = new SystemDisableManager();
        
        // NAGANO3名前空間に登録
        if (typeof window.NAGANO3 === 'undefined') {
            window.NAGANO3 = {};
        }
        
        if (!window.NAGANO3.system) {
            window.NAGANO3.system = {};
        }
        
        window.NAGANO3.system.disableManager = disableManager;
        
        // グローバル関数登録
        window.getDisableStatus = function() {
            return disableManager ? disableManager.getDisableStatus() : { status: 'not_available' };
        };
        
        window.enableComponent = function(componentName) {
            return disableManager ? disableManager.enableComponent(componentName) : { success: false };
        };
        
        window.checkSystemDisableStatus = function() {
            return disableManager ? disableManager.getDisableStatus() : { status: 'not_initialized' };
        };
        
        console.log('✅ System Disable Manager initialized successfully');
        
        // 無効化状況を表示
        const status = disableManager.getDisableStatus();
        console.log('🚫 Disabled components:', status.disabled_components);
        
    } catch (initError) {
        console.error('❌ Disable Manager initialization failed:', initError);
        
        // 最低限のフォールバック
        window.getDisableStatus = () => ({ status: 'initialization_failed', error: initError.message });
        window.enableComponent = () => ({ success: false, error: 'Manager not available' });
        window.checkSystemDisableStatus = () => ({ status: 'initialization_failed' });
    }

    console.log('🚫 System Components Disable Manager ready');
}

// =====================================
// 🧪 テスト・診断関数
// =====================================

window.testDisableManager = function() {
    console.log('🧪 Testing System Disable Manager...');
    
    if (window.NAGANO3?.system?.disableManager) {
        const status = window.NAGANO3.system.disableManager.getDisableStatus();
        console.log('Disable Manager Status:', status);
        
        // フォールバック関数テスト
        console.log('\n🧪 Testing fallback functions...');
        
        if (typeof window.registerModule === 'function') {
            const result = window.registerModule('test_module', { files: ['test.js'] });
            console.log('registerModule test:', result);
        }
        
        if (typeof window.loadModule === 'function') {
            window.loadModule('test_module').then(result => {
                console.log('loadModule test:', result);
            });
        }
        
        return status;
    } else {
        console.error('Disable Manager not available');
        return { status: 'not_available' };
    }
};

// 完全システム診断
window.fullSystemDisableDiagnostic = function() {
    console.group('🧪 Full System Disable Diagnostic');
    
    // 無効化状況確認
    const disableStatus = window.getDisableStatus();
    console.log('Disable Status:', disableStatus);
    
    // エラーバウンダリ確認
    if (typeof window.checkErrorBoundaryStatus === 'function') {
        console.log('Error Boundary:', window.checkErrorBoundaryStatus());
    }
    
    // ローダー確認
    if (typeof window.testRealFilesLoader === 'function') {
        console.log('Real Files Loader:', window.testRealFilesLoader());
    }
    
    console.groupEnd();
    
    return {
        timestamp: new Date().toISOString(),
        status: 'diagnostic_complete',
        disable_strategy: 'active'
    };
};