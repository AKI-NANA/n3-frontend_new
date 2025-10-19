<?php
/**
 * Yahoo Auction - eBay統合処理API
 * 実環境対応版 - データベース統合・手数料計算・利益分析
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラーハンドリング強化
set_error_handler(function($severity, $message, $file, $line) {
    error_log("PHP Error: [$severity] $message in $file:$line");
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    // 必須クラス読み込み
    require_once '../classes/CategoryDetector.php';
    require_once '../classes/ItemSpecificsGenerator.php';
    require_once '../classes/EbayApiConnector.php';
    require_once '../../shared/core/Database.php';
    
    // データベース接続（実環境対応）
    function getDatabaseConnection() {
        static $pdo = null;
        
        if ($pdo === null) {
            try {
                $config = [
                    'host' => $_ENV['DB_HOST'] ?? 'localhost',
                    'dbname' => $_ENV['DB_NAME'] ?? 'nagano3_db',
                    'user' => $_ENV['DB_USER'] ?? 'postgres',
                    'password' => $_ENV['DB_PASS'] ?? 'Kn240914'
                ];
                
                $dsn = "pgsql:host={$config['host']};dbname={$config['dbname']}";
                
                $pdo = new PDO($dsn, $config['user'], $config['password'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]);
                
            } catch (PDOException $e) {
                throw new Exception('データベース接続失敗: ' . $e->getMessage());
            }
        }
        
        return $pdo;
    }
    
    // リクエスト処理
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    $pdo = getDatabaseConnection();
    $ebayConnector = new EbayApiConnector($pdo, true, true); // キャッシュ有効、デバッグ有効
    $detector = new CategoryDetector($pdo, true);
    $specificsGenerator = new ItemSpecificsGenerator($pdo);
    
    switch ($action) {
        case 'process_yahoo_products':
            // Yahoo商品の一括eBay処理
            $limit = intval($input['limit'] ?? 50);
            $filterStatus = $input['filter_status'] ?? 'unprocessed';
            
            $results = processYahooProductsForEbay($pdo, $ebayConnector, $detector, $specificsGenerator, $limit, $filterStatus);
            
            $response = [
                'success' => true,
                'action' => 'process_yahoo_products',
                'processed_count' => count($results['processed']),
                'failed_count' => count($results['failed']),
                'results' => $results,
                'processing_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'],
                'memory_usage' => memory_get_peak_usage(true) / 1024 / 1024 . ' MB'
            ];
            break;
            
        case 'analyze_single_product':
            // 単一商品の詳細分析
            $yahooProductId = intval($input['yahoo_product_id'] ?? 0);
            
            if ($yahooProductId <= 0) {
                throw new Exception('有効なYahoo商品IDが必要です');
            }
            
            $analysis = analyzeSingleYahooProduct($pdo, $ebayConnector, $detector, $specificsGenerator, $yahooProductId);
            
            $response = [
                'success' => true,
                'action' => 'analyze_single_product',
                'yahoo_product_id' => $yahooProductId,
                'analysis' => $analysis
            ];
            break;
            
        case 'get_profit_ranking':
            // 利益順ランキング取得
            $limit = intval($input['limit'] ?? 100);
            $minProfitUsd = floatval($input['min_profit_usd'] ?? 0);
            
            $ranking = getProfitRanking($pdo, $limit, $minProfitUsd);
            
            $response = [
                'success' => true,
                'action' => 'get_profit_ranking',
                'ranking' => $ranking,
                'count' => count($ranking)
            ];
            break;
            
        case 'update_ebay_categories':
            // eBayカテゴリーデータ更新
            $categories = $ebayConnector->getCategories(null, 3);
            $updated = updateEbayCategoriesInDatabase($pdo, $categories);
            
            $response = [
                'success' => true,
                'action' => 'update_ebay_categories',
                'categories_updated' => $updated,
                'total_categories' => count($categories)
            ];
            break;
            
        case 'refresh_category_fees':
            // カテゴリー手数料データ更新
            $categoryIds = $input['category_ids'] ?? [];
            
            if (empty($categoryIds)) {
                // アクティブな全カテゴリーを対象
                $stmt = $pdo->prepare("SELECT category_id FROM ebay_categories WHERE is_active = TRUE");
                $stmt->execute();
                $categoryIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            }
            
            $feesUpdated = [];
            foreach ($categoryIds as $categoryId) {
                try {
                    $fees = $ebayConnector->getCategoryFees($categoryId);
                    $feesUpdated[] = [
                        'category_id' => $categoryId,
                        'fees' => $fees
                    ];
                } catch (Exception $e) {
                    error_log("Failed to update fees for category $categoryId: " . $e->getMessage());
                }
            }
            
            $response = [
                'success' => true,
                'action' => 'refresh_category_fees',
                'fees_updated' => $feesUpdated,
                'categories_processed' => count($categoryIds)
            ];
            break;
            
        case 'get_processing_stats':
            // 処理統計情報取得
            $stats = getProcessingStatistics($pdo);
            
            $response = [
                'success' => true,
                'action' => 'get_processing_stats',
                'stats' => $stats
            ];
            break;
            
        case 'export_ready_products':
            // eBay出品準備完了商品のエクスポート
            $format = $input['format'] ?? 'json';
            $minProfit = floatval($input['min_profit'] ?? 10.0);
            
            $readyProducts = getEbayReadyProducts($pdo, $minProfit);
            
            if ($format === 'csv') {
                $csvData = convertToCSV($readyProducts);
                $response = [
                    'success' => true,
                    'action' => 'export_ready_products',
                    'format' => 'csv',
                    'data' => $csvData,
                    'count' => count($readyProducts)
                ];
            } else {
                $response = [
                    'success' => true,
                    'action' => 'export_ready_products',
                    'format' => 'json',
                    'products' => $readyProducts,
                    'count' => count($readyProducts)
                ];
            }
            break;
            
        case 'debug_api_status':
            // デバッグ情報取得
            $debugInfo = [
                'ebay_api' => $ebayConnector->getDebugInfo(),
                'database' => [
                    'connected' => true,
                    'yahoo_products_count' => getTableCount($pdo, 'yahoo_scraped_products'),
                    'ebay_mappings_count' => getTableCount($pdo, 'yahoo_ebay_mapping'),
                    'categories_count' => getTableCount($pdo, 'ebay_categories')
                ],
                'system' => [
                    'php_version' => PHP_VERSION,
                    'memory_limit' => ini_get('memory_limit'),
                    'max_execution_time' => ini_get('max_execution_time'),
                    'current_memory_usage' => memory_get_usage(true) / 1024 / 1024 . ' MB'
                ]
            ];
            
            $response = [
                'success' => true,
                'action' => 'debug_api_status',
                'debug_info' => $debugInfo
            ];
            break;
            
        default:
            throw new Exception('不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s'),
        'action' => $action ?? 'unknown'
    ];
    
    error_log('Yahoo-eBay統合API エラー: ' . $e->getMessage());
}

// =============================================================================
// 補助関数群
// =============================================================================

/**
 * Yahoo商品の一括eBay処理
 */
