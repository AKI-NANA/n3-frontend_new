
// CAIDS processing_capacity_monitoring Hook
// CAIDS processing_capacity_monitoring Hook - 基本実装
console.log('✅ processing_capacity_monitoring Hook loaded');

// CAIDS character_limit Hook
// CAIDS character_limit Hook - 基本実装
console.log('✅ character_limit Hook loaded');

// CAIDS ajax_integration Hook
// CAIDS ajax_integration Hook - 基本実装
console.log('✅ ajax_integration Hook loaded');

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
 * static/js/asin_upload.js - ASIN アップロード JavaScript（完全版）
 * HTMLの全JavaScript関数を実際のAPI呼び出しに変更
 * モック処理を削除し、FastAPI エンドポイントと連動
 */

// === グローバル設定 ===
const ASIN_API_CONFIG = {
    baseUrl: '/api/v1/asin-upload',
    pollInterval: 1000, // 進捗確認間隔（ミリ秒）
    maxPollAttempts: 300, // 最大ポーリング回数（5分）
    uploadTimeout: 30000 // アップロードタイムアウト（30秒）
};

// === グローバル変数 ===
let processedData = [];
let currentFile = null;
let currentSessionId = null;
let progressPollTimer = null;

// === APIクライアント関数 ===

/**
 * 統一API呼び出し関数
 */
async function apiCall(endpoint, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include' // 認証クッキーを含める
    };

    // CSRFトークンを取得して追加
    const csrfToken = document.querySelector('meta[name="csrf-token"]');
    if (csrfToken) {
        defaultOptions.headers['X-CSRF-Token'] = csrfToken.getAttribute('content');
    }

    const config = { ...defaultOptions, ...options };
    const url = `${ASIN_API_CONFIG.baseUrl}${endpoint}`;

    try {
        const response = await fetch(url, config);
        
        // レスポンス内容タイプ確認
        const contentType = response.headers.get('content-type');
        
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            
            // JSONエラーレスポンスを解析
            if (contentType && contentType.includes('application/json')) {
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch (e) {
                    // JSON解析失敗時は元のエラーメッセージを使用
                }
            }
            
            throw new Error(errorMessage);
        }

        // ファイルダウンロードの場合
        if (contentType && (contentType.includes('text/csv') || contentType.includes('application/octet-stream'))) {
            return response; // Blobとして処理するためresponseをそのまま返す
        }

        // JSONレスポンス
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        // その他のレスポンス
        return await response.text();

    } catch (error) {
        console.error('API呼び出しエラー:', error);
        throw error;
    }
}

/**
 * FormData API呼び出し（ファイルアップロード用）
 */
async function apiCallFormData(endpoint, formData) {
    const url = `${ASIN_API_CONFIG.baseUrl}${endpoint}`;

    // CSRFトークンをFormDataに追加
    const csrfToken = document.querySelector('meta[name="csrf-token"]');
    if (csrfToken) {
        formData.append('csrf_token', csrfToken.getAttribute('content'));
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error('FormData API呼び出しエラー:', error);
        throw error;
    }
}

// === 既存UI関数（HTMLと同じ） ===

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        handleFile(file);
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // ファイル形式チェック
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        showAlert('サポートされていないファイル形式です。CSV、XLS、XLSXファイルのみアップロード可能です。', 'error');
        return;
    }

    // ファイルサイズチェック (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showAlert('ファイルサイズが大きすぎます。10MB以下のファイルをアップロードしてください。', 'error');
        return;
    }

    currentFile = file;
    showAlert(`ファイル "${file.name}" が選択されました。処理ボタンをクリックして続行してください。`, 'success');
}

// === API連動メイン処理関数 ===

/**
 * CSVファイル処理（実際のAPI呼び出し）
 */
async function processCsvFile() {
    if (!currentFile) {
        showAlert('ファイルが選択されていません。', 'error');
        return;
    }

    try {
        showProgress(true);
        updateProgress(0, 'ファイルをアップロード中...');

        // FormData作成
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('create_products', 'true');

        // ファイルアップロード
        const response = await apiCallFormData('/upload-csv', formData);

        if (response.status === 'success') {
            currentSessionId = response.session_id;
            updateProgress(10, 'アップロード完了、処理開始中...');
            
            // 進捗ポーリング開始
            startProgressPolling();
            
            showAlert(`CSVファイルのアップロードが完了しました。${response.total_items}件のアイテムを処理中...`, 'success');
        } else {
            throw new Error(response.message || 'アップロードに失敗しました');
        }

    } catch (error) {
        console.error('CSVアップロードエラー:', error);
        showAlert('CSVファイルの処理に失敗しました: ' + error.message, 'error');
        showProgress(false);
    }
}

