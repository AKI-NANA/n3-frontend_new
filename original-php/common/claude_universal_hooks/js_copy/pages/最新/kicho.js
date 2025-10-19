
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
 * KICHO記帳ツール JavaScript【CSRF対応完全修正版】
 * 
 * 🔧 修正内容:
 * ✅ CSRF取得方法の多重化
 * ✅ 初期化タイミングの最適化
 * ✅ エラー処理強化
 * ✅ デバッグ機能追加
 * ✅ フォールバック機能実装
 */

"use strict";

// =====================================
// 🛡️ NAGANO3モジュール専用名前空間（完全分離）
// =====================================

window.NAGANO3_KICHO = window.NAGANO3_KICHO || {
    version: '3.0.0-csrf-fix',
    initialized: false,
    functions: {},
    state: {
        autoRefreshEnabled: false,
        autoRefreshInterval: null,
        selectedDataCount: 0,
        lastUpdateTime: null,
        ajaxManager: null,
        isProcessing: false
    },
    config: {
        autoRefreshInterval: 30000,
        maxRetries: 3,
        requestTimeout: 30000
    }
};

// =====================================
// 🔧 CSRF取得強化システム
// =====================================

/**
 * CSRF トークン取得（多重フォールバック）
 */
function getCSRFToken() {
    // 方法1: meta タグから取得
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (metaToken && metaToken.length > 10) {
        console.log('✅ CSRF取得: meta タグから');
        return metaToken;
    }
    
    // 方法2: NAGANO3_CONFIG から取得
    const configToken = window.NAGANO3_CONFIG?.csrfToken;
    if (configToken && configToken.length > 10) {
        console.log('✅ CSRF取得: NAGANO3_CONFIG から');
        return configToken;
    }
    
    // 方法3: グローバル変数から取得
    const globalToken = window.CSRF_TOKEN;
    if (globalToken && globalToken.length > 10) {
        console.log('✅ CSRF取得: グローバル変数から');
        return globalToken;
    }
    
    // 方法4: セッション用Ajax取得
    console.warn('⚠️ CSRF取得失敗 - Ajax で取得試行');
    return null;
}

/**
 * Ajax経由CSRF取得
 */
