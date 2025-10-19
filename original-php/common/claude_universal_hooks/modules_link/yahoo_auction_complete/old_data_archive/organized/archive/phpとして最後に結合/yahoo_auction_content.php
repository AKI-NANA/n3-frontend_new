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
                            <button class="btn btn-warning" onclick="cleanupDummyData()" style="margin-left: 0.5rem;">
                                🧹 ダミーデータ削除
                            </button>
                            <button class="btn btn-secondary" onclick="downloadEditingCSV()">
                                <i class="fas fa-download"></i> スクレイピングデータCSV出力
                            </button>
                            <button class="btn btn-info" onclick="testCSVDownload()" style="font-size: 0.75rem; padding: 0.4rem 0.6rem;">
                                <i class="fas fa-vial"></i> CSV出力テスト
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

            <!-- 出品管理タブ -->
            <div id="listing" class="tab-content fade-in">
                <!-- CSVドラッグ&ドロップエリア -->
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-store"></i>
                        <h3 class="section-title">出品・管理</h3>
                    </div>
                    
                    <div class="drag-drop-area" onclick="document.getElementById('listingCsvInput').click();" ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                        <input type="file" id="listingCsvInput" style="display: none;" accept=".csv" onchange="handleCSVUpload(event)">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 0.5rem;"></i>
                        <div class="drag-drop-text">
                            <strong>編集済みCSVをドラッグ&ドロップ</strong><br>
                            または、クリックしてファイルを選択
                        </div>
                    </div>
                    
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>編集済みCSVをアップロードしてeBay出品データを準備します</span>
                    </div>
                </div>

                <!-- eBay出品最適化 -->
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-tags"></i>
                        <h3 class="section-title">eBay出品最適化</h3>
                    </div>
                    
                    <div class="optimization-container">
                        <div class="optimization-tabs">
                            <button class="opt-tab active" data-tab="category" onclick="switchOptTab('category')">カテゴリマッピング</button>
                            <button class="opt-tab" data-tab="title" onclick="switchOptTab('title')">タイトル最適化</button>
                            <button class="opt-tab" data-tab="description" onclick="switchOptTab('description')">説明文生成</button>
                        </div>
                        
                        <div class="opt-content">
                            <!-- カテゴリマッピング -->
                            <div class="opt-panel active" id="categoryPanel">
                                <div class="category-mapping" style="display: grid; grid-template-columns: 1fr auto 1fr; gap: var(--space-md); align-items: center; margin-bottom: var(--space-lg);">
                                    <div class="source-category">
                                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">日本語カテゴリ</label>
                                        <input type="text" id="sourceCategoryJP" placeholder="例: ゲーム・おもちゃ" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
                                    </div>
                                    <div class="mapping-arrow" style="font-size: 1.5rem; color: var(--primary-color);">→</div>
                                    <div class="target-category">
                                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">eBayカテゴリ</label>
                                        <select id="targetCategoryEB" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
                                            <option value="139973">Video Games & Consoles</option>
                                            <option value="58058">Cell Phones & Smartphones</option>
                                            <option value="625">Cameras & Photo</option>
                                            <option value="183454">Collectibles (Anime/Pokemon)</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <button class="btn btn-primary" onclick="applyAutoCategoryMapping()">
                                    <i class="fas fa-magic"></i> 自動マッピング適用
                                </button>
                            </div>
                            
                            <!-- タイトル最適化 -->
                            <div class="opt-panel" id="titlePanel">
                                <div class="title-optimization" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); margin-bottom: var(--space-lg);">
                                    <div class="original-title">
                                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">元のタイトル（日本語）</label>
                                        <textarea id="originalTitleJP" placeholder="商品の元のタイトル" style="width: 100%; height: 80px; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; resize: vertical;"></textarea>
                                    </div>
                                    <div class="optimized-title">
                                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">最適化タイトル（英語・80文字以内）</label>
                                        <textarea id="optimizedTitleEN" maxlength="80" style="width: 100%; height: 80px; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; resize: vertical;"></textarea>
                                        <div class="character-count" style="text-align: right; margin-top: 0.25rem; font-size: 0.8rem; color: var(--text-secondary);">
                                            <span id="titleCharCount">0</span>/80 文字
                                        </div>
                                    </div>
                                </div>
                                
                                <button class="btn btn-success" onclick="generateOptimizedTitle()">
                                    <i class="fas fa-robot"></i> タイトル自動生成
                                </button>
                            </div>
                            
                            <!-- 説明文生成 -->
                            <div class="opt-panel" id="descriptionPanel">
                                <div class="description-generation" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); margin-bottom: var(--space-lg);">
                                    <div class="source-info">
                                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">商品情報（日本語）</label>
                                        <textarea id="sourceInfoJP" placeholder="商品の詳細説明" style="width: 100%; height: 120px; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; resize: vertical;"></textarea>
                                    </div>
                                    <div class="generated-description">
                                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">生成されたHTML説明文</label>
                                        <div class="description-preview" id="descriptionPreview" style="min-height: 120px; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary);">
                                            <!-- プレビュー表示 -->
                                        </div>
                                        <textarea id="generatedHTML" style="display: none;"></textarea>
                                    </div>
                                </div>
                                
                                <div class="description-actions" style="display: flex; gap: 0.5rem;">
                                    <button class="btn btn-primary" onclick="generateHTMLDescription()">
                                        <i class="fas fa-code"></i> HTML説明文生成
                                    </button>
                                    <button class="btn btn-info" onclick="previewDescription()">
                                        <i class="fas fa-eye"></i> プレビュー
                                    </button>
                                    <button class="btn btn-success" onclick="copyDescriptionHTML()">
                                        <i class="fas fa-copy"></i> HTMLコピー
                                    </button>
                                </div>
                            </div>
                        </div>
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
                            <button class="btn btn-info" onclick="refreshAnalytics()">
                                <i class="fas fa-sync"></i> データ更新
                            </button>
                        </div>
                    </div>
                    
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
                                    <!-- 動的生成 -->
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
                            <!-- 低在庫商品リスト -->
                            <div class="notification warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>在庫監視システムを設定してください</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
