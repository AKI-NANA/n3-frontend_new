<?php
/**
 * eBay API連携クラス
 * Trading API を使用した出品・管理機能
 */

require_once __DIR__ . '/../../03_approval/api/UnifiedLogger.php';

class EbayAPIClient {
    private $config;
    private $logger;
    private $sandbox;
    private $headers;
    
    // eBay API エンドポイント
    private const SANDBOX_ENDPOINT = 'https://api.sandbox.ebay.com/ws/api.dll';
    private const PRODUCTION_ENDPOINT = 'https://api.ebay.com/ws/api.dll';
    
    // API制限
    private const DAILY_CALL_LIMIT = 5000;
    private const HOURLY_CALL_LIMIT = 200;
    
    public function __construct($config = []) {
        $this->config = array_merge([
            'app_id' => $_ENV['EBAY_APP_ID'] ?? '',
            'dev_id' => $_ENV['EBAY_DEV_ID'] ?? '',
            'cert_id' => $_ENV['EBAY_CERT_ID'] ?? '',
            'token' => $_ENV['EBAY_TOKEN'] ?? '',
            'site_id' => 0, // US site
            'sandbox' => true,
            'timeout' => 30,
            'retry_attempts' => 3
        ], $config);
        
        $this->sandbox = $this->config['sandbox'];
        $this->logger = getLogger('ebay_api');
        $this->setupHeaders();
        
        $this->logger->info('eBay API client initialized', [
            'sandbox_mode' => $this->sandbox,
            'site_id' => $this->config['site_id']
        ]);
    }
    
    /**
     * HTTPヘッダー設定
     */
    private function setupHeaders() {
        $this->headers = [
            'X-EBAY-API-COMPATIBILITY-LEVEL: 967',
            'X-EBAY-API-DEV-NAME: ' . $this->config['dev_id'],
            'X-EBAY-API-APP-NAME: ' . $this->config['app_id'],
            'X-EBAY-API-CERT-NAME: ' . $this->config['cert_id'],
            'X-EBAY-API-SITEID: ' . $this->config['site_id'],
            'Content-Type: text/xml; charset=utf-8'
        ];
    }
    
    /**
     * 商品出品
     */
    public function addItem($itemData) {
        $startTime = microtime(true);
        
        try {
            // API制限チェック
            if (!$this->checkApiLimits()) {
                throw new Exception('API call limit exceeded');
            }
            
            // リクエストXML構築
            $xml = $this->buildAddItemXML($itemData);
            
            // API呼び出し
            $response = $this->callAPI('AddItem', $xml);
            
            // レスポンス解析
            $result = $this->parseAddItemResponse($response);
            
            $this->logger->logPerformance('eBay AddItem', $startTime, [
                'item_title' => $itemData['title'] ?? 'unknown',
                'success' => $result['success'],
                'item_id' => $result['item_id'] ?? null
            ]);
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error('eBay AddItem failed', [
                'error' => $e->getMessage(),
                'item_data' => $itemData,
                'execution_time' => (microtime(true) - $startTime) * 1000
            ]);
            
            throw $e;
        }
    }
    
