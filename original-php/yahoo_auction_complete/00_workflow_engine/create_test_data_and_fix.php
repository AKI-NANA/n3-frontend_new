<?php
/**
 * NAGANO-3 統合ワークフローシステム - テストデータ作成・修正版
 * データが表示されない問題を解決
 */

header('Content-Type: application/json; charset=utf-8');

class WorkflowTestDataManager {
    private $pdo;
    private $logger;
    
    public function __construct() {
        $this->pdo = $this->getDatabaseConnection();
        $this->logger = new SimpleLogger(__DIR__ . '/logs/test_data_' . date('Y-m-d') . '.log');
        
        $this->logger->info('テストデータマネージャー初期化完了');
    }
    
    /**
     * 完全修復実行
     */
    public function executeCompleteSetup() {
        $this->logger->info('完全セットアップ開始');
        
        try {
            // 1. データベース接続確認
            $dbResult = $this->checkDatabaseConnection();
            
            // 2. テーブル作成・確認
            $tableResult = $this->ensureWorkflowTables();
            
            // 3. サンプルデータ作成
            $dataResult = $this->createSampleWorkflows();
            
            // 4. 統計データ作成
            $statsResult = $this->generateStatisticsData();
            
            return [
                'success' => true,
                'message' => '完全セットアップが正常に完了しました',
                'results' => [
                    'database' => $dbResult,
                    'tables' => $tableResult,
                    'sample_data' => $dataResult,
                    'statistics' => $statsResult
                ],
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
        } catch (Exception $e) {
            $this->logger->error('完全セットアップエラー: ' . $e->getMessage());
            
            return [
                'success' => false,
                'message' => 'セットアップエラー: ' . $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }
    
    /**
     * データベース接続確認
     */
    private function checkDatabaseConnection() {
        $this->logger->info('データベース接続確認開始');
        
        if (!$this->pdo) {
            throw new Exception('データベース接続に失敗しました');
        }
        
        // テスト用クエリ実行
        $stmt = $this->pdo->query("SELECT version()");
        $version = $stmt->fetchColumn();
        
        $this->logger->info('データベース接続成功: PostgreSQL ' . $version);
        
        return [
            'success' => true,
            'message' => 'PostgreSQL接続成功',
            'version' => $version
        ];
    }
    
    /**
     * ワークフローテーブル作成・確認
     */
    private function ensureWorkflowTables() {
        $this->logger->info('ワークフローテーブル作成・確認開始');
        
        // workflowsテーブル作成
        $createWorkflowsSQL = "
        CREATE TABLE IF NOT EXISTS workflows (
            id SERIAL PRIMARY KEY,
            yahoo_auction_id VARCHAR(255) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'started',
            current_step INTEGER DEFAULT 1,
            data JSONB,
            priority INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ";
        
        $this->pdo->exec($createWorkflowsSQL);
        
        // workflow_stepsテーブル作成
        $createStepsSQL = "
        CREATE TABLE IF NOT EXISTS workflow_steps (
            id SERIAL PRIMARY KEY,
            workflow_id INTEGER REFERENCES workflows(id),
            step_number INTEGER NOT NULL,
            step_name VARCHAR(100) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            error_message TEXT
        )
        ";
        
        $this->pdo->exec($createStepsSQL);
        
        // インデックス作成
        $createIndexes = [
            "CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status)",
            "CREATE INDEX IF NOT EXISTS idx_workflows_created ON workflows(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps(workflow_id)"
        ];
        
        foreach ($createIndexes as $indexSQL) {
            $this->pdo->exec($indexSQL);
        }
        
        $this->logger->info('ワークフローテーブル準備完了');
        
        return [
            'success' => true,
            'message' => 'ワークフローテーブル準備完了',
            'tables_created' => ['workflows', 'workflow_steps']
        ];
    }
    
    /**
     * サンプルワークフロー作成
     */
    private function createSampleWorkflows() {
        $this->logger->info('サンプルワークフロー作成開始');
        
        // 既存のサンプルデータをクリア
        $this->pdo->exec("DELETE FROM workflow_steps WHERE workflow_id IN (SELECT id FROM workflows WHERE yahoo_auction_id LIKE 'test_auction_%' OR yahoo_auction_id LIKE 'approval_flow_%')");
        $this->pdo->exec("DELETE FROM workflows WHERE yahoo_auction_id LIKE 'test_auction_%' OR yahoo_auction_id LIKE 'approval_flow_%'");
        
        $sampleWorkflows = [
            [
                'yahoo_auction_id' => 'test_auction_001',
                'status' => 'processing',
                'current_step' => 7,
                'priority' => 1,
                'created_at' => date('Y-m-d H:i:s', strtotime('-2 hours'))
            ],
            [
                'yahoo_auction_id' => 'test_auction_002', 
                'status' => 'approved',
                'current_step' => 8,
                'priority' => 2,
                'created_at' => date('Y-m-d H:i:s', strtotime('-5 hours'))
            ],
            [
                'yahoo_auction_id' => 'test_auction_003',
                'status' => 'completed',
                'current_step' => 9,
                'priority' => 0,
                'created_at' => date('Y-m-d H:i:s', strtotime('-8 hours'))
            ],
            [
                'yahoo_auction_id' => 'test_auction_004',
                'status' => 'failed',
                'current_step' => 5,
                'priority' => 1,
                'created_at' => date('Y-m-d H:i:s', strtotime('-12 hours'))
            ],
            [
                'yahoo_auction_id' => 'approval_flow_' . time(),
                'status' => 'started',
                'current_step' => 1,
                'priority' => 3,
                'created_at' => date('Y-m-d H:i:s', strtotime('-30 minutes'))
            ],
            [
                'yahoo_auction_id' => 'approval_flow_' . (time() - 120),
                'status' => 'processing',
                'current_step' => 3,
                'priority' => 2,
                'created_at' => date('Y-m-d H:i:s', strtotime('-45 minutes'))
            ]
        ];
        
        $insertSQL = "
        INSERT INTO workflows (yahoo_auction_id, status, current_step, priority, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING id
        ";
        
        $createdCount = 0;
        foreach ($sampleWorkflows as $workflow) {
            try {
                $data = json_encode([
                    'sample' => true,
                    'created_by' => 'test_data_manager',
                    'test_data' => true,
                    'step_info' => $this->getStepInfo($workflow['current_step'])
                ]);
                
                $stmt = $this->pdo->prepare($insertSQL);
                $stmt->execute([
                    $workflow['yahoo_auction_id'],
                    $workflow['status'],
                    $workflow['current_step'],
                    $workflow['priority'],
                    $data,
                    $workflow['created_at'],
                    date('Y-m-d H:i:s')
                ]);
                
                $workflowId = $stmt->fetchColumn();
                
                // ステップ履歴も作成
                $this->createStepHistory($workflowId, $workflow['current_step'], $workflow['status']);
                
                $createdCount++;
                
            } catch (Exception $e) {
                $this->logger->error('サンプルワークフロー作成エラー: ' . $e->getMessage());
            }
        }
        
        $this->logger->info('サンプルワークフロー作成完了: ' . $createdCount . '件');
        
        return [
            'success' => true,
            'message' => "サンプルワークフロー {$createdCount}件を作成しました",
            'created_count' => $createdCount
        ];
    }
    
    /**
     * ステップ履歴作成
     */
    private function createStepHistory($workflowId, $currentStep, $status) {
        $stepNames = [
            1 => '02_scraping',
            2 => '06_filters', 
            3 => '09_shipping',
            4 => '11_category',
            5 => '12_html_editor',
            6 => '07_editing',
            7 => '03_approval',
            8 => '08_listing',
            9 => '10_zaiko'
        ];
        
        $insertStepSQL = "
        INSERT INTO workflow_steps (workflow_id, step_number, step_name, status, started_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ";
        
        for ($step = 1; $step <= $currentStep; $step++) {
            $stepStatus = ($step < $currentStep) ? 'completed' : 
                         (($step == $currentStep && $status == 'completed') ? 'completed' : 
                         (($step == $currentStep && $status == 'failed') ? 'failed' : 'processing'));
            
            $startedAt = date('Y-m-d H:i:s', strtotime('-' . (($currentStep - $step) * 30 + 15) . ' minutes'));
            $completedAt = ($stepStatus == 'completed') ? 
                          date('Y-m-d H:i:s', strtotime('-' . (($currentStep - $step) * 30) . ' minutes')) : 
                          null;
            
            $stmt = $this->pdo->prepare($insertStepSQL);
            $stmt->execute([
                $workflowId,
                $step,
                $stepNames[$step],
                $stepStatus,
                $startedAt,
                $completedAt
            ]);
        }
    }
    
    /**
     * ステップ情報取得
     */
    private function getStepInfo($step) {
        $stepInfo = [
            1 => ['name' => '02_scraping', 'description' => 'Yahoo Auctionデータ取得'],
            2 => ['name' => '06_filters', 'description' => 'フィルタリング処理'],
            3 => ['name' => '09_shipping', 'description' => '送料計算'],
            4 => ['name' => '11_category', 'description' => 'カテゴリ分析'],
            5 => ['name' => '12_html_editor', 'description' => 'HTML生成'],
            6 => ['name' => '07_editing', 'description' => 'データ編集'],
            7 => ['name' => '03_approval', 'description' => '商品承認'],
            8 => ['name' => '08_listing', 'description' => 'eBay出品'],
            9 => ['name' => '10_zaiko', 'description' => '在庫更新']
        ];
        
        return $stepInfo[$step] ?? ['name' => 'unknown', 'description' => '不明なステップ'];
    }
    
    /**
     * 統計データ生成
     */
    private function generateStatisticsData() {
        $this->logger->info('統計データ生成開始');
        
        try {
            // ワークフロー統計取得
            $statsSQL = "
            SELECT 
                status,
                COUNT(*) as count,
                AVG(current_step) as avg_step,
                MAX(created_at) as latest_created
            FROM workflows 
            GROUP BY status
            ";
            
            $stmt = $this->pdo->query($statsSQL);
            $statistics = $stmt->fetchAll();
            
            // 時間別統計
            $hourlySQL = "
            SELECT 
                EXTRACT(HOUR FROM created_at) as hour,
                COUNT(*) as count
            FROM workflows 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY EXTRACT(HOUR FROM created_at)
            ORDER BY hour
            ";
            
            $stmt = $this->pdo->query($hourlySQL);
            $hourlyStats = $stmt->fetchAll();
            
            $this->logger->info('統計データ生成完了');
            
            return [
                'success' => true,
                'message' => '統計データ生成完了',
                'status_stats' => $statistics,
                'hourly_stats' => $hourlyStats,
                'generation_time' => date('Y-m-d H:i:s')
            ];
            
        } catch (Exception $e) {
            $this->logger->error('統計データ生成エラー: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * データベース接続取得
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
            throw new Exception("データベース接続エラー: " . $e->getMessage());
        }
    }
}

/**
 * シンプルログクラス
 */
class SimpleLogger {
    private $logFile;
    
    public function __construct($logFile) {
        $this->logFile = $logFile;
        
        $logDir = dirname($logFile);
        if (!file_exists($logDir)) {
            mkdir($logDir, 0777, true);
        }
    }
    
    public function log($level, $message) {
        $logEntry = "[" . date('Y-m-d H:i:s') . "] [{$level}] {$message}" . PHP_EOL;
        file_put_contents($this->logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
    
    public function info($message) {
        $this->log('INFO', $message);
    }
    
    public function error($message) {
        $this->log('ERROR', $message);
    }
}

// API実行
try {
    $manager = new WorkflowTestDataManager();
    $result = $manager->executeCompleteSetup();
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'セットアップ実行エラー: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
?>
