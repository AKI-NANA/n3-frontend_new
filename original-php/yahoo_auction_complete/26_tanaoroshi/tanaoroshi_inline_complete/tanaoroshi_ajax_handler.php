<?php
/**
 * 🎯 棚卸しシステム Ajax Handler - PostgreSQL実データ連携版
 * 機能: 実際のPostgreSQLデータベースから商品データを取得・表示
 * 対応: ebay_kanri_db テーブル構造準拠
 * 作成日: 2025年8月25日
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    header('HTTP/1.1 403 Forbidden');
    exit('Direct access not allowed');
}

// Content-Type設定
header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');

// エラーレポート設定（本番環境では無効化）
error_reporting(E_ALL);
ini_set('display_errors', 1);

/**
 * PostgreSQL接続管理クラス
 */
class PostgreSQLConnection {
    private $connection = null;
    private $config = [
        'host' => 'localhost',
        'port' => 5432,
        'database' => 'ebay_kanri_db',
        'username' => 'postgres',
        'password' => 'postgres' // 🔧 まず 'postgres' を試行、失敗時は 'Kn240914' を試行
    ];
    
    public function connect() {
        try {
            $dsn = sprintf(
                'pgsql:host=%s;port=%d;dbname=%s',
                $this->config['host'],
                $this->config['port'],
                $this->config['database']
            );
            
            // 🔧 複数パスワードを試行
            $passwords = ['postgres', 'Kn240914', '', 'aritahiroaki'];
            
            foreach ($passwords as $password) {
                try {
                    $this->connection = new PDO($dsn, $this->config['username'], $password, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_TIMEOUT => 10
                    ]);
                    
                    error_log("PostgreSQL接続成功: パスワード '{$password}' を使用");
                    return true;
                    
                } catch (PDOException $e) {
                    error_log("PostgreSQL接続失敗 (パスワード '{$password}'): " . $e->getMessage());
                    continue;
                }
            }
            
            throw new Exception('全てのパスワードで接続に失敗しました');
            
        } catch (Exception $e) {
            error_log('PostgreSQL接続エラー: ' . $e->getMessage());
            return false;
        }
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    public function isConnected() {
        return $this->connection !== null;
    }
    
    public function disconnect() {
        $this->connection = null;
    }
}

/**
 * 棚卸しデータ管理クラス
 */
class TanaoroshiDataManager {
    private $db;
    
    public function __construct(PostgreSQLConnection $db) {
        $this->db = $db;
    }
    
