
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
 * KICHO記帳ツール専用hooks
 * 
 * 記帳ツール特化機能のみ:
 * 1. MFクラウド連携（記帳データ取得・送信）
 * 2. AI学習（記帳ルール学習・自動分類）
 * 3. 取引承認（記帳データ承認フロー）
 * 4. ルール管理（記帳ルールCSV管理）
 * 5. 記帳データCSV処理
 */

class KichoAccountingHooks {
    constructor() {
        this.config = null;
        this.init();
    }
    
    async init() {
        console.log('🎯 KICHO記帳専用hooks初期化');
        
        // 記帳専用設定読み込み
        await this.loadAccountingConfig();
        
        // 記帳専用イベント設定
        this.setupAccountingEvents();
        
        console.log('✅ KICHO記帳専用hooks初期化完了');
    }
    
    async loadAccountingConfig() {
        try {
            const response = await fetch('/common/claude_universal_hooks/config/hooks/kicho_hooks.json');
            this.config = await response.json();
        } catch (error) {
            console.error('❌ 記帳hooks設定読み込み失敗:', error);
            this.config = this.getDefaultAccountingConfig();
        }
    }
    
    getDefaultAccountingConfig() {
        return {
            mf_integration: {
                backup_before_send: true,
                approval_required: true,
                api_timeout: 30000
            },
            ai_learning: {
                clear_input_on_success: true,
                show_learning_progress: true
            },
            transaction_approval: {
                bulk_confirmation: true,
                backup_before_approve: true
            }
        };
    }
    
