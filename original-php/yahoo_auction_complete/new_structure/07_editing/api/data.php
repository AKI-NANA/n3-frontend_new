<?php
/**
 * 商品データ取得API
 * Yahoo Auction統合システム - 07_editing モジュール
 */

require_once __DIR__ . '/../../shared/core/Database.php';
require_once __DIR__ . '/../../shared/core/ApiResponse.php';
require_once __DIR__ . '/../includes/ProductEditor.php';

// CORSヘッダー設定
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $editor = new ProductEditor();
    
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 20);
    $filters = $_GET['filters'] ?? [];
    
    // キーワードフィルターの処理
    if (!empty($_GET['keyword'])) {
        $filters['keyword'] = $_GET['keyword'];
    }
    
    $result = $editor->getProducts($page, $limit, $filters);
    
    ApiResponse::paginated(
        $result['products'],
        $result['pagination']['total'],
        $page,
        $limit,
        'データ取得成功',
        '07_editing'
    );
    
} catch (Exception $e) {
    error_log("07_editing data API error: " . $e->getMessage());
    ApiResponse::error($e->getMessage(), 500, '07_editing');
}
?>