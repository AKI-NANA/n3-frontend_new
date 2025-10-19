
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
 * 🔧 JavaScript自動ローダー設定ファイル (既存保護版)
 * CAIDSプロジェクト用設定
 * 
 * 【設定方針】
 * - 既存システム補完用ファイル定義
 * - 新規ページ用完全定義
 * - 安全設定優先
 * - 段階的移行対応
 */

window.JS_AUTO_CONFIG = {
    // =======================================
    // 既存システム補完用ファイル設定
    // =======================================
    supplementaryFiles: {
        // kicho_contentページ (既存: kicho.js, kicho_hooks_engine.js は既存システムが読み込み)
        'kicho_content': [
            // 追加機能のみ
            'common/js/modules/csv_advanced.js',
            'common/js/modules/data_validation.js',
            'hooks/error_handling.js',
            'hooks/performance_monitor.js'
        ],
        
        // 他の既存ページ
        'dashboard': [
            'common/js/modules/charts_extended.js',
            'common/js/modules/realtime_updates.js'
        ],
        
        'zaiko_content': [
            'common/js/modules/inventory_utils.js',
            'common/js/modules/barcode_scanner.js'
        ]
    },
    
    // =======================================
    // 新規ページ用完全定義
    // =======================================
    newPageFiles: {
        'future_page': [
            'common/js/core/config.js',
            'common/js/core/utils.js',
            'common/js/pages/future_page.js',
            'hooks/loading_manager.js',
            'hooks/error_handling.js'
        ],
        
        'test_page': [
            'common/js/core/config.js',
            'common/js/pages/test_page.js',
            'common/js/modules/test_utils.js'
        ]
    },
    
    // =======================================
    // ディレクトリ別ファイル一覧
    // =======================================
    
    // 共通ファイル一覧
    'common/js/core/': [
        'common/js/core/config.js',
        'common/js/core/utils.js',
        'common/js/core/app.js',
        'common/js/core/api_client.js',
        'common/js/core/event_manager.js'
    ],
    
    // Hooksディレクトリの.jsファイル一覧
    'hooks/': [
        'hooks/error_handling.js',
        'hooks/loading_manager.js',
        'hooks/performance_monitor.js',
        'hooks/form_validation.js',
        'hooks/ajax_integration.js',
        'hooks/file_upload.js'
        // 注意: kicho_hooks_engine.js は既存システムが読み込むため除外
    ],
    
    // モジュールファイル一覧
    'common/js/modules/': [
        'common/js/modules/csv_processor.js',
        'common/js/modules/csv_advanced.js',
        'common/js/modules/data_validation.js',
        'common/js/modules/charts.js',
        'common/js/modules/charts_extended.js',
        'common/js/modules/file_utils.js',
        'common/js/modules/ajax_helper.js',
        'common/js/modules/form_helper.js'
    ],
    
    // =======================================
    // ページ別詳細設定
    // =======================================
    pageFiles: {
        // 既存ページ (補完モード)
        'kicho_content': [
            'common/js/modules/csv_advanced.js',
            'common/js/modules/data_validation.js'
        ],
        
        'dashboard': [
            'common/js/modules/charts.js',
            'common/js/modules/realtime_updates.js'
        ],
        
        'zaiko_content': [
            'common/js/modules/inventory_utils.js'
        ],
        
        // 新規ページ (完全モード)
        'report_generator': [
            'common/js/modules/charts.js',
            'common/js/modules/pdf_generator.js',
            'common/js/modules/data_export.js'
        ],
        
        'user_management': [
            'common/js/modules/form_validation.js',
            'common/js/modules/ajax_helper.js',
            'common/js/modules/user_utils.js'
        ]
    },
    
    // =======================================
    // 依存関係設定
    // =======================================
    dependencies: {
        'common/js/modules/csv_advanced.js': [
            'common/js/core/utils.js',
            'common/js/modules/csv_processor.js'
        ],
        
        'common/js/modules/charts_extended.js': [
            'common/js/modules/charts.js'
        ],
        
        'hooks/ajax_integration.js': [
            'common/js/core/api_client.js'
        ]
    },
    
    // =======================================
    // ローダー動作設定
    // =======================================
    settings: {
        // 安全設定
        safeMode: true,                    // 既存システム保護
        respectExistingSystem: true,       // 既存システム尊重
        errorTolerant: true,              // エラー許容
        
        // 機能設定
        autoDiscovery: true,              // 自動ファイル発見
        parallelLoading: false,           // 並列読み込み (安全のため無効)
        cacheEnabled: true,               // キャッシュ有効
        
        // 開発設定
        developmentMode: true,            // 開発モード
        debugLogging: true,               // デバッグログ
        performanceMonitoring: true,      // パフォーマンス監視
        
        // タイムアウト設定
        loadTimeout: 10000,               // 読み込みタイムアウト (10秒)
        retryAttempts: 2,                 // リトライ回数
        retryDelay: 1000,                 // リトライ間隔 (1秒)
        
        // 除外設定
        excludePatterns: [
            '**/node_modules/**',
            '**/vendor/**',
            '**/*.min.js',
            '**/legacy/**'
        ]
    },
    
    // =======================================
    // 段階的有効化設定
    // =======================================
    phaseConfig: {
        // Phase 1: 無効化 (既存システムのみ)
        phase1: {
            enabled: false,
            testPages: []
        },
        
        // Phase 2: 特定ページテスト
        phase2: {
            enabled: false,
            testPages: ['test_page', 'new_feature']
        },
        
        // Phase 3: 段階拡大
        phase3: {
            enabled: false,
            testPages: ['test_page', 'dashboard', 'report_generator']
        },
        
        // Phase 4: 全面有効化
        phase4: {
            enabled: false,
            allPages: true
        },
        
        // 現在の段階
        currentPhase: 'phase1'
    },
    
    // =======================================
    // エラーハンドリング設定
    // =======================================
    errorHandling: {
        // エラー時の動作
        fallbackToExisting: true,         // 既存システムにフォールバック
        logErrors: true,                  // エラーログ記録
        notifyErrors: false,              // エラー通知 (本番では無効)
        
        // エラー種別設定
        ignorableErrors: [
            'NetworkError',
            'AbortError',
            'TimeoutError'
        ],
        
        criticalErrors: [
            'SyntaxError',
            'ReferenceError',
            'TypeError'
        ]
    },
    
    // =======================================
    // パフォーマンス設定
    // =======================================
    performance: {
        // 監視設定
        monitorLoadTime: true,            // 読み込み時間監視
        monitorMemoryUsage: false,        // メモリ使用量監視 (重いため無効)
        
        // 最適化設定
        preloadCritical: true,            // 重要ファイルの事前読み込み
        lazyLoadOptional: true,           // オプションファイルの遅延読み込み
        
        // 閾値設定
        maxLoadTime: 5000,                // 最大読み込み時間 (5秒)
        maxFileSize: 1048576,             // 最大ファイルサイズ (1MB)
        maxConcurrent: 3                  // 最大同時読み込み数
    },
    
    // =======================================
    // 開発者向け設定
    // =======================================
    developer: {
        // デバッグ設定
        verboseLogging: true,             // 詳細ログ
        showLoadOrder: true,              // 読み込み順序表示
        measurePerformance: true,         // パフォーマンス測定
        
        // テスト設定
        enableTestMode: false,            // テストモード
        mockFailures: false,              // 失敗のモック
        
        // 統計設定
        collectStats: true,               // 統計収集
        reportInterval: 30000             // レポート間隔 (30秒)
    }
};

