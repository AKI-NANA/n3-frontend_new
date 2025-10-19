<?php
/**
 * Yahoo Auction Tool - 統合データベース対応版
 * 既存のスクレイピング機能 + 統合データベース連携
 * 更新日: 2025-09-11
 * jsは外部jsと連携、<script src="js/yahoo_auction_tool_complete.js"></script>
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
if (!safeRequire(__DIR__ . '/database_query_handler_debug.php')) {
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

// CSV処理機能を読み込み
require_once __DIR__ . '/csv_handler.php';

// 🆕 統合データベースクエリハンドラー追加
require_once __DIR__ . '/database_query_handler_debug.php';

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
    // 📄 CSVダウンロード機能追加
    case 'download_csv':
        try {
            $result = handleCSVDownload();
            if ($result['success']) {
                outputCSVFile($result['filepath'], $result['filename']);
            } else {
                outputCSVResponse($result);
            }
        } catch (Exception $e) {
            outputCSVResponse(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
        
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

            <!-- 🆕 商品承認タブ（統合データベース版） -->
            <div id="approval" class="tab-content fade-in">
  <main class="approval__main-container">
    
    <!-- ページヘッダー -->
                    <div class="section-header">
                        <i class="fas fa-download"></i>
                        <h3 class="section-title">商品承認グリッドシステム</h3>
                    </div>

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
          <button class="approval__filter-btn approval__filter-btn--active" data-filter="all">
            すべて <span class="approval__filter-count" id="countAll">25</span>
          </button>
        </div>

        <div class="approval__filter-group">
          <span class="approval__filter-label">AI判定:</span>
          <button class="approval__filter-btn" data-filter="ai-approved">
            AI承認済み <span class="approval__filter-count" id="countAiApproved">13</span>
          </button>
          <button class="approval__filter-btn" data-filter="ai-rejected">
            AI非承認 <span class="approval__filter-count" id="countAiRejected">8</span>
          </button>
          <button class="approval__filter-btn" data-filter="ai-pending">
            AI判定待ち <span class="approval__filter-count" id="countAiPending">4</span>
          </button>
        </div>

        <div class="approval__filter-group">
          <span class="approval__filter-label">リスク:</span>
          <button class="approval__filter-btn" data-filter="high-risk">
            高リスク <span class="approval__filter-count" id="countHighRisk">13</span>
          </button>
          <button class="approval__filter-btn" data-filter="medium-risk">
            中リスク <span class="approval__filter-count" id="countMediumRisk">12</span>
          </button>
        </div>

        <div class="approval__filter-group">
          <span class="approval__filter-label">価格帯:</span>
          <button class="approval__filter-btn" data-filter="low-price">
            ～5,000円 <span class="approval__filter-count" id="countLowPrice">8</span>
          </button>
          <button class="approval__filter-btn" data-filter="medium-price">
            5,001～20,000円 <span class="approval__filter-count" id="countMediumPrice">10</span>
          </button>
          <button class="approval__filter-btn" data-filter="high-price">
            20,001円～ <span class="approval__filter-count" id="countHighPrice">7</span>
          </button>
        </div>

        <div class="approval__filter-group">
          <span class="approval__filter-label">コンディション:</span>
          <button class="approval__filter-btn" data-filter="new">
            新品 <span class="approval__filter-count" id="countNew">17</span>
          </button>
          <button class="approval__filter-btn" data-filter="used">
            中古 <span class="approval__filter-count" id="countUsed">7</span>
          </button>
          <button class="approval__filter-btn" data-filter="preorder">
            予約 <span class="approval__filter-count" id="countPreorder">1</span>
          </button>
        </div>

        <div class="approval__filter-group">
          <span class="approval__filter-label">カテゴリ:</span>
          <button class="approval__filter-btn" data-filter="electronics">
            電子機器 <span class="approval__filter-count" id="countElectronics">9</span>
          </button>
          <button class="approval__filter-btn" data-filter="toys">
            おもちゃ <span class="approval__filter-count" id="countToys">7</span>
          </button>
          <button class="approval__filter-btn" data-filter="books">
            書籍 <span class="approval__filter-count" id="countBooks">6</span>
          </button>
          <button class="approval__filter-btn" data-filter="clothing">
            衣類 <span class="approval__filter-count" id="countClothing">3</span>
          </button>
        </div>

        <div class="approval__filter-group">
          <span class="approval__filter-label">仕入先:</span>
          <button class="approval__filter-btn" data-filter="amazon">
            Amazon <span class="approval__filter-count" id="countAmazon">8</span>
          </button>
          <button class="approval__filter-btn" data-filter="ebay">
            eBay <span class="approval__filter-count" id="countEbay">9</span>
          </button>
          <button class="approval__filter-btn" data-filter="shopify">
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
                <!-- 配送業者データ管理 -->
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-truck"></i>
                        <h3 class="section-title">配送業者データ管理</h3>
                    </div>
                    
                    <div class="shipping-upload-container">
                        <div class="shipping-service-tabs">
                            <button class="service-tab active" data-service="elogi" onclick="switchShippingService('elogi')">eLogi</button>
                            <button class="service-tab" data-service="cpass" onclick="switchShippingService('cpass')">cpass (eBay SpeedPAK)</button>
                            <button class="service-tab" data-service="jp_post" onclick="switchShippingService('jp_post')">日本郵便</button>
                        </div>
                        
                        <div class="service-content">
                            <div class="drag-drop-area" id="shippingUploadArea" 
                                 onclick="document.getElementById('shippingCsvInput').click();"
                                 ondrop="handleShippingDrop(event)" 
                                 ondragover="handleDragOver(event)" 
                                 ondragleave="handleDragLeave(event)">
                                <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                                <div class="drag-drop-text">
                                    <strong>配送データCSVをドラッグ&ドロップ</strong><br>
                                    または、クリックしてファイルを選択
                                </div>
                                <input type="file" id="shippingCsvInput" style="display: none;" accept=".csv" onchange="handleShippingCSVUpload(event)">
                            </div>
                            
                            <div class="upload-results" id="uploadResults" style="display: none;">
                                <!-- アップロード結果表示 -->
                            </div>
                            
                            <!-- CSVテンプレートダウンロード -->
                            <div style="margin-top: 1rem; display: flex; gap: 1rem;">
                                <button class="btn btn-secondary" onclick="downloadShippingTemplate()">
                                    <i class="fas fa-download"></i> CSVテンプレート
                                </button>
                                <button class="btn btn-info" onclick="validateShippingData()">
                                    <i class="fas fa-check-circle"></i> データ検証
                                </button>
                                <button class="btn btn-success" onclick="uploadShippingData()" id="uploadShippingBtn" disabled>
                                    <i class="fas fa-upload"></i> データ投入
                                </button>
                            </div>
                        </div>
                    </div>

                                    <!-- USA配送ポリシー作成機能 -->
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-flag-usa"></i>
                        <h3 class="section-title">eBay配送ポリシー自動作成</h3>
                        <div style="margin-left: auto;">
                            <button class="btn btn-primary" onclick="createShippingPolicies()">
                                <i class="fas fa-magic"></i> ポリシー自動生成
                            </button>
                        </div>
                    </div>
                    
                    <div class="policy-generation-container">
                        <!-- 商品重量・サイズ入力 -->
                        <div class="policy-input-section">
                            <h4>商品情報</h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-md);">
                                <div class="form-group">
                                    <label>重量 (kg)</label>
                                    <input type="number" id="policyWeight" step="0.1" min="0.1" value="1.0" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
                                </div>
                                <div class="form-group">
                                    <label>サイズ (cm)</label>
                                    <input type="text" id="policyDimensions" placeholder="30x20x15" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
                                </div>
                                <div class="form-group">
                                    <label>USA基準送料 (USD)</label>
                                    <input type="number" id="usaBaseCost" step="0.01" min="0" value="20.00" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
                                </div>
                            </div>
                        </div>
                        
                        <!-- 生成されたポリシー表示 -->
                        <div class="policy-results" id="policyResults" style="display: none;">
                            <h4>生成されたeBayポリシー</h4>
                            <div class="policy-tabs">
                                <button class="policy-tab active" data-service="usa">USA向け送料無料</button>
                                <button class="policy-tab" data-service="other">その他地域向け</button>
                            </div>
                            <div class="policy-content">
                                <textarea id="policyJSON" style="width: 100%; height: 200px;" readonly></textarea>
                                <div class="policy-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                                    <button class="btn btn-success" onclick="copyPolicyToClipboard()">
                                        <i class="fas fa-copy"></i> JSONをコピー
                                    </button>
                                    <button class="btn btn-info" onclick="downloadPolicyCSV()">
                                        <i class="fas fa-download"></i> CSV出力
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
                            <!-- 送料計算タブ -->
                <!-- 送料計算フォーム & 5候補リスト -->
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

                    <!-- 入力フォーム -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-lg);">
                        <!-- 重さ入力 -->
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

                        <!-- 大きさ入力 -->
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

                        <!-- 出荷国選択 -->
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

                    <!-- 5候補カードリスト表示エリア -->
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

                <!-- 送料マトリックス表 -->
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-table"></i>
                        <h3 class="section-title">送料マトリックス表</h3>
                        <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                            <button class="btn btn-info" onclick="loadShippingMatrix()">
                                <i class="fas fa-sync"></i> データ読込
                            </button>
                            <button class="btn btn-secondary" onclick="downloadMatrixCSV()">
                                <i class="fas fa-download"></i> CSV出力
                            </button>
                            <button class="btn btn-warning" onclick="toggleCurrency()" id="currencyToggleBtn">
                                <i class="fas fa-exchange-alt"></i> <span id="currencyDisplay">USD</span>
                            </button>
                        </div>
                    </div>

                    <!-- フィルター機能 -->
                    <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-lg); margin-bottom: var(--space-md);">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-md); align-items: end;">
                            <div>
                                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.3rem; display: block;">配送業者</label>
                                <select id="carrierFilter" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;">
                                    <option value="all">全て</option>
                                    <option value="elogi">eLogi</option>
                                    <option value="cpass">cpass (eBay SpeedPAK)</option>
                                    <option value="jp_post">日本郵便</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.3rem; display: block;">配送方法</label>
                                <select id="serviceFilter" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;">
                                    <option value="all">全て</option>
                                    <option value="fedex_ie">FedEx IE</option>
                                    <option value="fedex_ip">FedEx IP</option>
                                    <option value="speedpak">SpeedPAK</option>
                                    <option value="ems">EMS</option>
                                    <option value="air_mail">航空便</option>
                                </select>
                            </div>
                            <div>
                                <button class="btn btn-primary" onclick="applyMatrixFilter()">
                                    <i class="fas fa-filter"></i> フィルター適用
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- マトリックステーブル -->
                    <div style="overflow-x: auto; margin-bottom: var(--space-md);">
                        <table class="data-table" id="shippingMatrixTable" style="min-width: 1500px;">
                            <thead>
                                <tr>
                                    <th style="width: 120px;">重さ (kg)</th>
                                    <th>アメリカ合衆国</th>
                                    <th>カナダ</th>
                                    <th>オーストラリア</th>
                                    <th>英国</th>
                                    <th>ドイツ</th>
                                    <th>フランス</th>
                                    <th>イタリア</th>
                                    <th>スペイン</th>
                                </tr>
                            </thead>
                            <tbody id="matrixTableBody">
                                <tr>
                                    <td colspan="9" style="text-align: center; padding: var(--space-lg); color: var(--text-muted);">
                                        「データ読込」ボタンを押してマトリックスデータを表示してください。
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 基本設定 -->
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-cogs"></i>
                        <h3 class="section-title">基本設定</h3>
                        <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                            <button class="btn btn-info" onclick="loadShippingSettings()">
                                <i class="fas fa-sync"></i> 設定読込
                            </button>
                            <button class="btn btn-success" onclick="saveShippingSettings()">
                                <i class="fas fa-save"></i> 設定保存
                            </button>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg);">
                        <!-- 基本計算設定 -->
                        <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-lg);">
                            <h4 style="margin-bottom: var(--space-md); color: var(--text-primary); display: flex; align-items: center; gap: var(--space-xs);">
                                <i class="fas fa-calculator"></i>
                                基本計算設定
                            </h4>
                            
                            <div style="display: grid; gap: var(--space-sm);">
                                <div>
                                    <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.3rem;">為替レート (USD/JPY)</label>
                                    <input type="number" id="exchangeRate" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;" value="148.5" step="0.1" min="100" max="200">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.3rem;">デフォルト利益率 (%)</label>
                                    <input type="number" id="defaultProfitMargin" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;" value="25" min="5" max="80">
                                </div>
                            </div>
                        </div>

                        <!-- eBay手数料設定 -->
                        <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-lg);">
                            <h4 style="margin-bottom: var(--space-md); color: var(--text-primary); display: flex; align-items: center; gap: var(--space-xs);">
                                <i class="fas fa-percentage"></i>
                                eBay手数料設定
                            </h4>
                            
                            <div style="display: grid; gap: var(--space-sm);">
                                <div>
                                    <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.3rem;">基本手数料 (%)</label>
                                    <input type="number" id="ebayBaseFee" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;" value="10.0" step="0.1" min="0" max="20">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.3rem;">PayPal手数料 (%)</label>
                                    <input type="number" id="paypalFee" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;" value="3.49" step="0.01" min="0" max="10">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 利益計算タブ -->
            <div id="riekikeisan" class="tab-content fade-in">
                <!-- 基本設定 -->
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-cogs"></i>
                        <h3 class="section-title">基本設定</h3>
                        <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                            <button class="btn btn-info" onclick="loadShippingSettings()">
                                <i class="fas fa-sync"></i> 設定読込
                            </button>
                            <button class="btn btn-success" onclick="saveShippingSettings()">
                                <i class="fas fa-save"></i> 設定保存
                            </button>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg);">
                        <!-- 基本計算設定 -->
                        <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-lg);">
                            <h4 style="margin-bottom: var(--space-md); color: var(--text-primary); display: flex; align-items: center; gap: var(--space-xs);">
                                <i class="fas fa-calculator"></i>
                                基本計算設定
                            </h4>
                            
                            <div style="display: grid; gap: var(--space-sm);">
                                <div>
                                    <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.3rem;">為替レート (USD/JPY)</label>
                                    <input type="number" id="exchangeRate" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;" value="148.5" step="0.1" min="100" max="200">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.3rem;">デフォルト利益率 (%)</label>
                                    <input type="number" id="defaultProfitMargin" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;" value="25" min="5" max="80">
                                </div>
                            </div>
                        </div>

                        <!-- eBay手数料設定 -->
                        <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-lg);">
                            <h4 style="margin-bottom: var(--space-md); color: var(--text-primary); display: flex; align-items: center; gap: var(--space-xs);">
                                <i class="fas fa-percentage"></i>
                                eBay手数料設定
                            </h4>
                            
                            <div style="display: grid; gap: var(--space-sm);">
                                <div>
                                    <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.3rem;">基本手数料 (%)</label>
                                    <input type="number" id="ebayBaseFee" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;" value="10.0" step="0.1" min="0" max="20">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.3rem;">PayPal手数料 (%)</label>
                                    <input type="number" id="paypalFee" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;" value="3.49" step="0.01" min="0" max="10">
                                </div>
                            </div>
                        </div>
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
            
            <!-- 🆕 HTML編集タブ（オリジナルHTML + 差し込みワード対応） -->
            <div id="html-editor" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-code"></i>
                        <h3 class="section-title">HTML編集システム（オリジナル対応）</h3>
                        <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                            <button class="btn btn-success" onclick="saveHTMLTemplate()">
                                <i class="fas fa-save"></i> HTMLテンプレート保存
                            </button>
                            <button class="btn btn-info" onclick="loadSavedTemplates()">
                                <i class="fas fa-folder-open"></i> 保存済み読み込み
                            </button>
                            <button class="btn btn-warning" onclick="generatePreview()">
                                <i class="fas fa-eye"></i> プレビュー
                            </button>
                            <button class="btn btn-primary" onclick="exportToCSV()">
                                <i class="fas fa-download"></i> CSV統合
                            </button>
                        </div>
                    </div>

                    <!-- 使用説明 -->
                    <div class="notification info" style="margin-bottom: var(--space-lg);">
                        <i class="fas fa-lightbulb"></i>
                        <span>
                            <strong>使い方:</strong> オリジナルHTMLを入力し、{{TITLE}}等の差し込みワードを使用。保存後、商品データと統合してCSV出力可能。
                        </span>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 300px; gap: var(--space-lg); min-height: 600px;">
                        
                        <!-- HTML入力エリア -->
                        <div style="display: flex; flex-direction: column;">
                            <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-lg) var(--radius-lg) 0 0;">
                                <h4 style="margin: 0; display: flex; align-items: center; gap: var(--space-xs);">
                                    <i class="fas fa-edit"></i>
                                    オリジナルHTML入力
                                </h4>
                            </div>
                            
                            <div style="flex: 1; display: flex; flex-direction: column; border: 2px solid var(--border-color); border-top: none;">
                                <!-- HTML入力フォーム -->
                                <div style="padding: var(--space-md); border-bottom: 1px solid var(--border-color); background: var(--bg-secondary);">
                                    <div style="display: flex; gap: var(--space-sm); align-items: center; margin-bottom: var(--space-sm);">
                                        <input 
                                            type="text" 
                                            id="templateName" 
                                            placeholder="テンプレート名（例: premium_ebay_template）" 
                                            style="flex: 1; padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md);"
                                        >
                                        <select id="templateCategory" style="padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                                            <option value="general">汎用</option>
                                            <option value="electronics">エレクトロニクス</option>
                                            <option value="fashion">ファッション</option>
                                            <option value="collectibles">コレクタブル</option>
                                        </select>
                                    </div>
                                    <textarea 
                                        id="templateDescription" 
                                        placeholder="テンプレートの説明（任意）"
                                        style="width: 100%; height: 40px; padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md); resize: vertical;"
                                    ></textarea>
                                </div>
                                
                                <!-- HTMLエディター -->
                                <textarea 
                                    id="htmlTemplateEditor" 
                                    placeholder="オリジナルHTMLコードを入力してください...

例:
<div class='product-listing'>
    <h1>{{TITLE}}</h1>
    <div class='price'>${{PRICE}}</div>
    <img src='{{MAIN_IMAGE}}' alt='{{TITLE}}'>
    <div class='description'>{{DESCRIPTION}}</div>
    <div class='specifications'>{{SPECIFICATIONS}}</div>
    <div class='shipping'>{{SHIPPING_INFO}}</div>
</div>"
                                    style="flex: 1; min-height: 400px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 14px; padding: var(--space-md); border: none; resize: none;"
                                ></textarea>
                            </div>
                        </div>
                        
                        <!-- 差し込みワードパネル -->
                        <div style="background: var(--bg-secondary); border: 2px solid var(--border-color); border-radius: var(--radius-lg); display: flex; flex-direction: column;">
                            <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-lg) var(--radius-lg) 0 0;">
                                <h4 style="margin: 0; display: flex; align-items: center; gap: var(--space-xs);">
                                    <i class="fas fa-tags"></i>
                                    差し込みワード
                                </h4>
                            </div>
                            
                            <div style="flex: 1; padding: var(--space-md); overflow-y: auto;">
                                <!-- 基本商品情報 -->
                                <div class="variable-group">
                                    <h5 class="variable-group-title">📋 基本情報</h5>
                                    <div class="variable-tags">
                                        <span class="variable-tag" onclick="insertVariable('{{TITLE}}')">商品タイトル</span>
                                        <span class="variable-tag" onclick="insertVariable('{{PRICE}}')">販売価格</span>
                                        <span class="variable-tag" onclick="insertVariable('{{BRAND}}')">ブランド名</span>
                                        <span class="variable-tag" onclick="insertVariable('{{CONDITION}}')">商品状態</span>
                                        <span class="variable-tag" onclick="insertVariable('{{DESCRIPTION}}')">商品説明</span>
                                        <span class="variable-tag" onclick="insertVariable('{{MODEL_NUMBER}}')">型番</span>
                                        <span class="variable-tag" onclick="insertVariable('{{COLOR}}')">色</span>
                                        <span class="variable-tag" onclick="insertVariable('{{SIZE}}')">サイズ</span>
                                    </div>
                                </div>

                                <!-- 画像関連 -->
                                <div class="variable-group">
                                    <h5 class="variable-group-title">🖼️ 画像</h5>
                                    <div class="variable-tags">
                                        <span class="variable-tag" onclick="insertVariable('{{MAIN_IMAGE}}')">メイン画像</span>
                                        <span class="variable-tag" onclick="insertVariable('{{IMAGE_GALLERY}}')">画像ギャラリー</span>
                                        <span class="variable-tag" onclick="insertVariable('{{IMAGE_1}}')">追加画像1</span>
                                        <span class="variable-tag" onclick="insertVariable('{{IMAGE_2}}')">追加画像2</span>
                                        <span class="variable-tag" onclick="insertVariable('{{IMAGE_3}}')">追加画像3</span>
                                    </div>
                                </div>

                                <!-- 仕様・詳細 -->
                                <div class="variable-group">
                                    <h5 class="variable-group-title">⚙️ 仕様</h5>
                                    <div class="variable-tags">
                                        <span class="variable-tag" onclick="insertVariable('{{SPECIFICATIONS}}')">仕様表</span>
                                        <span class="variable-tag" onclick="insertVariable('{{UPC}}')">UPCコード</span>
                                        <span class="variable-tag" onclick="insertVariable('{{EAN}}')">EANコード</span>
                                        <span class="variable-tag" onclick="insertVariable('{{WEIGHT}}')">重量</span>
                                        <span class="variable-tag" onclick="insertVariable('{{DIMENSIONS}}')">寸法</span>
                                    </div>
                                </div>

                                <!-- 配送・価格情報 -->
                                <div class="variable-group">
                                    <h5 class="variable-group-title">🚚 配送</h5>
                                    <div class="variable-tags">
                                        <span class="variable-tag" onclick="insertVariable('{{SHIPPING_INFO}}')">配送情報</span>
                                        <span class="variable-tag" onclick="insertVariable('{{SHIPPING_COST}}')">送料</span>
                                        <span class="variable-tag" onclick="insertVariable('{{RETURN_POLICY}}')">返品ポリシー</span>
                                        <span class="variable-tag" onclick="insertVariable('{{WARRANTY}}')">保証情報</span>
                                    </div>
                                </div>

                                <!-- システム・その他 -->
                                <div class="variable-group">
                                    <h5 class="variable-group-title">🔧 システム</h5>
                                    <div class="variable-tags">
                                        <span class="variable-tag" onclick="insertVariable('{{SELLER_INFO}}')">販売者情報</span>
                                        <span class="variable-tag" onclick="insertVariable('{{CURRENT_DATE}}')">現在日付</span>
                                        <span class="variable-tag" onclick="insertVariable('{{CURRENCY}}')">通貨記号</span>
                                        <span class="variable-tag" onclick="insertVariable('{{LOCATION}}')">発送元</span>
                                    </div>
                                </div>

                                <!-- クイックテンプレート -->
                                <div class="variable-group">
                                    <h5 class="variable-group-title">⚡ クイック挿入</h5>
                                    <button class="template-quick-btn" onclick="insertQuickTemplate('basic')">
                                        <i class="fas fa-lightning-bolt"></i> 基本テンプレート
                                    </button>
                                    <button class="template-quick-btn" onclick="insertQuickTemplate('premium')">
                                        <i class="fas fa-crown"></i> プレミアム
                                    </button>
                                    <button class="template-quick-btn" onclick="insertQuickTemplate('minimal')">
                                        <i class="fas fa-feather-alt"></i> ミニマル
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 保存済みテンプレート一覧 -->
                    <div style="margin-top: var(--space-lg);">
                        <div class="section-header">
                            <i class="fas fa-folder"></i>
                            <h4 style="margin: 0;">保存済みテンプレート</h4>
                            <div style="margin-left: auto;">
                                <button class="btn btn-sm btn-info" onclick="loadSavedTemplates()">
                                    <i class="fas fa-sync"></i> 更新
                                </button>
                            </div>
                        </div>
                        
                        <div id="savedTemplatesList" class="saved-templates-grid">
                            <!-- 保存済みテンプレートカード -->
                            <div class="template-card">
                                <div class="template-card-header">
                                    <h5>サンプルテンプレート</h5>
                                    <div class="template-card-actions">
                                        <button class="btn-sm btn-primary" onclick="loadTemplate(1)">読み込み</button>
                                        <button class="btn-sm btn-danger" onclick="deleteTemplate(1)">削除</button>
                                    </div>
                                </div>
                                <div class="template-card-body">
                                    <div class="template-category">汎用</div>
                                    <div class="template-description">基本的なeBay商品説明テンプレート</div>
                                    <div class="template-meta">
                                        <span>作成日: 2025-09-12</span>
                                        <span>変数: 15個</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 追加カードはJavaScriptで動的生成 -->
                            <div class="template-card template-card-new" onclick="document.getElementById('templateName').focus();">
                                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                                    <i class="fas fa-plus-circle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                                    <div>新しいテンプレート作成</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- プレビューエリア -->
                    <div style="margin-top: var(--space-lg);">
                        <div class="section-header">
                            <i class="fas fa-eye"></i>
                            <h4 style="margin: 0;">HTMLプレビュー</h4>
                            <div style="margin-left: auto; display: flex; gap: var(--space-xs);">
                                <select id="previewSampleData" style="padding: 0.25rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                                    <option value="iphone">iPhone サンプル</option>
                                    <option value="camera">カメラ サンプル</option>
                                    <option value="watch">腕時計 サンプル</option>
                                </select>
                                <button class="btn btn-sm btn-warning" onclick="generatePreview()">
                                    <i class="fas fa-play"></i> プレビュー生成
                                </button>
                            </div>
                        </div>
                        
                        <div id="htmlPreviewContainer" style="background: var(--bg-secondary); border: 2px solid var(--border-color); border-radius: var(--radius-lg); min-height: 300px; overflow: auto;">
                            <div style="padding: var(--space-lg); text-align: center; color: var(--text-muted);">
                                <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: var(--space-sm);"></i>
                                <div>HTMLテンプレートを入力して「プレビュー生成」ボタンを押してください</div>
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
<script src="js/yahoo_auction_tool_complete.js"></script>
</body>
</html>
