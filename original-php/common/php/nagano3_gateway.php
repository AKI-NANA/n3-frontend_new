<?php
/**
 * 🌐 NAGANO-3 API Gateway
 * ファイル名: nagano3_gateway.php
 * 
 * 【機能】
 * - 全モジュールへの統一アクセス点
 * - 自動的にローカル/リモート振り分け
 * - VPS移行時も設定変更だけでOK
 * - 障害時の自動フォールバック
 */

// =====================================
// 🔧 Gateway 設定
// =====================================

class NAGANO3_Gateway {
    
    private $services_config = [
        // 🔑 APIキー管理（最重要）
        'apikeys' => [
            'local_file' => 'unbreakable_core_system.php',
            'remote_url' => null, // 将来: 'https://api.nagano3.com/keys'
            'backup_file' => 'nagano3_core.php',
            'critical' => true
        ],
        
        // 📊 会計システム
        'accounting' => [
            'local_file' => 'modules/accounting/kicho.php',
            'remote_url' => null, // 将来: 'https://accounting.nagano3.com'
            'backup_file' => null,
            'critical' => false
        ],
        
        // 📦 在庫管理
        'inventory' => [
            'local_file' => 'modules/inventory/shohin.php', 
            'remote_url' => null, // 将来: 'https://inventory.nagano3.com'
            'backup_file' => null,
            'critical' => false
        ],
        
        // 🚚 配送管理
        'shipping' => [
            'local_file' => 'modules/shipping/delivery.php',
            'remote_url' => null, // 将来: 'https://shipping.nagano3.com'
            'backup_file' => null,
            'critical' => false
        ],
        
        // 📈 分析・レポート
        'analytics' => [
            'local_file' => 'modules/analytics/reports.php',
            'remote_url' => null, // 将来: 'https://analytics.nagano3.com'
            'backup_file' => null,
            'critical' => false
        ]
    ];
    
    private $request_log = [];
    private $performance_metrics = [];
    
    public function __construct() {
        $this->loadConfiguration();
        $this->initializeMetrics();
    }
    
    /**
     * 🎯 メインルーティング関数
     * 
     * @param string $service サービス名（apikeys, accounting等）
     * @param string $action アクション名（create, get, update等）
     * @param array $data リクエストデータ
     * @return array レスポンス
     */
    public function route($service, $action, $data = []) {
        $start_time = microtime(true);
        
        try {
            // 1. サービス設定取得
            $config = $this->getServiceConfig($service);
            
            // 2. 最適な実行方法を決定
            $result = $this->executeRequest($config, $action, $data);
            
            // 3. パフォーマンス記録
            $this->recordMetrics($service, $action, microtime(true) - $start_time, true);
            
            return $result;
            
        } catch (Exception $e) {
            // 4. エラー時のフォールバック
            $fallback_result = $this->handleError($service, $action, $data, $e);
            
            $this->recordMetrics($service, $action, microtime(true) - $start_time, false);
            
            return $fallback_result;
        }
    }
    
    /**
     * 🔄 リクエスト実行（優先順位付き）
     */
    private function executeRequest($config, $action, $data) {
        // 優先度1: リモートサーバー（VPS環境）
        if (!empty($config['remote_url']) && $this->isRemoteAvailable($config['remote_url'])) {
            return $this->callRemoteAPI($config['remote_url'], $action, $data);
        }
        
        // 優先度2: ローカルファイル
        if (!empty($config['local_file']) && file_exists($config['local_file'])) {
            return $this->callLocalFile($config['local_file'], $action, $data);
        }
        
        // 優先度3: バックアップファイル
        if (!empty($config['backup_file']) && file_exists($config['backup_file'])) {
            return $this->callLocalFile($config['backup_file'], $action, $data);
        }
        
        throw new Exception("No available service endpoint");
    }
    