async function fetchCSRFToken() {
    try {
        const response = await fetch('/?page=kicho_content', {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'action=health_check'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success && result.csrf_token && result.csrf_token !== 'not_set') {
            console.log('✅ CSRF取得: Ajax経由で成功');
            return result.csrf_token;
        }
        
        throw new Error('CSRFトークンが返されませんでした');
        
    } catch (error) {
        console.error('❌ Ajax CSRF取得失敗:', error);
        return null;
    }
}

// =====================================
// 🎯 Ajax管理クラス（CSRF対応強化版）
// =====================================

class KichoAjaxManager {
    constructor() {
        this.csrfToken = null;
        this.baseUrl = window.location.pathname;
        this.requestQueue = [];
        this.isInitialized = false;
        
        // 初期化
        this.initialize();
    }
    
    /**
     * 初期化処理
     */
    async initialize() {
        console.log('🔧 KichoAjaxManager 初期化開始...');
        
        // CSRF取得試行
        this.csrfToken = getCSRFToken();
        
        // 取得失敗時はAjax経由で取得
        if (!this.csrfToken) {
            this.csrfToken = await fetchCSRFToken();
        }
        
        if (this.csrfToken) {
            console.log('✅ CSRF初期化成功:', this.csrfToken.substring(0, 8) + '...');
            this.isInitialized = true;
        } else {
            console.error('❌ CSRF初期化失敗 - 開発モードで継続');
            this.csrfToken = 'development_mode';
            this.isInitialized = true;
        }
        
        // 待機中のリクエストを実行
        this.processQueuedRequests();
    }
    
    /**
     * 待機リクエスト処理
     */
    processQueuedRequests() {
        console.log(`🔄 待機リクエスト処理: ${this.requestQueue.length}件`);
        
        while (this.requestQueue.length > 0) {
            const { action, data, resolve, reject } = this.requestQueue.shift();
            this.request(action, data).then(resolve).catch(reject);
        }
    }
    
    /**
     * Ajax リクエスト実行
     */
    async request(action, data = {}) {
        // 初期化待ち
        if (!this.isInitialized) {
            console.log('⏳ 初期化待ち - リクエストをキューに追加');
            return new Promise((resolve, reject) => {
                this.requestQueue.push({ action, data, resolve, reject });
            });
        }
        
        try {
            this.showLoading(true);
            
            const formData = new FormData();
            formData.append('action', action);
            formData.append('csrf_token', this.csrfToken);
            
            // データ追加処理
            Object.entries(data).forEach(([key, value]) => {
                if (value instanceof File) {
                    formData.append(key, value);
                } else if (typeof value === 'object') {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, String(value));
                }
            });
            
            // デバッグ情報
            console.log(`🚀 Ajax実行: ${action}`, {
                csrf: this.csrfToken ? this.csrfToken.substring(0, 8) + '...' : 'なし',
                url: this.baseUrl,
                data: Object.fromEntries(formData.entries())
            });
            
            const response = await fetch(this.baseUrl + '?page=kicho_content', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });
            
            // レスポンス確認
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ 非JSON レスポンス:', text.substring(0, 200));
                throw new Error('サーバーから無効なレスポンスが返されました');
            }
            
            const result = await response.json();
            
            // レスポンス処理
            if (result.success || result.status === 'success') {
                console.log(`✅ Ajax成功: ${action}`, result);
                
                // 成功通知
                if (result.message) {
                    this.showNotification(result.message, 'success');
                }
                
                // UI更新処理
                if (result.data?.ui_update) {
                    this.handleUIUpdate(result.data.ui_update);
                }
                
                return result;
            } else {
                const errorMsg = result.error || result.message || 'Ajax処理でエラーが発生しました';
                throw new Error(errorMsg);
            }
            
        } catch (error) {
            console.error(`❌ Ajax Error [${action}]:`, error);
            
            // エラー通知
            const errorMessage = error.message || 'システムエラーが発生しました';
            this.showNotification(`エラー: ${errorMessage}`, 'error');
            
            // CSRF エラーの場合は再取得試行
            if (error.message.includes('CSRF') || error.message.includes('token')) {
                console.log('🔄 CSRF エラー検出 - トークン再取得試行');
                this.csrfToken = await fetchCSRFToken();
            }
            
            throw error;
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * UI更新処理
     */
    handleUIUpdate(updateData) {
        console.log('🔄 UI更新処理:', updateData);
        
        if (updateData.counters) {
            Object.entries(updateData.counters).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });
        }
        
        if (updateData.remove_elements) {
            updateData.remove_elements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.remove();
                }
            });
        }
        
        if (updateData.refresh_sections) {
            updateData.refresh_sections.forEach(section => {
                this.refreshSection(section);
            });
        }
    }
    
    /**
     * セクション更新
     */
    async refreshSection(sectionId) {
        try {
            const result = await this.request(`refresh_${sectionId}`);
            if (result.data?.html) {
                const element = document.getElementById(sectionId);
                if (element) {
                    element.innerHTML = result.data.html;
                }
            }
        } catch (error) {
            console.error(`セクション更新エラー [${sectionId}]:`, error);
        }
    }
    
    /**
     * ローディング表示制御
     */
    showLoading(show) {
        const loadingElement = document.getElementById('loadingIndicator') || 
                             document.querySelector('.loading-spinner') ||
                             document.getElementById('loadingScreen');
        
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
        
        // ボタン無効化
        document.querySelectorAll('[data-action]').forEach(button => {
            button.disabled = show;
            if (show) {
                button.classList.add('loading');
            } else {
                button.classList.remove('loading');
            }
        });
    }
    
    /**
     * 通知表示
     */
    showNotification(message, type = 'info') {
        console.log(`📢 通知 [${type}]:`, message);
        
        // NAGANO3統一通知システム連携
        if (window.NAGANO3?.notifications) {
            window.NAGANO3.notifications.show(message, type);
            return;
        }
        
        // フォールバック通知システム
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            z-index: 10000;
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // 自動削除
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// =====================================
// 🎯 KICHO機能実装（競合回避版）
// =====================================

const KICHO_ACTIONS = [
    "refresh-all",
    "toggle-auto-refresh", 
    "show-import-history",
    "execute-mf-import",
    "show-mf-history",
    "execute-mf-recovery",
    "csv-upload",
    "process-csv-upload",
    "show-duplicate-history",
    "add-text-to-learning",
    "show-ai-learning-history",
    "show-optimization-suggestions",
    "select-all-imported-data",
    "select-by-date-range",
    "select-by-source",
    "delete-selected-data",
    "delete-data-item",
    "execute-integrated-ai-learning",
    "download-rules-csv",
    "create-new-rule",
    "download-all-rules-csv",
    "rules-csv-upload",
    "save-uploaded-rules-as-database",
    "edit-saved-rule",
    "delete-saved-rule",
    "download-pending-csv",
    "download-pending-transactions-csv",
    "approval-csv-upload",
    "bulk-approve-transactions",
    "view-transaction-details",
    "delete-approved-transaction",
    "refresh-ai-history",
    "load-more-sessions",
    "execute-full-backup",
    "export-to-mf",
    "create-manual-backup",
    "generate-advanced-report",
    "health_check",
    "get_statistics",
    "refresh_all_data"
];

// ページ判定
const IS_KICHO_PAGE = document.body.getAttribute('data-page') === 'kicho_content';

// =====================================
// 🎯 メイン処理実行
// =====================================

/**
 * KICHOアクション実行
 */
function executeKichoAction(action, target) {
    console.log(`🎯 KICHOアクション実行: ${action}`);
    
    const ajaxManager = window.NAGANO3_KICHO.state.ajaxManager;
    
    if (!ajaxManager) {
        console.error('❌ AjaxManagerが初期化されていません');
        return;
    }
    
    // アクション別処理
    switch (action) {
        case 'refresh-all':
            handleRefreshAll(ajaxManager);
            break;
        case 'toggle-auto-refresh':
            handleToggleAutoRefresh(ajaxManager);
            break;
        case 'execute-full-backup':
            handleFullBackup(ajaxManager);
            break;
        case 'get_statistics':
            handleGetStatistics(ajaxManager);
            break;
        case 'health_check':
            handleHealthCheck(ajaxManager);
            break;
        default:
            // 汎用処理
            handleGenericAction(action, ajaxManager, target);
    }
}

/**
 * 汎用アクション処理
 */
async function handleGenericAction(action, ajaxManager, target) {
    try {
        const data = extractDataFromTarget(target);
        const result = await ajaxManager.request(action, data);
        
        console.log(`✅ ${action} 完了:`, result);
        
    } catch (error) {
        console.error(`❌ ${action} エラー:`, error);
    }
}

/**
 * 全データ更新
 */
async function handleRefreshAll(ajaxManager) {
    try {
        const result = await ajaxManager.request('refresh-all');
        
        // カウンター更新
        updateSelectedDataCount();
        updateLastUpdateTime();
        
        console.log('✅ 全データ更新完了');
        
    } catch (error) {
        console.error('❌ 全データ更新エラー:', error);
    }
}

/**
 * 自動更新切り替え
 */
async function handleToggleAutoRefresh(ajaxManager) {
    try {
        // 現在の状態を取得
        const currentState = window.NAGANO3_KICHO.state.autoRefreshEnabled;
        
        // サーバー側で状態を切り替え
        const result = await ajaxManager.request('toggle-auto-refresh');
        
        if (result.success && result.data) {
            const newState = result.data.auto_refresh_enabled;
            window.NAGANO3_KICHO.state.autoRefreshEnabled = newState;
            
            // 自動更新の開始/停止
            if (newState) {
                startAutoRefresh(ajaxManager);
                console.log('✅ 自動更新開始');
            } else {
                stopAutoRefresh();
                console.log('✅ 自動更新停止');
            }
            
            // UI更新
            updateAutoRefreshButton(newState);
        }
        
    } catch (error) {
        console.error('❌ 自動更新切り替えエラー:', error);
    }
}

/**
 * 自動更新開始
 */
function startAutoRefresh(ajaxManager) {
    // 既存のタイマーを停止
    stopAutoRefresh();
    
    const interval = window.NAGANO3_KICHO.config.autoRefreshInterval;
    
    window.NAGANO3_KICHO.state.autoRefreshInterval = setInterval(async () => {
        // 処理中でない場合のみ実行
        if (!window.NAGANO3_KICHO.state.isProcessing) {
            console.log('🔄 自動更新実行中...');
            window.NAGANO3_KICHO.state.isProcessing = true;
            
            try {
                await ajaxManager.request('get_statistics');
                updateLastUpdateTime();
            } catch (error) {
                console.error('❌ 自動更新エラー:', error);
            } finally {
                window.NAGANO3_KICHO.state.isProcessing = false;
            }
        }
    }, interval);
    
    console.log(`🔄 自動更新タイマー開始: ${interval}ms間隔`);
}

/**
 * 自動更新停止
 */
function stopAutoRefresh() {
    if (window.NAGANO3_KICHO.state.autoRefreshInterval) {
        clearInterval(window.NAGANO3_KICHO.state.autoRefreshInterval);
        window.NAGANO3_KICHO.state.autoRefreshInterval = null;
        console.log('⏹️ 自動更新タイマー停止');
    }
}

/**
 * 自動更新ボタンUI更新
 */
function updateAutoRefreshButton(enabled) {
    const button = document.querySelector('[data-action="toggle-auto-refresh"]');
    if (button) {
        if (enabled) {
            button.classList.add('active', 'btn-success');
            button.classList.remove('btn-secondary');
            button.innerHTML = '<i class="fas fa-pause"></i> 自動更新停止';
        } else {
            button.classList.remove('active', 'btn-success');
            button.classList.add('btn-secondary');
            button.innerHTML = '<i class="fas fa-play"></i> 自動更新開始';
        }
    }
}

/**
 * フルバックアップ実行
 */
async function handleFullBackup(ajaxManager) {
    if (!confirm('フルバックアップを実行しますか？\n（処理に時間がかかる場合があります）')) {
        return;
    }
    
    try {
        const result = await ajaxManager.request('execute-full-backup');
        
        if (result.data?.backup_file) {
            console.log(`✅ バックアップ完了: ${result.data.backup_file}`);
        }
        
    } catch (error) {
        console.error('❌ バックアップエラー:', error);
    }
}

/**
 * 統計情報取得
 */
async function handleGetStatistics(ajaxManager) {
    try {
        const result = await ajaxManager.request('get_statistics');
        
        if (result.data) {
            updateStatisticsDisplay(result.data);
        }
        
    } catch (error) {
        console.error('❌ 統計情報取得エラー:', error);
    }
}

/**
 * ヘルスチェック
 */
async function handleHealthCheck(ajaxManager) {
    try {
        const result = await ajaxManager.request('health_check');
        console.log('✅ ヘルスチェック完了:', result);
        
    } catch (error) {
        console.error('❌ ヘルスチェックエラー:', error);
    }
}

// =====================================
// 🎯 UI更新ヘルパー関数
// =====================================

/**
 * 選択データ数更新
 */
function updateSelectedDataCount() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    const count = checkboxes.length;
    
    const countElement = document.getElementById('selectedDataCount');
    if (countElement) {
        countElement.textContent = count;
    }
    
    window.NAGANO3_KICHO.state.selectedDataCount = count;
}

