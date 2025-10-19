<?php
/**
 * eBay API統合クラス - ebay_api_integration.php
 * modules/yahoo_auction_complete/new_structure/08_listing/ebay_api_integration.php
 * 
 * 🎯 機能:
 * - eBay Trading API v1.0統合
 * - 一括出品処理
 * - レート制限管理
 * - エラーハンドリング
 * - プログレス通知
 */

class EbayApiIntegration {
    private $credentials;
    private $sandbox;
    private $apiUrl;
    private $siteId;
    private $version;
    
    public function __construct($config = []) {
        $this->credentials = [
            'app_id' => $config['app_id'] ?? $_ENV['EBAY_APP_ID'] ?? null,
            'dev_id' => $config['dev_id'] ?? $_ENV['EBAY_DEV_ID'] ?? null,
            'cert_id' => $config['cert_id'] ?? $_ENV['EBAY_CERT_ID'] ?? null,
            'user_token' => $config['user_token'] ?? $_ENV['EBAY_USER_TOKEN'] ?? null,
        ];
        
        $this->sandbox = $config['sandbox'] ?? true;
        $this->siteId = $config['site_id'] ?? 0; // US site
        $this->version = $config['version'] ?? '967';
        
        $this->apiUrl = $this->sandbox ? 
            'https://api.sandbox.ebay.com/ws/api' : 
            'https://api.ebay.com/ws/api';
            
        // 認証情報チェック
        if (!$this->validateCredentials()) {
            throw new Exception('eBay API認証情報が不完全です');
        }
    }
    
    /**
     * 認証情報バリデーション
     */
    private function validateCredentials() {
        return !empty($this->credentials['app_id']) && 
               !empty($this->credentials['dev_id']) && 
               !empty($this->credentials['cert_id']) && 
               !empty($this->credentials['user_token']);
    }
    
