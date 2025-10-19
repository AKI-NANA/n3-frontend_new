<?php
/**
 * 自己学習型eBayカテゴリー選択システム - 完全版
 * ファイル: EbayLearningCategorySelector.php
 * 
 * 学習機能:
 * 1. API結果の自動DB蓄積
 * 2. 商品パターンの継続学習
 * 3. 精度向上の自動フィードバック
 * 4. 未知商品の自動判定・学習
 */

class EbayLearningCategorySelector {
    private $pdo;
    private $apiCallCount = 0;
    private $maxApiCalls = 100;
    private $learningThreshold = 70; // 信頼度70%未満なら学習対象
    
    public function __construct($dbConnection) {
        $this->pdo = $dbConnection;
        $this->initializeLearningTables();
        $this->loadApiUsage();
    }
    
    /**
     * 学習型カテゴリー選択システム
     */
    public function selectOptimalCategory($productInfo) {
        $startTime = microtime(true);
        
        try {
            // 1️⃣ 学習済みデータベース検索
            $dbResult = $this->searchLearningDatabase($productInfo);
            
            if ($dbResult && $dbResult['confidence'] >= 85) {
                // 高信頼度の場合、そのまま返却
                return $this->formatResult($dbResult, 'learned_database', $startTime);
            }
            
            // 2️⃣ 曖昧な場合はAPI使用 + 学習
            if ($this->shouldUseApiForLearning($dbResult) && $this->canUseApi()) {
                $apiResult = $this->getEbayApiAndLearn($productInfo);
                if ($apiResult) {
                    return $this->formatResult($apiResult, 'api_learned', $startTime);
                }
            }
            
            // 3️⃣ フォールバック（未学習パターンも記録）
            $fallbackResult = $this->intelligentFallback($productInfo);
            $this->recordUnknownPattern($productInfo, $fallbackResult);
            
            return $this->formatResult($fallbackResult, 'fallback_recorded', $startTime);
            
        } catch (Exception $e) {
            error_log("Learning system error: " . $e->getMessage());
            return $this->formatResult($this->getEmergencyFallback(), 'error', $startTime);
        }
    }
    
