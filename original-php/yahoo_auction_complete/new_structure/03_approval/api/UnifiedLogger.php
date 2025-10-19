<?php
/**
 * 統一ログシステム
 * フィードバック反映：統一JSONフォーマットによる中央ログ管理
 */

class UnifiedLogger {
    private $logFormat = [
        'timestamp' => '',
        'level' => '',
        'service' => '',
        'workflow_id' => '',
        'step_name' => '',
        'message' => '',
        'context' => [],
        'execution_time' => 0,
        'memory_usage' => 0,
        'request_id' => '',
        'user_id' => '',
        'trace_id' => ''
    ];
    
    private $logLevels = [
        'DEBUG' => 0,
        'INFO' => 1,
        'WARNING' => 2,
        'ERROR' => 3,
        'CRITICAL' => 4
    ];
    
    private $minLogLevel;
    private $logToDatabase;
    private $pdo;
    private $requestId;
    
    public function __construct($minLogLevel = 'INFO', $logToDatabase = false, $pdo = null) {
        $this->minLogLevel = $this->logLevels[$minLogLevel] ?? $this->logLevels['INFO'];
        $this->logToDatabase = $logToDatabase;
        $this->pdo = $pdo;
        $this->requestId = $this->generateRequestId();
    }
    
    /**
     * 統一ログ出力
     */
    public function log($level, $message, $context = []) {
        $levelValue = $this->logLevels[$level] ?? $this->logLevels['INFO'];
        
        // 最小ログレベル未満はスキップ
        if ($levelValue < $this->minLogLevel) {
            return;
        }
        
        $logEntry = $this->logFormat;
        $logEntry['timestamp'] = $this->getMicroTimestamp();
        $logEntry['level'] = $level;
        $logEntry['service'] = $context['service'] ?? 'approval_system';
        $logEntry['workflow_id'] = $context['workflow_id'] ?? null;
        $logEntry['step_name'] = $context['step_name'] ?? 'approval';
        $logEntry['message'] = $message;
        $logEntry['context'] = $context;
        $logEntry['execution_time'] = $context['execution_time'] ?? 0;
        $logEntry['memory_usage'] = memory_get_usage(true);
        $logEntry['request_id'] = $this->requestId;
        $logEntry['user_id'] = $context['user_id'] ?? $this->getCurrentUserId();
        $logEntry['trace_id'] = $context['trace_id'] ?? $this->requestId;
        
        // JSON形式でファイルログ出力
        $jsonLog = json_encode($logEntry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        error_log($jsonLog);
        
        // 重要なログはデータベースにも保存
        if ($this->logToDatabase && in_array($level, ['ERROR', 'CRITICAL', 'WARNING'])) {
            $this->saveToDatabase($logEntry);
        }
        
        // 開発環境では標準出力にも出力
        if (defined('DEBUG_MODE') && DEBUG_MODE) {
            echo "[{$logEntry['timestamp']}] {$level}: {$message}\n";
        }
    }
    
    /**
     * ログレベル別メソッド
     */
    public function debug($message, $context = []) {
        $this->log('DEBUG', $message, $context);
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
    
    public function critical($message, $context = []) {
        $this->log('CRITICAL', $message, $context);
    }
    
    /**
     * パフォーマンス測定用ログ
     */
    public function logPerformance($operation, $startTime, $context = []) {
        $executionTime = (microtime(true) - $startTime) * 1000; // ms
        $memoryUsage = memory_get_usage(true);
        $peakMemory = memory_get_peak_usage(true);
        
        $perfContext = array_merge($context, [
            'operation' => $operation,
            'execution_time' => round($executionTime, 2),
            'memory_usage' => $memoryUsage,
            'peak_memory' => $peakMemory,
            'memory_formatted' => $this->formatBytes($memoryUsage),
            'peak_memory_formatted' => $this->formatBytes($peakMemory)
        ]);
        
        $level = $executionTime > 5000 ? 'WARNING' : 'INFO'; // 5秒以上は警告
        $this->log($level, "Performance: {$operation} completed in {$executionTime}ms", $perfContext);
    }
    
    /**
     * データベースアクセスログ
     */
    public function logDatabase($query, $executionTime, $rowCount = null, $context = []) {
        $dbContext = array_merge($context, [
            'query_type' => $this->getQueryType($query),
            'query' => $this->sanitizeQuery($query),
            'execution_time' => $executionTime,
            'row_count' => $rowCount,
            'slow_query' => $executionTime > 1000 // 1秒以上は低速クエリ
        ]);
        
        $level = $executionTime > 1000 ? 'WARNING' : 'DEBUG';
        $this->log($level, "Database query executed", $dbContext);
    }
    
    /**
     * エラー詳細ログ
     */
    public function logError($exception, $context = []) {
        $errorContext = array_merge($context, [
            'exception_class' => get_class($exception),
            'exception_message' => $exception->getMessage(),
            'exception_code' => $exception->getCode(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'stack_trace' => $exception->getTraceAsString(),
            'php_version' => PHP_VERSION,
            'server_info' => [
                'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? 'CLI',
                'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'CLI',
                'HTTP_USER_AGENT' => $_SERVER['HTTP_USER_AGENT'] ?? 'CLI',
                'REMOTE_ADDR' => $_SERVER['REMOTE_ADDR'] ?? 'CLI'
            ]
        ]);
        
        $this->critical("Uncaught exception: {$exception->getMessage()}", $errorContext);
    }
    
    /**
     * ワークフロー固有ログ
     */
    public function logWorkflowStep($workflowId, $stepName, $status, $data = [], $context = []) {
        $workflowContext = array_merge($context, [
            'workflow_id' => $workflowId,
            'step_name' => $stepName,
            'step_status' => $status,
            'step_data' => $data
        ]);
        
        $message = "Workflow step {$stepName} {$status} for workflow {$workflowId}";
        $level = $status === 'failed' ? 'ERROR' : 'INFO';
        
        $this->log($level, $message, $workflowContext);
    }
    
    /**
     * API レスポンスログ
     */
    public function logApiResponse($endpoint, $method, $statusCode, $responseTime, $context = []) {
        $apiContext = array_merge($context, [
            'endpoint' => $endpoint,
            'http_method' => $method,
            'status_code' => $statusCode,
            'response_time' => $responseTime,
            'is_error' => $statusCode >= 400
        ]);
        
        $level = $statusCode >= 500 ? 'ERROR' : ($statusCode >= 400 ? 'WARNING' : 'INFO');
        $message = "API {$method} {$endpoint} responded with {$statusCode} in {$responseTime}ms";
        
        $this->log($level, $message, $apiContext);
    }
    
    /**
     * セキュリティイベントログ
     */
    public function logSecurity($event, $severity = 'WARNING', $context = []) {
        $securityContext = array_merge($context, [
            'security_event' => $event,
            'severity' => $severity,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'timestamp' => time()
        ]);
        
        $this->log($severity, "Security event: {$event}", $securityContext);
    }
    
    // プライベートメソッド
    private function getMicroTimestamp() {
        return date('Y-m-d H:i:s.') . sprintf('%03d', (microtime(true) - floor(microtime(true))) * 1000);
    }
    
    private function generateRequestId() {
        return uniqid('req_', true);
    }
    
    private function getCurrentUserId() {
        return $_SESSION['user_id'] ?? $this->getJWTUserId() ?? 'anonymous';
    }
    
    private function getJWTUserId() {
        $headers = getallheaders() ?: [];
        $authHeader = $headers['Authorization'] ?? '';
        
        if (strpos($authHeader, 'Bearer ') === 0) {
            $token = substr($authHeader, 7);
            // JWT デコードロジックは後で実装
            return 'jwt_user';
        }
        
        return null;
    }
    
    private function formatBytes($size) {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $power = $size > 0 ? floor(log($size) / log(1024)) : 0;
        return round($size / pow(1024, $power), 2) . ' ' . $units[$power];
    }
    
    private function getQueryType($query) {
        $query = strtoupper(trim($query));
        if (strpos($query, 'SELECT') === 0) return 'SELECT';
        if (strpos($query, 'INSERT') === 0) return 'INSERT';
        if (strpos($query, 'UPDATE') === 0) return 'UPDATE';
        if (strpos($query, 'DELETE') === 0) return 'DELETE';
        if (strpos($query, 'CREATE') === 0) return 'CREATE';
        if (strpos($query, 'ALTER') === 0) return 'ALTER';
        if (strpos($query, 'DROP') === 0) return 'DROP';
        return 'OTHER';
    }
    
    private function sanitizeQuery($query) {
        // パスワードやセンシティブデータをマスク
        $query = preg_replace('/password\s*=\s*[\'"][^\'"]*/i', 'password=***', $query);
        $query = preg_replace('/token\s*=\s*[\'"][^\'"]*/i', 'token=***', $query);
        
        // 長すぎるクエリは省略
        if (strlen($query) > 1000) {
            $query = substr($query, 0, 1000) . '... [truncated]';
        }
        
        return $query;
    }
    
    private function saveToDatabase($logEntry) {
        if (!$this->pdo) {
            return;
        }
        
        try {
            $sql = "INSERT INTO system_logs (
                level, service, workflow_id, step_name, message, 
                context, execution_time, memory_usage, request_id, 
                user_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $logEntry['level'],
                $logEntry['service'],
                $logEntry['workflow_id'],
                $logEntry['step_name'],
                $logEntry['message'],
                json_encode($logEntry['context']),
                $logEntry['execution_time'],
                $logEntry['memory_usage'],
                $logEntry['request_id'],
                $logEntry['user_id'],
                $logEntry['timestamp']
            ]);
        } catch (Exception $e) {
            // ログ保存失敗時はファイルログのみ
            error_log("Failed to save log to database: " . $e->getMessage());
        }
    }
}

/**
 * ログパフォーマンス測定用デコレータ
 */
class PerformanceLogger {
    private $logger;
    
    public function __construct(UnifiedLogger $logger) {
        $this->logger = $logger;
    }
    
    public function measure($operation, callable $callback, $context = []) {
        $startTime = microtime(true);
        $startMemory = memory_get_usage(true);
        
        try {
            $result = $callback();
            $this->logger->logPerformance($operation, $startTime, $context);
            return $result;
        } catch (Exception $e) {
            $this->logger->logPerformance($operation . ' (failed)', $startTime, array_merge($context, [
                'error' => $e->getMessage()
            ]));
            throw $e;
        }
    }
}

/**
 * グローバルログインスタンス取得
 */
function getLogger($service = 'approval_system') {
    static $loggers = [];
    
    if (!isset($loggers[$service])) {
        $loggers[$service] = new UnifiedLogger('INFO', true, getDatabaseConnection());
    }
    
    return $loggers[$service];
}

/**
 * データベース接続取得（後で実装）
 */
function getDatabaseConnection() {
    // データベース接続ロジックは後で実装
    return null;
}