    /**
     * 一括出品実行
     */
    public function executeBulkListing($csvData, $options = []) {
        try {
            $results = [
                'success' => true,
                'data' => [
                    'total_items' => count($csvData),
                    'success_count' => 0,
                    'error_count' => 0,
                    'success_items' => [],
                    'failed_items' => [],
                    'dry_run' => $options['dry_run'] ?? true
                ]
            ];
            
            $batchSize = $options['batch_size'] ?? 10;
            $dryRun = $options['dry_run'] ?? true;
            
            // プログレス通知用のセッション初期化
            session_start();
            $_SESSION['listing_progress'] = [
                'current' => 0,
                'total' => count($csvData),
                'status' => 'starting'
            ];
            
            foreach ($csvData as $index => $item) {
                try {
                    // プログレス更新
                    $this->updateProgress($index + 1, count($csvData));
                    
                    // バリデーション
                    $validation = $this->validateItem($item);
                    if (!$validation['valid']) {
                        throw new Exception(implode(', ', $validation['errors']));
                    }
                    
                    if ($dryRun) {
                        // テストモード：検証のみ
                        $listingResult = $this->simulateListing($item);
                    } else {
                        // 実際のeBay出品
                        $listingResult = $this->listToEbay($item);
                    }
                    
                    if ($listingResult['success']) {
                        $results['data']['success_count']++;
                        $results['data']['success_items'][] = [
                            'index' => $index + 1,
                            'title' => $item['Title'] ?? 'Unknown',
                            'ebay_item_id' => $listingResult['ebay_item_id'],
                            'listing_url' => $listingResult['listing_url'],
                            'fees' => $listingResult['fees'] ?? []
                        ];
                        
                        // データベース更新
                        if (!$dryRun) {
                            $this->updateDatabaseRecord($item, $listingResult);
                        }
                        
                    } else {
                        throw new Exception($listingResult['error']);
                    }
                    
                    // API制限対応
                    $this->enforceRateLimit();
                    
                } catch (Exception $e) {
                    $results['data']['error_count']++;
                    $results['data']['failed_items'][] = [
                        'index' => $index + 1,
                        'title' => $item['Title'] ?? 'Unknown',
                        'error' => $e->getMessage()
                    ];
                    
                    // エラーログ
                    error_log("eBay出品エラー - 行" . ($index + 1) . ": " . $e->getMessage());
                }
                
                // バッチ処理間隔
                if (($index + 1) % $batchSize === 0) {
                    sleep(2); // 2秒休憩
                }
            }
            
            $mode = $dryRun ? 'テスト実行' : '実出品';
            $results['message'] = "{$mode}完了: 成功{$results['data']['success_count']}件、失敗{$results['data']['error_count']}件";
            
            return $results;
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'eBay出品処理エラー: ' . $e->getMessage(),
                'data' => []
            ];
        }
    }
    
    /**
     * 実際のeBay出品処理
     */
    private function listToEbay($item) {
        try {
            // XML リクエスト生成
            $xmlRequest = $this->buildAddItemXML($item);
            
            // eBay API呼び出し
            $response = $this->makeApiCall('AddFixedPriceItem', $xmlRequest);
            
            if ($response && isset($response->ItemID)) {
                return [
                    'success' => true,
                    'ebay_item_id' => (string)$response->ItemID,
                    'listing_url' => "https://www.ebay.com/itm/" . $response->ItemID,
                    'fees' => $this->extractFees($response),
                    'start_time' => (string)($response->StartTime ?? date('c')),
                    'end_time' => (string)($response->EndTime ?? '')
                ];
            } else {
                $errors = $this->extractErrors($response);
                return [
                    'success' => false,
                    'error' => implode('; ', $errors)
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'API呼び出しエラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * テストモード用のシミュレーション
     */
    private function simulateListing($item) {
        // 意図的にランダムエラーをシミュレート（10%の確率）
        if (rand(1, 100) <= 10) {
            $errors = [
                'カテゴリーIDが無効です',
                '画像URLにアクセスできません',
                '価格が範囲外です',
                'タイトルが長すぎます',
                '商品説明に禁止キーワードが含まれています'
            ];
            return [
                'success' => false,
                'error' => $errors[array_rand($errors)]
            ];
        }
        
        return [
            'success' => true,
            'ebay_item_id' => 'TEST_' . uniqid(),
            'listing_url' => 'https://www.ebay.com/itm/test_' . uniqid(),
            'fees' => [
                'insertion_fee' => round(rand(10, 50) / 100, 2),
                'final_value_fee' => round(rand(800, 1200) / 100, 2)
            ]
        ];
    }
    
    /**
     * アイテムバリデーション
     */
    private function validateItem($item) {
        $errors = [];
        
        // 必須フィールドチェック
        $requiredFields = ['Title', 'Category', 'BuyItNowPrice', 'Description'];
        foreach ($requiredFields as $field) {
            if (empty($item[$field])) {
                $errors[] = "{$field}が未設定です";
            }
        }
        
        // 価格チェック
        if (isset($item['BuyItNowPrice'])) {
            $price = floatval($item['BuyItNowPrice']);
            if ($price <= 0 || $price > 999999) {
                $errors[] = '価格が無効です（0.01-999999の範囲で入力してください）';
            }
        }
        
        // タイトル長チェック
        if (isset($item['Title']) && strlen($item['Title']) > 255) {
            $errors[] = 'タイトルが255文字を超えています';
        }
        
        // カテゴリーチェック
        if (isset($item['Category']) && !$this->isValidCategory($item['Category'])) {
            $errors[] = '無効なeBayカテゴリーIDです';
        }
        
        // 画像URLチェック
        if (isset($item['PictureURL']) && !empty($item['PictureURL'])) {
            if (!filter_var($item['PictureURL'], FILTER_VALIDATE_URL)) {
                $errors[] = '画像URLが無効です';
            }
        }
        
        // 数量チェック
        if (isset($item['Quantity'])) {
            $quantity = intval($item['Quantity']);
            if ($quantity < 1 || $quantity > 999) {
                $errors[] = '数量が無効です（1-999の範囲で入力してください）';
            }
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
    
    /**
     * XML リクエスト生成
     */
    private function buildAddItemXML($item) {
        $xml = '<?xml version="1.0" encoding="utf-8"?>';
        $xml .= '<AddFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">';
        $xml .= '<RequesterCredentials>';
        $xml .= '<eBayAuthToken>' . htmlspecialchars($this->credentials['user_token']) . '</eBayAuthToken>';
        $xml .= '</RequesterCredentials>';
        $xml .= '<Item>';
        
        // 基本情報
        $xml .= '<Title>' . htmlspecialchars($item['Title']) . '</Title>';
        $xml .= '<Description>' . htmlspecialchars($item['Description']) . '</Description>';
        $xml .= '<PrimaryCategory><CategoryID>' . intval($item['Category']) . '</CategoryID></PrimaryCategory>';
        $xml .= '<StartPrice>' . floatval($item['BuyItNowPrice']) . '</StartPrice>';
        $xml .= '<CategoryMappingAllowed>true</CategoryMappingAllowed>';
        $xml .= '<Country>' . ($item['Country'] ?? 'JP') . '</Country>';
        $xml .= '<Currency>' . ($item['Currency'] ?? 'USD') . '</Currency>';
        $xml .= '<DispatchTimeMax>3</DispatchTimeMax>';
        $xml .= '<ListingDuration>' . ($item['Duration'] ?? 'GTC') . '</ListingDuration>';
        $xml .= '<ListingType>FixedPriceItem</ListingType>';
        $xml .= '<PostalCode>' . ($item['PostalCode'] ?? '100-0001') . '</PostalCode>';
        $xml .= '<Quantity>' . intval($item['Quantity'] ?? 1) . '</Quantity>';
        
        // 画像
        if (!empty($item['PictureURL'])) {
            $xml .= '<PictureDetails>';
            $xml .= '<PictureURL>' . htmlspecialchars($item['PictureURL']) . '</PictureURL>';
            $xml .= '</PictureDetails>';
        }
        
        // コンディション
        if (!empty($item['ConditionID'])) {
            $xml .= '<ConditionID>' . intval($item['ConditionID']) . '</ConditionID>';
            if (!empty($item['ConditionDescription'])) {
                $xml .= '<ConditionDescription>' . htmlspecialchars($item['ConditionDescription']) . '</ConditionDescription>';
            }
        }
        
        // 配送・支払い設定
        $xml .= '<ShippingDetails>';
        $xml .= '<ShippingServiceOptions>';
        $xml .= '<ShippingServicePriority>1</ShippingServicePriority>';
        $xml .= '<ShippingService>' . ($item['ShippingService'] ?? 'JP_StandardShipping') . '</ShippingService>';
        $xml .= '<ShippingServiceCost>' . floatval($item['ShippingCost'] ?? 0) . '</ShippingServiceCost>';
        $xml .= '</ShippingServiceOptions>';
        $xml .= '</ShippingDetails>';
        
        // 支払い方法
        $xml .= '<PaymentMethods>PayPal</PaymentMethods>';
        
        // 返品ポリシー
        $xml .= '<ReturnPolicy>';
        $xml .= '<ReturnsAcceptedOption>' . ($item['ReturnsAccepted'] ?? 'ReturnsAccepted') . '</ReturnsAcceptedOption>';
        $xml .= '<RefundOption>MoneyBack</RefundOption>';
        $xml .= '<ReturnsWithinOption>' . ($item['ReturnsWithin'] ?? 'Days_30') . '</ReturnsWithinOption>';
        $xml .= '<ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>';
        $xml .= '</ReturnPolicy>';
        
        // ブランド・UPC
        if (!empty($item['Brand'])) {
            $xml .= '<ProductListingDetails>';
            $xml .= '<BrandMPN><Brand>' . htmlspecialchars($item['Brand']) . '</Brand></BrandMPN>';
            if (!empty($item['UPC'])) {
                $xml .= '<UPC>' . htmlspecialchars($item['UPC']) . '</UPC>';
            }
            $xml .= '</ProductListingDetails>';
        }
        
        $xml .= '</Item>';
        $xml .= '</AddFixedPriceItemRequest>';
        
        return $xml;
    }
    
    /**
     * eBay API呼び出し
     */
    private function makeApiCall($verb, $xmlRequest) {
        $headers = [
            'X-EBAY-API-COMPATIBILITY-LEVEL: ' . $this->version,
            'X-EBAY-API-DEV-NAME: ' . $this->credentials['dev_id'],
            'X-EBAY-API-APP-NAME: ' . $this->credentials['app_id'],
            'X-EBAY-API-CERT-NAME: ' . $this->credentials['cert_id'],
            'X-EBAY-API-CALL-NAME: ' . $verb,
            'X-EBAY-API-SITEID: ' . $this->siteId,
            'Content-Type: text/xml',
            'Content-Length: ' . strlen($xmlRequest)
        ];
        
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $this->apiUrl,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xmlRequest,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_CONNECTTIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_USERAGENT => 'Yahoo-Auction-Tool/1.0'
        ]);
        
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $curlError = curl_error($curl);
        curl_close($curl);
        
        if ($curlError) {
            throw new Exception("CURL エラー: {$curlError}");
        }
        
        if ($httpCode !== 200) {
            throw new Exception("HTTP エラー: {$httpCode}");
        }
        
        // XML解析
        $xml = simplexml_load_string($response);
        if ($xml === false) {
            throw new Exception("XML解析エラー: " . $response);
        }
        
        // 名前空間を処理
        $xml->registerXPathNamespace('ebay', 'urn:ebay:apis:eBLBaseComponents');
        
        // APIエラーチェック
        if (isset($xml->Ack) && (string)$xml->Ack !== 'Success') {
            $errors = $this->extractErrors($xml);
            if (!empty($errors)) {
                throw new Exception("eBay API エラー: " . implode('; ', $errors));
            }
        }
        
        return $xml;
    }
    
    /**
     * プログレス更新
     */
    private function updateProgress($current, $total) {
        $_SESSION['listing_progress'] = [
            'current' => $current,
            'total' => $total,
            'percentage' => round(($current / $total) * 100),
            'status' => 'processing',
            'updated_at' => time()
        ];
    }
    
    /**
     * レート制限管理
     */
    private function enforceRateLimit() {
        static $lastCall = 0;
        $minInterval = 1; // 1秒間隔
        
        $timeSinceLastCall = microtime(true) - $lastCall;
        if ($timeSinceLastCall < $minInterval) {
            usleep(($minInterval - $timeSinceLastCall) * 1000000);
        }
        
        $lastCall = microtime(true);
    }
    
    /**
     * データベース更新
     */
    private function updateDatabaseRecord($item, $result) {
        try {
            $pdo = $this->getDatabaseConnection();
            if (!$pdo) return;
            
            $updateData = [
                'ebay_item_id' => $result['ebay_item_id'],
                'ebay_listing_url' => $result['listing_url'],
                'listing_status' => 'Listed',
                'listed_at' => date('Y-m-d H:i:s'),
                'listing_fees' => json_encode($result['fees'] ?? [])
            ];
            
            if (isset($item['item_id'])) {
                $sql = "
                UPDATE mystical_japan_treasures_inventory 
                SET ebay_item_id = ?, ebay_listing_url = ?, listing_status = ?, 
                    listed_at = ?, listing_fees = ?, updated_at = NOW()
                WHERE source_item_id = ?
                ";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $updateData['ebay_item_id'],
                    $updateData['ebay_listing_url'],
                    $updateData['listing_status'],
                    $updateData['listed_at'],
                    $updateData['listing_fees'],
                    $item['item_id']
                ]);
            }
            
        } catch (Exception $e) {
            error_log("データベース更新エラー: " . $e->getMessage());
        }
    }
    
    /**
     * カテゴリー検証
     */
    private function isValidCategory($categoryId) {
        // 基本的な数値チェック（実際にはeBay APIでカテゴリーを検証すべき）
        return is_numeric($categoryId) && intval($categoryId) > 0;
    }
    
    /**
     * エラー抽出
     */
    private function extractErrors($response) {
        $errors = [];
        
        if ($response && isset($response->Errors)) {
            foreach ($response->Errors as $error) {
                $errorMsg = (string)($error->LongMessage ?? $error->ShortMessage ?? 'Unknown error');
                $errorCode = (string)($error->ErrorCode ?? '');
                $errors[] = $errorCode ? "[$errorCode] $errorMsg" : $errorMsg;
            }
        }
        
        return empty($errors) ? ['不明なエラーが発生しました'] : $errors;
    }
    
    /**
     * 手数料抽出
     */
    private function extractFees($response) {
        $fees = [];
        
        if ($response && isset($response->Fees->Fee)) {
            foreach ($response->Fees->Fee as $fee) {
                $feeName = (string)$fee->Name;
                $feeAmount = (float)$fee->Fee;
                $feeCurrency = (string)$fee->Fee['currencyID'];
                
                $fees[$feeName] = [
                    'amount' => $feeAmount,
                    'currency' => $feeCurrency
                ];
            }
        }
        
        return $fees;
    }
    
    /**
     * データベース接続取得
     */
    private function getDatabaseConnection() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            return $pdo;
        } catch (PDOException $e) {
            error_log("データベース接続エラー: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * 公開メソッド：進行状況取得
     */
    public function getProgress() {
        return $_SESSION['listing_progress'] ?? [
            'current' => 0,
            'total' => 0,
            'percentage' => 0,
            'status' => 'idle'
        ];
    }
    
    /**
     * 公開メソッド：API接続テスト
     */
    public function testConnection() {
        try {
            $xmlRequest = '<?xml version="1.0" encoding="utf-8"?>';
            $xmlRequest .= '<GeteBayOfficialTimeRequest xmlns="urn:ebay:apis:eBLBaseComponents">';
            $xmlRequest .= '<RequesterCredentials>';
            $xmlRequest .= '<eBayAuthToken>' . htmlspecialchars($this->credentials['user_token']) . '</eBayAuthToken>';
            $xmlRequest .= '</RequesterCredentials>';
            $xmlRequest .= '</GeteBayOfficialTimeRequest>';
            
            $response = $this->makeApiCall('GeteBayOfficialTime', $xmlRequest);
            
            if ($response && isset($response->Timestamp)) {
                return [
                    'success' => true,
                    'message' => 'eBay API接続成功',
                    'timestamp' => (string)$response->Timestamp,
                    'environment' => $this->sandbox ? 'Sandbox' : 'Production'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'eBay API応答が無効です'
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'eBay API接続エラー: ' . $e->getMessage()
            ];
        }
    }
}

?>