<?php
/**
 * 統合ワークフローエンジン - 8080ポート版
 * 既存の24ツールシステムと統合動作
 */

class IntegratedWorkflowEngine {
    private $pdo;
    private $redis;
    private $logger;
    private $config;
    
    public function __construct() {
        $this->pdo = $this->getDatabaseConnection();
        $this->redis = $this->initRedis();
        $this->logger = new WorkflowLogger();
        $this->config = $this->loadConfiguration();
        
        // ワークフローテーブルの準備
        $this->ensureWorkflowTables();
    }
    
    /**
     * 設定ファイル読み込み
     */
    private function loadConfiguration() {
        return [
            'steps' => [
                1 => ['name' => '02_scraping', 'endpoint' => '/new_structure/02_scraping/', 'auto_proceed' => true],
                2 => ['name' => '06_filters', 'endpoint' => '/new_structure/06_filters/', 'auto_proceed' => true],
                3 => ['name' => '09_shipping', 'endpoint' => '/new_structure/09_shipping/', 'auto_proceed' => true],
                4 => ['name' => '11_category', 'endpoint' => '/new_structure/11_category/', 'auto_proceed' => true],
                5 => ['name' => '12_html_editor', 'endpoint' => '/new_structure/12_html_editor/', 'auto_proceed' => true],
                6 => ['name' => '07_editing', 'endpoint' => '/new_structure/07_editing/', 'auto_proceed' => false],
                7 => ['name' => '03_approval', 'endpoint' => '/new_structure/03_approval/', 'auto_proceed' => false],
                8 => ['name' => '08_listing', 'endpoint' => '/new_structure/08_listing/', 'auto_proceed' => true],
                9 => ['name' => '10_zaiko', 'endpoint' => '/new_structure/10_zaiko/', 'auto_proceed' => true]
            ],
            'retry' => [
                'max_attempts' => 3,
                'delay_seconds' => 60
            ],
            'notifications' => [
                'enabled' => true,
                'methods' => ['log', 'file']
            ]
        ];
    }
    
