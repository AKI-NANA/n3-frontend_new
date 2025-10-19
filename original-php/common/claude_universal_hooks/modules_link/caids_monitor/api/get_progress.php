<?php
/**
 * CAIDS監視システム API エンドポイント
 * 進捗データ取得・リアルタイム更新対応
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// セッション開始
session_start();

// CAIDS Hook管理システム連携
$hooksManagerPath = __DIR__ . '/../../../hooks/subete_hooks/CAIDSUnifiedHookManager.php';
if (file_exists($hooksManagerPath)) {
    require_once $hooksManagerPath;
}

class CAIDSAPIHandler {
    
    private $dataDir;
    private $hooksManager;
    
    public function __construct() {
        $this->dataDir = __DIR__ . '/../data';
        
        // Hook管理システム初期化
        if (class_exists('CAIDSUnifiedHookManager')) {
            $this->hooksManager = new CAIDSUnifiedHookManager();
        }
        
        // データディレクトリ確認
        if (!is_dir($this->dataDir . '/sessions')) {
            mkdir($this->dataDir . '/sessions', 0755, true);
        }
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $endpoint = $_GET['endpoint'] ?? '';
        
        try {
            switch ($method) {
                case 'GET':
                    return $this->handleGET($endpoint);
                case 'POST':
                    return $this->handlePOST($endpoint);
                case 'PUT':
                    return $this->handlePUT($endpoint);
                default:
                    throw new Exception('Unsupported HTTP method');
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }
    
    private function handleGET($endpoint) {
        switch ($endpoint) {
            case 'progress':
                return $this->getProgress();
                
            case 'hooks_status':
                return $this->getHooksStatus();
                
            case 'session_info':
                return $this->getSessionInfo();
                
            case 'real_time_log':
                return $this->getRealTimeLog();
                
            case 'export_session':
                return $this->exportSession();
                
            default:
                return $this->getSystemStatus();
        }
    }
    
    private function handlePOST($endpoint) {
        $input = json_decode(file_get_contents('php://input'), true);
        
        switch ($endpoint) {
            case 'update_hook':
                return $this->updateHookProgress($input);
                
            case 'update_phase':
                return $this->updatePhaseProgress($input);
                
            case 'add_log':
                return $this->addLogEntry($input);
                
            case 'simulate_caids':
                return $this->simulateCAIDSExecution($input);
                
            default:
                throw new Exception('Unknown POST endpoint');
        }
    }
    
    private function handlePUT($endpoint) {
        $input = json_decode(file_get_contents('php://input'), true);
        
        switch ($endpoint) {
            case 'reset_session':
                return $this->resetSession($input);
                
            case 'initialize_session':
                return $this->initializeSession($input);
                
            default:
                throw new Exception('Unknown PUT endpoint');
        }
    }
    
    /**
     * 進捗データ取得
     */
    private function getProgress() {
        $sessionId = $_GET['session_id'] ?? $_SESSION['caids_session_id'] ?? null;
        
        if (!$sessionId) {
            throw new Exception('Session ID not provided');
        }
        
        $sessionPath = $this->dataDir . '/sessions/' . $sessionId . '.json';
        
        if (!file_exists($sessionPath)) {
            throw new Exception('Session not found');
        }
        
        $sessionData = json_decode(file_get_contents($sessionPath), true);
        
        // Hook統計情報取得
        $hooksStats = $this->getHooksStatisticsData();
        
        // リアルタイムログ取得
        $logs = $this->getRecentLogs($sessionId, 10);
        
        return [
            'success' => true,
            'session_id' => $sessionId,
            'phases' => $sessionData['phases'] ?? [],
            'hooks' => $sessionData['hooks'] ?? [],
            'hooks_stats' => $hooksStats,
            'recent_logs' => $logs,
            'last_update' => $sessionData['last_update'] ?? date('Y-m-d H:i:s'),
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * Hook状況取得
     */
    private function getHooksStatus() {
        $hooksStats = $this->getHooksStatisticsData();
        
        $detailedHooks = [];
        if ($this->hooksManager) {
            $allHooks = $this->hooksManager->getAllHooksInfo();
            
            foreach (['HISSU', 'SENYO', 'HANYO'] as $category) {
                $detailedHooks[$category] = [];
                if (isset($allHooks[$category])) {
                    foreach ($allHooks[$category] as $hook) {
                        $detailedHooks[$category][] = [
                            'filename' => $hook['filename'],
                            'description' => $hook['description'],
                            'auto_execute' => $hook['auto_execute'],
                            'size' => $hook['size'],
                            'modified' => date('Y-m-d H:i:s', $hook['modified'])
                        ];
                    }
                }
            }
        }
        
        return [
            'success' => true,
            'statistics' => $hooksStats,
            'detailed_hooks' => $detailedHooks,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * セッション情報取得
     */
    private function getSessionInfo() {
        $sessionId = $_GET['session_id'] ?? $_SESSION['caids_session_id'] ?? null;
        
        if (!$sessionId) {
            return [
                'success' => false,
                'error' => 'No active session',
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
        
        $sessionPath = $this->dataDir . '/sessions/' . $sessionId . '.json';
        
        if (file_exists($sessionPath)) {
            $sessionData = json_decode(file_get_contents($sessionPath), true);
            
            return [
                'success' => true,
                'session_data' => $sessionData,
                'session_file_size' => filesize($sessionPath),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
        
        return [
            'success' => false,
            'error' => 'Session file not found',
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * リアルタイムログ取得
     */
    private function getRealTimeLog() {
        $sessionId = $_GET['session_id'] ?? $_SESSION['caids_session_id'] ?? null;
        $limit = intval($_GET['limit'] ?? 50);
        
        $logs = $this->getRecentLogs($sessionId, $limit);
        
        return [
            'success' => true,
            'logs' => $logs,
            'total_count' => count($logs),
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * Hook進捗更新
     */
    private function updateHookProgress($input) {
        $sessionId = $input['session_id'] ?? $_SESSION['caids_session_id'] ?? null;
        $hookType = $input['hook_type'] ?? 'HISSU';
        $progress = $input['progress'] ?? 1;
        $hookName = $input['hook_name'] ?? 'Unknown Hook';
        
        if (!$sessionId) {
            throw new Exception('Session ID required');
        }
        
        $sessionPath = $this->dataDir . '/sessions/' . $sessionId . '.json';
        
        if (!file_exists($sessionPath)) {
            throw new Exception('Session not found');
        }
        
        $sessionData = json_decode(file_get_contents($sessionPath), true);
        
        // Hook進捗更新
        $sessionData['hooks']['loaded_count'] += $progress;
        $sessionData['hooks']['by_tier'][$hookType] += $progress;
        $sessionData['last_update'] = date('Y-m-d H:i:s');
        
        // ログエントリ追加
        $this->addLogEntryToSession($sessionId, 'SUCCESS', "Hook読み込み完了: {$hookName}");
        
        // セッションデータ保存
        file_put_contents($sessionPath, json_encode($sessionData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        return [
            'success' => true,
            'updated_hooks' => $sessionData['hooks'],
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * フェーズ進捗更新
     */
    private function updatePhaseProgress($input) {
        $sessionId = $input['session_id'] ?? $_SESSION['caids_session_id'] ?? null;
        $phaseNum = $input['phase'] ?? 1;
        $status = $input['status'] ?? 'active';
        $progress = $input['progress'] ?? 0;
        
        if (!$sessionId) {
            throw new Exception('Session ID required');
        }
        
        $sessionPath = $this->dataDir . '/sessions/' . $sessionId . '.json';
        
        if (!file_exists($sessionPath)) {
            throw new Exception('Session not found');
        }
        
        $sessionData = json_decode(file_get_contents($sessionPath), true);
        
        // フェーズ進捗更新
        if (isset($sessionData['phases'][$phaseNum])) {
            $sessionData['phases'][$phaseNum]['status'] = $status;
            $sessionData['phases'][$phaseNum]['progress'] = $progress;
            $sessionData['last_update'] = date('Y-m-d H:i:s');
            
            // ログエントリ追加
            $phaseName = $sessionData['phases'][$phaseNum]['name'];
            $this->addLogEntryToSession($sessionId, 'INFO', "Phase {$phaseNum}: {$phaseName} - {$status} ({$progress}%)");
            
            // セッションデータ保存
            file_put_contents($sessionPath, json_encode($sessionData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
        
        return [
            'success' => true,
            'updated_phase' => $sessionData['phases'][$phaseNum] ?? null,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * ログエントリ追加
     */
    private function addLogEntry($input) {
        $sessionId = $input['session_id'] ?? $_SESSION['caids_session_id'] ?? null;
        $type = $input['type'] ?? 'INFO';
        $message = $input['message'] ?? '';
        
        if (!$sessionId || !$message) {
            throw new Exception('Session ID and message required');
        }
        
        $this->addLogEntryToSession($sessionId, $type, $message);
        
        return [
            'success' => true,
            'log_added' => [
                'type' => $type,
                'message' => $message,
                'timestamp' => date('Y-m-d H:i:s')
            ]
        ];
    }
    
    /**
     * CAIDS実行シミュレート
     */
    private function simulateCAIDSExecution($input) {
        $sessionId = $input['session_id'] ?? $_SESSION['caids_session_id'] ?? null;
        $simulationType = $input['type'] ?? 'basic';
        
        if (!$sessionId) {
            throw new Exception('Session ID required');
        }
        
        // シミュレーション開始ログ
        $this->addLogEntryToSession($sessionId, 'INFO', 'CAIDS実行シミュレーション開始');
        
        // 必須Hook読み込みシミュレート
        $essentialHooks = [
            '🔸 ⚠️ エラー処理_h',
            '🔸 ⏳ 読込管理_h',
            '🔸 💬 応答表示_h',
            '🔸 🔄 Ajax統合_h'
        ];
        
        $simulationResults = [];
        
        foreach ($essentialHooks as $index => $hookName) {
            // Hook読み込み進捗更新
            $this->updateHookProgress([
                'session_id' => $sessionId,
                'hook_type' => 'HISSU',
                'progress' => 1,
                'hook_name' => $hookName
            ]);
            
            $simulationResults[] = [
                'hook' => $hookName,
                'status' => 'loaded',
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            // フェーズ進捗更新（Phase 1を25%ずつ進める）
            $this->updatePhaseProgress([
                'session_id' => $sessionId,
                'phase' => 1,
                'status' => 'active',
                'progress' => ($index + 1) * 25
            ]);
        }
        
        // Phase 1完了
        $this->updatePhaseProgress([
            'session_id' => $sessionId,
            'phase' => 1,
            'status' => 'completed',
            'progress' => 100
        ]);
        
        // シミュレーション完了ログ
        $this->addLogEntryToSession($sessionId, 'SUCCESS', 'CAIDS実行シミュレーション完了');
        
        return [
            'success' => true,
            'simulation_type' => $simulationType,
            'hooks_processed' => count($essentialHooks),
            'results' => $simulationResults,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * セッションエクスポート
     */
    private function exportSession() {
        $sessionId = $_GET['session_id'] ?? $_SESSION['caids_session_id'] ?? null;
        
        if (!$sessionId) {
            throw new Exception('Session ID required');
        }
        
        $sessionPath = $this->dataDir . '/sessions/' . $sessionId . '.json';
        $logsPath = $this->dataDir . '/sessions/' . $sessionId . '_logs.json';
        
        $exportData = [
            'export_info' => [
                'session_id' => $sessionId,
                'export_time' => date('Y-m-d H:i:s'),
                'export_version' => 'CAIDS v2.0'
            ],
            'session_data' => [],
            'logs' => [],
            'hooks_statistics' => $this->getHooksStatisticsData()
        ];
        
        // セッションデータ
        if (file_exists($sessionPath)) {
            $exportData['session_data'] = json_decode(file_get_contents($sessionPath), true);
        }
        
        // ログデータ
        if (file_exists($logsPath)) {
            $exportData['logs'] = json_decode(file_get_contents($logsPath), true);
        }
        
        return [
            'success' => true,
            'export_data' => $exportData,
            'file_size' => strlen(json_encode($exportData)),
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * システム状態取得
     */
    private function getSystemStatus() {
        $hooksStats = $this->getHooksStatisticsData();
        
        return [
            'success' => true,
            'system_status' => 'operational',
            'caids_version' => '2.0',
            'hooks_manager_available' => $this->hooksManager !== null,
            'hooks_statistics' => $hooksStats,
            'session_active' => isset($_SESSION['caids_session_id']),
            'data_directory_writable' => is_writable($this->dataDir),
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * Hook統計データ取得（内部メソッド）
     */
    private function getHooksStatisticsData() {
        if ($this->hooksManager) {
            $allHooks = $this->hooksManager->getAllHooksInfo();
            return $allHooks['_stats'] ?? [];
        }
        
        return [
            'total_files' => 0,
            'hissu_count' => 0,
            'senyo_count' => 0,
            'hanyo_count' => 0,
            'unknown_count' => 0,
            'scan_time' => date('Y-m-d H:i:s'),
            'error' => 'Hook管理システムが利用できません'
        ];
    }
    
    /**
     * 最近のログ取得（内部メソッド）
     */
    private function getRecentLogs($sessionId, $limit = 50) {
        if (!$sessionId) {
            return [];
        }
        
        $logsPath = $this->dataDir . '/sessions/' . $sessionId . '_logs.json';
        
        if (file_exists($logsPath)) {
            $logs = json_decode(file_get_contents($logsPath), true) ?? [];
            return array_slice(array_reverse($logs), 0, $limit);
        }
        
        return [];
    }
    
    /**
     * セッションにログエントリ追加（内部メソッド）
     */
    private function addLogEntryToSession($sessionId, $type, $message) {
        $logsPath = $this->dataDir . '/sessions/' . $sessionId . '_logs.json';
        
        $logs = [];
        if (file_exists($logsPath)) {
            $logs = json_decode(file_get_contents($logsPath), true) ?? [];
        }
        
        $logs[] = [
            'type' => $type,
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        // ログ数制限（最新1000件）
        if (count($logs) > 1000) {
            $logs = array_slice($logs, -1000);
        }
        
        file_put_contents($logsPath, json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}

// メイン実行
try {
    $api = new CAIDSAPIHandler();
    $result = $api->handleRequest();
    
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>