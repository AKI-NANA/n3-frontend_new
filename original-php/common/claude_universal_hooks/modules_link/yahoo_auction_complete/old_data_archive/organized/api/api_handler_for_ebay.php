<?php
/**
 * eBay出品API処理システム
 * yahoo_auction_content.php から呼び出される出品実行API
 */

// エラー表示設定（本番では非表示）
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// JSON応答専用ヘッダー設定
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

// OPTIONSリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * eBay出品API処理クラス
 */
class EbayListingApiHandler {
    
    private $pdo;
    private $ebayConfig;
    private $logFile;
    
    public function __construct() {
        $this->initializeDatabase();
        $this->initializeEbayConfig();
        $this->logFile = __DIR__ . '/logs/ebay_api_' . date('Y-m-d') . '.log';
        
        // ログディレクトリ作成
        $logDir = dirname($this->logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
    }
    
    /**
     * データベース初期化
     */
    private function initializeDatabase() {
        try {
            $host = $_ENV['DB_HOST'] ?? 'localhost';
            $dbname = $_ENV['DB_NAME'] ?? 'nagano3_db';
            $username = $_ENV['DB_USER'] ?? 'postgres';
            $password = $_ENV['DB_PASS'] ?? '';
            
            $dsn = "pgsql:host={$host};dbname={$dbname};charset=utf8";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 30
            ];
            
            $this->pdo = new PDO($dsn, $username, $password, $options);
            $this->log('INFO', 'データベース接続成功');
            
        } catch (PDOException $e) {
            $this->log('ERROR', 'データベース接続失敗: ' . $e->getMessage());
            throw new Exception('データベース接続に失敗しました');
        }
    }
    
    /**
     * eBay設定初期化
     */
    private function initializeEbayConfig() {
        $this->ebayConfig = [
            'sandbox' => true, // 本番では false
            'app_id' => $_ENV['EBAY_APP_ID'] ?? 'test_app_id',
            'dev_id' => $_ENV['EBAY_DEV_ID'] ?? 'test_dev_id',
            'cert_id' => $_ENV['EBAY_CERT_ID'] ?? 'test_cert_id',
            'user_token' => $_ENV['EBAY_USER_TOKEN'] ?? 'test_user_token',
            'site_id' => 0, // 0=US, 3=UK, 77=Germany
            'compatibility_level' => 1285,
            'api_endpoint' => $_ENV['EBAY_SANDBOX'] === 'false' 
                ? 'https://api.ebay.com/ws/api.dll'
                : 'https://api.sandbox.ebay.com/ws/api.dll',
            'timeout' => 30,
            'retry_count' => 3,
            'retry_delay' => 2000 // milliseconds
        ];
        
        $this->log('INFO', 'eBay設定初期化完了');
    }
    
    /**
     * メインAPI処理エントリーポイント
     */
    public function handleRequest() {
        try {
            $action = $this->getRequestAction();
            
            switch ($action) {
                case 'execute_listing':
                    return $this->executeListingProcess();
                    
                case 'test_connection':
                    return $this->testEbayConnection();
                    
                case 'get_listing_status':
                    return $this->getListingStatus();
                    
                case 'update_inventory':
                    return $this->updateInventoryStatus();
                    
                default:
                    throw new Exception("不明なアクション: {$action}");
            }
            
        } catch (Exception $e) {
            $this->log('ERROR', 'APIリクエスト処理エラー: ' . $e->getMessage());
            return $this->sendErrorResponse($e->getMessage());
        }
    }
    
    /**
     * リクエストアクション取得
     */
    private function getRequestAction() {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        return $data['action'] ?? $_GET['action'] ?? $_POST['action'] ?? 'execute_listing';
    }
    
