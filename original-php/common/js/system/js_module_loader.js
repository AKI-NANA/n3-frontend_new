
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
 * 🔍 NAGANO-3 高度ファイル探索システム
 * 
 * ✅ 複数パターン自動探索・フォールバック
 * ✅ 完全エラー抑制（404/Network/CORS等）
 * ✅ インテリジェント推測・ファイル名変換
 * ✅ セッションキャッシュ・性能最適化
 * 
 * @version 3.0.0-advanced-search
 */

"use strict";

// =====================================
// 🛡️ 高度ファイル探索システム
// =====================================

if (!window.NAGANO3_ADVANCED_FILE_FINDER) {
    window.NAGANO3_ADVANCED_FILE_FINDER = true;
    
    console.log('🔍 NAGANO-3 高度ファイル探索システム開始');

    class AdvancedFileFinder {
        constructor() {
            this.searchPatterns = {
                // JSファイル探索パターン（優先順位順）
                js: [
                    'common/js/pages/{filename}',
                    'common/js/components/{filename}',
                    'common/js/modules/{filename}',
                    'common/js/core/{filename}',
                    'common/js/ui/{filename}',
                    'common/js/utils/{filename}',
                    'common/js/system/{filename}',
                    'common/js/debug/{filename}',
                    'common/js/{filename}',
                    'js/pages/{filename}',
                    'js/components/{filename}',
                    'js/{filename}',
                    'assets/js/{filename}',
                    'modules/{modulename}/assets/{filename}',
                    'modules/{modulename}/{filename}',
                    '{filename}'
                ],
                
                // CSSファイル探索パターン
                css: [
                    'common/css/core/{filename}',
                    'common/css/pages/{filename}',
                    'common/css/templates/{filename}',
                    'common/css/components/{filename}',
                    'common/css/{filename}',
                    'css/core/{filename}',
                    'css/{filename}',
                    'assets/css/{filename}',
                    'modules/{modulename}/assets/{filename}',
                    '{filename}'
                ]
            };
            
            this.fileExtensions = {
                js: ['.js', '.min.js', '.esm.js'],
                css: ['.css', '.min.css']
            };
            
            this.cache = new Map(); // ファイル存在キャッシュ
            this.sessionCache = this.loadSessionCache();
            this.silentMode = true; // 完全エラー抑制
            this.maxSearchAttempts = 15; // 最大探索回数
            this.searchTimeout = 1000; // 1秒タイムアウト
            
            this.initializeErrorSuppression();
        }
        
        /**
         * 完全エラー抑制初期化
         */
        initializeErrorSuppression() {
            // ネットワークエラー完全抑制
            const originalFetch = window.fetch;
            const self = this;
            
            window.fetch = function(...args) {
                const [url, options] = args;
                
                // ファイル探索関連のリクエストのみ処理
                if (self.isFileSearchRequest(url)) {
                    return originalFetch.apply(this, args).catch(error => {
                        // 404やネットワークエラーを完全に抑制
                        if (self.silentMode) {
                            return { ok: false, status: 404, statusText: 'Not Found (Suppressed)' };
                        }
                        throw error;
                    });
                }
                
                return originalFetch.apply(this, args);
            };
        }
        
        /**
         * ファイル探索リクエスト判定
         */
        isFileSearchRequest(url) {
            return url.includes('.js') || url.includes('.css');
        }
        
        /**
         * 高度ファイル探索メイン関数
         */
        async findFile(filename, type = 'js', options = {}) {
            const searchKey = `${filename}:${type}`;
            
            // キャッシュ確認
            if (this.cache.has(searchKey)) {
                const cached = this.cache.get(searchKey);
                console.log(`🎯 キャッシュ命中: ${filename} → ${cached}`);
                return cached;
            }
            
            // セッションキャッシュ確認
            if (this.sessionCache.found[searchKey]) {
                const sessionCached = this.sessionCache.found[searchKey];
                this.cache.set(searchKey, sessionCached);
                console.log(`📦 セッションキャッシュ命中: ${filename} → ${sessionCached}`);
                return sessionCached;
            }
            
            // 失敗キャッシュ確認
            if (this.sessionCache.notFound.includes(searchKey)) {
                console.log(`❌ 失敗キャッシュ: ${filename}`);
                return null;
            }
            
            console.log(`🔍 高度ファイル探索開始: ${filename} (${type})`);
            
            try {
                const result = await this.performAdvancedSearch(filename, type, options);
                
                if (result) {
                    // 成功キャッシュ
                    this.cache.set(searchKey, result);
                    this.sessionCache.found[searchKey] = result;
                    this.saveSessionCache();
                    
                    console.log(`✅ ファイル発見: ${filename} → ${result}`);
                    return result;
                } else {
                    // 失敗キャッシュ
                    this.sessionCache.notFound.push(searchKey);
                    this.saveSessionCache();
                    
                    console.log(`❌ ファイル未発見: ${filename}`);
                    return null;
                }
                
            } catch (error) {
                if (!this.silentMode) {
                    console.warn(`⚠️ 探索エラー: ${filename}`, error);
                }
                return null;
            }
        }
        
        /**
         * 高度探索実行
         */
        async performAdvancedSearch(filename, type, options) {
            const patterns = this.searchPatterns[type] || this.searchPatterns.js;
            const extensions = this.fileExtensions[type] || this.fileExtensions.js;
            
            // ファイル名バリエーション生成
            const fileVariations = this.generateFileVariations(filename, extensions);
            
            // パターン×バリエーション総当り探索
            for (const pattern of patterns) {
                for (const fileVariation of fileVariations) {
                    const searchPaths = this.generateSearchPaths(pattern, fileVariation, options);
                    
                    for (const searchPath of searchPaths) {
                        const exists = await this.checkFileExistsUltraSilent(searchPath);
                        if (exists) {
                            return searchPath;
                        }
                    }
                }
            }
            
            return null;
        }
        
        /**
         * ファイル名バリエーション生成
         */
        generateFileVariations(filename, extensions) {
            const variations = new Set();
            
            // 基本ファイル名
            variations.add(filename);
            
            // 拡張子なしの場合、拡張子追加
            if (!filename.includes('.')) {
                extensions.forEach(ext => {
                    variations.add(filename + ext);
                });
            }
            
            // ハイフン・アンダースコア変換
            const hyphenVersion = filename.replace(/_/g, '-');
            const underscoreVersion = filename.replace(/-/g, '_');
            
            variations.add(hyphenVersion);
            variations.add(underscoreVersion);
            
            // 拡張子追加バージョン
            if (!hyphenVersion.includes('.')) {
                extensions.forEach(ext => {
                    variations.add(hyphenVersion + ext);
                });
            }
            
            if (!underscoreVersion.includes('.')) {
                extensions.forEach(ext => {
                    variations.add(underscoreVersion + ext);
                });
            }
            
            // ケース変換
            variations.add(filename.toLowerCase());
            variations.add(filename.toUpperCase());
            
            // 省略形推測
            if (filename.includes('-')) {
                const abbreviated = filename.split('-').map(part => part.charAt(0)).join('');
                extensions.forEach(ext => {
                    variations.add(abbreviated + ext);
                });
            }
            
            return Array.from(variations);
        }
        
        /**
         * 検索パス生成
         */
        generateSearchPaths(pattern, filename, options) {
            const paths = [];
            
            // 基本パス置換
            let basePath = pattern.replace('{filename}', filename);
            
            // モジュール名推測・置換
            if (basePath.includes('{modulename}')) {
                const moduleNames = this.inferModuleNames(filename, options);
                
                moduleNames.forEach(moduleName => {
                    paths.push(basePath.replace('{modulename}', moduleName));
                });
            } else {
                paths.push(basePath);
            }
            
            return paths;
        }
        
        /**
         * モジュール名推測
         */
        inferModuleNames(filename, options) {
            const moduleNames = [];
            
            // オプションから指定
            if (options.moduleName) {
                moduleNames.push(options.moduleName);
            }
            
            // 現在ページから推測
            const currentPage = this.detectCurrentPage();
            if (currentPage) {
                moduleNames.push(currentPage);
            }
            
            // ファイル名から推測
            if (filename.includes('kicho')) moduleNames.push('kicho');
            if (filename.includes('juchu')) moduleNames.push('juchu');
            if (filename.includes('shohin')) moduleNames.push('shohin');
            if (filename.includes('zaiko')) moduleNames.push('zaiko');
            
            // URLから推測
            const url = window.location.href;
            if (url.includes('kicho')) moduleNames.push('kicho');
            if (url.includes('juchu')) moduleNames.push('juchu');
            if (url.includes('shohin')) moduleNames.push('shohin');
            if (url.includes('zaiko')) moduleNames.push('zaiko');
            
            // 重複除去
            return [...new Set(moduleNames)];
        }
        
        /**
         * 現在ページ検出
         */
        detectCurrentPage() {
            const pageParam = new URLSearchParams(window.location.search).get('page');
            if (pageParam) return pageParam;
            
            const url = window.location.href;
            if (url.includes('kicho')) return 'kicho';
            if (url.includes('juchu')) return 'juchu';
            if (url.includes('shohin')) return 'shohin';
            if (url.includes('zaiko')) return 'zaiko';
            if (url.includes('debug')) return 'debug';
            
            return 'dashboard';
        }
        
        /**
         * 超サイレントファイル存在確認
         */
        async checkFileExistsUltraSilent(url) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.searchTimeout);
                
                const response = await fetch(url, {
                    method: 'HEAD',
                    signal: controller.signal,
                    cache: 'no-cache',
                    mode: 'cors',
                    credentials: 'same-origin'
                });
                
                clearTimeout(timeoutId);
                return response.ok;
                
            } catch (error) {
                // 全種類のエラーを完全抑制
                // 404, Network, CORS, Timeout 等
                return false;
            }
        }
        
        /**
         * セッションキャッシュ管理
         */
        loadSessionCache() {
            try {
                const cached = sessionStorage.getItem('nagano3_file_finder_cache');
                return cached ? JSON.parse(cached) : {
                    found: {},
                    notFound: [],
                    timestamp: Date.now()
                };
            } catch (error) {
                return { found: {}, notFound: [], timestamp: Date.now() };
            }
        }
        
        saveSessionCache() {
            try {
                this.sessionCache.timestamp = Date.now();
                sessionStorage.setItem('nagano3_file_finder_cache', JSON.stringify(this.sessionCache));
            } catch (error) {
                // ストレージエラーも抑制
            }
        }
        
        /**
         * キャッシュクリア
         */
        clearCache() {
            this.cache.clear();
            this.sessionCache = { found: {}, notFound: [], timestamp: Date.now() };
            try {
                sessionStorage.removeItem('nagano3_file_finder_cache');
            } catch (error) {
                // 抑制
            }
            console.log('🗑️ ファイル探索キャッシュクリア完了');
        }
        
        /**
         * デバッグ情報
         */
        getDebugInfo() {
            return {
                cacheSize: this.cache.size,
                sessionFound: Object.keys(this.sessionCache.found).length,
                sessionNotFound: this.sessionCache.notFound.length,
                searchPatterns: Object.keys(this.searchPatterns),
                silentMode: this.silentMode,
                maxSearchAttempts: this.maxSearchAttempts
            };
        }
        
        /**
         * サイレントモード切り替え
         */
        setSilentMode(enabled) {
            this.silentMode = enabled;
            console.log(`🔇 高度ファイル探索サイレントモード: ${enabled ? 'ON' : 'OFF'}`);
        }
    }

    // =====================================
    // 🚀 統合JS Loader（高度探索対応版）
    // =====================================
    
    class UltraJSLoader {
        constructor() {
            this.fileFinder = new AdvancedFileFinder();
            this.loadedFiles = new Set();
            this.loadingPromises = new Map(); // 重複読み込み防止
            this.currentPage = this.fileFinder.detectCurrentPage();
            
            // NAGANO3統合
            if (!window.NAGANO3) window.NAGANO3 = {};
            if (!window.NAGANO3.system) window.NAGANO3.system = {};
            window.NAGANO3.system.ultraJSLoader = this;
            window.NAGANO3.system.fileFinder = this.fileFinder;
        }
        
        /**
         * スマートファイル読み込み
         */
        async loadFile(filename, options = {}) {
            // 重複読み込み防止
            if (this.loadingPromises.has(filename)) {
                console.log(`⏳ 読み込み中: ${filename}`);
                return this.loadingPromises.get(filename);
            }
            
            if (this.loadedFiles.has(filename)) {
                console.log(`⏭️ 既読み込み: ${filename}`);
                return { success: true, cached: true };
            }
            
            // 読み込み開始
            const loadPromise = this.performSmartLoad(filename, options);
            this.loadingPromises.set(filename, loadPromise);
            
            try {
                const result = await loadPromise;
                if (result.success) {
                    this.loadedFiles.add(filename);
                }
                return result;
            } finally {
                this.loadingPromises.delete(filename);
            }
        }
        
        /**
         * スマート読み込み実行
         */
        async performSmartLoad(filename, options) {
            try {
                // ファイル探索
                const fileType = filename.endsWith('.css') ? 'css' : 'js';
                const foundPath = await this.fileFinder.findFile(filename, fileType, {
                    moduleName: options.moduleName || this.currentPage
                });
                
                if (!foundPath) {
                    console.log(`❌ ファイル未発見: ${filename}`);
                    return { success: false, error: 'File not found' };
                }
                
                // ファイル読み込み
                if (fileType === 'js') {
                    return this.loadJSFile(foundPath);
                } else {
                    return this.loadCSSFile(foundPath);
                }
                
            } catch (error) {
                console.warn(`⚠️ スマート読み込みエラー: ${filename}`, error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * JS ファイル読み込み
         */
        async loadJSFile(url) {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.async = false;
                script.src = url;
                
                script.onload = () => {
                    console.log(`✅ JS読み込み成功: ${url}`);
                    resolve({ success: true, url: url });
                };
                
                script.onerror = () => {
                    script.remove();
                    console.warn(`❌ JS読み込み失敗: ${url}`);
                    resolve({ success: false, error: 'Script load failed', url: url });
                };
                
                document.head.appendChild(script);
                
                // タイムアウト
                setTimeout(() => {
                    if (!script.readyState || script.readyState === 'loading') {
                        script.remove();
                        resolve({ success: false, error: 'Timeout', url: url });
                    }
                }, 10000);
            });
        }
        
        /**
         * CSS ファイル読み込み
         */
        async loadCSSFile(url) {
            return new Promise((resolve) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = url;
                
                link.onload = () => {
                    console.log(`✅ CSS読み込み成功: ${url}`);
                    resolve({ success: true, url: url });
                };
                
                link.onerror = () => {
                    link.remove();
                    console.warn(`❌ CSS読み込み失敗: ${url}`);
                    resolve({ success: false, error: 'CSS load failed', url: url });
                };
                
                document.head.appendChild(link);
                
                // タイムアウト
                setTimeout(() => {
                    if (!link.sheet) {
                        link.remove();
                        resolve({ success: false, error: 'Timeout', url: url });
                    }
                }, 5000);
            });
        }
        
        /**
         * ページ固有ファイル自動読み込み
         */
        async loadPageFiles(page = null) {
            const targetPage = page || this.currentPage;
            console.log(`📦 ページファイル自動読み込み: ${targetPage}`);
            
            const pageFiles = this.getPageFileList(targetPage);
            const results = [];
            
            for (const filename of pageFiles) {
                const result = await this.loadFile(filename, { moduleName: targetPage });
                results.push({ filename, ...result });
            }
            
            const successCount = results.filter(r => r.success).length;
            console.log(`📦 ページファイル読み込み完了: ${successCount}/${results.length}件成功`);
            
            return results;
        }
        
        /**
         * ページ別ファイルリスト
         */
        getPageFileList(page) {
            const fileMap = {
                'kicho': ['kicho.js', 'kicho-dashboard.js', 'ai-learning.js'],
                'juchu': ['juchu.js', 'order-management.js'],
                'shohin': ['shohin.js', 'product-management.js'],
                'zaiko': ['zaiko.js', 'inventory-management.js'],
                'debug': ['debug-panel.js', 'performance-monitor.js'],
                'dashboard': ['dashboard.js', 'stats-widget.js']
            };
            
            return fileMap[page] || fileMap['dashboard'];
        }
        
        /**
         * デバッグ情報
         */
        getDebugInfo() {
            return {
                currentPage: this.currentPage,
                loadedFiles: Array.from(this.loadedFiles),
                loadingFiles: Array.from(this.loadingPromises.keys()),
                fileFinder: this.fileFinder.getDebugInfo()
            };
        }
    }

    // =====================================
    // 🚀 グローバル初期化・インターフェース
    // =====================================
    
    const ultraLoader = new UltraJSLoader();
    
    // グローバル関数定義
    window.findFile = function(filename, type, options) {
        return ultraLoader.fileFinder.findFile(filename, type, options);
    };
    
    window.loadFileSmartly = function(filename, options) {
        return ultraLoader.loadFile(filename, options);
    };
    
    window.loadPageFiles = function(page) {
        return ultraLoader.loadPageFiles(page);
    };
    
    window.clearFileCache = function() {
        ultraLoader.fileFinder.clearCache();
    };
    
    window.getFileFinderStatus = function() {
        return ultraLoader.getDebugInfo();
    };
    
    window.setFileFinderSilent = function(enabled) {
        ultraLoader.fileFinder.setSilentMode(enabled);
    };
    
    // 初期化完了イベント
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 高度ファイル探索システム準備完了');
        
        // 現在ページのファイル自動読み込み
        setTimeout(() => {
            ultraLoader.loadPageFiles();
        }, 1000);
    });
    
    console.log('✅ NAGANO-3 高度ファイル探索システム設定完了');

} else {
    console.log('⏭️ 高度ファイル探索システム既に初期化済み');
}