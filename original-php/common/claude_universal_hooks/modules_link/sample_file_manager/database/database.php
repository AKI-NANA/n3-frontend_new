<?php
/**
 * 🛍️ 物販多販路一元化テストツール - データベースシステム
 * CAIDSシステム自動生成 - SQLite統合DB管理
 */

class MultichannelDatabase {
    private $db;
    private $dbFile;
    
    public function __construct($dbFile = 'multichannel.db') {
        $this->dbFile = __DIR__ . '/' . $dbFile;
        $this->initializeDatabase();
    }
    
    private function initializeDatabase() {
        try {
            $this->db = new PDO("sqlite:" . $this->dbFile);
            $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // データベーステーブル作成
            $this->createTables();
            
            // テストデータ挿入
            $this->insertSampleData();
            
            error_log("📊 [DATABASE] 物販多販路データベース初期化完了: " . $this->dbFile);
        } catch (PDOException $e) {
            error_log("❌ [DATABASE ERROR] " . $e->getMessage());
            throw new Exception("データベース初期化エラー: " . $e->getMessage());
        }
    }
    
    private function createTables() {
        $tables = [
            // 商品マスタ
            'products' => "
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sku VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(200) NOT NULL,
                    description TEXT,
                    category VARCHAR(100),
                    brand VARCHAR(100),
                    jan_code VARCHAR(13),
                    price DECIMAL(10,2),
                    cost DECIMAL(10,2),
                    images TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ",
            
            // 在庫管理
            'inventory' => "
                CREATE TABLE IF NOT EXISTS inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER,
                    channel VARCHAR(50),
                    stock_quantity INTEGER DEFAULT 0,
                    reserved_quantity INTEGER DEFAULT 0,
                    alert_threshold INTEGER DEFAULT 10,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
            ",
            
            // 販路設定
            'channels' => "
                CREATE TABLE IF NOT EXISTS channels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_name VARCHAR(50) NOT NULL,
                    api_key VARCHAR(255),
                    api_secret VARCHAR(255),
                    status VARCHAR(20) DEFAULT 'active',
                    last_sync DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ",
            
            // 受注管理
            'orders' => "
                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_number VARCHAR(50) UNIQUE NOT NULL,
                    channel VARCHAR(50),
                    customer_name VARCHAR(100),
                    customer_email VARCHAR(100),
                    total_amount DECIMAL(10,2),
                    status VARCHAR(20) DEFAULT 'pending',
                    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    shipping_address TEXT,
                    payment_status VARCHAR(20) DEFAULT 'pending'
                )
            ",
            
            // 受注明細
            'order_items' => "
                CREATE TABLE IF NOT EXISTS order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER,
                    product_id INTEGER,
                    sku VARCHAR(50),
                    quantity INTEGER,
                    unit_price DECIMAL(10,2),
                    total_price DECIMAL(10,2),
                    FOREIGN KEY (order_id) REFERENCES orders(id),
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
            ",
            
            // 出荷管理
            'shipments' => "
                CREATE TABLE IF NOT EXISTS shipments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER,
                    tracking_number VARCHAR(50),
                    carrier VARCHAR(50),
                    shipping_date DATETIME,
                    delivery_date DATETIME,
                    status VARCHAR(20) DEFAULT 'preparing',
                    FOREIGN KEY (order_id) REFERENCES orders(id)
                )
            ",
            
