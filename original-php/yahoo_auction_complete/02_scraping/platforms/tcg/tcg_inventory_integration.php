<?php
/**
 * TCG在庫管理統合クラス
 * 
 * 既存の在庫管理システム(10_zaiko)と完全連携
 * 11サイトのTCG商品を統一管理
 * 
 * @version 1.0.0
 * @created 2025-09-26
 */

class TCGInventoryManager {
    private $pdo;
    private $logger;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->initializeLogger();
    }
    
    /**
     * ロガー初期化
     */
    private function initializeLogger() {
        $logDir = __DIR__ . '/../../logs/inventory';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
        }
        
        $this->logger = new class($logDir) {
            private $logDir;
            
            public function __construct($logDir) {
                $this->logDir = $logDir;
            }
            
            public function info($message) {
                $this->writeLog('INFO', $message);
            }
            
            public function error($message) {
                $this->writeLog('ERROR', $message);
            }
            
            private function writeLog($level, $message) {
                $timestamp = date('Y-m-d H:i:s');
                $logFile = $this->logDir . '/' . date('Y-m-d') . '_tcg_inventory.log';
                $logMessage = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
                file_put_contents($logFile, $logMessage, FILE_APPEND);
            }
        };
    }
    
    /**
     * TCG商品を在庫管理システムに登録
     */
    public function registerTCGProduct($tcgProductId, $platform, $url, $cardData) {
        try {
            $this->logger->info("在庫管理登録開始: TCGProductID={$tcgProductId}, Platform={$platform}");
            
            // 重複チェック
            if ($this->isRegistered($tcgProductId, $platform)) {
                $this->logger->info("既に登録済み: TCGProductID={$tcgProductId}");
                return $this->updateExisting($tcgProductId, $platform, $cardData);
            }
            
            // 新規登録
            $stmt = $this->pdo->prepare("
                INSERT INTO inventory_management (
                    tcg_product_id,
                    product_id,
                    source_platform,
                    source_url,
                    product_name,
                    tcg_category,
                    card_name,
                    current_price,
                    monitoring_enabled,
                    alert_threshold,
                    check_interval_hours,
                    created_at,
                    last_checked_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, true, ?, 2, NOW(), NOW()
                )
            ");
            
            $stmt->execute([
                $tcgProductId,
                $cardData['product_id'] ?? '',
                $platform,
                $url,
                $cardData['card_name'] ?? '',
                $cardData['tcg_category'] ?? 'unknown',
                $cardData['card_name'] ?? '',
                $cardData['price'] ?? 0.0,
                $this->calculateAlertThreshold($cardData['price'] ?? 0.0)
            ]);
            
            $inventoryId = $this->pdo->lastInsertId();
            
            $this->logger->info("在庫管理登録完了: InventoryID={$inventoryId}");
            
            return [
                'success' => true,
                'inventory_id' => $inventoryId,
                'action' => 'registered'
            ];
            
        } catch (Exception $e) {
            $this->logger->error("在庫管理登録エラー: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 登録済みチェック
     */
    private function isRegistered($tcgProductId, $platform) {
        $stmt = $this->pdo->prepare("
            SELECT id FROM inventory_management
            WHERE tcg_product_id = ? AND source_platform = ?
        ");
        $stmt->execute([$tcgProductId, $platform]);
        return $stmt->fetch() !== false;
    }
    
    /**
     * 既存レコード更新
     */
    private function updateExisting($tcgProductId, $platform, $cardData) {
        $stmt = $this->pdo->prepare("
            UPDATE inventory_management
            SET current_price = ?,
                last_checked_at = NOW(),
                updated_at = NOW()
            WHERE tcg_product_id = ? AND source_platform = ?
        ");
        
        $stmt->execute([
            $cardData['price'] ?? 0.0,
            $tcgProductId,
            $platform
        ]);
        
        return [
            'success' => true,
            'action' => 'updated'
        ];
    }
    
    /**
     * アラート閾値計算（価格の80%）
     */
    private function calculateAlertThreshold($price) {
        return round($price * 0.8, 2);
    }
    
    /**
     * TCG在庫チェック実行
     */
    public function checkTCGStock($inventoryId) {
        try {
            // 在庫情報取得
            $inventory = $this->getInventoryInfo($inventoryId);
            
            if (!$inventory) {
                throw new Exception("在庫情報が見つかりません: ID={$inventoryId}");
            }
            
            $this->logger->info("在庫チェック開始: {$inventory['card_name']} ({$inventory['source_platform']})");
            
            // プラットフォーム別スクレイパー取得
            $scraper = $this->getScraperForPlatform($inventory['source_platform']);
            
            if (!$scraper) {
                throw new Exception("スクレイパーが見つかりません: {$inventory['source_platform']}");
            }
            
            // 最新データ取得
            $currentData = $scraper->scrapeProduct($inventory['source_url']);
            
            if (!$currentData['success']) {
                throw new Exception("スクレイピング失敗: " . ($currentData['error'] ?? 'Unknown'));
            }
            
            // 変動検知
            $changes = $this->detectChanges($inventory, $currentData['data']);
            
            // 在庫履歴記録
            $this->recordStockHistory($inventoryId, $currentData['data'], $changes);
            
            // アラート判定
            if ($this->shouldSendAlert($inventory, $changes)) {
                $this->sendAlert($inventory, $changes);
            }
            
            $this->logger->info("在庫チェック完了: {$inventory['card_name']}");
            
            return [
                'success' => true,
                'changes' => $changes,
                'current_data' => $currentData['data']
            ];
            
        } catch (Exception $e) {
            $this->logger->error("在庫チェックエラー: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 在庫情報取得
     */
    private function getInventoryInfo($inventoryId) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM inventory_management
            WHERE id = ?
        ");
        $stmt->execute([$inventoryId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * プラットフォーム別スクレイパー取得
     */
    private function getScraperForPlatform($platform) {
        // 統合APIの関数を再利用
        require_once __DIR__ . '/../api/tcg_unified_scraping_api.php';
        return getScraperForPlatform($platform, $this->pdo);
    }
    
    /**
     * 変動検知
     */
    private function detectChanges($inventory, $currentData) {
        $changes = [];
        
        // 価格変動
        $oldPrice = (float)$inventory['current_price'];
        $newPrice = (float)($currentData['price'] ?? 0);
        
        if ($oldPrice != $newPrice) {
            $priceChange = $newPrice - $oldPrice;
            $priceChangePercent = $oldPrice > 0 ? round(($priceChange / $oldPrice) * 100, 2) : 0;
            
            $changes['price'] = [
                'old' => $oldPrice,
                'new' => $newPrice,
                'change' => $priceChange,
                'change_percent' => $priceChangePercent
            ];
        }
        
        // 在庫状態変動
        $oldStock = $inventory['stock_status'] ?? 'unknown';
        $newStock = $currentData['stock_status'] ?? 'unknown';
        
        if ($oldStock != $newStock) {
            $changes['stock_status'] = [
                'old' => $oldStock,
                'new' => $newStock
            ];
        }
        
        return $changes;
    }
    
    /**
     * 在庫履歴記録
     */
    private function recordStockHistory($inventoryId, $currentData, $changes) {
        // inventory_historyテーブルに記録
        $stmt = $this->pdo->prepare("
            INSERT INTO inventory_history (
                inventory_id,
                price,
                stock_status,
                changes_detected,
                checked_at
            ) VALUES (?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $inventoryId,
            $currentData['price'] ?? 0,
            $currentData['stock_status'] ?? 'unknown',
            json_encode($changes)
        ]);
        
        // 在庫管理テーブル更新
        $updateStmt = $this->pdo->prepare("
            UPDATE inventory_management
            SET current_price = ?,
                stock_status = ?,
                last_checked_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ");
        
        $updateStmt->execute([
            $currentData['price'] ?? 0,
            $currentData['stock_status'] ?? 'unknown',
            $inventoryId
        ]);
    }
    
    /**
     * アラート判定
     */
    private function shouldSendAlert($inventory, $changes) {
        if (empty($changes)) {
            return false;
        }
        
        // アラート有効チェック
        if (!$inventory['monitoring_enabled']) {
            return false;
        }
        
        // 価格下落アラート
        if (isset($changes['price'])) {
            $newPrice = $changes['price']['new'];
            $threshold = (float)$inventory['alert_threshold'];
            
            if ($newPrice <= $threshold && $newPrice > 0) {
                return true;
            }
        }
        
        // 在庫復活アラート
        if (isset($changes['stock_status'])) {
            if ($changes['stock_status']['old'] === 'sold_out' && 
                $changes['stock_status']['new'] === 'in_stock') {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * アラート送信
     */
    private function sendAlert($inventory, $changes) {
        $this->logger->info("アラート送信: {$inventory['card_name']}");
        
        // アラートログ記録
        $stmt = $this->pdo->prepare("
            INSERT INTO inventory_alerts (
                inventory_id,
                alert_type,
                alert_message,
                changes,
                created_at
            ) VALUES (?, ?, ?, ?, NOW())
        ");
        
        $alertType = isset($changes['price']) ? 'price_drop' : 'stock_available';
        $alertMessage = $this->buildAlertMessage($inventory, $changes);
        
        $stmt->execute([
            $inventory['id'],
            $alertType,
            $alertMessage,
            json_encode($changes)
        ]);
        
        // TODO: メール通知、Slack通知等の実装
    }
    
    /**
     * アラートメッセージ構築
     */
    private function buildAlertMessage($inventory, $changes) {
        $messages = [];
        
        if (isset($changes['price'])) {
            $messages[] = sprintf(
                "価格変動: ¥%s → ¥%s (%+.1f%%)",
                number_format($changes['price']['old']),
                number_format($changes['price']['new']),
                $changes['price']['change_percent']
            );
        }
        
        if (isset($changes['stock_status'])) {
            $messages[] = sprintf(
                "在庫状態変更: %s → %s",
                $changes['stock_status']['old'],
                $changes['stock_status']['new']
            );
        }
        
        return implode(', ', $messages);
    }
    
    /**
     * 一括在庫チェック（cron用）
     */
    public function checkAllTCGStock() {
        $this->logger->info("一括在庫チェック開始");
        
        // 監視対象の在庫取得
        $stmt = $this->pdo->query("
            SELECT id FROM inventory_management
            WHERE monitoring_enabled = true
            AND source_platform IN (
                'singlestar', 'hareruya_mtg', 'hareruya2', 'hareruya3',
                'fullahead', 'cardrush', 'yuyu_tei', 'furu1',
                'pokeca_net', 'dorasuta', 'snkrdunk'
            )
            AND (
                last_checked_at IS NULL
                OR last_checked_at < NOW() - INTERVAL check_interval_hours HOUR
            )
            ORDER BY last_checked_at ASC NULLS FIRST
            LIMIT 100
        ");
        
        $inventories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $results = [];
        
        foreach ($inventories as $inventory) {
            $result = $this->checkTCGStock($inventory['id']);
            $results[] = $result;
            
            // レート制限
            usleep(500000); // 0.5秒待機
        }
        
        $this->logger->info("一括在庫チェック完了: " . count($results) . "件");
        
        return $results;
    }
}
