<?php
/**
 * eBay Test Viewer - 完全データ表示API
 * 全ての取得データを統合表示
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// セッション開始・CSRF確認
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

if (!function_exists('verifyCsrfToken')) {
    function verifyCsrfToken($token) {
        return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
    }
}

// POST処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'get_complete_data') {
    header('Content-Type: application/json; charset=utf-8');
    
    if (!isset($_POST['csrf_token']) || !verifyCsrfToken($_POST['csrf_token'])) {
        echo json_encode(['success' => false, 'error' => 'CSRF token mismatch']);
        exit;
    }
    
    try {
        // PostgreSQL接続
        $pdo = new PDO(
            "pgsql:host=localhost;port=5432;dbname=nagano3_db",
            'aritahiroaki',
            '',
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );
        
        // 完全統合データクエリ
        $completeQuery = "
            WITH ebay_inventory_data AS (
                SELECT 
                    ei.item_id as real_ebay_item_id,
                    ei.title as real_ebay_title,
                    ei.description as real_ebay_description,
                    ei.price_usd as real_ebay_price,
                    ei.quantity as real_ebay_quantity,
                    ei.condition as real_ebay_condition,
                    ei.category_name as real_ebay_category,
                    ei.listing_status as real_ebay_status,
                    ei.listing_type as real_ebay_type,
                    ei.start_time as real_start_time,
                    ei.end_time as real_end_time,
                    ei.location as real_location,
                    ei.currency as real_currency,
                    ei.store_name as real_store_name,
                    ei.watchers_count as real_watchers,
                    ei.view_count as real_views,
                    ei.shipping_cost as real_shipping,
                    ei.updated_at as real_last_update,
                    ROW_NUMBER() OVER (ORDER BY ei.updated_at DESC) as ebay_rank
                FROM ebay_inventory ei
                WHERE ei.item_id IS NOT NULL
                LIMIT 20
            )
            SELECT 
                -- 基本商品情報
                p.id as product_id,
                p.master_sku,
                p.product_name,
                p.description as product_description,
                p.base_price_usd,
                p.product_type,
                p.category_name as product_category,
                p.condition_type,
                p.brand,
                p.model,
                p.weight_kg,
                p.dimensions_cm,
                p.origin_country,
                p.tags,
                p.seo_title,
                p.seo_description,
                p.is_active,
                p.is_featured,
                p.internal_notes,
                p.created_at as product_created,
                p.updated_at as product_updated,
                
                -- 在庫情報
                i.quantity_available,
                i.quantity_reserved,
                i.reorder_level,
                i.cost_price_usd,
                i.supplier_name,
                i.warehouse_location,
                i.last_sync_at as inventory_sync,
                
                -- 商品画像
                pi.image_url as product_image_url,
                pi.image_type,
                pi.is_primary as is_primary_image,
                (SELECT COUNT(*) FROM product_images pi2 WHERE pi2.product_id = p.id) as total_images,
                
                -- ebay_listingsテーブルの統合データ
                el.listing_id,
                el.ebay_item_id as integrated_ebay_id,
                el.site,
                el.title as integrated_title,
                el.subtitle,
                el.description_html,
                el.price_usd as integrated_price,
                el.price_original,
                el.currency as integrated_currency,
                el.listing_quantity,
                el.sold_quantity,
                el.available_quantity,
                el.listing_status as integrated_status,
                el.listing_type as integrated_type,
                el.watchers_count as integrated_watchers,
                el.view_count as integrated_views,
                el.seller_username,
                el.seller_feedback_score,
                el.store_name as integrated_store,
                el.gallery_url,
                el.item_web_url,
                el.location as integrated_location,
                el.country,
                el.global_shipping,
                el.best_offer_enabled,
                el.created_at as listing_created,
                
                -- 実際のeBay APIデータ
                eid.real_ebay_item_id,
                eid.real_ebay_title,
                eid.real_ebay_description,
                eid.real_ebay_price,
                eid.real_ebay_quantity,
                eid.real_ebay_condition,
                eid.real_ebay_category,
                eid.real_ebay_status,
                eid.real_ebay_type,
                eid.real_start_time,
                eid.real_end_time,
                eid.real_location,
                eid.real_currency,
                eid.real_store_name,
                eid.real_watchers,
                eid.real_views,
                eid.real_shipping,
                eid.real_last_update,
                eid.ebay_rank,
                
                -- データソース判定
                CASE 
                    WHEN eid.real_ebay_item_id IS NOT NULL THEN 'Real eBay API Data'
                    WHEN el.ebay_item_id IS NOT NULL THEN 'Integrated Listing Data'
                    ELSE 'Product Only'
                END as data_source,
                
                -- 統合ステータス
                CASE 
                    WHEN eid.real_ebay_item_id IS NOT NULL THEN 'Active eBay Listing'
                    WHEN el.ebay_item_id IS NOT NULL THEN 'Integrated Listing'
                    ELSE 'Not Listed'
                END as ebay_integration_status,
                
                -- 価格比較
                CASE 
                    WHEN eid.real_ebay_price IS NOT NULL AND el.price_usd IS NOT NULL 
                    THEN ABS(eid.real_ebay_price - el.price_usd)
                    ELSE NULL
                END as price_difference
                
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
            LEFT JOIN ebay_listings el ON p.id = el.product_id
            LEFT JOIN ebay_inventory_data eid ON eid.ebay_rank <= 10
            WHERE p.is_active = true
            ORDER BY 
                CASE WHEN eid.real_ebay_item_id IS NOT NULL THEN 1 ELSE 2 END,
                eid.real_last_update DESC NULLS LAST,
                p.id DESC
            LIMIT 20
        ";
        
        $stmt = $pdo->prepare($completeQuery);
        $stmt->execute();
        $results = $stmt->fetchAll();
        
        // ebay_inventoryテーブルの統計も取得
        $statsQuery = "
            SELECT 
                COUNT(*) as total_ebay_inventory,
                COUNT(CASE WHEN updated_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as recent_updates,
                MAX(updated_at) as last_update,
                AVG(price_usd) as avg_price,
                COUNT(DISTINCT item_id) as unique_items
            FROM ebay_inventory
            WHERE item_id IS NOT NULL
        ";
        
        $statsStmt = $pdo->prepare($statsQuery);
        $statsStmt->execute();
        $stats = $statsStmt->fetch();
        
        // ebay_listingsテーブルの統計
        $listingStatsQuery = "
            SELECT 
                COUNT(*) as total_listings,
                COUNT(CASE WHEN ebay_item_id IS NOT NULL THEN 1 END) as with_ebay_id,
                COUNT(CASE WHEN description_html IS NOT NULL THEN 1 END) as with_html_desc,
                COUNT(CASE WHEN gallery_url IS NOT NULL THEN 1 END) as with_images,
                AVG(price_usd) as avg_listing_price
            FROM ebay_listings
        ";
        
        $listingStatsStmt = $pdo->prepare($listingStatsQuery);
        $listingStatsStmt->execute();
        $listingStats = $listingStatsStmt->fetch();
        
        echo json_encode([
            'success' => true,
            'data' => $results,
            'count' => count($results),
            'ebay_inventory_stats' => $stats,
            'ebay_listings_stats' => $listingStats,
            'data_sources' => [
                'products_table' => 'nagano3_db.products',
                'inventory_table' => 'nagano3_db.inventory', 
                'ebay_inventory_table' => 'nagano3_db.ebay_inventory (Real API Data)',
                'ebay_listings_table' => 'nagano3_db.ebay_listings (Integrated Data)'
            ],
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => 'データ取得エラー: ' . $e->getMessage(),
            'data' => []
        ]);
    }
    
    exit;
}
?>
