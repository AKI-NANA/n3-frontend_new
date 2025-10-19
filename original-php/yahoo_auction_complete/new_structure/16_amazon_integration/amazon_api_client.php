<?php
/**
 * Amazon Product Advertising API クライアント
 * new_structure/02_scraping/amazon/AmazonApiClient.php
 * 
 * PA-API v5.0 対応 - AWS Signature Version 4 認証
 * レート制限遵守・エラーハンドリング・バッチ処理対応
 */

require_once __DIR__ . '/../../shared/config/amazon_api.php';
require_once __DIR__ . '/../../shared/core/common_functions.php';

class AmazonApiClient {
    
    private $config;
    private $credentials;
    private $marketplace;
    private $lastRequestTime = 0;
    private $requestCount = 0;
    private $dailyRequestCount = 0;
    private $errorCount = 0;
    private $circuitBreakerOpen = false;
    private $circuitBreakerOpenTime = 0;
    
    /**
     * コンストラクタ
     * 
     * @param string $marketplace マーケットプレイス ('US', 'JP', 'UK', etc.)
     */
    public function __construct($marketplace = 'US') {
        $this->config = require __DIR__ . '/../../shared/config/amazon_api.php';
        $this->credentials = $this->config['credentials'];
        $this->marketplace = $this->config['marketplaces'][$marketplace] ?? $this->config['marketplaces']['US'];
        
        // 設定検証
        $this->validateConfig();
        
        // レート制限トラッカー初期化
        $this->initializeRateLimitTracker();
        
        $this->logMessage("Amazon API Client initialized for marketplace: $marketplace", 'INFO');
    }
    
    /**
     * 複数ASIN商品情報取得（バッチ処理）
     * 
     * @param array $asins ASIN配列（最大10個）
     * @param string $resourceSet リソースセット名 ('basic', 'standard', 'complete', 'optimized')
     * @return array 取得結果
     */
    public function getItemsBatch(array $asins, $resourceSet = 'optimized') {
        if (empty($asins)) {
            throw new InvalidArgumentException('ASINs array cannot be empty');
        }
        
        // バッチサイズ制限
        $maxBatchSize = $this->config['operations']['GetItems']['max_asins'];
        if (count($asins) > $maxBatchSize) {
            throw new InvalidArgumentException("Maximum $maxBatchSize ASINs per batch allowed");
        }
        
        // ASIN検証
        $this->validateAsins($asins);
        
        // リソース設定
        $resources = getResourceSet($resourceSet);
        
        // リクエストパラメータ構築
        $params = [
            'ItemIds' => $asins,
            'Resources' => $resources,
            'PartnerTag' => $this->credentials['partner_tag'],
            'PartnerType' => 'Associates',
            'Marketplace' => $this->marketplace['marketplace_id']
        ];
        
        // API実行
        $response = $this->executeRequest('GetItems', $params);
        
        // レスポンス処理
        return $this->processGetItemsResponse($response, $asins);
    }
    
    /**
     * キーワード検索
     * 
     * @param string $keywords 検索キーワード
     * @param array $options 検索オプション
     * @return array
     */
    public function searchItems($keywords, $options = []) {
        if (empty(trim($keywords))) {
            throw new InvalidArgumentException('Keywords cannot be empty');
        }
        
        // デフォルトオプション
        $defaultOptions = [
            'SearchIndex' => 'All',
            'ItemCount' => 10,
            'ItemPage' => 1,
            'SortBy' => 'Relevance',
            'resources' => 'standard'
        ];
        
        $options = array_merge($defaultOptions, $options);
        
        // リクエストパラメータ構築
        $params = [
            'Keywords' => $keywords,
            'Resources' => getResourceSet($options['resources']),
            'SearchIndex' => $options['SearchIndex'],
            'ItemCount' => min($options['ItemCount'], 50), // 最大50件
            'ItemPage' => $options['ItemPage'],
            'PartnerTag' => $this->credentials['partner_tag'],
            'PartnerType' => 'Associates',
            'Marketplace' => $this->marketplace['marketplace_id']
        ];
        
        // ソート設定
        if (!empty($options['SortBy'])) {
            $params['SortBy'] = $options['SortBy'];
        }
        
        // ブランドフィルタ
        if (!empty($options['Brand'])) {
            $params['Brand'] = $options['Brand'];
        }
        
        // 価格レンジフィルタ
        if (isset($options['MinPrice'])) {
            $params['MinPrice'] = $options['MinPrice'];
        }
        if (isset($options['MaxPrice'])) {
            $params['MaxPrice'] = $options['MaxPrice'];
        }
        
        // API実行
        $response = $this->executeRequest('SearchItems', $params);
        
        return $this->processSearchItemsResponse($response);
    }
    
