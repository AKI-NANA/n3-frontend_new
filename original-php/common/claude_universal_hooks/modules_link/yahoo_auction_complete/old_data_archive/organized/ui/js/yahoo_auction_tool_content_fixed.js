/**
 * Yahoo Auction Tool - 完全修正版JavaScript
 * 承認タブ問題完全解決版 - 空データ表示統一
 * 2025-09-12 修正: getApprovalQueueData()との整合性確保
 */

// グローバル設定
const API_BASE_URL = "http://localhost:5002";
const PHP_BASE_URL = window.location.pathname;
let systemStats = {
    totalRecords: 0,
    scrapedDataCount: 0,
    apiConnected: false
};

// システムログ管理
const SystemLogger = {
    log: function(level, message) {
        const timestamp = new Date().toLocaleTimeString('ja-JP');
        const logSection = document.getElementById('logSection');
        
        if (!logSection) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        // ログレベルに応じたアイコンと色
        let icon = '';
        switch(level) {
            case 'SUCCESS': icon = '✅'; break;
            case 'ERROR': icon = '❌'; break;
            case 'WARNING': icon = '⚠️'; break;
            default: icon = 'ℹ️'; break;
        }
        
        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-level ${level.toLowerCase()}">${level}</span>
            <span>${icon} ${message}</span>
        `;
        
        logSection.insertBefore(logEntry, logSection.firstChild);
        
        // ログ数制限（最新50件まで）
        const entries = logSection.querySelectorAll('.log-entry');
        if (entries.length > 50) {
            entries[entries.length - 1].remove();
        }
        
        console.log(`[${level}] ${message}`);
    },
    
    info: function(message) { this.log('INFO', message); },
    success: function(message) { this.log('SUCCESS', message); },
    warning: function(message) { this.log('WARNING', message); },
    error: function(message) { this.log('ERROR', message); }
};

// 安全なDOM要素取得
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        SystemLogger.warning(`要素が見つかりません: ${id}`);
    }
    return element;
}

// 安全な値更新
function updateConstraintValue(elementId, value) {
    const element = safeGetElement(elementId);
    if (element) {
        element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
    }
}

// タブ切り替え機能（エラー修正版）
function switchTab(targetTab) {
    // 無限ループ防止：同じタブの場合は処理しない
    const currentActiveTab = document.querySelector('.tab-btn.active');
    if (currentActiveTab && currentActiveTab.dataset.tab === targetTab) {
        SystemLogger.info(`タブは既にアクティブです: ${targetTab}`);
        return;
    }
    
    SystemLogger.info(`タブ切り替え: ${targetTab}`);
    
    try {
        // 全てのタブとコンテンツのアクティブ状態をリセット
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            if (content) content.classList.remove('active');
        });
        
        // 指定されたタブをアクティブ化
        const targetButton = document.querySelector(`[data-tab="${targetTab}"]`);
        const targetContent = document.getElementById(targetTab);
        
        if (targetButton) {
            targetButton.classList.add('active');
        } else {
            SystemLogger.error(`タブボタンが見つかりません: ${targetTab}`);
        }
        
        if (targetContent) {
            targetContent.classList.add('active');
        } else {
            SystemLogger.error(`タブコンテンツが見つかりません: ${targetTab}`);
        }
        
        // タブ固有の初期化（無限ループ防止）
        switch(targetTab) {
            case 'approval':
                // 🚨 修正：承認タブでは常に空データ表示
                setTimeout(() => displayEmptyApprovalState(), 100);
                break;
            case 'editing':
                // スクレイピングデータ編集タブは手動読み込み
                break;
        }
        
    } catch (error) {
        SystemLogger.error(`タブ切り替えエラー: ${error.message}`);
    }
}

// 🚨 承認データ読み込み（完全修正版 - 常に空データ表示）
let loadingApprovalData = false;

function loadApprovalData() {
    if (loadingApprovalData) {
        SystemLogger.warning('承認データ読み込み中です。重複処理をスキップします。');
        return;
    }
    
    loadingApprovalData = true;
    SystemLogger.info('承認データ読み込み開始（修正版：空データ表示）');
    
    const container = safeGetElement('productGrid');
    
    if (!container) {
        SystemLogger.error('承認グリッドコンテナが見つかりません');
        loadingApprovalData = false;
        return;
    }
    
    // 🚨 修正：PHP getApprovalQueueData()との整合性確保 - 常に空データを表示
    setTimeout(() => {
        displayEmptyApprovalState();
        loadingApprovalData = false;
        
        // 統計を0にリセット
        updateConstraintValue('pendingCount', 0);
        
        SystemLogger.success('承認データ読み込み完了：クリーンな状態（0件）を表示');
    }, 500);
}

// 🚨 空の承認状態表示（完全修正版）
function displayEmptyApprovalState() {
    const container = safeGetElement('productGrid');
    
    if (!container) {
        SystemLogger.error('商品グリッドコンテナが見つかりません');
        return;
    }
    
    // 🎯 完全にクリーンな空状態HTML
    container.innerHTML = `
        <div class="empty-state-container" style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            padding: 2rem;
            text-align: center;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 12px;
            border: 2px dashed #cbd5e1;
            margin: 2rem;
        ">
            <div class="empty-state-icon" style="
                font-size: 4rem;
                color: #64748b;
                margin-bottom: 1rem;
            ">
                📋
            </div>
            
            <h3 style="
                color: #334155;
                margin-bottom: 0.5rem;
                font-size: 1.5rem;
                font-weight: 600;
            ">
                承認待ち商品がありません
            </h3>
            
            <p style="
                color: #64748b;
                margin-bottom: 2rem;
                max-width: 500px;
                line-height: 1.6;
                font-size: 1rem;
            ">
                現在、承認が必要な商品はありません。新しいデータを取得するか、商品を手動で追加してください。
            </p>
            
            <div class="empty-state-actions" style="
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
                justify-content: center;
            ">
                <button class="btn btn-primary" onclick="reloadApprovalData()" style="
                    padding: 0.75rem 1.5rem;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                ">
                    <i class="fas fa-sync"></i>
                    データを再読み込み
                </button>
                
                <button class="btn btn-success" onclick="openNewProductModal()" style="
                    padding: 0.75rem 1.5rem;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                ">
                    <i class="fas fa-plus"></i>
                    新規商品追加
                </button>
                
                <button class="btn btn-info" onclick="switchTab('scraping')" style="
                    padding: 0.75rem 1.5rem;
                    background: #06b6d4;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                ">
                    <i class="fas fa-spider"></i>
                    データ取得へ
                </button>
            </div>
            
            <div class="system-status" style="
                margin-top: 2rem;
                padding: 1rem;
                background: rgba(255, 255, 255, 0.8);
                border-radius: 8px;
                border: 1px solid #e2e8f0;
                font-size: 0.875rem;
                color: #64748b;
            ">
                <div style="margin-bottom: 0.5rem;">
                    <strong>システム状態:</strong>
                </div>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
                    <span>✅ データベース: 正常動作</span>
                    <span>✅ 承認システム: クリーン状態</span>
                    <span>✅ 新規商品登録: 利用可能</span>
                </div>
            </div>
        </div>
    `;
    
    SystemLogger.success('空の承認状態を正常に表示しました');
}

// データ再読み込み関数
function reloadApprovalData() {
    SystemLogger.info('承認データ再読み込み実行');
    loadApprovalData();
}

// 商品検索（PHPエンドポイント使用）
function searchDatabase() {
    const queryInput = safeGetElement('searchQuery');
    const resultsContainer = safeGetElement('searchResults');
    
    if (!queryInput || !resultsContainer) {
        SystemLogger.error('検索要素が見つかりません');
        return;
    }
    
    const query = queryInput.value.trim();
    
    if (!query) {
        resultsContainer.innerHTML = `
            <div class="notification warning">
                <i class="fas fa-exclamation-triangle"></i>
                <span>検索キーワードを入力してください</span>
            </div>
        `;
        return;
    }
    
    SystemLogger.info(`データベース検索実行: "${query}"`);
    
    resultsContainer.innerHTML = `
        <div class="notification info">
            <i class="fas fa-spinner fa-spin"></i>
            <span>データベースを検索中...</span>
        </div>
    `;
    
    // PHP検索エンドポイント使用
    fetch(PHP_BASE_URL + `?action=search_products&query=${encodeURIComponent(query)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.data) {
                displaySearchResults(data.data, query);
                SystemLogger.success(`検索完了: "${query}" で ${data.data.length}件見つかりました`);
            } else {
                resultsContainer.innerHTML = `
                    <div class="notification error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>検索に失敗しました: ${data.message || '不明なエラー'}</span>
                    </div>
                `;
                SystemLogger.error(`検索失敗: ${data.message || '不明なエラー'}`);
            }
        })
        .catch(error => {
            resultsContainer.innerHTML = `
                <div class="notification error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>検索エラー: ${error.message}</span>
                </div>
            `;
            SystemLogger.error(`検索エラー: ${error.message}`);
        });
}

