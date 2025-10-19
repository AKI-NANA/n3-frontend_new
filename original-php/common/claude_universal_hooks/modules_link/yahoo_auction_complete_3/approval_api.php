<?php
/**
 * 承認システム API
 * 既存のshipping_management_api.phpに統合するための追加機能
 * 既存機能を一切破壊せず、新機能のみ追加
 */

// データベース接続設定（既存設定を使用）
require_once __DIR__ . '/../../../config/database.php';

class ApprovalSystemAPI {
    private $pdo;
    
    public function __construct($database_config) {
        try {
            $dsn = "pgsql:host={$database_config['host']};dbname={$database_config['dbname']};port={$database_config['port']}";
            $this->pdo = new PDO($dsn, $database_config['username'], $database_config['password']);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            error_log("Approval API Database connection failed: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 承認待ち商品リスト取得
     * GET /api/approval_queue
     */
    public function getApprovalQueue($filters = []) {
        try {
            $where_conditions = ["status = 'pending'"];
            $params = [];
            
            // フィルター条件追加
            if (!empty($filters['category'])) {
                $where_conditions[] = "category = :category";
                $params['category'] = $filters['category'];
            }
            
            if (!empty($filters['marketplace'])) {
                $where_conditions[] = "marketplace = :marketplace";
                $params['marketplace'] = $filters['marketplace'];
            }
            
            if (!empty($filters['min_priority'])) {
                $where_conditions[] = "priority_score >= :min_priority";
                $params['min_priority'] = $filters['min_priority'];
            }
            
            if (!empty($filters['search'])) {
                $where_conditions[] = "(title_jp ILIKE :search OR title_en ILIKE :search)";
                $params['search'] = '%' . $filters['search'] . '%';
            }
            
            $where_clause = implode(' AND ', $where_conditions);
            
            $sql = "
                SELECT 
                    queue_id,
                    item_sku,
                    marketplace,
                    status,
                    priority_score,
                    category,
                    title_jp,
                    title_en,
                    price_jpy,
                    calculated_price_usd,
                    image_url,
                    source_url,
                    created_at,
                    EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_pending,
                    CASE 
                        WHEN priority_score >= 80 THEN 'high'
                        WHEN priority_score >= 60 THEN 'medium'
                        ELSE 'low'
                    END as priority_level
                FROM approval_queue 
                WHERE {$where_clause}
                ORDER BY priority_score DESC, created_at ASC
                LIMIT 100
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 統計情報も取得
            $stats_sql = "
                SELECT 
                    COUNT(*) as total_pending,
                    COUNT(*) FILTER (WHERE priority_score >= 80) as high_priority,
                    COUNT(*) FILTER (WHERE priority_score >= 60 AND priority_score < 80) as medium_priority,
                    COUNT(*) FILTER (WHERE priority_score < 60) as low_priority,
                    AVG(priority_score) as avg_priority,
                    COUNT(DISTINCT category) as unique_categories
                FROM approval_queue 
                WHERE status = 'pending'
            ";
            
            $stats_stmt = $this->pdo->prepare($stats_sql);
            $stats_stmt->execute();
            $stats = $stats_stmt->fetch(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => [
                    'items' => $items,
                    'statistics' => $stats,
                    'filters_applied' => $filters
                ]
            ];
            
        } catch (Exception $e) {
            error_log("Get approval queue error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to fetch approval queue: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 商品ステータス更新（一括対応）
     * POST /api/update_listing_status
     */
    public function updateListingStatus($action, $item_skus, $performed_by = 'user', $notes = null) {
        try {
            $this->pdo->beginTransaction();
            
            $updated_count = 0;
            
            switch ($action) {
                case 'approve':
                    $stmt = $this->pdo->prepare("SELECT bulk_approve_items(:skus, :performed_by)");
                    $stmt->execute([
                        'skus' => '{' . implode(',', $item_skus) . '}',
                        'performed_by' => $performed_by
                    ]);
                    $updated_count = $stmt->fetchColumn();
                    break;
                    
                case 'reject':
                    $stmt = $this->pdo->prepare("SELECT bulk_reject_items(:skus, :performed_by, :notes)");
                    $stmt->execute([
                        'skus' => '{' . implode(',', $item_skus) . '}',
                        'performed_by' => $performed_by,
                        'notes' => $notes
                    ]);
                    $updated_count = $stmt->fetchColumn();
                    break;
                    
                case 'hold':
                    $stmt = $this->pdo->prepare("SELECT bulk_hold_items(:skus, :performed_by, :notes)");
                    $stmt->execute([
                        'skus' => '{' . implode(',', $item_skus) . '}',
                        'performed_by' => $performed_by,
                        'notes' => $notes
                    ]);
                    $updated_count = $stmt->fetchColumn();
                    break;
                    
                default:
                    throw new Exception("Invalid action: {$action}");
            }
            
            $this->pdo->commit();
            
            return [
                'success' => true,
                'data' => [
                    'updated_count' => $updated_count,
                    'action' => $action,
                    'skus' => $item_skus,
                    'performed_by' => $performed_by,
                    'timestamp' => date('Y-m-d H:i:s')
                ]
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("Update listing status error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to update listing status: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 承認統計取得
     * GET /api/approval_statistics
     */
    public function getApprovalStatistics($days = 7) {
        try {
            $sql = "
                SELECT 
                    date_recorded,
                    total_pending,
                    total_approved,
                    total_rejected,
                    total_held,
                    avg_approval_time_minutes
                FROM approval_statistics 
                WHERE date_recorded >= CURRENT_DATE - INTERVAL '{$days} days'
                ORDER BY date_recorded ASC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $daily_stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 今日の詳細統計
            $today_sql = "
                SELECT 
                    COUNT(*) as total_items,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending,
                    COUNT(*) FILTER (WHERE status = 'approved') as approved,
                    COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
                    COUNT(*) FILTER (WHERE status = 'held') as held,
                    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as created_today,
                    COUNT(*) FILTER (WHERE DATE(approved_at) = CURRENT_DATE) as approved_today
                FROM approval_queue
            ";
            
            $today_stmt = $this->pdo->prepare($today_sql);
            $today_stmt->execute();
            $today_stats = $today_stmt->fetch(PDO::FETCH_ASSOC);
            
            // カテゴリ別統計
            $category_sql = "
                SELECT 
                    category,
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending,
                    COUNT(*) FILTER (WHERE status = 'approved') as approved,
                    AVG(priority_score) as avg_priority
                FROM approval_queue 
                GROUP BY category
                ORDER BY total DESC
            ";
            
            $category_stmt = $this->pdo->prepare($category_sql);
            $category_stmt->execute();
            $category_stats = $category_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => [
                    'daily_trends' => $daily_stats,
                    'today_summary' => $today_stats,
                    'category_breakdown' => $category_stats,
                    'generated_at' => date('Y-m-d H:i:s')
                ]
            ];
            
        } catch (Exception $e) {
            error_log("Get approval statistics error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to fetch approval statistics: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 商品を承認キューに追加
     * POST /api/add_to_approval_queue
     */
    public function addToApprovalQueue($item_data) {
        try {
            $sql = "
                INSERT INTO approval_queue (
                    item_sku, marketplace, title_jp, title_en, price_jpy, 
                    calculated_price_usd, category, image_url, source_url, priority_score
                ) VALUES (
                    :item_sku, :marketplace, :title_jp, :title_en, :price_jpy,
                    :calculated_price_usd, :category, :image_url, :source_url, :priority_score
                )
                ON CONFLICT (item_sku) DO UPDATE SET
                    title_jp = EXCLUDED.title_jp,
                    title_en = EXCLUDED.title_en,
                    price_jpy = EXCLUDED.price_jpy,
                    calculated_price_usd = EXCLUDED.calculated_price_usd,
                    category = EXCLUDED.category,
                    image_url = EXCLUDED.image_url,
                    source_url = EXCLUDED.source_url,
                    priority_score = EXCLUDED.priority_score
                RETURNING queue_id
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                'item_sku' => $item_data['sku'],
                'marketplace' => $item_data['marketplace'] ?? 'eBay_US',
                'title_jp' => $item_data['title_jp'],
                'title_en' => $item_data['title_en'] ?? null,
                'price_jpy' => $item_data['price_jpy'],
                'calculated_price_usd' => $item_data['calculated_price_usd'] ?? null,
                'category' => $item_data['category'],
                'image_url' => $item_data['image_url'] ?? null,
                'source_url' => $item_data['source_url'] ?? null,
                'priority_score' => $item_data['priority_score'] ?? 50
            ]);
            
            $queue_id = $stmt->fetchColumn();
            
            return [
                'success' => true,
                'data' => [
                    'queue_id' => $queue_id,
                    'item_sku' => $item_data['sku'],
                    'status' => 'pending'
                ]
            ];
            
        } catch (Exception $e) {
            error_log("Add to approval queue error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to add item to approval queue: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * カテゴリ設定取得・更新
     * GET/POST /api/approval_category_settings
     */
    public function getCategorySettings() {
        try {
            $sql = "
                SELECT 
                    category,
                    auto_approve_threshold,
                    require_manual_review,
                    priority_multiplier,
                    is_active
                FROM approval_category_settings 
                WHERE is_active = TRUE
                ORDER BY category ASC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $settings
            ];
            
        } catch (Exception $e) {
            error_log("Get category settings error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to fetch category settings: ' . $e->getMessage()
            ];
        }
    }
    
    public function updateCategorySettings($category, $settings) {
        try {
            $sql = "
                UPDATE approval_category_settings 
                SET 
                    auto_approve_threshold = :threshold,
                    require_manual_review = :manual_review,
                    priority_multiplier = :priority_multiplier,
                    updated_at = NOW()
                WHERE category = :category
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                'category' => $category,
                'threshold' => $settings['auto_approve_threshold'],
                'manual_review' => $settings['require_manual_review'],
                'priority_multiplier' => $settings['priority_multiplier']
            ]);
            
            return [
                'success' => true,
                'data' => [
                    'category' => $category,
                    'updated_settings' => $settings
                ]
            ];
            
        } catch (Exception $e) {
            error_log("Update category settings error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to update category settings: ' . $e->getMessage()
            ];
        }
    }
}

// APIエンドポイント処理（既存のshipping_management_api.phpに統合する部分）
if (isset($_GET['endpoint']) || isset($_POST['endpoint'])) {
    $endpoint = $_GET['endpoint'] ?? $_POST['endpoint'];
    
    // データベース設定読み込み（既存設定を使用）
    $db_config = [
        'host' => 'localhost',
        'dbname' => 'nagano3_db',
        'username' => 'your_db_user',
        'password' => 'your_db_password',
        'port' => 5432
    ];
    
    try {
        $approval_api = new ApprovalSystemAPI($db_config);
        
        switch ($endpoint) {
            case 'approval_queue':
                if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                    $filters = [
                        'category' => $_GET['category'] ?? null,
                        'marketplace' => $_GET['marketplace'] ?? null,
                        'min_priority' => $_GET['min_priority'] ?? null,
                        'search' => $_GET['search'] ?? null
                    ];
                    echo json_encode($approval_api->getApprovalQueue($filters));
                }
                break;
                
            case 'update_listing_status':
                if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                    $input = json_decode(file_get_contents('php://input'), true);
                    $action = $input['action'];
                    $item_skus = $input['item_skus'];
                    $performed_by = $input['performed_by'] ?? 'user';
                    $notes = $input['notes'] ?? null;
                    
                    echo json_encode($approval_api->updateListingStatus($action, $item_skus, $performed_by, $notes));
                }
                break;
                
            case 'approval_statistics':
                if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                    $days = $_GET['days'] ?? 7;
                    echo json_encode($approval_api->getApprovalStatistics($days));
                }
                break;
                
            case 'add_to_approval_queue':
                if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                    $input = json_decode(file_get_contents('php://input'), true);
                    echo json_encode($approval_api->addToApprovalQueue($input));
                }
                break;
                
            case 'approval_category_settings':
                if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                    echo json_encode($approval_api->getCategorySettings());
                } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                    $input = json_decode(file_get_contents('php://input'), true);
                    echo json_encode($approval_api->updateCategorySettings($input['category'], $input['settings']));
                }
                break;
                
            default:
                echo json_encode([
                    'success' => false,
                    'error' => 'Unknown endpoint: ' . $endpoint
                ]);
        }
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => 'API Error: ' . $e->getMessage()
        ]);
    }
    
    exit;
}
?>