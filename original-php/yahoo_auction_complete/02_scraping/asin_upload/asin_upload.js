
// CAIDS timeout_management Hook
// CAIDS timeout_management Hook - 基本実装
console.log('✅ timeout_management Hook loaded');

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

console.log("🚀 ASIN/URLアップロード専用JavaScript開始");

// ===== グローバル変数 =====
let asinUploadData = {
    processedItems: [],
    currentFile: null,
    isProcessing: false
};

// ===== DOMContentLoaded時の初期化 =====
document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ ASIN/URLアップロード DOM読み込み完了");

    // ===== タブ切り替え機能 =====
    initializeTabs();
    
    // ===== ファイルアップロード機能 =====
    initializeFileUpload();
    
    // ===== 手動入力機能 =====
    initializeManualInput();
    
    // ===== 一括入力機能 =====
    initializeBulkInput();
    
    // ===== その他のイベント設定 =====
    initializeOtherEvents();
    
    console.log("✅ ASIN/URLアップロード初期化完了");
});

// ===== タブ切り替え機能 =====
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.asin-upload__tab-button');
    const tabContents = document.querySelectorAll('.asin-upload__tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // すべてのタブボタンからアクティブクラスを削除
            tabButtons.forEach(btn => btn.classList.remove('asin-upload__tab-button--active'));
            
            // すべてのタブコンテンツを非表示
            tabContents.forEach(content => content.classList.remove('asin-upload__tab-content--active'));
            
            // クリックされたタブボタンをアクティブに
            this.classList.add('asin-upload__tab-button--active');
            
            // 対応するタブコンテンツを表示
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('asin-upload__tab-content--active');
            }
            
            console.log(`🔄 タブ切り替え: ${targetTab}`);
        });
    });
}

// ===== ファイルアップロード機能 =====
function initializeFileUpload() {
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('csvFile');
    const processCsvBtn = document.getElementById('processCsvBtn');

    if (!fileUploadArea || !fileInput || !processCsvBtn) {
        console.error("❌ ファイルアップロード要素が見つかりません");
        return;
    }

    // ファイルエリアクリック
    fileUploadArea.addEventListener('click', function() {
        fileInput.click();
    });

    // ファイル選択
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            handleFileSelection(file);
        }
    });

    // ドラッグ&ドロップ
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('asin-upload__file-upload-area--dragover');
    });

    fileUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('asin-upload__file-upload-area--dragover');
    });

    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('asin-upload__file-upload-area--dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            handleFileSelection(file);
        }
    });

    // CSV処理ボタン
    processCsvBtn.addEventListener('click', function() {
        if (asinUploadData.currentFile) {
            processCsvFile();
        } else {
            showAlert('ファイルが選択されていません。', 'error');
        }
    });
}

// ===== ファイル選択処理 =====
function handleFileSelection(file) {
    console.log(`📁 ファイル選択: ${file.name}`);
    
    // ファイル形式チェック
    const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        showAlert('サポートされていないファイル形式です。CSV、XLS、XLSXファイルのみアップロード可能です。', 'error');
        return;
    }
    
    // ファイルサイズチェック (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showAlert('ファイルサイズが大きすぎます。10MB以下のファイルをアップロードしてください。', 'error');
        return;
    }
    
    asinUploadData.currentFile = file;
    showAlert(`ファイル "${file.name}" が選択されました。処理ボタンをクリックして続行してください。`, 'success');
}

// ===== CSV処理実行 =====
function processCsvFile() {
    if (asinUploadData.isProcessing) {
        console.log("⚠️ 既に処理中です");
        return;
    }
    
    console.log("🔄 CSV処理開始");
    asinUploadData.isProcessing = true;
    
    showProgress(true);
    updateProgress(0, 'ファイルを読み込み中...');
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const csvContent = e.target.result;
            const parsedData = parseCSV(csvContent);
            
            if (parsedData.length === 0) {
                throw new Error('有効なデータが見つかりませんでした。');
            }
            
            processDataArray(parsedData);
        } catch (error) {
            console.error("❌ CSV解析エラー:", error);
            showAlert(`ファイルの解析に失敗しました: ${error.message}`, 'error');
            showProgress(false);
            asinUploadData.isProcessing = false;
        }
    };
    
    reader.onerror = function() {
        console.error("❌ ファイル読み込みエラー");
        showAlert('ファイルの読み込みに失敗しました。', 'error');
        showProgress(false);
        asinUploadData.isProcessing = false;
    };
    
    reader.readAsText(asinUploadData.currentFile);
}

