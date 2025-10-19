<?php
/**
 * 在庫管理 自動価格更新 API
 * 
 * エンドポイント:
 * - POST /api/auto_update_price.php?action=check_and_update
 * - POST /api/auto_update_price.php?action=sync_all_prices
 * - GET /api/auto_update_price.php?action=get_update_history
 * 
 * @version 1.0.0
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../core/InventoryImplementationExtended.php';

// CORS設定
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function sendResponse($success, $data = null, $message = '', $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

try {
    $action = $_REQUEST['action'] ?? '';
    $engine = new InventoryImplementationExtended();
    
    switch ($action) {
        case 'check_and_update':
            // 在庫チェック + 自動価格更新実行
            $productIds = isset($_POST['product_ids']) 
                ? json_decode($_POST['product_ids'], true) 
                : null;
                
            $result = $engine->performInventoryCheck($productIds);
            
            sendResponse(true, $result, '在庫チェック・自動価格更新が完了しました');
            break;
            
        case 'sync_all_prices':
            // 全出品先価格一括同期
            $result = $engine->syncAllListingPrices();
            
            sendResponse(true, $result, '全出品先価格の同期が完了しました');
            break;
            
        case 'get_update_history':
            // 自動価格更新履歴取得
            $productId = $_GET['product_id'] ?? null;
            $limit = (int)($_GET['limit'] ?? 50);
            
            $history = $engine->getAutoPriceUpdateHistory($productId, $limit);
            
            sendResponse(true, $history, '価格更新履歴を取得しました');
            break;
            
        case 'bulk_register':
            // 未登録出品済み商品の一括登録
            $limit = (int)($_POST['limit'] ?? 100);
            $result = $engine->bulkRegisterListedProducts($limit);
            
            sendResponse(true, $result, '出品済み商品を一括登録しました');
            break;
            
        case 'get_sync_status':
            // 同期ステータス確認
            $status = $engine->getSyncStatus();
            
            sendResponse(true, $status, '同期ステータスを取得しました');
            break;
            
        default:
            sendResponse(false, null, '無効なアクションです', 400);
    }
    
} catch (Exception $e) {
    sendResponse(false, [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], 'エラーが発生しました', 500);
}
?>
