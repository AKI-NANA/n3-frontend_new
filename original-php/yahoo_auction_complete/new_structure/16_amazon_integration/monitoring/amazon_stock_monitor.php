<?php
/**
 * Amazon 在庫・価格監視エンジン
 * new_structure/10_zaiko/AmazonStockMonitor.php
 */

require_once __DIR__ . '/../02_scraping/amazon/AmazonDataProcessor.php';
require_once __DIR__ . '/../../shared/core/Database.php';
require_once __DIR__ . '/../../shared/core/Logger.php';

class AmazonStockMonitor {
    private $dataProcessor;
    private $db;
    private $logger;
    private $config;
    
    // 監視間隔定数
    private $highPriorityInterval = 1800;  // 30分
    private $normalPriorityInterval = 28800; // 8時間
    private $priceThreshold = 5.0; // 5%以上の変動で記録
    
    public function __construct() {
        $this->dataProcessor = new AmazonDataProcessor();
        $this->db = new Database();
        $this->logger = new Logger('AmazonStockMonitor');
        $this->config = require __DIR__ . '/../../shared/config/amazon_api.php';
        
        // 設定値で上書き
        $this->highPriorityInterval = $this->config['monitoring']['high_priority_interval'] ?? $this->highPriorityInterval;
        $this->normalPriorityInterval = $this->config['monitoring']['normal_priority_interval'] ?? $this->normalPriorityInterval;
        $this->priceThreshold = $this->config['monitoring']['price_threshold'] ?? $this->priceThreshold;
    }
    
    /**
     * 監視実行メイン
     * 
     * @param string $priority 監視優先度 ('high', 'normal', 'all')
     * @return array 実行結果
     */
    public function runMonitoring(string $priority = 'all') {
        $this->logger->info('Amazon監視開始', ['priority' => $priority]);
        
        $results = [
            'started_at' => date('Y-m-d H:i:s'),
            'priority' => $priority,
            'high_priority' => ['processed' => 0, 'errors' => 0],
            'normal_priority' => ['processed' => 0, 'errors' => 0],
            'total_api_calls' => 0,
            'price_changes_detected' => 0,
            'stock_changes_detected' => 0
        ];
        
        try {
            switch ($priority) {
                case 'high':
                    $results['high_priority'] = $this->monitorHighPriorityItems();
                    break;
                    
                case 'normal':
                    $results['normal_priority'] = $this->monitorNormalPriorityItems();
                    break;
                    
                case 'all':
                default:
                    $results['high_priority'] = $this->monitorHighPriorityItems();
                    sleep(2); // API負荷軽減
                    $results['normal_priority'] = $this->monitorNormalPriorityItems();
                    break;
            }
            
            $results['total_api_calls'] = $results['high_priority']['processed'] + $results['normal_priority']['processed'];
            $results['completed_at'] = date('Y-m-d H:i:s');
            $results['success'] = true;
            
            $this->logger->info('Amazon監視完了', $results);
            
        } catch (Exception $e) {
            $results['error'] = $e->getMessage();
            $results['success'] = false;
            $this->logger->error('Amazon監視エラー: ' . $e->getMessage());
            throw $e;
        }
        
        return $results;
    }
    
    /**
     * 高優先度商品の監視
     * 
     * @return array 処理結果
     */
    private function monitorHighPriorityItems() {
        $this->logger->info('高優先度商品監視開始');
        
        // last_api_check_atを活用した効率的なポーリング
        $sql = "SELECT * FROM amazon_research_data 
                WHERE is_high_priority = TRUE 
                AND (last_api_check_at IS NULL 
                     OR last_api_check_at < NOW() - INTERVAL '{$this->highPriorityInterval} seconds')
                ORDER BY last_api_check_at ASC NULLS FIRST
                LIMIT 50"; // API制限を考慮した制限
        
        $items = $this->db->query($sql)->fetchAll();
        
        $this->logger->info('高優先度商品取得', ['count' => count($items)]);
        
        return $this->processMonitoringItems($items, 'high');
    }
    
    /**
     * 通常優先度商品の監視
     * 
     * @return array 処理結果
     */
    private function monitorNormalPriorityItems() {
        $this->logger->info('通常優先度商品監視開始');
        
        $sql = "SELECT * FROM amazon_research_data 
                WHERE is_high_priority = FALSE 
                AND (last_api_check_at IS NULL 
                     OR last_api_check_at < NOW() - INTERVAL '{$this->normalPriorityInterval} seconds')
                ORDER BY last_api_check_at ASC NULLS FIRST
                LIMIT 30"; // API制限を考慮した制限
        
        $items = $this->db->query($sql)->fetchAll();
        
        $this->logger->info('通常優先度商品取得', ['count' => count($items)]);
        
        return $this->processMonitoringItems($items, 'normal');
    }
    
