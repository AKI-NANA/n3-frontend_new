
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
 * KICHO JavaScript - Stage B実装（Ajax基本通信のみ）
 * common/js/pages/kicho.js
 * 
 * Stage B許可機能:
 * - health_check のみ
 * - get_statistics のみ
 * - 基本Ajax通信のみ
 * 
 * Stage B禁止機能:
 * - 削除処理（Stage Cで実装）
 * - AI学習処理（Stage Dで実装）
 * - ファイル処理（Stage Dで実装）
 */

"use strict";

// =====================================
// 🛡️ Stage B: 名前空間・基盤（必須）
// =====================================

window.NAGANO3_KICHO = window.NAGANO3_KICHO || {
    version: '1.0.0-stage-b',
    initialized: false,
    stage: 'B',
    functions: {},
    state: {
        ajaxManager: null,
        lastUpdateTime: null,
        isProcessing: false
    },
    config: {
        maxRetries: 3,
        requestTimeout: 30000
    }
};

// =====================================
// 🔧 Stage B: CSRF取得システム（必須）
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
    
    // 方法4: フォールバック
    console.warn('⚠️ CSRF取得失敗 - development_mode で継続');
    return 'development_mode';
}

// =====================================
// 🎯 Stage B: Ajax基本通信クラス（制限付き）
// =====================================

class KichoAjaxManagerStageB {
    constructor() {
        this.csrfToken = null;
        this.baseUrl = window.location.pathname;
        this.isInitialized = false;
        this.stage = 'B';
        
        // 許可アクション（Stage B限定）
        this.allowedActions = [
            'health_check',
            'get_statistics'
        ];
        
        // 初期化
        this.initialize();
    }
    
    /**
     * 初期化処理
     */
    async initialize() {
        console.log('🔧 KichoAjaxManager Stage B 初期化開始...');
        
        // CSRF取得
        this.csrfToken = getCSRFToken();
        
        if (this.csrfToken) {
            console.log('✅ Stage B CSRF初期化成功:', this.csrfToken.substring(0, 8) + '...');
            this.isInitialized = true;
        } else {
            console.error('❌ Stage B CSRF初期化失敗');
            this.csrfToken = 'fallback_token';
            this.isInitialized = true;
        }
    }
    
    /**
     * アクション許可チェック（Stage B制限）
     */
    isActionAllowed(action) {
        if (!this.allowedActions.includes(action)) {
            console.error(`❌ Stage B禁止アクション: ${action}`);
            console.error(`✅ Stage B許可アクション: ${this.allowedActions.join(', ')}`);
            return false;
        }
        return true;
    }
    
