<?php
/**
 * 🚨 緊急テスト用Ajaxハンドラー（CSRF無効版）
 */

// CSRF完全スキップ版
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');

try {
    $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
    $pdo = new PDO($dsn, 'postgres', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    $sql = "SELECT 
                item_id,
                title,
                item_id as sku,
                CAST(COALESCE(current_price, 0) AS DECIMAL(10,2)) as price_usd,
                CAST(COALESCE(current_price * 0.7, 0) AS DECIMAL(10,2)) as cost_usd,
                COALESCE(condition_name, 'Used') as condition,
                COALESCE(category_name, 'Various') as category,
                COALESCE(listing_type, 'FixedPrice') as status,
                CONCAT('https://thumbs1.ebaystatic.com/m/m', item_id, '/s-l225.jpg') as image,
                COALESCE(watch_count, 0) as watchers_count,
                COALESCE(quantity, 1) as quantity,
                CASE 
                    WHEN COALESCE(quantity, 1) > 0 THEN 'stock'
                    ELSE 'dropship'
                END as product_type,
                COALESCE(view_count, 0) as view_count,
                updated_at
            FROM mystical_japan_treasures_inventory
            WHERE item_id IS NOT NULL
            ORDER BY updated_at DESC 
            LIMIT 50";
    
    $stmt = $pdo->query($sql);
    $raw_data = $stmt->fetchAll();
    
    // JavaScript期待形式に変換
    $converted_data = [];
    foreach ($raw_data as $index => $item) {
        $id = $index + 1;
        $priceUSD = (float)($item['price_usd'] ?? 99.99);
        $costUSD = (float)($item['cost_usd'] ?? 69.99);
        $stock = (int)($item['quantity'] ?? 1);
        
        $converted_data[] = [
            'id' => $id,
            'name' => $item['title'] ?? "商品 {$id}",
            'title' => $item['title'] ?? "商品 {$id}",
            'sku' => $item['sku'] ?? "SKU-{$id}",
            'type' => $item['product_type'] ?? 'stock',
            'condition' => $item['condition'] ?? 'new',
            'priceUSD' => $priceUSD,
            'costUSD' => $costUSD,
            'price' => $priceUSD,
            'stock' => $stock,
            'quantity' => $stock,
            'category' => $item['category'] ?? 'Electronics',
            'channels' => ['ebay'],
            'image' => $item['image'] ?? '',
            'gallery_url' => $item['image'] ?? '',
            'listing_status' => '出品中',
            'watch_count' => (int)($item['watchers_count'] ?? 0),
            'watchers_count' => (int)($item['watchers_count'] ?? 0),
            'view_count' => (int)($item['view_count'] ?? 0),
            'views_count' => (int)($item['view_count'] ?? 0),
            'item_id' => $item['item_id'] ?? "ITEM{$id}",
            'ebay_item_id' => $item['item_id'] ?? "ITEM{$id}",
            'data_source' => 'emergency_test_handler',
            'updated_at' => $item['updated_at'] ?? date('c'),
            'created_at' => $item['updated_at'] ?? date('c')
        ];
    }
    
    $response = [
        'success' => true,
        'timestamp' => date('c'),
        'data_count' => count($converted_data),
        'data' => $converted_data,
        'message' => '緊急テスト用データ取得成功: ' . count($converted_data) . '件',
        'n3_compliant' => true,
        'emergency_mode' => true
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c'),
        'emergency_mode' => true
    ]);
}
?>
