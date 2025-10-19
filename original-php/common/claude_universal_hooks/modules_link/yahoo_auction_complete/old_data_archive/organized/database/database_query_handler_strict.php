<?php
/**
 * データベースクエリハンドラー（超厳密スクレイピングフィルタリング版）
 * 2025-09-12: COMPLETE_SCRAPING_* のみ表示・ダミーデータ完全除外
 */

// データベース接続
function getDatabaseConnection() {
    try {
        $host = 'localhost';
        $dbname = 'nagano3_db';
        $username = 'postgres';
        $password = 'password123';
        
        $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        error_log("データベース接続エラー: " . $e->getMessage());
        return null;
    }
}

// ダッシュボード統計取得
function getDashboardStats() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return null;
        
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 1 END) as scraped_count,
                COUNT(CASE WHEN current_price > 0 THEN 1 END) as calculated_count,
                COUNT(CASE WHEN current_price > 0 THEN 1 END) as filtered_count,
                COUNT(CASE WHEN current_price > 0 THEN 1 END) as ready_count,
                COUNT(CASE WHEN listing_status = 'Active' THEN 1 END) as listed_count,
                COUNT(CASE WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 1 END) as real_scraped,
                COUNT(CASE WHEN item_id LIKE 'y%' THEN 1 END) as dummy_count,
                COUNT(CASE WHEN source_url LIKE '%ebay%' THEN 1 END) as ebay_count,
                MAX(updated_at) as last_updated
            FROM mystical_japan_treasures_inventory
        ");
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        error_log("統計情報: 総数{$result['total_records']}件, 真のスクレイピング{$result['real_scraped']}件, ダミー{$result['dummy_count']}件");
        
        return $result;
    } catch (Exception $e) {
        error_log("統計取得エラー: " . $e->getMessage());
        return [
            'total_records' => 0,
            'scraped_count' => 0,
            'calculated_count' => 0,
            'filtered_count' => 0,
            'ready_count' => 0,
            'listed_count' => 0,
            'real_scraped' => 0,
            'dummy_count' => 0
        ];
    }
}

// 承認待ち商品データ取得（完全空データ）
function getApprovalQueueData($filters = []) {
    error_log("getApprovalQueueData: 空データ返却中（修正版）");
    return [];
}

// 🎯 真のスクレイピングデータのみ取得（超厳密版）
function getScrapedProductsData($page = 1, $limit = 20, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return ['data' => [], 'total' => 0];
        
        $offset = ($page - 1) * $limit;
        
        // 🚨 COMPLETE_SCRAPING_* のみ超厳密抽出
        $sql = "
            SELECT 
                item_id,
                title,
                current_price,
                condition_name,
                category_name,
                picture_url,
                gallery_url,
                watch_count,
                updated_at,
                listing_status,
                source_url,
                scraped_at,
                'real_scraped_data' as source_system,
                item_id as master_sku,
                'scraped-confirmed' as ai_status,
                'scraped-data' as risk_level
            FROM mystical_japan_treasures_inventory 
            WHERE item_id LIKE 'COMPLETE_SCRAPING_%'
            AND title IS NOT NULL 
            AND current_price > 0
            AND item_id NOT LIKE 'y%'
            ORDER BY scraped_at DESC NULLS LAST, updated_at DESC
            LIMIT :limit OFFSET :offset
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 総数カウント（同じ条件）
        $count_sql = "
            SELECT COUNT(*) as total
            FROM mystical_japan_treasures_inventory 
            WHERE item_id LIKE 'COMPLETE_SCRAPING_%'
            AND title IS NOT NULL 
            AND current_price > 0
            AND item_id NOT LIKE 'y%'
        ";
        
        $count_stmt = $pdo->query($count_sql);
        $total = $count_stmt->fetchColumn();
        
        error_log("真のスクレイピングデータ（COMPLETE_SCRAPING_*）のみ取得: " . count($results) . "件 / 総数{$total}件");
        
        return [
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit),
            'source' => 'database_complete_scraping_only',
            'filter_applied' => 'COMPLETE_SCRAPING_* only'
        ];
    } catch (Exception $e) {
        error_log("真のスクレイピングデータ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0, 'page' => 1, 'limit' => $limit, 'total_pages' => 0];
    }
}

