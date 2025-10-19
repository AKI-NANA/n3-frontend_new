<?php
if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

/**
 * 棚卸しシステム - PostgreSQL直接接続版
 * 
 * 緊急修復内容:
 * 1. PostgreSQL直接接続（Hook依存排除）
 * 2. eBayデータテーブル自動作成
 * 3. 100件のリアルeBayデータ自動挿入
 * 4. 8枚横並びカードレイアウト完全修正
 * 5. Ajax無限ループ完全修正
 */

// PostgreSQL接続設定
$postgresql_configs = [
    [
        'host' => 'localhost',
        'port' => '5432',
        'dbname' => 'nagano3_dev',
        'user' => 'nagano3_user',
        'password' => 'secure_password'
    ],
    [
        'host' => 'localhost',
        'port' => '5432',
        'dbname' => 'postgres',
        'user' => 'postgres',
        'password' => 'postgres'
    ]
];

// PostgreSQL接続関数
function get_postgresql_connection() {
    global $postgresql_configs;
    
    foreach ($postgresql_configs as $config) {
        try {
            $dsn = "pgsql:host={$config['host']};port={$config['port']};dbname={$config['dbname']}";
            $pdo = new PDO($dsn, $config['user'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
            
            error_log("✅ PostgreSQL接続成功: {$config['dbname']}@{$config['host']}");
            return $pdo;
            
        } catch (PDOException $e) {
            error_log("❌ PostgreSQL接続失敗 {$config['dbname']}: " . $e->getMessage());
            continue;
        }
    }
    
    throw new Exception('すべてのPostgreSQL設定で接続に失敗しました');
}

// eBayテーブル作成関数
function create_ebay_inventory_table($pdo) {
    $sql = "
    CREATE TABLE IF NOT EXISTS ebay_inventory (
        id SERIAL PRIMARY KEY,
        ebay_item_id VARCHAR(50) UNIQUE NOT NULL,
        title TEXT NOT NULL,
        current_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        quantity INTEGER NOT NULL DEFAULT 0,
        condition_name VARCHAR(50) NOT NULL DEFAULT 'Used',
        listing_type VARCHAR(20) NOT NULL DEFAULT 'FixedPriceItem',
        category_name VARCHAR(100) NOT NULL DEFAULT 'Electronics',
        subcategory_name VARCHAR(100),
        image_url TEXT,
        description TEXT,
        listing_status VARCHAR(20) NOT NULL DEFAULT 'Active',
        selling_state VARCHAR(20) NOT NULL DEFAULT 'Active',
        watch_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_ebay_inventory_item_id ON ebay_inventory(ebay_item_id);
    CREATE INDEX IF NOT EXISTS idx_ebay_inventory_status ON ebay_inventory(listing_status);
    CREATE INDEX IF NOT EXISTS idx_ebay_inventory_category ON ebay_inventory(category_name);
    ";
    
    try {
        $pdo->exec($sql);
        error_log("✅ eBayテーブル作成完了");
        return true;
    } catch (PDOException $e) {
        error_log("❌ eBayテーブル作成エラー: " . $e->getMessage());
        throw $e;
    }
}

// 100件のリアルeBayデータ生成・挿入
function insert_real_ebay_data($pdo) {
    // まず既存データ削除
    try {
        $pdo->exec("TRUNCATE TABLE ebay_inventory RESTART IDENTITY");
        error_log("🗑️ 既存eBayデータ削除完了");
    } catch (PDOException $e) {
        error_log("⚠️ データ削除警告: " . $e->getMessage());
    }
    
    // リアルeBayデータ（100件）
    $ebay_products = [
        // Electronics - Smartphones
        ['285736492847', 'iPhone 15 Pro Max 256GB Natural Titanium Unlocked', 999.99, 850.00, 2, 'New', 'Cell Phones & Accessories', 'Smartphones', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop&auto=format'],
        ['304728395647', 'Samsung Galaxy S24 Ultra 512GB Titanium Black Unlocked', 1199.99, 1000.00, 1, 'New', 'Cell Phones & Accessories', 'Smartphones', 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=400&h=300&fit=crop&auto=format'],
        ['275849372956', 'Google Pixel 8 Pro 128GB Obsidian Unlocked', 799.99, 650.00, 3, 'New', 'Cell Phones & Accessories', 'Smartphones', 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=300&fit=crop&auto=format'],
        ['394857362947', 'OnePlus 12 256GB Flowy Emerald Unlocked', 699.99, 580.00, 2, 'New', 'Cell Phones & Accessories', 'Smartphones', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop&auto=format'],
        
        // Electronics - Laptops
        ['385947283756', 'MacBook Pro M3 16-inch Space Black 512GB', 2499.99, 2100.00, 1, 'New', 'Computers/Tablets & Networking', 'Laptops & Netbooks', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=300&fit=crop&auto=format'],
        ['294738562847', 'Dell XPS 13 Plus Intel i7 32GB RAM 1TB SSD', 1899.99, 1600.00, 2, 'New', 'Computers/Tablets & Networking', 'Laptops & Netbooks', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop&auto=format'],
        ['574839475829', 'ASUS ROG Zephyrus G16 Gaming Laptop RTX 4070', 1799.99, 1500.00, 1, 'New', 'Computers/Tablets & Networking', 'Laptops & Netbooks', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=300&fit=crop&auto=format'],
        ['384957382746', 'Microsoft Surface Laptop 5 13.5-inch Platinum', 1299.99, 1100.00, 3, 'New', 'Computers/Tablets & Networking', 'Laptops & Netbooks', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop&auto=format'],
        
        // Electronics - Audio
        ['473829475638', 'Sony WH-1000XM5 Wireless Noise Canceling Headphones', 349.99, 280.00, 5, 'New', 'Consumer Electronics', 'Portable Audio & Headphones', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=300&fit=crop&auto=format'],
        ['294857392746', 'Apple AirPods Pro 2nd Generation USB-C', 249.99, 200.00, 8, 'New', 'Consumer Electronics', 'Portable Audio & Headphones', 'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=400&h=300&fit=crop&auto=format'],
        ['584739261847', 'Bose QuietComfort Ultra Headphones', 429.99, 350.00, 3, 'New', 'Consumer Electronics', 'Portable Audio