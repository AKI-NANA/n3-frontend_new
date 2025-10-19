<?php
/**
 * 02_scraping/api/inventory_monitor.php
 * 
 * 在庫監視API - 10_zaikoから呼び出される
 * 出品済み商品専用の在庫管理機能
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

require_once __DIR__ . '/../includes/InventoryEngine.php';
require_once __DIR__ . '/../../shared/core/ApiResponse.php';
require_once __DIR__ . '/../../shared/core/SecurityManager.php';

class InventoryMonitorAPI {
    private $engine;
    private $security;
    
    public function __construct() {
        $this->engine = new InventoryEngine();
        $this->security = new SecurityManager();
    }
    
    public function handleRequest() {
        try {
            // セキュリティチェック
            $this->security->validateRequest();
            
            $method = $_SERVER['REQUEST_METHOD'];
            $action = $this->getAction();
            
            // CSRF対策（POSTリクエストのみ）
            if ($method === 'POST') {
                $this->validatePostRequest();
            }
            
            // レート制限チェック
            $this->security->checkRateLimit('inventory_api', 100, 60); // 100req/min
            
            switch ($action) {
                case 'register_listed_product':
                    $this->registerListedProduct();
                    break;
                    
                case 'start_monitoring':
                    $this->startMonitoring();
                    break;
                    
                case 'stop_monitoring':
                    $this->stopMonitoring();
                    break;
                    
                case 'check_inventory':
                    $this->checkInventory();
                    break;
                    
                case 'get_monitoring_status':
                    $this->getMonitoringStatus();
                    break;
                    
                case 'get_price_history':
                    $this->getPriceHistory();
                    break;
                    
                case 'bulk_register':
                    $this->bulkRegisterListedProducts();
                    break;
                    
                case 'get_statistics':
                    $this->getStatistics();
                    break;
                    
                default:
                    ApiResponse::error('不明なアクション: ' . $action, 400);
            }
            
        } catch (Exception $e) {
            error_log("在庫監視API エラー: " . $e->getMessage());
            
            // セキュリティ監査ログ
            $this->security->logSecurityEvent('api_error', [
                'error' => $e->getMessage(),
                'action' => $this->getAction()
            ]);
            
            ApiResponse::error('システムエラーが発生しました', 500);
        }
    }
    
    /**
     * 出品済み商品を在庫管理に登録
     * 08_listing出品完了時に自動呼び出し
     */
    private function registerListedProduct() {
        $data = $this->getJsonInput();
        $productId = $data['product_id'] ?? null;
        
        if (!$productId) {
            ApiResponse::error('product_idが必要です', 400);
        }
        
        // 入力値検証
        if (!is_numeric($productId) || $productId <= 0) {
            ApiResponse::error('無効なproduct_idです', 400);
        }
        
        try {
            $result = $this->engine->registerListedProduct($productId, $data);
            
            // 10_zaikoに同期通知（非同期）
            $this->notifyZaikoSystem('product_registered', [
                'product_id' => $productId,
                'status' => 'monitoring_active'
            ]);
            
            ApiResponse::success($result, '在庫管理登録が完了しました');
            
        } catch (Exception $e) {
            ApiResponse::error('登録に失敗しました: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 監視開始
     */
    private function startMonitoring() {
        $data = $this->getJsonInput();
        $productIds = $data['product_ids'] ?? [];
        
        if (empty($productIds) || !is_array($productIds)) {
            ApiResponse::error('product_idsが必要です', 400);
        }
        
        // 配列サイズ制限
        if (count($productIds) > 100) {
            ApiResponse::error('一度に処理できる商品数は100件までです', 400);
        }
        
        // 数値配列検証
        foreach ($productIds as $id) {
            if (!is_numeric($id) || $id <= 0) {
                ApiResponse::error('無効なproduct_idが含まれています', 400);
            }
        }
        
        try {
            $result = $this->engine->startMonitoring($productIds);
            
            // 10_zaikoに同期通知
            $this->notifyZaikoSystem('monitoring_started', [
                'product_ids' => $productIds,
                'count' => count($productIds)
            ]);
            
            ApiResponse::success($result, '監視を開始しました');
            
        } catch (Exception $e) {
            ApiResponse::error('監視開始に失敗しました: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 監視停止
     */
    private function stopMonitoring() {
        $data = $this->getJsonInput();
        $productIds = $data['product_ids'] ?? [];
        
        if (empty($productIds) || !is_array($productIds)) {
            ApiResponse::error('product_idsが必要です', 400);
        }
        
        try {
            $result = $this->engine->stopMonitoring($productIds);
            
            // 10_zaikoに同期通知
            $this->notifyZaikoSystem('monitoring_stopped', [
                'product_ids' => $productIds,
                'count' => count($productIds)
            ]);
            
            ApiResponse::success($result, '監視を停止しました');
            
        } catch (Exception $e) {
            ApiResponse::error('監視停止に失敗しました: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 在庫チェック実行
     */
    private function checkInventory() {
        $data = $this->getJsonInput();
        $productIds = $data['product_ids'] ?? null;
        $forceCheck = $data['force_check'] ?? false;
        
        // productIds指定時の検証
        if ($productIds !== null) {
            if (!is_array($productIds) || empty($productIds)) {
                ApiResponse::error('product_idsは配列で指定してください', 400);
            }
            
            if (count($productIds) > 50) {
                ApiResponse::error('一度にチェックできる商品数は50件までです', 400);
            }
        }
        
        try {
            $results = $this->engine->performInventoryCheck($productIds);
            
            // 変更があった場合は10_zaikoに通知
            if ($results['updated'] > 0) {
                $this->notifyZaikoSystem('inventory_updated', [
                    'updated_count' => $results['updated'],
                    'changes' => $results['changes']
                ]);
            }
            
            ApiResponse::success([
                'check_results' => $results,
                'checked_at' => date('Y-m-d H:i:s')
            ], '在庫チェックが完了しました');
            
        } catch (Exception $e) {
            ApiResponse::error('在庫チェックに失敗しました: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 監視ステータス取得
     */
    private function getMonitoringStatus() {
        $productIds = $_GET['product_ids'] ?? null;
        
        if ($productIds) {
            $productIds = explode(',', $productIds);
            $productIds = array_map('intval', $productIds);
            $productIds = array_filter($productIds, function($id) { return $id > 0; });
        }
        
        try {
            $status = $this->engine->getMonitoringStatus($productIds);
            
            ApiResponse::success([
                'monitoring_status' => $status,
                'total_products' => count($status),
                'retrieved_at' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            ApiResponse::error('ステータス取得に失敗しました: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 価格履歴取得
     */
    private function getPriceHistory() {
        $productId = $_GET['product_id'] ?? null;
        $days = intval($_GET['days'] ?? 30);
        
        if (!$productId || !is_numeric($productId)) {
            ApiResponse::error('product_idが必要です', 400);
        }
        
        if ($days < 1 || $days > 365) {
            $days = 30; // デフォルト値
        }
        
        try {
            $history = $this->engine->getPriceHistory($productId, $days);
            
            ApiResponse::success([
                'price_history' => $history,
                'product_id' => $productId,
                'period_days' => $days,
                'total_records' => count($history)
            ]);
            
        } catch (Exception $e) {
            ApiResponse::error('履歴取得に失敗しました: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 一括登録（初期セットアップ用）
     */
    private function bulkRegisterListedProducts() {
        $data = $this->getJsonInput();
        $limit = intval($data['limit'] ?? 100);
        $offset = intval($data['offset'] ?? 0);
        
        if ($limit > 500) {
            ApiResponse::error('一度に処理できる件数は500件までです', 400);
        }
        
        try {
            // 出品済み未登録商品を取得
            $sql = "
                SELECT ysp.id, ysp.title, ysp.price, ysp.url, ysp.ebay_item_id
                FROM yahoo_scraped_products ysp
                WHERE ysp.workflow_status = 'listed'
                  AND ysp.ebay_item_id IS NOT NULL
                  AND ysp.id NOT IN (
                      SELECT product_id FROM inventory_management 
                      WHERE product_id IS NOT NULL
                  )
                ORDER BY ysp.updated_at DESC
                LIMIT ? OFFSET ?
            ";
            
            $db = Database::getInstance();
            $products = $db->query($sql, [$limit, $offset])->fetchAll();
            
            $results = [
                'total' => count($products),
                'success' => 0,
                'errors' => 0,
                'details' => []
            ];
            
            foreach ($products as $product) {
                try {
                    $this->engine->registerListedProduct($product['id']);
                    $results['success']++;
                    $results['details'][] = [
                        'product_id' => $product['id'],
                        'status' => 'success'
                    ];
                    
                } catch (Exception $e) {
                    $results['errors']++;
                    $results['details'][] = [
                        'product_id' => $product['id'],
                        'status' => 'error',
                        'message' => $e->getMessage()
                    ];
                }
                
                // レート制限
                usleep(100000); // 0.1秒待機
            }
            
            ApiResponse::success($results, "一括登録完了: {$results['success']}件成功、{$results['errors']}件エラー");
            
        } catch (Exception $e) {
            ApiResponse::error('一括登録に失敗しました: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 統計情報取得
     */
    private function getStatistics() {
        try {
            $db = Database::getInstance();
            
            // 基本統計
            $totalMonitored = $db->query("SELECT COUNT(*) as count FROM inventory_management")->fetch()['count'];
            $activeMonitoring = $db->query("SELECT COUNT(*) as count FROM inventory_management WHERE monitoring_enabled = true")->fetch()['count'];
            $deadLinks = $db->query("SELECT COUNT(*) as count FROM inventory_management WHERE url_status = 'dead'")->fetch()['count'];
            
            // 今日の価格変動数
            $priceChangesToday = $db->query("
                SELECT COUNT(*) as count 
                FROM stock_history 
                WHERE change_type IN ('price_change', 'both') 
                  AND created_at >= CURRENT_DATE
            ")->fetch()['count'];
            
            // 最近のエラー数
            $recentErrors = $db->query("
                SELECT COUNT(*) as count 
                FROM inventory_errors 
                WHERE created_at >= NOW() - INTERVAL '24 hours' 
                  AND resolved = false
            ")->fetch()['count'];
            
            ApiResponse::success([
                'statistics' => [
                    'total_monitored' => $totalMonitored,
                    'active_monitoring' => $activeMonitoring,
                    'dead_links' => $deadLinks,
                    'price_changes_today' => $priceChangesToday,
                    'recent_errors' => $recentErrors
                ],
                'retrieved_at' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            ApiResponse::error('統計情報取得に失敗しました: ' . $e->getMessage(), 500);
        }
    }
    
    // ===============================================
    // ヘルパーメソッド
    // ===============================================
    
    /**
     * アクション取得
     */
    private function getAction() {
        return $_GET['action'] ?? $_POST['action'] ?? $this->getJsonInput()['action'] ?? '';
    }
    
    /**
     * JSON入力取得
     */
    private function getJsonInput() {
        $input = file_get_contents('php://input');
        if (empty($input)) {
            return [];
        }
        
        $data = json_decode($input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('無効なJSON形式です');
        }
        
        return $data;
    }
    
    /**
     * POSTリクエスト検証
     */
    private function validatePostRequest() {
        // Content-Type検証
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') === false) {
            // フォームデータの場合はCSRFトークンチェック（必要に応じて実装）
        }
        
        // リクエストサイズ制限
        $maxSize = 1024 * 1024; // 1MB
        $contentLength = $_SERVER['CONTENT_LENGTH'] ?? 0;
        if ($contentLength > $maxSize) {
            throw new Exception('リクエストサイズが大きすぎます');
        }
    }
    
    /**
     * 10_zaikoシステムに通知
     */
    private function notifyZaikoSystem($eventType, $data) {
        try {
            // 非同期通知（エラーは無視）
            $notificationData = [
                'event_type' => $eventType,
                'data' => $data,
                'source' => '02_scraping',
                'timestamp' => date('c')
            ];
            
            // 10_zaikoのWebhookエンドポイントに通知
            $this->sendAsyncNotification('../10_zaiko/api/webhook.php', $notificationData);
            
        } catch (Exception $e) {
            // 通知失敗は無視（メイン処理に影響させない）
            error_log("10_zaiko通知失敗: " . $e->getMessage());
        }
    }
    
    /**
     * 非同期通知送信
     */
    private function sendAsyncNotification($url, $data) {
        // 非ブロッキング通信
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-Source: 02_scraping'
            ],
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_TIMEOUT => 1, // 1秒でタイムアウト
            CURLOPT_NOSIGNAL => true
        ]);
        
        curl_exec($ch);
        curl_close($ch);
    }
}

// API実行
try {
    $api = new InventoryMonitorAPI();
    $api->handleRequest();
} catch (Exception $e) {
    error_log("在庫監視API 致命的エラー: " . $e->getMessage());
    ApiResponse::error('システムエラーが発生しました', 500);
}
?>