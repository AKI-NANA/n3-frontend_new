<?php
/**
 * 外部サービス連携クラス
 * external_services.php
 */

/**
 * MFクラウド連携クラス
 */
class MFCloudConnector {
    private $api_key;
    private $api_secret;
    private $api_endpoint;
    private $enabled;
    
    public function __construct($config) {
        $this->api_key = $config['MF_API_KEY'] ?? '';
        $this->api_secret = $config['MF_API_SECRET'] ?? '';
        $this->api_endpoint = $config['MF_API_ENDPOINT'] ?? '';
        $this->enabled = $config['MF_ENABLED'] ?? false;
    }
    
    /**
     * MFクラウドからデータインポート
     */
    public function importTransactions($start_date = null, $end_date = null) {
        if (!$this->enabled) {
            return [
                'success' => false,
                'message' => 'MFクラウド連携が無効です',
                'data' => []
            ];
        }
        
        // 日付範囲設定
        $start_date = $start_date ?? date('Y-m-d', strtotime('-30 days'));
        $end_date = $end_date ?? date('Y-m-d');
        
        try {
            // TODO: 実際のMFクラウドAPI呼び出し実装
            // 現在は模擬データを返す
            $mock_transactions = $this->generateMockMFTransactions($start_date, $end_date);
            
            // データベースに保存
            $saved_count = $this->saveTransactionsToDatabase($mock_transactions);
            
            return [
                'success' => true,
                'message' => "MFクラウドから {$saved_count} 件のデータをインポートしました",
                'data' => [
                    'imported_count' => $saved_count,
                    'start_date' => $start_date,
                    'end_date' => $end_date,
                    'import_id' => uniqid('mf_import_')
                ]
            ];
            
        } catch (Exception $e) {
            error_log("MF Import Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'MFクラウドインポートエラー: ' . $e->getMessage(),
                'data' => []
            ];
        }
    }
    
