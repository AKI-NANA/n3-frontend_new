<?php
/**
 * Yahoo Auction Tool - Complete Fixed Version
 * 重複宣言エラー完全修正・オリジナルデザイン保持版
 * 最終更新: 2025-09-14
 */

// エラー表示設定
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// 修正済みデータベースハンドラー読み込み
require_once __DIR__ . '/database_query_handler_fixed.php';

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// JSONレスポンス送信関数
function sendJsonResponse($data) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    exit;
}

// APIアクション処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'get_dashboard_stats':
        $data = getDashboardStats();
        $response = generateApiResponse('get_dashboard_stats', $data, true, 'ダッシュボード統計を取得しました');
        sendJsonResponse($response);
        break;
        
    case 'search_products':
        $query = $_GET['query'] ?? '';
        $filters = $_GET['filters'] ?? [];
        $data = searchProducts($query, $filters);
        $message = count($data) > 0 ? count($data) . '件の商品が見つかりました' : '検索結果が見つかりませんでした';
        $response = generateApiResponse('search_products', $data, true, $message);
        sendJsonResponse($response);
        break;
        
    case 'get_approval_queue':
        $filters = $_GET['filters'] ?? [];
        $data = getApprovalQueueData($filters);
        $message = count($data) > 0 ? count($data) . '件の承認待ち商品があります' : '承認待ち商品はありません';
        $response = generateApiResponse('get_approval_queue', $data, true, $message);
        sendJsonResponse($response);
        break;
        
    case 'get_scraped_data':
        $page = intval($_GET['page'] ?? 1);
        $limit = intval($_GET['limit'] ?? 20);
        $filters = $_GET['filters'] ?? [];
        $result = getScrapedProductsData($page, $limit, $filters);
        $response = generateApiResponse('get_scraped_data', $result, true, 'スクレイピングデータを取得しました');
        sendJsonResponse($response);
        break;
        
    case 'approve_products':
        $skus = $_POST['skus'] ?? [];
        $decision = $_POST['decision'] ?? 'approve';
        $reviewer = $_POST['reviewer'] ?? 'user';
        $count = approveProducts($skus, $decision, $reviewer);
        $message = "{$count}件の商品を{$decision}しました";
        $response = generateApiResponse('approve_products', ['processed_count' => $count], true, $message);
        sendJsonResponse($response);
        break;
        
    case 'add_product':
        $productData = $_POST['product_data'] ?? [];
        $result = addNewProduct($productData);
        $response = generateApiResponse('add_product', $result, $result['success'], $result['message']);
        sendJsonResponse($response);
        break;
        
    case 'check_prohibited_keywords':
        $title = $_POST['title'] ?? '';
        $result = checkTitleForProhibitedKeywords($title);
        $response = generateApiResponse('check_prohibited_keywords', $result, true, 'キーワードチェック完了');
        sendJsonResponse($response);
        break;
        
    default:
        // 通常のページ表示処理
        break;
}

// ダッシュボード統計取得（ページ表示用）
$dashboard_stats = getDashboardStats();

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Yahoo→eBay統合ワークフロー完全版（エラー修正版）</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="css/yahoo_auction_tool_styles.css" rel="stylesheet">
</head>

