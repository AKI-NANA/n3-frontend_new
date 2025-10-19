<?php
/**
 * NAGANO-3 完全自動ツール連携システム
 * 
 * 02_scraping → 06_filters → 09_shipping → 11_category → 12_html_editor 
 * → 07_editing → 03_approval → 08_listing → 10_zaiko
 * 
 * 設定駆動型で各ステップの自動実行・手動停止を制御
 */

class CompleteAutoWorkflowSystem {
    private $config;
    private $redis;
    private $db;
    private $logger;
    
    // 各ツールのAPIエンドポイント
    private $toolEndpoints = [
        '02_scraping' => '/02_scraping/scraping.php',
        '06_filters' => '/06_filters/filters.php',
        '09_shipping' => '/09_shipping/shipping_calculation.php',
        '11_category' => '/11_category/category_selection.php',
        '12_html_editor' => '/12_html_editor/html_editor.php',
        '07_editing' => '/07_editing/editing.php',
        '03_approval' => '/03_approval/approval.php',
        '08_listing' => '/08_listing/listing.php',
        '10_zaiko' => '/10_zaiko/zaiko.php'
    ];
    
    // 手動確認が必要なステップ
    private $manualCheckpoints = [
        '07_editing',   // データ編集確認
        '03_approval'   // 最終承認
    ];
    
    public function __construct() {
        $this->config = $this->loadWorkflowConfig();
        $this->redis = $this->initializeRedis();
        $this->db = $this->initializeDatabase();
        $this->logger = new WorkflowLogger('complete_auto_workflow');
    }
    
    /**
     * スクレイピング完了後の完全自動ワークフロー開始
     */
    public function startCompleteWorkflow($scrapingResult) {
        try {
            $workflowId = $this->generateWorkflowId();
            
            $this->logger->info('完全自動ワークフロー開始', [
                'workflow_id' => $workflowId,
                'scraped_items' => count($scrapingResult['items'] ?? []),
                'trigger' => 'auto_after_scraping'
            ]);
            
            // 1. ワークフローをデータベースに登録
            $this->registerWorkflow($workflowId, $scrapingResult);
            
            // 2. 自動実行ステップを順次実行
            $currentData = $scrapingResult;
            $executedSteps = ['02_scraping']; // スクレイピングは完了済み
            
            // 3. フィルター → 送料計算 → カテゴリー → HTML生成まで自動実行
            $autoSteps = ['06_filters', '09_shipping', '11_category', '12_html_editor'];
            
            foreach ($autoSteps as $stepName) {
                $stepResult = $this->executeToolStep($workflowId, $stepName, $currentData);
                
                if (!$stepResult['success']) {
                    $this->handleStepFailure($workflowId, $stepName, $stepResult);
                    break;
                }
                
                $currentData = $stepResult['data'];
                $executedSteps[] = $stepName;
                $this->updateWorkflowProgress($workflowId, $stepName, 'completed');
                
                $this->logger->info('自動ステップ完了', [
                    'workflow_id' => $workflowId,
                    'step' => $stepName,
                    'execution_time' => $stepResult['execution_time'] ?? 0
                ]);
            }
            
            // 4. データ編集ステップで一時停止（手動確認必要）
            if (in_array('12_html_editor', $executedSteps)) {
                $this->pauseForManualStep($workflowId, '07_editing', $currentData);
                
                return [
                    'success' => true,
                    'workflow_id' => $workflowId,
                    'status' => 'paused_for_editing',
                    'message' => '自動処理完了。データ編集での確認をお待ちしています。',
                    'completed_steps' => $executedSteps,
                    'next_action' => [
                        'step' => '07_editing',
                        'url' => $this->getToolUrl('07_editing') . '?workflow_id=' . $workflowId,
                        'instructions' => 'データ編集画面で内容を確認し、「承認へ進む」をクリックしてください。'
                    ],
                    'dashboard_url' => $this->getDashboardUrl($workflowId)
                ];
            }
            
        } catch (Exception $e) {
            $this->logger->error('完全自動ワークフローエラー', [
                'error' => $e->getMessage(),
                'workflow_id' => $workflowId ?? null
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'recovery_action' => 'manual_intervention_required'
            ];
        }
    }
    
    /**
     * 手動ステップ完了後の自動続行
     */
    public function continueWorkflowAfterManualStep($workflowId, $completedStep, $updatedData) {
        try {
            $this->logger->info('手動ステップ完了、自動続行', [
                'workflow_id' => $workflowId,
                'completed_step' => $completedStep
            ]);
            
            $this->updateWorkflowProgress($workflowId, $completedStep, 'completed');
            
            // データ編集完了後 → 承認ステップ（手動）
            if ($completedStep === '07_editing') {
                $this->pauseForManualStep($workflowId, '03_approval', $updatedData);
                
                return [
                    'success' => true,
                    'status' => 'paused_for_approval',
                    'message' => 'データ編集完了。承認をお待ちしています。',
                    'next_action' => [
                        'step' => '03_approval',
                        'url' => $this->getToolUrl('03_approval') . '?workflow_id=' . $workflowId,
                        'instructions' => '承認画面で最終確認し、承認または否認を選択してください。'
                    ]
                ];
            }
            
            // 承認完了後 → 出品・在庫管理自動実行
            if ($completedStep === '03_approval') {
                $finalSteps = ['08_listing', '10_zaiko'];
                $currentData = $updatedData;
                
                foreach ($finalSteps as $stepName) {
                    $stepResult = $this->executeToolStep($workflowId, $stepName, $currentData);
                    
                    if (!$stepResult['success']) {
                        $this->handleStepFailure($workflowId, $stepName, $stepResult);
                        break;
                    }
                    
                    $currentData = $stepResult['data'];
                    $this->updateWorkflowProgress($workflowId, $stepName, 'completed');
                }
                
                // 完全完了
                $this->completeWorkflow($workflowId, $currentData);
                
                return [
                    'success' => true,
                    'status' => 'completed',
                    'message' => '全ワークフロー完了！eBay出品・在庫管理まで完了しました。',
                    'final_data' => $currentData,
                    'listing_results' => $currentData['listing_results'] ?? []
                ];
            }
            
        } catch (Exception $e) {
            $this->handleWorkflowError($workflowId, $e);
            throw $e;
        }
    }
    
    /**
     * 個別ツールステップの実行
     */
    private function executeToolStep($workflowId, $stepName, $inputData) {
        $startTime = microtime(true);
        
        try {
            $endpoint = $this->getToolUrl($stepName);
            
            // 各ツール固有のデータ変換
            $toolData = $this->prepareToolData($stepName, $inputData, $workflowId);
            
            // HTTP APIコール
            $response = $this->callToolAPI($endpoint, $toolData);
            
            $executionTime = (microtime(true) - $startTime) * 1000; // ms
            
            if ($response['success']) {
                return [
                    'success' => true,
                    'data' => $response['data'],
                    'execution_time' => $executionTime,
                    'step_info' => [
                        'step' => $stepName,
                        'processed_items' => count($response['data']['items'] ?? []),
                        'status' => 'completed'
                    ]
                ];
            } else {
                throw new Exception("ツールAPI実行エラー: " . ($response['error'] ?? 'Unknown error'));
            }
            
        } catch (Exception $e) {
            $executionTime = (microtime(true) - $startTime) * 1000;
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'execution_time' => $executionTime,
                'step_info' => [
                    'step' => $stepName,
                    'status' => 'failed'
                ]
            ];
        }
    }
    
