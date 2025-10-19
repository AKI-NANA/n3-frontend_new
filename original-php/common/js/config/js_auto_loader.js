
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
 * 🚀 JavaScript自動ローダー (既存システム完全保護版)
 * CAIDSプロジェクト統合対応
 * 
 * 【重要原則】
 * - 既存コード一切変更禁止
 * - 新システムは追加のみ
 * - エラー時は既存システム継続
 * - 段階的移行・即座復旧可能
 */

class JSAutoLoader {
    constructor() {
        this.loadedFiles = new Set();
        this.config = window.JS_AUTO_CONFIG || {};
        this.safeMode = true; // 既存保護モード
        this.sessionId = `jsloader_${Date.now()}`;
        
        // 既存システムとの衝突回避
        this.excludeExistingFiles = [
            'common/js/pages/kicho.js',
            'common/claude_universal_hooks/js/hooks/kicho_hooks_engine.js'
        ];
        
        // 検索パス設定
        this.searchPaths = {
            common: 'common/js/core/',
            pages: 'common/js/pages/',
            modules: 'common/js/modules/',
            hooks: 'hooks/'
        };
        
        console.log(`🚀 JSAutoLoader 初期化完了 (Session: ${this.sessionId})`);
    }
    
    /**
     * ページ用JavaScript自動読み込み (メイン関数)
     * @param {string} pageName - ページ名 (例: kicho_content)
     */
    async loadForPage(pageName) {
        try {
            console.log(`🔄 Auto Loader: Starting for ${pageName}`);
            console.time(`JSAutoLoader_${pageName}`);
            
            // 既存システムが動作中か確認
            if (this.isExistingSystemActive(pageName)) {
                console.log('📋 Auto Loader: Existing system active, running in supplement mode');
                // 既存システム補完モード
                await this.loadSupplementaryFiles(pageName);
            } else {
                console.log('🚀 Auto Loader: Full mode');
                // 完全自動読み込み
                await this.loadAllFiles(pageName);
            }
            
            console.timeEnd(`JSAutoLoader_${pageName}`);
            console.log(`✅ Auto Loader: Completed for ${pageName}`);
            
        } catch (error) {
            console.warn('⚠️ Auto Loader: Error occurred, existing system unaffected', error);
            // エラー時は何もしない（既存システム継続）
        }
    }
    
    /**
     * 既存システム動作確認
     * @param {string} pageName - ページ名
     * @returns {boolean} 既存システムが動作中か
     */
    isExistingSystemActive(pageName) {
        // kicho_contentページの既存システム確認
        if (pageName === 'kicho_content') {
            return document.querySelector('script[src*="kicho.js"]') !== null;
        }
        
        // 他のページも同様にチェック
        const existingScripts = [
            'dashboard.js',
            'zaiko.js',
            'config.js'
        ];
        
        return existingScripts.some(script => 
            document.querySelector(`script[src*="${script}"]`) !== null
        );
    }
    
    /**
     * 既存システム補完モード
     * @param {string} pageName - ページ名
     */
    async loadSupplementaryFiles(pageName) {
        console.log('📋 Supplement mode: Loading additional files only');
        
        // 既存システムで読み込まれていない追加ファイルのみ
        const supplementFiles = this.config.supplementaryFiles?.[pageName] || [];
        
        for (const file of supplementFiles) {
            if (!this.isFileAlreadyLoaded(file)) {
                await this.safeLoadScript(file);
            }
        }
    }
    
    /**
     * 完全自動読み込みモード
     * @param {string} pageName - ページ名
     */
    async loadAllFiles(pageName) {
        try {
            // 1. 共通JSファイル読み込み
            await this.loadCommonFiles();
            
            // 2. Hooksから.jsファイル読み込み
            await this.loadHooksJS();
            
            // 3. ページ専用ファイル読み込み
            await this.loadPageFiles(pageName);
            
            // 4. 必要時モジュール読み込み
            await this.loadModules(pageName);
            
            // 5. HTML指定モジュール読み込み
            await this.loadHTMLSpecifiedModules();
            
        } catch (error) {
            console.error('❌ Auto Loader: Full mode error', error);
            this.fallbackToManual(pageName);
        }
    }
    
    /**
     * 共通ファイル読み込み
     */
    async loadCommonFiles() {
        const commonFiles = this.config[this.searchPaths.common] || [
            'common/js/core/config.js',
            'common/js/core/utils.js',
            'common/js/core/app.js'
        ];
        
        for (const file of commonFiles) {
            await this.safeLoadScript(file);
        }
    }
    