function processYahooProductsForEbay($pdo, $ebayConnector, $detector, $specificsGenerator, $limit, $filterStatus) {
    $whereClause = '';
    $params = [$limit];
    
    switch ($filterStatus) {
        case 'unprocessed':
            $whereClause = 'WHERE ysp.id NOT IN (SELECT yahoo_product_id FROM yahoo_ebay_mapping)';
            break;
        case 'low_confidence':
            $whereClause = 'WHERE yem.category_confidence < 70';
            break;
        case 'manual_review':
            $whereClause = 'WHERE yem.processing_status = ?';
            $params = ['manual_review', $limit];
            break;
    }
    
    $sql = "SELECT ysp.* FROM yahoo_scraped_products ysp 
            LEFT JOIN yahoo_ebay_mapping yem ON ysp.id = yem.yahoo_product_id 
            $whereClause 
            AND ysp.is_active = TRUE 
            ORDER BY ysp.created_at DESC 
            LIMIT " . ($filterStatus === 'manual_review' ? '?' : '') . " ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll();
    
    $processed = [];
    $failed = [];
    
    foreach ($products as $product) {
        try {
            // カテゴリー判定実行
            $productData = [
                'title' => $product['title'],
                'price' => $product['price_jpy'] / 150.0, // USD概算
                'description' => $product['description'] ?? ''
            ];
            
            $categoryResult = $detector->detectCategory($productData);
            
            // Item Specifics生成
            $itemSpecifics = $specificsGenerator->generateItemSpecificsString(
                $categoryResult['category_id'],
                [],
                $productData
            );
            
            // 手数料計算（データベース関数使用）
            $feesSql = "SELECT calculate_ebay_fees_json(?, ?)";
            $feesStmt = $pdo->prepare($feesSql);
            $feesStmt->execute([$categoryResult['category_id'], $productData['price']]);
            $feesResult = json_decode($feesStmt->fetchColumn(), true);
            
            // 利益計算
            $profit = $productData['price'] - $feesResult['total_fees'];
            $profitMargin = ($profit / $productData['price']) * 100;
            
            // データベースに結果保存
            $insertSql = "INSERT INTO yahoo_ebay_mapping 
                         (yahoo_product_id, detected_ebay_category_id, category_confidence, 
                          matched_keywords, item_specifics_generated, calculated_fees,
                          estimated_profit_usd, profit_margin_percent, processing_status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON CONFLICT (yahoo_product_id) DO UPDATE SET
                            detected_ebay_category_id = EXCLUDED.detected_ebay_category_id,
                            category_confidence = EXCLUDED.category_confidence,
                            calculated_fees = EXCLUDED.calculated_fees,
                            updated_at = NOW()";
            
            $status = $profitMargin > 20 ? 'approved' : ($profitMargin > 10 ? 'processed' : 'manual_review');
            
            $insertStmt = $pdo->prepare($insertSql);
            $insertStmt->execute([
                $product['id'],
                $categoryResult['category_id'],
                $categoryResult['confidence'],
                $categoryResult['matched_keywords'],
                $itemSpecifics,
                json_encode($feesResult),
                $profit,
                $profitMargin,
                $status
            ]);
            
            $processed[] = [
                'yahoo_product_id' => $product['id'],
                'title' => $product['title'],
                'category' => $categoryResult,
                'item_specifics' => $itemSpecifics,
                'fees' => $feesResult,
                'profit_usd' => round($profit, 2),
                'profit_margin' => round($profitMargin, 2),
                'status' => $status
            ];
            
        } catch (Exception $e) {
            $failed[] = [
                'yahoo_product_id' => $product['id'],
                'title' => $product['title'],
                'error' => $e->getMessage()
            ];
        }
    }
    
    return [
        'processed' => $processed,
        'failed' => $failed
    ];
}

/**
 * 単一商品の詳細分析
 */
function analyzeSingleYahooProduct($pdo, $ebayConnector, $detector, $specificsGenerator, $yahooProductId) {
    // 商品データ取得
    $sql = "SELECT ysp.*, yem.* FROM yahoo_scraped_products ysp 
            LEFT JOIN yahoo_ebay_mapping yem ON ysp.id = yem.yahoo_product_id 
            WHERE ysp.id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$yahooProductId]);
    $product = $stmt->fetch();
    
    if (!$product) {
        throw new Exception('商品が見つかりません');
    }
    
    // eBay API拡張分析
    $productData = [
        'title' => $product['title'],
        'price' => $product['price_jpy'] / 150.0,
        'description' => $product['description'] ?? ''
    ];
    
    $apiAnalysis = $ebayConnector->suggestCategoryForYahooProduct($productData);
    
    return [
        'yahoo_product' => [
            'id' => $product['id'],
            'title' => $product['title'],
            'price_jpy' => $product['price_jpy'],
            'price_usd_estimated' => $productData['price']
        ],
        'ebay_analysis' => $apiAnalysis,
        'current_mapping' => [
            'category_id' => $product['detected_ebay_category_id'],
            'confidence' => $product['category_confidence'],
            'profit_usd' => $product['estimated_profit_usd'],
            'status' => $product['processing_status']
        ]
    ];
}

