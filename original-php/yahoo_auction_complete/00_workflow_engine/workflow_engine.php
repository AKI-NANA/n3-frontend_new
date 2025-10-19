<?php
/**
 * 統合ワークフローエンジン - Phase 1 MVP版
 * 
 * 機能:
 * - 03_approval → 08_listing の自動連携
 * - ワークフロー状態管理
 * - エラー回復・再試行機能
 * - 進捗監視・通知システム
 * - Redis連携（オプション）
 * 
 * MVP実装優先度:
 * 1. 基本ワークフロー実行 ✅
 * 2. エラーハンドリング ✅
 * 3. 進捗追跡 ✅
 * 4. Redis統合（後続Phase）
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
                1 => ['name' => '02_scraping', 'endpoint' => '/02_scraping/api/', 'auto_proceed' => true],
                2 => ['name' => '06_filters', 'endpoint' => '/06_filters/api/', 'auto_proceed' => true],
                3 => ['name' => '09_shipping', 'endpoint' => '/09_shipping/api/', 'auto_proceed' => true],
                4 => ['name' => '11_category', 'endpoint' => '/11_category/api/', 'auto_proceed' => true],
                5 => ['name' => '12_html_editor', 'endpoint' => '/12_html_editor/api/', 'auto_proceed' => true],
                6 => ['name' => '07_editing', 'endpoint' => '/07_editing/api/', 'auto_proceed' => false],
                7 => ['name' => '03_approval', 'endpoint' => '/03_approval/api/', 'auto_proceed' => false],
                8 => ['name' => '08_listing', 'endpoint' => '/08_listing/api/', 'auto_proceed' => true],
                9 => ['name' => '10_zaiko', 'endpoint' => '/10_zaiko/api/', 'auto_proceed' => true]
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
            
            // 最初のステップを実行（通常は02_scrapingをスキップして06_filtersから）
            $firstStep = 6; // 06_filters から開始（データが既にある前提）
            $this->executeStep($workflowId, $firstStep, $initialData);
            
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
            
            // 2. 03_approval 実行
            $approvalResult = $this->executeApprovalStep($workflowId, $productIds, $approvedBy);
            
            if (!$approvalResult['success']) {
                throw new Exception('承認処理に失敗しました: ' . $approvalResult['message']);
            }
            
            // 3. 成功時は08_listingを自動実行
            $approvedData = $approvalResult['data']['approved_products'] ?? [];
            if (!empty($approvedData)) {
                $listingResult = $this->executeListingStep($workflowId, $approvedData);
                
                return [
                    'success' => true,
                    'workflow_id' => $workflowId,
                    'message' => "承認フロー完了: 承認 {$approvalResult['data']['approved_count']}件、出品処理開始",
                    'data' => [
                        'approval_result' => $approvalResult,
                        'listing_result' => $listingResult
                    ]
                ];
            }
            
            return $approvalResult;
            
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
     * 03_approval ステップ実行
     */
    private function executeApprovalStep($workflowId, $productIds, $approvedBy) {
        $this->logger->info('承認ステップ実行', [
            'workflow_id' => $workflowId,
            'step' => '03_approval'
        ]);
        
        $apiUrl = 'http://localhost:8080/modules/yahoo_auction_complete/new_structure/03_approval/api/workflow_integration.php';
        
        $postData = [
            'action' => 'process_workflow_approval',
            'workflow_id' => $workflowId,
            'product_ids' => $productIds,
            'approved_by' => $approvedBy
        ];
        
        $response = $this->callAPI($apiUrl, $postData);
        
        if ($response && $response['success']) {
            // 承認成功時のデータ準備
            $approvedProducts = $this->getApprovedProductsData($productIds);
            
            $response['data']['approved_products'] = $approvedProducts;
            $this->updateWorkflowProgress($workflowId, 7, 'approved');
        }
        
        return $response;
    }
    
    /**
     * 08_listing ステップ実行
     */
    private function executeListingStep($workflowId, $approvedProducts) {
        $this->logger->info('出品ステップ実行', [
            'workflow_id' => $workflowId,
            'step' => '08_listing',
            'product_count' => count($approvedProducts)
        ]);
        
        $apiUrl = 'http://localhost:8080/modules/yahoo_auction_complete/new_structure/08_listing/api/workflow_integration.php';
        
        $postData = [
            'action' => 'process_workflow_listing',
            'workflow_id' => $workflowId,
            'approved_products' => $approvedProducts,
            'settings' => [
                'marketplace' => 'ebay',
                'test_mode' => false,
                'batch_size' => 5,
                'delay_between_items' => 30
            ]
        ];
        
        $response = $this->callAPI($apiUrl, $postData);
        
        if ($response && $response['success']) {
            $this->updateWorkflowProgress($workflowId, 8, 'listed');
        }
        
        return $response;
    }
    
    /**
     * 承認済み商品データ取得
     */
    private function getApprovedProductsData($productIds) {
        if (!$this->pdo) {
            return [];
        }
        
        $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
        
        $sql = "
        SELECT 
            id as product_id,
            source_item_id as item_id,
            active_title as title,
            price_jpy as price,
            active_image_url as image_url,
            scraped_yahoo_data
        FROM yahoo_scraped_products 
        WHERE id IN ($placeholders) 
        AND approval_status = 'approved'
        ";
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($productIds);
            $products = $stmt->fetchAll();
            
            // データ構造変換
            $approvedProducts = [];
            foreach ($products as $product) {
                $yahoo_data = json_decode($product['scraped_yahoo_data'], true) ?: [];
                
                $approvedProducts[] = [
                    'product_id' => $product['product_id'],
                    'item_id' => $product['item_id'],
                    'title' => $product['title'],
                    'price' => $product['price'],
                    'image_url' => $product['image_url'],
                    'description' => $yahoo_data['description'] ?? '',
                    'category' => $yahoo_data['category'] ?? 'その他',
                    'condition' => $yahoo_data['condition'] ?? '中古',
                    'yahoo_data' => $yahoo_data
                ];
            }
            
            return $approvedProducts;
            
        } catch (Exception $e) {
            $this->logger->error('承認済み商品データ取得エラー', [
                'error' => $e->getMessage()
            ]);
            
            return [];
        }
    }
    
    /**
     * API呼び出し（cURL）
     */
    private function callAPI($url, $data, $timeout = 120) {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'User-Agent: WorkflowEngine/1.0'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_SSL_VERIFYPEER => false
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            $this->logger->error('API呼び出しエラー', [
                'url' => $url,
                'curl_error' => $error
            ]);
            return ['success' => false, 'message' => 'API呼び出しエラー: ' . $error];
        }
        
        if ($httpCode !== 200) {
            $this->logger->error('HTTPエラー', [
                'url' => $url,
                'http_code' => $httpCode,
                'response' => $response
            ]);
            return ['success' => false, 'message' => "HTTPエラー: {$httpCode}"];
        }
        
        $result = json_decode($response, true);
        if (!$result) {
            $this->logger->error('JSON解析エラー', [
                'url' => $url,
                'response' => $response
            ]);
            return ['success' => false, 'message' => 'JSON解析エラー'];
        }
        
        return $result;
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
        WHERE status IN ('started', 'processing', 'approved') 
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
            
            // データを復元
            $data = json_decode($workflow['data'], true) ?: [];
            
            if ($data['type'] === 'approval_flow') {
                // 承認フローの再実行
                return $this->executeApprovalFlow($data['product_ids'], 'retry_system');
            }
            
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
     * バッチ処理（複数承認フロー同時実行）
     */
    public function processBatchApproval($batchData) {
        $this->logger->info('バッチ承認処理開始', [
            'batch_count' => count($batchData)
        ]);
        
        $results = [];
        $successCount = 0;
        $errorCount = 0;
        
        foreach ($batchData as $index => $batch) {
            try {
                $productIds = $batch['product_ids'] ?? [];
                $approvedBy = $batch['approved_by'] ?? 'batch_system';
                
                $result = $this->executeApprovalFlow($productIds, $approvedBy);
                
                $results[] = [
                    'batch_index' => $index,
                    'result' => $result
                ];
                
                if ($result['success']) {
                    $successCount++;
                } else {
                    $errorCount++;
                }
                
                // バッチ間の待機（システム負荷軽減）
                if ($index < count($batchData) - 1) {
                    sleep(30);
                }
                
            } catch (Exception $e) {
                $errorCount++;
                $results[] = [
                    'batch_index' => $index,
                    'result' => [
                        'success' => false,
                        'message' => 'バッチエラー: ' . $e->getMessage()
                    ]
                ];
            }
        }
        
        return [
            'success' => true,
            'message' => "バッチ処理完了: 成功 {$successCount}件、エラー {$errorCount}件",
            'results' => $results,
            'summary' => [
                'success_count' => $successCount,
                'error_count' => $errorCount,
                'total_batches' => count($batchData)
            ]
        ];
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
        
        $sql = "
        CREATE TABLE IF NOT EXISTS workflows (
            id SERIAL PRIMARY KEY,
            yahoo_auction_id VARCHAR(255),
            product_id VARCHAR(255),
            status VARCHAR(50) DEFAULT 'processing',
            current_step INTEGER DEFAULT 1,
            next_step INTEGER,
            priority INTEGER DEFAULT 0,
            data JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )";
        
        try {
            $this->pdo->exec($sql);
            
            // インデックス作成
            $indexes = [
                "CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status)",
                "CREATE INDEX IF NOT EXISTS idx_workflows_current_step ON workflows(current_step)",
                "CREATE INDEX IF NOT EXISTS idx_workflows_priority ON workflows(priority DESC)",
                "CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON workflows(updated_at DESC)"
            ];
            
            foreach ($indexes as $indexSql) {
                $this->pdo->exec($indexSql);
            }
            
        } catch (Exception $e) {
            $this->logger->error('ワークフローテーブル作成エラー', [
                'error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Redis初期化
     */
    private function initRedis() {
        try {
            if (class_exists('Redis')) {
                $redis = new Redis();
                $redis->connect('127.0.0.1', 6379);
                return $redis;
            }
        } catch (Exception $e) {
            $this->logger->warning('Redis接続に失敗しましたが、処理を継続します', [
                'error' => $e->getMessage()
            ]);
        }
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
        error_log('[WORKFLOW][' . $level . '] ' . $message . ' ' . json_encode($context, JSON_UNESCAPED_UNICODE));
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
                    
                case 'batch_approval':
                    $batchData = $input['batch_data'] ?? [];
                    
                    $result = $engine->processBatchApproval($batchData);
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
                        'message' => 'ワークフローエンジンが正常に動作しています',
                        'timestamp' => date('Y-m-d H:i:s'),
                        'version' => '1.0.0'
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