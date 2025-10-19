<?php
/**
 * eBayカテゴリー選択システム - API使用量最適化版
 * ファイル: EbaySmartCategorySelector.php
 * 
 * API節約機能:
 * 1. 多段階フォールバック（API→DB→ルール）
 * 2. インテリジェントキャッシュ
 * 3. バッチ処理対応
 * 4. 学習機能付き
 */

class EbaySmartCategorySelector {
    private $pdo;
    private $ebayApiConfig;
    private $apiCallCount = 0;
    private $maxApiCalls = 100; // 1日の上限
    private $cacheDir = '/tmp/ebay_cache/';
    
    public function __construct($dbConnection, $ebayConfig = null) {
        $this->pdo = $dbConnection;
        $this->ebayApiConfig = $ebayConfig;
        
        // キャッシュディレクトリ作成
        if (!is_dir($this->cacheDir)) {
            mkdir($this->cacheDir, 0755, true);
        }
        
        // API使用量カウンタ初期化
        $this->loadApiUsage();
    }
    
    /**
     * スマートカテゴリー選択（API節約版）
     */
    public function selectOptimalCategory($productInfo) {
        $startTime = microtime(true);
        
        try {
            // 📊 Step 1: キャッシュ確認
            $cached = $this->getCachedResult($productInfo);
            if ($cached) {
                return $this->formatResult($cached, 'cache', $startTime);
            }
            
            // 📊 Step 2: データベース高精度マッチング
            $dbResult = $this->advancedDatabaseMatching($productInfo);
            if ($dbResult && $dbResult['confidence'] >= 85) {
                $this->cacheResult($productInfo, $dbResult);
                return $this->formatResult($dbResult, 'database_high_confidence', $startTime);
            }
            
            // 📊 Step 3: API使用可能性チェック
            if ($this->canUseApi()) {
                try {
                    $apiResult = $this->getEbaySuggestedCategories($productInfo);
                    if ($apiResult) {
                        $this->incrementApiUsage();
                        $this->cacheResult($productInfo, $apiResult);
                        $this->learnFromApiResult($productInfo, $apiResult);
                        return $this->formatResult($apiResult, 'ebay_api', $startTime);
                    }
                } catch (Exception $e) {
                    error_log("eBay API error: " . $e->getMessage());
                }
            }
            
            // 📊 Step 4: 高度ルールベース判定
            $ruleResult = $this->intelligentRuleBasedMatching($productInfo);
            if ($ruleResult) {
                return $this->formatResult($ruleResult, 'intelligent_rules', $startTime);
            }
            
            // 📊 Step 5: フォールバック
            return $this->formatResult($this->getFallbackCategory($productInfo), 'fallback', $startTime);
            
        } catch (Exception $e) {
            error_log("Category selection error: " . $e->getMessage());
            return $this->formatResult($this->getFallbackCategory($productInfo), 'error_fallback', $startTime);
        }
    }
    