/**
 * 手動入力処理（実際のAPI呼び出し）
 */
async function processManualInput() {
    const asin = document.getElementById('asinInput').value.trim();
    const url = document.getElementById('urlInput').value.trim();
    const keyword = document.getElementById('keywordInput').value.trim();
    const sku = document.getElementById('skuInput').value.trim();

    if (!asin && !url && !keyword) {
        showAlert('ASIN、URL、キーワードのいずれかを入力してください。', 'error');
        return;
    }

    try {
        showProgress(true);
        updateProgress(0, '商品情報を取得中...');

        const requestData = {
            asin: asin || null,
            url: url || null,
            keyword: keyword || null,
            sku: sku || null,
            create_product: true
        };

        const response = await apiCall('/add-single', {
            method: 'POST',
            body: JSON.stringify(requestData)
        });

        updateProgress(100, '処理完了');
        showProgress(false);

        if (response.status === 'success') {
            processedData = [response.result];
            displayResults();
            clearManualForm();
            showAlert('商品の追加が完了しました。', 'success');
        } else {
            throw new Error(response.message || '処理に失敗しました');
        }

    } catch (error) {
        console.error('手動入力処理エラー:', error);
        showAlert('商品の処理に失敗しました: ' + error.message, 'error');
        showProgress(false);
    }
}

/**
 * 一括入力処理（実際のAPI呼び出し）
 */
async function processBulkInput() {
    const bulkText = document.getElementById('bulkInput').value.trim();
    if (!bulkText) {
        showAlert('ASIN・URLを入力してください。', 'error');
        return;
    }

    try {
        showProgress(true);
        updateProgress(0, '一括処理を開始中...');

        const requestData = {
            bulk_text: bulkText,
            create_products: true
        };

        const response = await apiCall('/bulk-paste', {
            method: 'POST',
            body: JSON.stringify(requestData)
        });

        if (response.status === 'success') {
            currentSessionId = response.session_id;
            updateProgress(10, `${response.total_items}件のアイテムを処理中...`);
            
            // 進捗ポーリング開始
            startProgressPolling();
            
            showAlert(`一括処理を開始しました。${response.total_items}件のアイテムを処理中...`, 'success');
        } else {
            throw new Error(response.message || '一括処理の開始に失敗しました');
        }

    } catch (error) {
        console.error('一括処理エラー:', error);
        showAlert('一括処理に失敗しました: ' + error.message, 'error');
        showProgress(false);
    }
}

/**
 * 進捗ポーリング開始
 */
function startProgressPolling() {
    if (!currentSessionId) {
        console.error('セッションIDが設定されていません');
        return;
    }

    let pollAttempts = 0;

    progressPollTimer = setInterval(async () => {
        try {
            pollAttempts++;
            
            if (pollAttempts > ASIN_API_CONFIG.maxPollAttempts) {
                clearInterval(progressPollTimer);
                showAlert('処理がタイムアウトしました。', 'error');
                showProgress(false);
                return;
            }

            const progressResponse = await apiCall(`/progress/${currentSessionId}`);
            
            if (progressResponse.status === 'processing') {
                updateProgress(
                    progressResponse.percentage || 0,
                    progressResponse.message || '処理中...'
                );
            } else if (progressResponse.status === 'completed') {
                clearInterval(progressPollTimer);
                updateProgress(100, '処理完了');
                
                // 結果取得
                await loadResults();
                
            } else if (progressResponse.status === 'error') {
                clearInterval(progressPollTimer);
                showAlert('処理中にエラーが発生しました: ' + (progressResponse.error_message || '不明なエラー'), 'error');
                showProgress(false);
            }

        } catch (error) {
            console.error('進捗確認エラー:', error);
            // エラーが続く場合はポーリング停止
            if (pollAttempts > 10) {
                clearInterval(progressPollTimer);
                showAlert('進捗の確認に失敗しました: ' + error.message, 'error');
                showProgress(false);
            }
        }
    }, ASIN_API_CONFIG.pollInterval);
}

/**
 * 結果読み込み
 */
