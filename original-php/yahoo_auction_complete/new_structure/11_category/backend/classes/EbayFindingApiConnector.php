<?php
/**
 * eBay Finding API連携クラス - 高精度カテゴリー自動判定システム
 * 引き継ぎ書 Priority B: eBay API自動カテゴリー取得実装
 * 
 * 技術仕様:
 * - Finding API findItemsAdvanced使用
 * - 商品タイトル→カテゴリーID変換ロジック
 * - レート制限遵守（指数関数的バックオフ）
 * - 30日間キャッシュシステム
 * - Select Categories判定対応
 */

class EbayFindingApiConnector {
    private $pdo;
    private $config;
    private $debugMode;
    
    // API制限設定
    private const MAX_RETRIES = 5;
    private const BASE_DELAY = 1; // 秒
    private const CACHE_DURATION = 30; // 日
    
    public function __construct($dbConnection, $debugMode = false) {
        $this->pdo = $dbConnection;
        $this->debugMode = $debugMode;
        $this->config = $this->loadConfig();
    }
    
    /**
     * 設定読み込み
     */
    private function loadConfig() {
        return [
            'app_id' => 'YOUR_EBAY_APP_ID', // 要設定
            'global_id' => 'EBAY-US', // USサイト
            'endpoint' => 'https://svcs.ebay.com/services/search/FindingService/v1',
            'version' => '1.13.0',
            'site_id' => '0' // US = 0
        ];
    }
    
    /**
     * メイン機能: 商品タイトルからeBayカテゴリーを自動判定
     * @param string $productTitle 商品タイトル
     * @param array $options 追加オプション
     * @return array カテゴリー判定結果
     */
    public function detectCategoryFromTitle($productTitle, $options = []) {
        try {
            // 1. キャッシュチェック
            $cachedResult = $this->getCachedResult($productTitle);
            if ($cachedResult) {
                $this->debugLog("キャッシュヒット: " . $productTitle);
                return $cachedResult;
            }
            
            // 2. eBay Finding API呼び出し
            $searchResults = $this->searchItemsByTitle($productTitle, $options);
            
            // 3. カテゴリー分析・判定
            $categoryResult = $this->analyzeCategoryDistribution($searchResults);
            
            // 4. Select Categories判定
            $categoryResult['quota_type'] = $this->determineQuotaType($categoryResult['category_id']);
            
            // 5. 結果キャッシュ
            $this->cacheResult($productTitle, $categoryResult);
            
            // 6. API呼び出し履歴記録
            $this->logApiCall('findItemsAdvanced', [
                'title' => $productTitle,
                'results_count' => count($searchResults['items'] ?? [])
            ], true);
            
            return $categoryResult;
            
        } catch (Exception $e) {
            $this->debugLog("エラー発生: " . $e->getMessage());
            
            // エラー時はフォールバック
            return $this->getFallbackCategory($productTitle);
        }
    }
    
    /**
     * eBay Finding API - findItemsAdvanced呼び出し
     */
    private function searchItemsByTitle($title, $options = []) {
        $maxItems = $options['max_items'] ?? 100;
        $sortOrder = $options['sort_order'] ?? 'BestMatch';
        
        // APIパラメータ構築
        $params = [
            'OPERATION-NAME' => 'findItemsAdvanced',
            'SERVICE-VERSION' => $this->config['version'],
            'SECURITY-APPNAME' => $this->config['app_id'],
            'GLOBAL-ID' => $this->config['global_id'],
            'RESPONSE-DATA-FORMAT' => 'JSON',
            'REST-PAYLOAD' => '',
            'keywords' => $this->sanitizeTitle($title),
            'paginationInput.entriesPerPage' => $maxItems,
            'sortOrder' => $sortOrder,
            'itemFilter(0).name' => 'ListingType',
            'itemFilter(0).value' => 'FixedPrice',
            'itemFilter(1).name' => 'Condition',
            'itemFilter(1).value' => 'Used'
        ];
        
        return $this->makeApiRequest($params);
    }
    
