/**
 * Yahoo Auction Tool - JavaScript統合版（完全修正版）
 * スクレイピング・データ編集・全機能統合
 */

// グローバル変数
let currentPage = 1;
let editingData = [];

// タブ切り替え機能
function switchTab(targetTab) {
    // 全てのタブボタンから active クラスを削除
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 全てのタブコンテンツを非表示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 対象タブボタンをアクティブ化
    const targetButton = document.querySelector(`[data-tab="${targetTab}"]`);
    if (targetButton) {
        targetButton.classList.add('active');
    }
    
    // 対象タブコンテンツを表示
    const targetContent = document.getElementById(targetTab);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    console.log('タブ切り替え:', targetTab);
}

// スクレイピング機能（修正版）
function initializeScrapingForm() {
    const scrapingForm = document.getElementById('scrapingForm');
    
    if (!scrapingForm) {
        console.warn('スクレイピングフォームが見つかりません');
        return;
    }
    
    scrapingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const url = document.getElementById('yahooUrls').value.trim();
        if (!url) {
            alert('URLを入力してください');
            return;
        }
        
        const submitBtn = document.getElementById('scrapingSubmitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';
        submitBtn.disabled = true;
        
        const formData = new FormData(this);
        
        fetch('', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('スクレイピング結果:', data);
            
            const resultsDiv = document.getElementById('scrapingResults');
            
            if (data.success) {
                resultsDiv.innerHTML = `
                    <div class="notification success">
                        <i class="fas fa-check-circle"></i>
                        <span><strong>成功:</strong> ${data.message}</span>
                    </div>
                    <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md); margin-top: var(--space-sm);">
                        <h5>取得データ:</h5>
                        <pre style="font-size: 0.8rem; margin-top: 0.5rem; max-height: 200px; overflow-y: auto; white-space: pre-wrap;">${JSON.stringify(data.data, null, 2)}</pre>
                    </div>
                `;
            } else {
                resultsDiv.innerHTML = `
                    <div class="notification error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span><strong>エラー:</strong> ${data.message}</span>
                    </div>
                    ${data.python_output ? `
                    <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md); margin-top: var(--space-sm);">
                        <h5>詳細情報:</h5>
                        <pre style="font-size: 0.8rem; margin-top: 0.5rem; max-height: 200px; overflow-y: auto; white-space: pre-wrap;">${data.python_output}</pre>
                    </div>
                    ` : ''}
                `;
            }
        })
        .catch(error => {
            console.error('スクレイピングエラー:', error);
            document.getElementById('scrapingResults').innerHTML = `
                <div class="notification error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span><strong>通信エラー:</strong> ${error.message}</span>
                </div>
            `;
        })
        .finally(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
    });
}

// データ編集機能（復旧版）
function loadEditingData(page = 1) {
    console.log('データ編集データ読み込み開始:', page);
    
    // ローディング表示
    const tbody = document.getElementById('editingTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="12" style="text-align: center; padding: var(--space-lg);">
                <div class="loading-spinner"></div>
                <span style="margin-left: 0.5rem;">データを読み込み中...</span>
            </td>
        </tr>
    `;
    
    fetch(`?action=get_editing_data&page=${page}&per_page=50`)
        .then(response => response.json())
        .then(data => {
            console.log('データ編集データ:', data);
            
            if (data.success) {
                displayEditingData(data.data);
                updatePagination(data.data.pagination);
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            console.error('データ編集データ読み込みエラー:', error);
            
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; padding: var(--space-lg); color: var(--danger-color);">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span style="margin-left: 0.5rem;">エラー: ${error.message}</span>
                    </td>
                </tr>
            `;
        });
}