    /**
     * 学習テーブル初期化
     */
    private function initializeLearningTables() {
        // 学習済み商品パターンテーブル
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS ebay_learning_patterns (
                id SERIAL PRIMARY KEY,
                title_pattern VARCHAR(255),
                title_keywords TEXT[],
                brand VARCHAR(100),
                yahoo_category VARCHAR(255),
                price_range_min INTEGER DEFAULT 0,
                price_range_max INTEGER DEFAULT 999999999,
                
                learned_category_id VARCHAR(20),
                learned_category_name VARCHAR(255),
                confidence_score INTEGER,
                
                learning_source VARCHAR(50), -- 'api', 'manual', 'feedback'
                times_used INTEGER DEFAULT 0,
                success_rate DECIMAL(5,2) DEFAULT 100.00,
                
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ");
        
        // 学習履歴テーブル
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS ebay_learning_history (
                id SERIAL PRIMARY KEY,
                product_title TEXT,
                product_info JSONB,
                
                prediction_category_id VARCHAR(20),
                prediction_confidence INTEGER,
                prediction_method VARCHAR(50),
                
                actual_category_id VARCHAR(20),
                was_correct BOOLEAN,
                feedback_score INTEGER, -- -1 to 1
                
                created_at TIMESTAMP DEFAULT NOW()
            )
        ");
        
        // 未知パターン記録テーブル
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS ebay_unknown_patterns (
                id SERIAL PRIMARY KEY,
                title_hash VARCHAR(64) UNIQUE,
                title TEXT,
                brand VARCHAR(100),
                yahoo_category VARCHAR(255),
                price_jpy INTEGER,
                
                occurrence_count INTEGER DEFAULT 1,
                needs_learning BOOLEAN DEFAULT TRUE,
                priority_score INTEGER DEFAULT 50,
                
                first_seen TIMESTAMP DEFAULT NOW(),
                last_seen TIMESTAMP DEFAULT NOW()
            )
        ");
        
        echo "✅ 学習テーブル初期化完了\n";
    }
    
    /**
     * 学習済みデータベース検索（進化版）
     */
    private function searchLearningDatabase($productInfo) {
        $title = strtolower($productInfo['title'] ?? '');
        $brand = strtolower($productInfo['brand'] ?? '');
        $yahooCategory = strtolower($productInfo['yahoo_category'] ?? '');
        $price = intval($productInfo['price_jpy'] ?? 0);
        
        // 複合マッチング検索
        $sql = "
            SELECT 
                lp.learned_category_id,
                lp.learned_category_name, 
                lp.confidence_score,
                lp.success_rate,
                lp.times_used,
                
                -- マッチングスコア計算
                (
                    -- タイトル類似度
                    CASE WHEN similarity(?, lp.title_pattern) > 0.3 THEN similarity(?, lp.title_pattern) * 40 ELSE 0 END +
                    
                    -- キーワード一致度
                    CASE WHEN lp.title_keywords && string_to_array(lower(?), ' ') 
                         THEN array_length(lp.title_keywords & string_to_array(lower(?), ' '), 1) * 10 
                         ELSE 0 END +
                    
                    -- ブランド一致
                    CASE WHEN LOWER(lp.brand) = ? THEN 25 ELSE 0 END +
                    
                    -- Yahooカテゴリー一致
                    CASE WHEN LOWER(lp.yahoo_category) = ? THEN 20 ELSE 0 END +
                    
                    -- 価格帯一致
                    CASE WHEN ? BETWEEN lp.price_range_min AND lp.price_range_max THEN 15 ELSE 0 END +
                    
                    -- 成功率ボーナス
                    (lp.success_rate / 100.0) * 10 +
                    
                    -- 使用実績ボーナス
                    LEAST(lp.times_used, 10) * 2
                    
                ) as match_score
                
            FROM ebay_learning_patterns lp
            WHERE lp.confidence_score >= 50
            ORDER BY match_score DESC
            LIMIT 5
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $title, $title, $title, $title, $brand, $yahooCategory, $price
        ]);
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($results) || $results[0]['match_score'] < 30) {
            return null;
        }
        
        $best = $results[0];
        
        // 使用回数を増やす
        $this->incrementPatternUsage($best['learned_category_id'], $title);
        
        return [
            'category_id' => $best['learned_category_id'],
            'category_name' => $best['learned_category_name'],
            'confidence' => min(100, intval($best['match_score'])),
            'learning_source' => 'database',
            'times_used' => $best['times_used'] + 1,
            'success_rate' => $best['success_rate']
        ];
    }
    
    /**
     * API学習判定
     */
    private function shouldUseApiForLearning($dbResult) {
        // DBにマッチがない、または信頼度が低い場合
        return !$dbResult || $dbResult['confidence'] < $this->learningThreshold;
    }
    
    /**
     * eBay API呼び出し + 学習
     */
    private function getEbayApiAndLearn($productInfo) {
        try {
            // 実際のAPI呼び出し（簡易シミュレーション）
            $apiResult = $this->simulateEbayApiCall($productInfo);
            
            if ($apiResult) {
                $this->incrementApiUsage();
                
                // 学習データとして保存
                $this->learnFromApiResult($productInfo, $apiResult);
                
                echo "📚 学習: {$productInfo['title']} → {$apiResult['category_name']}\n";
                
                return $apiResult;
            }
            
        } catch (Exception $e) {
            error_log("API learning error: " . $e->getMessage());
        }
        
        return null;
    }
    
    /**
     * API結果からの学習
     */
    private function learnFromApiResult($productInfo, $apiResult) {
        $title = $productInfo['title'] ?? '';
        $brand = $productInfo['brand'] ?? '';
        $yahooCategory = $productInfo['yahoo_category'] ?? '';
        $price = intval($productInfo['price_jpy'] ?? 0);
        
        // キーワード抽出
        $keywords = $this->extractLearningKeywords($title);
        
        // 価格帯設定
        $priceMin = max(0, $price - ($price * 0.3));
        $priceMax = $price + ($price * 0.5);
        
        // 学習パターン保存
        $sql = "
            INSERT INTO ebay_learning_patterns (
                title_pattern, title_keywords, brand, yahoo_category,
                price_range_min, price_range_max,
                learned_category_id, learned_category_name, confidence_score,
                learning_source, times_used
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'api', 1)
            ON CONFLICT (title_pattern) DO UPDATE SET
                times_used = ebay_learning_patterns.times_used + 1,
                updated_at = NOW()
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            strtolower($title),
            '{' . implode(',', array_map(function($k) { return '"' . $k . '"'; }, $keywords)) . '}',
            strtolower($brand),
            strtolower($yahooCategory),
            $priceMin,
            $priceMax,
            $apiResult['category_id'],
            $apiResult['category_name'],
            $apiResult['confidence']
        ]);
    }
    
    /**
     * 未知パターンの記録
     */
    private function recordUnknownPattern($productInfo, $result) {
        $titleHash = hash('sha256', strtolower($productInfo['title'] ?? ''));
        
        $sql = "
            INSERT INTO ebay_unknown_patterns (
                title_hash, title, brand, yahoo_category, price_jpy, priority_score
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (title_hash) DO UPDATE SET
                occurrence_count = ebay_unknown_patterns.occurrence_count + 1,
                priority_score = ebay_unknown_patterns.priority_score + 5,
                last_seen = NOW()
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $titleHash,
            $productInfo['title'] ?? '',
            $productInfo['brand'] ?? '',
            $productInfo['yahoo_category'] ?? '',
            intval($productInfo['price_jpy'] ?? 0),
            $result['confidence'] < 50 ? 80 : 50
        ]);
    }
    
    /**
     * 学習優先度の高い未知パターンを取得
     */
    public function getHighPriorityLearningTargets($limit = 10) {
        $sql = "
            SELECT * FROM ebay_unknown_patterns 
            WHERE needs_learning = TRUE 
            ORDER BY priority_score DESC, occurrence_count DESC 
            LIMIT ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$limit]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 学習システムの統計情報
     */
    public function getLearningStats() {
        $stats = [];
        
        // 学習済みパターン数
        $stmt = $this->pdo->query("SELECT COUNT(*) FROM ebay_learning_patterns");
        $stats['learned_patterns'] = $stmt->fetchColumn();
        
        // 今日の学習数
        $stmt = $this->pdo->query("
            SELECT COUNT(*) FROM ebay_learning_patterns 
            WHERE DATE(created_at) = CURRENT_DATE
        ");
        $stats['learned_today'] = $stmt->fetchColumn();
        
        // 未知パターン数
        $stmt = $this->pdo->query("
            SELECT COUNT(*) FROM ebay_unknown_patterns 
            WHERE needs_learning = TRUE
        ");
        $stats['unknown_patterns'] = $stmt->fetchColumn();
        
        // 平均成功率
        $stmt = $this->pdo->query("
            SELECT AVG(success_rate) FROM ebay_learning_patterns 
            WHERE times_used >= 3
        ");
        $stats['avg_success_rate'] = round($stmt->fetchColumn(), 1);
        
        // API使用状況
        $stats['api_calls_used'] = $this->apiCallCount;
        $stats['api_calls_remaining'] = $this->maxApiCalls - $this->apiCallCount;
        
        return $stats;
    }
    
    /**
     * 手動学習データ追加
     */
    public function addManualLearning($productInfo, $correctCategoryId, $correctCategoryName) {
        $this->learnFromApiResult($productInfo, [
            'category_id' => $correctCategoryId,
            'category_name' => $correctCategoryName,
            'confidence' => 95 // 手動学習は高信頼度
        ]);
        
        // 学習履歴に記録
        $sql = "
            INSERT INTO ebay_learning_history (
                product_title, product_info, actual_category_id, 
                was_correct, feedback_score
            ) VALUES (?, ?, ?, TRUE, 1)
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $productInfo['title'],
            json_encode($productInfo),
            $correctCategoryId
        ]);
        
        echo "📚 手動学習完了: {$productInfo['title']} → {$correctCategoryName}\n";
    }
    
    // ユーティリティメソッド
    private function extractLearningKeywords($title) {
        $words = array_filter(
            explode(' ', strtolower(preg_replace('/[^\w\s]/', ' ', $title))),
            function($word) { return strlen($word) >= 3; }
        );
        return array_slice(array_unique($words), 0, 10);
    }
    
    private function simulateEbayApiCall($productInfo) {
        // API未設定時のシミュレーション
        $title = strtolower($productInfo['title'] ?? '');
        
        $simulations = [
            'iphone' => ['293', 'Cell Phones & Smartphones', 95],
            'camera' => ['625', 'Cameras & Photo', 90],
            'book' => ['267', 'Books, Movies & Music', 85],
            'shirt' => ['11450', 'Clothing, Shoes & Accessories', 80],
            'watch' => ['14324', 'Jewelry & Watches', 85]
        ];
        
        foreach ($simulations as $keyword => $data) {
            if (strpos($title, $keyword) !== false) {
                return [
                    'category_id' => $data[0],
                    'category_name' => $data[1],
                    'confidence' => $data[2]
                ];
            }
        }
        
        return null;
    }
    
    private function incrementPatternUsage($categoryId, $title) {
        $sql = "
            UPDATE ebay_learning_patterns 
            SET times_used = times_used + 1, updated_at = NOW() 
            WHERE learned_category_id = ? AND LOWER(title_pattern) = LOWER(?)
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$categoryId, $title]);
    }
    
    private function intelligentFallback($productInfo) {
        return [
            'category_id' => '99999',
            'category_name' => 'Other',
            'confidence' => 30
        ];
    }
    
    private function getEmergencyFallback() {
        return [
            'category_id' => '99999',
            'category_name' => 'Emergency Fallback',
            'confidence' => 20
        ];
    }
    
    private function formatResult($result, $method, $startTime) {
        return [
            'success' => true,
            'category' => $result,
            'method' => $method,
            'processing_time_ms' => round((microtime(true) - $startTime) * 1000),
            'learning_enabled' => true
        ];
    }
    
    private function canUseApi() {
        return $this->apiCallCount < $this->maxApiCalls;
    }
    
    private function loadApiUsage() {
        // API使用量読み込み（簡易版）
        $this->apiCallCount = 0;
    }
    
    private function incrementApiUsage() {
        $this->apiCallCount++;
    }
}

