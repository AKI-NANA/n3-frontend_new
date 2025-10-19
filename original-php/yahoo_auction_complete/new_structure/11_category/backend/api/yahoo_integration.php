<?php
/**
 * Yahoo Auction統合API - Phase 3 Implementation (続き)
 * new_structure/11_category/backend/api/yahoo_integration.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラーハンドリング
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    // 必須クラス読み込み
    require_once '../classes/CategoryDetector.php';
    require_once '../classes/FeeCalculator.php';
    require_once '../classes/ItemSpecificsGenerator.php';
    require_once '../../shared/api/EbayApiConnector.php';
    
    // データベース接続
    function getDatabaseConnection() {
        try {
            // 環境設定読み込み
            $envPath = '/Users/aritahiroaki/NAGANO-3/N3-Development/common/env/.env';
            $env = [];
            
            if (file_exists($envPath)) {
                $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    if (strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
                    list($key, $value) = explode('=', $line, 2);
                    $env[trim($key)] = trim($value, '"');
                }
            }
            
            $dsn = sprintf("pgsql:host=%s;dbname=%s;port=%s", 
                $env['DB_HOST'] ?? 'localhost',
                $env['DB_NAME'] ?? 'nagano3_db', 
                $env['DB_PORT'] ?? '5432'
            );
            
            $pdo = new PDO($dsn, $env['DB_USER'] ?? 'aritahiroaki', $env['DB_PASS'] ?? '');
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            return $pdo;
        } catch (PDOException $e) {
            throw new Exception('データベース接続失敗: ' . $e->getMessage());
        }
    }
    
    // リクエスト処理
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    $pdo = getDatabaseConnection();
    $detector = new CategoryDetector($pdo, true);
    $feeCalculator = new FeeCalculator($pdo);
    $specificsGenerator = new ItemSpecificsGenerator($pdo);
    $ebayApi = new EbayApiConnector();
    
    switch ($action) {
        case 'process_yahoo_products':
            $limit = $input['limit'] ?? 100;
            $offset = $input['offset'] ?? 0;
            processYahooProducts($pdo, $detector, $feeCalculator, $specificsGenerator, $limit, $offset);
            break;
            
        case 'update_category':
            $productId = $input['product_id'] ?? '';
            $categoryId = $input['category_id'] ?? '';
            
            if (empty($productId) || empty($categoryId)) {
                throw new Exception('商品IDとカテゴリーIDが必要です');
            }
            
            updateProductCategory($pdo, $productId, $categoryId, $detector, $feeCalculator, $specificsGenerator);
            break;
            
        case 'calculate_fees':
            $productId = $input['product_id'] ?? '';
            $priceUsd = $input['price_usd'] ?? 0;
            $categoryId = $input['category_id'] ?? '99999';
            $options = $input['options'] ?? [];
            
            calculateProductFees($feeCalculator, $productId, $priceUsd, $categoryId, $options);
            break;
            
        case 'get_yahoo_products':
            $filters = $input['filters'] ?? [];
            $limit = $input['limit'] ?? 50;
            $offset = $input['offset'] ?? 0;
            
            getYahooProducts($pdo, $filters, $limit, $offset);
            break;
            
        case 'sync_ebay_categories':
            syncEbayCategories($pdo, $ebayApi);
            break;
            
        case 'bulk_profit_analysis':
            $productIds = $input['product_ids'] ?? [];
            $targetProfitMargin = $input['target_profit_margin'] ?? 20.0;
            
            bulkProfitAnalysis($pdo, $feeCalculator, $productIds, $targetProfitMargin);
            break;
            
        case 'export_processed_data':
            $format = $input['format'] ?? 'csv';
            $filters = $input['filters'] ?? [];
            
            exportProcessedData($pdo, $format, $filters);
            break;
            
        case 'get_processing_status':
            getProcessingStatus($pdo);
            break;
            
        default:
            throw new Exception('不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    error_log('Yahoo Integration API エラー: ' . $e->getMessage());
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// =============================================================================
// 処理関数
// =============================================================================

/**
 * Yahoo Auction商品の一括処理
 */
