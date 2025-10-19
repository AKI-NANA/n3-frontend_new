<?php
/**
 * 設定駆動型ワークフローエンジン
 * フィードバック反映：YAML設定による柔軟なワークフロー管理
 */

require_once __DIR__ . '/../queue/RedisJobQueue.php';
require_once __DIR__ . '/../new_structure/03_approval/api/UnifiedLogger.php';
require_once __DIR__ . '/../new_structure/03_approval/api/DatabaseConnection.php';

class ConfigurableWorkflowEngine {
    private $config;
    private $pdo;
    private $logger;
    private $jobQueue;
    private $stepProcessors;
    
    public function __construct($configFile = null) {
        $this->pdo = getDatabaseConnection();
        $this->logger = getLogger('workflow_engine');
        $this->jobQueue = getWorkflowQueue();
        
        $this->loadConfiguration($configFile);
        $this->initializeStepProcessors();
        
        $this->logger->info('Workflow engine initialized', [
            'workflow_count' => count($this->config['workflows'] ?? []),
            'config_file' => $configFile
        ]);
    }
    
    /**
     * 設定ファイル読み込み
     */
    private function loadConfiguration($configFile) {
        $configFile = $configFile ?: __DIR__ . '/workflow_config.yaml';
        
        if (!file_exists($configFile)) {
            $this->createDefaultConfig($configFile);
        }
        
        // 簡易YAML パーサー（本格実装ではSymfony/Yamlを使用）
        $this->config = $this->parseYamlConfig($configFile);
        
        if (empty($this->config)) {
            throw new Exception("Failed to load workflow configuration from {$configFile}");
        }
    }
    
    /**
     * デフォルト設定作成
     */
    private function createDefaultConfig($configFile) {
        $defaultConfig = <<<YAML
workflows:
  yahoo_to_ebay:
    name: "Yahoo Auction to eBay Workflow"
    description: "Complete automation from Yahoo scraping to eBay listing"
    steps:
      1:
        name: "scraping"
        endpoint: "/new_structure/02_scraping/api/scrape.php"
        method: "POST"
        timeout: 30
        auto_proceed: true
        required_fields: ["yahoo_auction_id"]
        success_status: ["success"]
      2:
        name: "filtering"
        endpoint: "/new_structure/06_filters/api/filter.php"
        method: "POST"
        timeout: 10
        auto_proceed: true
        required_fields: ["product_data"]
        success_status: ["success", "warning"]
      3:
        name: "shipping_calculation"
        endpoint: "/new_structure/09_shipping/api/calculate.php"
        method: "POST"
        timeout: 15
        auto_proceed: true
        required_fields: ["product_data", "dimensions"]
        success_status: ["success"]
      4:
        name: "categorization"
        endpoint: "/new_structure/11_category/api/categorize.php"
        method: "POST"
        timeout: 20
        auto_proceed: true
        required_fields: ["product_data"]
        success_status: ["success"]
      5:
        name: "html_generation"
        endpoint: "/new_structure/12_html_editor/api/generate.php"
        method: "POST"
        timeout: 10
        auto_proceed: true
        required_fields: ["product_data", "category_data"]
        success_status: ["success"]
      6:
        name: "editing"
        endpoint: "/new_structure/07_editing/api/edit.php"
        method: "GET"
        timeout: 5
        auto_proceed: false
        manual_review: true
        required_fields: ["product_data"]
        success_status: ["success"]
      7:
        name: "approval"
        endpoint: "/new_structure/03_approval/api/approval.php"
        method: "POST"
        timeout: 5
        auto_proceed: false
        manual_approval: true
        required_fields: ["product_data"]
        success_status: ["approved"]
      8:
        name: "listing"
        endpoint: "/new_structure/08_listing/api/listing.php"
        method: "POST"
        timeout: 30
        auto_proceed: true
        required_fields: ["approved_data"]
        success_status: ["success", "listed"]
      9:
        name: "inventory"
        endpoint: "/new_structure/10_zaiko/api/update.php"
        method: "POST"
        timeout: 5
        auto_proceed: true
        required_fields: ["listed_data", "ebay_item_id"]
        success_status: ["success"]
    
    error_handling:
      max_retries: 3
      retry_delay: 60
      escalation_after: 3
      notification_on_failure: true
      
    monitoring:
      enable_logging: true
      enable_metrics: true
      heartbeat_interval: 30
      
settings:
  default_timeout: 30
  max_concurrent_workflows: 10
  enable_auto_recovery: true
  enable_notifications: true
  
notifications:
  email:
    enabled: false
  slack:
    enabled: false
    webhook_url: ""
  
recovery:
  auto_retry_failed: true
  cleanup_completed_after: "24 hours"
  cleanup_failed_after: "7 days"
YAML;
        
        file_put_contents($configFile, $defaultConfig);
        $this->logger->info('Created default workflow configuration', [
            'config_file' => $configFile
        ]);
    }
    