    setupAccountingEvents() {
        // 記帳専用ボタンのイベント設定
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.getAttribute('data-action');
            
            // 記帳専用アクションのみ処理
            if (this.isAccountingAction(action)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                
                this.executeAccountingAction(action, target);
            }
        }, true);
    }
    
    isAccountingAction(action) {
        const ACCOUNTING_ACTIONS = [
            // MFクラウド連携（記帳特化）
            'execute-mf-import',
            'export-to-mf',
            
            // AI学習（記帳特化）
            'execute-integrated-ai-learning',
            'add-text-to-learning',
            
            // 取引承認（記帳特化）
            'bulk-approve-transactions',
            'view-transaction-details',
            'delete-approved-transaction',
            
            // ルール管理（記帳特化）
            'download-rules-csv',
            'save-uploaded-rules-as-database',
            'create-new-rule',
            'edit-saved-rule',
            'delete-saved-rule',
            
            // 記帳CSV処理
            'download-pending-csv',
            'download-pending-transactions-csv',
            'approval-csv-upload',
            'rules-csv-upload'
        ];
        
        return ACCOUNTING_ACTIONS.includes(action);
    }
    
    async executeAccountingAction(action, target) {
        console.log(`💼 記帳アクション実行: ${action}`);
        
        try {
            switch (action) {
                // === MFクラウド連携 ===
                case 'execute-mf-import':
                    await this.executeMFImport(target);
                    break;
                    
                case 'export-to-mf':
                    await this.executeExportToMF(target);
                    break;
                    
                // === AI学習（記帳特化） ===
                case 'execute-integrated-ai-learning':
                    await this.executeAILearning(target);
                    break;
                    
                case 'add-text-to-learning':
                    await this.addTextToLearning(target);
                    break;
                    
                // === 取引承認 ===
                case 'bulk-approve-transactions':
                    await this.bulkApproveTransactions(target);
                    break;
                    
                // === ルール管理 ===
                case 'download-rules-csv':
                    await this.downloadRulesCSV(target);
                    break;
                    
                case 'save-uploaded-rules-as-database':
                    await this.saveRulesToDatabase(target);
                    break;
                    
                // === その他記帳機能 ===
                default:
                    await this.executeGenericAccountingAction(action, target);
            }
            
        } catch (error) {
            console.error(`❌ 記帳アクション失敗: ${action}`, error);
            this.showAccountingError(error, action);
        }
    }
    
    // === MFクラウド連携機能 ===
    async executeMFImport(target) {
        console.log('🏦 MFクラウドデータ取得開始');
        
        // 事前確認
        if (!confirm('MFクラウドからデータを取得します。よろしいですか？')) {
            return;
        }
        
        // バックアップ実行
        if (this.config.mf_integration.backup_before_send) {
            await this.createAccountingBackup('before_mf_import');
        }
        
        // ローディング表示
        this.showAccountingLoading(target, 'MFデータ取得中...');
        
        try {
            const result = await this.sendAccountingAjax('execute-mf-import', {
                import_type: 'full',
                date_range: this.getMFDateRange()
            });
            
            if (result.success) {
                this.showAccountingSuccess(`${result.imported_count}件のデータを取得しました`);
                this.updateTransactionList(result.transactions);
                this.updateAccountingStats(result.stats);
            }
            
        } finally {
            this.hideAccountingLoading(target);
        }
    }
    
    async executeExportToMF(target) {
        console.log('📤 MFクラウドデータ送信開始');
        
        // 承認確認
        if (!confirm('データをMFクラウドに送信します。よろしいですか？')) {
            return;
        }
        
        // 送信前バックアップ
        await this.createAccountingBackup('before_mf_export');
        
        const result = await this.sendAccountingAjax('export-to-mf', {
            export_type: 'approved_only',
            selected_transactions: this.getSelectedTransactionIds()
        });
        
        if (result.success) {
            this.showAccountingSuccess(`${result.exported_count}件のデータを送信しました`);
        }
    }
    
    // === AI学習（記帳特化）===
    async executeAILearning(target) {
        console.log('🤖 記帳AI学習開始');
        
        const textInput = document.querySelector('#aiTextInput');
        const learningText = textInput?.value?.trim();
        
        if (!learningText) {
            this.showAccountingError(new Error('学習用テキストを入力してください'), 'ai_learning');
            return;
        }
        
        this.showAccountingLoading(target, 'AI学習中...');
        
        try {
            const result = await this.sendAccountingAjax('execute-integrated-ai-learning', {
                text_content: learningText,
                learning_type: 'accounting_rules',
                existing_transactions: this.getCurrentTransactions()
            });
            
            if (result.success) {
                // 入力フィールドクリア
                if (textInput) textInput.value = '';
                
                // 学習結果表示
                this.showAILearningResults(result.learning_results);
                
                // 統計更新
                this.updateAccountingStats(result.stats);
                
                this.showAccountingSuccess('AI学習が完了しました');
            }
            
        } finally {
            this.hideAccountingLoading(target);
        }
    }
    
    // === 取引承認機能 ===
    async bulkApproveTransactions(target) {
        console.log('✅ 一括取引承認開始');
        
        const selectedIds = this.getSelectedTransactionIds();
        
        if (selectedIds.length === 0) {
            this.showAccountingError(new Error('承認する取引を選択してください'), 'bulk_approve');
            return;
        }
        
        if (!confirm(`${selectedIds.length}件の取引を一括承認します。よろしいですか？`)) {
            return;
        }
        
        // 承認前バックアップ
        await this.createAccountingBackup('before_bulk_approve');
        
        const result = await this.sendAccountingAjax('bulk-approve-transactions', {
            transaction_ids: selectedIds,
            approval_note: document.querySelector('#approvalNote')?.value || ''
        });
        
        if (result.success) {
            this.updateTransactionStatus(selectedIds, 'approved');
            this.updateAccountingStats(result.stats);
            this.showAccountingSuccess(`${selectedIds.length}件の取引を承認しました`);
        }
    }
    
    // === ルール管理機能 ===
    async downloadRulesCSV(target) {
        console.log('📥 記帳ルールCSVダウンロード');
        
        const result = await this.sendAccountingAjax('download-rules-csv', {
            rule_type: 'all',
            include_ai_rules: true
        });
        
        if (result.success && result.download_url) {
            this.triggerAccountingDownload(result.download_url, result.filename);
            this.showAccountingSuccess('ルールCSVをダウンロードしました');
        }
    }
    
    async saveRulesToDatabase(target) {
        console.log('💾 記帳ルールDB保存');
        
        const fileInput = document.querySelector('#rulesFileInput');
        const file = fileInput?.files[0];
        
        if (!file) {
            this.showAccountingError(new Error('ルールファイルを選択してください'), 'save_rules');
            return;
        }
        
        const formData = new FormData();
        formData.append('action', 'save-uploaded-rules-as-database');
        formData.append('rules_file', file);
        formData.append('overwrite_existing', document.querySelector('#overwriteRules')?.checked || false);
        
        const result = await this.sendAccountingFormData(formData);
        
        if (result.success) {
            this.updateRulesList(result.rules);
            this.showAccountingSuccess(`${result.saved_count}件のルールを保存しました`);
        }
    }
    
    // === 共通機能 ===
    async sendAccountingAjax(action, data) {
        const formData = new FormData();
        formData.append('action', action);
        formData.append('csrf_token', this.getCSRFToken());
        
        Object.entries(data || {}).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                formData.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
            }
        });
        
        const response = await fetch(window.location.pathname, {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            body: formData
        });
        
        return await response.json();
    }
    
    async sendAccountingFormData(formData) {
        formData.append('csrf_token', this.getCSRFToken());
        
        const response = await fetch(window.location.pathname, {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            body: formData
        });
        
        return await response.json();
    }
    
    showAccountingLoading(element, message = '処理中...') {
        element.disabled = true;
        element.innerHTML = `⟳ ${message}`;
        element.style.opacity = '0.7';
    }
    
    hideAccountingLoading(element) {
        element.disabled = false;
        element.style.opacity = '1';
        // 元のテキストを復元（data-original-textから）
        const originalText = element.getAttribute('data-original-text') || element.textContent;
        element.innerHTML = originalText;
    }
    
    showAccountingSuccess(message) {
        this.showAccountingToast('success', message);
    }
    
    showAccountingError(error, context) {
        const message = error.message || String(error);
        this.showAccountingToast('error', `エラー: ${message}`);
        console.error(`❌ 記帳エラー [${context}]:`, error);
    }
    
    showAccountingToast(type, message) {
        // 既存のtoast表示機能を活用
        if (window.KICHO_UI_CONTROLLER) {
            window.KICHO_UI_CONTROLLER.showMessage(type, message);
        } else {
            // フォールバック
            alert(`${type}: ${message}`);
        }
    }
    
    // === データ取得・更新機能 ===
    getSelectedTransactionIds() {
        const checkboxes = document.querySelectorAll('input[name="selected_transactions[]"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }
    
    getCurrentTransactions() {
        // 現在表示されている取引データを取得
        const rows = document.querySelectorAll('[data-transaction-id]');
        return Array.from(rows).map(row => ({
            id: row.getAttribute('data-transaction-id'),
            description: row.querySelector('.transaction-description')?.textContent,
            amount: row.querySelector('.transaction-amount')?.textContent,
            category: row.querySelector('.transaction-category')?.textContent
        }));
    }
    
    updateTransactionList(transactions) {
        const listElement = document.querySelector('#transactionsList');
        if (listElement && transactions) {
            // 新しい取引リストでHTMLを更新
            listElement.innerHTML = transactions.html || '';
        }
    }
    
    updateAccountingStats(stats) {
        if (!stats) return;
        
        Object.entries(stats).forEach(([key, value]) => {
            const element = document.querySelector(`[data-stat="${key}"]`);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    async createAccountingBackup(reason) {
        console.log(`💾 記帳バックアップ作成: ${reason}`);
        
        try {
            await this.sendAccountingAjax('execute-full-backup', {
                backup_reason: reason,
                backup_type: 'accounting_data'
            });
        } catch (error) {
            console.warn('⚠️ バックアップ失敗:', error);
        }
    }
    
    triggerAccountingDownload(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'accounting_data.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    getCSRFToken() {
        return document.querySelector('meta[name="csrf-token"]')?.content || '';
    }
    
    getMFDateRange() {
        // MF取得期間の設定を取得
        const startDate = document.querySelector('#mfStartDate')?.value;
        const endDate = document.querySelector('#mfEndDate')?.value;
        
        return {
            start_date: startDate || new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0],
            end_date: endDate || new Date().toISOString().split('T')[0]
        };
    }
}

// グローバル初期化
document.addEventListener('DOMContentLoaded', function() {
    // KICHOページでのみ初期化
    if (window.location.href.includes('kicho') || 
        document.body?.getAttribute('data-page') === 'kicho_content') {
        
        console.log('🎯 KICHO記帳専用ページ検出');
        window.KICHO_ACCOUNTING_HOOKS = new KichoAccountingHooks();
    }
});