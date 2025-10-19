<?php
/**
 * データベース画像直接表示システム - N3準拠
 * Base64変換を使わず、データベースのpicture_urlsを直接表示
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

require_once(__DIR__ . '/../../common/config/database.php');

header('Content-Type: application/json');

try {
    $pdo = getDBConnection();
    
    // データベースから画像URL付き商品データ取得
    $query = $pdo->query("
        SELECT 
            ebay_item_id,
            title,
            current_price_value,
            listing_status,
            picture_urls,
            gallery_url,
            condition_display_name,
            quantity,
            updated_at
        FROM ebay_complete_api_data 
        WHERE picture_urls IS NOT NULL 
        AND picture_urls != '[]' 
        AND picture_urls != ''
        ORDER BY updated_at DESC 
        LIMIT 20
    ");
    
    $products = $query->fetchAll(PDO::FETCH_ASSOC);
    
    // picture_urlsをJSONから配列に変換
    foreach ($products as &$product) {
        if ($product['picture_urls']) {
            $urls = json_decode($product['picture_urls'], true);
            $product['picture_urls_array'] = is_array($urls) ? $urls : [$product['picture_urls']];
        } else {
            $product['picture_urls_array'] = [];
        }
    }
    
    echo json_encode([
        'success' => true,
        'total_products' => count($products),
        'products' => $products,
        'message' => 'データベース画像URL直接取得成功'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
