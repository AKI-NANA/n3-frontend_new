<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../database/database.php';
require_once __DIR__ . '/api_simulator.php';

/**
 * 🎯 物販多販路一元化テストツール - メインAPIエンドポイント
 */

class MultichannelAPI {
    private $db;
    private $apiSimulator;
    
    public function __construct() {
        try {
            $this->db = new MultichannelDatabase();
            $this->apiSimulator = new APIConnectorSimulator();
            
            error_log("🚀 [API] 物販多販路APIシステム起動完了");
        } catch (Exception $e) {
            $this->sendError('システム初期化エラー: ' . $e->getMessage());
        }
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = $_GET['action'] ?? '';
        $requestData = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        
        try {
            switch ($path) {
                // ダッシュボード
                case 'dashboard':
                    return $this->getDashboardData();
                
                // 商品管理
                case 'products':
                    return $this->handleProducts($method, $requestData);
                case 'products/add':
                    return $this->addProduct($requestData);
                case 'products/import':
                    return $this->importProducts($requestData);
                
                // 在庫管理
                case 'inventory':
                    return $this->getInventoryData();
                case 'inventory/update':
                    return $this->updateInventory($requestData);
                case 'inventory/alerts':
                    return $this->getInventoryAlerts();
                
                // 受注管理
                case 'orders':
                    return $this->handleOrders($method, $requestData);
                case 'orders/sync':
                    return $this->syncOrders();
                case 'orders/status':
                    return $this->updateOrderStatus($requestData);
                
                // 出荷管理
                case 'shipments':
                    return $this->handleShipments($method, $requestData);
                case 'shipments/create':
                    return $this->createShipment($requestData);
                case 'shipments/track':
                    return $this->trackShipment($requestData);
                
                // 問い合わせ管理
                case 'inquiries':
                    return $this->handleInquiries($method, $requestData);
                case 'inquiries/reply':
                    return $this->replyToInquiry($requestData);
                
                // 販路管理
                case 'channels':
                    return $this->getChannels();
                case 'channels/sync':
                    return $this->syncAllChannels();
                case 'channels/test':
                    return $this->testChannelConnections();
                
                // 売上分析
                case 'analytics':
                    return $this->getAnalytics($requestData);
                case 'analytics/report':
                    return $this->generateReport($requestData);
                
                // データベースビューア
                case 'db/tables':
                    return $this->getDatabaseTables();
                case 'db/data':
                    return $this->getTableData($requestData);
                case 'db/query':
                    return $this->executeQuery($requestData);
                
                // システムログ
                case 'logs':
                    return $this->getSystemLogs($requestData);
                
                // APIテスト
                case 'test/api':
                    return $this->runAPITests();
                case 'test/performance':
                    return $this->runPerformanceTest();
                
                default:
                    throw new Exception('未対応のエンドポイント: ' . $path);
            }
            
        } catch (Exception $e) {
            error_log("❌ [API ERROR] " . $e->getMessage());
            $this->sendError($e->getMessage());
        }
    }
    
    // ダッシュボードデータ取得
    private function getDashboardData() {
        $stats = $this->db->getDashboardStats();
        $recentOrders = $this->db->getOrdersByStatus('pending');
        $alerts = $this->getInventoryAlerts();
        $channels = $this->db->getChannels();
        
        $dashboardData = [
            'stats' => $stats,
            'recent_orders' => array_slice($recentOrders, 0, 5),
            'inventory_alerts' => $alerts['data'],
            'channel_status' => $channels,
            'last_updated' => date('Y-m-d H:i:s')
        ];
        
        $this->db->logActivity('dashboard', 'ダッシュボードデータ取得', $dashboardData);
        return $this->sendSuccess($dashboardData);
    }
    
    // 商品管理
    private function handleProducts($method, $data) {
        switch ($method) {
            case 'GET':
                $products = $this->db->getAllProducts();
                return $this->sendSuccess($products);
            
            case 'POST':
                if ($this->db->addProduct($data)) {
                    $this->db->logActivity('product', '商品追加', $data);
                    return $this->sendSuccess(['message' => '商品が追加されました']);
                }
                throw new Exception('商品追加に失敗しました');
            
            default:
                throw new Exception('未対応のHTTPメソッド: ' . $method);
        }
    }
    
    private function addProduct($data) {
        // バリデーション
        $required = ['sku', 'name', 'price'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("必須フィールドが不足しています: {$field}");
            }
        }
        