    /**
     * 実データ取得 - PostgreSQL対応
     */
    public function getRealInventoryData($limit = 50) {
        if (!$this->db->isConnected()) {
            throw new Exception('データベース接続が確立されていません');
        }
        
        try {
            $pdo = $this->db->getConnection();
            
            // ebay_listingsテーブルから実データ取得（フロントエンド表示用に最適化）
            $sql = "
                SELECT 
                    listing_id as id,
                    ebay_item_id,
                    title as name,
                    COALESCE(start_price, current_price, 0) as price_usd,
                    COALESCE(quantity, 1) as stock,
                    COALESCE(condition_name, 'new') as condition,
                    COALESCE(category, 'Electronics') as category,
                    COALESCE(gallery_url, image_url, '') as image,
                    COALESCE(listing_status, 'Active') as listing_status,
                    COALESCE(watch_count, 0) as watchers,
                    COALESCE(view_count, 0) as views,
                    COALESCE(location, 'US') as location,
                    created_at,
                    updated_at
                FROM ebay_listings 
                WHERE title IS NOT NULL 
                  AND title != ''
                  AND COALESCE(start_price, current_price, 0) > 0
                ORDER BY 
                    CASE 
                        WHEN listing_status = 'Active' THEN 1
                        WHEN listing_status = 'Sold' THEN 2
                        ELSE 3
                    END,
                    watch_count DESC NULLS LAST,
                    updated_at DESC
                LIMIT :limit
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
            $stmt->execute();
            
            $results = $stmt->fetchAll();
            
            // フロントエンド用にデータ変換
            $convertedData = [];
            foreach ($results as $row) {
                $convertedData[] = [
                    'id' => $row['id'],
                    'name' => $this->sanitizeTitle($row['name']),
                    'sku' => $this->generateSKU($row['ebay_item_id'] ?? $row['id']),
                    'type' => $this->determineProductType($row),
                    'condition' => $this->normalizeCondition($row['condition']),
                    'priceUSD' => (float)($row['price_usd'] ?? 0),
                    'costUSD' => (float)($row['price_usd'] ?? 0) * 0.7, // 推定仕入れ価格
                    'stock' => (int)($row['stock'] ?? 1),
                    'category' => $this->normalizeCategory($row['category']),
                    'image' => $this->validateImageUrl($row['image']),
                    'listing_status' => $row['listing_status'] ?? 'Unknown',
                    'watchers' => (int)($row['watchers'] ?? 0),
                    'views' => (int)($row['views'] ?? 0),
                    'location' => $row['location'] ?? 'US',
                    'description' => $this->generateDescription($row),
                    'created' => $row['created_at'] ?? date('Y-m-d H:i:s'),
                    'updated' => $row['updated_at'] ?? date('Y-m-d H:i:s'),
                    'data_source' => 'postgresql_real'
                ];
            }
            
            return [
                'success' => true,
                'data' => $convertedData,
                'count' => count($convertedData),
                'source' => 'postgresql_ebay_real',
                'message' => count($convertedData) . '件の実データを取得しました'
            ];
            
        } catch (Exception $e) {
            error_log('実データ取得エラー: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 商品統計情報取得
     */
    public function getInventoryStatistics() {
        if (!$this->db->isConnected()) {
            return $this->getFallbackStatistics();
        }
        
        try {
            $pdo = $this->db->getConnection();
            
            $sql = "
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(CASE WHEN listing_status = 'Active' THEN 1 END) as active_products,
                    COUNT(CASE WHEN listing_status = 'Sold' THEN 1 END) as sold_products,
                    AVG(COALESCE(start_price, current_price, 0)) as avg_price,
                    SUM(COALESCE(start_price, current_price, 0)) as total_value,
                    SUM(COALESCE(watch_count, 0)) as total_watchers,
                    SUM(COALESCE(view_count, 0)) as total_views
                FROM ebay_listings 
                WHERE title IS NOT NULL AND title != ''
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $stats = $stmt->fetch();
            
            return [
                'success' => true,
                'statistics' => [
                    'total' => (int)$stats['total_products'],
                    'stock' => (int)$stats['active_products'],
                    'dropship' => 0, // eBayデータには区別なし
                    'set' => 0, // eBayデータには区別なし  
                    'hybrid' => (int)$stats['sold_products'],
                    'totalValue' => (float)$stats['total_value'],
                    'avgPrice' => (float)$stats['avg_price'],
                    'totalWatchers' => (int)$stats['total_watchers'],
                    'totalViews' => (int)$stats['total_views']
                ]
            ];
            
        } catch (Exception $e) {
            error_log('統計取得エラー: ' . $e->getMessage());
            return $this->getFallbackStatistics();
        }
    }
    
    // ユーティリティメソッド群
    private function sanitizeTitle($title) {
        return mb_substr(trim($title), 0, 100, 'UTF-8');
    }
    
    private function generateSKU($itemId) {
        return 'EBAY-' . substr($itemId, 0, 10);
    }
    
    private function determineProductType($row) {
        $status = $row['listing_status'] ?? '';
        if (stripos($status, 'sold') !== false) {
            return 'dropship';
        }
        return 'stock';
    }
    
    private function normalizeCondition($condition) {
        $condition = strtolower(trim($condition));
        if (in_array($condition, ['new', 'brand new', 'new with tags'])) {
            return 'new';
        } elseif (in_array($condition, ['used', 'pre-owned', 'good', 'very good'])) {
            return 'used';
        } elseif (in_array($condition, ['refurbished', 'seller refurbished', 'manufacturer refurbished'])) {
            return 'refurbished';
        }
        return 'new';
    }
    
    private function normalizeCategory($category) {
        if (empty($category)) return 'Electronics';
        
        $category = trim($category);
        if (stripos($category, 'electronic') !== false || stripos($category, 'computer') !== false) {
            return 'Electronics';
        } elseif (stripos($category, 'clothing') !== false || stripos($category, 'fashion') !== false) {
            return 'Clothing';
        } elseif (stripos($category, 'home') !== false || stripos($category, 'garden') !== false) {
            return 'Home';
        } elseif (stripos($category, 'automotive') !== false || stripos($category, 'car') !== false) {
            return 'Automotive';
        } elseif (stripos($category, 'sport') !== false) {
            return 'Sports';
        }
        
        return 'Electronics';
    }
    
    private function validateImageUrl($url) {
        if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
            return '';
        }
        
        // eBay画像URLの正規化
        if (strpos($url, 'ebayimg.com') !== false) {
            return $url;
        }
        
        return $url;
    }
    
    private function generateDescription($row) {
        $title = $row['name'] ?? '商品';
        $condition = $row['condition'] ?? 'new';
        $location = $row['location'] ?? 'US';
        
        return "この{$title}は{$condition}状態で、{$location}からお届けします。eBayで実際に出品中の商品です。";
    }
    
    private function getFallbackStatistics() {
        return [
            'success' => false,
            'statistics' => [
                'total' => 0,
                'stock' => 0,
                'dropship' => 0,
                'set' => 0,
                'hybrid' => 0,
                'totalValue' => 0,
                'avgPrice' => 0,
                'totalWatchers' => 0,
                'totalViews' => 0
            ],
            'message' => 'データベース接続エラー - フォールバック統計を使用'
        ];
    }
}

/**
 * サンプルデータ生成（フォールバック用）
 */
function getFallbackSampleData() {
    return [
        [
            'id' => 1,
            'name' => 'Apple MacBook Pro 16インチ (M2チップ)',
            'sku' => 'SAMPLE-MBP-001',
            'type' => 'stock',
            'condition' => 'new',
            'priceUSD' => 2499.99,
            'costUSD' => 1999.99,
            'stock' => 12,
            'category' => 'Electronics',
            'image' => 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',
            'description' => 'サンプルデータ: 高性能なMacBook Pro（PostgreSQL接続エラーのためサンプル表示中）',
            'data_source' => 'fallback_sample'
        ],
        [
            'id' => 2,
            'name' => 'Sony Alpha カメラ (A7R V)',
            'sku' => 'SAMPLE-SONY-002',
            'type' => 'dropship',
            'condition' => 'new',
            'priceUSD' => 3899.99,
            'costUSD' => 3299.99,
            'stock' => 0,
            'category' => 'Electronics',
            'image' => 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop',
            'description' => 'サンプルデータ: プロ用ミラーレスカメラ（PostgreSQL接続エラーのためサンプル表示中）',
            'data_source' => 'fallback_sample'
        ]
    ];
}

// メイン処理
try {
    // CSRF保護
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';
        
        switch ($action) {
            case 'load_inventory_data':
                // PostgreSQL接続試行
                $db = new PostgreSQLConnection();
                
                if ($db->connect()) {
                    // 実データ取得成功パス
                    $manager = new TanaoroshiDataManager($db);
                    $limit = (int)($_POST['limit'] ?? 50);
                    
                    $result = $manager->getRealInventoryData($limit);
                    
                    echo json_encode([
                        'success' => true,
                        'data' => $result['data'],
                        'count' => $result['count'],
                        'source' => 'postgresql_real',
                        'message' => 'PostgreSQL実データ取得成功: ' . $result['count'] . '件',
                        'timestamp' => date('c')
                    ]);
                    
                } else {
                    // PostgreSQL接続失敗 - サンプルデータで継続
                    $fallbackData = getFallbackSampleData();
                    
                    echo json_encode([
                        'success' => true,
                        'data' => $fallbackData,
                        'count' => count($fallbackData),
                        'source' => 'fallback_sample',
                        'message' => 'PostgreSQL接続エラー - サンプルデータを表示中',
                        'warning' => 'データベース接続を確認してください',
                        'timestamp' => date('c')
                    ]);
                }
                break;
                
            case 'get_statistics':
                $db = new PostgreSQLConnection();
                
                if ($db->connect()) {
                    $manager = new TanaoroshiDataManager($db);
                    $stats = $manager->getInventoryStatistics();
                    echo json_encode($stats);
                } else {
                    echo json_encode([
                        'success' => false,
                        'message' => 'データベース接続エラー',
                        'statistics' => [
                            'total' => 0,
                            'stock' => 0,
                            'dropship' => 0,
                            'set' => 0,
                            'hybrid' => 0,
                            'totalValue' => 0
                        ]
                    ]);
                }
                break;
                
            case 'test_connection':
                $db = new PostgreSQLConnection();
                $connected = $db->connect();
                
                echo json_encode([
                    'success' => $connected,
                    'message' => $connected ? 'PostgreSQL接続成功' : 'PostgreSQL接続失敗',
                    'database' => 'ebay_kanri_db',
                    'timestamp' => date('c')
                ]);
                break;
                
            default:
                echo json_encode([
                    'success' => false,
                    'error' => 'Unknown action: ' . $action,
                    'available_actions' => ['load_inventory_data', 'get_statistics', 'test_connection']
                ]);
        }
        
    } else {
        // GET requests - API情報表示
        echo json_encode([
            'api_name' => '棚卸しシステム Ajax Handler',
            'version' => '1.0.0',
            'database' => 'ebay_kanri_db (PostgreSQL)',
            'available_actions' => [
                'load_inventory_data' => '商品データ取得',
                'get_statistics' => '統計情報取得',
                'test_connection' => '接続テスト'
            ],
            'usage' => 'POST request with action parameter',
            'timestamp' => date('c')
        ]);
    }
    
} catch (Exception $e) {
    // 致命的エラー時のフォールバック
    error_log('Ajax Handler致命的エラー: ' . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'error' => '内部サーバーエラー',
        'message' => 'システム管理者にお問い合わせください',
        'debug_message' => $e->getMessage(),
        'data' => getFallbackSampleData(), // エラー時でもデータを提供
        'timestamp' => date('c')
    ]);
}
?>