/**
 * 最終更新時刻更新
 */
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('ja-JP');
    
    const timeElement = document.getElementById('lastUpdateTime');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
    
    window.NAGANO3_KICHO.state.lastUpdateTime = now;
}

/**
 * 統計情報表示更新
 */
function updateStatisticsDisplay(stats) {
    const mappings = {
        'importedCount': stats.imported_count,
        'processedCount': stats.processed_count,
        'pendingCount': stats.pending_count,
        'accuracyRate': stats.accuracy_rate + '%'
    };
    
    Object.entries(mappings).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

/**
 * ターゲット要素からデータ抽出
 */
function extractDataFromTarget(target) {
    const data = {};
    
    // data-* 属性から抽出
    Object.entries(target.dataset).forEach(([key, value]) => {
        if (key !== 'action') {
            data[key] = value;
        }
    });
    
    return data;
}

// =====================================
// 🎯 イベントハンドラー（最優先・競合回避）
// =====================================

if (IS_KICHO_PAGE) {
    // 最優先イベントハンドラー（競合回避）
    document.addEventListener('click', function(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.getAttribute('data-action');
        
        // KICHO専用アクション & KICHOページでのみ処理
        if (KICHO_ACTIONS.includes(action)) {
            // 🔑 重要：他のJSへの伝播を完全停止
            event.stopImmediatePropagation();
            event.preventDefault();
            
            console.log(`🎯 KICHO優先処理: ${action}`);
            executeKichoAction(action, target);
            return false;
        }
    }, true); // useCapture=true で最優先実行
    
    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', function() {
        console.log('🔄 KICHO クリーンアップ実行');
        
        // 自動更新停止
        stopAutoRefresh();
        
        // 処理中フラグリセット
        if (window.NAGANO3_KICHO.state) {
            window.NAGANO3_KICHO.state.isProcessing = false;
        }
    });
}

