<?php
/**
 * データベース画像取得API - 修正版
 * 診断結果に基づく正確な接続
 */

// 完全エラー抑制
error_reporting(0);
ini_set('display_errors', 0);
ob_start();

header('Content-Type: application/json');

try {
    // 診断で成功した接続設定を使用
    $dsn = 'pgsql:host=localhost;dbname=nagano3_db';
    $pdo = new PDO($dsn, 'postgres', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // 画像URL付きデータを取得
    $stmt = $pdo->prepare("
        SELECT 
            ebay_item_id,
            title,
            current_price_value,
            listing_status,
            picture_urls
        FROM ebay_complete_api_data 
        WHERE picture_urls IS NOT NULL 
        AND picture_urls != '[]' 
        AND picture_urls != ''
        AND picture_urls != 'null'
        ORDER BY updated_at DESC 
        LIMIT 12
    ");
    
    $stmt->execute();
    $products = $stmt->fetchAll();
    
    // JSON変換処理
    foreach ($products as &$product) {
        $urls = json_decode($product['picture_urls'], true);
        $product['image_urls'] = is_array($urls) ? $urls : [];
    }
    
    ob_clean();
    echo json_encode([
        'success' => true,
        'count' => count($products),
        'products' => $products,
        'message' => 'Database connection successful'
    ]);
    
} catch (Exception $e) {
    ob_clean();
    echo json_encode([
        'success' => false,
        'error' => 'Database query failed: ' . $e->getMessage(),
        'count' => 0,
        'products' => []
    ]);
}
