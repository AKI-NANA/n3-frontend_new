header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// OPTIONSリクエスト処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// デバッグ情報の初期化
$debugInfo = [
    'timestamp' => date('Y-m-d H:i:s'),
    'method' => $_SERVER['REQUEST_METHOD'],
    'php_version' => PHP_VERSION,
    'memory_usage' => memory_get_usage(true),
    'errors' => []
];

/**
 * JSON応答送信
 */
function sendJsonResponse($data, $success = true, $message = '', $debugInfo = null) {
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'module' => '03_approval'
    ];
    
    if ($debugInfo && isset($_GET['debug'])) {
        $response['debug'] = $debugInfo;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * データベース接続（複数DB対応）
 */
function getDatabase() {
    $databases = [
        // PostgreSQL優先
        [
            'dsn' => 'pgsql:host=localhost;port=5432;dbname=yahoo_auction_system',
            'user' => 'postgres',
            'password' => '',
            'type' => 'postgresql'
        ],
        [
            'dsn' => 'pgsql:host=localhost;port=5432;dbname=nagano3_db', 
            'user' => 'postgres',
            'password' => '',
            'type' => 'postgresql'
        ],
        // MySQL代替
        [
            'dsn' => 'mysql:host=localhost;dbname=yahoo_auction_system;charset=utf8mb4',
            'user' => 'root',
            'password' => '',
            'type' => 'mysql'
        ]
    ];
    
    foreach ($databases as $config) {
        try {
            $pdo = new PDO($config['dsn'], $config['user'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
            
            // 接続成功時のテーブル確認・作成
            initializeTables($pdo, $config['type']);
            
            return $pdo;
        } catch (PDOException $e) {
            error_log("DB接続失敗 ({$config['type']}): " . $e->getMessage());
            continue;
        }
    }
    
    throw new Exception('すべてのデータベース接続に失敗しました');
}

/**
 * テーブル初期化（自動作成）
 */
function initializeTables($pdo, $dbType) {
    try {
        // メインテーブルの存在確認
        $tableExists = false;
        if ($dbType === 'postgresql') {
            $stmt = $pdo->query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'yahoo_scraped_products')");
            $tableExists = $stmt->fetchColumn();
        } else {
            $stmt = $pdo->query("SHOW TABLES LIKE 'yahoo_scraped_products'");
            $tableExists = $stmt->rowCount() > 0;
        }
        
        // テーブル作成
        if (!$tableExists) {
            $createTableSQL = ($dbType === 'postgresql') 
                ? createPostgreSQLTables() 
                : createMySQLTables();
            
            $pdo->exec($createTableSQL);
            
            // サンプルデータ挿入
            insertSampleData($pdo);
        }
        
        // 承認関連カラムの追加（既存テーブル拡張）
        addApprovalColumns($pdo, $dbType);
        
    } catch (Exception $e) {
        error_log("テーブル初期化エラー: " . $e->getMessage());
        throw $e;
    }
}

/**
 * PostgreSQLテーブル作成SQL
 */
function createPostgreSQLTables() {
    return "
    CREATE TABLE IF NOT EXISTS yahoo_scraped_products (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        current_price INTEGER DEFAULT 0,
        bids INTEGER DEFAULT 0,
        time_left VARCHAR(100),
        url TEXT,
        image TEXT,
        category VARCHAR(200),
        condition_info TEXT,
        seller VARCHAR(100),
        location VARCHAR(100),
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approval_status VARCHAR(20) DEFAULT 'pending',
        ai_confidence_score INTEGER DEFAULT 0,
        ai_recommendation TEXT,
        approved_at TIMESTAMP,
        approved_by VARCHAR(100),
        rejected_at TIMESTAMP,
        rejected_by VARCHAR(100),
        rejection_reason TEXT,
        notes TEXT
    );
    
    CREATE TABLE IF NOT EXISTS approval_history (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES yahoo_scraped_products(id),
        action VARCHAR(20) NOT NULL,
        previous_status VARCHAR(20),
        new_status VARCHAR(20),
        reason TEXT,
        processed_by VARCHAR(100),
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ai_score_at_time INTEGER,
        metadata JSONB
    );
    
    CREATE INDEX IF NOT EXISTS idx_approval_status ON yahoo_scraped_products(approval_status);
    CREATE INDEX IF NOT EXISTS idx_ai_confidence ON yahoo_scraped_products(ai_confidence_score);
    CREATE INDEX IF NOT EXISTS idx_scraped_at ON yahoo_scraped_products(scraped_at);
    ";
}

/**
 * MySQLテーブル作成SQL
 */
function createMySQLTables() {
    return "
    CREATE TABLE IF NOT EXISTS yahoo_scraped_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title TEXT NOT NULL,
        current_price INT DEFAULT 0,
        bids INT DEFAULT 0,
        time_left VARCHAR(100),
        url TEXT,
        image TEXT,
        category VARCHAR(200),
        condition_info TEXT,
        seller VARCHAR(100),
        location VARCHAR(100),
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approval_status VARCHAR(20) DEFAULT 'pending',
        ai_confidence_score INT DEFAULT 0,
        ai_recommendation TEXT,
        approved_at TIMESTAMP NULL,
        approved_by VARCHAR(100),
        rejected_at TIMESTAMP NULL,
        rejected_by VARCHAR(100),
        rejection_reason TEXT,
        notes TEXT
    ) ENGINE=InnoDB;
    
    CREATE TABLE IF NOT EXISTS approval_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT,
        action VARCHAR(20) NOT NULL,
        previous_status VARCHAR(20),
        new_status VARCHAR(20),
        reason TEXT,
        processed_by VARCHAR(100),
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ai_score_at_time INT,
        metadata JSON,
        FOREIGN KEY (product_id) REFERENCES yahoo_scraped_products(id)
    ) ENGINE=InnoDB;
    
    CREATE INDEX idx_approval_status ON yahoo_scraped_products(approval_status);
    CREATE INDEX idx_ai_confidence ON yahoo_scraped_products(ai_confidence_score);
    CREATE INDEX idx_scraped_at ON yahoo_scraped_products(scraped_at);
    ";
}

