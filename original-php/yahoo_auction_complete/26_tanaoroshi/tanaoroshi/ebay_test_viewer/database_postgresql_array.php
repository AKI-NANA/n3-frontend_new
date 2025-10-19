<?php
/**
 * PostgreSQL配列形式対応版API
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
        LIMIT 12
    ");
    
    $stmt->execute();
    $products = $stmt->fetchAll();
    
    // PostgreSQL配列形式を正しくパース
    $processedProducts = [];
    foreach ($products as $product) {
        $pgArrayString = $product['picture_urls'];
        $imageUrls = [];
        
        if ($pgArrayString && strlen($pgArrayString) > 2) {
            // PostgreSQL配列 {url1,url2,url3} を配列に変換
            $cleanString = trim($pgArrayString, '{}');
            if ($cleanString) {
                $imageUrls = array_map('trim', explode(',', $cleanString));
                // 空要素を除去
                $imageUrls = array_filter($imageUrls, function($url) {
                    return !empty($url) && filter_var($url, FILTER_VALIDATE_URL);
                });
                // 配列のインデックスを再構築
                $imageUrls = array_values($imageUrls);
            }
        }
        
        if (count($imageUrls) > 0) {
            $processedProducts[] = [
                'ebay_item_id' => $product['ebay_item_id'],
                'title' => $product['title'],
                'current_price_value' => $product['current_price_value'],
                'listing_status' => $product['listing_status'],
                'image_urls' => $imageUrls,
                'image_count' => count($imageUrls)
            ];
        }
    }
    
    ob_clean();
    echo json_encode([
        'success' => true,
        'count' => count($processedProducts),
        'total_processed' => count($products),
        'products' => $processedProducts,
        'message' => 'PostgreSQL array parsing successful'
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
