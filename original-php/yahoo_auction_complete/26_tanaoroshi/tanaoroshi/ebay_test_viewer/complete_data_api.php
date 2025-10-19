<?php
/**
 * 完全データ取得API - 全カラム対応版
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
    
    // 全カラムを取得
    $stmt = $pdo->prepare("
        SELECT 
            ebay_item_id,
            title,
            description,
            sku,
            condition_display_name,
            condition_id,
            category_id,
            category_name,
            current_price_value,
            current_price_currency,
            start_price_value,
            buy_it_now_price_value,
            quantity,
            quantity_sold,
            listing_type,
            listing_status,
            seller_user_id,
            seller_feedback_score,
            seller_positive_feedback_percent,
            location,
            country,
            picture_urls,
            view_item_url,
            watch_count,
            bid_count,
            item_specifics,
            shipping_details,
            shipping_costs,
            data_completeness_score,
            created_at,
            updated_at,
            start_time,
            end_time,
            last_modified_time,
            sync_timestamp,
            gallery_url,
            photo_display
        FROM ebay_complete_api_data 
        ORDER BY updated_at DESC 
        LIMIT 200
    ");
    
    $stmt->execute();
    $products = $stmt->fetchAll();
    
    // データ処理
    $processedProducts = [];
    foreach ($products as $product) {
        // PostgreSQL配列とJSONの処理
        $imageUrls = [];
        if ($product['picture_urls']) {
            $pgArrayString = $product['picture_urls'];
            if (strlen($pgArrayString) > 2) {
                $cleanString = trim($pgArrayString, '{}');
                if ($cleanString) {
                    $imageUrls = array_map('trim', explode(',', $cleanString));
                    $imageUrls = array_filter($imageUrls, function($url) {
                        return !empty($url) && filter_var($url, FILTER_VALIDATE_URL);
                    });
                    $imageUrls = array_values($imageUrls);
                }
            }
        }
        
        // JSONフィールドの処理
        $itemSpecifics = null;
        if ($product['item_specifics']) {
            $itemSpecifics = json_decode($product['item_specifics'], true);
        }
        
        $shippingDetails = null;
        if ($product['shipping_details']) {
            $shippingDetails = json_decode($product['shipping_details'], true);
        }
        
        $shippingCosts = null;
        if ($product['shipping_costs']) {
            $shippingCosts = json_decode($product['shipping_costs'], true);
        }
        
        $processedProducts[] = [
            // 基本情報
            'ebay_item_id' => $product['ebay_item_id'],
            'title' => $product['title'],
            'description' => $product['description'],
            'sku' => $product['sku'],
            
            // 商品状態
            'condition_display_name' => $product['condition_display_name'],
            'condition_id' => (int)$product['condition_id'],
            
            // カテゴリ
            'category_id' => $product['category_id'],
            'category_name' => $product['category_name'],
            
            // 価格情報
            'current_price_value' => (float)$product['current_price_value'],
            'current_price_currency' => $product['current_price_currency'],
            'start_price_value' => (float)$product['start_price_value'],
            'buy_it_now_price_value' => (float)$product['buy_it_now_price_value'],
            
            // 在庫・販売
            'quantity' => (int)$product['quantity'],
            'quantity_sold' => (int)$product['quantity_sold'],
            'listing_type' => $product['listing_type'],
            'listing_status' => $product['listing_status'],
            
            // 販売者情報
            'seller_user_id' => $product['seller_user_id'],
            'seller_feedback_score' => (int)$product['seller_feedback_score'],
            'seller_positive_feedback_percent' => (float)$product['seller_positive_feedback_percent'],
            
            // 地理情報
            'location' => $product['location'],
            'country' => $product['country'],
            
            // 画像・URL
            'picture_urls' => $imageUrls,
            'view_item_url' => $product['view_item_url'],
            'gallery_url' => $product['gallery_url'],
            'photo_display' => $product['photo_display'],
            
            // エンゲージメント
            'watch_count' => (int)$product['watch_count'],
            'bid_count' => (int)$product['bid_count'],
            
            // 詳細データ
            'item_specifics' => $itemSpecifics,
            'shipping_details' => $shippingDetails,
            'shipping_costs' => $shippingCosts,
            
            // メタデータ
            'data_completeness_score' => (int)$product['data_completeness_score'],
            'created_at' => $product['created_at'],
            'updated_at' => $product['updated_at'],
            'start_time' => $product['start_time'],
            'end_time' => $product['end_time'],
            'last_modified_time' => $product['last_modified_time'],
            'sync_timestamp' => $product['sync_timestamp']
        ];
    }
    
    ob_clean();
    echo json_encode([
        'success' => true,
        'count' => count($processedProducts),
        'products' => $processedProducts,
        'sample_data' => $processedProducts, // 既存システム互換性
        'message' => '完全データ取得成功',
        'data_fields' => [
            'basic_info' => ['ebay_item_id', 'title', 'description', 'sku'],
            'condition' => ['condition_display_name', 'condition_id'],
            'category' => ['category_id', 'category_name'],
            'pricing' => ['current_price_value', 'current_price_currency', 'start_price_value', 'buy_it_now_price_value'],
            'inventory' => ['quantity', 'quantity_sold', 'listing_type', 'listing_status'],
            'seller' => ['seller_user_id', 'seller_feedback_score', 'seller_positive_feedback_percent'],
            'location' => ['location', 'country'],
            'media' => ['picture_urls', 'view_item_url', 'gallery_url'],
            'engagement' => ['watch_count', 'bid_count'],
            'details' => ['item_specifics', 'shipping_details', 'shipping_costs'],
            'metadata' => ['data_completeness_score', 'created_at', 'updated_at']
        ]
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