function processYahooProducts($pdo, $detector, $feeCalculator, $specificsGenerator, $limit, $offset) {
    $startTime = microtime(true);
    
    // Yahoo Auctionテーブル存在確認
    $tableCheck = $pdo->query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yahoo_scraped_products')")->fetchColumn();
    
    if (!$tableCheck) {
        throw new Exception('yahoo_scraped_products テーブルが存在しません');
    }
    
    // 未処理商品の取得
    $sql = "SELECT * FROM yahoo_scraped_products 
            WHERE ebay_category_id IS NULL 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$limit, $offset]);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($products)) {
        echo json_encode([
            'success' => true,
            'message' => '処理対象の商品が見つかりませんでした',
            'processed_count' => 0,
            'results' => []
        ]);
        return;
    }
    
    $results = [];
    $successCount = 0;
    $failCount = 0;
    
    foreach ($products as $product) {
        try {
            // カテゴリー判定
            $categoryResult = $detector->detectCategory([
                'title' => $product['title'],
                'price' => ($product['price_jpy'] ?? 0) / 150, // 概算USD換算
                'description' => $product['description'] ?? ''
            ]);
            
            // 手数料計算
            $priceUsd = ($product['price_jpy'] ?? 0) / 150;
            $fees = $feeCalculator->calculateEbayFees($categoryResult['category_id'], $priceUsd);
            
            // 利益計算
            $profitAnalysis = $feeCalculator->calculateProfit(
                $product['price_jpy'] ?? 0,
                $priceUsd * 1.3, // 30%マークアップ想定
                $categoryResult['category_id']
            );
            
            // Item Specifics生成
            $itemSpecifics = $specificsGenerator->generateItemSpecificsString(
                $categoryResult['category_id'],
                [],
                [
                    'title' => $product['title'],
                    'description' => $product['description'] ?? ''
                ]
            );
            
            // データベース更新
            $updateSql = "UPDATE yahoo_scraped_products 
                          SET ebay_category_id = ?, 
                              ebay_category_name = ?,
                              category_confidence = ?,
                              item_specifics = ?,
                              ebay_fees_data = ?,
                              estimated_ebay_price_usd = ?,
                              estimated_profit_usd = ?,
                              category_detected_at = NOW()
                          WHERE id = ?";
            
            $stmt = $pdo->prepare($updateSql);
            $stmt->execute([
                $categoryResult['category_id'],
                $categoryResult['category_name'],
                $categoryResult['confidence'],
                $itemSpecifics,
                json_encode($fees),
                $priceUsd * 1.3,
                $profitAnalysis['profit']['net_profit_usd'],
                $product['id']
            ]);
            
            $results[] = [
                'product_id' => $product['id'],
                'title' => $product['title'],
                'category' => $categoryResult,
                'fees' => $fees['summary'],
                'profit' => $profitAnalysis['profit'],
                'item_specifics' => $itemSpecifics,
                'status' => 'success'
            ];
            
            $successCount++;
            
        } catch (Exception $e) {
            $results[] = [
                'product_id' => $product['id'],
                'title' => $product['title'],
                'error' => $e->getMessage(),
                'status' => 'failed'
            ];
            
            $failCount++;
            error_log("商品処理エラー (ID: {$product['id']}): " . $e->getMessage());
        }
    }
    
    $processingTime = round((microtime(true) - $startTime) * 1000);
    
    echo json_encode([
        'success' => true,
        'processed_count' => count($results),
        'success_count' => $successCount,
        'fail_count' => $failCount,
        'processing_time_ms' => $processingTime,
        'results' => $results,
        'summary' => [
            'total_items' => count($products),
            'success_rate' => round(($successCount / count($products)) * 100, 2),
            'average_confidence' => calculateAverageConfidence($results)
        ]
    ]);
}

/**
 * 商品カテゴリー更新
 */