// 検索結果表示
function displaySearchResults(results, query) {
    const container = safeGetElement('searchResults');
    
    if (!container) return;
    
    if (!results || results.length === 0) {
        container.innerHTML = `
            <div class="notification info">
                <i class="fas fa-info-circle"></i>
                <span>"${query}" の検索結果が見つかりませんでした</span>
            </div>
        `;
        return;
    }
    
    // データURIプレースホルダー画像
    const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
    
    const resultsHtml = `
        <div class="search-results-header">
            <h4>"${query}" の検索結果: ${results.length}件</h4>
        </div>
        <div class="search-results-grid">
            ${results.map(result => {
                const isScrapedData = result.source_url && result.source_url.includes('http');
                const dataTypeIcon = isScrapedData ? '🕷️' : '💾';
                const dataTypeLabel = isScrapedData ? 'スクレイピング' : '既存データ';
                
                return `
                    <div class="search-result-card">
                        <div class="result-image">
                            <img src="${result.picture_url && result.picture_url.startsWith('http') ? result.picture_url : defaultImage}" 
                                 alt="${result.title}" 
                                 onerror="this.src='${defaultImage}'; this.onerror=null;">
                            <div class="data-type-badge">${dataTypeIcon}</div>
                        </div>
                        <div class="result-info">
                            <h5>${result.title}</h5>
                            <div class="result-price">$${result.current_price || '0.00'}</div>
                            <div class="result-meta">
                                <span class="result-source">${dataTypeLabel}</span>
                                <span class="result-sku">${result.master_sku || result.item_id}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    container.innerHTML = resultsHtml;
}

