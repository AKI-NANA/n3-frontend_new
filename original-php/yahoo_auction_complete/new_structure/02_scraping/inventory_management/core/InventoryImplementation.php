<?php
/**
 * 在庫管理エンジン 完全独立版（修正版）
 * JSONBカラム対応
 */

class InventoryEngine {
    protected $db;
    protected $logger;
    protected $config;
    
    public function __construct() {
        $this->db = $this->getDatabaseConnection();
        $this->logger = $this->createLogger();
        $this->config = $this->getConfig();
    }
    
    private function getDatabaseConnection() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            return $pdo;
        } catch (PDOException $e) {
            die("データベース接続エラー: " . $e->getMessage());
        }
    }
    
    private function createLogger() {
        return new class {
            private $logDir;
            
            public function __construct() {
                $this->logDir = __DIR__ . '/../logs/';
                if (!is_dir($this->logDir)) {
                    mkdir($this->logDir, 0755, true);
                }
            }
            
            public function info($message, $context = []) {
                $this->log('INFO', $message, $context);
            }
            
            public function error($message, $context = []) {
                $this->log('ERROR', $message, $context);
            }
            
            private function log($level, $message, $context = []) {
                $timestamp = date('Y-m-d H:i:s');
                $contextStr = empty($context) ? '' : ' ' . json_encode($context, JSON_UNESCAPED_UNICODE);
                $logMessage = "[{$timestamp}] [{$level}] {$message}{$contextStr}\n";
                
                $logFile = $this->logDir . 'inventory_' . date('Y-m-d') . '.log';
                file_put_contents($logFile, $logMessage, FILE_APPEND);
            }
        };
    }
    
    private function getConfig() {
        return [
            'check_interval_seconds' => 3,
            'batch_size' => 100,
            'enable_auto_price_update' => true,
            'enable_ebay_sync' => true,
        ];
    }
    
    /**
     * 出品済み商品を在庫管理に自動登録
     */
    public function registerListedProduct($productId) {
        try {
            $product = $this->getListedProduct($productId);
            
            if (!$product) {
                throw new Exception("商品ID {$productId} は出品済み商品ではありません");
            }
            
            if ($this->isAlreadyRegistered($productId)) {
                $this->logger->info("商品ID {$productId} は既に在庫管理登録済み");
                return false;
            }
            
            // URLをJSONBから取得
            $sourceUrl = $this->extractUrlFromProduct($product);
            
            $stmt = $this->db->prepare("
                INSERT INTO inventory_management (
                    product_id, source_platform, source_url, source_product_id,
                    current_stock, current_price, title_hash, url_status,
                    monitoring_enabled, last_verified_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
            ");
            
            $stmt->execute([
                $productId,
                'yahoo',
                $sourceUrl,
                $product['source_item_id'] ?? null,
                1,
                $product['price_jpy'] ?? 0,
                $product['title_hash'] ?? hash('sha256', $product['title'] ?? ''),
                'active',
                true
            ]);
            
            $inventoryId = $this->db->lastInsertId();
            
            // listing_platforms登録
            if (!empty($product['ebay_item_id'])) {
                $this->registerListingPlatform($productId, $product);
            }
            
            $this->logger->info("出品済み商品を在庫管理に登録", [
                'product_id' => $productId,
                'inventory_id' => $inventoryId
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("在庫管理登録エラー", [
                'product_id' => $productId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * JSONBからURL抽出
     */
    private function extractUrlFromProduct($product) {
        // scraped_yahoo_data から URL取得
        if (!empty($product['scraped_yahoo_data'])) {
            $yahooData = json_decode($product['scraped_yahoo_data'], true);
            if (isset($yahooData['url'])) {
                return $yahooData['url'];
            }
            if (isset($yahooData['product_url'])) {
                return $yahooData['product_url'];
            }
        }
        
        // source_item_idからURL生成
        if (!empty($product['source_item_id'])) {
            return "https://page.auctions.yahoo.co.jp/jp/auction/" . $product['source_item_id'];
        }
        
        return null;
    }
    
    /**
     * 在庫チェック実行
     */
    public function performInventoryCheck($productIds = null) {
        try {
            $targets = $this->getMonitoringTargets($productIds);
            
            $results = [
                'total' => count($targets),
                'checked' => 0,
                'updated' => 0,
                'errors' => 0,
                'changes' => []
            ];
            
            foreach ($targets as $target) {
                try {
                    $checkResult = $this->checkSingleProduct($target);
                    $results['checked']++;
                    
                    if ($checkResult['changed']) {
                        $results['updated']++;
                        $results['changes'][] = $checkResult;
                    }
                    
                    sleep($this->config['check_interval_seconds']);
                    
                } catch (Exception $e) {
                    $results['errors']++;
                    $this->logger->error("個別商品チェックエラー", [
                        'product_id' => $target['product_id'],
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            return $results;
            
        } catch (Exception $e) {
            throw $e;
        }
    }
    
    /**
     * 単一商品チェック
     */
    protected function checkSingleProduct($target) {
        return [
            'product_id' => $target['product_id'],
            'changed' => false,
            'changes' => []
        ];
    }
    
    /**
     * 出品済み商品取得
     */
    protected function getListedProduct($productId) {
        $stmt = $this->db->prepare("
            SELECT * FROM yahoo_scraped_products 
            WHERE id = ? AND workflow_status = 'listed'
        ");
        $stmt->execute([$productId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * 監視対象商品取得
     */
    protected function getMonitoringTargets($productIds = null) {
        $sql = "
            SELECT 
                im.product_id,
                im.source_url as yahoo_url,
                im.current_price,
                im.url_status,
                ysp.title,
                ysp.ebay_item_id,
                ysp.price_jpy
            FROM inventory_management im
            JOIN yahoo_scraped_products ysp ON im.product_id = ysp.id
            WHERE im.monitoring_enabled = true
              AND ysp.workflow_status = 'listed'
        ";
        
        $params = [];
        if ($productIds) {
            $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
            $sql .= " AND im.product_id IN ({$placeholders})";
            $params = $productIds;
        }
        
        $sql .= " ORDER BY im.last_verified_at ASC LIMIT 100";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * listing_platforms登録
     */
    protected function registerListingPlatform($productId, $product) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO listing_platforms (
                    product_id, platform, platform_product_id, listing_url,
                    listing_status, current_quantity, listed_price, auto_sync_enabled, created_at
                ) VALUES (?, 'ebay', ?, ?, 'active', 1, ?, true, NOW())
                ON CONFLICT (product_id, platform) DO NOTHING
            ");
            
            $stmt->execute([
                $productId,
                $product['ebay_item_id'],
                $this->generateEbayUrl($product['ebay_item_id']),
                $product['cached_price_usd'] ?? 0
            ]);
        } catch (Exception $e) {
            $this->logger->error("listing_platforms登録エラー: " . $e->getMessage());
        }
    }
    
    /**
     * 未登録出品済み商品の一括登録
     */
    public function bulkRegisterListedProducts($limit = 100) {
        $sql = "
            SELECT ysp.id, ysp.title, ysp.source_item_id, ysp.price_jpy, 
                   ysp.ebay_item_id, ysp.scraped_yahoo_data
            FROM yahoo_scraped_products ysp
            LEFT JOIN inventory_management im ON ysp.id = im.product_id
            WHERE ysp.workflow_status = 'listed'
              AND ysp.ebay_item_id IS NOT NULL
              AND im.product_id IS NULL
            LIMIT ?
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$limit]);
        $unregistered = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $results = [
            'total_found' => count($unregistered),
            'registered' => 0,
            'errors' => 0
        ];
        
        foreach ($unregistered as $product) {
            try {
                $this->registerListedProduct($product['id']);
                $results['registered']++;
            } catch (Exception $e) {
                $results['errors']++;
                $this->logger->error("一括登録エラー", [
                    'product_id' => $product['id'],
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        return $results;
    }
    
    protected function generateEbayUrl($itemId) {
        return "https://www.ebay.com/itm/{$itemId}";
    }
    
    protected function isAlreadyRegistered($productId) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM inventory_management WHERE product_id = ?");
        $stmt->execute([$productId]);
        return $stmt->fetchColumn() > 0;
    }
}
?>