    /**
     * 各ツール向けデータ準備
     */
    private function prepareToolData($stepName, $inputData, $workflowId) {
        $baseData = [
            'workflow_id' => $workflowId,
            'timestamp' => date('Y-m-d H:i:s'),
            'items' => $inputData['items'] ?? [],
            'metadata' => $inputData['metadata'] ?? []
        ];
        
        switch ($stepName) {
            case '06_filters':
                return array_merge($baseData, [
                    'action' => 'filter_items',
                    'filter_config' => $this->config['filters'] ?? []
                ]);
                
            case '09_shipping':
                return array_merge($baseData, [
                    'action' => 'calculate_shipping',
                    'shipping_config' => $this->config['shipping'] ?? []
                ]);
                
            case '11_category':
                return array_merge($baseData, [
                    'action' => 'categorize_items',
                    'category_config' => $this->config['category'] ?? []
                ]);
                
            case '12_html_editor':
                return array_merge($baseData, [
                    'action' => 'generate_html',
                    'template_config' => $this->config['html_templates'] ?? []
                ]);
                
            case '08_listing':
                return array_merge($baseData, [
                    'action' => 'list_items',
                    'ebay_config' => $this->config['ebay'] ?? [],
                    'auto_list' => true
                ]);
                
            case '10_zaiko':
                return array_merge($baseData, [
                    'action' => 'update_inventory',
                    'inventory_config' => $this->config['inventory'] ?? []
                ]);
                
            default:
                return $baseData;
        }
    }
    
    /**
     * ツールAPI呼び出し
     */
    private function callToolAPI($endpoint, $data) {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $endpoint,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-Workflow-Auto: true'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 300, // 5分タイムアウト
            CURLOPT_CONNECTTIMEOUT => 30
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        if ($curlError) {
            throw new Exception("API接続エラー: {$curlError}");
        }
        
        if ($httpCode !== 200) {
            throw new Exception("API HTTPエラー: {$httpCode}");
        }
        
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("APIレスポンス解析エラー: " . json_last_error_msg());
        }
        