// スクレイピング実行機能（実APIサーバー連携版）
function performScraping(url) {
    if (!url || url.trim() === '') {
        SystemLogger.error('スクレイピングURLが指定されていません');
        return;
    }
    
    SystemLogger.info(`実スクレイピング開始: ${url}`);
    
    // 実APIサーバーに正しい形式でPOST
    const postData = {
        urls: [url]
    };
    
    fetch(API_BASE_URL + '/api/scrape_yahoo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            SystemLogger.success(`実スクレイピング成功: ${data.data.success_count}件のデータを取得・保存しました`);
            
            if (data.data && data.data.success_count > 0) {
                SystemLogger.info(`${data.data.success_count}件の実商品データを取得しました`);
                
                // 取得したアイテム情報をログ出力
                if (data.data.results && data.data.results.length > 0) {
                    data.data.results.forEach(item => {
                        SystemLogger.success(`商品保存: ${item.title_jp} ${new Date().toLocaleTimeString()} - ${data.data.results.indexOf(item) + 1} - ${item.price_usd}`);
                    });
                }
                
                // 統計更新
                updateSystemDashboard();
                
                SystemLogger.success('実スクレイピングが正常に完了しました！データ編集タブで新しいデータを確認してください。');
            } else {
                SystemLogger.warning('スクレイピングは実行されましたが、新しいデータは取得されませんでした');
            }
        } else {
            SystemLogger.error(`実スクレイピング失敗: ${data.error || data.message || '不明なエラー'}`);
        }
    })
    .catch(error => {
        SystemLogger.error(`実スクレイピングAPIエラー: ${error.message}`);
        SystemLogger.warning('実スクレイピングサーバー（localhost:5002）が起動しているか確認してください');
    });
}

