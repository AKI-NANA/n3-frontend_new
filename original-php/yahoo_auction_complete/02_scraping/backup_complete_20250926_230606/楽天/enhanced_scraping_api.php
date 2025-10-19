<?php
/**
 * 楽天対応スクレイピングAPI
 * 
 * 作成日: 2025-09-25
 * 用途: Yahoo + 楽天 + その他ECサイト対応スクレイピング
 */

// エラーレポートとクリーンな出力設定
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=UTF-8');
ob_start();

// 共通ファイル読み込み
if (file_exists('../shared/core/includes.php')) {
    require_once '../shared/core/includes.php';
}

// スクレイピング関連ファイル読み込み
require_once __DIR__ . '/yahoo_parser_v2025.php';
require_once __DIR__ . '/rakuten_parser_v2025.php';
require_once __DIR__ . '/includes/YahooScraper.php';
require_once __DIR__ . '/includes/RakutenScraper.php';

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
    writeLog('データベース接続失敗: ' . $e->getMessage(), 'ERROR');
}

// クリーンなJSON応答関数
function sendCleanJsonResponse($data, $success = true, $message = '') {
    ob_clean();
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'api_version' => 'enhanced_v2025'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ログ出力関数
if (!function_exists('writeLog')) {
    function writeLog($message, $type = 'INFO') {
        $timestamp = date('Y-m-d H:i:s');
        $log_message = "[{$timestamp}] [{$type}] {$message}" . PHP_EOL;
        
        $log_dir = __DIR__ . '/logs/scraping/';
        if (!is_dir($log_dir)) {
            mkdir($log_dir, 0755, true);
        }
        
        file_put_contents($log_dir . 'enhanced_' . date('Y-m-d') . '.log', $log_message, FILE_APPEND);
        error_log($log_message);
    }
}

// プラットフォーム判定関数
function detectPlatform($url) {
    if (strpos($url, 'auctions.yahoo.co.jp') !== false) {
        return 'yahoo_auction';
    } elseif (strpos($url, 'rakuten.co.jp') !== false) {
        return 'rakuten';
    } elseif (strpos($url, 'mercari.com') !== false) {
        return 'mercari';
    } elseif (strpos($url, 'paypayfleamarket.yahoo.co.jp') !== false) {
        return 'paypayfleamarket';
    } elseif (strpos($url, 'pokemoncenter-online.com') !== false) {
        return 'pokemon_center';
    } elseif (strpos($url, 'yodobashi.com') !== false) {
        return 'yodobashi';
    } elseif (strpos($url, 'golfdo.com') !== false) {
        return 'golfdo';
    } else {
        return 'unknown';
    }
}

// マルチプラットフォームスクレイピング実行
function executeMultiPlatformScraping($url) {
    global $pdo;
    
    try {
        $platform = detectPlatform($url);
        writeLog("プラットフォーム判定: {$platform} - {$url}", 'INFO');
        
        switch ($platform) {
            case 'yahoo_auction':
                return executeYahooScraping($url, $pdo);
                
            case 'rakuten':
                return executeRakutenScraping($url, $pdo);
                
            case 'mercari':
                return executeMercariScraping($url, $pdo);
                
            case 'paypayfleamarket':
                return executePayPayFleaMarketScraping($url, $pdo);
                
            case 'pokemon_center':
                return executePokemonCenterScraping($url, $pdo);
                
            case 'yodobashi':
                return executeYodobashiScraping($url, $pdo);
                
            case 'golfdo':
                return executeGolfdoScraping($url, $pdo);
                
            default:
                throw new Exception("未対応のプラットフォームです: {$platform}");
        }
        
    } catch (Exception $e) {
        writeLog("マルチプラットフォームスクレイピングエラー: " . $e->getMessage(), 'ERROR');
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'platform' => $platform ?? 'unknown'
        ];
    }
}

// Yahoo オークションスクレイピング
function executeYahooScraping($url, $pdo) {
    writeLog("Yahoo オークションスクレイピング開始: {$url}", 'INFO');
    
    try {
        // 既存のYahoo スクレイピング機能を使用
        if (class_exists('YahooScraper')) {
            $scraper = new YahooScraper($pdo);
            return $scraper->scrapeProduct($url);
        } else {
            // フォールバック: 関数ベースのスクレイピング
            $item_id = extractItemIdFromYahooUrl($url);
            $html = fetchHtml($url);
            
            if (!$html) {
                throw new Exception("Yahoo HTML取得失敗");
            }
            
            $data = parseYahooAuctionHTML_V2025($html, $url, $item_id);
            
            return [
                'success' => true,
                'data' => $data,
                'platform' => 'yahoo_auction'
            ];
        }
        
    } catch (Exception $e) {
        writeLog("Yahoo スクレイピングエラー: " . $e->getMessage(), 'ERROR');
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'platform' => 'yahoo_auction'
        ];
    }
}