    /**
     * Ajax リクエスト実行（Stage B制限付き）
     */
    async request(action, data = {}) {
        // 初期化確認
        if (!this.isInitialized) {
            throw new Error('Stage B Ajax Manager 未初期化');
        }
        
        // アクション許可チェック
        if (!this.isActionAllowed(action)) {
            throw new Error(`Stage B: アクション '${action}' は許可されていません`);
        }
        
        try {
            this.showLoading(true);
            
            const formData = new FormData();
            formData.append('action', action);
            formData.append('csrf_token', this.csrfToken);
            
            // データ追加処理（Stage B: 基本データのみ）
            Object.entries(data).forEach(([key, value]) => {
                if (typeof value === 'object') {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, String(value));
                }
            });
            
            // デバッグ情報
            console.log(`🚀 Stage B Ajax実行: ${action}`, {
                stage: this.stage,
                csrf: this.csrfToken ? this.csrfToken.substring(0, 8) + '...' : 'なし',
                allowed: this.allowedActions
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
            
            // Stage B: レスポンス検証
            if (!result.stage || result.stage !== 'A') {
                console.warn('⚠️ Stage不整合:', result.stage);
            }
            
            // レスポンス処理
            if (result.success || result.status === 'success') {
                console.log(`✅ Stage B Ajax成功: ${action}`, result);
                
                // 成功通知
                if (result.message) {
                    this.showNotification(result.message, 'success');
                }
                
                return result;
            } else {
                const errorMsg = result.error || result.message || 'Stage B Ajax処理エラー';
                throw new Error(errorMsg);
            }
            
        } catch (error) {
            console.error(`❌ Stage B Ajax Error [${action}]:`, error);
            
            // エラー通知
            const errorMessage = error.message || 'Stage B システムエラー';
            this.showNotification(`Stage B エラー: ${errorMessage}`, 'error');
            
            throw error;
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * ローディング表示制御
     */
    showLoading(show) {
        // Stage B: 基本ローディング表示のみ
        if (show) {
            console.log('⏳ Stage B: 処理中...');
        } else {
            console.log('✅ Stage B: 処理完了');
        }
        
        // ボタン無効化（Stage B許可アクションのみ）
        this.allowedActions.forEach(action => {
            const button = document.querySelector(`[data-action="${action}"]`);
            if (button) {
                button.disabled = show;
                if (show) {
                    button.classList.add('loading');
                } else {
                    button.classList.remove('loading');
                }
            }
        });
    }
    
    /**
     * 通知表示
     */
    showNotification(message, type = 'info') {
        console.log(`📢 Stage B 通知 [${type}]:`, message);
        
        // フォールバック通知システム
        const notification = document.createElement('div');
        notification.className = `stage-b-notification notification-${type}`;
        notification.textContent = `[Stage B] ${message}`;
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
            border-left: 4px solid white;
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
// 🎯 Stage B: 基本機能実装
// =====================================

/**
 * Stage B ヘルスチェック
 */
async function stageB_healthCheck() {
    try {
        const ajaxManager = window.NAGANO3_KICHO.state.ajaxManager;
        if (!ajaxManager) {
            throw new Error('Ajax Manager 未初期化');
        }
        
        const result = await ajaxManager.request('health_check');
        console.log('✅ Stage B ヘルスチェック成功:', result);
        
        return result;
        
    } catch (error) {
        console.error('❌ Stage B ヘルスチェック失敗:', error);
        throw error;
    }
}

/**
 * Stage B 統計取得
 */
async function stageB_getStatistics() {
    try {
        const ajaxManager = window.NAGANO3_KICHO.state.ajaxManager;
        if (!ajaxManager) {
            throw new Error('Ajax Manager 未初期化');
        }
        
        const result = await ajaxManager.request('get_statistics');
        console.log('✅ Stage B 統計取得成功:', result);
        
        // Stage B: 基本的な画面更新のみ
        if (result.data) {
            updateBasicStatistics(result.data);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Stage B 統計取得失敗:', error);
        throw error;
    }
}

/**
 * 基本統計表示更新（Stage B限定）
 */
function updateBasicStatistics(stats) {
    console.log('🔄 Stage B: 基本統計更新', stats);
    
    // pending_count更新
    const pendingElement = document.querySelector('#pending-count, [data-stat="pending_count"]');
    if (pendingElement && stats.pending_count) {
        pendingElement.textContent = stats.pending_count + '件';
        console.log('✅ pending_count更新:', stats.pending_count);
    }
    
    // last_updated更新
    const timeElement = document.querySelector('#lastUpdateTime');
    if (timeElement && stats.last_updated) {
        timeElement.textContent = stats.last_updated;
        console.log('✅ 最終更新時刻更新:', stats.last_updated);
    }
    
    // Stage B確認表示
    const stageInfo = document.createElement('div');
    stageInfo.style.cssText = `
        position: fixed; bottom: 20px; left: 20px; 
        background: #2196f3; color: white; padding: 8px 12px; 
        border-radius: 4px; font-size: 12px; z-index: 9999;
    `;
    stageInfo.textContent = `Stage B: 基本Ajax通信動作中 (${stats.stage || 'A'})`;
    document.body.appendChild(stageInfo);
    
    setTimeout(() => stageInfo.remove(), 5000);
}

// =====================================
// 🎯 Stage B: イベントリスナー（制限付き）
// =====================================

// ページ判定
const IS_KICHO_PAGE = document.body.getAttribute('data-page') === 'kicho_content';

if (IS_KICHO_PAGE) {
    // Stage B: 制限付きイベントハンドラー
    document.addEventListener('click', function(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.getAttribute('data-action');
        
        // Stage B許可アクション判定
        const allowedActions = ['health_check', 'get_statistics'];
        
        if (allowedActions.includes(action)) {
            // 🔑 重要：他のJSへの伝播を完全停止
            event.stopImmediatePropagation();
            event.preventDefault();
            
            console.log(`🎯 Stage B優先処理: ${action}`);
            
            // Stage B処理実行
            if (action === 'health_check') {
                stageB_healthCheck();
            } else if (action === 'get_statistics') {
                stageB_getStatistics();
            }
            
            return false;
        } else {
            // Stage B禁止アクション
            console.warn(`⚠️ Stage B禁止アクション: ${action}`);
            console.warn(`✅ Stage B許可アクション: ${allowedActions.join(', ')}`);
            
            // 禁止通知表示
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: #ff9800; color: white; padding: 20px; border-radius: 8px;
                z-index: 10000; text-align: center; font-weight: bold;
            `;
            notification.innerHTML = `
                <div>⚠️ Stage B制限</div>
                <div style="margin: 10px 0;">'${action}' は後のStageで実装予定</div>
                <div style="font-size: 12px;">許可: ${allowedActions.join(', ')}</div>
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => notification.remove(), 3000);
        }
    }, true); // useCapture=true で最優先実行
}

// =====================================
// 🎯 Stage B: 自動初期化
// =====================================

document.addEventListener('DOMContentLoaded', function() {
    if (!IS_KICHO_PAGE) {
        console.log('ℹ️ KICHOページではありません - Stage B初期化をスキップ');
        return;
    }
    
    console.log('🚀 KICHO Stage B JavaScript 初期化開始...');
    
    // AjaxManager初期化
    const ajaxManager = new KichoAjaxManagerStageB();
    window.NAGANO3_KICHO.state.ajaxManager = ajaxManager;
    
    // 初期化完了を待機
    const checkInitialized = setInterval(() => {
        if (ajaxManager.isInitialized) {
            clearInterval(checkInitialized);
            
            window.NAGANO3_KICHO.initialized = true;
            console.log('✅ KICHO Stage B JavaScript 初期化完了');
            
            // Stage B表示追加
            const stageBanner = document.createElement('div');
            stageBanner.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; 
                background: linear-gradient(90deg, #2196f3, #1976d2); 
                color: white; text-align: center; padding: 5px; 
                z-index: 10000; font-size: 12px; font-weight: bold;
            `;
            stageBanner.textContent = '🎯 Stage B: Ajax基本通信のみ動作中 (health_check, get_statistics)';
            document.body.appendChild(stageBanner);
        }
    }, 100);
    
    // 初期化タイムアウト（10秒）
    setTimeout(() => {
        if (!window.NAGANO3_KICHO.initialized) {
            console.warn('⚠️ Stage B初期化タイムアウト');
            window.NAGANO3_KICHO.initialized = true;
        }
    }, 10000);
});

// =====================================
// 🧪 Stage B: グローバルテスト関数
// =====================================

// Stage B専用テスト関数
window.testStageB = async function() {
    console.log('🧪 Stage B 動作テスト開始...');
    
    try {
        // health_check テスト
        console.log('1. health_check テスト...');
        await stageB_healthCheck();
        
        // get_statistics テスト
        console.log('2. get_statistics テスト...');
        await stageB_getStatistics();
        
        console.log('✅ Stage B テスト完了！');
        alert('✅ Stage B テスト成功！\n\n基本Ajax通信が正常動作中です。');
        
    } catch (error) {
        console.error('❌ Stage B テスト失敗:', error);
        alert('❌ Stage B テスト失敗:\n' + error.message);
    }
};

console.log('📦 KICHO Stage B.js 読み込み完了 - Version:', window.NAGANO3_KICHO.version);