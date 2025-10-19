<?php
/**
 * 保存データ確認スクリプト
 */

header('Content-Type: application/json; charset=utf-8');

$item_id = $_GET['item_id'] ?? 'l1200404917';

try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", "postgres", "Kn240914");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $sql = "SELECT 
        id,
        source_item_id,
        active_title,
        price_jpy,
        active_description,
        sku,
        ebay_category_id,
        item_specifics,
        selected_images,
        shipping_data,
        html_description,
        updated_at
    FROM yahoo_scraped_products 
    WHERE source_item_id = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$item_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        // JSONデータをデコード
        if (isset($result['selected_images'])) {
            $result['selected_images'] = json_decode($result['selected_images'], true);
        }
        if (isset($result['shipping_data'])) {
            $result['shipping_data'] = json_decode($result['shipping_data'], true);
        }
        
        echo json_encode([
            'success' => true,
            'data' => $result,
            'message' => '商品データ取得成功'
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    } else {
        echo json_encode([
            'success' => false,
            'message' => "商品が見つかりません: {$item_id}"
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'エラー: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
