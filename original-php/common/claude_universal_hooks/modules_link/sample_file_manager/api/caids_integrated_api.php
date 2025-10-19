<?php
/**
 * 🎯 CAIDS統合版 - 必須Hooks適用済みAPIシステム
 * 必須Hooks: エラー処理、読込管理、応答表示、Ajax統合
 */

// 🔸 ⚠️ エラー処理_h - グローバルエラーハンドリング
function caids_error_handler($message, $code = 500, $data = null) {
    error_log("🔸 ⚠️ [CAIDS ERROR] " . $message);
    
    http_response_code($code);
    $response = [
        'status' => 'error',
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'caids_error_handling' => true
    ];
    
    if ($data) {
        $response['debug_data'] = $data;
    }
    
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// 🔸 💬 応答表示_h - 統一レスポンス形式
function caids_success_response($data, $message = 'Success') {
    error_log("🔸 💬 [CAIDS SUCCESS] " . $message);
    
    $response = [
        'status' => 'success',
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s'),
        'caids_response_handling' => true
    ];
    
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// 🔸 ⏳ 読込管理_h - 処理時間管理
$caids_start_time = microtime(true);

function caids_loading_status($message) {
    global $caids_start_time;
    $elapsed = round((microtime(true) - $caids_start_time) * 1000, 2);
    error_log("🔸 ⏳ [CAIDS LOADING] {$message} ({$elapsed}ms)");
}

// 🔸 🔄 Ajax統合_h - CORS・ヘッダー統合管理
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// データベース接続エラーハンドリング強化
try {
    require_once __DIR__ . '/../database/database.php';
    require_once __DIR__ . '/api_simulator.php';
    
    caids_loading_status('データベース接続開始');
    $db = new MultichannelDatabase();
    caids_loading_status('データベース接続完了');
    
    caids_loading_status('APIシミュレーター初期化開始');
    $apiSimulator = new APIConnectorSimulator();
    caids_loading_status('APIシミュレーター初期化完了');
    
} catch (Exception $e) {
    caids_error_handler('システム初期化エラー: ' . $e->getMessage(), 500, [
        'error_type' => 'database_connection',
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}

// メインAPI処理
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$requestData = json_decode(file_get_contents('php://input'), true) ?? $_POST;

caids_loading_status("API処理開始: {$method} {$action}");

try {
    switch ($action) {
        case 'dashboard':
            caids_loading_status('ダッシュボードデータ取得開始');
            $stats = $db->getDashboardStats();
            $recentOrders = $db->getOrdersByStatus('pending');
            
            // 🔸 ⚠️ エラー処理_h - undefinedチェック
            if (!is_array($stats)) {
                caids_error_handler('ダッシュボード統計データが不正です', 500, ['stats' => $stats]);
            }
            
            $dashboardData = [
                'stats' => [
                    'today_sales' => $stats['today_sales'] ?? 0,
                    'pending_orders' => $stats['pending_orders'] ?? 0,
                    'stock_alerts' => $stats['stock_alerts'] ?? 0,
                    'unread_inquiries' => $stats['unread_inquiries'] ?? 0
                ],
                'recent_orders' => array_slice($recentOrders, 0, 5),
                'last_updated' => date('Y-m-d H:i:s'),
                'caids_processing_time' => round((microtime(true) - $caids_start_time) * 1000, 2)
            ];
            
            $db->logActivity('dashboard', 'ダッシュボードデータ取得', $dashboardData);
            caids_success_response($dashboardData, 'ダッシュボードデータ取得完了');
            break;
            
        case 'products':
            if ($method === 'GET') {
                caids_loading_status('商品データ取得開始');
                $products = $db->getAllProducts();
                caids_success_response($products, "商品データ取得完了: " . count($products) . "件");
            } elseif ($method === 'POST') {
                // データバリデーション強化
                $required = ['sku', 'name', 'price'];
                foreach ($required as $field) {
                    if (empty($requestData[$field])) {
                        caids_error_handler("必須フィールドが不足しています: {$field}", 400, $requestData);
                    }
                }
                
                if ($db->addProduct($requestData)) {
                    $db->logActivity('product', '商品追加', $requestData);
                    caids_success_response(['id' => $db->db->lastInsertId()], '商品が正常に追加されました');
                } else {
                    caids_error_handler('商品追加処理に失敗しました', 500, $requestData);
                }
            }
            break;
            
        case 'products/add':
            // バリデーション
            if (empty($requestData['sku']) || empty($requestData['name']) || empty($requestData['price'])) {
                caids_error_handler('必須フィールド（SKU、商品名、価格）が不足しています', 400, $requestData);
            }
            
            try {
                if ($db->addProduct($requestData)) {
                    $productId = $db->db->lastInsertId();
                    
                    // 各販路に初期在庫設定
                    $channels = ['Amazon Japan', '楽天市場', 'Yahoo!ショッピング', '自社EC'];
                    foreach ($channels as $channel) {
                        $db->updateInventory($productId, $channel, $requestData['initial_stock'] ?? 0);
                    }
                    
                    caids_success_response([
                        'id' => $productId,
                        'message' => '商品が正常に追加されました'
                    ], '商品追加完了');
                } else {
                    caids_error_handler('商品追加処理に失敗しました', 500);
                }
            } catch (Exception $e) {
                caids_error_handler('商品追加エラー: ' . $e->getMessage(), 500, [
                    'request_data' => $requestData,
                    'error_details' => $e->getTrace()
                ]);
            }
            break;
            
        case 'inventory':
            caids_loading_status('在庫データ取得開始');
            $inventory = $db->executeQuery("
                SELECT p.sku, p.name, i.channel, i.stock_quantity, i.reserved_quantity, 
                       i.alert_threshold, i.last_updated,
                       CASE WHEN i.stock_quantity <= i.alert_threshold THEN 1 ELSE 0 END as is_alert
                FROM products p 
                JOIN inventory i ON p.id = i.product_id 
                ORDER BY p.name, i.channel
            ");
            caids_success_response($inventory, "在庫データ取得完了: " . count($inventory) . "件");
            break;
            
        case 'orders':
            caids_loading_status('受注データ取得開始');
            $orders = $db->getAllOrders();
            caids_success_response($orders, "受注データ取得完了: " . count($orders) . "件");
            break;
            
        case 'orders/sync':
            caids_loading_status('受注同期開始');
            $results = [];
            $channels = ['Amazon Japan', '楽天市場', 'Yahoo!ショッピング'];
            
            foreach ($channels as $channel) {
                $apiResult = $apiSimulator->callChannelAPI($channel, 'get_orders');
                $results[$channel] = $apiResult;
                
                if ($apiResult['status'] === 'success' && !empty($apiResult['data'])) {
                    foreach ($apiResult['data'] as $orderData) {
                        $db->logActivity('order_sync', "受注同期: {$channel}", $orderData);
                    }
                }
            }
            
            caids_success_response([
                'message' => '受注データ同期完了',
                'results' => $results
            ], '受注同期完了');
            break;
            
        case 'channels':
            caids_loading_status('販路データ取得開始');
            $channels = $db->getChannels();
            caids_success_response($channels, "販路データ取得完了: " . count($channels) . "件");
            break;
            
        case 'channels/sync':
            caids_loading_status('全販路同期開始');
            $result = $apiSimulator->syncAllChannels();
            $db->logActivity('channel_sync', '全販路同期実行', $result);
            caids_success_response($result, '全販路同期完了');
            break;
            
        case 'channels/test':
            caids_loading_status('販路接続テスト開始');
            $result = $apiSimulator->testAllConnections();
            caids_success_response($result, '販路接続テスト完了');
            break;
            
        case 'db/tables':
            $tables = ['products', 'inventory', 'orders', 'inquiries', 'channels', 'system_logs'];
            caids_success_response($tables, 'テーブル一覧取得完了');
            break;
            
        case 'db/data':
            $tableName = $requestData['table'] ?? '';
            $limit = $requestData['limit'] ?? 100;
            
            if (empty($tableName)) {
                caids_error_handler('テーブル名が必要です', 400);
            }
            
            $tableData = $db->getTableData($tableName, $limit);
            caids_success_response($tableData, "テーブルデータ取得完了: {$tableName}");
            break;
            
        case 'test/api':
            caids_loading_status('API接続テスト開始');
            $tests = [
                'amazon_test' => $apiSimulator->amazonAPI('test_connection', 'GET'),
                'rakuten_test' => $apiSimulator->rakutenAPI('test_connection', 'GET'),
                'yahoo_test' => $apiSimulator->yahooAPI('test_connection', 'GET'),
                'shipping_test' => $apiSimulator->shippingAPI('yamato', 'test_connection'),
                'payment_test' => $apiSimulator->paymentAPI('stripe', 'test_connection')
            ];
            
            caids_success_response([
                'message' => 'API接続テスト完了',
                'results' => $tests
            ], 'API接続テスト完了');
            break;
            
        case 'test/performance':
            $startTime = microtime(true);
            $operations = 0;
            
            // パフォーマンステスト実行
            $db->getAllProducts(); $operations++;
            $db->getAllOrders(); $operations++;
            $db->getDashboardStats(); $operations++;
            $apiSimulator->amazonAPI('get_products', 'GET'); $operations++;
            
            $endTime = microtime(true);
            $totalTime = ($endTime - $startTime) * 1000;
            
            caids_success_response([
                'total_operations' => $operations,
                'total_time_ms' => round($totalTime, 2),
                'average_time_ms' => round($totalTime / $operations, 2),
                'operations_per_second' => round($operations / ($totalTime / 1000), 2)
            ], 'パフォーマンステスト完了');
            break;
            
        default:
            caids_error_handler('未対応のエンドポイント: ' . $action, 404, ['action' => $action]);
    }
    
} catch (Exception $e) {
    caids_error_handler('API処理エラー: ' . $e->getMessage(), 500, [
        'action' => $action,
        'method' => $method,
        'request_data' => $requestData,
        'trace' => $e->getTraceAsString()
    ]);
}

$totalTime = round((microtime(true) - $caids_start_time) * 1000, 2);
error_log("🔸 ⏳ [CAIDS COMPLETE] 処理完了 ({$totalTime}ms)");
?>