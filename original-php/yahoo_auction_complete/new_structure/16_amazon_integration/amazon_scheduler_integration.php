<?php
/**
 * Amazon統合 - スケジューラー統合
 * new_structure/10_zaiko/amazon_scheduler.php
 * 
 * Cronジョブから実行される統合スケジューラー
 */

require_once __DIR__ . '/AmazonStockMonitor.php';
require_once __DIR__ . '/../shared/core/common_functions.php';

class AmazonScheduler {
    
    private $monitor;
    private $db;
    private $config;
    private $logFile;
    
    /**
     * コンストラクタ
     * 
     * @param string $marketplace マーケットプレイス
     */
    public function __construct($marketplace = 'US') {
        $this->monitor = new AmazonStockMonitor($marketplace);
        $this->db = getDatabaseConnection();
        $this->config = require __DIR__ . '/../shared/config/amazon_api.php';
        $this->logFile = __DIR__ . '/../logs/amazon_scheduler.log';
        
        $this->logMessage("Amazon Scheduler initialized for marketplace: $marketplace", 'INFO');
    }
    
    /**
     * メインスケジューラー実行
     * 
     * @param array $args コマンドライン引数
     * @return int 終了コード
     */
    public function run($args = []) {
        $mode = $this->parseArguments($args);
        
        $this->logMessage("Scheduler started with mode: $mode", 'INFO');
        
        try {
            // 実行前チェック
            $this->preExecutionCheck();
            
            // モード別実行
            switch ($mode) {
                case 'high-priority':
                    $result = $this->runHighPriorityMonitoring();
                    break;
                    
                case 'normal':
                    $result = $this->runNormalMonitoring();
                    break;
                    
                case 'low-priority':
                    $result = $this->runLowPriorityMonitoring();
                    break;
                    
                case 'maintenance':
                    $result = $this->runMaintenance();
                    break;
                    
                case 'health-check':
                    $result = $this->runHealthCheck();
                    break;
                    
                default:
                    $result = $this->runAllMonitoring();
                    break;
            }
            
            // 実行結果ログ
            $this->logExecutionResult($mode, $result);
            
            return $result['success'] ? 0 : 1;
            
        } catch (Exception $e) {
            $this->logMessage("Scheduler execution failed: " . $e->getMessage(), 'ERROR');
            return 1;
        }
    }
    
    /**
     * 引数解析
     * 
     * @param array $args 引数配列
     * @return string 実行モード
     */
    private function parseArguments($args) {
        $mode = 'all';
        
        foreach ($args as $arg) {
            if (strpos($arg, '--') === 0) {
                $mode = substr($arg, 2);
                break;
            }
        }
        
        return $mode;
    }
    
    /**
     * 実行前チェック
     */
    private function preExecutionCheck() {
        // 重複実行チェック
        if ($this->isAlreadyRunning()) {
            throw new Exception("Another scheduler instance is already running");
        }
        
        // データベース接続チェック
        if (!$this->db) {
            throw new Exception("Database connection failed");
        }
        
        // API制限チェック
        if (!$this->checkApiLimits()) {
            throw new Exception("API rate limit exceeded");
        }
        
        // PIDファイル作成
        $this->createPidFile();
    }
    
    /**
     * 重複実行チェック
     * 
     * @return bool 既に実行中かどうか
     */
    private function isAlreadyRunning() {
        $pidFile = __DIR__ . '/../tmp/amazon_scheduler.pid';
        
        if (!file_exists($pidFile)) {
            return false;
        }
        
        $pid = trim(file_get_contents($pidFile));
        
        // プロセスが生きているかチェック（UNIX/Linux系）
        if (function_exists('posix_kill')) {
            return posix_kill($pid, 0);
        }
        
        // Windows等では時間ベースチェック
        $fileTime = filemtime($pidFile);
        return (time() - $fileTime) < 3600; // 1時間以内なら実行中とみなす
    }
    
    /**
     * PIDファイル作成
     */
    private function createPidFile() {
        $pidFile = __DIR__ . '/../tmp/amazon_scheduler.pid';
        $pidDir = dirname($pidFile);
        
        if (!is_dir($pidDir)) {
            mkdir($pidDir, 0755, true);
        }
        
        file_put_contents($pidFile, getmypid());
        
        // 終了時にPIDファイル削除
        register_shutdown_function(function() use ($pidFile) {
            if (file_exists($pidFile)) {
                unlink($pidFile);
            }
        });
    }
    
