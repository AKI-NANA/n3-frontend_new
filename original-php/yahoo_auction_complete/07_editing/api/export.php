<?php
/**
 * CSV出力API
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
    
    // フィルター条件の取得
    $filters = $_GET['filters'] ?? [];
    if (!empty($_GET['keyword'])) {
        $filters['keyword'] = $_GET['keyword'];
    }
    
    // CSV用データ取得
    $result = $editor->getProductsForCSV($filters);
    
    if (!$result['success']) {
        ApiResponse::error($result['message'], 500, '07_editing');
    }
    
    $csvData = $result['data'];
    
    // CSVヘッダー
    $headers = [
        'Item ID',
        '商品名',
        '価格(円)',
        '価格(USD)',
        'カテゴリ',
        '状態',
        'プラットフォーム',
        '出品状況',
        '在庫',
        'SKU',
        '更新日時'
    ];
    
    // ファイル名生成
    $fileName = 'yahoo_auction_products_' . date('Ymd_His') . '.csv';
    
    // CSV出力
    ApiResponse::csv($csvData, $fileName, $headers);
    
} catch (Exception $e) {
    error_log("07_editing export API error: " . $e->getMessage());
    ApiResponse::error('CSV出力エラー: ' . $e->getMessage(), 500, '07_editing');
}
?>