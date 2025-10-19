<?php
/**
 * eBay API統合クラス
 * Trading API v1.0 完全対応・一括出品・レート制限管理
 * テスト/本番環境対応・エラーハンドリング・プログレス通知
 */

class EbayApiIntegration {
    private $credentials;
    private $sandbox;
    private $apiUrl;
    private $siteId;
    private $compatLevel;
    private $rateLimitDelay;
    private $maxRetries;
    
    public function __construct($config = []) {
        $this->sandbox = $config['sandbox'] ?? false;
        $this->siteId = $config['site_id'] ?? 0; // 0 = US, 100 = Motors
        $this->compatLevel = $config['compat_level'] ?? 1219;
        $this->rateLimitDelay = $config['rate_limit_delay'] ?? 1; // seconds
        $this->maxRetries = $config['max_retries'] ?? 3;
        
        // API URL設定
        $this->apiUrl = $this->sandbox 
            ? 'https://api.sandbox.ebay.com/ws/api/eBayAPI'
            : 'https://api.ebay.com/ws/api/eBayAPI';
        
        // 認証情報設定
        $this->initializeCredentials();
    }
    
    /**
     * 認証情報初期化
     */
    private function initializeCredentials() {
        $this->credentials = [
            'app_id' => getenv('EBAY_APP_ID') ?: getenv('EBAY_CLIENT_ID') ?: 'HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce',
            'dev_id' => getenv('EBAY_DEV_ID') ?: '03dbea79-6089-4a00-8b3f-3114882e5d07',
            'cert_id' => getenv('EBAY_CERT_ID') ?: 'PRD-7fae13b2cf17-be72-4584-bdd6-4ea4',
            'user_token' => getenv('EBAY_USER_TOKEN') ?: getenv('EBAY_AUTH_TOKEN') ?: 'v^1.1#i^1#r^1#p^3#I^3#f^0#t^Ul4xMF8wOkNGMzlEOUNGMTg0N0E1RUEwNzc4NjVFOUE0RDlEQzU3XzFfMSNFXjI2MA==',
        ];
        
        // 認証情報検証
        foreach ($this->credentials as $key => $value) {
            if (empty($value) || strpos($value, 'YOUR_') === 0) {
                error_log("eBay API認証情報が設定されていません: {$key}");
            }
        }
    }
    
