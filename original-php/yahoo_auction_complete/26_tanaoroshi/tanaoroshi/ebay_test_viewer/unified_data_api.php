<?php
/**
 * eBay Test Viewer - 単一データベース完全データ取得API
 * nagano3_dbから全項目を取得・表示（統合版）
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// セッション開始・CSRF確認
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF Token確認（関数の重複を避ける）
if (!function_exists('verifyCsrfToken')) {
    function verifyCsrfToken($token) {
        return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
    }
}

// POST処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'get_real_data') {
    header('Content-Type: application/json; charset=utf-8');
    
    // CSRF確認
    if (!isset($_POST['csrf_token']) || !verifyCsrfToken($_POST['csrf_token'])) {
        echo json_encode(['success' => false, 'error' => 'CSRF token mismatch']);
        exit;
    }
    
    try {
        // 単一データベース接続（nagano3_db）
        $pdo = new PDO(
            "pgsql:host=localhost;port=5432;dbname=nagano3_db",
            'aritahiroaki',
            '',
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );
        
        $debugInfo = ['database' => 'nagano3_db', 'connected' => true];
        
        // 完全データ取得クエリ（全項目）
        $completeDataQuery = "
            SELECT 
                -- 基本商品情報
                p.id,
                p.master_sku,
                p.product_name,
                p.description,
                p.base_price_usd,
                p.product_type,
                p.category_name,
                p.condition_type,
                p.brand,
                p.model,
                p.weight_kg,
                p.dimensions_cm,
                p.origin_country,
                p.tags,
                p.seo_title,
                p.seo_description,
                p.meta_keywords,
                p.is_active,
                p.is_featured,
                p.internal_notes,
                p.source,
                p.last_updated_by,
                p.created_at,
                p.updated_at,
                
                -- 在庫情報
                i.quantity_available,
                i.quantity_reserved,
                i.reorder_level,
                i.cost_price_usd,
                i.supplier_name,
                i.supplier_reference,
                i.warehouse_location,
                i.last_sync_at as inventory_last_sync,
                i.updated_at as inventory_updated,
                
                -- メイン画像情報
                pi.image_url as main_image_url,
                pi.image_type as main_image_type,
                pi.sort_order as main_image_sort,
                pi.is_primary as main_image_is_primary,
                
                -- 画像統計
                (SELECT COUNT(*) FROM product_images pi2 WHERE pi2.product_id = p.id) as total_images_count,
                
                -- eBayリスティング情報（完全版）
                el.ebay_item_id,
                el.title as ebay_title,
                el.subtitle as ebay_subtitle,
                el.description_html as ebay_description_html,
                el.price_usd as ebay_price_usd,
                el.price_original as ebay_price_original,
                el.currency as ebay_currency,
                el.listing_quantity,
                el.sold_quantity,
                el.available_quantity,
                el.watchers_count,
                el.view_count,
                el.listing_status,
                el.listing_type,
                el.site as ebay_site,
                el.site_global_id,
                el.seller_username,
                el.seller_feedback_score,
                el.store_name,
                el.gallery_url,
                el.item_web_url,
                el.start_time as ebay_start_time,
                el.end_time as ebay_end_time,
                el.location,
                el.country,
                el.shipping_service,
                el.shipping_cost,
                el.global_shipping,
                el.best_offer_enabled,
                el.created_at as ebay_created,
                el.updated_at as ebay_updated,
                
                -- 状態フラグ
                CASE 
                    WHEN el.ebay_item_id IS NOT NULL THEN 'eBay出品済み'
                    ELSE 'eBay未出品'
                END as ebay_status_text
                
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
            LEFT JOIN ebay_listings el ON p.id = el.product_id
            WHERE p.is_active = true
            ORDER BY p.id DESC
            LIMIT 10
        ";
        
        $stmt = $pdo->prepare($completeDataQuery);
        $stmt->execute();
        $results = $stmt->fetchAll();
        
        if (!empty($results)) {
            $debugInfo['records_found'] = count($results);
            $debugInfo['sample_fields'] = array_keys($results[0]);
            $debugInfo['query_executed'] = true;
            
            echo json_encode([
                'success' => true,
                'data' => $results,
                'count' => count($results),
                'debug_info' => $debugInfo,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        } else {
            // データがない場合のフォールバック
            $fallbackQuery = "
                SELECT 
                    p.id,
                    p.master_sku,
                    p.product_name,
                    p.description,
                    p.base_price_usd,
                    p.created_at,
                    i.quantity_available,
                    pi.image_url as main_image_url,
                    'データ不足' as ebay_status_text
                FROM products p
                LEFT JOIN inventory i ON p.id = i.product_id
                LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
                WHERE p.is_active = true
                ORDER BY p.id DESC
                LIMIT 5
            ";
            
            $fallbackStmt = $pdo->prepare($fallbackQuery);
            $fallbackStmt->execute();
            $fallbackResults = $fallbackStmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'data' => $fallbackResults,
                'count' => count($fallbackResults),
                'debug_info' => array_merge($debugInfo, [
                    'fallback_used' => true,
                    'message' => '一部データが不足しているため、フォールバック表示を使用'
                ]),
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        }
        
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'error' => 'データベース接続失敗: ' . $e->getMessage(),
            'debug_info' => ['database_error' => true]
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => 'エラーが発生しました: ' . $e->getMessage()
        ]);
    }
    
    exit;
}
?>
