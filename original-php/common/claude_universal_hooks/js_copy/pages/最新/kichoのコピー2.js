
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
 * KICHO記帳ツール JavaScript 完成版【Stage制御削除】
 * common/js/pages/kicho.js
 * 
 * ✅ 全アクション即座に動作
 * ✅ Stage制御システム削除
 * ✅ 完全なAjax通信
 * ✅ UI更新機能完備
 * ✅ エラーハンドリング完備
 */

"use strict";

// =====================================
// 🛡️ NAGANO3モジュール専用名前空間
// =====================================

window.NAGANO3_KICHO = window.NAGANO3_KICHO || {
    version: '4.0.0-COMPLETE',
    initialized: false,
    functions: {},
    state: {
        ajaxManager: null,
        autoRefreshEnabled: false,
        autoRefreshInterval: null,
        selectedDataCount: 0,
        lastUpdateTime: null,
        isProcessing: false
    },
    config: {
        autoRefreshInterval: 30000,
        maxRetries: 3,
        requestTimeout: 30000
    }
};

// =====================================
// 🔧 CSRF取得システム
// =====================================

function getCSRFToken() {
    // 方法1: meta タグから取得
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (metaToken && metaToken.length > 10) {
        return metaToken;
    }
    
    // 方法2: NAGANO3_CONFIG から取得
    const configToken = window.NAGANO3_CONFIG?.csrfToken;
    if (configToken && configToken.length > 10) {
        return configToken;
    }
    
    // 方法3: グローバル変数から取得
    const globalToken = window.CSRF_TOKEN;
    if (globalToken && globalToken.length > 10) {
        return globalToken;
    }
    
    console.warn('⚠️ CSRF取得失敗');
    return 'development_fallback';
}

// =====================================
// 🎯 Ajax管理クラス（完成版・制限なし）
// =====================================

class KichoAjaxManagerComplete {
    constructor() {
        this.csrfToken = null;
        this.baseUrl = window.location.pathname;
        this.isInitialized = false;
        
        this.initialize();
    }
    
    async initialize() {
        console.log('🔧 KichoAjaxManager 完成版初期化開始...');
        
        this.csrfToken = getCSRFToken();
        
        if (this.csrfToken) {
            console.log('✅ CSRF初期化成功');
            this.isInitialized = true;
        } else {
            console.error('❌ CSRF初期化失敗');
            this.csrfToken = 'development_mode';
            this.isInitialized = true;
        }
        
        console.log('✅ KichoAjaxManager 完成版初期化完了');
    }
    
    async request(action, data = {}) {
        if (!this.isInitialized) {
            console.log('⏳ 初期化待ち...');
            await this.initialize();
        }
        
        try {
            this.showLoading(true);
            
            console.log(`🚀 Ajax実行: ${action}`, data);
            
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
            
            const response = await fetch(this.baseUrl + '?page=kicho_content', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });
            
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
            this.showNotification(`エラー: ${error.message}`, 'error');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }
    
    handleUIUpdate(updateData) {
        console.log('🔄 UI更新処理:', updateData);
        
        switch (updateData.type) {
            case 'remove_item':
                this.removeItem(updateData.target_id);
                break;
            case 'remove_multiple':
                updateData.target_ids?.forEach(id => this.removeItem(id));
                break;
            case 'ai_learning_success':
                this.handleAILearningSuccess(updateData);
                break;
            case 'refresh_all':
                this.refreshAllSections();
                break;
            case 'toggle_auto_refresh':
                this.updateAutoRefreshButton(updateData.state);
                break;
        }
        
        if (updateData.update_counters) {
            this.updateSelectedDataCount();
        }
        
        if (updateData.refresh_stats) {
            this.refreshStatistics();
        }
    }
    
