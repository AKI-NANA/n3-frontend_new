<?php
/**
 * eBayカテゴリー統合API - エラー修正版
 * ファイル: unified_api_fixed.php
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
    // データベース接続
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
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
            
        case 'test_database':
            echo json_encode(testDatabase($pdo), JSON_UNESCAPED_UNICODE);
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
 * データベーステスト
 */
function testDatabase($pdo) {
    try {
        $tables = [];
        
        // テーブル存在確認
        $checkTables = ['ebay_categories_full', 'ebay_category_fees', 'category_keywords', 'ebay_simple_learning'];
        
        foreach ($checkTables as $tableName) {
            try {
                $stmt = $pdo->query("SELECT COUNT(*) FROM {$tableName}");
                $count = $stmt->fetchColumn();
                $tables[$tableName] = ['exists' => true, 'count' => $count];
            } catch (Exception $e) {
                $tables[$tableName] = ['exists' => false, 'error' => $e->getMessage()];
            }
        }
        
        return [
            'success' => true,
            'database_status' => 'connected',
            'tables' => $tables,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'データベーステスト失敗: ' . $e->getMessage()
        ];
    }
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
    
    try {
        // 1. 学習データベース検索
        $learned = searchLearningDatabase($pdo, $productInfo);
        
        if ($learned && $learned['confidence'] >= 80) {
            incrementUsage($pdo, $learned['id']);
            
            // 手数料情報追加
            $feeInfo = getFeeInfo($pdo, $learned['learned_category_id']);
            
            return [
                'success' => true,
                'category' => [
                    'category_id' => $learned['learned_category_id'],
                    'category_name' => $learned['learned_category_name'],
                    'confidence' => $learned['confidence'],
                    'usage_count' => $learned['usage_count'] + 1,
                    'source' => 'learned_database',
                    'fee_info' => $feeInfo
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
            
            // 手数料情報追加
            $keywordResult['fee_info'] = getFeeInfo($pdo, $keywordResult['category_id']);
            
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
        
        // 手数料情報追加
        $ruleResult['fee_info'] = getFeeInfo($pdo, $ruleResult['category_id']);
        
        return [
            'success' => true,
            'category' => $ruleResult,
            'method' => 'rule_based_and_learned',
            'processing_time_ms' => round((microtime(true) - $startTime) * 1000)
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'カテゴリー選択エラー: ' . $e->getMessage(),
            'processing_time_ms' => round((microtime(true) - $startTime) * 1000)
        ];
    }
}

/**
 * 学習データベース検索
 */
function searchLearningDatabase($pdo, $productInfo) {
    try {
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
        
    } catch (Exception $e) {
        return null;
    }
}

/**
 * キーワードマッチング
 */
function performKeywordMatching($pdo, $productInfo) {
    try {
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
        
    } catch (Exception $e) {
        return null;
    }
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
         'category' => ['267', 'Books'], 'confidence' => 75],
        ['keywords' => ['watch', '時計', 'rolex'], 
         'category' => ['14324', 'Jewelry & Watches'], 'confidence' => 80],
        ['keywords' => ['game', 'ゲーム', 'playstation', 'nintendo'], 
         'category' => ['139973', 'Video Games'], 'confidence' => 80],
        ['keywords' => ['clothing', '服', 'shirt', 'dress'], 
         'category' => ['11450', 'Clothing, Shoes & Accessories'], 'confidence' => 75]
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
 * 手数料情報取得
 */
function getFeeInfo($pdo, $categoryId) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                final_value_fee_percent,
                fee_tier_1_percent,
                fee_tier_1_max,
                fee_tier_2_percent,
                fee_category_type,
                paypal_fee_percent,
                paypal_fee_fixed
            FROM ebay_category_fees 
            WHERE category_id = ?
            LIMIT 1
        ");
        $stmt->execute([$categoryId]);
        $fee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($fee) {
            return [
                'final_value_fee_percent' => floatval($fee['final_value_fee_percent']),
                'fee_structure' => $fee['fee_category_type'],
                'paypal_fee_percent' => floatval($fee['paypal_fee_percent']),
                'paypal_fee_fixed' => floatval($fee['paypal_fee_fixed']),
                'tier_info' => $fee['fee_tier_1_percent'] ? [
                    'tier_1_percent' => floatval($fee['fee_tier_1_percent']),
                    'tier_1_max' => floatval($fee['fee_tier_1_max']),
                    'tier_2_percent' => floatval($fee['fee_tier_2_percent'])
                ] : null
            ];
        }
        
        // デフォルト手数料
        return [
            'final_value_fee_percent' => 13.60,
            'fee_structure' => 'default',
            'paypal_fee_percent' => 2.90,
            'paypal_fee_fixed' => 0.30
        ];
        
    } catch (Exception $e) {
        return [
            'final_value_fee_percent' => 13.60,
            'fee_structure' => 'error_fallback',
            'paypal_fee_percent' => 2.90,
            'paypal_fee_fixed' => 0.30
        ];
    }
}

/**
 * 学習データ保存
 */
function saveLearningData($pdo, $productInfo, $categoryResult) {
    try {
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
        
    } catch (Exception $e) {
        // 学習データ保存失敗は無視
    }
}

/**
 * 使用回数増加
 */
function incrementUsage($pdo, $learningId) {
    try {
        $sql = "UPDATE ebay_simple_learning SET usage_count = usage_count + 1 WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$learningId]);
    } catch (Exception $e) {
        // 使用回数更新失敗は無視
    }
}

/**
 * システム統計取得
 */
function getSystemStats($pdo) {
    try {
        $stats = [];
        
        // 基本統計
        try {
            $stmt = $pdo->query("
                SELECT 
                    COUNT(*) as total_patterns,
                    ROUND(AVG(confidence), 1) as avg_confidence,
                    SUM(usage_count) as total_usage,
                    COUNT(CASE WHEN usage_count >= 5 THEN 1 END) as mature_patterns
                FROM ebay_simple_learning
            ");
            $basicStats = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $basicStats = [
                'total_patterns' => 0,
                'avg_confidence' => 0,
                'total_usage' => 0,
                'mature_patterns' => 0
            ];
        }
        
        // データベースサイズ
        $dbSizes = [];
        $tables = ['ebay_categories_full', 'ebay_category_fees', 'category_keywords'];
        
        foreach ($tables as $table) {
            try {
                $stmt = $pdo->query("SELECT COUNT(*) FROM {$table}");
                $dbSizes[$table] = $stmt->fetchColumn();
            } catch (Exception $e) {
                $dbSizes[$table] = 0;
            }
        }
        
        return [
            'success' => true,
            'stats' => array_merge($basicStats, [
                'database_size' => $dbSizes
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
    try {
        $stmt = $pdo->query("
            SELECT category_id, category_name, category_path
            FROM ebay_categories_full 
            WHERE is_active = TRUE 
            ORDER BY category_name
            LIMIT 50
        ");
        
        return [
            'success' => true,
            'categories' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ];
        
    } catch (Exception $e) {
        // フォールバック: 基本カテゴリー
        return [
            'success' => true,
            'categories' => [
                ['category_id' => '293', 'category_name' => 'Cell Phones & Smartphones', 'category_path' => 'Electronics'],
                ['category_id' => '625', 'category_name' => 'Cameras & Photo', 'category_path' => 'Electronics'],
                ['category_id' => '267', 'category_name' => 'Books', 'category_path' => 'Media'],
                ['category_id' => '11450', 'category_name' => 'Clothing, Shoes & Accessories', 'category_path' => 'Fashion'],
                ['category_id' => '14324', 'category_name' => 'Jewelry & Watches', 'category_path' => 'Fashion']
            ],
            'fallback' => true
        ];
    }
}
?>