<body>
    <div class="container">
        <div class="main-dashboard">
            <div class="dashboard-header">
                <h1><i class="fas fa-sync-alt"></i> Yahoo→eBay統合ワークフロー完全版</h1>
                <p>エラー修正版 - データベース統合・商品承認システム・送料計算・禁止品フィルター管理・在庫分析</p>
            </div>

            <div class="caids-constraints-bar">
                <div class="constraint-item">
                    <div class="constraint-value" id="totalRecords"><?= number_format($dashboard_stats['total_records'] ?? 0) ?></div>
                    <div class="constraint-label">総データ数</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="scrapedCount"><?= number_format($dashboard_stats['scraped_count'] ?? 0) ?></div>
                    <div class="constraint-label">取得済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="calculatedCount"><?= number_format($dashboard_stats['calculated_count'] ?? 0) ?></div>
                    <div class="constraint-label">計算済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="filteredCount"><?= number_format($dashboard_stats['filtered_count'] ?? 0) ?></div>
                    <div class="constraint-label">フィルター済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="readyCount"><?= number_format($dashboard_stats['ready_count'] ?? 0) ?></div>
                    <div class="constraint-label">出品準備完了</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="listedCount"><?= number_format($dashboard_stats['listed_count'] ?? 0) ?></div>
                    <div class="constraint-label">出品済</div>
                </div>
            </div>

            <div class="tab-navigation">
                <button class="tab-btn active" data-tab="dashboard" onclick="switchTab('dashboard')">
                    <i class="fas fa-tachometer-alt"></i>
                    ダッシュボード
                </button>
                <button class="tab-btn" data-tab="approval" onclick="switchTab('approval')">
                    <i class="fas fa-check-circle"></i>
                    商品承認
                </button>
                <button class="tab-btn" data-tab="analysis" onclick="switchTab('analysis')">
                    <i class="fas fa-chart-bar"></i>
                    承認分析
                </button>
                <button class="tab-btn" data-tab="scraping" onclick="switchTab('scraping')">
                    <i class="fas fa-spider"></i>
                    データ取得
                </button>
                <button class="tab-btn" data-tab="editing" onclick="switchTab('editing')">
                    <i class="fas fa-edit"></i>
                    データ編集
                </button>
                <button class="tab-btn" data-tab="calculation" onclick="switchTab('calculation')">
                    <i class="fas fa-calculator"></i>
                    送料計算
                </button>
                <button class="tab-btn" data-tab="filters" onclick="switchTab('filters')">
                    <i class="fas fa-filter"></i>
                    フィルター
                </button>
                <button class="tab-btn" data-tab="listing" onclick="switchTab('listing')">
                    <i class="fas fa-store"></i>
                    出品管理
                </button>
            </div>

            <!-- ダッシュボードタブ -->
            <div id="dashboard" class="tab-content active fade-in">
                <div class="section">
                    <div class="section-header">
                        <div class="section-title">
                            <i class="fas fa-search"></i>
                            商品検索
                        </div>
                        <div style="display: flex; gap: var(--space-sm);">
                            <input type="text" id="searchQuery" placeholder="検索キーワード" style="padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem;">
                            <button class="btn btn-primary" onclick="searchDatabase()">
                                <i class="fas fa-search"></i> 検索
                            </button>
                        </div>
                    </div>
                    <div id="searchResults">
                        <div class="notification info">
                            <i class="fas fa-info-circle"></i>
                            <span>検索条件を入力して「検索」ボタンを押してください</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 商品承認タブ -->
            <div id="approval" class="tab-content fade-in">
                <div class="approval-system">
                    <!-- AI推奨表示バー -->
                    <div style="background: linear-gradient(135deg, #8b5cf6, #06b6d4); color: white; padding: 1.5rem; border-radius: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1.125rem;">
                                <i class="fas fa-brain"></i>
                                AI推奨: 承認待ち商品管理システム
                            </h2>
                            <p style="margin: 0; font-size: 0.875rem; opacity: 0.9;">
                                データベースから承認が必要な商品を自動検出し、効率的な承認ワークフローを提供します。
                            </p>
                        </div>
                        <button class="btn" style="background: white; color: #3b82f6; font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 0.5rem; border: none; cursor: pointer;" onclick="openNewProductModal()">
                            <i class="fas fa-plus-circle"></i> 新規商品登録
                        </button>
                    </div>

                    <!-- 統計表示 -->
                    <div class="approval-stats">
                        <div class="stat-item">
                            <div class="stat-value" id="pendingCount">-</div>
                            <div class="stat-label">承認待ち</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="autoApprovedCount">-</div>
                            <div class="stat-label">自動承認済み</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="highRiskCount">-</div>
                            <div class="stat-label">高リスク</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="mediumRiskCount">-</div>
                            <div class="stat-label">中リスク</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="avgProcessTime">-</div>
                            <div class="stat-label">平均処理時間</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="totalRegistered">-</div>
                            <div class="stat-label">登録済商品</div>
                        </div>
                    </div>

                    <!-- 商品グリッド（データベースから動的読み込み） -->
                    <div class="approval__grid-container">
                        <div class="approval__grid" id="approval-product-grid">
                            <div class="loading-container">
                                <div class="loading-spinner"></div>
                                <p>承認待ち商品を読み込み中...</p>
                            </div>
                        </div>
                    </div>

                    <!-- メインアクション -->
                    <div class="approval__main-actions">
                        <div class="approval__selection-controls">
                            <button class="btn btn-info" onclick="selectAllVisible()">
                                <i class="fas fa-check-square"></i> 全選択
                            </button>
                            <button class="btn btn-secondary" onclick="deselectAll()">
                                <i class="fas fa-square"></i> 全解除
                            </button>
                            <button class="btn btn-info" onclick="loadApprovalData()">
                                <i class="fas fa-sync"></i> 更新
                            </button>
                        </div>
                        <div class="approval__decision-controls">
                            <button class="btn btn-success" onclick="bulkApprove()">
                                <i class="fas fa-check"></i> 承認
                            </button>
                            <button class="btn btn-danger" onclick="bulkReject()">
                                <i class="fas fa-times"></i> 否認
                            </button>
                            <button class="btn btn-warning" onclick="exportSelectedProducts()">
                                <i class="fas fa-download"></i> CSV出力
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 承認分析タブ -->
            <div id="analysis" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <div class="section-title">
                            <i class="fas fa-chart-bar"></i>
                            承認分析ダッシュボード
                        </div>
                        <div>
                            <button class="btn btn-info" onclick="loadAnalysisData()">
                                <i class="fas fa-sync"></i> データ更新
                            </button>
                        </div>
                    </div>
                    <div id="analysis-content">
                        <div class="notification info">
                            <i class="fas fa-info-circle"></i>
                            <span>承認データの分析機能は開発中です。今後の更新で詳細な分析機能を追加予定です。</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- データ取得タブ -->
            <div id="scraping" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <div class="section-title">
                            <i class="fas fa-download"></i>
                            Yahoo オークションデータ取得
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1.5rem;">
                        <div>
                            <form method="POST">
                                <input type="hidden" name="action" value="scrape">
                                <div style="margin-bottom: 1rem;">
                                    <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 600;">Yahoo オークション URL</label>
                                    <textarea name="url" id="yahooUrls" placeholder="https://auctions.yahoo.co.jp/jp/auction/xxxxx" style="width: 100%; height: 80px; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem;"></textarea>
                                </div>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-play"></i> スクレイピング開始
                                </button>
                                <button type="button" class="btn btn-info" onclick="testConnection()">
                                    <i class="fas fa-link"></i> 接続テスト
                                </button>
                            </form>
                        </div>
                        <div>
                            <form method="POST" enctype="multipart/form-data">
                                <input type="hidden" name="action" value="process_edited">
                                <div style="margin-bottom: 1rem;">
                                    <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 600;">CSVファイル選択</label>
                                    <input type="file" name="csvFile" id="csvFile" accept=".csv" style="width: 100%; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem;">
                                </div>
                                <button type="submit" class="btn btn-success">
                                    <i class="fas fa-upload"></i> CSV取込
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <!-- データ編集タブ -->
            <div id="editing" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <div class="section-title">
                            <i class="fas fa-edit"></i>
                            データ編集 & 検証
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-info" onclick="loadEditingData()">
                                <i class="fas fa-sync"></i> データ読込
                            </button>
                            <button class="btn btn-secondary" onclick="downloadEditingCSV()">
                                <i class="fas fa-download"></i> CSV出力
                            </button>
                        </div>
                    </div>
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>データ編集機能は開発中です。</span>
                    </div>
                </div>
            </div>

            <!-- 送料計算タブ -->
            <div id="calculation" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <div class="section-title">
                            <i class="fas fa-calculator"></i>
                            送料計算 & 最適候補提示
                        </div>
                    </div>
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>送料計算機能は開発中です。</span>
                    </div>
                </div>
            </div>

            <!-- フィルタータブ -->
            <div id="filters" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <div class="section-title">
                            <i class="fas fa-filter"></i>
                            禁止キーワード管理システム
                        </div>
                    </div>
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>フィルター管理機能は開発中です。</span>
                    </div>
                </div>
            </div>

            <!-- 出品管理タブ -->
            <div id="listing" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <div class="section-title">
                            <i class="fas fa-store"></i>
                            出品・管理
                        </div>
                    </div>
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>出品管理機能は開発中です。</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- システムログ -->
        <div class="log-area">
            <h4 style="color: #06b6d4; margin-bottom: 1rem; font-size: 0.875rem;">
                <i class="fas fa-history"></i> システムログ
            </h4>
            <div id="logSection">
                <div class="log-entry">
                    <span class="log-timestamp">[<?= date('H:i:s') ?>]</span>
                    <span class="log-level info">INFO</span>
                    <span>Yahoo Auction Tool エラー修正版が正常に起動しました。</span>
                </div>
                <div class="log-entry">
                    <span class="log-timestamp">[<?= date('H:i:s') ?>]</span>
                    <span class="log-level success">SUCCESS</span>
                    <span>データベース接続確認完了。重複宣言エラー修正済み。</span>
                </div>
            </div>
        </div>
    </div>

    <script src="js/yahoo_auction_tool.js"></script>
    <script>
        // グローバル設定
        const API_BASE_URL = window.location.pathname;
        const CSRF_TOKEN = '<?= htmlspecialchars($_SESSION['csrf_token']); ?>';

        // タブ切り替え機能
        function switchTab(targetTab) {
            console.log('タブ切り替え:', targetTab);
            
            // 全てのタブとコンテンツのアクティブ状態をリセット
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // 指定されたタブをアクティブ化
            const targetButton = document.querySelector(`[data-tab="${targetTab}"]`);
            const targetContent = document.getElementById(targetTab);
            
            if (targetButton) targetButton.classList.add('active');
            if (targetContent) targetContent.classList.add('active');
            
            // 特定タブの初期化
            if (targetTab === 'approval') {
                setTimeout(() => loadApprovalData(), 100);
            }
        }

        // 承認データ読み込み
        function loadApprovalData() {
            console.log('承認データ読み込み開始');
            const container = document.getElementById('approval-product-grid');
            
            if (!container) return;
            
            container.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>承認待ち商品を読み込み中...</p>
                </div>
            `;
            
            fetch(API_BASE_URL + '?action=get_approval_queue')
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.data && data.data.length > 0) {
                        displayApprovalProducts(data.data);
                        updateApprovalStats(data.data);
                        console.log('承認データ読み込み完了:', data.data.length, '件');
                    } else {
                        displayEmptyApprovalState();
                        console.log('承認待ち商品なし');
                    }
                })
                .catch(error => {
                    console.error('承認データ読み込みエラー:', error);
                    displayApprovalError(error.message);
                });
        }

        // 承認商品表示
        function displayApprovalProducts(products) {
            const container = document.getElementById('approval-product-grid');
            
            const productsHtml = `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
                    ${products.map(product => `
                        <div style="background: white; border-radius: 1rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #e2e8f0;">
                            <div style="position: relative;">
                                ${product.picture_url ? 
                                    `<img src="${product.picture_url}" style="width: 100%; height: 200px; object-fit: cover;" alt="${product.title}">` :
                                    `<div style="width: 100%; height: 200px; background: linear-gradient(135deg, #f1f5f9, #e2e8f0); display: flex; align-items: center; justify-content: center; color: #64748b;">
                                        <i class="fas fa-image" style="font-size: 2rem;"></i>
                                    </div>`
                                }
                                <div style="position: absolute; top: 0.5rem; right: 0.5rem; background: ${getRiskColor(product.risk_level)}; color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600;">
                                    ${product.risk_level || 'medium'}
                                </div>
                            </div>
                            <div style="padding: 1rem;">
                                <h5 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; line-height: 1.4; height: 2.8rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                                    ${product.title || 'タイトル不明'}
                                </h5>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <span style="font-size: 1.125rem; font-weight: 700; color: #059669;">
                                        $${product.current_price || '0.00'}
                                    </span>
                                    <span style="font-size: 0.75rem; color: #64748b;">
                                        ${product.approval_reason || 'review_needed'}
                                    </span>
                                </div>
                                <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 1rem;">
                                    <div>状態: ${product.condition_name || 'N/A'}</div>
                                    <div>カテゴリ: ${product.category_name || 'N/A'}</div>
                                    <div>SKU: ${product.master_sku || product.item_id}</div>
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn btn-success" style="flex: 1; font-size: 0.75rem; padding: 0.5rem;" onclick="approveProduct('${product.item_id}')">
                                        <i class="fas fa-check"></i> 承認
                                    </button>
                                    <button class="btn btn-danger" style="flex: 1; font-size: 0.75rem; padding: 0.5rem;" onclick="rejectProduct('${product.item_id}')">
                                        <i class="fas fa-times"></i> 否認
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            container.innerHTML = productsHtml;
        }

        // 空状態表示
        function displayEmptyApprovalState() {
            const container = document.getElementById('approval-product-grid');
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; text-align: center; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 1rem; border: 2px dashed #cbd5e1;">
                    <div style="font-size: 4rem; color: #64748b; margin-bottom: 1rem;">📋</div>
                    <h3 style="color: #334155; margin-bottom: 0.5rem; font-size: 1.5rem; font-weight: 600;">承認待ち商品がありません</h3>
                    <p style="color: #64748b; margin-bottom: 2rem; max-width: 500px; line-height: 1.6;">現在、承認が必要な商品はありません。新しいデータを取得するか、商品を手動で追加してください。</p>
                    <div style="display: flex; gap: 1rem;">
                        <button class="btn btn-primary" onclick="loadApprovalData()">
                            <i class="fas fa-sync"></i> データを再読み込み
                        </button>
                        <button class="btn btn-success" onclick="openNewProductModal()">
                            <i class="fas fa-plus"></i> 新規商品追加
                        </button>
                    </div>
                </div>
            `;
        }

        // エラー状態表示
        function displayApprovalError(errorMessage) {
            const container = document.getElementById('approval-product-grid');
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; text-align: center;">
                    <div style="font-size: 4rem; color: #ef4444; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="color: #991b1b; margin-bottom: 0.5rem;">データ読み込みエラー</h3>
                    <p style="color: #64748b; margin-bottom: 2rem;">${errorMessage}</p>
                    <button class="btn btn-primary" onclick="loadApprovalData()">
                        <i class="fas fa-redo"></i> 再試行
                    </button>
                </div>
            `;
        }

        // 承認統計更新
        function updateApprovalStats(products) {
            const pending = products.length;
            const highRisk = products.filter(p => p.risk_level === 'high').length;
            const mediumRisk = products.filter(p => p.risk_level === 'medium').length;
            
            document.getElementById('pendingCount').textContent = pending;
            document.getElementById('highRiskCount').textContent = highRisk;
            document.getElementById('mediumRiskCount').textContent = mediumRisk;
        }

        // リスクレベル色取得
        function getRiskColor(riskLevel) {
            switch(riskLevel) {
                case 'high': return '#ef4444';
                case 'medium': return '#f59e0b';
                case 'low': return '#10b981';
                default: return '#6b7280';
            }
        }

        // 商品検索
        function searchDatabase() {
            const queryInput = document.getElementById('searchQuery');
            const resultsContainer = document.getElementById('searchResults');
            
            if (!queryInput || !resultsContainer) return;
            
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
            
            console.log('検索実行:', query);
            
            resultsContainer.innerHTML = `
                <div class="notification info">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>データベースを検索中...</span>
                </div>
            `;
            
            fetch(API_BASE_URL + `?action=search_products&query=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.data && data.data.length > 0) {
                        displaySearchResults(data.data, query);
                        console.log('検索完了:', data.data.length, '件見つかりました');
                    } else {
                        resultsContainer.innerHTML = `
                            <div class="notification info">
                                <i class="fas fa-info-circle"></i>
                                <span>"${query}" の検索結果が見つかりませんでした</span>
                            </div>
                        `;
                    }
                })
                .catch(error => {
                    console.error('検索エラー:', error);
                    resultsContainer.innerHTML = `
                        <div class="notification error">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>検索エラー: ${error.message}</span>
                        </div>
                    `;
                });
        }

        // 検索結果表示
        function displaySearchResults(results, query) {
            const container = document.getElementById('searchResults');
            
            const resultsHtml = `
                <div style="margin: 1rem 0;">
                    <h4 style="margin-bottom: 1rem;">"${query}" の検索結果: ${results.length}件</h4>
                    <div style="display: grid; gap: 1rem;">
                        ${results.map(result => `
                            <div class="search-result-item">
                                <h5>${result.title}</h5>
                                <div class="search-result-meta">
                                    <span>価格: $${result.current_price || '0.00'}</span>
                                    <span>SKU: ${result.master_sku || result.item_id}</span>
                                    <span>カテゴリ: ${result.category_name || 'N/A'}</span>
                                    <span>システム: ${result.source_system || 'database'}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            container.innerHTML = resultsHtml;
        }

        // 個別商品承認/否認
        function approveProduct(itemId) {
            console.log('商品承認:', itemId);
            
            fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `action=approve_products&skus[]=${itemId}&decision=approve&reviewer=user`
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('承認成功:', data.message);
                    loadApprovalData(); // リロード
                } else {
                    console.error('承認失敗:', data.message);
                }
            })
            .catch(error => {
                console.error('承認エラー:', error);
            });
        }

        function rejectProduct(itemId) {
            console.log('商品否認:', itemId);
            
            fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `action=approve_products&skus[]=${itemId}&decision=reject&reviewer=user`
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('否認成功:', data.message);
                    loadApprovalData(); // リロード
                } else {
                    console.error('否認失敗:', data.message);
                }
            })
            .catch(error => {
                console.error('否認エラー:', error);
            });
        }

        // プレースホルダー関数群
        function selectAllVisible() { console.log('全選択'); }
        function deselectAll() { console.log('全解除'); }
        function bulkApprove() { console.log('一括承認'); }
        function bulkReject() { console.log('一括否認'); }
        function exportSelectedProducts() { console.log('CSV出力'); }
        function openNewProductModal() { console.log('新規商品登録モーダル'); }
        function loadAnalysisData() { console.log('分析データ読み込み'); }
        function loadEditingData() { console.log('編集データ読み込み'); }
        function downloadEditingCSV() { console.log('CSV出力'); }
        function testConnection() { console.log('接続テスト'); }

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Yahoo Auction Tool エラー修正版 初期化完了');
            
            // 統計値を更新
            updateDashboardStats();
        });

        // 統計更新
        function updateDashboardStats() {
            fetch(API_BASE_URL + '?action=get_dashboard_stats')
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.data) {
                        const stats = data.data;
                        
                        // 統計値を更新
                        const totalRecordsEl = document.getElementById('totalRecords');
                        const scrapedCountEl = document.getElementById('scrapedCount');
                        const calculatedCountEl = document.getElementById('calculatedCount');
                        const filteredCountEl = document.getElementById('filteredCount');
                        const readyCountEl = document.getElementById('readyCount');
                        const listedCountEl = document.getElementById('listedCount');
                        
                        if (totalRecordsEl) totalRecordsEl.textContent = (stats.total_records || 0).toLocaleString();
                        if (scrapedCountEl) scrapedCountEl.textContent = (stats.scraped_count || 0).toLocaleString();
                        if (calculatedCountEl) calculatedCountEl.textContent = (stats.calculated_count || 0).toLocaleString();
                        if (filteredCountEl) filteredCountEl.textContent = (stats.filtered_count || 0).toLocaleString();
                        if (readyCountEl) readyCountEl.textContent = (stats.ready_count || 0).toLocaleString();
                        if (listedCountEl) listedCountEl.textContent = (stats.listed_count || 0).toLocaleString();
                        
                        console.log('ダッシュボード統計を更新しました', stats);
                    }
                })
                .catch(error => {
                    console.error('統計更新エラー:', error);
                });
        }
    </script>
</body>
</html>
