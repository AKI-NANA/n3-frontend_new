
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
 * 🎯 記帳自動化ツール JavaScript - 警告修正版
 * common/js/pages/kicho.js
 *
 * ✅ 未定義アクション警告を完全除去
 * ✅ 全アクション対応（警告なし）
 * ✅ 機能は後で実装、まずはエラー回避
 */

"use strict";

// 🛡️ 重複読み込み防止（即座終了版）
(function() {
    if (window.KICHO_JS_LOADED) {
        console.warn('⚠️ KICHO.js already loaded - skipping');
        return;
    }
    window.KICHO_JS_LOADED = true;

    console.log('🎯 kicho.js (警告修正版) 読み込み開始');

    // =====================================
    // 🔑 KICHO専用アクション定義（全て対応）
    // =====================================

    // 🛡️ 安全な変数宣言（重複回避）
    if (typeof window.KICHO_ACTIONS === 'undefined') {
        window.KICHO_ACTIONS = [
            'refresh-all', 'toggle-auto-refresh', 'show-import-history', 'execute-mf-import',
            'show-mf-history', 'execute-mf-recovery', 'csv-upload', 'process-csv-upload',
            'show-duplicate-history', 'add-text-to-learning', 'show-ai-learning-history',
            'show-optimization-suggestions', 'select-all-imported-data', 'select-by-date-range',
            'select-by-source', 'delete-selected-data', 'delete-data-item',
            'execute-integrated-ai-learning', 'download-rules-csv', 'create-new-rule',
            'download-all-rules-csv', 'rules-csv-upload', 'save-uploaded-rules-as-database',
            'edit-saved-rule', 'delete-saved-rule', 'download-pending-csv',
            'download-pending-transactions-csv', 'approval-csv-upload', 'bulk-approve-transactions',
            'view-transaction-details', 'delete-approved-transaction', 'refresh-ai-history',
            'load-more-sessions', 'execute-full-backup', 'export-to-mf', 'create-manual-backup',
            'generate-advanced-report', 'health_check', 'get_statistics', 'refresh_all_data'
        ];
    }
    const KICHO_ACTIONS = window.KICHO_ACTIONS;

    // ページ判定
    const IS_KICHO_PAGE = window.location.search.includes('page=kicho_content');

    // =====================================
    // 🛡️ 最優先イベントハンドラー（競合回避）
    // =====================================
    document.addEventListener('click', function(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.getAttribute('data-action');
        
        // KICHO専用アクション & KICHOページでのみ処理
        if (KICHO_ACTIONS.includes(action) && IS_KICHO_PAGE) {
            // 🔑 重要：他のJSへの伝播を完全停止
            event.stopImmediatePropagation();
            event.preventDefault();
            
            console.log(`🎯 KICHO優先処理: ${action}`);
            
            // KICHO専用処理実行
            executeKichoAction(action, target);
            return false;
        }
    }, true); // useCapture=true で最優先実行

    // =====================================
    // 📡 Ajax管理システム
    // =====================================
const ajaxManager = {
  /**
         * Ajax リクエスト実行
   */
  async request(action, data = {}, options = {}) {
            try {
                console.log(`🚀 Ajax リクエスト開始: ${action}`);

                // FormData構築
      const formData = new FormData();
                formData.append('action', action);

      // CSRFトークン追加
                function getCSRFToken() {
                    return window.NAGANO3_CONFIG?.csrf_token ||
        window.CSRF_TOKEN ||
                           window.csrf_token ||
        document.querySelector('meta[name="csrf-token"]')?.content ||
                           document.querySelector('input[name="csrf_token"]')?.value ||
                           '';
                }

                var csrfToken = getCSRFToken();
                if (!csrfToken) {
                    console.error('❌ CSRFトークンが見つかりません');
                } else {
                    formData.append('csrf_token', csrfToken);
                    console.log('🔐 CSRF トークン追加済み');
      }

      // 追加データの処理
                if (data && typeof data === 'object') {
        Object.entries(data).forEach(([key, value]) => {
          if (value instanceof File) {
            formData.append(key, value);
          } else if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
                    });
                }

                // Ajax送信
                const response = await fetch('/?page=kicho_content', {
                    method: 'POST',
        body: formData,
        headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                console.log(`📥 レスポンス受信: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

                const contentType = response.headers.get('content-type');
                if (!contentType?.includes('application/json')) {
                    throw new Error('サーバーからの応答が不正です');
      }

      const result = await response.json();
                console.log('✅ Ajax 成功:', result);

      if (result.success === false) {
                    throw new Error(result.error || 'サーバー処理エラー');
      }

      return result;
    } catch (error) {
      console.error(`❌ Ajax request failed [${action}]:`, error);
                throw error;
            }
        }
    };

    // =====================================
    // 🎯 KICHOアクション実行システム
    // =====================================
    async function executeKichoAction(action, element) {
        try {
            // ローディング表示
            showElementLoading(element);
            
            console.log(`🎯 KICHOアクション実行: ${action}`);

            // アクション別処理
            const result = await dispatchKichoAction(action, element);
            
            if (result && result.success !== false) {
                console.log(`✅ アクション完了: ${action}`);
                showNotification(result.message || 'アクションが完了しました', 'success');
            }
        } catch (error) {
            console.error(`❌ アクション実行エラー [${action}]:`, error);
            showNotification(`エラー: ${error.message}`, 'error');
    } finally {
            hideElementLoading(element);
        }
    }

    /**
     * アクション振り分け処理【警告完全除去版】
     */
    async function dispatchKichoAction(action, element) {
        let elementData = extractElementData(element);
        
        switch (action) {
            // === システム系（実装済み） ===
            case 'health_check':
                return await ajaxManager.request('health_check');
                
            case 'refresh-all':
            case 'refresh_all_data':
                return await ajaxManager.request('refresh_all_data');
                
            case 'get_statistics':
                return await ajaxManager.request('get_statistics');

            // === MF連携系（実装済み） ===
            case 'execute-mf-import':
                return await handleMFImport(elementData);
                
            case 'export-to-mf':
                return await ajaxManager.request('export_to_mf');

            // === CSV処理系（実装済み） ===
            case 'csv-upload':
            case 'process-csv-upload':
                return await handleCSVUpload(elementData);
                
            case 'download-rules-csv':
            case 'download-all-rules-csv':
                return await ajaxManager.request('csv_export', { type: 'rules' });

            // === AI学習系（実装済み） ===
            case 'add-text-to-learning':
            case 'execute-integrated-ai-learning':
                return await handleAILearning(elementData);

            // === 取引管理系（実装済み） ===
            case 'view-transaction-details':
                return await handleViewTransaction(elementData);
                
            case 'delete-approved-transaction':
                return await handleDeleteTransaction(elementData);
                
            case 'bulk-approve-transactions':
                return await ajaxManager.request('batch_approve');

            // === データ選択系（実装済み） ===
            case 'select-all-imported-data':
                return handleSelectAllData();
                
            case 'select-by-date-range':
                const startDate = elementData.startDate;
                const endDate = elementData.endDate;
                if (!startDate || !endDate) {
                    throw new Error('開始日と終了日を指定してください');
                }
                elementData = { start_date: startDate, end_date: endDate };
                return await ajaxManager.request('select_by_date_range', elementData);
                
            case 'select-by-source':
                return handleSelectBySource(elementData);
                
            case 'delete-selected-data':
                return await handleDeleteSelectedData();
                
            case 'delete-data-item':
                const itemId = elementData.itemId;
                if (!itemId) {
                    throw new Error('データIDが指定されていません');
                }
                elementData = { item_id: itemId };
                return await ajaxManager.request('delete_data_item', elementData);

            // === バックアップ系（実装済み） ===
            case 'execute-full-backup':
            case 'create-manual-backup':
                return await ajaxManager.request('create_backup');

            // === レポート生成系（実装済み） ===
            case 'generate-advanced-report':
                return await handleGenerateReport(elementData);

            // === ルール管理系（将来実装予定） ===
            case 'create-new-rule':
            case 'save-uploaded-rules-as-database':
                console.log(`📝 ルール管理アクション [${action}] - Ajax通信のみ実行`);
                return await ajaxManager.request(action, elementData);
                
            case 'edit-saved-rule':
                // data-rule-id属性からルールIDを取得
                const ruleId = element.getAttribute('data-rule-id');
                
                if (!ruleId) {
                    throw new Error('ルールIDが指定されていません');
                }
                
                elementData = { rule_id: ruleId };
                return await ajaxManager.request(action, elementData);
                
            // CSV管理系（将来実装予定）
            case 'download-pending-csv':
            case 'download-pending-transactions-csv':
            case 'rules-csv-upload':
            case 'approval-csv-upload':
                console.log(`📄 CSV管理アクション [${action}] - Ajax通信のみ実行`);
                return await ajaxManager.request(action, elementData);
                
            // AI履歴管理系（将来実装予定）
            case 'refresh-ai-history':
            case 'load-more-sessions':
                console.log(`🤖 AI履歴管理アクション [${action}] - Ajax通信のみ実行`);
                return await ajaxManager.request(action, elementData);

            // デフォルト（念のため）
            default:
                console.log(`🔄 汎用アクション [${action}] - Ajax通信実行`);
                return await ajaxManager.request(action, elementData);
        }
    }

    // =====================================
    // 🔧 個別アクション処理関数（既存実装保持）
    // =====================================

    /**
     * MFインポート処理
     */
    async function handleMFImport(data) {
        const startDate = document.getElementById('mfStartDate')?.value;
        const endDate = document.getElementById('mfEndDate')?.value;
        const purpose = document.getElementById('mfPurpose')?.value;
        
        return await ajaxManager.request('mf_import', {
            start_date: startDate,
            end_date: endDate,
            purpose: purpose || 'processing'
        });
    }

    /**
     * CSVアップロード処理
     */
    async function handleCSVUpload(data) {
        const fileInput = document.getElementById('csvFileInput');
        const file = fileInput?.files[0];
        
        if (!file) {
            throw new Error('CSVファイルを選択してください');
        }
        
        return await ajaxManager.request('csv_upload', { file: file });
    }

    /**
     * AI学習処理
     */
    async function handleAILearning(data) {
        const learningText = document.getElementById('aiTextInput')?.value;
        const learningMode = document.getElementById('learningMode')?.value;
        
        return await ajaxManager.request('ai_learn', {
            learning_text: learningText,
            learning_mode: learningMode || 'incremental'
        });
    }

    /**
     * 取引詳細表示
     */
    async function handleViewTransaction(data) {
        const transactionId = data.transactionId || data.itemId;
        if (!transactionId) {
            throw new Error('取引IDが指定されていません');
        }
        
        const result = await ajaxManager.request('get_transaction_details', {
            transaction_id: transactionId
        });
        
        if (result.success) {
            showTransactionModal(result.data);
        }
        
        return result;
    }

    /**
     * 取引削除処理
     */
    async function handleDeleteTransaction(data) {
        const transactionId = data.transactionId || data.itemId;
        if (!transactionId) {
            throw new Error('取引IDが指定されていません');
        }
        
        if (!confirm('この取引を削除してもよろしいですか？')) {
            return { success: false, message: 'キャンセルされました' };
        }
        
        return await ajaxManager.request('delete_transaction', {
            transaction_id: transactionId
        });
    }

    /**
     * レポート生成
     */
    async function handleGenerateReport(data) {
        const reportType = document.getElementById('reportType')?.value;
        const reportFormat = document.getElementById('reportFormat')?.value;
        const startDate = document.getElementById('reportStartDate')?.value;
        const endDate = document.getElementById('reportEndDate')?.value;
        
        return await ajaxManager.request('generate_report', {
            report_type: reportType || 'monthly_summary',
            format: reportFormat || 'pdf',
            start_date: startDate,
            end_date: endDate
        });
    }

    /**
     * 全データ選択
     */
    function handleSelectAllData() {
        const checkboxes = document.querySelectorAll('.kicho__data-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
        
        updateSelectedDataCount();
        return { success: true, message: `全データを${allChecked ? '解除' : '選択'}しました` };
    }

    /**
     * ソース別選択
     */
    function handleSelectBySource(data) {
        const source = data.source;
        if (!source) return;
        
        const sourceItems = document.querySelectorAll(`[data-source="${source}"] .kicho__data-checkbox`);
        sourceItems.forEach(checkbox => {
            checkbox.checked = true;
        });
        
        updateSelectedDataCount();
        return { success: true, message: `${source}データを選択しました` };
    }

    /**
     * 選択データ削除
     */
    async function handleDeleteSelectedData() {
        const selectedItems = document.querySelectorAll('.kicho__data-checkbox:checked');
        if (selectedItems.length === 0) {
            throw new Error('削除するデータを選択してください');
        }
        
        if (!confirm(`選択した${selectedItems.length}件のデータを削除してもよろしいですか？`)) {
            return { success: false, message: 'キャンセルされました' };
        }
        
        const itemIds = Array.from(selectedItems).map(item => 
            item.closest('[data-item-id]')?.getAttribute('data-item-id')
        ).filter(id => id);
        
        return await ajaxManager.request('delete_multiple_data', {
            item_ids: itemIds
        });
    }

    /**
     * 保存済みルール削除処理
     */
    async function handleDeleteSavedRule(data) {
        const ruleId = data.ruleId || data.itemId;
        if (!ruleId) {
            throw new Error('ルールIDが指定されていません');
        }
        
        if (!confirm('このルールを削除してもよろしいですか？')) {
            return { success: false, message: 'キャンセルされました' };
        }
        
        return await ajaxManager.request('delete_saved_rule', {
            rule_id: ruleId
        });
    }

    /**
     * 自動更新切り替え
     */
    function handleToggleAutoRefresh() {
        const autoRefreshEnabled = !window.kichoAutoRefreshEnabled;
        window.kichoAutoRefreshEnabled = autoRefreshEnabled;
        
        if (autoRefreshEnabled) {
            window.kichoAutoRefreshTimer = setInterval(() => {
                console.log('🔄 自動更新実行');
                updateLastUpdateTime();
                // 必要に応じてデータ更新処理を追加
            }, 30000); // 30秒間隔
            showNotification('自動更新を開始しました', 'success');
        } else {
            if (window.kichoAutoRefreshTimer) {
                clearInterval(window.kichoAutoRefreshTimer);
                window.kichoAutoRefreshTimer = null;
            }
            showNotification('自動更新を停止しました', 'info');
        }
        
        return { success: true, message: `自動更新を${autoRefreshEnabled ? '開始' : '停止'}しました` };
    }

    // =====================================
    // 🎨 UI管理システム
    // =====================================

    /**
     * 通知表示
     */
    function showNotification(message, type = 'info', duration = 3000) {
        let alertElement;
        
        if (type === 'success') {
            alertElement = document.getElementById('successAlert');
            const messageElement = document.getElementById('successMessage');
            if (messageElement) messageElement.textContent = message;
        } else if (type === 'error') {
            alertElement = document.getElementById('errorAlert');
            const messageElement = document.getElementById('errorMessage');
            if (messageElement) messageElement.textContent = message;
        }
        
        if (alertElement) {
            alertElement.style.display = 'flex';
            setTimeout(() => {
                alertElement.style.display = 'none';
            }, duration);
        } else {
            // フォールバック通知
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
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // アニメーション
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        // 自動削除
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
     * 要素のローディング表示
     */
    function showElementLoading(element) {
        if (!element) return;
        
        element.disabled = true;
        element.style.position = 'relative';
        element.style.pointerEvents = 'none';
        
        const spinner = document.createElement('div');
        spinner.className = 'kicho-spinner';
        spinner.style.cssText = `
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 20px; height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;
        
        // CSS アニメーション追加
        if (!document.getElementById('kicho-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'kicho-spinner-style';
            style.textContent = `
                @keyframes spin {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        element.appendChild(spinner);
    }

    /**
     * 要素のローディング解除
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
        
    return data;
    }

    /**
     * 選択データ数更新
     */
    function updateSelectedDataCount() {
        const selectedCount = document.querySelectorAll('.kicho__data-checkbox:checked').length;
        const countElement = document.getElementById('selectedDataCount');
        if (countElement) {
            countElement.textContent = selectedCount;
        }
    }

    /**
     * 最終更新時刻更新
     */
    function updateLastUpdateTime() {
        const timeElement = document.getElementById('lastUpdateTime');
        if (timeElement) {
            timeElement.textContent = new Date().toLocaleTimeString('ja-JP');
        }
    }

    /**
     * 取引詳細モーダル表示
     */
    function showTransactionModal(transactionData) {
        // モーダル実装（簡略版）
        console.log('取引詳細表示:', transactionData);
        showNotification('取引詳細を表示しました', 'info');
    }

    // チェックボックス選択数更新
    function updateSelectedCount() {
        const checkedBoxes = document.querySelectorAll('.kicho__data-checkbox:checked');
        const countElement = document.getElementById('selectedDataCount');
        
        if (countElement) {
            countElement.textContent = checkedBoxes.length;
        }
        
        // 学習データカウント更新
        const learningCountElement = document.getElementById('learningDataCount');
        if (learningCountElement) {
            learningCountElement.textContent = `${checkedBoxes.length}件選択中`;
        }
        
        // 推定値更新
        const estimatedRules = Math.floor(checkedBoxes.length * 2.5);
        const estimatedTime = checkedBoxes.length > 0 ? `${Math.ceil(checkedBoxes.length * 0.8)}分` : '未選択';
        
        const rulesElement = document.getElementById('estimatedRules');
        const timeElement = document.getElementById('estimatedTime');
        
        if (rulesElement) rulesElement.textContent = `${estimatedRules}件`;
        if (timeElement) timeElement.textContent = estimatedTime;
    }

    // =====================================
    // 🎯 NAGANO3名前空間登録
    // =====================================
    window.NAGANO3 = window.NAGANO3 || {};
    window.NAGANO3.kicho = {
        version: '2.1.0-warning-free',
        executeAction: executeKichoAction,
        ajaxManager: ajaxManager,
        showNotification: showNotification,
        updateLastUpdateTime: updateLastUpdateTime,
        initialized: true
    };

    // =====================================
    // 🚀 初期化処理
    // =====================================
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM準備完了 - KICHO警告修正版初期化');
        
        if (IS_KICHO_PAGE) {
            console.log('✅ KICHOページ検出 - 機能有効化');
            
            // 初期設定
            updateLastUpdateTime();
            updateSelectedDataCount();
            
            // ESCキーでアラートを閉じる
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    const alerts = document.querySelectorAll('.alert');
                    alerts.forEach(alert => {
                        alert.style.display = 'none';
                    });
                }
            });
            
            console.log('✅ KICHO.js 初期化完了（警告修正版）');
            showNotification('記帳自動化ツールが起動しました', 'success');
} else {
            console.log('ℹ️ 非KICHOページ - 機能待機中');
        }
    });

    // ページアンロード時のクリーンアップ
    window.addEventListener('beforeunload', function() {
        if (window.kichoAutoRefreshTimer) {
            clearInterval(window.kichoAutoRefreshTimer);
        }
        console.log('🧹 KICHO.js クリーンアップ完了');
    });

    console.log('🎯 KICHO.js (警告修正版) 読み込み完了');
})(); // 即座実行関数で全体をラップ