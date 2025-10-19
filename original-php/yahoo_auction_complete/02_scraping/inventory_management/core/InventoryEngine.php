<?php
/**
 * 在庫監視エンジン - 価格変動自動計算対応版
 * 定期的に在庫・価格をチェックし、変動時に自動で利益計算を実行
 */

class InventoryEngine {
    
    private $pdo;
    private $config;
    
    public function __construct() {
        $this->pdo = $this->getDatabaseConnection();
        $this->loadConfig();
    }
    
    /**
     * 設定読み込み
     */
    private function loadConfig() {
        $this->config = [
            // 05_rieki API設定（直接PHPファイルを使用）
            'profit_api_path' => __DIR__ . '/../../api_endpoint.php',
            'default_profit_margin' => 20.0,
            'destination' => 'US',
            
            // チェック設定（ロボット検知回避）
            'batch_size' => 5,              // 1回に5商品まで
            'check_interval_seconds' => 8,  // 商品間8秒待機
            'max_retries' => 3
        ];
    }
    
    /**
     * 定期在庫チェック（価格変動 → 自動計算）
     */
    public function performInventoryCheck() {
        try {
            $products = $this->getMonitoringProducts();
            
            $results = [
                'checked_products' => count($products),
                'price_changes' => 0,
                'recalculated' => 0,
                'errors' => []
            ];
            
            foreach ($products as $product) {
                try {
                    // 仕入れ先URLをスクレイピング
                    $latestData = $this->scrapeSupplierUrl($product['source_url']);
                    
                    if (!$latestData) {
                        $results['errors'][] = "スクレイピング失敗: 商品ID {$product['product_id']}";
                        continue;
                    }
                    
                    // 価格変動を検知
                    if ($latestData['price'] != $product['current_price']) {
                        // 1. 価格変動を記録
                        $this->recordPriceChange($product, $latestData);
                        $results['price_changes']++;
                        
                        // 2. ✅ 自動利益計算を実行
                        $calcResult = $this->triggerProfitRecalculation(
                            $product['product_id'], 
                            $latestData['price']
                        );
                        
                        if ($calcResult['success']) {
                            $results['recalculated']++;
                            error_log("✅ 自動計算完了: 商品ID {$product['product_id']}, " .
                                     "新価格 ¥{$latestData['price']} → \${$calcResult['new_listing_price_usd']}");
                        } else {
                            $results['errors'][] = "自動計算失敗: 商品ID {$product['product_id']}";
                        }
                    }
                    
                    // 在庫状況も更新
                    $this->updateInventoryStatus($product, $latestData);
                    
                    // レート制限（3秒間隔）
                    sleep($this->config['check_interval_seconds']);
                    
                } catch (Exception $e) {
                    $results['errors'][] = "商品ID {$product['product_id']}: {$e->getMessage()}";
                }
            }
            
            return [
                'success' => true,
                'results' => $results
            ];
            
        } catch (Exception $e) {
            error_log("❌ 在庫チェックエラー: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * ✅ 価格変動時の自動利益計算トリガー（直接PHP関数呼び出し）
     */
    private function triggerProfitRecalculation($productId, $newPriceJpy) {
        try {
            // 05_rieki の計算関数を直接利用
            $apiPath = $this->config['profit_api_path'];
            
            if (!file_exists($apiPath)) {
                throw new Exception("利益計算APIファイルが見つかりません: {$apiPath}");
            }
            
            // API関数を読み込み
            require_once $apiPath;
            
            // 最終出品価格を計算
            $calculationResult = calculateFinalListingPrice($newPriceJpy, [
                'profit_margin' => $this->config['default_profit_margin'],
                'destination' => $this->config['destination']
            ]);
            
            if ($calculationResult && isset($calculationResult['final_price_usd'])) {
                // 計算結果を yahoo_scraped_products に反映
                $this->updateListingPrice($productId, $calculationResult);
                
                return [
                    'success' => true,
                    'new_listing_price_usd' => $calculationResult['final_price_usd'],
                    'profit_usd' => $calculationResult['profit_usd'] ?? 0
                ];
            }
            
            throw new Exception("計算結果が不正です");
            
        } catch (Exception $e) {
            error_log("❌ 自動利益計算エラー: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 計算結果を yahoo_scraped_products に反映
     */
    private function updateListingPrice($productId, $calculationResult) {
        try {
            $sql = "UPDATE yahoo_scraped_products 
                    SET 
                        listing_price_usd = ?,
                        profit_calculation = ?::jsonb,
                        price_recalculated_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $calculationResult['final_price_usd'],
                json_encode($calculationResult, JSON_UNESCAPED_UNICODE),
                $productId
            ]);
            
            error_log("✅ yahoo_scraped_products 更新完了: 商品ID {$productId}");
            
            return true;
            
        } catch (Exception $e) {
            error_log("❌ 価格更新エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 価格変動の記録
     */
    private function recordPriceChange($product, $latestData) {
        try {
            // inventory_management 更新
            $sql = "UPDATE inventory_management 
                    SET current_price = ?,
                        last_verified_at = NOW(),
                        updated_at = NOW()
                    WHERE product_id = ?";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $latestData['price'],
                $product['product_id']
            ]);
            
            // stock_history に記録
            $sql = "INSERT INTO stock_history (
                product_id,
                previous_price,
                new_price,
                change_type,
                change_source,
                created_at
            ) VALUES (?, ?, ?, 'price_change', 'yahoo', NOW())";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $product['product_id'],
                $product['current_price'],
                $latestData['price']
            ]);
            
            $changePercent = round((($latestData['price'] - $product['current_price']) / $product['current_price']) * 100, 2);
            
            error_log("✅ 価格変動記録: 商品ID {$product['product_id']}, " .
                     "¥{$product['current_price']} → ¥{$latestData['price']} ({$changePercent}%)");
            
            return true;
            
        } catch (Exception $e) {
            error_log("❌ 価格変動記録エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 監視対象商品を取得
     */
    private function getMonitoringProducts() {
        $sql = "SELECT 
                    im.product_id,
                    im.source_url,
                    im.current_price,
                    im.last_verified_at,
                    ysp.active_title as title,
                    ysp.source_item_id
                FROM inventory_management im
                JOIN yahoo_scraped_products ysp ON im.product_id = ysp.id
                WHERE im.monitoring_enabled = true
                  AND im.url_status = 'active'
                ORDER BY im.last_verified_at ASC NULLS FIRST
                LIMIT ?";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->config['batch_size']]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 仕入れ先URLをスクレイピング（シミュレーション）
     * 
     * 注意: 本番環境では実際のYahooスクレイピング機能を統合
     */
    private function scrapeSupplierUrl($url) {
        try {
            // ✅ 実装例: 既存のYahooスクレイピング機能を利用
            // require_once __DIR__ . '/../../includes/YahooScraping.php';
            // $scraper = new YahooScraping();
            // $result = $scraper->scrapeProduct($url);
            
            // 🔄 現在はシミュレーション（テスト用）
            // ランダムに価格を変動させる
            $priceChange = rand(-2000, 2000);
            
            // 元の価格を取得
            $stmt = $this->pdo->prepare(
                "SELECT price_jpy FROM yahoo_scraped_products ysp
                 JOIN inventory_management im ON ysp.id = im.product_id
                 WHERE im.source_url = ?"
            );
            $stmt->execute([$url]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$current) {
                return null;
            }
            
            $newPrice = max(1000, $current['price_jpy'] + $priceChange);
            
            return [
                'price' => $newPrice,
                'stock_status' => 'available',
                'title' => '商品タイトル（スクレイピング結果）'
            ];
            
        } catch (Exception $e) {
            error_log("❌ スクレイピングエラー: {$url} - " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * 在庫状況の更新
     */
    private function updateInventoryStatus($product, $latestData) {
        try {
            $sql = "UPDATE inventory_management 
                    SET last_verified_at = NOW(),
                        updated_at = NOW()
                    WHERE product_id = ?";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$product['product_id']]);
            
            return true;
            
        } catch (Exception $e) {
            error_log("❌ 在庫状況更新エラー: " . $e->getMessage());
            return false;
        }
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
            error_log("❌ データベース接続エラー: " . $e->getMessage());
            throw $e;
        }
    }
}
?>
