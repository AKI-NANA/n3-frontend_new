<?php
/**
 * Shopee 7カ国対応 出品・在庫管理API
 * 既存eBayシステムとの統合対応
 */

class ShopeeListingAPI {
    
    private $pdo;
    private $apiConfigs;
    private $ebayIntegration;
    
    public function __construct($dbConnection) {
        $this->pdo = $dbConnection;
        $this->loadAPIConfigs();
        $this->ebayIntegration = new EbayShopeeIntegration($dbConnection);
    }
    
    /**
     * Shopee API設定読み込み
     */
    private function loadAPIConfigs() {
        $stmt = $this->pdo->prepare("
            SELECT country_code, partner_id, partner_key, shop_id, access_token, api_base_url 
            FROM shopee_api_credentials 
            WHERE is_active = true
        ");
        $stmt->execute();
        
        $this->apiConfigs = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $this->apiConfigs[$row['country_code']] = $row;
        }
    }
    
    /**
     * 単一商品の出品（複数国対応）
     */
    public function singleListing($productData) {
        $results = [];
        
        foreach ($productData['countries'] as $countryCode) {
            try {
                $countryData = $this->adaptProductForCountry($productData, $countryCode);
                $apiResult = $this->callShopeeAPI($countryCode, 'add_item', $countryData);
                
                if ($apiResult['success']) {
                    // データベースに保存
                    $this->saveProductListing($productData, $countryCode, $apiResult['item_id']);
                    $results[$countryCode] = [
                        'success' => true,
                        'item_id' => $apiResult['item_id'],
                        'message' => '出品完了'
                    ];
                } else {
                    $results[$countryCode] = [
                        'success' => false,
                        'error' => $apiResult['error'],
                        'message' => '出品失敗'
                    ];
                }
                
                // API制限対応（1秒間に10リクエスト制限）
                usleep(100000); // 0.1秒待機
                
            } catch (Exception $e) {
                $results[$countryCode] = [
                    'success' => false,
                    'error' => $e->getMessage(),
                    'message' => 'システムエラー'
                ];
            }
        }
        
        return $results;
    }
    
    /**
     * CSV一括出品処理
     */
    public function csvBulkListing($csvData) {
        $results = [
            'total_rows' => 0,
            'successful' => 0,
            'failed' => 0,
            'errors' => [],
            'details' => []
        ];
        
        $lines = array_filter(explode("\n", $csvData));
        if (count($lines) < 2) {
            throw new Exception('CSVデータが不正です');
        }
        
        $headers = str_getcsv($lines[0]);
        $results['total_rows'] = count($lines) - 1;
        
        for ($i = 1; $i < count($lines); $i++) {
            $row = str_getcsv($lines[$i]);
            $productData = array_combine($headers, $row);
            
            try {
                // データ検証
                $this->validateProductData($productData);
                
                // 国別出品実行
                $countries = explode('|', $productData['countries'] ?? $productData['country'] ?? '');
                $listingResults = [];
                
                foreach ($countries as $country) {
                    $country = trim($country);
                    if (empty($country)) continue;
                    
                    $countryData = $this->adaptProductForCountry($productData, $country);
                    $apiResult = $this->callShopeeAPI($country, 'add_item', $countryData);
                    
                    if ($apiResult['success']) {
                        $this->saveProductListing($productData, $country, $apiResult['item_id']);
                        $listingResults[$country] = 'success';
                        $results['successful']++;
                    } else {
                        $listingResults[$country] = 'failed: ' . $apiResult['error'];
                        $results['failed']++;
                    }
                    
                    usleep(100000); // API制限対応
                }
                
                $results['details'][$i] = [
                    'sku' => $productData['sku'],
                    'results' => $listingResults
                ];
                
            } catch (Exception $e) {
                $results['failed']++;
                $results['errors'][] = "行{$i}: " . $e->getMessage();
                $results['details'][$i] = [
                    'sku' => $productData['sku'] ?? 'N/A',
                    'error' => $e->getMessage()
                ];
            }
        }
        
        return $results;
    }
    