// =====================================
// 🎯 自動初期化（DOMContentLoaded）
// =====================================

document.addEventListener('DOMContentLoaded', function() {
    if (!IS_KICHO_PAGE) {
        console.log('ℹ️ KICHOページではありません - 初期化をスキップ');
        return;
    }
    
    console.log('🚀 KICHO JavaScript 初期化開始...');
    
    // AjaxManager初期化
    const ajaxManager = new KichoAjaxManager();
    window.NAGANO3_KICHO.state.ajaxManager = ajaxManager;
    
    // 初期化完了を待機して追加処理
    const checkInitialized = setInterval(() => {
        if (ajaxManager.isInitialized) {
            clearInterval(checkInitialized);
            
            // 初期データ読み込み
            setTimeout(() => {
                ajaxManager.request('get_statistics').catch(console.error);
                updateSelectedDataCount();
                updateLastUpdateTime();
            }, 1000);
            
            window.NAGANO3_KICHO.initialized = true;
            console.log('✅ KICHO JavaScript 初期化完了');
        }
    }, 100);
    
    // 初期化タイムアウト（10秒）
    setTimeout(() => {
        if (!window.NAGANO3_KICHO.initialized) {
            console.warn('⚠️ KICHO初期化タイムアウト - 基本機能のみ有効');
            window.NAGANO3_KICHO.initialized = true;
        }
    }, 10000);
});