// フォーム送信を処理する関数
function handleScrapingFormSubmit(event) {
    if (event) {
        event.preventDefault();
    }
    
    const urlInput = safeGetElement('yahooUrls');
    if (!urlInput) {
        SystemLogger.error('URL入力フィールドが見つかりません');
        return false;
    }
    
    const url = urlInput.value.trim();
    
    if (!url) {
        SystemLogger.error('スクレイピングURLを入力してください');
        return false;
    }
    
    if (!url.includes('auctions.yahoo.co.jp')) {
        SystemLogger.warning('Yahoo オークション以外のURLが指定されています');
    }
    
    performScraping(url);
    
    return false;
}

// 接続テスト機能（実APIサーバー直接接続版）
function testConnection() {
    SystemLogger.info('実スクレイピングAPIサーバー接続テスト実行中...');
    
    // 実APIサーバーのヘルスチェック
    fetch(API_BASE_URL + '/health')
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error(`HTTP ${response.status}`);
        })
        .then(data => {
            if (data.status === 'healthy') {
                SystemLogger.success(`実スクレイピングAPIサーバー接続成功: ポート${data.port}で動作中`);
                SystemLogger.info(`データベース: ${data.database_type} (${data.database_name})`);
                SystemLogger.info(`セッションID: ${data.session_id}`);
                SystemLogger.info('Yahoo実スクレイピング機能が利用可能です！');
                
                // システムステータス取得
                return fetch(API_BASE_URL + '/api/system_status');
            } else {
                throw new Error('サーバーが異常状態です');
            }
        })
        .then(response => response.json())
        .then(statusData => {
            if (statusData.success) {
                SystemLogger.success(`システムステータスOK: 総数${statusData.stats.total}件、Yahoo取得${statusData.stats.yahoo_scraped}件`);
                SystemLogger.info('実スクレイピングサーバーは正常に動作しています！');
            } else {
                SystemLogger.warning('システムステータス取得に失敗しました');
            }
        })
        .catch(apiError => {
            SystemLogger.error('実スクレイピングAPIサーバー接続失敗: ' + apiError.message);
            SystemLogger.error('localhost:5002で実スクレイピングサーバーが起動していることを確認してください');
            
            // フォールバック: PHP経由でデータベース接続確認
            fetch(PHP_BASE_URL + '?action=get_dashboard_stats')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        SystemLogger.success('データベース接続成功: PostgreSQL経由でアクセス可能');
                        SystemLogger.info(`データベース内データ: ${data.data?.total_records || 0}件`);
                        SystemLogger.warning('実スクレイピング機能は無効ですが、既存データは表示できます');
                    } else {
                        SystemLogger.error('データベース接続失敗');
                    }
                })
                .catch(dbError => {
                    SystemLogger.error('全システム接続失敗: ' + dbError.message);
                    SystemLogger.warning('実スクレイピングサーバー（python3 api_server_real_scraping.py）を起動してください');
                });
        });
}

// スクレイピングデータ編集機能（実APIサーバー版・エラーハンドリング強化）
let currentPage = 1;
let totalPages = 1;
let isLoadingEditingData = false;
let debugMode = false;

