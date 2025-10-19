<?php
/**
 * Shopee CSV一括処理システム
 * 出品・在庫更新・価格更新対応
 */

class ShopeeCSVProcessor {
    
    private $pdo;
    private $apiClient;
    private $validationRules;
    private $processedResults;
    
    public function __construct($dbConnection, $apiClient) {
        $this->pdo = $dbConnection;
        $this->apiClient = $apiClient;
        $this->initValidationRules();
        $this->processedResults = [];
    }
    
    /**
     * CSVテンプレート生成
     */
    public function generateCSVTemplate($templateType = 'listing') {
        switch ($templateType) {
            case 'listing':
                return $this->generateListingTemplate();
            case 'inventory':
                return $this->generateInventoryTemplate();
            case 'pricing':
                return $this->generatePricingTemplate();
            default:
                throw new Exception('無効なテンプレートタイプ');
        }
    }
    
    /**
     * 出品用CSVテンプレート
     */
    private function generateListingTemplate() {
        $headers = [
            'sku',                  // 必須: 商品管理番号
            'countries',            // 必須: 出品対象国（SG|MY|TH形式）
            'item_name_en',         // 必須: 英語商品名
            'item_name_ja',         // 任意: 日本語商品名（管理用）
            'item_name_tw',         // 任意: 台湾向け中国語商品名
            'category_id',          // 必須: ShopeeカテゴリーID
            'price_jpy',            // 必須: 日本円価格（自動通貨変換）
            'stock',                // 必須: 在庫数
            'weight_g',             // 任意: 重量（グラム）
            'brand',                // 任意: ブランド名
            'description',          // 任意: 商品説明
            'image_url1',           // 任意: 画像URL1（メイン）
            'image_url2',           // 任意: 画像URL2
            'image_url3',           // 任意: 画像URL3
            'image_url4',           // 任意: 画像URL4
            'image_url5',           // 任意: 画像URL5
            'ebay_product_id',      // 任意: eBay商品IDの連携用
            'auto_pricing',         // 任意: 自動価格調整 (yes/no)
            'markup_percent',       // 任意: 価格マークアップ率
            'notes'                 // 任意: メモ欄
        ];
        
        $sampleData = [
            [
                'SAMPLE-001',
                'SG|MY|TH',
                'Premium Wireless Headphones',
                'プレミアムワイヤレスヘッドフォン',
                '高級無線耳機',
                '100001',
                '8900',
                '50',
                '350',
                'AudioTech',
                'High-quality wireless headphones with noise cancellation feature. Perfect for music lovers and professionals.',
                'https://example.com/headphones-main.jpg',
                'https://example.com/headphones-side.jpg',
                'https://example.com/headphones-box.jpg',
                '',
                '',
                '',
                'yes',
                '15',
                'High-demand electronics item'
            ],
            [
                'SAMPLE-002',
                'SG',
                'Japanese Kitchen Knife Set',
                '日本製包丁セット',
                '',
                '100003',
                '12500',
                '25',
                '800',
                'Tokyo Steel',
                'Professional Japanese kitchen knife set made from high-carbon steel. Includes chef knife, utility knife, and paring knife.',
                'https://example.com/knives-set.jpg',
                'https://example.com/knives-detail.jpg',
                '',
                '',
                '',
                '123',
                'no',
                '',
                'Premium kitchen tools from existing eBay stock'
            ]
        ];
        
        return $this->generateCSVContent($headers, $sampleData);
    }
    
    /**
     * 在庫更新用CSVテンプレート
     */
    private function generateInventoryTemplate() {
        $headers = [
            'sku',              // 必須: 商品管理番号
            'country',          // 任意: 特定国のみ更新（空白=全国）
            'new_stock',        // 必須: 新しい在庫数
            'operation',        // 任意: set/add/subtract
            'reason',           // 任意: 更新理由
            'notify_low_stock'  // 任意: 低在庫アラート (yes/no)
        ];
        
        $sampleData = [
            ['SAMPLE-001', '', '100', 'set', '新規入荷', 'yes'],
            ['SAMPLE-002', 'SG', '50', 'add', '追加入荷', 'no'],
            ['SAMPLE-003', 'MY', '0', 'set', '完売', 'no']
        ];
        
        return $this->generateCSVContent($headers, $sampleData);
    }
    
