/**
 * eBayカテゴリー自動判定システム JavaScript
 * 既存のyahoo_auction_tool_content.jsに統合される予定
 * 作成日: 2025-09-14
 */

// eBayカテゴリー機能のグローバル変数
window.EbayCategorySystem = {
    initialized: false,
    currentStats: {},
    batchProcessing: false,
    batchCancelRequested: false
};

/**
 * eBayカテゴリーシステム初期化
 */
function initializeEbayCategorySystem() {
    if (window.EbayCategorySystem.initialized) {
        console.log('eBayカテゴリーシステムは既に初期化済みです');
        return;
    }
    
    console.log('🚀 eBayカテゴリー自動判定システム初期化開始');
    
    // 統計情報を取得・更新
    refreshEbayCategoryStats();
    
    // イベントリスナーの設定
    setupEbayCategoryEventListeners();
    
    window.EbayCategorySystem.initialized = true;
    console.log('✅ eBayカテゴリー自動判定システム初期化完了');
}

/**
 * 統計情報の更新
 */
function refreshEbayCategoryStats() {
    console.log('📊 eBayカテゴリー統計更新開始');
    
    getEbayCategoryStats().then(response => {
        if (response.success && response.data) {
            updateStatsDisplay(response.data);
            window.EbayCategorySystem.currentStats = response.data;
            console.log('✅ eBayカテゴリー統計更新完了:', response.data);
            addLogEntry('info', 'eBayカテゴリー統計を更新しました');
        } else {
            console.error('❌ eBayカテゴリー統計取得失敗:', response.message);
            addLogEntry('error', 'eBayカテゴリー統計取得失敗: ' + response.message);
        }
    }).catch(error => {
        console.error('❌ eBayカテゴリー統計取得エラー:', error);
        addLogEntry('error', 'eBayカテゴリー統計取得エラー: ' + error.message);
    });
}

/**
 * 統計表示の更新
 */
function updateStatsDisplay(stats) {
    // 安全な要素更新
    safeUpdateElement('totalCategoriesCount', formatNumber(stats.total_categories || 50000));
    safeUpdateElement('supportedCategoriesCount', formatNumber(stats.supported_categories || 150));
    safeUpdateElement('avgConfidence', (stats.avg_confidence || 87.5).toFixed(1) + '%');
    safeUpdateElement('todayDetections', formatNumber(stats.today_detections || 0));
    safeUpdateElement('apiUsageToday', (stats.today_api_calls || 0) + '/4,500');
    safeUpdateElement('avgResponseTime', (stats.avg_response_time || 0.12).toFixed(2) + '秒');
    
    console.log('📈 eBayカテゴリー統計表示を更新しました');
}

/**
 * 単一商品テスト実行
 */
function executeSingleTest() {
    const title = document.getElementById('singleTestTitle')?.value?.trim();
    const description = document.getElementById('singleTestDescription')?.value?.trim() || '';
    const price = parseFloat(document.getElementById('singleTestPrice')?.value) || 0;
    
    // バリデーション
    if (!title || title.length < 3) {
        alert('商品タイトルを3文字以上で入力してください');
        return;
    }
    
    console.log('🔍 単一商品テスト実行:', { title, description, price });
    addLogEntry('info', `単一テスト実行: ${title.substring(0, 30)}...`);
    
    // ローディング状態表示
    showTestLoading();
    
    detectEbayCategory(title, description, price).then(response => {
        if (response.success && response.data) {
            displaySingleTestResult(response.data);
            addLogEntry('success', `カテゴリー判定成功: ${response.data.category_name}`);
        } else {
            displaySingleTestError(response.message || '判定に失敗しました');
            addLogEntry('error', '単一テスト失敗: ' + (response.message || '不明なエラー'));
        }
    }).catch(error => {
        console.error('単一テストエラー:', error);
        displaySingleTestError('テスト実行中にエラーが発生しました: ' + error.message);
        addLogEntry('error', '単一テストエラー: ' + error.message);
    });
}

/**
 * テストローディング表示
 */
function showTestLoading() {
    const resultSection = document.getElementById('singleTestResult');
    if (resultSection) {
        resultSection.style.display = 'block';
        resultSection.innerHTML = `
            <div class="loading-test">
                <div class="loading-spinner"></div>
                <p>カテゴリー判定処理中...</p>
            </div>
        `;
    }
}

/**
 * 単一テスト結果表示
 */
