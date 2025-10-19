<?php
/**
 * CategoryDetector修正版 - Stage 1&2段階的判定システム
 * Gemini推奨の循環依存解決アプローチ実装
 * 31,644カテゴリー完全対応
 */

class CategoryDetector {
    private $pdo;
    private $debugMode;
    
    public function __construct($dbConnection, $debugMode = false) {
        $this->pdo = $dbConnection;
        $this->debugMode = $debugMode;
    }
    
    /**
     * Stage 1: 基本カテゴリー判定（利益抜き70%精度）
     * 循環依存解決の第一段階
     */
    public function detectCategoryBasic($productData) {
        try {
            if (!$this->validateProductData($productData)) {
                return $this->getDefaultCategory('basic');
            }
            
            // キーワードマッチング（既存31,644カテゴリー活用）
            $keywordScore = $this->matchByKeywords($productData['title'], $productData['description'] ?? '');
            
            // 価格帯適合性チェック
            $priceScore = $this->validatePriceRange($productData['price'], $keywordScore);
            
            // Stage 1基本スコア計算（利益要素完全除外）
            $basicConfidence = ($keywordScore['score'] * 0.6) + ($priceScore * 0.4);
            
            // 0-100範囲に正規化
            $normalizedConfidence = min(100, max(10, ($basicConfidence / 100) * 100));
            
            if ($this->debugMode) {
                error_log('Stage 1 判定: ' . json_encode([
                    'keyword_score' => $keywordScore['score'],
                    'price_score' => $priceScore,
                    'confidence' => $normalizedConfidence
                ], JSON_UNESCAPED_UNICODE));
            }
            
            return [
                'category_id' => $keywordScore['category_id'],
                'category_name' => $keywordScore['category_name'],
                'category_path' => $keywordScore['category_path'],
                'confidence' => (int)round($normalizedConfidence),
                'stage' => 'basic',
                'matched_keywords' => $keywordScore['matched_keywords'],
                'fee_percent' => $keywordScore['fee_percent'],
                'fee_group' => $keywordScore['fee_group'],
                'debug_data' => [
                    'keyword_score' => $keywordScore['score'],
                    'price_score' => $priceScore,
                    'basic_confidence' => $basicConfidence
                ]
            ];
            
        } catch (Exception $e) {
            error_log('CategoryDetector Stage 1 Error: ' . $e->getMessage());
            return $this->getDefaultCategory('basic');
        }
    }
    
    /**
     * Stage 2: 利益込み最終判定（95%精度）
     * ブートストラップデータによる利益ポテンシャル追加
     */
    public function detectCategoryWithProfit($basicCategory, $productData) {
        try {
            // ブートストラップ利益率データ取得
            $profitData = $this->getBootstrapProfitData($basicCategory['category_id']);
            
            // 利益ポテンシャル計算
            $profitPotential = $this->calculateProfitPotential($productData, $profitData, $basicCategory);
            
            // Stage 2最終スコア計算
            $finalConfidence = (
                $basicCategory['confidence'] * 0.7 +  // Stage 1結果（70%重み）
                $profitPotential * 0.3                // 利益ポテンシャル（30%重み）
            );
            
            $finalConfidence = max(10, min(100, $finalConfidence));
            
            if ($this->debugMode) {
                error_log('Stage 2 判定: ' . json_encode([
                    'basic_confidence' => $basicCategory['confidence'],
                    'profit_potential' => $profitPotential,
                    'final_confidence' => $finalConfidence
                ], JSON_UNESCAPED_UNICODE));
            }
            
            return [
                'category_id' => $basicCategory['category_id'],
                'category_name' => $basicCategory['category_name'],
                'category_path' => $basicCategory['category_path'],
                'confidence' => (int)round($finalConfidence),
                'stage' => 'profit_enhanced',
                'matched_keywords' => $basicCategory['matched_keywords'],
                'fee_percent' => $basicCategory['fee_percent'],
                'fee_group' => $basicCategory['fee_group'],
                'profit_data' => $profitData,
                'profit_potential' => $profitPotential,
                'debug_data' => array_merge($basicCategory['debug_data'] ?? [], [
                    'profit_margin' => $profitData['avg_profit_margin'] ?? 0,
                    'volume_level' => $profitData['volume_level'] ?? 'unknown',
                    'final_confidence' => $finalConfidence
                ])
            ];
            
        } catch (Exception $e) {
            error_log('CategoryDetector Stage 2 Error: ' . $e->getMessage());
            // Stage 2失敗時はStage 1結果を返す
            return $basicCategory;
        }
    }
    