/**
 * 承認関連カラム追加
 */
function addApprovalColumns($pdo, $dbType) {
    $columns = [
        'approval_status' => "VARCHAR(20) DEFAULT 'pending'",
        'ai_confidence_score' => 'INTEGER DEFAULT 0',
        'ai_recommendation' => 'TEXT',
        'approved_at' => 'TIMESTAMP',
        'approved_by' => 'VARCHAR(100)',
        'rejected_at' => 'TIMESTAMP',
        'rejected_by' => 'VARCHAR(100)',
        'rejection_reason' => 'TEXT'
    ];
    
    foreach ($columns as $column => $definition) {
        try {
            if ($dbType === 'postgresql') {
                $pdo->exec("ALTER TABLE yahoo_scraped_products ADD COLUMN IF NOT EXISTS $column $definition");
            } else {
                // MySQL用（カラム存在チェック）
                $stmt = $pdo->query("SHOW COLUMNS FROM yahoo_scraped_products LIKE '$column'");
                if ($stmt->rowCount() === 0) {
                    $pdo->exec("ALTER TABLE yahoo_scraped_products ADD COLUMN $column $definition");
                }
            }
        } catch (Exception $e) {
            // カラムが既に存在する場合は無視
            continue;
        }
    }
}

/**
 * サンプルデータ挿入
 */