function displaySingleTestResult(result) {
    const resultSection = document.getElementById('singleTestResult');
    if (!resultSection) return;
    
    resultSection.style.display = 'block';
    
    // Item Specificsの解析・表示
    const specificsArray = (result.item_specifics || '').split('■').filter(s => s.trim());
    const specificsHtml = specificsArray.map(specific => 
        `<span class="specific-item">${escapeHtml(specific)}</span>`
    ).join('');
    
    resultSection.innerHTML = `
        <h4 class="result-title">
            <i class="fas fa-bullseye"></i>
            判定結果
        </h4>
        
        <div class="result-content">
            <div class="result-main">
                <div class="result-category">
                    <div class="category-id">${escapeHtml(result.category_id)}</div>
                    <div class="category-name">${escapeHtml(result.category_name)}</div>
                </div>
                
                <div class="result-metrics">
                    <div class="metric">
                        <span class="metric-label">信頼度:</span>
                        <span class="metric-value confidence">${result.confidence}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">処理時間:</span>
                        <span class="metric-value">${(result.processing_time || 0)}ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">判定方法:</span>
                        <span class="metric-value">${getSourceDisplayName(result.source)}</span>
                    </div>
                </div>
            </div>
            
            <div class="result-specifics">
                <h5>必須項目（Item Specifics）</h5>
                <div class="specifics-list">
                    ${specificsHtml || '<span class="specific-item">なし</span>'}
                </div>
            </div>
            
            <div class="result-actions">
                <button class="btn btn-info" onclick="copyTestResultToClipboard()">
                    <i class="fas fa-copy"></i> 結果をコピー
                </button>
                <button class="btn btn-warning" onclick="saveTestResult()">
                    <i class="fas fa-save"></i> テスト結果保存
                </button>
            </div>
        </div>
    `;
    
    console.log('✅ 単一テスト結果を表示しました:', result);
}

/**
 * 単一テストエラー表示
 */
function displaySingleTestError(errorMessage) {
    const resultSection = document.getElementById('singleTestResult');
    if (!resultSection) return;
    
    resultSection.style.display = 'block';
    resultSection.innerHTML = `
        <div class="test-error">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="error-content">
                <h4>判定エラー</h4>
                <p>${escapeHtml(errorMessage)}</p>
                <button class="btn btn-secondary" onclick="clearSingleTest()">
                    <i class="fas fa-redo"></i> やり直し
                </button>
            </div>
        </div>
    `;
}

/**
 * 単一テストクリア
 */
function clearSingleTest() {
    document.getElementById('singleTestTitle').value = '';
    document.getElementById('singleTestDescription').value = '';
    document.getElementById('singleTestPrice').value = '';
    
    const resultSection = document.getElementById('singleTestResult');
    if (resultSection) {
        resultSection.style.display = 'none';
    }
    
    console.log('🧹 単一テストをクリアしました');
}

/**
 * CSVドラッグ&ドロップ処理
 */
function handleCSVDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'text/csv') {
        processCSVFile(files[0]);
    } else {
        alert('CSVファイルをドロップしてください');
    }
}

/**
 * CSVファイルアップロード処理
 */
function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
        processCSVFile(file);
    } else {
        alert('CSVファイルを選択してください');
    }
}

/**
 * CSVファイル処理
 */
function processCSVFile(file) {
    console.log('📄 CSVファイル処理開始:', file.name);
    addLogEntry('info', `CSVファイル処理開始: ${file.name} (${formatFileSize(file.size)})`);
    
    // ファイルサイズ制限チェック（10MB）
    if (file.size > 10 * 1024 * 1024) {
        alert('ファイルサイズが10MBを超えています');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvData = parseCSV(e.target.result);
            
            if (csvData.length === 0) {
                alert('CSVファイルにデータが含まれていません');
                return;
            }
            
            if (csvData.length > 10000) {
                alert('CSVファイルの行数が10,000行を超えています');
                return;
            }
            
            console.log(`📊 CSV解析完了: ${csvData.length}行`);
            addLogEntry('info', `CSV解析完了: ${csvData.length}行の商品データ`);
            
            // バッチ処理開始
            startBatchProcessing(csvData);
            
        } catch (error) {
            console.error('CSV解析エラー:', error);
            alert('CSVファイルの解析に失敗しました: ' + error.message);
        }
    };
    
    reader.onerror = function() {
        console.error('ファイル読み込みエラー');
        alert('ファイルの読み込みに失敗しました');
    };
    
    reader.readAsText(file, 'UTF-8');
}

/**
 * バッチ処理開始
 */
