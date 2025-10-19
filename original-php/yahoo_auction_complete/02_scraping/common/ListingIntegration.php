<?php
/**
 * 08_listing統合フック
 * 出品完了時に在庫管理システムへ自動登録
 * 
 * 使用方法：
 * 08_listing/api/listing.php または 08_listing/includes/EbayListing.php の
 * 出品完了処理に以下のコードを追加
 */

class EbayListingInventoryIntegration {
    
    /**
     * 出品完了時のフック処理
     * 既存の出品完了処理の最後に追加
     * 
     * @param int $productId 商品ID
     * @param string $ebayItemId eBayアイテムID
     * @param array $listingData 出品データ（オプション）
     */
    public function onListingCompleted($productId, $ebayItemId, $listingData = []) {
        try {
            error_log("出品完了フック開始: 商品ID {$productId}, eBay ID {$ebayItemId}");
            
            // 1. yahoo_scraped_products テーブル更新
            $this->updateProductStatus($productId, $ebayItemId, $listingData);
            
            // 2. 在庫管理システムに自動登録
            $inventoryResult = $this->registerToInventorySystem($productId, $listingData);
            
            // 3. ログ記録
            $this->logListingCompletion($productId, $ebayItemId, $inventoryResult);
            
            return [
                'success' => true,
                'inventory_registered' => $inventoryResult['success'] ?? false,
                'message' => '出品完了・在庫管理登録完了'
            ];
            
        } catch (Exception $e) {
            error_log("出品完了後処理エラー: " . $e->getMessage());
            
            // 在庫管理登録失敗でも出品処理は成功とする
            return [
                'success' => true,
                'inventory_registered' => false,
                'error' => $e->getMessage(),
                'message' => '出品完了（在庫管理登録は失敗）'
            ];
        }
    }
    
