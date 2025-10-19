<?php
/**
 * データベース画像取得API - PostgreSQL構文修正版
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
    
    // PostgreSQL配列構文に対応したクエリ
    $stmt = $pdo->prepare("
        SELECT 
            ebay_item_id,
            title,
            current_price_value,
            listing_status,
            picture_urls
        FROM ebay_complete_api_data 
        WHERE picture_urls IS NOT NULL 
        AND picture_urls <> ''
        AND picture_urls <> 'null'
        AND length(picture_urls) > 2
        ORDER BY updated_at DESC 
        LIMIT 12
    ");
    
    $stmt->execute();
    $products = $stmt->fetchAll();
    
    // データ処理
    $validProducts = [];
    foreach ($products as $product) {
        // JSON文字列を配列に変換
        $urlsJson = $product['picture_urls'];
        
        // JSONデコード試行
        $urls = json_decode($urlsJson, true);
        
        // 有効な画像URLがある場合のみ追加
        if (is_array($urls) && count($urls) > 0 && !empty($urls[0])) {
            $product['image_urls'] = $urls;
            $validProducts[] = $product;
        }
    }
    
    ob_clean();
    echo json_encode([
        'success' => true,
        'count' => count($validProducts),
        'total_found' => count($products),
        'products' => $validProducts,
        'message' => 'Database query successful'
    ]);
    
} catch (Exception $e) {
    ob_clean();
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage(),
        'count' => 0,
        'products' => []
    ]);
}
