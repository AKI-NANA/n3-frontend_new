<?php
/**
 * Yahoo!オークション商品承認システム - メインAPIエンドポイント
 * ファイル: 03_approval/approval.php
 * 
 * 機能:
 * - 承認待ち商品データ取得
 * - 商品の承認/否認処理
 * - 統計情報取得
 * - AI判定結果管理
 * - ページネーション対応
 * 
 * 設計方針: Geminiの推奨に基づくRESTful API構成
 */

// HTTPヘッダー設定
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

// エラー表示制御
error_reporting(E_ALL);
ini_set('display_errors', 0);

// 必要なファイル読み込み
require_once __DIR__ . '/../shared/config/database.php';
require_once __DIR__ . '/../shared/core/Database.php';
require_once __DIR__ . '/../shared/core/ApiResponse.php';

/**
 * 共通データベースクラス
 */
class Database {
    private static $instance = null;
    private $pdo;
    
    private function __construct() {
        try {
            $this->pdo = new PDO(
                "pgsql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME,
                DB_USER,
                DB_PASSWORD,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
        } catch (PDOException $e) {
            error_log("データベース接続エラー: " . $e->getMessage());
            throw new Exception("データベース接続に失敗しました");
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function query($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("クエリ実行エラー: " . $e->getMessage() . " SQL: " . $sql);
            throw new Exception("データベースクエリに失敗しました");
        }
    }
    
    public function lastInsertId() {
        return $this->pdo->lastInsertId();
    }
    
    public function beginTransaction() {
        return $this->pdo->beginTransaction();
    }
    
    public function commit() {
        return $this->pdo->commit();
    }
    
    public function rollback() {
        return $this->pdo->rollback();
    }
}

/**
 * API応答統一クラス
 */
class ApiResponse {
    public static function success($data = null, $message = '処理が完了しました') {
        self::send([
            'success' => true,
            'data' => $data,
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s'),
            'module' => 'approval'
        ]);
    }
    
    public static function error($message, $code = 400, $details = null) {
        http_response_code($code);
        self::send([
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => $code,
                'details' => $details
            ],
            'timestamp' => date('Y-m-d H:i:s'),
            'module' => 'approval'
        ]);
    }
    
    private static function send($data) {
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
}

/**
 * 承認システムメインクラス
 */
class ApprovalSystem {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->initializeTables();
    }
    
    /**
     * 必要なテーブルを初期化
     */
    private function initializeTables() {
        try {
            // yahoo_scraped_products テーブルに必要なカラムを追加
            $this->db->query("
                ALTER TABLE yahoo_scraped_products 
                ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending',
                ADD COLUMN IF NOT EXISTS ai_confidence_score INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS ai_recommendation TEXT,
                ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
                ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100),
                ADD COLUMN IF NOT EXISTS rejection_reason TEXT
            ");
            
            // 承認履歴テーブル作成
            $this->db->query("
                CREATE TABLE IF NOT EXISTS approval_history (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER REFERENCES yahoo_scraped_products(id),
                    action VARCHAR(20) NOT NULL, -- 'approve', 'reject', 'pending'
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
            $this->db->query("
                CREATE INDEX IF NOT EXISTS idx_products_approval_status ON yahoo_scraped_products(approval_status);
                CREATE INDEX IF NOT EXISTS idx_products_ai_score ON yahoo_scraped_products(ai_confidence_score);
                CREATE INDEX IF NOT EXISTS idx_approval_history_product ON approval_history(product_id);
                CREATE INDEX IF NOT EXISTS idx_approval_history_date ON approval_history(processed_at);
            ");
            
        } catch (Exception $e) {
            error_log("テーブル初期化エラー: " . $e->getMessage());
        }
    }
    
    /**
     * 承認待ち商品データ取得（ページネーション対応）
     */
    public function getApprovalQueue($status = 'pending', $page = 1, $limit = 50, $filters = []) {
        try {
            $offset = ($page - 1) * $limit;
            
            // 基本WHERE条件構築
            $where = ["1=1"];
            $params = [];
            
            // ステータスフィルター
            if ($status !== 'all') {
                $where[] = "approval_status = ?";
                $params[] = $status;
            }
            
            // AIスコアフィルター
            if (isset($filters['ai_filter'])) {
                switch ($filters['ai_filter']) {
                    case 'ai-approved':
                        $where[] = "ai_confidence_score >= 80";
                        break;
                    case 'ai-pending':
                        $where[] = "ai_confidence_score >= 40 AND ai_confidence_score < 80";
                        break;
                    case 'ai-rejected':
                        $where[] = "ai_confidence_score < 40";
                        break;
                }
            }
            
            // 価格フィルター
            if (isset($filters['min_price']) && $filters['min_price'] > 0) {
                $where[] = "current_price >= ?";
                $params[] = $filters['min_price'];
            }
            
            if (isset($filters['max_price']) && $filters['max_price'] > 0) {
                $where[] = "current_price <= ?";
                $params[] = $filters['max_price'];
            }
            
            // 検索キーワード
            if (!empty($filters['search'])) {
                $where[] = "title ILIKE ?";
                $params[] = '%' . $filters['search'] . '%';
            }
            
            $whereClause = implode(' AND ', $where);
            
            // 総件数取得
            $countSql = "SELECT COUNT(*) FROM yahoo_scraped_products WHERE {$whereClause}";
            $totalCount = $this->db->query($countSql, $params)->fetchColumn();
            
            // 商品データ取得
            $productsSql = "
                SELECT 
                    id,
                    title,
                    current_price,
                    bid_count,
                    end_date,
                    image_url,
                    category,
                    approval_status,
                    ai_confidence_score,
                    ai_recommendation,
                    created_at,
                    approved_at,
                    approved_by
                FROM yahoo_scraped_products 
                WHERE {$whereClause}
                ORDER BY 
                    CASE WHEN approval_status = 'pending' THEN 0 ELSE 1 END,
                    ai_confidence_score DESC,
                    created_at DESC
                LIMIT ? OFFSET ?
            ";
            
            $params[] = $limit;
            $params[] = $offset;
            
            $products = $this->db->query($productsSql, $params)->fetchAll();
            
            // 統計情報取得
            $statistics = $this->getStatistics();
            
            return [
                'products' => $products,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total_count' => $totalCount,
                    'total_pages' => ceil($totalCount / $limit),
                    'has_next' => $page < ceil($totalCount / $limit),
                    'has_prev' => $page > 1
                ],
                'statistics' => $statistics,
                'filters_applied' => $filters
            ];
            
        } catch (Exception $e) {
            error_log("承認キュー取得エラー: " . $e->getMessage());
            throw new Exception("商品データの取得に失敗しました");
        }
    }
    
    /**
     * 統計情報取得
     */
    public function getStatistics() {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
                    COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
                    COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected,
                    COUNT(CASE WHEN ai_confidence_score >= 80 THEN 1 END) as aiRecommended,
                    COUNT(CASE WHEN ai_confidence_score >= 80 AND approval_status = 'pending' THEN 1 END) as aiApproved,
                    COUNT(CASE WHEN ai_confidence_score >= 40 AND ai_confidence_score < 80 AND approval_status = 'pending' THEN 1 END) as aiPending,
                    COUNT(CASE WHEN ai_confidence_score < 40 AND approval_status = 'pending' THEN 1 END) as aiRejected,
                    AVG(ai_confidence_score) as avgAiScore,
                    AVG(current_price) as avgPrice
                FROM yahoo_scraped_products
            ";
            
            $result = $this->db->query($sql)->fetch();
            
            // 数値を整数に変換
            return [
                'total' => (int)$result['total'],
                'pending' => (int)$result['pending'],
                'approved' => (int)$result['approved'],
                'rejected' => (int)$result['rejected'],
                'aiRecommended' => (int)$result['airecommended'],
                'aiApproved' => (int)$result['aiapproved'],
                'aiPending' => (int)$result['aipending'],
                'aiRejected' => (int)$result['airejected'],
                'avgAiScore' => round($result['avgaiscore'] ?? 0, 1),
                'avgPrice' => round($result['avgprice'] ?? 0, 0)
            ];
            
        } catch (Exception $e) {
            error_log("統計情報取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 商品承認処理
     */
    public function approveProducts($productIds, $approvedBy = 'system') {
        try {
            $this->db->beginTransaction();
            
            $successCount = 0;
            $errors = [];
            
            foreach ($productIds as $productId) {
                try {
                    // 現在の商品情報取得
                    $product = $this->getProductById($productId);
                    if (!$product) {
                        $errors[] = "商品ID {$productId} が見つかりません";
                        continue;
                    }
                    
                    // 承認処理
                    $this->db->query("
                        UPDATE yahoo_scraped_products 
                        SET 
                            approval_status = 'approved',
                            approved_at = CURRENT_TIMESTAMP,
                            approved_by = ?
                        WHERE id = ?
                    ", [$approvedBy, $productId]);
                    
                    // 履歴記録
                    $this->recordApprovalHistory($productId, 'approve', $product['approval_status'], 'approved', null, $approvedBy, $product['ai_confidence_score']);
                    
                    $successCount++;
                    
                } catch (Exception $e) {
                    $errors[] = "商品ID {$productId}: " . $e->getMessage();
                }
            }
            
            $this->db->commit();
            
            return [
                'success_count' => $successCount,
                'total_requested' => count($productIds),
                'errors' => $errors
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            error_log("否認処理エラー: " . $e->getMessage());
            throw new Exception("否認処理中にエラーが発生しました");
        }
    }
    
    /**
     * 単一商品取得
     */
    private function getProductById($productId) {
        try {
            $stmt = $this->db->query(
                "SELECT * FROM yahoo_scraped_products WHERE id = ?", 
                [$productId]
            );
            return $stmt->fetch();
        } catch (Exception $e) {
            error_log("商品取得エラー: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * 承認履歴記録
     */
    private function recordApprovalHistory($productId, $action, $previousStatus, $newStatus, $reason, $processedBy, $aiScore) {
        try {
            $this->db->query("
                INSERT INTO approval_history (
                    product_id, action, previous_status, new_status, 
                    reason, processed_by, ai_score_at_time, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ", [
                $productId,
                $action,
                $previousStatus,
                $newStatus,
                $reason,
                $processedBy,
                $aiScore,
                json_encode([
                    'timestamp' => date('Y-m-d H:i:s'),
                    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null
                ])
            ]);
        } catch (Exception $e) {
            error_log("履歴記録エラー: " . $e->getMessage());
        }
    }
    
    /**
     * AI信頼度スコア更新
     */
    public function updateAiScore($productId, $score, $recommendation = null) {
        try {
            $this->db->query("
                UPDATE yahoo_scraped_products 
                SET 
                    ai_confidence_score = ?,
                    ai_recommendation = ?
                WHERE id = ?
            ", [$score, $recommendation, $productId]);
            
            return true;
        } catch (Exception $e) {
            error_log("AIスコア更新エラー: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 自動承認処理（高AI信頼度商品）
     */
    public function autoApproveHighConfidenceProducts($threshold = 95) {
        try {
            $sql = "
                UPDATE yahoo_scraped_products 
                SET 
                    approval_status = 'approved',
                    approved_at = CURRENT_TIMESTAMP,
                    approved_by = 'ai_auto'
                WHERE 
                    approval_status = 'pending' 
                    AND ai_confidence_score >= ?
            ";
            
            $stmt = $this->db->query($sql, [$threshold]);
            $autoApprovedCount = $stmt->rowCount();
            
            // 履歴記録（一括）
            if ($autoApprovedCount > 0) {
                $this->db->query("
                    INSERT INTO approval_history (
                        product_id, action, previous_status, new_status, 
                        reason, processed_by, ai_score_at_time
                    )
                    SELECT 
                        id, 'approve', 'pending', 'approved',
                        'AI自動承認 (スコア >= {$threshold})', 'ai_auto', ai_confidence_score
                    FROM yahoo_scraped_products 
                    WHERE 
                        approval_status = 'approved' 
                        AND approved_by = 'ai_auto'
                        AND approved_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute'
                ");
            }
            
            return $autoApprovedCount;
            
        } catch (Exception $e) {
            error_log("自動承認処理エラー: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * 承認履歴取得
     */
    public function getApprovalHistory($productId = null, $limit = 100) {
        try {
            $sql = "
                SELECT 
                    ah.*,
                    ysp.title as product_title,
                    ysp.current_price
                FROM approval_history ah
                LEFT JOIN yahoo_scraped_products ysp ON ah.product_id = ysp.id
            ";
            
            $params = [];
            if ($productId) {
                $sql .= " WHERE ah.product_id = ?";
                $params[] = $productId;
            }
            
            $sql .= " ORDER BY ah.processed_at DESC LIMIT ?";
            $params[] = $limit;
            
            return $this->db->query($sql, $params)->fetchAll();
            
        } catch (Exception $e) {
            error_log("履歴取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 承認状態リセット
     */
    public function resetApprovalStatus($productIds) {
        try {
            $this->db->beginTransaction();
            
            $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
            
            $this->db->query("
                UPDATE yahoo_scraped_products 
                SET 
                    approval_status = 'pending',
                    approved_at = NULL,
                    approved_by = NULL,
                    rejection_reason = NULL
                WHERE id IN ({$placeholders})
            ", $productIds);
            
            // 履歴記録
            foreach ($productIds as $productId) {
                $this->recordApprovalHistory($productId, 'reset', null, 'pending', 'ステータスリセット', 'system', null);
            }
            
            $this->db->commit();
            return true;
            
        } catch (Exception $e) {
            $this->db->rollback();
            error_log("ステータスリセットエラー: " . $e->getMessage());
            return false;
        }
    }
}

// =============================================================================
// APIエンドポイント処理メイン
// =============================================================================

try {
    // リクエスト解析
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? $_POST['action'] ?? null;
    
    // 承認システム初期化
    $approvalSystem = new ApprovalSystem();
    
    // CSRFトークン検証（POSTの場合）
    if ($method === 'POST') {
        // TODO: CSRF検証実装
        // if (!validateCSRFToken()) {
        //     ApiResponse::error('CSRF token invalid', 403);
        // }
    }
    
    // メソッド別処理
    switch ($method) {
        case 'GET':
            handleGetRequest($approvalSystem, $action);
            break;
            
        case 'POST':
            handlePostRequest($approvalSystem, $action);
            break;
            
        default:
            ApiResponse::error('HTTPメソッドが許可されていません', 405);
    }
    
} catch (Exception $e) {
    error_log("API処理例外: " . $e->getMessage());
    ApiResponse::error('内部サーバーエラーが発生しました', 500, $e->getMessage());
}

/**
 * GETリクエスト処理
 */
function handleGetRequest($approvalSystem, $action) {
    switch ($action) {
        case 'get_approval_queue':
            // 承認キュー取得
            $status = $_GET['status'] ?? 'pending';
            $page = (int)($_GET['page'] ?? 1);
            $limit = min((int)($_GET['limit'] ?? 50), 100); // 最大100件
            
            // フィルター解析
            $filters = [];
            if (!empty($_GET['ai_filter'])) $filters['ai_filter'] = $_GET['ai_filter'];
            if (!empty($_GET['min_price'])) $filters['min_price'] = (float)$_GET['min_price'];
            if (!empty($_GET['max_price'])) $filters['max_price'] = (float)$_GET['max_price'];
            if (!empty($_GET['search'])) $filters['search'] = trim($_GET['search']);
            
            $data = $approvalSystem->getApprovalQueue($status, $page, $limit, $filters);
            ApiResponse::success($data, '承認キューを取得しました');
            break;
            
        case 'get_statistics':
            // 統計情報のみ取得
            $stats = $approvalSystem->getStatistics();
            ApiResponse::success($stats, '統計情報を取得しました');
            break;
            
        case 'get_approval_history':
            // 承認履歴取得
            $productId = !empty($_GET['product_id']) ? (int)$_GET['product_id'] : null;
            $limit = min((int)($_GET['limit'] ?? 100), 500);
            
            $history = $approvalSystem->getApprovalHistory($productId, $limit);
            ApiResponse::success($history, '承認履歴を取得しました');
            break;
            
        case 'health_check':
            // ヘルスチェック
            ApiResponse::success([
                'status' => 'healthy',
                'database' => 'connected',
                'timestamp' => date('Y-m-d H:i:s')
            ], 'システム正常');
            break;
            
        default:
            ApiResponse::error('不明なGETアクション: ' . $action, 400);
    }
}

/**
 * POSTリクエスト処理
 */
function handlePostRequest($approvalSystem, $action) {
    // POSTデータ取得
    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        ApiResponse::error('不正なJSONデータです', 400);
    }
    
    switch ($action) {
        case 'approve_products':
            // 商品承認
            $productIds = $input['product_ids'] ?? [];
            $approvedBy = $input['approved_by'] ?? 'web_user';
            
            if (empty($productIds)) {
                ApiResponse::error('商品IDが指定されていません', 400);
            }
            
            // IDの検証
            $productIds = array_filter(array_map('intval', $productIds));
            if (empty($productIds)) {
                ApiResponse::error('有効な商品IDが見つかりません', 400);
            }
            
            $result = $approvalSystem->approveProducts($productIds, $approvedBy);
            
            if ($result['success_count'] > 0) {
                ApiResponse::success($result, "{$result['success_count']}件の商品を承認しました");
            } else {
                ApiResponse::error('承認処理に失敗しました', 400, $result['errors']);
            }
            break;
            
        case 'reject_products':
            // 商品否認
            $productIds = $input['product_ids'] ?? [];
            $reason = $input['reason'] ?? '手動否認';
            $rejectedBy = $input['rejected_by'] ?? 'web_user';
            
            if (empty($productIds)) {
                ApiResponse::error('商品IDが指定されていません', 400);
            }
            
            // IDの検証
            $productIds = array_filter(array_map('intval', $productIds));
            if (empty($productIds)) {
                ApiResponse::error('有効な商品IDが見つかりません', 400);
            }
            
            $result = $approvalSystem->rejectProducts($productIds, $reason, $rejectedBy);
            
            if ($result['success_count'] > 0) {
                ApiResponse::success($result, "{$result['success_count']}件の商品を否認しました");
            } else {
                ApiResponse::error('否認処理に失敗しました', 400, $result['errors']);
            }
            break;
            
        case 'update_ai_score':
            // AIスコア更新
            $productId = (int)($input['product_id'] ?? 0);
            $score = (int)($input['score'] ?? 0);
            $recommendation = $input['recommendation'] ?? null;
            
            if ($productId <= 0 || $score < 0 || $score > 100) {
                ApiResponse::error('無効なパラメーターです', 400);
            }
            
            $success = $approvalSystem->updateAiScore($productId, $score, $recommendation);
            
            if ($success) {
                ApiResponse::success(null, 'AIスコアを更新しました');
            } else {
                ApiResponse::error('AIスコア更新に失敗しました', 500);
            }
            break;
            
        case 'auto_approve':
            // 自動承認実行
            $threshold = (int)($input['threshold'] ?? 95);
            
            if ($threshold < 50 || $threshold > 100) {
                ApiResponse::error('閾値は50-100の間で指定してください', 400);
            }
            
            $autoApprovedCount = $approvalSystem->autoApproveHighConfidenceProducts($threshold);
            
            ApiResponse::success([
                'auto_approved_count' => $autoApprovedCount,
                'threshold' => $threshold
            ], "{$autoApprovedCount}件を自動承認しました");
            break;
            
        case 'reset_status':
            // ステータスリセット
            $productIds = $input['product_ids'] ?? [];
            
            if (empty($productIds)) {
                ApiResponse::error('商品IDが指定されていません', 400);
            }
            
            $productIds = array_filter(array_map('intval', $productIds));
            if (empty($productIds)) {
                ApiResponse::error('有効な商品IDが見つかりません', 400);
            }
            
            $success = $approvalSystem->resetApprovalStatus($productIds);
            
            if ($success) {
                ApiResponse::success(null, count($productIds) . '件のステータスをリセットしました');
            } else {
                ApiResponse::error('ステータスリセットに失敗しました', 500);
            }
            break;
            
        default:
            ApiResponse::error('不明なPOSTアクション: ' . $action, 400);
    }
}

/**
 * バッチ処理用エントリーポイント（CLI実行用）
 */
if (php_sapi_name() === 'cli') {
    echo "Yahoo!オークション承認システム バッチ処理\n";
    
    $command = $argv[1] ?? '';
    
    try {
        $approvalSystem = new ApprovalSystem();
        
        switch ($command) {
            case 'auto_approve':
                $threshold = (int)($argv[2] ?? 95);
                $count = $approvalSystem->autoApproveHighConfidenceProducts($threshold);
                echo "自動承認完了: {$count}件\n";
                break;
                
            case 'stats':
                $stats = $approvalSystem->getStatistics();
                echo "=== 承認システム統計 ===\n";
                echo "総数: {$stats['total']}\n";
                echo "承認待ち: {$stats['pending']}\n";
                echo "承認済み: {$stats['approved']}\n";
                echo "否認済み: {$stats['rejected']}\n";
                echo "AI推奨: {$stats['aiRecommended']}\n";
                break;
                
            default:
                echo "使用方法: php approval.php [auto_approve|stats] [threshold]\n";
                break;
        }
        
    } catch (Exception $e) {
        echo "エラー: " . $e->getMessage() . "\n";
        exit(1);
    }
}
?>getMessage();
                }
            }
            
            $this->db->commit();
            
            return [
                'success_count' => $successCount,
                'total_requested' => count($productIds),
                'errors' => $errors
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            error_log("承認処理エラー: " . $e->getMessage());
            throw new Exception("承認処理中にエラーが発生しました");
        }
    }
    
    /**
     * 商品否認処理
     */
    public function rejectProducts($productIds, $reason = null, $rejectedBy = 'system') {
        try {
            $this->db->beginTransaction();
            
            $successCount = 0;
            $errors = [];
            
            foreach ($productIds as $productId) {
                try {
                    // 現在の商品情報取得
                    $product = $this->getProductById($productId);
                    if (!$product) {
                        $errors[] = "商品ID {$productId} が見つかりません";
                        continue;
                    }
                    
                    // 否認処理
                    $this->db->query("
                        UPDATE yahoo_scraped_products 
                        SET 
                            approval_status = 'rejected',
                            rejection_reason = ?,
                            approved_at = CURRENT_TIMESTAMP,
                            approved_by = ?
                        WHERE id = ?
                    ", [$reason, $rejectedBy, $productId]);
                    
                    // 履歴記録
                    $this->recordApprovalHistory($productId, 'reject', $product['approval_status'], 'rejected', $reason, $rejectedBy, $product['ai_confidence_score']);
                    
                    $successCount++;
                    
                } catch (Exception $e) {
                    $errors[] = "商品ID {$productId}: " . $e->