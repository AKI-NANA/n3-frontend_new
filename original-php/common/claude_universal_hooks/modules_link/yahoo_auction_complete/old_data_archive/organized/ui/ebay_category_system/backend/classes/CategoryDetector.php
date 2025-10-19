<?php
/**
 * eBayカテゴリー自動判定エンジン - 高精度版
 * NAGANO-3 N3-Development統合システム
 */

class CategoryDetector {
    private $pdo;
    private $debugMode;
    
    public function __construct($dbConnection, $debugMode = false) {
        $this->pdo = $dbConnection;
        $this->debugMode = $debugMode;
    }
    
    /**
     * メイン機能: 商品データから最適なeBayカテゴリーを自動判定
     * @param array $productData ['title' => '', 'price' => 0.0, 'description' => '']
     * @return array ['category_id' => '', 'category_name' => '', 'confidence' => 0-100, 'matched_keywords' => []]
     */
    public function detectCategory($productData) {
        try {
            // 1️⃣ 入力データ検証
            if (!$this->validateProductData($productData)) {
                return $this->getDefaultCategory();
            }
            
            // 2️⃣ キーワードベース基本判定
            $keywordMatches = $this->matchByKeywords($productData['title'], $productData['description'] ?? '');
            
            // 3️⃣ 価格帯による精度向上
            $enhancedResult = $this->enhanceByPriceRange($keywordMatches, $productData['price']);
            
            // 4️⃣ 信頼度スコア計算
            $finalResult = $this->calculateFinalConfidence($enhancedResult, $productData);
            
            // 5️⃣ カテゴリー名取得
            $finalResult['category_name'] = $this->getCategoryName($finalResult['category_id']);
            
            if ($this->debugMode) {
                error_log('CategoryDetector: ' . json_encode($finalResult, JSON_UNESCAPED_UNICODE));
            }
            
            return $finalResult;
            
        } catch (Exception $e) {
            error_log('CategoryDetector Error: ' . $e->getMessage());
            return $this->getDefaultCategory();
        }
    }
    
    /**
     * 入力データ検証
     */
    private function validateProductData($productData) {
        return !empty($productData['title']) && 
               isset($productData['price']) && 
               is_numeric($productData['price']);
    }
    
    /**
     * キーワード辞書によるカテゴリー判定
     */
    private function matchByKeywords($title, $description = '') {
        $text = strtolower($title . ' ' . $description);
        $matches = [];
        
        // データベースからキーワード辞書を取得
        $sql = "
            SELECT ck.category_id, ck.keyword, ck.weight, ck.keyword_type, ec.category_name
            FROM category_keywords ck
            JOIN ebay_categories ec ON ck.category_id = ec.category_id
            WHERE ec.is_active = TRUE
            ORDER BY ck.weight DESC, ck.keyword_type ASC
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $keywords = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($keywords as $keywordData) {
            $keyword = strtolower($keywordData['keyword']);
            
            // キーワードマッチング（部分一致・完全一致を重み付け）
            if (strpos($text, $keyword) !== false) {
                $categoryId = $keywordData['category_id'];
                
                if (!isset($matches[$categoryId])) {
                    $matches[$categoryId] = [
                        'category_id' => $categoryId,
                        'category_name' => $keywordData['category_name'],
                        'score' => 0,
                        'matched_keywords' => []
                    ];
                }
                
                // スコア計算（キーワードタイプと重みを考慮）
                $score = $keywordData['weight'];
                if ($keywordData['keyword_type'] === 'primary') {
                    $score *= 2;
                }
                
                // 完全単語一致の場合はボーナススコア
                if (preg_match('/\b' . preg_quote($keyword, '/') . '\b/', $text)) {
                    $score *= 1.5;
                }
                
                $matches[$categoryId]['score'] += $score;
                $matches[$categoryId]['matched_keywords'][] = $keyword;
            }
        }
        
        // スコア順でソート
        uasort($matches, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });
        