    /**
     * 簡易YAMLパーサー
     */
    private function parseYamlConfig($configFile) {
        $content = file_get_contents($configFile);
        if ($content === false) {
            throw new Exception("Cannot read config file: {$configFile}");
        }
        
        // 本格実装では Symfony/Yaml を使用
        // ここでは簡易的な実装
        $config = [];
        $lines = explode("\n", $content);
        $currentSection = null;
        $currentWorkflow = null;
        $currentStep = null;
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            
            if (preg_match('/^(\w+):$/', $line, $matches)) {
                $currentSection = $matches[1];
                $config[$currentSection] = [];
            } elseif (preg_match('/^  (\w+):$/', $line, $matches)) {
                if ($currentSection === 'workflows') {
                    $currentWorkflow = $matches[1];
                    $config[$currentSection][$currentWorkflow] = [];
                }
            } elseif (preg_match('/^    (\w+):(.*)$/', $line, $matches)) {
                $key = $matches[1];
                $value = trim($matches[2]);
                
                if ($key === 'steps') {
                    $config[$currentSection][$currentWorkflow][$key] = [];
                } else {
                    $config[$currentSection][$currentWorkflow][$key] = $this->parseValue($value);
                }
            } elseif (preg_match('/^      (\d+):$/', $line, $matches)) {
                $currentStep = (int)$matches[1];
                $config[$currentSection][$currentWorkflow]['steps'][$currentStep] = [];
            } elseif (preg_match('/^        (\w+):(.*)$/', $line, $matches)) {
                $key = $matches[1];
                $value = trim($matches[2]);
                $config[$currentSection][$currentWorkflow]['steps'][$currentStep][$key] = $this->parseValue($value);
            }
        }
        
