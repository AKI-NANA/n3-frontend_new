
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
 * 🎯 kicho.js - 記帳自動化ツール専用JavaScript
 * common/js/kicho.js
 * 
 * ✅ NAGANO-3統合システム対応
 * ✅ PHP化完全対応
 * ✅ 全クリックイベント対応
 * ✅ エラーハンドリング強化
 * 
 * @package NAGANO3\Kicho\JavaScript
 * @version 1.0.0
 * @author NAGANO-3 Development Team
 */

"use strict";

console.log("🎯 NAGANO-3 kicho.js 読み込み開始");

// 基本名前空間確保
window.NAGANO3 = window.NAGANO3 || {};

// 記帳システムクラス定義
class KichoSystem {
    constructor() {
        this.config = {
            ajaxUrl: window.location.href,
            version: '1.0.0',
            debug: true,
            timeouts: {
                default: 30000,
                upload: 60000,
                learning: 120000
            }
        };
        
        this.state = {
            initialized: false,
            isProcessing: false,
            selectedDataCount: 0,
            approvalCount: 0,
            mfSendCount: 0,
            autoRefreshEnabled: false,
            autoRefreshInterval: null
        };
        
        this.elements = {};
        this.data = {
            importedItems: [],
            savedRules: [],
            approvedTransactions: [],
            aiSessions: []
        };
        
        console.log('🎯 記帳システム初期化開始');
    }
    
    // =====================================
    // 初期化・基本機能
    // =====================================
    
    /**
     * システム初期化
     */
    async init() {
        try {
            // 依存関係チェック
            if (!window.NAGANO3.ajax) {
                throw new Error('NAGANO3.ajax が利用できません');
            }
            
            this.cacheElements();
            this.setupEventListeners();
            await this.loadInitialData();
            this.updateLastUpdateTime();
            this.state.initialized = true;
            
            console.log('✅ 記帳システム初期化完了');
            this.showNotification('success', '記帳システムが正常に初期化されました');
        } catch (error) {
            console.error('❌ 記帳システム初期化エラー:', error);
            this.showNotification('error', `初期化エラー: ${error.message}`);
        }
    }
    
    /**
     * DOM要素キャッシュ
     */
    cacheElements() {
        // 統計要素
        this.elements.pendingCount = document.getElementById('pending-count');
        this.elements.confirmedRules = document.getElementById('confirmed-rules');
        this.elements.automationRate = document.getElementById('automation-rate');
        this.elements.errorCount = document.getElementById('error-count');
        this.elements.monthlyCount = document.getElementById('monthly-count');
        
        // データカウント要素
        this.elements.mfDataCount = document.getElementById('mfDataCount');
        this.elements.csvDataCount = document.getElementById('csvDataCount');
        this.elements.textDataCount = document.getElementById('textDataCount');
        this.elements.selectedDataCount = document.getElementById('selectedDataCount');
        
        // AI学習関連
        this.elements.learningDataCount = document.getElementById('learningDataCount');
        this.elements.estimatedRules = document.getElementById('estimatedRules');
        this.elements.estimatedTime = document.getElementById('estimatedTime');
        
        // 承認関連
        this.elements.approvalCount = document.getElementById('approvalCount');
        this.elements.mfSendCount = document.getElementById('mfSendCount');
        this.elements.errorPrediction = document.getElementById('errorPrediction');
        
        // 最終更新時刻
        this.elements.lastUpdateTime = document.getElementById('lastUpdateTime');
        
        // ファイル入力
        this.elements.csvFileInput = document.getElementById('csvFileInput');
        this.elements.rulesCSVInput = document.getElementById('rulesCSVInput');
        this.elements.approvalCSVInput = document.getElementById('approvalCSVInput');
        
        console.log('📦 DOM要素キャッシュ完了');
    }
    
    /**
     * イベントリスナー設定（全クリックイベント対応）
     */
    setupEventListeners() {
        // data-action属性を持つ全要素の一括イベント設定
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action]');
            if (!target) return;
            