    /**
     * API制限チェック
     * 
     * @return bool API使用可能かどうか
     */
    private function checkApiLimits() {
        $sql = "SELECT COUNT(*) FROM amazon_api_requests 
                WHERE requested_at >= CURDATE() AND success = true";
        
        $stmt = $this->db->query($sql);
        $todayRequests = $stmt->fetchColumn();
        
        $dailyLimit = $this->config['rate_limiting']['max_daily_requests'];
        
        return $todayRequests < ($dailyLimit * 0.9); // 90%制限
    }
    
    /**
     * 高優先度監視実行
     * 
     * @return array 実行結果
     */
    private function runHighPriorityMonitoring() {
        $this->logMessage("Running high-priority monitoring", 'INFO');
        
        $result = $this->monitor->runMonitoring('high-priority');
        
        // 高優先度の場合は即座に結果をログ
        if ($result['success'] && isset($result['summary']['total_alerts_sent']) && 
            $result['summary']['total_alerts_sent'] > 0) {
            $this->logMessage("High priority alerts sent: " . $result['summary']['total_alerts_sent'], 'WARNING');
        }
        
        return $result;
    }
    
    /**
     * 標準監視実行
     * 
     * @return array 実行結果
     */
    private function runNormalMonitoring() {
        $this->logMessage("Running normal priority monitoring", 'INFO');
        return $this->monitor->runMonitoring('normal');
    }
    
    /**
     * 低優先度監視実行
     * 
     * @return array 実行結果
     */
    private function runLowPriorityMonitoring() {
        $this->logMessage("Running low-priority monitoring", 'INFO');
        return $this->monitor->runMonitoring('low-priority');
    }
    
    /**
     * 全優先度監視実行
     * 
     * @return array 実行結果
     */
    private function runAllMonitoring() {
        $this->logMessage("Running all priority monitoring", 'INFO');
        return $this->monitor->runMonitoring('all');
    }
    
    /**
     * メンテナンス実行
     * 
     * @return array 実行結果
     */
    private function runMaintenance() {
        $this->logMessage("Running maintenance tasks", 'INFO');
        
        $results = [];
        
        try {
            // 古いデータクリーンアップ
            $cleanupResult = $this->monitor->cleanupOldData(30);
            $results['cleanup'] = $cleanupResult;
            
            // 統計更新
            $statsResult = $this->updateStats();
            $results['stats_update'] = $statsResult;
            
            // インデックス最適化（週1回）
            if (date('w') == 0) { // 日曜日
                $optimizeResult = $this->optimizeDatabase();
                $results['database_optimization'] = $optimizeResult;
            }
            
            return [
                'success' => true,
                'results' => $results,
                'message' => 'Maintenance completed successfully'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'results' => $results
            ];
        }
    }
    
    /**
     * ヘルスチェック実行
     * 
     * @return array 実行結果
     */
    private function runHealthCheck() {
        $this->logMessage("Running health check", 'INFO');
        
        $healthResult = $this->monitor->healthCheck();
        
        // 不健康な場合はアラート送信
        if ($healthResult['overall_status'] !== 'healthy') {
            $this->sendHealthAlert($healthResult);
        }
        
        return [
            'success' => true,
            'health_status' => $healthResult
        ];
    }
    
    /**
     * 統計更新
     * 
     * @return array 更新結果
     */
    private function updateStats() {
        try {
            // 日次統計更新
            $sql = "INSERT INTO amazon_daily_stats 
                    (date, total_products, price_changes, stock_changes, api_requests, created_at)
                    SELECT 
                        CURDATE(),
                        (SELECT COUNT(DISTINCT asin) FROM amazon_research_data),
                        (SELECT COUNT(*) FROM amazon_price_history WHERE DATE(recorded_at) = CURDATE()),
                        (SELECT COUNT(*) FROM amazon_stock_history WHERE DATE(recorded_at) = CURDATE()),
                        (SELECT COUNT(*) FROM amazon_api_requests WHERE DATE(requested_at) = CURDATE()),
                        NOW()
                    ON CONFLICT (date) DO UPDATE SET
                        total_products = EXCLUDED.total_products,
                        price_changes = EXCLUDED.price_changes,
                        stock_changes = EXCLUDED.stock_changes,
                        api_requests = EXCLUDED.api_requests,
                        updated_at = NOW()";
            
            $stmt = $this->db->query($sql);
            
            return [
                'success' => true,
                'message' => 'Statistics updated successfully'
            ];
            
        } catch (Exception $e) {
            // テーブルが存在しない場合はスキップ
            if (strpos($e->getMessage(), 'does not exist') !== false) {
                return [
                    'success' => true,
                    'message' => 'Statistics table not found, skipped'
                ];
            }
            
            throw $e;
        }
    }
    