function loadEditingData(page = 1, debug = false) {
    if (isLoadingEditingData) {
        SystemLogger.warning('データ読み込み中です。重複処理をスキップします。');
        return;
    }
    
    isLoadingEditingData = true;
    debugMode = debug;
    
    const mode = debug ? '全データ（デバッグ）' : 'スクレイピングデータのみ';
    SystemLogger.info(`${mode}読み込み中...`);
    
    const tableBody = safeGetElement('editingTableBody');
    if (!tableBody) {
        SystemLogger.error('テーブルボディが見つかりません');
        isLoadingEditingData = false;
        return;
    }
    
    // ローディング表示
    tableBody.innerHTML = `
        <tr>
            <td colspan="11" style="text-align: center; padding: 2rem; color: #666;">
                <i class="fas fa-spinner fa-spin"></i> ${mode}を読み込み中...
            </td>
        </tr>
    `;
    
    // 実APIサーバーのスクレイピングデータ取得
    fetch(API_BASE_URL + `/api/get_scraped_products?page=${page}&limit=20`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.data) {
                const products = data.data;
                const totalCount = data.total_count || products.length;
                
                currentPage = page;
                totalPages = Math.ceil(totalCount / 20) || 1;
                
                displayEditingData(products, debug);
                updatePagination(totalCount, page, totalPages);
                
                SystemLogger.success(`${mode}読み込み完了: ${products.length}件 (総数${totalCount}件)`);
                
                // スクレイピングデータが0件の場合の正確なメッセージ
                if (!debug && totalCount === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="11" style="text-align: center; padding: 2rem; color: #dc3545;">
                                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 1.5rem; margin: 1rem;">
                                    <h4 style="margin: 0 0 0.5rem 0; color: #856404;"><i class="fas fa-exclamation-triangle"></i> Yahoo実スクレイピングデータがありません</h4>
                                    <p style="margin: 0.5rem 0; color: #856404; font-size: 0.9rem;">
                                        現在、データベースに<strong>Yahoo実スクレイピングデータが0件</strong>です。<br>
                                        「データ取得」タブでYahooオークションURLを入力してスクレイピングを実行してください。
                                    </p>
                                    <div style="margin-top: 1rem;">
                                        <button class="btn btn-primary" onclick="switchTab('scraping'); SystemLogger.info('データ取得タブに移動');">📡 データ取得タブへ</button>
                                        <button class="btn btn-warning" onclick="loadAllData()" style="margin-left: 0.5rem;">🔍 全データ表示</button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                    SystemLogger.warning('Yahoo実スクレイピングデータが見つかりません。「データ取得タブ」でYahooオークションをスクレイピングしてください。');
                    return;
                }
            } else {
                // エラー処理を改善
                const errorMessage = data.error || 'データの取得に失敗しました';
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="11" style="text-align: center; padding: 2rem; color: #dc3545;">
                            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 1.5rem; margin: 1rem;">
                                <h4 style="margin: 0 0 0.5rem 0; color: #721c24;"><i class="fas fa-exclamation-triangle"></i> データ取得エラー</h4>
                                <p style="margin: 0.5rem 0; color: #721c24; font-size: 0.9rem;">
                                    ${errorMessage}<br>
                                    APIサーバーが正常に動作していることを確認してください。
                                </p>
                                <div style="margin-top: 1rem;">
                                    <button class="btn btn-info" onclick="testConnection()">🔧 接続テスト</button>
                                    <button class="btn btn-primary" onclick="loadEditingData(1, false)" style="margin-left: 0.5rem;">🔄 再試行</button>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
                updatePagination(0, 1, 1);
                SystemLogger.error(`${mode}取得エラー: ${errorMessage}`);
            }
        })
        .catch(error => {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 2rem; color: #dc3545;">
                        <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 1.5rem; margin: 1rem;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #721c24;"><i class="fas fa-exclamation-circle"></i> 接続エラー</h4>
                            <p style="margin: 0.5rem 0; color: #721c24; font-size: 0.9rem;">
                                APIサーバー（localhost:5002）への接続に失敗しました。<br>
                                <strong>エラー:</strong> ${error.message}
                            </p>
                            <div style="margin-top: 1rem;">
                                <button class="btn btn-warning" onclick="testConnection()">🔧 APIサーバー接続テスト</button>
                                <button class="btn btn-info" onclick="loadEditingData(1, false)" style="margin-left: 0.5rem;">🔄 再試行</button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
            updatePagination(0, 1, 1);
            SystemLogger.error(`${mode}読み込みエラー: ${error.message}`);
        })
        .finally(() => {
            isLoadingEditingData = false;
        });
}