        if ($this->db->addProduct($data)) {
            // 各販路に初期在庫を設定
            $productId = $this->db->db->lastInsertId();
            $channels = ['Amazon Japan', '楽天市場', 'Yahoo!ショッピング', '自社EC'];
            
            foreach ($channels as $channel) {
                $this->db->updateInventory($productId, $channel, $data['initial_stock'] ?? 0);
            }
            
            $this->db->logActivity('product', '新規商品登録', $data);
            return $this->sendSuccess(['message' => '商品が正常に追加されました', 'id' => $productId]);
        }
        
        throw new Exception('商品追加処理に失敗しました');
    }
    
    // 在庫管理
    private function getInventoryData() {
        $inventory = $this->db->executeQuery("
            SELECT p.sku, p.name, i.channel, i.stock_quantity, i.reserved_quantity, 
                   i.alert_threshold, i.last_updated,
                   CASE WHEN i.stock_quantity <= i.alert_threshold THEN 1 ELSE 0 END as is_alert
            FROM products p 
            JOIN inventory i ON p.id = i.product_id 
            ORDER BY p.name, i.channel
        ");
        
        return $this->sendSuccess($inventory);
    }
    
    private function updateInventory($data) {
        if (empty($data['product_id']) || empty($data['channel']) || !isset($data['quantity'])) {
            throw new Exception('必須パラメータが不足しています');
        }
        
        if ($this->db->updateInventory($data['product_id'], $data['channel'], $data['quantity'])) {
            $this->db->logActivity('inventory', '在庫更新', $data);
            return $this->sendSuccess(['message' => '在庫が更新されました']);
        }
        
        throw new Exception('在庫更新に失敗しました');
    }
    
    private function getInventoryAlerts() {
        $alerts = $this->db->executeQuery("
            SELECT p.sku, p.name, i.channel, i.stock_quantity, i.alert_threshold
            FROM products p 
            JOIN inventory i ON p.id = i.product_id 
            WHERE i.stock_quantity <= i.alert_threshold
            ORDER BY i.stock_quantity ASC
        ");
        
        return $this->sendSuccess($alerts);
    }
    
    // 受注管理
    private function handleOrders($method, $data) {
        switch ($method) {
            case 'GET':
                $status = $_GET['status'] ?? null;
                $orders = $status ? $this->db->getOrdersByStatus($status) : $this->db->getAllOrders();
                return $this->sendSuccess($orders);
            
            default:
                throw new Exception('未対応のHTTPメソッド: ' . $method);
        }
    }
    
    private function syncOrders() {
        $results = [];
        $channels = ['Amazon Japan', '楽天市場', 'Yahoo!ショッピング'];
        
        foreach ($channels as $channel) {
            $apiResult = $this->apiSimulator->callChannelAPI($channel, 'get_orders');
            $results[$channel] = $apiResult;
            
            // 成功した場合、データベースに同期
            if ($apiResult['status'] === 'success' && !empty($apiResult['data'])) {
                foreach ($apiResult['data'] as $orderData) {
                    // 実際の実装では、ここでデータベースに注文データを保存
                    $this->db->logActivity('order_sync', "受注同期: {$channel}", $orderData);
                }
            }
        }
        
        return $this->sendSuccess([
            'message' => '受注データ同期完了',
            'results' => $results
        ]);
    }
    
    private function updateOrderStatus($data) {
        if (empty($data['order_id']) || empty($data['status'])) {
            throw new Exception('注文IDとステータスが必要です');
        }
        
        if ($this->db->updateOrderStatus($data['order_id'], $data['status'])) {
            $this->db->logActivity('order', 'ステータス更新', $data);
            return $this->sendSuccess(['message' => '注文ステータスが更新されました']);
        }
        
        throw new Exception('注文ステータス更新に失敗しました');
    }
    
    // 出荷管理
    private function createShipment($data) {
        if (empty($data['order_id']) || empty($data['carrier'])) {
            throw new Exception('注文IDと運送会社が必要です');
        }
        
        // 運送会社APIで配送ラベル作成
        $shippingResult = $this->apiSimulator->shippingAPI($data['carrier'], 'create_shipment', $data);
        
        if ($shippingResult['status'] === 'success') {
            // データベースに出荷情報を保存
            $this->db->logActivity('shipment', '出荷ラベル作成', $shippingResult);
            return $this->sendSuccess($shippingResult);
        }
        
        throw new Exception('出荷ラベル作成に失敗しました: ' . $shippingResult['message']);
    }
    
    private function trackShipment($data) {
        if (empty($data['tracking_number'])) {
            throw new Exception('追跡番号が必要です');
        }
        
        $carrier = $data['carrier'] ?? 'yamato';
        $trackingResult = $this->apiSimulator->shippingAPI($carrier, 'track_shipment', $data);
        
        return $this->sendSuccess($trackingResult);
    }
    
    // 問い合わせ管理
    private function handleInquiries($method, $data) {
        switch ($method) {
            case 'GET':
                $inquiries = $this->db->getAllInquiries();
                return $this->sendSuccess($inquiries);
            
            default:
                throw new Exception('未対応のHTTPメソッド: ' . $method);
        }
    }
    
    private function replyToInquiry($data) {
        if (empty($data['inquiry_id']) || empty($data['reply'])) {
            throw new Exception('問い合わせIDと返信内容が必要です');
        }
        
        // ステータスを返信済みに更新
        if ($this->db->updateInquiryStatus($data['inquiry_id'], 'replied')) {
            $this->db->logActivity('inquiry', '問い合わせ返信', $data);
            return $this->sendSuccess(['message' => '返信が送信されました']);
        }
        
        throw new Exception('返信送信に失敗しました');
    }
    
    // 販路管理
    private function getChannels() {
        $channels = $this->db->getChannels();
        return $this->sendSuccess($channels);
    }
    
    private function syncAllChannels() {
        $result = $this->apiSimulator->syncAllChannels();
        $this->db->logActivity('channel_sync', '全販路同期実行', $result);
        return $this->sendSuccess($result);
    }
    
    private function testChannelConnections() {
        $result = $this->apiSimulator->testAllConnections();
        return $this->sendSuccess($result);
    }
    
    // データベースビューア
    private function getDatabaseTables() {
        $tables = ['products', 'inventory', 'orders', 'inquiries', 'channels', 'system_logs'];
        return $this->sendSuccess($tables);
    }
    
    private function getTableData($data) {
        $tableName = $data['table'] ?? '';
        $limit = $data['limit'] ?? 100;
        
        if (empty($tableName)) {
            throw new Exception('テーブル名が必要です');
        }
        
        $tableData = $this->db->getTableData($tableName, $limit);
        return $this->sendSuccess($tableData);
    }
    
    private function executeQuery($data) {
        if (empty($data['query'])) {
            throw new Exception('SQLクエリが必要です');
        }
        
        // セキュリティ: 読み取り専用クエリのみ許可
        $query = trim(strtoupper($data['query']));
        if (!preg_match('/^SELECT/', $query)) {
            throw new Exception('SELECT文のみ実行可能です');
        }
        
        $result = $this->db->executeQuery($data['query']);
        return $this->sendSuccess($result);
    }
    
    // システムログ
    private function getSystemLogs($data) {
        $limit = $data['limit'] ?? 50;
        $logs = $this->db->getTableData('system_logs', $limit);
        return $this->sendSuccess($logs);
    }
    
    // テスト機能
    private function runAPITests() {
        $tests = [
            'amazon_test' => $this->apiSimulator->amazonAPI('test_connection', 'GET'),
            'rakuten_test' => $this->apiSimulator->rakutenAPI('test_connection', 'GET'),
            'yahoo_test' => $this->apiSimulator->yahooAPI('test_connection', 'GET'),
            'shipping_test' => $this->apiSimulator->shippingAPI('yamato', 'test_connection'),
            'payment_test' => $this->apiSimulator->paymentAPI('stripe', 'test_connection')
        ];
        
        return $this->sendSuccess([
            'message' => 'API接続テスト完了',
            'results' => $tests
        ]);
    }
    
    private function runPerformanceTest() {
        $startTime = microtime(true);
        $operations = 0;
        
        // 複数のデータベース操作を実行
        $this->db->getAllProducts();
        $operations++;
        
        $this->db->getAllOrders();
        $operations++;
        
        $this->db->getDashboardStats();
        $operations++;
        
        // API呼び出しテスト
        $this->apiSimulator->amazonAPI('get_products', 'GET');
        $operations++;
        
        $endTime = microtime(true);
        $totalTime = ($endTime - $startTime) * 1000; // ミリ秒
        
        return $this->sendSuccess([
            'total_operations' => $operations,
            'total_time_ms' => round($totalTime, 2),
            'average_time_ms' => round($totalTime / $operations, 2),
            'operations_per_second' => round($operations / ($totalTime / 1000), 2)
        ]);
    }
    
    // ヘルパーメソッド
    private function sendSuccess($data) {
        echo json_encode([
            'status' => 'success',
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    private function sendError($message) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// API実行
$api = new MultichannelAPI();
$api->handleRequest();
?>