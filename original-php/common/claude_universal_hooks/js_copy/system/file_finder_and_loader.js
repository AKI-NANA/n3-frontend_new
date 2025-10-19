
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
 * 🔧 File Finder & Loader 修正版
 * 
 * 問題解決:
 * ✅ 無限ループ検索停止
 * ✅ 404エラー連発防止
 * ✅ core_header.js依存削除
 * ✅ パフォーマンス改善
 * 
 * @version 2.1.0-error-fix
 */

"use strict";

// =====================================
// 🛡️ 無限検索防止
// =====================================

const FILE_SEARCH_EXECUTED = 'NAGANO3_FILE_SEARCH_' + Date.now();

if (window.NAGANO3_FILE_SEARCH_ACTIVE) {
    console.warn('⚠️ File search already active, skipping');
} else {
    window.NAGANO3_FILE_SEARCH_ACTIVE = FILE_SEARCH_EXECUTED;
    
    console.log('🔍 File Finder & Loader (修正版) 開始');

    // =====================================
    // 🎯 検索対象ファイル管理
    // =====================================
    
    const CORE_FILES = {
        // 必須ではないファイル（検索をスキップ）
        'core_header.js': {
            required: false,
            skip_search: true,
            fallback: 'basic_header_functions'
        },
        
        // 実際に必要なファイル
        'bootstrap.js': {
            required: true,
            paths: ['common/js/', 'js/', './'],
            skip_search: false
        }
    };

    // =====================================
    // 🔧 改良されたファイル検索システム
    // =====================================
    
    class SafeFileLoader {
        constructor() {
            this.searchAttempts = new Map();
            this.maxAttempts = 3;
            this.searchTimeout = 5000; // 5秒でタイムアウト
            this.loadedFiles = new Set();
        }
        
        // ファイル存在確認（安全版）
        async fileExists(url) {
            const attemptKey = url;
            const attempts = this.searchAttempts.get(attemptKey) || 0;
            
            if (attempts >= this.maxAttempts) {
                console.warn(`⚠️ 検索試行回数上限: ${url}`);
                return false;
            }
            
            this.searchAttempts.set(attemptKey, attempts + 1);
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1000);
                
                const response = await fetch(url, {
                    method: 'HEAD',
                    signal: controller.signal,
                    cache: 'no-cache'
                });
                
                clearTimeout(timeoutId);
                return response.ok;
                
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.warn(`⏰ 検索タイムアウト: ${url}`);
                }
                return false;
            }
        }
        
        // スクリプト読み込み（安全版）
        async loadScript(url, isRequired = false) {
            if (this.loadedFiles.has(url)) {
                console.log(`✅ 既読み込み: ${url}`);
                return { success: true, cached: true };
            }
            
            try {
                console.log(`📦 スクリプト読み込み試行: ${url}`);
                
                return new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.type = 'text/javascript';
                    script.async = false;
                    
                    const timeout = setTimeout(() => {
                        console.warn(`⏰ 読み込みタイムアウト: ${url}`);
                        script.remove();
                        resolve({ success: false, error: 'Timeout' });
                    }, this.searchTimeout);
                    
                    script.onload = () => {
                        clearTimeout(timeout);
                        this.loadedFiles.add(url);
                        console.log(`✅ 読み込み成功: ${url}`);
                        resolve({ success: true });
                    };
                    
                    script.onerror = () => {
                        clearTimeout(timeout);
                        console.warn(`❌ 読み込み失敗: ${url}`);
                        script.remove();
                        
                        if (isRequired) {
                            resolve({ success: false, error: 'Required file load failed' });
                        } else {
                            resolve({ success: false, error: 'Optional file load failed' });
                        }
                    };
                    
                    script.src = url;
                    document.head.appendChild(script);
                });
                
            } catch (error) {
                console.error(`❌ スクリプト読み込みエラー: ${url}`, error);
                return { success: false, error: error.message };
            }
        }
        
        // ファイル検索（制限付き）
        async searchFile(filename, searchPaths = []) {
            const fileConfig = CORE_FILES[filename];
            
            if (fileConfig?.skip_search) {
                console.log(`⏭️ 検索スキップ: ${filename} (設定により無効)`);
                return { success: false, skipped: true };
            }
            
            console.log(`🔍 ファイル検索開始: ${filename}`);
            
            // デフォルト検索パス
            const defaultPaths = [
                '',
                'common/js/',
                'js/',
                'modules/',
                'assets/js/',
                './common/js/',
                '../common/js/'
            ];
            
            const paths = [...(fileConfig?.paths || []), ...searchPaths, ...defaultPaths];
            const uniquePaths = [...new Set(paths)];
            
            // 並列検索（制限付き）
            const searchPromises = uniquePaths.slice(0, 5).map(async (path) => {
                const url = path + filename;
                const exists = await this.fileExists(url);
                return { url, exists, path };
            });
            
            try {
                const results = await Promise.allSettled(searchPromises);
                
                for (const result of results) {
                    if (result.status === 'fulfilled' && result.value.exists) {
                        console.log(`✅ ファイル発見: ${result.value.url}`);
                        return { success: true, url: result.value.url, path: result.value.path };
                    }
                }
                
                console.warn(`⚠️ ファイル未発見: ${filename}`);
                return { success: false, error: 'File not found' };
                
            } catch (error) {
                console.error(`❌ 検索エラー: ${filename}`, error);
                return { success: false, error: error.message };
            }
        }
        
        // フォールバック機能作成
        createFallback(filename) {
            const fileConfig = CORE_FILES[filename];
            
            if (filename === 'core_header.js' && fileConfig?.fallback === 'basic_header_functions') {
                console.log('🛠️ core_header.js フォールバック関数を作成');
                
                // 基本的なヘッダー関数を提供
                if (!window.initializeHeader) {
                    window.initializeHeader = function() {
                        console.log('📋 基本ヘッダー初期化（フォールバック）');
                        return { success: true, fallback: true };
                    };
                }
                
                if (!window.updateHeaderStats) {
                    window.updateHeaderStats = function(stats = {}) {
                        console.log('📊 ヘッダー統計更新（フォールバック）', stats);
                        return { success: true, fallback: true };
                    };
                }
                
                return { success: true, fallback: true };
            }
            
            return { success: false, error: 'No fallback available' };
        }
    }

    // =====================================
    // 🚀 最適化されたローダー初期化
    // =====================================
    
    const safeLoader = new SafeFileLoader();
    
    window.initOptimizedLoader = async function() {
        if (window.NAGANO3_LOADER_INITIALIZED) {
            console.log('⚠️ ローダー既に初期化済み');
            return;
        }
        
        window.NAGANO3_LOADER_INITIALIZED = true;
        console.log('🚀 最適化ローダー初期化開始');
        
        try {
            // 必須ファイルのみを検索・読み込み
            const requiredFiles = Object.entries(CORE_FILES)
                .filter(([_, config]) => config.required)
                .map(([filename, _]) => filename);
            
            for (const filename of requiredFiles) {
                const searchResult = await safeLoader.searchFile(filename);
                
                if (searchResult.success) {
                    const loadResult = await safeLoader.loadScript(searchResult.url, true);
                    if (!loadResult.success) {
                        console.warn(`⚠️ 必須ファイル読み込み失敗: ${filename}`);
                    }
                } else {
                    console.warn(`⚠️ 必須ファイル未発見: ${filename}`);
                }
            }
            
            // オプションファイルのフォールバック作成
            const optionalFiles = Object.entries(CORE_FILES)
                .filter(([_, config]) => !config.required)
                .map(([filename, _]) => filename);
            
            for (const filename of optionalFiles) {
                const fallbackResult = safeLoader.createFallback(filename);
                if (fallbackResult.success) {
                    console.log(`✅ フォールバック作成: ${filename}`);
                }
            }
            
            console.log('✅ 最適化ローダー初期化完了');
            
            // 初期化完了イベント
            const event = new CustomEvent('NAGANO3:loader-ready', {
                detail: {
                    loader_id: FILE_SEARCH_EXECUTED,
                    timestamp: Date.now()
                }
            });
            document.dispatchEvent(event);
            
        } catch (error) {
            console.error('❌ ローダー初期化エラー:', error);
        }
    };

    // =====================================
    // 🛑 レガシー関数の無効化
    // =====================================
    
    // 危険な動的検索を無効化
    window.performDynamicSearch = function(filename) {
        console.warn(`⚠️ 動的検索は無効化されています: ${filename}`);
        return Promise.resolve({ success: false, disabled: true });
    };
    
    // 無限ループを引き起こす検索を無効化
    window.searchFixedPaths = function() {
        console.warn('⚠️ 固定パス検索は無効化されています');
        return Promise.resolve({ success: false, disabled: true });
    };
    
    window.searchDirectoryHierarchy = function() {
        console.warn('⚠️ ディレクトリ階層検索は無効化されています');
        return Promise.resolve({ success: false, disabled: true });
    };
    
    window.searchAllDirectories = function() {
        console.warn('⚠️ 全ディレクトリ検索は無効化されています');
        return Promise.resolve({ success: false, disabled: true });
    };

    // =====================================
    // 🏁 自動初期化
    // =====================================
    
    // DOM準備後に初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(window.initOptimizedLoader, 100);
        });
    } else {
        setTimeout(window.initOptimizedLoader, 100);
    }

    console.log('✅ File Finder & Loader (修正版) 設定完了');

} // 重複防止チェック終了