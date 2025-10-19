<?php
/**
 * 統合スクレイピングAPI
 * 
 * 作成日: 2025-09-25
 * 用途: 全プラットフォーム統合スクレイピングAPIエンドポイント
 * 場所: 02_scraping/api/unified_scraping.php
 */

// エラーレポートとクリーンな出力設定
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

ob_start();

// 共通ファイル読み込み
require_once __DIR__ . '/../../shared/core/includes.php';
require_once __DIR__ . '/../common/ScrapingManager.php';

// データベース接続の初期化
$pdo = null;
try {
    if (defined('DB_DSN')) {
        $pdo = new PDO(DB_DSN, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        ]);
    }
} catch (PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
}

// スクレイピングマネージャーの初期化
$scrapingManager = ScrapingManagerFactory::create($pdo);

/**
 * クリーンなJSON応答を送信
 * 
 * @param mixed $data レスポンスデータ
 * @param bool $success 成功フラグ
 * @param string $message メッセージ
 * @param int $httpCode HTTPステータスコード
 */
function sendJsonResponse($data, $success = true, $message = '', $httpCode = 200) {
    ob_clean();
    http_response_code($httpCode);
    
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('c'),
        'api_version' => '2.0.0',
        'endpoint' => 'unified_scraping'
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * エラー応答を送信
 * 
 * @param string $message エラーメッセージ
 * @param int $code エラーコード
 * @param array $details 詳細情報
 */
function sendErrorResponse($message, $code = 400, $details = []) {
    sendJsonResponse(
        ['error_code' => $code, 'details' => $details], 
        false, 
        $message, 
        $code >= 500 ? 500 : 400
    );
}

/**
 * リクエストパラメータを取得・検証
 * 
 * @param string $key パラメータキー
 * @param mixed $default デフォルト値
 * @param bool $required 必須フラグ
 * @return mixed パラメータ値
 */
function getRequestParam($key, $default = null, $required = false) {
    $value = $_POST[$key] ?? $_GET[$key] ?? $default;
    
    if ($required && ($value === null || $value === '')) {
        sendErrorResponse("Required parameter missing: {$key}", 400);
    }
    
    return $value;
}

/**
 * リクエスト制限チェック
 * 
 * @param string $identifier クライアント識別子
 * @return bool 制限内かどうか
 */
function checkRateLimit($identifier) {
    // 簡易的なレート制限実装（将来的にはRedisなどを使用）
    $rateFile = __DIR__ . '/../logs/common/rate_limit.json';
    $currentTime = time();
    $windowSize = 3600; // 1時間
    $maxRequests = 1000; // 1時間あたり最大リクエスト数
    
    $rateLimitData = [];
    if (file_exists($rateFile)) {
        $rateLimitData = json_decode(file_get_contents($rateFile), true) ?? [];
    }
    
    // 古いデータをクリーンアップ
    $rateLimitData = array_filter($rateLimitData, function($data) use ($currentTime, $windowSize) {
        return ($currentTime - $data['timestamp']) < $windowSize;
    });
    
    // 現在のクライアントのリクエスト数をチェック
    $clientRequests = array_filter($rateLimitData, function($data) use ($identifier) {
        return $data['identifier'] === $identifier;
    });
    
    if (count($clientRequests) >= $maxRequests) {
        return false;
    }
    
    // 新しいリクエストを記録
    $rateLimitData[] = [
        'identifier' => $identifier,
        'timestamp' => $currentTime
    ];
    
    file_put_contents($rateFile, json_encode($rateLimitData));
    return true;
}

// メイン処理開始
try {
    // OPTIONS リクエストの処理（CORS対応）
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
    
    // レート制限チェック
    $clientIdentifier = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if (!checkRateLimit($clientIdentifier)) {
        sendErrorResponse('Rate limit exceeded. Please try again later.', 429);
    }
    
    // アクション取得
    $action = getRequestParam('action', '', true);
    
    // パフォーマンス測定開始
    $startTime = microtime(true);
    $startMemory = memory_get_usage();
    
    switch ($action) {
        case 'scrape':
            handleScrapeAction();
            break;
            
        case 'batch_scrape':
            handleBatchScrapeAction();
            break;
            
        case 'detect_platform':
            handleDetectPlatformAction();
            break;
            
        case 'get_stats':
            handleGetStatsAction();
            break;
            
        case 'get_supported_platforms':
            handleGetSupportedPlatformsAction();
            break;
            
        case 'health_check':
            handleHealthCheckAction();
            break;
            
        case 'get_recent_products':
            handleGetRecentProductsAction();
            break;
            
        case 'validate_data':
            handleValidateDataAction();
            break;
            
        default:
            sendErrorResponse("Invalid action: {$action}", 400);
    }
    
} catch (Exception $e) {
    error_log('API Error: ' . $e->getMessage());
    sendErrorResponse('Internal server error', 500, [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}

/**
 * 単一URLスクレイピングアクション
 */
function handleScrapeAction() {
    global $scrapingManager;
    
    $url = getRequestParam('url', '', true);
    $options = json_decode(getRequestParam('options', '{}'), true) ?? [];
    
    // URL検証
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        sendErrorResponse('Invalid URL format', 400);
    }
    
    $result = $scrapingManager->scrapeUrl($url, $options);
    
    if ($result['success']) {
        sendJsonResponse($result['data'], true, 'Scraping completed successfully');
    } else {
        sendErrorResponse($result['error'] ?? 'Scraping failed', 422, $result);
    }
}

/**
 * 一括スクレイピングアクション
 */
function handleBatchScrapeAction() {
    global $scrapingManager;
    
    $urls = getRequestParam('urls', [], true);
    $options = json_decode(getRequestParam('options', '{}'), true) ?? [];
    
    // URLs の形式チェック
    if (is_string($urls)) {
        $urls = array_filter(array_map('trim', explode("\n", $urls)));
    }
    
    if (!is_array($urls) || empty($urls)) {
        sendErrorResponse('URLs must be provided as array or newline-separated string', 400);
    }
    
    if (count($urls) > 100) {
        sendErrorResponse('Maximum 100 URLs allowed per batch', 400);
    }
    
    // URL検証
    foreach ($urls as $url) {
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            sendErrorResponse("Invalid URL format: {$url}", 400);
        }
    }
    
    $result = $scrapingManager->scrapeBatch($urls, $options);
    
    sendJsonResponse($result, $result['success'], 
        "Batch scraping completed: {$result['stats']['success']}/{$result['stats']['total']} successful"
    );
}

/**
 * プラットフォーム判定アクション
 */
function handleDetectPlatformAction() {
    global $scrapingManager;
    
    $url = getRequestParam('url', '', true);
    $detailed = getRequestParam('detailed', false);
    
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        sendErrorResponse('Invalid URL format', 400);
    }
    
    $detector = new PlatformDetector();
    
    if ($detailed) {
        $result = $detector->detectWithDetails($url);
    } else {
        $result = ['platform' => $detector->detect($url)];
    }
    
    sendJsonResponse($result, true, 'Platform detection completed');
}