    /**
     * 🌐 リモートAPI呼び出し（VPS用）
     */
    private function callRemoteAPI($url, $action, $data) {
        $full_url = rtrim($url, '/') . '/' . $action;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $full_url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->getAPIToken(),
            'X-NAGANO3-Version: 1.0.0'
        ]);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code === 200 && $response) {
            return json_decode($response, true);
        }
        
        throw new Exception("Remote API call failed: HTTP {$http_code}");
    }
    
    /**
     * 📁 ローカルファイル呼び出し
     */
    private function callLocalFile($file_path, $action, $data) {
        // セキュリティチェック
        if (!$this->isSecureFilePath($file_path)) {
            throw new Exception("Insecure file path: {$file_path}");
        }
        
        // ファイル読み込み
        if (!file_exists($file_path)) {
            throw new Exception("File not found: {$file_path}");
        }
        
        // アクション実行
        return $this->executeLocalAction($file_path, $action, $data);
    }
    
    /**
     * 🔧 ローカルアクション実行
     */
    private function executeLocalAction($file_path, $action, $data) {
        // 既存システムとの互換性維持
        if (strpos($file_path, 'unbreakable_core_system.php') !== false) {
            // Unbreakable Core System 呼び出し
            return $this->callUnbreakableCore($action, $data);
        }
        
        if (strpos($file_path, 'nagano3_core.php') !== false) {
            // Core Library 呼び出し
            require_once $file_path;
            return $this->callCoreFunction($action, $data);
        }
        
        // 一般的なモジュール呼び出し
        return $this->callGenericModule($file_path, $action, $data);
    }
    
    /**
     * 🛡️ Unbreakable Core 専用呼び出し
     */
    private function callUnbreakableCore($action, $data) {
        // 一時的にPOSTデータを設定
        $original_post = $_POST;
        $_POST = array_merge($data, ['action' => $action]);
        
        // セッション開始
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        ob_start();
        try {
            include 'unbreakable_core_system.php';
            $output = ob_get_contents();
        } finally {
            ob_end_clean();
            $_POST = $original_post; // 復元
        }
        
        // JSONレスポンスをパース
        $json_response = json_decode($output, true);
        if ($json_response) {
            return $json_response;
        }
        
        // HTMLレスポンスの場合はそのまま返す
        return ['success' => true, 'html' => $output];
    }
    
    /**
     * 🔧 Core関数呼び出し
     */
    private function callCoreFunction($action, $data) {
        switch ($action) {
            case 'get_api_key':
                $service = $data['service'] ?? '';
                $tier = $data['tier'] ?? 'any';
                return ['success' => true, 'api_key' => getAPIKey($service, $tier)];
                
            case 'create_api_key':
                $result = createAPIKey($data);
                return ['success' => $result !== false, 'id' => $result];
                
            case 'get_all_keys':
                return ['success' => true, 'data' => getAllAPIKeys()];
                
            case 'health_check':
                return nagano3_health_check();
                
            default:
                throw new Exception("Unknown core action: {$action}");
        }
    }
    
    /**
     * 🔄 一般モジュール呼び出し
     */
    private function callGenericModule($file_path, $action, $data) {
        // モジュールファイルの動的読み込み
        ob_start();
        
        // モジュール用の環境変数設定
        $_MODULE_ACTION = $action;
        $_MODULE_DATA = $data;
        
        try {
            include $file_path;
            $output = ob_get_contents();
        } finally {
            ob_end_clean();
        }
        
        // JSON出力の場合
        $json_result = json_decode($output, true);
        if ($json_result) {
            return $json_result;
        }
        
        // テキスト出力の場合
        return ['success' => true, 'output' => $output];
    }
    
    /**
     * ⚠️ エラーハンドリング
     */
    private function handleError($service, $action, $data, $exception) {
        error_log("NAGANO3 Gateway Error: {$service}/{$action} - " . $exception->getMessage());
        
        $config = $this->getServiceConfig($service);
        
        // クリティカルサービスの場合は強制フォールバック
        if ($config['critical']) {
            return $this->emergencyFallback($service, $action, $data);
        }
        
        // 非クリティカルサービスはエラーレスポンス
        return [
            'success' => false,
            'error' => $exception->getMessage(),
            'service' => $service,
            'action' => $action,
            'fallback_available' => !empty($config['backup_file'])
        ];
    }
    
    /**
     * 🚨 緊急フォールバック
     */
    private function emergencyFallback($service, $action, $data) {
        // APIキーサービスの緊急対応
        if ($service === 'apikeys') {
            switch ($action) {
                case 'get_api_key':
                    // 環境変数から取得
                    $service_name = $data['service'] ?? '';
                    $env_key = strtoupper($service_name) . '_API_KEY';
                    $api_key = getenv($env_key) ?: $_ENV[$env_key] ?? null;
                    
                    return [
                        'success' => $api_key !== null,
                        'api_key' => $api_key,
                        'source' => 'emergency_env'
                    ];
                    
                default:
                    return ['success' => false, 'error' => 'Emergency mode: limited functionality'];
            }
        }
        
        return ['success' => false, 'error' => 'Service temporarily unavailable'];
    }
    
    /**
     * 🔍 リモート可用性チェック
     */
    private function isRemoteAvailable($url) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '/health');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_NOBODY, true); // HEAD リクエスト
        
        $result = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return $http_code === 200;
    }
    
    /**
     * 📊 メトリクス記録
     */
    private function recordMetrics($service, $action, $duration, $success) {
        $this->performance_metrics[] = [
            'timestamp' => time(),
            'service' => $service,
            'action' => $action, 
            'duration' => round($duration, 3),
            'success' => $success
        ];
        
        // メトリクス数を制限
        if (count($this->performance_metrics) > 1000) {
            $this->performance_metrics = array_slice($this->performance_metrics, -500);
        }
    }
    
    /**
     * 🔧 ユーティリティ関数
     */
    private function getServiceConfig($service) {
        if (!isset($this->services_config[$service])) {
            throw new Exception("Unknown service: {$service}");
        }
        return $this->services_config[$service];
    }
    
    private function isSecureFilePath($path) {
        // パストラバーサル攻撃防止
        return !preg_match('/\.\.\//', $path) && !preg_match('/\/etc\//', $path);
    }
    
    private function getAPIToken() {
        return $_SESSION['nagano3_api_token'] ?? 'default-token';
    }
    
    private function loadConfiguration() {
        // 設定ファイルから動的読み込み（将来用）
        if (file_exists('nagano3_gateway_config.php')) {
            include 'nagano3_gateway_config.php';
        }
    }
    
    private function initializeMetrics() {
        $this->performance_metrics = [];
        $this->request_log = [];
    }
    
    /**
     * 📊 Gateway 統計情報
     */
    public function getMetrics() {
        $recent_metrics = array_slice($this->performance_metrics, -100);
        
        $stats = [
            'total_requests' => count($this->performance_metrics),
            'avg_response_time' => 0,
            'success_rate' => 0,
            'services_status' => []
        ];
        
        if (!empty($recent_metrics)) {
            $total_time = array_sum(array_column($recent_metrics, 'duration'));
            $success_count = count(array_filter($recent_metrics, fn($m) => $m['success']));
            
            $stats['avg_response_time'] = round($total_time / count($recent_metrics), 3);
            $stats['success_rate'] = round(($success_count / count($recent_metrics)) * 100, 1);
        }
        
        // サービス別統計
        foreach ($this->services_config as $service => $config) {
            $service_metrics = array_filter($recent_metrics, fn($m) => $m['service'] === $service);
            $stats['services_status'][$service] = [
                'requests' => count($service_metrics),
                'avg_time' => $service_metrics ? round(array_sum(array_column($service_metrics, 'duration')) / count($service_metrics), 3) : 0,
                'remote_available' => !empty($config['remote_url']) ? $this->isRemoteAvailable($config['remote_url']) : false
            ];
        }
        
        return $stats;
    }
}