    /**
     * 監視対象商品の処理
     * 
     * @param array $items 商品配列
     * @param string $priority 優先度
     * @return array 処理結果
     */
    private function processMonitoringItems(array $items, string $priority) {
        $results = [
            'processed' => 0,
            'updated' => 0,
            'errors' => 0,
            'price_changes' => 0,
            'stock_changes' => 0,
            'error_details' => []
        ];
        
        if (empty($items)) {
            $this->logger->info('監視対象商品なし', ['priority' => $priority]);
            return $results;
        }
        
        // ASINを抽出
        $asins = array_column($items, 'asin');
        
        try {
            // データ取得・更新処理
            $processingResults = $this->dataProcessor->processAsinList($asins);
            
            $results['processed'] = $processingResults['processed'];
            $results['updated'] = $processingResults['updated'];
            $results['errors'] = $processingResults['errors'];
            
            if (!empty($processingResults['error_details'])) {
                $results['error_details'] = $processingResults['error_details'];
            }
            
            // 変動検知の詳細分析
            $changeAnalysis = $this->analyzeRecentChanges($asins);
            $results['price_changes'] = $changeAnalysis['price_changes'];
            $results['stock_changes'] = $changeAnalysis['stock_changes'];
            
        } catch (Exception $e) {
            $results['errors']++;
            $results['error_details'][] = [
                'type' => 'processing_error',
                'message' => $e->getMessage(),
                'asins' => $asins
            ];
            
            $this->logger->error('監視処理エラー', [
                'priority' => $priority,
                'error' => $e->getMessage(),
                'asins' => $asins
            ]);
        }
        
        return $results;
    }
    
    /**
     * 最近の変動分析
     * 
     * @param array $asins ASIN配列
     * @return array 変動分析結果
     */
    private function analyzeRecentChanges(array $asins) {
        $analysis = ['price_changes' => 0, 'stock_changes' => 0];
        
        if (empty($asins)) {
            return $analysis;
        }
        
        $placeholders = str_repeat('?,', count($asins) - 1) . '?';
        
        // 過去1時間の価格変動数
        $priceChangeSql = "SELECT COUNT(*) as count FROM amazon_price_history 
                          WHERE asin IN ({$placeholders}) 
                          AND recorded_at > NOW() - INTERVAL '1 hour'
                          AND change_trigger != 'stock_change'";
        
        $priceResult = $this->db->prepare($priceChangeSql)->execute($asins)->fetch();
        $analysis['price_changes'] = $priceResult['count'] ?? 0;
        
        // 過去1時間の在庫変動数
        $stockChangeSql = "SELECT COUNT(*) as count FROM amazon_price_history 
                          WHERE asin IN ({$placeholders}) 
                          AND recorded_at > NOW() - INTERVAL '1 hour'
                          AND change_trigger = 'stock_change'";
        
        $stockResult = $this->db->prepare($stockChangeSql)->execute($asins)->fetch();
        $analysis['stock_changes'] = $stockResult['count'] ?? 0;
        
        return $analysis;
    }
    
    /**
     * 価格変動検知
     * 
     * @param float $currentPrice 現在価格
     * @param float $previousPrice 前回価格
     * @return bool 変動ありの場合true
     */
    private function detectPriceChange(float $currentPrice, float $previousPrice) {
        if ($previousPrice == 0) {
            return false;
        }
        
        $changePercentage = (($currentPrice - $previousPrice) / $previousPrice) * 100;
        return abs($changePercentage) >= $this->priceThreshold;
    }
    
