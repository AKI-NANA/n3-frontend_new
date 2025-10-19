<?php
/**
 * TCG統合スクレイピングAPI
 * 
 * 11サイト対応の統一APIエンドポイント
 * Yahoo Auction統合システムのAPI設計を継承
 * 
 * @version 1.0.0
 * @created 2025-09-26
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// データベース接続
require_once __DIR__ . '/../../shared/core/database.php';

// プラットフォーム判定
require_once __DIR__ . '/../common/TCGPlatformDetector.php';

// 各スクレイパー読み込み
require_once __DIR__ . '/../platforms/singlestar/SingleStarScraper.php';
require_once __DIR__ . '/../platforms/hareruya_mtg/HareruyaMTGScraper.php';
require_once __DIR__ . '/../platforms/hareruya2/Hareruya2Scraper.php';
require_once __DIR__ . '/../platforms/hareruya3/Hareruya3Scraper.php';
require_once __DIR__ . '/../platforms/fullahead/FullaheadScraper.php';
require_once __DIR__ . '/../platforms/cardrush/CardRushScraper.php';
require_once __DIR__ . '/../platforms/yuyu_tei/YuyuTeiScraper.php';
require_once __DIR__ . '/../platforms/furu1/Furu1Scraper.php';
require_once __DIR__ . '/../platforms/pokeca_net/PokecaNetScraper.php';
require_once __DIR__ . '/../platforms/dorasuta/DorastaScraper.php';
require_once __DIR__ . '/../platforms/snkrdunk/SnkrdunkScraper.php';

// ============================================
// メイン処理
// ============================================

try {
    $pdo = getDBConnection();
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'scrape':
            handleScrape($pdo);
            break;
            
        case 'batch_scrape':
            handleBatchScrape($pdo);
            break;
            
        case 'detect_platform':
            handleDetectPlatform();
            break;
            
        case 'get_platforms':
            handleGetPlatforms();
            break;
            
        case 'get_stats':
            handleGetStats($pdo);
            break;
            
        default:
            sendError('無効なアクション', 400);
    }
    
} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}

// ============================================
// 単一URLスクレイピング
// ============================================

function handleScrape($pdo) {
    $url = $_POST['url'] ?? $_GET['url'] ?? '';
    
    if (empty($url)) {
        sendError('URLが指定されていません', 400);
    }
    
    writeLog("スクレイピング開始: {$url}", 'INFO');
    
    try {
        $result = executeTCGScraping($url, $pdo);
        sendSuccess($result);
        
    } catch (Exception $e) {
        sendError('スクレイピングエラー: ' . $e->getMessage(), 500);
    }
}

// ============================================
// 一括URLスクレイピング
// ============================================

function handleBatchScrape($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    $urls = $input['urls'] ?? [];
    
    if (empty($urls) || !is_array($urls)) {
        sendError('URLリストが無効です', 400);
    }
    
    writeLog("バッチスクレイピング開始: " . count($urls) . "件", 'INFO');
    
    $results = [];
    $successCount = 0;
    $errorCount = 0;
    
    foreach ($urls as $url) {
        try {
            $result = executeTCGScraping($url, $pdo);
            $results[] = $result;
            
            if ($result['success']) {
                $successCount++;
            } else {
                $errorCount++;
            }
            
            // レート制限対応
            usleep(500000); // 0.5秒待機
            
        } catch (Exception $e) {
            $errorCount++;
            $results[] = [
                'success' => false,
                'error' => $e->getMessage(),
                'url' => $url
            ];
        }
    }
    
    sendSuccess([
        'total' => count($urls),
        'success' => $successCount,
        'error' => $errorCount,
        'results' => $results
    ]);
}

// ============================================
// プラットフォーム判定
// ============================================

function handleDetectPlatform() {
    $url = $_GET['url'] ?? '';
    
    if (empty($url)) {
        sendError('URLが指定されていません', 400);
    }
    
    $detector = new TCGPlatformDetector();
    $result = $detector->detectPlatform($url);
    
    sendSuccess($result);
}

// ============================================
// プラットフォーム一覧取得
// ============================================

function handleGetPlatforms() {
    $detector = new TCGPlatformDetector();
    $platforms = $detector->getSupportedPlatforms();
    
    sendSuccess([
        'total' => count($platforms),
        'platforms' => $platforms
    ]);
}

// ============================================
// 統計情報取得
// ============================================

function handleGetStats($pdo) {
    $stmt = $pdo->query("
        SELECT 
            platform,
            tcg_category,
            COUNT(*) as total,
            COUNT(CASE WHEN stock_status = 'in_stock' THEN 1 END) as in_stock,
            COUNT(CASE WHEN stock_status = 'sold_out' THEN 1 END) as sold_out,
            AVG(price) as avg_price,
            MIN(price) as min_price,
            MAX(price) as max_price,
            MAX(updated_at) as last_updated
        FROM tcg_products
        GROUP BY platform, tcg_category
        ORDER BY platform, tcg_category
    ");
    
    $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    sendSuccess([
        'stats' => $stats,
        'total_products' => array_sum(array_column($stats, 'total'))
    ]);
}

// ============================================
// TCGスクレイピング実行
// ============================================

function executeTCGScraping($url, $pdo) {
    // プラットフォーム判定
    $detector = new TCGPlatformDetector();
    $detection = $detector->detectPlatform($url);
    
    if ($detection['platform'] === 'unknown') {
        throw new Exception('対応していないプラットフォームです: ' . $url);
    }
    
    $platform = $detection['platform'];
    writeLog("プラットフォーム判定: {$platform}", 'INFO');
    
    // スクレイパー取得
    $scraper = getScraperForPlatform($platform, $pdo);
    
    if (!$scraper) {
        throw new Exception("スクレイパーが見つかりません: {$platform}");
    }
    
    // スクレイピング実行
    $result = $scraper->scrapeProduct($url);
    
    return $result;
}

// ============================================
// プラットフォーム別スクレイパー取得
// ============================================

function getScraperForPlatform($platform, $pdo) {
    $scraperMap = [
        'singlestar' => 'SingleStarScraper',
        'hareruya_mtg' => 'HareruyaMTGScraper',
        'hareruya2' => 'Hareruya2Scraper',
        'hareruya3' => 'Hareruya3Scraper',
        'fullahead' => 'FullaheadScraper',
        'cardrush' => 'CardRushScraper',
        'yuyu_tei' => 'YuyuTeiScraper',
        'furu1' => 'Furu1Scraper',
        'pokeca_net' => 'PokecaNetScraper',
        'dorasuta' => 'DorastaScraper',
        'snkrdunk' => 'SnkrdunkScraper'
    ];
    
    if (!isset($scraperMap[$platform])) {
        return null;
    }
    
    $className = $scraperMap[$platform];
    
    if (!class_exists($className)) {
        writeLog("クラスが見つかりません: {$className}", 'ERROR');
        return null;
    }
    
    return new $className($pdo);
}

// ============================================
// レスポンス送信
// ============================================

function sendSuccess($data) {
    echo json_encode([
        'success' => true,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function sendError($message, $code = 500) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// ============================================
// ログ出力
// ============================================

function writeLog($message, $level = 'INFO') {
    $logDir = __DIR__ . '/../../logs/api';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/' . date('Y-m-d') . '_api.log';
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    
    file_put_contents($logFile, $logMessage, FILE_APPEND);
}

// ============================================
// 使用例（コメント）
// ============================================

/*
// 単一URLスクレイピング
curl -X POST "http://localhost/api/tcg_unified_scraping_api.php?action=scrape" \
  -d "url=https://www.singlestar.jp/product/12345"

// 一括スクレイピング
curl -X POST "http://localhost/api/tcg_unified_scraping_api.php?action=batch_scrape" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://www.singlestar.jp/product/123",
      "https://www.hareruyamtg.com/ja/products/456",
      "https://pokemon-card-fullahead.com/product/789"
    ]
  }'

// プラットフォーム判定
curl "http://localhost/api/tcg_unified_scraping_api.php?action=detect_platform&url=https://www.singlestar.jp/product/123"

// プラットフォーム一覧
curl "http://localhost/api/tcg_unified_scraping_api.php?action=get_platforms"

// 統計情報
curl "http://localhost/api/tcg_unified_scraping_api.php?action=get_stats"
*/