        return $result;
    }
    
    /**
     * 手動ステップでの一時停止
     */
    private function pauseForManualStep($workflowId, $stepName, $data) {
        // データベースに一時停止状態を記録
        $this->updateWorkflowProgress($workflowId, $stepName, 'waiting_manual');
        
        // 通知送信
        $this->sendManualStepNotification($workflowId, $stepName, $data);
        
        // Redisに手動待機キューを追加
        if ($this->redis) {
            $this->redis->hSet("manual_queue:{$workflowId}", $stepName, json_encode($data));
        }
    }
    
    /**
     * 手動ステップ通知送信
     */
    private function sendManualStepNotification($workflowId, $stepName, $data) {
        $notifications = [
            '07_editing' => [
                'title' => '🔍 データ編集確認が必要です',
                'message' => 'スクレイピング→フィルター→送料計算→カテゴリー→HTML生成が完了しました。データ編集画面で最終確認をお願いします。',
                'priority' => 'medium',
                'estimated_time' => '5-10分'
            ],
            '03_approval' => [
                'title' => '✅ 最終承認をお待ちしています',
                'message' => 'データ編集が完了しました。承認画面で最終確認・承認を行ってください。承認後は自動でeBay出品されます。',
                'priority' => 'high',
                'estimated_time' => '2-5分'
            ]
        ];
        
        if (isset($notifications[$stepName])) {
            $notification = $notifications[$stepName];
            $notification['workflow_id'] = $workflowId;
            $notification['step'] = $stepName;
            $notification['action_url'] = $this->getToolUrl($stepName) . '?workflow_id=' . $workflowId;
            $notification['dashboard_url'] = $this->getDashboardUrl($workflowId);
            
            // 実際の通知送信（メール、Slack、プッシュ通知等）
            $this->sendNotification($notification);
        }
    }
    
    /**
     * ワークフロー完了処理
     */
    private function completeWorkflow($workflowId, $finalData) {
        $this->updateWorkflowProgress($workflowId, 'workflow', 'completed');
        
        $this->logger->info('ワークフロー完全完了', [
            'workflow_id' => $workflowId,
            'total_items_processed' => count($finalData['items'] ?? []),
            'listed_items' => count($finalData['listing_results'] ?? [])
        ]);
        
        // 完了通知送信
        $this->sendCompletionNotification($workflowId, $finalData);
    }
    
    /**
     * ユーティリティメソッド
     */
    private function generateWorkflowId() {
        return 'wf_' . date('Ymd_His') . '_' . substr(uniqid(), -6);
    }
    
    private function getToolUrl($stepName) {
        $baseUrl = 'http://localhost:8080/modules/yahoo_auction_complete/new_structure';
        return $baseUrl . $this->toolEndpoints[$stepName];
    }
    
    private function getDashboardUrl($workflowId) {
        return 'http://localhost:8080/modules/yahoo_auction_complete/new_structure/00_workflow_engine/dashboard_v2.html?workflow_id=' . $workflowId;
    }
    
    private function loadWorkflowConfig() {
        // YAML設定ファイル読み込み
        $configPath = __DIR__ . '/../00_workflow_engine/config/workflow_config.yaml';
        if (file_exists($configPath)) {
            return yaml_parse_file($configPath);
        }
        return [];
    }
    
    private function initializeRedis() {
        try {
            $redis = new Redis();
            $redis->connect('127.0.0.1', 6379);
            return $redis;
        } catch (Exception $e) {
            $this->logger->warning('Redis接続失敗', ['error' => $e->getMessage()]);
            return null;
        }
    }
    
    private function initializeDatabase() {
        // PostgreSQL/MySQL接続初期化
        // 実装は既存のデータベース接続を使用
        return null;
    }
    
    // その他のヘルパーメソッド省略...
}

/**
 * 既存のscraping.phpに統合する関数
 */
function triggerCompleteAutoWorkflow($scrapingResult) {
    try {
        $autoSystem = new CompleteAutoWorkflowSystem();
        return $autoSystem->startCompleteWorkflow($scrapingResult);
        
    } catch (Exception $e) {
        error_log('完全自動ワークフローエラー: ' . $e->getMessage());
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'fallback' => 'manual_workflow_required'
        ];
    }
}

/**
 * 手動ステップ完了後の呼び出し関数（07_editing, 03_approvalから呼び出し）
 */
function continueAutoWorkflow($workflowId, $stepName, $data) {
    try {
        $autoSystem = new CompleteAutoWorkflowSystem();
        return $autoSystem->continueWorkflowAfterManualStep($workflowId, $stepName, $data);
        
    } catch (Exception $e) {
        error_log("ワークフロー続行エラー [{$stepName}]: " . $e->getMessage());
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'step' => $stepName
        ];
    }
}

class WorkflowLogger {
    private $logFile;
    private $service;
    
    public function __construct($service) {
        $this->service = $service;
        $this->logFile = __DIR__ . '/logs/' . $service . '_' . date('Y-m-d') . '.log';
        
        $logDir = dirname($this->logFile);
        if (!file_exists($logDir)) {
            mkdir($logDir, 0777, true);
        }
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
    
    private function log($level, $message, $context = []) {
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s.u'),
            'level' => $level,
            'service' => $this->service,
            'message' => $message,
            'context' => $context
        ];
        
        $logLine = json_encode($logEntry, JSON_UNESCAPED_UNICODE) . PHP_EOL;
        file_put_contents($this->logFile, $logLine, FILE_APPEND | LOCK_EX);
    }
}
?>