// 楽天スクレイピング
function executeRakutenScraping($url, $pdo) {
    writeLog("楽天スクレイピング開始: {$url}", 'INFO');
    
    try {
        $scraper = new RakutenScraper($pdo);
        return $scraper->scrapeProduct($url);
        
    } catch (Exception $e) {
        writeLog("楽天スクレイピングエラー: " . $e->getMessage(), 'ERROR');
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'platform' => 'rakuten'
        ];
    }
}

// メルカリスクレイピング（プレースホルダー）
function executeMercariScraping($url, $pdo) {
    writeLog("メルカリスクレイピング（未実装）: {$url}", 'WARNING');
    return [
        'success' => false,
        'error' => 'メルカリスクレイピングは実装予定です',
        'platform' => 'mercari'
    ];
}

// PayPayフリマスクレイピング（プレースホルダー）
function executePayPayFleaMarketScraping($url, $pdo) {
    writeLog("PayPayフリマスクレイピング（未実装）: {$url}", 'WARNING');
    return [
        'success' => false,
        'error' => 'PayPayフリマスクレイピングは実装予定です',
        'platform' => 'paypayfleamarket'
    ];
}

// ポケモンセンタースクレイピング（プレースホルダー）
function executePokemonCenterScraping($url, $pdo) {
    writeLog("ポケモンセンタースクレイピング（未実装）: {$url}", 'WARNING');
    return [
        'success' => false,
        'error' => 'ポケモンセンタースクレイピングは実装予定です',
        'platform' => 'pokemon_center'
    ];
}

// ヨドバシスクレイピング（プレースホルダー）
function executeYodobashiScraping($url, $pdo) {
    writeLog("ヨドバシスクレイピング（未実装）: {$url}", 'WARNING');
    return [
        'success' => false,
        'error' => 'ヨドバシスクレイピングは実装予定です',
        'platform' => 'yodobashi'
    ];
}

// ゴルフドゥスクレイピング（プレースホルダー）
function executeGolfdoScraping($url, $pdo) {
    writeLog("ゴルフドゥスクレイピング（未実装）: {$url}", 'WARNING');
    return [
        'success' => false,
        'error' => 'ゴルフドゥスクレイピングは実装予定です',
        'platform' => 'golfdo'
    ];
}

// バッチ処理（複数URL）
function executeBatchScraping($urls) {
    $results = [];
    $success_count = 0;
    $error_count = 0;
    
    writeLog("バッチスクレイピング開始: " . count($urls) . "件", 'INFO');
    
    foreach ($urls as $index => $url) {
        try {
            writeLog("バッチ処理進行中: " . ($index + 1) . "/" . count($urls), 'INFO');
            
            $result = executeMultiPlatformScraping($url);
            $results[] = $result;
            
            if ($result['success']) {
                $success_count++;
            } else {
                $error_count++;
            }
            
            // リクエスト間隔（サーバー負荷軽減）
            if ($index < count($urls) - 1) {
                sleep(2);
            }
            
        } catch (Exception $e) {
            $error_count++;
            $results[] = [
                'success' => false,
                'error' => $e->getMessage(),
                'url' => $url
            ];
            writeLog("バッチ処理エラー: {$url} - " . $e->getMessage(), 'ERROR');
        }
    }
    
    writeLog("バッチスクレイピング完了: 成功{$success_count}件、エラー{$error_count}件", 'INFO');
    
    return [
        'success' => $success_count > 0,
        'results' => $results,
        'summary' => [
            'total' => count($urls),
            'success_count' => $success_count,
            'error_count' => $error_count,
            'success_rate' => $success_count > 0 ? round(($success_count / count($urls)) * 100, 2) : 0
        ]
    ];
}

// APIエンドポイント処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

