<?php
/**
 * Yahoo Auction Tool - 統合データベース対応版
 * 既存のスクレイピング機能 + 統合データベース連携
 * 更新日: 2025-09-11
 * jsは外部jsと連携、<script src="js/yahoo_auction_tool_content.js"></script>こちらです。インラインで記述しないこと
 * cssも外部cssと連携<link href="css/yahoo_auction_tool_content.css" rel="stylesheet">こちらです。インラインで記述しないこと
 * 修正箇所以外は削除修正はしない
 */

// 🛡️ JSONエラー完全回避：PHP警告・エラー出力を無効化
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// 🚨 JSON専用レスポンス関数
function sendJsonResponse($data, $success = true, $message = '') {
    // 出力バッファをクリア（PHP警告による「<br /><b>」を除去）
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    exit;
}

// 🔧 安全なファイル読み込み
function safeRequire($file) {
    if (file_exists($file)) {
        try {
            require_once $file;
            return true;
        } catch (Exception $e) {
            error_log("ファイル読み込みエラー: {$file} - {$e->getMessage()}");
            return false;
        }
    }
    error_log("ファイルが存在しません: {$file}");
    return false;
}

// データベース関数を安全に読み込み
if (!safeRequire(__DIR__ . '/database_query_handler.php')) {
    if (isset($_GET['action']) || isset($_POST['action'])) {
        sendJsonResponse(null, false, 'データベース関数の読み込みに失敗しました');
    }
}

// デバッグ用：更新確認
if (isset($_GET['cache_check'])) {
    echo json_encode(['status' => 'updated', 'time' => date('Y-m-d H:i:s')]);
    exit;
}

// APIのエンドポイントURLを設定（拡張APIサーバー）
$api_url = "http://localhost:5002";

// 🆕 統合データベースクエリハンドラー追加
require_once __DIR__ . '/database_query_handler.php';

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

// ダッシュボードデータの取得（統合データベース版）
function fetchDashboardData($api_url) {
    // 統合データベースから取得
    $stats = getDashboardStats();
    
    if ($stats) {
        return [
            'success' => true,
            'stats' => [
                'total' => $stats['total_records'],
                'scraped' => $stats['scraped_count'],
                'calculated' => $stats['calculated_count'],
                'filtered' => $stats['filtered_count'],
                'ready' => $stats['ready_count'],
                'listed' => $stats['listed_count']
            ]
        ];
    }
    
    // フォールバック: API呼び出し
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, $api_url . '/api/system_status');
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_TIMEOUT, 5);
    curl_setopt($curl, CURLOPT_FOLLOWLOCATION, true);
    $response = curl_exec($curl);
    $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if ($http_code == 200 && $response) {
        return json_decode($response, true);
    }
    return ['success' => false, 'error' => "APIサーバーに接続できませんでした"];
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// ユーザーアクションの処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';
$log_message = '';

