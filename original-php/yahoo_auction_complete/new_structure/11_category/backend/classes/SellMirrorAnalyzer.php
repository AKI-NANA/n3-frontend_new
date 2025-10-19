<?php
/**
 * セルミラー分析システム - API効率化重視版
 * 1回のAPIコールで複数商品データ取得・効率的なバッチ処理
 * 
 * 機能:
 * 1. eBay Finding API による売上実績分析
 * 2. 複数アイテム一括取得によるAPI効率化
 * 3. リスク評価・利益予測
 * 4. ミラーテンプレート自動生成
 * 5. キャッシュシステムによる重複回避
 */

class SellMirrorAnalyzer {
    private $pdo;
    private $ebayApi;
    private $debugMode;
    
    // API効率化設定
    private const MAX_ITEMS_PER_API_CALL = 100;
    private const ANALYSIS_CACHE_HOURS = 168; // 7日間
    private const HIGH_CONFIDENCE_THRESHOLD = 95;
    private const MEDIUM_CONFIDENCE_THRESHOLD = 75;
    
    // リスク評価基準
    private const HIGH_RISK_COMPETITOR_COUNT = 50;
    private const LOW_RISK_SOLD_COUNT_MIN = 5;
    private const PROFIT_MARGIN_MIN = 10; // $10最低利益
    
    public function __construct($dbConnection, $ebayApiConnector, $debugMode = false) {
        $this->pdo = $dbConnection;
        $this->ebayApi = $ebayApiConnector;
        $this->debugMode = $debugMode;
    }
    
    /**
     * メイン機能: セルミラー分析実行
     * @param array $productData Yahoo商品データ
     * @return array 分析結果
     */
    public function analyzeSellMirror($productData) {
        $startTime = microtime(true);
        
        try {
            $productId = $productData['id'] ?? null;
            $title = $productData['title'] ?? '';
            $priceJpy = floatval($productData['price_jpy'] ?? 0);
            $categoryId = $productData['ebay_category_id'] ?? null;
            
            if (empty($title)) {
                throw new Exception('商品タイトルが必要です');
            }
            
            // 1. キャッシュ確認（重複分析回避）
            if ($productId && $this->isCacheValid($productId)) {
                $this->debugLog("キャッシュから分析結果取得: Product ID {$productId}");
                return $this->getCachedAnalysis($productId);
            }
            
            // 2. 検索キーワード生成（効率的な検索のため）
            $searchKeywords = $this->generateOptimizedKeywords($title);
            
            // 3. eBay Finding API: 完売商品検索（90日間）
            $soldItems = $this->findSoldListings($searchKeywords, $categoryId);
            
            // 4. 現在の競合状況分析
            $activeCompetitors = $this->findActiveCompetitors($searchKeywords, $categoryId);
            
            // 5. 分析結果統合・信頼度計算
            $analysisResult = $this->calculateMirrorAnalysis($soldItems, $activeCompetitors, $priceJpy);
            
            // 6. リスク評価
            $analysisResult['risk_level'] = $this->assessRiskLevel($analysisResult, $soldItems, $activeCompetitors);
            
            // 7. ミラーテンプレート生成（上位パフォーマーから）
            $analysisResult['mirror_templates'] = $this->generateMirrorTemplates($soldItems, $activeCompetitors);
            
            // 8. 利益予測計算
            $analysisResult['profit_estimation'] = $this->calculateProfitEstimation($analysisResult, $priceJpy);
            
            // 9. 結果キャッシュ・データベース保存
            if ($productId) {
                $this->saveMirrorAnalysis($productId, $analysisResult, $searchKeywords);
            }
            
            $analysisResult['processing_time_ms'] = round((microtime(true) - $startTime) * 1000);
            $analysisResult['api_calls_used'] = 2; // findCompletedItems + findItemsAdvanced
            
            return $analysisResult;
            
        } catch (Exception $e) {
            $this->debugLog("セルミラー分析エラー: " . $e->getMessage());
            
            return [
                'mirror_confidence' => 0,
                'risk_level' => 'HIGH',
                'sold_count_90days' => 0,
                'average_price' => 0,
                'profit_estimation' => -999,
                'error' => $e->getMessage(),
                'processing_time_ms' => round((microtime(true) - $startTime) * 1000)
            ];
        }
    }
    
