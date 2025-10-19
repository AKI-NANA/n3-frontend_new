        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    async refreshData() {
        console.log('🔄 データ更新開始');
        await this.fetchRealData();
    }
}

// グローバルインスタンス作成
window.ebayViewer = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 eBay実データビューワー初期化');
    window.ebayViewer = new EbayRealDataViewer();
});
</script>

<?php
// eBay実データビューワー用Ajax処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    
    // CSRF確認
    $csrf_token = isset($_POST['csrf_token']) ? $_POST['csrf_token'] : '';
    $session_token = isset($_SESSION['csrf_token']) ? $_SESSION['csrf_token'] : '';
    
    if ($csrf_token !== $session_token) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'CSRF token validation failed']);
        exit;
    }
    
    $action = $_POST['action'];
    
    try {
        switch ($action) {
            case 'check_system_status':
                echo json_encode(handle_system_status_check());
                break;
                
            case 'fetch_real_ebay_data':
                echo json_encode(handle_real_data_fetch());
                break;
            
            // 🎯 実データ取得アクション追加
            case 'get_real_data':
                echo json_encode(handle_real_data_fetch());
                break;
                
            case 'update_inventory':
                $item_id = $_POST['item_id'] ?? '';
                $quantity = intval($_POST['quantity'] ?? 0);
                echo json_encode(handle_inventory_update($item_id, $quantity));
                break;
                
            default:
                echo json_encode(['success' => false, 'error' => 'Invalid action']);
        }
    } catch (Exception $e) {
        error_log('eBay Real Data Viewer Error: ' . $e->getMessage());
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    
    exit;
}

function handle_system_status_check() {
    $status = [
        'ebayApi' => 'checking',
        'postgresql' => 'checking', 
        'hook' => 'checking',
        'dataCount' => 0
    ];
    
    try {
        // PostgreSQL接続テスト
        $pg_configs = [
            ['host' => 'localhost', 'port' => 5432, 'user' => 'postgres', 'pass' => 'Kn240914', 'dbname' => 'nagano3_db'],
            ['host' => 'localhost', 'port' => 5432, 'user' => 'postgres', 'pass' => 'postgres', 'dbname' => 'nagano3_db'],
        ];
        
        $pdo = null;
        foreach ($pg_configs as $config) {
            try {
                $dsn = "pgsql:host={$config['host']};port={$config['port']};dbname={$config['dbname']}";
                $pdo = new PDO($dsn, $config['user'], $config['pass'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_TIMEOUT => 5
                ]);
                $status['postgresql'] = 'success';
                break;
            } catch (PDOException $e) {
                continue;
            }
        }
        
        if (!$pdo) {
            $status['postgresql'] = 'error';
        } else {
            // データ件数取得
            try {
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM products WHERE is_active = TRUE");
                $stmt->execute();
                $status['dataCount'] = $stmt->fetchColumn();
            } catch (Exception $e) {
                $status['dataCount'] = 0;
            }
        }
        
        // Hook統合状態（簡易チェック）
        $hook_file = '/Users/aritahiroaki/NAGANO-3/N3-Development/hooks/5_ecommerce/ebay_api_postgresql_integration_hook_fixed.py';
        $status['hook'] = file_exists($hook_file) ? 'success' : 'error';
        
        // eBay API状態（環境変数チェック）
        $env_file = '/Users/aritahiroaki/NAGANO-3/N3-Development/.env';
        $has_ebay_config = false;
        if (file_exists($env_file)) {
            $env_content = file_get_contents($env_file);
            $has_ebay_config = strpos($env_content, 'EBAY_APP_ID') !== false || 
                              strpos($env_content, 'EBAY_CLIENT_ID') !== false;
        }
        $status['ebayApi'] = $has_ebay_config ? 'success' : 'error';
        
        return [
            'success' => true,
            'status' => $status,
            'timestamp' => date('c'),
            'environment' => 'development'
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'status' => [
                'ebayApi' => 'error',
                'postgresql' => 'error', 
                'hook' => 'error',
                'dataCount' => 0
            ]
        ];
    }
}

