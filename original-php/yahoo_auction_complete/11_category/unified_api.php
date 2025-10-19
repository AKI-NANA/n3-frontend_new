<?php
/**
 * eBayカテゴリー統合API - JSON専用バックエンド
 * ファイル: unified_api.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// プリフライト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラーハンドリング（JSON出力のみ）
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    // Supabase接続
    require_once __DIR__ . '/backend/config/supabase.php';
    $pdo = getSupabaseConnection();
    
    // リクエスト解析
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    // アクション処理
    switch ($action) {
        case 'select_category':
            echo json_encode(handleCategorySelection($pdo, $input), JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_stats':
            echo json_encode(getSystemStats($pdo), JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get_categories':
            echo json_encode(getAvailableCategories($pdo), JSON_UNESCAPED_UNICODE);
            break;
            
        case 'batch_process':
            echo json_encode(handleBatchProcessing($pdo, $input), JSON_UNESCAPED_UNICODE);
            break;
            
        case 'learn_manual':
            echo json_encode(handleManualLearning($pdo, $input), JSON_UNESCAPED_UNICODE);
            break;
            
        case 'sync_ebay_data':
            echo json_encode(handleEbaySyncSimulation($pdo), JSON_UNESCAPED_UNICODE);
            break;
            
        default:
            throw new Exception('未対応のアクション: ' . $action);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * カテゴリー選択処理
 */
function handleCategorySelection($pdo, $input) {
    $productInfo = $input['product_info'] ?? [];
    
    if (empty($productInfo['title'])) {
        throw new Exception('商品タイトルが必要です');
    }
    
    $startTime = microtime(true);
    
    // 1. 学習データベース検索
    $learned = searchLearningDatabase($pdo, $productInfo);
    
    if ($learned && $learned['confidence'] >= 80) {
        incrementUsage($pdo, $learned['id']);
        
        return [
            'success' => true,
            'category' => [
                'category_id' => $learned['learned_category_id'],
                'category_name' => $learned['learned_category_name'],
                'confidence' => $learned['confidence'],
                'usage_count' => $learned['usage_count'] + 1,
                'source' => 'learned_database'
            ],
            'method' => 'learned_database',
            'processing_time_ms' => round((microtime(true) - $startTime) * 1000)
        ];
    }
    
    // 2. キーワードベース判定
    $keywordResult = performKeywordMatching($pdo, $productInfo);
    
    if ($keywordResult && $keywordResult['confidence'] >= 70) {
        // 新しい学習データとして保存
        saveLearningData($pdo, $productInfo, $keywordResult);
        
        return [
            'success' => true,
            'category' => $keywordResult,
            'method' => 'keyword_matched_and_learned',
            'processing_time_ms' => round((microtime(true) - $startTime) * 1000)
        ];
    }
    
    // 3. ルールベース判定
    $ruleResult = performRuleBasedMatching($productInfo);
    saveLearningData($pdo, $productInfo, $ruleResult);
    
    return [
        'success' => true,
        'category' => $ruleResult,
        'method' => 'rule_based_and_learned',
        'processing_time_ms' => round((microtime(true) - $startTime) * 1000)
    ];
}

/**
 * 学習データベース検索
 */
