<?php
/**
 * メルカリ統合API エンドポイント
 * 
 * 既存システムと統合されたRESTful API
 * Web UIからの要求に応答
 * 
 * @version 1.0.0
 * @created 2025-09-25
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../platforms/mercari/MercariScraper.php';
require_once __DIR__ . '/../../shared/core/database.php';
require_once __DIR__ . '/../../shared/core/logger.php';

/**
 * APIレスポンス統一クラス
 */
class ApiResponse {
    public static function success($data = null, $message = null) {
        return self::response(true, $data, $message);
    }
    
    public static function error($message, $code = 400, $data = null) {
        http_response_code($code);
        return self::response(false, $data, $message);
    }
    
    private static function response($success, $data, $message) {
        $response = [
            'success' => $success,
            'timestamp' => date('Y-m-d H:i:s'),
            'data' => $data
        ];
        
        if ($message) {
            $response['message'] = $message;
        }
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }
}

/**
 * ルーティングクラス
 */
class ApiRouter {
    private $pdo;
    private $logger;
    
    public function __construct() {
        try {
            $this->pdo = getDbConnection();
            $this->logger = new Logger('mercari_api');
        } catch (Exception $e) {
            ApiResponse::error('データベース接続エラー', 500);
        }
    }
    
    /**
     * リクエストを処理
     */
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $pathParts = explode('/', trim($path, '/'));
        
        // APIパスの解析
        if (count($pathParts) < 2 || $pathParts[0] !== 'api') {
            ApiResponse::error('無効なAPIパス', 404);
        }
        
        $module = $pathParts[1] ?? '';
        $action = $pathParts[2] ?? '';
        $id = $pathParts[3] ?? null;
        
