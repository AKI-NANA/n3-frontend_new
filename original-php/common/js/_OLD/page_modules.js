
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
 * 🏗️ NAGANO-3 Page Handlers (ページ固有機能)
 * ファイル: common/js/page_handlers.js
 * 
 * ✅ ページ別機能 + 動的モジュール
 * ✅ modules/kicho, modules/juchu, dashboard統合
 * ✅ リアルタイム更新・UI interaction
 * ✅ 遅延読み込み・必要時のみ実行
 * ✅ キャッシュ効率化
 * 
 * @version 2.0.0-modular
 */

"use strict";

    console.log('🏗️ NAGANO-3 Page Handlers loading...');

// =====================================
// 🏗️ Page Modules初期化
// =====================================

if (!window.NAGANO3?.core) {
    console.log('🏗️ NAGANO-3 Page Modules loaded');
}error('❌ NAGANO3 Core System not found. Core system required.');
} else {
    
    // Page Modules名前空間
    NAGANO3.pageModules = {
        version: '2.0.0-modular',
        initialized: false,
        loadStartTime: Date.now(),
        activeModules: new Set(),
        currentPage: NAGANO3.config.current_page || 'dashboard'
    };

    // =====================================
    // 📊 Dashboard Page Module
    // =====================================

    NAGANO3.pageModules.dashboard = {
        name: 'dashboard',
        initialized: false,
        refreshInterval: null,
        
        /**
         * Dashboard初期化
         */
        init: function() {
            if (this.initialized) return;
            
            console.log('📊 Dashboard module initializing...');
            
            try {
                // 統計カード初期化
                this.initStatCards();
                
                // リアルタイム更新設定
                this.setupRealTimeUpdates();
                
                // UI イベント設定
                this.setupUIEvents();
                
                this.initialized = true;
                console.log('✅ Dashboard module initialized');
                
            } catch (error) {
                console.error('❌ Dashboard module initialization failed:', error);
            }
        },
        
        /**
         * 統計カード初期化
         */
        initStatCards: function() {
            const statCards = document.querySelectorAll('.stat-card, .dashboard-stat');
            
            statCards.forEach(card => {
                // ホバー効果
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                });
                
                card.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = '';
                });
            });
            
            console.log(`📊 ${statCards.length} stat cards initialized`);
        },
        
        /**
         * リアルタイム更新設定
         */
        setupRealTimeUpdates: function() {
            // 既存のインターバルをクリア
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
            
            // 30秒ごとに統計更新
            this.refreshInterval = setInterval(() => {
                if (document.visibilityState === 'visible') {
                    NAGANO3.dashboard.loadStats();
                }
            }, 30000);
            
            // ページ表示時に即座に更新
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    setTimeout(() => {
                        NAGANO3.dashboard.loadStats();
                    }, 500);
                }
            });
            
            console.log('⏰ Real-time updates configured (30s interval)');
        },
        
        /**
         * UI イベント設定
         */
        setupUIEvents: function() {
            // リフレッシュボタン
            const refreshBtn = NAGANO3.dom.safeGet('#refresh-stats, .refresh-button');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    refreshBtn.disabled = true;
                    refreshBtn.textContent = '更新中...';
                    
                    NAGANO3.dashboard.loadStats().finally(() => {
                        refreshBtn.disabled = false;
                        refreshBtn.textContent = '更新';
                    });
                });
            }
            
            // API Key管理ボタン
            document.addEventListener('click', (e) => {
                if (e.target.matches('.test-api-key')) {
                    const keyId = e.target.dataset.keyId;
                    if (keyId) {
                        NAGANO3.dashboard.testAPIKey(keyId);
                    }
                }
                
                if (e.target.matches('.delete-api-key')) {
                    const keyId = e.target.dataset.keyId;
                    if (keyId) {
                        NAGANO3.dashboard.deleteAPIKey(keyId);
                    }
                }
            });
        },
        
        /**
         * 終了処理
         */
        destroy: function() {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
            this.initialized = false;
            console.log('🗑️ Dashboard module destroyed');
        }
    };

    // =====================================
    // 💰 Kicho Page Module
    // =====================================

    NAGANO3.pageModules.kicho = {
        name: 'kicho',
        initialized: false,
        
        /**
         * Kicho初期化
         */
        init: function() {
            if (this.initialized) return;
            
            console.log('💰 Kicho module initializing...');
            
            try {
                // CSV処理機能
                this.initCSVProcessing();
                
                // AI機能統合
                this.initAIFeatures();
                
                // ファイルアップロード
                this.initFileUpload();
                
                // 記帳データ管理
                this.initBookkeepingData();
                
                this.initialized = true;
                console.log('✅ Kicho module initialized');
                
            } catch (error) {
                console.error('❌ Kicho module initialization failed:', error);
            }
        },
        
        /**
         * CSV処理機能初期化
         */
        initCSVProcessing: function() {
            const csvUpload = NAGANO3.dom.safeGet('#csv-upload, .csv-upload-input');
            if (csvUpload) {
                csvUpload.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        this.processCSVFile(file);
                    }
                });
            }
            
            // CSV処理ボタン
            const processBtn = NAGANO3.dom.safeGet('#process-csv-btn');
            if (processBtn) {
                processBtn.addEventListener('click', () => {
                    this.startCSVProcessing();
                });
            }
        },
        
        /**
         * CSV ファイル処理
         */
        processCSVFile: async function(file) {
            try {
                window.showNotification('CSVファイルを処理中...', 'info');
                
                const formData = new FormData();
                formData.append('csv_file', file);
                
                const response = await NAGANO3.ajax.request('process_csv', { csv_file: file });
                
                if (response.success) {
                    window.showNotification('CSVファイルの処理が完了しました', 'success');
                    this.displayCSVResults(response.data);
                } else {
                    throw new Error(response.error);
                }
                
            } catch (error) {
                console.error('CSV処理エラー:', error);
                window.showNotification('CSVファイルの処理に失敗しました: ' + error.message, 'error');
            }
        },
        
        /**
         * CSV結果表示
         */
        displayCSVResults: function(data) {
            const resultsContainer = NAGANO3.dom.safeGet('#csv-results');
            if (resultsContainer && data) {
                const html = `
                    <div class="csv-results">
                        <h3>処理結果</h3>
                        <p>処理件数: ${data.processed_count || 0}件</p>
                        <p>エラー件数: ${data.error_count || 0}件</p>
                        ${data.errors ? `<div class="errors">${data.errors.join('<br>')}</div>` : ''}
                    </div>
                `;
                resultsContainer.innerHTML = html;
            }
        },
        
        /**
         * AI機能初期化
         */
        initAIFeatures: function() {
            const aiBtn = NAGANO3.dom.safeGet('#ai-auto-categorize, .ai-button');
            if (aiBtn) {
                aiBtn.addEventListener('click', () => {
                    this.runAICategorization();
                });
            }
        },
        
        /**
         * AI自動分類実行
         */
        runAICategorization: async function() {
            try {
                window.showNotification('AI自動分類を実行中...', 'info');
                
                const response = await NAGANO3.ajax.request('ai_auto_categorize');
                
                if (response.success) {
                    window.showNotification('AI自動分類が完了しました', 'success');
                    // 結果反映
                    if (response.data) {
                        this.updateCategorizationResults(response.data);
                    }
                } else {
                    throw new Error(response.error);
                }
                
            } catch (error) {
                console.error('AI分類エラー:', error);
                window.showNotification('AI自動分類に失敗しました: ' + error.message, 'error');
            }
        },
        
        /**
         * ファイルアップロード初期化
         */
        initFileUpload: function() {
            const uploadArea = NAGANO3.dom.safeGet('.file-upload-area');
            if (uploadArea) {
                // ドラッグ&ドロップ
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('dragover');
                });
                
                uploadArea.addEventListener('dragleave', () => {
                    uploadArea.classList.remove('dragover');
                });
                
                uploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadArea.classList.remove('dragover');
                    
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        this.handleFileUpload(files[0]);
                    }
                });
            }
        },
        
        /**
         * ファイルアップロード処理
         */
        handleFileUpload: async function(file) {
            // ファイルサイズチェック
            if (file.size > 10 * 1024 * 1024) { // 10MB
                window.showNotification('ファイルサイズは10MB以下にしてください', 'error');
                return;
            }
            
            // ファイル形式チェック
            const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
            if (!allowedTypes.includes(file.type)) {
                window.showNotification('CSV または Excel ファイルのみアップロード可能です', 'error');
                return;
            }
            
            await this.processCSVFile(file);
        },
        
        /**
         * 記帳データ管理初期化
         */
        initBookkeepingData: function() {
            // データテーブル初期化
            const dataTable = NAGANO3.dom.safeGet('#bookkeeping-data-table');
            if (dataTable) {
                this.initDataTable(dataTable);
            }
            
            // 検索機能
            const searchInput = NAGANO3.dom.safeGet('#data-search');
            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.filterData(e.target.value);
                    }, 300);
                });
            }
        },
        
        /**
         * データテーブル初期化
         */
        initDataTable: function(table) {
            // ソート機能
            const headers = table.querySelectorAll('th[data-sort]');
            headers.forEach(header => {
                header.style.cursor = 'pointer';
                header.addEventListener('click', () => {
                    const sortKey = header.dataset.sort;
                    this.sortTable(table, sortKey);
                });
            });
        },
        
        /**
         * データフィルタリング
         */
        filterData: function(searchTerm) {
            const table = NAGANO3.dom.safeGet('#bookkeeping-data-table');
            if (!table) return;
            
            const rows = table.querySelectorAll('tbody tr');
            let visibleCount = 0;
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                const matches = text.includes(searchTerm.toLowerCase());
                
                row.style.display = matches ? '' : 'none';
                if (matches) visibleCount++;
            });
            
            // 結果表示
            const resultInfo = NAGANO3.dom.safeGet('#search-results-info');
            if (resultInfo) {
                resultInfo.textContent = `${visibleCount}件の結果`;
            }
        }
    };

    // =====================================
    // 📦 Juchu Page Module
    // =====================================

    NAGANO3.pageModules.juchu = {
        name: 'juchu',
        initialized: false,
        
        /**
         * Juchu初期化
         */
        init: function() {
            if (this.initialized) return;
            
            console.log('📦 Juchu module initializing...');
            
            try {
                // 受注管理機能
                this.initOrderManagement();
                
                // リアルタイム通知（既存Juchu互換）
                this.initRealTimeNotifications();
                
                // 在庫連携
                this.initInventorySync();
                
                this.initialized = true;
                console.log('✅ Juchu module initialized');
                
            } catch (error) {
                console.error('❌ Juchu module initialization failed:', error);
            }
        },
        
        /**
         * 受注管理初期化
         */
        initOrderManagement: function() {
            // 受注一覧更新
            const refreshOrders = NAGANO3.dom.safeGet('#refresh-orders');
            if (refreshOrders) {
                refreshOrders.addEventListener('click', () => {
                    this.loadOrders();
                });
            }
            
            // 受注ステータス更新
            document.addEventListener('change', (e) => {
                if (e.target.matches('.order-status-select')) {
                    const orderId = e.target.dataset.orderId;
                    const newStatus = e.target.value;
                    this.updateOrderStatus(orderId, newStatus);
                }
            });
        },
        
        /**
         * リアルタイム通知初期化（Juchu形式対応）
         */
        initRealTimeNotifications: function() {
            // Juchu専用showNotification（既存互換性）
            if (!window.JuchuCompat) {
                window.JuchuCompat = {
                    showNotification: function(type, title, message, duration) {
                        return window.showNotification(message || title, type, duration);
                    }
                };
            }
            
            // 新規受注通知チェック
            this.checkNewOrders();
            setInterval(() => {
                this.checkNewOrders();
            }, 60000); // 1分ごと
        },
        
        /**
         * 新規受注チェック
         */
        checkNewOrders: async function() {
            try {
                const response = await NAGANO3.ajax.request('check_new_orders');
                
                if (response.success && response.data?.new_orders > 0) {
                    // Juchu形式通知
                    window.JuchuCompat.showNotification(
                        'info',
                        '新規受注',
                        `${response.data.new_orders}件の新しい受注があります`,
                        10000
                    );
                }
                
            } catch (error) {
                console.error('新規受注チェックエラー:', error);
            }
        },
        
        /**
         * 在庫連携初期化
         */
        initInventorySync: function() {
            const syncBtn = NAGANO3.dom.safeGet('#sync-inventory');
            if (syncBtn) {
                syncBtn.addEventListener('click', () => {
                    this.syncInventory();
                });
            }
        },
        
        /**
         * 在庫同期実行
         */
        syncInventory: async function() {
            try {
                window.showNotification('在庫情報を同期中...', 'info');
                
                const response = await NAGANO3.ajax.request('sync_inventory');
                
                if (response.success) {
                    window.showNotification('在庫同期が完了しました', 'success');
                } else {
                    throw new Error(response.error);
                }
                
            } catch (error) {
                console.error('在庫同期エラー:', error);
                window.showNotification('在庫同期に失敗しました: ' + error.message, 'error');
            }
        }
    };

    // =====================================
    // 🎯 Page Module Manager
    // =====================================

    NAGANO3.pageModules.manager = {
        /**
         * 現在ページに応じたモジュール初期化
         */
        initCurrentPage: function() {
            const currentPage = NAGANO3.pageModules.currentPage;
            
            console.log(`🎯 Initializing modules for page: ${currentPage}`);
            
            // 共通モジュール（全ページ）
            // なし（Coreで処理済み）
            
            // ページ固有モジュール
            switch (currentPage) {
                case 'dashboard':
                    NAGANO3.pageModules.dashboard.init();
                    NAGANO3.pageModules.activeModules.add('dashboard');
                    break;
                    
                case 'kicho':
                case 'kicho_content':
                    NAGANO3.pageModules.kicho.init();
                    NAGANO3.pageModules.activeModules.add('kicho');
                    break;
                    
                case 'juchu':
                case 'juchu_content':
                    NAGANO3.pageModules.juchu.init();
                    NAGANO3.pageModules.activeModules.add('juchu');
                    break;
                    
                default:
                    console.log(`ℹ️ No specific module for page: ${currentPage}`);
            }
            
            console.log(`✅ Active modules: ${Array.from(NAGANO3.pageModules.activeModules).join(', ')}`);
        },
        
        /**
         * 未使用モジュールのクリーンアップ
         */
        cleanup: function() {
            // Dashboard以外のページではDashboardモジュールを停止
            if (NAGANO3.pageModules.currentPage !== 'dashboard' && 
                NAGANO3.pageModules.dashboard.initialized) {
                NAGANO3.pageModules.dashboard.destroy();
                NAGANO3.pageModules.activeModules.delete('dashboard');
            }
        }
    };

    // =====================================
    // 🚀 Page Modules初期化
    // =====================================

    NAGANO3.pageModules.initialize = function() {
        try {
            console.log('🏗️ NAGANO-3 Page Handlers initialization starting...');
            
            // 1. 現在ページのモジュール初期化
            this.manager.initCurrentPage();
            
            // 2. クリーンアップ
            this.manager.cleanup();
            
            // 3. 初期化完了
            this.initialized = true;
            this.initializationTime = Date.now() - this.loadStartTime;
            
            console.log(`✅ NAGANO-3 Page Handlers initialized (${this.initializationTime}ms)`);
            
            // Ready イベント発火
            window.dispatchEvent(new CustomEvent('nagano3:pageModules:ready', {
                detail: {
                    currentPage: this.currentPage,
                    activeModules: Array.from(this.activeModules),
                    initTime: this.initializationTime
                }
            }));
            
        } catch (error) {
            console.error('💥 NAGANO-3 Page Handlers initialization failed:', error);
            NAGANO3.errorBoundary?.handleError(error, 'pageModules-initialization');
        }
    };

    // =====================================
    // 🎯 自動初期化（Core準備完了後）
    // =====================================

    if (NAGANO3.core?.initialized) {
        // Core既に初期化済み
        NAGANO3.pageModules.initialize();
    } else {
        // Core初期化待ち
        window.addEventListener('nagano3:core:ready', function() {
            NAGANO3.pageModules.initialize();
        });
    }

    // デバッグ用
    window.nagano3PageModulesStatus = function() {
        return {
            initialized: NAGANO3.pageModules.initialized,
            currentPage: NAGANO3.pageModules.currentPage,
            activeModules: Array.from(NAGANO3.pageModules.activeModules),
            initTime: NAGANO3.pageModules.initializationTime
        };
    };

    console.