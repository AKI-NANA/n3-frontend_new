<?php
/**
 * 簡易版自己学習型カテゴリー選択システム - 依存関係なし
 * ファイル: EbaySimpleLearningSelector.php
 */

class EbaySimpleLearningSelector {
    private $pdo;
    private $apiCallCount = 0;
    
    public function __construct($dbConnection) {
        $this->pdo = $dbConnection;
        $this->initializeSimpleTables();
        echo "✅ システム初期化完了\n";
    }
    
    /**
     * 依存関係のないテーブル初期化
     */
    private function initializeSimpleTables() {
        try {
            // 学習テーブル作成（PostgreSQL標準機能のみ）
            $this->pdo->exec("
                CREATE TABLE IF NOT EXISTS ebay_simple_learning (
                    id SERIAL PRIMARY KEY,
                    title_hash VARCHAR(64) UNIQUE,
                    title TEXT NOT NULL,
                    brand VARCHAR(100),
                    yahoo_category VARCHAR(200),
                    price_jpy INTEGER DEFAULT 0,
                    
                    learned_category_id VARCHAR(20),
                    learned_category_name VARCHAR(200),
                    confidence INTEGER DEFAULT 0,
                    
                    usage_count INTEGER DEFAULT 0,
                    success_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            ");
            
            echo "📊 学習テーブル作成完了\n";
            
        } catch (Exception $e) {
            echo "❌ テーブル作成エラー: " . $e->getMessage() . "\n";
        }
    }
    
    /**
     * シンプル学習検索
     */
    public function selectOptimalCategory($productInfo) {
        $startTime = microtime(true);
        $title = $productInfo['title'] ?? '';
        $brand = $productInfo['brand'] ?? '';
        $yahooCategory = $productInfo['yahoo_category'] ?? '';
        $price = intval($productInfo['price_jpy'] ?? 0);
        
        echo "\n🔍 商品分析: {$title}\n";
        
        try {
            // 1️⃣ 学習データベース検索
            $learned = $this->searchSimpleLearning($title, $brand, $yahooCategory);
            
            if ($learned) {
                echo "✅ 学習データベースヒット\n";
                $this->incrementUsage($learned['id']);
                
                return [
                    'success' => true,
                    'category' => [
                        'category_id' => $learned['learned_category_id'],
                        'category_name' => $learned['learned_category_name'],
                        'confidence' => $learned['confidence'],
                        'usage_count' => $learned['usage_count'] + 1
                    ],
                    'method' => 'learned_database',
                    'processing_time_ms' => round((microtime(true) - $startTime) * 1000)
                ];
            }
            
            // 2️⃣ 新しい商品 - 学習対象
            echo "📚 新商品 - 学習データ作成\n";
            $predicted = $this->predictAndLearn($productInfo);
            
            return [
                'success' => true,
                'category' => $predicted,
                'method' => 'predicted_and_learned',
                'processing_time_ms' => round((microtime(true) - $startTime) * 1000)
            ];
            
        } catch (Exception $e) {
            echo "❌ エラー: " . $e->getMessage() . "\n";
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 学習データ検索
     */
    private function searchSimpleLearning($title, $brand, $yahooCategory) {
        // 完全一致検索
        $titleHash = hash('md5', strtolower($title));
        
        $stmt = $this->pdo->prepare("
            SELECT * FROM ebay_simple_learning 
            WHERE title_hash = ? 
            ORDER BY usage_count DESC 
            LIMIT 1
        ");
        $stmt->execute([$titleHash]);
        $exact = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($exact) {
            echo "🎯 完全一致: {$exact['learned_category_name']}\n";
            return $exact;
        }
        
        // 部分一致検索
        $titleWords = explode(' ', strtolower($title));
        $mainWords = array_filter($titleWords, function($word) {
            return strlen($word) >= 3;
        });
        
        if (!empty($mainWords)) {
            $likeConditions = [];
            $params = [];
            
            foreach (array_slice($mainWords, 0, 3) as $word) { // 主要3語で検索
                $likeConditions[] = "LOWER(title) LIKE ?";
                $params[] = '%' . $word . '%';
            }
            
            $sql = "
                SELECT *, usage_count + success_count as score 
                FROM ebay_simple_learning 
                WHERE " . implode(' OR ', $likeConditions) . "
                ORDER BY score DESC 
                LIMIT 1
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $partial = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($partial && $partial['score'] >= 3) {
                echo "🔍 部分一致: {$partial['learned_category_name']}\n";
                return $partial;
            }
        }
        
        return null;
    }
    
    /**
     * 予測・学習
     */
    private function predictAndLearn($productInfo) {
        $title = strtolower($productInfo['title'] ?? '');
        $brand = strtolower($productInfo['brand'] ?? '');
        
        // シンプルなルールベース予測
        $predictions = [
            // スマートフォン
            ['keywords' => ['iphone', 'android', 'smartphone', 'スマホ', 'galaxy'], 
             'category' => ['293', 'Cell Phones & Smartphones'], 'confidence' => 90],
            
            // カメラ
            ['keywords' => ['camera', 'canon', 'nikon', 'sony', 'カメラ', 'レンズ'], 
             'category' => ['625', 'Cameras & Photo'], 'confidence' => 85],
            
            // ブック・漫画
            ['keywords' => ['book', '本', 'manga', 'マンガ', '漫画', '巻'], 
             'category' => ['267', 'Books & Magazines'], 'confidence' => 80],
            
            // 服・ファッション
            ['keywords' => ['shirt', 'dress', '服', 'fashion', 'clothing'], 
             'category' => ['11450', 'Clothing & Accessories'], 'confidence' => 75],
            
            // 時計
            ['keywords' => ['watch', '時計', 'rolex', 'omega', 'casio'], 
             'category' => ['14324', 'Watches'], 'confidence' => 80]
        ];
        
        $bestMatch = null;
        $bestScore = 0;
        
        foreach ($predictions as $prediction) {
            $score = 0;
            $matchedKeywords = [];
            
            foreach ($prediction['keywords'] as $keyword) {
                if (strpos($title, $keyword) !== false || strpos($brand, $keyword) !== false) {
                    $score += 20;
                    $matchedKeywords[] = $keyword;
                }
            }
            
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestMatch = [
                    'category_id' => $prediction['category'][0],
                    'category_name' => $prediction['category'][1],
                    'confidence' => min(100, ($score / 20) * ($prediction['confidence'] / 100) * 100),
                    'matched_keywords' => $matchedKeywords
                ];
            }
        }
        
        // フォールバック
        if (!$bestMatch || $bestMatch['confidence'] < 30) {
            $bestMatch = [
                'category_id' => '99999',
                'category_name' => 'Other',
                'confidence' => 25,
                'matched_keywords' => []
            ];
        }
        
        // 学習データとして保存
        $this->saveToLearning($productInfo, $bestMatch);
        
        echo "💡 予測結果: {$bestMatch['category_name']} ({$bestMatch['confidence']}%)\n";
        
        return $bestMatch;
    }
    
    /**
     * 学習データ保存
     */
    private function saveToLearning($productInfo, $prediction) {
        $titleHash = hash('md5', strtolower($productInfo['title'] ?? ''));
        
        $sql = "
            INSERT INTO ebay_simple_learning (
                title_hash, title, brand, yahoo_category, price_jpy,
                learned_category_id, learned_category_name, confidence,
                usage_count, success_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
            ON CONFLICT (title_hash) DO UPDATE SET
                usage_count = ebay_simple_learning.usage_count + 1
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $titleHash,
            $productInfo['title'] ?? '',
            $productInfo['brand'] ?? '',
            $productInfo['yahoo_category'] ?? '',
            intval($productInfo['price_jpy'] ?? 0),
            $prediction['category_id'],
            $prediction['category_name'],
            $prediction['confidence']
        ]);
        
        echo "💾 学習データ保存完了\n";
    }
    
    /**
     * 使用回数増加
     */
    private function incrementUsage($learningId) {
        $sql = "UPDATE ebay_simple_learning SET usage_count = usage_count + 1 WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$learningId]);
    }
    
    /**
     * 学習状況表示
     */
    public function showLearningStats() {
        try {
            $stmt = $this->pdo->query("
                SELECT 
                    COUNT(*) as total_patterns,
                    AVG(confidence) as avg_confidence,
                    SUM(usage_count) as total_usage,
                    COUNT(CASE WHEN usage_count >= 5 THEN 1 END) as mature_patterns
                FROM ebay_simple_learning
            ");
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo "\n📊 学習システム統計:\n";
            echo "  - 学習パターン数: {$stats['total_patterns']}\n";
            echo "  - 平均信頼度: " . round($stats['avg_confidence'], 1) . "%\n";  
            echo "  - 総使用回数: {$stats['total_usage']}\n";
            echo "  - 成熟パターン数: {$stats['mature_patterns']}\n";
            
            // トップパターン表示
            $stmt = $this->pdo->query("
                SELECT title, learned_category_name, usage_count, confidence
                FROM ebay_simple_learning 
                ORDER BY usage_count DESC 
                LIMIT 5
            ");
            
            echo "\n🏆 よく使われるパターン:\n";
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                echo "  - " . substr($row['title'], 0, 30) . "... → {$row['learned_category_name']} (使用{$row['usage_count']}回)\n";
            }
            
        } catch (Exception $e) {
            echo "統計取得エラー: " . $e->getMessage() . "\n";
        }
    }
}

// 実行テスト
if (__FILE__ === $_SERVER['SCRIPT_FILENAME']) {
    echo "🚀 簡易版学習システム テスト開始\n";
    echo "================================\n";
    
    try {
        $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $selector = new EbaySimpleLearningSelector($pdo);
        
        // テスト商品
        $testProducts = [
            [
                'title' => 'iPhone 14 Pro 128GB Space Black 美品',
                'brand' => 'Apple',
                'price_jpy' => 120000,
                'yahoo_category' => '携帯電話'
            ],
            [
                'title' => 'Canon EOS R6 Mark II ミラーレス一眼',
                'brand' => 'Canon',
                'price_jpy' => 280000,
                'yahoo_category' => 'デジタルカメラ'
            ],
            [
                'title' => 'ワンピース 107巻 最新刊',
                'brand' => '集英社',
                'price_jpy' => 528,
                'yahoo_category' => 'コミック'
            ],
            [
                'title' => 'iPhone 15 Pro 256GB Blue 新品',
                'brand' => 'Apple',
                'price_jpy' => 160000,
                'yahoo_category' => '携帯電話'
            ]
        ];
        
        foreach ($testProducts as $i => $product) {
            echo "\n" . str_repeat("=", 50) . "\n";
            echo "テスト " . ($i + 1) . "/4\n";
            
            $result = $selector->selectOptimalCategory($product);
            
            if ($result['success']) {
                $cat = $result['category'];
                echo "🎯 最終結果:\n";
                echo "  カテゴリー: {$cat['category_name']}\n";
                echo "  信頼度: {$cat['confidence']}%\n";
                echo "  判定方法: {$result['method']}\n";
                echo "  処理時間: {$result['processing_time_ms']}ms\n";
                
                if (isset($cat['usage_count'])) {
                    echo "  使用回数: {$cat['usage_count']}回\n";
                }
            } else {
                echo "❌ 処理失敗: {$result['error']}\n";
            }
        }
        
        // 学習統計表示
        echo "\n" . str_repeat("=", 50) . "\n";
        $selector->showLearningStats();
        
        echo "\n🎉 テスト完了!\n";
        echo "4回目のiPhoneテストで学習効果を確認できるはずです。\n";
        
    } catch (Exception $e) {
        echo "❌ データベースエラー: " . $e->getMessage() . "\n";
        echo "\n🔧 解決方法:\n";
        echo "1. PostgreSQL起動確認: brew services start postgresql\n";
        echo "2. データベース接続確認: psql -h localhost -U aritahiroaki -d nagano3_db\n";
    }
}
?>