    /**
     * 出品処理メイン実行
     */
    private function executeListingProcess() {
        $this->log('INFO', '🚀 eBay出品処理開始');
        
        try {
            // 1. リクエストデータ取得・検証
            $requestData = $this->getRequestData();
            $items = $requestData['items'] ?? [];
            $options = $requestData['options'] ?? [];
            
            if (empty($items)) {
                throw new Exception('出品対象商品が指定されていません');
            }
            
            $this->log('INFO', "出品対象商品数: " . count($items) . "件");
            
            // 2. 出品処理実行（バッチ処理）
            $results = $this->processBatchListing($items, $options);
            
            // 3. 結果サマリー作成
            $summary = $this->createResultSummary($results);
            
            $this->log('INFO', "出品処理完了 - 成功: {$summary['success_count']}件, 失敗: {$summary['error_count']}件");
            
            return $this->sendSuccessResponse($summary);
            
        } catch (Exception $e) {
            $this->log('ERROR', '出品処理エラー: ' . $e->getMessage());
            return $this->sendErrorResponse($e->getMessage());
        }
    }
    
    /**
     * バッチ出品処理
     */
    private function processBatchListing($items, $options) {
        $results = [
            'success_items' => [],
            'failed_items' => [],
            'total_processed' => 0
        ];
        
        $batchSize = $options['batch_size'] ?? 10;
        $delayMs = $options['delay_between_items'] ?? 2000;
        $dryRun = $options['dry_run'] ?? false;
        
        foreach ($items as $index => $item) {
            $results['total_processed']++;
            
            try {
                $this->log('INFO', "商品処理開始 [{$index}]: " . ($item['Title'] ?? 'Unknown'));
                
                // 事前バリデーション
                $validationResult = $this->validateItem($item, $index);
                if (!$validationResult['valid']) {
                    $results['failed_items'][] = [
                        'index' => $index,
                        'item' => $item,
                        'error_type' => 'validation',
                        'error_message' => $validationResult['error'],
                        'timestamp' => date('Y-m-d H:i:s')
                    ];
                    continue;
                }
                
                // HTML説明生成
                if ($options['use_html_templates'] ?? true) {
                    $item['Description'] = $this->generateEnhancedDescription($item);
                }
                
                // eBay出品実行
                if ($dryRun) {
                    $listingResult = $this->simulateListing($item);
                } else {
                    $listingResult = $this->executeEbayListing($item);
                }
                
                if ($listingResult['success']) {
                    // 成功処理
                    $this->updateDatabaseAfterSuccess($item, $listingResult);
                    
                    $results['success_items'][] = [
                        'index' => $index,
                        'item' => $item,
                        'ebay_item_id' => $listingResult['item_id'],
                        'listing_url' => $listingResult['listing_url'],
                        'timestamp' => date('Y-m-d H:i:s')
                    ];
                    
                    $this->log('SUCCESS', "出品成功 [{$index}]: {$listingResult['item_id']}");
                } else {
                    throw new Exception($listingResult['error']);
                }
                
            } catch (Exception $e) {
                $this->log('ERROR', "出品失敗 [{$index}]: " . $e->getMessage());
                
                $results['failed_items'][] = [
                    'index' => $index,
                    'item' => $item,
                    'error_type' => 'api_error',
                    'error_message' => $e->getMessage(),
                    'timestamp' => date('Y-m-d H:i:s')
                ];
            }
            
            // レート制限対応
            if ($delayMs > 0 && $index < count($items) - 1) {
                usleep($delayMs * 1000);
            }
            
            // バッチサイズでの区切り処理
            if (($index + 1) % $batchSize === 0) {
                $this->log('INFO', "バッチ処理完了: " . ($index + 1) . "/" . count($items));
                sleep(1); // バッチ間の休憩
            }
        }
        
        return $results;
    }
    