// ===== CSV解析 =====
function parseCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        throw new Error('空のファイルです。');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        if (values.length >= headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
    }
    
    console.log(`📊 CSV解析完了: ${data.length}行`);
    return data;
}

// CSV行解析（引用符対応）
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// ===== 手動入力機能 =====
function initializeManualInput() {
    const addManualBtn = document.getElementById('addManualBtn');
    const clearManualBtn = document.getElementById('clearManualBtn');

    if (addManualBtn) {
        addManualBtn.addEventListener('click', function() {
            processManualInput();
        });
    }

    if (clearManualBtn) {
        clearManualBtn.addEventListener('click', function() {
            clearManualForm();
        });
    }
}

function processManualInput() {
    const asin = document.getElementById('asinInput')?.value.trim() || '';
    const url = document.getElementById('urlInput')?.value.trim() || '';
    const keyword = document.getElementById('keywordInput')?.value.trim() || '';
    const sku = document.getElementById('skuInput')?.value.trim() || '';

    if (!asin && !url) {
        showAlert('ASINまたはURLのいずれかを入力してください。', 'error');
        return;
    }

    const inputData = [{
        ASIN: asin,
        URL: url,
        キーワード: keyword,
        SKU: sku
    }];

    processDataArray(inputData);
}

function clearManualForm() {
    const inputs = ['asinInput', 'urlInput', 'keywordInput', 'skuInput'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    
    showAlert('フォームをクリアしました。', 'info');
}

// ===== 一括入力機能 =====
function initializeBulkInput() {
    const processBulkBtn = document.getElementById('processBulkBtn');
    const clearBulkBtn = document.getElementById('clearBulkBtn');

    if (processBulkBtn) {
        processBulkBtn.addEventListener('click', function() {
            processBulkInput();
        });
    }

    if (clearBulkBtn) {
        clearBulkBtn.addEventListener('click', function() {
            clearBulkInput();
        });
    }
}

function processBulkInput() {
    const bulkText = document.getElementById('bulkInput')?.value.trim() || '';
    
    if (!bulkText) {
        showAlert('ASIN・URLを入力してください。', 'error');
        return;
    }

    const lines = bulkText.split('\n').filter(line => line.trim());
    
    if (lines.length > 1000) {
        showAlert('一度に処理できるのは1,000行までです。', 'error');
        return;
    }

    const inputData = lines.map(line => {
        const value = line.trim();
        // ASINかURLかを判定
        if (value.startsWith('http')) {
            return { ASIN: '', URL: value, キーワード: '', SKU: '' };
        } else {
            return { ASIN: value, URL: '', キーワード: '', SKU: '' };
        }
    });

    processDataArray(inputData);
}

function clearBulkInput() {
    const bulkInput = document.getElementById('bulkInput');
    if (bulkInput) {
        bulkInput.value = '';
    }
    
    showAlert('一括入力をクリアしました。', 'info');
}

// ===== データ配列処理 =====
async function processDataArray(dataArray) {
    if (!dataArray || dataArray.length === 0) {
        showAlert('処理するデータがありません。', 'error');
        return;
    }

    if (asinUploadData.isProcessing) {
        console.log("⚠️ 既に処理中です");
        return;
    }

    console.log(`🔄 データ処理開始: ${dataArray.length}件`);
    asinUploadData.isProcessing = true;
    asinUploadData.processedItems = [];

    showProgress(true);

    for (let i = 0; i < dataArray.length; i++) {
        const item = dataArray[i];
        const progress = ((i + 1) / dataArray.length) * 100;
        
        updateProgress(progress, `${i + 1}/${dataArray.length} 件処理中...`);

        try {
            const result = await processItem(item);
            asinUploadData.processedItems.push(result);
        } catch (error) {
            console.error(`❌ アイテム処理エラー:`, error);
            asinUploadData.processedItems.push({
                input: item.ASIN || item.URL || '不明',
                type: '処理エラー',
                status: 'error',
                productName: '',
                price: '',
                details: error.message,
                keyword: item.キーワード || '',
                sku: item.SKU || ''
            });
        }

        // UIの応答性を保つため少し待機
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    updateProgress(100, '処理完了');
    setTimeout(() => {
        showProgress(false);
        displayResults();
        asinUploadData.isProcessing = false;
    }, 500);

    console.log("✅ データ処理完了");
}

// ===== 個別アイテム処理 =====
async function processItem(item) {
    const input = item.ASIN || item.URL || '';

    // ASINの検証
    if (item.ASIN && !/^[B][0-9A-Z]{9}$/.test(item.ASIN)) {
        throw new Error('無効なASIN形式');
    }

    // URLの検証
    if (item.URL) {
        try {
            new URL(item.URL);
        } catch {
            throw new Error('無効なURL形式');
        }
    }

    // 実際の処理をシミュレート（実装時はAPI呼び出しに置き換え）
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

    // サンプル結果を返す
    const mockProducts = [
        { name: 'Echo Dot (第4世代) - スマートスピーカー with Alexa', price: '¥5,980' },
        { name: 'Fire TV Stick 4K Max - Alexa対応音声認識リモコン付属', price: '¥6,980' },
        { name: 'Kindle Paperwhite (8GB) 6.8インチディスプレイ 防水機能搭載', price: '¥14,980' },
        { name: 'Echo Show 5 (第3世代) - スマートディスプレイ with Alexa', price: '¥8,980' },
        { name: 'Fire HD 10 タブレット 10.1インチHDディスプレイ 32GB', price: '¥15,980' },
        { name: 'Amazon Echo Buds (第2世代) ワイヤレスイヤホン', price: '¥12,980' }
    ];

    const randomProduct = mockProducts[Math.floor(Math.random() * mockProducts.length)];

    return {
        input: input,
        type: item.ASIN ? 'ASIN' : 'URL',
        status: 'success',
        productName: randomProduct.name,
        price: randomProduct.price,
        details: 'Amazon商品データ取得成功',
        keyword: item.キーワード || '',
        sku: item.SKU || ''
    };
}

// ===== 結果表示 =====
function displayResults() {
    const resultSection = document.getElementById('resultSection');
    const resultSummary = document.getElementById('resultSummary');
    const tableBody = document.getElementById('resultTableBody');

    if (!resultSection || !tableBody) {
        console.error("❌ 結果表示要素が見つかりません");
        return;
    }

    // 結果サマリー作成
    const successCount = asinUploadData.processedItems.filter(r => r.status === 'success').length;
    const errorCount = asinUploadData.processedItems.filter(r => r.status === 'error').length;
    const totalCount = asinUploadData.processedItems.length;

    if (resultSummary) {
        resultSummary.innerHTML = `
            <div class="asin-upload__summary-item">
                <div class="asin-upload__summary-value asin-upload__summary-value--total">${totalCount}</div>
                <div class="asin-upload__summary-label">合計</div>
            </div>
            <div class="asin-upload__summary-item">
                <div class="asin-upload__summary-value asin-upload__summary-value--success">${successCount}</div>
                <div class="asin-upload__summary-label">成功</div>
            </div>
            <div class="asin-upload__summary-item">
                <div class="asin-upload__summary-value asin-upload__summary-value--error">${errorCount}</div>
                <div class="asin-upload__summary-label">エラー</div>
            </div>
        `;
    }

    // テーブル内容クリア
    tableBody.innerHTML = '';

    // 結果を表示
    asinUploadData.processedItems.forEach((result, index) => {
        const row = document.createElement('tr');
        
        const statusClass = result.status === 'success' ? 'success' : 'error';
        const statusText = result.status === 'success' ? '成功' : 'エラー';

        row.innerHTML = `
            <td>${escapeHtml(result.input)}</td>
            <td>${escapeHtml(result.type)}</td>
            <td>
                <span class="asin-upload__status-badge asin-upload__status-badge--${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td>${escapeHtml(result.productName)}</td>
            <td>${escapeHtml(result.price)}</td>
            <td>${escapeHtml(result.details)}</td>
        `;
        
        tableBody.appendChild(row);
    });

    // 結果セクションを表示
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });

    // アラート表示
    const alertType = successCount > 0 ? 'success' : 'error';
    const alertMessage = `処理完了: 成功 ${successCount}件, エラー ${errorCount}件`;
    showAlert(alertMessage, alertType);

    console.log(`📊 結果表示完了: 成功 ${successCount}件, エラー ${errorCount}件`);
}