function searchLearningDatabase($pdo, $productInfo) {
    $title = strtolower($productInfo['title']);
    $titleHash = hash('md5', $title);
    
    // 完全一致検索
    $stmt = $pdo->prepare("
        SELECT * FROM ebay_simple_learning 
        WHERE title_hash = ? 
        ORDER BY usage_count DESC 
        LIMIT 1
    ");
    $stmt->execute([$titleHash]);
    $exact = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($exact) {
        return $exact;
    }
    
    // 部分一致検索
    $words = array_filter(explode(' ', $title), function($word) {
        return strlen($word) >= 3;
    });
    
    if (!empty($words)) {
        $likeConditions = [];
        $params = [];
        
        foreach (array_slice($words, 0, 3) as $word) {
            $likeConditions[] = "LOWER(title) LIKE ?";
            $params[] = '%' . $word . '%';
        }
        
        $sql = "
            SELECT *, (usage_count * confidence / 100) as score 
            FROM ebay_simple_learning 
            WHERE " . implode(' OR ', $likeConditions) . "
            ORDER BY score DESC 
            LIMIT 1
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    return null;
}

/**
 * キーワードマッチング
 */
function performKeywordMatching($pdo, $productInfo) {
    $title = strtolower($productInfo['title']);
    $brand = strtolower($productInfo['brand'] ?? '');
    $description = strtolower($productInfo['description'] ?? '');
    $text = $title . ' ' . $brand . ' ' . $description;
    
    $sql = "
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
            COUNT(ck.id) as keyword_matches
        FROM ebay_categories ec
        JOIN category_keywords ck ON ec.category_id = ck.category_id
        WHERE ec.is_active = TRUE 
        AND ck.is_active = TRUE
        AND POSITION(LOWER(ck.keyword) IN ?) > 0
        GROUP BY ec.category_id, ec.category_name
        ORDER BY total_score DESC
        LIMIT 1
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$text]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result && $result['total_score'] >= 10) {
        return [
            'category_id' => $result['category_id'],
            'category_name' => $result['category_name'],
            'confidence' => min(95, max(70, intval($result['total_score'] * 5))),
            'matched_keywords' => $result['keyword_matches'],
            'source' => 'keyword_database'
        ];
    }
    
    return null;
}

/**
 * ルールベース判定
 */
function performRuleBasedMatching($productInfo) {
    $title = strtolower($productInfo['title']);
    
    $rules = [
        ['keywords' => ['iphone', 'android', 'smartphone', 'スマホ'], 
         'category' => ['293', 'Cell Phones & Smartphones'], 'confidence' => 85],
        ['keywords' => ['camera', 'canon', 'nikon', 'カメラ'], 
         'category' => ['625', 'Cameras & Photo'], 'confidence' => 80],
        ['keywords' => ['book', '本', 'manga', '漫画', '巻'], 
         'category' => ['267', 'Books & Magazines'], 'confidence' => 75],
        ['keywords' => ['watch', '時計', 'rolex'], 
         'category' => ['14324', 'Jewelry & Watches'], 'confidence' => 80],
        ['keywords' => ['game', 'ゲーム', 'playstation', 'nintendo'], 
         'category' => ['139973', 'Video Games'], 'confidence' => 80]
    ];
    
    foreach ($rules as $rule) {
        foreach ($rule['keywords'] as $keyword) {
            if (strpos($title, $keyword) !== false) {
                return [
                    'category_id' => $rule['category'][0],
                    'category_name' => $rule['category'][1],
                    'confidence' => $rule['confidence'],
                    'matched_keywords' => [$keyword],
                    'source' => 'rule_based'
                ];
            }
        }
    }
    
    return [
        'category_id' => '99999',
        'category_name' => 'Other',
        'confidence' => 30,
        'matched_keywords' => [],
        'source' => 'fallback'
    ];
}

/**
 * 学習データ保存
 */
function saveLearningData($pdo, $productInfo, $categoryResult) {
    $titleHash = hash('md5', strtolower($productInfo['title']));
    
    $sql = "
        INSERT INTO ebay_simple_learning (
            title_hash, title, brand, yahoo_category, price_jpy,
            learned_category_id, learned_category_name, confidence,
            usage_count, success_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
        ON CONFLICT (title_hash) DO UPDATE SET
            usage_count = ebay_simple_learning.usage_count + 1
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $titleHash,
        $productInfo['title'],
        $productInfo['brand'] ?? '',
        $productInfo['yahoo_category'] ?? '',
        intval($productInfo['price_jpy'] ?? 0),
        $categoryResult['category_id'],
        $categoryResult['category_name'],
        $categoryResult['confidence']
    ]);
}

/**
 * 使用回数増加
 */
function incrementUsage($pdo, $learningId) {
    $sql = "UPDATE ebay_simple_learning SET usage_count = usage_count + 1 WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$learningId]);
}

/**
 * システム統計取得
 */