    /**
     * データベース最適化
     * 
     * @return array 最適化結果
     */
    private function optimizeDatabase() {
        $results = [];
        
        $tables = [
            'amazon_research_data',
            'amazon_price_history',
            'amazon_stock_history',
            'amazon_api_requests',
            'amazon_monitoring_rules'
        ];
        
        foreach ($tables as $table) {
            try {
                // VACUUM ANALYZE実行（PostgreSQL）
                $sql = "VACUUM ANALYZE $table";
                $this->db->exec($sql);
                
                $results[$table] = 'optimized';
                
            } catch (Exception $e) {
                $results[$table] = 'failed: ' . $e->getMessage();
            }
        }
        
        return [
            'success' => true,
            'tables' => $results
        ];
    }
    
    /**
     * ヘルスアラート送信
     * 
     * @param array $healthResult ヘルスチェック結果
     */
    private function sendHealthAlert($healthResult) {
        if (!$this->config['notifications']['email_alerts']['enabled']) {
            return;
        }
        
        $subject = "[Amazon Monitor] Health Alert - Status: {$healthResult['overall_status']}";
        
        $body = "Amazon Monitor Health Check Alert\n\n";
        $body .= "Overall Status: {$healthResult['overall_status']}\n";
        $body .= "Timestamp: {$healthResult['timestamp']}\n\n";
        $body .= "Check Details:\n";
        
        foreach ($healthResult['checks'] as $checkName => $checkResult) {
            $body .= "- $checkName: {$checkResult['status']}";
            if (isset($checkResult['message'])) {
                $body .= " ({$checkResult['message']})";
            }
            $body .= "\n";
        }
        
        $emails = $this->config['notifications']['email_alerts']['to_emails'];
        
        if (function_exists('sendEmail')) {
            foreach ($emails as $email) {
                sendEmail($email, $subject, $body);
            }
        }
    }
    
    /**
     * 実行結果ログ
     * 
     * @param string $mode 実行モード
     * @param array $result 実行結果
     */
    private function logExecutionResult($mode, $result) {
        $status = $result['success'] ? 'SUCCESS' : 'FAILED';
        
        $summary = [];
        if (isset($result['summary'])) {
            $summary = [
                'processed' => $result['summary']['total_rules_processed'] ?? 0,
                'changes' => $result['summary']['total_changes_detected'] ?? 0,
                'alerts' => $result['summary']['total_alerts_sent'] ?? 0,
                'errors' => $result['summary']['total_errors'] ?? 0,
                'time' => $result['summary']['processing_time'] ?? 0
            ];
        }
        
        $logEntry = sprintf(
            "[%s] Mode: %s | Status: %s | Summary: %s",
            date('Y-m-d H:i:s'),
            $mode,
            $status,
            json_encode($summary)
        );
        
        $this->logMessage($logEntry, $result['success'] ? 'INFO' : 'ERROR');
    }
    
