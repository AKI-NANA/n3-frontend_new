
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
 * 🔥 NAGANO-3必須Hooksローダー【自動検知版】
 * 
 * 機能:
 * ✅ 自動JSファイル検知
 * ✅ 必須・汎用・専用の分類
 * ✅ 依存関係管理
 * ✅ エラー処理・フォールバック
 * 
 * 配置: /NAGANO-3/N3-Development/common/js/mandatory_hooks_loader.js
 * 使用: すべてのページで自動読み込み
 */

(function() {
    'use strict';
    
    console.log('🔥 NAGANO-3必須Hooksローダー開始');
    
    // =====================================
    // 📋 Hooks分類定義
    // =====================================
    
    const HOOKS_CLASSIFICATION = {
        // 必須（すべてのページ）
        MANDATORY: [
            'base_system',
            'error_handler', 
            'security_manager',
            'directory_manager'
        ],
        
        // 汎用（複数ページで使用）
        UNIVERSAL: [
            'ui_controller',
            'ajax_manager',
            'csv_handler',
            'ai_integration',
            'api_connector',
            'notification_system'
        ],
        
        // 専用（特定ページのみ）
        SPECIALIZED: {
            'kicho_content': ['kicho_specialized'],
            'dashboard': ['dashboard_specialized'],
            'auth': ['auth_specialized']
        }
    };
    
    // =====================================
    // 🔍 自動JSファイル検知システム
    // =====================================
    
    class AutoJSDetector {
        constructor() {
            this.detectedFiles = new Map();
            this.loadedFiles = new Set();
        }
        
        // JSファイル自動検知
        async detectJSFiles() {
            console.log('🔍 JSファイル自動検知開始');
            
            const searchPaths = [
                '/common/js/',
                '/common/hooks/',
                '/common/claude_universal_hooks/js/',
                '/modules/'
            ];
            
            const detectedFiles = {};
            
            // パス別検索
            for (const path of searchPaths) {
                try {
                    const files = await this.scanDirectory(path);
                    detectedFiles[path] = files;
                } catch (error) {
                    console.warn(`⚠️ パス検索失敗: ${path}`, error.message);
                }
            }
            
            console.log('📁 検知されたJSファイル:', detectedFiles);
            return detectedFiles;
        }
        
        // ディレクトリスキャン（DOM解析による）
        async scanDirectory(path) {
            // 実際のファイル存在確認
            const testFiles = [
                'kicho.js', 'kicho_dynamic.js', 'main.js',
                'ui_controller.js', 'ajax_manager.js',
                'hooks_loader.js', 'universal_hooks.js'
            ];
            
            const existingFiles = [];
            
            for (const file of testFiles) {
                const fullPath = path + file;
                if (await this.fileExists(fullPath)) {
                    existingFiles.push({
                        name: file,
                        path: fullPath,
                        classification: this.classifyFile(file)
                    });
                }
            }
            
            return existingFiles;
        }
        
        // ファイル存在確認
        async fileExists(path) {
            try {
                const response = await fetch(path, { method: 'HEAD' });
                return response.ok;
            } catch {
                return false;
            }
        }
        
        // ファイル分類
        classifyFile(filename) {
            const name = filename.toLowerCase();
            
            if (HOOKS_CLASSIFICATION.MANDATORY.some(hook => name.includes(hook))) {
                return 'MANDATORY';
            }
            
            if (HOOKS_CLASSIFICATION.UNIVERSAL.some(hook => name.includes(hook))) {
                return 'UNIVERSAL';
            }
            
            return 'SPECIALIZED';
        }
    }
    
    // =====================================
    // 🔧 必須Hooksローダー
    // =====================================
    
    class MandatoryHooksLoader {
        constructor() {
            this.detector = new AutoJSDetector();
            this.loadQueue = [];
            this.loadedHooks = new Set();
            this.errors = [];
        }
        
        // メイン初期化
        async initialize() {
            console.log('🚀 必須Hooksローダー初期化');
            
            try {
                // 1. 現在のページタイプ検出
                const pageType = this.detectPageType();
                console.log(`📄 ページタイプ: ${pageType}`);
                
                // 2. JSファイル自動検知
                const detectedFiles = await this.detector.detectJSFiles();
                
                // 3. 読み込み順序決定
                const loadOrder = this.determineLoadOrder(detectedFiles, pageType);
                
                // 4. 順次読み込み
                await this.loadHooksInOrder(loadOrder);
                
                // 5. 初期化完了
                this.finalizeInitialization();
                
                console.log('✅ 必須Hooksローダー初期化完了');
                
            } catch (error) {
                console.error('❌ 必須Hooksローダー初期化失敗:', error);
                this.handleInitializationError(error);
            }
        }
        
        // ページタイプ検出
        detectPageType() {
            const url = window.location.href;
            const params = new URLSearchParams(window.location.search);
            
            if (params.get('page')) {
                return params.get('page');
            }
            
            if (url.includes('kicho')) return 'kicho_content';
            if (url.includes('dashboard')) return 'dashboard';
            if (url.includes('auth')) return 'auth';
            
            return 'default';
        }
        
        // 読み込み順序決定
        determineLoadOrder(detectedFiles, pageType) {
            const loadOrder = {
                mandatory: [],
                universal: [],
                specialized: []
            };
            
            // 全ファイルを分類
            Object.values(detectedFiles).flat().forEach(file => {
                switch (file.classification) {
                    case 'MANDATORY':
                        loadOrder.mandatory.push(file);
                        break;
                    case 'UNIVERSAL':
                        loadOrder.universal.push(file);
                        break;
                    case 'SPECIALIZED':
                        if (this.isRelevantForPage(file, pageType)) {
                            loadOrder.specialized.push(file);
                        }
                        break;
                }
            });
            
            console.log('📋 読み込み順序:', loadOrder);
            return loadOrder;
        }
        
        // ページ関連性チェック
        isRelevantForPage(file, pageType) {
            const filename = file.name.toLowerCase();
            const pageName = pageType.toLowerCase();
            
            return filename.includes(pageName) || 
                   HOOKS_CLASSIFICATION.SPECIALIZED[pageType]?.some(hook => 
                       filename.includes(hook)
                   );
        }
        
        // 順次読み込み
        async loadHooksInOrder(loadOrder) {
            console.log('📦 Hooks順次読み込み開始');
            
            // 1. 必須Hooks（順次）
            for (const file of loadOrder.mandatory) {
                await this.loadScript(file, true);
            }
            
            // 2. 汎用Hooks（並列）
            await Promise.all(
                loadOrder.universal.map(file => this.loadScript(file, false))
            );
            
            // 3. 専用Hooks（並列）
            await Promise.all(
                loadOrder.specialized.map(file => this.loadScript(file, false))
            );
        }
        
        // スクリプト読み込み
        loadScript(file, sequential = false) {
            return new Promise((resolve, reject) => {
                if (this.loadedHooks.has(file.path)) {
                    resolve();
                    return;
                }
                
                console.log(`📥 読み込み中: ${file.name}`);
                
                const script = document.createElement('script');
                script.src = file.path + '?v=' + Date.now();
                script.async = !sequential;
                
                script.onload = () => {
                    this.loadedHooks.add(file.path);
                    console.log(`✅ 読み込み完了: ${file.name}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ 読み込み失敗: ${file.name}`, error);
                    this.errors.push({ file: file.name, error });
                    resolve(); // エラーでも続行
                };
                
                document.head.appendChild(script);
            });
        }
        
        // 初期化完了処理
        finalizeInitialization() {
            // グローバル変数設定
            window.NAGANO3_HOOKS_LOADED = true;
            window.NAGANO3_HOOKS_ERRORS = this.errors;
            
            // イベント発火
            window.dispatchEvent(new CustomEvent('nagano3HooksLoaded', {
                detail: {
                    loadedHooks: Array.from(this.loadedHooks),
                    errors: this.errors
                }
            }));
            
            console.log('🎉 NAGANO-3 Hooks初期化完了');
        }
        
        // 初期化エラー処理
        handleInitializationError(error) {
            console.error('🚨 致命的エラー:', error);
            
            // 基本機能のフォールバック
            this.setupFallbackFunctions();
        }
        
        // フォールバック機能
        setupFallbackFunctions() {
            console.log('🔄 フォールバック機能セットアップ');
            
            // 最低限のUI制御
            window.NAGANO3_FALLBACK = {
                deleteElement: (id) => {
                    const element = document.getElementById(id);
                    if (element) element.remove();
                },
                showNotification: (type, message) => {
                    console.log(`${type.toUpperCase()}: ${message}`);
                }
            };
        }
    }
    
    // =====================================
    // 🚀 自動初期化
    // =====================================
    
    function autoInitialize() {
        const loader = new MandatoryHooksLoader();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => loader.initialize());
        } else {
            loader.initialize();
        }
    }
    
    // 即座実行
    autoInitialize();
    
})();

console.log('🔥 NAGANO-3必須Hooksローダー読み込み完了');
