<?php
/**
 * データベースクエリハンドラー（真のスクレイピングデータ特定版）
 * 2025-09-12: スクレイピングデータ厳密フィルタリング修正
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
                COUNT(CASE WHEN 
                    item_id LIKE 'COMPLETE_SCRAPING_%' 
                    OR (source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%')
                THEN 1 END) as scraped_count,
                COUNT(CASE WHEN current_price > 0 THEN 1 END) as calculated_count,
                COUNT(CASE WHEN current_price > 0 THEN 1 END) as filtered_count,
                COUNT(CASE WHEN current_price > 0 THEN 1 END) as ready_count,
                COUNT(CASE WHEN listing_status = 'Active' THEN 1 END) as listed_count,
                COUNT(CASE WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 1 END) as real_scraped,
                COUNT(CASE WHEN scraped_at IS NOT NULL THEN 1 END) as with_scraped_timestamp,
                MAX(scraped_at) as last_scraped,
                MAX(updated_at) as last_updated
            FROM mystical_japan_treasures_inventory
        ");
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        error_log("統計情報: 総数{$result['total_records']}件, 真のスクレイピング{$result['real_scraped']}件");
        
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
            'real_scraped' => 0
        ];
    }
}

// 🚨 承認待ち商品データ取得（修正版 - 完全空データ）
function getApprovalQueueData($filters = []) {
    // 緊急修正: 常に空データを返却
    error_log("getApprovalQueueData: 空データ返却中（修正版）");
    return [];
}

// 🎯 真のスクレイピングデータのみ取得（厳密版）
function getScrapedProductsData($page = 1, $limit = 20, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return ['data' => [], 'total' => 0];
        
        $offset = ($page - 1) * $limit;
        
        // 🚨 真のスクレイピングデータのみ厳密抽出
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
            WHERE (
                item_id LIKE 'COMPLETE_SCRAPING_%' 
                OR (
                    source_url IS NOT NULL 
                    AND source_url LIKE '%auctions.yahoo.co.jp%'
                    AND item_id NOT LIKE 'y%'
                    AND item_id NOT LIKE 'dummy_%'
                )
            )
            AND title IS NOT NULL 
            AND current_price > 0
            ORDER BY 
                CASE WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 0 ELSE 1 END,
                scraped_at DESC NULLS LAST,
                updated_at DESC
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
            WHERE (
                item_id LIKE 'COMPLETE_SCRAPING_%' 
                OR (
                    source_url IS NOT NULL 
                    AND source_url LIKE '%auctions.yahoo.co.jp%'
                    AND item_id NOT LIKE 'y%'
                    AND item_id NOT LIKE 'dummy_%'
                )
            )
            AND title IS NOT NULL 
            AND current_price > 0
        ";
        
        $count_stmt = $pdo->query($count_sql);
        $total = $count_stmt->fetchColumn();
        
        error_log("真のスクレイピングデータ取得: " . count($results) . "件 / 総数{$total}件");
        
        return [
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit),
            'source' => 'database_real_scraped_only'
        ];
    } catch (Exception $e) {
        error_log("真のスクレイピングデータ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0, 'page' => 1, 'limit' => $limit, 'total_pages' => 0];
    }
}

// 🔍 全データ表示（デバッグ用）
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
                    WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 'other_scraped'
                    ELSE 'existing_data'
                END as source_system,
                item_id as master_sku,
                'all-data' as ai_status,
                'debug-mode' as risk_level
            FROM mystical_japan_treasures_inventory 
            WHERE title IS NOT NULL 
            AND current_price > 0
            ORDER BY 
                CASE 
                    WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 0
                    WHEN item_id LIKE 'y%' THEN 3
                    WHEN source_url LIKE '%ebay%' THEN 2
                    WHEN source_url IS NOT NULL THEN 1
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
        
        return [
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit),
            'debug_mode' => true
        ];
    } catch (Exception $e) {
        error_log("全データ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0, 'page' => 1, 'limit' => $limit, 'total_pages' => 0];
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
                    WHEN source_url IS NOT NULL THEN 'other_scraped'
                    ELSE 'existing_data'
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

// スクレイピング実行（一時無効）
function executeScrapingWithAPI($url, $api_url = 'http://localhost:5002') {
    return [
        'success' => false,
        'error' => 'スクレイピング機能は一時的に無効化されています',
        'url' => $url,
        'alternative' => '手動でのデータ登録をご利用ください'
    ];
}

// APIサーバーヘルスチェック（無効化状態）
function checkScrapingServerConnection($api_url = 'http://localhost:5002') {
    return [
        'connected' => false,
        'status' => 'disabled',
        'reason' => 'APIサーバー問題により一時停止中',
        'database' => 'PostgreSQL (直接接続)',
        'resolution' => '真のスクレイピングデータのみ表示に修正済み'
    ];
}

// CSV出力用データ取得
function getScrapedProductsForCSV($page = 1, $limit = 1000) {
    return getScrapedProductsData($page, $limit);
}

// CSVヘッダー取得
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

// その他のユーティリティ関数
function generateApiResponse($action, $data, $success = true, $message = '') {
    return [
        'success' => $success,
        'action' => $action,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'count' => is_array($data) ? count($data) : 1,
        'database' => 'PostgreSQL',
        'filter_mode' => 'real_scraped_only'
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
        'filter' => 'real_scraped_only'
    ];
    error_log("Yahoo Auction Tool（真のスクレイピングデータ版）: " . json_encode($logEntry));
}
?>
