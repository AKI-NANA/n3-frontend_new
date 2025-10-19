<?php
/**
 * 統合カテゴリー判定クラス - eBay API + キーワード辞書ハイブリッド
 * 引き継ぎ書に基づく最適化実装
 * 
 * 判定フロー:
 * 1. eBay Finding API（高精度判定）
 * 2. キーワード辞書（フォールバック）
 * 3. 信頼度統合・最終判定
 * 4. Select Categories判定
 * 5. 出品枠残数チェック
 */

require_once 'EbayFindingApiConnector.php';

class UnifiedCategoryDetector {
    private $pdo;
    private $ebayApi;
    private $debugMode;
    
    // 信頼度しきい値
    private const HIGH_CONFIDENCE_THRESHOLD = 80;
    private const MEDIUM_CONFIDENCE_THRESHOLD = 50;
    private const API_PRIORITY_THRESHOLD = 70;
    
    public function __construct($dbConnection, $debugMode = false) {
        $this->pdo = $dbConnection;
        $this->debugMode = $debugMode;
        $this->ebayApi = new EbayFindingApiConnector($dbConnection, $debugMode);
    }
    
    /**
     * メイン機能: 統合カテゴリー判定
     * @param array $productData Yahoo商品データ
     * @return array 統合判定結果
     */
    public function detectCategoryUnified($productData) {
        $startTime = microtime(true);
        
        try {
            $title = $productData['title'] ?? '';
            $price = floatval($productData['price_jpy'] ?? $productData['price'] ?? 0);
            $description = $productData['description'] ?? '';
            
            if (empty($title)) {
                throw new Exception('商品タイトルが必要です');
            }
            
            // 1. eBay API判定実行
            $ebayResult = $this->detectWithEbayApi($title, $price);
            
            // 2. キーワード辞書判定実行
            $keywordResult = $this->detectWithKeywords($title, $description, $price);
            
            // 3. 結果統合・最終判定
            $finalResult = $this->integrateResults($ebayResult, $keywordResult, $productData);
            
            // 4. Select Categories判定
            $finalResult['quota_type'] = $this->determineQuotaType($finalResult['category_id']);
            
            // 5. 出品枠チェック
            $finalResult['quota_status'] = $this->checkQuotaAvailability($finalResult['quota_type']);
            
            // 6. 処理時間計算
            $finalResult['processing_time_ms'] = round((microtime(true) - $startTime) * 1000);
            
            // 7. 結果記録
            $this->recordDetectionResult($productData, $finalResult);
            
            return $finalResult;
            
        } catch (Exception $e) {
            $this->debugLog("統合判定エラー: " . $e->getMessage());
            
            return [
                'category_id' => '99999',
                'category_name' => 'Other/Unclassified',
                'confidence' => 25,
                'detection_method' => 'error_fallback',
                'quota_type' => 'all_categories',
                'error' => $e->getMessage(),
                'processing_time_ms' => round((microtime(true) - $startTime) * 1000)
            ];
        }
    }
    