    /**
     * 価格更新用CSVテンプレート
     */
    private function generatePricingTemplate() {
        $headers = [
            'sku',
            'country',
            'new_price_jpy',
            'operation',        // set/increase/decrease
            'percentage',       // 増減率（%）
            'effective_date',   // 有効日（YYYY-MM-DD）
            'reason'
        ];
        
        $sampleData = [
            ['SAMPLE-001', '', '7900', 'set', '', '2024-01-15', 'セール価格'],
            ['SAMPLE-002', 'SG', '', 'decrease', '10', '2024-01-10', '在庫処分'],
        ];
        
        return $this->generateCSVContent($headers, $sampleData);
    }
    
    /**
     * CSV内容生成
     */
    private function generateCSVContent($headers, $sampleData) {
        $csv = implode(',', $headers) . "\n";
        
        foreach ($sampleData as $row) {
            $csv .= '"' . implode('","', $row) . '"' . "\n";
        }
        
        return $csv;
    }
    
    /**
     * CSV一括出品処理
     */
    public function processBulkListing($csvContent, $options = []) {
        $this->processedResults = [
            'total_rows' => 0,
            'successful' => 0,
            'failed' => 0,
            'skipped' => 0,
            'errors' => [],
            'details' => []
        ];
        
        try {
            // CSV解析
            $data = $this->parseCSV($csvContent);
            $this->processedResults['total_rows'] = count($data);
            
            // 処理開始ログ
            $operationId = $this->logBulkOperation('listing', 'csv', count($data));
            
            foreach ($data as $index => $row) {
                $rowNumber = $index + 2; // ヘッダー行を考慮
                
                try {
                    // データ検証
                    $validatedData = $this->validateListingData($row, $rowNumber);
                    
                    // 重複チェック
                    if ($this->isDuplicateListing($validatedData)) {
                        $this->processedResults['skipped']++;
                        $this->processedResults['details'][$rowNumber] = [
                            'sku' => $validatedData['sku'],
                            'status' => 'skipped',
                            'reason' => '既存商品のため'
                        ];
                        continue;
                    }
                    
                    // 国別出品処理
                    $countries = explode('|', $validatedData['countries']);
                    $countryResults = [];
                    
                    foreach ($countries as $country) {
                        $country = trim($country);
                        if (empty($country)) continue;
                        
                        $result = $this->processSingleCountryListing($validatedData, $country);
                        $countryResults[$country] = $result;
                        
                        if ($result['success']) {
                            $this->processedResults['successful']++;
                        } else {
                            $this->processedResults['failed']++;
                            $this->processedResults['errors'][] = 
                                "行{$rowNumber}({$country}): " . $result['error'];
                        }
                        
                        // API制限対応
                        usleep(150000); // 0.15秒待機
                    }
                    
                    $this->processedResults['details'][$rowNumber] = [
                        'sku' => $validatedData['sku'],
                        'countries' => $countryResults,
                        'overall_status' => $this->determineOverallStatus($countryResults)
                    ];
                    
                } catch (Exception $e) {
                    $this->processedResults['failed']++;
                    $this->processedResults['errors'][] = "行{$rowNumber}: " . $e->getMessage();
                    
                    $this->processedResults['details'][$rowNumber] = [
                        'sku' => $row['sku'] ?? 'N/A',
                        'status' => 'error',
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            // 操作完了ログ
            $this->completeBulkOperation($operationId, $this->processedResults);
            
            return $this->processedResults;
            
        } catch (Exception $e) {
            throw new Exception('CSV一括出品処理エラー: ' . $e->getMessage());
        }
    }
    
    /**
     * CSV在庫一括更新処理
     */
    public function processBulkInventoryUpdate($csvContent) {
        $results = [
            'total_rows' => 0,
            'successful' => 0,
            'failed' => 0,
            'errors' => []
        ];
        
        try {
            $data = $this->parseCSV($csvContent);
            $results['total_rows'] = count($data);
            
            $operationId = $this->logBulkOperation('inventory_update', 'csv', count($data));
            
            foreach ($data as $index => $row) {
                $rowNumber = $index + 2;
                
                try {
                    $validatedData = $this->validateInventoryData($row);
                    $updateResult = $this->executeInventoryUpdate($validatedData);
                    
                    if ($updateResult['success']) {
                        $results['successful'] += $updateResult['affected_count'];
                    } else {
                        $results['failed']++;
                        $results['errors'][] = "行{$rowNumber}: " . $updateResult['error'];
                    }
                    
                } catch (Exception $e) {
                    $results['failed']++;
                    $results['errors'][] = "行{$rowNumber}: " . $e->getMessage();
                }
            }
            
            $this->completeBulkOperation($operationId, $results);
            return $results;
            
        } catch (Exception $e) {
            throw new Exception('CSV在庫更新処理エラー: ' . $e->getMessage());
        }
    }
    
    /**
     * CSV解析
     */
    private function parseCSV($csvContent) {
        $lines = array_filter(explode("\n", $csvContent));
        
        if (count($lines) < 2) {
            throw new Exception('CSVファイルが空または不正な形式です');
        }
        
        // ヘッダー行処理
        $headers = str_getcsv($lines[0]);
        $headers = array_map('trim', $headers);
        
        $data = [];
        for ($i = 1; $i < count($lines); $i++) {
            $row = str_getcsv($lines[$i]);
            if (count($row) !== count($headers)) {
                throw new Exception("行" . ($i + 1) . ": カラム数が不一致です");
            }
            
            $data[] = array_combine($headers, array_map('trim', $row));
        }
        
        return $data;
    }
    
    /**
     * 出品データ検証
     */
    private function validateListingData($data, $rowNumber) {
        $required = ['sku', 'countries', 'item_name_en', 'category_id', 'price_jpy', 'stock'];
        
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("必須項目 '{$field}' が空です");
            }
        }
        
        // SKU重複チェック
        if (!preg_match('/^[A-Za-z0-9\-_]+$/', $data['sku'])) {
            throw new Exception('SKUは英数字、ハイフン、アンダースコアのみ使用可能です');
        }
        
        // 価格検証
        if (!is_numeric($data['price_jpy']) || $data['price_jpy'] <= 0) {
            throw new Exception('価格は正の数値である必要があります');
        }
        
        // 在庫検証
        if (!is_numeric($data['stock']) || $data['stock'] < 0) {
            throw new Exception('在庫数は0以上の数値である必要があります');
        }
        
        // 国コード検証
        $countries = explode('|', $data['countries']);
        $validCountries = ['SG', 'MY', 'TH', 'PH', 'ID', 'VN', 'TW'];
        
        foreach ($countries as $country) {
            $country = trim($country);
            if (!in_array($country, $validCountries)) {
                throw new Exception("無効な国コード: {$country}");
            }
        }
        
        // 画像URL検証
        for ($i = 1; $i <= 5; $i++) {
            $imageKey = "image_url{$i}";
            if (!empty($data[$imageKey]) && !filter_var($data[$imageKey], FILTER_VALIDATE_URL)) {
                throw new Exception("画像URL{$i}が無効な形式です");
            }
        }
        
        return $data;
    }
    
    /**
     * 在庫データ検証
     */
    private function validateInventoryData($data) {
        if (empty($data['sku'])) {
            throw new Exception('SKUは必須です');
        }
        
        if (!is_numeric($data['new_stock']) || $data['new_stock'] < 0) {
            throw new Exception('新しい在庫数は0以上の数値である必要があります');
        }
        
        $validOperations = ['set', 'add', 'subtract'];
        $operation = $data['operation'] ?? 'set';
        
        if (!in_array($operation, $validOperations)) {
            throw new Exception("無効な操作: {$operation}");
        }
        
        return $data;
    }
    
    /**
     * 重複出品チェック
     */
    private function isDuplicateListing($data) {
        $sql = "SELECT COUNT(*) FROM shopee_products WHERE sku = ? AND status != 'draft'";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$data['sku']]);
        