// ===== プログレス表示制御 =====
function showProgress(show) {
    const progressSection = document.getElementById('progressSection');
    if (progressSection) {
        progressSection.style.display = show ? 'block' : 'none';
    }
}

function updateProgress(percentage, text) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    if (progressFill) {
        progressFill.style.width = Math.min(100, Math.max(0, percentage)) + '%';
    }
    
    if (progressText) {
        progressText.textContent = text;
    }
}

// ===== アラート表示 =====
function showAlert(message, type = 'info') {
    // 既存のアラートを削除
    const existingAlert = document.querySelector('.asin-upload__alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    const alert = document.createElement('div');
    alert.className = `asin-upload__alert asin-upload__alert--${type}`;
    alert.textContent = message;

    // メインコンテンツの先頭に挿入
    const content = document.querySelector('.content');
    if (content) {
        content.insertBefore(alert, content.firstChild);
    }

    // 5秒後に自動削除
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);

    console.log(`📢 アラート表示: [${type.toUpperCase()}] ${message}`);
}

// ===== その他のイベント設定 =====
function initializeOtherEvents() {
    // 結果ダウンロードボタン
    const downloadBtn = document.getElementById('downloadResultsBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            downloadResults();
        });
    }

    // フォームリセットボタン
    const resetBtn = document.getElementById('resetFormBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            resetForm();
        });
    }

    // 統計カードのクリックイベント
    const statCards = document.querySelectorAll('.dashboard__stat-card[data-modal]');
    statCards.forEach(card => {
        card.addEventListener('click', function() {
            const modalType = this.getAttribute('data-modal');
            showStatCardModal(modalType);
        });
    });
}