if (!empty($action)) {
    switch ($action) {
        case 'scrape':
            $url = $_POST['url'] ?? '';
            if (empty($url)) {
                sendCleanJsonResponse(null, false, 'URLが指定されていません');
            }
            
            writeLog("スクレイピング開始: {$url}", 'INFO');
            $result = executeMultiPlatformScraping($url);
            
            if ($result['success']) {
                writeLog("スクレイピング成功: {$url}", 'SUCCESS');
                sendCleanJsonResponse($result['data'], true, 'スクレイピング成功');
            } else {
                writeLog("スクレイピング失敗: {$url} - " . $result['error'], 'ERROR');
                sendCleanJsonResponse(null, false, $result['error']);
            }
            break;
            
        case 'batch_scrape':
            $urls = $_POST['urls'] ?? [];
            if (empty($urls)) {
                sendCleanJsonResponse(null, false, 'URLリストが指定されていません');
            }
            
            // 文字列の場合は配列に変換（改行区切り）
            if (is_string($urls)) {
                $urls = array_filter(array_map('trim', explode("\n", $urls)));
            }
            
            $result = executeBatchScraping($urls);
            sendCleanJsonResponse($result, $result['success'], 
                "バッチ処理完了: 成功{$result['summary']['success_count']}件、エラー{$result['summary']['error_count']}件");
            break;
            
        case 'test_connection':
            writeLog('API接続テスト開始', 'INFO');
            
            try {
                $test_results = [
                    'database' => $pdo ? 'OK' : 'NG',
                    'yahoo_parser' => function_exists('parseYahooAuctionHTML_V2025') ? 'OK' : 'NG',
                    'rakuten_parser' => function_exists('parseRakutenProductHTML_V2025') ? 'OK' : 'NG',
                    'yahoo_scraper' => class_exists('YahooScraper') ? 'OK' : 'NG',
                    'rakuten_scraper' => class_exists('RakutenScraper') ? 'OK' : 'NG'
                ];
                
                $all_ok = !in_array('NG', $test_results);
                
                writeLog('API接続テスト完了: ' . ($all_ok ? '成功' : '失敗'), $all_ok ? 'SUCCESS' : 'WARNING');
                sendCleanJsonResponse($test_results, $all_ok, 
                    $all_ok ? '全ての機能が正常です' : '一部機能に問題があります');
                
            } catch (Exception $e) {
                writeLog('API接続テストエラー: ' . $e->getMessage(), 'ERROR');
                sendCleanJsonResponse(null, false, 'テストエラー: ' . $e->getMessage());
            }
            break;
            
        case 'get_stats':
            try {
                if ($pdo) {
                    $stmt = $pdo->query("
                        SELECT 
                            COUNT(*) as total_products,
                            COUNT(CASE WHEN platform = 'yahoo_auction' THEN 1 END) as yahoo_products,
                            COUNT(CASE WHEN platform = 'rakuten' THEN 1 END) as rakuten_products,
                            COUNT(CASE WHEN platform = 'mercari' THEN 1 END) as mercari_products,
                            AVG(current_price) as avg_price,
                            MAX(scraped_at) as last_scraped
                        FROM yahoo_scraped_products
                    ");
                    
                    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
                    sendCleanJsonResponse($stats, true, '統計データ取得成功');
                } else {
                    sendCleanJsonResponse(null, false, 'データベース接続が必要です');
                }
            } catch (Exception $e) {
                sendCleanJsonResponse(null, false, '統計取得エラー: ' . $e->getMessage());
            }
            break;
            
        default:
            sendCleanJsonResponse(null, false, '無効なアクションです');
    }
} else {
    // アクションが指定されていない場合のヘルプ
    $help = [
        'api_name' => 'Enhanced Multi-Platform Scraping API',
        'version' => '2025.1.0',
        'supported_platforms' => [
            'yahoo_auction' => 'Yahoo オークション',
            'rakuten' => '楽天市場',
            'mercari' => 'メルカリ（実装予定）',
            'paypayfleamarket' => 'PayPayフリマ（実装予定）',
            'pokemon_center' => 'ポケモンセンター（実装予定）',
            'yodobashi' => 'ヨドバシカメラ（実装予定）',
            'golfdo' => 'ゴルフドゥ（実装予定）'
        ],
        'available_actions' => [
            'scrape' => '単一URLスクレイピング（url パラメータ必須）',
            'batch_scrape' => '一括スクレイピング（urls パラメータ必須）',
            'test_connection' => 'API接続テスト',
            'get_stats' => 'スクレイピング統計取得'
        ]
    ];
    
    sendCleanJsonResponse($help, true, 'Enhanced Multi-Platform Scraping API v2025');
}

writeLog("✅ Enhanced Scraping API 初期化完了", 'SUCCESS');
?>