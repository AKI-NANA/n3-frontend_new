<?php
/**
 * eBayサンプルデータ作成エンジン
 * N3準拠: Ajax処理専用
 */

if (!defined('SECURE_ACCESS')) die('Direct access not allowed');

class EbaySampleDataCreator {
    
    private $db;
    private $config;
    
    public function __construct() {
        $this->config = $this->loadConfig();
        $this->db = $this->connectDatabase();
    }
    
    private function loadConfig() {
        return [
            'db_host' => 'localhost',
            'db_name' => 'nagano3_db',
            'db_user' => 'arita',
            'db_pass' => 'Ar17aH21'
        ];
    }
    
    private function connectDatabase() {
        try {
            $pdo = new PDO(
                "pgsql:host={$this->config['db_host']};dbname={$this->config['db_name']}",
                $this->config['db_user'],
                $this->config['db_pass'],
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            return $pdo;
        } catch (Exception $e) {
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    public function createData() {
        $createdCount = 0;
        
        try {
            $sampleData = $this->generateSampleData();
            
            foreach ($sampleData as $item) {
                if ($this->insertSampleItem($item)) {
                    $createdCount++;
                }
            }
            
            return [
                'success' => true,
                'created_count' => $createdCount,
                'message' => "{$createdCount}件のサンプルデータを作成しました"
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'created_count' => $createdCount
            ];
        }
    }
    
    private function generateSampleData() {
        return [
            [
                'ebay_item_id' => '123456789012',
                'title' => 'Apple iPhone 15 Pro Max 256GB Natural Titanium - New',
                'current_price_value' => '1299.99',
                'condition_display_name' => 'New',
                'quantity' => 5,
                'listing_status' => 'Active',
                'category_name' => 'Cell Phones & Smartphones',
                'seller_user_id' => 'sample_seller_001',
                'location' => 'New York, NY',
                'country' => 'United States',
                'view_item_url' => 'https://www.ebay.com/itm/123456789012'
            ],
            [
                'ebay_item_id' => '223456789013',
                'title' => 'Samsung Galaxy S24 Ultra 512GB Titanium Black - Unlocked',
                'current_price_value' => '1199.99',
                'condition_display_name' => 'New',
                'quantity' => 3,
                'listing_status' => 'Active',
                'category_name' => 'Cell Phones & Smartphones',
                'seller_user_id' => 'sample_seller_002',
                'location' => 'Los Angeles, CA',
                'country' => 'United States',
                'view_item_url' => 'https://www.ebay.com/itm/223456789013'
            ],
            [
                'ebay_item_id' => '323456789014',
                'title' => 'MacBook Pro 16-inch M3 Pro 18GB 512GB Space Black',
                'current_price_value' => '2499.00',
                'condition_display_name' => 'New',
                'quantity' => 2,
                'listing_status' => 'Active',
                'category_name' => 'PC Laptops & Netbooks',
                'seller_user_id' => 'sample_seller_003',
                'location' => 'Chicago, IL',
                'country' => 'United States',
                'view_item_url' => 'https://www.ebay.com/itm/323456789014'
            ],
            [
                'ebay_item_id' => '423456789015',
                'title' => 'Sony PlayStation 5 Console - White Edition with Controller',
                'current_price_value' => '499.99',
                'condition_display_name' => 'New',
                'quantity' => 10,
                'listing_status' => 'Active',
                'category_name' => 'Video Game Consoles',
                'seller_user_id' => 'sample_seller_004',
                'location' => 'Miami, FL',
                'country' => 'United States',
                'view_item_url' => 'https://www.ebay.com/itm/423456789015'
            ],
            [
                'ebay_item_id' => '523456789016',
                'title' => 'Nintendo Switch OLED Model - Neon Blue/Red Joy-Con',
                'current_price_value' => '349.99',
                'condition_display_name' => 'New',
                'quantity' => 8,
                'listing_status' => 'Active',
                'category_name' => 'Video Game Consoles',
                'seller_user_id' => 'sample_seller_005',
                'location' => 'Seattle, WA',
                'country' => 'United States',
                'view_item_url' => 'https://www.ebay.com/itm/523456789016'
            ]
        ];
    }
    
    private function insertSampleItem($item) {
        try {
            // 既存チェック
            $checkStmt = $this->db->prepare("
                SELECT COUNT(*) FROM ebay_complete_api_data 
                WHERE ebay_item_id = ?
            ");
            $checkStmt->execute([$item['ebay_item_id']]);
            
            if ($checkStmt->fetchColumn() > 0) {
                return false; // 既存データはスキップ
            }
            
            // 新規挿入
            $insertStmt = $this->db->prepare("
                INSERT INTO ebay_complete_api_data (
                    ebay_item_id, title, current_price_value, condition_display_name,
                    quantity, listing_status, category_name, seller_user_id,
                    location, country, view_item_url, updated_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            return $insertStmt->execute([
                $item['ebay_item_id'],
                $item['title'],
                $item['current_price_value'],
                $item['condition_display_name'],
                $item['quantity'],
                $item['listing_status'],
                $item['category_name'],
                $item['seller_user_id'],
                $item['location'],
                $item['country'],
                $item['view_item_url']
            ]);
            
        } catch (Exception $e) {
            error_log("Sample data insert error: " . $e->getMessage());
            return false;
        }
    }
}
?>
