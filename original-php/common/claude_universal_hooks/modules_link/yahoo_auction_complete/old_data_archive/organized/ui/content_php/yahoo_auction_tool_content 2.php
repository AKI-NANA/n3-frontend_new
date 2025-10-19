<?php
/**
 * Yahoo Auction Tool - 独立ページ版
 * N3システムとは完全に分離した独立アプリケーション
 */

// 独立ページモードではヘッダーを送信しない
// header() 関数を使用しないで直接HTMLを出力

// デバッグ用：更新確認
if (isset($_GET['cache_check'])) {
    echo json_encode(['status' => 'updated', 'time' => date('Y-m-d H:i:s')]);
    exit;
}

// APIのエンドポイントURLを設定（拡張APIサーバー）
$api_url = "http://localhost:5002";

// 全てのAPIレスポンスを保持する配列
$api_responses = [
    'system_status' => null,
    'scrape' => null,
    'process_edited' => null,
    'ebay_listing' => null,
    'get_filters' => null,
    'get_inventory' => null
];

// PHPセッションを開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// データベースクエリハンドラーを読み込み
require_once __DIR__ . '/database_query_handler.php';

// ダッシュボードデータの取得（データベース直接アクセス版）
function fetchDashboardData($api_url = null) {
    // 実際のデータベースから統計を取得
    $stats = getDashboardStats();
    
    return [
        'success' => true,
        'stats' => $stats,
        'system_status' => 'operational',
        'database_connected' => true,
        'last_updated' => date('Y-m-d H:i:s')
    ];
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// ユーザーアクションの処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';
$log_message = '';

switch ($action) {
    case 'scrape':
        $url = $_POST['url'] ?? '';
        if ($url) {
            $post_data = ['urls' => [$url]];
            $ch = curl_init($api_url . '/api/scrape_yahoo');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_data));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            $api_responses['scrape'] = json_decode(curl_exec($ch), true);
            curl_close($ch);
        }
        $log_message = "スクレイピングアクションを実行しました。";
        break;
    
    case 'process_edited':
        $log_message = "編集済みCSV処理アクションを実行しました。";
        break;

    case 'list_on_ebay':
        $sku = $_POST['sku'] ?? '';
        $post_data = ['sku' => $sku];
        $ch = curl_init($api_url . '/api/list_on_ebay');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        $api_responses['ebay_listing'] = json_decode(curl_exec($ch), true);
        curl_close($ch);
        $log_message = "eBay出品アクションを実行しました。";
        break;

    // 🆕 商品承認システム専用アクション
    case 'get_approval_queue':
        // データベースから実際の承認待ち商品データ取得
        try {
            $filters = [
                'ai_status' => $_GET['ai_status'] ?? '',
                'risk_level' => $_GET['risk_level'] ?? '',
                'product_type' => $_GET['product_type'] ?? ''
            ];
            
            $products = getApprovalQueueData($filters);
            $response = generateApiResponse('get_approval_queue', $products, true, 'Approval queue data retrieved successfully');
            
            header('Content-Type: application/json');
            echo json_encode($response);
            exit;
        } catch (Exception $e) {
            $response = generateApiResponse('get_approval_queue', null, false, 'Error retrieving approval queue: ' . $e->getMessage());
            header('Content-Type: application/json');
            echo json_encode($response);
            exit;
        }
        break;
        
    case 'search_products':
        // 商品検索機能
        try {
            $searchQuery = $_GET['query'] ?? $_POST['query'] ?? '';
            $filters = [];
            
            $products = searchProducts($searchQuery, $filters);
            $response = generateApiResponse('search_products', $products, true, 'Search completed successfully');
            
            header('Content-Type: application/json');
            echo json_encode($response);
            exit;
        } catch (Exception $e) {
            $response = generateApiResponse('search_products', null, false, 'Search error: ' . $e->getMessage());
            header('Content-Type: application/json');
            echo json_encode($response);
            exit;
        }
        break;
        
    case 'add_new_product':
        // 新規商品登録
        try {
            $productData = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            
            if (addNewProduct($productData)) {
                $response = generateApiResponse('add_new_product', ['product_id' => $productData['sku'] ?? uniqid()], true, 'Product added successfully');
            } else {
                $response = generateApiResponse('add_new_product', null, false, 'Failed to add product');
            }
            
            header('Content-Type: application/json');
            echo json_encode($response);
            exit;
        } catch (Exception $e) {
            $response = generateApiResponse('add_new_product', null, false, 'Add product error: ' . $e->getMessage());
            header('Content-Type: application/json');
            echo json_encode($response);
            exit;
        }
        break;

    default:
        // デフォルトケース
        break;
}

// 最新のダッシュボードデータを取得
$dashboard_data = fetchDashboardData($api_url);

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- キャッシュ無効化メタタグ -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Yahoo→eBay統合ワークフロー完全版（商品承認システム統合）</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="yahoo_auction_tool_styles.css">