async function loadResults() {
    try {
        const response = await apiCall(`/results/${currentSessionId}`);
        
        if (response.status === 'completed') {
            processedData = response.results;
            displayResults();
            showProgress(false);
            
            showAlert(
                `処理完了: 成功 ${response.success_count}件, エラー ${response.error_count}件`,
                response.success_count > 0 ? 'success' : 'error'
            );
        } else {
            throw new Error('結果の取得に失敗しました');
        }

    } catch (error) {
        console.error('結果読み込みエラー:', error);
        showAlert('結果の読み込みに失敗しました: ' + error.message, 'error');
        showProgress(false);
    }
}

/**
 * 結果表示（HTMLと同じUI、データソースのみAPI）
 */
function displayResults() {
    const resultSection = document.getElementById('resultSection');
    const tableBody = document.getElementById('resultTableBody');
    
    tableBody.innerHTML = '';

    processedData.forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${result.input_value || ''}</td>
            <td>${result.input_type || ''}</td>
            <td><span class="status-badge status-${result.status}">${result.status === 'success' ? '成功' : 'エラー'}</span></td>
            <td>${result.product_name || ''}</td>
            <td>${result.price_formatted || ''}</td>
            <td>${result.error_message || result.brand || ''}</td>
        `;
        tableBody.appendChild(row);
    });

    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * 結果ダウンロード（実際のAPI呼び出し）
 */
async function downloadResults() {
    if (!currentSessionId) {
        showAlert('ダウンロードできる結果がありません。', 'error');
        return;
    }

    try {
        showAlert('CSVファイルを準備中...', 'info');

        const response = await apiCall(`/export/${currentSessionId}?format=csv`);
        
        // Blobとしてファイルをダウンロード
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // ダウンロードリンク作成
        const link = document.createElement('a');
        link.href = url;
        link.download = `asin_upload_results_${currentSessionId}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // メモリクリーンアップ
        window.URL.revokeObjectURL(url);
        
        showAlert('CSVファイルのダウンロードが開始されました。', 'success');

    } catch (error) {
        console.error('ダウンロードエラー:', error);
        showAlert('CSVファイルのダウンロードに失敗しました: ' + error.message, 'error');
    }
}

/**
 * 手動フォームクリア
 */
function clearManualForm() {
    document.getElementById('asinInput').value = '';
    document.getElementById('urlInput').value = '';
    document.getElementById('keywordInput').value = '';
    document.getElementById('skuInput').value = '';
}

/**
 * 一括入力フォームクリア
 */
function clearBulkForm() {
    document.getElementById('bulkInput').value = '';
}

/**
 * 全結果クリア
 */
function clearResults() {
    processedData = [];
    currentSessionId = null;
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('resultTableBody').innerHTML = '';
    showAlert('結果がクリアされました。', 'info');
}

/**
 * ファイル処理リセット
 */
function resetFileUpload() {
    currentFile = null;
    document.getElementById('fileInput').value = '';
    showAlert('ファイル選択がリセットされました。', 'info');
}

// === UI ヘルパー関数 ===

/**
 * アラート表示
 */
function showAlert(message, type = 'info') {
    // EmverzeUIのshowToastを使用（main.css対応）
    if (typeof EmverzeUI !== 'undefined' && EmverzeUI.showToast) {
        EmverzeUI.showToast(type, type === 'success' ? '成功' : type === 'error' ? 'エラー' : '情報', message);
    } else {
        // フォールバック: 基本アラート
        alert(`[${type.toUpperCase()}] ${message}`);
    }
}

/**
 * 進捗表示制御
 */
function showProgress(show) {
    const progressSection = document.getElementById('progressSection');
    if (progressSection) {
        progressSection.style.display = show ? 'block' : 'none';
    }
}

/**
 * 進捗バー更新
 */
function updateProgress(percentage, message) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar) {
        progressBar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
    }
    
    if (progressText) {
        progressText.textContent = message || `${percentage}%`;
    }
}

/**
 * 商品情報検証（リアルタイムチェック）
 */
async function validateProductInfo(input, inputType) {
    try {
        const response = await apiCall('/validate', {
            method: 'POST',
            body: JSON.stringify({
                input_value: input,
                input_type: inputType
            })
        });

        if (response.status === 'success') {
            return {
                valid: true,
                product_name: response.product_name,
                price: response.price,
                availability: response.availability
            };
        } else {
            return {
                valid: false,
                error: response.message || '検証に失敗しました'
            };
        }

    } catch (error) {
        console.error('検証エラー:', error);
        return {
            valid: false,
            error: error.message
        };
    }
}

