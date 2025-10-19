<?php
/**
 * Yahoo Auction Complete - 商品承認システム 完全版
 * AI判定・手動承認・バッチ処理・禁止品フィルター統合
 */

// エラーハンドリングとセキュリティ
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// データベース接続
function getDatabaseConnection() {
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        return null;
    }
}

// API処理
if (isset($_GET['action']) || isset($_POST['action'])) {
    $action = $_GET['action'] ?? $_POST['action'];
    header('Content-Type: application/json');
    
    try {
        switch ($action) {
            case 'get_pending_products':
                echo json_encode(getPendingProducts());
                break;
                
            case 'approve_product':
                $productId = $_POST['product_id'] ?? '';
                $reason = $_POST['reason'] ?? '';
                echo json_encode(approveProduct($productId, $reason));
                break;
                
            case 'reject_product':
                $productId = $_POST['product_id'] ?? '';
                $reason = $_POST['reason'] ?? '';
                echo json_encode(rejectProduct($productId, $reason));
                break;
                
            case 'batch_approve':
                $productIds = $_POST['product_ids'] ?? [];
                echo json_encode(batchApprove($productIds));
                break;
                
            case 'ai_analyze_product':
                $productId = $_POST['product_id'] ?? '';
                echo json_encode(aiAnalyzeProduct($productId));
                break;
                
            case 'get_approval_stats':
                echo json_encode(getApprovalStats());
                break;
                
            case 'get_banned_keywords':
                echo json_encode(getBannedKeywords());
                break;
                
            case 'add_banned_keyword':
                $keyword = $_POST['keyword'] ?? '';
                $category = $_POST['category'] ?? '';
                echo json_encode(addBannedKeyword($keyword, $category));
                break;
                
            case 'remove_banned_keyword':
                $keywordId = $_POST['keyword_id'] ?? '';
                echo json_encode(removeBannedKeyword($keywordId));
                break;
                
            default:
                echo json_encode(['error' => 'Invalid action']);
        }
    } catch (Exception $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// 承認待ち商品取得
function getPendingProducts($limit = 50) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        // 承認待ちの商品を取得
        $stmt = $pdo->prepare("
            SELECT 
                id, title, description, price_jpy, price_usd,
                image_url, yahoo_url, category_name,
                approval_status, created_at, updated_at,
                ai_analysis_result, risk_score
            FROM yahoo_scraped_products 
            WHERE approval_status IN ('pending', 'needs_review') OR approval_status IS NULL
            ORDER BY created_at DESC 
            LIMIT ?
        ");
        
        $stmt->execute([$limit]);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 各商品にAI分析スコアを追加
        foreach ($products as &$product) {
            $product['ai_analysis'] = performAIAnalysis($product);
        }
        
        return [
            'success' => true,
            'products' => $products,
            'count' => count($products)
        ];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// AI分析実行
function performAIAnalysis($product) {
    $analysis = [
        'risk_score' => 0,
        'risk_factors' => [],
        'recommendation' => 'approve',
        'confidence' => 0
    ];
    
    $title = strtolower($product['title'] ?? '');
    $description = strtolower($product['description'] ?? '');
    $text = $title . ' ' . $description;
    
    // 禁止キーワードチェック
    $bannedKeywords = getBannedKeywordsFromDB();
    foreach ($bannedKeywords as $keyword) {
        if (strpos($text, strtolower($keyword['keyword'])) !== false) {
            $analysis['risk_score'] += $keyword['severity'] ?? 10;
            $analysis['risk_factors'][] = "禁止キーワード: " . $keyword['keyword'];
        }
    }
    
    // 価格チェック（異常に高い・安い価格）
    $price = $product['price_jpy'] ?? 0;
    if ($price > 1000000) {
        $analysis['risk_score'] += 15;
        $analysis['risk_factors'][] = "高額商品 (¥" . number_format($price) . ")";
    } elseif ($price < 100) {
        $analysis['risk_score'] += 10;
        $analysis['risk_factors'][] = "低価格商品 (¥" . $price . ")";
    }
    
    // タイトル長チェック
    if (mb_strlen($product['title'] ?? '') < 10) {
        $analysis['risk_score'] += 5;
        $analysis['risk_factors'][] = "タイトルが短すぎる";
    }
    
    // 説明文チェック
    if (empty(trim($product['description'] ?? ''))) {
        $analysis['risk_score'] += 8;
        $analysis['risk_factors'][] = "説明文なし";
    }
    
    // 推奨判定
    if ($analysis['risk_score'] >= 30) {
        $analysis['recommendation'] = 'reject';
        $analysis['confidence'] = 90;
    } elseif ($analysis['risk_score'] >= 15) {
        $analysis['recommendation'] = 'review';
        $analysis['confidence'] = 75;
    } else {
        $analysis['recommendation'] = 'approve';
        $analysis['confidence'] = 85;
    }
    
    return $analysis;
}

// 商品承認
function approveProduct($productId, $reason = '') {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        $stmt = $pdo->prepare("
            UPDATE yahoo_scraped_products 
            SET 
                approval_status = 'approved',
                approval_reason = ?,
                approved_at = NOW(),
                approved_by = 'manual'
            WHERE id = ?
        ");
        
        $stmt->execute([$reason, $productId]);
        
        // 承認履歴を記録
        recordApprovalHistory($pdo, $productId, 'approved', $reason);
        
        return ['success' => true, 'message' => '商品を承認しました'];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// 商品否認
function rejectProduct($productId, $reason = '') {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        $stmt = $pdo->prepare("
            UPDATE yahoo_scraped_products 
            SET 
                approval_status = 'rejected',
                approval_reason = ?,
                approved_at = NOW(),
                approved_by = 'manual'
            WHERE id = ?
        ");
        
        $stmt->execute([$reason, $productId]);
        
        // 承認履歴を記録
        recordApprovalHistory($pdo, $productId, 'rejected', $reason);
        
        return ['success' => true, 'message' => '商品を否認しました'];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// バッチ承認
function batchApprove($productIds) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        $successCount = 0;
        $failureCount = 0;
        
        foreach ($productIds as $productId) {
            try {
                $stmt = $pdo->prepare("
                    UPDATE yahoo_scraped_products 
                    SET 
                        approval_status = 'approved',
                        approval_reason = 'Batch approval',
                        approved_at = NOW(),
                        approved_by = 'batch'
                    WHERE id = ?
                ");
                
                $stmt->execute([$productId]);
                recordApprovalHistory($pdo, $productId, 'approved', 'Batch approval');
                $successCount++;
                
            } catch (Exception $e) {
                $failureCount++;
                error_log("Batch approval failed for product {$productId}: " . $e->getMessage());
            }
        }
        
        return [
            'success' => true,
            'message' => "バッチ処理完了: 成功 {$successCount}件, 失敗 {$failureCount}件"
        ];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// AI分析結果取得
function aiAnalyzeProduct($productId) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        $stmt = $pdo->prepare("SELECT * FROM yahoo_scraped_products WHERE id = ?");
        $stmt->execute([$productId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            return ['error' => 'Product not found'];
        }
        
        $analysis = performAIAnalysis($product);
        
        // 結果をデータベースに保存
        $stmt = $pdo->prepare("
            UPDATE yahoo_scraped_products 
            SET ai_analysis_result = ?, risk_score = ?
            WHERE id = ?
        ");
        
        $stmt->execute([
            json_encode($analysis),
            $analysis['risk_score'],
            $productId
        ]);
        
        return ['success' => true, 'analysis' => $analysis];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// 承認統計取得
function getApprovalStats() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        $stats = [];
        
        // 基本統計
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN approval_status = 'pending' OR approval_status IS NULL THEN 1 END) as pending
            FROM yahoo_scraped_products
        ");
        
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 今日の統計
        $stmt = $pdo->query("
            SELECT 
                COUNT(CASE WHEN approval_status = 'approved' AND DATE(approved_at) = CURRENT_DATE THEN 1 END) as today_approved,
                COUNT(CASE WHEN approval_status = 'rejected' AND DATE(approved_at) = CURRENT_DATE THEN 1 END) as today_rejected
            FROM yahoo_scraped_products
        ");
        
        $todayStats = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats = array_merge($stats, $todayStats);
        
        return ['success' => true, 'stats' => $stats];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// 禁止キーワード取得
function getBannedKeywords() {
    try {
        $keywords = getBannedKeywordsFromDB();
        return ['success' => true, 'keywords' => $keywords];
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// 禁止キーワードをDBから取得
function getBannedKeywordsFromDB() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return [];
        }
        
        // テーブルが存在しない場合は作成
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS banned_keywords (
                id SERIAL PRIMARY KEY,
                keyword VARCHAR(200) NOT NULL,
                category VARCHAR(100) DEFAULT 'general',
                severity INTEGER DEFAULT 10,
                created_at TIMESTAMP DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE
            )
        ");
        
        $stmt = $pdo->query("
            SELECT * FROM banned_keywords 
            WHERE is_active = TRUE 
            ORDER BY severity DESC, keyword ASC
        ");
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
        
    } catch (Exception $e) {
        error_log("Error fetching banned keywords: " . $e->getMessage());
        return [];
    }
}

// 禁止キーワード追加
function addBannedKeyword($keyword, $category = 'general') {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO banned_keywords (keyword, category, severity) 
            VALUES (?, ?, ?)
        ");
        
        $severity = getSeverityByCategory($category);
        $stmt->execute([$keyword, $category, $severity]);
        
        return ['success' => true, 'message' => 'キーワードを追加しました'];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// 禁止キーワード削除
function removeBannedKeyword($keywordId) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        $stmt = $pdo->prepare("
            UPDATE banned_keywords 
            SET is_active = FALSE 
            WHERE id = ?
        ");
        
        $stmt->execute([$keywordId]);
        
        return ['success' => true, 'message' => 'キーワードを削除しました'];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// カテゴリー別重要度取得
function getSeverityByCategory($category) {
    $severityMap = [
        'prohibited' => 50,  // 禁止商品
        'adult' => 40,       // アダルト
        'weapon' => 45,      // 武器類
        'drug' => 50,        // 薬物
        'counterfeit' => 35, // 偽造品
        'general' => 10      // 一般
    ];
    
    return $severityMap[$category] ?? 10;
}

// 承認履歴記録
function recordApprovalHistory($pdo, $productId, $action, $reason) {
    try {
        // テーブルが存在しない場合は作成
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS approval_history (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL,
                action VARCHAR(50) NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                created_by VARCHAR(100) DEFAULT 'system'
            )
        ");
        
        $stmt = $pdo->prepare("
            INSERT INTO approval_history (product_id, action, reason) 
            VALUES (?, ?, ?)
        ");
        
        $stmt->execute([$productId, $action, $reason]);
        
    } catch (Exception $e) {
        error_log("Failed to record approval history: " . $e->getMessage());
    }
}

// 必要なテーブル作成
function initializeTables() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return false;
        
        // approval_status カラムを追加（存在しない場合）
        $pdo->exec("
            ALTER TABLE yahoo_scraped_products 
            ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS approval_reason TEXT,
            ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100),
            ADD COLUMN IF NOT EXISTS ai_analysis_result JSONB,
            ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0
        ");
        
        return true;
        
    } catch (Exception $e) {
        error_log("Failed to initialize tables: " . $e->getMessage());
        return false;
    }
}

// テーブル初期化実行
initializeTables();
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>商品承認システム - Yahoo Auction Complete</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #2563eb;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --info-color: #06b6d4;
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --border-color: #e2e8f0;
            --radius-md: 0.5rem;
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 1rem;
        }

        .header {
            background: linear-gradient(135deg, var(--primary-color), var(--info-color));
            color: white;
            padding: 2rem;
            border-radius: var(--radius-md);
            margin-bottom: 2rem;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: var(--bg-secondary);
            padding: 1.5rem;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-md);
            text-align: center;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }

        .stat-value.pending { color: var(--warning-color); }
        .stat-value.approved { color: var(--success-color); }
        .stat-value.rejected { color: var(--danger-color); }

        .content-grid {
            display: grid;
            grid-template-columns: 3fr 1fr;
            gap: 2rem;
        }

        .main-content {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .card {
            background: var(--bg-secondary);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-md);
            overflow: hidden;
        }

        .card-header {
            padding: 1rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .card-content {
            padding: 1rem;
        }

        .product-item {
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 1rem;
            margin-bottom: 1rem;
            background: var(--bg-secondary);
        }

        .product-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1rem;
        }

        .product-info {
            flex: 1;
            margin-right: 1rem;
        }

        .product-title {
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }

        .product-price {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--primary-color);
            margin-bottom: 0.5rem;
        }

        .product-meta {
            font-size: 0.9rem;
            color: var(--text-secondary);
        }

        .product-image {
            width: 100px;
            height: 100px;
            object-fit: cover;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
        }

        .ai-analysis {
            background: var(--bg-primary);
            padding: 1rem;
            border-radius: var(--radius-md);
            margin: 1rem 0;
        }

        .risk-score {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
            font-size: 0.8rem;
            font-weight: 600;
        }

        .risk-low { background: #d1fae5; color: #065f46; }
        .risk-medium { background: #fef3c7; color: #92400e; }
        .risk-high { background: #fee2e2; color: #991b1b; }

        .actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 1rem;
        }

        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: var(--radius-md);
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }

        .btn-primary {
            background: var(--primary-color);
            color: white;
        }

        .btn-success {
            background: var(--success-color);
            color: white;
        }

        .btn-danger {
            background: var(--danger-color);
            color: white;
        }

        .btn-warning {
            background: var(--warning-color);
            color: white;
        }

        .btn:hover {
            transform: translateY(-1px);
            filter: brightness(110%);
        }

        .bulk-actions {
            background: var(--bg-secondary);
            padding: 1rem;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-md);
            margin-bottom: 1rem;
        }

        .checkbox-container {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }

        .loading {
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
        }

        .empty-state {
            text-align: center;
            padding: 3rem;
            color: var(--text-secondary);
        }

        .keyword-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem;
            border-bottom: 1px solid var(--border-color);
        }

        .keyword-form {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        .form-input {
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            flex: 1;
        }

        .form-select {
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
        }

        @media (max-width: 768px) {
            .content-grid {
                grid-template-columns: 1fr;
            }
            
            .product-header {
                flex-direction: column;
            }
            
            .product-image {
                align-self: center;
                margin-top: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="header">
            <h1><i class="fas fa-check-circle"></i> 商品承認システム</h1>
            <p>AI分析・手動承認・バッチ処理・禁止品フィルター</p>
        </div>

        <!-- 統計カード -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value pending" id="pendingCount">-</div>
                <div class="stat-label">承認待ち</div>
            </div>
            <div class="stat-card">
                <div class="stat-value approved" id="approvedCount">-</div>
                <div class="stat-label">承認済み</div>
            </div>
            <div class="stat-card">
                <div class="stat-value rejected" id="rejectedCount">-</div>
                <div class="stat-label">否認済み</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="todayApproved">-</div>
                <div class="stat-label">本日承認</div>
            </div>
        </div>

        <!-- メインコンテンツ -->
        <div class="content-grid">
            <div class="main-content">
                <!-- バルクアクション -->
                <div class="bulk-actions">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <label class="checkbox-container">
                                <input type="checkbox" id="selectAll">
                                すべて選択
                            </label>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-success" onclick="batchApprove()">
                                <i class="fas fa-check"></i> 一括承認
                            </button>
                            <button class="btn btn-primary" onclick="refreshProducts()">
                                <i class="fas fa-sync-alt"></i> 更新
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 商品リスト -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-list"></i> 承認待ち商品</h3>
                        <span id="productCount">0件</span>
                    </div>
                    <div class="card-content">
                        <div id="productsList">
                            <div class="loading">
                                <i class="fas fa-spinner fa-spin"></i> 商品を読み込み中...
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="sidebar">
                <!-- 禁止キーワード管理 -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-ban"></i> 禁止キーワード</h3>
                    </div>
                    <div class="card-content">
                        <div class="keyword-form">
                            <input type="text" id="newKeyword" class="form-input" placeholder="キーワード">
                            <select id="keywordCategory" class="form-select">
                                <option value="general">一般</option>
                                <option value="prohibited">禁止商品</option>
                                <option value="adult">アダルト</option>
                                <option value="weapon">武器類</option>
                                <option value="counterfeit">偽造品</option>
                            </select>
                            <button class="btn btn-primary" onclick="addKeyword()">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div id="keywordsList">
                            <div class="loading">読み込み中...</div>
                        </div>
                    </div>
                </div>

                <!-- クイックアクション -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-bolt"></i> クイックアクション</h3>
                    </div>
                    <div class="card-content">
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <button class="btn btn-primary" onclick="autoApproveAll()">
                                <i class="fas fa-magic"></i> AI自動承認
                            </button>
                            <button class="btn btn-warning" onclick="markReviewNeeded()">
                                <i class="fas fa-eye"></i> 要確認マーク
                            </button>
                            <button class="btn btn-danger" onclick="rejectHighRisk()">
                                <i class="fas fa-shield-alt"></i> 高リスク否認
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // グローバル変数
        let selectedProducts = new Set();
        let allProducts = [];

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            loadApprovalStats();
            loadPendingProducts();
            loadBannedKeywords();
            
            // 全選択チェックボックス
            document.getElementById('selectAll').addEventListener('change', function() {
                const isChecked = this.checked;
                document.querySelectorAll('.product-checkbox').forEach(checkbox => {
                    checkbox.checked = isChecked;
                    if (isChecked) {
                        selectedProducts.add(checkbox.value);
                    } else {
                        selectedProducts.delete(checkbox.value);
                    }
                });
            });
        });

        // 承認統計読み込み
        async function loadApprovalStats() {
            try {
                const response = await fetch('approval_complete.php?action=get_approval_stats');
                const data = await response.json();
                
                if (data.success) {
                    const stats = data.stats;
                    document.getElementById('pendingCount').textContent = stats.pending || 0;
                    document.getElementById('approvedCount').textContent = stats.approved || 0;
                    document.getElementById('rejectedCount').textContent = stats.rejected || 0;
                    document.getElementById('todayApproved').textContent = stats.today_approved || 0;
                }
            } catch (error) {
                console.error('統計読み込みエラー:', error);
            }
        }

        // 承認待ち商品読み込み
        async function loadPendingProducts() {
            try {
                const response = await fetch('approval_complete.php?action=get_pending_products');
                const data = await response.json();
                
                if (data.success) {
                    allProducts = data.products;
                    displayProducts(data.products);
                    document.getElementById('productCount').textContent = `${data.count}件`;
                } else {
                    document.getElementById('productsList').innerHTML = 
                        '<div class="empty-state"><i class="fas fa-inbox"></i><br>承認待ちの商品がありません</div>';
                }
            } catch (error) {
                console.error('商品読み込みエラー:', error);
                document.getElementById('productsList').innerHTML = 
                    '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><br>読み込みエラーが発生しました</div>';
            }
        }

        // 商品表示
        function displayProducts(products) {
            const container = document.getElementById('productsList');
            
            if (products.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><br>すべての商品が処理済みです</div>';
                return;
            }

            const html = products.map(product => {
                const analysis = product.ai_analysis;
                const riskClass = getRiskClass(analysis.risk_score);
                const recommendation = analysis.recommendation;
                
                return `
                    <div class="product-item">
                        <div class="product-header">
                            <div class="checkbox-container">
                                <input type="checkbox" class="product-checkbox" value="${product.id}" 
                                       onchange="toggleProductSelection('${product.id}')">
                            </div>
                            <div class="product-info">
                                <div class="product-title">${product.title}</div>
                                <div class="product-price">¥${product.price_jpy ? Number(product.price_jpy).toLocaleString() : '未設定'}</div>
                                <div class="product-meta">
                                    ID: ${product.id} | 作成: ${new Date(product.created_at).toLocaleString('ja-JP')}
                                </div>
                            </div>
                            ${product.image_url ? `<img src="${product.image_url}" class="product-image" alt="商品画像">` : ''}
                        </div>
                        
                        <div class="ai-analysis">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span>AI分析結果</span>
                                <span class="risk-score ${riskClass}">リスク: ${analysis.risk_score}点</span>
                            </div>
                            <div style="font-size: 0.9rem; margin-bottom: 0.5rem;">
                                推奨: <strong>${getRecommendationText(recommendation)}</strong> (信頼度: ${analysis.confidence}%)
                            </div>
                            ${analysis.risk_factors.length > 0 ? `
                                <div style="font-size: 0.8rem; color: var(--danger-color);">
                                    問題: ${analysis.risk_factors.join(', ')}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="actions">
                            <button class="btn btn-success" onclick="approveProduct('${product.id}')">
                                <i class="fas fa-check"></i> 承認
                            </button>
                            <button class="btn btn-danger" onclick="rejectProduct('${product.id}')">
                                <i class="fas fa-times"></i> 否認
                            </button>
                            <button class="btn btn-warning" onclick="needsReview('${product.id}')">
                                <i class="fas fa-eye"></i> 要確認
                            </button>
                            <button class="btn btn-primary" onclick="runAIAnalysis('${product.id}')">
                                <i class="fas fa-robot"></i> 再分析
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;
        }

        // リスククラス取得
        function getRiskClass(score) {
            if (score >= 30) return 'risk-high';
            if (score >= 15) return 'risk-medium';
            return 'risk-low';
        }

        // 推奨テキスト取得
        function getRecommendationText(recommendation) {
            const map = {
                'approve': '承認推奨',
                'reject': '否認推奨',
                'review': '手動確認推奨'
            };
            return map[recommendation] || recommendation;
        }

        // 商品選択切り替え
        function toggleProductSelection(productId) {
            if (selectedProducts.has(productId)) {
                selectedProducts.delete(productId);
            } else {
                selectedProducts.add(productId);
            }
        }

        // 商品承認
        async function approveProduct(productId) {
            const reason = prompt('承認理由を入力してください（省略可）:');
            if (reason === null) return;

            try {
                const formData = new FormData();
                formData.append('action', 'approve_product');
                formData.append('product_id', productId);
                formData.append('reason', reason);

                const response = await fetch('approval_complete.php', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (data.success) {
                    showNotification('商品を承認しました', 'success');
                    refreshProducts();
                } else {
                    showNotification(data.error || '承認に失敗しました', 'error');
                }
            } catch (error) {
                console.error('承認エラー:', error);
                showNotification('承認中にエラーが発生しました', 'error');
            }
        }

        // 商品否認
        async function rejectProduct(productId) {
            const reason = prompt('否認理由を入力してください:');
            if (!reason) return;

            try {
                const formData = new FormData();
                formData.append('action', 'reject_product');
                formData.append('product_id', productId);
                formData.append('reason', reason);

                const response = await fetch('approval_complete.php', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (data.success) {
                    showNotification('商品を否認しました', 'success');
                    refreshProducts();
                } else {
                    showNotification(data.error || '否認に失敗しました', 'error');
                }
            } catch (error) {
                console.error('否認エラー:', error);
                showNotification('否認中にエラーが発生しました', 'error');
            }
        }

        // バッチ承認
        async function batchApprove() {
            if (selectedProducts.size === 0) {
                alert('承認する商品を選択してください');
                return;
            }

            if (!confirm(`選択された${selectedProducts.size}件の商品を一括承認しますか？`)) {
                return;
            }

            try {
                const formData = new FormData();
                formData.append('action', 'batch_approve');
                formData.append('product_ids', JSON.stringify(Array.from(selectedProducts)));

                const response = await fetch('approval_complete.php', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (data.success) {
                    showNotification(data.message, 'success');
                    selectedProducts.clear();
                    refreshProducts();
                } else {
                    showNotification(data.error || 'バッチ承認に失敗しました', 'error');
                }
            } catch (error) {
                console.error('バッチ承認エラー:', error);
                showNotification('バッチ承認中にエラーが発生しました', 'error');
            }
        }

        // AI分析実行
        async function runAIAnalysis(productId) {
            try {
                const formData = new FormData();
                formData.append('action', 'ai_analyze_product');
                formData.append('product_id', productId);

                const response = await fetch('approval_complete.php', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (data.success) {
                    showNotification('AI分析を実行しました', 'success');
                    refreshProducts();
                } else {
                    showNotification(data.error || 'AI分析に失敗しました', 'error');
                }
            } catch (error) {
                console.error('AI分析エラー:', error);
                showNotification('AI分析中にエラーが発生しました', 'error');
            }
        }

        // 禁止キーワード読み込み
        async function loadBannedKeywords() {
            try {
                const response = await fetch('approval_complete.php?action=get_banned_keywords');
                const data = await response.json();
                
                if (data.success) {
                    displayBannedKeywords(data.keywords);
                }
            } catch (error) {
                console.error('キーワード読み込みエラー:', error);
            }
        }

        // 禁止キーワード表示
        function displayBannedKeywords(keywords) {
            const container = document.getElementById('keywordsList');
            
            if (keywords.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">キーワードが登録されていません</div>';
                return;
            }

            const html = keywords.map(keyword => `
                <div class="keyword-item">
                    <div>
                        <strong>${keyword.keyword}</strong>
                        <small style="color: var(--text-secondary);">(${keyword.category})</small>
                    </div>
                    <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                            onclick="removeKeyword('${keyword.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');

            container.innerHTML = html;
        }

        // キーワード追加
        async function addKeyword() {
            const keyword = document.getElementById('newKeyword').value.trim();
            const category = document.getElementById('keywordCategory').value;
            
            if (!keyword) {
                alert('キーワードを入力してください');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('action', 'add_banned_keyword');
                formData.append('keyword', keyword);
                formData.append('category', category);

                const response = await fetch('approval_complete.php', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('newKeyword').value = '';
                    showNotification('キーワードを追加しました', 'success');
                    loadBannedKeywords();
                } else {
                    showNotification(data.error || 'キーワード追加に失敗しました', 'error');
                }
            } catch (error) {
                console.error('キーワード追加エラー:', error);
                showNotification('キーワード追加中にエラーが発生しました', 'error');
            }
        }

        // キーワード削除
        async function removeKeyword(keywordId) {
            if (!confirm('このキーワードを削除しますか？')) {
                return;
            }

            try {
                const formData = new FormData();
                formData.append('action', 'remove_banned_keyword');
                formData.append('keyword_id', keywordId);

                const response = await fetch('approval_complete.php', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (data.success) {
                    showNotification('キーワードを削除しました', 'success');
                    loadBannedKeywords();
                } else {
                    showNotification(data.error || 'キーワード削除に失敗しました', 'error');
                }
            } catch (error) {
                console.error('キーワード削除エラー:', error);
                showNotification('キーワード削除中にエラーが発生しました', 'error');
            }
        }

        // 商品リスト更新
        function refreshProducts() {
            loadApprovalStats();
            loadPendingProducts();
            selectedProducts.clear();
            document.getElementById('selectAll').checked = false;
        }

        // 通知表示
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem;
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-md);
                z-index: 1000;
                min-width: 300px;
            `;
            
            const colors = {
                success: { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46' },
                error: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
                warning: { bg: '#fef3c7', border: '#fbbf24', text: '#92400e' },
                info: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' }
            };
            
            const color = colors[type] || colors.info;
            notification.style.background = color.bg;
            notification.style.border = `1px solid ${color.border}`;
            notification.style.color = color.text;
            
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
                    <span>${message}</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }

        // クイックアクション関数
        function autoApproveAll() {
            const lowRiskProducts = allProducts.filter(p => p.ai_analysis.risk_score < 15);
            if (lowRiskProducts.length === 0) {
                alert('自動承認可能な商品がありません');
                return;
            }
            
            if (confirm(`${lowRiskProducts.length}件の低リスク商品を自動承認しますか？`)) {
                const productIds = lowRiskProducts.map(p => p.id);
                selectedProducts = new Set(productIds);
                batchApprove();
            }
        }

        function markReviewNeeded() {
            alert('要確認マーク機能は開発中です');
        }

        function rejectHighRisk() {
            const highRiskProducts = allProducts.filter(p => p.ai_analysis.risk_score >= 30);
            if (highRiskProducts.length === 0) {
                alert('高リスク商品がありません');
                return;
            }
            
            if (confirm(`${highRiskProducts.length}件の高リスク商品を一括否認しますか？`)) {
                // 個別に否認処理を実行
                highRiskProducts.forEach(product => {
                    rejectProduct(product.id);
                });
            }
        }

        console.log('商品承認システム初期化完了');
    </script>
</body>
</html>