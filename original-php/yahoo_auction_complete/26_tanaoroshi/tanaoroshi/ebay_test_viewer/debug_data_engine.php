<?php
/**
 * eBay診断データエンジン
 * N3準拠: Ajax処理専用・HTML出力分離
 */

if (!defined('SECURE_ACCESS')) die('Direct access not allowed');

class EbayDiagnosticEngine {
    
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
    
    public function getCompleteData() {
        return [
            'database_stats' => $this->getDatabaseStats(),
            'available_fields' => $this->getAvailableFieldsCount(),
            'field_details' => $this->getFieldDetails(),
            'sample_data' => $this->getSampleData(),
            'database_tables' => $this->getDatabaseTables(),
            'ebay_listing_count' => $this->getEbayListingCount(),
            'diagnosis' => $this->getDiagnosisInfo(),
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    private function getDatabaseStats() {
        try {
            $stmt = $this->db->query("
                SELECT 
                    COUNT(*) as total_items,
                    ROUND(AVG(CASE 
                        WHEN title IS NOT NULL AND title != '' THEN 1 ELSE 0 
                    END) * 100, 2) as avg_completeness
                FROM ebay_complete_api_data
            ");
            
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            return [
                'total_items' => (int)$stats['total_items'],
                'avg_completeness' => (float)$stats['avg_completeness']
            ];
            
        } catch (Exception $e) {
            return [
                'total_items' => 0,
                'avg_completeness' => 0,
                'error' => $e->getMessage()
            ];
        }
    }
    
    private function getAvailableFieldsCount() {
        try {
            $stmt = $this->db->query("
                SELECT COUNT(column_name) as field_count
                FROM information_schema.columns 
                WHERE table_name = 'ebay_complete_api_data'
            ");
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return (int)$result['field_count'];
            
        } catch (Exception $e) {
            return 0;
        }
    }
    
    private function getFieldDetails() {
        return [
            'ebay_item_id' => [
                'display_name' => 'eBay商品ID',
                'type' => 'varchar'
            ],
            'title' => [
                'display_name' => 'タイトル',
                'type' => 'text'
            ],
            'current_price_value' => [
                'display_name' => '現在価格',
                'type' => 'decimal'
            ],
            'condition_display_name' => [
                'display_name' => 'コンディション',
                'type' => 'varchar'
            ],
            'quantity' => [
                'display_name' => '数量',
                'type' => 'integer'
            ],
            'listing_status' => [
                'display_name' => '出品状況',
                'type' => 'varchar'
            ],
            'category_name' => [
                'display_name' => 'カテゴリ',
                'type' => 'varchar'
            ],
            'seller_user_id' => [
                'display_name' => '販売者ID',
                'type' => 'varchar'
            ],
            'location' => [
                'display_name' => '発送地',
                'type' => 'varchar'
            ]
        ];
    }
    
    private function getSampleData() {
        try {
            $stmt = $this->db->query("
                SELECT 
                    ebay_item_id,
                    title,
                    current_price_value,
                    condition_display_name,
                    quantity,
                    listing_status,
                    category_name,
                    seller_user_id,
                    location,
                    country,
                    view_item_url,
                    updated_at
                FROM ebay_complete_api_data 
                ORDER BY updated_at DESC 
                LIMIT 20
            ");
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    private function getDatabaseTables() {
        try {
            $stmt = $this->db->query("
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%ebay%'
            ");
            
            return $stmt->fetchAll(PDO::FETCH_COLUMN);
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    private function getEbayListingCount() {
        try {
            $stmt = $this->db->query("
                SELECT COUNT(*) as count 
                FROM ebay_complete_api_data 
                WHERE listing_status = 'Active'
            ");
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return (int)$result['count'];
            
        } catch (Exception $e) {
            return 0;
        }
    }
    
    private function getDiagnosisInfo() {
        $listingCount = $this->getEbayListingCount();
        
        return [
            'status' => $listingCount > 0 ? 'active_listings' : 'no_active_listings',
            'reason_for_zero_listings' => $listingCount === 0 ? 
                'アクティブな出品がありません。出品データを確認してください。' : 
                'アクティブな出品を検出しました。'
        ];
    }
}
?>