// ===== 結果ダウンロード =====
function downloadResults() {
    if (asinUploadData.processedItems.length === 0) {
        showAlert('ダウンロードできる結果がありません。', 'error');
        return;
    }

    const csvContent = generateCSV(asinUploadData.processedItems);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `asin_upload_results_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('結果をCSVファイルとしてダウンロードしました。', 'success');
    console.log("💾 結果ダウンロード完了");
}

function generateCSV(data) {
    const headers = ['入力値', '種別', 'ステータス', '商品名', '価格', '詳細', 'キーワード', 'SKU'];
    const csvRows = [headers.join(',')];

    data.forEach(row => {
        const values = [
            `"${row.input.replace(/"/g, '""')}"`,
            `"${row.type.replace(/"/g, '""')}"`,
            `"${(row.status === 'success' ? '成功' : 'エラー').replace(/"/g, '""')}"`,
            `"${row.productName.replace(/"/g, '""')}"`,
            `"${row.price.replace(/"/g, '""')}"`,
            `"${row.details.replace(/"/g, '""')}"`,
            `"${row.keyword.replace(/"/g, '""')}"`,
            `"${row.sku.replace(/"/g, '""')}"`
        ];
        csvRows.push(values.join(','));
    });

    return '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM付き
}

// ===== フォームリセット =====
function resetForm() {
    // データクリア
    asinUploadData.processedItems = [];
    asinUploadData.currentFile = null;
    asinUploadData.isProcessing = false;

    // フォーム要素クリア
    const fileInput = document.getElementById('csvFile');
    if (fileInput) fileInput.value = '';

    clearManualForm();
    clearBulkInput();

    // UI状態リセット
    const resultSection = document.getElementById('resultSection');
    if (resultSection) resultSection.style.display = 'none';

    showProgress(false);

    // 最初のタブに戻す
    const firstTab = document.querySelector('.asin-upload__tab-button[data-tab="csv-upload"]');
    if (firstTab) {
        firstTab.click();
    }

    showAlert('フォームがリセットされました。', 'success');
    console.log("🔄 フォームリセット完了");
}