    /**
     * 商品ステータス更新
     */
    private function updateProductStatus($productId, $ebayItemId, $listingData = []) {
        try {
            $pdo = $this->getDatabaseConnection();
            
            $updateData = [
                'ebay_item_id' => $ebayItemId,
                'workflow_status' => 'listed',
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            // 出品データから追加情報を抽出
            if (!empty($listingData['listing_price'])) {
                $updateData['listed_price'] = $listingData['listing_price'];
            }
            
            if (!empty($listingData['listing_url'])) {
                $updateData['ebay_url'] = $listingData['listing_url'];
            }
            
            // SQLクエリ生成
            $setClause = [];
            $params = [];
            
            foreach ($updateData as $field => $value) {
                $setClause[] = "{$field} = ?";
                $params[] = $value;
            }
            $params[] = $productId;
            
            $sql = "
                UPDATE yahoo_scraped_products 
                SET " . implode(', ', $setClause) . "
                WHERE id = ?
            ";
            
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute($params);
            
            if (!$result) {
                throw new Exception("商品ステータス更新失敗: ID {$productId}");
            }
            
            error_log("商品ステータス更新完了: ID {$productId}");
            
        } catch (Exception $e) {
            error_log("商品ステータス更新エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 在庫管理システムに自動登録
     */
    private function registerToInventorySystem($productId, $listingData = []) {
        try {
            // 02_scraping の在庫管理APIを呼び出し
            $apiUrl = $this->getInventoryApiUrl();
            
            $postData = [
                'action' => 'register_listed_product',
                'product_id' => $productId,
                'listing_data' => $listingData,
                'source' => '08_listing',
                'auto_register' => true
            ];
            
            $response = $this->callInventoryAPI($apiUrl, $postData);
            
            if (!$response['success']) {
                throw new Exception("在庫管理登録失敗: " . ($response['message'] ?? '不明なエラー'));
            }
            
            error_log("在庫管理登録成功: 商品ID {$productId}");
            return $response;
            
        } catch (Exception $e) {
            error_log("在庫管理登録エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 在庫管理API呼び出し
     */
    private function callInventoryAPI($url, $data) {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Content-Length: ' . strlen(json_encode($data)),
                'X-Source: 08_listing'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_USERAGENT => 'EbayListing/1.0'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        if ($curlError) {
            throw new Exception("API通信エラー: {$curlError}");
        }
        
        if ($httpCode !== 200) {
            throw new Exception("API呼び出し失敗: HTTP {$httpCode}");
        }
        
        if (!$response) {
            throw new Exception("APIレスポンスが空です");
        }
        
        $decodedResponse = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("APIレスポンス解析失敗: " . json_last_error_msg());
        }
        
        return $decodedResponse;
    }
    
    /**
     * 出品完了ログ記録
     */
    private function logListingCompletion($productId, $ebayItemId, $inventoryResult) {
        $logData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'product_id' => $productId,
            'ebay_item_id' => $ebayItemId,
            'inventory_registered' => $inventoryResult['success'] ?? false,
            'inventory_message' => $inventoryResult['message'] ?? ''
        ];
        
        error_log("出品完了ログ: " . json_encode($logData, JSON_UNESCAPED_UNICODE));
        
        // 必要に応じてデータベースにもログ保存
        try {
            $this->saveListingLog($logData);
        } catch (Exception $e) {
            error_log("ログ保存エラー: " . $e->getMessage());
        }
    }
    
    /**
     * ログをデータベースに保存
     */
    private function saveListingLog($logData) {
        try {
            $pdo = $this->getDatabaseConnection();
            
            $sql = "
                INSERT INTO listing_completion_logs 
                (product_id, ebay_item_id, inventory_registered, details, created_at)
                VALUES (?, ?, ?, ?, ?)
            ";
            
            // テーブルが存在しない場合は作成
            $this->createListingLogTableIfNotExists($pdo);
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $logData['product_id'],
                $logData['ebay_item_id'],
                $logData['inventory_registered'] ? 1 : 0,
                json_encode($logData),
                $logData['timestamp']
            ]);
            
        } catch (Exception $e) {
            // ログ保存失敗は無視（メイン処理に影響させない）
            error_log("ログ保存失敗: " . $e->getMessage());
        }
    }
    
    /**
     * ログテーブル作成
     */
    private function createListingLogTableIfNotExists($pdo) {
        $sql = "
            CREATE TABLE IF NOT EXISTS listing_completion_logs (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL,
                ebay_item_id VARCHAR(100),
                inventory_registered BOOLEAN DEFAULT false,
                details JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ";
        
        try {
            $pdo->exec($sql);
        } catch (Exception $e) {
            // テーブル作成失敗は無視
        }
    }
    
    /**
     * 在庫管理API URLを取得
     */
    private function getInventoryApiUrl() {
        // 相対パスまたは設定ファイルから取得
        $baseUrl = dirname(__DIR__, 2); // 08_listingから見た相対パス
        return $baseUrl . '/02_scraping/api/inventory_monitor.php';
    }
    
    /**
     * データベース接続取得
     */
    private function getDatabaseConnection() {
        // 既存のDB接続を使用（08_listingで使用中の接続）
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new PDO($dsn, $user, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            
            return $pdo;
            
        } catch (Exception $e) {
            throw new Exception("データベース接続失敗: " . $e->getMessage());
        }
    }
}

/**
 * 使用例：既存の出品処理に統合
 * 
 * 08_listing/api/listing.php または適切な場所に追加：
 */
class ExistingEbayListing {
    
    public function listProduct($productData) {
        try {
            // 既存の出品処理...
            $ebayItemId = $this->performEbayListing($productData);
            
            if ($ebayItemId) {
                // 🔥 在庫管理統合処理を追加
                $integration = new EbayListingInventoryIntegration();
                $integrationResult = $integration->onListingCompleted(
                    $productData['id'], 
                    $ebayItemId,
                    [
                        'listing_price' => $productData['price'],
                        'listing_url' => "https://www.ebay.com/itm/{$ebayItemId}",
                        'category' => $productData['category'] ?? '',
                        'condition' => $productData['condition'] ?? 'Used'
                    ]
                );
                
                return [
                    'success' => true,
                    'ebay_item_id' => $ebayItemId,
                    'inventory_integration' => $integrationResult
                ];
            }
            
            return ['success' => false, 'message' => '出品に失敗しました'];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 既存のeBay出品処理（例）
     */
    private function performEbayListing($productData) {
        // 既存のeBay出品ロジック
        // 成功時はeBay Item IDを返す
        return '123456789'; // 仮のeBay Item ID
    }
}

/**
 * 一括登録スクリプト（初期セットアップ用）
 * 
 * 実行方法：
 * php 08_listing/scripts/bulk_inventory_registration.php
 */
class BulkInventoryRegistration {
    
    /**
     * 既存の出品済み商品を一括で在庫管理に登録
     * 初期導入時に実行
     */
    public function registerAllListedProducts() {
        try {
            $pdo = $this->getDatabaseConnection();
            
            // 出品済み商品で未登録のものを取得
            $sql = "
                SELECT ysp.id, ysp.title, ysp.ebay_item_id, ysp.price
                FROM yahoo_scraped_products ysp
                WHERE ysp.workflow_status = 'listed' 
                  AND ysp.ebay_item_id IS NOT NULL 
                  AND ysp.ebay_item_id != ''
                  AND ysp.id NOT IN (
                      SELECT product_id FROM inventory_management 
                      WHERE product_id IS NOT NULL
                  )
                ORDER BY ysp.updated_at DESC
                LIMIT 100
            ";
            
            $products = $pdo->query($sql)->fetchAll();
            
            echo "対象商品数: " . count($products) . PHP_EOL;
            
            $results = [
                'total' => count($products),
                'success' => 0,
                'errors' => 0,
                'details' => []
            ];
            
            $integration = new EbayListingInventoryIntegration();
            
            foreach ($products as $product) {
                try {
                    echo "処理中: 商品ID {$product['id']} - {$product['title']}" . PHP_EOL;
                    
                    $result = $integration->registerToInventorySystem($product['id'], [
                        'bulk_registration' => true,
                        'ebay_item_id' => $product['ebay_item_id'],
                        'price' => $product['price']
                    ]);
                    
                    $results['success']++;
                    $results['details'][] = [
                        'product_id' => $product['id'],
                        'status' => 'success'
                    ];
                    
                    echo "✓ 成功" . PHP_EOL;
                    
                    // レート制限
                    sleep(1);
                    
                } catch (Exception $e) {
                    $results['errors']++;
                    $results['details'][] = [
                        'product_id' => $product['id'],
                        'status' => 'error',
                        'message' => $e->getMessage()
                    ];
                    
                    echo "✗ エラー: " . $e->getMessage() . PHP_EOL;
                }
            }
            
            echo PHP_EOL . "=== 一括登録完了 ===" . PHP_EOL;
            echo "成功: {$results['success']}件" . PHP_EOL;
            echo "エラー: {$results['errors']}件" . PHP_EOL;
            
            return $results;
            
        } catch (Exception $e) {
            echo "一括登録エラー: " . $e->getMessage() . PHP_EOL;
            throw $e;
        }
    }
    
    private function getDatabaseConnection() {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        return new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
}

/**
 * コマンドライン実行用
 * php bulk_inventory_registration.php
 */
if (php_sapi_name() === 'cli' && basename(__FILE__) === basename($_SERVER['SCRIPT_NAME'])) {
    try {
        echo "既存出品商品の一括在庫管理登録を開始します..." . PHP_EOL;
        
        $bulk = new BulkInventoryRegistration();
        $results = $bulk->registerAllListedProducts();
        
        echo "一括登録処理が完了しました。" . PHP_EOL;
        
    } catch (Exception $e) {
        echo "エラー: " . $e->getMessage() . PHP_EOL;
        exit(1);
    }
}
?>