function displayEditingData(result) {
    const tbody = document.getElementById('editingTableBody');
    
    if (!result.data || result.data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; padding: var(--space-lg); color: var(--text-muted);">
                    <i class="fas fa-inbox"></i>
                    <span style="margin-left: 0.5rem;">データが見つかりませんでした</span>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = result.data.map(item => `
        <tr>
            <td>
                <span class="status-badge status-${item.source_table}">
                    ${item.source_table}
                </span>
            </td>
            <td>
                <img src="${item.image_url}" alt="商品画像" class="product-image" onerror="this.src='https://via.placeholder.com/60x45?text=No+Image'">
            </td>
            <td style="font-family: monospace; font-size: 0.7rem; max-width: 100px; overflow: hidden; text-overflow: ellipsis;">${item.id}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${item.product_name}">${item.product_name}</td>
            <td>${item.category}</td>
            <td style="font-weight: 600;">${item.price_jpy}</td>
            <td>${item.condition_status}</td>
            <td>
                <span class="marketplace-badge marketplace-${item.marketplace.toLowerCase().replace(/\s+/g, '')}">
                    ${item.marketplace}
                </span>
            </td>
            <td>
                <span class="status-badge status-active">
                    ${item.status}
                </span>
            </td>
            <td style="font-size: 0.7rem;">${item.format_type}</td>
            <td style="font-size: 0.7rem;">${new Date(item.updated_at).toLocaleDateString('ja-JP')}</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="editItem('${item.id}')" title="編集">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    editingData = result.data;
    console.log('データ編集表示完了:', result.data.length, '件');
}

function updatePagination(pagination) {
    const pageInfo = document.getElementById('pageInfo');
    if (pagination) {
        pageInfo.textContent = `ページ ${pagination.current_page}/${pagination.total_pages} (全${pagination.total_count}件)`;
        currentPage = pagination.current_page;
    }
}

function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1) {
        loadEditingData(newPage);
    }
}

// 承認データ読み込み（修正版）
function loadApprovalData() {
    console.log('承認データ読み込み開始');
    
    // ローディング表示
    const resultsDiv = document.getElementById('approvalResults');
    resultsDiv.innerHTML = `
        <div class="notification info">
            <div class="loading-spinner"></div>
            <span style="margin-left: 0.5rem;">承認待ち商品を読み込み中...</span>
        </div>
    `;
    
    fetch('?action=get_approval_queue')
        .then(response => response.json())
        .then(data => {
            console.log('承認データ:', data);
            
            if (data.success && data.data.length > 0) {
                resultsDiv.innerHTML = `
                    <div class="notification success">
                        <i class="fas fa-check-circle"></i>
                        <span>${data.data.length}件の承認待ち商品を読み込みました</span>
                    </div>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>画像</th>
                                    <th>商品名</th>
                                    <th>価格</th>
                                    <th>状態</th>
                                    <th>カテゴリ</th>
                                    <th>AI判定</th>
                                    <th>リスク</th>
                                    <th>ソース</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.data.map(item => `
                                    <tr>
                                        <td>
                                            <img src="${item.picture_url}" alt="商品画像" class="product-image" onerror="this.src='https://via.placeholder.com/60x45?text=No+Image'">
                                        </td>
                                        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${item.title}">${item.title}</td>
                                        <td style="font-weight: 600;">${item.current_price}</td>
                                        <td>${item.condition_name}</td>
                                        <td>${item.category_name}</td>
                                        <td>
                                            <span class="status-badge status-${item.ai_status.replace('ai-', '')}">
                                                ${item.ai_status.replace('ai-', '')}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="status-badge status-${item.risk_level.replace('-risk', '')}">
                                                ${item.risk_level.replace('-risk', '')}
                                            </span>
                                        </td>
                                        <td>${item.data_source}</td>
                                        <td>
                                            <button class="btn btn-success btn-sm" onclick="approveItem('${item.item_id}')" title="承認">
                                                <i class="fas fa-check"></i>
                                            </button>
                                            <button class="btn btn-danger btn-sm" onclick="rejectItem('${item.item_id}')" title="否認" style="margin-left: 0.25rem;">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                resultsDiv.innerHTML = `
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>承認待ちの商品が見つかりませんでした</span>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('承認データ読み込みエラー:', error);
            resultsDiv.innerHTML = `
                <div class="notification error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>承認データの読み込みに失敗しました: ${error.message}</span>
                </div>
            `;
        });
}

// ユーティリティ関数
function clearScrapingForm() {
    const yahooUrls = document.getElementById('yahooUrls');
    if (yahooUrls) {
        yahooUrls.value = '';
    }
    
    const scrapingResults = document.getElementById('scrapingResults');
    if (scrapingResults) {
        scrapingResults.innerHTML = `
            <div class="notification info">
                <i class="fas fa-info-circle"></i>
                <span>URLを入力してスクレイピングを開始してください</span>
            </div>
        `;
    }
}

function downloadEditingCSV() {
    console.log('CSV出力機能');
    
    if (editingData.length === 0) {
        alert('出力するデータがありません。先にデータを読み込んでください。');
        return;
    }
    
    // CSV生成
    const headers = ['ソース', '商品ID', '商品名', 'カテゴリ', '価格', '状態', 'モール', 'ステータス', '形式', 'URL', '更新日'];
    const csvContent = [
        headers.join(','),
        ...editingData.map(item => [
            item.source_table,
            `"${item.id}"`,
            `"${item.product_name.replace(/"/g, '""')}"`,
            `"${item.category}"`,
            `"${item.price_jpy}"`,
            `"${item.condition_status}"`,
            `"${item.marketplace}"`,
            `"${item.status}"`,
            `"${item.format_type}"`,
            `"${item.url}"`,
            `"${item.updated_at}"`
        ].join(','))
    ].join('\n');
    
    // ダウンロード
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yahoo_auction_editing_data_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('CSV出力完了:', editingData.length, '件');
}

function saveAllEdits() {
    console.log('全保存機能');
    alert('全保存機能は実装予定です');
}

function editItem(itemId) {
    console.log('編集:', itemId);
    
    const item = editingData.find(data => data.id === itemId);
    if (item) {
        const newName = prompt('商品名を編集してください:', item.product_name);
        if (newName && newName !== item.product_name) {
            // 実際の実装では、ここでサーバーにPOSTリクエストを送信
            alert(`商品名を「${newName}」に変更しました（実装予定）`);
            item.product_name = newName;
            displayEditingData({ data: editingData });
        }
    }
}

function approveItem(itemId) {
    console.log('承認:', itemId);
    
    if (confirm(`商品 ${itemId} を承認しますか？`)) {
        // 実際の実装では、ここでサーバーにPOSTリクエストを送信
        alert(`商品 ${itemId} を承認しました（実装予定）`);
        loadApprovalData(); // データ再読み込み
    }
}

function rejectItem(itemId) {
    console.log('否認:', itemId);
    
    if (confirm(`商品 ${itemId} を否認しますか？`)) {
        // 実際の実装では、ここでサーバーにPOSTリクエストを送信
        alert(`商品 ${itemId} を否認しました（実装予定）`);
        loadApprovalData(); // データ再読み込み
    }
}

// エラーハンドリング
function handleAjaxError(error, context = '') {
    console.error(`${context}エラー:`, error);
    
    const errorMessage = error.message || 'unknown error';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'notification error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span><strong>${context}エラー:</strong> ${errorMessage}</span>
    `;
    
    // エラー表示エリアを探して表示
    const container = document.querySelector('.tab-content.active .section');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        
        // 5秒後に自動削除
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// デバッグ情報表示
function showDebugInfo() {
    fetch('?action=debug_info')
        .then(response => response.json())
        .then(data => {
            console.log('デバッグ情報:', data);
            
            const debugWindow = window.open('', 'debug', 'width=800,height=600,scrollbars=yes');
            debugWindow.document.write(`
                <html>
                <head><title>Yahoo Auction Tool - デバッグ情報</title></head>
                <body style="font-family: monospace; padding: 20px;">
                    <h2>システムデバッグ情報</h2>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                </body>
                </html>
            `);
        })
        .catch(error => {
            console.error('デバッグ情報取得エラー:', error);
            alert('デバッグ情報の取得に失敗しました');
        });
}

// キーボードショートカット
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+R: データ再読み込み
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab) {
                const tabName = activeTab.getAttribute('data-tab');
                switch (tabName) {
                    case 'editing':
                        loadEditingData(currentPage);
                        break;
                    case 'approval':
                        loadApprovalData();
                        break;
                }
            }
        }
        
        // Ctrl+S: 保存
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveAllEdits();
        }
        
        // Ctrl+D: デバッグ情報
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            showDebugInfo();
        }
    });
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('Yahoo Auction Tool JavaScript 初期化開始');
    
    try {
        // フォーム初期化
        initializeScrapingForm();
        
        // キーボードショートカット
        initializeKeyboardShortcuts();
        
        // 動的スタイル追加
        const style = document.createElement('style');
        style.textContent = `
            .loading-spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid var(--primary-color);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            
            .data-table tr:hover {
                background-color: var(--bg-tertiary);
            }
            
            .notification {
                animation: slideIn 0.3s ease-out;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
        
        console.log('✅ Yahoo Auction Tool JavaScript 初期化完了');
        console.log('✅ 利用可能機能:', {
            'タブ切り替え': 'switchTab()',
            'スクレイピング': 'フォーム送信対応',
            'データ編集': 'loadEditingData()',
            '商品承認': 'loadApprovalData()',
            'CSV出力': 'downloadEditingCSV()',
            'キーボードショートカット': 'Ctrl+R, Ctrl+S, Ctrl+D'
        });
        
    } catch (error) {
        console.error('JavaScript初期化エラー:', error);
        handleAjaxError(error, 'JavaScript初期化');
    }
});

// エクスポート（グローバル関数として利用可能）
window.YahooAuctionTool = {
    switchTab,
    loadEditingData,
    loadApprovalData,
    clearScrapingForm,
    downloadEditingCSV,
    saveAllEdits,
    editItem,
    approveItem,
    rejectItem,
    showDebugInfo
};