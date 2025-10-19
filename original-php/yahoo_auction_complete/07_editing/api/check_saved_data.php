<?php
/**
 * 保存データ確認用API
 * データベースに保存されているか確認
 */

header('Content-Type: application/json; charset=utf-8');

$itemId = $_GET['item_id'] ?? '';

if (empty($itemId)) {
    echo json_encode(['error' => 'item_idが必要です'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // データベース接続
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres";
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // データ取得
    $sql = "SELECT 
        id,
        source_item_id,
        active_title,
        price_jpy,
        active_description,
        sku,
        manual_input_data,
        selected_images,
        ebay_listing_data,
        shipping_data,
        html_description,
        updated_at
    FROM yahoo_scraped_products 
    WHERE source_item_id = :item_id OR id::text = :item_id
    LIMIT 1";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':item_id' => $itemId]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$record) {
        echo json_encode(['error' => '商品が見つかりません'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // JSONBカラムをデコード
    $record['manual_input_data_decoded'] = json_decode($record['manual_input_data'] ?? '{}', true);
    $record['selected_images_decoded'] = json_decode($record['selected_images'] ?? '[]', true);
    $record['ebay_listing_data_decoded'] = json_decode($record['ebay_listing_data'] ?? '{}', true);
    $record['shipping_data_decoded'] = json_decode($record['shipping_data'] ?? '{}', true);
    
    echo json_encode([
        'success' => true,
        'data' => $record
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
