<?php
/**
 * 03_approval ワークフロー統合API
 * ワークフローエンジンとの連携・自動トリガー機能
 * 
 * 機能:
 * - 承認完了時の自動08_listingトリガー
 * - ワークフロー状態管理
 * - Redis通知システム
 * - エラー回復機能
 */

require_once(__DIR__ . '/../approval.php');

/**
 * ワークフロー統合クラス
 */
class ApprovalWorkflowIntegration {
    private $pdo;
    private $redis;
    private $logger;
    
    public function __construct() {
        $this->pdo = getDatabaseConnection();
        $this->redis = $this->initRedis();
        $this->logger = new UnifiedLogger();
    }
    
    /**
     * Redis初期化
     */
    private function initRedis() {
        try {
            // Redisが利用可能な場合のみ接続
            if (class_exists('Redis')) {
                $redis = new Redis();
                $redis->connect('127.0.0.1', 6379);
                return $redis;
            }
        } catch (Exception $e) {
            $this->logger->warning('Redis接続に失敗しましたが、処理を継続します', [
                'error' => $e->getMessage(),
                'service' => '03_approval'
            ]);
        }
        return null;
    }
    
    /**
     * ワークフロー承認処理（統合版）
     */
    public function processWorkflowApproval($workflowId, $productIds, $approvedBy = 'workflow_system') {
        $startTime = microtime(true);
        
        $this->logger->info('ワークフロー承認処理開始', [
            'workflow_id' => $workflowId,
            'product_count' => count($productIds),
            'approved_by' => $approvedBy,
            'service' => '03_approval'
        ]);
        
        try {
            $this->pdo->beginTransaction();
            
            // 1. 商品承認処理実行
            $approvalResult = approveProducts($this->pdo, $productIds, $approvedBy);
            
            if (!$approvalResult['success']) {
                throw new Exception($approvalResult['message']);
            }
            
            // 2. ワークフロー状態更新
            $this->updateWorkflowStatus($workflowId, 'approved', 8);
            
            // 3. 承認データ準備
            $approvedData = $this->prepareApprovedData($productIds);
            
            // 4. 08_listingへの自動トリガー
            $triggerResult = $this->triggerListingStep($workflowId, $approvedData);
            
            $this->pdo->commit();
            
            // 実行時間計算
            $executionTime = round((microtime(true) - $startTime) * 1000);
            
            $this->logger->info('ワークフロー承認処理完了', [
                'workflow_id' => $workflowId,
                'execution_time' => $executionTime,
                'approved_count' => $approvalResult['updated_count'],
                'trigger_success' => $triggerResult['success'],
                'service' => '03_approval'
            ]);
            
            return [
                'success' => true,
                'message' => $approvalResult['message'] . ' → 出品処理を開始しました',
                'data' => [
                    'approved_count' => $approvalResult['updated_count'],
                    'workflow_id' => $workflowId,
                    'next_step' => 8,
                    'trigger_result' => $triggerResult,
                    'execution_time' => $executionTime
                ]
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            
            $this->logger->error('ワークフロー承認処理エラー', [
                'workflow_id' => $workflowId,
                'error' => $e->getMessage(),
                'service' => '03_approval'
            ]);
            
            return [
                'success' => false,
                'message' => 'ワークフロー承認エラー: ' . $e->getMessage(),
                'data' => null
            ];
        }
    }
    
    /**
     * ワークフロー状態更新
     */
    private function updateWorkflowStatus($workflowId, $status, $nextStep) {
        // workflows テーブルが存在しない場合は作成
        $this->ensureWorkflowTable();
        
        $sql = "
        INSERT INTO workflows (id, status, current_step, next_step, updated_at)
        VALUES (?, ?, 7, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (id) 
        DO UPDATE SET 
            status = EXCLUDED.status,
            current_step = 7,
            next_step = EXCLUDED.next_step,
            updated_at = CURRENT_TIMESTAMP
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$workflowId, $status, $nextStep]);
    }
    
    /**
     * ワークフローテーブル確認・作成
     */
    private function ensureWorkflowTable() {
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
        
        $this->pdo->exec($sql);
        
        // インデックス作成
        $indexes = [
            "CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status)",
            "CREATE INDEX IF NOT EXISTS idx_workflows_current_step ON workflows(current_step)",
            "CREATE INDEX IF NOT EXISTS idx_workflows_priority ON workflows(priority DESC)"
        ];
        
        foreach ($indexes as $indexSql) {
            try {
                $this->pdo->exec($indexSql);
            } catch (Exception $e) {
                $this->logger->debug('インデックス作成をスキップ: ' . $e->getMessage());
            }
        }
    }
    
