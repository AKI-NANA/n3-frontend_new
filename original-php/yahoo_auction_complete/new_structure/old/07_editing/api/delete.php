<?php
/**
 * 商品削除API
 * Yahoo Auction統合システム - 07_editing モジュール
 */

require_once __DIR__ . '/../../shared/core/Database.php';
require_once __DIR__ . '/../../shared/core/ApiResponse.php';
require_once __DIR__ . '/../includes/ProductEditor.php';

// CORSヘッダー設定
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('POSTメソッドが必要です', 405, '07_editing');
}

try {
    // JSON入力の処理
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input === null) {
        $input = $_POST;
    }
    
    $editor = new ProductEditor();
    
    // 単一商品削除
    if (!empty($input['product_id'])) {
        $result = $editor->deleteProducts([$input['product_id']]);
        
        if ($result['success']) {
            ApiResponse::success([
                'deleted_count' => $result['deleted_count']
            ], $result['message'], '07_editing');
        } else {
            ApiResponse::error($result['message'], 400, '07_editing');
        }
    }
    
    // 複数商品削除
    elseif (!empty($input['product_ids']) && is_array($input['product_ids'])) {
        $result = $editor->deleteProducts($input['product_ids']);
        
        if ($result['success']) {
            ApiResponse::success([
                'deleted_count' => $result['deleted_count'],
                'deleted_ids' => $input['product_ids']
            ], $result['message'], '07_editing');
        } else {
            ApiResponse::error($result['message'], 400, '07_editing');
        }
    }
    
    // ダミーデータ削除
    elseif (!empty($input['action']) && $input['action'] === 'cleanup_dummy') {
        $result = $editor->cleanupDummyData();
        
        if ($result['success']) {
            ApiResponse::success([
                'deleted_count' => $result['deleted_count']
            ], $result['message'], '07_editing');
        } else {
            ApiResponse::error($result['message'], 400, '07_editing');
        }
    }
    
    else {
        ApiResponse::validationError([
            'input' => '削除対象が指定されていません (product_id, product_ids, またはaction=cleanup_dummy が必要)'
        ], '07_editing');
    }
    
} catch (Exception $e) {
    error_log("07_editing delete API error: " . $e->getMessage());
    ApiResponse::error('商品削除エラー: ' . $e->getMessage(), 500, '07_editing');
}
?>