switch ($action) {
    // 🆕 統合データベース用API追加
    case 'get_approval_queue':
        try {
            $filters = $_GET['filters'] ?? [];
            $data = getApprovalQueueData($filters);
            sendJsonResponse($data, true, '承認データ取得成功');
        } catch (Exception $e) {
            sendJsonResponse([], false, '承認データ取得エラー: ' . $e->getMessage());
        }
        break;
        
    case 'get_scraped_products':
        try {
            $page = $_GET['page'] ?? 1;
            $limit = $_GET['limit'] ?? 20;
            $filters = $_GET['filters'] ?? [];
            $mode = $_GET['mode'] ?? 'extended'; // extended, strict, yahoo_table
            
            // 🔍 スクレイピングデータ検索モード切替
            if ($_GET['debug'] ?? false) {
                // デバッグモード: 全データ表示
                $result = getAllRecentProductsData($page, $limit);
            } else {
                // 順序で検索してデータがあるものを返す
                switch($mode) {
                    case 'strict':
                        $result = getStrictScrapedProductsData($page, $limit, $filters);
                        break;
                    case 'yahoo_table':
                        $result = getYahooScrapedProductsData($page, $limit, $filters);
                        break;
                    case 'extended':
                    default:
                        $result = getScrapedProductsData($page, $limit, $filters);
                        break;
                }
                
                // 拡張検索でも結果が0の場合の処理を無効化（既存データ誤表示防止）
                if ($result['total'] == 0) {
                error_log("スクレイピングデータが見つかりません。実際のスクレイピングを実行してください。");
                // ⚠️ フォールバック検索を無効化：既存データを誤ってスクレイピングデータとして表示しない
                // 以前のコード：最近のデータでフォールバック → 削除
                }
            }
            
            sendJsonResponse($result, true, 'スクレイピングデータ取得成功');
        } catch (Exception $e) {
            sendJsonResponse(['data' => [], 'total' => 0], false, 'スクレイピングデータ取得エラー: ' . $e->getMessage());
        }
        break;
        
    case 'search_products':
        try {
            $query = $_GET['query'] ?? '';
            $filters = $_GET['filters'] ?? [];
            $data = searchProducts($query, $filters);
            sendJsonResponse($data, true, '検索成功');
        } catch (Exception $e) {
            sendJsonResponse([], false, '検索エラー: ' . $e->getMessage());
        }
        break;
        
    case 'get_dashboard_stats':
        try {
            $data = getDashboardStats();
            sendJsonResponse($data, true, 'ダッシュボード統計取得成功');
        } catch (Exception $e) {
            sendJsonResponse(null, false, 'ダッシュボード統計取得エラー: ' . $e->getMessage());
        }
        break;

    // 既存のスクレイピング処理を実機能に変更
    case 'scrape':
        $url = $_POST['url'] ?? '';
        if (empty($url)) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'URLが指定されていません',
                'message' => 'YahooオークションURLを入力してください'
            ]);
            exit;
        }
        
        // 実際のスクレイピング実行
        $scraping_result = executeScrapingWithAPI($url, $api_url);
        
        if ($scraping_result['success']) {
            $log_message = "スクレイピング成功: " . ($scraping_result['data']['success_count'] ?? 1) . "件のデータを取得しました";
            
            // JSONレスポンスを返す
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'message' => $log_message,
                'data' => $scraping_result['data'],
                'url' => $url
            ]);
        } else {
            $log_message = "スクレイピング失敗: " . $scraping_result['error'];
            
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => $scraping_result['error'],
                'message' => $log_message,
                'url' => $url
            ]);
        }
        exit;
    
    // 🆕 APIサーバーヘルスチェック用プロキシ追加
    case 'test_api_connection':
        $ch = curl_init($api_url . '/health');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        header('Content-Type: application/json');
        if ($http_code == 200 && $response) {
            echo $response;  // APIレスポンスをそのまま返す
        } else {
            echo json_encode([
                'success' => false, 
                'error' => 'APIサーバー接続失敗',
                'http_code' => $http_code
            ]);
        }
        exit;
        
    case 'test_api_system_status':
        $ch = curl_init($api_url . '/api/system_status');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        header('Content-Type: application/json');
        if ($http_code == 200 && $response) {
            echo $response;
        } else {
            echo json_encode([
                'success' => false, 
                'error' => 'APIシステムステータス取得失敗',
                'http_code' => $http_code
            ]);
        }
        exit;
    
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

    default:
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
    <title>Yahoo→eBay統合ワークフロー完全版（統合データベース版）</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="css/yahoo_auction_tool_content.css" rel="stylesheet">