        return $stmt->fetchColumn() > 0;
    }
    
    /**
     * 単一国への出品処理
     */
    private function processSingleCountryListing($data, $country) {
        try {
            // 国別データ適応
            $countryData = $this->adaptDataForCountry($data, $country);
            
            // Shopee API呼び出し
            $apiResult = $this->apiClient->addItem($country, $countryData);
            
            if ($apiResult['success']) {
                // データベース保存
                $productId = $this->saveShopeeProduct($data, $country, $apiResult['item_id']);
                
                return [
                    'success' => true,
                    'item_id' => $apiResult['item_id'],
                    'product_id' => $productId
                ];
            } else {
                return [
                    'success' => false,
                    'error' => $apiResult['error']
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 在庫更新実行
     */
    private function executeInventoryUpdate($data) {
        try {
            $sku = $data['sku'];
            $newStock = (int)$data['new_stock'];
            $operation = $data['operation'] ?? 'set';
            $country = $data['country'] ?? null;
            
            // 対象商品取得
            $products = $this->getShopeeProducts($sku, $country);
            
            if (empty($products)) {
                return [
                    'success' => false,
                    'error' => 'SKU に該当する商品が見つかりません'
                ];
            }
            
            $successCount = 0;
            $errors = [];
            
            foreach ($products as $product) {
                try {
                    $finalStock = $this->calculateNewStock($product['stock'], $newStock, $operation);
                    
                    // Shopee API呼び出し
                    $updateResult = $this->apiClient->updateStock(
                        $product['country'],
                        $product['shopee_item_id'],
                        $finalStock
                    );
                    
                    if ($updateResult['success']) {
                        // ローカルDB更新
                        $this->updateProductStock($product['id'], $finalStock);
                        $successCount++;
                        
                        // 履歴記録
                        $this->recordInventoryHistory(
                            $product['id'],
                            $product['stock'],
                            $finalStock,
                            $data['reason'] ?? 'CSV更新'
                        );
                        
                    } else {
                        $errors[] = "{$product['country']}: " . $updateResult['error'];
                    }
                    
                } catch (Exception $e) {
                    $errors[] = "{$product['country']}: " . $e->getMessage();
                }
            }
            
            if ($successCount > 0) {
                return [
                    'success' => true,
                    'affected_count' => $successCount,
                    'errors' => $errors
                ];
            } else {
                return [
                    'success' => false,
                    'error' => implode(', ', $errors)
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 新在庫数計算
     */
    private function calculateNewStock($currentStock, $value, $operation) {
        switch ($operation) {
            case 'set':
                return $value;
            case 'add':
                return $currentStock + $value;
            case 'subtract':
                return max(0, $currentStock - $value);
            default:
                return $value;
        }
    }
    
    /**
     * 商品データの国別適応
     */
    private function adaptDataForCountry($data, $country) {
        // 通貨変換
        $localPrice = $this->convertCurrency($data['price_jpy'], 'JPY', $country);
        
        // 商品名の選択
        $itemName = $data['item_name_en'];
        if ($country === 'TW' && !empty($data['item_name_tw'])) {
            $itemName = $data['item_name_tw'];
        }
        
        // 画像URL配列作成
        $imageUrls = [];
        for ($i = 1; $i <= 5; $i++) {
            if (!empty($data["image_url{$i}"])) {
                $imageUrls[] = $data["image_url{$i}"];
            }
        }
        
        return [
            'item_name' => $itemName,
            'description' => $data['description'] ?? '',
            'item_sku' => $data['sku'],
            'category_id' => (int)$data['category_id'],
            'price' => $localPrice,
            'stock' => (int)$data['stock'],
            'weight' => (float)($data['weight_g'] ?? 400) / 1000, // グラム→キログラム
            'dimension' => [
                'package_length' => 15,
                'package_width' => 10,
                'package_height' => 5
            ],
            'image' => [
                'image_url_list' => $imageUrls
            ],
            'brand' => [
                'brand_id' => 0,
                'original_brand_name' => $data['brand'] ?? ''
            ],
            'item_status' => 'NORMAL'
        ];
    }
    
    /**
     * 通貨変換
     */
    private function convertCurrency($amount, $fromCurrency, $toCountry) {
        $sql = "
            SELECT er.exchange_rate 
            FROM exchange_rates er
            JOIN shopee_country_settings scs ON er.to_currency = scs.currency_code
            WHERE er.from_currency = ? AND scs.country_code = ? AND er.is_active = TRUE
            ORDER BY er.effective_from DESC
            LIMIT 1
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$fromCurrency, $toCountry]);
        $rate = $stmt->fetchColumn();
        
        if (!$rate) {
            throw new Exception("通貨変換レートが見つかりません: {$fromCurrency} -> {$toCountry}");
        }
        
        return round($amount * $rate, 2);
    }
    
    /**
     * Shopee商品データ保存
     */
    private function saveShopeeProduct($data, $country, $shopeeItemId) {
        $sql = "
            INSERT INTO shopee_products (
                sku, country, item_name, item_name_ja, price, local_price, local_currency,
                stock, category_id, shopee_item_id, weight, brand, description,
                image_urls, ebay_product_id, status, listing_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
        ";
        
        $imageUrls = [];
        for ($i = 1; $i <= 5; $i++) {
            if (!empty($data["image_url{$i}"])) {
                $imageUrls[] = $data["image_url{$i}"];
            }
        }
        
        $countryCurrency = $this->getCountryCurrency($country);
        $localPrice = $this->convertCurrency($data['price_jpy'], 'JPY', $country);
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $data['sku'],
            $country,
            $data['item_name_en'],
            $data['item_name_ja'] ?? '',
            $data['price_jpy'],
            $localPrice,
            $countryCurrency,
            $data['stock'],
            $data['category_id'],
            $shopeeItemId,
            ($data['weight_g'] ?? 400) / 1000,
            $data['brand'] ?? '',
            $data['description'] ?? '',
            json_encode($imageUrls),
            !empty($data['ebay_product_id']) ? $data['ebay_product_id'] : null
        ]);
        
        return $this->pdo->lastInsertId();
    }
    
    /**
     * 検証ルール初期化
     */
    private function initValidationRules() {
        $this->validationRules = [
            'sku' => ['required', 'max:100', 'regex:/^[A-Za-z0-9\-_]+$/'],
            'item_name_en' => ['required', 'max:500'],
            'price_jpy' => ['required', 'numeric', 'min:1'],
            'stock' => ['required', 'integer', 'min:0'],
            'category_id' => ['required', 'integer'],
            'weight_g' => ['numeric', 'min:1', 'max:30000']
        ];
    }
    
    // その他のヘルパーメソッド...
    
    private function getCountryCurrency($country) {
        $currencies = [
            'SG' => 'SGD', 'MY' => 'MYR', 'TH' => 'THB',
            'PH' => 'PHP', 'ID' => 'IDR', 'VN' => 'VND', 'TW' => 'TWD'
        ];
        return $currencies[$country] ?? 'SGD';
    }
    
    private function getShopeeProducts($sku, $country = null) {
        $sql = "SELECT * FROM shopee_products WHERE sku = ? AND status = 'active'";
        $params = [$sku];
        
        if ($country) {
            $sql .= " AND country = ?";
            $params[] = $country;
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    private function updateProductStock($productId, $newStock) {
        $sql = "UPDATE shopee_products SET stock = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$newStock, $productId]);
    }
    
    private function recordInventoryHistory($productId, $oldStock, $newStock, $reason) {
        $sql = "
            INSERT INTO inventory_sync_history 
            (shopee_product_id, old_stock, new_stock, sync_source, sync_status, reason, synced_at)
            VALUES (?, ?, ?, 'csv', 'success', ?, NOW())
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$productId, $oldStock, $newStock, $reason]);
    }
    
    private function logBulkOperation($type, $method, $totalItems) {
        $sql = "
            INSERT INTO bulk_operations 
            (operation_type, operation_method, total_items, started_at)
            VALUES (?, ?, ?, NOW())
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$type, $method, $totalItems]);
        return $this->pdo->lastInsertId();
    }
    
    private function completeBulkOperation($operationId, $results) {
        $sql = "
            UPDATE bulk_operations 
            SET successful_items = ?, failed_items = ?, execution_details = ?, 
                completed_at = NOW()
            WHERE id = ?
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $results['successful'],
            $results['failed'],
            json_encode($results),
            $operationId
        ]);
    }
    
    private function determineOverallStatus($countryResults) {
        $successCount = 0;
        $totalCount = count($countryResults);
        
        foreach ($countryResults as $result) {
            if (isset($result['success']) && $result['success']) {
                $successCount++;
            }
        }
        
        if ($successCount === $totalCount) {
            return 'all_success';
        } elseif ($successCount > 0) {
            return 'partial_success';
        } else {
            return 'all_failed';
        }
    }
}