            event.preventDefault();
            const action = target.getAttribute('data-action');
            this.handleAction(action, target, event);
        });
        
        // フォーム送信イベント
        document.addEventListener('submit', (event) => {
            const form = event.target.closest('[data-form]');
            if (!form) return;
            
            event.preventDefault();
            const formType = form.getAttribute('data-form');
            this.handleFormSubmit(formType, form, event);
        });
        
        // チェックボックス変更イベント
        document.addEventListener('change', (event) => {
            if (event.target.matches('[data-checkbox="data-item"]')) {
                this.updateSelectedCount();
            }
        });
        
        // ファイル選択イベント
        if (this.elements.csvFileInput) {
            this.elements.csvFileInput.addEventListener('change', (event) => {
                this.handleCSVUpload(event);
            });
        }
        
        if (this.elements.rulesCSVInput) {
            this.elements.rulesCSVInput.addEventListener('change', (event) => {
                this.handleRulesCSVUpload(event);
            });
        }
        
        if (this.elements.approvalCSVInput) {
            this.elements.approvalCSVInput.addEventListener('change', (event) => {
                this.handleApprovalCSVUpload(event);
            });
        }
        
        // ドラッグ&ドロップイベント
        this.setupDragAndDropListeners();
        
        console.log('🎯 イベントリスナー設定完了');
    }
    
    /**
     * アクション統一ハンドラー
     */
    async handleAction(action, element, event) {
        if (this.state.isProcessing) {
            this.showNotification('warning', '処理中です。しばらくお待ちください。');
            return;
        }
        
        try {
            console.log(`🎯 アクション実行: ${action}`);
            
            switch (action) {
                // ヘッダーアクション
                case 'refresh-all':
                    await this.refreshAllData();
                    break;
                case 'toggle-auto-refresh':
                    this.toggleAutoRefresh();
                    break;
                
                // データ取り込み関連
                case 'show-import-history':
                    await this.showImportHistory();
                    break;
                case 'execute-mf-import':
                    await this.executeMFImport();
                    break;
                case 'show-mf-history':
                    await this.showMFHistory();
                    break;
                case 'execute-mf-recovery':
                    await this.executeMFRecovery();
                    break;
                case 'csv-upload':
                    this.triggerCSVUpload();
                    break;
                case 'process-csv-upload':
                    await this.processCSVUpload();
                    break;
                case 'show-duplicate-history':
                    await this.showDuplicateHistory();
                    break;
                case 'add-text-to-learning':
                    await this.addTextToLearningData();
                    break;
                case 'show-ai-learning-history':
                    await this.showAILearningHistory();
                    break;
                case 'show-optimization-suggestions':
                    await this.showOptimizationSuggestions();
                    break;
                
                // データ操作
                case 'select-all-imported-data':
                    this.selectAllImportedData();
                    break;
                case 'select-by-date-range':
                    await this.selectByDateRange();
                    break;
                case 'select-by-source':
                    this.selectBySource(element.getAttribute('data-source'));
                    break;
                case 'delete-selected-data':
                    await this.deleteSelectedData();
                    break;
                case 'delete-data-item':
                    await this.deleteDataItem(element.getAttribute('data-item-id'));
                    break;
                
                // AI学習
                case 'execute-integrated-ai-learning':
                    await this.executeIntegratedAILearning();
                    break;
                
                // ルール管理
                case 'download-rules-csv':
                case 'download-all-rules-csv':
                    await this.downloadRulesCSV();
                    break;
                case 'create-new-rule':
                    await this.createNewRule();
                    break;
                case 'rules-csv-upload':
                    this.triggerRulesCSVUpload();
                    break;
                case 'save-uploaded-rules-as-database':
                    await this.saveUploadedRulesAsDatabase();
                    break;
                
                // 保存済みルール操作
                case 'edit-saved-rule':
                    await this.editSavedRule(element.getAttribute('data-rule-id'));
                    break;
                case 'delete-saved-rule':
                    await this.deleteSavedRule(element.getAttribute('data-rule-id'));
                    break;
                
                // 承認関連
                case 'download-pending-csv':
                case 'download-pending-transactions-csv':
                    await this.downloadPendingCSV();
                    break;
                case 'approval-csv-upload':
                    this.triggerApprovalCSVUpload();
                    break;
                case 'bulk-approve-transactions':
                    await this.bulkApproveTransactions();
                    break;
                
                // 承認済み取引操作
                case 'view-transaction-details':
                    await this.viewTransactionDetails(element.getAttribute('data-transaction-id'));
                    break;
                case 'delete-approved-transaction':
                    await this.deleteApprovedTransaction(element.getAttribute('data-transaction-id'));
                    break;
                
                // AI履歴
                case 'refresh-ai-history':
                    await this.refreshAIHistory();
                    break;
                case 'load-more-sessions':
                    await this.loadMoreSessions();
                    break;
                
                // エクスポート・送信
                case 'execute-full-backup':
                    await this.executeFullBackup();
                    break;
                case 'export-to-mf':
                    await this.exportToMF();
                    break;
                case 'create-manual-backup':
                    await this.createManualBackup();
                    break;
                case 'generate-advanced-report':
                    await this.generateAdvancedReport();
                    break;
                
                default:
                    console.warn(`⚠️ 未定義のアクション: ${action}`);
                    this.showNotification('warning', `未定義のアクション: ${action}`);
            }
        } catch (error) {
            console.error(`❌ アクション実行エラー [${action}]:`, error);
            this.showNotification('error', `処理エラー: ${error.message}`);
        }
    }
    
    /**
     * フォーム送信ハンドラー
     */
    async handleFormSubmit(formType, form, event) {
        try {
            console.log(`📝 フォーム送信: ${formType}`);
            
            const formData = new FormData(form);
            
            switch (formType) {
                case 'mf-import':
                    await this.submitMFImportForm(formData);
                    break;
                case 'csv-upload':
                    await this.submitCSVUploadForm(formData);
                    break;
                case 'ai-text-learning':
                    await this.submitAITextLearningForm(formData);
                    break;
                case 'report-generation':
                    await this.submitReportGenerationForm(formData);
                    break;
                default:
                    console.warn(`⚠️ 未定義のフォーム: ${formType}`);
            }
        } catch (error) {
            console.error(`❌ フォーム送信エラー [${formType}]:`, error);
            this.showNotification('error', `フォーム送信エラー: ${error.message}`);
        }
    }
    
    // =====================================
    // データ管理・更新機能
    // =====================================
    
    /**
     * 初期データ読み込み
     */
    async loadInitialData() {
        try {
            const response = await this.ajaxRequest('POST', {
                action: 'load_initial_data'
            });
            
            if (response.success) {
                this.updateStatistics(response.data.statistics);
                this.updateDataCounts(response.data.data_counts);
                this.data.importedItems = response.data.imported_items || [];
                this.data.savedRules = response.data.saved_rules || [];
                this.data.approvedTransactions = response.data.approved_transactions || [];
                this.data.aiSessions = response.data.ai_sessions || [];
            }
        } catch (error) {
            console.error('❌ 初期データ読み込みエラー:', error);
        }
    }
    
    /**
     * 全データ更新
     */
    async refreshAllData() {
        this.state.isProcessing = true;
        this.showNotification('info', '全データ更新を開始しています...');
        
        try {
            const response = await this.ajaxRequest('POST', {
                action: 'refresh_all_data'
            });
            
            if (response.success) {
                await this.loadInitialData();
                this.updateLastUpdateTime();
                this.showNotification('success', '全データの更新が完了しました');
            } else {
                throw new Error(response.message || 'データ更新に失敗しました');
            }
        } catch (error) {
            console.error('❌ データ更新エラー:', error);
            this.showNotification('error', `データ更新エラー: ${error.message}`);
        } finally {
            this.state.isProcessing = false;
        }
    }
    
    /**
     * 自動更新切り替え
     */
    toggleAutoRefresh() {
        const btn = document.querySelector('[data-action="toggle-auto-refresh"]');
        if (!btn) return;
        
        if (this.state.autoRefreshEnabled) {
            // 自動更新停止
            if (this.state.autoRefreshInterval) {
                clearInterval(this.state.autoRefreshInterval);
                this.state.autoRefreshInterval = null;
            }
            this.state.autoRefreshEnabled = false;
            btn.innerHTML = '<i class="fas fa-play"></i> 自動更新開始';
            btn.className = 'kicho__btn kicho__btn--success';
            this.showNotification('info', '自動更新を停止しました');
        } else {
            // 自動更新開始
            this.state.autoRefreshInterval = setInterval(() => {
                this.refreshAllData();
            }, 60000); // 1分間隔
            this.state.autoRefreshEnabled = true;
            btn.innerHTML = '<i class="fas fa-stop"></i> 自動更新停止';
            btn.className = 'kicho__btn kicho__btn--warning';
            this.showNotification('success', '自動更新を開始しました（1分間隔）');
        }
    }
    
    /**
     * 最終更新時刻更新
     */
    updateLastUpdateTime() {
        if (!this.elements.lastUpdateTime) return;
        
        const now = new Date();
        const timeString = now.getFullYear() + '-' + 
            String(now.getMonth() + 1).padStart(2, '0') + '-' + 
            String(now.getDate()).padStart(2, '0') + ' ' + 
            String(now.getHours()).padStart(2, '0') + ':' + 
            String(now.getMinutes()).padStart(2, '0');
        
        this.elements.lastUpdateTime.textContent = timeString;
    }
    
    /**
     * 統計データ更新
     */
    updateStatistics(stats) {
        if (!stats) return;
        
        this.safeSetText(this.elements.pendingCount, `${stats.pending_count || 0}件`);
        this.safeSetText(this.elements.confirmedRules, `${stats.confirmed_rules || 0}件`);
        this.safeSetText(this.elements.automationRate, `${stats.automation_rate || 0}%`);
        this.safeSetText(this.elements.errorCount, `${stats.error_count || 0}件`);
        this.safeSetText(this.elements.monthlyCount, `${stats.monthly_count || 0}件`);
    }
    
    /**
     * データカウント更新
     */
    updateDataCounts(counts) {
        if (!counts) return;
        
        this.safeSetText(this.elements.mfDataCount, counts.mf_data || 0);
        this.safeSetText(this.elements.csvDataCount, counts.csv_data || 0);
        this.safeSetText(this.elements.textDataCount, counts.text_data || 0);
    }
    
    // =====================================
    // MFクラウド連携機能
    // =====================================
    
    /**
     * MFインポート実行
     */
    async executeMFImport() {
        this.state.isProcessing = true;
        
        try {
            const startDate = document.getElementById('mfStartDate')?.value;
            const endDate = document.getElementById('mfEndDate')?.value;
            const purpose = document.getElementById('mfPurpose')?.value;
            
            if (!startDate || !endDate) {
                throw new Error('取得期間を入力してください');
            }
            
            this.showNotification('info', `MFクラウドからデータを取得しています... (${startDate}〜${endDate})`);
            
            const response = await this.ajaxRequest('POST', {
                action: 'execute_mf_import',
                start_date: startDate,
                end_date: endDate,
                purpose: purpose
            }, this.config.timeouts.upload);
            
            if (response.success) {
                this.showNotification('success', `MFデータの取得が完了しました (${purpose})`);
                await this.loadInitialData();
            } else {
                throw new Error(response.message || 'MFデータ取得に失敗しました');
            }
        } catch (error) {
            console.error('❌ MFインポートエラー:', error);
            this.showNotification('error', `MFデータ取得エラー: ${error.message}`);
        } finally {
            this.state.isProcessing = false;
        }
    }
    
    /**
     * MFインポートフォーム送信
     */
    async submitMFImportForm(formData) {
        // フォーム用の処理は executeMFImport と同じロジックを使用
        await this.executeMFImport();
    }
    
    /**
     * MF履歴表示
     */
    async showMFHistory() {
        try {
            const response = await this.ajaxRequest('POST', {
                action: 'get_mf_history'
            });
            
            if (response.success) {
                this.showModal('MF連携履歴', this.renderMFHistory(response.data));
            } else {
                throw new Error(response.message || 'MF履歴取得に失敗しました');
            }
        } catch (error) {
            console.error('❌ MF履歴表示エラー:', error);
            this.showNotification('error', `MF履歴表示エラー: ${error.message}`);
        }
    }
    
    /**
     * MF自動復旧実行
     */
    async executeMFRecovery() {
        if (!confirm('MF自動復旧を実行しますか？')) return;
        
        this.state.isProcessing = true;
        
        try {
            this.showNotification('info', 'MF自動復旧を実行しています...');
            
            const response = await this.ajaxRequest('POST', {
                action: 'execute_mf_recovery'
            }, this.config.timeouts.default);
            
            if (response.success) {
                this.showNotification('success', 'MF自動復旧が完了しました');
                await this.loadInitialData();
            } else {
                throw new Error(response.message || 'MF自動復旧に失敗しました');
            }
        } catch (error) {
            console.error('❌ MF自動復旧エラー:', error);
            this.showNotification('error', `MF自動復旧エラー: ${error.message}`);
        } finally {
            this.state.isProcessing = false;
        }
    }
    
    // =====================================
    // CSVアップロード機能
    // =====================================
    
    /**
     * CSVアップロードトリガー
     */
    triggerCSVUpload() {
        if (this.elements.csvFileInput) {
            this.elements.csvFileInput.click();
        }
    }
    
    /**
     * CSVアップロード処理
     */
    async handleCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showNotification('error', 'CSVファイルを選択してください');
            return;
        }
        
        this.showNotification('info', `CSVファイル「${file.name}」の処理を開始しています...`);
        
        try {
            const formData = new FormData();
            formData.append('csv_file', file);
            formData.append('action', 'handle_csv_upload');
            
            const response = await this.ajaxRequest('POST', formData, this.config.timeouts.upload);
            
            if (response.success) {
                this.showNotification('success', `CSVファイル「${file.name}」のアップロードが完了しました`);
                await this.loadInitialData();
            } else {
                throw new Error(response.message || 'CSVアップロードに失敗しました');
            }
        } catch (error) {
            console.error('❌ CSVアップロードエラー:', error);
            this.showNotification('error', `CSVアップロードエラー: ${error.message}`);
        }
        
        // ファイル入力をリセット
        event.target.value = '';
    }
    
    /**
     * CSV重複チェック&アップロード
     */
    async processCSVUpload() {
        try {
            const strategy = document.getElementById('duplicateStrategy')?.value;
            const resolution = document.getElementById('resolutionStrategy')?.value;
            
            if (!strategy || !resolution) {
                throw new Error('重複検出方式と解決方法を選択してください');
            }
            
            this.showNotification('info', `重複チェックを実行しています... (${strategy}, ${resolution})`);
            
            const response = await this.ajaxRequest('POST', {
                action: 'process_csv_duplicate_check',
                duplicate_strategy: strategy,
                resolution_strategy: resolution
            });
            
            if (response.success) {
                this.showNotification('success', '重複チェック＆アップロードが完了しました');
                await this.loadInitialData();
            } else {
                throw new Error(response.message || '重複チェック処理に失敗しました');
            }
        } catch (error) {
            console.error('❌ CSV重複チェックエラー:', error);
            this.showNotification('error', `重複チェックエラー: ${error.message}`);
        }
    }
    
    /**
     * CSVフォーム送信
     */
    async submitCSVUploadForm(formData) {
        // CSV関連のフォーム処理
        await this.processCSVUpload();
    }
    
    /**
     * 重複処理履歴表示
     */
    async showDuplicateHistory() {
        try {
            const response = await this.ajaxRequest('POST', {
                action: 'get_duplicate_history'
            });
            
            if (response.success) {
                this.showModal('重複処理履歴', this.renderDuplicateHistory(response.data));
            } else {
                throw new Error(response.message || '重複処理履歴取得に失敗しました');
            }
        } catch (error) {
            console.error('❌ 重複処理履歴表示エラー:', error);
            this.showNotification('error', `重複処理履歴表示エラー: ${error.message}`);
        }
    }
    
    // =====================================
    // AI学習機能
    // =====================================
    
    /**
     * AIテキスト学習データ追加
     */
    async addTextToLearningData() {
        try {
            const textInput = document.getElementById('aiTextInput');
            const learningMode = document.getElementById('learningMode')?.value;
            const ruleCategory = document.getElementById('ruleCategory')?.value;
            
            if (!textInput || !textInput.value.trim()) {
                throw new Error('学習テキストを入力してください');
            }
            
            this.showNotification('info', `AI学習データに追加しています... (${learningMode}, ${ruleCategory})`);
            
            const response = await this.ajaxRequest('POST', {
                action: 'add_text_to_learning',
                learning_text: textInput.value.trim(),
                learning_mode: learningMode,
                rule_category: ruleCategory
            });
            
            if (response.success) {
                this.showNotification('success', 'AI学習データに追加されました');
                textInput.value = '';
                await this.loadInitialData();
            } else {
                throw new Error(response.message || 'AI学習データ追加に失敗しました');
            }
        } catch (error) {
            console.error('❌ AI学習データ追加エラー:', error);
            this.showNotification('error', `AI学習データ追加エラー: ${error.message}`);
        }
    }
    
    /**
     * AIテキスト学習フォーム送信
     */
    async submitAITextLearningForm(formData) {
        await this.addTextToLearningData();
    }
    
    /**
     * 統合AI学習実行
     */
    async executeIntegratedAILearning() {
        try {
            const mode = document.getElementById('integratedLearningMode')?.value;
            const selectedCount = this.state.selectedDataCount;
            
            if (selectedCount === 0) {
                throw new Error('学習するデータを選択してください');
            }
            
            if (!confirm(`${selectedCount}件のデータでAI学習を実行しますか？\n\n推定処理時間: 約${Math.ceil(selectedCount * 0.5)}分`)) {
                return;
            }
            
            this.state.isProcessing = true;
            this.showNotification('info', `統合AI学習を実行しています... (${mode}, ${selectedCount}件のデータ)`);
            
            const selectedItems = this.getSelectedDataItems();
            
            const response = await this.ajaxRequest('POST', {
                action: 'execute_integrated_ai_learning',
                learning_mode: mode,
                selected_items: selectedItems
            }, this.config.timeouts.learning);
            
            if (response.success) {
                this.showNotification('success', `統合AI学習が完了しました (${selectedCount}件のデータから新しいルールを生成)`);
                await this.loadInitialData();
                // 選択解除
                this.clearAllSelections();
            } else {
                throw new Error(response.message || '統合AI学習に失敗しました');
            }
        } catch (error) {
            console.error('❌ 統合AI学習エラー:', error);
            this.showNotification('error', `統合AI学習エラー: ${error.message}`);
        } finally {
            this.state.isProcessing = false;
        }
    }
    
    /**
     * AI学習履歴表示
     */
    async showAILearningHistory() {
        try {
            const response = await this.ajaxRequest('POST', {
                action: 'get_ai_learning_history'
            });
            
            if (response.success) {
                this.showModal('AI学習履歴・分析', this.renderAILearningHistory(response.data));
            } else {
                throw new Error(response.message || 'AI学習履歴取得に失敗しました');
            }
        } catch (error) {
            console.error('❌ AI学習履歴表示エラー:', error);
            this.showNotification('error', `AI学習履歴表示エラー: ${error.message}`);
        }
    }
    
    /**
     * 最適化提案表示
     */
    async showOptimizationSuggestions() {
        try {
            const response = await this.ajaxRequest('POST', {
                action: 'get_optimization_suggestions'
            });
            
            if (response.success) {
                this.showModal('最適化提案', this.renderOptimizationSuggestions(response.data));
            } else {
                throw new Error(response.message || '最適化提案取得に失敗しました');
            }
        } catch (error) {
            console.error('❌ 最適化提案表示エラー:', error);
            this.showNotification('error', `最適化提案表示エラー: ${error.message}`);
        }
    }
    
    // =====================================
    // データ選択・操作機能
    // =====================================
    
    /**
     * 選択データ数更新
     */
    updateSelectedCount() {
        try {
            const checkboxes = document.querySelectorAll('[data-checkbox="data-item"]:checked');
            const count = checkboxes.length;
            this.state.selectedDataCount = count;
            
            this.safeSetText(this.elements.selectedDataCount, count);
            this.safeSetText(this.elements.learningDataCount, `${count}件選択中`);
            
            // 推定値の更新
            const estimatedRules = count === 0 ? '0-0件' : `${Math.ceil(count * 0.3)}-${Math.ceil(count * 0.7)}件`;
            const estimatedTime = count === 0 ? '未選択' : `約${Math.ceil(count * 0.5)}分`;
            
            this.safeSetText(this.elements.estimatedRules, estimatedRules);
            this.safeSetText(this.elements.estimatedTime, estimatedTime);
        } catch (error) {
            console.error('❌ 選択データ数更新エラー:', error);
        }
    }
    
    /**
     * 全データ選択
     */
    selectAllImportedData() {
        try {
            const checkboxes = document.querySelectorAll('[data-checkbox="data-item"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
            this.updateSelectedCount();
            this.showNotification('success', '全てのデータを選択しました');
        } catch (error) {
            console.error('❌ 全データ選択エラー:', error);
            this.showNotification('error', '全選択でエラーが発生しました');
        }
    }
    
    /**
     * 期間選択
     */
    async selectByDateRange() {
        try {
            const startDate = prompt('開始日を入力してください (YYYY-MM-DD):');
            const endDate = prompt('終了日を入力してください (YYYY-MM-DD):');
            
            if (!startDate || !endDate) {
                this.showNotification('warning', '期間が入力されませんでした');
                return;
            }
            
            // 期間に該当するデータアイテムを選択
            const dataItems = document.querySelectorAll('.kicho__data-item');
            let selectedCount = 0;
            
            dataItems.forEach(item => {
                const checkbox = item.querySelector('[data-checkbox="data-item"]');
                const detailsText = item.querySelector('.kicho__data-details')?.textContent || '';
                
                // 簡易的な日付マッチング（実際のプロジェクトではより厳密に）
                if (detailsText.includes(startDate.substr(0, 7)) || detailsText.includes(endDate.substr(0, 7))) {
                    checkbox.checked = true;
                    selectedCount++;
                } else {
                    checkbox.checked = false;
                }
            });
            
            this.updateSelectedCount();
            this.showNotification('success', `期間選択: ${selectedCount}件のデータを選択しました`);
        } catch (error) {
            console.error('❌ 期間選択エラー:', error);
            this.showNotification('error', '期間選択でエラーが発生しました');
        }
    }
    
    /**
     * ソース別選択
     */
    selectBySource(source) {
        try {
            const checkboxes = document.querySelectorAll('[data-checkbox="data-item"]');
            let selectedCount = 0;
            
            checkboxes.forEach(checkbox => {
                const item = checkbox.closest('.kicho__data-item');
                if (item && item.dataset.source === source) {
                    checkbox.checked = true;
                    selectedCount++;
                } else {
                    checkbox.checked = false;
                }
            });
            
            this.updateSelectedCount();
            this.showNotification('success', `${source}データのみを選択しました (${selectedCount}件)`);
        } catch (error) {
            console.error('❌ ソース別選択エラー:', error);
            this.showNotification('error', 'データ選択でエラーが発生しました');
        }
    }
    
    /**
     * 選択データ削除
     */
    async deleteSelectedData() {
        try {
            const selectedCount = this.state.selectedDataCount;
            if (selectedCount === 0) {
                throw new Error('削除するデータを選択してください');
            }
            
            if (!confirm(`選択した${selectedCount}件のデータを削除しますか？`)) {
                return;
            }
            
            this.showNotification('info', `${selectedCount}件のデータを削除しています...`);
            
            const selectedItems = this.getSelectedDataItems();
            
            const response = await this.ajaxRequest('POST', {
                action: 'delete_selected_data',
                selected_items: selectedItems
            });
            
            if (response.success) {
                this.showNotification('success', `${selectedCount}件のデータを削除しました`);
                await this.loadInitialData();
                this.clearAllSelections();
            } else {
                throw new Error(response.message || 'データ削除に失敗しました');
            }
        } catch (error) {
            console.error('❌ 選択データ削除エラー:', error);
            this.showNotification('error', `データ削除エラー: ${error.message}`);
        }
    }
    
    /**
     * 個別データ削除
     */
    async deleteDataItem(itemId) {
        try {
            const item = document.querySelector(`[data-item-id="${itemId}"]`);
            if (!item) {
                throw new Error('削除対象のデータが見つかりません');
            }
            
            const name = item.querySelector('.kicho__data-name')?.textContent || 'データ';
            if (!confirm(`「${name}」を削除しますか？`)) {
                return;
            }
            
            const response = await this.ajaxRequest('POST', {
                action: 'delete_data_item',
                item_id: itemId
            });
            
            if (response.success) {
                item.remove();
                this.showNotification('success', `「${name}」を削除しました`);
                this.updateSelectedCount();
                await this.loadInitialData();
            } else {
                throw new Error(response.message || 'データ削除に失敗しました');
            }
        } catch (error) {
            console.error('❌ データ削除エラー:', error);
            this.showNotification('error', `データ削除エラー: ${error.message}`);
        }
    }
    
    /**
     * 選択データアイテム取得
     */
    getSelectedDataItems() {
        const selectedItems = [];
        const checkedBoxes = document.querySelectorAll('[data-checkbox="data-item"]:checked');
        
        checkedBoxes.forEach(checkbox => {
            const item = checkbox.closest('.kicho__data-item');
            if (item) {
                selectedItems.push({
                    id: item.dataset.itemId,
                    source: item.dataset.source,
                    name: item.querySelector('.kicho__data-name')?.textContent || ''
                });
            }
        });
        
        return selectedItems;
    }
    
    /**
     * 全選択解除
     */
    clearAllSelections() {
        const checkboxes = document.querySelectorAll('[data-checkbox="data-item"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateSelectedCount();
    }
    
    // =====================================
    // ルール管理機能
    // =====================================
    
    /**
     * ルールCSVダウンロード
     */
    async downloadRulesCSV() {
        try {
            this.showNotification('info', 'ルールCSVファイルを生成しています...');
            
            const response = await this.ajaxRequest('POST', {
                action: 'download_rules_csv'
            });
            
            if (response.success) {
                this.downloadFile(response.data.csv_content, response.data.filename, 'text/csv');
                this.showNotification('success', 'ルールCSVファイルのダウンロードを開始しました');
            } else {
                throw new Error(response.message || 'ルールCSVダウンロードに失敗しました');
            }
        } catch (error) {
            console.error('❌ ルールCSVダウンロードエラー:', error);
            this.showNotification('error', `ルールCSVダウンロードエラー: ${error.message}`);
        }
    }
    
    /**
     * 新規ルール作成
     */
    async createNewRule() {
        try {
            const response = await this.ajaxRequest('POST', {
                action: 'create_new_rule'
            });
            
            if (response.success) {
                this.showModal('新規ルール作成', this.renderNewRuleForm(response.data));
            } else {
                throw new Error(response.message || '新規ルール作成画面の表示に失敗しました');
            }
        } catch (error) {
            console.error('❌ 新規ルール作成エラー:', error);
            this.showNotification('error', `新規ルール作成エラー: ${error.message}`);
        }
    }
    
    /**
     * ルールCSVアップロードトリガー
     */
    triggerRulesCSVUpload() {
        if (this.elements.rulesCSVInput) {
            this.elements.rulesCSVInput.click();
        }
    }
    
    /**
     * ルールCSVアップロード処理
     */
    async handleRulesCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showNotification('error', 'CSVファイルを選択してください');
            return;
        }
        
        try {
            this.showNotification('info', `ルールCSVファイル「${file.name}」を処理しています...`);
            
            const formData = new FormData();
            formData.append('rules_csv_file', file);
            formData.append('action', 'handle_rules_csv_upload');
            
            const response = await this.ajaxRequest('POST', formData, this.config.timeouts.upload);
            
            if (response.success) {
                // アップロード後の統計を更新
                this.state.approvalCount = response.data.approval_count || 0;
                this.state.mfSendCount = response.data.mf_send_count || 0;
                
                this.safeSetText(this.elements.approvalCount, `${this.state.approvalCount}件`);
                this.safeSetText(this.elements.mfSendCount, `${this.state.mfSendCount}件`);
                this.safeSetText(this.elements.errorPrediction, `${response.data.error_prediction || 0}件`);
                
                this.showNotification('success', `ルールCSVファイル「${file.name}」の読み込みが完了しました`);
            } else {
                throw new Error(response.message || 'ルールCSVアップロードに失敗しました');
            }
        } catch (error) {
            console.error('❌ ルールCSVアップロードエラー:', error);
            this.showNotification('error', `ルールCSVアップロードエラー: ${error.message}`);
        }
        
        // ファイル入力をリセット
        event.target.value = '';
    }
    
    /**
     * アップロードルールをデータベースに保存
     */
    async saveUploadedRulesAsDatabase() {
        try {
            const saveMode = document.querySelector('input[name="rule_save_mode"]:checked')?.value;
            
            if (!saveMode) {
                throw new Error('保存モードを選択してください');
            }
            
            this.showNotification('info', `ルールをデータベースに保存しています... (${saveMode}モード)`);
            
            const response = await this.ajaxRequest('POST', {
                action: 'save_uploaded_rules_as_database',
                save_mode: saveMode
            });
            
            if (response.success) {
                this.showNotification('success', `ルールがデータベースに保存されました (${saveMode}モード)`);
                await this.loadInitialData();
            } else {
                throw new Error(response.message || 'ルール保存に失敗しました');
            }
        } catch (error) {
            console.error('❌ ルール保存エラー:', error);
            this.showNotification('error', `ルール保存エラー: ${error.message}`);
        }
    }
    
    /**
     * 保存済みルール編集
     */
    async editSavedRule(ruleId) {
        try {
            const response = await this.ajaxRequest('POST', {
                action: 'get_saved_rule_for_edit',
                rule_id: ruleId
            });
            
            if (response.success) {
                this.showModal('ルール編集', this.renderRuleEditForm(response.data));
            } else {
                throw new Error(response.message || 'ルール編集画面の表示に失敗しました');
            }
        } catch (error) {
            console.error('❌ ルール編集エラー:', error);
            this.showNotification('error', `ルール編集エラー: ${error.message}`);
        }
    }
    
    /**
     * 保存済みルール削除
     */
    async deleteSavedRule(ruleId) {
        try {
            const ruleItem = document.querySelector(`[data-rule-id="${ruleId}"]`);
            const ruleName = ruleItem?.querySelector('.kicho__saved-rule__name')?.textContent || `ルール${ruleId}`;
            
            if (!confirm(`「${ruleName}」を削除しますか？`)) {
                return;
            }
            
            this.showNotification('info', `「${ruleName}」を削除しています...`);
            
            const response = await this.ajaxRequest('POST', {
                action: 'delete_saved_rule',
                rule_id: ruleId
            });
            
            if (response.success) {
                if (ruleItem) {
                    ruleItem.remove();
                    this.updateSavedRulesCount();
                }
                this.showNotification('success', `「${ruleName}」を削除しました`);
            } else {
                throw new Error(response.message || 'ルール削除に失敗しました');
            }
        } catch (error) {
            console.error('❌ ルール削除エラー:', error);
            this.showNotification('error', `ルール削除エラー: ${error.message}`);
        }
    }
    
    // =====================================
    // 承認・取引管理機能
    // =====================================
    
    /**
     * 承認待ちCSVダウンロード
     */
    async downloadPendingCSV() {
        try {
            this.showNotification('info', '承認待ち取引CSVファイルを生成しています...');
            
            const response = await this.ajaxRequest('POST', {
                action: 'download_pending_csv'
            });
            
            if (response.success) {
                this.downloadFile(response.data.csv_content, response.data.filename, 'text/csv');
                this.showNotification('success', '承認待ち取引CSVファイルのダウンロードを開始しました');
            } else {
                throw new Error(response.message || '承認待ちCSVダウンロードに失敗しました');
            }
        } catch (error) {
            console.error('❌ 承認待ちCSVダウンロードエラー:', error);
            this.showNotification('error', `承認待ちCSVダウンロードエラー: ${error.message}`);
        }
    }
    
    /**
     * 承認CSVアップロードトリガー
     */
    triggerApprovalCSVUpload() {
        if (this.elements.approvalCSVInput) {
            this.elements.approvalCSVInput.click();
        }
    }
    
    /**
     * 承認CSVアップロード処理
     */
    async handleApprovalCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showNotification('error', 'CSVファイルを選択してください');
            return;
        }
        
        try {
            this.showNotification('info', `承認CSVファイル「${file.name}」を処理しています...`);
            
            const formData = new FormData();
            formData.append('approval_csv_file', file);
            formData.append('action', 'handle_approval_csv_upload');
            
            const response = await this.ajaxRequest('POST', formData, this.config.timeouts.upload);
            
            if (response.success) {
                // アップロード後の統計を更新
                this.state.approvalCount = response.data.approval_count || 0;
                this.state.mfSendCount = response.data.mf_send_count || 0;
                
                this.safeSetText(this.elements.approvalCount, `${this.state.approvalCount}件`);
                this.safeSetText(this.elements.mfSendCount, `${this.state.mfSendCount}件`);
                this.safeSetText(this.elements.errorPrediction, `${response.data.error_prediction || 0}件`);
                
                this.showNotification('success', `承認CSVファイル「${file.name}」の読み込みが完了しました`);
            } else {
                throw new Error(response.message || '承認CSVアップロードに失敗しました');
            }
        } catch (error) {
            console.error('❌ 承認CSVアップロードエラー:', error);
            this.showNotification('error', `承認CSVアップロードエラー: ${error.message}`);
        }
        
        // ファイル入力をリセット
        event.target.value = '';
    }
    
    /**
     * 一括承認実行
     */
    async bulkApproveTransactions() {
        try {
            const approvalCount = this.state.approvalCount;
            const mfSendCount = this.state.mfSendCount;
            
            if (approvalCount === 0) {
                throw new Error('承認するデータがありません');
            }
            
            if (!confirm(`${approvalCount}件の取引を一括承認しますか？\n\n${mfSendCount}件をMF送信待ちに追加します。`)) {
                return;
            }
            
            this.showNotification('info', `${approvalCount}件の取引を一括承認しています...`);
            
            const response = await this.ajaxRequest('POST', {
                action: 'bulk_approve_transactions',
                approval_count: approvalCount,
                mf_send_count: mfSendCount
            });
            
            if (response.success) {
                this.showNotification('success', `${approvalCount}件の取引が一括承認されました (${mfSendCount}件をMF送信待ちに追加)`);
                await this.loadInitialData();
                
                // 承認カウンターリセット
                this.state.approvalCount = 0;
                this.state.mfSendCount = 0;
                this.safeSetText(this.elements.approvalCount, '0件');
                this.safeSetText(this.elements.mfSendCount, '0件');
                this.safeSetText(this.elements.errorPrediction, '0件');
            } else {
                throw new Error(response.message || '一括承認に失敗しました');
            }
        } catch (error) {
            console.error('❌ 一括承認エラー:', error);
            this.showNotification('error', `一括承認エラー: ${error.message}`);
        }
    }
    
    /**
     * 取引詳細表示
     */
    async viewTransactionDetails(transactionId) {
        try {
            const response = await this.ajaxRequest('POST', {
                action: 'get_transaction_details',
                transaction_id: transactionId
            });
            
            if (response.success) {
                this.showModal('取引詳細', this.renderTransactionDetails(response.data));
            } else {
                throw new Error(response.message || '取引詳細取得に失敗しました');
            }
        } catch (error) {
            console.error('❌ 取引詳細表示エラー:', error);
            this.showNotification('error', `取引詳細表示エラー: ${error.message}`);
        }
    }
    
    /**
     * 承認済み取引削除
     */
    async deleteApprovedTransaction(transactionId) {
        try {
            const transactionItem = document.querySelector(`[data-transaction-id="${transactionId}"]`);
            const transactionName = transactionItem?.querySelector('.kicho__approved-transaction__name')?.textContent || `取引${transactionId}`;
            
            if (!confirm(`「${transactionName}」を削除しますか？`)) {
                return;
            }
            
            this.showNotification('info', `「${transactionName}」を削除しています...`);
            
            const response = await this.ajaxRequest('POST', {
                action: 'delete_approved_transaction',
                transaction_id: transactionId
            });
            
            if (response.success) {
                if (transactionItem) {
                    transactionItem.remove();
                    this.updateApprovedTransactionsCount();
                }
                this.showNotification('success', `「${transactionName}」を削除しました`);
            } else {
                throw new Error(response.message || '承認取引削除に失敗しました');
            }
        } catch (error) {
            console.error('❌ 承認取引削除エラー:', error);
            this.showNotification('error', `承認取引削除エラー: ${error.message}`);
        }
    }
    
    // =====================================
    // AI履歴・エクスポート機能
    // =====================================
    
    /**
     * AI履歴更新
     */
    async refreshAIHistory() {
        try {
            this.showNotification('info', 'AI学習履歴を更新しています...');
            
            const response = await this.ajaxRequest('POST', {
                action: 'refresh_ai_history'
            });
            
            if (response.success) {
                this.updateAIHistoryDisplay(response.data.sessions);
                this.showNotification('success', 'AI学習履歴を更新しました');
            } else {
                throw new Error(response.message || 'AI履歴更新に失敗しました');
            }
        } catch (error) {
            console.error('❌ AI履歴更新エラー:', error);
            this.showNotification('error', `AI履歴更新エラー: ${error.message}`);
        }
    }
    
    /**
     * AI履歴追加読み込み
     */
    async loadMoreSessions() {
        try {
            const currentCount = document.querySelectorAll('.kicho__session-item').length;
            
            const response = await this.ajaxRequest('POST', {
                action: 'load_more_ai_sessions',
                offset: currentCount
            });
            
            if (response.success) {
                this.appendAIHistoryDisplay(response.data.sessions);
                this.showNotification('info', `${response.data.sessions.length}件の履歴を追加読み込みしました`);
            } else {
                throw new Error(response.message || '履歴追加読み込みに失敗しました');
            }
        } catch (error) {
            console.error('❌ AI履歴追加読み込みエラー:', error);
            this.showNotification('error', `履歴追加読み込みエラー: ${error.message}`);
        }
    }
    
    /**
     * 完全バックアップ実行
     */
    async executeFullBackup() {
        try {
            this.showNotification('info', '完全バックアップを実行しています...');
            
            const response = await this.ajaxRequest('POST', {
                action: 'execute_full_backup'
            }, this.config.timeouts.upload);
            
            if (response.success) {
                this.downloadFile(response.data.backup_content, response.data.filename, 'application/zip');
                this.showNotification('success', '完全バックアップファイルのダウンロードを開始しました');
            } else {
                throw new Error(response.message || '完全バックアップに失敗しました');
            }
        } catch (error) {
            console.error('❌ 完全バックアップエラー:', error);
            this.showNotification('error', `完全バックアップエラー: ${error.message}`);
        }
    }
    
    /**
     * MFクラウドエクスポート
     */
    async exportToMF() {
        try {
            const exportMode = document.getElementById('exportMode')?.value;
            
            if (!confirm(`MFクラウドに送信しますか？\n\n送信モード: ${exportMode}`)) {
                return;
            }
            
            this.showNotification('info', 'MFクラウドへの送信を開始しています...');
            
            const response = await this.ajaxRequest('POST', {
                action: 'export_to_mf',
                export_mode: exportMode
            }, this.config.timeouts.upload);
            
            if (response.success) {
                this.showNotification('success', `MFクラウドへの送信が完了しました (${response.data.sent_count}件)`);
                await this.loadInitialData();
            } else {
                throw new Error(response.message || 'MFクラウド送信に失敗しました');
            }
        } catch (error) {
            console.error('❌ MFクラウドエクスポートエラー:', error);
            this.showNotification('error', `MFクラウド送信エラー: ${error.message}`);
        }
    }
    
    /**
     * 手動バックアップ作成
     */
    async createManualBackup() {
        try {
            const backupFormat = document.getElementById('backupFormat')?.value;
            
            this.showNotification('info', `手動バックアップを実行しています... (${backupFormat}形式)`);
            
            const response = await this.ajaxRequest('POST', {
                action: 'create_manual_backup',
                backup_format: backupFormat
            }, this.config.timeouts.upload);
            
            if (response.success) {
                this.downloadFile(response.data.backup_content, response.data.filename, response.data.mime_type);
                this.showNotification('success', `手動バックアップファイル(${backupFormat}形式)のダウンロードを開始しました`);
            } else {
                throw new Error(response.message || '手動バックアップに失敗しました');
            }
        } catch (error) {
            console.error('❌ 手動バックアップエラー:', error);
            this.showNotification('error', `手動バックアップエラー: ${error.message}`);
        }
    }
    
    /**
     * 拡張レポート生成
     */
    async generateAdvancedReport() {
        try {
            const reportType = document.getElementById('reportType')?.value;
            const reportFormat = document.getElementById('reportFormat')?.value;
            const startDate = document.getElementById('reportStartDate')?.value;
            const endDate = document.getElementById('reportEndDate')?.value;
            
            if (!startDate || !endDate) {
                throw new Error('レポート期間を入力してください');
            }
            
            this.showNotification('info', `拡張レポートを生成しています... (${reportType}, ${reportFormat}形式, ${startDate}〜${endDate})`);
            
            const response = await this.ajaxRequest('POST', {
                action: 'generate_advanced_report',
                report_type: reportType,
                report_format: reportFormat,
                start_date: startDate,
                end_date: endDate
            }, this.config.timeouts.upload);
            
            if (response.success) {
                this.downloadFile(response.data.report_content, response.data.filename, response.data.mime_type);
                this.showNotification('success', `拡張レポート(${reportFormat}形式)の生成が完了しました`);
            } else {
                throw new Error(response.message || 'レポート生成に失敗しました');
            }
        } catch (error) {
            console.error('❌ 拡張レポート生成エラー:', error);
            this.showNotification('error', `レポート生成エラー: ${error.message}`);
        }
    }
    
    /**
     * レポート生成フォーム送信
     */
    async submitReportGenerationForm(formData) {
        await this.generateAdvancedReport();
    }
    
    // =====================================
    // 履歴表示機能
    // =====================================
    
    /**
     * 取り込み履歴表示
     */
    async showImportHistory() {
        try {
            const response = await this.ajaxRequest('POST', {
                action: 'get_import_history'
            });
            
            if (response.success) {
                this.showModal('取り込み履歴', this.renderImportHistory(response.data));
            } else {
                throw new Error(response.message || '取り込み履歴取得に失敗しました');
            }
        } catch (error) {
            console.error('❌ 取り込み履歴表示エラー:', error);
            this.showNotification('error', `取り込み履歴表示エラー: ${error.message}`);
        }
    }
    
    // =====================================
    // ドラッグ&ドロップ機能
    // =====================================
    
    /**
     * ドラッグ&ドロップリスナー設定
     */
    setupDragAndDropListeners() {
        const uploadAreas = document.querySelectorAll('.kicho__upload-area');
        
        uploadAreas.forEach(area => {
            area.addEventListener('dragover', this.handleDragOver.bind(this));
            area.addEventListener('dragleave', this.handleDragLeave.bind(this));
            area.addEventListener('drop', this.handleDrop.bind(this));
        });
    }
    
    /**
     * ドラッグオーバー処理
     */
    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.style.borderColor = 'var(--kicho-primary)';
        event.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
    }
    
    /**
     * ドラッグリーブ処理
     */
    handleDragLeave(event) {
        event.preventDefault();
        event.currentTarget.style.borderColor = 'var(--border-color)';
        event.currentTarget.style.background = 'var(--bg-primary)';
    }
    
    /**
     * ドロップ処理
     */
    async handleDrop(event) {
        event.preventDefault();
        
        const area = event.currentTarget;
        area.style.borderColor = 'var(--border-color)';
        area.style.background = 'var(--bg-primary)';
        
        const files = Array.from(event.dataTransfer.files);
        const csvFiles = files.filter(file => file.name.toLowerCase().endsWith('.csv'));
        
        if (csvFiles.length === 0) {
            this.showNotification('error', 'CSVファイルをドロップしてください');
            return;
        }
        
        // アップロードエリアの種類を判定
        const action = area.getAttribute('data-action');
        
        for (const file of csvFiles) {
            await this.processDroppedFile(file, action);
        }
    }
    
    /**
     * ドロップファイル処理
     */
    async processDroppedFile(file, action) {
        try {
            let inputElement = null;
            
            switch (action) {
                case 'csv-upload':
                    inputElement = this.elements.csvFileInput;
                    break;
                case 'rules-csv-upload':
                    inputElement = this.elements.rulesCSVInput;
                    break;
                case 'approval-csv-upload':
                    inputElement = this.elements.approvalCSVInput;
                    break;
                default:
                    throw new Error('未対応のアップロード種類です');
            }
            
            if (inputElement) {
                // ファイル入力要素にファイルを設定
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                inputElement.files = dataTransfer.files;
                
                // changeイベントを発火
                const changeEvent = new Event('change', { bubbles: true });
                inputElement.dispatchEvent(changeEvent);
            }
        } catch (error) {
            console.error('❌ ドロップファイル処理エラー:', error);
            this.showNotification('error', `ファイル処理エラー: ${error.message}`);
        }
    }
    
    // =====================================
    // ユーティリティ・ヘルパー機能
    // =====================================
    
    /**
     * Ajax リクエスト実行
     */
    async ajaxRequest(method, data, timeout = this.config.timeouts.default) {
        try {
            // NAGANO3 Ajax システムを使用
            const response = await window.NAGANO3.ajax.request({
                url: this.config.ajaxUrl,
                method: method,
                data: data,
                timeout: timeout
            });
            
            return response;
        } catch (error) {
            console.error('❌ Ajax リクエストエラー:', error);
            throw error;
        }
    }
    
    /**
     * 安全なテキスト設定
     */
    safeSetText(element, text) {
        if (element && element.textContent !== undefined) {
            element.textContent = text;
            return true;
        }
        return false;
    }
    
    /**
     * 通知表示
     */
    showNotification(type, message) {
        // NAGANO3 通知システムを使用
        if (window.NAGANO3.notifications) {
            window.NAGANO3.notifications.show(type, message);
        } else {
            // フォールバック
            console.log(`${type.toUpperCase()}: ${message}`);
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    /**
     * モーダル表示
     */
    showModal(title, content) {
        // NAGANO3 モーダルシステムを使用
        if (window.NAGANO3.modal) {
            window.NAGANO3.modal.show(title, content);
        } else {
            // フォールバック
            alert(`${title}\n\n${content}`);
        }
    }
    
    /**
     * ファイルダウンロード
     */
    downloadFile(content, filename, mimeType) {
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('❌ ファイルダウンロードエラー:', error);
            this.showNotification('error', `ファイルダウンロードエラー: ${error.message}`);
        }
    }
    
    /**
     * 保存済みルール数更新
     */
    updateSavedRulesCount() {
        const count = document.querySelectorAll('.kicho__saved-rule-item').length;
        const countElement = document.getElementById('savedRulesCount');
        if (countElement) {
            countElement.textContent = count;
        }
    }
    
    /**
     * 承認済み取引数更新
     */
    updateApprovedTransactionsCount() {
        const count = document.querySelectorAll('.kicho__approved-transaction-item').length;
        const countElement = document.getElementById('approvedTransactionsCount');
        if (countElement) {
            countElement.textContent = count;
        }
    }
    
    /**
     * AI履歴表示更新
     */
    updateAIHistoryDisplay(sessions) {
        const sessionList = document.getElementById('aiSessionList');
        if (!sessionList) return;
        
        sessionList.innerHTML = '';
        sessions.forEach(session => {
            const sessionElement = this.createSessionElement(session);
            sessionList.appendChild(sessionElement);
        });
    }
    
    /**
     * AI履歴追加表示
     */
    appendAIHistoryDisplay(sessions) {
        const sessionList = document.getElementById('aiSessionList');
        if (!sessionList) return;
        
        sessions.forEach(session => {
            const sessionElement = this.createSessionElement(session);
            sessionList.appendChild(sessionElement);
        });
    }
    
    /**
     * セッション要素作成
     */
    createSessionElement(session) {
        const div = document.createElement('div');
        div.className = 'kicho__session-item';
        div.innerHTML = `
            <span class="kicho__session-datetime">${session.datetime}</span>
            <span class="kicho__session-status--success">${session.status}</span>
        `;
        return div;
    }
    
    // =====================================
    // レンダリング機能（モーダル用）
    // =====================================
    
    /**
     * MF履歴レンダリング
     */
    renderMFHistory(data) {
        // 実際のプロジェクトでは適切なHTMLを生成
        return `
            <div class="kicho__modal-content">
                <h4>MF連携履歴</h4>
                <div class="kicho__history-list">
                    ${data.history.map(item => `
                        <div class="kicho__history-item">
                            <span>${item.date}</span>
                            <span>${item.type}</span>
                            <span>${item.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * 重複処理履歴レンダリング
     */
    renderDuplicateHistory(data) {
        return `
            <div class="kicho__modal-content">
                <h4>重複処理履歴</h4>
                <div class="kicho__history-list">
                    ${data.history.map(item => `
                        <div class="kicho__history-item">
                            <span>${item.date}</span>
                            <span>${item.file_name}</span>
                            <span>${item.duplicate_count}件の重複</span>
                            <span>${item.resolution}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * AI学習履歴レンダリング
     */
    renderAILearningHistory(data) {
        return `
            <div class="kicho__modal-content">
                <h4>AI学習履歴・分析</h4>
                <div class="kicho__analysis-charts">
                    <div>精度推移: ${data.accuracy_trend}</div>
                    <div>学習データ数: ${data.learning_data_count}</div>
                    <div>生成ルール数: ${data.generated_rules_count}</div>
                </div>
            </div>
        `;
    }
    
    /**
     * 最適化提案レンダリング
     */
    renderOptimizationSuggestions(data) {
        return `
            <div class="kicho__modal-content">
                <h4>最適化提案</h4>
                <div class="kicho__suggestions-list">
                    ${data.suggestions.map(suggestion => `
                        <div class="kicho__suggestion-item">
                            <h5>${suggestion.title}</h5>
                            <p>${suggestion.description}</p>
                            <div class="kicho__suggestion-impact">期待効果: ${suggestion.impact}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * 新規ルールフォームレンダリング
     */
    renderNewRuleForm(data) {
        return `
            <div class="kicho__modal-content">
                <h4>新規ルール作成</h4>
                <form id="newRuleForm">
                    <div class="kicho__form-group">
                        <label>ルール名</label>
                        <input type="text" name="rule_name" class="kicho__form-input" required>
                    </div>
                    <div class="kicho__form-group">
                        <label>条件</label>
                        <textarea name="conditions" class="kicho__form-input" rows="3" required></textarea>
                    </div>
                    <div class="kicho__form-group">
                        <label>処理内容</label>
                        <textarea name="actions" class="kicho__form-input" rows="3" required></textarea>
                    </div>
                    <button type="submit" class="kicho__btn kicho__btn--primary">ルール作成</button>
                </form>
            </div>
        `;
    }
    
    /**
     * ルール編集フォームレンダリング
     */
    renderRuleEditForm(data) {
        return `
            <div class="kicho__modal-content">
                <h4>ルール編集</h4>
                <form id="editRuleForm">
                    <input type="hidden" name="rule_id" value="${data.rule.id}">
                    <div class="kicho__form-group">
                        <label>ルール名</label>
                        <input type="text" name="rule_name" class="kicho__form-input" value="${data.rule.name}" required>
                    </div>
                    <div class="kicho__form-group">
                        <label>条件</label>
                        <textarea name="conditions" class="kicho__form-input" rows="3" required>${data.rule.conditions}</textarea>
                    </div>
                    <div class="kicho__form-group">
                        <label>処理内容</label>
                        <textarea name="actions" class="kicho__form-input" rows="3" required>${data.rule.actions}</textarea>
                    </div>
                    <button type="submit" class="kicho__btn kicho__btn--primary">ルール更新</button>
                </form>
            </div>
        `;
    }
    
    /**
     * 取引詳細レンダリング
     */
    renderTransactionDetails(data) {
        return `
            <div class="kicho__modal-content">
                <h4>取引詳細</h4>
                <div class="kicho__transaction-details">
                    <div><strong>取引ID:</strong> ${data.transaction.id}</div>
                    <div><strong>日付:</strong> ${data.transaction.date}</div>
                    <div><strong>金額:</strong> ${data.transaction.amount}</div>
                    <div><strong>摘要:</strong> ${data.transaction.description}</div>
                    <div><strong>勘定科目:</strong> ${data.transaction.account}</div>
                    <div><strong>状態:</strong> ${data.transaction.status}</div>
                </div>
            </div>
        `;
    }
    
    /**
     * 取り込み履歴レンダリング
     */
    renderImportHistory(data) {
        return `
            <div class="kicho__modal-content">
                <h4>取り込み履歴</h4>
                <div class="kicho__history-list">
                    ${data.history.map(item => `
                        <div class="kicho__history-item">
                            <span>${item.date}</span>
                            <span>${item.source}</span>
                            <span>${item.file_name}</span>
                            <span>${item.record_count}件</span>
                            <span>${item.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

// =====================================
// グローバル初期化・エクスポート
// =====================================

// NAGANO3名前空間に記帳システムを登録
window.NAGANO3.kicho = new KichoSystem();

// DOMContentLoaded後に初期化実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.body.dataset.page === 'kicho') {
            window.NAGANO3.kicho.init();
        }
    });
} else {
    if (document.body.dataset.page === 'kicho') {
        window.NAGANO3.kicho.init();
    }
}

console.log('✅ NAGANO-3 記帳ツール JavaScript読み込み完了');
                