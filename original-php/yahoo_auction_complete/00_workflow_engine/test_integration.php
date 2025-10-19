<?php
/**
 * 統合ワークフローシステム テストスイート
 * 
 * テスト対象:
 * 1. 03_approval → 08_listing の自動連携
 * 2. ワークフローエンジンの基本動作
 * 3. API呼び出しの正常性
 * 4. エラー処理・復旧機能
 * 5. データベース整合性
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

class IntegratedWorkflowTest {
    private $baseUrl;
    private $testResults = [];
    private $testProductIds = [];
    
    public function __construct() {
        $this->baseUrl = 'http://localhost:8080/modules/yahoo_auction_complete/new_structure';
        $this->prepareTestData();
    }
    
    /**
     * 全テスト実行
     */
    public function runAllTests() {
        echo "\n" . str_repeat("=", 80) . "\n";
        echo "NAGANO-3 統合ワークフローシステム テストスイート実行開始\n";
        echo str_repeat("=", 80) . "\n\n";
        
        $startTime = microtime(true);
        
        // テスト項目
        $tests = [
            'testWorkflowEngineHealth' => 'ワークフローエンジン ヘルスチェック',
            'testApprovalApiHealth' => '03_approval API ヘルスチェック',
            'testListingApiHealth' => '08_listing API ヘルスチェック',
            'testDatabaseConnection' => 'データベース接続テスト',
            'testApprovalWorkflowIntegration' => '03_approval ワークフロー統合テスト',
            'testListingWorkflowIntegration' => '08_listing ワークフロー統合テスト',
            'testFullApprovalFlow' => '完全承認フロー統合テスト',
            'testErrorHandling' => 'エラーハンドリングテスト',
            'testProgressTracking' => '進捗追跡テスト'
        ];
        
        foreach ($tests as $method => $description) {
            echo "[テスト実行] {$description}\n";
            try {
                $result = $this->$method();
                $this->testResults[$method] = $result;
                echo $result['success'] ? "✅ PASS: " : "❌ FAIL: ";
                echo $result['message'] . "\n\n";
            } catch (Exception $e) {
                $this->testResults[$method] = [
                    'success' => false, 
                    'message' => 'テスト実行エラー: ' . $e->getMessage()
                ];
                echo "❌ ERROR: テスト実行エラー: " . $e->getMessage() . "\n\n";
            }
        }
        
        $executionTime = round((microtime(true) - $startTime) * 1000);
        
        // 結果サマリー
        $this->displayTestSummary($executionTime);
        
        return $this->testResults;
    }
    
    /**
     * ワークフローエンジン ヘルスチェック
     */
    private function testWorkflowEngineHealth() {
        $url = $this->baseUrl . '/workflow_engine/integrated_workflow_engine.php?action=health_check';
        $response = $this->makeRequest($url, 'GET');
        
        if (!$response) {
            return [
                'success' => false,
                'message' => 'ワークフローエンジンに接続できません'
            ];
        }
        
        if ($response['success']) {
            return [
                'success' => true,
                'message' => 'ワークフローエンジンが正常に動作しています'
            ];
        }
        
        return [
            'success' => false,
            'message' => 'ワークフローエンジンのヘルスチェックに失敗: ' . ($response['message'] ?? '不明なエラー')
        ];
    }
    
    /**
     * 03_approval API ヘルスチェック
     */
    private function testApprovalApiHealth() {
        $url = $this->baseUrl . '/03_approval/approval.php?action=health_check';
        $response = $this->makeRequest($url, 'GET');
        
        if (!$response) {
            return [
                'success' => false,
                'message' => '03_approval APIに接続できません'
            ];
        }
        
        if ($response['success']) {
            return [
                'success' => true,
                'message' => '03_approval APIが正常に動作しています (統合モーダル対応)'
            ];
        }
        
        return [
            'success' => false,
            'message' => '03_approval APIのヘルスチェックに失敗: ' . ($response['message'] ?? '不明なエラー')
        ];
    }
    
    /**
     * 08_listing API ヘルスチェック
     */
    private function testListingApiHealth() {
        // 08_listingは直接的なヘルスチェックがないため、基本的な接続確認
        $url = $this->baseUrl . '/08_listing/listing.php';
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_NOBODY, true); // HEAD リクエスト
        
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            return [
                'success' => true,
                'message' => '08_listing APIが正常にアクセス可能です'
            ];
        }
        
        return [
            'success' => false,
            'message' => "08_listing APIへのアクセスに失敗 (HTTP: {$httpCode})"
        ];
    }
    
    /**
     * データベース接続テスト
     */
    private function testDatabaseConnection() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // 基本的なクエリ実行
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM yahoo_scraped_products");
            $result = $stmt->fetch();
            
            return [
                'success' => true,
                'message' => "データベース接続成功 (商品データ: {$result['count']}件)"
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'データベース接続エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 03_approval ワークフロー統合テスト
     */
    private function testApprovalWorkflowIntegration() {
        if (empty($this->testProductIds)) {
            return [
                'success' => false,
                'message' => 'テスト用商品データが見つかりません'
            ];
        }
        
        $url = $this->baseUrl . '/03_approval/api/workflow_integration.php';
        $data = [
            'action' => 'process_workflow_approval',
            'workflow_id' => 9999, // テスト用ID
            'product_ids' => array_slice($this->testProductIds, 0, 2), // 最初の2件
            'approved_by' => 'test_system'
        ];
        
        $response = $this->makeRequest($url, 'POST', $data);
        
        if (!$response) {
            return [
                'success' => false,
                'message' => '03_approval ワークフロー統合APIに接続できません'
            ];
        }
        
        if ($response['success']) {
            return [
                'success' => true,
                'message' => '03_approval ワークフロー統合が正常に動作しました'
            ];
        }
        
        return [
            'success' => false,
            'message' => '03_approval ワークフロー統合テストに失敗: ' . ($response['message'] ?? '不明なエラー')
        ];
    }
    
    /**
     * 08_listing ワークフロー統合テスト
     */
    private function testListingWorkflowIntegration() {
        $url = $this->baseUrl . '/08_listing/api/workflow_integration.php';
        
        // テスト用の承認済み商品データ
        $testProductData = [
            [
                'product_id' => 9999,
                'item_id' => 'test_item_001',
                'title' => 'テスト商品 - 統合テスト用',
                'price' => 1500,
                'image_url' => 'https://via.placeholder.com/300x300?text=Test',
                'description' => 'これは統合テスト用のダミー商品です。',
                'category' => 'テスト',
                'condition' => '新品',
                'yahoo_data' => []
            ]
        ];
        
        $data = [
            'action' => 'process_workflow_listing',
            'workflow_id' => 9999,
            'approved_products' => $testProductData,
            'settings' => [
                'marketplace' => 'ebay',
                'test_mode' => true, // テストモード
                'batch_size' => 1
            ]
        ];
        
        $response = $this->makeRequest($url, 'POST', $data);
        
        if (!$response) {
            return [
                'success' => false,
                'message' => '08_listing ワークフロー統合APIに接続できません'
            ];
        }
        
        if ($response['success']) {
            return [
                'success' => true,
                'message' => '08_listing ワークフロー統合が正常に動作しました (テストモード)'
            ];
        }
        
        return [
            'success' => false,
            'message' => '08_listing ワークフロー統合テストに失敗: ' . ($response['message'] ?? '不明なエラー')
        ];
    }
    
    /**
     * 完全承認フロー統合テスト
     */
    private function testFullApprovalFlow() {
        if (empty($this->testProductIds)) {
            return [
                'success' => false,
                'message' => 'テスト用商品データが見つかりません'
            ];
        }
        
        $url = $this->baseUrl . '/workflow_engine/integrated_workflow_engine.php';
        $data = [
            'action' => 'execute_approval_flow',
            'product_ids' => array_slice($this->testProductIds, 0, 1), // 1件のみテスト
            'approved_by' => 'integration_test'
        ];
        
        $response = $this->makeRequest($url, 'POST', $data);
        
        if (!$response) {
            return [
                'success' => false,
                'message' => 'ワークフローエンジンの完全統合APIに接続できません'
            ];
        }
        
        if ($response['success']) {
            return [
                'success' => true,
                'message' => '完全承認フロー統合テストが成功: ' . ($response['message'] ?? '')
            ];
        }
        
        return [
            'success' => false,
            'message' => '完全承認フロー統合テストに失敗: ' . ($response['message'] ?? '不明なエラー')
        ];
    }
    
    /**
     * エラーハンドリングテスト
     */
    private function testErrorHandling() {
        // 無効なワークフローID で再試行テスト
        $url = $this->baseUrl . '/workflow_engine/integrated_workflow_engine.php';
        $data = [
            'action' => 'retry_workflow',
            'workflow_id' => 99999 // 存在しないID
        ];
        
        $response = $this->makeRequest($url, 'POST', $data);
        
        if (!$response) {
            return [
                'success' => false,
                'message' => 'エラーハンドリングテスト用APIに接続できません'
            ];
        }
        
        // エラーが適切に処理され、意味のあるメッセージが返されることを確認
        if (!$response['success'] && strpos($response['message'], 'ワークフローが見つかりません') !== false) {
            return [
                'success' => true,
                'message' => 'エラーハンドリングが適切に動作しています'
            ];
        }
        
        return [
            'success' => false,
            'message' => 'エラーハンドリングが期待通りに動作していません'
        ];
    }
    
    /**
     * 進捗追跡テスト
     */
    private function testProgressTracking() {
        $url = $this->baseUrl . '/workflow_engine/integrated_workflow_engine.php?action=get_active_workflows';
        $response = $this->makeRequest($url, 'GET');
        
        if (!$response) {
            return [
                'success' => false,
                'message' => '進捗追跡APIに接続できません'
            ];
        }
        
        if ($response['success']) {
            $workflowCount = $response['count'] ?? 0;
            return [
                'success' => true,
                'message' => "進捗追跡が正常に動作しています (アクティブワークフロー: {$workflowCount}件)"
            ];
        }
        
        return [
            'success' => false,
            'message' => '進捗追跡テストに失敗: ' . ($response['message'] ?? '不明なエラー')
        ];
    }
    
    /**
     * テスト用データ準備
     */
    private function prepareTestData() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // テスト用商品IDを取得（最新の5件）
            $stmt = $pdo->query("
                SELECT id 
                FROM yahoo_scraped_products 
                WHERE scraped_yahoo_data IS NOT NULL 
                ORDER BY created_at DESC 
                LIMIT 5
            ");
            
            $this->testProductIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
        } catch (PDOException $e) {
            echo "⚠️ 警告: テスト用データの準備に失敗しました: " . $e->getMessage() . "\n";
            $this->testProductIds = [];
        }
    }
    
    /**
     * HTTP リクエスト実行
     */
    private function makeRequest($url, $method = 'GET', $data = null, $timeout = 30) {
        $ch = curl_init();
        
        $defaultOptions = [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_USERAGENT => 'NAGANO-3 Integration Test Suite'
        ];
        
        if ($method === 'POST' && $data) {
            $defaultOptions[CURLOPT_POST] = true;
            $defaultOptions[CURLOPT_POSTFIELDS] = json_encode($data);
            $defaultOptions[CURLOPT_HTTPHEADER] = ['Content-Type: application/json'];
        }
        
        curl_setopt_array($ch, $defaultOptions);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            echo "⚠️ cURL エラー: {$error}\n";
            return null;
        }
        
        if ($httpCode !== 200) {
            echo "⚠️ HTTP エラー: {$httpCode}\n";
            return null;
        }
        
        $result = json_decode($response, true);
        if (!$result) {
            echo "⚠️ JSON パースエラー: " . substr($response, 0, 200) . "...\n";
            return null;
        }
        
        return $result;
    }
    
    /**
     * テスト結果サマリー表示
     */
    private function displayTestSummary($executionTime) {
        echo str_repeat("=", 80) . "\n";
        echo "テスト結果サマリー\n";
        echo str_repeat("=", 80) . "\n";
        
        $totalTests = count($this->testResults);
        $passedTests = 0;
        $failedTests = 0;
        
        foreach ($this->testResults as $test => $result) {
            if ($result['success']) {
                $passedTests++;
            } else {
                $failedTests++;
            }
        }
        
        echo "総テスト数: {$totalTests}\n";
        echo "成功: {$passedTests} (✅)\n";
        echo "失敗: {$failedTests} (❌)\n";
        echo "実行時間: {$executionTime}ms\n";
        echo "成功率: " . round(($passedTests / $totalTests) * 100, 1) . "%\n\n";
        
        // 失敗したテストの詳細
        if ($failedTests > 0) {
            echo "失敗したテスト:\n";
            echo str_repeat("-", 40) . "\n";
            foreach ($this->testResults as $test => $result) {
                if (!$result['success']) {
                    echo "❌ {$test}: {$result['message']}\n";
                }
            }
            echo "\n";
        }
        
        // 統合状況判定
        if ($passedTests >= $totalTests * 0.8) { // 80%以上成功
            echo "🎉 統合テスト全体評価: PASS - システム統合が正常に完了しています\n";
        } elseif ($passedTests >= $totalTests * 0.6) { // 60%以上成功
            echo "⚠️ 統合テスト全体評価: WARNING - 一部の機能に問題があります\n";
        } else {
            echo "💥 統合テスト全体評価: FAIL - システム統合に重大な問題があります\n";
        }
        
        echo str_repeat("=", 80) . "\n\n";
    }
}

