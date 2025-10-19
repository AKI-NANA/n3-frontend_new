
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
 * 🔧 KICHO データ表示修正 - 既存機能保護版
 * 
 * 【修正内容】
 * ✅ 既存のボタン削除機能保護
 * ✅ MFクラウドデータ取得・表示強化
 * ✅ 日付範囲でのデータ表示
 * ✅ 実際のデータ取得状況分析
 * ✅ エラーハンドリング強化
 * 
 * @version 8.1.0-SAFE-DATA-FIX
 */

// ================== 既存システム保護 ==================

// 既存のNAGANO3_KICHOシステムが存在する場合は保護
if (window.NAGANO3_KICHO && window.NAGANO3_KICHO.initialized) {
    console.log('✅ 既存のKICHOシステムが検出されました - 拡張モードで動作');
    
    // 既存システムを拡張
    enhanceExistingKichoSystem();
} else {
    // 新規初期化
    console.log('🔄 新規KICHOシステム初期化');
    initializeNewKichoSystem();
}

// ================== 既存システム拡張 ==================

function enhanceExistingKichoSystem() {
    // 既存のajaxManagerがある場合は拡張
    if (window.NAGANO3_KICHO.ajaxManager) {
        // データ表示機能を追加
        window.NAGANO3_KICHO.ajaxManager.displayMFData = displayMFTransactionData;
        window.NAGANO3_KICHO.ajaxManager.refreshDataDisplay = refreshDataDisplay;
        
        console.log('✅ 既存ajaxManagerを拡張しました');
    }
    
    // データ表示システムを追加
    if (!window.NAGANO3_KICHO.dataDisplayManager) {
        window.NAGANO3_KICHO.dataDisplayManager = new SafeDataDisplayManager();
        console.log('✅ データ表示マネージャーを追加しました');
    }
    
    // MFクラウド機能強化
    setupMFCloudEnhancements();
}

// ================== 新規システム初期化 ==================

function initializeNewKichoSystem() {
    window.NAGANO3_KICHO = window.NAGANO3_KICHO || {};
    
    // 基本データ表示システム
    window.NAGANO3_KICHO.dataDisplayManager = new SafeDataDisplayManager();
    
    // 基本Ajax機能
    window.NAGANO3_KICHO.ajax = {
        request: async function(action, data = {}) {
            return await safeFetch(action, data);
        }
    };
    
    // MFクラウド機能
    setupMFCloudEnhancements();
    
    window.NAGANO3_KICHO.initialized = true;
    console.log('✅ 新規KICHOシステム初期化完了');
}

// ================== 安全なデータ表示マネージャー ==================

class SafeDataDisplayManager {
    constructor() {
        this.debug = true;
        this.dataCache = {
            transactions: [],
            imported_data: [],
            mf_data: [],
            statistics: {},
            lastUpdate: null
        };
        
        this.displayElements = new Map();
        this.init();
    }
    
    init() {
        this.log('🎯 SafeDataDisplayManager 初期化開始');
        
        // DOM要素の安全な取得
        this.registerDisplayElements();
        
        // イベントリスナー設定（既存を保護）
        this.setupSafeEventListeners();
        
        // 初期データ取得
        this.loadInitialData();
        
        this.log('✅ SafeDataDisplayManager 初期化完了');
    }
    
