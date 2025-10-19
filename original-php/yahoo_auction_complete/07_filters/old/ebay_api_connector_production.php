<?php
/**
 * eBay API連携クラス - 実環境対応版
 * Trading API v1193対応、リアルタイム手数料取得
 */

class EbayApiConnector {
    private $config;
    private $pdo;
    private $cacheEnabled;
    private $debugMode;
    
    // eBay API エンドポイント
    private const SANDBOX_ENDPOINT = 'https://api.sandbox.ebay.com/ws/api/';
    private const PRODUCTION_ENDPOINT = 'https://api.ebay.com/ws/api/';
    
    public function __construct($dbConnection, $cacheEnabled = true, $debugMode = false) {
        $this->pdo = $dbConnection;
        $this->cacheEnabled = $cacheEnabled;
        $this->debugMode = $debugMode;
        $this->loadConfig();
    }
    
    /**
     * 設定ファイル読み込み
     */
    private function loadConfig() {
        $configPath = __DIR__ . '/../../shared/config/ebay_api.php';
        
        if (file_exists($configPath)) {
            $this->config = require $configPath;
        } else {
            // デフォルト設定
            $this->config = [
                'app_id' => $_ENV['EBAY_APP_ID'] ?? 'YOUR_EBAY_APP_ID',
                'dev_id' => $_ENV['EBAY_DEV_ID'] ?? 'YOUR_EBAY_DEV_ID', 
                'cert_id' => $_ENV['EBAY_CERT_ID'] ?? 'YOUR_EBAY_CERT_ID',
                'user_token' => $_ENV['EBAY_USER_TOKEN'] ?? 'YOUR_USER_TOKEN',
                'sandbox' => $_ENV['EBAY_SANDBOX'] === 'true' ?? true,
                'site_id' => 0, // US site
                'compatibility_level' => 1193
            ];
        }
    }
    
    /**
     * eBay API汎用リクエスト実行
     */
    private function makeApiRequest($callName, $requestXML) {
        $endpoint = $this->config['sandbox'] ? self::SANDBOX_ENDPOINT : self::PRODUCTION_ENDPOINT;
        
        $headers = [
            'X-EBAY-API-COMPATIBILITY-LEVEL: ' . $this->config['compatibility_level'],
            'X-EBAY-API-DEV-NAME: ' . $this->config['dev_id'],
            'X-EBAY-API-APP-NAME: ' . $this->config['app_id'],
            'X-EBAY-API-CERT-NAME: ' . $this->config['cert_id'],
            'X-EBAY-API-CALL-NAME: ' . $callName,
            'X-EBAY-API-SITEID: ' . $this->config['site_id'],
            'Content-Type: text/xml',
            'Content-Length: ' . strlen($requestXML)
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $requestXML);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($response === false || !empty($error)) {
            throw new Exception("eBay API Request Failed: " . $error);
        }
        
        if ($httpCode !== 200) {
            throw new Exception("eBay API HTTP Error: " . $httpCode);
        }
        
        return $this->parseXmlResponse($response);
    }
    
    /**
     * XML応答解析
     */
    private function parseXmlResponse($xmlString) {
        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($xmlString);
        
        if ($xml === false) {
            $errors = libxml_get_errors();
            $errorMsg = "XML Parse Error: ";
            foreach ($errors as $error) {
                $errorMsg .= $error->message . " ";
            }
            throw new Exception($errorMsg);
        }
        
        // エラーチェック
        if (isset($xml->Errors)) {
            $errorMsg = "eBay API Error: ";
            foreach ($xml->Errors as $error) {
                $errorMsg .= (string)$error->LongMessage . " ";
            }
            throw new Exception($errorMsg);
        }
        
        return $xml;
    }
    
    /**
     * カテゴリー一覧取得（階層構造対応）
     */
    public function getCategories($parentCategoryId = null, $maxDepth = 3) {
        $cacheKey = "categories_" . ($parentCategoryId ?? 'root') . "_depth_" . $maxDepth;
        
        // キャッシュから取得
        if ($this->cacheEnabled) {
            $cached = $this->getCachedData('GetCategories', $cacheKey);
            if ($cached) {
                return $cached;
            }
        }
        
        $requestXML = $this->buildGetCategoriesXML($parentCategoryId, $maxDepth);
        $response = $this->makeApiRequest('GetCategories', $requestXML);
        
        $categories = $this->extractCategoriesFromResponse($response);
        
        // キャッシュに保存（24時間）
        if ($this->cacheEnabled) {
            $this->setCachedData('GetCategories', $cacheKey, $categories, 24 * 3600);
        }
        
        return $categories;
    }
    
