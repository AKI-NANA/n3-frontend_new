<?php
/**
 * Yahoo Auction Tool - 商品承認システム 完全版
 * modules/yahoo_auction_complete/new_structure/03_approval/approval.php
 * 
 * 🎯 機能: AI推奨商品の承認・否認・保留、一括操作、統計表示
 * 📅 作成日: 2025年9月22日
 * 🔧 開発者: プログラム開発チーム
 */

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// エラー報告設定
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// データベース接続設定
function getDatabaseConnection() {
    $config = [
        'host' => 'localhost',
        'dbname' => 'yahoo_auction_system',
        'username' => 'postgres',
        'password' => 'your_password',
        'charset' => 'utf8'
    ];
    
    try {
        $dsn = "pgsql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
        $pdo = new PDO($dsn, $config['username'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        return $pdo;
    } catch (PDOException $e) {
        error_log("データベース接続エラー: " . $e->getMessage());
        return null;
    }
}

// JSON応答送信関数
function sendJsonResponse($data, $success = true, $message = '') {
    // 出力バッファをクリア
    while (ob_get_level()) {
        ob_end_clean();
    }
    
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
        // 承認システム用テーブルが存在しない場合は作成
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS yahoo_scraped_products (
                id SERIAL PRIMARY KEY,
                item_id VARCHAR(50) UNIQUE,
                title TEXT,
                current_price INTEGER,
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
        
        $pdo->exec("
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
            )
        ");
        
        // インデックス作成
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_approval_status ON yahoo_scraped_products(approval_status)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_ai_score ON yahoo_scraped_products(ai_confidence_score)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_workflow_status ON yahoo_scraped_products(workflow_status)");
        
        return true;
    } catch (PDOException $e) {
        error_log("テーブル初期化エラー: " . $e->getMessage());
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
                [
                    'item_id' => 'sample_001',
                    'title' => 'iPhone 14 Pro 128GB Deep Purple SIMフリー',
                    'current_price' => 89800,
                    'condition_name' => '中古 - 非常に良い',
                    'category_name' => '家電・スマートフォン・カメラ > スマートフォン',
                    'image_url' => 'https://example.com/iphone14.jpg',
                    'url' => 'https://yahoo.com/auction/sample001',
                    'ai_confidence_score' => 92,
                    'ai_recommendation' => 'AI推奨: 高需要商品、利益率良好',
                    'risk_level' => 'low'
                ],
                [
                    'item_id' => 'sample_002',
                    'title' => 'MacBook Air M2 チップ 8GB 256GB',
                    'current_price' => 125000,
                    'condition_name' => '中古 - 良い',
                    'category_name' => '家電・PC・タブレット > ノートPC',
                    'image_url' => 'https://example.com/macbook.jpg',
                    'url' => 'https://yahoo.com/auction/sample002',
                    'ai_confidence_score' => 88,
                    'ai_recommendation' => 'AI推奨: 人気商品、競合多し',
                    'risk_level' => 'medium'
                ],
                [
                    'item_id' => 'sample_003',
                    'title' => 'Nintendo Switch 有機ELモデル',
                    'current_price' => 32800,
                    'condition_name' => '新品・未使用',
                    'category_name' => 'ゲーム・おもちゃ > ゲーム機本体',
                    'image_url' => 'https://example.com/switch.jpg',
                    'url' => 'https://yahoo.com/auction/sample003',
                    'ai_confidence_score' => 95,
                    'ai_recommendation' => 'AI強推奨: 安定した需要、高回転',
                    'risk_level' => 'low'
                ]
            ];
            
            $stmt = $pdo->prepare("
                INSERT INTO yahoo_scraped_products 
                (item_id, title, current_price, condition_name, category_name, image_url, url, ai_confidence_score, ai_recommendation, risk_level)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            foreach ($sampleProducts as $product) {
                $stmt->execute([
                    $product['item_id'],
                    $product['title'],
                    $product['current_price'],
                    $product['condition_name'],
                    $product['category_name'],
                    $product['image_url'],
                    $product['url'],
                    $product['ai_confidence_score'],
                    $product['ai_recommendation'],
                    $product['risk_level']
                ]);
            }
        }
        return true;
    } catch (PDOException $e) {
        error_log("サンプルデータ挿入エラー: " . $e->getMessage());
        return false;
    }
}

// 承認キューデータ取得
function getApprovalQueue($pdo, $filters = []) {
    try {
        $conditions = [];
        $params = [];
        
        // フィルター条件構築
        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $conditions[] = "approval_status = ?";
            $params[] = $filters['status'];
        }
        
        if (!empty($filters['ai_filter'])) {
            switch ($filters['ai_filter']) {
                case 'ai-recommended':
                    $conditions[] = "ai_confidence_score >= 90";
                    break;
                case 'ai-pending':
                    $conditions[] = "ai_confidence_score BETWEEN 70 AND 89";
                    break;
                case 'ai-rejected':
                    $conditions[] = "ai_confidence_score < 70";
                    break;
            }
        }
        
        if (!empty($filters['min_price'])) {
            $conditions[] = "current_price >= ?";
            $params[] = (int)$filters['min_price'];
        }
        
        if (!empty($filters['max_price'])) {
            $conditions[] = "current_price <= ?";
            $params[] = (int)$filters['max_price'];
        }
        
        if (!empty($filters['search'])) {
            $conditions[] = "title ILIKE ?";
            $params[] = '%' . $filters['search'] . '%';
        }
        
        // SQL構築
        $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
        
        $sql = "
            SELECT 
                id, item_id, title, current_price, condition_name, category_name,
                image_url, url, approval_status, ai_confidence_score, ai_recommendation,
                risk_level, scraped_at, approved_at, approved_by, rejection_reason
            FROM yahoo_scraped_products 
            {$whereClause}
            ORDER BY 
                CASE approval_status 
                    WHEN 'pending' THEN 1 
                    WHEN 'approved' THEN 2 
                    ELSE 3 
                END,
                ai_confidence_score DESC,
                scraped_at DESC
            LIMIT 100
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll();
    } catch (PDOException $e) {
        error_log("承認キュー取得エラー: " . $e->getMessage());
        return [];
    }
}

