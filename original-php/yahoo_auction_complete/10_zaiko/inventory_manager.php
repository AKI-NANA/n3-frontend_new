<?php
/**
 * 在庫管理メインクラス
 * 計画書に基づく完全版実装
 */

require_once 'Database.php';
require_once 'Logger.php';

class InventoryManager {
    private $db;
    private $logger;
    private $executionId;
    
    public function __construct() {
        $this->db = new Database();
        $this->logger = new Logger('inventory');
        $this->executionId = $this->generateExecutionId();
    }
    
    /**
     * 実行ID生成
     */
    private function generateExecutionId() {
        return uniqid('exec_', true);
    }
    
    /**
     * 商品監視登録
     */
    public function registerProduct($productId, $sourceUrl, $platform, $sourceProductId = null) {
        try {
            $this->logger->info("商品監視登録開始", [
                'product_id' => $productId,
                'source_url' => $sourceUrl,
                'platform' => $platform
            ]);
            
            // 既存チェック
            $existing = $this->db->selectRow(
                "SELECT id FROM inventory_management WHERE product_id = ? AND source_platform = ?",
                [$productId, $platform]
            );
            
            if ($existing) {
                throw new InventoryException("商品ID {$productId} は既に {$platform} で監視中です");
            }
            
            // URLの基本検証
            if (!filter_var($sourceUrl, FILTER_VALIDATE_URL)) {
                throw new InventoryException("無効なURLです: {$sourceUrl}");
            }
            
            // 商品データ作成
            $data = [
                'product_id' => $productId,
                'source_platform' => $platform,
                'source_url' => $sourceUrl,
                'source_product_id' => $sourceProductId,
                'current_stock' => 0,
                'current_price' => 0.00,
                'url_status' => 'active',
                'monitoring_enabled' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            // 初期タイトルハッシュ生成を試行
            $titleHash = $this->generateTitleHash($sourceUrl);
            if ($titleHash) {
                $data['title_hash'] = $titleHash;
                $data['last_verified_at'] = date('Y-m-d H:i:s');
            }
            
            $insertId = $this->db->insert('inventory_management', $data);
            
            $this->logger->info("商品監視登録完了", [
                'product_id' => $productId,
                'insert_id' => $insertId,
                'platform' => $platform
            ]);
            
            return [
                'success' => true,
                'inventory_id' => $insertId,
                'message' => "商品監視を開始しました"
            ];
            
        } catch (Exception $e) {
            $this->logger->error("商品監視登録失敗", [
                'product_id' => $productId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * タイトルハッシュ生成（Web版では簡略化）
     */
    private function generateTitleHash($url) {
        // Web版ではスクレイピング制限があるため、URLベースのハッシュを生成
        return hash('sha256', $url . time());
    }
    
    /**
     * 監視中商品一覧取得
     */
    public function getMonitoringProducts($platform = null, $limit = 100, $offset = 0) {
        try {
            $whereClause = "monitoring_enabled = 1";
            $params = [];
            
            if ($platform) {
                $whereClause .= " AND source_platform = ?";
                $params[] = $platform;
            }
            
            $sql = "SELECT 
                        im.*,
                        ysp.title as product_title,
                        ysp.image_url as product_image
                    FROM inventory_management im
                    LEFT JOIN yahoo_scraped_products ysp ON im.product_id = ysp.id
                    WHERE {$whereClause}
                    ORDER BY im.updated_at DESC
                    LIMIT ? OFFSET ?";
            
            $params[] = $limit;
            $params[] = $offset;
            
            $products = $this->db->select($sql, $params);
            
            // 統計情報も取得
            $totalCount = $this->db->selectValue(
                "SELECT COUNT(*) FROM inventory_management WHERE {$whereClause}",
                array_slice($params, 0, -2)
            );
            
            return [
                'success' => true,
                'products' => $products,
                'total_count' => $totalCount,
                'current_page' => floor($offset / $limit) + 1,
                'total_pages' => ceil($totalCount / $limit)
            ];
            
        } catch (Exception $e) {
            $this->logger->error("監視商品一覧取得失敗", [
                'platform' => $platform,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 在庫数更新
     */
    public function updateStock($productId, $newStock, $platform = null) {
        try {
            $this->db->beginTransaction();
            
            // 現在の在庫数取得
            $whereClause = "product_id = ?";
            $params = [$productId];
            
            if ($platform) {
                $whereClause .= " AND source_platform = ?";
                $params[] = $platform;
            }
            
            $current = $this->db->selectRow(
                "SELECT * FROM inventory_management WHERE {$whereClause}",
                $params
            );
            
            if (!$current) {
                throw new InventoryException("商品ID {$productId} が見つかりません");
            }
            
            $previousStock = $current['current_stock'];
            
            // 在庫数に変更がない場合はスキップ
            if ($previousStock == $newStock) {
                $this->db->commit();
                return [
                    'success' => true,
                    'message' => '在庫数に変更なし',
                    'previous_stock' => $previousStock,
                    'new_stock' => $newStock
                ];
            }
            
            // 在庫数更新
            $affectedRows = $this->db->update(
                'inventory_management',
                [
                    'current_stock' => $newStock,
                    'updated_at' => date('Y-m-d H:i:s')
                ],
                ['id' => $current['id']]
            );
            
            // 履歴記録
            $this->recordStockHistory($current['id'], [
                'previous_stock' => $previousStock,
                'new_stock' => $newStock,
                'change_source' => $current['source_platform'],
                'change_type' => 'stock_change'
            ]);
            
            $this->db->commit();
            
            $this->logger->info("在庫数更新完了", [
                'product_id' => $productId,
                'previous_stock' => $previousStock,
                'new_stock' => $newStock,
                'platform' => $current['source_platform']
            ]);
            
            return [
                'success' => true,
                'message' => '在庫数を更新しました',
                'previous_stock' => $previousStock,
                'new_stock' => $newStock
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            
            $this->logger->error("在庫数更新失敗", [
                'product_id' => $productId,
                'new_stock' => $newStock,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 価格更新
     */
    public function updatePrice($productId, $newPrice, $platform = null) {
        try {
            $this->db->beginTransaction();
            
            $whereClause = "product_id = ?";
            $params = [$productId];
            
            if ($platform) {
                $whereClause .= " AND source_platform = ?";
                $params[] = $platform;
            }
            
            $current = $this->db->selectRow(
                "SELECT * FROM inventory_management WHERE {$whereClause}",
                $params
            );
            
            if (!$current) {
                throw new InventoryException("商品ID {$productId} が見つかりません");
            }
            
            $previousPrice = $current['current_price'];
            
            // 価格に変更がない場合はスキップ
            if (abs($previousPrice - $newPrice) < 0.01) {
                $this->db->commit();
                return [
                    'success' => true,
                    'message' => '価格に変更なし',
                    'previous_price' => $previousPrice,
                    'new_price' => $newPrice
                ];
            }
            
            // 価格更新
            $this->db->update(
                'inventory_management',
                [
                    'current_price' => $newPrice,
                    'updated_at' => date('Y-m-d H:i:s')
                ],
                ['id' => $current['id']]
            );
            
            // 履歴記録
            $this->recordStockHistory($current['id'], [
                'previous_price' => $previousPrice,
                'new_price' => $newPrice,
                'change_source' => $current['source_platform'],
                'change_type' => 'price_change'
            ]);
            
            $this->db->commit();
            
            $this->logger->info("価格更新完了", [
                'product_id' => $productId,
                'previous_price' => $previousPrice,
                'new_price' => $newPrice,
                'platform' => $current['source_platform']
            ]);
            
            return [
                'success' => true,
                'message' => '価格を更新しました',
                'previous_price' => $previousPrice,
                'new_price' => $newPrice
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            
            $this->logger->error("価格更新失敗", [
                'product_id' => $productId,
                'new_price' => $newPrice,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 在庫・価格履歴記録
     */
    public function recordStockHistory($inventoryId, $data) {
        try {
            // inventory_id から product_id を取得
            $inventory = $this->db->selectRow(
                "SELECT product_id FROM inventory_management WHERE id = ?",
                [$inventoryId]
            );
            
            if (!$inventory) {
                throw new InventoryException("在庫管理ID {$inventoryId} が見つかりません");
            }
            
            $historyData = [
                'product_id' => $inventory['product_id'],
                'previous_stock' => $data['previous_stock'] ?? null,
                'new_stock' => $data['new_stock'] ?? null,
                'previous_price' => $data['previous_price'] ?? null,
                'new_price' => $data['new_price'] ?? null,
                'change_type' => $data['change_type'] ?? 'unknown',
                'change_source' => $data['change_source'] ?? 'manual',
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            $historyId = $this->db->insert('stock_history', $historyData);
            
            $this->logger->debug("履歴記録完了", [
                'history_id' => $historyId,
                'inventory_id' => $inventoryId,
                'change_type' => $data['change_type']
            ]);
            
            return $historyId;
            
        } catch (Exception $e) {
            $this->logger->error("履歴記録失敗", [
                'inventory_id' => $inventoryId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * システム統計取得
     */
    public function getSystemStats() {
        try {
            $stats = [
                // 基本統計
                'monitored_products' => $this->db->selectValue(
                    "SELECT COUNT(*) FROM inventory_management WHERE monitoring_enabled = 1"
                ),
                'total_products' => $this->db->selectValue(
                    "SELECT COUNT(*) FROM inventory_management"
                ),
                
                // プラットフォーム別統計
                'by_platform' => $this->db->select(
                    "SELECT source_platform, COUNT(*) as count 
                     FROM inventory_management 
                     WHERE monitoring_enabled = 1 
                     GROUP BY source_platform"
                ),
                
                // 本日の更新統計
                'today_updates' => [
                    'stock_changes' => $this->db->selectValue(
                        "SELECT COUNT(*) FROM stock_history 
                         WHERE change_type IN ('stock_change', 'both') 
                         AND DATE(created_at) = CURDATE()"
                    ),
                    'price_changes' => $this->db->selectValue(
                        "SELECT COUNT(*) FROM stock_history 
                         WHERE change_type IN ('price_change', 'both') 
                         AND DATE(created_at) = CURDATE()"
                    )
                ],
                
                // URL状態統計
                'url_status' => $this->db->select(
                    "SELECT url_status, COUNT(*) as count 
                     FROM inventory_management 
                     GROUP BY url_status"
                ),
                
                'last_updated' => date('Y-m-d H:i:s')
            ];
            
            return [
                'success' => true,
                'stats' => $stats
            ];
            
        } catch (Exception $e) {
            $this->logger->error("システム統計取得失敗", [
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * ヘルスチェック
     */
    public function healthCheck() {
        try {
            $health = [
                'timestamp' => date('c'),
                'system_status' => 'healthy',
                'components' => []
            ];
            
            // データベース接続チェック
            $dbHealth = $this->db->healthCheck();
            $health['components']['database'] = $dbHealth;
            
            // メモリ使用量チェック
            $memoryUsage = memory_get_usage(true);
            $memoryLimit = $this->parseMemoryLimit(ini_get('memory_limit'));
            $memoryPercent = ($memoryUsage / $memoryLimit) * 100;
            
            $health['components']['memory'] = [
                'status' => $memoryPercent < 80 ? 'healthy' : 'warning',
                'usage_bytes' => $memoryUsage,
                'usage_mb' => round($memoryUsage / 1024 / 1024, 2),
                'usage_percent' => round($memoryPercent, 2)
            ];
            
            // 監視商品数チェック
            $monitoredCount = $this->db->selectValue(
                "SELECT COUNT(*) FROM inventory_management WHERE monitoring_enabled = 1"
            );
            
            $health['components']['monitoring'] = [
                'status' => $monitoredCount > 0 ? 'healthy' : 'info',
                'monitored_products' => $monitoredCount
            ];
            
            // 全体ステータス判定
            $componentStatuses = array_column($health['components'], 'status');
            if (in_array('unhealthy', $componentStatuses)) {
                $health['system_status'] = 'unhealthy';
            } elseif (in_array('warning', $componentStatuses)) {
                $health['system_status'] = 'warning';
            }
            
            return [
                'success' => true,
                'health' => $health
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'health' => [
                    'timestamp' => date('c'),
                    'system_status' => 'unhealthy',
                    'error' => $e->getMessage()
                ]
            ];
        }
    }
    
    /**
     * メモリ制限値パース
     */
    private function parseMemoryLimit($memoryLimit) {
        $unit = strtolower(substr($memoryLimit, -1));
        $value = (int)$memoryLimit;
        
        switch ($unit) {
            case 'g': return $value * 1024 * 1024 * 1024;
            case 'm': return $value * 1024 * 1024;
            case 'k': return $value * 1024;
            default: return $value;
        }
    }
}

/**
 * 在庫管理例外クラス
 */
class InventoryException extends Exception {
    public function __construct($message, $code = 0, Exception $previous = null) {
        parent::__construct($message, $code, $previous);
    }
}
?>