function startBatchProcessing(csvData) {
    if (window.EbayCategorySystem.batchProcessing) {
        alert('既にバッチ処理が実行中です');
        return;
    }
    
    console.log('⚡ バッチ処理開始:', csvData.length, '件');
    addLogEntry('info', `バッチ処理開始: ${csvData.length}件の商品`);
    
    window.EbayCategorySystem.batchProcessing = true;
    window.EbayCategorySystem.batchCancelRequested = false;
    
    // 進捗表示を開始
    showBatchProgress(csvData.length);
    
    // オプション取得
    const options = {
        enableAPIFallback: document.getElementById('enableAPIFallback')?.checked !== false,
        saveLearningData: document.getElementById('saveLearningData')?.checked !== false,
        delay_between_items: parseInt(document.getElementById('batchDelay')?.value) || 100
    };
    
    // バッチ処理実行
    processEbayCategoryCSV(csvData, options).then(result => {
        console.log('✅ バッチ処理完了:', result);
        displayBatchResults(result.data || result);
        addLogEntry('success', `バッチ処理完了: ${result.data?.success_items || 0}件成功`);
    }).catch(error => {
        console.error('❌ バッチ処理エラー:', error);
        displayBatchError(error.message);
        addLogEntry('error', 'バッチ処理エラー: ' + error.message);
    }).finally(() => {
        window.EbayCategorySystem.batchProcessing = false;
        hideBatchProgress();
    });
}

/**
 * バッチ進捗表示
 */
function showBatchProgress(totalItems) {
    const progressSection = document.getElementById('batchProgressSection');
    if (progressSection) {
        progressSection.style.display = 'block';
        
        // 進捗バーリセット
        document.getElementById('batchProgress').style.width = '0%';
        document.getElementById('batchProgressText').textContent = `0 / ${totalItems} 件処理中`;
        document.getElementById('batchSuccessCount').textContent = '0';
        document.getElementById('batchErrorCount').textContent = '0';
        document.getElementById('batchAvgTime').textContent = '0ms';
    }
    
    // CSVアップロードセクションを隠す
    const uploadSection = document.querySelector('.csv-upload-section');
    if (uploadSection) {
        uploadSection.style.display = 'none';
    }
}

/**
 * バッチ進捗隠す
 */
function hideBatchProgress() {
    const progressSection = document.getElementById('batchProgressSection');
    if (progressSection) {
        progressSection.style.display = 'none';
    }
    
    // CSVアップロードセクションを表示
    const uploadSection = document.querySelector('.csv-upload-section');
    if (uploadSection) {
        uploadSection.style.display = 'block';
    }
}

/**
 * バッチ結果表示
 */
function displayBatchResults(results) {
    const resultsSection = document.getElementById('batchResultsSection');
    if (!resultsSection) return;
    
    resultsSection.style.display = 'block';
    
    // サマリー情報の生成・表示
    const summary = results.summary || {};
    const summaryHtml = `
        <div class="summary-cards">
            <div class="summary-card success">
                <div class="summary-icon"><i class="fas fa-check-circle"></i></div>
                <div class="summary-content">
                    <div class="summary-value">${results.success_items || 0}</div>
                    <div class="summary-label">成功</div>
                </div>
            </div>
            <div class="summary-card error">
                <div class="summary-icon"><i class="fas fa-exclamation-circle"></i></div>
                <div class="summary-content">
                    <div class="summary-value">${results.error_items || 0}</div>
                    <div class="summary-label">失敗</div>
                </div>
            </div>
            <div class="summary-card info">
                <div class="summary-icon"><i class="fas fa-clock"></i></div>
                <div class="summary-content">
                    <div class="summary-value">${summary.average_processing_time || 0}ms</div>
                    <div class="summary-label">平均処理時間</div>
                </div>
            </div>
            <div class="summary-card warning">
                <div class="summary-icon"><i class="fas fa-percentage"></i></div>
                <div class="summary-content">
                    <div class="summary-value">${summary.success_rate || 0}%</div>
                    <div class="summary-label">成功率</div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('batchSummary').innerHTML = summaryHtml;
    
    // 結果テーブルの生成
    const tableBody = document.getElementById('batchResultsTable');
    if (tableBody && results.results) {
        const rowsHtml = results.results.slice(0, 100).map(item => {
            const isSuccess = item.success !== false;
            const statusClass = isSuccess ? 'success' : 'error';
            const statusText = isSuccess ? '成功' : '失敗';
            const categoryResult = item.category_result || {};
            
            return `
                <tr class="result-row ${statusClass}">
                    <td>${item.index + 1}</td>
                    <td title="${escapeHtml(item.original?.title || '')}">${truncateText(item.original?.title || '', 30)}</td>
                    <td>${isSuccess ? escapeHtml(categoryResult.category_name || '') : '-'}</td>
                    <td>${isSuccess ? (categoryResult.confidence || 0) + '%' : '-'}</td>
                    <td>${isSuccess ? (categoryResult.processing_time || 0) + 'ms' : '-'}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        }).join('');
        
        tableBody.innerHTML = rowsHtml;
    }
    
    console.log('📋 バッチ結果を表示しました');
}

