<?php
/**
 * ダッシュボードAPI
 * 在庫管理システムのリアルタイム統計データ提供
 */

require_once '../config.php';
require_once '../includes/ApiResponse.php';
require_once '../includes/InventoryManager.php';

// セキュリティヘッダー設定
ApiResponse::setSecurityHeaders();

// OPTIONS リクエスト処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $manager = new InventoryManager();
    $action = $_GET['action'] ?? 'overview';
    
    switch ($action) {
        case 'overview':
            handleOverview($manager);
            break;
            
        case 'stats':
            handleStats($manager);
            break;
            
        case 'health':
            handleHealth($manager);
            break;
            
        case 'products':
            handleProducts($manager);
            break;
            
        case 'history':
            handleHistory($manager);
            break;
            
        default:
            ApiResponse::notFound('指定されたアクションが見つかりません');
    }
    
} catch (Exception $e) {
    ApiResponse::serverError('ダッシュボードデータの取得に失敗しました', $e->getMessage());
}

/**
 * システム概要データ取得
 */
function handleOverview($manager) {
    $stats = $manager->getSystemStats();
    $health = $manager->healthCheck();
    
    if (!$stats['success'] || !$health['success']) {
        ApiResponse::error('概要データの取得に失敗しました');
        return;
    }
    
    $overview = [
        'system_status' => $health['health']['system_status'],
        'monitored_products' => $stats['stats']['monitored_products'],
        'total_products' => $stats['stats']['total_products'],
        'today_stock_changes' => $stats['stats']['today_updates']['stock_changes'],
        'today_price_changes' => $stats['stats']['today_updates']['price_changes'],
        'platform_breakdown' => $stats['stats']['by_platform'],
        'url_status_breakdown' => $stats['stats']['url_status'],
        'last_updated' => $stats['stats']['last_updated']
    ];
    
    ApiResponse::success($overview, 'システム概要データを取得しました');
}

/**
 * 詳細統計データ取得
 */
function handleStats($manager) {
    $period = $_GET['period'] ?? '24h';
    
    $statsResult = $manager->getSystemStats();
    
    if (!$statsResult['success']) {
        ApiResponse::error('統計データの取得に失敗しました');
        return;
    }
    
    // 期間別の詳細統計を追加
    $db = new Database();
    
    // 時間別の履歴データ取得
    $hourlyStats = getHourlyStats($db, $period);
    $errorStats = getErrorStats($db, $period);
    
    $detailedStats = array_merge($statsResult['stats'], [
        'period' => $period,
        'hourly_activity' => $hourlyStats,
        'error_summary' => $errorStats,
        'performance_metrics' => getPerformanceMetrics($db, $period)
    ]);
    
    ApiResponse::success($detailedStats, '詳細統計データを取得しました');
}

/**
 * ヘルスチェックデータ取得
 */
function handleHealth($manager) {
    $health = $manager->healthCheck();
    
    if (!$health['success']) {
        ApiResponse::error('ヘルスチェックに失敗しました');
        return;
    }
    
    ApiResponse::success($health['health'], 'システムヘルス情報を取得しました');
}

/**
 * 商品一覧データ取得
 */
function handleProducts($manager) {
    $validationRules = [
        'page' => ['type' => 'integer', 'min' => 1],
        'limit' => ['type' => 'integer', 'min' => 1, 'max' => 100],
        'platform' => ['type' => 'string', 'in' => ['yahoo', 'amazon', 'ebay']],
        'status' => ['type' => 'string', 'in' => ['active', 'dead', 'changed']]
    ];
    
    $data = ApiResponse::validateRequest($validationRules);
    
    $page = $data['page'] ?? 1;
    $limit = $data['limit'] ?? 20;
    $platform = $data['platform'] ?? null;
    $offset = ($page - 1) * $limit;
    
    $products = $manager->getMonitoringProducts($platform, $limit, $offset);
    
    if (!$products['success']) {
        ApiResponse::error('商品データの取得に失敗しました');
        return;
    }
    
    ApiResponse::paginated(
        $products['products'],
        $products['total_count'],
        $products['current_page'],
        $limit,
        '監視商品一覧を取得しました'
    );
}

/**
 * 履歴データ取得
 */
function handleHistory($manager) {
    $validationRules = [
        'product_id' => ['type' => 'integer', 'min' => 1],
        'limit' => ['type' => 'integer', 'min' => 1, 'max' => 100],
        'change_type' => ['type' => 'string', 'in' => ['stock_change', 'price_change', 'both']]
    ];
    
    $data = ApiResponse::validateRequest($validationRules);
    
    $productId = $data['product_id'] ?? null;
    $limit = $data['limit'] ?? 50;
    $changeType = $data['change_type'] ?? null;
    
    $db = new Database();
    
    $whereClause = "1=1";
    $params = [];
    
    if ($productId) {
        $whereClause .= " AND product_id = ?";
        $params[] = $productId;
    }
    
    if ($changeType) {
        $whereClause .= " AND change_type = ?";
        $params[] = $changeType;
    }
    
    $sql = "SELECT 
                sh.*,
                ysp.title as product_title
            FROM stock_history sh
            LEFT JOIN yahoo_scraped_products ysp ON sh.product_id = ysp.id
            WHERE {$whereClause}
            ORDER BY sh.created_at DESC
            LIMIT ?";
    
    $params[] = $limit;
    
    $history = $db->select($sql, $params);
    
    ApiResponse::success($history, '履歴データを取得しました');
}

/**
 * 時間別統計取得
 */
function getHourlyStats($db, $period) {
    $hours = $period === '7d' ? 24 * 7 : 24;
    
    $sql = "SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour,
                change_type,
                COUNT(*) as count
            FROM stock_history 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            GROUP BY hour, change_type
            ORDER BY hour";
    
    return $db->select($sql, [$hours]);
}

/**
 * エラー統計取得
 */
function getErrorStats($db, $period) {
    $hours = $period === '7d' ? 24 * 7 : 24;
    
    // エラーテーブルがない場合の代替処理
    try {
        $sql = "SELECT 
                    error_type,
                    COUNT(*) as count,
                    MAX(created_at) as last_occurrence
                FROM inventory_errors 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                GROUP BY error_type
                ORDER BY count DESC";
        
        return $db->select($sql, [$hours]);
    } catch (Exception $e) {
        // エラーテーブルが存在しない場合は空配列を返す
        return [];
    }
}

/**
 * パフォーマンス指標取得
 */
function getPerformanceMetrics($db, $period) {
    $hours = $period === '7d' ? 24 * 7 : 24;
    
    try {
        $sql = "SELECT 
                    AVG(TIMESTAMPDIFF(SECOND, execution_start, execution_end)) as avg_execution_time,
                    COUNT(*) as total_executions,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_executions,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_executions
                FROM inventory_execution_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)";
        
        $result = $db->selectRow($sql, [$hours]);
        
        if ($result && $result['total_executions'] > 0) {
            $result['success_rate'] = round(($result['successful_executions'] / $result['total_executions']) * 100, 2);
            $result['error_rate'] = round(($result['failed_executions'] / $result['total_executions']) * 100, 2);
        } else {
            $result = [
                'avg_execution_time' => 0,
                'total_executions' => 0,
                'successful_executions' => 0,
                'failed_executions' => 0,
                'success_rate' => 100,
                'error_rate' => 0
            ];
        }
        
        return $result;
    } catch (Exception $e) {
        return [
            'avg_execution_time' => 0,
            'total_executions' => 0,
            'successful_executions' => 0,
            'failed_executions' => 0,
            'success_rate' => 100,
            'error_rate' => 0
        ];
    }
}
?>