    /**
     * 在庫数量一括更新
     */
    public function bulkInventoryUpdate($updates, $targetCountry = null) {
        $results = [
            'total_updates' => count($updates),
            'successful' => 0,
            'failed' => 0,
            'errors' => []
        ];
        
        foreach ($updates as $update) {
            $sku = $update['sku'];
            $newStock = (int)$update['stock'];
            
            try {
                // 対象商品の取得
                $products = $this->getShopeeProductsBySKU($sku, $targetCountry);
                
                if (empty($products)) {
                    $results['errors'][] = "SKU {$sku}: 対象商品が見つかりません";
                    $results['failed']++;
                    continue;
                }
                
                foreach ($products as $product) {
                    $updateData = [
                        'item_id' => $product['shopee_item_id'],
                        'stock' => $newStock
                    ];
                    
                    $apiResult = $this->callShopeeAPI($product['country'], 'update_stock', $updateData);
                    
                    if ($apiResult['success']) {
                        // ローカルDB更新
                        $this->updateLocalProductStock($product['id'], $newStock);
                        $results['successful']++;
                    } else {
                        $results['errors'][] = "SKU {$sku} ({$product['country']}): " . $apiResult['error'];
                        $results['failed']++;
                    }
                    
                    usleep(100000); // API制限対応
                }
                
            } catch (Exception $e) {
                $results['errors'][] = "SKU {$sku}: " . $e->getMessage();
                $results['failed']++;
            }
        }
        
        return $results;
    }
    
    /**
     * eBayデータからのShopee商品変換
     */
    public function convertEbayToShopee($ebayProductIds, $targetCountries) {
        $results = [];
        
        foreach ($ebayProductIds as $ebayId) {
            try {
                $ebayProduct = $this->ebayIntegration->getEbayProduct($ebayId);
                $shopeeData = $this->ebayIntegration->convertToShopeeFormat($ebayProduct);
                
                // 複数国に出品
                $countryResults = [];
                foreach ($targetCountries as $country) {
                    $countryData = $this->adaptProductForCountry($shopeeData, $country);
                    $apiResult = $this->callShopeeAPI($country, 'add_item', $countryData);
                    
                    if ($apiResult['success']) {
                        $this->saveProductListing($shopeeData, $country, $apiResult['item_id'], $ebayId);
                        $countryResults[$country] = 'success';
                    } else {
                        $countryResults[$country] = 'failed: ' . $apiResult['error'];
                    }
                    
                    usleep(100000);
                }
                
                $results[$ebayId] = [
                    'sku' => $ebayProduct['sku'],
                    'title' => $ebayProduct['title'],
                    'countries' => $countryResults
                ];
                
            } catch (Exception $e) {
                $results[$ebayId] = [
                    'error' => $e->getMessage()
                ];
            }
        }
        
        return $results;
    }
    
    /**
     * 商品データの国別適応
     */
    private function adaptProductForCountry($productData, $countryCode) {
        $config = $this->getCountryConfig($countryCode);
        
        // 通貨換算
        $localPrice = $this->convertPrice($productData['price'], 'JPY', $config['currency']);
        
        // 商品名の言語適応
        $itemName = $productData['item_name'] ?? $productData['item_name_en'];
        if ($countryCode === 'TW' && !empty($productData['item_name_tw'])) {
            $itemName = $productData['item_name_tw'];
        }
        
        // 説明文の適応
        $description = $this->formatDescriptionForCountry($productData['description'], $countryCode);
        
        // Shopee API形式に変換
        return [
            'item_name' => $itemName,
            'description' => $description,
            'item_sku' => $productData['sku'],
            'category_id' => $this->mapCategoryForCountry($productData['category_id'], $countryCode),
            'price' => $localPrice,
            'stock' => (int)$productData['stock'],
            'item_status' => 'NORMAL',
            'weight' => (float)($productData['weight'] ?? 0.1),
            'dimension' => [
                'package_length' => 10,
                'package_width' => 10,
                'package_height' => 10
            ],
            'image' => [
                'image_url_list' => $this->getImageUrls($productData)
            ],
            'brand' => [
                'brand_id' => 0,
                'original_brand_name' => $productData['brand'] ?? ''
            ]
        ];
    }
    