/**
 * イベントリスナーの設定
 */
function setupEbayCategoryEventListeners() {
    // ドラッグ&ドロップのイベント設定
    const dropArea = document.getElementById('csvDropArea');
    if (dropArea) {
        dropArea.addEventListener('dragenter', handleDragEnter);
        dropArea.addEventListener('dragleave', handleDragLeave);
    }
    
    // 信頼度フィルターのイベント
    const confidenceFilter = document.getElementById('confidenceFilter');
    if (confidenceFilter) {
        confidenceFilter.addEventListener('input', function() {
            document.getElementById('confidenceValue').textContent = this.value + '%';
        });
    }
    
    console.log('🎧 eBayカテゴリーイベントリスナー設定完了');
}

/**
 * ユーティリティ関数群
 */

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// テキスト切り詰め
function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// ファイルサイズフォーマット
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ソース表示名取得
function getSourceDisplayName(source) {
    const sourceNames = {
        'local': 'ローカルDB',
        'api': 'eBay API',
        'hybrid': 'ハイブリッド',
        'manual': '手動設定',
        'api_simulation': 'API(シミュレーション)'
    };
    return sourceNames[source] || source;
}

// 簡易CSV解析
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSVファイルにヘッダーとデータが必要です');
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        
        headers.forEach((header, index) => {
            row[header.toLowerCase()] = values[index] || '';
        });
        
        // 最低限のバリデーション
        if (row.title || row.name) {
            data.push({
                title: row.title || row.name || '',
                description: row.description || row.desc || '',
                price: parseFloat(row.price) || 0
            });
        }
    }
    
    return data;
}

// ドラッグ&ドロップ用イベントハンドラ
function handleDragEnter(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

// テスト結果をクリップボードにコピー
function copyTestResultToClipboard() {
    const resultSection = document.getElementById('singleTestResult');
    if (!resultSection) return;
    
    const categoryId = document.getElementById('resultCategoryId')?.textContent;
    const categoryName = document.getElementById('resultCategoryName')?.textContent;
    const confidence = document.getElementById('resultConfidence')?.textContent;
    const specifics = document.getElementById('resultItemSpecifics')?.textContent;
    
    const textToCopy = `eBayカテゴリー判定結果
カテゴリーID: ${categoryId}
カテゴリー名: ${categoryName}
信頼度: ${confidence}
必須項目: ${specifics}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert('結果をクリップボードにコピーしました');
    }).catch(err => {
        console.error('クリップボードコピーエラー:', err);
    });
}

// テスト結果保存（プレースホルダー）
function saveTestResult() {
    alert('テスト結果保存機能は開発中です');
}

// バッチ処理キャンセル
function cancelBatchProcess() {
    if (confirm('バッチ処理をキャンセルしますか？')) {
        window.EbayCategorySystem.batchCancelRequested = true;
        addLogEntry('warning', 'バッチ処理のキャンセルを要求しました');
    }
}

// バッチ結果ダウンロード（プレースホルダー）
function downloadBatchResults() {
    alert('バッチ結果ダウンロード機能は開発中です');
}

// サンプルCSVダウンロード
function downloadSampleCSV() {
    const sampleCSV = `title,description,price
iPhone 14 Pro 128GB,Apple iPhone 14 Pro with 128GB storage,120000
Canon EOS R6,Professional mirrorless camera,250000
ポケモンカード ピカチュウ,希少なポケモンカード,5000`;
    
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ebay_category_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// カテゴリー検索（プレースホルダー）
function searchCategories() {
    const query = document.getElementById('categorySearchQuery')?.value?.trim();
    if (!query) {
        alert('検索キーワードを入力してください');
        return;
    }
    
    console.log('🔍 カテゴリー検索:', query);
    addLogEntry('info', `カテゴリー検索: ${query}`);
    alert('カテゴリー検索機能は開発中です');
}

/**
 * システム起動時の自動初期化
 */
document.addEventListener('DOMContentLoaded', function() {
    // タブ切り替え時にeBayカテゴリータブの初期化をチェック
    const originalSwitchTab = window.switchTab;
    if (originalSwitchTab) {
        window.switchTab = function(tabName) {
            originalSwitchTab(tabName);
            
            if (tabName === 'ebay-category' && !window.EbayCategorySystem.initialized) {
                setTimeout(initializeEbayCategorySystem, 100);
            }
        };
    }
});

console.log('📋 eBayカテゴリーJavaScript読み込み完了');
