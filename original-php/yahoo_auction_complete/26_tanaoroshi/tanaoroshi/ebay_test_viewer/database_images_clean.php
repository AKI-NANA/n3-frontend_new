<?php
/**
 * データベース画像直接表示API - エラー出力完全抑制版
 */

// エラー出力を完全に無効化
error_reporting(0);
ini_set('display_errors', 0);

// 出力バッファリング開始（余計な出力を防止）
ob_start();

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

try {
    // データベース接続（簡易版）
    $dsn = 'pgsql:host=localhost;dbname=nagano3_db';
    $pdo = new PDO($dsn, 'postgres', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // データベースから画像URL付き商品データ取得
    $stmt = $pdo->query("
        SELECT 
            ebay_item_id,
            title,
            current_price_value,
            listing_status,
            picture_urls,
            gallery_url
        FROM ebay_complete_api_data 
        WHERE picture_urls IS NOT NULL 
        AND picture_urls != '[]' 
        AND picture_urls != ''
        ORDER BY updated_at DESC 
        LIMIT 10
    ");
    
    $products = $stmt->fetchAll();
    
    // picture_urlsをJSONから配列に変換
    foreach ($products as &$product) {
        if ($product['picture_urls']) {
            $urls = json_decode($product['picture_urls'], true);
            $product['image_urls'] = is_array($urls) ? $urls : [];
        } else {
            $product['image_urls'] = [];
        }
    }
    
    $result = [
        'success' => true,
        'count' => count($products),
        'products' => $products
    ];
    
} catch (Exception $e) {
    $result = [
        'success' => false,
        'error' => 'Database error',
        'count' => 0,
        'products' => []
    ];
}

// 出力バッファをクリア
ob_clean();

// JSON出力のみ
header('Content-Type: application/json');
echo json_encode($result);
exit;
