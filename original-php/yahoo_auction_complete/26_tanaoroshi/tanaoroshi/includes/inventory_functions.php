<?php
/**
 * 在庫管理システム共通関数
 * N3構造準拠・Hook統合対応
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

/**
 * PostgreSQL接続取得（将来対応）
 */
function getInventoryDBConnection() {
    // 現在はSQLiteを使用、将来PostgreSQLに移行
    static $pdo = null;
    
    if ($pdo !== null) {
        return $pdo;
    }
    
    try {
        $database_file = __DIR__ . '/../../../data/inventory_system.db';
        $database_dir = dirname($database_file);
        
        if (!is_dir($database_dir)) {
            mkdir($database_dir, 0755, true);
        }
        
        $pdo = new PDO('sqlite:' . $database_file);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        
        // 在庫管理テーブル作成
        createInventoryTables($pdo);
        
        return $pdo;
        
    } catch (PDOException $e) {
        error_log("Inventory Database connection error: " . $e->getMessage());
        throw new Exception("在庫データベース接続エラー: " . $e->getMessage());
    }
}

/**
 * 在庫管理用テーブル作成
 */
function createInventoryTables($pdo) {
    // メイン在庫テーブル
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS inventory_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku_id TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            category TEXT,
            
            -- 在庫情報
            stock_quantity INTEGER DEFAULT 0,
            stock_type TEXT DEFAULT '有在庫' CHECK(stock_type IN ('有在庫', '無在庫', 'ハイブリッド')),
            condition_status TEXT DEFAULT '中古' CHECK(condition_status IN ('新品', '中古')),
            danger_level INTEGER DEFAULT 0,
            
            -- 価格情報
            selling_price REAL,
            purchase_price REAL,
            expected_profit REAL,
            currency TEXT DEFAULT 'USD',
            
            -- 出品情報
            listing_platforms TEXT, -- JSON文字列
            listing_date TEXT,
            listing_status TEXT DEFAULT '未出品',
            
            -- パフォーマンス
            watchers_count INTEGER DEFAULT 0,
            views_count INTEGER DEFAULT 0,
            ebay_score REAL DEFAULT 0,
            
            -- メタデータ
            images TEXT, -- JSON文字列
            ebay_item_id TEXT,
            mercari_item_id TEXT,
            shopify_item_id TEXT,
            
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // テストデータ投入
    insertTestInventoryData($pdo);
}

/**
 * テストデータ投入（既存Maru9データを在庫管理用に変換）
 */
function insertTestInventoryData($pdo) {
    $test_data = [
        [
            'sku_id' => 'TEST001',
            'title' => 'Nike Air Max 90 スニーカー ホワイト',
            'category' => 'Athletic Shoes',
            'stock_quantity' => 1,
            'stock_type' => '有在庫',
            'condition_status' => '新品',
            'selling_price' => 120.00,
            'purchase_price' => 80.00,
            'expected_profit' => 40.00,
            'listing_platforms' => '["ebay", "shopify"]',
            'listing_status' => '出品中',
            'watchers_count' => 15,
            'views_count' => 245,
            'ebay_score' => 4.8,
            'images' => '["Nike_AirMax_Photo.jpg"]',
            'ebay_item_id' => 'EB123456789'
        ],
        [
            'sku_id' => 'TEST002',
            'title' => 'Callaway ゴルフドライバー Big Bertha',
            'category' => 'Golf Clubs',
            'stock_quantity' => 1,
            'stock_type' => '有在庫',
            'condition_status' => '新品',
            'selling_price' => 400.00,
            'purchase_price' => 250.00,
            'expected_profit' => 150.00,
            'listing_platforms' => '["ebay"]',
            'listing_status' => '出品中',
            'watchers_count' => 8,
            'views_count' => 156,
            'ebay_score' => 4.9,
            'images' => '["callaway_driver_pic.jpg"]',
            'ebay_item_id' => 'EB987654321'
        ],
        [
            'sku_id' => 'TEST003',
            'title' => 'Apple iPhone 14 Pro ケース レザー',
            'category' => 'Phone Cases',
            'stock_quantity' => 5,
            'stock_type' => '有在庫',
            'condition_status' => '新品',
            'selling_price' => 80.00,
            'purchase_price' => 50.00,
            'expected_profit' => 30.00,
            'listing_platforms' => '["ebay", "mercari"]',
            'listing_status' => '出品中',
            'watchers_count' => 22,
            'views_count' => 387,
            'ebay_score' => 4.7,
            'images' => '["apple_case_photo.jpg"]',
            'mercari_item_id' => 'MC456789123'
        ],
        [
            'sku_id' => 'TEST004',
            'title' => 'Samsung Galaxy S24 スマートフォン',
            'category' => 'Smartphones',
            'stock_quantity' => 0,
            'stock_type' => '無在庫',
            'condition_status' => '新品',
            'selling_price' => 1200.00,
            'purchase_price' => 800.00,
            'expected_profit' => 400.00,
            'listing_platforms' => '["ebay"]',
            'listing_status' => '在庫切れ',
            'watchers_count' => 45,
            'views_count' => 892,
            'ebay_score' => 4.6,
            'images' => '["samsung_phone.jpg"]',
            'danger_level' => 3
        ],
        [
            'sku_id' => 'TEST006',
            'title' => 'Louis Vuitton バッグ ハンドバッグ',
            'category' => 'Luxury Handbags',
            'stock_quantity' => 1,
            'stock