    /**
     * 固定価格商品出品
     */
    public function addFixedPriceItem($productData, $testMode = false) {
        try {
            // 商品データ検証
            $validationResult = $this->validateProductData($productData);
            if (!$validationResult['valid']) {
                return [
                    'success' => false,
                    'message' => 'データ検証エラー: ' . implode(', ', $validationResult['errors'])
                ];
            }
            
            // XML リクエスト構築
            $xmlRequest = $this->buildAddItemXML($productData, $testMode);
            
            // API リクエスト実行
            $response = $this->executeApiCall('AddFixedPriceItem', $xmlRequest);
            
            if ($response['success']) {
                $itemId = $this->extractItemId($response['xml']);
                
                return [
                    'success' => true,
                    'message' => '出品が完了しました',
                    'item_id' => $itemId,
                    'listing_url' => $this->generateListingUrl($itemId),
                    'response_data' => $response['data']
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'eBay API エラー: ' . $response['message'],
                    'error_code' => $response['error_code'] ?? null
                ];
            }
            
        } catch (Exception $e) {
            error_log("addFixedPriceItem エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'システムエラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 一括出品処理
     */
    public function bulkAddItems($productsData, $testMode = false, $progressCallback = null) {
        $results = [];
        $successCount = 0;
        $errorCount = 0;
        $totalCount = count($productsData);
        
        foreach ($productsData as $index => $productData) {
            try {
                // レート制限対応
                if ($index > 0) {
                    sleep($this->rateLimitDelay);
                }
                
                // 個別出品実行
                $result = $this->addFixedPriceItem($productData, $testMode);
                
                if ($result['success']) {
                    $successCount++;
                } else {
                    $errorCount++;
                }
                
                $results[] = array_merge($result, [
                    'product_id' => $productData['Item ID'] ?? $index,
                    'index' => $index
                ]);
                
                // プログレス通知
                if ($progressCallback && is_callable($progressCallback)) {
                    $progress = [
                        'current' => $index + 1,
                        'total' => $totalCount,
                        'percent' => round((($index + 1) / $totalCount) * 100),
                        'success_count' => $successCount,
                        'error_count' => $errorCount
                    ];
                    call_user_func($progressCallback, $progress);
                }
                
            } catch (Exception $e) {
                $errorCount++;
                $results[] = [
                    'success' => false,
                    'message' => 'システムエラー: ' . $e->getMessage(),
                    'product_id' => $productData['Item ID'] ?? $index,
                    'index' => $index
                ];
            }
        }
        
        return [
            'success' => $successCount > 0,
            'message' => "一括出品完了: 成功 {$successCount}件、エラー {$errorCount}件",
            'total_count' => $totalCount,
            'success_count' => $successCount,
            'error_count' => $errorCount,
            'results' => $results
        ];
    }
    
    /**
     * AddItem XML構築
     */
    private function buildAddItemXML($productData, $testMode = false) {
        $item = [
            'Title' => $this->sanitizeTitle($productData['Title']),
            'Description' => $this->buildDescription($productData),
            'CategoryID' => $productData['Category'],
            'ConditionID' => $this->mapConditionToId($productData['Condition']),
            'Country' => 'JP',
            'Currency' => 'USD',
            'ListingType' => 'FixedPriceItem',
            'PaymentMethods' => 'PayPal',
            'PayPalEmailAddress' => 'your-paypal@email.com',
            'Quantity' => $productData['Quantity'] ?: 1,
            'StartPrice' => $productData['Price'],
            'ListingDuration' => 'GTC', // Good Till Cancelled
        ];
        
        // 画像URL追加
        $images = $this->processImages($productData);
        
        // 配送情報
        $shipping = $this->buildShippingDetails($productData);
        
        // 返品ポリシー
        $returnPolicy = $this->buildReturnPolicy($productData);
        
        // 商品詳細
        $itemSpecifics = $this->buildItemSpecifics($productData);
        
        $xml = "<?xml version='1.0' encoding='utf-8'?>
        <AddFixedPriceItemRequest xmlns='urn:ebay:apis:eBLBaseComponents'>
            <RequesterCredentials>
                <eBayAuthToken>{$this->credentials['user_token']}</eBayAuthToken>
            </RequesterCredentials>
            <Item>
                <Title>{$item['Title']}</Title>
                <Description><![CDATA[{$item['Description']}]]></Description>
                <PrimaryCategory>
                    <CategoryID>{$item['CategoryID']}</CategoryID>
                </PrimaryCategory>
                <ConditionID>{$item['ConditionID']}</ConditionID>
                <Country>{$item['Country']}</Country>
                <Currency>{$item['Currency']}</Currency>
                <ListingType>{$item['ListingType']}</ListingType>
                <PaymentMethods>{$item['PaymentMethods']}</PaymentMethods>
                <PayPalEmailAddress>{$item['PayPalEmailAddress']}</PayPalEmailAddress>
                <Quantity>{$item['Quantity']}</Quantity>
                <StartPrice>{$item['StartPrice']}</StartPrice>
                <ListingDuration>{$item['ListingDuration']}</ListingDuration>
                
                {$images}
                {$shipping}
                {$returnPolicy}
                {$itemSpecifics}
                
            </Item>
        </AddFixedPriceItemRequest>";
        
        return $xml;
    }
    
    /**
     * 商品説明文構築
     */
    private function buildDescription($productData) {
        $description = $productData['Description'] ?? '';
        
        // HTMLテンプレート
        $template = "
        <div style='font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;'>
            <h2 style='color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;'>
                {$productData['Title']}
            </h2>
            
            <div style='background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;'>
                <h3 style='color: #007bff; margin-top: 0;'>商品説明</h3>
                <p>{$description}</p>
            </div>
            
            <div style='background: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0;'>
                <h3 style='color: #007bff; margin-top: 0;'>商品仕様</h3>
                <ul style='list-style: none; padding: 0;'>
                    <li><strong>ブランド:</strong> " . ($productData['Brand'] ?? 'N/A') . "</li>
                    <li><strong>状態:</strong> " . ($productData['Condition'] ?? 'Used') . "</li>
                    <li><strong>重量:</strong> " . ($productData['Weight'] ?? 'N/A') . "</li>
                    <li><strong>サイズ:</strong> " . ($productData['Dimensions'] ?? 'N/A') . "</li>
                </ul>
            </div>
            
            <div style='background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0;'>
                <h3 style='color: #0c5460; margin-top: 0;'>配送について</h3>
                <p>迅速かつ安全な配送を心がけております。商品は丁寧に梱包してお送りいたします。</p>
            </div>
            
            <div style='text-align: center; margin: 20px 0; padding: 15px; background: #fff3cd; border-radius: 5px;'>
                <p style='color: #856404; font-weight: bold; margin: 0;'>
                    ご不明な点がございましたら、お気軽にお問い合わせください。
                </p>
            </div>
        </div>";
        
        return $template;
    }
    
    /**
     * 画像処理
     */
    private function processImages($productData) {
        $imageUrls = [];
        
        // メイン画像
        if (!empty($productData['Main Image'])) {
            $imageUrls[] = $productData['Main Image'];
        }
        
        // 追加画像
        if (!empty($productData['Additional Images'])) {
            $additionalImages = explode(',', $productData['Additional Images']);
            $imageUrls = array_merge($imageUrls, array_map('trim', $additionalImages));
        }
        
        // 画像URL検証・修正
        $validImages = [];
        foreach ($imageUrls as $url) {
            if ($this->isValidImageUrl($url)) {
                $validImages[] = $url;
            }
        }
        
        if (empty($validImages)) {
            return '';
        }
        
        $imageXml = '<PictureDetails>';
        $imageXml .= '<PhotoDisplay>SuperSize</PhotoDisplay>';
        $imageXml .= '<GalleryType>Gallery</GalleryType>';
        
        // 最大12枚まで
        $limitedImages = array_slice($validImages, 0, 12);
        foreach ($limitedImages as $imageUrl) {
            $imageXml .= "<PictureURL>{$imageUrl}</PictureURL>";
        }
        
        $imageXml .= '</PictureDetails>';
        
        return $imageXml;
    }
    
    /**
     * 配送詳細構築
     */
    private function buildShippingDetails($productData) {
        $shippingService = $productData['Shipping Service'] ?? 'Standard Shipping';
        $shippingCost = $productData['Shipping Cost'] ?? '5.99';
        
        return "
        <ShippingDetails>
            <ShippingType>Flat</ShippingType>
            <ShippingServiceOptions>
                <ShippingServicePriority>1</ShippingServicePriority>
                <ShippingService>{$shippingService}</ShippingService>
                <ShippingServiceCost>{$shippingCost}</ShippingServiceCost>
                <ShippingTimeMin>7</ShippingTimeMin>
                <ShippingTimeMax>21</ShippingTimeMax>
            </ShippingServiceOptions>
            <InternationalShippingServiceOption>
                <ShippingServicePriority>1</ShippingServicePriority>
                <ShippingService>StandardInternational</ShippingService>
                <ShippingServiceCost>15.99</ShippingServiceCost>
                <ShipToLocation>Worldwide</ShipToLocation>
                <ShippingTimeMin>14</ShippingTimeMin>
                <ShippingTimeMax>30</ShippingTimeMax>
            </InternationalShippingServiceOption>
        </ShippingDetails>";
    }
    
    /**
     * 返品ポリシー構築
     */
    private function buildReturnPolicy($productData) {
        $returnPolicy = $productData['Return Policy'] ?? 'Returns Accepted';
        
        return "
        <ReturnPolicy>
            <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>
            <RefundOption>MoneyBack</RefundOption>
            <ReturnsWithinOption>Days_30</ReturnsWithinOption>
            <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
            <Description>30日以内の返品を受け付けております。返送料はお客様負担となります。</Description>
        </ReturnPolicy>";
    }
    
    /**
     * 商品仕様構築
     */
    private function buildItemSpecifics($productData) {
        $specifics = [];
        
        if (!empty($productData['Brand'])) {
            $specifics[] = "<NameValueList><Name>Brand</Name><Value>{$productData['Brand']}</Value></NameValueList>";
        }
        
        if (!empty($productData['MPN'])) {
            $specifics[] = "<NameValueList><Name>MPN</Name><Value>{$productData['MPN']}</Value></NameValueList>";
        }
        
        if (!empty($productData['UPC'])) {
            $specifics[] = "<NameValueList><Name>UPC</Name><Value>{$productData['UPC']}</Value></NameValueList>";
        }
        
        if (empty($specifics)) {
            return '';
        }
        
        return "<ItemSpecifics>" . implode('', $specifics) . "</ItemSpecifics>";
    }
    
    /**
     * API呼び出し実行
     */
    private function executeApiCall($callName, $xmlRequest, $retryCount = 0) {
        try {
            $headers = [
                'Content-Type: text/xml;charset=utf-8',
                'X-EBAY-API-COMPATIBILITY-LEVEL: ' . $this->compatLevel,
                'X-EBAY-API-DEV-NAME: ' . $this->credentials['dev_id'],
                'X-EBAY-API-APP-NAME: ' . $this->credentials['app_id'],
                'X-EBAY-API-CERT-NAME: ' . $this->credentials['cert_id'],
                'X-EBAY-API-CALL-NAME: ' . $callName,
                'X-EBAY-API-SITEID: ' . $this->siteId
            ];
            
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $this->apiUrl,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $xmlRequest,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_TIMEOUT => 60,
                CURLOPT_FOLLOWLOCATION => true
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);
            
            if ($curlError) {
                throw new Exception("cURL エラー: {$curlError}");
            }
            
            if ($httpCode !== 200) {
                throw new Exception("HTTP エラー: {$httpCode}");
            }
            
            // XML レスポンス解析
            $xml = simplexml_load_string($response);
            if ($xml === false) {
                throw new Exception("XML 解析エラー");
            }
            
            // エラーチェック
            $ack = (string)$xml->Ack;
            if ($ack === 'Failure' || $ack === 'PartialFailure') {
                $errorMessage = $this->extractErrorMessage($xml);
                $errorCode = $this->extractErrorCode($xml);
                
                // リトライ可能エラーの場合
                if ($this->isRetryableError($errorCode) && $retryCount < $this->maxRetries) {
                    sleep(pow(2, $retryCount)); // 指数バックオフ
                    return $this->executeApiCall($callName, $xmlRequest, $retryCount + 1);
                }
                
                return [
                    'success' => false,
                    'message' => $errorMessage,
                    'error_code' => $errorCode,
                    'xml' => $xml
                ];
            }
            
            return [
                'success' => true,
                'message' => 'API呼び出し成功',
                'xml' => $xml,
                'data' => $this->parseResponseData($xml)
            ];
            
        } catch (Exception $e) {
            error_log("eBay API呼び出しエラー: " . $e->getMessage());
            
            // リトライ処理
            if ($retryCount < $this->maxRetries) {
                sleep(pow(2, $retryCount));
                return $this->executeApiCall($callName, $xmlRequest, $retryCount + 1);
            }
            
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'error_code' => 'SYSTEM_ERROR'
            ];
        }
    }
    
    /**
     * 商品データ検証
     */
    private function validateProductData($productData) {
        $errors = [];
        
        // 必須フィールドチェック
        $requiredFields = ['Title', 'Category', 'Price', 'Condition'];
        foreach ($requiredFields as $field) {
            if (empty($productData[$field])) {
                $errors[] = "{$field}は必須です";
            }
        }
        
        // タイトル長さチェック
        if (!empty($productData['Title']) && mb_strlen($productData['Title']) > 80) {
            $errors[] = "タイトルは80文字以内で入力してください";
        }
        
        // 価格チェック
        if (!empty($productData['Price'])) {
            $price = floatval($productData['Price']);
            if ($price <= 0 || $price > 999999) {
                $errors[] = "価格は0.01〜999,999の範囲で入力してください";
            }
        }
        
        // カテゴリチェック
        if (!empty($productData['Category']) && !is_numeric($productData['Category'])) {
            $errors[] = "カテゴリIDは数値で入力してください";
        }
        
        // 数量チェック
        if (!empty($productData['Quantity'])) {
            $quantity = intval($productData['Quantity']);
            if ($quantity <= 0 || $quantity > 10000) {
                $errors[] = "数量は1〜10,000の範囲で入力してください";
            }
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
    
    /**
     * ヘルパーメソッド
     */
    private function sanitizeTitle($title) {
        // HTMLタグ削除・特殊文字エスケープ
        $title = strip_tags($title);
        $title = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
        
        // 80文字制限
        if (mb_strlen($title) > 80) {
            $title = mb_substr($title, 0, 77) . '...';
        }
        
        return $title;
    }
    
    private function mapConditionToId($condition) {
        $conditionMap = [
            'New' => 1000,
            'New other' => 1500,
            'New with defects' => 1750,
            'Used' => 3000,
            'For parts or not working' => 7000
        ];
        
        return $conditionMap[$condition] ?? 3000; // デフォルト: Used
    }
    
    private function isValidImageUrl($url) {
        if (empty($url)) return false;
        
        // HTTPS確認
        if (strpos($url, 'https://') !== 0) return false;
        
        // 画像拡張子確認
        $validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
        $extension = strtolower(pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));
        
        return in_array($extension, $validExtensions);
    }
    
    private function extractItemId($xml) {
        return (string)$xml->ItemID ?? null;
    }
    
    private function extractErrorMessage($xml) {
        if (isset($xml->Errors) && isset($xml->Errors->LongMessage)) {
            return (string)$xml->Errors->LongMessage;
        }
        return 'Unknown eBay API error';
    }
    
    private function extractErrorCode($xml) {
        if (isset($xml->Errors) && isset($xml->Errors->ErrorCode)) {
            return (string)$xml->Errors->ErrorCode;
        }
        return 'UNKNOWN_ERROR';
    }
    
    private function isRetryableError($errorCode) {
        $retryableErrors = [
            '502', '503', '504', // HTTP server errors
            '21917055', // API system error
            '21919301', // Temporary API error
        ];
        
        return in_array($errorCode, $retryableErrors);
    }
    
    private function parseResponseData($xml) {
        return [
            'item_id' => (string)$xml->ItemID ?? null,
            'fees' => $this->extractFees($xml),
            'warnings' => $this->extractWarnings($xml)
        ];
    }
    
    private function extractFees($xml) {
        $fees = [];
        if (isset($xml->Fees) && isset($xml->Fees->Fee)) {
            foreach ($xml->Fees->Fee as $fee) {
                $fees[] = [
                    'name' => (string)$fee->Name,
                    'amount' => (string)$fee->Fee
                ];
            }
        }
        return $fees;
    }
    
    private function extractWarnings($xml) {
        $warnings = [];
        if (isset($xml->Warnings) && isset($xml->Warnings->LongMessage)) {
            foreach ($xml->Warnings->LongMessage as $warning) {
                $warnings[] = (string)$warning;
            }
        }
        return $warnings;
    }
    
    private function generateListingUrl($itemId) {
        $baseUrl = $this->sandbox 
            ? 'https://www.sandbox.ebay.com/itm/'
            : 'https://www.ebay.com/itm/';
        
        return $baseUrl . $itemId;
    }
    
    /**
     * 接続テスト
     */
    public function testConnection() {
        try {
            $xmlRequest = "<?xml version='1.0' encoding='utf-8'?>
            <GeteBayOfficialTimeRequest xmlns='urn:ebay:apis:eBLBaseComponents'>
                <RequesterCredentials>
                    <eBayAuthToken>{$this->credentials['user_token']}</eBayAuthToken>
                </RequesterCredentials>
            </GeteBayOfficialTimeRequest>";
            
            $response = $this->executeApiCall('GeteBayOfficialTime', $xmlRequest);
            
            if ($response['success']) {
                return [
                    'success' => true,
                    'message' => 'eBay API接続成功',
                    'server_time' => (string)$response['xml']->Timestamp,
                    'environment' => $this->sandbox ? 'Sandbox' : 'Production'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'eBay API接続失敗: ' . $response['message']
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => '接続テストエラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 商品情報取得
     */
    public function getItem($itemId) {
        try {
            $xmlRequest = "<?xml version='1.0' encoding='utf-8'?>
            <GetItemRequest xmlns='urn:ebay:apis:eBLBaseComponents'>
                <RequesterCredentials>
                    <eBayAuthToken>{$this->credentials['user_token']}</eBayAuthToken>
                </RequesterCredentials>
                <ItemID>{$itemId}</ItemID>
            </GetItemRequest>";
            
            $response = $this->executeApiCall('GetItem', $xmlRequest);
            
            if ($response['success']) {
                return [
                    'success' => true,
                    'item_data' => $this->parseItemData($response['xml'])
                ];
            } else {
                return [
                    'success' => false,
                    'message' => $response['message']
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => '商品情報取得エラー: ' . $e->getMessage()
            ];
        }
    }
    
    private function parseItemData($xml) {
        $item = $xml->Item;
        
        return [
            'item_id' => (string)$item->ItemID,
            'title' => (string)$item->Title,
            'description' => (string)$item->Description,
            'price' => (string)$item->StartPrice,
            'quantity' => (string)$item->Quantity,
            'listing_status' => (string)$item->ListingStatus,
            'view_count' => (string)$item->HitCount
        ];
    }
}
?>