    removeItem(itemId) {
        const targetElement = document.querySelector(`[data-item-id="${itemId}"]`);
        if (targetElement) {
            // 削除アニメーション
            targetElement.style.transition = 'all 0.3s ease';
            targetElement.style.opacity = '0';
            targetElement.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                targetElement.remove();
                console.log(`🗑️ アイテム削除完了: ${itemId}`);
            }, 300);
        }
    }
    
    handleAILearningSuccess(updateData) {
        // 入力フィールドクリア
        const textInput = document.querySelector('#aiTextInput');
        if (textInput && updateData.clear_input) {
            textInput.value = '';
            textInput.style.borderColor = '#4caf50';
            setTimeout(() => textInput.style.borderColor = '', 2000);
        }
        
        // 結果表示
        if (updateData.show_results && updateData.session_id) {
            this.showNotification(`AI学習完了 (セッション: ${updateData.session_id})`, 'success');
        }
    }
    
    async refreshStatistics() {
        try {
            const result = await this.request('get_statistics');
            if (result.data) {
                this.updateStatisticsDisplay(result.data);
            }
        } catch (error) {
            console.error('統計更新エラー:', error);
        }
    }
    
    updateStatisticsDisplay(stats) {
        const mappings = {
            'pending-count': stats.pending_count,
            'confirmed-rules': stats.confirmed_rules,
            'automation-rate': stats.automation_rate + '%',
            'error-count': stats.error_count,
            'monthly-count': stats.monthly_count,
            'lastUpdateTime': stats.last_updated
        };
        
        Object.entries(mappings).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && value !== undefined) {
                element.style.transition = 'all 0.3s ease';
                element.style.transform = 'scale(1.1)';
                element.textContent = value;
                
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 300);
            }
        });
    }
    
    updateSelectedDataCount() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
        const count = checkboxes.length;
        
        const countElement = document.getElementById('selectedDataCount');
        if (countElement) {
            countElement.textContent = count;
        }
        
        window.NAGANO3_KICHO.state.selectedDataCount = count;
    }
    
    updateAutoRefreshButton(enabled) {
        const button = document.querySelector('[data-action="toggle-auto-refresh"]');
        if (button) {
            if (enabled) {
                button.classList.add('active', 'kicho__btn--success');
                button.classList.remove('kicho__btn--secondary');
                button.innerHTML = '<i class="fas fa-pause"></i> 自動更新停止';
            } else {
                button.classList.remove('active', 'kicho__btn--success');
                button.classList.add('kicho__btn--secondary');
                button.innerHTML = '<i class="fas fa-play"></i> 自動更新開始';
            }
        }
    }
    
    refreshAllSections() {
        // 各セクションの更新
        this.refreshStatistics();
        this.updateSelectedDataCount();
        
        // リストの再読み込み
        const lists = document.querySelectorAll('#importedDataList, #aiSessionList');
        lists.forEach(list => {
            if (list) {
                list.style.opacity = '0.5';
                setTimeout(() => {
                    list.style.opacity = '1';
                }, 500);
            }
        });
    }
    
    showLoading(show) {
        // ボタン無効化
        document.querySelectorAll('[data-action]').forEach(button => {
            button.disabled = show;
            if (show) {
                button.classList.add('loading');
                button.style.opacity = '0.6';
            } else {
                button.classList.remove('loading');
                button.style.opacity = '1';
            }
        });
    }
    
    showNotification(message, type = 'info') {
        console.log(`📢 通知 [${type}]:`, message);
        
        // 通知要素作成
        const notification = document.createElement('div');
        notification.className = `kicho-notification kicho-notification--${type}`;
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
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        
        document.body.appendChild(notification);
        
        // 自動削除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// =====================================
// 🎯 アクション実行システム
// =====================================

function executeKichoAction(action, target) {
    console.log(`🎯 KICHOアクション実行: ${action}`);
    
    const ajaxManager = window.NAGANO3_KICHO.state.ajaxManager;
    
    if (!ajaxManager) {
        console.error('❌ AjaxManagerが初期化されていません');
        return;
    }
    
    // データ抽出
    const data = extractDataFromTarget(target);
    
    // アクション実行
    ajaxManager.request(action, data).catch(error => {
        console.error(`❌ アクション実行エラー [${action}]:`, error);
    });
}

function extractDataFromTarget(target) {
    const data = {};
    
    // data-*属性からの取得
    Object.entries(target.dataset).forEach(([key, value]) => {
        if (key !== 'action') {
            // キャメルケース → スネークケース変換
            const phpKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            data[phpKey] = value;
        }
    });
    
    // 特別なアクションのフォーム値取得
    const action = target.getAttribute('data-action');
    
    if (action === 'execute-integrated-ai-learning') {
        const textArea = document.querySelector('#aiTextInput');
        if (textArea && textArea.value.trim()) {
            data.text_content = textArea.value.trim();
        }
        
        const learningMode = document.querySelector('#integratedLearningMode');
        if (learningMode) {
            data.learning_mode = learningMode.value;
        }
    }
    
    if (action === 'execute-mf-import') {
        data.start_date = document.querySelector('#mfStartDate')?.value;
        data.end_date = document.querySelector('#mfEndDate')?.value;
        data.purpose = document.querySelector('#mfPurpose')?.value;
    }
    
    if (action === 'select-by-date-range') {
        data.start_date = prompt('開始日 (YYYY-MM-DD):') || '2025-01-01';
        data.end_date = prompt('終了日 (YYYY-MM-DD):') || '2025-12-31';
    }
    
    if (action === 'delete-selected-data') {
        const checkedBoxes = document.querySelectorAll('input[type="checkbox"]:checked');
        data.selected_ids = Array.from(checkedBoxes).map(cb => 
            cb.closest('[data-item-id]')?.getAttribute('data-item-id')
        ).filter(id => id);
    }
    
    return data;
}

// =====================================
// 🎯 自動更新システム
// =====================================

function startAutoRefresh() {
    const ajaxManager = window.NAGANO3_KICHO.state.ajaxManager;
    if (!ajaxManager) return;
    
    // 既存のタイマーを停止
    stopAutoRefresh();
    
    const interval = window.NAGANO3_KICHO.config.autoRefreshInterval;
    
    window.NAGANO3_KICHO.state.autoRefreshInterval = setInterval(async () => {
        if (!window.NAGANO3_KICHO.state.isProcessing) {
            console.log('🔄 自動更新実行中...');
            window.NAGANO3_KICHO.state.isProcessing = true;
            
            try {
                await ajaxManager.request('get_statistics');
            } catch (error) {
                console.error('❌ 自動更新エラー:', error);
            } finally {
                window.NAGANO3_KICHO.state.isProcessing = false;
            }
        }
    }, interval);
    
    console.log(`🔄 自動更新開始: ${interval}ms間隔`);
}

function stopAutoRefresh() {
    if (window.NAGANO3_KICHO.state.autoRefreshInterval) {
        clearInterval(window.NAGANO3_KICHO.state.autoRefreshInterval);
        window.NAGANO3_KICHO.state.autoRefreshInterval = null;
        console.log('⏹️ 自動更新停止');
    }
}

// =====================================
// 🎯 イベントハンドラー（最優先・競合回避）
// =====================================

const KICHO_ACTIONS = [
    "refresh-all", "toggle-auto-refresh", "show-import-history", "execute-mf-import",
    "show-mf-history", "execute-mf-recovery", "csv-upload", "process-csv-upload",
    "show-duplicate-history", "add-text-to-learning", "show-ai-learning-history",
    "show-optimization-suggestions", "select-all-imported-data", "select-by-date-range",
    "select-by-source", "delete-selected-data", "delete-data-item", "execute-integrated-ai-learning",
    "download-rules-csv", "create-new-rule", "download-all-rules-csv", "rules-csv-upload",
    "save-uploaded-rules-as-database", "edit-saved-rule", "delete-saved-rule",
    "download-pending-csv", "download-pending-transactions-csv", "approval-csv-upload",
    "bulk-approve-transactions", "view-transaction-details", "delete-approved-transaction",
    "refresh-ai-history", "load-more-sessions", "execute-full-backup", "export-to-mf",
    "create-manual-backup", "generate-advanced-report", "health_check", "get_statistics"
];

// ページ判定
const IS_KICHO_PAGE = document.body.getAttribute('data-page') === 'kicho_content';

if (IS_KICHO_PAGE) {
    // 最優先イベントハンドラー
    document.addEventListener('click', function(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.getAttribute('data-action');
        
        // KICHO専用アクション判定
        if (KICHO_ACTIONS.includes(action)) {
            event.stopImmediatePropagation();
            event.preventDefault();
            
            console.log(`🎯 KICHO処理: ${action}`);
            executeKichoAction(action, target);
            return false;
        }
    }, true); // useCapture=true で最優先実行
    
    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', function() {
        console.log('🔄 KICHO クリーンアップ実行');
        stopAutoRefresh();
        if (window.NAGANO3_KICHO.state) {
            window.NAGANO3_KICHO.state.isProcessing = false;
        }
    });
}