    /**
     * 最適化されたキーワード生成
     */
    private function generateOptimizedKeywords($title) {
        $title = strtolower($title);
        
        // 1. 主要ブランド・モデル抽出
        $keywords = [];
        
        // ブランド名検出
        $brands = ['apple', 'samsung', 'canon', 'nikon', 'sony', 'nintendo', 'pokemon'];
        foreach ($brands as $brand) {
            if (strpos($title, $brand) !== false) {
                $keywords[] = $brand;
                break; // 1つのブランドのみ
            }
        }
        
        // モデル番号・年式抽出
        if (preg_match('/\b(iphone\s*\d+|galaxy\s*[s]?\d+|eos\s*\w+|\d{4}年?)\b/i', $title, $matches)) {
            $keywords[] = trim($matches[1]);
        }
        
        // 容量・サイズ抽出
        if (preg_match('/\b(\d+gb|\d+tb|\d+inch|\d+型)\b/i', $title, $matches)) {
            $keywords[] = $matches[1];
        }
        
        // 状態・色情報
        $conditions = ['新品', '美品', '中古', 'ジャンク'];
        foreach ($conditions as $condition) {
            if (strpos($title, $condition) !== false) {
                $keywords[] = $condition;
                break;
            }
        }
        
        // フォールバック: タイトルの重要単語抽出
        if (empty($keywords)) {
            $words = explode(' ', $title);
            $keywords = array_slice($words, 0, 3); // 最初の3単語
        }
        
        $this->debugLog("生成キーワード: " . implode(', ', $keywords));
        
        return array_filter($keywords);
    }
    