// 統計データ取得
function getStatistics($pdo) {
    try {
        $stats = [];
        
        // 基本統計
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN ai_confidence_score >= 90 THEN 1 END) as ai_recommended
            FROM yahoo_scraped_products
        ");
        
        $stats = $stmt->fetch();
        
        // AI推奨統計
        $stmt = $pdo->query("
            SELECT 
                COUNT(CASE WHEN ai_confidence_score >= 90 THEN 1 END) as high_confidence,
                COUNT(CASE WHEN ai_confidence_score BETWEEN 70 AND 89 THEN 1 END) as medium_confidence,
                COUNT(CASE WHEN ai_confidence_score < 70 THEN 1 END) as low_confidence
            FROM yahoo_scraped_products
        ");
        
        $aiStats = $stmt->fetch();
        $stats = array_merge($stats, $aiStats);
        
        return $stats;
    } catch (PDOException $e) {
        error_log("統計取得エラー: " . $e->getMessage());
        return [];
    }
}

// 商品承認処理
function approveProducts($pdo, $productIds, $approvedBy = 'web_user') {
    try {
        $pdo->beginTransaction();
        
        $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
        
        $stmt = $pdo->prepare("
            UPDATE yahoo_scraped_products 
            SET approval_status = 'approved', 
                approved_at = CURRENT_TIMESTAMP,
                approved_by = ?
            WHERE id IN ($placeholders)
        ");
        
        $params = array_merge([$approvedBy], $productIds);
        $stmt->execute($params);
        
        // 履歴記録
        foreach ($productIds as $productId) {
            $historyStmt = $pdo->prepare("
                INSERT INTO approval_history 
                (product_id, action, previous_status, new_status, processed_by)
                VALUES (?, 'approve', 'pending', 'approved', ?)
            ");
            $historyStmt->execute([$productId, $approvedBy]);
        }
        
        $pdo->commit();
        return ['success' => true, 'message' => count($productIds) . '件の商品を承認しました'];
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("承認処理エラー: " . $e->getMessage());
        return ['success' => false, 'message' => '承認処理でエラーが発生しました'];
    }
}

// 商品否認処理
function rejectProducts($pdo, $productIds, $reason = '', $rejectedBy = 'web_user') {
    try {
        $pdo->beginTransaction();
        
        $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
        
        $stmt = $pdo->prepare("
            UPDATE yahoo_scraped_products 
            SET approval_status = 'rejected',
                rejection_reason = ?
            WHERE id IN ($placeholders)
        ");
        
        $params = array_merge([$reason], $productIds);
        $stmt->execute($params);
        
        // 履歴記録
        foreach ($productIds as $productId) {
            $historyStmt = $pdo->prepare("
                INSERT INTO approval_history 
                (product_id, action, previous_status, new_status, reason, processed_by)
                VALUES (?, 'reject', 'pending', 'rejected', ?, ?)
            ");
            $historyStmt->execute([$productId, $reason, $rejectedBy]);
        }
        
        $pdo->commit();
        return ['success' => true, 'message' => count($productIds) . '件の商品を否認しました'];
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("否認処理エラー: " . $e->getMessage());
        return ['success' => false, 'message' => '否認処理でエラーが発生しました'];
    }
}

// API処理
if (isset($_GET['action']) || isset($_POST['action'])) {
    $action = $_GET['action'] ?? $_POST['action'];
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        sendJsonResponse(null, false, 'データベース接続エラー');
    }
    
    // テーブル初期化
    initializeTables($pdo);
    insertSampleData($pdo);
    
    switch ($action) {
        case 'get_approval_queue':
            $filters = [
                'status' => $_GET['status'] ?? 'all',
                'ai_filter' => $_GET['ai_filter'] ?? '',
                'min_price' => $_GET['min_price'] ?? '',
                'max_price' => $_GET['max_price'] ?? '',
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
            
        case 'approve_products':
            $input = json_decode(file_get_contents('php://input'), true);
            $productIds = $input['product_ids'] ?? [];
            $approvedBy = $input['approved_by'] ?? 'web_user';
            
            if (empty($productIds)) {
                sendJsonResponse(null, false, '商品IDが指定されていません');
            }
            
            $result = approveProducts($pdo, $productIds, $approvedBy);
            sendJsonResponse($result, $result['success'], $result['message']);
            break;
            
        case 'reject_products':
            $input = json_decode(file_get_contents('php://input'), true);
            $productIds = $input['product_ids'] ?? [];
            $reason = $input['reason'] ?? '手動否認';
            $rejectedBy = $input['rejected_by'] ?? 'web_user';
            
            if (empty($productIds)) {
                sendJsonResponse(null, false, '商品IDが指定されていません');
            }
            
            $result = rejectProducts($pdo, $productIds, $reason, $rejectedBy);
            sendJsonResponse($result, $result['success'], $result['message']);
            break;
            
        case 'test_connection':
            $stats = getStatistics($pdo);
            sendJsonResponse($stats, true, 'データベース接続正常');
            break;
            
        default:
            sendJsonResponse(null, false, '不正なアクション: ' . $action);
    }
    
    exit;
}

// ダッシュボードデータ取得
$pdo = getDatabaseConnection();
$dashboard_stats = ['pending' => 0, 'approved' => 0, 'rejected' => 0, 'ai_recommended' => 0];

if ($pdo) {
    initializeTables($pdo);
    insertSampleData($pdo);
    $dashboard_stats = getStatistics($pdo);
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction - 商品承認システム</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <!-- CSS読み込み -->
    <link href="../shared/css/common.css" rel="stylesheet" onerror="console.warn('common.css読み込み失敗')">
    <link href="../shared/css/main.css" rel="stylesheet" onerror="console.warn('main.css読み込み失敗')">
    <link href="approval.css" rel="stylesheet" onerror="console.warn('approval.css読み込み失敗')">
    
    <!-- インラインCSS（フォールバック） -->
    <style>
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
            --accent-color: #8CCDEB;
            --warning-color: #FFE3A9;
            --success-color: #10b981;
            --danger-color: #ef4444;
            --info-color: #06b6d4;
            --filter-primary: #3b82f6;
            --filter-success: #10b981;
            --filter-danger: #ef4444;
            --accent-blue: #06b6d4;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --radius-sm: 0.375rem;
            --radius-md: 0.5rem;
            --radius-lg: 0.75rem;
            --radius-xl: 1rem;
            --radius-2xl: 1.5rem;
            --space-1: 0.25rem;
            --space-2: 0.5rem;
            --space-3: 0.75rem;
            --space-4: 1rem;
            --space-5: 1.25rem;
            --space-6: 1.5rem;
            --transition-fast: all 0.15s ease;
            --transition-normal: all 0.25s ease;
        }
        
        * { box-sizing: border-box; }
        
        body {
            font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.4;
            margin: 0;
            padding: 0;
            font-size: 14px;
        }
        
        .container {
            width: 100%;
            max-width: 1400px;
            margin: 0 auto;
            padding: var(--space-3);
        }
        
        .page-header {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            border-radius: var(--radius-lg);
            padding: var(--space-4);
            margin-bottom: var(--space-3);
            color: var(--text-white);
            box-shadow: var(--shadow-md);
        }
        
        .page-header h1 {
            font-size: 1.75rem;
            font-weight: 700;
            margin: 0 0 var(--space-2) 0;
            display: flex;
            align-items: center;
            gap: var(--space-2);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-3);
            margin-bottom: var(--space-4);
        }
        
        .stat-card {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-4);
            text-align: center;
            border: 1px solid var(--border-color);
            transition: transform 0.2s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: var(--space-1);
        }
        
        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .controls-section {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-4);
            margin-bottom: var(--space-4);
            border: 1px solid var(--border-light);
        }
        
        .filter-controls {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
            align-items: center;
            margin-bottom: var(--space-3);
        }
        
        .filter-group {
            display: flex;
            gap: var(--space-2);
            align-items: center;
        }
        
        .btn {
            display: inline-flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-2) var(--space-3);
            border: 1px solid var(--border-color);
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border-radius: var(--radius-md);
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition-fast);
            text-decoration: none;
            white-space: nowrap;
        }
        
        .btn:hover {
            background: var(--bg-hover);
            transform: translateY(-1px);
            box-shadow: var(--shadow-sm);
        }
        
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .btn-primary { background: var(--primary-color); color: white; border-color: var(--primary-color); }
        .btn-secondary { background: var(--bg-tertiary); color: var(--text-secondary); }
        .btn-success { background: var(--success-color); color: white; border-color: var(--success-color); }
        .btn-danger { background: var(--danger-color); color: white; border-color: var(--danger-color); }
        .btn-warning { background: var(--warning-color); color: var(--text-primary); border-color: var(--warning-color); }
        .btn-info { background: var(--info-color); color: white; border-color: var(--info-color); }
        
        .btn.active {
            background: var(--filter-primary);
            color: white;
            border-color: var(--filter-primary);
        }
        
        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: var(--space-3);
            margin-bottom: var(--space-4);
        }
        
        .product-card {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-color);
            overflow: hidden;
            transition: var(--transition-fast);
            position: relative;
        }
        
        .product-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }
        
        .product-card.selected {
            border-color: var(--filter-primary);
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        
        .product-image {
            width: 100%;
            height: 200px;
            background: var(--bg-tertiary);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            font-size: 3rem;
        }
        
        .product-content {
            padding: var(--space-3);
        }
        
        .product-title {
            font-weight: 600;
            margin-bottom: var(--space-2);
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .product-price {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--success-color);
            margin-bottom: var(--space-2);
        }
        
        .product-meta {
            display: flex;
            flex-direction: column;
            gap: var(--space-1);
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-bottom: var(--space-3);
        }
        
        .ai-score {
            display: flex;
            align-items: center;
            gap: var(--space-1);
            padding: var(--space-1) var(--space-2);
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            font-weight: 600;
            margin-bottom: var(--space-2);
        }
        
        .ai-score.high { background: rgba(16, 185, 129, 0.1); color: var(--success-color); }
        .ai-score.medium { background: rgba(245, 158, 11, 0.1); color: var(--warning-color); }
        .ai-score.low { background: rgba(239, 68, 68, 0.1); color: var(--danger-color); }
        
        .product-actions {
            display: flex;
            gap: var(--space-1);
        }
        
        .product-checkbox {
            position: absolute;
            top: var(--space-2);
            left: var(--space-2);
            width: 20px;
            height: 20px;
            cursor: pointer;
        }
        
        .status-badge {
            position: absolute;
            top: var(--space-2);
            right: var(--space-2);
            padding: var(--space-1) var(--space-2);
            border-radius: var(--radius-sm);
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-badge.pending { background: var(--warning-color); color: var(--text-primary); }
        .status-badge.approved { background: var(--success-color); color: white; }
        .status-badge.rejected { background: var(--danger-color); color: white; }
        
        .bulk-actions {
            background: var(--filter-primary);
            color: white;
            padding: var(--space-3);
            border-radius: var(--radius-lg);
            margin-bottom: var(--space-4);
            display: none;
            align-items: center;
            justify-content: space-between;
        }
        
        .bulk-actions.show {
            display: flex;
        }
        
        .bulk-info {
            font-weight: 600;
        }
        
        .bulk-buttons {
            display: flex;
            gap: var(--space-2);
        }
        
        .bulk-btn {
            padding: var(--space-2) var(--space-3);
            border: 1px solid rgba(255, 255, 255, 0.3);
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border-radius: var(--radius-md);
            font-size: 0.8rem;
            cursor: pointer;
            transition: var(--transition-fast);
        }
        
        .bulk-btn:hover {
            background: rgba(255, 255, 255, 0.2);
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
        
        .form-input, .form-select {
            padding: var(--space-2);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            background: white;
            color: var(--text-primary);
            font-size: 0.875rem;
        }
        
        .form-input:focus, .form-select:focus {
            outline: none;
            border-color: var(--filter-primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
                    <label>AI判定:</label>
                    <select class="form-select" id="aiFilter">
                        <option value="">すべて</option>
                        <option value="ai-recommended">AI推奨</option>
                        <option value="ai-pending">AI保留</option>
                        <option value="ai-rejected">AI非推奨</option>
                    </select>
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

        <!-- 一括操作バー -->
        <div class="bulk-actions" id="bulkActions">
            <div class="bulk-info">
                <i class="fas fa-check-square"></i>
                <span id="selectedCount">0</span>件選択中
            </div>
            <div class="bulk-buttons">
                <button class="bulk-btn" onclick="bulkApprove()">
                    <i class="fas fa-check"></i> 一括承認
                </button>
                <button class="bulk-btn" onclick="bulkReject()">
                    <i class="fas fa-times"></i> 一括否認
                </button>
            </div>
        </div>

        <!-- 商品グリッド -->
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
                <a href="../02_scraping/scraping.php" class="btn btn-primary">
                    <i class="fas fa-download"></i> データ取得へ
                </a>
            </div>
            
            <!-- エラー状態 -->
            <div class="error-state" id="errorState" style="display: none;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; margin-bottom: var(--space-3); color: var(--danger-color);"></i>
                <h3>データ読み込みエラー</h3>
                <p id="errorMessage">データの読み込みに失敗しました</p>
                <button class="btn btn-primary" onclick="loadApprovalData()">
                    <i class="fas fa-retry"></i> 再試行
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
            <div class="action-group">
                <button class="btn btn-success" onclick="bulkApprove()" disabled id="approveBtn">
                    <i class="fas fa-check"></i> 承認
                </button>
                <button class="btn btn-danger" onclick="bulkReject()" disabled id="rejectBtn">
                    <i class="fas fa-times"></i> 否認
                </button>
                <button class="btn btn-warning" onclick="exportSelectedProducts()" disabled id="exportBtn">
                    <i class="fas fa-download"></i> CSV出力
                </button>
            </div>
        </div>
    </main>

    <!-- JavaScript -->
    <script>
        // グローバル変数
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
                    const filter = this.dataset.filter;
                    setActiveFilter(this);
                    currentFilter = filter;
                    loadApprovalData();
                });
            });
            
            // AIフィルター
            document.getElementById('aiFilter').addEventListener('change', loadApprovalData);
            
            // 検索入力
            let searchTimeout;
            document.getElementById('searchInput').addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(loadApprovalData, 500);
            });
            
            // 商品グリッドでの選択変更監視
            document.addEventListener('change', function(e) {
                if (e.target.classList.contains('product-checkbox')) {
                    updateSelectionState();
                }
            });
        }

        // アクティブフィルター設定
        function setActiveFilter(activeBtn) {
            document.querySelectorAll('[data-filter]').forEach(btn => {
                btn.classList.remove('active');
            });
            activeBtn.classList.add('active');
        }

        // 承認データ読み込み
        function loadApprovalData() {
            console.log('承認データ読み込み開始');
            
            showLoadingState();
            
            const params = new URLSearchParams({
                action: 'get_approval_queue',
                status: currentFilter,
                ai_filter: document.getElementById('aiFilter').value,
                search: document.getElementById('searchInput').value
            });
            
            fetch(`approval.php?${params}`)
                .then(response => response.json())
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
                    showErrorState('ネットワークエラーが発生しました: ' + error.message);
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
            div.dataset.productId = product.id || product.item_id;
            
            const aiScoreClass = getAiScoreClass(product.ai_confidence_score);
            const statusClass = product.approval_status || 'pending';
            
            div.innerHTML = `
                <input type="checkbox" class="product-checkbox" value="${product.id || product.item_id}">
                <div class="status-badge ${statusClass}">${getStatusLabel(statusClass)}</div>
                
                <div class="product-image">
                    ${product.image_url ? 
                        `<img src="${product.image_url}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: cover;">` :
                        '<i class="fas fa-image"></i>'
                    }
                </div>
                
                <div class="product-content">
                    <div class="product-title">${product.title || '商品名なし'}</div>
                    <div class="product-price">¥${(product.current_price || 0).toLocaleString()}</div>
                    
                    <div class="ai-score ${aiScoreClass}">
                        <i class="fas fa-brain"></i>
                        AI信頼度: ${product.ai_confidence_score || 0}%
                    </div>
                    
                    <div class="product-meta">
                        <div>状態: ${product.condition_name || '不明'}</div>
                        <div>カテゴリ: ${product.category_name || '未分類'}</div>
                        <div>リスク: ${product.risk_level || 'medium'}</div>
                    </div>
                    
                    <div class="product-actions">
                        <button class="btn btn-success btn-sm" onclick="approveProduct(${product.id || product.item_id})">
                            <i class="fas fa-check"></i> 承認
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="rejectProduct(${product.id || product.item_id})">
                            <i class="fas fa-times"></i> 否認
                        </button>
                        <button class="btn btn-info btn-sm" onclick="viewProductDetail(${product.id || product.item_id})">
                            <i class="fas fa-eye"></i> 詳細
                        </button>
                    </div>
                </div>
            `;
            
            return div;
        }

        // AIスコアクラス取得
        function getAiScoreClass(score) {
            if (score >= 90) return 'high';
            if (score >= 70) return 'medium';
            return 'low';
        }

        // ステータスラベル取得
        function getStatusLabel(status) {
            const labels = {
                'pending': '承認待ち',
                'approved': '承認済み',
                'rejected': '否認済み'
            };
            return labels[status] || status;
        }

        // 選択状態更新
        function updateSelectionState() {
            selectedProducts.clear();
            
            document.querySelectorAll('.product-checkbox:checked').forEach(checkbox => {
                selectedProducts.add(parseInt(checkbox.value));
                checkbox.closest('.product-card').classList.add('selected');
            });
            
            document.querySelectorAll('.product-checkbox:not(:checked)').forEach(checkbox => {
                checkbox.closest('.product-card').classList.remove('selected');
            });
            
            // UI更新
            const count = selectedProducts.size;
            document.getElementById('selectedCount').textContent = count;
            
            const bulkActions = document.getElementById('bulkActions');
            if (count > 0) {
                bulkActions.classList.add('show');
            } else {
                bulkActions.classList.remove('show');
            }
            
            // ボタン有効化/無効化
            const buttons = ['approveBtn', 'rejectBtn', 'exportBtn'];
            buttons.forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.disabled = count === 0;
                }
            });
        }

        // 全選択
        function selectAllVisible() {
            document.querySelectorAll('.product-checkbox').forEach(checkbox => {
                checkbox.checked = true;
            });
            updateSelectionState();
        }

        // 全解除
        function deselectAll() {
            document.querySelectorAll('.product-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
            updateSelectionState();
        }

        // 個別承認
        function approveProduct(productId) {
            if (confirm('この商品を承認しますか？')) {
                bulkApproveProducts([productId]);
            }
        }

        // 個別否認
        function rejectProduct(productId) {
            const reason = prompt('否認理由を入力してください（任意）:', '');
            if (reason !== null) {
                bulkRejectProducts([productId], reason);
            }
        }

        // 一括承認
        function bulkApprove() {
            if (selectedProducts.size === 0) {
                alert('承認する商品を選択してください。');
                return;
            }
            
            if (confirm(`選択した${selectedProducts.size}件の商品を承認しますか？`)) {
                bulkApproveProducts(Array.from(selectedProducts));
            }
        }

        // 一括否認
        function bulkReject() {
            if (selectedProducts.size === 0) {
                alert('否認する商品を選択してください。');
                return;
            }
            
            const reason = prompt('否認理由を入力してください（任意）:', '');
            if (reason !== null) {
                bulkRejectProducts(Array.from(selectedProducts), reason);
            }
        }

        // 承認API呼び出し
        function bulkApproveProducts(productIds) {
            const data = {
                action: 'approve_products',
                product_ids: productIds,
                approved_by: 'web_user'
            };
            
            fetch('approval.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert('✅ ' + result.message);
                    loadApprovalData();
                    deselectAll();
                } else {
                    alert('❌ エラー: ' + result.message);
                }
            })
            .catch(error => {
                alert('❌ 通信エラー: ' + error.message);
            });
        }

        // 否認API呼び出し
        function bulkRejectProducts(productIds, reason = '') {
            const data = {
                action: 'reject_products',
                product_ids: productIds,
                reason: reason,
                rejected_by: 'web_user'
            };
            
            fetch('approval.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert('✅ ' + result.message);
                    loadApprovalData();
                    deselectAll();
                } else {
                    alert('❌ エラー: ' + result.message);
                }
            })
            .catch(error => {
                alert('❌ 通信エラー: ' + error.message);
            });
        }

        // 商品詳細表示
        function viewProductDetail(productId) {
            const product = currentProducts.find(p => (p.id || p.item_id) == productId);
            if (product) {
                alert(`商品詳細:\n\nタイトル: ${product.title}\n価格: ¥${(product.current_price || 0).toLocaleString()}\n状態: ${product.condition_name}\nAI信頼度: ${product.ai_confidence_score}%\nAI推奨: ${product.ai_recommendation || 'なし'}`);
            }
        }

        // CSV出力
        function exportSelectedProducts() {
            if (selectedProducts.size === 0) {
                alert('出力する商品を選択してください。');
                return;
            }
            
            const csvData = Array.from(selectedProducts).map(productId => {
                const product = currentProducts.find(p => (p.id || p.item_id) == productId);
                if (!product) return '';
                
                return [
                    product.id || product.item_id,
                    `"${(product.title || '').replace(/"/g, '""')}"`,
                    product.current_price || 0,
                    `"${(product.condition_name || '').replace(/"/g, '""')}"`,
                    `"${(product.category_name || '').replace(/"/g, '""')}"`,
                    product.approval_status || 'pending',
                    product.ai_confidence_score || 0,
                    product.risk_level || 'medium'
                ].join(',');
            }).filter(row => row);
            
            const headers = 'ID,タイトル,価格,状態,カテゴリ,承認状態,AI信頼度,リスクレベル';
            const csvContent = '\uFEFF' + headers + '\n' + csvData.join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `approval_products_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        }

        // データベース接続確認
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
                        alert('❌ データベース接続エラー: ' + data.message);
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