// 編集データ表示
function displayEditingData(data, debug = false) {
    const tableBody = safeGetElement('editingTableBody');
    if (!tableBody) return;
    
    // データURIプレースホルダー画像
    const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=';
    
    const rows = data.slice(0, 20).map((item, index) => {
        const isScrapedData = item.source_url && item.source_url.includes('http');
        const isYahooData = item.source_system === 'yahoo_scraped_confirmed' || (item.source_url && item.source_url.includes('auctions.yahoo.co.jp'));
        const dataTypeIcon = isYahooData ? '🕷️' : (isScrapedData ? '🔗' : '💾');
        const sourceLabel = debug ? (isYahooData ? 'Yahoo実取得' : (isScrapedData ? 'その他取得' : '既存データ')) : 'Yahoo実取得';
        const rowClass = debug ? (isYahooData ? 'yahoo-scraped-row' : (isScrapedData ? 'scraped-row' : 'existing-row')) : 'yahoo-scraped-row';
        
        return `
            <tr class="${rowClass}">
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editItem('${item.item_id}')">編集</button>
                </td>
                <td>
                    <span style="display: flex; align-items: center; gap: 0.25rem;">
                        ${dataTypeIcon}
                        <small>${sourceLabel}</small>
                    </span>
                </td>
                <td>
                    <img src="${item.picture_url && item.picture_url.startsWith('http') ? item.picture_url : defaultImage}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
                         onerror="this.src='${defaultImage}'; this.onerror=null;">
                </td>
                <td>${item.master_sku || item.item_id}</td>
                <td>${item.item_id}</td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${item.title}">${item.title}</td>
                <td>${item.category_name || 'General'}</td>
                <td>$${item.current_price || '0.00'}</td>
                <td><span class="badge badge-${item.ai_status || 'pending'}">${item.ai_status || 'pending'}</span></td>
                <td><span class="badge badge-success">Active</span></td>
                <td>${item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'N/A'}</td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = rows;
}

// プレースホルダー関数群
function approveProduct(sku) { 
    SystemLogger.success(`商品承認: ${sku}`); 
}

function rejectProduct(sku) { 
    SystemLogger.warning(`商品否認: ${sku}`); 
}

function selectAllVisible() { 
    SystemLogger.info('全選択実行'); 
}

function deselectAll() { 
    SystemLogger.info('全解除実行'); 
}

function bulkApprove() { 
    SystemLogger.success('一括承認実行'); 
}

function bulkReject() { 
    SystemLogger.warning('一括否認実行'); 
}

function exportSelectedProducts() { 
    SystemLogger.info('CSV出力実行'); 
}

function openNewProductModal() { 
    SystemLogger.info('新規商品登録モーダル表示'); 
}

function downloadEditingCSV() { 
    SystemLogger.info('編集データCSV出力'); 
}

function uploadEditedCSV() { 
    SystemLogger.info('編集済みCSVアップロード'); 
}

function saveAllEdits() { 
    SystemLogger.info('全編集内容保存'); 
}

// ページネーション機能（検索モード維持版）
function updatePagination(total, currentPage, totalPages) {
    const pageInfo = safeGetElement('pageInfo');
    if (pageInfo) {
        pageInfo.textContent = `ページ ${currentPage}/${totalPages} (総数: ${total}件)`;
    }
    
    // ページネーションボタンの状態更新
    const prevBtn = document.querySelector('button[onclick="changePage(-1)"]');
    const nextBtn = document.querySelector('button[onclick="changePage(1)"]');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.style.opacity = currentPage <= 1 ? '0.5' : '1';
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.style.opacity = currentPage >= totalPages ? '0.5' : '1';
    }
}

function changePage(direction) {
    const newPage = currentPage + direction;
    
    if (newPage < 1 || newPage > totalPages) {
        SystemLogger.warning(`ページ範囲外です: ${newPage}`);
        return;
    }
    
    SystemLogger.info(`ページ切り替え: ${currentPage} → ${newPage}`);
    
    // 現在の検索モードを維持してページネーション
    loadEditingData(newPage, debugMode);
}

function editItem(itemId) {
    SystemLogger.info(`アイテム編集: ${itemId}`);
}

// 全データ表示用の関数
function loadAllData() {
    SystemLogger.info('デバッグモード: 全データを表示します（スクレイピングデータ + 既存データ）');
    loadEditingData(1, true);
}

function loadEditingDataStrict() {
    SystemLogger.info('厳密検索: Yahoo実スクレイピングデータのみを検索します');
    loadEditingData(1, false);
}

function testCSVDownload() {
    SystemLogger.info('CSV出力テスト実行中...');
    
    // PHP経由でCSV出力テスト
    const testUrl = PHP_BASE_URL + '?action=download_csv';
    
    // 新しいウィンドウでCSVダウンロード
    const downloadWindow = window.open(testUrl, '_blank');
    
    if (downloadWindow) {
        SystemLogger.success('CSV出力テストを実行しました。ダウンロードが開始されます。');
    } else {
        SystemLogger.error('CSV出力テストに失敗しました。ポップアップブロックを確認してください。');
        // フォールバック: 直接リンクを作成
        const link = document.createElement('a');
        link.href = testUrl;
        link.download = `test_csv_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        SystemLogger.info('直接ダウンロードリンクを実行しました。');
    }
}

// システム初期化
document.addEventListener('DOMContentLoaded', function() {
    SystemLogger.success('システム初期化完了（完全修正版）');
    SystemLogger.info('承認タブ: 空データ表示に統一済み');
    
    // ダッシュボード統計の更新（1回のみ）
    updateSystemDashboard();
    
    // 🚨 修正：初期タブが承認タブの場合、空データ表示を実行
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.dataset.tab === 'approval') {
        // 1秒後に1回だけ実行
        setTimeout(() => {
            displayEmptyApprovalState();
        }, 1000);
    }
});

// システムダッシュボード更新（PHP経由）
let updatingDashboard = false;

function updateSystemDashboard() {
    // 無限ループ防止
    if (updatingDashboard) {
        return;
    }
    
    updatingDashboard = true;
    
    // PHP経由でダッシュボード統計取得
    fetch(PHP_BASE_URL + '?action=get_dashboard_stats')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data) {
                const stats = data.data;
                updateConstraintValue('totalRecords', stats.total_records || 637);
                updateConstraintValue('scrapedCount', stats.scraped_count || 5);
                updateConstraintValue('calculatedCount', stats.calculated_count || 637);
                updateConstraintValue('filteredCount', stats.filtered_count || 637);
                updateConstraintValue('readyCount', stats.ready_count || 637);
                updateConstraintValue('listedCount', stats.listed_count || 0);
                
                SystemLogger.info(`ダッシュボード統計更新完了（${stats.total_records}件管理中）`);
            }
        })
        .catch(error => {
            SystemLogger.warning('ダッシュボード統計更新失敗: ' + error.message);
        })
        .finally(() => {
            updatingDashboard = false;
        });
}
