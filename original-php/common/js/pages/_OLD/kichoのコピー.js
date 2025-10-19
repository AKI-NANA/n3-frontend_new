
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
 * KICHO記帳ツール JavaScript - 完全修正版
 * @file kicho.js
 * @version 4.0.0-COMPLETE-FIX
 * @author NAGANO-3 Development Team
 * @description 記帳自動化ツールのメインJavaScript（DOM構造完全対応版）
 * 
 * 🎯 修正内容:
 * - DOM要素ID完全統一（HTML構造に合致）
 * - アクション名アンダースコア形式統一
 * - 競合回避システム（useCapture=true）
 * - セキュリティ強化
 * - エラーハンドリング完全実装
 */

(function() {
    'use strict';

    // 重複読み込み防止
    if (window.KICHO_JS_LOADED) {
        console.warn('⚠️ kicho.js already loaded - skipping initialization');
        return;
    }
    window.KICHO_JS_LOADED = true;

    // バージョン情報
    const KICHO_VERSION = '4.0.0-COMPLETE-FIX';
    console.log(`🎯 KICHO.js v${KICHO_VERSION} 読み込み開始`);

    // =====================================
    // 🎯 設定・定数（完全修正版）
    // =====================================

    // KICHO専用アクション定義（PHP側に完全統一）
    const KICHO_ACTIONS = [
        // システム基本機能
        'health_check', 'get_statistics', 'refresh_all_data',
        'toggle_auto_refresh', 'system_status_check',
        
        // MFクラウド連携
        'execute_mf_import', 'export_to_mf', 'show_mf_history', 
        'execute_mf_recovery', 'mf_status',
        
        // CSV処理
        'process_csv_upload', 'download_rules_csv', 
        'download_pending_csv', 'download_pending_transactions_csv',
        'rules_csv_upload', 'approval_csv_upload',
        
        // AI学習・ルール管理
        'add_text_to_learning', 'execute_integrated_ai_learning',
        'create_rule', 'update_rule', 'delete_rule', 'edit_saved_rule',
        'save_uploaded_rules_as_database', 'refresh_ai_history',
        
        // 取引管理
        'approve_transaction', 'batch_approve', 'reject_transaction',
        'delete_transaction', 'view_transaction_details',
        
        // データ管理
        'select_by_date_range', 'delete_data_item', 'delete_selected_data',
        'select_all_imported_data', 'select_by_source', 'load_more_sessions',
        
        // バックアップ・レポート
        'execute_full_backup', 'create_manual_backup', 'generate_advanced_report'
    ];

    // ページ判定（完全修正版）
    const IS_KICHO_PAGE = 
        window.location.search.includes('page=kicho_content') ||
        document.body.getAttribute('data-page') === 'kicho' ||
        document.querySelector('.kicho__container') !== null;

    // DOM要素セレクタ（HTML構造に完全対応）
    const DOM_SELECTORS = {
        // 統計表示要素（HTML構造と完全一致）
        pendingCount: '#pendingTransactionsCount',
        rulesCount: '#confirmedRulesCount',
        automationRate: '#automationRate',
        monthlyCount: '#monthlyProcessedCount',
        errorCount: '#errorCount',
        
        // データ数表示要素（修正済み）
        mfDataCount: '#mfDataCount',
        csvDataCount: '#csvDataCount',
        textDataCount: '#textDataCount',
        selectedCount: '#selectedDataCount',
        
        // アラート・通知
        successAlert: '#successAlert',
        errorAlert: '#errorAlert',
        successMessage: '#successMessage',
        errorMessage: '#errorMessage',
        
        // フォーム要素
        csvFileInput: '#csvFileInput',
        
        // その他のUI要素
        lastUpdateTime: '#lastUpdateTime',
        loadingOverlay: '#loadingOverlay',
        systemStatus: '#systemStatus',
        
        // データ操作関連
        dataCheckbox: '.kicho__data-checkbox',
        transactionCheckbox: '.kicho__transaction-checkbox',
        
        // コンテナ要素
        container: '.kicho__container',
        importedDataList: '#imported-data-list',
        pendingTransactionsList: '#pending-transactions-list'
    };

    // 初期化状態管理
    let kichoInitialized = false;
    let autoRefreshTimer = null;
    let autoRefreshEnabled = false;

    // =====================================
    // 🛡️ セキュリティ・ユーティリティ
    // =====================================

    /**
     * 安全なDOM要素取得
     */
    function safeQuerySelector(selector) {
        try {
            return document.querySelector(selector);
        } catch (error) {
            console.warn(`DOM要素取得エラー: ${selector}`, error);
            return null;
        }
    }

    /**
     * 安全なDOM要素一覧取得
     */
    function safeQuerySelectorAll(selector) {
        try {
            return document.querySelectorAll(selector);
        } catch (error) {
            console.warn(`DOM要素一覧取得エラー: ${selector}`, error);
            return [];
        }
    }

    /**
     * CSRFトークン取得
     */
    function getCSRFToken() {
        return window.KICHO_CONFIG?.csrfToken ||
               document.querySelector('meta[name="csrf-token"]')?.content ||
               '';
    }

    /**
     * 要素からデータ属性抽出
     */
    function extractElementData(element) {
        const data = {};
        if (!element) return data;
        
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('data-') && attr.name !== 'data-action') {
                const key = attr.name.replace('data-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                data[key] = attr.value;
            }
        });
        
        const container = element.closest('[data-item-id], [data-rule-id], [data-transaction-id]');
        if (container) {
            ['data-item-id', 'data-rule-id', 'data-transaction-id'].forEach(attr => {
                const value = container.getAttribute(attr);
                if (value) {
                    const key = attr.replace('data-', '').replace(/-/g, '_');
                    data[key] = value;
                }
            });
        }
        
        return data;
    }

    /**
     * 入力値サニタイズ
     */
    function sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/[<>'"&]/g, function(char) {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
            };
            return entities[char];
        });
    }

    // =====================================
    // 📡 Ajax通信管理システム
    // =====================================

    const ajaxManager = {
        /**
         * Ajax リクエスト実行（完全修正版）
         */
        async request(action, data = {}, options = {}) {
            const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            try {
                console.log(`🚀 Ajax リクエスト開始 [${requestId}]: ${action}`);

                const formData = new FormData();
                formData.append('action', action);

                const csrfToken = getCSRFToken();
                if (csrfToken) {
                    formData.append('csrf_token', csrfToken);
                } else {
                    console.warn(`⚠️ CSRFトークンが見つかりません [${requestId}]`);
                }

                if (data && typeof data === 'object') {
                    Object.entries(data).forEach(([key, value]) => {
                        if (value instanceof File) {
                            formData.append(key, value);
                        } else if (value !== null && value !== undefined) {
                            formData.append(key, String(value));
                        }
                    });
                }

                const fetchOptions = {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    ...options
                };

                const timeoutMs = options.timeout || 30000;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                fetchOptions.signal = controller.signal;

                const response = await fetch(window.KICHO_CONFIG?.ajaxUrl || '/?page=kicho_content', fetchOptions);
                clearTimeout(timeoutId);

                console.log(`📥 レスポンス受信 [${requestId}]: ${response.status}`);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const contentType = response.headers.get('content-type');
                if (!contentType?.includes('application/json')) {
                    const text = await response.text();
                    console.error(`❌ 不正なレスポンス形式 [${requestId}]:`, text);
                    throw new Error('サーバーからの応答が不正です');
                }

                const result = await response.json();
                console.log(`✅ Ajax 成功 [${requestId}]:`, result);

                if (result.success === false) {
                    throw new Error(result.error || 'サーバー処理エラー');
                }

                // CSRFトークン更新
                if (result.csrf_token) {
                    if (window.KICHO_CONFIG) {
                        window.KICHO_CONFIG.csrfToken = result.csrf_token;
                    }
                    const metaToken = document.querySelector('meta[name="csrf-token"]');
                    if (metaToken) {
                        metaToken.content = result.csrf_token;
                    }
                }

                await this.handleSuccessResponse(action, result);
                return result;

            } catch (error) {
                if (error.name === 'AbortError') {
                    console.error(`⏰ Ajax タイムアウト [${requestId}]: ${action}`);
                    throw new Error('リクエストがタイムアウトしました');
                } else {
                    console.error(`❌ Ajax request failed [${requestId}] [${action}]:`, error);
                    throw error;
                }
            }
        },

        /**
         * Ajax成功後のレスポンス処理
         */
        async handleSuccessResponse(action, response) {
            try {
                if (response.data?.statistics) {
                    updateStatistics(response.data.statistics);
                }

                switch (action) {
                    case 'refresh_all_data':
                    case 'get_statistics':
                        if (response.data) {
                            updateDashboard(response.data);
                        }
                        break;

                    case 'delete_transaction':
                    case 'delete_data_item':
                        if (response.data?.item_id || response.data?.transaction_id) {
                            removeItemFromDOM(response.data.item_id || response.data.transaction_id);
                        }
                        updateSelectedDataCount();
                        break;

                    case 'batch_approve':
                        await refreshTransactionsList();
                        break;

                    case 'execute_integrated_ai_learning':
                        if (response.data) {
                            updateAILearningResults(response.data);
                        }
                        break;
                }

                updateLastUpdateTime();

            } catch (error) {
                console.warn('UI更新エラー:', error);
            }
        }
    };

    // =====================================
    // 🎯 競合回避イベントシステム
    // =====================================

    // メインイベントハンドラー（最優先実行）
    document.addEventListener('click', function(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');

        if (KICHO_ACTIONS.includes(action) && IS_KICHO_PAGE) {
            // 🔑 重要：他のJSへの伝播を完全停止
            event.stopImmediatePropagation();
            event.preventDefault();
            
            console.log(`🎯 KICHO優先処理: ${action}`);
            
            executeKichoAction(action, target);
            return false;
        }
    }, true); // useCapture=true で最優先実行

    // =====================================
    // 🎯 KICHOアクション実行システム
    // =====================================

    /**
     * KICHOアクション実行（完全修正版）
     */
    async function executeKichoAction(action, element) {
        try {
            showElementLoading(element);
            console.log(`🎯 KICHOアクション実行: ${action}`);

            const result = await dispatchKichoAction(action, element);
            
            if (result && result.success !== false) {
                console.log(`✅ アクション完了: ${action}`);
                showNotification(result.message || 'アクションが完了しました', 'success');
                await postActionUIUpdate(action, result);
            }
        } catch (error) {
            console.error(`❌ アクション実行エラー [${action}]:`, error);
            showNotification(`エラー: ${error.message}`, 'error');
        } finally {
            hideElementLoading(element);
        }
    }

    /**
     * アクション振り分け処理（完全修正版）
     */
    async function dispatchKichoAction(action, element) {
        const elementData = extractElementData(element);
        
        switch (action) {
            // === システム系 ===
            case 'refresh-all':
                // 強化: refresh-allアクションでダッシュボード全体をリフレッシュ
                executeKichoAction('refresh_dashboard', {}, element);
                break;
            case 'health_check':
                return await ajaxManager.request('health_check');
                
            case 'refresh_all_data':
                return await ajaxManager.request('refresh_all_data');
                
            case 'get_statistics':
                return await ajaxManager.request('get_statistics');

            case 'toggle_auto_refresh':
                return handleToggleAutoRefresh();

            // === MF連携系 ===
            case 'execute_mf_import':
                return await handleMFImport(elementData);
                
            case 'export_to_mf':
                return await ajaxManager.request('export_to_mf');

            case 'show_mf_history':
                return await ajaxManager.request('show_mf_history');

            case 'execute_mf_recovery':
                return await ajaxManager.request('execute_mf_recovery');

            // === CSV処理系 ===
            case 'process_csv_upload':
                return await handleCSVUpload(elementData);
                
            case 'download_rules_csv':
                return await ajaxManager.request('download_rules_csv');
                
            case 'download_pending_csv':
                return await ajaxManager.request('download_pending_csv');
                
            case 'download_pending_transactions_csv':
                return await ajaxManager.request('download_pending_transactions_csv');

            case 'rules_csv_upload':
                return await handleRulesCSVUpload(elementData);

            case 'approval_csv_upload':
                return await handleApprovalCSVUpload(elementData);

            // === AI学習・ルール管理系 ===
            case 'add_text_to_learning':
                return await handleAddTextToLearning(elementData);
                
            case 'execute_integrated_ai_learning':
                return await handleExecuteAILearning(elementData);
                
            case 'create_rule':
                return await handleCreateRule(elementData);
                
            case 'update_rule':
                return await ajaxManager.request('update_rule', elementData);
                
            case 'delete_rule':
            case 'edit_saved_rule':
                return await handleEditSavedRule(elementData);
                
            case 'save_uploaded_rules_as_database':
                return await ajaxManager.request('save_uploaded_rules_as_database', elementData);

            case 'refresh_ai_history':
                return await ajaxManager.request('refresh_ai_history');

            // === 取引管理系 ===
            case 'approve_transaction':
                return await ajaxManager.request('approve_transaction', elementData);
                
            case 'batch_approve':
                return await handleBulkApproveTransactions(elementData);
                
            case 'reject_transaction':
                return await ajaxManager.request('reject_transaction', elementData);
                
            case 'delete_transaction':
                return await handleDeleteTransaction(elementData);
                
            case 'view_transaction_details':
                return await handleViewTransactionDetails(elementData);

            // === データ管理系 ===
            case 'select_by_date_range':
                return await handleSelectByDateRange(elementData);
                
            case 'delete_data_item':
                return await handleDeleteDataItem(elementData);
                
            case 'delete_selected_data':
                return await handleDeleteSelectedData();
                
            case 'select_all_imported_data':
                return handleSelectAllData();
                
            case 'select_by_source':
                return handleSelectBySource(elementData);

            case 'load_more_sessions':
                return await ajaxManager.request('load_more_sessions', elementData);

            // === バックアップ・レポート系 ===
            case 'execute_full_backup':
            case 'create_manual_backup':
                return await ajaxManager.request('execute_full_backup');
                
            case 'generate_advanced_report':
                return await handleGenerateReport(elementData);

            default:
                console.warn(`⚠️ 未対応アクション: ${action}`);
                return await ajaxManager.request(action, elementData);
        }
    }

    // =====================================
    // 🔧 個別アクション処理関数
    // =====================================

    /**
     * MFインポート処理
     */
    async function handleMFImport(data) {
        const startDate = data.startDate || 
                         safeQuerySelector('#mf-import-start-date')?.value || 
                         new Date().toISOString().split('T')[0];
        const endDate = data.endDate || 
                       safeQuerySelector('#mf-import-end-date')?.value || 
                       new Date().toISOString().split('T')[0];
        const purpose = data.purpose || 'general';
        
        return await ajaxManager.request('execute_mf_import', {
            start_date: startDate,
            end_date: endDate,
            purpose: purpose
        });
    }

    /**
     * CSVアップロード処理
     */
    async function handleCSVUpload(data) {
        const fileInput = safeQuerySelector(DOM_SELECTORS.csvFileInput) || data.fileInput;
        if (!fileInput?.files?.[0]) {
            throw new Error('CSVファイルを選択してください');
        }
        
        const file = fileInput.files[0];
        
        if (!file.name.toLowerCase().endsWith('.csv')) {
            throw new Error('CSVファイルを選択してください');
        }
        
        if (file.size > 50 * 1024 * 1024) {
            throw new Error('ファイルサイズが大きすぎます（最大50MB）');
        }
        
        return await ajaxManager.request('process_csv_upload', {
            csv_file: file,
            upload_type: data.uploadType || 'transactions'
        });
    }

    /**
     * ルールCSVアップロード処理
     */
    async function handleRulesCSVUpload(data) {
        const fileInput = safeQuerySelector('#rules-csv-input') || data.fileInput;
        if (!fileInput?.files?.[0]) {
            throw new Error('ルールCSVファイルを選択してください');
        }
        
        return await ajaxManager.request('rules_csv_upload', {
            rules_csv: fileInput.files[0]
        });
    }

    /**
     * 承認CSVアップロード処理
     */
    async function handleApprovalCSVUpload(data) {
        const fileInput = safeQuerySelector('#approval-csv-input') || data.fileInput;
        if (!fileInput?.files?.[0]) {
            throw new Error('承認CSVファイルを選択してください');
        }
        
        return await ajaxManager.request('approval_csv_upload', {
            approval_csv: fileInput.files[0]
        });
    }

    /**
     * AI学習テキスト追加
     */
    async function handleAddTextToLearning(data) {
        const textInput = safeQuerySelector('#ai-learning-text-input');
        const categorySelect = safeQuerySelector('#ai-learning-text-category');
        
        const text = textInput?.value || data.text;
        const category = categorySelect?.value || data.category || 'general';
        
        if (!text?.trim()) {
            throw new Error('学習テキストを入力してください');
        }
        
        if (text.length < 5) {
            throw new Error('学習テキストは5文字以上で入力してください');
        }
        
        const result = await ajaxManager.request('add_text_to_learning', {
            text: text.trim(),
            category: category
        });
        
        if (result.success && textInput) {
            textInput.value = '';
        }
        
        return result;
    }

    /**
     * AI学習実行
     */
    async function handleExecuteAILearning(data) {
        return await ajaxManager.request('execute_integrated_ai_learning', {
            learning_type: data.learningType || 'comprehensive',
            include_history: data.includeHistory !== false
        });
    }

    /**
     * ルール作成
     */
    async function handleCreateRule(data) {
        const ruleName = data.ruleName || safeQuerySelector('#rule-name-input')?.value;
        const keyword = data.keyword || safeQuerySelector('#rule-keyword-input')?.value;
        const debitAccount = data.debitAccount || safeQuerySelector('#rule-debit-account')?.value;
        const creditAccount = data.creditAccount || safeQuerySelector('#rule-credit-account')?.value;
        
        if (!ruleName || !keyword) {
            throw new Error('ルール名とキーワードを入力してください');
        }
        
        return await ajaxManager.request('create_rule', {
            rule_name: ruleName,
            keyword: keyword,
            debit_account: debitAccount,
            credit_account: creditAccount
        });
    }

    /**
     * 保存済みルール編集
     */
    async function handleEditSavedRule(data) {
        const ruleId = data.ruleId || data.itemId;
        if (!ruleId) {
            throw new Error('編集するルールのIDが指定されていません');
        }
        
        return await ajaxManager.request('edit_saved_rule', {
            rule_id: ruleId
        });
    }

    /**
     * 取引詳細表示
     */
    async function handleViewTransactionDetails(data) {
        const transactionId = data.transactionId || data.itemId;
        if (!transactionId) {
            throw new Error('取引IDが指定されていません');
        }
        
        const result = await ajaxManager.request('view_transaction_details', {
            transaction_id: transactionId
        });
        
        if (result.success && result.data) {
            showTransactionModal(result.data);
        }
        
        return result;
    }

    /**
     * 取引削除
     */
    async function handleDeleteTransaction(data) {
        const transactionId = data.transactionId || data.itemId;
        if (!transactionId) {
            throw new Error('削除する取引のIDが指定されていません');
        }
        
        if (!confirm('この取引を削除してもよろしいですか？')) {
            return { success: false, message: 'キャンセルされました' };
        }
        
        return await ajaxManager.request('delete_transaction', {
            transaction_id: transactionId
        });
    }

    /**
     * 一括承認
     */
    async function handleBulkApproveTransactions(data) {
        const selectedItems = safeQuerySelectorAll('.kicho__transaction-checkbox:checked');
        if (selectedItems.length === 0) {
            throw new Error('承認する取引を選択してください');
        }
        
        const transactionIds = Array.from(selectedItems).map(item => 
            item.closest('[data-transaction-id]')?.getAttribute('data-transaction-id')
        ).filter(id => id);
        
        if (transactionIds.length === 0) {
            throw new Error('有効な取引IDが見つかりません');
        }
        
        if (!confirm(`選択した${transactionIds.length}件の取引を一括承認してもよろしいですか？`)) {
            return { success: false, message: 'キャンセルされました' };
        }
        
        return await ajaxManager.request('batch_approve', {
            transaction_ids: transactionIds
        });
    }

    /**
     * 日付範囲選択
     */
    async function handleSelectByDateRange(data) {
        const startDate = data.startDate || safeQuerySelector('#date-range-start')?.value;
        const endDate = data.endDate || safeQuerySelector('#date-range-end')?.value;
        
        if (!startDate || !endDate) {
            throw new Error('開始日と終了日を指定してください');
        }
        
        return await ajaxManager.request('select_by_date_range', {
            start_date: startDate,
            end_date: endDate
        });
    }

    /**
     * データアイテム削除
     */
    async function handleDeleteDataItem(data) {
        const itemId = data.itemId || data.dataItemId;
        if (!itemId) {
            throw new Error('削除するデータのIDが指定されていません');
        }
        
        if (!confirm('このデータを削除してもよろしいですか？')) {
            return { success: false, message: 'キャンセルされました' };
        }
        
        return await ajaxManager.request('delete_data_item', {
            item_id: itemId
        });
    }

    /**
     * 選択データ削除
     */
    async function handleDeleteSelectedData() {
        const selectedItems = safeQuerySelectorAll(DOM_SELECTORS.dataCheckbox + ':checked');
        if (selectedItems.length === 0) {
            throw new Error('削除するデータを選択してください');
        }
        
        if (!confirm(`選択した${selectedItems.length}件のデータを削除してもよろしいですか？`)) {
            return { success: false, message: 'キャンセルされました' };
        }
        
        const itemIds = Array.from(selectedItems).map(item => 
            item.closest('[data-item-id]')?.getAttribute('data-item-id')
        ).filter(id => id);
        
        return await ajaxManager.request('delete_selected_data', {
            item_ids: itemIds
        });
    }

    /**
     * 全データ選択
     */
    function handleSelectAllData() {
        const dataCheckboxes = safeQuerySelectorAll(DOM_SELECTORS.dataCheckbox);
        const allChecked = Array.from(dataCheckboxes).every(cb => cb.checked);
        
        dataCheckboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
        
        updateSelectedDataCount();
        return { 
            success: true, 
            message: `全データを${!allChecked ? '選択' : '解除'}しました` 
        };
    }

    /**
     * ソース別選択
     */
    function handleSelectBySource(data) {
        const source = data.source;
        if (!source) {
            throw new Error('データソースが指定されていません');
        }
        
        const sourceItems = safeQuerySelectorAll(`[data-source="${source}"] ${DOM_SELECTORS.dataCheckbox}`);
        sourceItems.forEach(checkbox => {
            checkbox.checked = true;
        });
        
        updateSelectedDataCount();
        return { 
            success: true, 
            message: `${source}データを選択しました` 
        };
    }

    /**
     * 自動更新切り替え
     */
    function handleToggleAutoRefresh() {
        autoRefreshEnabled = !autoRefreshEnabled;
        
        if (autoRefreshEnabled) {
            autoRefreshTimer = setInterval(() => {
                console.log('🔄 自動更新実行');
                updateLastUpdateTime();
                ajaxManager.request('get_statistics').catch(error => {
                    console.warn('自動更新エラー:', error);
                });
            }, 30000);
            
            showNotification('自動更新を開始しました', 'success');
        } else {
            if (autoRefreshTimer) {
                clearInterval(autoRefreshTimer);
                autoRefreshTimer = null;
            }
            showNotification('自動更新を停止しました', 'info');
        }
        
        const toggleButton = safeQuerySelector('[data-action="toggle_auto_refresh"]');
        if (toggleButton) {
            const icon = toggleButton.querySelector('i');
            const text = toggleButton.querySelector('span') || toggleButton;
            
            if (autoRefreshEnabled) {
                if (icon) icon.className = 'fas fa-pause';
                if (text.textContent) text.textContent = '自動更新停止';
            } else {
                if (icon) icon.className = 'fas fa-play';
                if (text.textContent) text.textContent = '自動更新開始';
            }
        }
        
        return { 
            success: true, 
            message: `自動更新を${autoRefreshEnabled ? '開始' : '停止'}しました` 
        };
    }

    /**
     * レポート生成
     */
    async function handleGenerateReport(data) {
        const reportType = data.reportType || 'monthly_summary';
        const reportFormat = data.reportFormat || 'pdf';
        const startDate = data.startDate;
        const endDate = data.endDate;
        
        return await ajaxManager.request('generate_advanced_report', {
            report_type: reportType,
            format: reportFormat,
            start_date: startDate,
            end_date: endDate
        });
    }

    // =====================================
    // 🎨 UI管理・更新システム
    // =====================================

    /**
     * 統計データ更新（完全修正版）
     */
    function updateStatistics(stats) {
        const statElements = {
            [DOM_SELECTORS.pendingCount]: stats.pending_transactions || 0,
            [DOM_SELECTORS.rulesCount]: stats.confirmed_rules || 0,
            [DOM_SELECTORS.automationRate]: stats.automation_rate || 0,
            [DOM_SELECTORS.monthlyCount]: stats.monthly_processed || 0,
            [DOM_SELECTORS.errorCount]: stats.error_count || 0,
            [DOM_SELECTORS.mfDataCount]: stats.mf_data_count || 0,
            [DOM_SELECTORS.csvDataCount]: stats.csv_data_count || 0,
            [DOM_SELECTORS.textDataCount]: stats.text_data_count || 0
        };

        let updatedCount = 0;
        Object.entries(statElements).forEach(([selector, value]) => {
            const element = safeQuerySelector(selector);
            if (element) {
                const currentValue = parseInt(element.textContent) || 0;
                if (currentValue !== value) {
                    animateValueChange(element, value);
                    addUpdateEffect(element);
                    updatedCount++;
                }
            } else {
                console.warn(`統計要素が見つかりません: ${selector}`);
            }
        });

        console.log(`✅ ${updatedCount}個の統計値を更新しました`);
        return updatedCount;
    }

    /**
     * ダッシュボード更新
     */
    function updateDashboard(data) {
        if (data.statistics) {
            updateStatistics(data.statistics);
        }
        
        if (data.recent_transactions) {
            updateRecentTransactions(data.recent_transactions);
        }
    }

    /**
     * 値変更アニメーション
     */
    function animateValueChange(element, newValue) {
        const currentValue = parseInt(element.textContent) || 0;
        const suffix = element.dataset.suffix || '';
        
        if (currentValue !== newValue) {
            const duration = 800;
            const steps = 20;
            const increment = (newValue - currentValue) / steps;
            let step = 0;
            
            const timer = setInterval(() => {
                step++;
                const currentStep = Math.round(currentValue + (increment * step));
                element.textContent = currentStep + suffix;
                
                if (step >= steps) {
                    clearInterval(timer);
                    element.textContent = newValue + suffix;
                }
            }, duration / steps);
        }
    }

    /**
     * 更新エフェクト追加
     */
    function addUpdateEffect(element) {
        element.classList.add('stat-updated');
        setTimeout(() => {
            element.classList.remove('stat-updated');
        }, 1500);
    }

    /**
     * DOMからアイテム削除
     */
    function removeItemFromDOM(itemId) {
        if (!itemId) return;
        
        const itemElement = safeQuerySelector(`[data-item-id="${itemId}"], [data-transaction-id="${itemId}"]`);
        if (itemElement) {
            itemElement.style.transition = 'opacity 0.3s ease';
            itemElement.style.opacity = '0';
            
            setTimeout(() => {
                if (itemElement.parentNode) {
                    itemElement.parentNode.removeChild(itemElement);
                }
            }, 300);
        }
    }

    /**
     * 選択データ数更新（完全修正版）
     */
    function updateSelectedDataCount() {
        const selectedDataItems = safeQuerySelectorAll(DOM_SELECTORS.dataCheckbox + ':checked');
        const selectedTransactionItems = safeQuerySelectorAll(DOM_SELECTORS.transactionCheckbox + ':checked');
        
        const dataCountElement = safeQuerySelector(DOM_SELECTORS.selectedCount);
        if (dataCountElement) {
            dataCountElement.textContent = selectedDataItems.length;
            addUpdateEffect(dataCountElement);
        }
        
        console.log(`選択データ更新: データ${selectedDataItems.length}件, 取引${selectedTransactionItems.length}件`);
    }

    /**
     * 最終更新時刻更新
     */
    function updateLastUpdateTime() {
        const timeElement = safeQuerySelector(DOM_SELECTORS.lastUpdateTime);
        if (timeElement) {
            const now = new Date();
            const timeString = now.toLocaleString('ja-JP');
            timeElement.textContent = timeString;
            addUpdateEffect(timeElement);
        }
    }

    /**
     * 通知表示（完全修正版）
     */
    function showNotification(message, type = 'info', duration = 5000) {
        let alertElement, messageElement;
        
        if (type === 'success') {
            alertElement = safeQuerySelector(DOM_SELECTORS.successAlert);
            messageElement = safeQuerySelector(DOM_SELECTORS.successMessage);
        } else if (type === 'error') {
            alertElement = safeQuerySelector(DOM_SELECTORS.errorAlert);
            messageElement = safeQuerySelector(DOM_SELECTORS.errorMessage);
        }
        
        if (alertElement && messageElement) {
            messageElement.textContent = sanitizeInput(message);
            alertElement.style.display = 'flex';
            alertElement.classList.add('fade-in');
            
            setTimeout(() => {
                alertElement.style.display = 'none';
                alertElement.classList.remove('fade-in');
            }, duration);
        } else {
            createFallbackNotification(message, type, duration);
        }
    }

    /**
     * フォールバック通知作成
     */
    function createFallbackNotification(message, type, duration) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            padding: 15px 20px; border-radius: 5px; color: white; font-weight: bold;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%); transition: transform 0.3s ease;
        `;
        notification.textContent = sanitizeInput(message);
        
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    /**
     * 要素ローディング表示
     */
    function showElementLoading(element) {
        if (!element) return;
        
        element.disabled = true;
        element.style.position = 'relative';
        element.style.pointerEvents = 'none';
        
        const existingSpinner = element.querySelector('.kicho-spinner');
        if (existingSpinner) {
            existingSpinner.remove();
        }
        
        const spinner = document.createElement('div');
        spinner.className = 'kicho-spinner';
        spinner.style.cssText = `
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 20px; height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: kicho-spin 1s linear infinite;
            z-index: 1000;
        `;
        
        if (!document.getElementById('kicho-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'kicho-spinner-style';
            style.textContent = `
                @keyframes kicho-spin {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        element.appendChild(spinner);
    }

    /**
     * 要素ローディング非表示
     */
    function hideElementLoading(element) {
        if (!element) return;
        
        element.disabled = false;
        element.style.pointerEvents = '';
        
        const spinner = element.querySelector('.kicho-spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    /**
     * 取引詳細モーダル表示
     */
    function showTransactionModal(transactionData) {
        const modalHtml = `
            <div class="transaction-modal" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); z-index: 10000;
                display: flex; align-items: center; justify-content: center;
            ">
                <div style="
                    background: white; padding: 20px; border-radius: 8px;
                    max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;
                ">
                    <h3>取引詳細</h3>
                    <p><strong>ID:</strong> ${sanitizeInput(transactionData.id || 'N/A')}</p>
                    <p><strong>日付:</strong> ${sanitizeInput(transactionData.date || 'N/A')}</p>
                    <p><strong>説明:</strong> ${sanitizeInput(transactionData.description || 'N/A')}</p>
                    <p><strong>金額:</strong> ¥${(transactionData.amount || 0).toLocaleString()}</p>
                    <p><strong>借方:</strong> ${sanitizeInput(transactionData.debit_account || 'N/A')}</p>
                    <p><strong>貸方:</strong> ${sanitizeInput(transactionData.credit_account || 'N/A')}</p>
                    <div style="text-align: right; margin-top: 15px;">
                        <button onclick="this.closest('.transaction-modal').remove()" 
                                style="padding: 8px 16px; cursor: pointer;">
                            閉じる
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // =====================================
    // 🔄 追加UI更新関数
    // =====================================

    /**
     * 特定アクション後のUI更新
     */
    async function postActionUIUpdate(action, result) {
        if (action.includes('delete')) {
            updateSelectedDataCount();
            
            try {
                const statsResponse = await ajaxManager.request('get_statistics');
                if (statsResponse.data) {
                    updateStatistics(statsResponse.data);
                }
            } catch (error) {
                console.warn('統計更新失敗:', error);
            }
        }

        if (action.includes('rule')) {
            await refreshRulesList();
        }

        if (action.includes('ai') || action.includes('learning')) {
            await refreshAIHistory();
        }
    }

    /**
     * ルール一覧更新
     */
    async function refreshRulesList() {
        try {
            const response = await ajaxManager.request('get_rules');
            if (response.data?.rules) {
                updateRulesList(response.data.rules);
            }
        } catch (error) {
            console.warn('ルール一覧更新失敗:', error);
        }
    }

    /**
     * 取引一覧更新
     */
    async function refreshTransactionsList() {
        try {
            const response = await ajaxManager.request('get_transactions');
            if (response.data?.transactions) {
                updateTransactionsList(response.data.transactions);
            }
        } catch (error) {
            console.warn('取引一覧更新失敗:', error);
        }
    }

    /**
     * AI履歴更新
     */
    async function refreshAIHistory() {
        try {
            const response = await ajaxManager.request('refresh_ai_history');
            if (response.data) {
                updateAILearningResults(response.data);
            }
        } catch (error) {
            console.warn('AI履歴更新失敗:', error);
        }
    }

    /**
     * ルール一覧表示更新
     */
    function updateRulesList(rules) {
        console.log('ルール一覧更新:', rules);
        // TODO: 実際のHTML更新ロジック
    }

    /**
     * 取引一覧表示更新
     */
    function updateTransactionsList(transactions) {
        console.log('取引一覧更新:', transactions);
        // TODO: 実際のHTML更新ロジック
    }

    /**
     * AI学習結果更新
     */
    function updateAILearningResults(data) {
        console.log('AI学習結果更新:', data);
        // TODO: 実際のHTML更新ロジック
    }

    /**
     * 最近の取引更新
     */
    function updateRecentTransactions(transactions) {
        console.log('最近の取引更新:', transactions);
        // TODO: 実際のHTML更新ロジック
    }

    // =====================================
    // 🚀 初期化・イベント設定
    // =====================================

    /**
     * KICHO システム初期化（完全修正版）
     */
    function initializeKicho() {
        if (kichoInitialized) {
            console.warn('KICHO既に初期化済み');
            return;
        }
        
        console.log('🎯 KICHO システム初期化開始');
        
        try {
            // DOM構造確認
            const requiredElements = [
                DOM_SELECTORS.pendingCount,
                DOM_SELECTORS.rulesCount,
                DOM_SELECTORS.automationRate,
                DOM_SELECTORS.monthlyCount,
                DOM_SELECTORS.errorCount
            ];
            
            let foundElements = 0;
            requiredElements.forEach(selector => {
                const element = safeQuerySelector(selector);
                if (element) {
                    foundElements++;
                } else {
                    console.warn(`必須要素が見つかりません: ${selector}`);
                }
            });
            
            console.log(`DOM要素確認: ${foundElements}/${requiredElements.length}個発見`);
            
            // 初期状態設定
            updateSelectedDataCount();
            updateLastUpdateTime();
            
            // チェックボックス変更イベント
            document.addEventListener('change', function(event) {
                if (event.target.matches(DOM_SELECTORS.dataCheckbox) || 
                    event.target.matches(DOM_SELECTORS.transactionCheckbox)) {
                    updateSelectedDataCount();
                }
            });
            
            // ESCキーでモーダル・アラート閉じる
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') {
                    safeQuerySelectorAll('.alert, [class*="alert"]').forEach(alert => {
                        alert.style.display = 'none';
                    });
                    
                    safeQuerySelectorAll('.transaction-modal, .modal').forEach(modal => {
                        modal.remove();
                    });
                }
            });
            
            kichoInitialized = true;
            console.log('✅ KICHO システム初期化完了');
            
            if (IS_KICHO_PAGE) {
                showNotification('記帳自動化ツールが起動しました', 'success');
            }
            
        } catch (error) {
            console.error('❌ KICHO 初期化エラー:', error);
            showNotification('システム初期化エラーが発生しました', 'error');
        }
    }

    // =====================================
    // 🌐 グローバル公開・NAGANO3統合
    // =====================================

    // NAGANO3名前空間に登録
    window.NAGANO3 = window.NAGANO3 || {};
    window.NAGANO3.modules = window.NAGANO3.modules || {};
    window.NAGANO3.modules.kicho = {
        version: KICHO_VERSION,
        ajaxManager: ajaxManager,
        executeAction: executeKichoAction,
        showNotification: showNotification,
        updateStatistics: updateStatistics,
        updateLastUpdateTime: updateLastUpdateTime,
        updateSelectedDataCount: updateSelectedDataCount,
        refreshRulesList: refreshRulesList,
        refreshTransactionsList: refreshTransactionsList,
        refreshAIHistory: refreshAIHistory,
        initialized: () => kichoInitialized,
        
        // デバッグ用
        debug: {
            DOM_SELECTORS: DOM_SELECTORS,
            KICHO_ACTIONS: KICHO_ACTIONS,
            IS_KICHO_PAGE: IS_KICHO_PAGE,
            safeQuerySelector: safeQuerySelector,
            sanitizeInput: sanitizeInput
        }
    };

    // HTML onclick用のグローバル関数
    window.executeKichoAction = function(action, data = {}) {
        if (IS_KICHO_PAGE) {
            return executeKichoAction(action, { dataset: data });
        }
    };

    // デバッグ用グローバル関数
    window.kichoDebug = function() {
        console.log('🎯 KICHO Debug Info:', {
            version: KICHO_VERSION,
            initialized: kichoInitialized,
            page: IS_KICHO_PAGE,
            autoRefresh: autoRefreshEnabled,
            actions: KICHO_ACTIONS.length,
            config: window.KICHO_CONFIG
        });
        
        // DOM構造確認
        console.log('\n=== DOM構造確認 ===');
        Object.entries(DOM_SELECTORS).forEach(([key, selector]) => {
            const element = safeQuerySelector(selector);
            console.log(`${key} (${selector}): ${element ? '✅ 存在' : '❌ 不存在'}`);
            if (element && element.textContent) {
                console.log(`  値: ${element.textContent.trim()}`);
            }
        });
        
        // アクション確認
        console.log('\n=== アクション確認 ===');
        const htmlActions = Array.from(document.querySelectorAll('[data-action]'))
            .map(el => el.getAttribute('data-action'))
            .filter((action, index, self) => self.indexOf(action) === index);
        
        console.log(`JavaScript登録アクション: ${KICHO_ACTIONS.length}個`);
        console.log(`HTML内アクション: ${htmlActions.length}個`);
        
        const missingInJS = htmlActions.filter(action => !KICHO_ACTIONS.includes(action));
        const missingInHTML = KICHO_ACTIONS.filter(action => !htmlActions.includes(action));
        
        if (missingInJS.length > 0) {
            console.warn('❌ HTMLにあるがJavaScriptにないアクション:', missingInJS);
        }
        
        if (missingInHTML.length > 0) {
            console.warn('❌ JavaScriptにあるがHTMLにないアクション:', missingInHTML);
        }
        
        if (missingInJS.length === 0 && missingInHTML.length === 0) {
            console.log('✅ HTMLとJavaScriptのアクション名が完全一致');
        }
    };

    // 統計更新テスト関数
    window.testKichoStatistics = function() {
        console.log('🧪 統計更新テスト開始');
        
        const testStats = {
            pending_transactions: Math.floor(Math.random() * 50) + 10,
            confirmed_rules: Math.floor(Math.random() * 100) + 20,
            automation_rate: Math.floor(Math.random() * 40) + 60,
            monthly_processed: Math.floor(Math.random() * 500) + 100,
            error_count: Math.floor(Math.random() * 10),
            mf_data_count: Math.floor(Math.random() * 200) + 50,
            csv_data_count: Math.floor(Math.random() * 100) + 20,
            text_data_count: Math.floor(Math.random() * 50) + 5
        };
        
        console.log('テストデータ:', testStats);
        const updatedCount = updateStatistics(testStats);
        console.log(`✅ 統計更新テスト完了: ${updatedCount}個更新`);
        
        return testStats;
    };

    // Ajax通信テスト関数
    window.testKichoAjax = function() {
        console.log('🧪 Ajax通信テスト開始');
        
        return ajaxManager.request('health_check')
            .then(response => {
                console.log('✅ Ajax通信テスト成功:', response);
                return response;
            })
            .catch(error => {
                console.error('❌ Ajax通信テストエラー:', error);
                throw error;
            });
    };

    // 自動統計更新機能
    let autoUpdateInterval = null;

    function startAutoUpdate() {
        if (autoUpdateInterval) return;
        
        autoUpdateInterval = setInterval(async () => {
            try {
                const response = await fetch('/?page=kicho_content', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: 'action=get_statistics&csrf_token=' + window.KICHO_CONFIG.csrf_token
                });
                
                const data = await response.json();
                if (data.success && data.data) {
                    updateStatsDisplay(data.data);
                    document.getElementById('lastUpdateTime').textContent = data.timestamp;
                }
            } catch (error) {
                console.error('自動更新エラー:', error);
            }
        }, 30000); // 30秒間隔
    }

    function updateStatsDisplay(stats) {
        const mappings = {
            'pendingTransactionsCount': stats.pending_transactions,
            'confirmedRulesCount': stats.confirmed_rules,
            'automationRate': stats.automation_rate,
            'monthlyProcessedCount': stats.monthly_processed,
            'errorCount': stats.error_count,
            'mfDataCount': stats.mf_data_count,
            'csvDataCount': stats.csv_data_count,
            'textDataCount': stats.text_data_count
        };
        
        Object.entries(mappings).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && element.textContent != value) {
                element.textContent = value;
                element.style.transition = 'background-color 0.5s';
                element.style.backgroundColor = '#fbbf24';
                setTimeout(() => {
                    element.style.backgroundColor = '';
                }, 500);
            }
        });
    }

    // ページ読み込み5秒後に自動更新開始
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(startAutoUpdate, 5000);
    });

    // =====================================
    // 🎬 初期化実行
    // =====================================

    // ページ読み込み完了時の初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initializeKicho, 100);
        });
    } else {
        setTimeout(initializeKicho, 100);
    }

    // ページアンロード時のクリーンアップ
    window.addEventListener('beforeunload', function() {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
        }
        if (autoUpdateInterval) {
            clearInterval(autoUpdateInterval);
        }
        console.log('🧹 KICHO.js クリーンアップ完了');
    });

    console.log(`✅ KICHO.js v${KICHO_VERSION} 読み込み完了`);

})();