function updateProductCategory($pdo, $productId, $categoryId, $detector, $feeCalculator, $specificsGenerator) {
    // 商品情報取得
    $sql = "SELECT * FROM yahoo_scraped_products WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$productId]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        throw new Exception('指定された商品が見つかりません');
    }
    
    // 新しいカテゴリーでの計算
    $priceUsd = ($product['price_jpy'] ?? 0) / 150;
    $fees = $feeCalculator->calculateEbayFees($categoryId, $priceUsd);
    
    $itemSpecifics = $specificsGenerator->generateItemSpecificsString(
        $categoryId,
        [],
        [
            'title' => $product['title'],
            'description' => $product['description'] ?? ''
        ]
    );
    
    // カテゴリー名取得
    $categoryName = $detector->getCategoryName($categoryId);
    
    // データベース更新
    $updateSql = "UPDATE yahoo_scraped_products 
                  SET ebay_category_id = ?, 
                      ebay_category_name = ?,
                      category_confidence = 100,
                      item_specifics = ?,
                      ebay_fees_data = ?,
                      category_detected_at = NOW()
                  WHERE id = ?";
    
    $stmt = $pdo->prepare($updateSql);
    $stmt->execute([
        $categoryId,
        $categoryName,
        $itemSpecifics,
        json_encode($fees),
        $productId
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'カテゴリーを更新しました',
        'product_id' => $productId,
        'new_category' => [
            'id' => $categoryId,
            'name' => $categoryName
        ],
        'fees' => $fees['summary'],
        'item_specifics' => $itemSpecifics
    ]);
}

/**
 * 手数料計算
 */
function calculateProductFees($feeCalculator, $productId, $priceUsd, $categoryId, $options) {
    $fees = $feeCalculator->calculateEbayFees($categoryId, $priceUsd, 'fixed_price', $options);
    
    echo json_encode([
        'success' => true,
        'product_id' => $productId,
        'calculation' => $fees
    ]);
}

/**
 * Yahoo Auction商品取得
 */
function getYahooProducts($pdo, $filters, $limit, $offset) {
    $whereClause = '1=1';
    $params = [];
    
    // フィルター適用
    if (!empty($filters['category_detected'])) {
        $whereClause .= ' AND ebay_category_id IS ' . ($filters['category_detected'] ? 'NOT NULL' : 'NULL');
    }
    
    if (!empty($filters['min_price'])) {
        $whereClause .= ' AND price_jpy >= ?';
        $params[] = $filters['min_price'];
    }
    
    if (!empty($filters['max_price'])) {
        $whereClause .= ' AND price_jpy <= ?';
        $params[] = $filters['max_price'];
    }
    
    if (!empty($filters['search_text'])) {
        $whereClause .= ' AND (title ILIKE ? OR description ILIKE ?)';
        $searchText = '%' . $filters['search_text'] . '%';
        $params[] = $searchText;
        $params[] = $searchText;
    }
    
    $params[] = $limit;
    $params[] = $offset;
    
    $sql = "SELECT *, 
                   CASE WHEN ebay_category_id IS NOT NULL THEN 'processed' ELSE 'pending' END as processing_status
            FROM yahoo_scraped_products 
            WHERE {$whereClause}
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 総件数取得
    $countSql = "SELECT COUNT(*) FROM yahoo_scraped_products WHERE {$whereClause}";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute(array_slice($params, 0, -2)); // limit, offsetを除く
    $totalCount = $countStmt->fetchColumn();
    
    echo json_encode([
        'success' => true,
        'products' => $products,
        'pagination' => [
            'total_count' => $totalCount,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => $offset + $limit < $totalCount
        ]
    ]);
}

/**
 * eBayカテゴリー同期
 */