        return $config;
    }
    
    /**
     * 値のパース
     */
    private function parseValue($value) {
        $value = trim($value, '"\'');
        
        if ($value === 'true') return true;
        if ($value === 'false') return false;
        if (is_numeric($value)) return is_float($value) ? (float)$value : (int)$value;
        if (strpos($value, '[') === 0) {
            // 簡易配列パース
            $value = trim($value, '[]');
            return array_map('trim', explode(',', $value));
        }
        
        return $value;
    }
    
    /**
     * ステッププロセッサー初期化
     */
    private function initializeStepProcessors() {
        $this->stepProcessors = [
            'scraping' => new ScrapingProcessor($this->pdo, $this->logger),
            'filtering' => new FilteringProcessor($this->pdo, $this->logger),
            'shipping_calculation' => new ShippingProcessor($this->pdo, $this->logger),
            'categorization' => new CategorizationProcessor($this->pdo, $this->logger),
            'html_generation' => new HtmlGenerationProcessor($this->pdo, $this->logger),
            'editing' => new EditingProcessor($this->pdo, $this->logger),
            'approval' => new ApprovalProcessor($this->pdo, $this->logger),
            'listing' => new ListingProcessor($this->pdo, $this->logger),
            'inventory' => new InventoryProcessor($this->pdo, $this->logger)
        ];
    }
    
    /**
     * ワークフロー開始
     */
    public function startWorkflow($workflowType, $initialData, $options = []) {
        $startTime = microtime(true);
        
        try {
            if (!isset($this->config['workflows'][$workflowType])) {
                throw new Exception("Unknown workflow type: {$workflowType}");
            }
            
            $workflowConfig = $this->config['workflows'][$workflowType];
            
            // ワークフロー作成
            $workflowId = $this->createWorkflow($workflowType, $initialData, $options);
            
            // 最初のステップをキューに追加
            $firstStepConfig = reset($workflowConfig['steps']);
            $this->enqueueStep($workflowId, 1, $firstStepConfig['name'], $initialData);
            
            $this->logger->info('Workflow started', [
                'workflow_id' => $workflowId,
                'workflow_type' => $workflowType,
                'initial_data_size' => strlen(json_encode($initialData)),
                'first_step' => $firstStepConfig['name']
            ]);
            
            $this->logger->logPerformance('Start workflow', $startTime, [
                'workflow_id' => $workflowId,
                'workflow_type' => $workflowType
            ]);
            
            return $workflowId;
            
        } catch (Exception $e) {
            $this->logger->error('Failed to start workflow', [
                'workflow_type' => $workflowType,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * ワークフロー作成
     */
    private function createWorkflow($workflowType, $initialData, $options) {
        $sql = "
            INSERT INTO workflows (
                yahoo_auction_id, product_id, status, current_step, 
                next_step, priority, data, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            RETURNING id
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $initialData['yahoo_auction_id'] ?? uniqid('wf_'),
            $initialData['product_id'] ?? null,
            'processing',
            1,
            1,
            $options['priority'] ?? 0,
            json_encode($initialData)
        ]);
        
        return $stmt->fetchColumn();
    }
    
    /**
     * ステップをキューに追加
     */
    private function enqueueStep($workflowId, $stepNumber, $stepName, $data, $priority = 0) {
        $job = [
            'workflow_id' => $workflowId,
            'step_number' => $stepNumber,
            'step_name' => $stepName,
            'data' => $data,
            'created_at' => time()
        ];
        
        return $this->jobQueue->addJob($job, $priority);
    }
    
    /**
     * ジョブ処理
     */
    public function processJob($job) {
        $startTime = microtime(true);
        
        try {
            $workflowId = $job['data']['workflow_id'];
            $stepNumber = $job['data']['step_number'];
            $stepName = $job['data']['step_name'];
            $inputData = $job['data']['data'];
            
            $this->logger->info('Processing workflow step', [
                'workflow_id' => $workflowId,
                'step_number' => $stepNumber,
                'step_name' => $stepName
            ]);
            
            // ワークフロー設定取得
            $workflow = $this->getWorkflowById($workflowId);
            if (!$workflow) {
                throw new Exception("Workflow not found: {$workflowId}");
            }
            
            $workflowType = $this->determineWorkflowType($workflow);
            $workflowConfig = $this->config['workflows'][$workflowType];
            $stepConfig = $workflowConfig['steps'][$stepNumber];
            
            // ステップ実行
            $result = $this->executeStep($workflowId, $stepConfig, $inputData);
            
            // 実行記録
            $this->recordStepExecution($workflowId, $stepNumber, $stepName, $inputData, $result, 'success');
            
            // 次のステップ判定
            if ($result['success'] && $stepConfig['auto_proceed'] && isset($workflowConfig['steps'][$stepNumber + 1])) {
                $nextStepConfig = $workflowConfig['steps'][$stepNumber + 1];
                $this->enqueueStep($workflowId, $stepNumber + 1, $nextStepConfig['name'], $result['data']);
                
                // ワークフロー状態更新
                $this->updateWorkflowStep($workflowId, $stepNumber + 1);
            } elseif ($result['success'] && !$stepConfig['auto_proceed']) {
                // 手動処理待ち
                $this->updateWorkflowStatus($workflowId, 'waiting_manual');
                $this->logger->info('Workflow waiting for manual intervention', [
                    'workflow_id' => $workflowId,
                    'step_name' => $stepName
                ]);
            } elseif (!$result['success']) {
                // ステップ失敗
                throw new Exception($result['error'] ?? 'Step execution failed');
            }
            
            $this->logger->logPerformance("Process workflow step: {$stepName}", $startTime, [
                'workflow_id' => $workflowId,
                'step_number' => $stepNumber,
                'success' => $result['success']
            ]);
            
            return $result;
            
        } catch (Exception $e) {
            // 失敗記録
            $this->recordStepExecution(
                $workflowId ?? 'unknown',
                $stepNumber ?? 0,
                $stepName ?? 'unknown',
                $inputData ?? [],
                ['error' => $e->getMessage()],
                'failed'
            );
            
            $this->logger->error('Workflow step processing failed', [
                'workflow_id' => $workflowId ?? 'unknown',
                'step_name' => $stepName ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }
    
    /**
     * ステップ実行
     */
    private function executeStep($workflowId, $stepConfig, $inputData) {
        $processor = $this->stepProcessors[$stepConfig['name']] ?? null;
        
        if (!$processor) {
            throw new Exception("No processor found for step: {$stepConfig['name']}");
        }
        
        return $processor->process($workflowId, $stepConfig, $inputData);
    }
    
    /**
     * 手動ステップ再開
     */
    public function resumeWorkflow($workflowId, $approvalData = []) {
        try {
            $workflow = $this->getWorkflowById($workflowId);
            if (!$workflow) {
                throw new Exception("Workflow not found: {$workflowId}");
            }
            
            if ($workflow['status'] !== 'waiting_manual') {
                throw new Exception("Workflow is not waiting for manual intervention: {$workflowId}");
            }
            
            $workflowType = $this->determineWorkflowType($workflow);
            $workflowConfig = $this->config['workflows'][$workflowType];
            $currentStep = $workflow['current_step'];
            
            if (isset($workflowConfig['steps'][$currentStep + 1])) {
                $nextStepConfig = $workflowConfig['steps'][$currentStep + 1];
                
                // 承認データをマージ
                $workflowData = json_decode($workflow['data'], true);
                $mergedData = array_merge($workflowData, $approvalData);
                
                $this->enqueueStep($workflowId, $currentStep + 1, $nextStepConfig['name'], $mergedData);
                $this->updateWorkflowStep($workflowId, $currentStep + 1);
                $this->updateWorkflowStatus($workflowId, 'processing');
                
                $this->logger->info('Workflow resumed', [
                    'workflow_id' => $workflowId,
                    'next_step' => $nextStepConfig['name']
                ]);
            } else {
                $this->updateWorkflowStatus($workflowId, 'completed');
                $this->logger->info('Workflow completed', [
                    'workflow_id' => $workflowId
                ]);
            }
            
        } catch (Exception $e) {
            $this->logger->error('Failed to resume workflow', [
                'workflow_id' => $workflowId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * ワークフロー統計取得
     */
    public function getWorkflowStatistics() {
        try {
            $sql = "
                SELECT 
                    status,
                    COUNT(*) as count,
                    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration
                FROM workflows 
                WHERE created_at >= NOW() - INTERVAL '24 hours'
                GROUP BY status
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $statusStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // ステップ別統計
            $stepSQL = "
                SELECT 
                    step_name,
                    status,
                    COUNT(*) as count,
                    AVG(processing_time) as avg_processing_time
                FROM workflow_executions 
                WHERE created_at >= NOW() - INTERVAL '24 hours'
                GROUP BY step_name, status
            ";
            
            $stepStmt = $this->pdo->prepare($stepSQL);
            $stepStmt->execute();
            $stepStats = $stepStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // キュー統計
            $queueStats = $this->jobQueue->getStatistics();
            
            return [
                'workflow_status' => $statusStats,
                'step_statistics' => $stepStats,
                'queue_statistics' => $queueStats,
                'performance_metrics' => $this->jobQueue->getPerformanceMetrics()
            ];
            
        } catch (Exception $e) {
            $this->logger->error('Failed to get workflow statistics', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    // ヘルパーメソッド
    private function getWorkflowById($workflowId) {
        $sql = "SELECT * FROM workflows WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$workflowId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    private function determineWorkflowType($workflow) {
        // 簡易実装：現在はyahoo_to_ebayのみ
        return 'yahoo_to_ebay';
    }
    
    private function updateWorkflowStep($workflowId, $stepNumber) {
        $sql = "
            UPDATE workflows 
            SET current_step = ?, next_step = ?, updated_at = NOW() 
            WHERE id = ?
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$stepNumber, $stepNumber, $workflowId]);
    }
    
    private function updateWorkflowStatus($workflowId, $status) {
        $sql = "
            UPDATE workflows 
            SET status = ?, updated_at = NOW() 
            WHERE id = ?
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$status, $workflowId]);
    }
    
    private function recordStepExecution($workflowId, $stepNumber, $stepName, $inputData, $outputData, $status) {
        $sql = "
            INSERT INTO workflow_executions (
                workflow_id, step_number, step_name, input_data, 
                output_data, status, processing_time, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $workflowId,
            $stepNumber,
            $stepName,
            json_encode($inputData),
            json_encode($outputData),
            $status,
            0 // 処理時間は後で実装
        ]);
    }
}

/**
 * グローバルワークフローエンジンインスタンス
 */
function getWorkflowEngine() {
    static $engine = null;
    
    if ($engine === null) {
        $engine = new ConfigurableWorkflowEngine();
    }
    
    return $engine;
}
