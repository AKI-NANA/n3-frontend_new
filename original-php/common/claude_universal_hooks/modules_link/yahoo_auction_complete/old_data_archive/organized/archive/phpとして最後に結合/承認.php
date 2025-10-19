<?php
/**
 * Yahoo Auction Tool - 統合データベース対応版
 * 既存のスクレイピング機能 + 統合データベース連携
 * 更新日: 2025-09-11
 * jsは外部jsと連携、<script src="js/yahoo_auction_tool_complete.js"></script>
 * cssも外部cssと連携<link href="css/yahoo_auction_tool_content.css" rel="stylesheet">こちらです。インラインで記述しないこと
 * 修正箇所以外は削除修正はしない
 */

// 🛡️ デバッグモード：エラー表示を有効化
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
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

// 📊 データベース関数を安全に読み込み
// if (!safeRequire(__DIR__ . '/database_query_handler_debug.php')) {
//     if (isset($_GET['action']) || isset($_POST['action'])) {
//         sendJsonResponse(null, false, 'デバッグ用データベース関数の読み込みに失敗しました');
//     }
// }

// デバッグ用：更新確認
if (isset($_GET['cache_check'])) {
    echo json_encode(['status' => 'updated', 'time' => date('Y-m-d H:i:s')]);
    exit;
}

// APIのエンドポイントURLを設定（拡張APIサーバー）
$api_url = "http://localhost:5002";

// CSV処理機能を読み込み
require_once __DIR__ . '/csv_handler.php';