/**
 * 利益順ランキング取得
 */
function getProfitRanking($pdo, $limit, $minProfitUsd) {
    $sql = "SELECT * FROM v_yahoo_ebay_analysis 
            WHERE estimated_profit_usd >= ? 
            ORDER BY estimated_profit_usd DESC 
            LIMIT ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$minProfitUsd, $limit]);
    
    return $stmt->fetchAll();
}

/**
 * eBayカテゴリーデータベース更新
 */
function updateEbayCategoriesInDatabase($pdo, $categories) {
    $updated = 0;
    
    foreach ($categories as $category) {
        $sql = "INSERT INTO ebay_categories 
                (category_id, category_name, parent_id, category_level, is_leaf, is_active)
                VALUES (?, ?, ?, ?, ?, TRUE)
                ON CONFLICT (category_id) DO UPDATE SET
                    category_name = EXCLUDED.category_name,
                    parent_id = EXCLUDED.parent_id,
                    updated_at = NOW()";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $category['category_id'],
            $category['category_name'],
            $category['parent_id'],
            $category['level'],
            $category['is_leaf']
        ]);
        
        $updated++;
    }
    
    return $updated;
}

/**
 * 処理統計情報取得
 */
function getProcessingStatistics($pdo) {
    $stats = [];
    
    // 基本統計
    $basicStats = $pdo->query("
        SELECT 
            COUNT(*) as total_yahoo_products,
            COUNT(yem.id) as processed_products,
            COUNT(CASE WHEN yem.processing_status = 'approved' THEN 1 END) as approved_products,
            AVG(yem.estimated_profit_usd) as avg_profit_usd,
            SUM(yem.estimated_profit_usd) as total_potential_profit
        FROM yahoo_scraped_products ysp
        LEFT JOIN yahoo_ebay_mapping yem ON ysp.id = yem.yahoo_product_id
        WHERE ysp.is_active = TRUE
    ")->fetch();
    
    $stats['basic'] = $basicStats;
    
    // カテゴリー別統計
    $categoryStats = $pdo->query("
        SELECT 
            ec.category_name,
            COUNT(*) as product_count,
            AVG(yem.estimated_profit_usd) as avg_profit,
            AVG(yem.category_confidence) as avg_confidence
        FROM yahoo_ebay_mapping yem
        JOIN ebay_categories ec ON yem.detected_ebay_category_id = ec.category_id
        GROUP BY ec.category_id, ec.category_name
        ORDER BY product_count DESC
        LIMIT 10
    ")->fetchAll();
    
    $stats['by_category'] = $categoryStats;
    
    return $stats;
}

/**
 * eBay出品準備完了商品取得
 */
function getEbayReadyProducts($pdo, $minProfit) {
    $sql = "SELECT 
                ysp.id, ysp.title, ysp.price_jpy,
                yem.detected_ebay_category_id, ec.category_name,
                yem.item_specifics_generated,
                yem.estimated_profit_usd, yem.profit_margin_percent
            FROM yahoo_scraped_products ysp
            JOIN yahoo_ebay_mapping yem ON ysp.id = yem.yahoo_product_id
            JOIN ebay_categories ec ON yem.detected_ebay_category_id = ec.category_id
            WHERE yem.processing_status = 'approved'
            AND yem.estimated_profit_usd >= ?
            ORDER BY yem.estimated_profit_usd DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$minProfit]);
    
    return $stmt->fetchAll();
}

/**
 * CSVデータ変換
 */
function convertToCSV($data) {
    if (empty($data)) {
        return '';
    }
    
    $output = fopen('php://temp', 'r+');
    
    // ヘッダー行
    fputcsv($output, array_keys($data[0]));
    
    // データ行
    foreach ($data as $row) {
        fputcsv($output, $row);
    }
    
    rewind($output);
    $csvString = stream_get_contents($output);
    fclose($output);
    
    return $csvString;
}

/**
 * テーブル行数取得
 */
function getTableCount($pdo, $tableName) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM " . $tableName);
    $stmt->execute();
    return $stmt->fetchColumn();
}

// レスポンス送信
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>