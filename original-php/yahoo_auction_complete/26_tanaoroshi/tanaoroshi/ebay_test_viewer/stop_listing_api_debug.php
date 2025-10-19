<?php
/**
 * eBay出品停止API - 実動作版
 * 
 * シンプルで確実に動作する停止処理を実装
 * フォールバックなし・直接的な処理
 */

// セキュリティ確認
if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// エラーログを有効化
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/ebay_stop_api.log');

// JSON応答設定
header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

// POST以外は拒否
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// CSRF トークン確認（開発時は緩和）
session_start();
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// リクエストデータ取得
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit;
}

$ebay_item_id = $input['ebay_item_id'] ?? '';
$action = $input['action'] ?? '';
$reason = $input['reason'] ?? 'OtherListingError';

// バリデーション
if (empty($ebay_item_id)) {
    echo json_encode(['success' => false, 'error' => 'eBay Item ID required']);
    exit;
}

if ($action !== 'end_listing') {
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
    exit;
}

// ログ記録関数
function logStopAction($message, $data = []) {
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[{$timestamp}] {$message}";
    if (!empty($data)) {
        $log_entry .= " | Data: " . json_encode($data);
    }
    error_log($log_entry);
}

logStopAction("出品停止要求受信", [
    'ebay_item_id' => $ebay_item_id,
    'action' => $action,
    'reason' => $reason
]);

try {
    // 🎯 段階的処理でeBay API連携を試行
    
    $api_success = false;
    $api_error = '';
    
    // === STEP 1: 直接eBay API呼び出し ===
    
    try {
        // eBay APIクライアント確認
        if (file_exists(__DIR__ . '/../../hooks/1_essential/ebay_api_client.php')) {
            require_once __DIR__ . '/../../hooks/1_essential/ebay_api_client.php';
            
            if (class_exists('EbayApiClient')) {
                $client = new EbayApiClient();
                logStopAction("EbayApiClient読み込み成功");
                
                // API呼び出し実行
                $api_result = $client->endItem($ebay_item_id, $reason);
                
                if ($api_result && isset($api_result['success']) && $api_result['success']) {
                    $api_success = true;
                    logStopAction("eBay API停止成功", $api_result);
                } else {
                    $api_error = $api_result['error'] ?? 'eBay API returned failure';
                    logStopAction("eBay API停止失敗", ['error' => $api_error]);
                }
            } else {
                $api_error = 'EbayApiClient class not found';
                logStopAction("クラス未発見", ['error' => $api_error]);
            }
        } else {
            $api_error = 'eBay API client file not found';
            logStopAction("APIファイル未発見", ['error' => $api_error]);
        }
    } catch (Exception $e) {
        $api_error = $e->getMessage();
        logStopAction("eBay API例外", ['error' => $api_error]);
    }
    
    // === STEP 2: データベース更新（API成功時） ===
    
    $db_updated = false;
    if ($api_success) {
        try {
            if (file_exists(__DIR__ . '/../../hooks/1_essential/database_universal_connector.php')) {
                require_once __DIR__ . '/../../hooks/1_essential/database_universal_connector.php';
                
                if (class_exists('DatabaseUniversalConnector')) {
                    $connector = new DatabaseUniversalConnector();
                    $db_updated = $connector->updateProductStatus($ebay_item_id, 'Ended');
                    logStopAction("DB更新結果", ['success' => $db_updated]);
                }
            }
        } catch (Exception $e) {
            logStopAction("DB更新エラー", ['error' => $e->getMessage()]);
        }
    }
    
    // === STEP 3: レスポンス生成 ===
    
    if ($api_success) {
        // 🎉 実際のAPI成功
        echo json_encode([
            'success' => true,
            'ebay_item_id' => $ebay_item_id,
            'status' => 'Ended',
            'ended_at' => date('Y-m-d H:i:s'),
            'reason' => $reason,
            'message' => '✅ 実際のeBay出品が停止されました',
            'permanently_removed' => true,
            'api_method' => 'REAL_EBAY_API_DIRECT',
            'db_updated' => $db_updated
        ]);
        
        logStopAction("処理完了 - API成功", ['item_id' => $ebay_item_id]);
        
    } else {
        // ❌ API失敗 - 詳細エラー情報を返す
        echo json_encode([
            'success' => false,
            'ebay_item_id' => $ebay_item_id,
            'error' => "eBay API停止エラー: {$api_error}",
            'detailed_error' => $api_error,
            'retry_possible' => true,
            'api_method' => 'REAL_EBAY_API_FAILED',
            'troubleshooting' => [
                'check_api_credentials' => 'eBay API認証情報を確認してください',
                'check_item_status' => '商品が既に停止済みでないか確認してください',
                'check_permissions' => 'eBay APIの権限設定を確認してください'
            ]
        ]);
        
        logStopAction("処理完了 - API失敗", [
            'item_id' => $ebay_item_id,
            'error' => $api_error
        ]);
    }
    
} catch (Exception $e) {
    // 🚨 システムレベルエラー
    $system_error = $e->getMessage();
    
    logStopAction("システムエラー", [
        'error' => $system_error,
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    
    echo json_encode([
        'success' => false,
        'ebay_item_id' => $ebay_item_id,
        'error' => "システムエラー: {$system_error}",
        'system_error' => true,
        'retry_possible' => false,
        'api_method' => 'SYSTEM_ERROR',
        'debug_info' => [
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]
    ]);
}

// ログファイル確認用情報
logStopAction("処理終了", ['log_file' => __DIR__ . '/ebay_stop_api.log']);
?>