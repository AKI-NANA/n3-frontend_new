<?php
/**
 * 最もシンプルなデータベース画像取得API
 * PostgreSQL型問題を回避
 */

error_reporting(0);
ini_set('display_errors', 0);
ob_start();

header('Content-Type: application/json');

try {
    $dsn = 'pgsql:host=localhost;dbname=nagano3_db';
    $pdo = new PDO($dsn, 'postgres', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // 最もシンプルなクエリ - 条件を最小限に
    $stmt = $pdo->prepare("
        SELECT 
            ebay_item_id,
            title,
            current_price_value,
            listing_status,
            picture_urls
        FROM ebay_complete_api_data 
        WHERE picture_urls IS NOT NULL 
        ORDER BY updated_at DESC 
        LIMIT 5
    ");
    
    $stmt->execute();
    $products = $stmt->fetchAll();
    
    // 安全なデータ処理
    $processedProducts = [];
    foreach ($products as $product) {
        $pictureUrlsRaw = $product['picture_urls'];
        
        // デバッグ情報付きで処理
        $debugInfo = [
            'raw_data' => $pictureUrlsRaw,
            'data_type' => gettype($pictureUrlsRaw),
            'length' => strlen($pictureUrlsRaw ?? ''),
            'first_char' => substr($pictureUrlsRaw ?? '', 0, 1),
            'last_char' => substr($pictureUrlsRaw ?? '', -1, 1)
        ];
        
        // JSONデコード試行
        $imageUrls = [];
        if ($pictureUrlsRaw) {
            $decoded = json_decode($pictureUrlsRaw, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $imageUrls = $decoded;
            }
        }
        
        $processedProduct = [
            'ebay_item_id' => $product['ebay_item_id'],
            'title' => $product['title'],
            'current_price_value' => $product['current_price_value'],
            'listing_status' => $product['listing_status'],
            'image_urls' => $imageUrls,
            'debug_info' => $debugInfo
        ];
        
        $processedProducts[] = $processedProduct;
    }
    
    ob_clean();
    echo json_encode([
        'success' => true,
        'count' => count($processedProducts),
        'products' => $processedProducts,
        'message' => 'Simple query successful'
    ]);
    
} catch (Exception $e) {
    ob_clean();
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'count' => 0,
        'products' => []
    ]);
}
