<?php
/**
 * 緊急修正版 Server-Sent Events システム
 * データベース接続エラー時の無限ループを防止
 */

// SSE関連のHTTPヘッダー設定
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('Access-Control-Allow-Origin: *');

// 出力バッファリング無効化
if (ob_get_level()) {
    ob_end_clean();
}

class SafeWorkflowSSE {
    private $pdo;
    private $clientId;
    private $connectionAttempts = 0;
    private $maxAttempts = 3;
    
    public function __construct() {
        $this->clientId = $_GET['client_id'] ?? 'unknown_' . time();
    }
    
    private function getDatabaseConnection() {
        if ($this->connectionAttempts >= $this->maxAttempts) {
            return null;
        }
        
        try {
            $this->connectionAttempts++;
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new PDO($dsn, $user, $password, [
                PDO::ATTR_TIMEOUT => 2,
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]);
            
            return $pdo;
        } catch (PDOException $e) {
            error_log("DB接続失敗 (試行 {$this->connectionAttempts}/{$this->maxAttempts}): " . $e->getMessage());
            return null;
        }
    }
    
    public function startDashboardStream() {
        $this->pdo = $this->getDatabaseConnection();
        
        // 接続確認イベント送信
        $this->sendEvent('connected', [
            'client_id' => $this->clientId,
            'timestamp' => time(),
            'database_connected' => ($this->pdo !== null),
            'message' => $this->pdo ? 'データベース接続成功' : 'データベース接続失敗 - フォールバックモード'
        ]);
        
        $counter = 0;
        $maxIterations = 60; // 最大60回のループ（2分間）
        
        while ($counter < $maxIterations) {
            $this->sendDashboardUpdate();
            
            if ($counter % 10 === 0) {
                $this->sendHeartbeat();
            }
            
            $counter++;
            sleep(2);
            
            if (connection_aborted()) {
                break;
            }
        }
        
        $this->sendEvent('disconnected', [
            'message' => '定期ストリーム終了',
            'iterations' => $counter
        ]);
    }
    
    private function sendDashboardUpdate() {
        $dashboardData = [
            'queue_stats' => $this->getQueueStats(),
            'active_workflows' => $this->getActiveWorkflows(),
            'system_stats' => $this->getSystemStats(),
            'timestamp' => time()
        ];
        
        $this->sendEvent('dashboard_update', $dashboardData);
    }
    
    private function getQueueStats() {
        // フォールバックデータ
        return [
            'high_priority' => 1,
            'normal_priority' => 3,
            'low_priority' => 2,
            'processing' => 6,
            'completed_jobs' => 15,
            'failed_jobs' => 1,
            'success_rate' => 94,
            'fallback_mode' => ($this->pdo === null)
        ];
    }
    
    private function getActiveWorkflows() {
        if (!$this->pdo) {
            return []; // データベース未接続時は空配列
        }
        
        try {
            $sql = "SELECT id, status, created_at FROM workflows LIMIT 5";
            $stmt = $this->pdo->query($sql);
            return $stmt->fetchAll();
        } catch (Exception $e) {
            return [];
        }
    }
    
    private function getSystemStats() {
        return [
            'memory_usage' => memory_get_usage(true),
            'cpu_load' => 0.1,
            'database_connected' => ($this->pdo !== null),
            'redis_connected' => false,
            'connection_attempts' => $this->connectionAttempts
        ];
    }
    
    private function sendHeartbeat() {
        $this->sendEvent('heartbeat', [
            'client_id' => $this->clientId,
            'server_time' => time()
        ]);
    }
    
    private function sendEvent($eventType, $data) {
        echo "event: $eventType\n";
        echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n";
        echo "id: " . time() . "_" . mt_rand(1000, 9999) . "\n\n";
        
        if (ob_get_level()) {
            ob_flush();
        }
        flush();
    }
}

// アクション処理
$action = $_GET['action'] ?? 'dashboard';

if ($action === 'test') {
    echo "data: " . json_encode([
        'message' => 'SSE Test (Safe Version)',
        'timestamp' => time()
    ]) . "\n\n";
    flush();
} else {
    $sse = new SafeWorkflowSSE();
    $sse->startDashboardStream();
}
?>