        return array_slice($matches, 0, 3, true); // 上位3候補を返す
    }
    
    /**
     * 価格帯による判定精度向上
     */
    private function enhanceByPriceRange($matches, $price) {
        if (empty($matches)) {
            return $this->getDefaultCategory();
        }
        
        $topMatch = array_values($matches)[0];
        
        // 価格帯による信頼度調整
        $priceMultiplier = $this->getPriceMultiplier($topMatch['category_id'], $price);
        $topMatch['score'] *= $priceMultiplier;
        
        return $topMatch;
    }
    
    /**
     * カテゴリー別価格レンジによる信頼度係数
     */
    private function getPriceMultiplier($categoryId, $price) {
        // カテゴリー別の一般的な価格帯
        $priceRanges = [
            '293' => ['min' => 50, 'max' => 2000],    // Cell Phones
            '625' => ['min' => 100, 'max' => 5000],   // Cameras
            '58058' => ['min' => 1, 'max' => 500],    // Trading Cards
            '11450' => ['min' => 10, 'max' => 1000],  // Clothing
            '1249' => ['min' => 20, 'max' => 800],    // Video Games
        ];
        
        if (!isset($priceRanges[$categoryId])) {
            return 1.0; // デフォルト係数
        }
        
        $range = $priceRanges[$categoryId];
        
        if ($price >= $range['min'] && $price <= $range['max']) {
            return 1.2; // 価格帯が適切な場合は信頼度アップ
        } elseif ($price < $range['min'] * 0.5 || $price > $range['max'] * 2) {
            return 0.8; // 価格帯が大幅にずれている場合は信頼度ダウン
        }
        
        return 1.0;
    }
    
    /**
     * 最終信頼度スコア計算
     */
    private function calculateFinalConfidence($matchResult, $productData) {
        $baseScore = $matchResult['score'] ?? 0;
        
        // 基本スコアを0-100の範囲に正規化
        $confidence = min(100, max(10, ($baseScore / 20) * 100));
        
        // タイトル長による調整（詳細なタイトルほど信頼度アップ）
        $titleLength = mb_strlen($productData['title']);
        if ($titleLength > 20) {
            $confidence += 5;
        } elseif ($titleLength < 10) {
            $confidence -= 10;
        }
        
        // 最終調整
        $confidence = max(10, min(100, $confidence));
        
        return [
            'category_id' => $matchResult['category_id'],
            'confidence' => (int)round($confidence),
            'matched_keywords' => $matchResult['matched_keywords'] ?? [],
            'debug_score' => $baseScore
        ];
    }
    
    /**
     * カテゴリー名取得
     */
    private function getCategoryName($categoryId) {
        $sql = "SELECT category_name FROM ebay_categories WHERE category_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$categoryId]);
        
        $result = $stmt->fetch(PDO::FETCH_COLUMN);
        return $result ?: 'Unknown Category';
    }
    
    /**
     * デフォルトカテゴリー（判定失敗時）
     */
    private function getDefaultCategory() {
        return [
            'category_id' => '99999',
            'category_name' => 'Other',
            'confidence' => 30,
            'matched_keywords' => []
        ];
    }
    
    /**
     * 利用可能なカテゴリー一覧取得
     */
    public function getAvailableCategories() {
        $sql = "SELECT category_id, category_name, parent_id FROM ebay_categories WHERE is_active = TRUE ORDER BY category_name";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * カテゴリー統計情報取得
     */
    public function getCategoryStats() {
        $sql = "
            SELECT 
                ec.category_name,
                COUNT(ck.id) as keyword_count,
                AVG(ck.weight) as avg_weight
            FROM ebay_categories ec
            LEFT JOIN category_keywords ck ON ec.category_id = ck.category_id
            WHERE ec.is_active = TRUE
            GROUP BY ec.category_id, ec.category_name
            ORDER BY keyword_count DESC
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * バッチ処理用：複数商品の一括判定
     */
    public function detectCategoriesBatch($productDataArray) {
        $results = [];
        
        foreach ($productDataArray as $index => $productData) {
            try {
                $results[$index] = $this->detectCategory($productData);
                
                // メモリ使用量監視
                if (memory_get_usage() > 100 * 1024 * 1024) { // 100MB
                    gc_collect_cycles(); // ガベージコレクション実行
                }
                
            } catch (Exception $e) {
                error_log("Batch processing error for index {$index}: " . $e->getMessage());
                $results[$index] = $this->getDefaultCategory();
            }
        }
        
        return $results;
    }
}
?>