    /**
     * アイテムバリデーション
     */
    private function validateItem($item, $index) {
        $errors = [];
        
        // 必須フィールドチェック
        $requiredFields = ['Title', 'CategoryID', 'Description'];
        foreach ($requiredFields as $field) {
            if (empty($item[$field])) {
                $errors[] = "必須フィールド不足: {$field}";
            }
        }
        
        // タイトル長さチェック
        if (isset($item['Title']) && strlen($item['Title']) > 255) {
            $errors[] = "タイトルが長すぎます（255文字以内）";
        }
        
        // 価格チェック
        if (isset($item['StartPrice'])) {
            $price = floatval($item['StartPrice']);
            if ($price <= 0 || $price > 99999) {
                $errors[] = "無効な価格: {$price}";
            }
        }
        
        // 禁止キーワードチェック
        $bannedKeywords = $this->getBannedKeywords();
        $title = strtolower($item['Title'] ?? '');
        $description = strtolower($item['Description'] ?? '');
        
        foreach ($bannedKeywords as $keyword) {
            if (strpos($title, strtolower($keyword)) !== false || 
                strpos($description, strtolower($keyword)) !== false) {
                $errors[] = "禁止キーワード検出: {$keyword}";
            }
        }
        
        return [
            'valid' => empty($errors),
            'error' => empty($errors) ? null : implode('; ', $errors),
            'warnings' => []
        ];
    }
    
    /**
     * 禁止キーワード取得
     */
    private function getBannedKeywords() {
        try {
            $stmt = $this->pdo->query("SELECT keyword FROM prohibited_keywords WHERE is_active = TRUE");
            $keywords = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            // デフォルトキーワード追加
            $defaultKeywords = ['偽物', 'コピー品', 'レプリカ', 'fake', 'replica', 'counterfeit'];
            
            return array_merge($keywords, $defaultKeywords);
        } catch (Exception $e) {
            $this->log('WARNING', '禁止キーワード取得エラー: ' . $e->getMessage());
            return ['偽物', 'コピー品', 'レプリカ', 'fake', 'replica', 'counterfeit'];
        }
    }
    
    /**
     * HTML説明文生成
     */
    private function generateEnhancedDescription($item) {
        try {
            // HTMLテンプレート管理システム呼び出し
            require_once __DIR__ . '/ProductHTMLGenerator.php';
            $htmlGenerator = new ProductHTMLGenerator();
            
            $enhancedHtml = $htmlGenerator->generateHTMLDescription($item);
            
            return $enhancedHtml;
            
        } catch (Exception $e) {
            $this->log('WARNING', 'HTML生成エラー: ' . $e->getMessage());
            
            // フォールバック: シンプルなHTML生成
            return $this->generateSimpleDescription($item);
        }
    }
    
    /**
     * シンプルHTML説明生成（フォールバック）
     */
    private function generateSimpleDescription($item) {
        $title = htmlspecialchars($item['Title'] ?? 'Product');
        $description = htmlspecialchars($item['Description'] ?? '');
        $condition = htmlspecialchars($item['ConditionDescription'] ?? 'Used');
        
        return "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px;'>
            <h2 style='color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 10px;'>{$title}</h2>
            <p><strong>Condition:</strong> {$condition}</p>
            <p><strong>Description:</strong> {$description}</p>
            <div style='background: #e7f3ff; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #2c5aa0;'>
                <h4 style='margin: 0 0 10px 0; color: #2c5aa0;'>🇯🇵 Authentic from Japan</h4>
                <p style='margin: 0;'>Fast and secure international shipping with tracking included.</p>
            </div>
            <div style='background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border: 1px solid #ddd;'>
                <h4 style='color: #2c5aa0; margin: 0 0 10px 0;'>✅ Our Promise</h4>
                <ul style='margin: 0; padding-left: 20px;'>
                    <li>Item exactly as described</li>
                    <li>Secure packaging</li>
                    <li>30-day return policy</li>
                    <li>Excellent customer service</li>
                </ul>
            </div>
        </div>
        ";
    }
    
