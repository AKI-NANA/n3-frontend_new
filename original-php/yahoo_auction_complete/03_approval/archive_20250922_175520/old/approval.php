<?php
/**
 * Yahoo Auction Tool - 商品承認システム
 * 機能: AI判定・手動承認・リスク分析・承認待ちキュー管理
 */

require_once '../shared/core/includes.php';

// アクション処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

if (!empty($action)) {
    switch ($action) {
        case 'get_approval_queue':
            try {
                $filters = $_GET['filters'] ?? [];
                $data = getApprovalQueueData($filters);
                sendJsonResponse($data, true, '承認データ取得成功');
            } catch (Exception $e) {
                sendJsonResponse([], false, '承認データ取得エラー: ' . $e->getMessage());
            }
            break;
            
        case 'bulk_approve':
            try {
                $input = json_decode(file_get_contents('php://input'), true);
                $productIds = $input['product_ids'] ?? [];
                
                if (empty($productIds)) {
                    sendJsonResponse(null, false, '商品IDが指定されていません');
                }
                
                $result = bulkApproveProducts($productIds);
                sendJsonResponse($result, $result['success'], $result['message']);
            } catch (Exception $e) {
                sendJsonResponse(null, false, '一括承認エラー: ' . $e->getMessage());
            }
            break;
            
        case 'bulk_reject':
            try {
                $input = json_decode(file_get_contents('php://input'), true);
                $productIds = $input['product_ids'] ?? [];
                $reason = $input['reason'] ?? '手動否認';
                
                if (empty($productIds)) {
                    sendJsonResponse(null, false, '商品IDが指定されていません');
                }
                
                $result = bulkRejectProducts($productIds, $reason);
                sendJsonResponse($result, $result['success'], $result['message']);
            } catch (Exception $e) {
                sendJsonResponse(null, false, '一括否認エラー: ' . $e->getMessage());
            }
            break;
    }
    exit;
}

// ダッシュボードデータ取得
$dashboard_stats = getDashboardStats();
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction - 商品承認システム</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <!-- N3共通CSS読み込み -->
    <link href="../../../assets/css/n3-core.css" rel="stylesheet">
    <link href="../../../assets/css/n3-components.css" rel="stylesheet">
    <!-- 共通CSS読み込み -->
    <link href="../shared/css/common.css" rel="stylesheet">
    <link href="../shared/css/layout.css" rel="stylesheet">
</head>
<body>
    <!-- N3ヘッダー -->
    <header class="n3-header">
        <div class="n3-container">
            <nav class="n3-nav">
                <div class="n3-nav-brand">
                    <a href="../01_dashboard/dashboard.php">
                        <i class="fas fa-home"></i> ダッシュボード
                    </a>
                </div>
                <div class="n3-nav-links">
                    <a href="../02_scraping/scraping.php">データ取得</a>
                    <a href="../03_approval/approval.php" class="active">商品承認</a>
                    <a href="../05_editing/editing.php">データ編集</a>
                    <a href="../08_listing/listing.php">出品管理</a>
                    <a href="../09_inventory/inventory.php">在庫管理</a>
                </div>
            </nav>
        </div>
    </header>

    <main class="n3-main">
        <div class="n3-container">
            <!-- ページヘッダー -->
            <div class="approval-header">
                <h1><i class="fas fa-check-circle"></i> 商品承認システム</h1>
                <p>AI推奨商品の確認・承認・否認を管理</p>
            </div>

            <!-- AI推奨表示バー -->
            <div class="ai-recommendation-bar">
                <div class="ai-info">
                    <h2><i class="fas fa-brain"></i> AI推奨: 要確認商品のみ表示中</h2>
                    <p>低リスク商品 1,847件は自動承認済み。高・中リスク商品 <span id="totalProductCount">25</span>件を人間判定待ちで表示しています。</p>
                </div>
                <button class="btn btn-success" onclick="openNewProductModal()">
                    <i class="fas fa-plus-circle"></i> 新規商品登録
                </button>
            </div>

            <!-- 統計表示 -->
            <div class="approval-stats">
                <div class="stat-item">
                    <div class="stat-value" id="pendingCount">25</div>
                    <div class="stat-label">承認待ち</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">1,847</div>
                    <div class="stat-label">自動承認済み</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="highRiskCount">13</div>
                    <div class="stat-label">高リスク</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="mediumRiskCount">12</div>
                    <div class="stat-label">中リスク</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">2.3分</div>
                    <div class="stat-label">平均処理時間</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="totalRegistered">3,200</div>
                    <div class="stat-label">登録済商品</div>
                </div>
            </div>

            <!-- フィルターコントロール -->
            <div class="approval-filters">
                <div class="filter-group">
                    <span class="filter-label">表示:</span>
                    <button class="filter-btn active" data-filter="all" onclick="applyFilter('all')">
                        すべて <span id="filterAllCount">25</span>
                    </button>
                </div>
                <div class="filter-group">
                    <span class="filter-label">AI判定:</span>
                    <button class="filter-btn" data-filter="ai-approved" onclick="applyFilter('ai-approved')">
                        AI承認済み <span id="filterApprovedCount">13</span>
                    </button>
                    <button class="filter-btn" data-filter="ai-rejected" onclick="applyFilter('ai-rejected')">
                        AI非承認 <span id="filterRejectedCount">8</span>
                    </button>
                    <button class="filter-btn" data-filter="ai-pending" onclick="applyFilter('ai-pending')">
                        AI判定待ち <span id="filterPendingCount">4</span>
                    </button>
                </div>
                <div class="filter-group">
                    <span class="filter-label">リスク:</span>
                    <button class="filter-btn" data-filter="high-risk" onclick="applyFilter('high-risk')">
                        高リスク <span id="filterHighRiskCount">13</span>
                    </button>
                    <button class="filter-btn" data-filter="medium-risk" onclick="applyFilter('medium-risk')">
                        中リスク <span id="filterMediumRiskCount">12</span>
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

            <!-- 商品グリッド -->
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
                    <button class="btn btn-primary" onclick="selectAllVisible()">
                        <i class="fas fa-check-square"></i> 全選択
                    </button>
                    <button class="btn btn-secondary" onclick="deselectAll()">
                        <i class="fas fa-square"></i> 全解除
                    </button>
                    <button class="btn btn-info" onclick="loadApprovalData()">
                        <i class="fas fa-sync"></i> 更新
                    </button>
                </div>
                <div class="action-group">
                    <button class="btn btn-success" onclick="bulkApprove()" disabled>
                        <i class="fas fa-check"></i> 承認
                    </button>
                    <button class="btn btn-danger" onclick="bulkReject()" disabled>
                        <i class="fas fa-times"></i> 否認
                    </button>
                    <button class="btn btn-warning" onclick="exportSelectedProducts()" disabled>
                        <i class="fas fa-download"></i> CSV出力
                    </button>
                </div>
            </div>
        </div>
    </main>

    <!-- 共通JavaScript読み込み -->
    <script src="../shared/js/common.js"></script>
    <script src="../shared/js/api.js"></script>
    <!-- 承認システム専用JavaScript -->
    <script src="approval.js"></script>
</body>
</html>