        try {
            switch ($module) {
                case 'scraping':
                    $this->handleScrapingRequests($method, $action, $id);
                    break;
                
                case 'inventory':
                    $this->handleInventoryRequests($method, $action, $id);
                    break;
                
                default:
                    ApiResponse::error('未知のAPIモジュール', 404);
            }
        } catch (Exception $e) {
            $this->logger->error('API処理エラー: ' . $e->getMessage());
            ApiResponse::error('内部サーバーエラー', 500);
        }
    }
    
    /**
     * スクレイピング関連API
     */
    private function handleScrapingRequests($method, $action, $id) {
        switch ($method) {
            case 'POST':
                switch ($action) {
                    case 'mercari':
                        $this->scrapeMercariProduct();
                        break;
                    
                    case 'yahoo':
                        $this->scrapeYahooProduct();
                        break;
                    
                    case 'rakuten':
                        $this->scrapeRakutenProduct();
                        break;
                    
                    case 'batch':
                        $this->scrapeBatchProducts();
                        break;
                    
                    default:
                        ApiResponse::error('未知のスクレイピングアクション', 404);
                }
                break;
            
            case 'GET':
                switch ($action) {
                    case 'status':
                        $this->getScrapingStatus();
                        break;
                    
                    default:
                        ApiResponse::error('未サポートのGETアクション', 405);
                }
                break;
            
            default:
                ApiResponse::error('未サポートのHTTPメソッド', 405);
        }
    }
    
    /**
     * 在庫管理関連API
     */
    private function handleInventoryRequests($method, $action, $id) {
        switch ($method) {
            case 'GET':
                switch ($action) {
                    case 'list':
                        $this->getInventoryList();
                        break;
                    
                    case 'stats':
                        $this->getInventoryStats();
                        break;
                    
                    case 'history':
                        $this->getInventoryHistory();
                        break;
                    
                    case 'product':
                        if (!$id) {
                            ApiResponse::error('商品IDが必要です', 400);
                        }
                        $this->getProductDetails($id);
                        break;
                    
                    default:
                        ApiResponse::error('未知の在庫管理アクション', 404);
                }
                break;
            
            case 'PUT':
                switch ($action) {
                    case 'monitoring':
                        $this->updateMonitoringSettings();
                        break;
                    
                    case 'product':
                        if (!$id) {
                            ApiResponse::error('商品IDが必要です', 400);
                        }
                        $this->updateProduct($id);
                        break;
                    
                    default:
                        ApiResponse::error('未サポートのPUTアクション', 405);
                }
                break;
            
            case 'DELETE':
                if ($action === 'product' && $id) {
                    $this->deleteProduct($id);
                } else {
                    ApiResponse::error('無効なDELETEリクエスト', 400);
                }
                break;
            
            default:
                ApiResponse::error('未サポートのHTTPメソッド', 405);
        }
    }
    
    /**
     * メルカリ商品スクレイピング
     */
    private function scrapeMercariProduct() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['url'])) {
            ApiResponse::error('URLが必要です', 400);
        }
        
        $url = $input['url'];
        $expectedPrice = $input['expected_price'] ?? null;
        
        try {
            $scraper = new MercariScraper($this->pdo);
            $result = $scraper->scrapeProduct($url);
            
            // 販売予定価格を設定
            if ($expectedPrice && $result['success']) {
                $this->updateExpectedPrice($result['product_id'], $expectedPrice);
                $result['data']['expected_selling_price'] = $expectedPrice;
            }
            
            $this->logger->info("メルカリスクレイピング完了: {$url}");
            ApiResponse::success($result);
            
        } catch (Exception $e) {
            $this->logger->error("メルカリスクレイピングエラー: " . $e->getMessage());
            ApiResponse::error($e->getMessage(), 500);
        }
    }
    
    /**
     * Yahoo商品スクレイピング（既存システム連携）
     */
    private function scrapeYahooProduct() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['url'])) {
            ApiResponse::error('URLが必要です', 400);
        }
        
        // 既存のYahooスクレイピングシステムを呼び出し
        // 実装は既存のyahoo_parser_v2025.phpを使用
        try {
            // TODO: 既存Yahooシステムとの統合
            ApiResponse::success(['message' => 'Yahoo スクレイピングは既存システムと統合中です']);
        } catch (Exception $e) {
            ApiResponse::error($e->getMessage(), 500);
        }
    }
    
    /**
     * 楽天商品スクレイピング
     */
    private function scrapeRakutenProduct() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['url'])) {
            ApiResponse::error('URLが必要です', 400);
        }
        
        // TODO: 楽天スクレイピング実装
        ApiResponse::success(['message' => '楽天スクレイピングは実装予定です']);
    }
    
    /**
     * 一括スクレイピング
     */
    private function scrapeBatchProducts() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['urls']) || !is_array($input['urls'])) {
            ApiResponse::error('URLs配列が必要です', 400);
        }
        
        $urls = $input['urls'];
        $platform = $input['platform'] ?? 'mercari';
        
        if (count($urls) > 50) {
            ApiResponse::error('一度に処理できるのは最大50件です', 400);
        }
        
        try {
            $processor = new MercarieBatchProcessor($this->pdo);
            $result = $processor->processBatch($urls);
            
            $this->logger->info("一括スクレイピング完了: " . count($urls) . "件");
            ApiResponse::success($result);
            
        } catch (Exception $e) {
            $this->logger->error("一括スクレイピングエラー: " . $e->getMessage());
            ApiResponse::error($e->getMessage(), 500);
        }
    }
    
    /**
     * 在庫一覧取得
     */
    private function getInventoryList() {
        $platform = $_GET['platform'] ?? '';
        $status = $_GET['status'] ?? '';
        $limit = min((int)($_GET['limit'] ?? 50), 100);
        $offset = (int)($_GET['offset'] ?? 0);
        
        try {
            $whereConditions = ['1=1'];
            $params = [];
            
            if ($platform) {
                $whereConditions[] = 'platform = ?';
                $params[] = $platform;
            }
            
            if ($status) {
                $whereConditions[] = 'url_status = ?';
                $params[] = $status;
            }
            
            $whereClause = implode(' AND ', $whereConditions);
            
            $stmt = $this->pdo->prepare("
                SELECT 
                    id, platform, product_title, condition_type,
                    purchase_price, expected_selling_price, current_stock,
                    url_status, monitoring_enabled, last_verified_at,
                    created_at, updated_at,
                    CASE 
                        WHEN expected_selling_price > 0 
                        THEN ROUND(((expected_selling_price - purchase_price) / purchase_price * 100), 2)
                        ELSE NULL 
                    END as profit_margin
                FROM supplier_products 
                WHERE {$whereClause}
                ORDER BY updated_at DESC 
                LIMIT ? OFFSET ?
            ");
            
            $params[] = $limit;
            $params[] = $offset;
            
            $stmt->execute($params);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 総件数も取得
            $countStmt = $this->pdo->prepare("
                SELECT COUNT(*) as total 
                FROM supplier_products 
                WHERE {$whereClause}
            ");
            $countStmt->execute(array_slice($params, 0, -2));
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            ApiResponse::success([
                'data' => $products,
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset
            ]);
            
        } catch (Exception $e) {
            $this->logger->error("在庫一覧取得エラー: " . $e->getMessage());
            ApiResponse::error('在庫一覧の取得に失敗しました', 500);
        }
    }
    
    /**
     * 在庫統計取得
     */
    private function getInventoryStats() {
        try {
            $stmt = $this->pdo->query("
                SELECT 
                    COUNT(*) as total_products,
                    SUM(CASE WHEN monitoring_enabled = 1 THEN 1 ELSE 0 END) as active_products,
                    SUM(CASE WHEN url_status = 'active' THEN 1 ELSE 0 END) as available_products,
                    SUM(purchase_price * current_stock) as total_value,
                    AVG(
                        CASE 
                            WHEN expected_selling_price > 0 
                            THEN ((expected_selling_price - purchase_price) / purchase_price * 100)
                            ELSE NULL 
                        END
                    ) as avg_profit_margin
                FROM supplier_products
            ");
            
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // プラットフォーム別統計
            $platformStmt = $this->pdo->query("
                SELECT platform, COUNT(*) as count 
                FROM supplier_products 
                GROUP BY platform
            ");
            $platformStats = $platformStmt->fetchAll(PDO::FETCH_ASSOC);
            
            ApiResponse::success([
                'total_products' => (int)$stats['total_products'],
                'active_products' => (int)$stats['active_products'],
                'available_products' => (int)$stats['available_products'],
                'total_value' => round((float)$stats['total_value'], 2),
                'avg_profit' => round((float)$stats['avg_profit_margin'], 2),
                'platform_breakdown' => $platformStats
            ]);
            
        } catch (Exception $e) {
            $this->logger->error("統計取得エラー: " . $e->getMessage());
            ApiResponse::error('統計の取得に失敗しました', 500);
        }
    }
    
    /**
     * 在庫履歴取得
     */
    private function getInventoryHistory() {
        $productId = $_GET['product_id'] ?? '';
        $limit = min((int)($_GET['limit'] ?? 20), 100);
        
        try {
            $whereClause = $productId ? 'WHERE sh.product_id = ?' : '';
            $params = $productId ? [$productId] : [];
            
            $stmt = $this->pdo->prepare("
                SELECT 
                    sh.id, sh.product_id, sh.change_type, sh.change_source,
                    sh.previous_stock, sh.new_stock, sh.previous_price, sh.new_price,
                    sh.change_reason, sh.created_at,
                    sp.product_title, sp.platform
                FROM stock_history sh
                LEFT JOIN supplier_products sp ON sh.product_id = sp.id
                {$whereClause}
                ORDER BY sh.created_at DESC 
                LIMIT ?
            ");
            
            $params[] = $limit;
            $stmt->execute($params);
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            ApiResponse::success([
                'data' => $history,
                'count' => count($history)
            ]);
            
        } catch (Exception $e) {
            $this->logger->error("履歴取得エラー: " . $e->getMessage());
            ApiResponse::error('履歴の取得に失敗しました', 500);
        }
    }
    
    /**
     * 商品詳細取得
     */
    private function getProductDetails($productId) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT * FROM supplier_products 
                WHERE id = ?
            ");
            $stmt->execute([$productId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$product) {
                ApiResponse::error('商品が見つかりません', 404);
            }
            
            // 関連履歴も取得
            $historyStmt = $this->pdo->prepare("
                SELECT * FROM stock_history 
                WHERE product_id = ? 
                ORDER BY created_at DESC 
                LIMIT 10
            ");
            $historyStmt->execute([$productId]);
            $history = $historyStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $product['history'] = $history;
            
            ApiResponse::success($product);
            
        } catch (Exception $e) {
            $this->logger->error("商品詳細取得エラー: " . $e->getMessage());
            ApiResponse::error('商品詳細の取得に失敗しました', 500);
        }
    }
    
    /**
     * 監視設定更新
     */
    private function updateMonitoringSettings() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $enabled = $input['enabled'] ?? true;
        $interval = (int)($input['interval_minutes'] ?? 120);
        
        try {
            // 設定をファイルまたはデータベースに保存
            // 実装例：設定テーブルを使用
            $stmt = $this->pdo->prepare("
                INSERT INTO system_settings (setting_key, setting_value, updated_at) 
                VALUES ('monitoring_enabled', ?, NOW())
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");
            $stmt->execute([json_encode($enabled)]);
            
            $stmt = $this->pdo->prepare("
                INSERT INTO system_settings (setting_key, setting_value, updated_at) 
                VALUES ('monitoring_interval_minutes', ?, NOW())
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");
            $stmt->execute([json_encode($interval)]);
            
            $this->logger->info("監視設定更新: enabled={$enabled}, interval={$interval}");
            ApiResponse::success(['message' => '設定を更新しました']);
            
        } catch (Exception $e) {
            $this->logger->error("設定更新エラー: " . $e->getMessage());
            ApiResponse::error('設定の更新に失敗しました', 500);
        }
    }
    
    /**
     * 商品情報更新
     */
    private function updateProduct($productId) {
        $input = json_decode(file_get_contents('php://input'), true);
        
        try {
            $updateFields = [];
            $params = [];
            
            if (isset($input['expected_selling_price'])) {
                $updateFields[] = 'expected_selling_price = ?';
                $params[] = $input['expected_selling_price'];
            }
            
            if (isset($input['monitoring_enabled'])) {
                $updateFields[] = 'monitoring_enabled = ?';
                $params[] = $input['monitoring_enabled'];
            }
            
            if (isset($input['current_stock'])) {
                $updateFields[] = 'current_stock = ?';
                $params[] = $input['current_stock'];
            }
            
            if (empty($updateFields)) {
                ApiResponse::error('更新するフィールドが指定されていません', 400);
            }
            
            $updateFields[] = 'updated_at = NOW()';
            $params[] = $productId;
            
            $sql = "UPDATE supplier_products SET " . implode(', ', $updateFields) . " WHERE id = ?";
            
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute($params);
            
            if ($result && $stmt->rowCount() > 0) {
                $this->logger->info("商品更新完了: ProductID={$productId}");
                ApiResponse::success(['message' => '商品を更新しました']);
            } else {
                ApiResponse::error('商品の更新に失敗しました', 400);
            }
            
        } catch (Exception $e) {
            $this->logger->error("商品更新エラー: " . $e->getMessage());
            ApiResponse::error('商品の更新に失敗しました', 500);
        }
    }
    
    /**
     * 商品削除
     */
    private function deleteProduct($productId) {
        try {
            $this->pdo->beginTransaction();
            
            // 関連データも削除（外部キー制約で自動削除される場合もある）
            $stmt = $this->pdo->prepare("DELETE FROM supplier_products WHERE id = ?");
            $result = $stmt->execute([$productId]);
            
            if ($result && $stmt->rowCount() > 0) {
                $this->pdo->commit();
                $this->logger->info("商品削除完了: ProductID={$productId}");
                ApiResponse::success(['message' => '商品を削除しました']);
            } else {
                $this->pdo->rollback();
                ApiResponse::error('商品の削除に失敗しました', 400);
            }
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            $this->logger->error("商品削除エラー: " . $e->getMessage());
            ApiResponse::error('商品の削除に失敗しました', 500);
        }
    }
    
    /**
     * スクレイピング状態取得
     */
    private function getScrapingStatus() {
        try {
            // 処理キューの状態を確認
            $stmt = $this->pdo->query("
                SELECT 
                    task_type, status, COUNT(*) as count
                FROM processing_queue 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
                GROUP BY task_type, status
            ");
            
            $queueStatus = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 最近の処理統計
            $statsStmt = $this->pdo->query("
                SELECT 
                    COUNT(*) as products_today,
                    SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 1 ELSE 0 END) as products_last_hour
                FROM supplier_products 
                WHERE created_at >= CURDATE()
            ");
            
            $todayStats = $statsStmt->fetch(PDO::FETCH_ASSOC);
            
            ApiResponse::success([
                'queue_status' => $queueStatus,
                'today_stats' => $todayStats,
                'server_time' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            $this->logger->error("状態取得エラー: " . $e->getMessage());
            ApiResponse::error('状態の取得に失敗しました', 500);
        }
    }
    
    /**
     * 販売予定価格更新
     */
    private function updateExpectedPrice($productId, $expectedPrice) {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE supplier_products 
                SET expected_selling_price = ?, updated_at = NOW() 
                WHERE id = ?
            ");
            $stmt->execute([$expectedPrice, $productId]);
            
        } catch (Exception $e) {
            $this->logger->warning("販売予定価格更新失敗: " . $e->getMessage());
        }
    }
}

// システム設定テーブル作成（存在しない場合）
function createSystemSettingsTable($pdo) {
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS system_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value JSON,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    } catch (Exception $e) {
        error_log('システム設定テーブル作成エラー: ' . $e->getMessage());
    }
}

// エラーハンドリング
function handleFatalError() {
    $error = error_get_last();
    if ($error && $error['type'] === E_ERROR) {
        ApiResponse::error('システムエラーが発生しました', 500);
    }
}

register_shutdown_function('handleFatalError');

// メイン処理
try {
    // システム設定テーブル確認
    $pdo = getDbConnection();
    createSystemSettingsTable($pdo);
    
    // API ルーター実行
    $router = new ApiRouter();
    $router->handleRequest();
    
} catch (Exception $e) {
    error_log('API初期化エラー: ' . $e->getMessage());
    ApiResponse::error('システム初期化に失敗しました', 500);
}

?>