    /**
     * 完売商品検索（Finding API効率化）
     */
    private function findSoldListings($keywords, $categoryId = null) {
        try {
            $searchQuery = implode(' ', array_slice($keywords, 0, 3)); // API制限考慮
            
            $params = [
                'keywords' => $searchQuery,
                'itemFilter' => [
                    [
                        'name' => 'SoldItemsOnly',
                        'value' => 'true'
                    ],
                    [
                        'name' => 'EndTimeFrom',
                        'value' => date('c', strtotime('-90 days'))
                    ]
                ],
                'sortOrder' => 'EndTimeSoonest',
                'paginationInput' => [
                    'entriesPerPage' => self::MAX_ITEMS_PER_API_CALL,
                    'pageNumber' => 1
                ]
            ];
            
            // カテゴリーフィルター追加
            if ($categoryId) {
                $params['categoryId'] = [$categoryId];
            }
            
            $response = $this->ebayApi->findCompletedItems($params);
            
            if (!$response || !isset($response['searchResult']['item'])) {
                return [];
            }
            
            $items = $response['searchResult']['item'];
            
            // データ正規化・品質フィルター
            $soldItems = [];
            foreach ($items as $item) {
                // 売上実績があるもののみ
                if (!isset($item['sellingStatus']['sellingState']) || 
                    $item['sellingStatus']['sellingState'] !== 'EndedWithSales') {
                    continue;
                }
                
                $soldPrice = floatval($item['sellingStatus']['currentPrice']['@content'] ?? 0);
                if ($soldPrice < 1) continue; // 異常に安い価格は除外
                
                $soldItems[] = [
                    'item_id' => $item['itemId'],
                    'title' => $item['title'],
                    'sold_price' => $soldPrice,
                    'currency' => $item['sellingStatus']['currentPrice']['@currencyId'],
                    'end_time' => $item['listingInfo']['endTime'],
                    'listing_type' => $item['listingInfo']['listingType'],
                    'category_id' => $item['primaryCategory']['categoryId'],
                    'watchers' => intval($item['listingInfo']['watchCount'] ?? 0),
                    'shipping_cost' => floatval($item['shippingInfo']['shippingServiceCost']['@content'] ?? 0)
                ];
            }
            
            $this->debugLog("完売商品取得: " . count($soldItems) . "件");
            
            return $soldItems;
            
        } catch (Exception $e) {
            $this->debugLog("完売商品検索エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 現在の競合状況分析
     */
    private function findActiveCompetitors($keywords, $categoryId = null) {
        try {
            $searchQuery = implode(' ', array_slice($keywords, 0, 3));
            
            $params = [
                'keywords' => $searchQuery,
                'itemFilter' => [
                    [
                        'name' => 'AvailableOnly',
                        'value' => 'true'
                    ],
                    [
                        'name' => 'ListingType',
                        'value' => ['FixedPrice', 'Auction']
                    ]
                ],
                'sortOrder' => 'PricePlusShippingLowest',
                'paginationInput' => [
                    'entriesPerPage' => 50, // 競合分析なので少なめ
                    'pageNumber' => 1
                ]
            ];
            
            if ($categoryId) {
                $params['categoryId'] = [$categoryId];
            }
            
            $response = $this->ebayApi->findItemsAdvanced($params);
            
            if (!$response || !isset($response['searchResult']['item'])) {
                return [];
            }
            
            $items = $response['searchResult']['item'];
            
            $competitors = [];
            foreach ($items as $item) {
                $currentPrice = floatval($item['sellingStatus']['currentPrice']['@content'] ?? 0);
                if ($currentPrice < 1) continue;
                
                $competitors[] = [
                    'item_id' => $item['itemId'],
                    'title' => $item['title'],
                    'current_price' => $currentPrice,
                    'currency' => $item['sellingStatus']['currentPrice']['@currencyId'],
                    'listing_type' => $item['listingInfo']['listingType'],
                    'time_left' => $item['sellingStatus']['timeLeft'] ?? '',
                    'watchers' => intval($item['listingInfo']['watchCount'] ?? 0),
                    'seller_feedback' => intval($item['sellerInfo']['feedbackScore'] ?? 0)
                ];
            }
            
            $this->debugLog("現在の競合: " . count($competitors) . "件");
            
            return $competitors;
            
        } catch (Exception $e) {
            $this->debugLog("競合検索エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * ミラー分析計算（統合版）
     */
    private function calculateMirrorAnalysis($soldItems, $activeCompetitors, $yahooPrice) {
        if (empty($soldItems)) {
            return [
                'mirror_confidence' => 0,
                'sold_count_90days' => 0,
                'average_price' => 0,
                'median_price' => 0,
                'min_price' => 0,
                'max_price' => 0,
                'competitor_count' => count($activeCompetitors)
            ];
        }
        
        // 価格統計計算
        $soldPrices = array_column($soldItems, 'sold_price');
        sort($soldPrices);
        
        $soldCount = count($soldItems);
        $averagePrice = array_sum($soldPrices) / $soldCount;
        $medianPrice = $soldPrices[intval($soldCount / 2)];
        $minPrice = min($soldPrices);
        $maxPrice = max($soldPrices);
        
        // 信頼度計算（複合指標）
        $confidence = 0;
        
        // 1. 売上実績スコア (40%)
        if ($soldCount >= 20) {
            $confidence += 40;
        } elseif ($soldCount >= 10) {
            $confidence += 30;
        } elseif ($soldCount >= 5) {
            $confidence += 20;
        } else {
            $confidence += $soldCount * 4;
        }
        
        // 2. 価格一貫性スコア (30%)
        $priceVariance = $this->calculateVarianceScore($soldPrices);
        $confidence += $priceVariance * 30;
        
        // 3. 最近の売上活動スコア (20%)
        $recentActivityScore = $this->calculateRecentActivityScore($soldItems);
        $confidence += $recentActivityScore * 20;
        
        // 4. Yahoo価格の妥当性スコア (10%)
        $yahooPriceUsd = $yahooPrice / 150; // 概算換算
        if ($yahooPriceUsd >= $minPrice * 0.7 && $yahooPriceUsd <= $maxPrice * 1.3) {
            $confidence += 10; // 価格帯が妥当
        } elseif ($yahooPriceUsd < $minPrice * 0.5) {
            $confidence -= 20; // 異常に安い（リスク高）
        }
        
        return [
            'mirror_confidence' => min(100, max(0, $confidence)),
            'sold_count_90days' => $soldCount,
            'average_price' => round($averagePrice, 2),
            'median_price' => round($medianPrice, 2),
            'min_price' => round($minPrice, 2),
            'max_price' => round($maxPrice, 2),
            'competitor_count' => count($activeCompetitors),
            'price_variance_score' => round($priceVariance, 2),
            'recent_activity_score' => round($recentActivityScore, 2)
        ];
    }
    
    /**
     * 価格分散スコア計算（0-1）
     */
    private function calculateVarianceScore($prices) {
        if (count($prices) < 2) return 0.5;
        
        $mean = array_sum($prices) / count($prices);
        $variance = 0;
        
        foreach ($prices as $price) {
            $variance += pow($price - $mean, 2);
        }
        
        $variance /= count($prices);
        $stdDev = sqrt($variance);
        
        // 標準偏差が小さいほど一貫性が高い（1に近づく）
        $coefficientOfVariation = $stdDev / $mean;
        
        return max(0, min(1, 1 - $coefficientOfVariation));
    }
    
    /**
     * 最近の売上活動スコア計算（0-1）
     */
    private function calculateRecentActivityScore($soldItems) {
        $now = time();
        $recentCount = 0;
        $totalCount = count($soldItems);
        
        foreach ($soldItems as $item) {
            $endTime = strtotime($item['end_time']);
            $daysAgo = ($now - $endTime) / 86400;
            
            if ($daysAgo <= 30) {
                $recentCount++; // 30日以内
            }
        }
        
        return $totalCount > 0 ? $recentCount / $totalCount : 0;
    }
    
    /**
     * リスク評価
     */
    private function assessRiskLevel($analysisResult, $soldItems, $activeCompetitors) {
        $risk = 'MEDIUM'; // デフォルト
        
        // 高リスク条件
        if ($analysisResult['competitor_count'] > self::HIGH_RISK_COMPETITOR_COUNT) {
            $risk = 'HIGH'; // 競合が多すぎる
        } elseif ($analysisResult['sold_count_90days'] < 2) {
            $risk = 'HIGH'; // 売上実績が少なすぎる
        } elseif ($analysisResult['mirror_confidence'] < 30) {
            $risk = 'HIGH'; // 信頼度が低すぎる
        }
        
        // 低リスク条件
        elseif ($analysisResult['sold_count_90days'] >= self::LOW_RISK_SOLD_COUNT_MIN &&
                $analysisResult['mirror_confidence'] >= self::HIGH_CONFIDENCE_THRESHOLD &&
                $analysisResult['competitor_count'] <= 20) {
            $risk = 'LOW'; // 理想的な条件
        }
        
        return $risk;
    }
    
    /**
     * ミラーテンプレート生成
     */
    private function generateMirrorTemplates($soldItems, $activeCompetitors) {
        $templates = [];
        
        // 売上実績上位5件をテンプレート化
        usort($soldItems, function($a, $b) {
            // 価格×ウォッチャー数でソート
            $scoreA = $a['sold_price'] * ($a['watchers'] + 1);
            $scoreB = $b['sold_price'] * ($b['watchers'] + 1);
            return $scoreB <=> $scoreA;
        });
        
        $topSoldItems = array_slice($soldItems, 0, 5);
        
        foreach ($topSoldItems as $item) {
            $templates[] = [
                'source' => 'sold_listing',
                'item_id' => $item['item_id'],
                'title' => $item['title'],
                'reference_price' => $item['sold_price'],
                'performance_score' => min(100, ($item['watchers'] * 5) + 50),
                'template_confidence' => 'HIGH'
            ];
        }
        
        // 現在の競合から優秀なものを2件追加
        if (!empty($activeCompetitors)) {
            usort($activeCompetitors, function($a, $b) {
                return ($b['watchers'] + $b['seller_feedback']/100) <=> ($a['watchers'] + $a['seller_feedback']/100);
            });
            
            $topCompetitors = array_slice($activeCompetitors, 0, 2);
            
            foreach ($topCompetitors as $competitor) {
                $templates[] = [
                    'source' => 'active_competitor',
                    'item_id' => $competitor['item_id'],
                    'title' => $competitor['title'],
                    'reference_price' => $competitor['current_price'],
                    'performance_score' => min(100, $competitor['watchers'] * 3 + 40),
                    'template_confidence' => 'MEDIUM'
                ];
            }
        }
        
        return $templates;
    }
    
    /**
     * 利益予測計算
     */
    private function calculateProfitEstimation($analysisResult, $yahooPrice) {
        if ($analysisResult['average_price'] <= 0) {
            return -999; // 予測不可
        }
        
        $averagePriceUsd = $analysisResult['average_price'];
        $yahooCostUsd = $yahooPrice / 150; // 概算換算
        
        // eBay手数料概算（13%）
        $ebayFees = $averagePriceUsd * 0.13;
        
        // PayPal手数料概算
        $paypalFees = ($averagePriceUsd * 0.029) + 0.30;
        
        // 送料・その他費用概算
        $otherCosts = 5.00;
        
        $totalCosts = $yahooCostUsd + $ebayFees + $paypalFees + $otherCosts;
        $estimatedProfit = $averagePriceUsd - $totalCosts;
        
        return round($estimatedProfit, 2);
    }
    
    /**
     * キャッシュ有効性チェック
     */
    private function isCacheValid($productId) {
        $sql = "SELECT COUNT(*) FROM sell_mirror_analysis 
                WHERE yahoo_product_id = ? 
                AND is_valid = TRUE 
                AND expires_at > NOW()";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$productId]);
        
        return $stmt->fetchColumn() > 0;
    }
    
    /**
     * キャッシュされた分析結果取得
     */
    private function getCachedAnalysis($productId) {
        $sql = "SELECT * FROM sell_mirror_analysis 
                WHERE yahoo_product_id = ? 
                AND is_valid = TRUE 
                AND expires_at > NOW()
                ORDER BY analysis_timestamp DESC 
                LIMIT 1";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$productId]);
        $cached = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$cached) return null;
        
        return [
            'mirror_confidence' => floatval($cached['mirror_confidence']),
            'sold_count_90days' => intval($cached['sold_count_90days']),
            'average_price' => floatval($cached['average_price']),
            'median_price' => floatval($cached['median_price']),
            'min_price' => floatval($cached['min_price']),
            'max_price' => floatval($cached['max_price']),
            'competitor_count' => intval($cached['competitor_count']),
            'profit_estimation' => floatval($cached['profit_estimation']),
            'risk_level' => $cached['risk_level'],
            'mirror_templates' => json_decode($cached['mirror_templates'], true),
            'cached' => true,
            'cache_age_hours' => round((time() - strtotime($cached['analysis_timestamp'])) / 3600, 1)
        ];
    }
    
    /**
     * 分析結果保存
     */
    private function saveMirrorAnalysis($productId, $analysisResult, $searchKeywords) {
        try {
            $sql = "INSERT INTO sell_mirror_analysis 
                    (yahoo_product_id, mirror_confidence, sold_count_90days, average_price, 
                     median_price, min_price, max_price, competitor_count, profit_estimation, 
                     risk_level, mirror_templates, ebay_search_keywords, api_calls_used, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW() + INTERVAL '%d hours')
                    ON CONFLICT (yahoo_product_id) 
                    DO UPDATE SET
                        mirror_confidence = EXCLUDED.mirror_confidence,
                        sold_count_90days = EXCLUDED.sold_count_90days,
                        average_price = EXCLUDED.average_price,
                        median_price = EXCLUDED.median_price,
                        min_price = EXCLUDED.min_price,
                        max_price = EXCLUDED.max_price,
                        competitor_count = EXCLUDED.competitor_count,
                        profit_estimation = EXCLUDED.profit_estimation,
                        risk_level = EXCLUDED.risk_level,
                        mirror_templates = EXCLUDED.mirror_templates,
                        ebay_search_keywords = EXCLUDED.ebay_search_keywords,
                        api_calls_used = EXCLUDED.api_calls_used,
                        analysis_timestamp = NOW(),
                        expires_at = NOW() + INTERVAL '%d hours',
                        is_valid = TRUE";
            
            $stmt = $this->pdo->prepare(sprintf($sql, self::ANALYSIS_CACHE_HOURS, self::ANALYSIS_CACHE_HOURS));
            
            $stmt->execute([
                $productId,
                $analysisResult['mirror_confidence'],
                $analysisResult['sold_count_90days'],
                $analysisResult['average_price'],
                $analysisResult['median_price'] ?? $analysisResult['average_price'],
                $analysisResult['min_price'],
                $analysisResult['max_price'],
                $analysisResult['competitor_count'],
                $analysisResult['profit_estimation'],
                $analysisResult['risk_level'],
                json_encode($analysisResult['mirror_templates']),
                $searchKeywords,
                $analysisResult['api_calls_used'] ?? 2
            ]);
            
            $this->debugLog("分析結果保存完了: Product ID {$productId}");
            
        } catch (Exception $e) {
            $this->debugLog("分析結果保存エラー: " . $e->getMessage());
        }
    }
    
    /**
     * バッチ処理: 複数商品の一括セルミラー分析
     */
    public function analyzeBatch($productIds, $maxApiCalls = 50) {
        $results = [];
        $totalApiCalls = 0;
        $startTime = microtime(true);
        
        try {
            foreach ($productIds as $productId) {
                if ($totalApiCalls >= $maxApiCalls) {
                    $this->debugLog("API制限に達しました。処理中断: {$totalApiCalls} calls");
                    break;
                }
                
                // 商品データ取得
                $sql = "SELECT * FROM yahoo_scraped_products WHERE id = ?";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([$productId]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$product) {
                    $results[] = [
                        'product_id' => $productId,
                        'success' => false,
                        'error' => '商品が見つかりません'
                    ];
                    continue;
                }
                
                // セルミラー分析実行
                $analysisResult = $this->analyzeSellMirror($product);
                
                $results[] = [
                    'product_id' => $productId,
                    'success' => !isset($analysisResult['error']),
                    'analysis_result' => $analysisResult,
                    'title' => $product['title']
                ];
                
                $totalApiCalls += ($analysisResult['api_calls_used'] ?? 2);
                
                // API制限考慮で1秒待機
                sleep(1);
            }
            
            $processingTime = round((microtime(true) - $startTime) * 1000);
            
            return [
                'success' => true,
                'processed_count' => count($results),
                'success_count' => count(array_filter($results, function($r) { return $r['success']; })),
                'total_api_calls' => $totalApiCalls,
                'processing_time_ms' => $processingTime,
                'results' => $results
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'processed_count' => count($results),
                'results' => $results
            ];
        }
    }
    
    /**
     * デバッグログ
     */
    private function debugLog($message) {
        if ($this->debugMode) {
            error_log("[SellMirrorAnalyzer] " . date('Y-m-d H:i:s') . " - " . $message);
        }
    }
}
?>