            // 問い合わせ管理
            'inquiries' => "
                CREATE TABLE IF NOT EXISTS inquiries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel VARCHAR(50),
                    customer_name VARCHAR(100),
                    customer_email VARCHAR(100),
                    subject VARCHAR(200),
                    message TEXT,
                    status VARCHAR(20) DEFAULT 'unread',
                    priority VARCHAR(10) DEFAULT 'normal',
                    assigned_to VARCHAR(50),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    resolved_at DATETIME
                )
            ",
            
            // 売上データ
            'sales_analytics' => "
                CREATE TABLE IF NOT EXISTS sales_analytics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE,
                    channel VARCHAR(50),
                    product_id INTEGER,
                    quantity_sold INTEGER,
                    revenue DECIMAL(10,2),
                    cost DECIMAL(10,2),
                    profit DECIMAL(10,2),
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
            ",
            
            // システムログ
            'system_logs' => "
                CREATE TABLE IF NOT EXISTS system_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    log_type VARCHAR(20),
                    message TEXT,
                    data JSON,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            "
        ];
        
        foreach ($tables as $tableName => $sql) {
            $this->db->exec($sql);
            error_log("✅ [TABLE CREATED] {$tableName}");
        }
    }
    
    private function insertSampleData() {
        // 販路データ
        $channels = [
            ['Amazon Japan', 'AKIAIOSFODNN7EXAMPLE', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'],
            ['楽天市場', 'rakuten_key_example', 'rakuten_secret_example'],
            ['Yahoo!ショッピング', 'yahoo_key_example', 'yahoo_secret_example'],
            ['自社EC', 'ec_key_example', 'ec_secret_example']
        ];
        
        foreach ($channels as $channel) {
            $this->db->prepare("INSERT OR IGNORE INTO channels (channel_name, api_key, api_secret) VALUES (?, ?, ?)")
                     ->execute($channel);
        }
        
        // 商品データ
        $products = [
            ['PROD-001', '高性能ワイヤレスヘッドホン', '最新技術を搭載した高音質ワイヤレスヘッドホン', '電子機器', 'TechBrand', '4901234567890', 15800, 8900],
            ['PROD-002', 'オーガニック緑茶セット', '厳選されたオーガニック緑茶の詰め合わせ', '食品・飲料', 'NatureTea', '4901234567891', 3980, 1500],
            ['PROD-003', 'スマートフォンケース', '衝撃吸収機能付きスマートフォンケース', '電子機器', 'ProtectCase', '4901234567892', 2580, 890],
            ['PROD-004', 'ヨガマット', 'エコフレンドリーなヨガマット', 'スポーツ・健康', 'ZenYoga', '4901234567893', 6800, 2400],
            ['PROD-005', 'コーヒー豆セット', '世界各国のプレミアムコーヒー豆', '食品・飲料', 'CoffeeMaster', '4901234567894', 4500, 2100]
        ];
        
        foreach ($products as $product) {
            $stmt = $this->db->prepare("INSERT OR IGNORE INTO products (sku, name, description, category, brand, jan_code, price, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute($product);
            
            // 在庫データ
            $productId = $this->db->lastInsertId();
            if ($productId) {
                foreach (['Amazon Japan', '楽天市場', 'Yahoo!ショッピング', '自社EC'] as $channel) {
                    $stock = rand(10, 100);
                    $this->db->prepare("INSERT OR IGNORE INTO inventory (product_id, channel, stock_quantity) VALUES (?, ?, ?)")
                             ->execute([$productId, $channel, $stock]);
                }
            }
        }
        
        // 受注データ
        $orders = [
            ['ORDER-2025001', 'Amazon Japan', '田中太郎', 'tanaka@example.com', 15800, 'processing'],
            ['ORDER-2025002', '楽天市場', '佐藤花子', 'sato@example.com', 3980, 'shipped'],
            ['ORDER-2025003', 'Yahoo!ショッピング', '山田次郎', 'yamada@example.com', 9380, 'pending'],
            ['ORDER-2025004', '自社EC', '鈴木美咲', 'suzuki@example.com', 6800, 'delivered']
        ];
        
        foreach ($orders as $order) {
            $this->db->prepare("INSERT OR IGNORE INTO orders (order_number, channel, customer_name, customer_email, total_amount, status) VALUES (?, ?, ?, ?, ?, ?)")
                     ->execute($order);
        }
        
        // 問い合わせデータ
        $inquiries = [
            ['Amazon Japan', '田中太郎', 'tanaka@example.com', '商品について', '商品の詳細仕様について教えてください。', 'unread', 'normal'],
            ['楽天市場', '佐藤花子', 'sato@example.com', '配送について', '配送日時の変更は可能でしょうか？', 'in_progress', 'high'],
            ['自社EC', '山田次郎', 'yamada@example.com', '返品について', '商品の返品手続きについて', 'resolved', 'low']
        ];
        
        foreach ($inquiries as $inquiry) {
            $this->db->prepare("INSERT OR IGNORE INTO inquiries (channel, customer_name, customer_email, subject, message, status, priority) VALUES (?, ?, ?, ?, ?, ?, ?)")
                     ->execute($inquiry);
        }
        
        error_log("📊 [SAMPLE DATA] テストデータ挿入完了");
    }
    
    // データ取得メソッド
    public function getAllProducts() {
        $stmt = $this->db->query("SELECT * FROM products ORDER BY created_at DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getProductInventory($productId) {
        $stmt = $this->db->prepare("SELECT * FROM inventory WHERE product_id = ?");
        $stmt->execute([$productId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getAllOrders() {
        $stmt = $this->db->query("SELECT o.*, COUNT(oi.id) as item_count FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id GROUP BY o.id ORDER BY o.order_date DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getOrdersByStatus($status) {
        $stmt = $this->db->prepare("SELECT * FROM orders WHERE status = ? ORDER BY order_date DESC");
        $stmt->execute([$status]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getAllInquiries() {
        $stmt = $this->db->query("SELECT * FROM inquiries ORDER BY created_at DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getChannels() {
        $stmt = $this->db->query("SELECT * FROM channels ORDER BY created_at DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getDashboardStats() {
        $stats = [];
        
        // 今日の売上
        $stmt = $this->db->prepare("SELECT SUM(total_amount) as today_sales FROM orders WHERE DATE(order_date) = DATE('now')");
        $stmt->execute();
        $stats['today_sales'] = $stmt->fetchColumn() ?: 0;
        
        // 未処理注文数
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM orders WHERE status IN ('pending', 'processing')");
        $stmt->execute();
        $stats['pending_orders'] = $stmt->fetchColumn();
        
        // 在庫アラート数
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM inventory WHERE stock_quantity <= alert_threshold");
        $stmt->execute();
        $stats['stock_alerts'] = $stmt->fetchColumn();
        
        // 未読問い合わせ数
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM inquiries WHERE status = 'unread'");
        $stmt->execute();
        $stats['unread_inquiries'] = $stmt->fetchColumn();
        
        return $stats;
    }
    
    // データ操作メソッド
    public function addProduct($data) {
        $stmt = $this->db->prepare("INSERT INTO products (sku, name, description, category, brand, jan_code, price, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        return $stmt->execute([
            $data['sku'], $data['name'], $data['description'],
            $data['category'], $data['brand'], $data['jan_code'],
            $data['price'], $data['cost']
        ]);
    }
    
    public function updateInventory($productId, $channel, $quantity) {
        $stmt = $this->db->prepare("UPDATE inventory SET stock_quantity = ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ? AND channel = ?");
        return $stmt->execute([$quantity, $productId, $channel]);
    }
    
    public function updateOrderStatus($orderId, $status) {
        $stmt = $this->db->prepare("UPDATE orders SET status = ? WHERE id = ?");
        return $stmt->execute([$status, $orderId]);
    }
    
    public function updateInquiryStatus($inquiryId, $status) {
        $stmt = $this->db->prepare("UPDATE inquiries SET status = ?, resolved_at = CASE WHEN ? = 'resolved' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = ?");
        return $stmt->execute([$status, $status, $inquiryId]);
    }
    
    // ログ記録
    public function logActivity($type, $message, $data = null) {
        $stmt = $this->db->prepare("INSERT INTO system_logs (log_type, message, data) VALUES (?, ?, ?)");
        return $stmt->execute([$type, $message, json_encode($data)]);
    }
    
    // データベースビューア用
    public function getTableData($tableName, $limit = 100) {
        $allowedTables = ['products', 'inventory', 'orders', 'inquiries', 'channels', 'system_logs'];
        if (!in_array($tableName, $allowedTables)) {
            throw new Exception("不正なテーブル名: " . $tableName);
        }
        
        $stmt = $this->db->prepare("SELECT * FROM {$tableName} ORDER BY id DESC LIMIT ?");
        $stmt->execute([$limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function executeQuery($sql) {
        try {
            $stmt = $this->db->query($sql);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new Exception("クエリ実行エラー: " . $e->getMessage());
        }
    }
}
?>