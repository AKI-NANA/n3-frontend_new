<?php
/**
 * NAGANO-3 在庫管理システム連携
 * 
 * 機能: 在庫状況取得・更新・自動減算・在庫切れ通知
 * アーキテクチャ: common/integrations層・既存システム連携
 * リアルタイム: WebSocket対応・即座在庫反映
 */

class ZaikoKanriIntegration {
    
    private $db_connection;
    private $cache_manager;
    private $notification_manager;
    private $config;
    
    // 在庫ステータス定数
    private const ZAIKO_STATUS_SUFFICIENT = 'sufficient'; // 十分
    private const ZAIKO_STATUS_LOW = 'low'; // 少ない
    private const ZAIKO_STATUS_CRITICAL = 'critical'; // 危険
    private const ZAIKO_STATUS_OUT_OF_STOCK = 'out_of_stock'; // 在庫切れ
    
    public function __construct() {
        $this->loadConfiguration();
        $this->initializeDatabase();
        $this->initializeCacheManager();
        $this->initializeNotificationManager();
        
        error_log("在庫管理システム連携 初期化完了");
    }
    
    /**
     * 設定読み込み
     */
    private function loadConfiguration() {
        $config_file = '../../../config/zaiko_kanri_config.php';
        
        if (!file_exists($config_file)) {
            // デフォルト設定で作成
            $this->createDefaultConfig($config_file);
        }
        
        $this->config = include $config_file;
    }
    
    /**
     * 在庫状況取得
     */
    public function getZaikoJokyo($sku) {
        try {
            // キャッシュ確認
            $cache_key = "zaiko_jokyo_{$sku}";
            $cached_data = $this->cache_manager->get($cache_key);
            
            if ($cached_data && !$this->isCacheExpired($cached_data)) {
                return $cached_data['data'];
            }
            
            // データベースから在庫情報取得
            $zaiko_data = $this->fetchZaikoFromDatabase($sku);
            
            // 追加計算処理
            $zaiko_jokyo = $this->calculateZaikoStatus($zaiko_data);
            
            // キャッシュ保存
            $this->cache_manager->set($cache_key, [
                'data' => $zaiko_jokyo,
                'timestamp' => time(),
                'ttl' => $this->config['cache']['zaiko_ttl']
            ]);
            
            return $zaiko_jokyo;
            
        } catch (Exception $e) {
            error_log("在庫状況取得エラー (SKU: {$sku}): " . $e->getMessage());
            
            // フォールバック: 基本的な在庫情報を返す
            return $this->getFallbackZaikoData($sku);
        }
    }
    
    /**
     * データベースから在庫データ取得
     */
    private function fetchZaikoFromDatabase($sku) {
        $query = "
            SELECT 
                zi.sku,
                zi.current_stock,
                zi.reserved_stock,
                zi.available_stock,
                zi.minimum_stock_level,
                zi.maximum_stock_level,
                zi.storage_location,
                zi.last_purchase_date,
                zi.last_purchase_price,
                zi.last_updated,
                zi.status as stock_status,
                
                -- 仕入れ履歴情報
                sh.average_purchase_price,
                sh.total_purchases,
                sh.last_supplier_id,
                sh.preferred_supplier_id,
                
                -- 供給者情報
                s.supplier_name,
                s.supplier_url,
                s.reliability_score,
                s.average_delivery_days,
                
                -- 在庫移動履歴（最新）
                zm.movement_type,
                zm.quantity_change,
                zm.movement_date,
                zm.reference_order_id,
                zm.notes as movement_notes
                
            FROM zaiko_items zi
            LEFT JOIN zaiko_statistics sh ON zi.sku = sh.sku
            LEFT JOIN suppliers s ON sh.preferred_supplier_id = s.supplier_id
            LEFT JOIN zaiko_movements zm ON zi.sku = zm.sku 
                AND zm.movement_date = (
                    SELECT MAX(movement_date) 
                    FROM zaiko_movements 
                    WHERE sku = zi.sku
                )
            WHERE zi.sku = :sku
            AND zi.active = 1
        ";
        
        $stmt = $this->db_connection->prepare($query);
        $stmt->bindParam(':sku', $sku, PDO::PARAM_STR);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            // SKUが見つからない場合は新規作成
            return $this->createNewZaikoItem($sku);
        }
        
