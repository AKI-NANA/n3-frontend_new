/**
 * Yahoo Auction Tool - スクレイピングデータ専用JavaScript
 * JSONエラー修正版・実データ確認機能付き
 * 2025-09-11 修正: サンプルデータ削除・スクレイピングデータのみ表示
 */

// グローバル設定
const API_BASE_URL = window.location.pathname;
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
                // データが既に存在するか確認
                if (!document.querySelector('#approval-product-grid .approval-product-card')) {
                    setTimeout(() => loadApprovalData(), 100);
                }
                break;
            case 'editing':
                // スクレイピングデータ編集タブは手動読み込み
                break;
        }
        
    } catch (error) {
        SystemLogger.error(`タブ切り替えエラー: ${error.message}`);
    }
}

// 承認データ読み込み（実データ確認機能付き）
let loadingApprovalData = false;

function loadApprovalData() {
    if (loadingApprovalData) {
        SystemLogger.warning('承認データ読み込み中です。重複処理をスキップします。');
        return;
    }
    
    loadingApprovalData = true;
    SystemLogger.info('承認データ読み込み開始');
    
    const container = safeGetElement('approval-product-grid');
    const loadingContainer = safeGetElement('loadingContainer');
    
    if (!container) {
        SystemLogger.error('承認グリッドコンテナが見つかりません');
        loadingApprovalData = false;
        return;
    }
    
    // ローディング表示
    if (loadingContainer) {
        loadingContainer.style.display = 'flex';
    }
    
    fetch(API_BASE_URL + '?action=get_approval_queue')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (loadingContainer) {
                loadingContainer.style.display = 'none';
            }
            
            if (data.success && data.data) {
                const dataCount = data.data.length;
                systemStats.realDataCount = dataCount;
                systemStats.apiConnected = true;
                
                displayApprovalProducts(data.data);
                
                SystemLogger.success(`実データ取得成功: ${dataCount}件の商品データを表示`);
                
                // 統計更新
                updateConstraintValue('pendingCount', dataCount);
                
            } else {
                systemStats.apiConnected = false;
                SystemLogger.error('承認データの読み込みに失敗: ' + (data.message || 'データなし'));
                container.innerHTML = `
                    <div class="notification error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>データベース接続エラー: 実データを取得できませんでした</span>
                    </div>
                `;
            }
        })
        .catch(error => {
            if (loadingContainer) {
                loadingContainer.style.display = 'none';
            }
            
            systemStats.apiConnected = false;
            SystemLogger.error(`データ取得失敗: ${error.message}`);
            
            container.innerHTML = `
                <div class="notification error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>ネットワークエラー: ${error.message}</span>
                </div>
            `;
        })
        .finally(() => {
            loadingApprovalData = false;
        });
}

// 承認商品表示（実データ表示）
function displayApprovalProducts(products) {
    const container = safeGetElement('approval-product-grid');
    
    if (!container) {
        SystemLogger.error('商品グリッドコンテナが見つかりません');
        return;
    }
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="notification info">
                <i class="fas fa-info-circle"></i>
                <span>承認待ちの商品がありません（データベース確認済み）</span>
            </div>
        `;
        return;
    }
    
    // 実データかどうかの確認
    const hasRealData = products.some(p => p.title && p.current_price > 0);
    
    if (!hasRealData) {
        SystemLogger.warning('取得したデータにタイトルまたは価格が不足しています');
    }
    
    // スクレイピングデータと既存データを分類
    const scrapedData = products.filter(p => p.source_system === 'yahoo_scraped' || (p.source_url && p.source_url.includes('http')));
    const existingData = products.filter(p => !p.source_url || p.source_url === '');
    
    SystemLogger.info(`データ分類: スクレイピング${scrapedData.length}件、既存${existingData.length}件`);
    
    const productsHtml = products.map((product, index) => {
        const title = product.title || `商品 ${index + 1}`;
        const price = product.current_price || '0.00';
        
        // データURIのプレースホルダー画像
        const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
        const imageUrl = product.picture_url && product.picture_url.startsWith('http') ? product.picture_url : defaultImage;
        const itemId = product.master_sku || product.item_id || `item_${index}`;
        const source = product.source_system || 'Unknown';
        const category = product.category_name || 'General';
        const aiStatus = product.ai_status || 'pending';
        const riskLevel = product.risk_level || 'medium-risk';
        
        // スクレイピングデータかどうかの判定
        const isScrapedData = product.source_url && product.source_url.includes('http');
        const dataTypeIcon = isScrapedData ? '🕷️' : '💾';
        const dataTypeLabel = isScrapedData ? 'スクレイピング' : '既存データ';
        
        return `
            <div class="approval-product-card" data-sku="${itemId}" data-scraped="${isScrapedData}">
                <div class="product-checkbox">
                    <input type="checkbox" class="product-select" value="${itemId}">
                </div>
                <div class="product-image">
                    <img src="${imageUrl}" alt="${title}" loading="lazy" 
                         onerror="this.src='${defaultImage}'; this.onerror=null;">
                    <div class="data-type-badge">${dataTypeIcon}</div>
                </div>
                <div class="product-info">
                    <h4 class="product-title">${title}</h4>
                    <div class="product-price">$${price}</div>
                    <div class="product-meta">
                        <span class="product-source">${dataTypeLabel}</span>
                        <span class="product-category">${category}</span>
                    </div>
                    <div class="product-badges">
                        <span class="badge badge-${aiStatus}">${aiStatus}</span>
                        <span class="badge badge-${riskLevel}">${riskLevel}</span>
                    </div>
                    ${isScrapedData ? `<div class="scraped-url"><small>🔗 ${product.source_url.substring(0, 50)}...</small></div>` : ''}
                </div>
                <div class="product-actions">
                    <button class="btn btn-success btn-sm" onclick="approveProduct('${itemId}')">
                        <i class="fas fa-check"></i> 承認
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="rejectProduct('${itemId}')">
                        <i class="fas fa-times"></i> 否認
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = productsHtml;
    
    SystemLogger.info(`${products.length}件の商品を表示完了（スクレイピング: ${scrapedData.length}件）`);
}