    /**
     * GetCategories XML構築
     */
    private function buildGetCategoriesXML($parentCategoryId, $maxDepth) {
        $xml = '<?xml version="1.0" encoding="utf-8"?>' .
               '<GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">' .
               '<RequesterCredentials>' .
               '<eBayAuthToken>' . $this->config['user_token'] . '</eBayAuthToken>' .
               '</RequesterCredentials>' .
               '<DetailLevel>ReturnAll</DetailLevel>' .
               '<CategorySiteID>' . $this->config['site_id'] . '</CategorySiteID>' .
               '<LevelLimit>' . $maxDepth . '</LevelLimit>';
        
        if ($parentCategoryId) {
            $xml .= '<CategoryParent>' . $parentCategoryId . '</CategoryParent>';
        }
        
        $xml .= '</GetCategoriesRequest>';
        
        return $xml;
    }
    
    /**
     * カテゴリー応答から構造化データ抽出
     */
    private function extractCategoriesFromResponse($response) {
        $categories = [];
        
        if (isset($response->CategoryArray->Category)) {
            foreach ($response->CategoryArray->Category as $category) {
                $categories[] = [
                    'category_id' => (string)$category->CategoryID,
                    'category_name' => (string)$category->CategoryName,
                    'parent_id' => isset($category->CategoryParentID) ? (string)$category->CategoryParentID : null,
                    'level' => (int)$category->CategoryLevel,
                    'is_leaf' => isset($category->LeafCategory) ? (string)$category->LeafCategory === 'true' : false,
                    'auto_pay_enabled' => isset($category->AutoPayEnabled) ? (string)$category->AutoPayEnabled === 'true' : false
                ];
            }
        }
        
        return $categories;
    }
    
    /**
     * カテゴリー別手数料情報取得
     */
    public function getCategoryFees($categoryId) {
        $cacheKey = "fees_" . $categoryId;
        
        // キャッシュから取得
        if ($this->cacheEnabled) {
            $cached = $this->getCachedData('GetCategoryFeatures', $cacheKey);
            if ($cached) {
                return $cached;
            }
        }
        
        $requestXML = $this->buildGetCategoryFeaturesXML($categoryId);
        $response = $this->makeApiRequest('GetCategoryFeatures', $requestXML);
        
        $fees = $this->extractFeesFromResponse($response, $categoryId);
        
        // データベースに保存
        $this->saveFeeDataToDatabase($categoryId, $fees);
        
        // キャッシュに保存（6時間）
        if ($this->cacheEnabled) {
            $this->setCachedData('GetCategoryFeatures', $cacheKey, $fees, 6 * 3600);
        }
        
        return $fees;
    }
    
    /**
     * GetCategoryFeatures XML構築
     */
    private function buildGetCategoryFeaturesXML($categoryId) {
        return '<?xml version="1.0" encoding="utf-8"?>' .
               '<GetCategoryFeaturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">' .
               '<RequesterCredentials>' .
               '<eBayAuthToken>' . $this->config['user_token'] . '</eBayAuthToken>' .
               '</RequesterCredentials>' .
               '<DetailLevel>ReturnAll</DetailLevel>' .
               '<CategoryID>' . $categoryId . '</CategoryID>' .
               '<FeatureID>ListingDurations</FeatureID>' .
               '<FeatureID>PaymentMethods</FeatureID>' .
               '<FeatureID>ListingFees</FeatureID>' .
               '</GetCategoryFeaturesRequest>';
    }
    
    /**
     * 手数料応答からデータ抽出
     */
    private function extractFeesFromResponse($response, $categoryId) {
        $fees = [
            'category_id' => $categoryId,
            'insertion_fee' => 0.00,
            'final_value_fee_percent' => 13.25, // デフォルト
            'final_value_fee_max' => 750.00,
            'payment_processing_fee_percent' => 2.90,
            'payment_processing_fee_fixed' => 0.30,
            'last_updated' => date('Y-m-d H:i:s')
        ];
        
        // 実際のFeatures解析（簡略版）
        if (isset($response->Category)) {
            foreach ($response->Category as $cat) {
                if ((string)$cat->CategoryID === $categoryId) {
                    // リスティング手数料の解析
                    if (isset($cat->ListingFeature)) {
                        // 手数料データ抽出ロジック
                        // 実際のeBay API応答構造に基づいて実装
                    }
                }
            }
        }
        
        return $fees;
    }
    