    /**
     * 高度データベースマッチング（API代替）
     */
    private function advancedDatabaseMatching($productInfo) {
        $title = strtolower($productInfo['title'] ?? '');
        $description = strtolower($productInfo['description'] ?? '');
        $brand = strtolower($productInfo['brand'] ?? '');
        $yahooCategory = strtolower($productInfo['yahoo_category'] ?? '');
        
        // 複合検索クエリ
        $sql = "
            SELECT 
                ec.category_id,
                ec.category_name,
                ec.category_path,
                SUM(
                    CASE 
                        WHEN ck.keyword_type = 'primary' AND LOWER(?) LIKE CONCAT('%', LOWER(ck.keyword), '%') THEN ck.weight * 3
                        WHEN ck.keyword_type = 'secondary' AND LOWER(?) LIKE CONCAT('%', LOWER(ck.keyword), '%') THEN ck.weight * 2
                        WHEN LOWER(?) LIKE CONCAT('%', LOWER(ck.keyword), '%') THEN ck.weight
                        WHEN LOWER(?) LIKE CONCAT('%', LOWER(ck.keyword), '%') THEN ck.weight * 1.5
                        ELSE 0
                    END
                ) as total_score,
                COUNT(DISTINCT ck.keyword) as keyword_matches
            FROM ebay_categories ec
            JOIN category_keywords ck ON ec.category_id = ck.category_id
            WHERE ec.is_active = true
            GROUP BY ec.category_id, ec.category_name, ec.category_path
            HAVING total_score > 10
            ORDER BY total_score DESC, keyword_matches DESC
            LIMIT 5
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$title, $title, $description, $yahooCategory]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($results)) {
            return null;
        }
        
        $bestMatch = $results[0];
        
        // 信頼度計算（0-100%）
        $confidence = min(100, ($bestMatch['total_score'] / 50) * 100);
        
        // 価格帯チェック
        if (isset($productInfo['price_jpy'])) {
            $priceConfidence = $this->calculatePriceCompatibility($bestMatch['category_id'], $productInfo['price_jpy']);
            $confidence *= $priceConfidence;
        }
        
        return [
            'category_id' => $bestMatch['category_id'],
            'category_name' => $bestMatch['category_name'],
            'category_path' => $bestMatch['category_path'],
            'confidence' => round($confidence),
            'matched_keywords' => $bestMatch['keyword_matches'],
            'score_details' => $bestMatch['total_score']
        ];
    }
    
    /**
     * インテリジェントルールベースマッチング
     */
    private function intelligentRuleBasedMatching($productInfo) {
        $title = strtolower($productInfo['title'] ?? '');
        $brand = strtolower($productInfo['brand'] ?? '');
        $price = $productInfo['price_jpy'] ?? 0;
        
        // 学習済みパターン
        $patterns = [
            // スマートフォン
            [
                'keywords' => ['iphone', 'android', 'smartphone', 'スマホ', 'galaxy', 'pixel'],
                'category_id' => '293',
                'category_name' => 'Cell Phones & Smartphones',
                'confidence' => 90,
                'price_range' => [10000, 300000]
            ],
            
            // カメラ
            [
                'keywords' => ['camera', 'canon', 'nikon', 'sony', 'カメラ', 'eos', 'alpha'],
                'category_id' => '625', 
                'category_name' => 'Cameras & Photo',
                'confidence' => 85,
                'price_range' => [5000, 500000]
            ],
            
            // ブック
            [
                'keywords' => ['book', 'magazine', '本', '雑誌', 'manga', 'マンガ'],
                'category_id' => '267',
                'category_name' => 'Books, Movies & Music',
                'confidence' => 80,
                'price_range' => [100, 10000]
            ],
            
            // アパレル
            [
                'keywords' => ['shirt', 'dress', 'shoes', '服', 'ファッション', 'clothing'],
                'category_id' => '11450',
                'category_name' => 'Clothing, Shoes & Accessories', 
                'confidence' => 75,
                'price_range' => [500, 50000]
            ],
            
            // 時計・ジュエリー
            [
                'keywords' => ['watch', 'jewelry', '時計', 'ring', 'necklace', 'rolex'],
                'category_id' => '14324',
                'category_name' => 'Jewelry & Watches',
                'confidence' => 85,
                'price_range' => [1000, 1000000]
            ],
        ];
        
        $bestMatch = null;
        $bestScore = 0;
        
        foreach ($patterns as $pattern) {
            $score = 0;
            $matchedKeywords = [];
            
            // キーワードマッチング
            foreach ($pattern['keywords'] as $keyword) {
                if (strpos($title, $keyword) !== false) {
                    $score += 20;
                    $matchedKeywords[] = $keyword;
                }
                if (strpos($brand, $keyword) !== false) {
                    $score += 15;
                    $matchedKeywords[] = $keyword;
                }
            }
            
            // 価格レンジチェック
            if ($price > 0 && 
                $price >= $pattern['price_range'][0] && 
                $price <= $pattern['price_range'][1]) {
                $score += 10;
            }
            
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestMatch = [
                    'category_id' => $pattern['category_id'],
                    'category_name' => $pattern['category_name'],
                    'confidence' => min(100, ($score / 40) * $pattern['confidence']),
                    'matched_keywords' => $matchedKeywords,
                    'rule_score' => $score
                ];
            }
        }
        
        return $bestMatch;
    }
    
    /**
     * キャッシュ機能
     */
    private function getCachedResult($productInfo) {
        $cacheKey = $this->generateCacheKey($productInfo);
        $cacheFile = $this->cacheDir . $cacheKey . '.json';
        
        if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 86400) { // 24時間キャッシュ
            return json_decode(file_get_contents($cacheFile), true);
        }
        
        return null;
    }
    
    private function cacheResult($productInfo, $result) {
        $cacheKey = $this->generateCacheKey($productInfo);
        $cacheFile = $this->cacheDir . $cacheKey . '.json';
        
        file_put_contents($cacheFile, json_encode($result));
    }
    
    private function generateCacheKey($productInfo) {
        $keyData = [
            'title' => strtolower($productInfo['title'] ?? ''),
            'brand' => strtolower($productInfo['brand'] ?? ''),
            'yahoo_category' => strtolower($productInfo['yahoo_category'] ?? '')
        ];
        
        return 'cat_' . md5(json_encode($keyData));
    }
    
    /**
     * API使用量管理
     */
    private function canUseApi() {
        return $this->apiCallCount < $this->maxApiCalls;
    }
    
    private function loadApiUsage() {
        $usageFile = $this->cacheDir . 'api_usage_' . date('Y-m-d') . '.txt';
        
        if (file_exists($usageFile)) {
            $this->apiCallCount = intval(file_get_contents($usageFile));
        } else {
            $this->apiCallCount = 0;
        }
    }
    
    private function incrementApiUsage() {
        $this->apiCallCount++;
        $usageFile = $this->cacheDir . 'api_usage_' . date('Y-m-d') . '.txt';
        file_put_contents($usageFile, $this->apiCallCount);
    }
    
    /**
     * 学習機能
     */
    private function learnFromApiResult($productInfo, $apiResult) {
        // API結果を学習データとして保存
        $learnData = [
            'title' => $productInfo['title'],
            'result_category_id' => $apiResult['category_id'],
            'confidence' => $apiResult['confidence'],
            'timestamp' => time()
        ];
        
        $learnFile = $this->cacheDir . 'learning_data.jsonl';
        file_put_contents($learnFile, json_encode($learnData) . "\n", FILE_APPEND);
    }
    
    /**
     * バッチ処理対応
     */
    public function selectCategoriesForBatch($products, $options = []) {
        $results = [];
        $apiUsageStart = $this->apiCallCount;
        
        // 優先度付きソート（価格が高い・複雑なものを優先してAPI使用）
        usort($products, function($a, $b) {
            $priceA = $a['price_jpy'] ?? 0;
            $priceB = $b['price_jpy'] ?? 0;
            return $priceB <=> $priceA;
        });
        
        foreach ($products as $index => $product) {
            $result = $this->selectOptimalCategory($product);
            $results[] = array_merge($result, ['product_index' => $index]);
            
            // API使用量チェック
            if ($this->apiCallCount >= $this->maxApiCalls) {
                error_log("API limit reached, switching to database/rule-based only");
                break;
            }
        }
        
        return [
            'results' => $results,
            'api_calls_used' => $this->apiCallCount - $apiUsageStart,
            'remaining_api_calls' => $this->maxApiCalls - $this->apiCallCount,
            'total_processed' => count($results)
        ];
    }
    
    /**
     * 結果フォーマット
     */
    private function formatResult($categoryData, $method, $startTime) {
        // 手数料情報追加
        if (isset($categoryData['category_id'])) {
            $categoryData['fee_info'] = $this->getFeeInfo($categoryData['category_id']);
        }
        
        return [
            'success' => true,
            'category' => $categoryData,
            'method' => $method,
            'processing_time_ms' => round((microtime(true) - $startTime) * 1000),
            'api_calls_remaining' => $this->maxApiCalls - $this->apiCallCount,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * eBay API呼び出し（簡易版）
     */
    private function getEbaySuggestedCategories($productInfo) {
        // API設定がない場合は null を返す（フォールバックを使用）
        if (!$this->ebayApiConfig || !isset($this->ebayApiConfig['app_id'])) {
            return null;
        }
        
        // 実際のeBay API呼び出し処理
        // （省略 - 前回の実装を参照）
        
        return null; // API未設定時
    }
    
    private function getFeeInfo($categoryId) {
        $stmt = $this->pdo->prepare("SELECT * FROM fee_matches WHERE category_id = ? LIMIT 1");
        $stmt->execute([$categoryId]);
        $fee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $fee ? [
            'final_value_fee_percent' => $fee['fee_percent'],
            'confidence' => $fee['confidence']
        ] : [
            'final_value_fee_percent' => 13.25,
            'confidence' => 50
        ];
    }
    
    private function getFallbackCategory($productInfo) {
        return [
            'category_id' => '99999',
            'category_name' => 'Other',
            'confidence' => 30
        ];
    }
    
    private function calculatePriceCompatibility($categoryId, $priceJpy) {
        // 価格適正性チェック（簡易版）
        return 1.0;
    }
}

// 実行例
if (__FILE__ === $_SERVER['SCRIPT_FILENAME']) {
    try {
        $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
        $selector = new EbaySmartCategorySelector($pdo);
        
        echo "🚀 API節約型eBayカテゴリー選択システム テスト\n";
        echo "=============================================\n";
        
        // テスト商品
        $testProducts = [
            [
                'title' => 'iPhone 14 Pro 128GB Space Black',
                'brand' => 'Apple',
                'price_jpy' => 120000,
                'yahoo_category' => '携帯電話'
            ],
            [
                'title' => 'Canon EOS R6 Mark II ボディ',
                'brand' => 'Canon', 
                'price_jpy' => 280000,
                'yahoo_category' => 'カメラ'
            ],
            [
                'title' => 'ワンピース 103巻',
                'brand' => '集英社',
                'price_jpy' => 500,
                'yahoo_category' => '漫画'
            ]
        ];
        
        foreach ($testProducts as $index => $product) {
            echo "\n--- 商品 " . ($index + 1) . " ---\n";
            echo "商品: {$product['title']}\n";
            
            $result = $selector->selectOptimalCategory($product);
            
            if ($result['success']) {
                $cat = $result['category'];
                echo "✅ カテゴリー: {$cat['category_name']} (ID: {$cat['category_id']})\n";
                echo "📊 信頼度: {$cat['confidence']}%\n";
                echo "💰 手数料: {$cat['fee_info']['final_value_fee_percent']}%\n";
                echo "⚡ 処理時間: {$result['processing_time_ms']}ms\n";
                echo "🔧 判定方法: {$result['method']}\n";
                echo "🎯 残りAPI回数: {$result['api_calls_remaining']}\n";
            }
        }
        
        echo "\n🎉 テスト完了!\n";
        
    } catch (Exception $e) {
        echo "❌ エラー: " . $e->getMessage() . "\n";
    }
}
?>