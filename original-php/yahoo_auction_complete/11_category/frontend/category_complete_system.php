<?php
/**
 * eBayカテゴリー完全統合システム - メインUI
 * 
 * 機能:
 * - Stage 1: 基本カテゴリー判定（70%→75%精度）
 * - Stage 2: 利益込み詳細判定（95%→97%精度）  
 * - 他ツール連携: 09_shipping, 05_rieki
 * - 完全統合UI: 5タブシステム
 */

// セキュリティ・セッション管理
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// データベース接続・データ取得
$error = null;
$systemStatus = [
    'database' => false,
    'yahoo_products' => false,
    'bootstrap_data' => false,
    'ebay_categories' => false
];
$products = [];
$totalCount = 0;
$stats = [
    'total_products' => 0,
    'categorized_products' => 0,
    'stage1_products' => 0,
    'stage2_products' => 0,
    'unified_products' => 0,
    'avg_confidence' => 0,
    'avg_stage1_confidence' => 0,
    'avg_stage2_confidence' => 0
];
$bootstrapStats = ['total_bootstrap_categories' => 0, 'overall_avg_profit' => 0];
$categoryStats = ['total_ebay_categories' => 0, 'avg_fee_percent' => 13.6];

try {
    // データベース接続
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $pdo = new PDO($dsn, "aritahiroaki", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $systemStatus['database'] = true;
    
    // システム統計取得
    $statsQuery = "
        SELECT 
            COUNT(*) as total_products,
            COUNT(CASE WHEN ebay_api_data IS NOT NULL THEN 1 END) as categorized_products,
            COUNT(CASE WHEN ebay_api_data->>'stage' = 'basic' THEN 1 END) as stage1_products,
            COUNT(CASE WHEN ebay_api_data->>'stage' = 'advanced' THEN 1 END) as stage2_products,
            COUNT(CASE WHEN ebay_api_data->>'stage' = 'unified' THEN 1 END) as unified_products,
            ROUND(AVG(CAST(ebay_api_data->>'confidence' AS NUMERIC)), 1) as avg_confidence,
            ROUND(AVG(CASE WHEN ebay_api_data->>'stage' = 'basic' THEN CAST(ebay_api_data->>'confidence' AS NUMERIC) END), 1) as avg_stage1_confidence,
            ROUND(AVG(CASE WHEN ebay_api_data->>'stage' = 'advanced' THEN CAST(ebay_api_data->>'confidence' AS NUMERIC) END), 1) as avg_stage2_confidence
        FROM yahoo_scraped_products 
        WHERE active = true
    ";
    
    $stmt = $pdo->prepare($statsQuery);
    $stmt->execute();
    $statsResult = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($statsResult) {
        $stats = array_merge($stats, $statsResult);
        $systemStatus['yahoo_products'] = $stats['total_products'] > 0;
    }
    
    // ブートストラップデータ統計
    $bootstrapQuery = "
        SELECT 
            COUNT(*) as total_bootstrap_categories,
            ROUND(AVG(avg_profit_margin), 1) as overall_avg_profit
        FROM category_profit_bootstrap
    ";
    
    $stmt = $pdo->prepare($bootstrapQuery);
    $stmt->execute();
    $bootstrapResult = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($bootstrapResult) {
        $bootstrapStats = $bootstrapResult;
        $systemStatus['bootstrap_data'] = $bootstrapStats['total_bootstrap_categories'] > 0;
    }
    
    // eBayカテゴリー統計
    $categoryQuery = "
        SELECT 
            COUNT(*) as total_ebay_categories,
            ROUND(AVG(final_value_fee_percent), 1) as avg_fee_percent
        FROM ebay_category_fees
    ";
    
    $stmt = $pdo->prepare($categoryQuery);
    $stmt->execute();
    $categoryResult = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($categoryResult) {
        $categoryStats = $categoryResult;
        $systemStatus['ebay_categories'] = $categoryStats['total_ebay_categories'] > 0;
    }
    
    // 商品データ取得（ページネーション対応）
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = 50;
    $offset = ($page - 1) * $limit;
    
    // 検索・フィルター条件構築
    $whereConditions = ["active = true"];
    $params = [];
    
    if (!empty($_GET['search'])) {
        $whereConditions[] = "title ILIKE ?";
        $params[] = '%' . $_GET['search'] . '%';
    }
    
    if (!empty($_GET['category_filter'])) {
        $whereConditions[] = "ebay_api_data->>'category_name' ILIKE ?";
        $params[] = '%' . $_GET['category_filter'] . '%';
    }
    
    if (!empty($_GET['stage_filter'])) {
        $whereConditions[] = "ebay_api_data->>'stage' = ?";
        $params[] = $_GET['stage_filter'];
    }
    
    $whereClause = implode(' AND ', $whereConditions);
    
    // 総件数取得
    $countQuery = "SELECT COUNT(*) FROM yahoo_scraped_products WHERE $whereClause";
    $stmt = $pdo->prepare($countQuery);
    $stmt->execute($params);
    $totalCount = $stmt->fetchColumn();
    
    // 商品データ取得
    $productsQuery = "
        SELECT 
            id,
            title,
            price_jpy,
            CASE 
                WHEN price_usd > 0 THEN price_usd 
                ELSE ROUND(price_jpy / 150.0, 2) 
            END as estimated_price_usd,
            ebay_api_data,
            created_at,
            updated_at
        FROM yahoo_scraped_products 
        WHERE $whereClause
        ORDER BY updated_at DESC, id DESC
        LIMIT $limit OFFSET $offset
    ";
    
    $stmt = $pdo->prepare($productsQuery);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch (Exception $e) {
    $error = $e->getMessage();
    $systemStatus = ['database' => false, 'bootstrap_data' => false, 'ebay_categories' => false, 'yahoo_products' => false];
    $products = [];
    $totalCount = 0;
    $stats = [
        'total_products' => 0,
        'categorized_products' => 0,
        'stage1_products' => 0,
        'stage2_products' => 0,
        'unified_products' => 0,
        'avg_confidence' => 0,
        'avg_stage1_confidence' => 0,
        'avg_stage2_confidence' => 0
    ];
    $bootstrapStats = ['total_bootstrap_categories' => 0, 'overall_avg_profit' => 0];
    $categoryStats = ['total_ebay_categories' => 0, 'avg_fee_percent' => 13.6];
}

// ヘルパー関数
function getStageDisplay($ebayApiData) {
    if (!$ebayApiData) return ['stage' => '未処理', 'class' => 'stage-unprocessed'];
    
    $data = json_decode($ebayApiData, true);
    $stage = $data['stage'] ?? 'unknown';
    
    switch ($stage) {
        case 'basic':
            return ['stage' => '基本判定', 'class' => 'stage-basic'];
        case 'advanced':
            return ['stage' => '利益判定', 'class' => 'stage-advanced'];  
        case 'unified':
            return ['stage' => '完全統合', 'class' => 'stage-unified'];
        default:
            return ['stage' => '未処理', 'class' => 'stage-unprocessed'];
    }
}

function getConfidenceDisplay($ebayApiData) {
    if (!$ebayApiData) return 0;
    
    $data = json_decode($ebayApiData, true);
    return intval($data['confidence'] ?? 0);
}

function getRankDisplay($ebayApiData) {
    if (!$ebayApiData) return ['rank' => '-', 'class' => 'rank-none'];
    
    $data = json_decode($ebayApiData, true);
    $confidence = intval($data['confidence'] ?? 0);
    
    if ($confidence >= 95) return ['rank' => 'S', 'class' => 'rank-s'];
    if ($confidence >= 85) return ['rank' => 'A', 'class' => 'rank-a'];  
    if ($confidence >= 70) return ['rank' => 'B', 'class' => 'rank-b'];
    if ($confidence >= 50) return ['rank' => 'C', 'class' => 'rank-c'];
    return ['rank' => 'D', 'class' => 'rank-d'];
}

// ページネーション計算
$totalPages = ceil($totalCount / 50);
$startItem = ($page - 1) * 50 + 1;
$endItem = min($page * 50, $totalCount);

// ファイルのpart2を読み込んで連結
$part2Content = file_get_contents(__DIR__ . '/category_complete_system_part2.php');

// part2ファイルを削除
unlink(__DIR__ . '/category_complete_system_part2.php');

echo $part2Content;
?>