// 📊 統合データベースクエリハンドラー読み込み
if (!safeRequire(__DIR__ . '/database_query_handler.php')) {
    if (isset($_GET['action']) || isset($_POST['action'])) {
        sendJsonResponse(null, false, 'データベース関数の読み込みに失敗しました');
    }
}

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
    // 📄 CSVアップロード機能追加
    case 'upload_csv':
        try {
            if (!isset($_FILES['csvFile'])) {
                outputCSVResponse(['success' => false, 'error' => 'CSVファイルがアップロードされていません']);
            }
            $result = handleCSVUpload($_FILES['csvFile']);
            outputCSVResponse($result);
        } catch (Exception $e) {
            outputCSVResponse(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
        
    // 🧹 ダミーデータクリーンアップ機能追加
    case 'cleanup_dummy_data':
        try {
            $result = cleanupDummyData();
            sendJsonResponse($result, $result['success'], $result['success'] ? $result['message'] : $result['error']);
        } catch (Exception $e) {
            sendJsonResponse(null, false, 'ダミーデータ削除エラー: ' . $e->getMessage());
        }
        break;
        
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
        
    case 'get_all_recent_products':
        try {
            $page = $_GET['page'] ?? 1;
            $limit = $_GET['limit'] ?? 20;
            $debug = $_GET['debug'] ?? false;
            $result = getAllRecentProductsData($page, $limit);
            sendJsonResponse($result, true, 'デバッグモード: 全データ取得成功');
        } catch (Exception $e) {
            sendJsonResponse(['data' => [], 'total' => 0], false, 'デバッグモードエラー: ' . $e->getMessage());
        }
        break;

    // 🆕 改善されたCSV出力（3分類対応）
    case 'download_csv':
        try {
            // 出力バッファクリア
            while (ob_get_level()) {
                ob_end_clean();
            }
            
            error_reporting(0);
            
            // CSVファイル用ヘッダー設定
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="scraped_products_" . date("Y-m-d_H-i-s") . ".csv"');
            header('Cache-Control: no-cache, must-revalidate');
            header('Expires: 0');
            header('Pragma: no-cache');
            
            // UTF-8 BOM追加（Excel対応）
            echo "\xEF\xBB\xBF";
            
            // CSV用データ取得
            $csvData = getScrapedProductsForCSV(1, 1000); // 最大1000件
            $headers = getCSVHeaders();
            
            // CSV出力
            $output = fopen('php://output', 'w');
            
            // ヘッダー行出力
            fputcsv($output, $headers);
            
            // データ行出力
            if (!empty($csvData['data'])) {
                foreach ($csvData['data'] as $row) {
                    $csvRow = [];
                    foreach ($headers as $header) {
                        $csvRow[] = $row[$header] ?? '';
                    }
                    fputcsv($output, $csvRow);
                }
                error_log("CSV出力成功: " . count($csvData['data']) . "件");
            } else {
                // サンプルデータ出力
                $sampleRow = [
                    'KEEP', '', 'SAMPLE-001', 'Yahoo', 'サンプル商品', '1500', 'Electronics', 'Used',
                    'https://auctions.yahoo.co.jp/sample', '', 'Add', 'SKU-SAMPLE-001',
                    'Sample Product', '', '3000', '15.00', 'FixedPriceItem', 'GTC',
                    'Sample Product Description', '', '', '', '', 'Flat', '19.99',
                    '1', '0', '10', '8', '6', 'Osaka, Japan', 'JP', '', '800',
                    '19.99', '150', '13.5', '', '', 'draft', 'pending', '5',
                    date('Y-m-d H:i:s'), date('Y-m-d H:i:s'), 'system'
                ];
                fputcsv($output, $sampleRow);
                error_log("CSV出力: サンプルデータ出力");
            }
            
            fclose($output);
            exit;
        } catch (Exception $e) {
            error_log("CSV出力エラー: " . $e->getMessage());
            header('Content-Type: text/plain; charset=utf-8');
            echo "エラー: CSV出力に失敗しました - " . $e->getMessage();
            exit;
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
    <link href="css/yahoo_auction_system.css" rel="stylesheet">
    <link rel="stylesheet" href="css/yahoo_auction_button_fix_patch.css">
    <link rel="stylesheet" href="css/yahoo_auction_tab_fix_patch.css">

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
                <!-- 🆕 HTML編集タブ追加（データ編集の隣） -->
                <button class="tab-btn" data-tab="html-editor" onclick="switchTab('html-editor')">
                    <i class="fas fa-code"></i>
                    HTML編集
                </button>
                <button class="tab-btn" data-tab="calculation" onclick="switchTab('calculation')">
                    <i class="fas fa-calculator"></i>
                    送料計算
                </button>
                <button class="tab-btn" data-tab="riekikeisan" onclick="switchTab('riekikeisan')">
                    <i class="fas fa-calculator"></i>
                    利益計算
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


            <!-- 🆕 商品承認タブ（統合データベース版） -->
            <div id="approval" class="tab-content fade-in">
                <main class="approval__main-container">
                    
                    <!-- ページヘッダー -->
                    <header class="approval__page-header">
                        <div class="approval__header-content">
                            <h1 class="approval__page-title">
                                <div class="approval__title-icon">
                                    <i class="fas fa-check-circle"></i>
                                </div>
                                商品承認グリッドシステム（統合版）
                            </h1>
                            <p class="approval__page-subtitle">
                                AI推奨システム × 高速グリッド承認 - クリック選択 × ボーダー色リスク判定
                            </p>
                        </div>
                    </header>
                    
                    <!-- AI推奨セクション -->
                    <section class="approval__ai-recommendations">
                        <h2 class="approval__ai-title">
                            <i class="fas fa-brain"></i>
                            AI推奨: 要確認商品のみ表示中
                        </h2>
                        <div class="approval__ai-summary">
                            低リスク商品 1,847件は自動承認済み。高・中リスク商品 <span id="totalProductCount">25</span>件を人間判定待ちで表示しています。
                        </div>
                    </section>

                    <!-- 統計・コントロールセクション -->
                    <section class="approval__controls">
                        <!-- 統計表示 -->
                        <div class="approval__stats-grid">
                            <div class="approval__stat-card">
                                <div class="approval__stat-value" id="pendingCount">25</div>
                                <div class="approval__stat-label">承認待ち</div>
                            </div>
                            <div class="approval__stat-card">
                                <div class="approval__stat-value">1,847</div>
                                <div class="approval__stat-label">自動承認済み</div>
                            </div>
                            <div class="approval__stat-card">
                                <div class="approval__stat-value" id="highRiskCount">13</div>
                                <div class="approval__stat-label">高リスク</div>
                            </div>
                            <div class="approval__stat-card">
                                <div class="approval__stat-value" id="mediumRiskCount">12</div>
                                <div class="approval__stat-label">中リスク</div>
                            </div>
                            <div class="approval__stat-card">
                                <div class="approval__stat-value">2.3分</div>
                                <div class="approval__stat-label">平均処理時間</div>
                            </div>
                        </div>

                        <!-- フィルターコントロール -->
                        <div class="approval__filter-controls">
                            <div class="approval__filter-group">
                                <span class="approval__filter-label">表示:</span>
                                <button class="approval__filter-btn approval__filter-btn--active" data-filter="all" onclick="applyFilter('all')">
                                    すべて <span class="approval__filter-count" id="countAll">25</span>
                                </button>
                            </div>

                            <div class="approval__filter-group">
                                <span class="approval__filter-label">AI判定:</span>
                                <button class="approval__filter-btn" data-filter="ai-approved" onclick="applyFilter('ai-approved')">
                                    AI承認済み <span class="approval__filter-count" id="countAiApproved">13</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="ai-rejected" onclick="applyFilter('ai-rejected')">
                                    AI非承認 <span class="approval__filter-count" id="countAiRejected">8</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="ai-pending" onclick="applyFilter('ai-pending')">
                                    AI判定待ち <span class="approval__filter-count" id="countAiPending">4</span>
                                </button>
                            </div>

                            <div class="approval__filter-group">
                                <span class="approval__filter-label">リスク:</span>
                                <button class="approval__filter-btn" data-filter="high-risk" onclick="applyFilter('high-risk')">
                                    高リスク <span class="approval__filter-count" id="countHighRisk">13</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="medium-risk" onclick="applyFilter('medium-risk')">
                                    中リスク <span class="approval__filter-count" id="countMediumRisk">12</span>
                                </button>
                            </div>

                            <div class="approval__filter-group">
                                <span class="approval__filter-label">価格帯:</span>
                                <button class="approval__filter-btn" data-filter="low-price" onclick="applyFilter('low-price')">
                                    ～5,000円 <span class="approval__filter-count" id="countLowPrice">8</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="medium-price" onclick="applyFilter('medium-price')">
                                    5,001～20,000円 <span class="approval__filter-count" id="countMediumPrice">10</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="high-price" onclick="applyFilter('high-price')">
                                    20,001円～ <span class="approval__filter-count" id="countHighPrice">7</span>
                                </button>
                            </div>

                            <div class="approval__filter-group">
                                <span class="approval__filter-label">コンディション:</span>
                                <button class="approval__filter-btn" data-filter="new" onclick="applyFilter('new')">
                                    新品 <span class="approval__filter-count" id="countNew">17</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="used" onclick="applyFilter('used')">
                                    中古 <span class="approval__filter-count" id="countUsed">7</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="preorder" onclick="applyFilter('preorder')">
                                    予約 <span class="approval__filter-count" id="countPreorder">1</span>
                                </button>
                            </div>

                            <div class="approval__filter-group">
                                <span class="approval__filter-label">カテゴリ:</span>
                                <button class="approval__filter-btn" data-filter="electronics" onclick="applyFilter('electronics')">
                                    電子機器 <span class="approval__filter-count" id="countElectronics">9</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="toys" onclick="applyFilter('toys')">
                                    おもちゃ <span class="approval__filter-count" id="countToys">7</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="books" onclick="applyFilter('books')">
                                    書籍 <span class="approval__filter-count" id="countBooks">6</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="clothing" onclick="applyFilter('clothing')">
                                    衣類 <span class="approval__filter-count" id="countClothing">3</span>
                                </button>
                            </div>

                            <div class="approval__filter-group">
                                <span class="approval__filter-label">仕入先:</span>
                                <button class="approval__filter-btn" data-filter="amazon" onclick="applyFilter('amazon')">
                                    Amazon <span class="approval__filter-count" id="countAmazon">8</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="ebay" onclick="applyFilter('ebay')">
                                    eBay <span class="approval__filter-count" id="countEbay">9</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="shopify" onclick="applyFilter('shopify')">
                                    Shopify <span class="approval__filter-count" id="countShopify">8</span>
                                </button>
                            </div>
                        </div>

                        <!-- 主要操作ボタン -->
                        <div class="approval__main-actions">
                            <div class="approval__selection-controls">
                                <button class="approval__main-btn approval__main-btn--select" onclick="selectAllVisible()">
                                    <i class="fas fa-check-square"></i>
                                    全選択
                                </button>
                                <button class="approval__main-btn approval__main-btn--deselect" onclick="deselectAll()">
                                    <i class="fas fa-square"></i>
                                    全解除
                                </button>
                            </div>
                            
                            <div class="approval__decision-controls">
                                <button class="approval__main-btn approval__main-btn--approve" onclick="bulkApprove()">
                                    <i class="fas fa-check"></i>
                                    承認
                                </button>
                                <button class="approval__main-btn approval__main-btn--reject" onclick="bulkReject()">
                                    <i class="fas fa-times"></i>
                                    非承認
                                </button>
                            </div>
                        </div>
                    </section>

                    <!-- 一括操作バー -->
                    <div class="approval__bulk-actions" id="bulkActions">
                        <div class="approval__bulk-info">
                            <i class="fas fa-check-square"></i>
                            <span id="selectedCount">0</span>件 を選択中
                        </div>
                        <div class="approval__bulk-buttons">
                            <button class="approval__bulk-btn approval__bulk-btn--success" onclick="bulkApprove()">
                                <i class="fas fa-check"></i>
                                一括承認
                            </button>
                            <button class="approval__bulk-btn approval__bulk-btn--danger" onclick="bulkReject()">
                                <i class="fas fa-ban"></i>
                                一括否認
                            </button>
                            <button class="approval__bulk-btn" onclick="bulkHold()">
                                <i class="fas fa-pause"></i>
                                一括保留
                            </button>
                            <button class="approval__bulk-btn" onclick="clearSelection()">
                                <i class="fas fa-times"></i>
                                選択クリア
                            </button>
                        </div>
                    </div>

                    <!-- メイングリッド -->
                    <section class="approval__grid-container">
                        <div class="approval__grid" id="productGrid">
                            <!-- 商品カード動的生成領域 -->
                        </div>

                        <div class="approval__pagination">
                            <div class="approval__pagination-info">
                                <span id="displayRange">1-25件表示</span> / 全<span id="totalCount">25</span>件
                            </div>
                            <div class="approval__pagination-controls">
                                <button class="approval__pagination-btn approval__pagination-btn--active">1</button>
                            </div>
                        </div>
                    </section>
                </main>
            </div>

           
 <div class="log-area">
    <h4 style="color: var(--info-color); margin-bottom: var(--space-xs); font-size: 0.8rem;">
    <h4><i class="fas fa-history"></i> システムログ</h4>
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
<script src="js/yahoo_auction_tool_complete.js"></script>
<!-- <script src="js/database_integration.js"></script> -->
</body>
</html>