/**
 * 統計取得アクション
 */
function handleGetStatsAction() {
    global $scrapingManager;
    
    $result = $scrapingManager->getPlatformStats();
    
    if ($result['success']) {
        sendJsonResponse($result, true, 'Statistics retrieved successfully');
    } else {
        sendErrorResponse($result['error'] ?? 'Failed to retrieve statistics', 500);
    }
}

/**
 * サポートプラットフォーム取得アクション
 */
function handleGetSupportedPlatformsAction() {
    global $scrapingManager;
    
    $platforms = $scrapingManager->getSupportedPlatforms();
    
    sendJsonResponse($platforms, true, 'Supported platforms retrieved successfully');
}

/**
 * ヘルスチェックアクション
 */
function handleHealthCheckAction() {
    global $scrapingManager;
    
    $result = $scrapingManager->healthCheck();
    
    sendJsonResponse($result, $result['success'], 
        $result['success'] ? 'System is healthy' : 'System has issues'
    );
}

/**
 * 最近の商品取得アクション
 */
function handleGetRecentProductsAction() {
    global $pdo;
    
    if (!$pdo) {
        sendErrorResponse('Database connection required', 500);
    }
    
    $limit = min(intval(getRequestParam('limit', 20)), 100);
    $platform = getRequestParam('platform', '');
    
    try {
        $sql = "SELECT * FROM yahoo_scraped_products";
        $params = [];
        
        if (!empty($platform)) {
            $sql .= " WHERE platform = ?";
            $params[] = $platform;
        }
        
        $sql .= " ORDER BY scraped_at DESC LIMIT ?";
        $params[] = $limit;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // JSON フィールドをデコード
        foreach ($products as &$product) {
            $jsonFields = ['images', 'seller_info', 'categories', 'rating_info', 'shipping_info'];
            foreach ($jsonFields as $field) {
                if (isset($product[$field])) {
                    $product[$field] = json_decode($product[$field], true) ?? [];
                }
            }
        }
        
        sendJsonResponse($products, true, 'Recent products retrieved successfully');
        
    } catch (Exception $e) {
        sendErrorResponse('Failed to retrieve products: ' . $e->getMessage(), 500);
    }
}

/**
 * データ検証アクション
 */
function handleValidateDataAction() {
    $data = json_decode(getRequestParam('data', '{}'), true);
    $platform = getRequestParam('platform', '');
    
    if (empty($data)) {
        sendErrorResponse('Data is required for validation', 400);
    }
    
    $validator = new DataValidator();
    $isValid = $validator->validate($data, $platform);
    
    $result = [
        'valid' => $isValid,
        'errors' => $validator->getErrors(),
        'warnings' => $validator->getWarnings(),
        'quality_score' => $validator->calculateQualityScore($data, $platform)
    ];
    
    sendJsonResponse($result, true, 'Data validation completed');
}

// パフォーマンス測定終了
$endTime = microtime(true);
$endMemory = memory_get_usage();
$executionTime = round(($endTime - $startTime) * 1000, 2);
$memoryUsage = round(($endMemory - $startMemory) / 1024, 2);

// レスポンスヘッダーに パフォーマンス情報を追加
header("X-Execution-Time: {$executionTime}ms");
header("X-Memory-Usage: {$memoryUsage}KB");
?>