    /**
     * eBay API カテゴリー判定
     */
    private function detectWithEbayApi($title, $price) {
        try {
            $this->debugLog("eBay API判定開始: " . $title);
            
            $options = [
                'max_items' => 50, // 効率重視
                'sort_order' => 'BestMatch'
            ];
            
            // 価格帯フィルター追加（精度向上）
            if ($price > 0) {
                $options['price_range'] = $this->calculatePriceRange($price);
            }
            
            $result = $this->ebayApi->detectCategoryFromTitle($title, $options);
            
            // eBay APIの信頼度補正
            if (isset($result['confidence'])) {
                $result['confidence'] = min(95, $result['confidence'] + 5); // API判定は+5ボーナス
            }
            
            $this->debugLog("eBay API結果: " . $result['category_name'] . " (信頼度: " . $result['confidence'] . "%)");
            
            return $result;
            
        } catch (Exception $e) {
            $this->debugLog("eBay API判定失敗: " . $e->getMessage());
            
            return [
                'category_id' => null,
                'confidence' => 0,
                'detection_method' => 'ebay_api_failed',
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * キーワード辞書判定
     */
    private function detectWithKeywords($title, $description, $price) {
        try {
            $this->debugLog("キーワード辞書判定開始: " . $title);
            
            $text = strtolower($title . ' ' . $description);
            $matches = [];
            
            // データベースからキーワード辞書取得
            $sql = "
                SELECT ck.category_id, ck.keyword, ck.weight, ck.keyword_type, 
                       ecf.category_name, ecf.final_value_fee_percent
                FROM category_keywords ck
                LEFT JOIN ebay_category_fees ecf ON ck.category_id = ecf.category_id
                WHERE ck.is_active = TRUE
                ORDER BY ck.weight DESC, ck.keyword_type ASC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $keywords = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // キーワードマッチング
            foreach ($keywords as $keywordData) {
                $keyword = strtolower($keywordData['keyword']);
                
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
                    
                    // スコア計算
                    $score = $keywordData['weight'];
                    if ($keywordData['keyword_type'] === 'primary') {
                        $score *= 2;
                    }
                    
                    // 完全単語一致ボーナス
                    if (preg_match('/\b' . preg_quote($keyword, '/') . '\b/', $text)) {
                        $score *= 1.5;
                    }
                    
                    $matches[$categoryId]['score'] += $score;
                    $matches[$categoryId]['matched_keywords'][] = $keyword;
                }
            }
            
            if (empty($matches)) {
                return [
                    'category_id' => '99999',
                    'category_name' => 'Other/Unclassified',
                    'confidence' => 20,
                    'detection_method' => 'keyword_no_match'
                ];
            }
            
            // 最高スコアカテゴリー選択
            $bestMatch = array_reduce($matches, function($best, $current) {
                return ($current['score'] > ($best['score'] ?? 0)) ? $current : $best;
            });
            
            // 信頼度正規化
            $confidence = min(85, max(20, ($bestMatch['score'] / 20) * 100));
            
            // 価格帯による信頼度調整
            if ($price > 0) {
                $priceConfidence = $this->adjustConfidenceByPrice($bestMatch['category_id'], $price);
                $confidence = ($confidence + $priceConfidence) / 2;
            }
            
            $result = [
                'category_id' => $bestMatch['category_id'],
                'category_name' => $bestMatch['category_name'],
                'confidence' => round($confidence),
                'detection_method' => 'keyword_matching',
                'matched_keywords' => $bestMatch['matched_keywords'],
                'keyword_score' => $bestMatch['score']
            ];
            
            $this->debugLog("キーワード判定結果: " . $result['category_name'] . " (信頼度: " . $result['confidence'] . "%)");
            
            return $result;
            
        } catch (Exception $e) {
            $this->debugLog("キーワード判定失敗: " . $e->getMessage());
            
            return [
                'category_id' => '99999',
                'confidence' => 15,
                'detection_method' => 'keyword_error',
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 判定結果統合・最終判定
     */
    private function integrateResults($ebayResult, $keywordResult, $productData) {
        $this->debugLog("結果統合開始");
        
        $ebayConfidence = $ebayResult['confidence'] ?? 0;
        $keywordConfidence = $keywordResult['confidence'] ?? 0;
        
        // 1. eBay API高信頼度判定（優先）
        if ($ebayConfidence >= self::API_PRIORITY_THRESHOLD && isset($ebayResult['category_id'])) {
            $this->debugLog("eBay API高信頼度判定採用");
            
            return array_merge($ebayResult, [
                'final_method' => 'ebay_api_priority',
                'alternative_detection' => $keywordResult,
                'integration_note' => 'eBay API高信頼度のため優先採用'
            ]);
        }
        
        // 2. 両方中程度信頼度の場合、より高い方を採用
        if ($ebayConfidence >= self::MEDIUM_CONFIDENCE_THRESHOLD && 
            $keywordConfidence >= self::MEDIUM_CONFIDENCE_THRESHOLD) {
            
            if ($ebayConfidence >= $keywordConfidence) {
                $this->debugLog("eBay API中信頼度判定採用");
                return array_merge($ebayResult, [
                    'final_method' => 'ebay_api_selected',
                    'alternative_detection' => $keywordResult
                ]);
            } else {
                $this->debugLog("キーワード中信頼度判定採用");
                return array_merge($keywordResult, [
                    'final_method' => 'keyword_selected',
                    'alternative_detection' => $ebayResult
                ]);
            }
        }
        
        // 3. キーワード判定がより高信頼度の場合
        if ($keywordConfidence >= self::MEDIUM_CONFIDENCE_THRESHOLD && 
            $keywordConfidence > $ebayConfidence) {
            
            $this->debugLog("キーワード高信頼度判定採用");
            return array_merge($keywordResult, [
                'final_method' => 'keyword_priority',
                'alternative_detection' => $ebayResult
            ]);
        }
        
        // 4. どちらも低信頼度の場合、統合判定
        if ($ebayConfidence > 0 || $keywordConfidence > 0) {
            $this->debugLog("統合判定実行");
            
            // より高い信頼度を採用、但し調整
            if ($ebayConfidence >= $keywordConfidence) {
                $finalResult = $ebayResult;
                $finalResult['confidence'] = max(35, $ebayConfidence * 0.8); // 低信頼度ペナルティ
            } else {
                $finalResult = $keywordResult;
                $finalResult['confidence'] = max(35, $keywordConfidence * 0.8);
            }
            
            return array_merge($finalResult, [
                'final_method' => 'integrated_low_confidence',
                'ebay_result' => $ebayResult,
                'keyword_result' => $keywordResult
            ]);
        }
        
        // 5. 完全フォールバック
        $this->debugLog("フォールバック判定");
        return [
            'category_id' => '99999',
            'category_name' => 'Other/Unclassified',
            'confidence' => 30,
            'final_method' => 'complete_fallback',
            'ebay_result' => $ebayResult,
            'keyword_result' => $keywordResult
        ];
    }
    
    /**
     * Select Categories判定
     */
    private function determineQuotaType($categoryId) {
        try {
            $sql = "SELECT quota_type FROM listing_quota_categories 
                    WHERE category_id = ? AND is_active = TRUE LIMIT 1";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$categoryId]);
            
            $result = $stmt->fetch(PDO::FETCH_COLUMN);
            return $result ?: 'all_categories';
            
        } catch (Exception $e) {
            $this->debugLog("Select Categories判定エラー: " . $e->getMessage());
            return 'all_categories';
        }
    }
    
    /**
     * 出品枠残数チェック
     */
    private function checkQuotaAvailability($quotaType, $storeLevel = 'basic') {
        try {
            $monthYear = date('Y-m');
            
            $sql = "SELECT current_count, max_quota, 
                           (max_quota - current_count) as remaining
                    FROM current_listings_count 
                    WHERE store_level = ? AND quota_type = ? AND month_year = ?";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$storeLevel, $quotaType, $monthYear]);
            $quota = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$quota) {
                return [
                    'available' => false,
                    'remaining' => 0,
                    'max_quota' => 0,
                    'current_count' => 0,
                    'warning' => '出品枠情報が見つかりません'
                ];
            }
            
            $remaining = $quota['remaining'];
            
            return [
                'available' => $remaining > 0,
                'remaining' => $remaining,
                'max_quota' => $quota['max_quota'],
                'current_count' => $quota['current_count'],
                'quota_type' => $quotaType,
                'store_level' => $storeLevel,
                'month_year' => $monthYear,
                'warning' => $remaining <= 5 ? '出品枠残り僅かです' : null,
                'alert' => $remaining === 0 ? '出品枠上限に達しています' : null
            ];
            
        } catch (Exception $e) {
            $this->debugLog("出品枠チェックエラー: " . $e->getMessage());
            
            return [
                'available' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 価格帯による信頼度調整
     */
    private function adjustConfidenceByPrice($categoryId, $price) {
        // カテゴリー別の一般的な価格帯データ
        $priceRanges = [
            '293' => ['min' => 100, 'max' => 1500],    // Cell Phones
            '625' => ['min' => 200, 'max' => 5000],    // Cameras
            '58058' => ['min' => 5, 'max' => 500],     // Trading Cards
            '139973' => ['min' => 10, 'max' => 100],   // Video Games
            '11450' => ['min' => 20, 'max' => 200],    // Clothing
        ];
        
        if (!isset($priceRanges[$categoryId])) {
            return 0; // 調整なし
        }
        
        $range = $priceRanges[$categoryId];
        $priceUsd = $price / 150; // 概算USD換算
        
        if ($priceUsd >= $range['min'] && $priceUsd <= $range['max']) {
            return 10; // 適正価格帯ボーナス
        } elseif ($priceUsd < $range['min'] * 0.5 || $priceUsd > $range['max'] * 2) {
            return -15; // 大幅価格乖離ペナルティ
        }
        
        return -5; // 軽微価格乖離ペナルティ
    }
    
    /**
     * 価格帯計算
     */
    private function calculatePriceRange($priceJpy) {
        $priceUsd = $priceJpy / 150; // 概算換算
        
        return [
            'min' => max(1, $priceUsd * 0.5),
            'max' => $priceUsd * 2.0
        ];
    }
    
    /**
     * 判定結果記録
     */
    private function recordDetectionResult($productData, $result) {
        try {
            // yahoo_scraped_products テーブルに結果を記録（IDがある場合）
            if (isset($productData['id'])) {
                $sql = "UPDATE yahoo_scraped_products 
                        SET ebay_category_id = ?,
                            ebay_category_name = ?,
                            category_confidence = ?,
                            detection_method = ?,
                            listing_quota_type = ?,
                            category_detected_at = NOW()
                        WHERE id = ?";
                
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([
                    $result['category_id'],
                    $result['category_name'] ?? 'Unknown',
                    $result['confidence'],
                    $result['final_method'] ?? $result['detection_method'],
                    $result['quota_type'],
                    $productData['id']
                ]);
            }
            
        } catch (Exception $e) {
            $this->debugLog("結果記録エラー: " . $e->getMessage());
        }
    }
    
    /**
     * バッチ処理: Yahoo商品データの一括判定
     */
    public function processYahooProductsBatch($limit = 100) {
        try {
            // 未処理のYahoo商品データ取得
            $sql = "SELECT id, title, price_jpy, description, image_urls
                    FROM yahoo_scraped_products 
                    WHERE ebay_category_id IS NULL 
                    ORDER BY created_at DESC 
                    LIMIT ?";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$limit]);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($products)) {
                return [
                    'success' => true,
                    'message' => '処理対象の商品がありません',
                    'processed_count' => 0
                ];
            }
            
            $results = [];
            $successCount = 0;
            $startTime = microtime(true);
            
            foreach ($products as $product) {
                try {
                    $categoryResult = $this->detectCategoryUnified($product);
                    
                    $results[] = [
                        'product_id' => $product['id'],
                        'title' => $product['title'],
                        'success' => true,
                        'category_result' => $categoryResult
                    ];
                    
                    $successCount++;
                    
                    // API制限考慮で1秒待機
                    sleep(1);
                    
                } catch (Exception $e) {
                    $results[] = [
                        'product_id' => $product['id'],
                        'title' => $product['title'],
                        'success' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            $processingTime = round((microtime(true) - $startTime) * 1000);
            
            return [
                'success' => true,
                'processed_count' => count($products),
                'success_count' => $successCount,
                'processing_time_ms' => $processingTime,
                'results' => $results
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 統計情報取得
     */
    public function getDetectionStatistics() {
        try {
            $sql = "
                SELECT 
                    detection_method,
                    listing_quota_type,
                    COUNT(*) as count,
                    AVG(category_confidence) as avg_confidence,
                    MIN(category_confidence) as min_confidence,
                    MAX(category_confidence) as max_confidence
                FROM yahoo_scraped_products 
                WHERE ebay_category_id IS NOT NULL
                  AND category_detected_at >= NOW() - INTERVAL '30 days'
                GROUP BY detection_method, listing_quota_type
                ORDER BY count DESC
            ";
            
            $stmt = $this->pdo->query($sql);
            $methodStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // カテゴリー別統計
            $sql = "
                SELECT 
                    ebay_category_id,
                    ebay_category_name,
                    COUNT(*) as detection_count,
                    AVG(category_confidence) as avg_confidence,
                    listing_quota_type
                FROM yahoo_scraped_products 
                WHERE ebay_category_id IS NOT NULL
                  AND category_detected_at >= NOW() - INTERVAL '30 days'
                GROUP BY ebay_category_id, ebay_category_name, listing_quota_type
                ORDER BY detection_count DESC
                LIMIT 20
            ";
            
            $stmt = $this->pdo->query($sql);
            $categoryStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 出品枠使用状況
            $quotaStats = $this->ebayApi->checkListingQuota();
            
            return [
                'method_statistics' => $methodStats,
                'category_statistics' => $categoryStats,
                'quota_statistics' => $quotaStats,
                'generated_at' => date('Y-m-d H:i:s')
            ];
            
        } catch (Exception $e) {
            $this->debugLog("統計取得エラー: " . $e->getMessage());
            
            return [
                'method_statistics' => [],
                'category_statistics' => [],
                'quota_statistics' => [],
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * デバッグログ
     */
    private function debugLog($message) {
        if ($this->debugMode) {
            error_log("[UnifiedCategoryDetector] " . date('Y-m-d H:i:s') . " - " . $message);
        }
    }
}
?>