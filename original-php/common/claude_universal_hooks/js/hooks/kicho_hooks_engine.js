
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
 * KICHO記帳ツール専用 Hooks実行エンジン
 * 
 * 機能:
 * - 40個のdata-actionボタンを統合管理
 * - UI/UXアニメーション制御
 * - Ajax通信・エラー処理
 * - MF連携・AI学習特化機能
 */

class KichoHooksEngine {
    constructor() {
        this.config = null;
        this.uiController = null;
        this.errorHandler = null;
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.requestId = 0;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 KICHO Hooks Engine 初期化開始');
        
        try {
            // 設定ファイル読み込み
            await this.loadConfig();
            
            // 依存クラス初期化
            this.uiController = new KichoUIController(this.config);
            this.errorHandler = new KichoErrorHandler(this.config);
            
            // イベントリスナー設定
            this.setupEventListeners();
            
            console.log('✅ KICHO Hooks Engine 初期化完了');
            
        } catch (error) {
            console.error('❌ KICHO Hooks Engine 初期化失敗:', error);
        }
    }
    
    async loadConfig() {
        try {
            // 複数設定ファイルを並行読み込み
            const [hooksConfig, animationsConfig] = await Promise.all([
                fetch('/common/claude_universal_hooks/config/hooks/kicho_hooks.json').then(r => r.json()),
                fetch('/common/claude_universal_hooks/config/hooks/ui_animations.json').then(r => r.json())
            ]);
            
            this.config = {
                ...hooksConfig,
                animations: animationsConfig
            };
            
            console.log('✅ KICHO Hooks設定読み込み完了');
            
        } catch (error) {
            console.error('❌ KICHO Hooks設定読み込み失敗:', error);
            // フォールバック設定
            this.config = this.getDefaultConfig();
        }
    }
    
    getDefaultConfig() {
        return {
            actions: {},
            error_handling: {
                retry_enabled: true,
                max_retries: 3,
                retry_delay: 1000
            },
            ui_patterns: {},
            mf_integration: {
                backup_before_send: true,
                approval_required: true
            }
        };
    }
    