// =====================================
// 🔧 開発環境用デバッグ機能
// =====================================

if (window.NAGANO3_CONFIG?.debug) {
    // デバッグ用グローバル関数追加
    window.KICHO_DEBUG = {
        testCSRF: async function() {
            const manager = window.NAGANO3_KICHO.state.ajaxManager;
            if (manager) {
                return await manager.request('health_check');
            }
        },
        
        testAction: async function(action) {
            const manager = window.NAGANO3_KICHO.state.ajaxManager;
            if (manager) {
                return await manager.request(action);
            }
        },
        
        showState: function() {
            console.log('KICHO State:', window.NAGANO3_KICHO);
        },
        
        resetCSRF: async function() {
            const manager = window.NAGANO3_KICHO.state.ajaxManager;
            if (manager) {
                manager.csrfToken = await fetchCSRFToken();
                console.log('CSRF リセット完了:', manager.csrfToken);
            }
        }
    };
    
    console.log('🔧 KICHO デバッグ機能有効:', Object.keys(window.KICHO_DEBUG));
}

console.log('📦 KICHO.js 読み込み完了 - Version:', window.NAGANO3_KICHO.version);

// =====================================
// 🔧 UI削除機能修正パッチ【永続版】
// =====================================

(function() {
    'use strict';
    
    console.log("🔧 UI削除機能修正パッチ適用開始");
    
    // NAGANO3_KICHOシステムの初期化を待つ
    function applyUIFix() {
        if (!window.NAGANO3_KICHO || !window.NAGANO3_KICHO.ajaxManager) {
            setTimeout(applyUIFix, 100);
            return;
        }
        
        // 既存のajaxManager処理を保存
        const originalExecuteAction = window.NAGANO3_KICHO.ajaxManager.executeAction;
        
        // フロントエンド専用アクション定義
        window.FRONTEND_ONLY_ACTIONS = [
            'delete-ui-element',
            'delete-all-items', 
            'restore-all-items'
        ];
        
        // バックアップ配列初期化
        window.deletedItemsBackup = window.deletedItemsBackup || [];
        
        // 即座削除関数
        window.immediateDelete = function(targetId) {
            console.log(`🗑️ UI要素削除実行: ${targetId}`);
            
            const element = document.getElementById(targetId);
            if (!element) {
                console.error(`❌ 要素が見つかりません: ${targetId}`);
                return false;
            }
            
            // バックアップ作成
            window.deletedItemsBackup.push({
                id: targetId,
                html: element.outerHTML,
                parentNode: element.parentNode,
                nextSibling: element.nextSibling
            });
            
            // アニメーション付き削除
            element.style.transition = 'all 0.3s ease';
            element.style.opacity = '0';
            element.style.transform = 'translateX(-100%)';
            
            setTimeout(() => {
                element.remove();
                console.log(`✅ UI要素削除完了: ${targetId}`);
                
                // 成功通知
                if (window.NAGANO3_KICHO?.uiController?.showNotification) {
                    window.NAGANO3_KICHO.uiController.showNotification('success', `要素 ${targetId} を削除しました`);
                }
            }, 300);
            
            return true;
        };
        
        // 即座復元関数
        window.immediateRestore = function() {
            console.log(`🔄 UI要素復元実行: ${window.deletedItemsBackup.length}個`);
            
            window.deletedItemsBackup.forEach(backup => {
                if (!document.getElementById(backup.id)) {
                    const div = document.createElement('div');
                    div.innerHTML = backup.html;
                    const element = div.firstChild;
                    
                    if (backup.nextSibling && backup.nextSibling.parentNode) {
                        backup.nextSibling.parentNode.insertBefore(element, backup.nextSibling);
                    } else if (backup.parentNode) {
                        backup.parentNode.appendChild(element);
                    }
                    
                    console.log(`✅ UI要素復元完了: ${backup.id}`);
                }
            });
            
            const restoredCount = window.deletedItemsBackup.length;
            window.deletedItemsBackup = [];
            
            if (window.NAGANO3_KICHO?.uiController?.showNotification) {
                window.NAGANO3_KICHO.uiController.showNotification('success', `${restoredCount}個の要素を復元しました`);
            }
        };
        
        // 全削除関数
        window.immediateDeleteAll = function() {
            const items = document.querySelectorAll('.deletable-item');
            console.log(`🗑️ 全UI要素削除実行: ${items.length}個`);
            
            items.forEach((item, index) => {
                setTimeout(() => {
                    if (item.id) {
                        window.immediateDelete(item.id);
                    }
                }, index * 200);
            });
        };
        
        // ajaxManagerの処理を上書き
        window.NAGANO3_KICHO.ajaxManager.executeAction = function(action, data = {}) {
            console.log(`🎯 アクション処理: ${action}`);
            
            // フロントエンド専用処理の場合
            if (window.FRONTEND_ONLY_ACTIONS.includes(action)) {
                console.log(`🖥️ フロントエンド専用処理実行: ${action}`);
                
                if (action === 'delete-ui-element') {
                    const targetId = data.target || 
                                   document.querySelector('[data-action="delete-ui-element"]')?.getAttribute('data-target');
                    if (targetId) {
                        return Promise.resolve(window.immediateDelete(targetId));
                    }
                } else if (action === 'delete-all-items') {
                    return Promise.resolve(window.immediateDeleteAll());
                } else if (action === 'restore-all-items') {
                    return Promise.resolve(window.immediateRestore());
                }
                
                return Promise.resolve(true);
            } else {
                // 通常のAjax処理（既存機能）
                console.log(`🌐 Ajax処理実行: ${action}`);
                return originalExecuteAction.call(this, action, data);
            }
        };
        
        console.log("✅ UI削除機能修正パッチ適用完了");
        console.log("📋 対応アクション:", window.FRONTEND_ONLY_ACTIONS);
    }
    
    // 初期化実行
    applyUIFix();
    
})();

console.log("🎉 UI削除機能修正パッチ永続化完了");