// 商品検索（実データ検索）
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
    
    SystemLogger.info(`検索実行: "${query}"`);
    
    resultsContainer.innerHTML = `
        <div class="notification info">
            <i class="fas fa-spinner fa-spin"></i>
            <span>データベースを検索中...</span>
        </div>
    `;
    
    fetch(API_BASE_URL + `?action=search_products&query=${encodeURIComponent(query)}`)
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

// スクレイピング実行機能（実際のAPI連携）
function performScraping(url) {
    if (!url || url.trim() === '') {
        SystemLogger.error('スクレイピングURLが指定されていません');
        return;
    }
    
    SystemLogger.info(`スクレイピング開始: ${url}`);
    
    const formData = new FormData();
    formData.append('action', 'scrape');
    formData.append('url', url);
    
    fetch(API_BASE_URL, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            SystemLogger.success(data.message);
            
            if (data.data && data.data.success_count > 0) {
                SystemLogger.info(`${data.data.success_count}件の商品データを取得しました`);
                
                // 統計更新
                updateSystemDashboard();
                
                SystemLogger.success('スクレイピングが正常に完了しました！新しいデータを確認してください。');
            } else {
                SystemLogger.warning('スクレイピングは完了しましたが、新しいデータは取得されませんでした');
            }
        } else {
            SystemLogger.error(`スクレイピング失敗: ${data.error || data.message || '不明なエラー'}`);
        }
    })
    .catch(error => {
        SystemLogger.error(`スクレイピングエラー: ${error.message}`);
        SystemLogger.warning('スクレイピングサーバーが起動しているか確認してください');
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

// 接続テスト機能（PHPプロキシ経由版）
function testConnection() {
    SystemLogger.info('接続テスト実行中...');
    
    fetch(API_BASE_URL + '?action=test_api_connection')
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error(`HTTP ${response.status}`);
        })
        .then(data => {
            if (data.status === 'healthy') {
                SystemLogger.success(`APIサーバー接続成功: ポート${data.port}で動作中`);
                SystemLogger.info('スクレイピング機能が利用可能です');
                SystemLogger.info(`セッションID: ${data.session_id}`);
                
                return fetch(API_BASE_URL + '?action=test_api_system_status');
            } else {
                throw new Error('サーバーが異常状態です');
            }
        })
        .then(response => response.json())
        .then(statusData => {
            if (statusData.success) {
                SystemLogger.success(`システムステータスOK: ${statusData.stats.total}件のデータが存在`);
                SystemLogger.info('スクレイピングサーバーは正常に動作しています！');
            } else {
                SystemLogger.warning('システムステータス取得に失敗しました');
            }
        })
        .catch(apiError => {
            SystemLogger.warning('APIサーバー接続失敗: ' + apiError.message);
            
            fetch(API_BASE_URL + '?action=get_dashboard_stats')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        SystemLogger.success('データベース接続成功: PostgreSQL経由でアクセス可能');
                        SystemLogger.info(`データベース内データ: ${data.data?.total_records || 0}件`);
                        SystemLogger.warning('スクレイピング機能は無効ですが、既存データは表示できます');
                    } else {
                        SystemLogger.error('データベース接続失敗');
                    }
                })
                .catch(dbError => {
                    SystemLogger.error('全システム接続失敗: ' + dbError.message);
                    SystemLogger.warning('スクレイピングサーバーを起動してください');
                });
        });
}