    /**
     * API リクエスト実行（レート制限対応）
     */
    private function makeApiRequest($params, $retryCount = 0) {
        $startTime = microtime(true);
        
        try {
            // URLエンコード
            $queryString = http_build_query($params);
            $url = $this->config['endpoint'] . '?' . $queryString;
            
            // cURL実行
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_USERAGENT => 'NAGANO-3 eBay Category Detector v1.0',
                CURLOPT_HTTPHEADER => [
                    'X-EBAY-API-IAF-TOKEN: ' . ($this->config['user_token'] ?? ''),
                    'X-EBAY-API-REQUEST-ENCODING: JSON'
                ]
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);
            
            $processingTime = round((microtime(true) - $startTime) * 1000);
            
            if ($curlError) {
                throw new Exception("cURL Error: " . $curlError);
            }
            
            if ($httpCode !== 200) {
                if ($httpCode === 429 && $retryCount < self::MAX_RETRIES) {
                    // レート制限エラー - 指数関数的バックオフ
                    $delay = self::BASE_DELAY * pow(2, $retryCount);
                    $this->debugLog("レート制限発生。{$delay}秒待機後リトライ... ({$retryCount}/" . self::MAX_RETRIES . ")");
                    sleep($delay);
                    return $this->makeApiRequest($params, $retryCount + 1);
                }
                throw new Exception("HTTP Error: " . $httpCode);
            }
            
            $data = json_decode($response, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("JSON Parse Error: " . json_last_error_msg());
            }
            
            // API呼び出し履歴記録
            $this->logApiCall('findItemsAdvanced', $params, true, $data, $processingTime);
            
            return $this->parseApiResponse($data);
            
        } catch (Exception $e) {
            $this->logApiCall('findItemsAdvanced', $params, false, null, 0, $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * API レスポンス解析
     */
    private function parseApiResponse($data) {
        $items = [];
        
        if (!isset($data['findItemsAdvancedResponse'][0]['searchResult'][0]['item'])) {
            return ['items' => [], 'total_count' => 0];
        }
        
        $rawItems = $data['findItemsAdvancedResponse'][0]['searchResult'][0]['item'];
        $totalCount = $data['findItemsAdvancedResponse'][0]['searchResult'][0]['@count'] ?? 0;
        
        foreach ($rawItems as $item) {
            $items[] = [
                'item_id' => $item['itemId'][0] ?? '',
                'title' => $item['title'][0] ?? '',
                'category_id' => $item['primaryCategory'][0]['categoryId'][0] ?? '',
                'category_name' => $item['primaryCategory'][0]['categoryName'][0] ?? '',
                'price' => $item['sellingStatus'][0]['currentPrice'][0]['__value__'] ?? 0,
                'currency' => $item['sellingStatus'][0]['currentPrice'][0]['@currencyId'] ?? 'USD',
                'condition' => $item['condition'][0]['conditionDisplayName'][0] ?? 'Unknown',
                'listing_type' => $item['listingInfo'][0]['listingType'][0] ?? '',
                'start_time' => $item['listingInfo'][0]['startTime'][0] ?? '',
                'end_time' => $item['listingInfo'][0]['endTime'][0] ?? ''
            ];
        }
        
        return [
            'items' => $items,
            'total_count' => $totalCount,
            'api_response_time' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * カテゴリー分布分析・最適カテゴリー判定
     */
    private function analyzeCategoryDistribution($searchResults) {
        $items = $searchResults['items'] ?? [];
        
        if (empty($items)) {
            return $this->getDefaultCategory();
        }
        
        // カテゴリー別集計
        $categoryStats = [];
        $totalItems = count($items);
        
        foreach ($items as $item) {
            $categoryId = $item['category_id'];
            $categoryName = $item['category_name'];
            
            if (!isset($categoryStats[$categoryId])) {
                $categoryStats[$categoryId] = [
                    'category_id' => $categoryId,
                    'category_name' => $categoryName,
                    'count' => 0,
                    'total_price' => 0,
                    'avg_price' => 0,
                    'confidence_factors' => []
                ];
            }
            
            $categoryStats[$categoryId]['count']++;
            $categoryStats[$categoryId]['total_price'] += floatval($item['price']);
        }
        
        // 信頼度計算
        foreach ($categoryStats as $categoryId => &$stats) {
            $stats['percentage'] = round(($stats['count'] / $totalItems) * 100, 2);
            $stats['avg_price'] = round($stats['total_price'] / $stats['count'], 2);
            
            // 信頼度スコア計算
            $confidence = $this->calculateConfidenceScore($stats, $totalItems);
            $stats['confidence'] = $confidence;
        }
        
        // 最高信頼度カテゴリーを選択
        $bestCategory = array_reduce($categoryStats, function($best, $current) {
            return ($current['confidence'] > ($best['confidence'] ?? 0)) ? $current : $best;
        });
        
        return [
            'category_id' => $bestCategory['category_id'],
            'category_name' => $bestCategory['category_name'],
            'confidence' => $bestCategory['confidence'],
            'detection_method' => 'ebay_api',
            'source_items_count' => $totalItems,
            'category_distribution' => array_values($categoryStats),
            'api_search_results' => count($items)
        ];
    }
    
    /**
     * 信頼度スコア計算
     */
    private function calculateConfidenceScore($categoryStats, $totalItems) {
        $percentage = $categoryStats['percentage'];
        $itemCount = $categoryStats['count'];
        
        // ベーススコア（出現割合）
        $baseScore = min(80, $percentage * 0.8);
        
        // サンプル数ボーナス
        $sampleBonus = min(15, $itemCount * 0.5);
        
        // 最低サンプル数ペナルティ
        if ($itemCount < 3) {
            $baseScore *= 0.7;
        }
        
        // 総検索結果数による調整
        if ($totalItems < 10) {
            $baseScore *= 0.8;
        }
        
        return min(95, max(10, round($baseScore + $sampleBonus)));
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
     * キャッシュ結果取得
     */
    private function getCachedResult($title) {
        try {
            $titleHash = hash('sha256', trim($title));
            
            $sql = "SELECT ebay_category_id, confidence_score, api_response, hit_count
                    FROM ebay_category_search_cache 
                    WHERE title_hash = ? AND expires_at > NOW()";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$titleHash]);
            
            $cached = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($cached) {
                // ヒット数更新
                $updateSql = "UPDATE ebay_category_search_cache 
                              SET hit_count = hit_count + 1 WHERE title_hash = ?";
                $updateStmt = $this->pdo->prepare($updateSql);
                $updateStmt->execute([$titleHash]);
                
                $response = json_decode($cached['api_response'], true);
                $response['cache_hit'] = true;
                $response['cache_hit_count'] = $cached['hit_count'] + 1;
                
                return $response;
            }
            
            return null;
            
        } catch (Exception $e) {
            $this->debugLog("キャッシュ取得エラー: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * 結果キャッシュ保存
     */
    private function cacheResult($title, $result) {
        try {
            $titleHash = hash('sha256', trim($title));
            $expiresAt = date('Y-m-d H:i:s', strtotime('+' . self::CACHE_DURATION . ' days'));
            
            $sql = "INSERT INTO ebay_category_search_cache 
                    (search_title, title_hash, ebay_category_id, confidence_score, api_response, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT (title_hash) 
                    DO UPDATE SET 
                        confidence_score = EXCLUDED.confidence_score,
                        api_response = EXCLUDED.api_response,
                        expires_at = EXCLUDED.expires_at,
                        hit_count = 0";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                substr($title, 0, 500),
                $titleHash,
                $result['category_id'],
                $result['confidence'],
                json_encode($result),
                $expiresAt
            ]);
            
        } catch (Exception $e) {
            $this->debugLog("キャッシュ保存エラー: " . $e->getMessage());
        }
    }
    
    /**
     * API呼び出し履歴記録
     */
    private function logApiCall($method, $params, $success, $response = null, $processingTime = 0, $errorMessage = null) {
        try {
            $sql = "INSERT INTO ebay_api_calls 
                    (api_method, query_params, response_data, success, processing_time_ms, error_message)
                    VALUES (?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $method,
                json_encode($params),
                $response ? json_encode($response) : null,
                $success,
                $processingTime,
                $errorMessage
            ]);
            
        } catch (Exception $e) {
            $this->debugLog("API履歴記録エラー: " . $e->getMessage());
        }
    }
    
    /**
     * タイトルサニタイズ
     */
    private function sanitizeTitle($title) {
        // 特殊文字・記号を除去して検索精度向上
        $cleanTitle = preg_replace('/[^\p{L}\p{N}\s\-]/u', ' ', $title);
        $cleanTitle = preg_replace('/\s+/', ' ', $cleanTitle);
        return trim($cleanTitle);
    }
    
    /**
     * フォールバックカテゴリー
     */
    private function getFallbackCategory($title = '') {
        return [
            'category_id' => '99999',
            'category_name' => 'Other/Unclassified',
            'confidence' => 30,
            'detection_method' => 'fallback',
            'quota_type' => 'all_categories',
            'error' => 'API呼び出し失敗、フォールバック判定',
            'original_title' => $title
        ];
    }
    
    /**
     * デフォルトカテゴリー
     */
    private function getDefaultCategory() {
        return [
            'category_id' => '99999',
            'category_name' => 'Other/Unclassified',
            'confidence' => 20,
            'detection_method' => 'default',
            'quota_type' => 'all_categories'
        ];
    }
    
    /**
     * バッチ処理: 複数商品の一括判定
     */
    public function detectCategoriesBatch($productTitles) {
        $results = [];
        $batchSize = 10; // 10件ずつ処理
        
        for ($i = 0; $i < count($productTitles); $i += $batchSize) {
            $batch = array_slice($productTitles, $i, $batchSize);
            
            foreach ($batch as $index => $title) {
                try {
                    $result = $this->detectCategoryFromTitle($title);
                    $results[] = [
                        'index' => $i + $index,
                        'title' => $title,
                        'success' => true,
                        'result' => $result
                    ];
                    
                    // API制限考慮で1秒待機
                    sleep(1);
                    
                } catch (Exception $e) {
                    $results[] = [
                        'index' => $i + $index,
                        'title' => $title,
                        'success' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            // バッチ間隔調整
            if (($i + $batchSize) < count($productTitles)) {
                sleep(2);
            }
        }
        
        return $results;
    }
    
    /**
     * 出品枠残数チェック
     */
    public function checkListingQuota($storeLevel = 'basic', $monthYear = null) {
        if (!$monthYear) {
            $monthYear = date('Y-m');
        }
        
        try {
            $sql = "SELECT quota_type, current_count, max_quota,
                           (max_quota - current_count) as remaining
                    FROM current_listings_count 
                    WHERE store_level = ? AND month_year = ?";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$storeLevel, $monthYear]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            $this->debugLog("出品枠チェックエラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * API使用統計取得
     */
    public function getApiUsageStats($days = 7) {
        try {
            $sql = "SELECT 
                        DATE(api_call_time) as call_date,
                        COUNT(*) as total_calls,
                        COUNT(CASE WHEN success = true THEN 1 END) as successful_calls,
                        AVG(processing_time_ms) as avg_processing_time,
                        COUNT(CASE WHEN error_message LIKE '%rate limit%' THEN 1 END) as rate_limit_errors
                    FROM ebay_api_calls 
                    WHERE api_call_time >= NOW() - INTERVAL '{$days} days'
                    GROUP BY DATE(api_call_time)
                    ORDER BY call_date DESC";
            
            $stmt = $this->pdo->query($sql);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            $this->debugLog("統計取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * デバッグログ
     */
    private function debugLog($message) {
        if ($this->debugMode) {
            error_log("[EbayFindingApi] " . date('Y-m-d H:i:s') . " - " . $message);
        }
    }
}
?>