    /**
     * eBay出品API実行
     */
    private function executeEbayListing($item) {
        try {
            // eBay API用XMLリクエスト構築
            $xmlRequest = $this->buildAddItemRequest($item);
            
            // API呼び出し実行
            $response = $this->callEbayApi('AddItem', $xmlRequest);
            
            // レスポンス解析
            $result = $this->parseEbayResponse($response);
            
            if ($result['success']) {
                return [
                    'success' => true,
                    'item_id' => $result['item_id'],
                    'listing_url' => $this->buildListingUrl($result['item_id']),
                    'fees' => $result['fees'] ?? []
                ];
            } else {
                return [
                    'success' => false,
                    'error' => $result['error']
                ];
            }
            
        } catch (Exception $e) {
            $this->log('ERROR', 'eBay API呼び出しエラー: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * eBay AddItemリクエスト構築
     */
    private function buildAddItemRequest($item) {
        $xml = '<?xml version="1.0" encoding="utf-8"?>
        <AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
            <RequesterCredentials>
                <eBayAuthToken>' . $this->ebayConfig['user_token'] . '</eBayAuthToken>
            </RequesterCredentials>
            <ErrorLanguage>en_US</ErrorLanguage>
            <WarningLevel>High</WarningLevel>
            <Item>
                <Title>' . htmlspecialchars($item['Title']) . '</Title>
                <Description><![CDATA[' . $item['Description'] . ']]></Description>
                <PrimaryCategory>
                    <CategoryID>' . ($item['CategoryID'] ?? '11450') . '</CategoryID>
                </PrimaryCategory>
                <StartPrice>' . number_format($item['StartPrice'] ?? $item['BuyItNowPrice'] ?? 9.99, 2) . '</StartPrice>
                <CategoryMappingAllowed>true</CategoryMappingAllowed>
                <Country>JP</Country>
                <Currency>USD</Currency>
                <DispatchTimeMax>3</DispatchTimeMax>
                <ListingDuration>GTC</ListingDuration>
                <ListingType>FixedPriceItem</ListingType>
                <PaymentMethods>PayPal</PaymentMethods>
                <PayPalEmailAddress>' . ($this->ebayConfig['paypal_email'] ?? 'test@example.com') . '</PayPalEmailAddress>
                <Quantity>' . ($item['Quantity'] ?? 1) . '</Quantity>
                <ReturnPolicy>
                    <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>
                    <RefundOption>MoneyBack</RefundOption>
                    <ReturnsWithinOption>Days_30</ReturnsWithinOption>
                    <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
                </ReturnPolicy>
                <ShippingDetails>
                    <ShippingType>Flat</ShippingType>
                    <ShippingServiceOptions>
                        <ShippingServicePriority>1</ShippingServicePriority>
                        <ShippingService>StandardInternational</ShippingService>
                        <ShippingServiceCost>' . ($item['ShippingCost'] ?? '15.00') . '</ShippingServiceCost>
                        <ShippingServiceAdditionalCost>0.00</ShippingServiceAdditionalCost>
                        <ShippingTimeMin>7</ShippingTimeMin>
                        <ShippingTimeMax>21</ShippingTimeMax>
                    </ShippingServiceOptions>
                    <InternationalShippingServiceOption>
                        <ShippingServicePriority>1</ShippingServicePriority>
                        <ShippingService>StandardInternational</ShippingService>
                        <ShippingServiceCost>' . ($item['ShippingCost'] ?? '15.00') . '</ShippingServiceCost>
                        <ShippingServiceAdditionalCost>0.00</ShippingServiceAdditionalCost>
                        <ShippingTimeMin>7</ShippingTimeMin>
                        <ShippingTimeMax>21</ShippingTimeMax>
                        <ShipToLocation>Worldwide</ShipToLocation>
                    </InternationalShippingServiceOption>
                </ShippingDetails>
                <Site>US</Site>
                <ConditionID>' . ($item['ConditionID'] ?? '3000') . '</ConditionID>';
        
        // 画像追加
        if (!empty($item['PictureURL'])) {
            $xml .= '<PictureDetails>';
            if (is_array($item['PictureURL'])) {
                foreach (array_slice($item['PictureURL'], 0, 12) as $imageUrl) {
                    $xml .= '<PictureURL>' . htmlspecialchars($imageUrl) . '</PictureURL>';
                }
            } else {
                $xml .= '<PictureURL>' . htmlspecialchars($item['PictureURL']) . '</PictureURL>';
            }
            $xml .= '</PictureDetails>';
        }
        
        $xml .= '
            </Item>
        </AddItemRequest>';
        
        return $xml;
    }
    
    /**
     * eBay API呼び出し
     */
    private function callEbayApi($callName, $xmlRequest, $retryCount = 0) {
        $headers = [
            'X-EBAY-API-COMPATIBILITY-LEVEL: ' . $this->ebayConfig['compatibility_level'],
            'X-EBAY-API-DEV-NAME: ' . $this->ebayConfig['dev_id'],
            'X-EBAY-API-APP-NAME: ' . $this->ebayConfig['app_id'],
            'X-EBAY-API-CERT-NAME: ' . $this->ebayConfig['cert_id'],
            'X-EBAY-API-CALL-NAME: ' . $callName,
            'X-EBAY-API-SITEID: ' . $this->ebayConfig['site_id'],
            'Content-Type: text/xml',
            'Content-Length: ' . strlen($xmlRequest)
        ];
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->ebayConfig['api_endpoint'],
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xmlRequest,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->ebayConfig['timeout'],
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        if ($curlError) {
            throw new Exception("CURL エラー: {$curlError}");
        }
        
        if ($httpCode !== 200) {
            if ($retryCount < $this->ebayConfig['retry_count']) {
                $this->log('WARNING', "HTTP {$httpCode} - リトライ {$retryCount + 1}/{$this->ebayConfig['retry_count']}");
                usleep($this->ebayConfig['retry_delay'] * 1000);
                return $this->callEbayApi($callName, $xmlRequest, $retryCount + 1);
            }
            throw new Exception("HTTP エラー: {$httpCode}");
        }
        
        return $response;
    }
    
    /**
     * eBayレスポンス解析
     */
    private function parseEbayResponse($xmlResponse) {
        try {
            $xml = simplexml_load_string($xmlResponse);
            
            if ($xml === false) {
                throw new Exception('XMLパース失敗');
            }
            
            $ack = (string)$xml->Ack;
            
            if ($ack === 'Success' || $ack === 'Warning') {
                return [
                    'success' => true,
                    'item_id' => (string)$xml->ItemID,
                    'fees' => $this->parseFees($xml),
                    'warnings' => $this->parseWarnings($xml)
                ];
            } else {
                $errors = $this->parseErrors($xml);
                return [
                    'success' => false,
                    'error' => implode('; ', $errors)
                ];
            }
            
        } catch (Exception $e) {
            $this->log('ERROR', 'レスポンス解析エラー: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'レスポンス解析失敗: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * エラー解析
     */
    private function parseErrors($xml) {
        $errors = [];
        
        if (isset($xml->Errors)) {
            foreach ($xml->Errors as $error) {
                $errorCode = (string)$error->ErrorCode;
                $errorMessage = (string)$error->LongMessage;
                $errors[] = "[{$errorCode}] {$errorMessage}";
            }
        }
        
        return $errors;
    }
    
    /**
     * 警告解析
     */
    private function parseWarnings($xml) {
        $warnings = [];
        
        if (isset($xml->Errors)) {
            foreach ($xml->Errors as $error) {
                $severity = (string)$error->SeverityCode;
                if ($severity === 'Warning') {
                    $errorCode = (string)$error->ErrorCode;
                    $errorMessage = (string)$error->LongMessage;
                    $warnings[] = "[{$errorCode}] {$errorMessage}";
                }
            }
        }
        
        return $warnings;
    }
    
    /**
     * 手数料解析
     */
    private function parseFees($xml) {
        $fees = [];
        
        if (isset($xml->Fees->Fee)) {
            foreach ($xml->Fees->Fee as $fee) {
                $feeName = (string)$fee->Name;
                $feeAmount = (float)$fee->Fee;
                $fees[$feeName] = $feeAmount;
            }
        }
        
        return $fees;
    }
    
    /**
     * リスティングURL構築
     */
    private function buildListingUrl($itemId) {
        $baseUrl = $this->ebayConfig['sandbox'] 
            ? 'https://www.sandbox.ebay.com'
            : 'https://www.ebay.com';
            
        return "{$baseUrl}/itm/{$itemId}";
    }
    
    /**
     * 成功後データベース更新
     */
    private function updateDatabaseAfterSuccess($item, $listingResult) {
        try {
            // 商品マスター更新
            if (isset($item['master_sku'])) {
                $sql = "UPDATE product_master SET 
                        listing_status = 'listed',
                        ebay_item_id = :ebay_item_id,
                        listing_date = NOW(),
                        updated_at = NOW()
                        WHERE master_sku = :master_sku";
                
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([
                    'ebay_item_id' => $listingResult['item_id'],
                    'master_sku' => $item['master_sku']
                ]);
            }
            
            // 出品履歴記録
            $sql = "INSERT INTO ebay_listing_history 
                    (ebay_item_id, title, start_price, listing_date, status, fees_data)
                    VALUES (:ebay_item_id, :title, :start_price, NOW(), 'active', :fees_data)";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                'ebay_item_id' => $listingResult['item_id'],
                'title' => $item['Title'],
                'start_price' => $item['StartPrice'] ?? $item['BuyItNowPrice'] ?? 0,
                'fees_data' => json_encode($listingResult['fees'] ?? [])
            ]);
            
            $this->log('INFO', "データベース更新完了: {$listingResult['item_id']}");
            
        } catch (Exception $e) {
            $this->log('ERROR', 'データベース更新エラー: ' . $e->getMessage());
            // データベース更新エラーは出品成功を阻害しない
        }
    }
    
    /**
     * 出品シミュレーション（テスト用）
     */
    private function simulateListing($item) {
        // ドライランモード用のシミュレーション
        $simulatedItemId = 'DRY_' . time() . '_' . mt_rand(1000, 9999);
        
        $this->log('INFO', "出品シミュレーション: {$simulatedItemId}");
        
        return [
            'success' => true,
            'item_id' => $simulatedItemId,
            'listing_url' => "https://simulator.example.com/item/{$simulatedItemId}",
            'fees' => ['InsertionFee' => 0.35, 'FinalValueFee' => 0.00]
        ];
    }
    
    /**
     * eBay接続テスト
     */
    private function testEbayConnection() {
        try {
            $testRequest = '<?xml version="1.0" encoding="utf-8"?>
            <GeteBayOfficialTimeRequest xmlns="urn:ebay:apis:eBLBaseComponents">
                <RequesterCredentials>
                    <eBayAuthToken>' . $this->ebayConfig['user_token'] . '</eBayAuthToken>
                </RequesterCredentials>
            </GeteBayOfficialTimeRequest>';
            
            $response = $this->callEbayApi('GeteBayOfficialTime', $testRequest);
            $result = $this->parseEbayResponse($response);
            
            if ($result['success']) {
                return $this->sendSuccessResponse([
                    'status' => 'connected',
                    'message' => 'eBay API接続成功',
                    'sandbox_mode' => $this->ebayConfig['sandbox']
                ]);
            } else {
                throw new Exception($result['error']);
            }
            
        } catch (Exception $e) {
            return $this->sendErrorResponse('eBay API接続テスト失敗: ' . $e->getMessage());
        }
    }
    
    /**
     * 出品状況取得
     */
    private function getListingStatus() {
        try {
            $sql = "SELECT 
                        COUNT(*) as total_listings,
                        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_listings,
                        COUNT(CASE WHEN status = 'ended' THEN 1 END) as ended_listings,
                        SUM(CASE WHEN fees_data IS NOT NULL THEN (fees_data->>'InsertionFee')::DECIMAL ELSE 0 END) as total_fees
                    FROM ebay_listing_history 
                    WHERE listing_date >= CURRENT_DATE - INTERVAL '30 days'";
            
            $stmt = $this->pdo->query($sql);
            $stats = $stmt->fetch();
            
            return $this->sendSuccessResponse($stats);
            
        } catch (Exception $e) {
            return $this->sendErrorResponse('出品状況取得エラー: ' . $e->getMessage());
        }
    }
    
    /**
     * 在庫状況更新
     */
    private function updateInventoryStatus() {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            $itemId = $data['item_id'] ?? null;
            $quantity = $data['quantity'] ?? null;
            
            if (!$itemId || $quantity === null) {
                throw new Exception('必要なパラメータが不足しています');
            }
            
            // eBay在庫更新API呼び出し
            $result = $this->updateEbayInventory($itemId, $quantity);
            
            if ($result['success']) {
                // データベース更新
                $sql = "UPDATE ebay_listing_history SET 
                        quantity = :quantity, 
                        updated_at = NOW() 
                        WHERE ebay_item_id = :item_id";
                
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([
                    'quantity' => $quantity,
                    'item_id' => $itemId
                ]);
                
                return $this->sendSuccessResponse(['message' => '在庫更新完了']);
            } else {
                throw new Exception($result['error']);
            }
            
        } catch (Exception $e) {
            return $this->sendErrorResponse('在庫更新エラー: ' . $e->getMessage());
        }
    }
    
    /**
     * eBay在庫更新
     */
    private function updateEbayInventory($itemId, $quantity) {
        try {
            $xmlRequest = '<?xml version="1.0" encoding="utf-8"?>
            <ReviseFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
                <RequesterCredentials>
                    <eBayAuthToken>' . $this->ebayConfig['user_token'] . '</eBayAuthToken>
                </RequesterCredentials>
                <Item>
                    <ItemID>' . $itemId . '</ItemID>
                    <Quantity>' . $quantity . '</Quantity>
                </Item>
            </ReviseFixedPriceItemRequest>';
            
            $response = $this->callEbayApi('ReviseFixedPriceItem', $xmlRequest);
            return $this->parseEbayResponse($response);
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 結果サマリー作成
     */
    private function createResultSummary($results) {
        return [
            'total_items' => $results['total_processed'],
            'success_count' => count($results['success_items']),
            'error_count' => count($results['failed_items']),
            'success_items' => $results['success_items'],
            'failed_items' => $results['failed_items'],
            'processing_time' => date('Y-m-d H:i:s'),
            'summary' => [
                'success_rate' => $results['total_processed'] > 0 
                    ? round((count($results['success_items']) / $results['total_processed']) * 100, 2)
                    : 0,
                'total_fees' => $this->calculateTotalFees($results['success_items'])
            ]
        ];
    }
    
    /**
     * 総手数料計算
     */
    private function calculateTotalFees($successItems) {
        $totalFees = 0;
        
        foreach ($successItems as $item) {
            if (isset($item['fees']) && is_array($item['fees'])) {
                $totalFees += array_sum($item['fees']);
            }
        }
        
        return round($totalFees, 2);
    }
    
    /**
     * リクエストデータ取得
     */
    private function getRequestData() {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('無効なJSONデータ: ' . json_last_error_msg());
        }
        
        return $data;
    }
    
    /**
     * 成功レスポンス送信
     */
    private function sendSuccessResponse($data) {
        $response = [
            'success' => true,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s'),
            'server_time' => time()
        ];
        
        return json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    }
    
    /**
     * エラーレスポンス送信
     */
    private function sendErrorResponse($message) {
        $response = [
            'success' => false,
            'error' => $message,
            'timestamp' => date('Y-m-d H:i:s'),
            'server_time' => time()
        ];
        
        return json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    }
    
    /**
     * ログ出力
     */
    private function log($level, $message) {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
        
        // ファイル出力
        file_put_contents($this->logFile, $logMessage, FILE_APPEND | LOCK_EX);
        
        // 開発環境ではコンソール出力
        if ($_ENV['APP_ENV'] === 'development') {
            error_log($logMessage);
        }
    }
}

// メイン処理実行
try {
    $handler = new EbayListingApiHandler();
    echo $handler->handleRequest();
} catch (Exception $e) {
    $errorResponse = [
        'success' => false,
        'error' => '重大なエラーが発生しました: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode($errorResponse, JSON_UNESCAPED_UNICODE);
    http_response_code(500);
}
?>