/**
 * リアルタイム入力検証（手動入力用）
 */
function setupRealTimeValidation() {
    const asinInput = document.getElementById('asinInput');
    const urlInput = document.getElementById('urlInput');
    const keywordInput = document.getElementById('keywordInput');

    let validationTimer = null;

    // ASIN入力検証
    if (asinInput) {
        asinInput.addEventListener('input', (e) => {
            clearTimeout(validationTimer);
            const value = e.target.value.trim();
            
            if (value.length >= 10) { // ASINは通常10文字
                validationTimer = setTimeout(async () => {
                    const result = await validateProductInfo(value, 'asin');
                    updateValidationUI('asin', result);
                }, 500);
            }
        });
    }

    // URL入力検証
    if (urlInput) {
        urlInput.addEventListener('input', (e) => {
            clearTimeout(validationTimer);
            const value = e.target.value.trim();
            
            if (value.startsWith('http')) {
                validationTimer = setTimeout(async () => {
                    const result = await validateProductInfo(value, 'url');
                    updateValidationUI('url', result);
                }, 1000);
            }
        });
    }
}

/**
 * 検証UI更新
 */
function updateValidationUI(inputType, result) {
    const inputElement = document.getElementById(`${inputType}Input`);
    if (!inputElement) return;

    // 既存の検証表示を削除
    const existingFeedback = inputElement.parentNode.querySelector('.validation-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }

    // 新しい検証結果表示
    const feedback = document.createElement('div');
    feedback.className = 'validation-feedback';
    
    if (result.valid) {
        feedback.innerHTML = `
            <div class="validation-success">
                <i class="fas fa-check-circle"></i>
                <span>商品名: ${result.product_name}</span>
                ${result.price ? `<span>価格: ${result.price}</span>` : ''}
            </div>
        `;
        inputElement.classList.add('valid');
        inputElement.classList.remove('invalid');
    } else {
        feedback.innerHTML = `
            <div class="validation-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>${result.error}</span>
            </div>
        `;
        inputElement.classList.add('invalid');
        inputElement.classList.remove('valid');
    }

    inputElement.parentNode.appendChild(feedback);
}

// === 初期化処理 ===

/**
 * DOMContent読み込み完了時の初期化
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('ASIN Upload JavaScript初期化開始');

    // リアルタイム検証セットアップ
    setupRealTimeValidation();

    // WebSocket接続（利用可能な場合）
    if (typeof EmverzeWebSocket !== 'undefined') {
        EmverzeWebSocket.on('asin_progress', (data) => {
            if (data.session_id === currentSessionId) {
                updateProgress(data.percentage, data.message);
                
                if (data.status === 'completed') {
                    loadResults();
                } else if (data.status === 'error') {
                    showAlert('処理中にエラーが発生しました: ' + data.error_message, 'error');
                    showProgress(false);
                }
            }
        });
    }

    console.log('ASIN Upload JavaScript初期化完了');
});

/**
 * ページ離脱時のクリーンアップ
 */
window.addEventListener('beforeunload', function() {
    if (progressPollTimer) {
        clearInterval(progressPollTimer);
    }
});

// === デバッグ用関数（開発環境のみ） ===

/**
 * API設定表示（開発用）
 */
function showApiConfig() {
    console.log('ASIN API設定:', ASIN_API_CONFIG);
    console.log('現在のセッションID:', currentSessionId);
    console.log('処理済みデータ:', processedData);
}

/**
 * 進捗ポーリング強制停止（開発用）
 */
function stopPolling() {
    if (progressPollTimer) {
        clearInterval(progressPollTimer);
        progressPollTimer = null;
        console.log('進捗ポーリングを停止しました');
    }
}

// === グローバル関数エクスポート ===
window.ASIN_Upload = {
    // メイン処理関数
    processCsvFile,
    processManualInput,
    processBulkInput,
    downloadResults,
    
    // UI制御関数
    switchTab,
    clearResults,
    resetFileUpload,
    clearManualForm,
    clearBulkForm,
    
    // ファイル処理関数
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    
    // デバッグ関数
    showApiConfig,
    stopPolling,
    
    // 設定・状態取得
    getConfig: () => ASIN_API_CONFIG,
    getCurrentSession: () => currentSessionId,
    getProcessedData: () => processedData
};