    registerDisplayElements() {
        // 複数のセレクタで安全に要素を取得
        const elementMappings = {
            // 統計表示
            'total_transactions': [
                '[data-stat="total_transactions"]',
                '#totalTransactions',
                '.total-transactions'
            ],
            'pending_count': [
                '[data-stat="pending_count"]', 
                '#pendingCount',
                '.pending-count'
            ],
            'approved_count': [
                '[data-stat="approved_count"]',
                '#approvedCount', 
                '.approved-count'
            ],
            
            // データ表示エリア
            'mf_data_container': [
                '#mf-data-container',
                '.mf-data-container',
                '[data-mf-container]',
                '#imported-data-list',
                '.kicho__imported-data__list'
            ],
            'transactions_container': [
                '#transactions-container',
                '.transactions-container', 
                '[data-transactions-container]',
                '#transactions-list',
                '.kicho__transactions__list'
            ],
            
            // 日付フィルタ
            'date_start': [
                '#date-start',
                '[data-date-start]',
                '#startDate'
            ],
            'date_end': [
                '#date-end',
                '[data-date-end]',
                '#endDate'
            ]
        };
        
        Object.entries(elementMappings).forEach(([key, selectors]) => {
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    this.displayElements.set(key, element);
                    this.log(`✅ 表示要素登録: ${key} -> ${selector}`);
                    break;
                }
            }
            
            if (!this.displayElements.has(key)) {
                this.log(`⚠️ 表示要素未発見: ${key}`);
            }
        });
    }
    
    setupSafeEventListeners() {
        // 既存のイベントリスナーと競合しないように設定
        document.addEventListener('click', (e) => {
            // MFデータ更新ボタン
            if (e.target.matches('[data-action="execute-mf-import"]:not(.handled)')) {
                e.target.classList.add('handled');
                this.handleMFImport();
            }
            
            // データ更新ボタン
            if (e.target.matches('[data-action="refresh-mf-data"]:not(.handled)')) {
                e.target.classList.add('handled');
                this.refreshDataDisplay();
            }
        });
        
        // 日付フィルタの変更
        ['date_start', 'date_end'].forEach(elementKey => {
            const element = this.displayElements.get(elementKey);
            if (element) {
                element.addEventListener('change', () => {
                    this.applyDateFilter();
                });
            }
        });
    }
    
    // ================== データ取得・表示メイン処理 ==================
    
    async loadInitialData() {
        this.log('🔄 初期データ読み込み開始');
        
        try {
            // 現在の統計データ取得
            const statsResponse = await this.safeFetch('get_statistics');
            if (statsResponse.success) {
                this.displayStatistics(statsResponse.data);
            }
            
            // MFデータ取得
            await this.loadMFData();
            
            // インポートデータ取得
            await this.loadImportedData();
            
            this.log('✅ 初期データ読み込み完了');
            
        } catch (error) {
            this.log('❌ 初期データ読み込みエラー:', error);
            this.displayFallbackData();
        }
    }
    
    async loadMFData() {
        this.log('💳 MFデータ読み込み開始');
        
        try {
            // 日付範囲を設定
            const dateStart = this.getDateValue('date_start') || this.getDefaultStartDate();
            const dateEnd = this.getDateValue('date_end') || this.getDefaultEndDate();
            
            const response = await this.safeFetch('execute-mf-import', {
                start_date: dateStart,
                end_date: dateEnd,
                purpose: 'display'
            });
            
            if (response.success && response.data) {
                this.log('✅ MFデータ取得成功:', response.data);
                
                // MFデータをキャッシュに保存
                this.dataCache.mf_data = response.data.mf_result?.transactions || [];
                this.dataCache.lastUpdate = new Date().toISOString();
                
                // データ表示
                this.displayMFData(this.dataCache.mf_data);
                
                // 統計更新
                if (response.data.stats) {
                    this.displayStatistics(response.data.stats);
                }
                
                this.log(`✅ MFデータ表示完了: ${this.dataCache.mf_data.length}件`);
                
            } else {
                throw new Error(response.message || 'MFデータ取得失敗');
            }
            
        } catch (error) {
            this.log('❌ MFデータ読み込みエラー:', error);
            this.displayMFDataError(error.message);
        }
    }
    
    async loadImportedData() {
        this.log('📋 インポートデータ読み込み開始');
        
        try {
            const response = await this.safeFetch('get_initial_data');
            
            if (response.success && response.data) {
                this.dataCache.imported_data = response.data.imported_data || [];
                this.dataCache.transactions = response.data.transactions || [];
                
                this.log(`✅ インポートデータ読み込み完了: ${this.dataCache.imported_data.length}件`);
            }
            
        } catch (error) {
            this.log('❌ インポートデータ読み込みエラー:', error);
        }
    }
    
    // ================== データ表示処理 ==================
    
    displayMFData(data) {
        this.log('💳 MFデータ表示開始:', data);
        
        const container = this.displayElements.get('mf_data_container');
        if (!container) {
            this.log('⚠️ MFデータコンテナが見つかりません');
            return;
        }
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="mf-data-empty">
                    <div class="empty-state">
                        <h4>💳 MFクラウドデータなし</h4>
                        <p>指定された期間にMFクラウドデータがありません</p>
                        <button class="btn btn-primary" data-action="execute-mf-import">
                            データを取得
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        // データをグループ化（日付別）
        const groupedData = this.groupDataByDate(data);
        
        let html = '<div class="mf-data-list">';
        
        Object.entries(groupedData).forEach(([date, transactions]) => {
            const dayTotal = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
            
            html += `
                <div class="mf-data-day" data-date="${date}">
                    <div class="day-header">
                        <h4>${this.formatDate(date)}</h4>
                        <span class="day-total">${this.formatAmount(dayTotal)}</span>
                        <span class="transaction-count">${transactions.length}件</span>
                    </div>
                    <div class="day-transactions">
            `;
            
            transactions.forEach(transaction => {
                html += `
                    <div class="mf-transaction-item" data-transaction-id="${transaction.id || ''}">
                        <div class="transaction-main">
                            <div class="transaction-description">${this.escapeHtml(transaction.description || '-')}</div>
                            <div class="transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}">
                                ${this.formatAmount(transaction.amount || 0)}
                            </div>
                        </div>
                        <div class="transaction-details">
                            <span class="account">${this.escapeHtml(transaction.debit_account || '未分類')}</span>
                            <span class="reference">${this.escapeHtml(transaction.reference || '')}</span>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        // アニメーション付きで表示
        container.style.opacity = '0.5';
        container.innerHTML = html;
        
        requestAnimationFrame(() => {
            container.style.transition = 'opacity 0.3s ease';
            container.style.opacity = '1';
        });
        
        this.log(`✅ MFデータ表示完了: ${data.length}件`);
    }
    
    displayMFDataError(errorMessage) {
        const container = this.displayElements.get('mf_data_container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="mf-data-error">
                <div class="error-state">
                    <h4>❌ MFデータ取得エラー</h4>
                    <p>${this.escapeHtml(errorMessage)}</p>
                    <button class="btn btn-primary" data-action="execute-mf-import">
                        再試行
                    </button>
                </div>
            </div>
        `;
    }
    
    displayStatistics(stats) {
        this.log('📊 統計データ表示:', stats);
        
        const updates = [
            ['total_transactions', stats.total_transactions || 0],
            ['pending_count', stats.pending_count || 0], 
            ['approved_count', stats.approved_count || 0]
        ];
        
        updates.forEach(([elementKey, value]) => {
            const element = this.displayElements.get(elementKey);
            if (element) {
                this.animateNumberUpdate(element, value);
            }
        });
    }
    
    displayFallbackData() {
        this.log('🔄 フォールバックデータ表示');
        
        // 基本的な表示
        const container = this.displayElements.get('mf_data_container');
        if (container) {
            container.innerHTML = `
                <div class="fallback-data">
                    <h4>📊 システム起動中...</h4>
                    <p>データを読み込んでいます</p>
                    <div class="loading-spinner"></div>
                </div>
            `;
        }
        
        // 統計にデフォルト値を設定
        this.displayStatistics({
            total_transactions: 0,
            pending_count: 0,
            approved_count: 0
        });
    }
    
    // ================== MFクラウド処理 ==================
    
    async handleMFImport() {
        this.log('🔄 MFインポート処理開始');
        
        this.showLoading('MFクラウドからデータを取得中...');
        
        try {
            await this.loadMFData();
            this.showNotification('MFデータを取得しました', 'success');
            
        } catch (error) {
            this.log('❌ MFインポートエラー:', error);
            this.showNotification('MFデータ取得エラー: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async refreshDataDisplay() {
        this.log('🔄 データ表示更新');
        
        try {
            await this.loadInitialData();
            this.showNotification('データを更新しました', 'success');
            
        } catch (error) {
            this.log('❌ データ更新エラー:', error);
            this.showNotification('データ更新エラー: ' + error.message, 'error');
        }
    }
    
    applyDateFilter() {
        this.log('🔍 日付フィルタ適用');
        
        // 日付が変更されたらMFデータを再取得
        setTimeout(() => {
            this.loadMFData();
        }, 500);
    }
    
    // ================== ユーティリティ関数 ==================
    
    async safeFetch(action, data = {}) {
        const formData = new FormData();
        formData.append('action', action);
        
        Object.entries(data).forEach(([key, value]) => {
            formData.append(key, value);
        });
        
        this.log(`🌐 Ajax要求: ${action}`, data);
        
        const response = await fetch('/kicho_ajax_handler_ultimate.php', {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        this.log(`✅ Ajax応答: ${action}`, result);
        
        return result;
    }
    
    groupDataByDate(data) {
        const grouped = {};
        
        data.forEach(item => {
            const date = item.transaction_date || new Date().toISOString().split('T')[0];
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(item);
        });
        
        // 日付順でソート
        const sortedEntries = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
        return Object.fromEntries(sortedEntries);
    }
    
    getDateValue(elementKey) {
        const element = this.displayElements.get(elementKey);
        return element ? element.value : null;
    }
    
    getDefaultStartDate() {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    }
    
    getDefaultEndDate() {
        return new Date().toISOString().split('T')[0];
    }
    
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
            });
        } catch {
            return dateString;
        }
    }
    
    formatAmount(amount) {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY'
        }).format(amount);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    animateNumberUpdate(element, newValue) {
        const currentValue = parseInt(element.textContent) || 0;
        
        if (currentValue !== newValue) {
            element.style.transform = 'scale(1.1)';
            element.style.color = '#4caf50';
            
            setTimeout(() => {
                element.textContent = newValue.toLocaleString();
                element.style.transform = 'scale(1)';
                element.style.color = '';
            }, 150);
        }
    }
    
    showLoading(message = 'データを読み込み中...') {
        // シンプルなローディング表示
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'safe-loading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2196f3;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        loadingDiv.textContent = message;
        
        document.body.appendChild(loadingDiv);
    }
    
    hideLoading() {
        const loading = document.getElementById('safe-loading');
        if (loading) {
            loading.remove();
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            z-index: 10001;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            max-width: 300px;
            cursor: pointer;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        notification.addEventListener('click', () => notification.remove());
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    log(...args) {
        if (this.debug) {
            console.log('[SafeDataDisplay]', ...args);
        }
    }
}

// ================== MFクラウド機能強化 ==================

function setupMFCloudEnhancements() {
    // MFデータ自動更新機能
    setInterval(() => {
        if (document.hidden) return;
        
        if (window.NAGANO3_KICHO?.dataDisplayManager) {
            window.NAGANO3_KICHO.dataDisplayManager.loadMFData();
        }
    }, 300000); // 5分間隔
    
    // グローバル関数として公開
    window.refreshMFData = function() {
        if (window.NAGANO3_KICHO?.dataDisplayManager) {
            return window.NAGANO3_KICHO.dataDisplayManager.handleMFImport();
        }
    };
    
    window.analyzeMFDataStatus = function() {
        const manager = window.NAGANO3_KICHO?.dataDisplayManager;
        if (!manager) {
            console.log('❌ データ表示マネージャーが見つかりません');
            return;
        }
        
        console.log('📊 MFデータ分析結果:');
        console.log('キャッシュデータ:', manager.dataCache);
        console.log('表示要素:', Array.from(manager.displayElements.keys()));
        console.log('最終更新:', manager.dataCache.lastUpdate);
        
        return manager.dataCache;
    };
    
    console.log('✅ MFクラウド機能強化完了');
}

// ================== 互換性関数 ==================

// 既存のグローバル関数との互換性を保持
window.displayMFTransactionData = function(data) {
    if (window.NAGANO3_KICHO?.dataDisplayManager) {
        window.NAGANO3_KICHO.dataDisplayManager.displayMFData(data);
    }
};

window.refreshDataDisplay = function() {
    if (window.NAGANO3_KICHO?.dataDisplayManager) {
        return window.NAGANO3_KICHO.dataDisplayManager.refreshDataDisplay();
    }
};

// ================== CSS追加 ==================

const enhancedStyles = `
<style>
.mf-data-list {
    space-y: 16px;
}

.mf-data-day {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 16px;
}

.day-header {
    background: #f5f5f5;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e0e0e0;
}

.day-header h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
}

.day-total {
    font-size: 18px;
    font-weight: bold;
    color: #2196f3;
}

.transaction-count {
    font-size: 12px;
    color: #666;
    background: #fff;
    padding: 2px 8px;
    border-radius: 12px;
}

.day-transactions {
    background: #fff;
}

.mf-transaction-item {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    transition: background-color 0.2s ease;
}

.mf-transaction-item:hover {
    background-color: #f9f9f9;
}

.mf-transaction-item:last-child {
    border-bottom: none;
}

.transaction-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}

.transaction-description {
    font-weight: 500;
    color: #333;
    flex: 1;
}

.transaction-amount {
    font-weight: bold;
    font-size: 16px;
}

.transaction-amount.positive {
    color: #4caf50;
}

.transaction-amount.negative {
    color: #f44336;
}

.transaction-details {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: #666;
}

.account {
    background: #e3f2fd;
    color: #1976d2;
    padding: 2px 6px;
    border-radius: 4px;
}

.reference {
    font-family: monospace;
}

.empty-state, .error-state {
    text-align: center;
    padding: 40px 20px;
    color: #666;
}

.empty-state h4, .error-state h4 {
    margin-bottom: 8px;
}

.loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #2196f3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 10px auto;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', enhancedStyles);

console.log('✅ KICHO データ表示修正 - 既存保護版 読み込み完了');