function insertSampleData($pdo) {
    $sampleData = [
        [
            'title' => 'iPhone 15 Pro Max 512GB 新品未開封 SIMフリー',
            'current_price' => 189000,
            'bids' => 23,
            'time_left' => '2日 14時間',
            'url' => 'https://auctions.yahoo.co.jp/o1234567890',
            'image' => 'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/sample1.jpg',
            'category' => 'スマートフォン/携帯電話',
            'condition_info' => '新品、未使用',
            'seller' => 'tech_store_2024',
            'location' => '東京都',
            'ai_confidence_score' => 95
        ],
        [
            'title' => 'MacBook Air M2 13インチ 256GB スペースグレイ 美品',
            'current_price' => 145000,
            'bids' => 15,
            'time_left' => '1日 8時間',
            'url' => 'https://auctions.yahoo.co.jp/o2345678901',
            'image' => 'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/sample2.jpg',
            'category' => 'コンピュータ',
            'condition_info' => '中古品（美品）',
            'seller' => 'mac_specialist',
            'location' => '大阪府',
            'ai_confidence_score' => 88
        ],
        [
            'title' => 'Nintendo Switch 有機EL ホワイト 新品未使用',
            'current_price' => 35800,
            'bids' => 8,
            'time_left' => '3日 22時間',
            'url' => 'https://auctions.yahoo.co.jp/o3456789012',
            'image' => 'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/sample3.jpg',
            'category' => 'ゲーム機本体',
            'condition_info' => '新品、未使用',
            'seller' => 'game_heaven',
            'location' => '神奈川県',
            'ai_confidence_score' => 92
        ],
        [
            'title' => 'Canon EOS R6 Mark II ボディ メーカー保証付き',
            'current_price' => 298000,
            'bids' => 5,
            'time_left' => '5日 12時間',
            'url' => 'https://auctions.yahoo.co.jp/o4567890123',
            'image' => 'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/sample4.jpg',
            'category' => 'デジタル一眼レフ',
            'condition_info' => '新品、未使用',
            'seller' => 'camera_pro',
            'location' => '愛知県',
            'ai_confidence_score' => 78
        ],
        [
            'title' => 'Sony PlayStation 5 CFI-2000A01 新品 保証書付き',
            'current_price' => 68000,
            'bids' => 31,
            'time_left' => '18時間',
            'url' => 'https://auctions.yahoo.co.jp/o5678901234',
            'image' => 'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/sample5.jpg',
            'category' => 'ゲーム機本体',
            'condition_info' => '新品、未使用',
            'seller' => 'electronics_store',
            'location' => '福岡県',
            'ai_confidence_score' => 85
        ]
    ];
    
    $stmt = $pdo->prepare("
        INSERT INTO yahoo_scraped_products 
        (title, current_price, bids, time_left, url, image, category, condition_info, seller, location, ai_confidence_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    foreach ($sampleData as $product) {
        try {
            $stmt->execute([
                $product['title'],
                $product['current_price'],
                $product['bids'],
                $product['time_left'],
                $product['url'],
                $product['image'],
                $product['category'],
                $product['condition_info'],
                $product['seller'],
                $product['location'],
                $product['ai_confidence_score']
            ]);
        } catch (Exception $e) {
            // 重複データは無視
            continue;
        }
    }
}

/**
 * 承認キュー取得
 */
function getApprovalQueue($pdo, $params = []) {
    $where = ['1=1'];
    $bindings = [];
    
    // ステータスフィルター
    if (!empty($params['status'])) {
        $where[] = 'approval_status = ?';
        $bindings[] = $params['status'];
    }
    
    // AI判定フィルター
    if (!empty($params['ai_filter'])) {
        switch ($params['ai_filter']) {
            case 'ai-approved':
                $where[] = 'ai_confidence_score >= 80';
                break;
            case 'ai-pending':
                $where[] = 'ai_confidence_score >= 50 AND ai_confidence_score < 80';
                break;
            case 'ai-rejected':
                $where[] = 'ai_confidence_score < 50';
                break;
        }
    }
    
    // 価格フィルター
    if (!empty($params['min_price'])) {
        $where[] = 'current_price >= ?';
        $bindings[] = (int)$params['min_price'];
    }
    
    if (!empty($params['max_price'])) {
        $where[] = 'current_price <= ?';
        $bindings[] = (int)$params['max_price'];
    }
    
    // 検索フィルター
    if (!empty($params['search'])) {
        $where[] = 'title ILIKE ?';
        $bindings[] = '%' . $params['search'] . '%';
    }
    
    // ページネーション
    $limit = min((int)($params['limit'] ?? 50), 100);
    $offset = ((int)($params['page'] ?? 1) - 1) * $limit;
    
    $sql = "
        SELECT id, title, current_price, bids, time_left, url, image, 
               category, condition_info, seller, location, scraped_at,
               approval_status, ai_confidence_score, ai_recommendation,
               approved_at, approved_by, rejected_at, rejected_by, rejection_reason
        FROM yahoo_scraped_products 
        WHERE " . implode(' AND ', $where) . "
        ORDER BY 
            CASE WHEN approval_status = 'pending' THEN 0 ELSE 1 END,
            ai_confidence_score DESC,
            scraped_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $bindings[] = $limit;
    $bindings[] = $offset;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($bindings);
    
    return $stmt->fetchAll();
}

/**
 * 統計情報取得
 */
function getStatistics($pdo) {
    $sql = "
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
            COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected,
            COUNT(CASE WHEN ai_confidence_score >= 80 THEN 1 END) as ai_recommended,
            AVG(ai_confidence_score) as avg_ai_score,
            AVG(current_price) as avg_price
        FROM yahoo_scraped_products
    ";
    
    $stmt = $pdo->query($sql);
    return $stmt->fetch();
}

/**
 * 一括承認処理
 */
function approveProducts($pdo, $productIds, $approvedBy = 'web_user') {
    if (empty($productIds)) {
        throw new Exception('商品IDが指定されていません');
    }
    
    $pdo->beginTransaction();
    try {
        $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
        
        // 現在のステータス取得（履歴用）
        $selectSql = "SELECT id, approval_status FROM yahoo_scraped_products WHERE id IN ($placeholders)";
        $stmt = $pdo->prepare($selectSql);
        $stmt->execute($productIds);
        $currentStatuses = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        // ステータス更新
        $updateSql = "
            UPDATE yahoo_scraped_products 
            SET approval_status = 'approved', 
                approved_at = CURRENT_TIMESTAMP, 
                approved_by = ?
            WHERE id IN ($placeholders)
        ";
        $stmt = $pdo->prepare($updateSql);
        $stmt->execute(array_merge([$approvedBy], $productIds));
        
        // 履歴記録
        $historySql = "
            INSERT INTO approval_history 
            (product_id, action, previous_status, new_status, processed_by, processed_at)
            VALUES (?, 'approve', ?, 'approved', ?, CURRENT_TIMESTAMP)
        ";
        $historyStmt = $pdo->prepare($historySql);
        
        foreach ($productIds as $productId) {
            $previousStatus = $currentStatuses[$productId] ?? 'unknown';
            $historyStmt->execute([$productId, $previousStatus, $approvedBy]);
        }
        
        $pdo->commit();
        return [
            'success' => true,
            'message' => count($productIds) . '件の商品を承認しました',
            'updated_count' => count($productIds)
        ];
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
}

/**
 * 一括否認処理
 */
function rejectProducts($pdo, $productIds, $reason = '手動否認', $rejectedBy = 'web_user') {
    if (empty($productIds)) {
        throw new Exception('商品IDが指定されていません');
    }
    
    $pdo->beginTransaction();
    try {
        $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
        
        // 現在のステータス取得
        $selectSql = "SELECT id, approval_status FROM yahoo_scraped_products WHERE id IN ($placeholders)";
        $stmt = $pdo->prepare($selectSql);
        $stmt->execute($productIds);
        $currentStatuses = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        // ステータス更新
        $updateSql = "
            UPDATE yahoo_scraped_products 
            SET approval_status = 'rejected', 
                rejected_at = CURRENT_TIMESTAMP, 
                rejected_by = ?,
                rejection_reason = ?
            WHERE id IN ($placeholders)
        ";
        $stmt = $pdo->prepare($updateSql);
        $stmt->execute(array_merge([$rejectedBy, $reason], $productIds));
        
        // 履歴記録
        $historySql = "
            INSERT INTO approval_history 
            (product_id, action, previous_status, new_status, reason, processed_by, processed_at)
            VALUES (?, 'reject', ?, 'rejected', ?, ?, CURRENT_TIMESTAMP)
        ";
        $historyStmt = $pdo->prepare($historySql);
        
        foreach ($productIds as $productId) {
            $previousStatus = $currentStatuses[$productId] ?? 'unknown';
            $historyStmt->execute([$productId, $previousStatus, $reason, $rejectedBy]);
        }
        
        $pdo->commit();
        return [
            'success' => true,
            'message' => count($productIds) . '件の商品を否認しました',
            'updated_count' => count($productIds)
        ];
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
}

// メイン処理
try {
    // データベース接続
    $pdo = getDatabase();
    $debugInfo['database'] = 'Connected successfully';
    
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    
    if ($method === 'GET') {
        switch ($action) {
            case 'get_approval_queue':
                $products = getApprovalQueue($pdo, $_GET);
                sendJsonResponse($products, true, count($products) . '件の商品を取得しました', $debugInfo);
                break;
                
            case 'get_statistics':
                $stats = getStatistics($pdo);
                sendJsonResponse($stats, true, '統計情報を取得しました', $debugInfo);
                break;
                
            case 'health_check':
                sendJsonResponse([
                    'status' => 'healthy',
                    'database' => 'connected',
                    'timestamp' => date('Y-m-d H:i:s')
                ], true, 'システムは正常に動作しています', $debugInfo);
                break;
                
            default:
                // デフォルトはダッシュボード表示
                $products = getApprovalQueue($pdo, ['status' => 'pending', 'limit' => 50]);
                sendJsonResponse($products, true, 'デフォルトデータを取得しました', $debugInfo);
        }
        
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            sendJsonResponse(null, false, '無効なJSONデータです');
        }
        
        switch ($input['action'] ?? '') {
            case 'approve_products':
                $productIds = $input['product_ids'] ?? [];
                $approvedBy = $input['approved_by'] ?? 'web_user';
                $result = approveProducts($pdo, $productIds, $approvedBy);
                sendJsonResponse($result, $result['success'], $result['message']);
                break;
                
            case 'reject_products':
                $productIds = $input['product_ids'] ?? [];
                $reason = $input['reason'] ?? '手動否認';
                $rejectedBy = $input['rejected_by'] ?? 'web_user';
                $result = rejectProducts($pdo, $productIds, $reason, $rejectedBy);
                sendJsonResponse($result, $result['success'], $result['message']);
                break;
                
            default:
                sendJsonResponse(null, false, '無効なアクションです');
        }
    }
    
} catch (Exception $e) {
    error_log("システムエラー: " . $e->getMessage());
    sendJsonResponse(null, false, 'システムエラー: ' . $e->getMessage(), $debugInfo);
} catch (Error $e) {
    error_log("PHPエラー: " . $e->getMessage());
    sendJsonResponse(null, false, 'システムエラー: ' . $e->getMessage(), $debugInfo);
}
?>