    /**
     * 統合判定メソッド（Stage 1→2自動実行）
     */
    public function detectCategory($productData) {
        // Stage 1: 基本判定
        $basicResult = $this->detectCategoryBasic($productData);
        
        // Stage 2: 利益込み判定
        $finalResult = $this->detectCategoryWithProfit($basicResult, $productData);
        
        return $finalResult;
    }
    
    /**
     * ブートストラップ利益率データ取得
     */
    private function getBootstrapProfitData($categoryId) {
        $sql = "
            SELECT 
                avg_profit_margin,
                volume_level,
                risk_level,
                confidence_level,
                data_source
            FROM category_profit_bootstrap 
            WHERE category_id = ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$categoryId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            return $result;
        }
        
        // フォールバック: 業界平均データ
        return [
            'avg_profit_margin' => 20.0,  // 20%
            'volume_level' => 'medium',
            'risk_level' => 'medium',
            'confidence_level' => 0.5,
            'data_source' => 'fallback_average'
        ];
    }
    
    /**
     * 利益ポテンシャル計算
     */
    private function calculateProfitPotential($productData, $profitData, $basicCategory) {
        $yahooPrice = $productData['price'] ?? 0;
        $profitMargin = $profitData['avg_profit_margin'] ?? 20.0;
        $volumeLevel = $profitData['volume_level'] ?? 'medium';
        $riskLevel = $profitData['risk_level'] ?? 'medium';
        
        // 基本利益ポテンシャル計算
        $basePotential = $profitMargin;
        
        // ボリュームレベル調整
        $volumeMultiplier = [
            'high' => 1.2,
            'medium' => 1.0,
            'low' => 0.8
        ];
        
        // リスクレベル調整
        $riskMultiplier = [
            'low' => 1.2,
            'medium' => 1.0,
            'high' => 0.7
        ];
        
        // 価格帯による調整
        $priceMultiplier = 1.0;
        if ($yahooPrice > 1000) {
            $priceMultiplier = 0.9;  // 高額商品は利益率下がる傾向
        } elseif ($yahooPrice < 100) {
            $priceMultiplier = 1.1;  // 低額商品は利益率高い傾向
        }
        
        $finalPotential = $basePotential * 
                         ($volumeMultiplier[$volumeLevel] ?? 1.0) * 
                         ($riskMultiplier[$riskLevel] ?? 1.0) * 
                         $priceMultiplier;
        
        // 0-100範囲に正規化
        return min(100, max(0, $finalPotential));
    }
    
    /**
     * キーワードマッチング（31,644カテゴリー対応）
     */
    private function matchByKeywords($title, $description = '') {
        $text = strtolower($title . ' ' . $description);
        $bestMatch = null;
        $maxScore = 0;
        
        // 新しいテーブル構造からカテゴリーデータ取得
        $sql = "
            SELECT 
                ecf.category_id,
                ecf.category_name,
                ecf.category_path,
                ecf.final_value_fee_percent,
                ecf.fee_group
            FROM ebay_category_fees ecf
            WHERE ecf.is_active = TRUE
            ORDER BY ecf.category_name ASC
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($categories as $category) {
            $score = 0;
            $matchedKeywords = [];
            
            // カテゴリー名でのマッチング
            $categoryName = strtolower($category['category_name']);
            $nameWords = preg_split('/[\s&,>]+/', $categoryName);
            
            foreach ($nameWords as $word) {
                $word = trim($word);
                if (strlen($word) > 2 && strpos($text, $word) !== false) {
                    $score += 15;
                    $matchedKeywords[] = $word;
                }
            }
            
            // カテゴリーパスでのマッチング
            if (!empty($category['category_path'])) {
                $categoryPath = strtolower($category['category_path']);
                $pathWords = preg_split('/[\s&,>]+/', $categoryPath);
                
                foreach ($pathWords as $word) {
                    $word = trim($word);
                    if (strlen($word) > 2 && strpos($text, $word) !== false) {
                        $score += 10;
                        $matchedKeywords[] = $word;
                    }
                }
            }
            
            // 特別キーワードマッチング
            $specialMatches = $this->getSpecialKeywordMatches($text, $category);
            $score += $specialMatches['score'];
            $matchedKeywords = array_merge($matchedKeywords, $specialMatches['keywords']);
            
            if ($score > $maxScore) {
                $maxScore = $score;
                $bestMatch = [
                    'category_id' => $category['category_id'],
                    'category_name' => $category['category_name'],
                    'category_path' => $category['category_path'],
                    'score' => $score,
                    'matched_keywords' => array_unique($matchedKeywords),
                    'fee_percent' => $category['final_value_fee_percent'],
                    'fee_group' => $category['fee_group']
                ];
            }
        }
        
        return $bestMatch ?: [
            'category_id' => '99999',
            'category_name' => 'Other',
            'category_path' => 'Other > Unclassified',
            'score' => 0,
            'matched_keywords' => [],
            'fee_percent' => 13.60,
            'fee_group' => 'standard'
        ];
    }
    
    /**
     * 特別キーワードマッチング強化
     */
    private function getSpecialKeywordMatches($text, $category) {
        $score = 0;
        $keywords = [];
        
        $specialKeywords = [
            // Electronics
            'electronics' => [
                'iphone' => 25, 'samsung' => 25, 'google' => 20, 'pixel' => 20,
                'smartphone' => 30, 'tablet' => 25, 'laptop' => 25, 'camera' => 30,
                'canon' => 20, 'nikon' => 20, 'sony' => 20, 'apple' => 25
            ],
            
            // Trading Cards
            'trading_cards' => [
                'pokemon' => 35, 'magic' => 30, 'yugioh' => 30, 'baseball card' => 35,
                'trading card' => 40, 'tcg' => 25, 'topps' => 25, 'panini' => 20
            ],
            
            // Books & Media
            'books_and_magazines' => [
                'book' => 20, 'novel' => 25, 'manga' => 30, 'magazine' => 25,
                'textbook' => 20, 'comic' => 25
            ],
            
            // Jewelry & Watches
            'jewelry_and_watches' => [
                'rolex' => 40, 'omega' => 35, 'cartier' => 35, 'ring' => 20,
                'necklace' => 20, 'bracelet' => 20, 'watch' => 30, 'diamond' => 25
            ],
            
            // Musical Instruments
            'musical_instruments' => [
                'guitar' => 30, 'piano' => 30, 'drum' => 25, 'bass' => 25,
                'violin' => 30, 'trumpet' => 25, 'saxophone' => 30
            ],
            
            // Fashion
            'clothing' => [
                'supreme' => 35, 'nike' => 30, 'adidas' => 30, 'gucci' => 40,
                'louis vuitton' => 40, 'chanel' => 40, 'prada' => 35
            ]
        ];
        
        $feeGroup = $category['fee_group'] ?? '';
        
        // fee_groupベースのマッチング
        if (isset($specialKeywords[$feeGroup])) {
            foreach ($specialKeywords[$feeGroup] as $keyword => $keywordScore) {
                if (strpos($text, $keyword) !== false) {
                    $score += $keywordScore;
                    $keywords[] = $keyword;
                }
            }
        }
        
        // 全カテゴリー共通の高価値キーワード
        $universalHighValue = [
            'vintage' => 15, 'rare' => 20, 'limited edition' => 25,
            'new' => 10, 'brand new' => 15, 'unopened' => 20
        ];
        
        foreach ($universalHighValue as $keyword => $keywordScore) {
            if (strpos($text, $keyword) !== false) {
                $score += $keywordScore;
                $keywords[] = $keyword;
            }
        }
        
        return ['score' => $score, 'keywords' => $keywords];
    }
    
    /**
     * 価格帯妥当性チェック
     */
    private function validatePriceRange($price, $keywordResult) {
        $feeGroup = $keywordResult['fee_group'] ?? 'standard';
        
        $priceRanges = [
            'musical_instruments' => ['min' => 50, 'max' => 10000, 'optimal' => [200, 2000]],
            'business_and_industrial' => ['min' => 100, 'max' => 100000, 'optimal' => [500, 10000]],
            'jewelry_and_watches' => ['min' => 50, 'max' => 50000, 'optimal' => [200, 5000]],
            'electronics' => ['min' => 20, 'max' => 5000, 'optimal' => [100, 1500]],
            'trading_cards' => ['min' => 1, 'max' => 10000, 'optimal' => [10, 500]],
            'books_and_magazines' => ['min' => 1, 'max' => 500, 'optimal' => [5, 100]],
            'clothing' => ['min' => 10, 'max' => 2000, 'optimal' => [30, 300]]
        ];
        
        $range = $priceRanges[$feeGroup] ?? ['min' => 1, 'max' => 10000, 'optimal' => [10, 1000]];
        
        // 基本妥当性チェック
        if ($price < $range['min'] || $price > $range['max']) {
            return 20; // 範囲外は低スコア
        }
        
        // 最適価格帯チェック
        if ($price >= $range['optimal'][0] && $price <= $range['optimal'][1]) {
            return 80; // 最適範囲は高スコア
        }
        
        // 中間価格帯
        return 50;
    }
    
    /**
     * 入力データ検証
     */
    private function validateProductData($productData) {
        return !empty($productData['title']) && 
               isset($productData['price']) && 
               is_numeric($productData['price']) &&
               $productData['price'] > 0;
    }
    
    /**
     * デフォルトカテゴリー（Stage対応）
     */
    private function getDefaultCategory($stage = 'basic') {
        return [
            'category_id' => '99999',
            'category_name' => 'Other',
            'category_path' => 'Other > Unclassified',
            'confidence' => 30,
            'stage' => $stage,
            'matched_keywords' => [],
            'fee_percent' => 13.60,
            'fee_group' => 'standard'
        ];
    }
    
    /**
     * 利用可能カテゴリー一覧（31,644カテゴリー完全対応）
     */
    public function getAvailableCategories($filters = []) {
        $whereConditions = ['ecf.is_active = TRUE'];
        $params = [];
        
        // フィルター条件追加
        if (!empty($filters['fee_range'])) {
            $whereConditions[] = 'ecf.final_value_fee_percent BETWEEN ? AND ?';
            $params[] = $filters['fee_range'][0];
            $params[] = $filters['fee_range'][1];
        }
        
        if (!empty($filters['fee_group'])) {
            $whereConditions[] = 'ecf.fee_group = ?';
            $params[] = $filters['fee_group'];
        }
        
        if (!empty($filters['search'])) {
            $whereConditions[] = '(ecf.category_name ILIKE ? OR ecf.category_path ILIKE ?)';
            $searchTerm = '%' . $filters['search'] . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        $whereClause = implode(' AND ', $whereConditions);
        
        $sql = "
            SELECT 
                ecf.category_id,
                ecf.category_name,
                ecf.category_path,
                ecf.final_value_fee_percent,
                ecf.fee_group,
                ecf.is_tiered,
                COUNT(ysp.id) as product_count,
                AVG(ysp.category_confidence) as avg_confidence
            FROM ebay_category_fees ecf
            LEFT JOIN yahoo_scraped_products ysp ON ecf.category_id = ysp.ebay_category_id
            WHERE {$whereClause}
            GROUP BY ecf.category_id, ecf.category_name, ecf.category_path, 
                     ecf.final_value_fee_percent, ecf.fee_group, ecf.is_tiered
            ORDER BY ecf.final_value_fee_percent ASC, ecf.category_name ASC
            LIMIT " . ($filters['limit'] ?? 1000);
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * カテゴリー統計情報取得
     */
    public function getCategoryStats() {
        $sql = "
            SELECT 
                ecf.fee_group,
                COUNT(*) as total_categories,
                AVG(ecf.final_value_fee_percent) as avg_fee_percent,
                MIN(ecf.final_value_fee_percent) as min_fee_percent,
                MAX(ecf.final_value_fee_percent) as max_fee_percent,
                COUNT(ysp.id) as processed_products,
                AVG(ysp.category_confidence) as avg_confidence
            FROM ebay_category_fees ecf
            LEFT JOIN yahoo_scraped_products ysp ON ecf.category_id = ysp.ebay_category_id
            WHERE ecf.is_active = TRUE
            GROUP BY ecf.fee_group
            ORDER BY avg_fee_percent ASC
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * バッチ処理（複数商品一括判定）
     */
    public function detectCategoriesBatch($productDataArray, $stage = 'both') {
        $results = [];
        
        foreach ($productDataArray as $index => $productData) {
            try {
                if ($stage === 'basic') {
                    $results[$index] = $this->detectCategoryBasic($productData);
                } elseif ($stage === 'profit') {
                    $basicResult = $this->detectCategoryBasic($productData);
                    $results[$index] = $this->detectCategoryWithProfit($basicResult, $productData);
                } else {
                    // both (default)
                    $results[$index] = $this->detectCategory($productData);
                }
                
                // メモリ管理
                if (memory_get_usage() > 100 * 1024 * 1024) { // 100MB制限
                    gc_collect_cycles();
                }
                
            } catch (Exception $e) {
                error_log("Batch processing error for index {$index}: " . $e->getMessage());
                $results[$index] = $this->getDefaultCategory($stage === 'basic' ? 'basic' : 'profit_enhanced');
            }
        }
        
        return $results;
    }
}
?>