// API エンドポイント
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    
    try {
        $action = $_POST['action'] ?? '';
        $pdo = new PDO('mysql:host=localhost;dbname=your_db', 'user', 'pass');
        $apiClient = new ShopeeAPIClient($pdo);
        $processor = new ShopeeCSVProcessor($pdo, $apiClient);
        
        switch ($action) {
            case 'download_template':
                $templateType = $_POST['template_type'] ?? 'listing';
                $template = $processor->generateCSVTemplate($templateType);
                
                header('Content-Type: text/csv');
                header("Content-Disposition: attachment; filename=\"shopee_{$templateType}_template.csv\"");
                echo $template;
                exit;
                
            case 'process_listing_csv':
                if (!isset($_FILES['csv_file'])) {
                    throw new Exception('CSVファイルがアップロードされていません');
                }
                
                $csvContent = file_get_contents($_FILES['csv_file']['tmp_name']);
                $result = $processor->processBulkListing($csvContent);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
                
            case 'process_inventory_csv':
                if (!isset($_FILES['csv_file'])) {
                    throw new Exception('CSVファイルがアップロードされていません');
                }
                
                $csvContent = file_get_contents($_FILES['csv_file']['tmp_name']);
                $result = $processor->processBulkInventoryUpdate($csvContent);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
                
            default:
                throw new Exception('無効なアクション');
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>