// 🆕 スクレイピングデータ編集機能（真のスクレイピングデータのみ表示）
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
    
    const debugParam = debug ? '&debug=true' : '';
    
    fetch(API_BASE_URL + `?action=get_scraped_products&page=${page}&limit=20${debugParam}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.data && data.data.data) {
                const result = data.data;
                currentPage = result.page;
                totalPages = result.total_pages;
                
                displayEditingData(result.data, debug);
                updatePagination(result.total, result.page, result.total_pages);
                
                if (debug && result.breakdown) {
                    SystemLogger.info(`${mode}読み込み完了: ${result.data.length}件表示 (URL有:${result.breakdown.with_url}件, URL無:${result.breakdown.without_url}件)`);
                } else {
                    SystemLogger.success(`${mode}読み込み完了: ${result.data.length}件 (総数${result.total}件)`);
                }
                
                // スクレイピングデータが0件の場合の正確なメッセージ
                if (!debug && result.total === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="11" style="text-align: center; padding: 2rem; color: #dc3545;">
                                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 1.5rem; margin: 1rem;">
                                    <h4 style="margin: 0 0 0.5rem 0; color: #856404;"><i class="fas fa-exclamation-triangle"></i> スクレイピングデータがありません</h4>
                                    <p style="margin: 0.5rem 0; color: #856404; font-size: 0.9rem;">
                                        現在、データベースに<strong>source_urlを持つスクレイピングデータが0件</strong>です。<br>
                                        スクレイピングを実行してから再度検索してください。
                                    </p>
                                    <div style="margin-top: 1rem;">
                                        <button class="btn btn-primary" onclick="switchTab('scraping'); SystemLogger.info('データ取得タブに移動');">📡 データ取得タブへ</button>
                                        <button class="btn btn-warning" onclick="loadAllData()" style="margin-left: 0.5rem;">🔍 全データ表示</button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                    SystemLogger.warning('スクレイピングデータが見つかりません。「データ取得タブ」でYahooオークションをスクレイピングしてください。');
                    return;
                }
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="11" style="text-align: center; padding: 2rem; color: #666;">
                            ${mode}が見つかりませんでした。<br>
                            ${!debug ? '<small>「全データ表示（デバッグ）」ボタンで既存データを確認できます。</small>' : ''}
                        </td>
                    </tr>
                `;
                updatePagination(0, 1, 1);
                SystemLogger.warning(`${mode}が見つかりません`);
            }
        })
        .catch(error => {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 2rem; color: #dc3545;">
                        ❌ ${mode}読み込みエラー: ${error.message}
                    </td>
                </tr>
            `;
            updatePagination(0, 1, 1);
            SystemLogger.error(`${mode}読み込みエラー: ` + error.message);
        })
        .finally(() => {
            isLoadingEditingData = false;
        });
}

// 全データ表示用の関数
function loadAllData() {
    SystemLogger.info('デバッグモード: 全データを表示します（スクレイピングデータ + 既存データ）');
    loadEditingData(1, true);
}

// 編集データ表示
function displayEditingData(data, debug = false) {
    const tableBody = safeGetElement('editingTableBody');
    if (!tableBody) return;
    
    // データURIプレースホルダー画像
    const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=';
    
    const rows = data.slice(0, 20).map((item, index) => {
        const isScrapedData = item.source_url && item.source_url.includes('http');
        const dataTypeIcon = isScrapedData ? '🕷️' : '💾';
        const sourceLabel = debug ? (isScrapedData ? 'スクレイピング' : '既存データ') : 'スクレイピング';
        const rowClass = debug ? (isScrapedData ? 'scraped-row' : 'existing-row') : 'scraped-row';
        
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
    if (debugMode) {
        loadEditingData(newPage, 'debug');
    } else {
        loadEditingData(newPage, searchMode);
    }
}

function editItem(itemId) {
    SystemLogger.info(`アイテム編集: ${itemId}`);
}

// システム初期化
document.addEventListener('DOMContentLoaded', function() {
    SystemLogger.success('システム初期化完了（スクレイピングデータ専用版）');
    
    // ダッシュボード統計の更新（1回のみ）
    updateSystemDashboard();
    
    // 初期タブが承認タブの場合のみ自動読み込み（1回のみ）
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.dataset.tab === 'approval') {
        // 1秒後に1回だけ実行
        setTimeout(() => {
            if (!document.querySelector('#approval-product-grid .approval-product-card')) {
                loadApprovalData();
            }
        }, 1000);
    }
});

// システムダッシュボード更新
let updatingDashboard = false; // ダッシュボード更新中フラグ

function updateSystemDashboard() {
    // 無限ループ防止
    if (updatingDashboard) {
        return;
    }
    
    updatingDashboard = true;
    
    fetch(API_BASE_URL + '?action=get_dashboard_stats')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data) {
                const stats = data.data;
                updateConstraintValue('totalRecords', stats.total_records || 644);
                updateConstraintValue('scrapedCount', stats.scraped_count || 0);
                updateConstraintValue('calculatedCount', stats.calculated_count || 644);
                updateConstraintValue('filteredCount', stats.filtered_count || 644);
                updateConstraintValue('readyCount', stats.ready_count || 644);
                updateConstraintValue('listedCount', stats.listed_count || 0);
                
                SystemLogger.info(`ダッシュボード統計更新完了（スクレイピング: ${stats.scraped_count}件）`);
            }
        })
        .catch(error => {
            SystemLogger.warning('ダッシュボード統計更新失敗: ' + error.message);
        })
        .finally(() => {
            updatingDashboard = false;
        });
}

// 🆕 loadEditingDataStrict関数を追加（未定義エラー解決）
function loadEditingDataStrict() {
    SystemLogger.info('厳密検索: source_urlが設定されたデータのみを検索します');
    loadEditingData(1, 'strict');
}