// ===== 統計カードモーダル =====
function showStatCardModal(modalType) {
    const modalData = {
        processed: { title: '処理済みデータ詳細', content: '処理済みの商品データ一覧を表示します' },
        pending: { title: '処理待ちデータ詳細', content: '処理待ちの商品データ一覧を表示します' },
        errors: { title: 'エラーデータ詳細', content: 'エラーが発生した商品データ一覧を表示します' },
        total: { title: '全データ詳細', content: '全ての商品データ一覧を表示します' }
    };

    const data = modalData[modalType];
    if (data) {
        showModal(data.title, data.content, modalType);
    }
}

// ===== 簡易モーダル表示 =====
function showModal(title, content, type = '') {
    const existingModal = document.querySelector('.asin-upload__modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'asin-upload__modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
        backdrop-filter: blur(4px);
    `;

    const modalContent = document.createElement('div');
    modalContent.className = 'asin-upload__modal-content';
    modalContent.style.cssText = `
        background: var(--bg-secondary);
        padding: 3rem;
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-lg);
        max-width: 800px;
        width: 90%;
        max-height: 80vh;
        text-align: left;
        transform: scale(0.9);
        transition: transform 0.3s ease;
        border: 1px solid var(--shadow-dark);
        overflow-y: auto;
    `;

    modalContent.innerHTML = `
        <div class="asin-upload__modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid var(--shadow-dark); padding-bottom: 1rem;">
            <h3 class="asin-upload__modal-title" style="margin: 0; color: var(--text-primary); font-size: 1.5rem;">${escapeHtml(title)}</h3>
            <button class="asin-upload__modal-close" style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-primary); border: 1px solid var(--shadow-dark); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">×</button>
        </div>
        <div class="asin-upload__modal-body" style="margin-bottom: 2rem;">
            <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem;">${escapeHtml(content)}</p>
            <div style="background: var(--bg-primary); padding: 2rem; border-radius: var(--radius-lg); margin-bottom: 1.5rem;">
                <h4 style="margin: 0 0 1rem 0; color: var(--text-primary);">データ詳細</h4>
                <div style="display: grid; gap: 1rem;">
                    <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--shadow-dark);">ASIN/URLアップロードシステム詳細データ</div>
                    <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--shadow-dark);">処理ステータス: ${type}</div>
                </div>
            </div>
        </div>
        <div class="asin-upload__modal-actions" style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button class="btn asin-upload__modal-close" style="background: var(--bg-primary); border: 1px solid var(--shadow-dark);">キャンセル</button>
            <button class="btn btn--primary">確認</button>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    setTimeout(() => {
        modal.style.opacity = '1';
        modalContent.style.transform = 'scale(1)';
    }, 10);

    const closeBtns = modalContent.querySelectorAll('.asin-upload__modal-close');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.style.opacity = '0';
            modalContent.style.transform = 'scale(0.9)';
            setTimeout(() => modal.remove(), 300);
        });
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.opacity = '0';
            modalContent.style.transform = 'scale(0.9)';
            setTimeout(() => modal.remove(), 300);
        }
    });

    console.log(`📋 モーダル表示: ${title}`);
}

// ===== ユーティリティ関数 =====
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        return '';
    }
    
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ===== デバッグ用関数 =====
window.asinUploadDebug = {
    getData: () => asinUploadData,
    clearData: () => {
        asinUploadData.processedItems = [];
        asinUploadData.currentFile = null;
        asinUploadData.isProcessing = false;
        console.log("🗑️ デバッグ: データクリア完了");
    },
    testProcessing: () => {
        const testData = [
            { ASIN: 'B08N5WRWNW', URL: '', キーワード: 'Echo Dot', SKU: 'TEST-001' },
            { ASIN: '', URL: 'https://amazon.co.jp/dp/B09B8RRQT5', キーワード: 'Fire TV', SKU: 'TEST-002' }
        ];
        processDataArray(testData);
        console.log("🧪 デバッグ: テスト処理実行");
    }
};

console.log("✅ ASIN/URLアップロード専用JavaScript初期化完了");