// =======================================
// 設定検証関数
// =======================================
window.JS_AUTO_CONFIG.validate = function() {
    const config = window.JS_AUTO_CONFIG;
    const errors = [];
    
    // 必須プロパティ確認
    const required = ['supplementaryFiles', 'settings', 'pageFiles'];
    for (const prop of required) {
        if (!config[prop]) {
            errors.push(`Missing required config: ${prop}`);
        }
    }
    
    // 設定値確認
    if (config.settings.loadTimeout < 1000) {
        errors.push('loadTimeout too short (minimum: 1000ms)');
    }
    
    if (errors.length > 0) {
        console.error('❌ JS_AUTO_CONFIG validation errors:', errors);
        return false;
    }
    
    console.log('✅ JS_AUTO_CONFIG validation passed');
    return true;
};

// =======================================
// 設定ヘルパー関数
// =======================================
window.JS_AUTO_CONFIG.getPhaseConfig = function() {
    const currentPhase = this.phaseConfig.currentPhase;
    return this.phaseConfig[currentPhase];
};

window.JS_AUTO_CONFIG.isEnabled = function() {
    const phaseConfig = this.getPhaseConfig();
    return phaseConfig.enabled;
};

window.JS_AUTO_CONFIG.isPageAllowed = function(pageName) {
    const phaseConfig = this.getPhaseConfig();
    
    if (phaseConfig.allPages) {
        return true;
    }
    
    return phaseConfig.testPages.includes(pageName);
};

// 設定初期化
console.log('🔧 JS_AUTO_CONFIG loaded successfully');
console.log('📋 Current phase:', window.JS_AUTO_CONFIG.phaseConfig.currentPhase);
console.log('⚙️ Auto loader enabled:', window.JS_AUTO_CONFIG.isEnabled());

// 設定検証実行
window.JS_AUTO_CONFIG.validate();
