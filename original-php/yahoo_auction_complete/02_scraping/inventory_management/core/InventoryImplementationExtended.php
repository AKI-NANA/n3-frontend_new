<?php
/**
 * 在庫管理 完全自動価格更新システム - 簡易版
 * 外部依存を最小限にした実装
 */

require_once __DIR__ . '/InventoryImplementation.php';

class InventoryImplementationExtended extends InventoryEngine {
    
    /**
     * 拡張：単一商品チェック + 自動価格更新
     */
    protected function checkSingleProduct($target) {
        $productId = $target['product_id'];
        $currentPrice = $target['current_price'];
        $newPrice = $target['price_jpy']; // データベースから取得した最新価格
        
        $changes = [];
        $hasChanges = false;
        
        // 価格変動検知
        if ($newPrice != $currentPrice) {
            $priceChange = [
                'type' => 'price_change',
                'old_price' => $currentPrice,
                'new_price' => $newPrice,
                'change_percent' => round((($newPrice - $currentPrice) / $currentPrice) * 100, 2)
            ];
            $changes[] = $priceChange;
            $hasChanges = true;
            
            // 価格変動履歴記録
            $this->recordPriceChange($productId, $priceChange);
            
            // 自動価格更新フロー実行（簡易版）
            try {
                $this->executeSimpleAutoPriceUpdate($productId, $newPrice, $target);
            } catch (Exception $e) {
                $this->logger->error("自動価格更新エラー", [
                    'product_id' => $productId,
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        // inventory_management更新
        if ($hasChanges) {
            $stmt = $this->db->prepare("
                UPDATE inventory_management 
                SET current_price = ?,
                    last_verified_at = NOW(),
                    updated_at = NOW()
                WHERE product_id = ?
            ");
            $stmt->execute([$newPrice, $productId]);
        }
        
        return [
            'product_id' => $productId,
            'changed' => $hasChanges,
            'changes' => $changes
        ];
    }
    
    /**
     * 簡易自動価格更新フロー
     */
    private function executeSimpleAutoPriceUpdate($productId, $newPriceJPY, $target) {
        $this->logger->info("簡易自動価格更新開始", [
            'product_id' => $productId,
            'new_price_jpy' => $newPriceJPY
        ]);
        
        // Step 1: 簡易USD換算（為替レート150円固定）
        $exchangeRate = 150.0;
        $newPriceUSD = round($newPriceJPY / $exchangeRate, 2);
        
        // Step 2: yahoo_scraped_products更新
        $stmt = $this->db->prepare("
            UPDATE yahoo_scraped_products 
            SET cached_price_usd = ?,
                cache_updated_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$newPriceUSD, $productId]);
        
        // Step 3: listing_platforms同期ステータス更新
        $stmt = $this->db->prepare("
            UPDATE listing_platforms 
            SET listed_price = ?,
                sync_status = 'pending',
                updated_at = NOW()
            WHERE product_id = ? AND platform = 'ebay'
        ");
        $stmt->execute([$newPriceUSD, $productId]);
        
        // Step 4: 更新履歴記録
        $stmt = $this->db->prepare("
            INSERT INTO auto_price_update_history (
                product_id, old_price_jpy, new_price_jpy, new_price_usd,
                ebay_item_id, update_source, created_at
            ) VALUES (?, ?, ?, ?, ?, 'auto_inventory_check', NOW())
        ");
        $stmt->execute([
            $productId,
            $target['current_price'],
            $newPriceJPY,
            $newPriceUSD,
            $target['ebay_item_id']
        ]);
        
        $this->logger->info("簡易自動価格更新完了", [
            'product_id' => $productId,
            'new_price_usd' => $newPriceUSD
        ]);
    }
    
    /**
     * 価格変動履歴記録
     */
    private function recordPriceChange($productId, $change) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO stock_history (
                    product_id, previous_price, new_price, change_type, 
                    change_source, created_at
                ) VALUES (?, ?, ?, 'price_change', 'yahoo', NOW())
            ");
            $stmt->execute([
                $productId,
                $change['old_price'],
                $change['new_price']
            ]);
        } catch (Exception $e) {
            // stock_historyテーブルがない場合はスキップ
            $this->logger->error("価格履歴記録エラー（スキップ）: " . $e->getMessage());
        }
    }
    
    /**
     * 自動価格更新履歴取得
     */
    public function getAutoPriceUpdateHistory($productId = null, $limit = 50) {
        $sql = "
            SELECT h.*, ysp.title
            FROM auto_price_update_history h
            JOIN yahoo_scraped_products ysp ON h.product_id = ysp.id
        ";
        
        $params = [];
        if ($productId) {
            $sql .= " WHERE h.product_id = ?";
            $params[] = $productId;
        }
        
        $sql .= " ORDER BY h.created_at DESC LIMIT ?";
        $params[] = $limit;
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 同期ステータス取得
     */
    public function getSyncStatus() {
        $stmt = $this->db->query("
            SELECT 
                COUNT(*) as total_listings,
                SUM(CASE WHEN sync_status = 'synced' THEN 1 ELSE 0 END) as synced_count,
                SUM(CASE WHEN sync_status = 'sync_failed' THEN 1 ELSE 0 END) as failed_count,
                SUM(CASE WHEN sync_status IS NULL OR sync_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                MAX(last_sync_at) as last_sync_time
            FROM listing_platforms
            WHERE platform = 'ebay' AND listing_status = 'active'
        ");
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * ランダム順序での在庫チェック（ロボット対策）
     */
    public function performInventoryCheckWithRandomization($productIds = null) {
        $executionId = uniqid('inv_check_');
        
        try {
            $targets = $this->getMonitoringTargets($productIds);
            
            // ロボット対策: 商品をランダム順序でシャッフル
            shuffle($targets);
            
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
                    
                    // ロボット対策: ランダム間隔（2-8秒）
                    $randomDelay = rand(2, 8);
                    sleep($randomDelay);
                    
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
     * 出品先価格一括同期（ステータス更新のみ）
     */
    public function syncAllListingPrices() {
        $stmt = $this->db->query("
            SELECT 
                ysp.id as product_id,
                ysp.cached_price_usd,
                ysp.ebay_item_id
            FROM yahoo_scraped_products ysp
            JOIN listing_platforms lp ON ysp.id = lp.product_id
            WHERE ysp.workflow_status = 'listed'
              AND lp.platform = 'ebay'
              AND lp.listing_status = 'active'
              AND lp.sync_status = 'pending'
            LIMIT 100
        ");
        
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $results = [
            'total' => count($products),
            'updated' => 0,
            'errors' => 0
        ];
        
        foreach ($products as $product) {
            try {
                // ステータスを'synced'に更新（実際のeBay API呼び出しは省略）
                $stmt = $this->db->prepare("
                    UPDATE listing_platforms 
                    SET sync_status = 'synced',
                        last_sync_at = NOW(),
                        updated_at = NOW()
                    WHERE product_id = ? AND platform = 'ebay'
                ");
                $stmt->execute([$product['product_id']]);
                $results['updated']++;
                
            } catch (Exception $e) {
                $results['errors']++;
                $this->logger->error("同期エラー", [
                    'product_id' => $product['product_id'],
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        return $results;
    }
}
?>