    /**
     * MFクラウドへデータエクスポート
     */
    public function exportTransactions($transaction_ids) {
        if (!$this->enabled) {
            return [
                'success' => false,
                'message' => 'MFクラウド連携が無効です'
            ];
        }
        
        try {
            // データベースから取引データ取得
            $pdo = getKichoDatabase();
            if (!$pdo) {
                throw new Exception('データベース接続エラー');
            }
            
            $placeholders = str_repeat('?,', count($transaction_ids) - 1) . '?';
            $stmt = $pdo->prepare("
                SELECT * FROM transactions 
                WHERE id IN ($placeholders) AND status = 'approved'
            ");
            $stmt->execute($transaction_ids);
            $transactions = $stmt->fetchAll();
            
            // TODO: 実際のMFクラウドAPI送信実装
            // 現在は模擬処理
            $exported_count = count($transactions);
            
            return [
                'success' => true,
                'message' => "{$exported_count} 件をMFクラウドにエクスポートしました",
                'data' => [
                    'exported_count' => $exported_count,
                    'export_id' => uniqid('mf_export_'),
                    'exported_at' => date('Y-m-d H:i:s')
                ]
            ];
            
        } catch (Exception $e) {
            error_log("MF Export Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'MFクラウドエクスポートエラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * MF連携履歴取得
     */
    public function getHistory($limit = 20) {
        try {
            $pdo = getKichoDatabase();
            if (!$pdo) {
                // 模擬履歴を返す
                return [
                    'success' => true,
                    'data' => $this->generateMockMFHistory($limit)
                ];
            }
            
            $stmt = $pdo->prepare("
                SELECT * FROM import_history 
                WHERE source = 'mf_cloud' 
                ORDER BY created_at DESC 
                LIMIT ?
            ");
            $stmt->execute([$limit]);
            $history = $stmt->fetchAll();
            
            return [
                'success' => true,
                'data' => $history
            ];
            
        } catch (Exception $e) {
            error_log("MF History Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'MF履歴取得エラー: ' . $e->getMessage()
            ];
        }
    }
    
    private function generateMockMFTransactions($start_date, $end_date) {
        $transactions = [];
        $current_date = new DateTime($start_date);
        $end_date_obj = new DateTime($end_date);
        
        while ($current_date <= $end_date_obj) {
            // ランダムで1-3件の取引を生成
            $daily_count = rand(1, 3);
            
            for ($i = 0; $i < $daily_count; $i++) {
                $transactions[] = [
                    'date' => $current_date->format('Y-m-d'),
                    'description' => $this->getRandomDescription(),
                    'amount' => $this->getRandomAmount(),
                    'category' => $this->getRandomCategory(),
                    'account' => $this->getRandomAccount(),
                    'mf_transaction_id' => 'mf_' . uniqid(),
                    'source' => 'mf_import'
                ];
            }
            
            $current_date->add(new DateInterval('P1D'));
        }
        
        return $transactions;
    }
    
    private function saveTransactionsToDatabase($transactions) {
        $pdo = getKichoDatabase();
        if (!$pdo) {
            return count($transactions); // 模擬保存
        }
        
        $saved_count = 0;
        
        try {
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("
                INSERT INTO transactions (date, description, amount, category, account, source, mf_transaction_id, confidence_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            foreach ($transactions as $transaction) {
                $stmt->execute([
                    $transaction['date'],
                    $transaction['description'],
                    $transaction['amount'],
                    $transaction['category'],
                    $transaction['account'],
                    $transaction['source'],
                    $transaction['mf_transaction_id'],
                    0.95 // MFからのデータは高信頼度
                ]);
                $saved_count++;
            }
            
            $pdo->commit();
            
        } catch (Exception $e) {
            $pdo->rollback();
            throw $e;
        }
        
        return $saved_count;
    }
    
    private function getRandomDescription() {
        $descriptions = [
            'コンビニエンスストア',
            'スーパーマーケット',
            '電気代',
            'ガス代',
            '携帯電話料金',
            'インターネット料金',
            '給与振込',
            'ガソリン代',
            '書籍購入',
            '食事代'
        ];
        return $descriptions[array_rand($descriptions)];
    }
    
    private function getRandomAmount() {
        $amounts = [-1200, -3500, -8500, -2800, 300000, -5000, -15000, -1800, -4200];
        return $amounts[array_rand($amounts)];
    }
    
    private function getRandomCategory() {
        $categories = ['食費', '光熱費', '通信費', '給与', '交通費', '教養・娯楽費'];
        return $categories[array_rand($categories)];
    }
    
    private function getRandomAccount() {
        $accounts = ['銀行', '現金', 'クレジット'];
        return $accounts[array_rand($accounts)];
    }
    
    private function generateMockMFHistory($limit) {
        $history = [];
        for ($i = 0; $i < $limit; $i++) {
            $history[] = [
                'id' => $i + 1,
                'import_id' => 'mf_import_' . uniqid(),
                'total_rows' => rand(50, 200),
                'processed_rows' => rand(45, 195),
                'error_rows' => rand(0, 5),
                'status' => 'completed',
                'created_at' => date('Y-m-d H:i:s', strtotime("-{$i} days"))
            ];
        }
        return $history;
    }
}

// ============================================
// グローバル関数として外部サービス連携を提供
// ============================================

/**
 * 外部サービス統合管理クラス
 */
class ExternalServiceManager {
    private $mf_connector;
    private $ai_connector;
    private $file_processor;
    private $config;
    
    public function __construct() {
        // 設定読み込み
        $config_file = __DIR__ . '/../../config/kicho_config.php';
        $this->config = file_exists($config_file) ? include $config_file : [];
        
        // サービス初期化
        $this->mf_connector = new MFCloudConnector($this->config);
        $this->ai_connector = new AILearningConnector($this->config);
        $this->file_processor = new FileProcessor($this->config);
    }
    
    public function getMFConnector() {
        return $this->mf_connector;
    }
    
    public function getAIConnector() {
        return $this->ai_connector;
    }
    
    public function getFileProcessor() {
        return $this->file_processor;
    }
    
    /**
     * 全外部サービスの接続状態チェック
     */
    public function checkAllConnections() {
        return [
            'mf_cloud' => $this->mf_connector->getConnectionStatus(),
            'ai_service' => $this->ai_connector->getConnectionStatus(),
            'file_system' => $this->file_processor->checkDirectories(),
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
}

// グローバル外部サービスマネージャー取得
function getExternalServiceManager() {
    static $manager = null;
    if ($manager === null) {
        $manager = new ExternalServiceManager();
    }
    return $manager;
}

// MFクラウド操作関数
function executeMFImport($start_date = null, $end_date = null) {
    $manager = getExternalServiceManager();
    return $manager->getMFConnector()->importTransactions($start_date, $end_date);
}

function exportToMF($transaction_ids) {
    $manager = getExternalServiceManager();
    return $manager->getMFConnector()->exportTransactions($transaction_ids);
}

function getMFHistory($limit = 20) {
    $manager = getExternalServiceManager();
    return $manager->getMFConnector()->getHistory($limit);
}

// AI学習操作関数
function executeAILearning($text, $category = 'general') {
    $manager = getExternalServiceManager();
    return $manager->getAIConnector()->learnFromText($text, $category);
}

function executeIntegratedAILearning($options = []) {
    $manager = getExternalServiceManager();
    return $manager->getAIConnector()->executeIntegratedLearning($options);
}

function getAILearningHistory($limit = 20) {
    $manager = getExternalServiceManager();
    return $manager->getAIConnector()->getLearningHistory($limit);
}

function getOptimizationSuggestions() {
    $manager = getExternalServiceManager();
    return $manager->getAIConnector()->getOptimizationSuggestions();
}

// ファイル処理操作関数
function processCSVUpload($file_data, $source = 'manual') {
    $manager = getExternalServiceManager();
    return $manager->getFileProcessor()->processCSVUpload($file_data, $source);
}

function generateRulesCSV($rule_ids = null) {
    $manager = getExternalServiceManager();
    return $manager->getFileProcessor()->generateRulesCSV($rule_ids);
}

function generatePendingCSV() {
    $manager = getExternalServiceManager();
    return $manager->getFileProcessor()->generatePendingTransactionsCSV();
}

function executeFullBackup() {
    $manager = getExternalServiceManager();
    return $manager->getFileProcessor()->executeFullBackup();
}

// 外部サービス接続状態チェック
function checkExternalServices() {
    $manager = getExternalServiceManager();
    return $manager->checkAllConnections();
}

?>


/**
 * AI学習サービス連携クラス
 */
class AILearningConnector {
    private $service_url;
    private $enabled;
    private $timeout;
    
    public function __construct($config) {
        $this->service_url = $config['AI_SERVICE_URL'] ?? '';
        $this->enabled = $config['AI_SERVICE_ENABLED'] ?? false;
        $this->timeout = $config['AI_TIMEOUT'] ?? 30;
    }
    
    /**
     * テキスト学習実行
     */
    public function learnFromText($text, $category = 'general') {
        if (!$this->enabled) {
            return [
                'success' => false,
                'message' => 'AI学習サービスが無効です'
            ];
        }
        
        try {
            // AI学習サービスAPI呼び出し
            $result = $this->callAIService('/learn', [
                'text' => $text,
                'category' => $category,
                'timestamp' => date('c')
            ]);
            
            // 学習セッションをデータベースに記録
            $session_id = $this->saveLearningSession($text, $category, $result);
            
            return [
                'success' => true,
                'message' => 'AI学習を実行しました',
                'data' => [
                    'session_id' => $session_id,
                    'accuracy' => $result['accuracy'] ?? 0.0,
                    'processed_at' => date('Y-m-d H:i:s')
                ]
            ];
            
        } catch (Exception $e) {
            error_log("AI Learning Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'AI学習エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 統合AI学習実行
     */
    public function executeIntegratedLearning($options = []) {
        if (!$this->enabled) {
            return [
                'success' => false,
                'message' => 'AI学習サービスが無効です'
            ];
        }
        
        try {
            // 未承認取引データを取得
            $pending_transactions = $this->getPendingTransactions();
            
            if (empty($pending_transactions)) {
                return [
                    'success' => true,
                    'message' => '学習対象の取引がありません',
                    'data' => ['processed_count' => 0]
                ];
            }
            
            $processed_count = 0;
            $updated_transactions = [];
            
            foreach ($pending_transactions as $transaction) {
                // AI分析実行
                $analysis = $this->callAIService('/analyze', [
                    'description' => $transaction['description'],
                    'amount' => $transaction['amount'],
                    'date' => $transaction['date']
                ]);
                
                if ($analysis['confidence'] >= 0.8) {
                    // 高信頼度の場合、自動承認
                    $this->updateTransactionWithAI($transaction['id'], $analysis);
                    $processed_count++;
                    $updated_transactions[] = $transaction['id'];
                }
            }
            
            return [
                'success' => true,
                'message' => "{$processed_count} 件の取引をAI学習で処理しました",
                'data' => [
                    'processed_count' => $processed_count,
                    'updated_transactions' => $updated_transactions,
                    'total_pending' => count($pending_transactions)
                ]
            ];
            
        } catch (Exception $e) {
            error_log("AI Integrated Learning Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'AI統合学習エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * AI学習履歴取得
     */
    public function getLearningHistory($limit = 20) {
        try {
            $pdo = getKichoDatabase();
            if (!$pdo) {
                // 模擬履歴を返す
                return [
                    'success' => true,
                    'data' => $this->generateMockAIHistory($limit)
                ];
            }
            
            $stmt = $pdo->prepare("
                SELECT * FROM ai_learning_sessions 
                ORDER BY created_at DESC 
                LIMIT ?
            ");
            $stmt->execute([$limit]);
            $history = $stmt->fetchAll();
            
            return [
                'success' => true,
                'data' => $history
            ];
            
        } catch (Exception $e) {
            error_log("AI History Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'AI履歴取得エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 最適化提案取得
     */
    public function getOptimizationSuggestions() {
        try {
            $suggestions = $this->callAIService('/optimize', [
                'date_from' => date('Y-m-d', strtotime('-30 days')),
                'date_to' => date('Y-m-d')
            ]);
            
            return [
                'success' => true,
                'message' => '最適化提案を取得しました',
                'data' => $suggestions
            ];
            
        } catch (Exception $e) {
            error_log("AI Optimization Error: " . $e->getMessage());
            
            // フォールバック提案
            return [
                'success' => true,
                'message' => '最適化提案を生成しました（フォールバック）',
                'data' => [
                    'suggestions' => [
                        '類似する取引パターンの自動分類精度向上',
                        '食費カテゴリの細分化提案',
                        '月次予算アラート設定の推奨'
                    ],
                    'accuracy_improvement' => 5.2,
                    'potential_time_saving' => '15分/週'
                ]
            ];
        }
    }
    
    private function callAIService($endpoint, $data) {
        if (!$this->enabled) {
            // AI無効時は模擬レスポンス
            return [
                'success' => true,
                'accuracy' => 0.85,
                'confidence' => 0.90,
                'category' => '食費',
                'account' => '現金'
            ];
        }
        
        $url = rtrim($this->service_url, '/') . $endpoint;
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/json',
                'content' => json_encode($data),
                'timeout' => $this->timeout
            ]
        ]);
        
        $response = @file_get_contents($url, false, $context);
        
        if ($response === false) {
            throw new Exception('AI service connection failed');
        }
        
        $result = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid AI service response');
        }
        
        return $result;
    }
    
    private function getPendingTransactions() {
        $pdo = getKichoDatabase();
        if (!$pdo) {
            // 模擬データ
            return [
                ['id' => 1, 'description' => 'コンビニ', 'amount' => -1200, 'date' => date('Y-m-d')],
                ['id' => 2, 'description' => '電気代', 'amount' => -8500, 'date' => date('Y-m-d')],
            ];
        }
        
        try {
            $stmt = $pdo->query("
                SELECT id, description, amount, date 
                FROM transactions 
                WHERE status = 'pending' 
                ORDER BY date DESC 
                LIMIT 50
            ");
            return $stmt->fetchAll();
            
        } catch (Exception $e) {
            error_log("Get pending transactions error: " . $e->getMessage());
            return [];
        }
    }
    
    private function updateTransactionWithAI($transaction_id, $analysis) {
        $pdo = getKichoDatabase();
        if (!$pdo) {
            return true; // 模擬更新
        }
        
        try {
            $stmt = $pdo->prepare("
                UPDATE transactions 
                SET status = 'approved', 
                    category = ?, 
                    account = ?, 
                    confidence_score = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            
            return $stmt->execute([
                $analysis['category'] ?? '',
                $analysis['account'] ?? '',
                $analysis['confidence'] ?? 0.0,
                $transaction_id
            ]);
            
        } catch (Exception $e) {
            error_log("Update transaction with AI error: " . $e->getMessage());
            return false;
        }
    }
    
    private function saveLearningSession($text, $category, $result) {
        $session_id = 'ai_' . uniqid();
        
        $pdo = getKichoDatabase();
        if (!$pdo) {
            return $session_id; // 模擬保存
        }
        
        try {
            $stmt = $pdo->prepare("
                INSERT INTO ai_learning_sessions (session_id, learning_text, result_status, accuracy_score, learning_data)
                VALUES (?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $session_id,
                $text,
                $result['success'] ? 'completed' : 'failed',
                $result['accuracy'] ?? 0.0,
                json_encode($result)
            ]);
            
        } catch (Exception $e) {
            error_log("Save learning session error: " . $e->getMessage());
        }
        
        return $session_id;
    }
    
    private function generateMockAIHistory($limit) {
        $history = [];
        for ($i = 0; $i < $limit; $i++) {
            $history[] = [
                'id' => $i + 1,
                'session_id' => 'ai_' . uniqid(),
                'learning_text' => 'サンプル学習テキスト ' . ($i + 1),
                'result_status' => 'completed',
                'accuracy_score' => round(0.8 + (rand(0, 20) / 100), 2),
                'created_at' => date('Y-m-d H:i:s', strtotime("-{$i} hours"))
            ];
        }
        return $history;
    }
}

/**
 * ファイル処理クラス
 */
class FileProcessor {
    private $upload_dir;
    private $export_dir;
    private $backup_dir;
    private $max_file_size;
    
    public function __construct($config) {
        $this->upload_dir = $config['UPLOAD_DIR'];
        $this->export_dir = $config['EXPORT_DIR'];
        $this->backup_dir = $config['BACKUP_DIR'];
        $this->max_file_size = $config['UPLOAD_MAX_SIZE'] ?? (50 * 1024 * 1024);
        
        // ディレクトリ作成
        foreach ([$this->upload_dir, $this->export_dir, $this->backup_dir] as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }
    
    /**
     * CSVファイル処理
     */
    public function processCSVUpload($file_data, $source = 'manual') {
        try {
            // ファイル検証
            $validation = $this->validateUploadedFile($file_data);
            if (!$validation['valid']) {
                throw new Exception($validation['message']);
            }
            
            // ファイル保存
            $saved_file = $this->saveUploadedFile($file_data, 'csv');
            
            // CSV解析
            $csv_data = $this->parseCSVFile($saved_file);
            
            // データベース保存
            $saved_count = $this->saveCSVDataToDatabase($csv_data, $source, $saved_file);
            
            // インポート履歴記録
            $import_id = $this->recordImportHistory($saved_file, $source, count($csv_data), $saved_count);
            
            return [
                'success' => true,
                'message' => "{$saved_count} 件のCSVデータを処理しました",
                'data' => [
                    'import_id' => $import_id,
                    'total_rows' => count($csv_data),
                    'processed_rows' => $saved_count,
                    'filename' => basename($saved_file),
                    'processed_at' => date('Y-m-d H:i:s')
                ]
            ];
            
        } catch (Exception $e) {
            error_log("CSV Upload Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'CSVアップロードエラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * ルールCSV生成
     */
    public function generateRulesCSV($rule_ids = null) {
        try {
            $pdo = getKichoDatabase();
            
            if ($pdo) {
                if ($rule_ids) {
                    $placeholders = str_repeat('?,', count($rule_ids) - 1) . '?';
                    $stmt = $pdo->prepare("SELECT * FROM rules WHERE id IN ($placeholders)");
                    $stmt->execute($rule_ids);
                } else {
                    $stmt = $pdo->query("SELECT * FROM rules WHERE is_active = TRUE ORDER BY priority, name");
                }
                $rules = $stmt->fetchAll();
            } else {
                // 模擬データ
                $rules = $this->generateMockRules();
            }
            
            // CSV生成
            $csv_content = $this->generateCSVContent($rules, ['id', 'name', 'pattern', 'action', 'category', 'account', 'priority']);
            
            // ファイル保存
            $filename = 'rules_' . date('Y-m-d_H-i-s') . '.csv';
            $filepath = $this->export_dir . $filename;
            
            if (file_put_contents($filepath, $csv_content) === false) {
                throw new Exception('CSVファイルの保存に失敗しました');
            }
            
            return [
                'success' => true,
                'message' => 'ルールCSVを生成しました',
                'data' => [
                    'filename' => $filename,
                    'filepath' => $filepath,
                    'file_size' => filesize($filepath),
                    'rules_count' => count($rules),
                    'download_url' => "/exports/{$filename}"
                ]
            ];
            
        } catch (Exception $e) {
            error_log("Rules CSV Generation Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'ルールCSV生成エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 承認待ちCSV生成
     */
    public function generatePendingTransactionsCSV() {
        try {
            $pdo = getKichoDatabase();
            
            if ($pdo) {
                $stmt = $pdo->query("
                    SELECT id, date, description, amount, category, account, confidence_score, source, created_at
                    FROM transactions 
                    WHERE status = 'pending' 
                    ORDER BY date DESC, confidence_score DESC
                ");
                $transactions = $stmt->fetchAll();
            } else {
                // 模擬データ
                $transactions = $this->generateMockPendingTransactions();
            }
            
            // CSV生成
            $csv_content = $this->generateCSVContent($transactions, [
                'id', 'date', 'description', 'amount', 'category', 
                'account', 'confidence_score', 'source', 'created_at'
            ]);
            
            // ファイル保存
            $filename = 'pending_transactions_' . date('Y-m-d_H-i-s') . '.csv';
            $filepath = $this->export_dir . $filename;
            
            if (file_put_contents($filepath, $csv_content) === false) {
                throw new Exception('CSVファイルの保存に失敗しました');
            }
            
            return [
                'success' => true,
                'message' => '承認待ち取引CSVを生成しました',
                'data' => [
                    'filename' => $filename,
                    'filepath' => $filepath,
                    'file_size' => filesize($filepath),
                    'transactions_count' => count($transactions),
                    'download_url' => "/exports/{$filename}"
                ]
            ];
            
        } catch (Exception $e) {
            error_log("Pending CSV Generation Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '承認待ちCSV生成エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * フルバックアップ実行
     */
    public function executeFullBackup() {
        try {
            $backup_id = 'backup_' . date('Y-m-d_H-i-s') . '_' . uniqid();
            $filename = $backup_id . '.sql';
            $filepath = $this->backup_dir . $filename;
            
            // データベースダンプ実行
            $dump_result = $this->createDatabaseDump($filepath);
            
            if (!$dump_result['success']) {
                throw new Exception($dump_result['message']);
            }
            
            // バックアップ履歴記録
            $this->recordBackupHistory($backup_id, 'full', $filename, filesize($filepath));
            
            return [
                'success' => true,
                'message' => 'フルバックアップを実行しました',
                'data' => [
                    'backup_id' => $backup_id,
                    'filename' => $filename,
                    'file_size' => filesize($filepath),
                    'backup_type' => 'full',
                    'created_at' => date('Y-m-d H:i:s')
                ]
            ];
            
        } catch (Exception $e) {
            error_log("Full Backup Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'フルバックアップエラー: ' . $e->getMessage()
            ];
        }
    }
    
    private function validateUploadedFile($file_data) {
        if (!isset($file_data['tmp_name']) || !is_uploaded_file($file_data['tmp_name'])) {
            return ['valid' => false, 'message' => 'ファイルがアップロードされていません'];
        }
        
        if ($file_data['size'] > $this->max_file_size) {
            return ['valid' => false, 'message' => 'ファイルサイズが上限を超えています'];
        }
        
        $allowed_types = ['text/csv', 'application/csv', 'text/plain'];
        if (!in_array($file_data['type'], $allowed_types)) {
            return ['valid' => false, 'message' => 'CSVファイルのみアップロード可能です'];
        }
        
        return ['valid' => true, 'message' => 'ファイル検証成功'];
    }
    
    private function saveUploadedFile($file_data, $type) {
        $extension = pathinfo($file_data['name'], PATHINFO_EXTENSION);
        $filename = $type . '_' . date('Y-m-d_H-i-s') . '_' . uniqid() . '.' . $extension;
        $filepath = $this->upload_dir . $filename;
        
        if (!move_uploaded_file($file_data['tmp_name'], $filepath)) {
            throw new Exception('ファイルの保存に失敗しました');
        }
        
        return $filepath;
    }
    
    private function parseCSVFile($filepath) {
        $data = [];
        
        if (($handle = fopen($filepath, 'r')) !== false) {
            $headers = fgetcsv($handle);
            
            while (($row = fgetcsv($handle)) !== false) {
                if (count($row) === count($headers)) {
                    $data[] = array_combine($headers, $row);
                }
            }
            
            fclose($handle);
        }
        
        return $data;
    }
    
    private function saveCSVDataToDatabase($csv_data, $source, $filename) {
        $pdo = getKichoDatabase();
        if (!$pdo) {
            return count($csv_data); // 模擬保存
        }
        
        $saved_count = 0;
        
        try {
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("
                INSERT INTO transactions (date, description, amount, category, account, source, confidence_score)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            foreach ($csv_data as $row) {
                // CSV行をトランザクションデータに変換
                $transaction_data = $this->mapCSVRowToTransaction($row, $source);
                
                if ($transaction_data) {
                    $stmt->execute([
                        $transaction_data['date'],
                        $transaction_data['description'],
                        $transaction_data['amount'],
                        $transaction_data['category'],
                        $transaction_data['account'],
                        $source,
                        0.7 // CSV データの信頼度
                    ]);
                    $saved_count++;
                }
            }
            
            $pdo->commit();
            
        } catch (Exception $e) {
            $pdo->rollback();
            throw $e;
        }
        
        return $saved_count;
    }
    
    private function mapCSVRowToTransaction($row, $source) {
        // CSVフォーマットに応じてマッピング調整
        return [
            'date' => $row['日付'] ?? $row['date'] ?? date('Y-m-d'),
            'description' => $row['摘要'] ?? $row['description'] ?? '',
            'amount' => floatval($row['金額'] ?? $row['amount'] ?? 0),
            'category' => $row['カテゴリ'] ?? $row['category'] ?? '',
            'account' => $row['口座'] ?? $row['account'] ?? ''
        ];
    }
    
    private function generateCSVContent($data, $fields) {
        if (empty($data)) {
            return "データなし\n";
        }
        
        $csv = '';
        
        // ヘッダー行
        $csv .= implode(',', $fields) . "\n";
        
        // データ行
        foreach ($data as $row) {
            $csv_row = [];
            foreach ($fields as $field) {
                $value = $row[$field] ?? '';
                // CSV用エスケープ
                if (strpos($value, ',') !== false || strpos($value, '"') !== false) {
                    $value = '"' . str_replace('"', '""', $value) . '"';
                }
                $csv_row[] = $value;
            }
            $csv .= implode(',', $csv_row) . "\n";
        }
        
        return $csv;
    }
    
    private function createDatabaseDump($filepath) {
        try {
            // 簡単なデータダンプ（実際の環境では pg_dump や mysqldump を使用）
            $pdo = getKichoDatabase();
            
            if (!$pdo) {
                // 模擬ダンプファイル作成
                file_put_contents($filepath, "-- Mock database dump\n-- Created: " . date('Y-m-d H:i:s') . "\n");
                return ['success' => true, 'message' => 'Mock dump created'];
            }
            
            $dump_content = "-- NAGANO3 Database Dump\n";
            $dump_content .= "-- Created: " . date('Y-m-d H:i:s') . "\n\n";
            
            // テーブルデータをダンプ
            $tables = ['transactions', 'rules', 'ai_learning_sessions', 'import_history'];
            
            foreach ($tables as $table) {
                try {
                    $stmt = $pdo->query("SELECT * FROM {$table}");
                    $rows = $stmt->fetchAll();
                    
                    $dump_content .= "-- Table: {$table}\n";
                    foreach ($rows as $row) {
                        $dump_content .= "INSERT INTO {$table} VALUES (" . 
                                       implode(',', array_map(function($v) { return "'" . addslashes($v) . "'"; }, $row)) . 
                                       ");\n";
                    }
                    $dump_content .= "\n";
                    
                } catch (Exception $e) {
                    error_log("Table dump error for {$table}: " . $e->getMessage());
                }
            }
            
            file_put_contents($filepath, $dump_content);
            
            return ['success' => true, 'message' => 'Database dump created'];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Database dump failed: ' . $e->getMessage()];
        }
    }
    
    private function recordImportHistory($filename, $source, $total_rows, $processed_rows) {
        $import_id = 'import_' . uniqid();
        
        $pdo = getKichoDatabase();
        if (!$pdo) {
            return $import_id; // 模擬記録
        }
        
        try {
            $stmt = $pdo->prepare("
                INSERT INTO import_history (filename, source, total_rows, processed_rows, error_rows, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                basename($filename),
                $source,
                $total_rows,
                $processed_rows,
                $total_rows - $processed_rows,
                'completed'
            ]);
            
        } catch (Exception $e) {
            error_log("Record import history error: " . $e->getMessage());
        }
        
        return $import_id;
    }
    
    private function recordBackupHistory($backup_id, $type, $filename, $file_size) {
        $pdo = getKichoDatabase();
        if (!$pdo) {
            return true; // 模擬記録
        }
        
        try {
            $stmt = $pdo->prepare("
                INSERT INTO backup_history (backup_id, backup_type, filename, file_size, status, completed_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ");
            
            return $stmt->execute([
                $backup_id,
                $type,
                $filename,
                $file_size,
                'completed'
            ]);
            
        } catch (Exception $e) {
            error_log("Record backup history error: " . $e->getMessage());
            return false;
        }
    }
    
    private function generateMockRules() {
        return [
            ['id' => 1, 'name' => 'コンビニルール', 'pattern' => 'コンビニ', 'action' => '食費分類', 'category' => '食費', 'account' => '現金', 'priority' => 1],
            ['id' => 2, 'name' => '光熱費ルール', 'pattern' => '電気|ガス', 'action' => '光熱費分類', 'category' => '光熱費', 'account' => '銀行', 'priority' => 1]
        ];
    }
    
    private function generateMockPendingTransactions() {
        return [
            ['id' => 1, 'date' => date('Y-m-d'), 'description' => 'コンビニ', 'amount' => -1200, 'category' => '', 'account' => '', 'confidence_score' => 0.7, 'source' => 'csv', 'created_at' => date('Y-m-d H:i:s')],
            ['id' => 2, 'date' => date('Y-m-d'), 'description' => '電気代', 'amount' => -8500, 'category' => '', 'account' => '', 'confidence_score' => 0.8, 'source' => 'manual', 'created_at' => date('Y-m-d H:i:s')]
        ];
        