        return $result;
    }
    
    /**
     * 在庫ステータス計算
     */
    private function calculateZaikoStatus($zaiko_data) {
        $current_stock = (int) $zaiko_data['current_stock'];
        $reserved_stock = (int) $zaiko_data['reserved_stock'];
        $available_stock = $current_stock - $reserved_stock;
        $minimum_level = (int) $zaiko_data['minimum_stock_level'];
        
        // 在庫ステータス判定
        $status = self::ZAIKO_STATUS_SUFFICIENT;
        $urgency_level = 0;
        $alert_message = '';
        
        if ($available_stock <= 0) {
            $status = self::ZAIKO_STATUS_OUT_OF_STOCK;
            $urgency_level = 4;
            $alert_message = '在庫切れ - 即座仕入れ必要';
        } elseif ($available_stock <= 1) {
            $status = self::ZAIKO_STATUS_CRITICAL;
            $urgency_level = 3;
            $alert_message = '在庫危険レベル - 緊急仕入れ推奨';
        } elseif ($available_stock <= $minimum_level) {
            $status = self::ZAIKO_STATUS_LOW;
            $urgency_level = 2;
            $alert_message = '在庫少 - 仕入れ検討';
        } else {
            $urgency_level = 1;
            $alert_message = '在庫十分';
        }
        
        // 在庫回転率計算
        $turnover_rate = $this->calculateTurnoverRate($zaiko_data['sku']);
        
        // 予測在庫切れ日
        $predicted_stockout_date = $this->predictStockoutDate($available_stock, $turnover_rate);
        
        // 推奨発注量計算
        $recommended_order_quantity = $this->calculateRecommendedOrderQuantity($zaiko_data, $turnover_rate);
        
        return [
            'sku' => $zaiko_data['sku'],
            'current_stock' => $current_stock,
            'reserved_stock' => $reserved_stock,
            'available_stock' => $available_stock,
            'minimum_stock_level' => $minimum_level,
            'maximum_stock_level' => (int) $zaiko_data['maximum_stock_level'],
            'storage_location' => $zaiko_data['storage_location'],
            'last_purchase_date' => $zaiko_data['last_purchase_date'],
            'last_purchase_price' => (float) $zaiko_data['last_purchase_price'],
            'last_updated' => $zaiko_data['last_updated'],
            
            // 計算値
            'status' => $status,
            'urgency_level' => $urgency_level,
            'alert_message' => $alert_message,
            'turnover_rate' => $turnover_rate,
            'predicted_stockout_date' => $predicted_stockout_date,
            'recommended_order_quantity' => $recommended_order_quantity,
            'days_until_stockout' => $predicted_stockout_date ? 
                ceil((strtotime($predicted_stockout_date) - time()) / (60*60*24)) : null,
            
            // 統計情報
            'average_purchase_price' => (float) $zaiko_data['average_purchase_price'],
            'total_purchases' => (int) $zaiko_data['total_purchases'],
            'supplier_info' => [
                'preferred_supplier_id' => $zaiko_data['preferred_supplier_id'],
                'supplier_name' => $zaiko_data['supplier_name'],
                'supplier_url' => $zaiko_data['supplier_url'],
                'reliability_score' => (float) $zaiko_data['reliability_score'],
                'average_delivery_days' => (int) $zaiko_data['average_delivery_days']
            ],
            
            // 最新移動履歴
            'last_movement' => [
                'type' => $zaiko_data['movement_type'],
                'quantity_change' => (int) $zaiko_data['quantity_change'],
                'date' => $zaiko_data['movement_date'],
                'reference_order_id' => $zaiko_data['reference_order_id'],
                'notes' => $zaiko_data['movement_notes']
            ]
        ];
    }
    
    /**
     * 在庫減算（受注時）
     */
    public function reserveStock($sku, $quantity, $order_id, $notes = '') {
        try {
            // トランザクション開始
            $this->db_connection->beginTransaction();
            
            // 現在の在庫確認
            $current_zaiko = $this->getZaikoJokyo($sku);
            
            if ($current_zaiko['available_stock'] < $quantity) {
                throw new Exception("在庫不足: 要求数量 {$quantity}, 利用可能在庫 {$current_zaiko['available_stock']}");
            }
            
            // 予約在庫増加
            $this->updateReservedStock($sku, $quantity, 'increase');
            
            // 在庫移動履歴記録
            $this->recordZaikoMovement($sku, -$quantity, 'reserved', $order_id, $notes);
            
            // キャッシュクリア
            $this->clearZaikoCache($sku);
            
            $this->db_connection->commit();
            
            // 在庫アラート確認
            $updated_zaiko = $this->getZaikoJokyo($sku);
            $this->checkStockAlerts($updated_zaiko);
            
            error_log("在庫予約完了: SKU {$sku}, 数量 {$quantity}, 注文 {$order_id}");
            
            return true;
            
        } catch (Exception $e) {
            $this->db_connection->rollBack();
            error_log("在庫予約エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 在庫復旧（キャンセル時）
     */
    public function releaseStock($sku, $quantity, $order_id, $notes = '') {
        try {
            $this->db_connection->beginTransaction();
            
            // 予約在庫減少
            $this->updateReservedStock($sku, $quantity, 'decrease');
            
            // 在庫移動履歴記録
            $this->recordZaikoMovement($sku, $quantity, 'released', $order_id, $notes);
            
            // キャッシュクリア
            $this->clearZaikoCache($sku);
            
            $this->db_connection->commit();
            
            error_log("在庫復旧完了: SKU {$sku}, 数量 {$quantity}, 注文 {$order_id}");
            
            return true;
            
        } catch (Exception $e) {
            $this->db_connection->rollBack();
            error_log("在庫復旧エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 在庫実減算（出荷時）
     */
    public function confirmStockUsage($sku, $quantity, $order_id, $notes = '') {
        try {
            $this->db_connection->beginTransaction();
            
            // 実在庫減少
            $this->updateCurrentStock($sku, $quantity, 'decrease');
            
            // 予約在庫減少
            $this->updateReservedStock($sku, $quantity, 'decrease');
            
            // 在庫移動履歴記録
            $this->recordZaikoMovement($sku, -$quantity, 'shipped', $order_id, $notes);
            
            // キャッシュクリア
            $this->clearZaikoCache($sku);
            
            $this->db_connection->commit();
            
            error_log("在庫出荷確定: SKU {$sku}, 数量 {$quantity}, 注文 {$order_id}");
            
            return true;
            
        } catch (Exception $e) {
            $this->db_connection->rollBack();
            error_log("在庫出荷確定エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 仕入れ在庫追加
     */
    public function addPurchasedStock($sku, $quantity, $purchase_price, $supplier_id, $notes = '') {
        try {
            $this->db_connection->beginTransaction();
            
            // 実在庫増加
            $this->updateCurrentStock($sku, $quantity, 'increase');
            
            // 在庫移動履歴記録
            $this->recordZaikoMovement($sku, $quantity, 'purchased', null, $notes);
            
            // 仕入れ情報更新
            $this->updatePurchaseHistory($sku, $quantity, $purchase_price, $supplier_id);
            
            // キャッシュクリア
            $this->clearZaikoCache($sku);
            
            $this->db_connection->commit();
            
            error_log("仕入れ在庫追加: SKU {$sku}, 数量 {$quantity}, 価格 {$purchase_price}");
            
            return true;
            
        } catch (Exception $e) {
            $this->db_connection->rollBack();
            error_log("仕入れ在庫追加エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 在庫回転率計算
     */
    private function calculateTurnoverRate($sku) {
        $query = "
            SELECT 
                COUNT(*) as total_sales,
                SUM(quantity_change) as total_quantity_sold,
                MIN(movement_date) as earliest_sale,
                MAX(movement_date) as latest_sale
            FROM zaiko_movements 
            WHERE sku = :sku 
            AND movement_type = 'shipped'
            AND movement_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        ";
        
        $stmt = $this->db_connection->prepare($query);
        $stmt->bindParam(':sku', $sku, PDO::PARAM_STR);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result || $result['total_sales'] == 0) {
            return 0;
        }
        
        $days_in_period = 90;
        $total_sold = abs($result['total_quantity_sold']);
        
        // 日次平均販売数
        return $total_sold / $days_in_period;
    }
    
    /**
     * 在庫切れ予測日計算
     */
    private function predictStockoutDate($available_stock, $turnover_rate) {
        if ($turnover_rate <= 0 || $available_stock <= 0) {
            return null;
        }
        
        $days_until_stockout = $available_stock / $turnover_rate;
        
        return date('Y-m-d', time() + ($days_until_stockout * 24 * 60 * 60));
    }
    
    /**
     * 推奨発注量計算
     */
    private function calculateRecommendedOrderQuantity($zaiko_data, $turnover_rate) {
        $minimum_level = (int) $zaiko_data['minimum_stock_level'];
        $maximum_level = (int) $zaiko_data['maximum_stock_level'];
        $current_stock = (int) $zaiko_data['current_stock'];
        
        // 安全在庫期間（日数）
        $safety_period = $this->config['calculations']['safety_stock_days'] ?? 14;
        
        // 基本発注量 = 最大在庫レベル - 現在在庫
        $basic_order_quantity = max(0, $maximum_level - $current_stock);
        
        // 需要予測ベース発注量
        $demand_based_quantity = $turnover_rate * $safety_period;
        
        // より大きい方を推奨量とする
        return (int) max($basic_order_quantity, $demand_based_quantity);
    }
    
    /**
     * 予約在庫更新
     */
    private function updateReservedStock($sku, $quantity, $operation) {
        $operator = ($operation === 'increase') ? '+' : '-';
        
        $query = "
            UPDATE zaiko_items 
            SET reserved_stock = reserved_stock {$operator} :quantity,
                last_updated = NOW()
            WHERE sku = :sku
        ";
        
        $stmt = $this->db_connection->prepare($query);
        $stmt->bindParam(':quantity', $quantity, PDO::PARAM_INT);
        $stmt->bindParam(':sku', $sku, PDO::PARAM_STR);
        
        return $stmt->execute();
    }
    
    /**
     * 実在庫更新
     */
    private function updateCurrentStock($sku, $quantity, $operation) {
        $operator = ($operation === 'increase') ? '+' : '-';
        
        $query = "
            UPDATE zaiko_items 
            SET current_stock = current_stock {$operator} :quantity,
                available_stock = current_stock - reserved_stock,
                last_updated = NOW()
            WHERE sku = :sku
        ";
        
        $stmt = $this->db_connection->prepare($query);
        $stmt->bindParam(':quantity', $quantity, PDO::PARAM_INT);
        $stmt->bindParam(':sku', $sku, PDO::PARAM_STR);
        
        return $stmt->execute();
    }
    
    /**
     * 在庫移動履歴記録
     */
    private function recordZaikoMovement($sku, $quantity_change, $movement_type, $order_id = null, $notes = '') {
        $query = "
            INSERT INTO zaiko_movements (
                sku, quantity_change, movement_type, movement_date, 
                reference_order_id, notes, created_by
            ) VALUES (
                :sku, :quantity_change, :movement_type, NOW(), 
                :order_id, :notes, :created_by
            )
        ";
        
        $stmt = $this->db_connection->prepare($query);
        $stmt->bindParam(':sku', $sku, PDO::PARAM_STR);
        $stmt->bindParam(':quantity_change', $quantity_change, PDO::PARAM_INT);
        $stmt->bindParam(':movement_type', $movement_type, PDO::PARAM_STR);
        $stmt->bindParam(':order_id', $order_id, PDO::PARAM_STR);
        $stmt->bindParam(':notes', $notes, PDO::PARAM_STR);
        $stmt->bindParam(':created_by', $_SESSION['user_id'] ?? 'system', PDO::PARAM_STR);
        
        return $stmt->execute();
    }
    
    /**
     * 仕入れ履歴更新
     */
    private function updatePurchaseHistory($sku, $quantity, $purchase_price, $supplier_id) {
        // 仕入れ詳細記録
        $query = "
            INSERT INTO purchase_history (
                sku, quantity, purchase_price, supplier_id, purchase_date
            ) VALUES (
                :sku, :quantity, :purchase_price, :supplier_id, NOW()
            )
        ";
        
        $stmt = $this->db_connection->prepare($query);
        $stmt->bindParam(':sku', $sku, PDO::PARAM_STR);
        $stmt->bindParam(':quantity', $quantity, PDO::PARAM_INT);
        $stmt->bindParam(':purchase_price', $purchase_price, PDO::PARAM_STR);
        $stmt->bindParam(':supplier_id', $supplier_id, PDO::PARAM_STR);
        $stmt->execute();
        
        // 在庫アイテムの最終仕入れ情報更新
        $update_query = "
            UPDATE zaiko_items 
            SET last_purchase_date = NOW(),
                last_purchase_price = :purchase_price
            WHERE sku = :sku
        ";
        
        $update_stmt = $this->db_connection->prepare($update_query);
        $update_stmt->bindParam(':purchase_price', $purchase_price, PDO::PARAM_STR);
        $update_stmt->bindParam(':sku', $sku, PDO::PARAM_STR);
        $update_stmt->execute();
        
        // 統計情報更新
        $this->updateZaikoStatistics($sku);
    }
    
    /**
     * 在庫統計情報更新
     */
    private function updateZaikoStatistics($sku) {
        $query = "
            INSERT INTO zaiko_statistics (sku, average_purchase_price, total_purchases, last_supplier_id)
            SELECT 
                :sku,
                AVG(purchase_price) as avg_price,
                COUNT(*) as total_count,
                (SELECT supplier_id FROM purchase_history WHERE sku = :sku ORDER BY purchase_date DESC LIMIT 1) as last_supplier
            FROM purchase_history 
            WHERE sku = :sku
            ON DUPLICATE KEY UPDATE
                average_purchase_price = VALUES(average_purchase_price),
                total_purchases = VALUES(total_purchases),
                last_supplier_id = VALUES(last_supplier_id),
                updated_at = NOW()
        ";
        
        $stmt = $this->db_connection->prepare($query);
        $stmt->bindParam(':sku', $sku, PDO::PARAM_STR);
        
        return $stmt->execute();
    }
    
    /**
     * 在庫アラート確認
     */
    private function checkStockAlerts($zaiko_jokyo) {
        $sku = $zaiko_jokyo['sku'];
        $status = $zaiko_jokyo['status'];
        $urgency_level = $zaiko_jokyo['urgency_level'];
        
        // アラート設定確認
        if (!$this->config['alerts']['enabled']) {
            return;
        }
        
        // アラート送信条件
        $should_alert = false;
        $alert_type = '';
        $alert_message = '';
        
        switch ($status) {
            case self::ZAIKO_STATUS_OUT_OF_STOCK:
                if ($this->config['alerts']['out_of_stock']) {
                    $should_alert = true;
                    $alert_type = 'critical';
                    $alert_message = "【緊急】在庫切れ: {$sku}";
                }
                break;
                
            case self::ZAIKO_STATUS_CRITICAL:
                if ($this->config['alerts']['critical_level']) {
                    $should_alert = true;
                    $alert_type = 'warning';
                    $alert_message = "【警告】在庫危険レベル: {$sku} (残り{$zaiko_jokyo['available_stock']}個)";
                }
                break;
                
            case self::ZAIKO_STATUS_LOW:
                if ($this->config['alerts']['low_stock']) {
                    $should_alert = true;
                    $alert_type = 'info';
                    $alert_message = "【注意】在庫少: {$sku} (残り{$zaiko_jokyo['available_stock']}個)";
                }
                break;
        }
        
        if ($should_alert) {
            $this->sendStockAlert($alert_type, $alert_message, $zaiko_jokyo);
        }
    }
    
    /**
     * 在庫アラート送信
     */
    private function sendStockAlert($alert_type, $message, $zaiko_jokyo) {
        $alert_data = [
            'type' => $alert_type,
            'message' => $message,
            'sku' => $zaiko_jokyo['sku'],
            'current_stock' => $zaiko_jokyo['current_stock'],
            'available_stock' => $zaiko_jokyo['available_stock'],
            'urgency_level' => $zaiko_jokyo['urgency_level'],
            'predicted_stockout_date' => $zaiko_jokyo['predicted_stockout_date'],
            'recommended_order_quantity' => $zaiko_jokyo['recommended_order_quantity'],
            'timestamp' => time()
        ];
        
        // 通知管理システムに送信
        $this->notification_manager->sendAlert('stock_alert', $alert_data);
        
        // ログ記録
        error_log("在庫アラート送信: {$alert_type} - {$message}");
    }
    
    /**
     * 新規在庫アイテム作成
     */
    private function createNewZaikoItem($sku) {
        $query = "
            INSERT INTO zaiko_items (
                sku, current_stock, reserved_stock, available_stock, 
                minimum_stock_level, maximum_stock_level, status, 
                storage_location, created_at, last_updated
            ) VALUES (
                :sku, 0, 0, 0, 
                :min_level, :max_level, :status, 
                :storage_location, NOW(), NOW()
            )
        ";
        
        $default_min_level = $this->config['defaults']['minimum_stock_level'] ?? 2;
        $default_max_level = $this->config['defaults']['maximum_stock_level'] ?? 20;
        $default_storage = $this->config['defaults']['storage_location'] ?? 'A-001';
        
        $stmt = $this->db_connection->prepare($query);
        $stmt->bindParam(':sku', $sku, PDO::PARAM_STR);
        $stmt->bindParam(':min_level', $default_min_level, PDO::PARAM_INT);
        $stmt->bindParam(':max_level', $default_max_level, PDO::PARAM_INT);
        $stmt->bindParam(':status', self::ZAIKO_STATUS_OUT_OF_STOCK, PDO::PARAM_STR);
        $stmt->bindParam(':storage_location', $default_storage, PDO::PARAM_STR);
        
        $stmt->execute();
        
        // 作成した新規データを返す
        return [
            'sku' => $sku,
            'current_stock' => 0,
            'reserved_stock' => 0,
            'available_stock' => 0,
            'minimum_stock_level' => $default_min_level,
            'maximum_stock_level' => $default_max_level,
            'storage_location' => $default_storage,
            'last_purchase_date' => null,
            'last_purchase_price' => 0,
            'last_updated' => date('Y-m-d H:i:s'),
            'stock_status' => self::ZAIKO_STATUS_OUT_OF_STOCK,
            'average_purchase_price' => 0,
            'total_purchases' => 0,
            'last_supplier_id' => null,
            'preferred_supplier_id' => null,
            'supplier_name' => null,
            'supplier_url' => null,
            'reliability_score' => 0,
            'average_delivery_days' => 0,
            'movement_type' => null,
            'quantity_change' => 0,
            'movement_date' => null,
            'reference_order_id' => null,
            'movement_notes' => null
        ];
    }
    
    /**
     * フォールバック在庫データ
     */
    private function getFallbackZaikoData($sku) {
        return [
            'sku' => $sku,
            'current_stock' => 0,
            'reserved_stock' => 0,
            'available_stock' => 0,
            'minimum_stock_level' => 2,
            'maximum_stock_level' => 20,
            'storage_location' => 'Unknown',
            'last_purchase_date' => null,
            'last_purchase_price' => 0,
            'last_updated' => date('Y-m-d H:i:s'),
            'status' => self::ZAIKO_STATUS_OUT_OF_STOCK,
            'urgency_level' => 4,
            'alert_message' => 'データ取得エラー - 確認が必要',
            'turnover_rate' => 0,
            'predicted_stockout_date' => null,
            'recommended_order_quantity' => 5,
            'days_until_stockout' => null,
            'average_purchase_price' => 0,
            'total_purchases' => 0,
            'supplier_info' => [
                'preferred_supplier_id' => null,
                'supplier_name' => null,
                'supplier_url' => null,
                'reliability_score' => 0,
                'average_delivery_days' => 0
            ],
            'last_movement' => [
                'type' => null,
                'quantity_change' => 0,
                'date' => null,
                'reference_order_id' => null,
                'notes' => null
            ]
        ];
    }
    
    /**
     * 一括在庫状況取得
     */
    public function getBulkZaikoJokyo($sku_list) {
        $results = [];
        
        foreach ($sku_list as $sku) {
            $results[$sku] = $this->getZaikoJokyo($sku);
        }
        
        return $results;
    }
    
    /**
     * 在庫レポート生成
     */
    public function generateZaikoReport($period_days = 30) {
        $query = "
            SELECT 
                zi.sku,
                zi.current_stock,
                zi.available_stock,
                zi.status,
                zi.storage_location,
                COUNT(zm.movement_id) as movement_count,
                SUM(CASE WHEN zm.movement_type = 'shipped' THEN ABS(zm.quantity_change) ELSE 0 END) as total_shipped,
                SUM(CASE WHEN zm.movement_type = 'purchased' THEN zm.quantity_change ELSE 0 END) as total_purchased,
                AVG(CASE WHEN zm.movement_type = 'shipped' THEN ABS(zm.quantity_change) ELSE NULL END) as avg_shipment_size
            FROM zaiko_items zi
            LEFT JOIN zaiko_movements zm ON zi.sku = zm.sku 
                AND zm.movement_date >= DATE_SUB(NOW(), INTERVAL :period_days DAY)
            WHERE zi.active = 1
            GROUP BY zi.sku
            ORDER BY total_shipped DESC
        ";
        
        $stmt = $this->db_connection->prepare($query);
        $stmt->bindParam(':period_days', $period_days, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * キャッシュクリア
     */
    private function clearZaikoCache($sku) {
        $cache_key = "zaiko_jokyo_{$sku}";
        $this->cache_manager->delete($cache_key);
    }
    
    /**
     * キャッシュ有効期限確認
     */
    private function isCacheExpired($cached_data) {
        $cache_age = time() - $cached_data['timestamp'];
        $max_age = $cached_data['ttl'] ?? $this->config['cache']['zaiko_ttl'];
        
        return $cache_age > $max_age;
    }
    
    /**
     * データベース初期化
     */
    private function initializeDatabase() {
        try {
            $db_config = $this->config['database'];
            
            $dsn = "mysql:host={$db_config['host']};port={$db_config['port']};dbname={$db_config['database']};charset={$db_config['charset']}";
            
            $this->db_connection = new PDO($dsn, $db_config['username'], $db_config['password'], $db_config['options']);
            
            // テーブル存在確認・作成
            $this->ensureTablesExist();
            
        } catch (PDOException $e) {
            error_log("在庫管理DB接続エラー: " . $e->getMessage());
            throw new Exception("データベース接続に失敗しました");
        }
    }
    
    /**
     * テーブル存在確認・作成
     */
    private function ensureTablesExist() {
        $tables = [
            'zaiko_items' => $this->getZaikoItemsTableSchema(),
            'zaiko_movements' => $this->getZaikoMovementsTableSchema(),
            'zaiko_statistics' => $this->getZaikoStatisticsTableSchema(),
            'purchase_history' => $this->getPurchaseHistoryTableSchema(),
            'suppliers' => $this->getSuppliersTableSchema()
        ];
        
        foreach ($tables as $table_name => $schema) {
            $check_query = "SHOW TABLES LIKE '{$table_name}'";
            $result = $this->db_connection->query($check_query);
            
            if ($result->rowCount() === 0) {
                $this->db_connection->exec($schema);
                error_log("在庫管理テーブル作成: {$table_name}");
            }
        }
    }
    
    /**
     * テーブルスキーマ定義
     */
    private function getZaikoItemsTableSchema() {
        return "
            CREATE TABLE zaiko_items (
                sku VARCHAR(50) PRIMARY KEY,
                current_stock INT NOT NULL DEFAULT 0,
                reserved_stock INT NOT NULL DEFAULT 0,
                available_stock INT GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
                minimum_stock_level INT NOT NULL DEFAULT 2,
                maximum_stock_level INT NOT NULL DEFAULT 20,
                storage_location VARCHAR(20) NOT NULL DEFAULT 'A-001',
                last_purchase_date DATE NULL,
                last_purchase_price DECIMAL(10,2) NULL,
                status ENUM('sufficient', 'low', 'critical', 'out_of_stock') NOT NULL DEFAULT 'out_of_stock',
                active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_status (status),
                INDEX idx_available_stock (available_stock),
                INDEX idx_last_updated (last_updated)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ";
    }
    
    private function getZaikoMovementsTableSchema() {
        return "
            CREATE TABLE zaiko_movements (
                movement_id INT AUTO_INCREMENT PRIMARY KEY,
                sku VARCHAR(50) NOT NULL,
                quantity_change INT NOT NULL,
                movement_type ENUM('purchased', 'shipped', 'reserved', 'released', 'adjustment') NOT NULL,
                movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reference_order_id VARCHAR(50) NULL,
                notes TEXT NULL,
                created_by VARCHAR(50) NOT NULL DEFAULT 'system',
                
                FOREIGN KEY (sku) REFERENCES zaiko_items(sku) ON DELETE CASCADE,
                INDEX idx_sku_date (sku, movement_date),
                INDEX idx_movement_type (movement_type),
                INDEX idx_reference_order (reference_order_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ";
    }
    
    private function getZaikoStatisticsTableSchema() {
        return "
            CREATE TABLE zaiko_statistics (
                sku VARCHAR(50) PRIMARY KEY,
                average_purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                total_purchases INT NOT NULL DEFAULT 0,
                last_supplier_id INT NULL,
                preferred_supplier_id INT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (sku) REFERENCES zaiko_items(sku) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ";
    }
    
    private function getPurchaseHistoryTableSchema() {
        return "
            CREATE TABLE purchase_history (
                purchase_id INT AUTO_INCREMENT PRIMARY KEY,
                sku VARCHAR(50) NOT NULL,
                quantity INT NOT NULL,
                purchase_price DECIMAL(10,2) NOT NULL,
                supplier_id INT NULL,
                purchase_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (sku) REFERENCES zaiko_items(sku) ON DELETE CASCADE,
                INDEX idx_sku_date (sku, purchase_date),
                INDEX idx_supplier (supplier_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ";
    }
    
    private function getSuppliersTableSchema() {
        return "
            CREATE TABLE suppliers (
                supplier_id INT AUTO_INCREMENT PRIMARY KEY,
                supplier_name VARCHAR(100) NOT NULL,
                supplier_url VARCHAR(255) NULL,
                reliability_score DECIMAL(3,2) NOT NULL DEFAULT 0.00,
                average_delivery_days INT NOT NULL DEFAULT 7,
                contact_email VARCHAR(100) NULL,
                contact_phone VARCHAR(20) NULL,
                active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                UNIQUE KEY unique_supplier_name (supplier_name),
                INDEX idx_reliability (reliability_score),
                INDEX idx_active (active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ";
    }
    
    /**
     * キャッシュマネージャー初期化
     */
    private function initializeCacheManager() {
        require_once '../../../common/utils/cache_manager.php';
        $this->cache_manager = new CacheManager('zaiko');
    }
    
    /**
     * 通知マネージャー初期化
     */
    private function initializeNotificationManager() {
        require_once '../../../common/utils/notification_manager.php';
        $this->notification_manager = new NotificationManager();
    }
    
    /**
     * デフォルト設定作成
     */
    private function createDefaultConfig($config_file) {
        $default_config = [
            'database' => [
                'host' => 'localhost',
                'port' => 3306,
                'database' => 'nagano3_zaiko',
                'username' => 'root',
                'password' => '',
                'charset' => 'utf8mb4',
                'options' => [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            ],
            'cache' => [
                'zaiko_ttl' => 180 // 3分
            ],
            'alerts' => [
                'enabled' => true,
                'out_of_stock' => true,
                'critical_level' => true,
                'low_stock' => false
            ],
            'defaults' => [
                'minimum_stock_level' => 2,
                'maximum_stock_level' => 20,
                'storage_location' => 'A-001'
            ],
            'calculations' => [
                'safety_stock_days' => 14
            ]
        ];
        
        $config_dir = dirname($config_file);
        if (!is_dir($config_dir)) {
            mkdir($config_dir, 0755, true);
        }
        
        file_put_contents($config_file, "<?php\nreturn " . var_export($default_config, true) . ";\n");
    }
}
?>