// 全データ表示（デバッグ用・データタイプ分類）
function getAllRecentProductsData($page = 1, $limit = 20) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return ['data' => [], 'total' => 0];
        
        $offset = ($page - 1) * $limit;
        
        $sql = "
            SELECT 
                item_id,
                title,
                current_price,
                condition_name,
                category_name,
                picture_url,
                gallery_url,
                watch_count,
                updated_at,
                listing_status,
                source_url,
                scraped_at,
                CASE 
                    WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 'real_scraped'
                    WHEN item_id LIKE 'y%' THEN 'test_dummy'
                    WHEN source_url LIKE '%ebay%' THEN 'ebay_api_data'
                    WHEN CAST(item_id AS TEXT) ~ '^[0-9]+$' THEN 'numeric_id_data'
                    ELSE 'other_data'
                END as source_system,
                item_id as master_sku,
                'debug-mode' as ai_status,
                'debug-data' as risk_level
            FROM mystical_japan_treasures_inventory 
            WHERE title IS NOT NULL 
            AND current_price > 0
            ORDER BY 
                CASE 
                    WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 0
                    WHEN item_id LIKE 'y%' THEN 1
                    WHEN source_url LIKE '%ebay%' THEN 2
                    WHEN CAST(item_id AS TEXT) ~ '^[0-9]+$' THEN 3
                    ELSE 4
                END,
                updated_at DESC
            LIMIT :limit OFFSET :offset
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $count_sql = "
            SELECT COUNT(*) as total
            FROM mystical_japan_treasures_inventory 
            WHERE title IS NOT NULL 
            AND current_price > 0
        ";
        
        $count_stmt = $pdo->query($count_sql);
        $total = $count_stmt->fetchColumn();
        
        // データタイプ別統計ログ
        $type_counts = [];
        foreach ($results as $item) {
            $type = $item['source_system'];
            $type_counts[$type] = ($type_counts[$type] ?? 0) + 1;
        }
        error_log("デバッグモード統計: " . json_encode($type_counts));
        
        return [
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit),
            'debug_mode' => true,
            'type_statistics' => $type_counts
        ];
    } catch (Exception $e) {
        error_log("全データ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0, 'page' => 1, 'limit' => $limit, 'total_pages' => 0];
    }
}

// 🧹 ダミーデータ削除関数
function cleanupDummyData() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return ['success' => false, 'error' => 'データベース接続失敗'];
        
        // 削除前確認
        $check_sql = "
            SELECT COUNT(*) as dummy_count
            FROM mystical_japan_treasures_inventory 
            WHERE item_id LIKE 'y%' 
            AND (
                title LIKE '%スクレイピング取得商品%'
                OR title LIKE '%スクレイピング%'
                OR current_price IN (27.33, 132.37, 69.12, 15.98, 76.59, 73.72)
                OR item_id IN (
                    'y397815560593',
                    'y737457117105', 
                    'y543203520057',
                    'y797923682706',
                    'y178466430083',
                    'y615720304139'
                )
            )
        ";
        
        $check_stmt = $pdo->query($check_sql);
        $dummy_count = $check_stmt->fetchColumn();
        
        // ダミーデータ削除実行
        $delete_sql = "
            DELETE FROM mystical_japan_treasures_inventory 
            WHERE item_id LIKE 'y%' 
            AND (
                title LIKE '%スクレイピング取得商品%'
                OR title LIKE '%スクレイピング%'
                OR current_price IN (27.33, 132.37, 69.12, 15.98, 76.59, 73.72)
                OR item_id IN (
                    'y397815560593',
                    'y737457117105', 
                    'y543203520057',
                    'y797923682706',
                    'y178466430083',
                    'y615720304139'
                )
            )
        ";
        
        $delete_stmt = $pdo->prepare($delete_sql);
        $delete_stmt->execute();
        $deleted_count = $delete_stmt->rowCount();
        
        error_log("ダミーデータクリーンアップ完了: {$deleted_count}件削除 (予想{$dummy_count}件)");
        
        return [
            'success' => true,
            'deleted_count' => $deleted_count,
            'expected_count' => $dummy_count,
            'message' => "ダミーデータを{$deleted_count}件削除しました"
        ];
    } catch (Exception $e) {
        error_log("ダミーデータ削除エラー: " . $e->getMessage());
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

// 商品検索（統合版）
function searchProducts($query, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return [];
        
        $sql = "
            SELECT 
                item_id,
                title,
                current_price,
                condition_name,
                category_name,
                picture_url,
                source_url,
                scraped_at,
                CASE 
                    WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 'real_scraped'
                    WHEN item_id LIKE 'y%' THEN 'test_dummy'
                    WHEN source_url LIKE '%ebay%' THEN 'ebay_api_data'
                    ELSE 'other_data'
                END as source_system,
                item_id as master_sku
            FROM mystical_japan_treasures_inventory 
            WHERE (title ILIKE :query OR category_name ILIKE :query)
            AND current_price > 0
            ORDER BY 
                CASE 
                    WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 0
                    WHEN source_url IS NOT NULL THEN 1
                    ELSE 2
                END,
                updated_at DESC
            LIMIT 20
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['query' => '%' . $query . '%']);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("商品検索成功: " . count($results) . "件");
        
        return $results;
    } catch (Exception $e) {
        error_log("検索エラー: " . $e->getMessage());
        return [];
    }
}