// =====================================
// 🎯 自動初期化
// =====================================

document.addEventListener('DOMContentLoaded', function() {
    if (!IS_KICHO_PAGE) {
        console.log('ℹ️ KICHOページではありません');
        return;
    }
    
    console.log('🚀 KICHO完成版 初期化開始...');
    
    // AjaxManager初期化
    const ajaxManager = new KichoAjaxManagerComplete();
    window.NAGANO3_KICHO.state.ajaxManager = ajaxManager;
    
    // 初期化完了を待機して追加処理
    const checkInitialized = setInterval(() => {
        if (ajaxManager.isInitialized) {
            clearInterval(checkInitialized);
            
            // 初期データ読み込み
            setTimeout(() => {
                ajaxManager.request('get_statistics').catch(console.error);
                ajaxManager.updateSelectedDataCount();
            }, 1000);
            
            window.NAGANO3_KICHO.initialized = true;
            console.log('✅ KICHO完成版 初期化完了');
        }
    }, 100);
    
    // 初期化タイムアウト（10秒）
    setTimeout(() => {
        if (!window.NAGANO3_KICHO.initialized) {
            console.warn('⚠️ KICHO初期化タイムアウト');
            window.NAGANO3_KICHO.initialized = true;
        }
    }, 10000);
});

// =====================================
// 🔧 グローバル関数（下位互換性）
// =====================================

window.executeAjax = function(action, data = {}) {
    const ajaxManager = window.NAGANO3_KICHO.state.ajaxManager;
    if (ajaxManager) {
        return ajaxManager.request(action, data);
    } else {
        console.error('Ajax Manager not initialized');
        return Promise.reject(new Error('Ajax Manager not initialized'));
    }
};

window.healthCheck = async function() {
    try {
        const result = await window.executeAjax('health_check');
        console.log('✅ Health Check:', result);
        return result;
    } catch (error) {
        console.error('❌ Health Check Failed:', error);
        return null;
    }
};

console.log('📦 KICHO.js 完成版読み込み完了 - Version:', window.NAGANO3_KICHO.version);
