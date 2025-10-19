<?php
/**
 * 承認システム PHP API
 * HTML+JS → 完全PHP API 変換
 * フィードバック反映：統合ワークフローエンジン対応
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// OPTIONSリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'UnifiedLogger.php';
require_once 'JWTAuth.php';
require_once 'DatabaseConnection.php';

class ApprovalAPI {
    private $pdo;
    private $logger;
    private $jwtAuth;
    
    public function __construct() {
        $this->pdo = getDatabaseConnection();
        $this->logger = getLogger('approval_api');
        $this->jwtAuth = getJWTAuth();
    }
    
    /**
     * メインAPIハンドラー
     */
    public function handleRequest() {
        $startTime = microtime(true);
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? $_POST['action'] ?? 'get_approval_queue';
        
        try {
            $this->logger->info("API request received", [
                'method' => $method,
                'action' => $action,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
            ]);
            
            // 認証が必要なアクション
            $protectedActions = ['approve_products', 'reject_products', 'update_product'];
            if (in_array($action, $protectedActions)) {
                $user = $this->jwtAuth->middleware('approval_manage');
                if (!$user) {
                    return; // middleware が既にエラーレスポンス送信
                }
            }
            
            // ルーティング
            $response = null;
            switch ($action) {
                case 'get_approval_queue':
                    $response = $this->getApprovalQueue();
                    break;
                case 'get_stats':
                    $response = $this->getApprovalStats();
                    break;
                case 'approve_products':
                    $response = $this->approveProducts();
                    break;
                case 'reject_products':
                    $response = $this->rejectProducts();
                    break;
                case 'update_product':
                    $response = $this->updateProduct();
                    break;
                case 'get_product_detail':
                    $response = $this->getProductDetail();
                    break;
                case 'export_csv':
                    $response = $this->exportCSV();
                    break;
                case 'get_approval_history':
                    $response = $this->getApprovalHistory();
                    break;
                case 'check_overdue':
                    $response = $this->checkOverdueApprovals();
                    break;
                default:
                    throw new Exception("Unknown action: {$action}");
            }
            
            // レスポンス送信
            if ($response) {
                $this->sendResponse($response);
            }
            
            $this->logger->logPerformance("API {$action}", $startTime, [
                'method' => $method,
                'status' => 'success'
            ]);
            
        } catch (Exception $e) {
            $this->logger->logError($e, [
                'action' => $action,
                'method' => $method
            ]);
            
            $this->sendErrorResponse($e->getMessage(), 500);
        }
    }
    
    /**
     * 承認キュー取得（フィルター・ページング対応）
     */
    private function getApprovalQueue() {
        $filters = $this->getFilters();
        $pagination = $this->getPagination();
        
        // WHERE句構築
        $whereConditions = ['1=1'];
        $params = [];
        
        if (!empty($filters['status'])) {
            $whereConditions[] = 'aq.status = ?';
            $params[] = $filters['status'];
        }
        
        if (!empty($filters['min_price'])) {
            $whereConditions[] = 'aq.price_jpy >= ?';
            $params[] = (int)$filters['min_price'];
        }
        
        if (!empty($filters['max_price'])) {
            $whereConditions[] = 'aq.price_jpy <= ?';
            $params[] = (int)$filters['max_price'];
        }
        
        if (!empty($filters['search'])) {
            $whereConditions[] = 'aq.title ILIKE ?';
            $params[] = '%' . $filters['search'] . '%';
        }
        
        if (!empty($filters['ai_filter'])) {
            switch ($filters['ai_filter']) {
                case 'ai-approved':
                    $whereConditions[] = 'aq.ai_confidence_score >= 80';
                    break;
                case 'ai-pending':
                    $whereConditions[] = 'aq.ai_confidence_score >= 50 AND aq.ai_confidence_score < 80';
                    break;
                case 'ai-rejected':
                    $whereConditions[] = 'aq.ai_confidence_score < 50';
                    break;
            }
        }
        
        if (!empty($filters['overdue_only'])) {
            $whereConditions[] = 'aq.deadline < NOW() AND aq.status = \'pending\'';
        }
        
        $whereClause = implode(' AND ', $whereConditions);
        
        // ソート順
        $orderBy = $this->getOrderBy($filters['sort_by'] ?? 'created_at', $filters['sort_dir'] ?? 'desc');
        
        // メインクエリ
        $sql = "
            SELECT 
                aq.*,
                w.yahoo_auction_id,
                w.current_step,
                w.priority,
                CASE 
                    WHEN aq.deadline < NOW() AND aq.status = 'pending' THEN true 
                    ELSE false 
                END as is_overdue,
                EXTRACT(EPOCH FROM (aq.deadline - NOW())) as seconds_to_deadline
            FROM approval_queue aq
            LEFT JOIN workflows w ON aq.workflow_id = w.id
            WHERE {$whereClause}
            ORDER BY {$orderBy}
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $pagination['limit'];
        $params[] = $pagination['offset'];
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 全体件数取得
        $countSql = "
            SELECT COUNT(*) as total
            FROM approval_queue aq
            LEFT JOIN workflows w ON aq.workflow_id = w.id
            WHERE {$whereClause}
        ";
        
        $countStmt = $this->pdo->prepare($countSql);
        $countStmt->execute(array_slice($params, 0, -2)); // LIMIT, OFFSETを除く
        $totalCount = $countStmt->fetchColumn();
        
        // 画像データ処理
        foreach ($items as &$item) {
            if (!empty($item['all_images'])) {
                $item['all_images'] = json_decode($item['all_images'], true);
            }
            
            // AI推奨判定
            $item['is_ai_recommended'] = ($item['ai_confidence_score'] ?? 0) >= 80;
            
            // 期限状況
            $item['deadline_status'] = $this->getDeadlineStatus($item['seconds_to_deadline']);
        }
        
        $this->logger->info("Approval queue retrieved", [
            'total_count' => $totalCount,
            'returned_count' => count($items),
            'filters' => $filters
        ]);
        
        return [
            'success' => true,
            'data' => $items,
            'pagination' => [
                'total' => (int)$totalCount,
                'page' => $pagination['page'],
                'limit' => $pagination['limit'],
                'pages' => ceil($totalCount / $pagination['limit'])
            ],
            'filters_applied' => $filters
        ];
    }
    
    /**
     * 承認統計取得
     */
    private function getApprovalStats() {
        // マテリアライズドビューを使用（パフォーマンス向上）
        $sql = "
            SELECT 
                total_items,
                pending_count,
                approved_count,
                rejected_count,
                ai_recommended_count,
                ROUND(avg_ai_score, 1) as avg_ai_score,
                ROUND(avg_price, 0) as avg_price
            FROM approval_stats
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 期限超過件数を追加取得
        $overdueSQL = "
            SELECT COUNT(*) as overdue_count
            FROM approval_queue 
            WHERE deadline < NOW() AND status = 'pending'
        ";
        $overdueStmt = $this->pdo->prepare($overdueSQL);
        $overdueStmt->execute();
        $stats['overdue_count'] = (int)$overdueStmt->fetchColumn();
        
        // 本日の処理件数
        $todaySQL = "
            SELECT COUNT(*) as processed_today
            FROM approval_queue 
            WHERE DATE(updated_at) = CURRENT_DATE 
            AND status IN ('approved', 'rejected')
        ";
        $todayStmt = $this->pdo->prepare($todaySQL);
        $todayStmt->execute();
        $stats['processed_today'] = (int)$todayStmt->fetchColumn();
        
        // 統計情報をデフォルト値で補完
        $stats = array_merge([
            'total_items' => 0,
            'pending_count' => 0,
            'approved_count' => 0,
            'rejected_count' => 0,
            'ai_recommended_count' => 0,
            'avg_ai_score' => 0,
            'avg_price' => 0,
            'overdue_count' => 0,
            'processed_today' => 0
        ], $stats);
        
        return [
            'success' => true,
            'data' => $stats
        ];
    }
    
    /**
     * 商品一括承認
     */
    private function approveProducts() {
        $input = $this->getJsonInput();
        $productIds = $input['product_ids'] ?? [];
        $reviewerNotes = $input['reviewer_notes'] ?? '';
        $currentUser = getCurrentUser();
        
        if (empty($productIds) || !is_array($productIds)) {
            throw new Exception('Product IDs are required');
        }
        
        $this->pdo->beginTransaction();
        
        try {
            $approvedCount = 0;
            $errors = [];
            
            foreach ($productIds as $productId) {
                try {
                    $this->approveProduct($productId, $reviewerNotes, $currentUser['user_id']);
                    $approvedCount++;
                } catch (Exception $e) {
                    $errors[] = "Product {$productId}: " . $e->getMessage();
                }
            }
            
            if ($approvedCount > 0) {
                $this->pdo->commit();
                
                $this->logger->info("Products approved", [
                    'approved_count' => $approvedCount,
                    'total_requested' => count($productIds),
                    'reviewer' => $currentUser['user_id'],
                    'errors' => $errors
                ]);
                
                return [
                    'success' => true,
                    'message' => "{$approvedCount} products approved successfully",
                    'approved_count' => $approvedCount,
                    'errors' => $errors
                ];
            } else {
                $this->pdo->rollback();
                throw new Exception('No products were approved. Errors: ' . implode(', ', $errors));
            }
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            throw $e;
        }
    }
    
    /**
     * 商品一括否認
     */
    private function rejectProducts() {
        $input = $this->getJsonInput();
        $productIds = $input['product_ids'] ?? [];
        $reason = $input['reason'] ?? '手動否認';
        $currentUser = getCurrentUser();
        
        if (empty($productIds) || !is_array($productIds)) {
            throw new Exception('Product IDs are required');
        }
        
        $this->pdo->beginTransaction();
        
        try {
            $rejectedCount = 0;
            $errors = [];
            
            foreach ($productIds as $productId) {
                try {
                    $this->rejectProduct($productId, $reason, $currentUser['user_id']);
                    $rejectedCount++;
                } catch (Exception $e) {
                    $errors[] = "Product {$productId}: " . $e->getMessage();
                }
            }
            
            if ($rejectedCount > 0) {
                $this->pdo->commit();
                
                $this->logger->info("Products rejected", [
                    'rejected_count' => $rejectedCount,
                    'total_requested' => count($productIds),
                    'reason' => $reason,
                    'reviewer' => $currentUser['user_id'],
                    'errors' => $errors
                ]);
                
                return [
                    'success' => true,
                    'message' => "{$rejectedCount} products rejected successfully",
                    'rejected_count' => $rejectedCount,
                    'errors' => $errors
                ];
            } else {
                $this->pdo->rollback();
                throw new Exception('No products were rejected. Errors: ' . implode(', ', $errors));
            }
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            throw $e;
        }
    }
    
    /**
     * 単一商品承認
     */
    private function approveProduct($productId, $notes, $reviewerId) {
        $sql = "
            UPDATE approval_queue 
            SET status = 'approved',
                approved_at = NOW(),
                approved_by = ?,
                reviewer_notes = ?,
                updated_at = NOW()
            WHERE id = ? AND status = 'pending'
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $result = $stmt->execute([$reviewerId, $notes, $productId]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception("Product not found or already processed: {$productId}");
        }
        
        // ワークフローを次のステップに進める
        $this->triggerNextWorkflowStep($productId, 'approved');
        
        $this->logger->logWorkflowStep($productId, 'approval', 'approved', [
            'reviewer' => $reviewerId,
            'notes' => $notes
        ]);
    }
    
    /**
     * 単一商品否認
     */
    private function rejectProduct($productId, $reason, $reviewerId) {
        $sql = "
            UPDATE approval_queue 
            SET status = 'rejected',
                approved_at = NOW(),
                approved_by = ?,
                reviewer_notes = ?,
                updated_at = NOW()
            WHERE id = ? AND status = 'pending'
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $result = $stmt->execute([$reviewerId, $reason, $productId]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception("Product not found or already processed: {$productId}");
        }
        
        // ワークフローを失敗状態に設定
        $this->updateWorkflowStatus($productId, 'rejected');
        
        $this->logger->logWorkflowStep($productId, 'approval', 'rejected', [
            'reviewer' => $reviewerId,
            'reason' => $reason
        ]);
    }
    
    /**
     * 商品詳細取得
     */
    private function getProductDetail() {
        $productId = $_GET['id'] ?? null;
        
        if (!$productId) {
            throw new Exception('Product ID is required');
        }
        
        $sql = "
            SELECT 
                aq.*,
                w.yahoo_auction_id,
                w.current_step,
                w.priority,
                w.data as workflow_data
            FROM approval_queue aq
            LEFT JOIN workflows w ON aq.workflow_id = w.id
            WHERE aq.id = ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$productId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            throw new Exception('Product not found');
        }
        
        // 画像データを展開
        if (!empty($product['all_images'])) {
            $product['all_images'] = json_decode($product['all_images'], true);
        }
        
        // ワークフローデータを展開
        if (!empty($product['workflow_data'])) {
            $product['workflow_data'] = json_decode($product['workflow_data'], true);
        }
        
        // 承認履歴を取得
        $historySql = "
            SELECT * FROM approval_history 
            WHERE approval_id = ? 
            ORDER BY created_at DESC
        ";
        $historyStmt = $this->pdo->prepare($historySql);
        $historyStmt->execute([$productId]);
        $product['history'] = $historyStmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'data' => $product
        ];
    }
    
    /**
     * CSV出力
     */
    private function exportCSV() {
        $filters = $this->getFilters();
        
        // フィルター適用のクエリ（ページング無し）
        $whereConditions = ['1=1'];
        $params = [];
        
        if (!empty($filters['status'])) {
            $whereConditions[] = 'aq.status = ?';
            $params[] = $filters['status'];
        }
        
        if (!empty($filters['search'])) {
            $whereConditions[] = 'aq.title ILIKE ?';
            $params[] = '%' . $filters['search'] . '%';
        }
        
        $whereClause = implode(' AND ', $whereConditions);
        
        $sql = "
            SELECT 
                aq.id,
                aq.product_id,
                aq.title,
                aq.price_jpy,
                aq.current_price,
                aq.bids,
                aq.time_left,
                aq.ai_confidence_score,
                aq.status,
                aq.approved_by,
                aq.created_at,
                aq.url
            FROM approval_queue aq
            WHERE {$whereClause}
            ORDER BY aq.created_at DESC
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // CSV生成
        $filename = 'approval_queue_' . date('Y-m-d_H-i-s') . '.csv';
        
        header('Content-Type: text/csv; charset=utf-8');
        header("Content-Disposition: attachment; filename=\"{$filename}\"");
        header('Pragma: no-cache');
        header('Expires: 0');
        
        $output = fopen('php://output', 'w');
        
        // BOM追加（Excel対応）
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
        
        // ヘッダー行
        fputcsv($output, [
            'ID', '商品ID', 'タイトル', '価格(円)', '現在価格', 
            '入札数', '残り時間', 'AI信頼度', 'ステータス', 
            '承認者', '作成日時', 'URL'
        ]);
        
        // データ行
        foreach ($data as $row) {
            fputcsv($output, [
                $row['id'],
                $row['product_id'],
                $row['title'],
                $row['price_jpy'],
                $row['current_price'],
                $row['bids'],
                $row['time_left'],
                $row['ai_confidence_score'],
                $this->getStatusLabel($row['status']),
                $row['approved_by'],
                $row['created_at'],
                $row['url']
            ]);
        }
        
        fclose($output);
        
        $this->logger->info("CSV export completed", [
            'record_count' => count($data),
            'filename' => $filename
        ]);
        
        exit; // CSV出力後は処理終了
    }
    
    /**
     * 承認期限チェック
     */
    private function checkOverdueApprovals() {
        $sql = "
            SELECT * FROM check_approval_deadlines()
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $overdueItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'data' => $overdueItems,
            'count' => count($overdueItems)
        ];
    }
    
    /**
     * ワークフローの次ステップトリガー
     */
    private function triggerNextWorkflowStep($approvalId, $approvalStatus) {
        // 承認されたアイテムのワークフローIDを取得
        $sql = "SELECT workflow_id FROM approval_queue WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$approvalId]);
        $workflowId = $stmt->fetchColumn();
        
        if ($workflowId && $approvalStatus === 'approved') {
            // ワークフローを次のステップ（08_listing）に進める
            $updateSql = "
                UPDATE workflows 
                SET current_step = 8, 
                    next_step = 8,
                    status = 'ready_for_listing',
                    updated_at = NOW() 
                WHERE id = ?
            ";
            $updateStmt = $this->pdo->prepare($updateSql);
            $updateStmt->execute([$workflowId]);
            
            // Redis キューに08_listingジョブを追加
            $this->enqueueListingJob($workflowId, $approvalId);
        }
    }
    
    /**
     * Redis リスティングジョブエンキュー
     */
    private function enqueueListingJob($workflowId, $approvalId) {
        try {
            // Redis接続（簡易実装）
            if (class_exists('Redis')) {
                $redis = new Redis();
                $redis->connect('127.0.0.1', 6379);
                
                $job = [
                    'workflow_id' => $workflowId,
                    'approval_id' => $approvalId,
                    'step_name' => 'listing',
                    'created_at' => time(),
                    'priority' => 1
                ];
                
                $redis->lpush('workflow_queue', json_encode($job));
                $redis->close();
                
                $this->logger->info("Listing job enqueued", [
                    'workflow_id' => $workflowId,
                    'approval_id' => $approvalId
                ]);
            }
        } catch (Exception $e) {
            $this->logger->error("Failed to enqueue listing job", [
                'workflow_id' => $workflowId,
                'error' => $e->getMessage()
            ]);
        }
    }
    
    // ヘルパーメソッド
    private function getFilters() {
        return [
            'status' => $_GET['status'] ?? '',
            'ai_filter' => $_GET['ai_filter'] ?? '',
            'min_price' => $_GET['min_price'] ?? '',
            'max_price' => $_GET['max_price'] ?? '',
            'search' => $_GET['search'] ?? '',
            'sort_by' => $_GET['sort_by'] ?? 'created_at',
            'sort_dir' => $_GET['sort_dir'] ?? 'desc',
            'overdue_only' => $_GET['overdue_only'] ?? false
        ];
    }
    
    private function getPagination() {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(10, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        
        return [
            'page' => $page,
            'limit' => $limit,
            'offset' => $offset
        ];
    }
    
    private function getOrderBy($sortBy, $sortDir) {
        $allowedColumns = [
            'created_at' => 'aq.created_at',
            'title' => 'aq.title',
            'price' => 'aq.price_jpy',
            'ai_score' => 'aq.ai_confidence_score',
            'status' => 'aq.status',
            'deadline' => 'aq.deadline'
        ];
        
        $column = $allowedColumns[$sortBy] ?? 'aq.created_at';
        $direction = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';
        
        return "{$column} {$direction}";
    }
    
    private function getDeadlineStatus($secondsToDeadline) {
        if ($secondsToDeadline < 0) return 'overdue';
        if ($secondsToDeadline < 3600) return 'urgent'; // 1時間以内
        if ($secondsToDeadline < 86400) return 'soon'; // 24時間以内
        return 'normal';
    }
    
    private function getStatusLabel($status) {
        $labels = [
            'pending' => '承認待ち',
            'approved' => '承認済み',
            'rejected' => '否認済み'
        ];
        return $labels[$status] ?? $status;
    }
    
    private function getJsonInput() {
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON input');
        }
        return $input;
    }
    
    private function sendResponse($data) {
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    
    private function sendErrorResponse($message, $statusCode = 400) {
        http_response_code($statusCode);
        echo json_encode([
            'success' => false,
            'error' => $message,
            'timestamp' => time()
        ], JSON_UNESCAPED_UNICODE);
    }
    
    private function updateWorkflowStatus($approvalId, $status) {
        $sql = "
            UPDATE workflows w
            SET status = ?, updated_at = NOW()
            FROM approval_queue aq
            WHERE w.id = aq.workflow_id AND aq.id = ?
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$status, $approvalId]);
    }
}

// データベース接続クラス（簡易実装）
function getDatabaseConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $host = $_ENV['DB_HOST'] ?? 'localhost';
            $dbname = $_ENV['DB_NAME'] ?? 'nagano3';
            $username = $_ENV['DB_USER'] ?? 'postgres';
            $password = $_ENV['DB_PASS'] ?? '';
            
            $dsn = "pgsql:host={$host};dbname={$dbname};charset=utf8";
            $pdo = new PDO($dsn, $username, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
    }
    
    return $pdo;
}

// エラーハンドリング
set_exception_handler(function($exception) {
    $logger = getLogger('approval_api');
    $logger->logError($exception);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $exception->getMessage()
    ]);
});

// API実行
$api = new ApprovalAPI();
$api->handleRequest();