    /**
     * Shopee API呼び出し
     */
    private function callShopeeAPI($countryCode, $endpoint, $data) {
        $config = $this->apiConfigs[$countryCode] ?? null;
        if (!$config) {
            throw new Exception("国コード {$countryCode} のAPI設定が見つかりません");
        }
        
        $timestamp = time();
        $apiPath = "/api/v2/product/{$endpoint}";
        
        // 署名生成
        $signature = $this->generateSignature($config, $apiPath, $timestamp, $config['access_token']);
        
        $params = [
            'partner_id' => (int)$config['partner_id'],
            'timestamp' => $timestamp,
            'access_token' => $config['access_token'],
            'shop_id' => (int)$config['shop_id'],
            'sign' => $signature
        ];
        
        $url = $config['api_base_url'] . $apiPath . '?' . http_build_query($params);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json'
            ],
            CURLOPT_TIMEOUT => 30
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            return ['success' => false, 'error' => "HTTP Error: {$httpCode}"];
        }
        
        $result = json_decode($response, true);
        
        // ログ記録
        $this->logAPICall($countryCode, $endpoint, $data, $result);
        
        if (isset($result['error']) && $result['error'] === '') {
            return ['success' => true, 'item_id' => $result['response']['item_id'] ?? null];
        } else {
            return ['success' => false, 'error' => $result['message'] ?? 'Unknown error'];
        }
    }
    
    /**
     * 署名生成
     */
    private function generateSignature($config, $apiPath, $timestamp, $accessToken) {
        $baseString = $config['partner_id'] . $apiPath . $timestamp . $accessToken . $config['shop_id'];
        return hash_hmac('sha256', $baseString, $config['partner_key']);
    }
    
    /**
     * 商品データ検証
     */
    private function validateProductData($productData) {
        $required = ['sku', 'item_name_en', 'price', 'stock', 'category_id'];
        
        foreach ($required as $field) {
            if (empty($productData[$field])) {
                throw new Exception("必須項目 '{$field}' が不足しています");
            }
        }
        
        if (!is_numeric($productData['price']) || $productData['price'] <= 0) {
            throw new Exception("価格が不正です");
        }
        
        if (!is_numeric($productData['stock']) || $productData['stock'] < 0) {
            throw new Exception("在庫数が不正です");
        }
    }
    
    /**
     * 商品出品データ保存
     */
    private function saveProductListing($productData, $countryCode, $shopeeItemId, $ebayProductId = null) {
        $sql = "
            INSERT INTO shopee_products (
                sku, country, item_name, item_name_ja, price, stock, 
                category_id, shopee_item_id, weight, brand, description,
                image_urls, ebay_product_id, created_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'active')
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $productData['sku'],
            $countryCode,
            $productData['item_name'] ?? $productData['item_name_en'],
            $productData['item_name_ja'] ?? '',
            $productData['price'],
            $productData['stock'],
            $productData['category_id'],
            $shopeeItemId,
            $productData['weight'] ?? 0,
            $productData['brand'] ?? '',
            $productData['description'] ?? '',
            json_encode($this->getImageUrls($productData)),
            $ebayProductId
        ]);
    }
    
    /**
     * ローカル商品在庫更新
     */
    private function updateLocalProductStock($productId, $newStock) {
        $sql = "UPDATE shopee_products SET stock = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$newStock, $productId]);
    }
    
    /**
     * SKUによるShopee商品取得
     */
    private function getShopeeProductsBySKU($sku, $countryCode = null) {
        $sql = "SELECT * FROM shopee_products WHERE sku = ?";
        $params = [$sku];
        
        if ($countryCode) {
            $sql .= " AND country = ?";
            $params[] = $countryCode;
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 国設定取得
     */
    private function getCountryConfig($countryCode) {
        $configs = [
            'SG' => ['currency' => 'SGD', 'exchange_rate' => 115.0],
            'MY' => ['currency' => 'MYR', 'exchange_rate' => 34.5],
            'TH' => ['currency' => 'THB', 'exchange_rate' => 4.2],
            'PH' => ['currency' => 'PHP', 'exchange_rate' => 2.7],
            'ID' => ['currency' => 'IDR', 'exchange_rate' => 0.01],
            'VN' => ['currency' => 'VND', 'exchange_rate' => 0.0063],
            'TW' => ['currency' => 'TWD', 'exchange_rate' => 4.8]
        ];
        
        return $configs[$countryCode] ?? $configs['SG'];
    }
    
    /**
     * 通貨換算
     */
    private function convertPrice($price, $fromCurrency, $toCurrency) {
        // 実装では外部API使用またはDB保存の為替レート使用
        // 簡易実装として固定レート使用
        $rates = [
            'JPY' => ['SGD' => 0.0087, 'MYR' => 0.029, 'THB' => 0.238, 'PHP' => 0.37, 'IDR' => 100, 'VND' => 158, 'TWD' => 0.208]
        ];
        
        if ($fromCurrency === 'JPY' && isset($rates['JPY'][$toCurrency])) {
            return round($price * $rates['JPY'][$toCurrency], 2);
        }
        
        return $price; // フォールバック
    }
    
    /**
     * 画像URL抽出
     */
    private function getImageUrls($productData) {
        $urls = [];
        for ($i = 1; $i <= 9; $i++) {
            $key = "image_url{$i}";
            if (!empty($productData[$key])) {
                $urls[] = $productData[$key];
            }
        }
        return $urls;
    }
    
    /**
     * APIコール記録
     */
    private function logAPICall($countryCode, $endpoint, $requestData, $responseData) {
        $sql = "
            INSERT INTO shopee_api_logs (
                country, endpoint, request_data, response_data, 
                status, created_at
            ) VALUES (?, ?, ?, ?, ?, NOW())
        ";
        
        $status = ($responseData['error'] ?? null) === '' ? 'success' : 'error';
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $countryCode,
            $endpoint,
            json_encode($requestData),
            json_encode($responseData),
            $status
        ]);
    }
    
    /**
     * 国別カテゴリマッピング（実装時に各国のカテゴリIDに対応）
     */
    private function mapCategoryForCountry($categoryId, $countryCode) {
        // 実際は各国のカテゴリマッピングテーブルを参照
        return $categoryId;
    }
    
    /**
     * 国別説明文フォーマット
     */
    private function formatDescriptionForCountry($description, $countryCode) {
        // 各国向けの説明文調整（言語、通貨表示等）
        return $description;
    }
}