    /**
     * ログメッセージ出力
     * 
     * @param string $message メッセージ
     * @param string $level ログレベル
     */
    private function logMessage($message, $level = 'INFO') {
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[$timestamp] $level: $message" . PHP_EOL;
        
        // ファイル出力
        $logDir = dirname($this->logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        file_put_contents($this->logFile, $logEntry, FILE_APPEND | LOCK_EX);
        
        // 共通ログ関数も使用
        if (function_exists('logSystemMessage')) {
            logSystemMessage($message, $level);
        }
    }
}

// CLI実行チェック
if (php_sapi_name() === 'cli' && isset($argv[0]) && basename($argv[0]) === 'amazon_scheduler.php') {
    try {
        $scheduler = new AmazonScheduler();
        $exitCode = $scheduler->run($argv);
        exit($exitCode);
        
    } catch (Exception $e) {
        echo "Scheduler execution failed: " . $e->getMessage() . "\n";
        exit(1);
    }
}

/**
 * Amazon統合 - APIエンドポイント
 * new_structure/07_editing/api/amazon_api.php
 * 
 * フロントエンド用のAmazon データ提供API
 */

// API実行部分
if ($_SERVER['REQUEST_METHOD']) {
    require_once __DIR__ . '/../../shared/core/common_functions.php';
    require_once __DIR__ . '/../../02_scraping/amazon/AmazonDataProcessor.php';
    require_once __DIR__ . '/../../10_zaiko/AmazonStockMonitor.php';
    
    class AmazonApiEndpoint {
        
        private $dataProcessor;
        private $stockMonitor;
        private $db;
        
        public function __construct() {
            $this->dataProcessor = new AmazonDataProcessor();
            $this->stockMonitor = new AmazonStockMonitor();
            $this->db = getDatabaseConnection();
            
            // CORS設定
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type');
            
            // プリフライトリクエスト処理
            if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
                http_response_code(200);
                exit();
            }
        }
        
        /**
         * APIリクエスト処理
         */
        public function handleRequest() {
            $action = $_GET['action'] ?? $_POST['action'] ?? '';
            
            try {
                switch ($action) {
                    case 'get_products':
                        $this->handleGetProducts();
                        break;
                        
                    case 'get_product_details':
                        $this->handleGetProductDetails();
                        break;
                        
                    case 'search_products':
                        $this->handleSearchProducts();
                        break;
                        
                    case 'add_monitoring':
                        $this->handleAddMonitoring();
                        break;
                        
                    case 'update_monitoring':
                        $this->handleUpdateMonitoring();
                        break;
                        
                    case 'remove_monitoring':
                        $this->handleRemoveMonitoring();
                        break;
                        
                    case 'get_monitoring_stats':
                        $this->handleGetMonitoringStats();
                        break;
                        
                    case 'manual_update':
                        $this->handleManualUpdate();
                        break;
                        
                    case 'get_price_history':
                        $this->handleGetPriceHistory();
                        break;
                        
                    case 'get_stock_history':
                        $this->handleGetStockHistory();
                        break;
                        
                    default:
                        $this->sendError('Invalid action', 400);
                        break;
                }
                
            } catch (Exception $e) {
                $this->sendError($e->getMessage(), 500);
            }
        }
        
        /**
         * 商品一覧取得
         */
        private function handleGetProducts() {
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = min(50, max(10, intval($_GET['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;
            
            $filters = [
                'availability' => $_GET['availability'] ?? '',
                'price_min' => floatval($_GET['price_min'] ?? 0),
                'price_max' => floatval($_GET['price_max'] ?? 0),
                'brand' => $_GET['brand'] ?? '',
                'search' => $_GET['search'] ?? ''
            ];
            
            $whereClause = "WHERE 1=1";
            $params = [];
            
            // フィルター条件構築
            if (!empty($filters['availability'])) {
                $whereClause .= " AND availability_status = ?";
                $params[] = $filters['availability'];
            }
            
            if ($filters['price_min'] > 0) {
                $whereClause .= " AND current_price >= ?";
                $params[] = $filters['price_min'];
            }
            
            if ($filters['price_max'] > 0) {
                $whereClause .= " AND current_price <= ?";
                $params[] = $filters['price_max'];
            }
            
            if (!empty($filters['brand'])) {
                $whereClause .= " AND brand ILIKE ?";
                $params[] = '%' . $filters['brand'] . '%';
            }
            
            if (!empty($filters['search'])) {
                $whereClause .= " AND (title ILIKE ? OR brand ILIKE ?)";
                $params[] = '%' . $filters['search'] . '%';
                $params[] = '%' . $filters['search'] . '%';
            }
            
            // 総件数取得
            $countSql = "SELECT COUNT(*) FROM amazon_research_data $whereClause";
            $stmt = $this->db->prepare($countSql);
            $stmt->execute($params);
            $totalCount = $stmt->fetchColumn();
            
            // データ取得
            $dataSql = "SELECT 
                            asin, title, brand, current_price, currency, availability_status,
                            is_prime_eligible, star_rating, review_count, images_primary,
                            last_api_update_at, updated_at
                        FROM amazon_research_data 
                        $whereClause
                        ORDER BY updated_at DESC
                        LIMIT $limit OFFSET $offset";
            
            $stmt = $this->db->prepare($dataSql);
            $stmt->execute($params);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 画像データ処理
            foreach ($products as &$product) {
                if (!empty($product['images_primary'])) {
                    $images = json_decode($product['images_primary'], true);
                    $product['primary_image'] = $images['large']['url'] ?? $images['medium']['url'] ?? $images['small']['url'] ?? '';
                } else {
                    $product['primary_image'] = '';
                }
                unset($product['images_primary']);
            }
            
            $this->sendSuccess([
                'products' => $products,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $totalCount,
                    'pages' => ceil($totalCount / $limit)
                ],
                'filters' => $filters
            ]);
        }
        
        /**
         * 商品詳細取得
         */
        private function handleGetProductDetails() {
            $asin = $_GET['asin'] ?? '';
            
            if (empty($asin)) {
                $this->sendError('ASIN is required', 400);
                return;
            }
            
            $sql = "SELECT * FROM amazon_research_data WHERE asin = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$asin]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$product) {
                $this->sendError('Product not found', 404);
                return;
            }
            
            // JSON フィールドをデコード
            $jsonFields = ['images_primary', 'images_variants', 'features', 'item_specifics', 
                          'sales_rank', 'browse_nodes', 'variation_summary'];
            
            foreach ($jsonFields as $field) {
                if (!empty($product[$field])) {
                    $product[$field] = json_decode($product[$field], true);
                }
            }
            
            // 監視設定取得
            $sql = "SELECT * FROM amazon_monitoring_rules WHERE asin = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$asin]);
            $monitoringRule = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $this->sendSuccess([
                'product' => $product,
                'monitoring_rule' => $monitoringRule
            ]);
        }
        
        /**
         * 商品検索（API経由）
         */
        private function handleSearchProducts() {
            $keywords = trim($_GET['keywords'] ?? '');
            
            if (empty($keywords)) {
                $this->sendError('Keywords are required', 400);
                return;
            }
            
            $options = [
                'ItemCount' => min(20, intval($_GET['limit'] ?? 10)),
                'SearchIndex' => $_GET['category'] ?? 'All',
                'SortBy' => $_GET['sort'] ?? 'Relevance'
            ];
            
            try {
                $searchResult = $this->dataProcessor->getApiClient()->searchItems($keywords, $options);
                
                // データベース保存
                if (!empty($searchResult['items'])) {
                    $asins = array_column($searchResult['items'], 'asin');
                    $this->dataProcessor->processAsinList($asins, [
                        'save_to_db' => true,
                        'force_update' => false
                    ]);
                }
                
                $this->sendSuccess($searchResult);
                
            } catch (Exception $e) {
                $this->sendError('Search failed: ' . $e->getMessage(), 500);
            }
        }
        
        /**
         * 監視設定追加
         */
        private function handleAddMonitoring() {
            $asin = trim($_POST['asin'] ?? '');
            
            if (empty($asin)) {
                $this->sendError('ASIN is required', 400);
                return;
            }
            
            $monitoringData = [
                'rule_name' => $_POST['rule_name'] ?? "Monitoring rule for $asin",
                'priority_level' => $_POST['priority_level'] ?? 'normal',
                'check_frequency_minutes' => intval($_POST['check_frequency'] ?? 120),
                'monitor_price' => !!($_POST['monitor_price'] ?? true),
                'monitor_stock' => !!($_POST['monitor_stock'] ?? true),
                'price_change_threshold_percent' => floatval($_POST['price_threshold'] ?? 5.0),
                'target_price_max' => floatval($_POST['target_price_max'] ?? 0),
                'target_price_min' => floatval($_POST['target_price_min'] ?? 0),
                'stock_out_alert' => !!($_POST['stock_out_alert'] ?? true),
                'stock_in_alert' => !!($_POST['stock_in_alert'] ?? true),
                'email_alerts' => !!($_POST['email_alerts'] ?? false)
            ];
            
            try {
                $sql = "INSERT INTO amazon_monitoring_rules 
                        (asin, rule_name, priority_level, check_frequency_minutes, 
                         monitor_price, monitor_stock, price_change_threshold_percent,
                         target_price_max, target_price_min, stock_out_alert, stock_in_alert,
                         email_alerts, is_active, next_check_at, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, NOW() + INTERVAL ? MINUTE, NOW(), NOW())";
                
                $stmt = $this->db->prepare($sql);
                $success = $stmt->execute([
                    $asin,
                    $monitoringData['rule_name'],
                    $monitoringData['priority_level'],
                    $monitoringData['check_frequency_minutes'],
                    $monitoringData['monitor_price'],
                    $monitoringData['monitor_stock'],
                    $monitoringData['price_change_threshold_percent'],
                    $monitoringData['target_price_max'] ?: null,
                    $monitoringData['target_price_min'] ?: null,
                    $monitoringData['stock_out_alert'],
                    $monitoringData['stock_in_alert'],
                    $monitoringData['email_alerts'],
                    $monitoringData['check_frequency_minutes']
                ]);
                
                if ($success) {
                    $this->sendSuccess(['message' => 'Monitoring rule added successfully']);
                } else {
                    $this->sendError('Failed to add monitoring rule', 500);
                }
                
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'duplicate key') !== false) {
                    $this->sendError('Monitoring rule already exists for this ASIN', 409);
                } else {
                    $this->sendError('Database error: ' . $e->getMessage(), 500);
                }
            }
        }
        
        /**
         * 価格履歴取得
         */
        private function handleGetPriceHistory() {
            $asin = $_GET['asin'] ?? '';
            $days = min(365, max(7, intval($_GET['days'] ?? 30)));
            
            if (empty($asin)) {
                $this->sendError('ASIN is required', 400);
                return;
            }
            
            $sql = "SELECT price, currency, change_percentage, recorded_at
                    FROM amazon_price_history 
                    WHERE asin = ? AND recorded_at >= NOW() - INTERVAL '$days days'
                    ORDER BY recorded_at ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$asin]);
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $this->sendSuccess([
                'asin' => $asin,
                'period_days' => $days,
                'price_history' => $history,
                'count' => count($history)
            ]);
        }
        
        /**
         * 在庫履歴取得
         */
        private function handleGetStockHistory() {
            $asin = $_GET['asin'] ?? '';
            $days = min(90, max(7, intval($_GET['days'] ?? 30)));
            
            if (empty($asin)) {
                $this->sendError('ASIN is required', 400);
                return;
            }
            
            $sql = "SELECT availability_status, availability_message, 
                           status_changed, back_in_stock, out_of_stock, recorded_at
                    FROM amazon_stock_history 
                    WHERE asin = ? AND recorded_at >= NOW() - INTERVAL '$days days'
                    ORDER BY recorded_at ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$asin]);
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $this->sendSuccess([
                'asin' => $asin,
                'period_days' => $days,
                'stock_history' => $history,
                'count' => count($history)
            ]);
        }
        
        /**
         * 手動更新実行
         */
        private function handleManualUpdate() {
            $asins = $_POST['asins'] ?? [];
            
            if (empty($asins) || !is_array($asins)) {
                $this->sendError('ASINs array is required', 400);
                return;
            }
            
            try {
                $result = $this->dataProcessor->processAsinList($asins, [
                    'force_update' => true,
                    'resource_set' => 'complete'
                ]);
                
                $this->sendSuccess([
                    'message' => 'Manual update completed',
                    'result' => $result
                ]);
                
            } catch (Exception $e) {
                $this->sendError('Update failed: ' . $e->getMessage(), 500);
            }
        }
        
        /**
         * 監視統計取得
         */
        private function handleGetMonitoringStats() {
            $period = $_GET['period'] ?? 'today';
            
            try {
                $stats = $this->stockMonitor->getMonitoringStats($period);
                $this->sendSuccess($stats);
                
            } catch (Exception $e) {
                $this->sendError('Failed to get stats: ' . $e->getMessage(), 500);
            }
        }
        
        /**
         * 成功レスポンス送信
         */
        private function sendSuccess($data) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'data' => $data,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            exit();
        }
        
        /**
         * エラーレスポンス送信
         */
        private function sendError($message, $code = 400) {
            http_response_code($code);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => $message,
                'code' => $code,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            exit();
        }
    }
    
    // API実行
    $api = new AmazonApiEndpoint();
    $api->handleRequest();
}

?>