// その他の関数（プレースホルダー）
function executeScrapingWithAPI($url, $api_url = 'http://localhost:5002') {
    return [
        'success' => false,
        'error' => 'スクレイピング機能は一時的に無効化されています',
        'url' => $url,
        'alternative' => '手動でのデータ登録をご利用ください'
    ];
}

function checkScrapingServerConnection($api_url = 'http://localhost:5002') {
    return [
        'connected' => false,
        'status' => 'disabled',
        'reason' => 'APIサーバー問題により一時停止中',
        'database' => 'PostgreSQL (直接接続)',
        'resolution' => '真のスクレイピングデータのみ表示に修正済み'
    ];
}

function getScrapedProductsForCSV($page = 1, $limit = 1000) {
    return getScrapedProductsData($page, $limit);
}

function getCSVHeaders() {
    return [
        'action', 'memo', 'master_sku', 'source', 'title', 'price_jpy', 'category',
        'condition', 'source_url', 'ebay_sku', 'ebay_action', 'ebay_sku_final',
        'ebay_title', 'ebay_subtitle', 'ebay_price', 'ebay_shipping', 'ebay_format',
        'ebay_duration', 'ebay_description', 'image_1', 'image_2', 'image_3', 'image_4',
        'shipping_type', 'shipping_cost', 'handling_time', 'length', 'width', 'height',
        'weight', 'location', 'country', 'return_accepted', 'return_period',
        'calculated_price', 'profit_margin', 'margin_percent', 'notes', 'status',
        'approval_status', 'priority', 'created_at', 'updated_at', 'created_by'
    ];
}

function generateApiResponse($action, $data, $success = true, $message = '') {
    return [
        'success' => $success,
        'action' => $action,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'count' => is_array($data) ? count($data) : 1,
        'database' => 'PostgreSQL',
        'filter_mode' => 'complete_scraping_only'
    ];
}

function addNewProduct($productData) {
    return ['success' => false, 'message' => '新規商品追加機能は開発中です'];
}

function approveProduct($sku) {
    return ['success' => false, 'message' => '商品承認機能は開発中です'];
}

function rejectProduct($sku) {
    return ['success' => false, 'message' => '商品否認機能は開発中です'];
}

function logAction($action, $data = null) {
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'action' => $action,
        'data' => $data,
        'filter' => 'complete_scraping_only'
    ];
    error_log("Yahoo Auction Tool（COMPLETE_SCRAPING_*のみ版）: " . json_encode($logEntry));
}
?>