// 実行テスト
if (__FILE__ === $_SERVER['SCRIPT_FILENAME']) {
    try {
        $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $learningSelector = new EbayLearningCategorySelector($pdo);
        
        echo "🧠 自己学習型eBayカテゴリー選択システム テスト\n";
        echo "===============================================\n";
        
        // テスト商品（学習データ）
        $testProducts = [
            [
                'title' => 'iPhone 15 Pro Max 256GB ナチュラルチタニウム',
                'brand' => 'Apple',
                'price_jpy' => 180000,
                'yahoo_category' => '携帯電話'
            ],
            [
                'title' => 'Canon EOS R8 ミラーレス一眼カメラ',
                'brand' => 'Canon',
                'price_jpy' => 250000,
                'yahoo_category' => 'デジタルカメラ'
            ],
            [
                'title' => 'ワンピース 最新刊 107巻',
                'brand' => '集英社',
                'price_jpy' => 528,
                'yahoo_category' => 'コミック'
            ]
        ];
        
        // 初回実行（学習フェーズ）
        echo "\n=== 初回実行（学習フェーズ） ===\n";
        foreach ($testProducts as $i => $product) {
            echo "\n商品" . ($i + 1) . ": {$product['title']}\n";
            $result = $learningSelector->selectOptimalCategory($product);
            
            if ($result['success']) {
                $cat = $result['category'];
                echo "✅ カテゴリー: {$cat['category_name']}\n";
                echo "📊 信頼度: {$cat['confidence']}%\n";
                echo "🔧 判定方法: {$result['method']}\n";
            }
        }
        
        // 学習統計表示
        echo "\n=== 学習システム統計 ===\n";
        $stats = $learningSelector->getLearningStats();
        foreach ($stats as $key => $value) {
            echo "📈 {$key}: {$value}\n";
        }
        
        // 類似商品での2回目実行（学習効果確認）
        echo "\n=== 2回目実行（学習効果確認） ===\n";
        $similarProduct = [
            'title' => 'iPhone 15 128GB ブルー',
            'brand' => 'Apple', 
            'price_jpy' => 140000,
            'yahoo_category' => '携帯電話'
        ];
        
        $result = $learningSelector->selectOptimalCategory($similarProduct);
        if ($result['success']) {
            $cat = $result['category'];
            echo "✅ 類似商品判定: {$cat['category_name']}\n";
            echo "📊 信頼度: {$cat['confidence']}%\n";
            echo "🔧 判定方法: {$result['method']} (学習データベース使用)\n";
        }
        
        echo "\n🎉 学習システムテスト完了!\n";
        
    } catch (Exception $e) {
        echo "❌ エラー: " . $e->getMessage() . "\n";
        echo "スタックトレース: " . $e->getTraceAsString() . "\n";
    }
}
?>