function syncEbayCategories($pdo, $ebayApi) {
    $connectionTest = $ebayApi->testConnection();
    
    if (!$connectionTest['success']) {
        echo json_encode([
            'success' => false,
            'message' => 'eBay API接続に失敗しました: ' . $connectionTest['message']
        ]);
        return;
    }
    
    // カテゴリー取得（実際のAPIは時間がかかるため、サンプル処理）
    echo json_encode([
        'success' => true,
        'message' => 'eBayカテゴリー同期完了（デモ）',
        'api_status' => $connectionTest,
        'categories_updated' => 0,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

/**
 * 利益分析（複数商品）
 */
function bulkProfitAnalysis($pdo, $feeCalculator, $productIds, $targetProfitMargin) {
    if (empty($productIds)) {
        $sql = "SELECT id, title, price_jpy, ebay_category_id FROM yahoo_scraped_products WHERE ebay_category_id IS NOT NULL LIMIT 50";
        $stmt = $pdo->query($sql);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $productIds = array_column($products, 'id');
    } else {
        $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
        $sql = "SELECT id, title, price_jpy, ebay_category_id FROM yahoo_scraped_products WHERE id IN ({$placeholders})";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($productIds);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    $analysis = [];
    $profitable = 0;
    $unprofitable = 0;
    
    foreach ($products as $product) {
        $yahooPrice = $product['price_jpy'];
        $estimatedEbayPrice = $yahooPrice / 150 * 1.5; // 150円/$, 50%マークアップ
        
        $profitResult = $feeCalculator->calculateProfit(
            $yahooPrice,
            $estimatedEbayPrice,
            $product['ebay_category_id'] ?? '99999'
        );
        
        $meetsTarget = $profitResult['profit']['profit_margin_net'] >= $targetProfitMargin;
        
        $analysis[] = [
            'product_id' => $product['id'],
            'title' => $product['title'],
            'yahoo_price_yen' => $yahooPrice,
            'estimated_ebay_price_usd' => $estimatedEbayPrice,
            'profit_analysis' => $profitResult['profit'],
            'meets_target' => $meetsTarget,
            'recommendation' => $meetsTarget ? 'RECOMMENDED' : 'NOT_RECOMMENDED'
        ];
        
        if ($meetsTarget) {
            $profitable++;
        } else {
            $unprofitable++;
        }
    }
    
    echo json_encode([
        'success' => true,
        'target_profit_margin' => $targetProfitMargin,
        'analysis' => $analysis,
        'summary' => [
            'total_analyzed' => count($analysis),
            'profitable_count' => $profitable,
            'unprofitable_count' => $unprofitable,
            'profitable_rate' => count($analysis) > 0 ? round(($profitable / count($analysis)) * 100, 2) : 0
        ]
    ]);
}

/**
 * 処理済みデータエクスポート
 */
function exportProcessedData($pdo, $format, $filters) {
    $sql = "SELECT id, title, price_jpy, ebay_category_name, category_confidence, item_specifics, estimated_profit_usd 
            FROM yahoo_scraped_products 
            WHERE ebay_category_id IS NOT NULL 
            ORDER BY category_confidence DESC 
            LIMIT 1000";
    
    $stmt = $pdo->query($sql);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if ($format === 'csv') {
        $csvData = "ID,Title,Price_JPY,eBay_Category,Confidence,Item_Specifics,Estimated_Profit_USD\n";
        foreach ($data as $row) {
            $csvData .= implode(',', array_map(function($value) {
                return '"' . str_replace('"', '""', $value) . '"';
            }, $row)) . "\n";
        }
        
        echo json_encode([
            'success' => true,
            'format' => 'csv',
            'data' => base64_encode($csvData),
            'filename' => 'ebay_processed_data_' . date('Y-m-d_H-i-s') . '.csv',
            'record_count' => count($data)
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'format' => $format,
            'data' => $data,
            'record_count' => count($data)
        ]);
    }
}

/**
 * 処理ステータス取得
 */
function getProcessingStatus($pdo) {
    $stats = [];
    
    // Yahoo商品統計
    $sql = "SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN ebay_category_id IS NOT NULL THEN 1 END) as processed_products,
                AVG(category_confidence) as avg_confidence,
                AVG(estimated_profit_usd) as avg_estimated_profit
            FROM yahoo_scraped_products";
    $stmt = $pdo->query($sql);
    $stats['yahoo_products'] = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // カテゴリー統計
    $sql = "SELECT 
                ebay_category_name,
                COUNT(*) as product_count,
                AVG(category_confidence) as avg_confidence
            FROM yahoo_scraped_products 
            WHERE ebay_category_id IS NOT NULL 
            GROUP BY ebay_category_name 
            ORDER BY product_count DESC 
            LIMIT 10";
    $stmt = $pdo->query($sql);
    $stats['top_categories'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 最近の処理ログ
    $sql = "SELECT * FROM processing_logs ORDER BY created_at DESC LIMIT 5";
    $stmt = $pdo->query($sql);
    $stats['recent_logs'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'statistics' => $stats,
        'updated_at' => date('Y-m-d H:i:s')
    ]);
}

// ヘルパー関数
function calculateAverageConfidence($results) {
    $confidenceSum = 0;
    $validResults = 0;
    
    foreach ($results as $result) {
        if ($result['status'] === 'success' && isset($result['category']['confidence'])) {
            $confidenceSum += $result['category']['confidence'];
            $validResults++;
        }
    }
    
    return $validResults > 0 ? round($confidenceSum / $validResults, 2) : 0;
}
?>