    /**
     * 大量ASIN処理（自動バッチ分割）
     * 
     * @param array $asins ASIN配列（制限なし）
     * @param string $resourceSet リソースセット名
     * @param callable $progressCallback 進捗コールバック関数
     * @return array 全結果
     */
    public function getItemsLargeBatch(array $asins, $resourceSet = 'optimized', callable $progressCallback = null) {
        if (empty($asins)) {
            return [];
        }
        
        $maxBatchSize = $this->config['operations']['GetItems']['max_asins'];
        $batches = array_chunk($asins, $maxBatchSize);
        $allResults = [];
        $totalBatches = count($batches);
        
        $this->logMessage("Processing {$totalBatches} batches for " . count($asins) . " ASINs", 'INFO');
        
        foreach ($batches as $batchIndex => $batch) {
            try {
                // レート制限チェック・待機
                $this->enforceRateLimit();
                
                // バッチ処理実行
                $batchResults = $this->getItemsBatch($batch, $resourceSet);
                
                // 結果マージ
                if (isset($batchResults['items'])) {
                    $allResults = array_merge($allResults, $batchResults['items']);
                }
                
                // 進捗報告
                if ($progressCallback) {
                    $progress = [
                        'current_batch' => $batchIndex + 1,
                        'total_batches' => $totalBatches,
                        'processed_items' => count($allResults),
                        'total_items' => count($asins),
                        'success_rate' => count($allResults) / ((($batchIndex + 1) * $maxBatchSize)) * 100
                    ];
                    call_user_func($progressCallback, $progress);
                }
                
                $this->logMessage("Batch " . ($batchIndex + 1) . "/$totalBatches completed. Items retrieved: " . count($batchResults['items'] ?? []), 'INFO');
                
            } catch (Exception $e) {
                $this->logMessage("Batch " . ($batchIndex + 1) . " failed: " . $e->getMessage(), 'ERROR');
                
                // エラーレート管理
                $this->errorCount++;
                if ($this->errorCount >= $this->config['rate_limiting']['circuit_breaker_threshold']) {
                    $this->openCircuitBreaker();
                    throw new Exception("Circuit breaker opened due to high error rate");
                }
                
                // 継続するかどうかの判定
                if (!$this->config['batch_processing']['auto_retry_failed']) {
                    throw $e;
                }
            }
        }
        
        return [
            'items' => $allResults,
            'total_requested' => count($asins),
            'total_retrieved' => count($allResults),
            'success_rate' => count($allResults) / count($asins) * 100,
            'batches_processed' => $totalBatches
        ];
    }
    
