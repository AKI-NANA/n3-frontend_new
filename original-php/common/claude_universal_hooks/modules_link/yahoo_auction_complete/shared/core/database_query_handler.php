<?php
/**
 * データベースクエリハンドラー
 */

/**
 * データベース接続取得
 */
if (!function_exists('getDatabaseConnection')) {
function getDatabaseConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = "pgsql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME;
            $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("データベース接続に失敗しました");
        }
    }
    
    return $pdo;
}
}

/**
 * ダッシュボード統計取得
 */
if (!function_exists('getDashboardStats')) {
function getDashboardStats() {
    try {
        $pdo = getDatabaseConnection();
        
        // 各テーブルの件数を取得
        $stats = [];
        
        // mystical_japan_treasures_inventory
        $stmt = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory");
        $mystical_count = $stmt->fetchColumn();
        
        // ebay_inventory
        $stmt = $pdo->query("SELECT COUNT(*) FROM ebay_inventory");
        $ebay_count = $stmt->fetchColumn();
        
        // inventory_products
        $stmt = $pdo->query("SELECT COUNT(*) FROM inventory_products");
        $inventory_count = $stmt->fetchColumn();
        
        // yahoo_scraped_products (存在する場合)
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products");
            $yahoo_count = $stmt->fetchColumn();
        } catch (Exception $e) {
            $yahoo_count = 0;
        }
        
        return [
            'total_records' => $mystical_count + $ebay_count + $inventory_count + $yahoo_count,
            'scraped_count' => $yahoo_count,
            'calculated_count' => $ebay_count,
            'filtered_count' => $mystical_count,
            'ready_count' => $inventory_count,
            'listed_count' => $ebay_count
        ];
        
    } catch (Exception $e) {
        error_log("Dashboard stats error: " . $e->getMessage());
        return [
            'total_records' => 0,
            'scraped_count' => 0,
            'calculated_count' => 0,
            'filtered_count' => 0,
            'ready_count' => 0,
            'listed_count' => 0
        ];
    }
}
}
}
}

/**
 * 承認待ち商品データ取得
 */
if (!function_exists('getApprovalQueueData')) {
function getApprovalQueueData() {
    try {
        $pdo = getDatabaseConnection();
        
        // mystical_japan_treasures_inventory から商品データを取得
        $sql = "
            SELECT 
                item_id as source_id,
                'mystical_japan' as source_table,
                title,
                current_price as price,
                'USD' as currency,
                category_name as category,
                condition_name,
                picture_url as image_url,
                CASE 
                    WHEN current_price > 100 THEN 'ai-approved'
                    WHEN current_price < 50 THEN 'ai-rejected'
                    ELSE 'ai-pending'
                END as ai_status,
                CASE 
                    WHEN condition_name ILIKE '%used%' THEN 'high-risk'
                    WHEN condition_name ILIKE '%new%' THEN 'medium-risk'
                    ELSE 'low-risk'
                END as risk_level
            FROM mystical_japan_treasures_inventory 
            ORDER BY updated_at DESC 
            LIMIT 50
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $results = $stmt->fetchAll();
        
        return $results;
        
    } catch (Exception $e) {
        error_log("Approval queue error: " . $e->getMessage());
        return [];
    }
}
}
}

/**
* 商品検索　
*/
if (!function_exists('searchProducts')) {
function searchProducts($query) {
    if (empty($query)) {
        return [];
    }
    
    try {
        $pdo = getDatabaseConnection();
        
        // mystical_japan_treasures_inventory から検索
        $sql = "
            SELECT 
                'mystical_japan' as source,
                item_id,
                title,
                current_price as price,
                'USD' as currency,
                category_name as category,
                'eBay' as platform,
                updated_at
            FROM mystical_japan_treasures_inventory 
            WHERE title ILIKE :query OR category_name ILIKE :query
            ORDER BY updated_at DESC
            LIMIT 100
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['query' => '%' . $query . '%']);
        $results = $stmt->fetchAll();
        
        return $results;
        
    } catch (Exception $e) {
        error_log("Search error: " . $e->getMessage());
        return [];
    }
}

/**
 * データベーステーブル確認
 */
if (!function_exists('checkDatabaseTables')) {
function checkDatabaseTables() {
    try {
        $pdo = getDatabaseConnection();
        
        $sql = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        return [
            'success' => true,
            'tables' => $tables
        ];
        
    } catch (Exception $e) {
        error_log("Table check error: " . $e->getMessage());
        return [
            'success' => false,
            'tables' => []
        ];
    }
}

/**
 * 新規商品追加
 */
if (!function_exists('addNewProduct')) {
function addNewProduct($productData) {
    try {
        $pdo = getDatabaseConnection();
        
        // inventory_products テーブルに追加
        $sql = "
            INSERT INTO inventory_products (
                name, sku, category, price_usd, description, created_at
            ) VALUES (
                :name, :sku, :category, :price, :description, NOW()
            )
        ";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            'name' => $productData['name'] ?? '',
            'sku' => $productData['sku'] ?? '',
            'category' => $productData['category'] ?? '',
            'price' => $productData['salePrice'] ?? 0,
            'description' => $productData['description'] ?? ''
        ]);
        
        return [
            'success' => $result,
            'product_id' => $pdo->lastInsertId()
        ];
        
    } catch (Exception $e) {
        error_log("Add product error: " . $e->getMessage());
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}