function handle_real_data_fetch() {
    try {
        // PostgreSQL接続
        $pg_configs = [
            ['host' => 'localhost', 'port' => 5432, 'user' => 'postgres', 'pass' => 'Kn240914', 'dbname' => 'nagano3_db'],
            ['host' => 'localhost', 'port' => 5432, 'user' => 'postgres', 'pass' => 'postgres', 'dbname' => 'nagano3_db'],
        ];
        
        $pdo = null;
        foreach ($pg_configs as $config) {
            try {
                $dsn = "pgsql:host={$config['host']};port={$config['port']};dbname={$config['dbname']}";
                $pdo = new PDO($dsn, $config['user'], $config['pass'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_TIMEOUT => 10
                ]);
                break;
            } catch (PDOException $e) {
                continue;
            }
        }
        
        if (!$pdo) {
            throw new Exception('PostgreSQL connection failed');
        }
        
        // 新7テーブル構造からデータ取得
        $sql = "
            SELECT 
                p.id,
                p.master_sku,
                p.product_name as title,
                p.description,
                p.base_price_usd as price_usd,
                p.condition_type,
                p.category_name,
                p.product_type,
                p.is_active,
                p.created_at,
                p.updated_at,
                i.quantity_available as quantity,
                i.quantity_reserved,
                i.cost_price_usd,
                i.warehouse_location,
                pl.platform_item_id as item_id,
                pl.platform_sku,
                pl.listing_title,
                pl.listing_price,
                pl.currency,
                pl.listing_status,
                pl.country_code,
                pl.location,
                pl.store_name,
                pi.image_url,
                pi.image_type,
                pi.is_primary
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            LEFT JOIN platform_listings pl ON p.id = pl.product_id AND pl.platform = 'ebay'
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
            WHERE p.is_active = TRUE
            ORDER BY p.updated_at DESC
            LIMIT 100
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($results)) {
            // 実データが無い場合は強化されたサンプルデータを返す
            $enhanced_sample_data = [
                [
                    'id' => 1,
                    'master_sku' => 'EB001-ZD001',
                    'item_id' => '334567890123',
                    'title' => 'Vintage Nintendo Game Boy Color - Teal with Original Box',
                    'description' => 'Rare vintage Nintendo Game Boy Color in excellent condition. Includes original box, manual, and AC adapter. All buttons work perfectly. Screen has no scratches or dead pixels. A must-have for collectors!',
                    'price_usd' => 149.99,
                    'cost_price_usd' => 89.99,
                    'condition_type' => 'used',
                    'category_name' => 'Video Games & Consoles',
                    'product_type' => 'single',
                    'is_active' => true,
                    'quantity' => 2,
                    'listing_status' => 'active',
                    'currency' => 'USD',
                    'country_code' => 'US',
                    'location' => 'Los Angeles, CA',
                    'store_name' => 'RetroGaming Paradise',
                    'warehouse_location' => 'Warehouse A',
                    'created_at' => '2025-08-20 10:30:00',
                    'updated_at' => '2025-08-25 14:22:15',
                    'image_url' => 'https://i.ebayimg.com/images/g/abc123/s-l1600.jpg'
                ],
                [
                    'id' => 2,
                    'master_sku' => 'EB002-CAM01',
                    'item_id' => '334567890124',
                    'title' => 'Canon EOS R6 Mark II Mirrorless Camera Body Only',
                    'description' => 'Professional grade mirrorless camera with 24.2MP full-frame sensor, 4K video recording, and advanced image stabilization. Perfect for photographers and videographers.',
                    'price_usd' => 2399.00,
                    'cost_price_usd' => 1899.00,
                    'condition_type' => 'new',
                    'category_name' => 'Cameras & Photo',
                    'product_type' => 'single',
                    'is_active' => true,
                    'quantity' => 5,
                    'listing_status' => 'active',
                    'currency' => 'USD',
                    'country_code' => 'US',
                    'location' => 'New York, NY',
                    'store_name' => 'ProPhoto Supply',
                    'warehouse_location' => 'Warehouse B',
                    'created_at' => '2025-08-18 09:15:00',
                    'updated_at' => '2025-08-25 16:45:30',
                    'image_url' => 'https://i.ebayimg.com/images/g/def456/s-l1600.jpg'
                ],
                [
                    'id' => 3,
                    'master_sku' => 'EB003-TOY01',
                    'item_id' => '334567890125',
                    'title' => 'LEGO Creator Expert Big Ben (10253) - Retired Set',
                    'description' => 'Retired LEGO Architecture set featuring the iconic Big Ben clock tower. 4,163 pieces. New in sealed box. Perfect for display or building enthusiasts.',
                    'price_usd' => 899.99,
                    'cost_price_usd' => 549.99,
                    'condition_type' => 'new',
                    'category_name' => 'Toys & Hobbies',
                    'product_type' => 'single',
                    'is_active' => true,
                    'quantity' => 1,
                    'listing_status' => 'active',
                    'currency' => 'USD',
                    'country_code' => 'US',
                    'location' => 'Chicago, IL',
                    'store_name' => 'Brick Collectors Hub',
                    'warehouse_location' => 'Main',
                    'created_at' => '2025-08-15 14:20:00',
                    'updated_at' => '2025-08-25 12:10:45',
                    'image_url' => 'https://i.ebayimg.com/images/g/ghi789/s-l1600.jpg'
                ],
                [
                    'id' => 4,
                    'master_sku' => 'EB004-FASH01',
                    'item_id' => '334567890126',
                    'title' => 'Nike Air Jordan 1 Retro High OG "Chicago" Size 10',
                    'description' => 'Authentic Nike Air Jordan 1 in the classic Chicago colorway. White, black, and varsity red leather upper. Size 10 US. Condition: 9/10, worn only twice.',
                    'price_usd' => 1299.99,
                    'cost_price_usd' => 899.99,
                    'condition_type' => 'used',
                    'category_name' => 'Clothing, Shoes & Accessories',
                    'product_type' => 'single',
                    'is_active' => true,
                    'quantity' => 1,
                    'listing_status' => 'active',
                    'currency' => 'USD',
                    'country_code' => 'US',
                    'location' => 'Atlanta, GA',
                    'store_name' => 'Sneaker Vault',
                    'warehouse_location' => 'Warehouse C',
                    'created_at' => '2025-08-22 11:30:00',
                    'updated_at' => '2025-08-25 15:20:12',
                    'image_url' => 'https://i.ebayimg.com/images/g/jkl012/s-l1600.jpg'
                ],
                [
                    'id' => 5,
                    'master_sku' => 'EB005-ELEC01',
                    'item_id' => '334567890127',
                    'title' => 'Apple iPhone 15 Pro Max 256GB Natural Titanium - Unlocked',
                    'description' => 'Brand new Apple iPhone 15 Pro Max with 256GB storage in Natural Titanium. Factory unlocked for all carriers. Includes original box and accessories.',
                    'price_usd' => 1199.99,
                    'cost_price_usd' => 999.99,
                    'condition_type' => 'new',
                    'category_name' => 'Cell Phones & Accessories',
                    'product_type' => 'single',
                    'is_active' => true,
                    'quantity' => 8,
                    'listing_status' => 'active',
                    'currency' => 'USD',
                    'country_code' => 'US',
                    'location' => 'San Francisco, CA',
                    'store_name' => 'TechHub Store',
                    'warehouse_location' => 'Warehouse A',
                    'created_at' => '2025-08-24 16:45:00',
                    'updated_at' => '2025-08-25 18:05:22',
                    'image_url' => 'https://i.ebayimg.com/images/g/mno345/s-l1600.jpg'
                ],
                [
                    'id' => 6,
                    'master_sku' => 'EB006-BOOK01',
                    'item_id' => '334567890128',
                    'title' => 'Pokemon Card Base Set 1st Edition Charizard PSA 9 MINT',
                    'description' => 'Iconic Pokemon Base Set 1st Edition Charizard graded PSA 9 MINT condition. Card #4/102. Perfect centering with vibrant colors. Serious collectors only.',
                    'price_usd' => 15999.99,
                    'cost_price_usd' => 12999.99,
                    'condition_type' => 'used',
                    'category_name' => 'Collectibles',
                    'product_type' => 'single',
                    'is_active' => true,
                    'quantity' => 1,
                    'listing_status' => 'active',
                    'currency' => 'USD',
                    'country_code' => 'US',
                    'location' => 'Las Vegas, NV',
                    'store_name' => 'Card Kingdom Elite',
                    'warehouse_location' => 'Secure Vault',
                    'created_at' => '2025-08-19 13:15:00',
                    'updated_at' => '2025-08-25 09:30:55',
                    'image_url' => 'https://i.ebayimg.com/images/g/pqr678/s-l1600.jpg'
                ],
                [
                    'id' => 7,
                    'master_sku' => 'EB007-AUDIO01',
                    'item_id' => '334567890129',
                    'title' => 'Sony WH-1000XM5 Wireless Noise Canceling Headphones - Black',
                    'description' => 'Premium wireless headphones with industry-leading noise cancellation. 30-hour battery life, touch controls, and crystal clear call quality. Like new condition.',
                    'price_usd' => 349.99,
                    'cost_price_usd' => 249.99,
                    'condition_type' => 'refurbished',
                    'category_name' => 'Consumer Electronics',
                    'product_type' => 'single',
                    'is_active' => true,
                    'quantity' => 12,
                    'listing_status' => 'active',
                    'currency' => 'USD',
                    'country_code' => 'US',
                    'location' => 'Seattle, WA',
                    'store_name' => 'Audio Excellence',
                    'warehouse_location' => 'Warehouse B',
                    'created_at' => '2025-08-21 08:20:00',
                    'updated_at' => '2025-08-25 13:45:18',
                    'image_url' => 'https://i.ebayimg.com/images/g/stu901/s-l1600.jpg'
                ],
                [
                    'id' => 8,
                    'master_sku' => 'EB008-SPORT01',
                    'item_id' => '334567890130',
                    'title' => 'Titleist Pro V1 Golf Balls - 2023 Model (Dozen)',
                    'description' => 'Professional grade golf balls used by tour players worldwide. Advanced aerodynamics for consistent flight and exceptional feel around the greens.',
                    'price_usd' => 54.99,
                    'cost_price_usd' => 39.99,
                    'condition_type' => 'new',
                    'category_name' => 'Sporting Goods',
                    'product_type' => 'single',
                    'is_active' => true,
                    'quantity' => 25,
                    'listing_status' => 'active',
                    'currency' => 'USD',
                    'country_code' => 'US',
                    'location' => 'Phoenix, AZ',
                    'store_name' => 'Golf Pro Shop',
                    'warehouse_location' => 'Warehouse C',
                    'created_at' => '2025-08-23 10:10:00',
                    'updated_at' => '2025-08-25 17:15:33',
                    'image_url' => 'https://i.ebayimg.com/images/g/vwx234/s-l1600.jpg'
                ],
                [
                    'id' => 9,
                    'master_sku' => 'EB009-HOME01',
                    'item_id' => '334567890131',
                    'title' => 'KitchenAid Stand Mixer 5-Qt Artisan Series - Empire Red',
                    'description' => 'Iconic stand mixer perfect for baking enthusiasts. 10-speed control, tilt-head design, and includes wire whip, flat beater, and dough hook. Excellent condition.',
                    'price_usd' => 379.99,
                    'cost_price_usd' => 279.99,
                    'condition_type' => 'used',
                    'category_name' => 'Home & Garden',
                    'product_type' => 'single',
                    'is_active' => true,
                    'quantity' => 3,
                    'listing_status' => 'active',
                    'currency' => 'USD',
                    'country_code' => 'US',
                    'location' => 'Denver, CO',
                    'store_name' => 'Kitchen Essentials',
                    'warehouse_location' => 'Main',
                    'created_at' => '2025-08-17 15:30:00',
                    'updated_at' => '2025-08-25 11:25:40',
                    'image_url' => 'https://i.ebayimg.com/images/g/yza567/s-l1600.jpg'
                ],
                [
                    'id' => 10,
                    'master_sku' => 'EB010-AUTO01',
                    'item_id' => '334567890132',
                    'title' => 'Bosch ICON 24A Wiper Blade - All Season Performance',
                    'description' => 'Premium wiper blade with exclusive FX dual rubber compound. Provides clear visibility in all weather conditions. Fits most vehicles with 24-inch requirement.',
                    'price_usd' => 28.99,
                    'cost_price_usd' => 18.99,
                    'condition_type' => 'new',
                    'category_name' => 'eBay Motors',
                    'product_type' => 'single',
                    'is_active' => true,
                    'quantity' => 50,
                    'listing_status' => 'active',
                    'currency' => 'USD',
                    'country_code' => 'US',
                    'location' => 'Detroit, MI',
                    'store_name' => 'Auto Parts Direct',
                    'warehouse_location' => 'Warehouse A',
                    'created_at' => '2025-08-16 12:45:00',
                    'updated_at' => '2025-08-25 19:10:28',
                    'image_url' => 'https://i.ebayimg.com/images/g/bcd890/s-l1600.jpg'
                ]
            ];
            
            return [
                'success' => true,
                'data' => $enhanced_sample_data,
                'source' => 'enhanced_sample_data',
                'count' => count($enhanced_sample_data),
                'message' => '強化サンプルデータを表示中（実データ取得システム準備完了）',
                'data_type' => 'sample_enhanced',
                'timestamp' => date('c')
            ];
        }
        
        return [
            'success' => true,
            'data' => $results,
            'source' => 'postgresql_nagano3_db',
            'count' => count($results),
            'message' => 'PostgreSQL新7テーブル構造から実データ取得成功',
            'data_type' => 'real_data',
            'timestamp' => date('c')
        ];
        
    } catch (Exception $e) {
        error_log('Real Data Fetch Error: ' . $e->getMessage());
        
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'fallback_available' => true,
            'timestamp' => date('c')
        ];
    }
}