    /**
     * Hooks JavaScript読み込み
     */
    async loadHooksJS() {
        const hooksFiles = this.config[this.searchPaths.hooks] || [
            'hooks/error_handling.js',
            'hooks/loading_manager.js'
        ];
        
        for (const file of hooksFiles) {
            await this.safeLoadScript(file);
        }
    }
    
    /**
     * ページ専用ファイル読み込み (規則ベース)
     * @param {string} pageName - ページ名
     */
    async loadPageFiles(pageName) {
        // 規則ベース: common/js/pages/{pageName}.js
        const pageFile = `${this.searchPaths.pages}${pageName}.js`;
        
        if (await this.fileExists(pageFile)) {
            await this.safeLoadScript(pageFile);
        } else {
            console.log(`⏭️ Page file not found: ${pageFile}`);
        }
    }
    
    /**
     * モジュール読み込み (設定ベース)
     * @param {string} pageName - ページ名
     */
    async loadModules(pageName) {
        const modules = this.config.pageFiles?.[pageName] || [];
        
        for (const module of modules) {
            await this.safeLoadScript(module);
        }
    }
    
    /**
     * HTML属性指定モジュール読み込み
     */
    async loadHTMLSpecifiedModules() {
        const body = document.body;
        const modules = body.dataset.jsModules;
        
        if (modules) {
            const moduleList = modules.split(',');
            for (const module of moduleList) {
                const modulePath = `common/js/modules/${module.trim()}.js`;
                await this.safeLoadScript(modulePath);
            }
        }
    }
    
    /**
     * 安全なスクリプト読み込み
     * @param {string} src - スクリプトファイルパス
     */
    async safeLoadScript(src) {
        try {
            // 既存ファイルは読み込まない
            if (this.excludeExistingFiles.includes(src)) {
                console.log(`⏭️ Skipping existing file: ${src}`);
                return;
            }
            
            // 重複チェック
            if (this.loadedFiles.has(src) || this.isFileAlreadyLoaded(src)) {
                console.log(`⏭️ Already loaded: ${src}`);
                return;
            }
            
            await this.loadScript(src);
            
        } catch (error) {
            console.warn(`⚠️ Failed to load ${src}, continuing...`, error);
            // エラーでも処理継続（既存システム影響なし）
        }
    }
    
    /**
     * スクリプト読み込み実行
     * @param {string} src - スクリプトファイルパス
     * @returns {Promise} 読み込み完了Promise
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true; // 非同期読み込み
            
            script.onload = () => {
                this.loadedFiles.add(src);
                console.log(`✅ Auto Loader: ${src}`);
                resolve();
            };
            
            script.onerror = () => {
                const error = new Error(`Failed: ${src}`);
                console.warn(`⚠️ Load failed: ${src}`);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * ファイル読み込み済みチェック
     * @param {string} src - スクリプトファイルパス
     * @returns {boolean} 読み込み済みか
     */
    isFileAlreadyLoaded(src) {
        return document.querySelector(`script[src="${src}"]`) !== null;
    }
    
    /**
     * ファイル存在確認
     * @param {string} path - ファイルパス
     * @returns {Promise<boolean>} ファイルが存在するか
     */
    async fileExists(path) {
        try {
            const response = await fetch(path, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    }
    
    /**
     * フォールバック処理
     * @param {string} pageName - ページ名
     */
    fallbackToManual(pageName) {
        console.log('🔄 Fallback to manual loading');
        // 既存システムへのフォールバック
        // 何もしない（既存システムが継続動作）
    }
    
    /**
     * ローダー状態取得
     * @returns {Object} ローダー状態情報
     */
    getStatus() {
        return {
            sessionId: this.sessionId,
            loadedFiles: Array.from(this.loadedFiles),
            fileCount: this.loadedFiles.size,
            safeMode: this.safeMode,
            excludedFiles: this.excludeExistingFiles
        };
    }
    
    /**
     * デバッグ情報出力
     */
    debug() {
        console.group('🔍 JSAutoLoader Debug Info');
        console.log('Session ID:', this.sessionId);
        console.log('Loaded files:', Array.from(this.loadedFiles));
        console.log('Config:', this.config);
        console.log('Safe mode:', this.safeMode);
        console.groupEnd();
    }
}

// 既存システムとの名前空間衝突回避
window.JSAutoLoader = JSAutoLoader;

// CAIDS統合用グローバル関数
window.initJSAutoLoader = function(pageName) {
    if (!window.jsAutoLoaderInstance) {
        window.jsAutoLoaderInstance = new JSAutoLoader();
    }
    
    return window.jsAutoLoaderInstance.loadForPage(pageName);
};

console.log('📦 JSAutoLoader class registered successfully');