    /**
     * APIリクエスト実行（コア）
     * 
     * @param string $operation 操作名 ('GetItems', 'SearchItems')
     * @param array $params パラメータ
     * @return array レスポンス
     */
    private function executeRequest($operation, $params) {
        // サーキットブレーカーチェック
        $this->checkCircuitBreaker();
        
        // レート制限チェック
        $this->enforceRateLimit();
        
        // リクエストボディ作成
        $requestBody = json_encode($params);
        
        // AWS署名作成
        $signature = $this->createAwsSignature($operation, $requestBody);
        
        // HTTPヘッダー準備
        $headers = [
            'Authorization: ' . $signature['authorization'],
            'Content-Type: application/json; charset=utf-8',
            'Host: ' . $this->marketplace['host'],
            'X-Amz-Date: ' . $signature['timestamp'],
            'X-Amz-Target: com.amazon.paapi5.v1.ProductAdvertisingAPIv1.' . $operation,
            'User-Agent: ' . $this->config['http']['user_agent']
        ];
        
        // cURL実行
        $startTime = microtime(true);
        $response = $this->executeCurl($operation, $requestBody, $headers);
        $responseTime = (microtime(true) - $startTime) * 1000; // ミリ秒
        
        // レスポンス処理
        $decodedResponse = json_decode($response, true);
        
        // エラーチェック
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON response: ' . json_last_error_msg());
        }
        
        // APIエラーチェック
        if (isset($decodedResponse['Errors'])) {
            $this->handleApiErrors($decodedResponse['Errors']);
        }
        
        // 成功ログ
        $this->logApiRequest($operation, $params, $decodedResponse, $responseTime, true);
        
        // 成功カウンタリセット
        $this->errorCount = 0;
        