function getSystemStats($pdo) {
    try {
        $stats = [];
        
        // 基本統計
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_patterns,
                ROUND(AVG(confidence), 1) as avg_confidence,
                SUM(usage_count) as total_usage,
                COUNT(CASE WHEN usage_count >= 5 THEN 1 END) as mature_patterns
            FROM ebay_simple_learning
        ");
        $basicStats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // カテゴリー別統計
        $stmt = $pdo->query("
            SELECT 
                learned_category_name as category_name,
                COUNT(*) as pattern_count,
                SUM(usage_count) as total_usage
            FROM ebay_simple_learning 
            GROUP BY learned_category_name 
            ORDER BY total_usage DESC 
            LIMIT 5
        ");
        $categoryStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // トップパターン
        $stmt = $pdo->query("
            SELECT title, learned_category_name as category, usage_count, confidence
            FROM ebay_simple_learning 
            ORDER BY usage_count DESC 
            LIMIT 5
        ");
        $topPatterns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'stats' => array_merge($basicStats, [
                'category_breakdown' => $categoryStats,
                'top_patterns' => $topPatterns,
                'database_size' => [
                    'categories' => $pdo->query("SELECT COUNT(*) FROM ebay_categories")->fetchColumn(),
                    'keywords' => $pdo->query("SELECT COUNT(*) FROM category_keywords")->fetchColumn(),
                    'fee_data' => $pdo->query("SELECT COUNT(*) FROM fee_matches")->fetchColumn()
                ]
            ])
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => '統計データ取得エラー: ' . $e->getMessage()
        ];
    }
}

/**
 * 利用可能カテゴリー取得
 */
function getAvailableCategories($pdo) {
    $stmt = $pdo->query("
        SELECT category_id, category_name, category_path
        FROM ebay_categories 
        WHERE is_active = TRUE 
        ORDER BY category_name
    ");
    
    return [
        'success' => true,
        'categories' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ];
}

/**
 * バッチ処理
 */
function handleBatchProcessing($pdo, $input) {
    $products = $input['products'] ?? [];
    
    if (empty($products)) {
        throw new Exception('処理する商品データがありません');
    }
    
    $results = [];
    $startTime = microtime(true);
    
    foreach ($products as $index => $product) {
        try {
            $categoryInput = ['product_info' => $product];
            $result = handleCategorySelection($pdo, $categoryInput);
            
            $results[] = [
                'index' => $index,
                'success' => true,
                'product' => $product,
                'category_result' => $result
            ];
            
        } catch (Exception $e) {
            $results[] = [
                'index' => $index,
                'success' => false,
                'product' => $product,
                'error' => $e->getMessage()
            ];
        }
    }
    
    return [
        'success' => true,
        'results' => $results,
        'summary' => [
            'total_items' => count($products),
            'success_items' => count(array_filter($results, function($r) { return $r['success']; })),
            'processing_time_ms' => round((microtime(true) - $startTime) * 1000)
        ]
    ];
}

/**
 * 手動学習
 */
function handleManualLearning($pdo, $input) {
    $productInfo = $input['product_info'] ?? [];
    $correctCategory = $input['correct_category'] ?? [];
    
    if (empty($productInfo['title']) || empty($correctCategory['category_id'])) {
        throw new Exception('商品情報と正解カテゴリーが必要です');
    }
    
    saveLearningData($pdo, $productInfo, $correctCategory);
    
    return [
        'success' => true,
        'message' => '手動学習データを保存しました',
        'learned_category' => $correctCategory
    ];
}

/**
 * eBayデータ同期シミュレーション
 */
function handleEbaySyncSimulation($pdo) {
    // 実際のAPI接続ではなく、データベース更新のシミュレーション
    $updates = [
        'categories_updated' => rand(5, 15),
        'keywords_added' => rand(10, 30),
        'fees_updated' => rand(3, 8)
    ];
    
    return [
        'success' => true,
        'message' => 'eBayデータ同期完了（シミュレーション）',
        'updates' => $updates,
        'timestamp' => date('Y-m-d H:i:s')
    ];
}
?>