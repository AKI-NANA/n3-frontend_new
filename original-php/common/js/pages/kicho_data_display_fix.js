
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
 * 🔧 KICHO データ表示修正版 JavaScript
 * 
 * 【修正内容】
 * ✅ データ取得成功後の表示処理を強化
 * ✅ DOM要素の確実な更新
 * ✅ Ajax レスポンス処理の改善
 * ✅ エラーハンドリングの強化
 * ✅ デバッグ機能の追加
 * 
 * @version 8.0.0-DATA-DISPLAY-FIX
 */

// ================== メインデータ表示システム ==================

class KichoDataDisplayManager {
    constructor() {
        this.initialized = false;
        this.debug = window.NAGANO3_CONFIG?.debug || false;
        this.displayElements = new Map();
        this.dataCache = new Map();
        this.updateQueue = [];
        
        this.init();
    }
    
    init() {
        this.log('🎯 KichoDataDisplayManager 初期化開始');
        
        // DOM要素の確実な取得・保存
        this.registerDisplayElements();
        
        // イベントリスナー設定
        this.setupEventListeners();
        
        // 初期データ表示
        this.refreshAllDisplays();
        
        this.initialized = true;
        this.log('✅ KichoDataDisplayManager 初期化完了');
    }
    
    registerDisplayElements() {
        const elements = {
            // 統計表示エリア
            'stats_container': '.kicho__stats-grid, .statistics-container, #statisticsContainer',
            'total_transactions': '#totalTransactions, .total-transactions',
            'total_import_sessions': '#totalImportSessions, .total-import-sessions',
            'pending_count': '#pendingCount, .pending-count',
            'approved_count': '#approvedCount, .approved-count',
            
            // データテーブル表示エリア
            'data_table': '#dataTable, .data-table, .kicho__table',
            'data_tbody': '#dataTable tbody, .data-table tbody',
            'imported_data_list': '#importedDataList, .imported-data-list',
            
            // フィルタ・コントロール
            'filter_status': '#filterStatus, .filter-status',
            'date_filter': '#dateFilter, .date-filter',
            
            // ローディング表示
            'loading_indicator': '.loading-indicator, #loadingIndicator',
            'refresh_status': '.refresh-status, #refreshStatus'
        };
        
        Object.entries(elements).forEach(([key, selector]) => {
            const element = document.querySelector(selector);
            if (element) {
                this.displayElements.set(key, element);
                this.log(`✅ 表示要素登録: ${key} -> ${selector}`);
            } else {
                this.log(`⚠️ 表示要素未発見: ${key} -> ${selector}`);
            }
        });
    }
    
    setupEventListeners() {
        // データ更新ボタン
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="refresh-all"], .refresh-btn, #refreshAllBtn')) {
                e.preventDefault();
                this.refreshAllDisplays();
            }
            
            if (e.target.matches('[data-action="execute-mf-import"], .mf-import-btn')) {
                e.preventDefault();
                this.handleMFImport();
            }
        });
        
        // フィルタ変更
        const filterElements = ['filter_status', 'date_filter'];
        filterElements.forEach(elementKey => {
            const element = this.displayElements.get(elementKey);
            if (element) {
                element.addEventListener('change', () => {
                    this.applyFilters();
                });
            }
        });
    }
    
    // ================== データ表示メイン処理 ==================
    
    async refreshAllDisplays() {
        this.log('🔄 全データ表示更新開始');
        
        this.showLoading(true);
        
        try {
            // 統計データ取得・表示
            await this.updateStatistics();
            
            // インポートデータ取得・表示
            await this.updateImportedData();
            
            // MF履歴取得・表示
            await this.updateMFHistory();
            
            this.log('✅ 全データ表示更新完了');
            
        } catch (error) {
            this.log('❌ データ表示更新エラー:', error);
            this.showErrorMessage('データの更新に失敗しました: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    async updateStatistics() {
        try {
            this.log('📊 統計データ更新開始');
            
            const response = await this.ajaxRequest('get_statistics');
            
            if (response.success && response.data) {
                this.displayStatistics(response.data);
                this.dataCache.set('statistics', response.data);
                this.log('✅ 統計データ表示完了');
            }
            
        } catch (error) {
            this.log('❌ 統計データ更新エラー:', error);
            this.displayDefaultStatistics();
        }
    }
    
    displayStatistics(data) {
        const updates = [
            ['total_transactions', data.total_transactions || 0],
            ['total_import_sessions', data.total_import_sessions || 0],
            ['pending_count', data.pending_count || 0],
            ['approved_count', data.approved_count || 0]
        ];
        
        updates.forEach(([elementKey, value]) => {
            const element = this.displayElements.get(elementKey);
            if (element) {
                // アニメーション付きで数値更新
                this.animateNumberUpdate(element, value);
            } else {
                // フォールバック: セレクターで直接更新
                const fallbackElement = document.querySelector(`#${elementKey}, .${elementKey.replace('_', '-')}`);
                if (fallbackElement) {
                    this.animateNumberUpdate(fallbackElement, value);
                }
            }
        });
        
        // 統計コンテナ全体の表示更新
        const statsContainer = this.displayElements.get('stats_container');
        if (statsContainer) {
            statsContainer.classList.add('updated');
            setTimeout