</head>
<body>
    <div class="container">
        <div class="main-dashboard">
            <div class="dashboard-header">
                <h1><i class="fas fa-sync-alt"></i> Yahoo→eBay統合ワークフロー完全版</h1>
                <p>統合データベース対応・商品承認システム・禁止品フィルター管理・eBay出品支援・在庫分析</p>
            </div>

            <div class="caids-constraints-bar">
                <div class="constraint-item">
                    <div class="constraint-value" id="totalRecords"><?= htmlspecialchars($dashboard_data['stats']['total'] ?? '644'); ?></div>
                    <div class="constraint-label">総データ数</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="scrapedCount"><?= htmlspecialchars($dashboard_data['stats']['scraped'] ?? '634'); ?></div>
                    <div class="constraint-label">取得済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="calculatedCount"><?= htmlspecialchars($dashboard_data['stats']['calculated'] ?? '644'); ?></div>
                    <div class="constraint-label">計算済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="filteredCount"><?= htmlspecialchars($dashboard_data['stats']['filtered'] ?? '644'); ?></div>
                    <div class="constraint-label">フィルター済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="readyCount"><?= htmlspecialchars($dashboard_data['stats']['ready'] ?? '644'); ?></div>
                    <div class="constraint-label">出品準備完了</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="listedCount"><?= htmlspecialchars($dashboard_data['stats']['listed'] ?? '0'); ?></div>
                    <div class="constraint-label">出品済</div>
                </div>
            </div>

            <div class="tab-navigation">
                <button class="tab-btn active" data-tab="dashboard" onclick="switchTab('dashboard')">
                    <i class="fas fa-tachometer-alt"></i>
                    ダッシュボード
                </button>
                <!-- 🆕 商品承認タブを追加 -->
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
                        <h3 class="section-title">商品検索（統合データベース）</h3>
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
                            <span>統合データベース（644件）から検索します。検索キーワードを入力してください。</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 🆕 商品承認タブ（統合データベース版） -->
            <div id="approval" class="tab-content fade-in">
                <div class="approval-system">
                    <!-- AI推奨表示バー -->
                    <div style="background: linear-gradient(135deg, #8b5cf6, #06b6d4); color: white; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
                                <i class="fas fa-brain"></i>
                                統合データベース: 644件の商品承認システム
                            </h2>
                            <p style="margin: 0; font-size: 0.8rem; opacity: 0.9;">
                                eBay API(634件) + Yahoo商品(5件) + スクレイピング(5件) = 統合管理中
                            </p>
                        </div>
                        <button class="btn" style="background: white; color: var(--primary-color); font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 0.5rem; border: none; cursor: pointer;" onclick="openNewProductModal()">
                            <i class="fas fa-plus-circle"></i> 新規商品登録
                        </button>
                    </div>

                    <!-- 統計表示 -->
                    <div class="approval-stats">
                        <div class="stat-item">
                            <div class="stat-value" id="pendingCount">644</div>
                            <div class="stat-label">承認待ち</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">400</div>
                            <div class="stat-label">AI承認推奨</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="highRiskCount">150</div>
                            <div class="stat-label">AI否認推奨</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="mediumRiskCount">94</div>
                            <div class="stat-label">人間判定要</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">$148.32</div>
                            <div class="stat-label">平均価格</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="totalRegistered">0</div>
                            <div class="stat-label">承認済み</div>
                        </div>
                    </div>

                    <!-- 商品グリッド（統合データベースから読み込み） -->
                    <div class="approval-grid" id="approval-product-grid">
                        <div class="loading-container" id="loadingContainer">
                            <div class="loading-spinner"></div>
                            <p>統合データベースから承認待ち商品を読み込み中...</p>
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
                            <button class="action-btn action-btn-success" onclick="bulkApprove()">
                                <i class="fas fa-check"></i> 承認
                            </button>
                            <button class="action-btn action-btn-danger" onclick="bulkReject()">
                                <i class="fas fa-times"></i> 否認
                            </button>
                            <button class="action-btn action-btn-warning" onclick="exportSelectedProducts()">
                                <i class="fas fa-download"></i> CSV出力
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- データ取得タブ（既存機能維持） -->
            <div id="scraping" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-download"></i>
                        <h3 class="section-title">Yahoo オークションデータ取得</h3>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
                        <div>
                            <form onsubmit="return handleScrapingFormSubmit(event)" id="scrapingForm">
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
                            <form action="yahoo_auction_content.php" method="POST" enctype="multipart/form-data">
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

            <!-- その他のタブは既存のまま維持 -->
            <div id="editing" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-edit"></i>
                        <h3 class="section-title">スクレイピングデータ編集</h3>
                        <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                            <button class="btn btn-info" onclick="loadEditingData()">
                                <i class="fas fa-spider"></i> スクレイピングデータ検索
                            </button>
                            <button class="btn btn-primary" onclick="loadEditingDataStrict()">
                                <i class="fas fa-link"></i> URL有データのみ
                            </button>
                            <button class="btn btn-warning" onclick="loadAllData()">
                                <i class="fas fa-database"></i> 全データ表示（デバッグ）
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
                    
                    <!-- スクレイピングデータ専用の説明 -->
                    <div class="notification info" style="margin-bottom: var(--space-md);">
                        <i class="fas fa-info-circle"></i>
                        <span>🕷️ <strong>スクレイピングデータ検索</strong>: 拡張条件でYahooオークション関連のデータを検索します。「URL有データのみ」で厳密検索も可能です。</span>
                    </div>
                    
                    <div class="data-table-container">
                        <table class="data-table" id="editingTable">
                            <thead>
                                <tr>
                                    <th>操作</th>
                                    <th>ソース</th>
                                    <th>画像</th>
                                    <th>Master SKU</th>
                                    <th>商品ID</th>
                                    <th>タイトル</th>
                                    <th>カテゴリ</th>
                                    <th>価格(USD)</th>
                                    <th>承認ステータス</th>
                                    <th>在庫ステータス</th>
                                    <th>更新日</th>
                                </tr>
                            </thead>
                            <tbody id="editingTableBody">
                                <tr>
                                    <td colspan="11" style="text-align: center; padding: var(--space-lg); color: var(--text-muted);">
                                        🕷️ 「スクレイピングデータ検索」で拡張条件検索、「URL有データのみ」で厳密検索を実行してください。<br>
                                        <small>スクレイピング後はデータが表示されます。サンプルデータは非表示。</small>
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

            <!-- 承認分析タブ -->
            <div id="analysis" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-chart-bar"></i>
                        <h3 class="section-title">承認分析ダッシュボード</h3>
                    </div>
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>承認データの分析機能は開発中です。</span>
                    </div>
                </div>
            </div>

            <!-- 送料計算タブ -->
            <div id="calculation" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-calculator"></i>
                        <h3 class="section-title">送料計算</h3>
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
                        <i class="fas fa-filter"></i>
                        <h3 class="section-title">フィルター管理</h3>
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
                        <i class="fas fa-store"></i>
                        <h3 class="section-title">出品管理</h3>
                    </div>
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>出品管理機能は開発中です。</span>
                    </div>
                </div>
            </div>

            <!-- 在庫管理タブ -->
            <div id="inventory-mgmt" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-warehouse"></i>
                        <h3 class="section-title">在庫管理</h3>
                    </div>
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>在庫管理機能は開発中です。</span>
                    </div>
                </div>
            </div>

        </div>

        <div class="log-area">
            <h4 style="color: var(--info-color); margin-bottom: var(--space-xs); font-size: 0.8rem;"><i class="fas fa-history"></i> システムログ</h4>
            <div id="logSection">
                <div class="log-entry">
                    <span class="log-timestamp">[<?= date('H:i:s'); ?>]</span>
                    <span class="log-level info">INFO</span>
                    <span>統合データベース版システムが正常に起動しました（644件管理中）。</span>
                </div>
                <?php if ($log_message): ?>
                    <div class="log-entry">
                        <span class="log-timestamp">[<?= date('H:i:s'); ?>]</span>
                        <span class="log-level info">INFO</span>
                        <span><?= htmlspecialchars($log_message); ?></span>
                    </div>
                <?php endif; ?>
                <?php if (!$dashboard_data['success']): ?>
                    <div class="log-entry">
                        <span class="log-timestamp">[<?= date('H:i:s'); ?>]</span>
                        <span class="log-level warning">WARNING</span>
                        <span>APIサーバーに接続できませんでした。統合データベースモードで動作中。</span>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
<script src="js/yahoo_auction_tool_content.js"></script>
</body>
</html>
