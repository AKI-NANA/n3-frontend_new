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
        
    // === eBay出品準備機能API ===
    case 'get_editing_data':
        try {
            $page = $_GET['page'] ?? 1;
            $limit = $_GET['limit'] ?? 50;
            $data = getEbayPreparationData($page, $limit);
            sendJsonResponse($data, true, 'データ取得成功');
        } catch (Exception $e) {
            sendJsonResponse([], false, 'データ取得エラー: ' . $e->getMessage());
        }
        break;

    case 'download_editing_csv':
        try {
            $data = getEbayPreparationData(1, 1000); // 全データ
            generateEditingCSV($data['data']);
        } catch (Exception $e) {
            sendJsonResponse(null, false, 'CSV生成エラー: ' . $e->getMessage());
        }
        break;

    case 'upload_editing_csv':
        try {
            if (!isset($_FILES['csv_file'])) {
                throw new Exception('CSVファイルが選択されていません');
            }
            $results = processEditingCSV($_FILES['csv_file']);
            sendJsonResponse($results, true, 'CSV処理完了');
        } catch (Exception $e) {
            sendJsonResponse(null, false, 'CSV処理エラー: ' . $e->getMessage());
        }
        break;

    case 'bulk_operations':
        try {
            $operation = $_POST['operation'];
            $item_ids = $_POST['item_ids'];
            $results = processBulkOperations($operation, $item_ids);
            sendJsonResponse($results, true, '一括操作完了');
        } catch (Exception $e) {
            sendJsonResponse(null, false, '一括操作エラー: ' . $e->getMessage());
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
        $