<?php
/**
 * 08_listing ワークフロー統合API
 * ワークフローエンジンとの連携・自動出品処理
 * 
 * 機能:
 * - 承認済み商品の自動出品処理
 * - 10_zaiko在庫管理連携
 * - バッチ処理・エラー回復
 * - 進捗通知システム
 */

require_once(__DIR__ . '/../listing.php');
require_once(__DIR__ . '/../ebay_api_integration.php');

/**
 * ワークフロー出品統合クラス
 */
class ListingWorkflowIntegration {
    private $pdo;
    private $redis;
    private $logger;
    private $ebayApi;
    
    public function __construct() {
        $this->pdo = $this->getDatabaseConnection();
        $this->redis = $this->initRedis();
        $this->logger = new UnifiedLogger();
        $this->ebayApi = new EbayApiIntegration(['sandbox' => false]);
    }
    
    /**
     * Redis初期化
     */
    private function initRedis() {
        try {
            if (class_exists('Redis')) {
                $redis = new Redis();
                $redis->connect('127.0.0.1', 6379);
                return $redis;
            }
        } catch (Exception $e) {
            $this->logger->warning('Redis接続に失敗しましたが、処理を継続します', [
                'error' => $e->getMessage(),
                'service' => '08_listing'
            ]);
        }
        return null;
    }
    
    /**
     * ワークフロー出品処理（メインエントリポイント）
     */
    public function processWorkflowListing($workflowId, $approvedProducts, $settings = []) {
        $startTime = microtime(true);
        $totalProducts = count($approvedProducts);
        
        $this->logger->info('ワークフロー出品処理開始', [
            'workflow_id' => $workflowId,
            'product_count' => $totalProducts,
            'service' => '08_listing'
        ]);
        
        try {
            // 1. 出品設定の準備
            $listingSettings = array_merge([
                'marketplace' => 'ebay',
                'test_mode' => false,
                'batch_size' => 10,
                'delay_between_items' => 30 // 秒
            ], $settings);
            
            // 2. バッチ処理で出品実行
            $results = $this->executeBatchListing($workflowId, $approvedProducts, $listingSettings);
            
            // 3. ワークフロー状態更新
            $this->updateWorkflowStatus($workflowId, $results);
            
            // 4. 在庫管理システム（10_zaiko）への通知
            if ($results['success_count'] > 0) {
                $this->notifyInventorySystem($workflowId, $results['successful_listings']);
            }
            
            $executionTime = round((microtime(true) - $startTime) * 1000);
            
            $this->logger->info('ワークフロー出品処理完了', [
                'workflow_id' => $workflowId,
                'execution_time' => $executionTime,
                'success_count' => $results['success_count'],
                'error_count' => $results['error_count'],
                'service' => '08_listing'
            ]);
            
            return [
                'success' => true,
                'message' => "出品処理完了: 成功 {$results['success_count']}件、エラー {$results['error_count']}件",
                'data' => [
                    'workflow_id' => $workflowId,
                    'results' => $results,
                    'execution_time' => $executionTime,
                    'next_step' => 9, // 10_zaiko
                    'total_processed' => $totalProducts
                ]
            ];
            
        } catch (Exception $e) {
            $this->logger->error('ワークフロー出品処理エラー', [
                'workflow_id' => $workflowId,
                'error' => $e->getMessage(),
                'service' => '08_listing'
            ]);
            
            return [
                'success' => false,
                'message' => 'ワークフロー出品エラー: ' . $e->getMessage(),
                'data' => null
            ];
        }
    }
    