    /**
     * 在庫状況のみの変動を検知・記録
     * 
     * @param string $currentStock 現在在庫
     * @param string $previousStock 前回在庫
     * @param string $asin ASIN
     * @return bool 変動ありの場合true
     */
    private function detectStockOnlyChange(string $currentStock, string $previousStock, string $asin) {
        if ($currentStock !== $previousStock) {
            // 在庫変動を価格履歴テーブルに記録
            $this->recordStockChange($asin, $currentStock, $previousStock);
            
            // 在庫切れアラート
            if ($previousStock === 'InStock' && $currentStock === 'OutOfStock') {
                $this->sendStockOutAlert($asin);
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * 在庫変動の記録
     * 
     * @param string $asin ASIN
     * @param string $currentStock 現在在庫
     * @param string $previousStock 前回在庫
     */
    private function recordStockChange(string $asin, string $currentStock, string $previousStock) {
        $sql = "INSERT INTO amazon_price_history 
                (asin, price, stock_status, change_trigger, notes, recorded_at) 
                SELECT current_price, ?, 'stock_change', ?, NOW()
                FROM amazon_research_data WHERE asin = ?";
        
        $notes = "在庫状況変更: {$previousStock} → {$currentStock}";
        $this->db->prepare($sql)->execute([$currentStock, $notes, $asin]);
        
        $this->logger->info('在庫変動記録', [
            'asin' => $asin,
            'previous_stock' => $previousStock,
            'current_stock' => $currentStock
        ]);
    }
    
    /**
     * 在庫切れアラート送信
     * 
     * @param string $asin ASIN
     */
    private function sendStockOutAlert(string $asin) {
        if (!$this->config['notifications']['stock_out_alert']) {
            return;
        }
        
        try {
            // 商品情報取得
            $product = $this->db->prepare("SELECT title, current_price FROM amazon_research_data WHERE asin = ?")
                               ->execute([$asin])
                               ->fetch();
            
            $message = "【在庫切れ検知】\n";
            $message .= "ASIN: {$asin}\n";
            $message .= "商品名: " . ($product['title'] ?? 'Unknown') . "\n";
            $message .= "価格: $" . ($product['current_price'] ?? 'N/A') . "\n";
            $message .= "検知時刻: " . date('Y-m-d H:i:s');
            
            $this->logger->warning('在庫切れアラート送信', [
                'asin' => $asin,
                'title' => $product['title'] ?? 'Unknown'
            ]);
            
            // 実際の通知処理（メール、Slack等）
            $this->sendNotification('stock_out', $message, $asin);
            
        } catch (Exception $e) {
            $this->logger->error('在庫切れアラート送信エラー: ' . $e->getMessage());
        }
    }
    
    /**
     * 通知送信
     * 
     * @param string $type 通知タイプ
     * @param string $message メッセージ
     * @param string $asin ASIN
     */
    private function sendNotification(string $type, string $message, string $asin = '') {
        // ログファイルに記録
        $logFile = __DIR__ . '/../logs/amazon_alerts.log';
        $logEntry = "[" . date('Y-m-d H:i:s') . "] [{$type}] {$message}\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
        
        // メール通知（設定されている場合）
        if ($this->config['notifications']['email_enabled']) {
            $this->sendEmailNotification($type, $message, $asin);
        }
    }
    
    /**
     * メール通知送信
     * 
     * @param string $type 通知タイプ
     * @param string $message メッセージ
     * @param string $asin ASIN
     */
    private function sendEmailNotification(string $type, string $message, string $asin) {
        // 簡易メール送信実装
        // 実際の環境では適切なメールライブラリを使用
        
        $to = 'admin@example.com'; // 設定ファイルから取得
        $subject = "Amazon監視アラート: {$type}";
        $headers = 'From: system@example.com';
        
        if (function_exists('mail')) {
            mail($to, $subject, $message, $headers);
        }
    }
    
    /**
     * 監視統計情報取得
     * 
     * @return array 統計情報
     */
    public function getMonitoringStats() {
        try {
            $stats = [];
            
            // 総商品数
            $totalProducts = $this->db->query("SELECT COUNT(*) as count FROM amazon_research_data")->fetch();
            $stats['total_products'] = $totalProducts['count'];
            
            // 高優先度商品数
            $highPriority = $this->db->query("SELECT COUNT(*) as count FROM amazon_research_data WHERE is_high_priority = TRUE")->fetch();
            $stats['high_priority_products'] = $highPriority['count'];
            
            // 過去24時間の価格変動数
            $priceChanges = $this->db->query("SELECT COUNT(*) as count FROM amazon_price_history WHERE recorded_at > NOW() - INTERVAL '24 hours' AND change_trigger != 'stock_change'")->fetch();
            $stats['price_changes_24h'] = $priceChanges['count'];
            
            // 過去24時間の在庫変動数
            $stockChanges = $this->db->query("SELECT COUNT(*) as count FROM amazon_price_history WHERE recorded_at > NOW() - INTERVAL '24 hours' AND change_trigger = 'stock_change'")->fetch();
            $stats['stock_changes_24h'] = $stockChanges['count'];
            
            // 在庫切れ商品数
            $outOfStock = $this->db->query("SELECT COUNT(*) as count FROM amazon_research_data WHERE current_stock_status = 'OutOfStock'")->fetch();
            $stats['out_of_stock_products'] = $outOfStock['count'];
            
            // 最終チェック時刻別の商品分布
            $checkDistribution = $this->db->query("
                SELECT 
                    COUNT(CASE WHEN last_api_check_at > NOW() - INTERVAL '1 hour' THEN 1 END) as checked_1h,
                    COUNT(CASE WHEN last_api_check_at > NOW() - INTERVAL '6 hours' THEN 1 END) as checked_6h,
                    COUNT(CASE WHEN last_api_check_at > NOW() - INTERVAL '24 hours' THEN 1 END) as checked_24h,
                    COUNT(CASE WHEN last_api_check_at IS NULL THEN 1 END) as never_checked
                FROM amazon_research_data
            ")->fetch();
            
            $stats['check_distribution'] = $checkDistribution;
            
            return $stats;
            
        } catch (Exception $e) {
            $this->logger->error('統計情報取得エラー: ' . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 優先度の動的調整
     * 
     * @param string $asin ASIN
     * @param bool $isHighPriority 高優先度フラグ
     */
    public function updatePriority(string $asin, bool $isHighPriority) {
        try {
            $sql = "UPDATE amazon_research_data SET is_high_priority = ? WHERE asin = ?";
            $this->db->prepare($sql)->execute([$isHighPriority, $asin]);
            
            $this->logger->info('優先度更新', [
                'asin' => $asin,
                'is_high_priority' => $isHighPriority
            ]);
            
        } catch (Exception $e) {
            $this->logger->error('優先度更新エラー: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * バッチ優先度更新
     * 
     * @param array $asinPriorityMap ['asin' => bool, ...]
     */
    public function batchUpdatePriorities(array $asinPriorityMap) {
        try {
            $this->db->beginTransaction();
            
            foreach ($asinPriorityMap as $asin => $isHighPriority) {
                $this->updatePriority($asin, $isHighPriority);
            }
            
            $this->db->commit();
            
            $this->logger->info('バッチ優先度更新完了', [
                'updated_count' => count($asinPriorityMap)
            ]);
            
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logger->error('バッチ優先度更新エラー: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 古いデータのクリーンアップ
     * 
     * @param int $daysToKeep 保持日数
     */
    public function cleanupOldData(int $daysToKeep = 90) {
        try {
            // 古い価格履歴データの削除
            $sql = "DELETE FROM amazon_price_history WHERE recorded_at < NOW() - INTERVAL '{$daysToKeep} days'";
            $result = $this->db->exec($sql);
            
            $this->logger->info('古いデータクリーンアップ完了', [
                'days_to_keep' => $daysToKeep,
                'deleted_records' => $result
            ]);
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error('データクリーンアップエラー: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 監視エンジンのヘルスチェック
     * 
     * @return array ヘルスチェック結果
     */
    public function healthCheck() {
        $health = [
            'status' => 'ok',
            'checks' => [],
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        try {
            // データベース接続チェック
            $this->db->query("SELECT 1")->fetch();
            $health['checks']['database'] = 'ok';
            
            // テーブル存在チェック
            $tables = ['amazon_research_data', 'amazon_price_history'];
            foreach ($tables as $table) {
                $result = $this->db->query("SELECT COUNT(*) as count FROM {$table}")->fetch();
                $health['checks']["table_{$table}"] = 'ok';
                $health['checks']["table_{$table}_count"] = $result['count'];
            }
            
            // API設定チェック
            if (empty($this->config['credentials']['access_key'])) {
                $health['checks']['api_config'] = 'error';
                $health['status'] = 'warning';
            } else {
                $health['checks']['api_config'] = 'ok';
            }
            
            // ログディレクトリチェック
            $logDir = dirname($this->config['logging']['file']);
            if (!is_writable($logDir)) {
                $health['checks']['log_directory'] = 'error';
                $health['status'] = 'warning';
            } else {
                $health['checks']['log_directory'] = 'ok';
            }
            
        } catch (Exception $e) {
            $health['status'] = 'error';
            $health['error'] = $e->getMessage();
        }
        
        return $health;
    }
}
?>