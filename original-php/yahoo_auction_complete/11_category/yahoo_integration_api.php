<?php
/**
 * Yahoo Auction → eBayカテゴリー 連携API
 * 既存のYahoo Auctionデータと統合
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // データベース接続
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';
    
    switch ($action) {
        case 'process_yahoo_products':
            echo json_encode(processYahooProducts($pdo, $input));
            break;
            
        case 'update_yahoo_category':
            echo json_encode(updateYahooCategory($pdo, $input));
            break;
            
        case 'get_yahoo_stats':
            echo json_encode(getYahooIntegrationStats($pdo));
            break;
            
        case 'batch_yahoo_process':
            echo json_encode(batchYahooProcess($pdo, $input));
            break;
            
        default:
            throw new Exception('未対応のアクション: ' . $action);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

/**
 * Yahoo Auctionデータの一括処理
 */
function processYahooProducts($pdo, $input) {
    $limit = $input['limit'] ?? 50;
    $offset = $input['offset'] ?? 0;
    
    // Yahoo Auctionデータから未処理商品を取得
    $sql = "
        SELECT id, title, price_jpy, description, yahoo_category
        FROM yahoo_scraped_products 
        WHERE ebay_category_id IS NULL 
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$limit, $offset]);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($products)) {
        return [
            'success' => true,
            'message' => '処理対象の商品がありません',
            'processed' => 0
        ];
    }
    
    $results = [];
    $processed = 0;
    $errors = 0;
    
    foreach ($products as $product) {
        try {
            // eBayカテゴリー判定実行
            $categoryResult = performCategoryDetection($pdo, [
                'title' => $product['title'],
                'price_jpy' => $product['price_jpy'],
                'description' => $product['description'],
                'yahoo_category' => $product['yahoo_category']
            ]);
            
            // yahoo_scraped_products テーブル更新
            $updateSql = "
                UPDATE yahoo_scraped_products 
                SET 
                    ebay_category_id = ?,
                    ebay_category_name = ?,
                    category_confidence = ?,
                    category_detection_method = ?,
                    ebay_processing_date = NOW()
                WHERE id = ?
            ";
            
            $updateStmt = $pdo->prepare($updateSql);
            $updateStmt->execute([
                $categoryResult['category_id'],
                $categoryResult['category_name'],
                $categoryResult['confidence'],
                $categoryResult['method'] ?? 'auto_detection',
                $product['id']
            ]);
            
            $results[] = [
                'product_id' => $product['id'],
                'title' => $product['title'],
                'category' => $categoryResult,
                'status' => 'success'
            ];
            
            $processed++;
            
        } catch (Exception $e) {
            $results[] = [
                'product_id' => $product['id'],
                'title' => $product['title'],
                'error' => $e->getMessage(),
                'status' => 'error'
            ];
            $errors++;
        }
    }
    
    return [
        'success' => true,
        'processed' => $processed,
        'errors' => $errors,
        'total_found' => count($products),
        'results' => $results,
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

/**
 * eBayカテゴリー判定実行
 */
function performCategoryDetection($pdo, $productData) {
    $title = strtolower($productData['title']);
    $titleHash = hash('md5', $title);
    
    // 1. 学習データベース検索
    $learningStmt = $pdo->prepare("
        SELECT * FROM ebay_simple_learning 
        WHERE title_hash = ? OR LOWER(title) LIKE ? 
        ORDER BY usage_count DESC 
        LIMIT 1
    ");
    
    $similarTitle = '%' . substr($title, 0, 20) . '%';
    $learningStmt->execute([$titleHash, $similarTitle]);
    $learned = $learningStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($learned && $learned['confidence'] >= 80) {
        // 使用回数増加
        $pdo->prepare("UPDATE ebay_simple_learning SET usage_count = usage_count + 1 WHERE id = ?")
             ->execute([$learned['id']]);
        
        return [
            'category_id' => $learned['learned_category_id'],
            'category_name' => $learned['learned_category_name'],
            'confidence' => $learned['confidence'],
            'method' => 'learned_database'
        ];
    }
    
    // 2. キーワードマッチング
    $keywordResult = performKeywordMatching($pdo, $productData);
    if ($keywordResult && $keywordResult['confidence'] >= 70) {
        // 学習データに保存
        saveLearningData($pdo, $productData, $keywordResult);
        return $keywordResult;
    }
    
    // 3. ルールベース判定
    $ruleResult = performRuleBasedDetection($productData);
    saveLearningData($pdo, $productData, $ruleResult);
    
    return $ruleResult;
}

/**
 * キーワードマッチング実行
 */
function performKeywordMatching($pdo, $productData) {
    $searchText = strtolower($productData['title'] . ' ' . ($productData['description'] ?? '') . ' ' . ($productData['yahoo_category'] ?? ''));
    
    $stmt = $pdo->prepare("
        SELECT 
            ec.category_id,
            ec.category_name,
            SUM(ck.weight * 
                CASE 
                    WHEN ck.keyword_type = 'primary' THEN 2
                    WHEN ck.keyword_type = 'secondary' THEN 1
                    ELSE 0.5
                END
            ) as total_score,
            COUNT(ck.id) as matched_keywords
        FROM ebay_categories ec
        JOIN category_keywords ck ON ec.category_id = ck.category_id
        WHERE ec.is_active = TRUE 
        AND ck.is_active = TRUE
        AND POSITION(LOWER(ck.keyword) IN ?) > 0
        GROUP BY ec.category_id, ec.category_name
        ORDER BY total_score DESC
        LIMIT 1
    ");
    
    $stmt->execute([$searchText]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result && $result['total_score'] >= 15) {
        return [
            'category_id' => $result['category_id'],
            'category_name' => $result['category_name'],
            'confidence' => min(95, max(70, intval($result['total_score'] * 3))),
            'method' => 'keyword_matching'
        ];
    }
    
    return null;
}

/**
 * ルールベース判定
 */
function performRuleBasedDetection($productData) {
    $title = strtolower($productData['title']);
    $yahoo = strtolower($productData['yahoo_category'] ?? '');
    
    $rules = [
        ['pattern' => ['iphone', 'android', 'スマホ', '携帯'], 'category' => ['293', 'Cell Phones & Smartphones'], 'confidence' => 85],
        ['pattern' => ['canon', 'nikon', 'カメラ'], 'category' => ['625', 'Cameras & Photo'], 'confidence' => 82],
        ['pattern' => ['本', 'book', '漫画', '巻'], 'category' => ['267', 'Books & Magazines'], 'confidence' => 80],
        ['pattern' => ['時計', 'watch', 'rolex'], 'category' => ['14324', 'Jewelry & Watches'], 'confidence' => 85],
        ['pattern' => ['ゲーム', 'game', 'playstation', 'nintendo'], 'category' => ['139973', 'Video Games'], 'confidence' => 82],
        ['pattern' => ['トレカ', 'card', 'ポケモン'], 'category' => ['183454', 'Non-Sport Trading Cards'], 'confidence' => 80],
    ];
    
    $searchText = $title . ' ' . $yahoo;
    
    foreach ($rules as $rule) {
        foreach ($rule['pattern'] as $pattern) {
            if (strpos($searchText, $pattern) !== false) {
                return [
                    'category_id' => $rule['category'][0],
                    'category_name' => $rule['category'][1],
                    'confidence' => $rule['confidence'],
                    'method' => 'rule_based'
                ];
            }
        }
    }
    
    return [
        'category_id' => '99999',
        'category_name' => 'Other',
        'confidence' => 40,
        'method' => 'fallback'
    ];
}

/**
 * 学習データ保存
 */
function saveLearningData($pdo, $productData, $categoryResult) {
    $titleHash = hash('md5', strtolower($productData['title']));
    
    $sql = "
        INSERT INTO ebay_simple_learning (
            title_hash, title, yahoo_category, price_jpy,
            learned_category_id, learned_category_name, confidence,
            usage_count, success_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
        ON CONFLICT (title_hash) DO UPDATE SET
            usage_count = ebay_simple_learning.usage_count + 1,
            last_used_at = NOW()
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $titleHash,
        $productData['title'],
        $productData['yahoo_category'] ?? '',
        intval($productData['price_jpy'] ?? 0),
        $categoryResult['category_id'],
        $categoryResult['category_name'],
        $categoryResult['confidence']
    ]);
}

/**
 * Yahoo統合統計取得
 */
function getYahooIntegrationStats($pdo) {
    $stats = [];
    
    // 基本統計
    $basicStmt = $pdo->query("
        SELECT 
            COUNT(*) as total_products,
            COUNT(CASE WHEN ebay_category_id IS NOT NULL THEN 1 END) as processed_products,
            COUNT(CASE WHEN ebay_category_id IS NULL THEN 1 END) as pending_products,
            ROUND(AVG(category_confidence), 1) as avg_confidence
        FROM yahoo_scraped_products
    ");
    $stats['basic'] = $basicStmt->fetch(PDO::FETCH_ASSOC);
    
    // カテゴリー別統計
    $categoryStmt = $pdo->query("
        SELECT 
            ebay_category_name,
            COUNT(*) as product_count,
            ROUND(AVG(category_confidence), 1) as avg_confidence
        FROM yahoo_scraped_products 
        WHERE ebay_category_id IS NOT NULL 
        GROUP BY ebay_category_name 
        ORDER BY product_count DESC 
        LIMIT 10
    ");
    $stats['categories'] = $categoryStmt->fetchAll(PDO::FETCH_ASSOC);
    
    return [
        'success' => true,
        'stats' => $stats,
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

/**
 * バッチ処理（大量データ用）
 */
function batchYahooProcess($pdo, $input) {
    $batchSize = $input['batch_size'] ?? 100;
    $maxTime = $input['max_time'] ?? 300; // 5分制限
    
    $startTime = time();
    $totalProcessed = 0;
    $offset = 0;
    
    while ((time() - $startTime) < $maxTime) {
        $result = processYahooProducts($pdo, ['limit' => $batchSize, 'offset' => $offset]);
        
        if (!$result['success'] || $result['processed'] == 0) {
            break;
        }
        
        $totalProcessed += $result['processed'];
        $offset += $batchSize;
    }
    
    return [
        'success' => true,
        'total_processed' => $totalProcessed,
        'execution_time' => time() - $startTime,
        'timestamp' => date('Y-m-d H:i:s')
    ];
}
?>