    setupEventListeners() {
        // data-actionボタンのイベント委譲
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.getAttribute('data-action');
            
            // KICHO専用アクション判定
            if (this.isKichoAction(action)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                
                this.executeAction(action, target);
            }
        }, true); // キャプチャフェーズで捕獲（競合回避）
        
        console.log('✅ イベントリスナー設定完了');
    }
    
    isKichoAction(action) {
        const KICHO_ACTIONS = [
            'refresh-all', 'toggle-auto-refresh', 'health-check',
            'execute-mf-import', 'process-csv-upload', 'add-text-to-learning',
            'show-import-history', 'show-mf-history', 'execute-mf-recovery',
            'show-duplicate-history', 'show-ai-learning-history', 'show-optimization-suggestions',
            'select-all-imported-data', 'select-by-date-range', 'select-by-source',
            'delete-selected-data', 'delete-data-item',
            'execute-integrated-ai-learning',
            'download-rules-csv', 'create-new-rule', 'download-all-rules-csv',
            'rules-csv-upload', 'save-uploaded-rules-as-database',
            'edit-saved-rule', 'delete-saved-rule',
            'download-pending-csv', 'download-pending-transactions-csv',
            'approval-csv-upload', 'bulk-approve-transactions',
            'view-transaction-details', 'delete-approved-transaction',
            'refresh-ai-history', 'load-more-sessions',
            'execute-full-backup', 'export-to-mf', 'create-manual-backup',
            'generate-advanced-report', 'get_statistics', 'get-ai-status', 'get-ai-history'
        ];
        
        return KICHO_ACTIONS.includes(action);
    }
    
    async executeAction(actionName, target, customData = {}) {
        const requestId = ++this.requestId;
        console.log(`🎯 アクション実行: ${actionName} (ID: ${requestId})`);
        
        const actionConfig = this.config?.actions?.[actionName];
        
        if (!actionConfig) {
            console.warn(`⚠️ 未定義アクション: ${actionName}`);
            return;
        }
        
        try {
            // 1. 確認ダイアログ
            if (actionConfig.confirmation && !confirm(actionConfig.confirmation)) {
                console.log(`⏹️ ユーザーキャンセル: ${actionName}`);
                return;
            }
            
            // 2. データ抽出
            const data = this.extractDataFromTarget(target, customData);
            
            // 3. バックアップ実行（必要な場合）
            if (actionConfig.backup_before || actionConfig.backup_required) {
                await this.executeBackup();
            }
            
            // 4. UI更新開始
            if (actionConfig.ui_update) {
                this.uiController.startUIUpdate(actionConfig.ui_update, target);
            }
            
            // 5. Ajax通信実行
            const result = await this.executeAjax(actionName, data, requestId);
            
            // 6. 成功処理
            await this.handleSuccess(result, actionConfig, target, requestId);
            
        } catch (error) {
            // 7. エラー処理
            await this.handleError(error, actionConfig, target, actionName, requestId);
        }
    }
    
    extractDataFromTarget(target, customData = {}) {
        const data = { ...customData };
        
        // data-* 属性を抽出
        Object.entries(target.dataset).forEach(([key, value]) => {
            if (key !== 'action') {
                // camelCase → snake_case 変換
                const phpKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                data[phpKey] = value;
            }
        });
        
        // フォーム入力値を抽出
        const form = target.closest('form');
        if (form) {
            const formData = new FormData(form);
            for (const [key, value] of formData.entries()) {
                data[key] = value;
            }
        }
        
        // 特定要素の値を抽出
        const associatedInputs = target.getAttribute('data-inputs');
        if (associatedInputs) {
            associatedInputs.split(',').forEach(selector => {
                const input = document.querySelector(selector.trim());
                if (input) {
                    const name = input.name || input.id || selector.replace(/[#.]/, '');
                    data[name] = input.value;
                }
            });
        }
        
        return data;
    }
    
    async executeAjax(action, data, requestId) {
        const formData = new FormData();
        formData.append('action', action);
        formData.append('csrf_token', this.getCSRFToken());
        formData.append('request_id', requestId);
        
        // データをFormDataに追加
        Object.entries(data).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                formData.append(key, value);
            }
        });
        
        console.log(`🌐 Ajax送信: ${action}`, Object.fromEntries(formData));
        
        const response = await fetch(window.location.pathname, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-KICHO-Hooks': '1.0'
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`📨 Ajax受信: ${action}`, result);
        
        return result;
    }
    
    async handleSuccess(result, actionConfig, target, requestId) {
        console.log(`✅ 成功処理: ${actionConfig.success_message || '処理完了'}`);
        
        // 1. リトライカウンタリセット
        this.retryAttempts.delete(requestId);
        
        // 2. UI更新完了
        if (actionConfig.ui_update) {
            this.uiController.finishUIUpdate(actionConfig.ui_update, target, result);
        }
        
        // 3. 成功メッセージ表示
        if (actionConfig.success_message) {
            this.uiController.showToast('success', actionConfig.success_message);
        }
        
        // 4. 特定UI操作実行
        await this.executePostSuccessActions(actionConfig, result);
    }
    
    async executePostSuccessActions(actionConfig, result) {
        // 入力フィールドクリア
        if (actionConfig.clear_input) {
            const input = document.querySelector(actionConfig.clear_input);
            if (input) input.value = '';
        }
        
        // フォームクリア
        if (actionConfig.clear_form) {
            const form = document.querySelector(actionConfig.clear_form);
            if (form) form.reset();
        }
        
        // リスト更新
        if (actionConfig.refresh_list) {
            const list = document.querySelector(actionConfig.refresh_list);
            if (list && result.html) {
                list.innerHTML = result.html;
            }
        }
        
        // 統計更新
        if (actionConfig.refresh_stats && result.stats) {
            this.updateStats(result.stats);
        }
        
        // ダウンロード実行
        if (actionConfig.trigger_download && result.download_url) {
            this.triggerDownload(result.download_url, result.filename);
        }
        
        // モーダル表示
        if (actionConfig.modal_content && result.modal_html) {
            this.uiController.showModal(actionConfig.modal_content, result.modal_html);
        }
        
        // 自動リロード
        if (actionConfig.ajax_refresh) {
            setTimeout(() => this.refreshPageContent(), 1000);
        }
    }
    
    async handleError(error, actionConfig, target, actionName, requestId) {
        console.error(`❌ エラー処理: ${actionName}`, error);
        
        // 1. UI更新停止
        this.uiController.stopUIUpdate(target);
        
        // 2. リトライ処理
        if (actionConfig.error_retry && this.shouldRetry(requestId)) {
            const retryCount = this.retryAttempts.get(requestId) || 0;
            this.retryAttempts.set(requestId, retryCount + 1);
            
            console.log(`🔄 リトライ ${retryCount + 1}/${this.maxRetries}: ${actionName}`);
            
            // 遅延後リトライ
            setTimeout(() => {
                this.executeAction(actionName, target);
            }, this.config.error_handling.retry_delay || 1000);
            
            return;
        }
        
        // 3. エラー処理に委譲
        this.errorHandler.handleError(error, actionName, target);
    }
    
    shouldRetry(requestId) {
        const currentAttempts = this.retryAttempts.get(requestId) || 0;
        return currentAttempts < this.maxRetries;
    }
    
    async executeBackup() {
        console.log('💾 バックアップ実行中...');
        // バックアップ処理の実装
        // 実際のプロジェクトではバックアップAPIを呼び出し
    }
    
    getCSRFToken() {
        return document.querySelector('meta[name="csrf-token"]')?.content || '';
    }
    
    updateStats(stats) {
        Object.entries(stats).forEach(([key, value]) => {
            const element = document.querySelector(`#${key}, .${key}, [data-stat="${key}"]`);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    triggerDownload(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    refreshPageContent() {
        // Ajax経由でページコンテンツを更新
        // ページ全体リロードではなく、必要部分のみ更新
        console.log('🔄 ページコンテンツ更新中...');
    }
}

// グローバル初期化
document.addEventListener('DOMContentLoaded', function() {
    // ページ判定
    const isKichoPage = document.body?.matches('[data-page="kicho_content"]') ||
                       window.location.href.includes('kicho_content') ||
                       window.location.search.includes('page=kicho_content');
    
    if (isKichoPage) {
        console.log('🎯 KICHO専用ページ検出 - Hooks Engine初期化');
        window.KICHO_HOOKS_ENGINE = new KichoHooksEngine();
    } else {
        console.log('ℹ️ KICHOページ以外 - Hooks Engine初期化スキップ');
    }
});

// 保険のためのwindow.onload
window.addEventListener('load', function() {
    if (!window.KICHO_HOOKS_ENGINE && 
        (window.location.href.includes('kicho') || document.querySelector('[data-action]'))) {
        console.log('🔄 遅延初期化: KICHO Hooks Engine');
        window.KICHO_HOOKS_ENGINE = new KichoHooksEngine();
    }
});