</head>
<body>
    <div class="container">
        <div class="main-dashboard">
            <div class="dashboard-header">
                <h1><i class="fas fa-sync-alt"></i> Yahoo→eBay統合ワークフロー完全版</h1>
                <p>N3デザイン適用・データベース統合・送料計算エディター・禁止品フィルター管理・eBay出品支援・在庫分析・商品承認システム</p>
            </div>

            <div class="caids-constraints-bar">
                <div class="constraint-item">
                    <div class="constraint-value" id="totalRecords">17,000</div>
                    <div class="constraint-label">総データ数</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="scrapedCount">12,500</div>
                    <div class="constraint-label">取得済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="calculatedCount">8,200</div>
                    <div class="constraint-label">計算済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="filteredCount">6,800</div>
                    <div class="constraint-label">フィルター済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="readyCount">4,500</div>
                    <div class="constraint-label">出品準備完了</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="listedCount">3,200</div>
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
                <button class="tab-btn" data-tab="inventory-mgmt" onclick="switchTab('inventory-mgmt')">
                    <i class="fas fa-warehouse"></i>
                    在庫管理
                </button>
            </div>

            <!-- ダッシュボードタブ -->
            <div id="dashboard" class="tab-content active fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-search"></i>
                        <h3 class="section-title">商品検索</h3>
                        <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                            <input type="text" id="searchQuery" placeholder="検索キーワード" style="padding: 0.4rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;">
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
                    <div style="background: linear-gradient(135deg, #8b5cf6, #06b6d4); color: white; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
                                <i class="fas fa-brain"></i>
                                AI推奨: データベースから商品読み込み中
                            </h2>
                            <p style="margin: 0; font-size: 0.8rem; opacity: 0.9;">
                                データベースから承認待ち商品を取得しています。<span id="totalProductCount">0</span>件の商品を読み込み中です。
                            </p>
                        </div>
                        <button class="btn" style="background: white; color: var(--primary-color); font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 0.5rem; border: none; cursor: pointer;" onclick="openNewProductModal()">
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

                    <!-- フィルターコントロール -->
                    <div class="approval-filters">
                        <div class="filter-group">
                            <span class="filter-label">表示:</span>
                            <button class="filter-btn active" data-filter="all" onclick="applyFilter('all')">
                                すべて <span id="filterAllCount">0</span>
                            </button>
                        </div>
                        <div class="filter-group">
                            <span class="filter-label">AI判定:</span>
                            <button class="filter-btn" data-filter="ai-approved" onclick="applyFilter('ai-approved')">
                                AI承認済み <span id="filterApprovedCount">0</span>
                            </button>
                            <button class="filter-btn" data-filter="ai-rejected" onclick="applyFilter('ai-rejected')">
                                AI非承認 <span id="filterRejectedCount">0</span>
                            </button>
                            <button class="filter-btn" data-filter="ai-pending" onclick="applyFilter('ai-pending')">
                                AI判定待ち <span id="filterPendingCount">0</span>
                            </button>
                        </div>
                        <div class="filter-group">
                            <span class="filter-label">リスク:</span>
                            <button class="filter-btn" data-filter="high-risk" onclick="applyFilter('high-risk')">
                                高リスク <span id="filterHighRiskCount">0</span>
                            </button>
                            <button class="filter-btn" data-filter="medium-risk" onclick="applyFilter('medium-risk')">
                                中リスク <span id="filterMediumRiskCount">0</span>
                            </button>
                            <button class="filter-btn" data-filter="low-risk" onclick="applyFilter('low-risk')">
                                低リスク <span id="filterLowRiskCount">0</span>
                            </button>
                        </div>
                    </div>

                    <!-- 一括操作バー -->
                    <div class="bulk-actions" id="bulkActions" style="display: none;">
                        <div class="bulk-info">
                            <i class="fas fa-check-square"></i>
                            <span id="selectedCount">0</span>件 を選択中
                        </div>
                        <div class="bulk-buttons">
                            <button class="bulk-btn bulk-btn-approve" onclick="bulkApprove()">
                                <i class="fas fa-check"></i> 一括承認
                            </button>
                            <button class="bulk-btn bulk-btn-reject" onclick="bulkReject()">
                                <i class="fas fa-ban"></i> 一括否認
                            </button>
                            <button class="bulk-btn" onclick="clearSelection()">
                                <i class="fas fa-times"></i> 選択クリア
                            </button>
                        </div>
                    </div>

                    <!-- 商品グリッド（データベースから動的読み込み） -->
                    <div class="approval-grid" id="approval-product-grid">
                        <!-- 初期ローディング表示 -->
                        <div class="loading-container" id="loadingContainer">
                            <div class="loading-spinner"></div>
                            <p>データベースから承認待ち商品を読み込み中...</p>
                        </div>
                        
                        <!-- データがない場合の表示 -->
                        <div class="no-data-container" id="noDataContainer" style="display: none;">
                            <div class="no-data-icon">
                                <i class="fas fa-inbox"></i>
                            </div>
                            <h3>承認待ち商品がありません</h3>
                            <p>現在、承認が必要な商品はありません。新しいデータを取得するか、商品を手動で追加してください。</p>
                            <div class="no-data-actions">
                                <button class="btn btn-primary" onclick="loadApprovalData()">
                                    <i class="fas fa-sync"></i> データを再読み込み
                                </button>
                                <button class="btn btn-success" onclick="openNewProductModal()">
                                    <i class="fas fa-plus"></i> 新規商品追加
                                </button>
                            </div>
                        </div>
                        
                        <!-- エラー表示 -->
                        <div class="error-container" id="errorContainer" style="display: none;">
                            <div class="error-icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <h3>データ読み込みエラー</h3>
                            <p id="errorMessage">データベースからの商品読み込みに失敗しました。</p>
                            <div class="error-actions">
                                <button class="btn btn-primary" onclick="loadApprovalData()">
                                    <i class="fas fa-redo"></i> 再試行
                                </button>
                                <button class="btn btn-secondary" onclick="checkDatabaseConnection()">
                                    <i class="fas fa-database"></i> 接続確認
                                </button>
                            </div>
                        </div>
                        
                        <!-- 実際の商品データ表示エリア -->
                        <div class="products-container" id="productsContainer" style="display: none;">
                            <!-- JavaScriptでデータベースから取得した商品を動的生成 -->
                        </div>
                    </div>

                    <!-- メインアクション -->
                    <div class="main-actions">
                        <div class="action-group">
                            <button class="action-btn action-btn-primary" onclick="selectAllVisible()">
                                <i class="fas fa-check-square"></i> 全選択
                            </button>
                            <button class="action-btn action-btn-secondary" onclick="deselectAll()">
                                <i class="fas fa-square"></i> 全解除
                            </button>
                            <button class="action-btn action-btn-info" onclick="loadApprovalData()">
                                <i class="fas fa-sync"></i> 更新
                            </button>
                        </div>
                        <div class="action-group">
                            <button class="action-btn action-btn-success" onclick="bulkApprove()" disabled>
                                <i class="fas fa-check"></i> 承認
                            </button>
                            <button class="action-btn action-btn-danger" onclick="bulkReject()" disabled>
                                <i class="fas fa-times"></i> 否認
                            </button>
                            <button class="action-btn action-btn-warning" onclick="exportSelectedProducts()" disabled>
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
                        <i class="fas fa-chart-bar"></i>
                        <h3 class="section-title">承認分析ダッシュボード</h3>
                        <div style="margin-left: auto;">
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
                        <i class="fas fa-download"></i>
                        <h3 class="section-title">Yahoo オークションデータ取得</h3>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
                        <div>
                            <form action="yahoo_auction_tool_content.php" method="POST">
                                <input type="hidden" name="action" value="scrape">
                                <div style="margin-bottom: var(--space-sm);">
                                    <label style="display: block; margin-bottom: 0.3rem; font-size: 0.8rem; font-weight: 600;">Yahoo オークション URL</label>
                                    <textarea name="url" id="yahooUrls" placeholder="https://auctions.yahoo.co.jp/jp/auction/xxxxx" style="width: 100%; height: 80px; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;"></textarea>
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
                            <form action="yahoo_auction_tool_content.php" method="POST" enctype="multipart/form-data">
                                <input type="hidden" name="action" value="process_edited">
                                <div style="margin-bottom: var(--space-sm);">
                                    <label style="display: block; margin-bottom: 0.3rem; font-size: 0.8rem; font-weight: 600;">CSVファイル選択</label>
                                    <input type="file" name="csvFile" id="csvFile" accept=".csv" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;">
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
                        <i class="fas fa-edit"></i>
                        <h3 class="section-title">データ編集 & 検証</h3>
                        <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                            <button class="btn btn-info" onclick="loadEditingData()">
                                <i class="fas fa-sync"></i> データ読込
                            </button>
                            <button class="btn btn-secondary" onclick="downloadEditingCSV()">
                                <i class="fas fa-download"></i> CSV出力
                            </button>
                            <button class="btn btn-success" onclick="uploadEditedCSV()">
                                <i class="fas fa-upload"></i> 編集済CSV
                            </button>
                            <button class="btn btn-warning" onclick="saveAllEdits()">
                                <i class="fas fa-save"></i> 全保存
                            </button>
                        </div>
                    </div>
                    
                    <div class="data-table-container">
                        <table class="data-table" id="editingTable">
                            <thead>
                                <tr>
                                    <th>操作</th>
                                    <th>モール</th>
                                    <th>画像</th>
                                    <th>商品ID</th>
                                    <th>取得タイトル</th>
                                    <th>取得カテゴリ</th>
                                    <th>価格(円)</th>
                                    <th>仕入価格</th>
                                    <th>国内送料</th>
                                    <th>計算価格($)</th>
                                    <th>ステータス</th>
                                    <th>販売形式</th>
                                    <th>URL</th>
                                </tr>
                            </thead>
                            <tbody id="editingTableBody">
                                <tr>
                                    <td colspan="13" style="text-align: center; padding: var(--space-lg); color: var(--text-muted);">
                                        「データ読込」ボタンを押してデータを表示してください。
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style="display: flex; justify-content: center; align-items: center; margin-top: var(--space-md); gap: var(--space-md);">
                        <button class="btn btn-secondary" onclick="changePage(-1)">
                            <i class="fas fa-chevron-left"></i> 前へ
                        </button>
                        <span id="pageInfo" style="color: var(--text-secondary); font-size: 0.8rem;">ページ 1/1</span>
                        <button class="btn btn-secondary" onclick="changePage(1)">
                            次へ <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 送料計算タブ -->
            <div id="calculation" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-calculator"></i>
                        <h3 class="section-title">送料計算 & 最適候補提示</h3>
                        <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                            <button class="btn btn-success" onclick="calculateShippingCandidates()">
                                <i class="fas fa-search"></i> 候補検索
                            </button>
                            <button class="btn btn-info" onclick="clearCalculationForm()">
                                <i class="fas fa-undo"></i> クリア
                            </button>
                        </div>
                    </div>
                    
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>重さ・大きさ・国を入力して最適な配送方法5候補を表示します</span>
                    </div>

                    <!-- 計算フォーム -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-lg);">
                        <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-lg);">
                            <h5 style="margin-bottom: var(--space-sm); color: var(--text-primary); display: flex; align-items: center; gap: var(--space-xs);">
                                <i class="fas fa-weight-hanging"></i>
                                重量
                            </h5>
                            <div>
                                <label style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem; display: block;">重さ (kg)</label>
                                <input type="number" id="shippingWeight" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;" placeholder="1.5" step="0.1" min="0.1" max="30">
                            </div>
                        </div>

                        <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-lg);">
                            <h5 style="margin-bottom: var(--space-sm); color: var(--text-primary); display: flex; align-items: center; gap: var(--space-xs);">
                                <i class="fas fa-cube"></i>
                                大きさ
                            </h5>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-xs);">
                                <div>
                                    <label style="font-size: 0.7rem; color: var(--text-secondary);">幅 (cm)</label>
                                    <input type="number" id="shippingWidth" style="width: 100%; padding: 0.3rem; border: 1px solid var(--border-color); border-radius: 2px; font-size: 0.7rem;" placeholder="20" min="1" max="200">
                                </div>
                                <div>
                                    <label style="font-size: 0.7rem; color: var(--text-secondary);">高さ (cm)</label>
                                    <input type="number" id="shippingHeight" style="width: 100%; padding: 0.3rem; border: 1px solid var(--border-color); border-radius: 2px; font-size: 0.7rem;" placeholder="15" min="1" max="200">
                                </div>
                                <div>
                                    <label style="font-size: 0.7rem; color: var(--text-secondary);">奥行 (cm)</label>
                                    <input type="number" id="shippingDepth" style="width: 100%; padding: 0.3rem; border: 1px solid var(--border-color); border-radius: 2px; font-size: 0.7rem;" placeholder="10" min="1" max="200">
                                </div>
                            </div>
                        </div>

                        <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-lg);">
                            <h5 style="margin-bottom: var(--space-sm); color: var(--text-primary); display: flex; align-items: center; gap: var(--space-xs);">
                                <i class="fas fa-globe-americas"></i>
                                出荷国
                            </h5>
                            <div>
                                <label style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem; display: block;">配送先国</label>
                                <select id="shippingCountry" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;">
                                    <option value="">配送先を選択</option>
                                    <option value="US">アメリカ合衆国</option>
                                    <option value="CA">カナダ</option>
                                    <option value="AU">オーストラリア</option>
                                    <option value="GB">英国</option>
                                    <option value="DE">ドイツ</option>
                                    <option value="FR">フランス</option>
                                    <option value="IT">イタリア</option>
                                    <option value="ES">スペイン</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- 候補表示エリア -->
                    <div id="candidatesContainer" style="display: none;">
                        <h4 style="margin-bottom: var(--space-md); color: var(--text-primary); display: flex; align-items: center; gap: var(--space-xs);">
                            <i class="fas fa-medal"></i>
                            最適配送候補（安い順）
                        </h4>
                        <div id="candidatesList" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-md);">
                            <!-- カードはJavaScriptで動的生成 -->
                        </div>
                    </div>




                </div>
            </div>

            <!-- フィルタータブ（禁止キーワード管理システム） -->
            <div id="filters" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-filter"></i>
                        <h3 class="section-title">禁止キーワード管理システム</h3>
                        <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                            <button class="btn btn-success" onclick="uploadProhibitedCSV()">
                                <i class="fas fa-upload"></i> CSV アップロード
                            </button>
                            <button class="btn btn-info" onclick="addNewKeyword()">
                                <i class="fas fa-plus"></i> キーワード追加
                            </button>
                            <button class="btn btn-warning" onclick="exportKeywordCSV()">
                                <i class="fas fa-download"></i> CSV エクスポート
                            </button>
                        </div>
                    </div>

                    <!-- 統計ダッシュボード -->
                    <div class="prohibited-stats">
                        <div class="stat-card">
                            <div class="stat-value" id="totalKeywords">1,247</div>
                            <div class="stat-label">登録キーワード</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="highRiskKeywords">89</div>
                            <div class="stat-label">高リスク</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="detectedToday">23</div>
                            <div class="stat-label">今日の検出</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="lastUpdate">2分前</div>
                            <div class="stat-label">最終更新</div>
                        </div>
                    </div>

                    <!-- CSVドラッグ&ドロップエリア -->
                    <div class="csv-upload-area" id="csvUploadArea">
                        <div class="drag-drop-area" onclick="document.getElementById('csvFileInput').click();" ondrop="handleCSVDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                            <input type="file" id="csvFileInput" accept=".csv" style="display: none;" onchange="handleCSVUpload(event)">
                            <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--primary-color); margin-bottom: 0.5rem;"></i>
                            <div class="drag-drop-text">
                                <strong>CSVファイルをドラッグ&ドロップ</strong><br>
                                またはクリックしてファイルを選択
                            </div>
                            <div class="upload-requirements">
                                対応形式: CSV | 最大サイズ: 5MB | 最大行数: 10,000行
                            </div>
                        </div>
                    </div>

                    <!-- キーワードテーブル -->
                    <div class="keyword-table-container">
                        <div class="table-controls">
                            <div class="selection-controls">
                                <input type="checkbox" id="selectAllKeywords" onchange="toggleAllKeywords()">
                                <label for="selectAllKeywords">全選択</label>
                                <span id="selectedKeywordCount" class="selection-count">0件選択中</span>
                            </div>
                        </div>

                        <div class="data-table-container">
                            <table class="data-table keyword-table">
                                <thead>
                                    <tr>
                                        <th style="width: 40px;"><input type="checkbox" id="selectAllTableKeywords"></th>
                                        <th style="width: 60px;">ID</th>
                                        <th style="width: 200px;">キーワード</th>
                                        <th style="width: 120px;">カテゴリ</th>
                                        <th style="width: 80px;">重要度</th>
                                        <th style="width: 80px;">検出回数</th>
                                        <th style="width: 100px;">登録日</th>
                                        <th style="width: 100px;">最終検出</th>
                                        <th style="width: 80px;">ステータス</th>
                                        <th style="width: 120px;">操作</th>
                                    </tr>
                                </thead>
                                <tbody id="keywordTableBody">
                                    <tr>
                                        <td><input type="checkbox" class="keyword-checkbox" data-id="1"></td>
                                        <td>001</td>
                                        <td class="keyword-text">偽物</td>
                                        <td><span class="category-badge category-brand">ブランド</span></td>
                                        <td><span class="priority-badge priority-high">高</span></td>
                                        <td>127</td>
                                        <td>2025-09-01</td>
                                        <td>2025-09-10</td>
                                        <td><span class="status-badge status-active">有効</span></td>
                                        <td>
                                            <button class="btn-sm btn-warning" onclick="editKeyword(1)">編集</button>
                                            <button class="btn-sm btn-danger" onclick="deleteKeyword(1)">削除</button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><input type="checkbox" class="keyword-checkbox" data-id="2"></td>
                                        <td>002</td>
                                        <td class="keyword-text">コピー品</td>
                                        <td><span class="category-badge category-brand">ブランド</span></td>
                                        <td><span class="priority-badge priority-medium">中</span></td>
                                        <td>89</td>
                                        <td>2025-09-02</td>
                                        <td>2025-09-09</td>
                                        <td><span class="status-badge status-active">有効</span></td>
                                        <td>
                                            <button class="btn-sm btn-warning" onclick="editKeyword(2)">編集</button>
                                            <button class="btn-sm btn-danger" onclick="deleteKeyword(2)">削除</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- リアルタイムタイトルチェック -->
                    <div class="title-check-section">
                        <div class="section-header">
                            <i class="fas fa-shield-alt"></i>
                            <h4>リアルタイムタイトルチェック</h4>
                        </div>
                        <div class="title-check-container">
                            <textarea 
                                id="titleCheckInput" 
                                placeholder="商品タイトルを入力してリアルタイムチェック..."
                                class="title-input"
                                oninput="checkTitleRealtime()"
                            ></textarea>
                            <div class="check-result" id="titleCheckResult">
                                <div class="result-placeholder">
                                    <i class="fas fa-info-circle"></i>
                                    商品タイトルを入力すると、禁止キーワードをリアルタイムでチェックします
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 出品管理タブ -->
            <div id="listing" class="tab-content fade-in">
                <!-- 出品統計 -->
                <div class="listing-stats">
                    <div class="listing-stat-card pending">
                        <div class="stat-value" id="pendingListings">45</div>
                        <div class="stat-label">出品待ち</div>
                    </div>
                    <div class="listing-stat-card processing">
                        <div class="stat-value" id="processingListings">8</div>
                        <div class="stat-label">処理中</div>
                    </div>
                    <div class="listing-stat-card success">
                        <div class="stat-value" id="successListings">127</div>
                        <div class="stat-label">出品成功</div>
                    </div>
                    <div class="listing-stat-card error">
                        <div class="stat-value" id="errorListings">3</div>
                        <div class="stat-label">エラー</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-store"></i>
                        <h3 class="section-title">出品・管理</h3>
                        <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                            <button class="btn btn-info" onclick="loadListingQueue()">
                                <i class="fas fa-sync"></i> キュー更新
                            </button>
                            <button class="btn btn-success" onclick="startListingProcess()">
                                <i class="fas fa-play"></i> 出品開始
                            </button>
                        </div>
                    </div>
                    
                    <!-- CSVアップロードエリア -->
                    <div class="csv-upload-area">
                        <div class="drag-drop-area" onclick="document.getElementById('listingCsvInput').click();" ondrop="handleListingCSVDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                            <input type="file" id="listingCsvInput" style="display: none;" accept=".csv" onchange="handleListingCSVUpload(event)">
                            <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 0.5rem;"></i>
                            <div class="drag-drop-text">
                                <strong>編集済みCSVをドラッグ&ドロップ</strong><br>
                                または、クリックしてファイルを選択
                            </div>
                            <div class="upload-requirements">
                                対応形式: CSV | 最大サイズ: 10MB | 最大行数: 1,000行
                            </div>
                        </div>
                    </div>
                    
                    <!-- 出品進捗 -->
                    <div class="listing-progress">
                        <div class="section-header">
                            <i class="fas fa-chart-line"></i>
                            <h4>出品進捗</h4>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 65%;" id="listingProgressBar">
                                65% 完了
                            </div>
                        </div>
                        <p style="font-size: var(--text-sm); color: var(--text-secondary); text-align: center; margin-top: var(--space-sm);">
                            127件成功 / 180件全体 - 余り53件
                        </p>
                    </div>

                    <!-- 出品キュー -->
                    <div class="listing-queue">
                        <div class="section-header">
                            <i class="fas fa-list"></i>
                            <h4>出品キュー</h4>
                        </div>
                        <div id="listingQueueContainer">
                            <!-- サンプルキューアイテム -->
                            <div class="queue-item">
                                <div class="queue-status processing"></div>
                                <div class="queue-info">
                                    <div class="queue-title">Sony WH-1000XM4 ワイヤレスヘッドホン</div>
                                    <div class="queue-details">SKU: SKU-SNY-001 | 予定価格: $299.99 | カテゴリ: エレクトロニクス</div>
                                </div>
                                <div class="queue-actions">
                                    <button class="btn btn-sm btn-warning">一時停止</button>
                                    <button class="btn btn-sm btn-danger">キャンセル</button>
                                </div>
                            </div>
                            
                            <div class="queue-item">
                                <div class="queue-status pending"></div>
                                <div class="queue-info">
                                    <div class="queue-title">Apple AirPods Pro 第2世代</div>
                                    <div class="queue-details">SKU: SKU-APL-002 | 予定価格: $249.99 | カテゴリ: エレクトロニクス</div>
                                </div>
                                <div class="queue-actions">
                                    <button class="btn btn-sm btn-primary">開始</button>
                                    <button class="btn btn-sm btn-secondary">編集</button>
                                </div>
                            </div>
                            
                            <div class="queue-item">
                                <div class="queue-status completed"></div>
                                <div class="queue-info">
                                    <div class="queue-title">Nintendo Switch ゲーム機</div>
                                    <div class="queue-details">SKU: SKU-NIN-003 | 価格: $299.99 | eBay商品ID: 12345678901</div>
                                </div>
                                <div class="queue-actions">
                                    <button class="btn btn-sm btn-info">詳細</button>
                                    <button class="btn btn-sm btn-success">eBayで表示</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>編集済みCSVをアップロードしてeBay出品データを準備します。出品プロセスは自動で順次実行されます。</span>
                    </div>
                </div>
            </div>

            <!-- 在庫管理タブ -->
            <div id="inventory-mgmt" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-chart-line"></i>
                        <h3 class="section-title">在庫・売上分析ダッシュボード</h3>
                        <div style="margin-left: auto;">
                            <button class="btn btn-info" onclick="loadInventoryData()">
                                <i class="fas fa-sync"></i> データ更新
                            </button>
                        </div>
                    </div>
                    
                    <div id="inventory-content">
                        <!-- 分析カード -->
                        <div class="analytics-grid">
                            <div class="analytics-card">
                                <div class="card-header">
                                    <i class="fas fa-dollar-sign"></i>
                                    <h4>今月の売上</h4>
                                </div>
                                <div class="card-value">$12,450</div>
                                <div class="card-change positive">+15.3%</div>
                            </div>
                            
                            <div class="analytics-card">
                                <div class="card-header">
                                    <i class="fas fa-box"></i>
                                    <h4>在庫商品数</h4>
                                </div>
                                <div class="card-value">1,247</div>
                                <div class="card-change negative">-3.2%</div>
                            </div>
                            
                            <div class="analytics-card">
                                <div class="card-header">
                                    <i class="fas fa-percentage"></i>
                                    <h4>平均利益率</h4>
                                </div>
                                <div class="card-value">28.5%</div>
                                <div class="card-change positive">+2.1%</div>
                            </div>
                            
                            <div class="analytics-card">
                                <div class="card-header">
                                    <i class="fas fa-shopping-cart"></i>
                                    <h4>今月の販売数</h4>
                                </div>
                                <div class="card-value">156</div>
                                <div class="card-change positive">+8.7%</div>
                            </div>
                        </div>
                        
                        <!-- 価格監視 -->
                        <div class="price-monitoring">
                            <h4>💰 価格監視アラート</h4>
                            <div class="monitoring-table">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>商品ID</th>
                                            <th>商品名</th>
                                            <th>現在価格</th>
                                            <th>価格変動</th>
                                            <th>推奨アクション</th>
                                        </tr>
                                    </thead>
                                    <tbody id="priceMonitoringBody">
                                        <tr>
                                            <td colspan="5" style="text-align: center; padding: var(--space-lg); color: var(--text-muted);">
                                                価格監視データを読み込み中...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <!-- 在庫アラート -->
                        <div class="inventory-alerts">
                            <h4>⚠️ 在庫アラート</h4>
                            <div class="alert-list" id="inventoryAlerts">
                                <div class="notification warning">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <span>在庫監視システムを設定してください</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- システムログ -->
        <div class="log-area">
            <h4 style="color: var(--info-color); margin-bottom: var(--space-xs); font-size: 0.8rem;">
                <i class="fas fa-history"></i> システムログ
            </h4>
            <div id="logSection">
                <div class="log-entry">
                    <span class="log-timestamp">[09:15:32]</span>
                    <span class="log-level info">INFO</span>
                    <span>システムが正常に起動しました（商品承認システム統合版）。</span>
                </div>
                <div class="log-entry">
                    <span class="log-timestamp">[09:15:33]</span>
                    <span class="log-level info">INFO</span>
                    <span>データベース接続確認完了。</span>
                </div>
            </div>
        </div>
    </div>
    <!-- 新規商品登録モーダル -->
    <div id="newProductModal" class="modal" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="fas fa-plus-circle"></i>
                    新規商品登録
                </h2>
                <button class="modal-close" onclick="closeNewProductModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="modal-body">
                <!-- タブナビゲーション -->
                <div class="tab-nav">
                    <button class="tab-button active" data-tab="basic" onclick="switchModalTab('basic')">
                        <i class="fas fa-info-circle"></i>
                        基本情報
                    </button>
                    <button class="tab-button" data-tab="images" onclick="switchModalTab('images')">
                        <i class="fas fa-images"></i>
                        商品画像
                    </button>
                    <button class="tab-button" data-tab="pricing" onclick="switchModalTab('pricing')">
                        <i class="fas fa-dollar-sign"></i>
                        価格設定
                    </button>
                    <button class="tab-button" data-tab="inventory" onclick="switchModalTab('inventory')">
                        <i class="fas fa-boxes"></i>
                        在庫・配送
                    </button>
                    <button class="tab-button" data-tab="details" onclick="switchModalTab('details')">
                        <i class="fas fa-align-left"></i>
                        詳細情報
                    </button>
                    <button class="tab-button" data-tab="preview" onclick="switchModalTab('preview')">
                        <i class="fas fa-eye"></i>
                        プレビュー
                    </button>
                </div>

                <!-- 基本情報タブ -->
                <div id="modal-basic" class="modal-tab-content active">
                    <!-- 商品タイプ選択 -->
                    <div class="product-type-section">
                        <div class="section-header">
                            <i class="fas fa-tag"></i>
                            <h3 class="section-title">商品タイプ</h3>
                        </div>
                        
                        <div class="product-type-grid">
                            <label class="product-type-option product-type-option--active" data-type="stock">
                                <input type="radio" name="product-type" value="stock" checked style="display: none;">
                                <div class="product-type-card">
                                    <i class="fas fa-warehouse"></i>
                                    <span>有在庫</span>
                                </div>
                            </label>
                            
                            <label class="product-type-option" data-type="dropship">
                                <input type="radio" name="product-type" value="dropship" style="display: none;">
                                <div class="product-type-card">
                                    <i class="fas fa-truck"></i>
                                    <span>無在庫</span>
                                </div>
                            </label>
                            
                            <label class="product-type-option" data-type="hybrid">
                                <input type="radio" name="product-type" value="hybrid" style="display: none;">
                                <div class="product-type-card">
                                    <i class="fas fa-sync-alt"></i>
                                    <span>ハイブリッド</span>
                                </div>
                            </label>
                            
                            <label class="product-type-option" data-type="set">
                                <input type="radio" name="product-type" value="set" style="display: none;">
                                <div class="product-type-card">
                                    <i class="fas fa-layer-group"></i>
                                    <span>セット品</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- 基本情報フォーム -->
                    <div class="form-section">
                        <div class="section-header">
                            <i class="fas fa-edit"></i>
                            <h3 class="section-title">商品基本情報</h3>
                        </div>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-tag"></i>
                                    商品名 <span class="required-mark">*</span>
                                </label>
                                <input type="text" class="form-input" id="productName" placeholder="商品名を入力してください" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-barcode"></i>
                                    SKU <span class="required-mark">*</span>
                                </label>
                                <input type="text" class="form-input" id="productSku" placeholder="SKU-XXX-001" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-list"></i>
                                    カテゴリ <span class="required-mark">*</span>
                                </label>
                                <select class="form-select" id="productCategory" required>
                                    <option value="">カテゴリを選択</option>
                                    <option value="electronics">エレクトロニクス</option>
                                    <option value="fashion">ファッション</option>
                                    <option value="home">ホーム・ガーデン</option>
                                    <option value="sports">スポーツ・アウトドア</option>
                                    <option value="books">本・メディア</option>
                                    <option value="other">その他</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-star"></i>
                                    商品状態
                                </label>
                                <select class="form-select" id="productCondition">
                                    <option value="new">新品</option>
                                    <option value="like-new">未使用に近い</option>
                                    <option value="very-good">非常に良い</option>
                                    <option value="good">良い</option>
                                    <option value="fair">可</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-industry"></i>
                                    ブランド
                                </label>
                                <input type="text" class="form-input" id="productBrand" placeholder="ブランド名">
                            </div>

                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-cube"></i>
                                    モデル番号
                                </label>
                                <input type="text" class="form-input" id="productModel" placeholder="モデル番号">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- その他のタブは省略（必要に応じて追加） -->
                <div id="modal-images" class="modal-tab-content">
                    <div class="section-header">
                        <i class="fas fa-camera"></i>
                        <h3 class="section-title">商品画像</h3>
                    </div>
                    <p>画像アップロード機能は後で実装されます。</p>
                </div>

                <div id="modal-pricing" class="modal-tab-content">
                    <div class="section-header">
                        <i class="fas fa-dollar-sign"></i>
                        <h3 class="section-title">価格設定</h3>
                    </div>
                    <p>価格設定機能は後で実装されます。</p>
                </div>

                <div id="modal-inventory" class="modal-tab-content">
                    <div class="section-header">
                        <i class="fas fa-boxes"></i>
                        <h3 class="section-title">在庫・配送</h3>
                    </div>
                    <p>在庫管理機能は後で実装されます。</p>
                </div>

                <div id="modal-details" class="modal-tab-content">
                    <div class="section-header">
                        <i class="fas fa-align-left"></i>
                        <h3 class="section-title">詳細情報</h3>
                    </div>
                    <p>詳細情報入力機能は後で実装されます。</p>
                </div>

                <div id="modal-preview" class="modal-tab-content">
                    <div class="section-header">
                        <i class="fas fa-eye"></i>
                        <h3 class="section-title">商品プレビュー</h3>
                    </div>
                    <p>プレビュー機能は後で実装されます。</p>
                </div>
            </div>

            <div class="modal-footer">
                <div class="modal-footer-left">
                    <button class="btn btn--secondary" onclick="saveDraft()">
                        <i class="fas fa-save"></i>
                        下書き保存
                    </button>
                </div>
                <div class="modal-footer-right">
                    <button class="btn btn--secondary" onclick="closeNewProductModal()">
                        キャンセル
                    </button>
                    <button class="btn btn--success" id="registerButton" onclick="registerProduct()">
                        <i class="fas fa-plus"></i>
                        商品を登録
                    </button>
                </div>
            </div>
        </div>
    </div>
    <script src="yahoo_auction_tool.js"></script>
</body>



</html>