// =====================================
// 🚀 使用例・テスト関数
// =====================================

/**
 * 簡単な使用例
 */
function nagano3_call($service, $action, $data = []) {
    static $gateway = null;
    
    if ($gateway === null) {
        $gateway = new NAGANO3_Gateway();
    }
    
    return $gateway->route($service, $action, $data);
}

// =====================================
// 🌐 HTTP API エンドポイント
// =====================================

if ($_SERVER['REQUEST_METHOD'] === 'POST' || isset($_GET['action'])) {
    header('Content-Type: application/json');
    
    try {
        $gateway = new NAGANO3_Gateway();
        
        // パラメータ取得
        $service = $_POST['service'] ?? $_GET['service'] ?? '';
        $action = $_POST['action'] ?? $_GET['action'] ?? '';
        $data = $_POST['data'] ?? $_GET['data'] ?? $_POST;
        
        // アクション実行
        if ($action === 'gateway_metrics') {
            $result = $gateway->getMetrics();
        } else {
            $result = $gateway->route($service, $action, $data);
        }
        
        echo json_encode($result);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    
    exit;
}

?>

<!-- =====================================
     🎮 Gateway 管理画面（簡易版）
     ===================================== -->
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>🌐 NAGANO-3 API Gateway</title>
    <style>
        body { font-family: -apple-system, sans-serif; margin: 40px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 24px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .metric { text-align: center; padding: 16px; background: #f1f5f9; border-radius: 8px; }
        .metric-value { font-size: 2rem; font-weight: bold; color: #3b82f6; }
        .metric-label { color: #64748b; font-size: 0.9rem; }
        .service-list { display: grid; gap: 12px; }
        .service-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border-radius: 8px; }
        .status-online { color: #10b981; font-weight: bold; }
        .status-offline { color: #ef4444; font-weight: bold; }
        .btn { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>🌐 NAGANO-3 API Gateway</h1>
            <p>全モジュールへの統一アクセス点</p>
        </div>
        
        <div class="card">
            <h2>📊 Gateway メトリクス</h2>
            <div class="metrics" id="metrics">
                <div class="metric">
                    <div class="metric-value" id="totalRequests">-</div>
                    <div class="metric-label">総リクエスト数</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="avgResponseTime">-</div>
                    <div class="metric-label">平均応答時間(ms)</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="successRate">-</div>
                    <div class="metric-label">成功率(%)</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h2>🔧 サービス一覧</h2>
            <div class="service-list" id="serviceList">
                <div>サービス情報を読み込み中...</div>
            </div>
        </div>
        
        <div class="card">
            <h2>🧪 Gateway テスト</h2>
            <button class="btn" onclick="testAPIKeys()">APIキーサービステスト</button>
            <button class="btn" onclick="testAccounting()">会計サービステスト</button>
            <button class="btn" onclick="refreshMetrics()">メトリクス更新</button>
            
            <div id="testResults" style="margin-top: 16px; padding: 16px; background: #f1f5f9; border-radius: 8px; display: none;">
                <h4>テスト結果:</h4>
                <pre id="testOutput"></pre>
            </div>
        </div>
    </div>
    
    <script>
        // Gateway メトリクス取得
        async function loadMetrics() {
            try {
                const response = await fetch('nagano3_gateway.php?action=gateway_metrics');
                const data = await response.json();
                
                document.getElementById('totalRequests').textContent = data.total_requests || 0;
                document.getElementById('avgResponseTime').textContent = (data.avg_response_time * 1000).toFixed(1) || 0;
                document.getElementById('successRate').textContent = data.success_rate || 0;
                
                // サービス一覧更新
                updateServiceList(data.services_status || {});
                
            } catch (error) {
                console.error('メトリクス取得エラー:', error);
            }
        }
        
        function updateServiceList(services) {
            const serviceList = document.getElementById('serviceList');
            serviceList.innerHTML = Object.entries(services).map(([name, status]) => `
                <div class="service-item">
                    <span><strong>${name}</strong> (${status.requests} requests)</span>
                    <span class="${status.remote_available ? 'status-online' : 'status-offline'}">
                        ${status.remote_available ? '🟢 Online' : '🔴 Local'}
                    </span>
                </div>
            `).join('');
        }
        
        // テスト関数
        async function testAPIKeys() {
            showTest('APIキーサービステスト中...');
            
            try {
                const response = await fetch('nagano3_gateway.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: 'service=apikeys&action=health_check'
                });
                
                const result = await response.json();
                showTest('✅ APIキーサービス正常\n' + JSON.stringify(result, null, 2));
                
            } catch (error) {
                showTest('❌ APIキーサービスエラー: ' + error.message);
            }
        }
        
        async function testAccounting() {
            showTest('会計サービステスト中...');
            
            try {
                const response = await fetch('nagano3_gateway.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: 'service=accounting&action=health_check'
                });
                
                const result = await response.json();
                showTest('✅ 会計サービステスト完了\n' + JSON.stringify(result, null, 2));
                
            } catch (error) {
                showTest('❌ 会計サービスエラー: ' + error.message);
            }
        }
        
        function showTest(message) {
            const results = document.getElementById('testResults');
            const output = document.getElementById('testOutput');
            results.style.display = 'block';
            output.textContent = message;
        }
        
        function refreshMetrics() {
            loadMetrics();
        }
        
        // 初期化
        document.addEventListener('DOMContentLoaded', () => {
            loadMetrics();
            
            // 5秒ごとに自動更新
            setInterval(loadMetrics, 5000);
        });
    </script>
</body>
</html>