    /**
     * バッチ出品実行
     */
    private function executeBatchListing($workflowId, $products, $settings) {
        $successCount = 0;
        $errorCount = 0;
        $successfulListings = [];
        $errors = [];
        $batchSize = $settings['batch_size'];
        $delay = $settings['delay_between_items'];
        
        // 進捗追跡用
        $totalProducts = count($products);
        $processedCount = 0;
        
        // バッチごとに処理
        $batches = array_chunk($products, $batchSize);
        
        foreach ($batches as $batchIndex => $batch) {
            $this->logger->info("バッチ {$batchIndex} 処理開始", [
                'workflow_id' => $workflowId,
                'batch_size' => count($batch),
                'service' => '08_listing'
            ]);
            
            foreach ($batch as $product) {
                try {
                    // 個別商品出品処理
                    $listingResult = $this->listSingleProduct($product, $settings);
                    
                    if ($listingResult['success']) {
                        $successCount++;
                        $successfulListings[] = array_merge($product, [
                            'ebay_item_id' => $listingResult['item_id'],
                            'listing_url' => $listingResult['listing_url'] ?? '',
                            'listed_at' => date('Y-m-d H:i:s')
                        ]);
                    } else {
                        $errorCount++;
                        $errors[] = [
                            'product_id' => $product['product_id'],
                            'error' => $listingResult['message']
                        ];
                    }
                    
                    // 進捗更新
                    $processedCount++;
                    $this->updateProgress($workflowId, $processedCount, $totalProducts);
                    
                    // API制限対策：商品間の待機時間
                    if ($processedCount < $totalProducts) {
                        sleep($delay);
                    }
                    
                } catch (Exception $e) {
                    $errorCount++;
                    $errors[] = [
                        'product_id' => $product['product_id'] ?? 'unknown',
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            // バッチ間の休憩（API負荷軽減）
            if ($batchIndex < count($batches) - 1) {
                sleep(60); // 1分休憩
            }
        }
        
        return [
            'success_count' => $successCount,
            'error_count' => $errorCount,
            'successful_listings' => $successfulListings,
            'errors' => $errors,
            'total_processed' => $processedCount
        ];
    }
    
    /**
     * 単一商品出品処理
     */
    private function listSingleProduct($product, $settings) {
        try {
            // eBay出品データの準備
            $ebayData = $this->prepareEbayListingData($product);
            
            if ($settings['marketplace'] === 'ebay') {
                // eBay API呼び出し
                $result = $this->ebayApi->addFixedPriceItem($ebayData, $settings['test_mode']);
                
                if ($result['success']) {
                    $this->logger->info('eBay出品成功', [
                        'product_id' => $product['product_id'],
                        'item_id' => $result['item_id'],
                        'service' => '08_listing'
                    ]);
                    
                    return [
                        'success' => true,
                        'item_id' => $result['item_id'],
                        'message' => 'eBay出品完了',
                        'listing_url' => "https://www.ebay.com/itm/{$result['item_id']}"
                    ];
                }
            }
            
            return [
                'success' => false,
                'message' => '出品APIエラー: ' . ($result['message'] ?? '不明なエラー')
            ];
            
        } catch (Exception $e) {
            $this->logger->error('単一商品出品エラー', [
                'product_id' => $product['product_id'] ?? 'unknown',
                'error' => $e->getMessage(),
                'service' => '08_listing'
            ]);
            
            return [
                'success' => false,
                'message' => '出品処理エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * eBay出品データ準備
     */
    private function prepareEbayListingData($product) {
        $yahoo_data = $product['yahoo_data'] ?? [];
        
        // 画像配列の取得
        $images = [];
        if (isset($yahoo_data['validation_info']['image']['all_images'])) {
            $images = $yahoo_data['validation_info']['image']['all_images'];
        } elseif (isset($yahoo_data['all_images'])) {
            $images = $yahoo_data['all_images'];
        } elseif ($product['image_url']) {
            $images = [$product['image_url']];
        }
        
        return [
            'Title' => $this->sanitizeTitle($product['title']),
            'Description' => $this->generateDescription($product),
            'Category' => $this->mapToEbayCategory($product['category']),
            'Condition' => $this->mapToEbayCondition($product['condition']),
            'Price' => $this->calculateUSDPrice($product['price']),
            'Quantity' => 1,
            'Images' => array_slice($images, 0, 12), // eBay最大12枚
            'ShippingService' => 'Standard International Shipping',
            'ShippingCost' => '15.00',
            'ReturnPolicy' => 'Returns Accepted',
            'PaymentMethods' => ['PayPal', 'Credit Card']
        ];
    }
    
    /**
     * タイトル最適化
     */
    private function sanitizeTitle($title) {
        // eBay禁止文字の削除・変換
        $cleaned = preg_replace('/[^\p{L}\p{N}\s\-\(\)]/u', '', $title);
        
        // 80文字制限
        if (mb_strlen($cleaned) > 80) {
            $cleaned = mb_substr($cleaned, 0, 77) . '...';
        }
        
        return $cleaned;
    }
    
    /**
     * 商品説明生成
     */
    private function generateDescription($product) {
        $yahoo_data = $product['yahoo_data'] ?? [];
        
        $description = "<h2>Authentic Japanese Item from Yahoo Auction</h2>\n\n";
        
        if (!empty($yahoo_data['description'])) {
            $description .= "<p>" . htmlspecialchars($yahoo_data['description']) . "</p>\n\n";
        }
        
        // 商品詳細情報
        $description .= "<h3>Product Details:</h3>\n";
        $description .= "<ul>\n";
        if (!empty($product['condition'])) {
            $description .= "<li>Condition: " . htmlspecialchars($product['condition']) . "</li>\n";
        }
        if (!empty($yahoo_data['category'])) {
            $description .= "<li>Category: " . htmlspecialchars($yahoo_data['category']) . "</li>\n";
        }
        if (!empty($yahoo_data['seller'])) {
            $description .= "<li>Original Seller: " . htmlspecialchars($yahoo_data['seller']) . "</li>\n";
        }
        $description .= "</ul>\n\n";
        
        $description .= "<p><em>This item was carefully selected from Yahoo Auction Japan.</em></p>";
        
        return $description;
    }
    
    /**
     * 円→ドル変換
     */
    private function calculateUSDPrice($jpyPrice) {
        $exchangeRate = 150; // 実際の実装では外部API使用
        $usdPrice = round($jpyPrice / $exchangeRate, 2);
        
        // 最低価格設定
        return max($usdPrice, 9.99);
    }
    
    /**
     * カテゴリマッピング
     */
    private function mapToEbayCategory($category) {
        $categoryMap = [
            'ファッション' => 11450,
            '家電' => 293,
            'スポーツ' => 888,
            'ホーム&ガーデン' => 11700,
            'ジュエリー' => 281,
            'おもちゃ' => 220,
            'コレクティブル' => 1,
            'その他' => 99
        ];
        
        return $categoryMap[$category] ?? 99;
    }
    
    /**
     * コンディションマッピング
     */
    private function mapToEbayCondition($condition) {
        $conditionMap = [
            '新品' => 'New',
            '未使用' => 'New other',
            '中古・美品' => 'Used',
            '中古・良品' => 'Used',
            '中古・可' => 'For parts or not working'
        ];
        
        return $conditionMap[$condition] ?? 'Used';
    }
    
    /**
     * 進捗更新
     */
    private function updateProgress($workflowId, $processed, $total) {
        $percentage = round(($processed / $total) * 100);
        
        // Redisに進捗保存
        if ($this->redis) {
            $this->redis->setex("workflow_progress:{$workflowId}", 3600, $percentage);
        }
        
        // ファイルにも保存（フォールバック）
        $progressFile = __DIR__ . '/temp/progress_' . $workflowId . '.txt';
        file_put_contents($progressFile, $percentage);
    }
    
    /**
     * ワークフロー状態更新
     */
    private function updateWorkflowStatus($workflowId, $results) {
        try {
            $this->ensureWorkflowTable();
            
            $status = $results['success_count'] > 0 ? 'completed' : 'failed';
            $nextStep = $results['success_count'] > 0 ? 9 : null; // 10_zaiko
            
            $sql = "
            INSERT INTO workflows (id, status, current_step, next_step, data, updated_at)
            VALUES (?, ?, 8, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (id) 
            DO UPDATE SET 
                status = EXCLUDED.status,
                current_step = 8,
                next_step = EXCLUDED.next_step,
                data = EXCLUDED.data,
                updated_at = CURRENT_TIMESTAMP
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $workflowId,
                $status,
                $nextStep,
                json_encode($results)
            ]);
            
        } catch (Exception $e) {
            $this->logger->error('ワークフロー状態更新エラー', [
                'workflow_id' => $workflowId,
                'error' => $e->getMessage(),
                'service' => '08_listing'
            ]);
        }
    }
    
    /**
     * 10_zaiko在庫管理システムへの通知
     */
    private function notifyInventorySystem($workflowId, $listedProducts) {
        try {
            $inventoryApiUrl = '/modules/yahoo_auction_complete/new_structure/10_zaiko/api/workflow_integration.php';
            
            $postData = [
                'action' => 'update_listed_inventory',
                'workflow_id' => $workflowId,
                'listed_products' => $listedProducts
            ];
            
            // 在庫管理システムAPI呼び出し
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, 'http://localhost:8080' . $inventoryApiUrl);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode === 200) {
                $this->logger->info('在庫管理システム通知成功', [
                    'workflow_id' => $workflowId,
                    'product_count' => count($listedProducts),
                    'service' => '08_listing'
                ]);
            } else {
                $this->logger->warning('在庫管理システム通知失敗', [
                    'workflow_id' => $workflowId,
                    'http_code' => $httpCode,
                    'service' => '08_listing'
                ]);
            }
            
        } catch (Exception $e) {
            $this->logger->error('在庫管理システム通知エラー', [
                'workflow_id' => $workflowId,
                'error' => $e->getMessage(),
                'service' => '08_listing'
            ]);
        }
    }
    
    /**
     * ワークフローテーブル確認・作成
     */
    private function ensureWorkflowTable() {
        $sql = "
        CREATE TABLE IF NOT EXISTS workflows (
            id SERIAL PRIMARY KEY,
            yahoo_auction_id VARCHAR(255),
            product_id VARCHAR(255),
            status VARCHAR(50) DEFAULT 'processing',
            current_step INTEGER DEFAULT 1,
            next_step INTEGER,
            priority INTEGER DEFAULT 0,
            data JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )";
        
        $this->pdo->exec($sql);
    }
    
    /**
     * データベース接続
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
}

// API エンドポイント処理
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    $integration = new ListingWorkflowIntegration();
    
    try {
        switch ($action) {
            case 'process_workflow_listing':
                $workflowId = $input['workflow_id'] ?? 0;
                $approvedProducts = $input['approved_products'] ?? [];
                $settings = $input['settings'] ?? [];
                
                $result = $integration->processWorkflowListing($workflowId, $approvedProducts, $settings);
                echo json_encode($result);
                break;
                
            case 'get_progress':
                $workflowId = $input['workflow_id'] ?? 0;
                
                // 進捗情報取得
                $progress = 0;
                $progressFile = __DIR__ . '/temp/progress_' . $workflowId . '.txt';
                
                if (file_exists($progressFile)) {
                    $progress = (int)file_get_contents($progressFile);
                }
                
                echo json_encode([
                    'success' => true,
                    'progress' => $progress,
                    'message' => '進捗情報を取得しました'
                ]);
                break;
                
            default:
                echo json_encode([
                    'success' => false,
                    'message' => '無効なアクションです: ' . $action
                ]);
        }
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'APIエラー: ' . $e->getMessage()
        ]);
    }
    
    exit;
}
?>