<?php
/**
 * 商品データ更新API
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
    
    $itemId = $input['item_id'] ?? '';
    if (empty($itemId)) {
        ApiResponse::validationError(['item_id' => 'Item IDが必要です'], '07_editing');
    }
    
    $editor = new ProductEditor();
    
    // 更新データの準備
    $updateData = [];
    
    if (!empty($input['title'])) {
        $updateData['title'] = $input['title'];
    }
    
    if (isset($input['price']) && is_numeric($input['price'])) {
        $updateData['price'] = (int)$input['price'];
    }
    
    if (!empty($input['description'])) {
        $updateData['description'] = $input['description'];
    }
    
    if (!empty($input['category'])) {
        $updateData['category'] = $input['category'];
    }
    
    if (!empty($input['condition'])) {
        $updateData['condition'] = $input['condition'];
    }
    
    if (empty($updateData)) {
        ApiResponse::validationError(['data' => '更新するデータが指定されていません'], '07_editing');
    }
    
    // 更新実行
    $result = $editor->updateProduct($itemId, $updateData);
    
    if ($result['success']) {
        ApiResponse::success([
            'item_id' => $itemId,
            'updated_fields' => array_keys($updateData)
        ], $result['message'], '07_editing');
    } else {
        ApiResponse::error($result['message'], 400, '07_editing');
    }
    
} catch (Exception $e) {
    error_log("07_editing update API error: " . $e->getMessage());
    ApiResponse::error('商品更新エラー: ' . $e->getMessage(), 500, '07_editing');
}
?>