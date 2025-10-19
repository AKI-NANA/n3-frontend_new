<?php
/**
 * eBay API統合クラス - 既存コードの完成版
 * 既存のexecuteEbayListing()関数を置き換える
 */

class EbayApiIntegration {
    private $credentials;
    private $sandbox;
    private $apiUrl;
    
    public function __construct($config = []) {
        $this->credentials = [
            'app_id' => $config['app_id'] ?? $_ENV['EBAY_APP_ID'],
            'dev_id' => $config['dev_id'] ?? $_ENV['EBAY_DEV_ID'],
            'cert_id' => $config['cert_id'] ?? $_ENV['EBAY_CERT_ID'],
            'user_token' => $config['user_token'] ?? $_ENV['EBAY_USER_TOKEN'],
        ];
        
        $this->sandbox = $config['sandbox'] ?? true;
        $this->apiUrl = $this->sandbox ? 
            'https://api.sandbox.ebay.com/ws/api' : 
            'https://api.ebay.com/ws/api';
    }
    
    /**
     * 既存のexecuteEbayListing()を置き換える実装
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
            
            if ($response && isset($response['ItemID'])) {
                return [
                    'success' => true,
                    'ebay_item_id' => (string)$response['ItemID'],
                    'listing_url' => "https://www.ebay.com/itm/" . $response['ItemID'],
                    'fees' => $this->extractFees($response),
                    'start_time' => $response['StartTime'] ?? date('c'),
                    'end_time' => $response['EndTime'] ?? null
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
                'タイトルが長すぎます'
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
                'insertion_fee' => rand(10, 50) / 100,
                'final_value_fee' => rand(800, 1200) / 100
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
        $xml .= '<ShippingService>JP_StandardShipping</ShippingService>';
        $xml .= '<ShippingServiceCost>0</ShippingServiceCost>';
        $xml .= '</ShippingServiceOptions>';
        $xml .= '</ShippingDetails>';
        
        $xml .= '<PaymentMethods>PayPal</PaymentMethods>';
        $xml .= '<ReturnPolicy>';
        $xml .= '<ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>';
        $xml .= '<RefundOption>MoneyBack</RefundOption>';
        $xml .= '<ReturnsWithinOption>Days_30</ReturnsWithinOption>';
        $xml .= '<ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>';
        $xml .= '</ReturnPolicy>';
        
        $xml .= '</Item>';
        $xml .= '</AddFixedPriceItemRequest>';
        
        return $xml;
    }
    
    /**
     * eBay API呼び出し
     */
    private function makeApiCall($verb, $xmlRequest) {
        $headers = [
            'X-EBAY-API-COMPATIBILITY-LEVEL: 967',
            'X-EBAY-API-DEV-NAME: ' . $this->credentials['dev_id'],
            'X-EBAY-API-APP-NAME: ' . $this->credentials['app_id'],
            'X-EBAY-API-CERT-NAME: ' . $this->credentials['cert_id'],
            'X-EBAY-API-CALL-NAME: ' . $verb,
            'X-EBAY-API-SITEID: 0',
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
            CURLOPT_SSL_VERIFYPEER => false
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
            throw new Exception("XML解析エラー");
        }
        
        // 名前空間を処理
        $xml->registerXPathNamespace('ebay', 'urn:ebay:apis:eBLBaseComponents');
        
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
            // PostgreSQL接続（既存の接続を使用）
            include_once(__DIR__ . '/../../../database_query_handler.php');
            
            $updateData = [
                'ebay_item_id' => $result['ebay_item_id'],
                'ebay_listing_url' => $result['listing_url'],
                'listing_status' => 'Listed',
                'listed_at' => date('Y-m-d H:i:s'),
                'listing_fees' => json_encode($result['fees'] ?? [])
            ];
            
            if (isset($item['item_id'])) {
                updateInventoryRecord($item['item_id'], $updateData);
            }
            
        } catch (Exception $e) {
            error_log("データベース更新エラー: " . $e->getMessage());
        }
    }
    
    /**
     * カテゴリー検証
     */
    private function isValidCategory($categoryId) {
        // 簡単な検証（実際にはeBay APIでカテゴリーを検証すべき）
        return is_numeric($categoryId) && $categoryId > 0;
    }
    
    /**
     * エラー抽出
     */
    private function extractErrors($response) {
        $errors = [];
        
        if ($response && isset($response->Errors)) {
            foreach ($response->Errors as $error) {
                $errors[] = (string)$error->LongMessage;
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
                $fees[(string)$fee->Name] = [
                    'amount' => (float)$fee->Fee,
                    'currency' => (string)$fee->Fee['currencyID']
                ];
            }
        }
        
        return $fees;
    }
}

/**
 * 既存のexecuteEbayListing()関数を置き換える
 */
function executeEbayListing() {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['csv_data'])) {
            throw new Exception('出品データが見つかりません');
        }
        
        // 設定読み込み
        $config = [
            'sandbox' => $input['sandbox'] ?? true,
            'app_id' => $_ENV['EBAY_APP_ID'] ?? null,
            'dev_id' => $_ENV['EBAY_DEV_ID'] ?? null,
            'cert_id' => $_ENV['EBAY_CERT_ID'] ?? null,
            'user_token' => $_ENV['EBAY_USER_TOKEN'] ?? null
        ];
        
        // eBay API統合クラスを使用
        $ebayApi = new EbayApiIntegration($config);
        
        $options = [
            'dry_run' => $input['dry_run'] ?? true,
            'batch_size' => $input['batch_size'] ?? 10
        ];
        
        $results = $ebayApi->executeBulkListing($input['csv_data'], $options);
        
        echo json_encode($results);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'eBay出品エラー: ' . $e->getMessage(),
            'data' => []
        ]);
    }
    exit;
}

?>