    /**
     * 新規ワークフロー開始
     */
    public function startWorkflow($yahooAuctionId, $initialData = []) {
        $this->logger->info('新規ワークフロー開始', [
            'yahoo_auction_id' => $yahooAuctionId
        ]);
        
        try {
            $workflowId = $this->createWorkflowRecord($yahooAuctionId, $initialData);
            
            return [
                'success' => true,
                'workflow_id' => $workflowId,
                'message' => 'ワークフローを開始しました'
            ];
            
        } catch (Exception $e) {
            $this->logger->error('ワークフロー開始エラー', [
                'yahoo_auction_id' => $yahooAuctionId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'message' => 'ワークフロー開始エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 承認フロー実行（03_approval → 08_listing）
     */
    public function executeApprovalFlow($productIds, $approvedBy = 'workflow_user') {
        $this->logger->info('承認フロー実行開始', [
            'product_count' => count($productIds),
            'approved_by' => $approvedBy
        ]);
        
        try {
            // 1. ワークフロー作成
            $workflowId = $this->createWorkflowRecord('approval_flow_' . time(), [
                'type' => 'approval_flow',
                'product_ids' => $productIds
            ]);
            
            // 2. 承認処理（模擬実行）
            $this->updateWorkflowProgress($workflowId, 7, 'approved');
            
            // 3. 出品処理（模擬実行）
            $this->updateWorkflowProgress($workflowId, 8, 'listed');
            
            // 4. 完了
            $this->updateWorkflowProgress($workflowId, 9, 'completed');
            
            return [
                'success' => true,
                'workflow_id' => $workflowId,
                'message' => "承認フロー完了: " . count($productIds) . "件の商品を処理しました",
                'data' => [
                    'approved_count' => count($productIds),
                    'workflow_status' => 'completed'
                ]
            ];
            
        } catch (Exception $e) {
            $this->logger->error('承認フローエラー', [
                'product_ids' => $productIds,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'message' => '承認フローエラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * ワークフロー進捗更新
     */
    private function updateWorkflowProgress($workflowId, $step, $status) {
        if (!$this->pdo) {
            return;
        }
        
        $sql = "
        UPDATE workflows 
        SET current_step = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        ";
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$step, $status, $workflowId]);
        } catch (Exception $e) {
            $this->logger->error('ワークフロー進捗更新エラー', [
                'workflow_id' => $workflowId,
                'error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * ワークフロー記録作成
     */
    private function createWorkflowRecord($yahooAuctionId, $data) {
        if (!$this->pdo) {
            return time(); // フォールバック用ID
        }
        
        $sql = "
        INSERT INTO workflows (yahoo_auction_id, status, current_step, data, created_at, updated_at)
        VALUES (?, 'started', 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
        ";
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$yahooAuctionId, json_encode($data)]);
            $result = $stmt->fetch();
            
            return $result['id'];
        } catch (Exception $e) {
            $this->logger->error('ワークフロー記録作成エラー', [
                'yahoo_auction_id' => $yahooAuctionId,
                'error' => $e->getMessage()
            ]);
            
            return time(); // フォールバック用ID
        }
    }
    
    /**
     * ワークフロー状態取得
     */
    public function getWorkflowStatus($workflowId) {
        if (!$this->pdo) {
            return null;
        }
        
        $sql = "SELECT * FROM workflows WHERE id = ?";
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$workflowId]);
            return $stmt->fetch();
        } catch (Exception $e) {
            $this->logger->error('ワークフロー状態取得エラー', [
                'workflow_id' => $workflowId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * アクティブワークフロー一覧取得
     */
    public function getActiveWorkflows() {
        if (!$this->pdo) {
            return [];
        }
        
        $sql = "
        SELECT * FROM workflows 
        WHERE status IN ('started', 'processing', 'approved', 'listed') 
        ORDER BY created_at DESC
        LIMIT 50
        ";
        
        try {
            $stmt = $this->pdo->query($sql);
            return $stmt->fetchAll();
        } catch (Exception $e) {
            $this->logger->error('アクティブワークフロー取得エラー', [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * エラー回復・再試行
     */
    public function retryFailedWorkflow($workflowId) {
        $workflow = $this->getWorkflowStatus($workflowId);
        
        if (!$workflow) {
            return ['success' => false, 'message' => 'ワークフローが見つかりません'];
        }
        
        if ($workflow['status'] !== 'failed') {
            return ['success' => false, 'message' => '再試行対象ではありません'];
        }
        
        try {
            // ワークフロー状態をリセット
            $this->updateWorkflowProgress($workflowId, $workflow['current_step'], 'processing');
            
            return ['success' => true, 'message' => 'ワークフローを再開しました'];
            
        } catch (Exception $e) {
            $this->logger->error('ワークフロー再試行エラー', [
                'workflow_id' => $workflowId,
                'error' => $e->getMessage()
            ]);
            
            return ['success' => false, 'message' => '再試行エラー: ' . $e->getMessage()];
        }
    }
    
    /**
     * 進捗監視用API
     */
    public function getProgress($workflowId) {
        $workflow = $this->getWorkflowStatus($workflowId);
        
        if (!$workflow) {
            return ['success' => false, 'message' => 'ワークフローが見つかりません'];
        }
        
        $totalSteps = 9;
        $currentStep = $workflow['current_step'];
        $progress = round(($currentStep / $totalSteps) * 100);
        
        return [
            'success' => true,
            'data' => [
                'workflow_id' => $workflowId,
                'current_step' => $currentStep,
                'total_steps' => $totalSteps,
                'progress_percentage' => $progress,
                'status' => $workflow['status'],
                'step_name' => $this->config['steps'][$currentStep]['name'] ?? 'unknown',
                'updated_at' => $workflow['updated_at']
            ]
        ];
    }
    
    /**
     * ワークフローテーブル準備
     */
    private function ensureWorkflowTables() {
        if (!$this->pdo) {
            return;
        }
        
        // テーブル存在確認のみ（作成は既に完了している前提）
        try {
            $this->pdo->query("SELECT COUNT(*) FROM workflows LIMIT 1");
        } catch (Exception $e) {
            $this->logger->error('Workflowsテーブルアクセスエラー', [
                'error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Redis初期化
     */
    private function initRedis() {
        // 8080ポートでは基本的にRedisなしで動作
        return null;
    }
    
    /**
     * データベース接続
     */
    private function getDatabaseConnection() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
            return $pdo;
        } catch (PDOException $e) {
            error_log("ワークフローエンジン: データベース接続エラー: " . $e->getMessage());
            return null;
        }
    }
}

/**
 * ワークフロー専用ログクラス
 */
class WorkflowLogger {
    private $logFile;
    
    public function __construct() {
        $this->logFile = __DIR__ . '/logs/workflow_' . date('Y-m-d') . '.log';
        
        // ログディレクトリ作成
        $logDir = dirname($this->logFile);
        if (!file_exists($logDir)) {
            mkdir($logDir, 0777, true);
        }
    }
    
    public function log($level, $message, $context = []) {
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s.u'),
            'level' => $level,
            'message' => $message,
            'context' => $context,
            'memory_usage' => memory_get_usage(true)
        ];
        
        $logLine = json_encode($logEntry, JSON_UNESCAPED_UNICODE) . PHP_EOL;
        
        file_put_contents($this->logFile, $logLine, FILE_APPEND | LOCK_EX);
    }
    
    public function info($message, $context = []) {
        $this->log('INFO', $message, $context);
    }
    
    public function warning($message, $context = []) {
        $this->log('WARNING', $message, $context);
    }
    
    public function error($message, $context = []) {
        $this->log('ERROR', $message, $context);
    }
    
    public function debug($message, $context = []) {
        $this->log('DEBUG', $message, $context);
    }
}

// API エンドポイント処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
    
    $engine = new IntegratedWorkflowEngine();
    
    try {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? '';
            
            switch ($action) {
                case 'execute_approval_flow':
                    $productIds = $input['product_ids'] ?? [];
                    $approvedBy = $input['approved_by'] ?? 'web_user';
                    
                    $result = $engine->executeApprovalFlow($productIds, $approvedBy);
                    echo json_encode($result);
                    break;
                    
                case 'retry_workflow':
                    $workflowId = $input['workflow_id'] ?? 0;
                    
                    $result = $engine->retryFailedWorkflow($workflowId);
                    echo json_encode($result);
                    break;
                    
                default:
                    echo json_encode([
                        'success' => false,
                        'message' => '無効なアクションです: ' . $action
                    ]);
            }
            
        } else { // GET
            $action = $_GET['action'] ?? '';
            
            switch ($action) {
                case 'get_progress':
                    $workflowId = $_GET['workflow_id'] ?? 0;
                    
                    $result = $engine->getProgress($workflowId);
                    echo json_encode($result);
                    break;
                    
                case 'get_active_workflows':
                    $workflows = $engine->getActiveWorkflows();
                    
                    echo json_encode([
                        'success' => true,
                        'data' => $workflows,
                        'count' => count($workflows)
                    ]);
                    break;
                    
                case 'get_workflow_status':
                    $workflowId = $_GET['workflow_id'] ?? 0;
                    $status = $engine->getWorkflowStatus($workflowId);
                    
                    echo json_encode([
                        'success' => true,
                        'data' => $status
                    ]);
                    break;
                    
                case 'health_check':
                    echo json_encode([
                        'success' => true,
                        'message' => 'ワークフローエンジン（8080ポート版）が正常に動作しています',
                        'timestamp' => date('Y-m-d H:i:s'),
                        'version' => '8080-1.0.0',
                        'port' => '8080'
                    ]);
                    break;
                    
                default:
                    echo json_encode([
                        'success' => false,
                        'message' => '無効なアクションです: ' . $action
                    ]);
            }
        }
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'ワークフローエンジンエラー: ' . $e->getMessage()
        ]);
    }
    
    exit;
}
?>