// テスト実行（CLIから直接実行された場合）
if (php_sapi_name() === 'cli') {
    $tester = new IntegratedWorkflowTest();
    $results = $tester->runAllTests();
    
    // 終了コード設定
    $exitCode = 0;
    foreach ($results as $result) {
        if (!$result['success']) {
            $exitCode = 1;
            break;
        }
    }
    
    exit($exitCode);
}

// Web実行用（ブラウザから実行された場合）
if (isset($_GET['run_tests'])) {
    header('Content-Type: text/plain; charset=utf-8');
    
    $tester = new IntegratedWorkflowTest();
    $results = $tester->runAllTests();
    
    exit;
}
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>統合ワークフローシステム テストランナー</title>
    <style>
        body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 40px; background: #f5f6fa; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; }
        .test-button { background: #27ae60; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; width: 100%; margin-bottom: 20px; }
        .test-button:hover { background: #229954; }
        .info { background: #e8f4f8; padding: 20px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #3498db; }
        .status { text-align: center; margin-top: 20px; font-size: 18px; }
        pre { background: #2c3e50; color: #ecf0f1; padding: 20px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 統合ワークフローシステム テストランナー</h1>
        
        <div class="info">
            <h3>テスト対象システム:</h3>
            <ul>
                <li>03_approval → 08_listing 自動連携</li>
                <li>統合ワークフローエンジン</li>
                <li>各API の正常性</li>
                <li>エラー処理・復旧機能</li>
                <li>データベース整合性</li>
            </ul>
        </div>
        
        <button class="test-button" onclick="runTests()">
            🚀 統合テスト実行
        </button>
        
        <div id="testResults"></div>
    </div>

    <script>
        async function runTests() {
            const button = document.querySelector('.test-button');
            const resultsDiv = document.getElementById('testResults');
            
            button.disabled = true;
            button.textContent = '🔄 テスト実行中...';
            
            resultsDiv.innerHTML = '<div class="status">テスト実行中...</div>';
            
            try {
                const response = await fetch('?run_tests=1');
                const results = await response.text();
                
                resultsDiv.innerHTML = '<pre>' + results + '</pre>';
            } catch (error) {
                resultsDiv.innerHTML = '<div class="status" style="color: red;">エラー: ' + error.message + '</div>';
            } finally {
                button.disabled = false;
                button.textContent = '🚀 統合テスト実行';
            }
        }
    </script>
</body>
</html>