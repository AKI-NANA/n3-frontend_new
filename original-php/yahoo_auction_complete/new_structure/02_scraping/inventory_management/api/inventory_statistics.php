<?php
/**
 * 在庫管理統計API
 * 
 * エンドポイント:
 * - GET /api/inventory_statistics.php?action=dashboard
 * - GET /api/inventory_statistics.php?action=price_history&product_id=123
 * - GET /api/inventory_statistics.php?action=platform_stats
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", "postgres", "Kn240914");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $action = $_GET['action'] ?? 'dashboard';
    
    switch ($action) {
        case 'dashboard':
            // ダッシュボード統計
            $stats = getDashboardStatistics($pdo);
            sendResponse(true, $stats);
            break;
            
        case 'price_history':
            // 価格変動履歴
            $productId = $_GET['product_id'] ?? null;
            $history = getPriceHistory($pdo, $productId);
            sendResponse(true, $history);
            break;
            
        case 'platform_stats':
            // モール別統計
            $platformStats = getPlatformStatistics($pdo);
            sendResponse(true, $platformStats);
            break;
            
        case 'recent_changes':
            // 最近の変更
            $limit = (int)($_GET['limit'] ?? 20);
            $recentChanges = getRecentChanges($pdo, $limit);
            sendResponse(true, $recentChanges);
            break;
            
        default:
            sendResponse(false, null, '無効なアクションです', 400);
    }
    
} catch (Exception $e) {
    sendResponse(false, null, $e->getMessage(), 500);
}

/**
 * ダッシュボード統計取得
 */
function getDashboardStatistics($pdo) {
    // 管理中商品数
    $stmt = $pdo->query("
        SELECT COUNT(*) as total
        FROM inventory_management
        WHERE monitoring_enabled = true
    ");
    $totalManaged = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // 今日のチェック完了数
    $stmt = $pdo->query("
        SELECT COUNT(DISTINCT product_id) as checked
        FROM auto_price_update_history
        WHERE DATE(created_at) = CURRENT_DATE
    ");
    $todayChecked = $stmt->fetch(PDO::FETCH_ASSOC)['checked'];
    
    // 今日の価格変更数
    $stmt = $pdo->query("
        SELECT COUNT(*) as changes
        FROM auto_price_update_history
        WHERE DATE(created_at) = CURRENT_DATE
    ");
    $todayChanges = $stmt->fetch(PDO::FETCH_ASSOC)['changes'];
    
    // モール別変更数
    $stmt = $pdo->query("
        SELECT 
            COALESCE(h.platform, 'ebay') as platform,
            COUNT(*) as change_count
        FROM auto_price_update_history h
        WHERE DATE(h.created_at) = CURRENT_DATE
        GROUP BY h.platform
    ");
    $platformChanges = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 価格統計
    $stmt = $pdo->query("
        SELECT 
            COUNT(*) as total_products,
            AVG(max_price_jpy) as avg_max_price,
            AVG(min_price_jpy) as avg_min_price,
            SUM(total_changes) as total_changes
        FROM price_change_statistics
    ");
    $priceStats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return [
        'summary' => [
            'total_managed' => (int)$totalManaged,
            'today_checked' => (int)$todayChecked,
            'today_changes' => (int)$todayChanges
        ],
        'platform_changes' => $platformChanges,
        'price_statistics' => $priceStats,
        'last_updated' => date('Y-m-d H:i:s')
    ];
}

/**
 * 価格変動履歴取得
 */
function getPriceHistory($pdo, $productId = null) {
    if ($productId) {
        // 特定商品の履歴
        $stmt = $pdo->prepare("
            SELECT 
                h.*,
                ysp.title,
                s.total_changes,
                s.max_price_jpy,
                s.min_price_jpy
            FROM auto_price_update_history h
            JOIN yahoo_scraped_products ysp ON h.product_id = ysp.id
            LEFT JOIN price_change_statistics s ON h.product_id = s.product_id
            WHERE h.product_id = ?
            ORDER BY h.created_at DESC
            LIMIT 50
        ");
        $stmt->execute([$productId]);
    } else {
        // 全体の最近の履歴
        $stmt = $pdo->query("
            SELECT 
                h.*,
                ysp.title
            FROM auto_price_update_history h
            JOIN yahoo_scraped_products ysp ON h.product_id = ysp.id
            ORDER BY h.created_at DESC
            LIMIT 100
        ");
    }
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * モール別統計取得
 */
function getPlatformStatistics($pdo) {
    $stmt = $pdo->query("
        SELECT 
            lp.platform,
            COUNT(*) as total_products,
            SUM(CASE WHEN lp.sync_status = 'synced' THEN 1 ELSE 0 END) as synced,
            SUM(CASE WHEN lp.sync_status = 'sync_failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN lp.sync_status = 'pending' THEN 1 ELSE 0 END) as pending,
            MAX(lp.last_sync_at) as last_sync
        FROM listing_platforms lp
        WHERE lp.listing_status = 'active'
        GROUP BY lp.platform
    ");
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * 最近の変更取得
 */
function getRecentChanges($pdo, $limit = 20) {
    $stmt = $pdo->prepare("
        SELECT 
            h.product_id,
            h.old_price_jpy,
            h.new_price_jpy,
            h.new_price_usd,
            h.platform,
            h.created_at,
            ysp.title,
            ysp.ebay_item_id,
            ROUND(((h.new_price_jpy - h.old_price_jpy)::numeric / h.old_price_jpy * 100), 2) as change_percent
        FROM auto_price_update_history h
        JOIN yahoo_scraped_products ysp ON h.product_id = ysp.id
        ORDER BY h.created_at DESC
        LIMIT ?
    ");
    $stmt->execute([$limit]);
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * レスポンス送信
 */
function sendResponse($success, $data = null, $message = '', $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
?>