    /**
     * 商品情報取得
     */
    public function getItem($itemId) {
        try {
            if (!$this->checkApiLimits()) {
                throw new Exception('API call limit exceeded');
            }
            
            $xml = $this->buildGetItemXML($itemId);
            $response = $this->callAPI('GetItem', $xml);
            
            return $this->parseGetItemResponse($response);
            
        } catch (Exception $e) {
            $this->logger->error('eBay GetItem failed', [
                'item_id' => $itemId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * 商品価格変更 (ReviseItem)
     * 在庫管理システムからの自動価格更新用
     */
    public function reviseItemPrice($itemId, $newPrice) {
        $startTime = microtime(true);
        
        try {
            if (!$this->checkApiLimits()) {
                throw new Exception('API call limit exceeded');
            }
            
            $this->logger->info('eBay price revision started', [
                'item_id' => $itemId,
                'new_price' => $newPrice
            ]);
            
            // ReviseItem XMLリクエスト構築
            $xml = $this->buildReviseItemPriceXML($itemId, $newPrice);
            
            // API呼び出し
            $response = $this->callAPI('ReviseItem', $xml);
            
            // レスポンス解析
            $result = $this->parseReviseItemResponse($response);
            
            $this->logger->logPerformance('eBay ReviseItemPrice', $startTime, [
                'item_id' => $itemId,
                'new_price' => $newPrice,
                'success' => $result['success']
            ]);
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error('eBay ReviseItemPrice failed', [
                'item_id' => $itemId,
                'new_price' => $newPrice,
                'error' => $e->getMessage(),
                'execution_time' => (microtime(true) - $startTime) * 1000
            ]);
            
            throw $e;
        }
    }
    
    /**
     * 商品終了（出品取り消し）
     */
    public function endItem($itemId, $reason = 'NotAvailable') {
        try {
            if (!$this->checkApiLimits()) {
                throw new Exception('API call limit exceeded');
            }
            
            $xml = $this->buildEndItemXML($itemId, $reason);
            $response = $this->callAPI('EndItem', $xml);
            
            $result = $this->parseEndItemResponse($response);
            
            $this->logger->info('eBay item ended', [
                'item_id' => $itemId,
                'reason' => $reason,
                'success' => $result['success']
            ]);
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error('eBay EndItem failed', [
                'item_id' => $itemId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * マイアイテム一覧取得
     */
    public function getMyeBaySelling($pageNumber = 1, $entriesPerPage = 25) {
        try {
            if (!$this->checkApiLimits()) {
                throw new Exception('API call limit exceeded');
            }
            
            $xml = $this->buildGetMyeBaySellingXML($pageNumber, $entriesPerPage);
            $response = $this->callAPI('GetMyeBaySelling', $xml);
            
            return $this->parseGetMyeBaySellingResponse($response);
            
        } catch (Exception $e) {
            $this->logger->error('eBay GetMyeBaySelling failed', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * カテゴリー情報取得
     */
    public function getCategories($parentCategoryId = null) {
        try {
            if (!$this->checkApiLimits()) {
                throw new Exception('API call limit exceeded');
            }
            
            $xml = $this->buildGetCategoriesXML($parentCategoryId);
            $response = $this->callAPI('GetCategories', $xml);
            
            return $this->parseGetCategoriesResponse($response);
            
        } catch (Exception $e) {
            $this->logger->error('eBay GetCategories failed', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * AddItem XMLリクエスト構築
     */
    private function buildAddItemXML($itemData) {
        $xml = '<?xml version="1.0" encoding="utf-8"?>
        <AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
            <RequesterCredentials>
                <eBayAuthToken>' . htmlspecialchars($this->config['token']) . '</eBayAuthToken>
            </RequesterCredentials>
            <Item>
                <Title>' . htmlspecialchars($itemData['title']) . '</Title>
                <Description><![CDATA[' . $itemData['description'] . ']]></Description>
                <PrimaryCategory>
                    <CategoryID>' . $itemData['category_id'] . '</CategoryID>
                </PrimaryCategory>
                <StartPrice>' . $itemData['price'] . '</StartPrice>
                <CategoryMappingAllowed>true</CategoryMappingAllowed>
                <Country>US</Country>
                <Currency>USD</Currency>
                <DispatchTimeMax>3</DispatchTimeMax>
                <ListingDuration>' . ($itemData['duration'] ?? 'Days_7') . '</ListingDuration>
                <ListingType>' . ($itemData['listing_type'] ?? 'FixedPriceItem') . '</ListingType>
                <PaymentMethods>PayPal</PaymentMethods>
                <PaymentMethods>VisaMC</PaymentMethods>
                <PayPalEmailAddress>' . ($itemData['paypal_email'] ?? 'seller@example.com') . '</PayPalEmailAddress>
                <PictureDetails>';
        
        // 画像追加
        if (!empty($itemData['images'])) {
            foreach ($itemData['images'] as $imageUrl) {
                $xml .= '<PictureURL>' . htmlspecialchars($imageUrl) . '</PictureURL>';
            }
        }
        
        $xml .= '    <GalleryType>Gallery</GalleryType>
                </PictureDetails>
                <PostalCode>95125</PostalCode>
                <Quantity>' . ($itemData['quantity'] ?? 1) . '</Quantity>
                <ReturnPolicy>
                    <ReturnsAcceptedOption>' . ($itemData['returns_accepted'] ? 'ReturnsAccepted' : 'ReturnsNotAccepted') . '</ReturnsAcceptedOption>';
        
        if ($itemData['returns_accepted']) {
            $xml .= '<RefundOption>MoneyBack</RefundOption>
                    <ReturnsWithinOption>Days_30</ReturnsWithinOption>
                    <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>';
        }
        
        $xml .= '    </ReturnPolicy>
                <ShippingDetails>
                    <ShippingType>Flat</ShippingType>
                    <ShippingServiceOptions>
                        <ShippingServicePriority>1</ShippingServicePriority>
                        <ShippingService>USPSMedia</ShippingService>
                        <ShippingServiceCost>' . ($itemData['shipping_cost'] ?? '0.00') . '</ShippingServiceCost>
                    </ShippingServiceOptions>
                </ShippingDetails>
                <Site>US</Site>
                <ConditionID>' . ($itemData['condition_id'] ?? '1000') . '</ConditionID>
            </Item>
        </AddItemRequest>';
        
        return $xml;
    }
    
    /**
     * GetItem XMLリクエスト構築
     */
    private function buildGetItemXML($itemId) {
        return '<?xml version="1.0" encoding="utf-8"?>
        <GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
            <RequesterCredentials>
                <eBayAuthToken>' . htmlspecialchars($this->config['token']) . '</eBayAuthToken>
            </RequesterCredentials>
            <ItemID>' . htmlspecialchars($itemId) . '</ItemID>
            <DetailLevel>ReturnAll</DetailLevel>
        </GetItemRequest>';
    }
    
    /**
     * ReviseItemPrice XMLリクエスト構築
     */
    private function buildReviseItemPriceXML($itemId, $newPrice) {
        return '<?xml version="1.0" encoding="utf-8"?>
        <ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
            <RequesterCredentials>
                <eBayAuthToken>' . htmlspecialchars($this->config['token']) . '</eBayAuthToken>
            </RequesterCredentials>
            <Item>
                <ItemID>' . htmlspecialchars($itemId) . '</ItemID>
                <StartPrice>' . number_format($newPrice, 2, '.', '') . '</StartPrice>
            </Item>
        </ReviseItemRequest>';
    }
    
    /**
     * EndItem XMLリクエスト構築
     */
    private function buildEndItemXML($itemId, $reason) {
        return '<?xml version="1.0" encoding="utf-8"?>
        <EndItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
            <RequesterCredentials>
                <eBayAuthToken>' . htmlspecialchars($this->config['token']) . '</eBayAuthToken>
            </RequesterCredentials>
            <ItemID>' . htmlspecialchars($itemId) . '</ItemID>
            <EndingReason>' . htmlspecialchars($reason) . '</EndingReason>
        </EndItemRequest>';
    }
    
    /**
     * GetMyeBaySelling XMLリクエスト構築
     */
    private function buildGetMyeBaySellingXML($pageNumber, $entriesPerPage) {
        return '<?xml version="1.0" encoding="utf-8"?>
        <GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
            <RequesterCredentials>
                <eBayAuthToken>' . htmlspecialchars($this->config['token']) . '</eBayAuthToken>
            </RequesterCredentials>
            <ActiveList>
                <Include>true</Include>
                <Pagination>
                    <EntriesPerPage>' . $entriesPerPage . '</EntriesPerPage>
                    <PageNumber>' . $pageNumber . '</PageNumber>
                </Pagination>
            </ActiveList>
            <DetailLevel>ReturnSummary</DetailLevel>
        </GetMyeBaySellingRequest>';
    }
    
    /**
     * GetCategories XMLリクエスト構築
     */
    private function buildGetCategoriesXML($parentCategoryId) {
        $xml = '<?xml version="1.0" encoding="utf-8"?>
        <GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
            <RequesterCredentials>
                <eBayAuthToken>' . htmlspecialchars($this->config['token']) . '</eBayAuthToken>
            </RequesterCredentials>
            <DetailLevel>ReturnAll</DetailLevel>
            <CategorySiteID>' . $this->config['site_id'] . '</CategorySiteID>';
        
        if ($parentCategoryId) {
            $xml .= '<CategoryParent>' . $parentCategoryId . '</CategoryParent>';
        }
        
        $xml .= '</GetCategoriesRequest>';
        return $xml;
    }
    
    /**
     * eBay API呼び出し
     */
    private function callAPI($verb, $xmlRequest) {
        $endpoint = $this->sandbox ? self::SANDBOX_ENDPOINT : self::PRODUCTION_ENDPOINT;
        
        $headers = array_merge($this->headers, [
            'X-EBAY-API-CALL-NAME: ' . $verb
        ]);
        
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $endpoint,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xmlRequest,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->config['timeout'],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_USERAGENT => 'NAGANO-3 eBay Client/1.0'
        ]);
        
        $startTime = microtime(true);
        $response = curl_exec($curl);
        $executionTime = (microtime(true) - $startTime) * 1000;
        
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        
        // API使用量更新
        $this->updateApiUsage();
        
        $this->logger->info('eBay API call completed', [
            'verb' => $verb,
            'http_code' => $httpCode,
            'execution_time' => $executionTime,
            'response_size' => strlen($response)
        ]);
        
        if ($error) {
            throw new Exception("cURL error: $error");
        }
        
        if ($httpCode !== 200) {
            throw new Exception("HTTP error: $httpCode");
        }
        
        if (!$response) {
            throw new Exception("Empty response from eBay API");
        }
        
        return $response;
    }
    
    /**
     * AddItem レスポンス解析
     */
    private function parseAddItemResponse($xmlResponse) {
        $xml = simplexml_load_string($xmlResponse);
        
        if ($xml === false) {
            throw new Exception('Invalid XML response');
        }
        
        $ack = (string)$xml->Ack;
        $success = in_array($ack, ['Success', 'Warning']);
        
        $result = [
            'success' => $success,
            'ack' => $ack,
            'item_id' => $success ? (string)$xml->ItemID : null,
            'fees' => []
        ];
        
        // エラー処理
        if (!$success && isset($xml->Errors)) {
            $errors = [];
            foreach ($xml->Errors as $error) {
                $errors[] = [
                    'severity' => (string)$error->SeverityCode,
                    'code' => (string)$error->ErrorCode,
                    'message' => (string)$error->LongMessage
                ];
            }
            $result['errors'] = $errors;
            throw new Exception('eBay API error: ' . $errors[0]['message']);
        }
        
        // 警告処理
        if ($ack === 'Warning' && isset($xml->Errors)) {
            $warnings = [];
            foreach ($xml->Errors as $error) {
                if ((string)$error->SeverityCode === 'Warning') {
                    $warnings[] = [
                        'code' => (string)$error->ErrorCode,
                        'message' => (string)$error->LongMessage
                    ];
                }
            }
            $result['warnings'] = $warnings;
        }
        
        // 手数料情報
        if (isset($xml->Fees->Fee)) {
            foreach ($xml->Fees->Fee as $fee) {
                $result['fees'][] = [
                    'name' => (string)$fee->Name,
                    'amount' => (float)$fee->Fee
                ];
            }
        }
        
        return $result;
    }
    
    /**
     * GetItem レスポンス解析
     */
    private function parseGetItemResponse($xmlResponse) {
        $xml = simplexml_load_string($xmlResponse);
        
        if ($xml === false) {
            throw new Exception('Invalid XML response');
        }
        
        if ((string)$xml->Ack !== 'Success') {
            throw new Exception('eBay API error: ' . (string)$xml->Errors->LongMessage);
        }
        
        $item = $xml->Item;
        
        return [
            'item_id' => (string)$item->ItemID,
            'title' => (string)$item->Title,
            'description' => (string)$item->Description,
            'current_price' => (float)$item->SellingStatus->CurrentPrice,
            'quantity_sold' => (int)$item->SellingStatus->QuantitySold,
            'quantity_available' => (int)$item->Quantity,
            'listing_status' => (string)$item->SellingStatus->ListingStatus,
            'time_left' => (string)$item->TimeLeft,
            'view_count' => (int)$item->HitCount,
            'category_id' => (string)$item->PrimaryCategory->CategoryID,
            'condition_id' => (string)$item->ConditionID,
            'listing_type' => (string)$item->ListingType
        ];
    }
    
    /**
     * ReviseItem レスポンス解析
     */
    private function parseReviseItemResponse($xmlResponse) {
        $xml = simplexml_load_string($xmlResponse);
        
        if ($xml === false) {
            throw new Exception('Invalid XML response');
        }
        
        $ack = (string)$xml->Ack;
        $success = in_array($ack, ['Success', 'Warning']);
        
        $result = [
            'success' => $success,
            'ack' => $ack,
            'item_id' => $success ? (string)$xml->ItemID : null,
            'fees' => []
        ];
        
        // エラー処理
        if (!$success && isset($xml->Errors)) {
            $errors = [];
            foreach ($xml->Errors as $error) {
                $errors[] = [
                    'severity' => (string)$error->SeverityCode,
                    'code' => (string)$error->ErrorCode,
                    'message' => (string)$error->LongMessage
                ];
            }
            $result['errors'] = $errors;
            throw new Exception('eBay API error: ' . $errors[0]['message']);
        }
        
        // 警告処理
        if ($ack === 'Warning' && isset($xml->Errors)) {
            $warnings = [];
            foreach ($xml->Errors as $error) {
                if ((string)$error->SeverityCode === 'Warning') {
                    $warnings[] = [
                        'code' => (string)$error->ErrorCode,
                        'message' => (string)$error->LongMessage
                    ];
                }
            }
            $result['warnings'] = $warnings;
        }
        
        // 手数料情報
        if (isset($xml->Fees->Fee)) {
            foreach ($xml->Fees->Fee as $fee) {
                $result['fees'][] = [
                    'name' => (string)$fee->Name,
                    'amount' => (float)$fee->Fee
                ];
            }
        }
        
        return $result;
    }
    
    /**
     * EndItem レスポンス解析
     */
    private function parseEndItemResponse($xmlResponse) {
        $xml = simplexml_load_string($xmlResponse);
        
        if ($xml === false) {
            throw new Exception('Invalid XML response');
        }
        
        $success = (string)$xml->Ack === 'Success';
        
        $result = [
            'success' => $success,
            'ack' => (string)$xml->Ack
        ];
        
        if (!$success && isset($xml->Errors)) {
            $result['error'] = (string)$xml->Errors->LongMessage;
        }
        
        return $result;
    }
    
    /**
     * GetMyeBaySelling レスポンス解析
     */
    private function parseGetMyeBaySellingResponse($xmlResponse) {
        $xml = simplexml_load_string($xmlResponse);
        
        if ($xml === false) {
            throw new Exception('Invalid XML response');
        }
        
        if ((string)$xml->Ack !== 'Success') {
            throw new Exception('eBay API error: ' . (string)$xml->Errors->LongMessage);
        }
        
        $items = [];
        
        if (isset($xml->ActiveList->ItemArray->Item)) {
            foreach ($xml->ActiveList->ItemArray->Item as $item) {
                $items[] = [
                    'item_id' => (string)$item->ItemID,
                    'title' => (string)$item->Title,
                    'current_price' => (float)$item->SellingStatus->CurrentPrice,
                    'quantity_sold' => (int)$item->SellingStatus->QuantitySold,
                    'listing_status' => (string)$item->SellingStatus->ListingStatus,
                    'time_left' => (string)$item->TimeLeft,
                    'listing_type' => (string)$item->ListingType
                ];
            }
        }
        
        return [
            'items' => $items,
            'total_items' => (int)$xml->ActiveList->PaginationResult->TotalNumberOfEntries,
            'page_number' => (int)$xml->ActiveList->PaginationResult->PageNumber,
            'total_pages' => (int)$xml->ActiveList->PaginationResult->TotalNumberOfPages
        ];
    }
    
    /**
     * GetCategories レスポンス解析
     */
    private function parseGetCategoriesResponse($xmlResponse) {
        $xml = simplexml_load_string($xmlResponse);
        
        if ($xml === false) {
            throw new Exception('Invalid XML response');
        }
        
        if ((string)$xml->Ack !== 'Success') {
            throw new Exception('eBay API error: ' . (string)$xml->Errors->LongMessage);
        }
        
        $categories = [];
        
        if (isset($xml->CategoryArray->Category)) {
            foreach ($xml->CategoryArray->Category as $category) {
                $categories[] = [
                    'category_id' => (string)$category->CategoryID,
                    'category_name' => (string)$category->CategoryName,
                    'category_level' => (int)$category->CategoryLevel,
                    'parent_id' => (string)$category->CategoryParentID,
                    'leaf_category' => (string)$category->LeafCategory === 'true'
                ];
            }
        }
        
        return $categories;
    }
    
    /**
     * API制限チェック
     */
    private function checkApiLimits() {
        try {
            $pdo = getDatabaseConnection();
            
            // 日次制限チェック
            $stmt = $pdo->prepare("
                SELECT current_usage, max_usage 
                FROM ebay_api_limits 
                WHERE api_type = 'trading' AND limit_type = 'daily'
            ");
            $stmt->execute();
            $daily = $stmt->fetch();
            
            if ($daily && $daily['current_usage'] >= $daily['max_usage']) {
                return false;
            }
            
            // 時間制限チェック
            $stmt = $pdo->prepare("
                SELECT current_usage, max_usage 
                FROM ebay_api_limits 
                WHERE api_type = 'trading' AND limit_type = 'hourly'
            ");
            $stmt->execute();
            $hourly = $stmt->fetch();
            
            if ($hourly && $hourly['current_usage'] >= $hourly['max_usage']) {
                return false;
            }
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error('API limit check failed', [
                'error' => $e->getMessage()
            ]);
            return true; // エラー時は制限を無視
        }
    }
    
    /**
     * API使用量更新
     */
    private function updateApiUsage() {
        try {
            $pdo = getDatabaseConnection();
            
            // 日次使用量更新
            $stmt = $pdo->prepare("
                UPDATE ebay_api_limits 
                SET current_usage = current_usage + 1, 
                    last_updated = NOW()
                WHERE api_type = 'trading' AND limit_type = 'daily'
            ");
            $stmt->execute();
            
            // 時間使用量更新
            $stmt = $pdo->prepare("
                UPDATE ebay_api_limits 
                SET current_usage = current_usage + 1,
                    last_updated = NOW()
                WHERE api_type = 'trading' AND limit_type = 'hourly'
            ");
            $stmt->execute();
            
        } catch (Exception $e) {
            $this->logger->error('API usage update failed', [
                'error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * テスト用の疑似出品
     */
    public function mockAddItem($itemData) {
        if (!$this->sandbox) {
            throw new Exception('Mock functionality only available in sandbox mode');
        }
        
        $mockItemId = 'MOCK_' . uniqid();
        
        $this->logger->info('Mock item listing', [
            'mock_item_id' => $mockItemId,
            'title' => $itemData['title']
        ]);
        
        // 模擬的な処理時間
        usleep(rand(500000, 2000000)); // 0.5-2秒
        
        return [
            'success' => true,
            'ack' => 'Success',
            'item_id' => $mockItemId,
            'fees' => [
                ['name' => 'InsertionFee', 'amount' => 0.35],
                ['name' => 'FinalValueFee', 'amount' => 0.00]
            ]
        ];
    }
}

/**
 * eBay API インスタンス取得
 */
function getEbayAPI($sandbox = true) {
    static $instances = [];
    $key = $sandbox ? 'sandbox' : 'production';
    
    if (!isset($instances[$key])) {
        $instances[$key] = new EbayAPIClient(['sandbox' => $sandbox]);
    }
    
    return $instances[$key];
}