function handle_inventory_update($item_id, $quantity) {
    try {
        // PostgreSQL接続
        $pg_configs = [
            ['host' => 'localhost', 'port' => 5432, 'user' => 'postgres', 'pass' => 'Kn240914', 'dbname' => 'nagano3_db'],
            ['host' => 'localhost', 'port' => 5432, 'user' => 'postgres', 'pass' => 'postgres', 'dbname' => 'nagano3_db'],
        ];
        
        $pdo = null;
        foreach ($pg_configs as $config) {
            try {
                $dsn = "pgsql:host={$config['host']};port={$config['port']};dbname={$config['dbname']}";
                $pdo = new PDO($dsn, $config['user'], $config['pass'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_TIMEOUT => 5
                ]);
                break;
            } catch (PDOException $e) {
                continue;
            }
        }
        
        if (!$pdo) {
            throw new Exception('Database connection failed');
        }
        
        // 在庫更新（inventoryテーブル更新）
        $update_sql = "
            UPDATE inventory 
            SET quantity_available = :quantity, 
                updated_at = CURRENT_TIMESTAMP
            FROM products p, platform_listings pl
            WHERE inventory.product_id = p.id 
            AND p.id = pl.product_id 
            AND pl.platform_item_id = :item_id
        ";
        
        $stmt = $pdo->prepare($update_sql);
        $stmt->execute([
            ':quantity' => $quantity,
            ':item_id' => $item_id
        ]);
        
        $updated_rows = $stmt->rowCount();
        
        if ($updated_rows > 0) {
            return [
                'success' => true,
                'message' => '在庫を更新しました',
                'item_id' => $item_id,
                'new_quantity' => $quantity,
                'updated_rows' => $updated_rows,
                'timestamp' => date('c')
            ];
        } else {
            return [
                'success' => false,
                'error' => 'アイテムが見つかりません',
                'item_id' => $item_id
            ];
        }
        
    } catch (Exception $e) {
        error_log('Inventory Update Error: ' . $e->getMessage());
        
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'item_id' => $item_id,
            'attempted_quantity' => $quantity
        ];
    }
}
?>

<script>
console.log('✅ eBay実データビューワー（Hook統合・在庫調整機能付き）ロード完了');
console.log('🔧 機能: 実データ表示・画像カード・エクセル形式・在庫調整・eBay連携');
console.log('🎯 対応データ: PostgreSQL新7テーブル構造・強化サンプルデータ');
console.log('📊 表示形式: カード（画像中心・シンプル）・エクセル（詳細重要度順）・モーダル（全項目+在庫調整）');
</script>