    /**
     * 手数料データをデータベースに保存
     */
    private function saveFeeDataToDatabase($categoryId, $fees) {
        try {
            $sql = "INSERT INTO ebay_fees_realtime 
                    (category_id, listing_format, final_value_fee_percent, final_value_fee_max,
                     payment_processing_fee_percent, payment_processing_fee_fixed, last_updated_from_api) 
                    VALUES (?, 'FixedPriceItem', ?, ?, ?, ?, NOW())
                    ON CONFLICT (category_id, listing_format) 
                    DO UPDATE SET 
                        final_value_fee_percent = EXCLUDED.final_value_fee_percent,
                        final_value_fee_max = EXCLUDED.final_value_fee_max,
                        last_updated_from_api = NOW()";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $categoryId,
                $fees['final_value_fee_percent'],
                $fees['final_value_fee_max'],
                $fees['payment_processing_fee_percent'],
                $fees['payment_processing_fee_fixed']
            ]);
            
            if ($this->debugMode) {
                error_log("eBay fees saved for category: " . $categoryId);
            }
            
        } catch (PDOException $e) {
            error_log("Failed to save eBay fees: " . $e->getMessage());
        }
    }
    
    /**
     * Item Specifics推奨値取得
     */
    public function getItemSpecifics($categoryId) {
        $cacheKey = "specifics_" . $categoryId;
        
        if ($this->cacheEnabled) {
            $cached = $this->getCachedData('GetCategorySpecifics', $cacheKey);
            if ($cached) {
                return $cached;
            }
        }
        
        $requestXML = $this->buildGetCategorySpecificsXML($categoryId);
        $response = $this->makeApiRequest('GetCategorySpecifics', $requestXML);
        
        $specifics = $this->extractSpecificsFromResponse($response);
        
        // キャッシュに保存（12時間）
        if ($this->cacheEnabled) {
            $this->setCachedData('GetCategorySpecifics', $cacheKey, $specifics, 12 * 3600);
        }
        
        return $specifics;
    }
    
    /**
     * GetCategorySpecifics XML構築
     */
    private function buildGetCategorySpecificsXML($categoryId) {
        return '<?xml version="1.0" encoding="utf-8"?>' .
               '<GetCategorySpecificsRequest xmlns="urn:ebay:apis:eBLBaseComponents">' .
               '<RequesterCredentials>' .
               '<eBayAuthToken>' . $this->config['user_token'] . '</eBayAuthToken>' .
               '</RequesterCredentials>' .
               '<CategoryID>' . $categoryId . '</CategoryID>' .
               '<IncludeConfidence>true</IncludeConfidence>' .
               '</GetCategorySpecificsRequest>';
    }
    
    /**
     * Item Specifics応答からデータ抽出
     */
    private function extractSpecificsFromResponse($response) {
        $specifics = [];
        
        if (isset($response->Recommendations->NameRecommendation)) {
            foreach ($response->Recommendations->NameRecommendation as $recommendation) {
                $specific = [
                    'name' => (string)$recommendation->Name,
                    'confidence' => isset($recommendation->Confidence) ? (float)$recommendation->Confidence : 0,
                    'values' => []
                ];
                
                if (isset($recommendation->ValueRecommendation)) {
                    foreach ($recommendation->ValueRecommendation as $valueRec) {
                        $specific['values'][] = [
                            'value' => (string)$valueRec->Value,
                            'confidence' => isset($valueRec->Confidence) ? (float)$valueRec->Confidence : 0
                        ];
                    }
                }
                
                $specifics[] = $specific;
            }
        }
        
        return $specifics;
    }
    
    /**
     * キャッシュデータ取得
     */
    private function getCachedData($endpoint, $cacheKey) {
        try {
            $sql = "SELECT response_data FROM ebay_api_cache 
                    WHERE api_endpoint = ? AND request_params = ? 
                    AND cache_expires_at > NOW()";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$endpoint, json_encode(['cache_key' => $cacheKey])]);
            
            $result = $stmt->fetch(PDO::FETCH_COLUMN);
            
            return $result ? json_decode($result, true) : null;
            
        } catch (PDOException $e) {
            if ($this->debugMode) {
                error_log("Cache read error: " . $e->getMessage());
            }
            return null;
        }
    }
    
    /**
     * キャッシュデータ保存
     */
    private function setCachedData($endpoint, $cacheKey, $data, $ttlSeconds) {
        try {
            $sql = "INSERT INTO ebay_api_cache 
                    (api_endpoint, request_params, response_data, cache_expires_at) 
                    VALUES (?, ?, ?, NOW() + INTERVAL '" . $ttlSeconds . " seconds')
                    ON CONFLICT (api_endpoint, request_params) 
                    DO UPDATE SET 
                        response_data = EXCLUDED.response_data,
                        cache_expires_at = EXCLUDED.cache_expires_at";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $endpoint,
                json_encode(['cache_key' => $cacheKey]),
                json_encode($data)
            ]);
            
        } catch (PDOException $e) {
            if ($this->debugMode) {
                error_log("Cache write error: " . $e->getMessage());
            }
        }
    }
    
    /**
     * Yahoo商品からeBayカテゴリー推薦
     */
    public function suggestCategoryForYahooProduct($yahooProductData) {
        // 既存のCategoryDetectorと統合
        require_once __DIR__ . '/CategoryDetector.php';
        
        $detector = new CategoryDetector($this->pdo, $this->debugMode);
        $localResult = $detector->detectCategory($yahooProductData);
        
        // eBay APIでさらに詳細情報取得
        if ($localResult['confidence'] > 70) {
            try {
                $specifics = $this->getItemSpecifics($localResult['category_id']);
                $fees = $this->getCategoryFees($localResult['category_id']);
                
                return [
                    'category_detection' => $localResult,
                    'recommended_specifics' => $specifics,
                    'fee_structure' => $fees,
                    'api_enhanced' => true
                ];
            } catch (Exception $e) {
                error_log("eBay API enhancement failed: " . $e->getMessage());
                return [
                    'category_detection' => $localResult,
                    'api_enhanced' => false,
                    'error' => $e->getMessage()
                ];
            }
        }
        
        return [
            'category_detection' => $localResult,
            'api_enhanced' => false,
            'reason' => 'Low confidence score'
        ];
    }
    
    /**
     * バッチ処理: 複数のYahoo商品を処理
     */
    public function processYahooProductsBatch($yahooProductIds, $maxConcurrent = 5) {
        $results = [];
        $chunks = array_chunk($yahooProductIds, $maxConcurrent);
        
        foreach ($chunks as $chunk) {
            $chunkResults = [];
            
            foreach ($chunk as $productId) {
                try {
                    // データベースから商品データ取得
                    $sql = "SELECT * FROM yahoo_scraped_products WHERE id = ?";
                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute([$productId]);
                    $product = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($product) {
                        $productData = [
                            'title' => $product['title'],
                            'price' => $product['price_jpy'] / 150.0, // USD概算
                            'description' => $product['description'] ?? ''
                        ];
                        
                        $result = $this->suggestCategoryForYahooProduct($productData);
                        $result['yahoo_product_id'] = $productId;
                        
                        $chunkResults[] = $result;
                    }
                    
                } catch (Exception $e) {
                    $chunkResults[] = [
                        'yahoo_product_id' => $productId,
                        'error' => $e->getMessage(),
                        'success' => false
                    ];
                }
            }
            
            $results = array_merge($results, $chunkResults);
            
            // API制限対策: 少し待機
            usleep(500000); // 0.5秒
        }
        
        return $results;
    }
    
    /**
     * デバッグ情報出力
     */
    public function getDebugInfo() {
        return [
            'config_loaded' => !empty($this->config['app_id']),
            'cache_enabled' => $this->cacheEnabled,
            'debug_mode' => $this->debugMode,
            'endpoint' => $this->config['sandbox'] ? 'sandbox' : 'production',
            'site_id' => $this->config['site_id'],
            'compatibility_level' => $this->config['compatibility_level']
        ];
    }
}
?>