    /**
     * 承認データ準備
     */
    private function prepareApprovedData($productIds) {
        $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
        
        $sql = "
        SELECT 
            id,
            source_item_id,
            active_title,
            price_jpy,
            active_image_url,
            scraped_yahoo_data
        FROM yahoo_scraped_products 
        WHERE id IN ($placeholders) 
        AND approval_status = 'approved'
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($productIds);
        $products = $stmt->fetchAll();
        
        // 08_listing用にデータ変換
        $listingData = [];
        foreach ($products as $product) {
            $yahoo_data = json_decode($product['scraped_yahoo_data'], true) ?: [];
            
            $listingData[] = [
                'product_id' => $product['id'],
                'item_id' => $product['source_item_id'],
                'title' => $product['active_title'],
                'price' => $product['price_jpy'],
                'image_url' => $product['active_image_url'],
                'description' => $yahoo_data['description'] ?? '',
                'category' => $yahoo_data['category'] ?? 'その他',
                'condition' => $yahoo_data['condition'] ?? '中古',
                'yahoo_data' => $yahoo_data
            ];
        }
        
        return $listingData;
    }
    
    /**
     * 08_listing 自動トリガー
     */
    private function triggerListingStep($workflowId, $approvedData) {
        try {
            // Redis経由でジョブキューに追加
            if ($this->redis) {
                $job = [
                    'workflow_id' => $workflowId,
                    'step_name' => '08_listing',
                    'action' => 'process_approved_products',
                    'data' => $approvedData,
                    'created_at' => time(),
                    'priority' => 100 // 承認完了は高優先度
                ];
                
                $this->redis->zadd('workflow_queue', [100 => json_encode($job)]);
                
                return [
                    'success' => true,
                    'method' => 'redis_queue',
                    'message' => 'Redisキューに出品ジョブを追加しました'
                ];
            }
            
            // Redisが利用できない場合は直接API呼び出し
            return $this->directListingTrigger($workflowId, $approvedData);
            
        } catch (Exception $e) {
            $this->logger->error('08_listingトリガーエラー', [
                'workflow_id' => $workflowId,
                'error' => $e->getMessage(),
                'service' => '03_approval'
            ]);
            
            return [
                'success' => false,
                'method' => 'failed',
                'message' => 'トリガーエラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 直接08_listing API呼び出し
     */
    private function directListingTrigger($workflowId, $approvedData) {
        $listingApiUrl = '/modules/yahoo_auction_complete/new_structure/08_listing/api/workflow_integration.php';
        
        $postData = [
            'action' => 'process_workflow_listing',
            'workflow_id' => $workflowId,
            'approved_products' => $approvedData
        ];
        
        // 内部API呼び出し（cURL使用）
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'http://localhost:8080' . $listingApiUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200 && $response) {
            $result = json_decode($response, true);
            return [
                'success' => $result['success'] ?? false,
                'method' => 'direct_api',
                'message' => $result['message'] ?? '08_listing API呼び出し完了'
            ];
        }
        
        return [
            'success' => false,
            'method' => 'direct_api',
            'message' => '08_listing API呼び出しに失敗しました (HTTP: ' . $httpCode . ')'
        ];
    }
    
    /**
     * ワークフロー状態取得
     */
    public function getWorkflowStatus($workflowId) {
        $sql = "SELECT * FROM workflows WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$workflowId]);
        
        return $stmt->fetch();
    }
    
    /**
     * エラー復旧処理
     */
    public function retryFailedApproval($workflowId) {
        $workflow = $this->getWorkflowStatus($workflowId);
        
        if (!$workflow) {
            return ['success' => false, 'message' => 'ワークフローが見つかりません'];
        }
        
        if ($workflow['status'] === 'failed') {
            // 失敗したワークフローを再実行
            $this->updateWorkflowStatus($workflowId, 'processing', 7);
            
            $this->logger->info('ワークフロー再試行開始', [
                'workflow_id' => $workflowId,
                'service' => '03_approval'
            ]);
            
            return ['success' => true, 'message' => 'ワークフローを再実行しました'];
        }
        
        return ['success' => false, 'message' => '再実行対象ではありません'];
    }
}

/**
 * 統一ログクラス（簡易版）
 */
class UnifiedLogger {
    public function log($level, $message, $context = []) {
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s.u'),
            'level' => $level,
            'message' => $message,
            'context' => $context,
            'memory_usage' => memory_get_usage(true)
        ];
        
        error_log('[' . $level . '] ' . $message . ' ' . json_encode($context, JSON_UNESCAPED_UNICODE));
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
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    $integration = new ApprovalWorkflowIntegration();
    
    try {
        switch ($action) {
            case 'process_workflow_approval':
                $workflowId = $input['workflow_id'] ?? 0;
                $productIds = $input['product_ids'] ?? [];
                $approvedBy = $input['approved_by'] ?? 'workflow_user';
                
                $result = $integration->processWorkflowApproval($workflowId, $productIds, $approvedBy);
                echo json_encode($result);
                break;
                
            case 'get_workflow_status':
                $workflowId = $input['workflow_id'] ?? 0;
                $status = $integration->getWorkflowStatus($workflowId);
                
                echo json_encode([
                    'success' => true,
                    'data' => $status,
                    'message' => 'ワークフロー状態を取得しました'
                ]);
                break;
                
            case 'retry_failed_approval':
                $workflowId = $input['workflow_id'] ?? 0;
                $result = $integration->retryFailedApproval($workflowId);
                
                echo json_encode($result);
                break;
                
            default:
                echo json_encode([
                    'success' => false,
                    'message' => '無効なアクションです: ' . $action
                ]);
        }
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'APIエラー: ' . $e->getMessage()
        ]);
    }
    
    exit;
}
?>