/**
 * eBay-Shopee統合クラス
 */
class EbayShopeeIntegration {
    
    private $pdo;
    
    public function __construct($dbConnection) {
        $this->pdo = $dbConnection;
    }
    
    /**
     * eBay商品データ取得
     */
    public function getEbayProduct($ebayId) {
        $sql = "SELECT * FROM ebay_products WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$ebayId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            throw new Exception("eBay商品ID {$ebayId} が見つかりません");
        }
        
        return $product;
    }
    
    /**
     * eBayデータをShopee形式に変換
     */
    public function convertToShopeeFormat($ebayProduct) {
        return [
            'sku' => $ebayProduct['sku'],
            'item_name_en' => $ebayProduct['title'],
            'item_name_ja' => $ebayProduct['title_ja'] ?? $ebayProduct['title'],
            'price' => $ebayProduct['price'],
            'stock' => $ebayProduct['quantity'],
            'category_id' => $this->mapEbayToShopeeCategory($ebayProduct['category_id']),
            'weight' => $ebayProduct['weight'] ?? $this->estimateWeight($ebayProduct),
            'brand' => $ebayProduct['brand'] ?? '',
            'description' => $this->convertDescription($ebayProduct['description']),
            'image_url1' => $ebayProduct['main_image'] ?? '',
            'image_url2' => $ebayProduct['sub_image1'] ?? '',
            'image_url3' => $ebayProduct['sub_image2'] ?? ''
        ];
    }
    
    /**
     * eBayカテゴリからShopeeカテゴリへのマッピング
     */
    private function mapEbayToShopeeCategory($ebayCategoryId) {
        // カテゴリマッピングテーブル参照
        $sql = "SELECT shopee_category_id FROM category_mappings WHERE ebay_category_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$ebayCategoryId]);
        $result = $stmt->fetchColumn();
        
        return $result ?: 100001; // デフォルトカテゴリ
    }
    
    /**
     * 重量推定（商品タイトルやカテゴリから）
     */
    private function estimateWeight($product) {
        $title = strtolower($product['title']);
        
        // 簡易的な重量推定ロジック
        if (strpos($title, 'electronics') !== false) return 500;
        if (strpos($title, 'clothing') !== false) return 200;
        if (strpos($title, 'book') !== false) return 300;
        
        return 400; // デフォルト重量
    }
    
    /**
     * 説明文変換（eBay → Shopee）
     */
    private function convertDescription($ebayDescription) {
        // HTML除去、Shopee向けフォーマット調整
        $description = strip_tags($ebayDescription);
        $description = str_replace(['&nbsp;', '&amp;'], [' ', '&'], $description);
        
        return trim($description);
    }
}

// API エンドポイント処理
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
        
        $pdo = new PDO('mysql:host=localhost;dbname=your_db', 'user', 'pass');
        $api = new ShopeeListingAPI($pdo);
        
        switch ($action) {
            case 'single_listing':
                $result = $api->singleListing($input['product_data']);
                break;
                
            case 'csv_bulk_listing':
                $result = $api->csvBulkListing($input['csv_data']);
                break;
                
            case 'bulk_inventory_update':
                $result = $api->bulkInventoryUpdate($input['updates'], $input['country'] ?? null);
                break;
                
            case 'convert_ebay_products':
                $result = $api->convertEbayToShopee($input['ebay_ids'], $input['countries']);
                break;
                
            default:
                throw new Exception('無効なアクション');
        }
        
        echo json_encode(['success' => true, 'data' => $result]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>