        return $decodedResponse;
    }
    
    /**
     * AWS Signature Version 4 署名作成
     * 
     * @param string $operation 操作名
     * @param string $requestBody リクエストボディ
     * @return array 署名情報
     */
    private function createAwsSignature($operation, $requestBody) {
        $timestamp = gmdate('Ymd\THis\Z');
        $date = gmdate('Ymd');
        $region = $this->marketplace['region'];
        $service = 'ProductAdvertisingAPI';
        
        // Step 1: Canonical Request
        $method = 'POST';
        $uri = $this->config['operations'][$operation]['path'];
        $queryString = '';
        
        $canonicalHeaders = "content-type:application/json; charset=utf-8\n" .
                           "host:" . $this->marketplace['host'] . "\n" .
                           "x-amz-date:" . $timestamp . "\n" .
                           "x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1." . $operation . "\n";
        
        $signedHeaders = 'content-type;host;x-amz-date;x-amz-target';
        $payloadHash = hash('sha256', $requestBody);
        
        $canonicalRequest = $method . "\n" .
                           $uri . "\n" .
                           $queryString . "\n" .
                           $canonicalHeaders . "\n" .
                           $signedHeaders . "\n" .
                           $payloadHash;
        
        // Step 2: String to Sign
        $algorithm = 'AWS4-HMAC-SHA256';
        $credentialScope = $date . '/' . $region . '/' . $service . '/aws4_request';
        $stringToSign = $algorithm . "\n" .
                       $timestamp . "\n" .
                       $credentialScope . "\n" .
                       hash('sha256', $canonicalRequest);
        
        // Step 3: Calculate Signature
        $kDate = hash_hmac('sha256', $date, 'AWS4' . $this->credentials['secret_key'], true);
        $kRegion = hash_hmac('sha256', $region, $kDate, true);
        $kService = hash_hmac('sha256', $service, $kRegion, true);
        $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);
        $signature = hash_hmac('sha256', $stringToSign, $kSigning);
        
        // Step 4: Create Authorization Header
        $authorization = $algorithm . ' ' .
                        'Credential=' . $this->credentials['access_key'] . '/' . $credentialScope . ', ' .
                        'SignedHeaders=' . $signedHeaders . ', ' .
                        'Signature=' . $signature;
        
        return [
            'authorization' => $authorization,
            'timestamp' => $timestamp
        ];
    }
    
    /**
     * cURL実行
     * 
     * @param string $operation 操作名
     * @param string $requestBody リクエストボディ
     * @param array $headers HTTPヘッダー
     * @return string レスポンス
     */
    private function executeCurl($operation, $requestBody, $headers) {
        $url = 'https://' . $this->marketplace['host'] . $this->config['operations'][$operation]['path'];
        
        $ch = curl_init();
        
        $curlOptions = [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $requestBody,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => $this->config['http']['timeout'],
            CURLOPT_CONNECTTIMEOUT => $this->config['http']['connect_timeout'],
            CURLOPT_FOLLOWLOCATION => $this->config['http']['follow_redirects'],
            CURLOPT_MAXREDIRS => $this->config['http']['max_redirects'],
        ];
        
        // 設定からのcURLオプション追加
        foreach ($this->config['http']['curl_options'] as $option => $value) {
            $curlOptions[$option] = $value;
        }
        
        curl_setopt_array($ch, $curlOptions);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        
        curl_close($ch);
        
        // cURLエラーチェック
        if ($response === false || !empty($error)) {
            throw new Exception("cURL error: $error");
        }
        
        // HTTPステータスコードチェック
        if ($httpCode !== 200) {
            $this->handleHttpError($httpCode, $response);
        }
        
        return $response;
    }
    
    /**
     * GetItemsレスポンス処理
     * 
     * @param array $response APIレスポンス
     * @param array $requestedAsins リクエストされたASIN
     * @return array 処理済みデータ
     */
    private function processGetItemsResponse($response, $requestedAsins) {
        $items = [];
        $errors = [];
        
        // 成功したアイテム処理
        if (isset($response['ItemsResult']['Items'])) {
            foreach ($response['ItemsResult']['Items'] as $item) {
                $processedItem = $this->processItemData($item);
                if ($processedItem) {
                    $items[] = $processedItem;
                }
            }
        }
        
        // エラーアイテム処理
        if (isset($response['Errors'])) {
            foreach ($response['Errors'] as $error) {
                $errors[] = [
                    'code' => $error['Code'] ?? 'Unknown',
                    'message' => $error['Message'] ?? 'Unknown error'
                ];
            }
        }
        
        return [
            'items' => $items,
            'errors' => $errors,
            'requested_count' => count($requestedAsins),
            'retrieved_count' => count($items),
            'success_rate' => count($requestedAsins) > 0 ? (count($items) / count($requestedAsins)) * 100 : 0
        ];
    }
    
    /**
     * 個別商品データ処理
     * 
     * @param array $itemData APIからの生データ
     * @return array 処理済みデータ
     */
    private function processItemData($itemData) {
        try {
            $processed = [
                'asin' => $itemData['ASIN'] ?? '',
                'title' => $this->extractValue($itemData, 'ItemInfo.Title.DisplayValue'),
                'brand' => $this->extractValue($itemData, 'ItemInfo.ByLineInfo.Brand.DisplayValue'),
                'manufacturer' => $this->extractValue($itemData, 'ItemInfo.ByLineInfo.Manufacturer.DisplayValue'),
                'product_group' => $this->extractValue($itemData, 'ItemInfo.Classifications.ProductGroup.DisplayValue'),
                'binding' => $this->extractValue($itemData, 'ItemInfo.Classifications.Binding.DisplayValue'),
                
                // 価格情報
                'price_info' => $this->extractPriceInfo($itemData),
                
                // 在庫情報
                'availability' => $this->extractAvailabilityInfo($itemData),
                
                // レビュー情報
                'reviews' => $this->extractReviewInfo($itemData),
                
                // 画像情報
                'images' => $this->extractImageInfo($itemData),
                
                // 特徴・仕様
                'features' => $this->extractFeatures($itemData),
                'specifications' => $this->extractSpecifications($itemData),
                
                // カテゴリ・ランキング
                'categories' => $this->extractCategoryInfo($itemData),
                'sales_rank' => $this->extractSalesRank($itemData),
                
                // メタデータ
                'parent_asin' => $itemData['ParentASIN'] ?? null,
                'variation_summary' => $this->extractVariationSummary($itemData),
                
                // 処理情報
                'processed_at' => date('Y-m-d H:i:s'),
                'api_version' => '5.0',
                'marketplace' => array_search($this->marketplace, $this->config['marketplaces'])
            ];
            
            return $processed;
            
        } catch (Exception $e) {
            $this->logMessage("Error processing item data for ASIN {$itemData['ASIN']}: " . $e->getMessage(), 'ERROR');
            return null;
        }
    }
    
    /**
     * ネストされた配列から値を安全に抽出
     * 
     * @param array $data データ配列
     * @param string $path ドット記法のパス
     * @return mixed
     */
    private function extractValue($data, $path) {
        $keys = explode('.', $path);
        $current = $data;
        
        foreach ($keys as $key) {
            if (is_array($current) && isset($current[$key])) {
                $current = $current[$key];
            } else {
                return null;
            }
        }
        
        return $current;
    }
    
    /**
     * 価格情報抽出
     */
    private function extractPriceInfo($itemData) {
        $priceInfo = [];
        
        if (isset($itemData['Offers']['Listings'][0])) {
            $listing = $itemData['Offers']['Listings'][0];
            
            // 現在価格
            if (isset($listing['Price'])) {
                $priceInfo['amount'] = $listing['Price']['Amount'] ?? null;
                $priceInfo['currency'] = $listing['Price']['Currency'] ?? null;
                $priceInfo['display_amount'] = $listing['Price']['DisplayAmount'] ?? null;
            }
            
            // 割引情報
            if (isset($listing['SavingBasis'])) {
                $priceInfo['original_price'] = $listing['SavingBasis']['Amount'] ?? null;
                $priceInfo['savings'] = ($priceInfo['original_price'] ?? 0) - ($priceInfo['amount'] ?? 0);
                $priceInfo['savings_percentage'] = $priceInfo['original_price'] > 0 ? 
                    ($priceInfo['savings'] / $priceInfo['original_price']) * 100 : 0;
            }
            
            // プライム情報
            $priceInfo['is_prime_eligible'] = $listing['DeliveryInfo']['IsPrimeEligible'] ?? false;
            $priceInfo['is_free_shipping'] = $listing['DeliveryInfo']['IsFreeShippingEligible'] ?? false;
            $priceInfo['is_amazon_fulfilled'] = $listing['DeliveryInfo']['IsAmazonFulfilled'] ?? false;
        }
        
        // 価格サマリー
        if (isset($itemData['Offers']['Summaries'][0])) {
            $summary = $itemData['Offers']['Summaries'][0];
            $priceInfo['lowest_price'] = $summary['LowestPrice']['Amount'] ?? null;
            $priceInfo['highest_price'] = $summary['HighestPrice']['Amount'] ?? null;
            $priceInfo['offer_count'] = $summary['OfferCount'] ?? 0;
        }
        
        return $priceInfo;
    }
    
    /**
     * 在庫情報抽出
     */
    private function extractAvailabilityInfo($itemData) {
        $availability = [];
        
        if (isset($itemData['Offers']['Listings'][0]['Availability'])) {
            $avail = $itemData['Offers']['Listings'][0]['Availability'];
            
            $availability['message'] = $avail['Message'] ?? null;
            $availability['type'] = $avail['Type'] ?? null;
            $availability['max_order_quantity'] = $avail['MaxOrderQuantity'] ?? null;
            $availability['min_order_quantity'] = $avail['MinOrderQuantity'] ?? 1;
        }
        
        return $availability;
    }
    
    /**
     * レビュー情報抽出
     */
    private function extractReviewInfo($itemData) {
        $reviews = [];
        
        if (isset($itemData['CustomerReviews'])) {
            $reviews['count'] = $itemData['CustomerReviews']['Count'] ?? 0;
            $reviews['star_rating'] = $itemData['CustomerReviews']['StarRating']['Value'] ?? 0;
        }
        
        return $reviews;
    }
    
    /**
     * 画像情報抽出
     */
    private function extractImageInfo($itemData) {
        $images = [
            'primary' => [],
            'variants' => []
        ];
        
        // プライマリ画像
        if (isset($itemData['Images']['Primary'])) {
            foreach (['Small', 'Medium', 'Large'] as $size) {
                if (isset($itemData['Images']['Primary'][$size])) {
                    $images['primary'][strtolower($size)] = [
                        'url' => $itemData['Images']['Primary'][$size]['URL'],
                        'width' => $itemData['Images']['Primary'][$size]['Width'] ?? null,
                        'height' => $itemData['Images']['Primary'][$size]['Height'] ?? null
                    ];
                }
            }
        }
        
        // バリアント画像
        if (isset($itemData['Images']['Variants'])) {
            foreach ($itemData['Images']['Variants'] as $variant) {
                $variantImages = [];
                foreach (['Small', 'Medium', 'Large'] as $size) {
                    if (isset($variant[$size])) {
                        $variantImages[strtolower($size)] = [
                            'url' => $variant[$size]['URL'],
                            'width' => $variant[$size]['Width'] ?? null,
                            'height' => $variant[$size]['Height'] ?? null
                        ];
                    }
                }
                if (!empty($variantImages)) {
                    $images['variants'][] = $variantImages;
                }
            }
        }
        
        return $images;
    }
    
    /**
     * 商品特徴抽出
     */
    private function extractFeatures($itemData) {
        $features = [];
        
        if (isset($itemData['ItemInfo']['Features']['DisplayValues'])) {
            $features = $itemData['ItemInfo']['Features']['DisplayValues'];
        }
        
        return $features;
    }
    
    /**
     * 商品仕様抽出
     */
    private function extractSpecifications($itemData) {
        $specs = [];
        
        // 商品情報
        if (isset($itemData['ItemInfo']['ProductInfo'])) {
            $productInfo = $itemData['ItemInfo']['ProductInfo'];
            
            if (isset($productInfo['Color']['DisplayValue'])) {
                $specs['color'] = $productInfo['Color']['DisplayValue'];
            }
            if (isset($productInfo['Size']['DisplayValue'])) {
                $specs['size'] = $productInfo['Size']['DisplayValue'];
            }
            if (isset($productInfo['UnitCount']['DisplayValue'])) {
                $specs['unit_count'] = $productInfo['UnitCount']['DisplayValue'];
            }
        }
        
        // 技術仕様
        if (isset($itemData['ItemInfo']['TechnicalInfo'])) {
            $techInfo = $itemData['ItemInfo']['TechnicalInfo'];
            
            if (isset($techInfo['Formats']['DisplayValues'])) {
                $specs['formats'] = $techInfo['Formats']['DisplayValues'];
            }
        }
        
        // 外部ID
        if (isset($itemData['ItemInfo']['ExternalIds'])) {
            $externalIds = $itemData['ItemInfo']['ExternalIds'];
            foreach (['EANs', 'UPCs', 'ISBNs'] as $idType) {
                if (isset($externalIds[$idType]['DisplayValues'])) {
                    $specs[strtolower($idType)] = $externalIds[$idType]['DisplayValues'];
                }
            }
        }
        
        return $specs;
    }
    
    /**
     * カテゴリ情報抽出
     */
    private function extractCategoryInfo($itemData) {
        $categories = [];
        
        if (isset($itemData['BrowseNodeInfo']['BrowseNodes'])) {
            foreach ($itemData['BrowseNodeInfo']['BrowseNodes'] as $node) {
                $categories[] = [
                    'id' => $node['Id'] ?? null,
                    'name' => $node['DisplayName'] ?? null,
                    'context_free_name' => $node['ContextFreeName'] ?? null,
                    'sales_rank' => $node['SalesRank'] ?? null
                ];
            }
        }
        
        return $categories;
    }
    
    /**
     * セールスランク抽出
     */
    private function extractSalesRank($itemData) {
        $salesRank = [];
        
        if (isset($itemData['BrowseNodeInfo']['WebsiteSalesRank'])) {
            $rank = $itemData['BrowseNodeInfo']['WebsiteSalesRank'];
            $salesRank['website'] = [
                'rank' => $rank['Rank'] ?? null,
                'display_name' => $rank['DisplayName'] ?? null,
                'context_free_name' => $rank['ContextFreeName'] ?? null
            ];
        }
        
        return $salesRank;
    }
    
    /**
     * バリエーション情報抽出
     */
    private function extractVariationSummary($itemData) {
        $variation = [];
        
        if (isset($itemData['VariationSummary'])) {
            $summary = $itemData['VariationSummary'];
            
            $variation['page_count'] = $summary['PageCount'] ?? 0;
            $variation['variation_count'] = $summary['VariationCount'] ?? 0;
            
            if (isset($summary['Price'])) {
                $variation['price_range'] = [
                    'lowest' => $summary['Price']['LowestPrice']['Amount'] ?? null,
                    'highest' => $summary['Price']['HighestPrice']['Amount'] ?? null
                ];
            }
        }
        
        return $variation;
    }
    
    /**
     * レート制限強制実行
     */
    private function enforceRateLimit() {
        $now = microtime(true);
        $timeSinceLastRequest = $now - $this->lastRequestTime;
        $minInterval = 1.0; // 1秒間隔
        
        if ($timeSinceLastRequest < $minInterval) {
            $sleepTime = $minInterval - $timeSinceLastRequest;
            usleep($sleepTime * 1000000); // マイクロ秒に変換
            $this->logMessage("Rate limit enforced. Slept for {$sleepTime} seconds", 'DEBUG');
        }
        
        $this->lastRequestTime = microtime(true);
        $this->requestCount++;
        $this->dailyRequestCount++;
        
        // 1日の上限チェック
        if ($this->dailyRequestCount >= $this->config['rate_limiting']['max_daily_requests']) {
            throw new Exception("Daily request limit exceeded");
        }
    }
    
    /**
     * サーキットブレーカーチェック
     */
    private function checkCircuitBreaker() {
        if ($this->circuitBreakerOpen) {
            $now = time();
            if (($now - $this->circuitBreakerOpenTime) >= $this->config['rate_limiting']['circuit_breaker_timeout']) {
                $this->circuitBreakerOpen = false;
                $this->errorCount = 0;
                $this->logMessage("Circuit breaker closed", 'INFO');
            } else {
                throw new Exception("Circuit breaker is open. Try again later.");
            }
        }
    }
    
    /**
     * サーキットブレーカーを開く
     */
    private function openCircuitBreaker() {
        $this->circuitBreakerOpen = true;
        $this->circuitBreakerOpenTime = time();
        $this->logMessage("Circuit breaker opened due to high error rate", 'WARNING');
    }
    
    /**
     * APIエラーハンドリング
     */
    private function handleApiErrors($errors) {
        foreach ($errors as $error) {
            $errorCode = $error['Code'] ?? 'Unknown';
            $errorMessage = $error['Message'] ?? 'Unknown error';
            
            $this->logMessage("API Error: [$errorCode] $errorMessage", 'ERROR');
            
            // 致命的エラーの場合は即座に例外投げる
            if (in_array($errorCode, $this->config['error_handling']['error_codes']['fatal'])) {
                throw new Exception("Fatal API error: [$errorCode] $errorMessage");
            }
            
            // レート制限エラーの場合
            if (in_array($errorCode, ['TooManyRequests', 'RequestThrottled'])) {
                $this->logMessage("Rate limit hit. Implementing backoff strategy", 'WARNING');
                sleep(5); // 5秒待機
                throw new Exception("Rate limit exceeded: $errorMessage");
            }
        }
        
        // 非致命的エラーの場合は警告ログのみ
        $this->errorCount++;
    }
    
    /**
     * HTTPエラーハンドリング
     */
    private function handleHttpError($httpCode, $response) {
        $message = "HTTP Error $httpCode";
        
        switch ($httpCode) {
            case 400:
                $message .= ": Bad Request";
                break;
            case 401:
                $message .= ": Unauthorized";
                break;
            case 403:
                $message .= ": Forbidden";
                break;
            case 429:
                $message .= ": Too Many Requests";
                break;
            case 500:
                $message .= ": Internal Server Error";
                break;
            case 503:
                $message .= ": Service Unavailable";
                break;
        }
        
        $this->logMessage($message . " - Response: " . substr($response, 0, 500), 'ERROR');
        throw new Exception($message);
    }
    
    /**
     * ASIN検証
     */
    private function validateAsins($asins) {
        foreach ($asins as $asin) {
            if (!is_string($asin) || strlen($asin) !== 10) {
                throw new InvalidArgumentException("Invalid ASIN: $asin");
            }
            if (!ctype_alnum($asin)) {
                throw new InvalidArgumentException("ASIN must be alphanumeric: $asin");
            }
        }
    }
    
    /**
     * 設定検証
     */
    private function validateConfig() {
        $required = ['access_key', 'secret_key', 'partner_tag'];
        
        foreach ($required as $key) {
            if (empty($this->credentials[$key])) {
                throw new InvalidArgumentException("Missing required credential: $key");
            }
        }
        
        if (empty($this->marketplace)) {
            throw new InvalidArgumentException("Invalid marketplace configuration");
        }
    }
    
    /**
     * レート制限トラッカー初期化
     */
    private function initializeRateLimitTracker() {
        // 今日のリクエスト数を復元
        $today = date('Y-m-d');
        $cacheFile = $this->config['caching']['directory'] . 'rate_limit_tracker.json';
        
        if (file_exists($cacheFile)) {
            $data = json_decode(file_get_contents($cacheFile), true);
            $this->dailyRequestCount = $data['daily'][$today] ?? 0;
        }
    }
    
    /**
     * APIリクエストログ記録
     */
    private function logApiRequest($operation, $params, $response, $responseTime, $success) {
        if (!$this->config['logging']['enabled']) {
            return;
        }
        
        $logData = [
            'operation' => $operation,
            'success' => $success,
            'response_time_ms' => round($responseTime),
            'items_requested' => is_array($params['ItemIds'] ?? null) ? count($params['ItemIds']) : 1,
            'items_returned' => isset($response['ItemsResult']['Items']) ? count($response['ItemsResult']['Items']) : 0,
            'marketplace' => array_search($this->marketplace, $this->config['marketplaces']),
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        if ($this->config['logging']['include_request_details']) {
            $logData['request_params'] = $this->config['security']['mask_sensitive_data'] ? 
                array_diff_key($params, ['PartnerTag' => '']) : $params;
        }
        
        $this->logMessage("API Request: " . json_encode($logData), 'INFO');
    }
    
    /**
     * ログメッセージ出力
     */
    private function logMessage($message, $level = 'INFO') {
        if (!$this->config['logging']['enabled']) {
            return;
        }
        
        $logLevel = strtoupper($this->config['logging']['level']);
        $levels = ['DEBUG' => 0, 'INFO' => 1, 'WARNING' => 2, 'ERROR' => 3];
        
        if ($levels[$level] < $levels[$logLevel]) {
            return;
        }
        
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[$timestamp] $level: $message" . PHP_EOL;
        
        $logFile = $this->config['logging']['file'];
        $logDir = dirname($logFile);
        
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
        
        // ファイルサイズチェック・ローテーション
        if (file_exists($logFile) && filesize($logFile) > $this->config['logging']['max_file_size']) {
            $this->rotateLogFile($logFile);
        }
    }
    
    /**
     * ログファイルローテーション
     */
    private function rotateLogFile($logFile) {
        $maxFiles = $this->config['logging']['max_files'];
        
        for ($i = $maxFiles - 1; $i >= 1; $i--) {
            $oldFile = $logFile . '.' . $i;
            $newFile = $logFile . '.' . ($i + 1);
            
            if (file_exists($oldFile)) {
                rename($oldFile, $newFile);
            }
        }
        
        rename($logFile, $logFile . '.1');
    }
    
    /**
     * デストラクタ - リクエストカウント保存
     */
    public function __destruct() {
        recordRequest();
    }
}

?>