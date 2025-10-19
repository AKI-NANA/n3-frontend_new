<?php
/**
 * NAGANO-3統合システム診断スクリプト
 * システム状況を包括的に確認します
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>🔍 NAGANO-3統合システム診断レポート</h1>";
echo "<p>実行時刻: " . date('Y-m-d H:i:s') . "</p>";

$diagnostics = [];

// 1. PHPサーバー状況
echo "<h2>1. PHPサーバー状況</h2>";
echo "<p>✅ PHPサーバーは動作しています (このページが表示されているため)</p>";
echo "<p>PHP Version: " . phpversion() . "</p>";
$diagnostics['php_server'] = 'OK';

// 2. データベース接続確認
echo "<h2>2. データベース接続確認</h2>";
try {
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres"; 
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<p>✅ PostgreSQLデータベース接続: 正常</p>";
    
    // テーブル存在確認
    $tables = ['workflows', 'yahoo_scraped_products'];
    foreach ($tables as $table) {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?");
        $stmt->execute([$table]);
        $exists = $stmt->fetchColumn() > 0;
        
        if ($exists) {
            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM $table");
            $countStmt->execute();
            $count = $countStmt->fetchColumn();
            echo "<p>✅ テーブル '$table': 存在 (レコード数: $count)</p>";
        } else {
            echo "<p>❌ テーブル '$table': 存在しません</p>";
        }
    }
    
    $diagnostics['database'] = 'OK';
    
} catch (Exception $e) {
    echo "<p>❌ データベース接続エラー: " . $e->getMessage() . "</p>";
    echo "<p>📝 解決方法: PostgreSQLサーバーが起動していることを確認してください</p>";
    $diagnostics['database'] = 'ERROR: ' . $e->getMessage();
}

// 3. Redis接続確認
echo "<h2>3. Redis接続確認</h2>";
try {
    if (class_exists('Redis')) {
        $redis = new Redis();
        $redis->connect('127.0.0.1', 6379);
        $redis->ping();
        echo "<p>✅ Redis接続: 正常</p>";
        
        // Redis統計
        $info = $redis->info();
        echo "<p>Redis メモリ使用量: " . ($info['used_memory_human'] ?? 'N/A') . "</p>";
        
        $diagnostics['redis'] = 'OK';
    } else {
        echo "<p>⚠️ Redis PHP拡張がインストールされていません</p>";
        echo "<p>📝 フォールバックモードで動作します</p>";
        $diagnostics['redis'] = 'NOT_INSTALLED';
    }
} catch (Exception $e) {
    echo "<p>⚠️ Redis接続エラー (フォールバックモードで動作): " . $e->getMessage() . "</p>";
    $diagnostics['redis'] = 'FALLBACK: ' . $e->getMessage();
}

// 4. ワークフローエンジンAPI確認
echo "<h2>4. ワークフローエンジンAPI確認</h2>";
$currentUrl = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']);
$engineUrl = $currentUrl . '/integrated_workflow_engine.php?action=health_check';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $engineUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $result = json_decode($response, true);
    if ($result && $result['success']) {
        echo "<p>✅ ワークフローエンジンAPI: 正常</p>";
        echo "<p>レスポンス: " . $result['message'] . "</p>";
        $diagnostics['workflow_api'] = 'OK';
    } else {
        echo "<p>❌ ワークフローエンジンAPI: JSON解析エラー</p>";
        echo "<p>レスポンス: " . htmlspecialchars($response) . "</p>";
        $diagnostics['workflow_api'] = 'JSON_ERROR';
    }
} else {
    echo "<p>❌ ワークフローエンジンAPI: HTTP $httpCode エラー</p>";
    echo "<p>URL: $engineUrl</p>";
    $diagnostics['workflow_api'] = "HTTP_ERROR: $httpCode";
}

// 5. Server-Sent Events確認
echo "<h2>5. Server-Sent Events確認</h2>";
$sseUrl = $currentUrl . '/server_sent_events.php';
if (file_exists(__DIR__ . '/server_sent_events.php')) {
    echo "<p>✅ SSEファイル: 存在</p>";
    echo "<p>URL: $sseUrl</p>";
    $diagnostics['sse_file'] = 'OK';
} else {
    echo "<p>❌ SSEファイル: 存在しません</p>";
    $diagnostics['sse_file'] = 'NOT_FOUND';
}

// 6. ダッシュボード関連ファイル確認
echo "<h2>6. ダッシュボード関連ファイル確認</h2>";
$requiredFiles = [
    'dashboard_v2.html' => 'メインダッシュボード',
    'redis_queue_manager.php' => 'Redisキューマネージャー',
    'server_sent_events.php' => 'リアルタイムイベント',
    'integrated_workflow_engine.php' => '統合ワークフローエンジン'
];

foreach ($requiredFiles as $file => $description) {
    if (file_exists(__DIR__ . '/' . $file)) {
        echo "<p>✅ $description ($file): 存在</p>";
    } else {
        echo "<p>❌ $description ($file): 存在しません</p>";
    }
}

// 7. 解決方法の提示
echo "<h2>🛠️ 解決方法</h2>";

if ($diagnostics['database'] !== 'OK') {
    echo "<div style='background: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 10px 0;'>";
    echo "<h3>データベース設定</h3>";
    echo "<p>PostgreSQLを起動してください:</p>";
    echo "<pre>brew services start postgresql</pre>";
    echo "<p>または設定を確認してください</p>";
    echo "</div>";
}

if (strpos($diagnostics['workflow_api'], 'ERROR') !== false) {
    echo "<div style='background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 10px 0;'>";
    echo "<h3>API設定</h3>";
    echo "<p>ワークフローエンジンAPIが応答していません。ファイルの権限やPHPエラーを確認してください</p>";
    echo "</div>";
}

// 8. 正常な場合の次のステップ
if ($diagnostics['php_server'] === 'OK' && $diagnostics['database'] === 'OK') {
    echo "<div style='background: #e8f5e8; padding: 15px; border-left: 4px solid #4caf50; margin: 10px 0;'>";
    echo "<h3>✅ システム基盤は正常です</h3>";
    echo "<p>以下のURLでダッシュボードにアクセスできます:</p>";
    echo "<ul>";
    echo "<li><strong>メインダッシュボード v2.0</strong><br><a href='dashboard_v2.html' target='_blank'>$currentUrl/dashboard_v2.html</a></li>";
    echo "<li><strong>統合テスト</strong><br><a href='test_integration.php' target='_blank'>$currentUrl/test_integration.php</a></li>";
    echo "</ul>";
    echo "</div>";
}

// 9. 診断結果サマリー
echo "<h2>📊 診断結果サマリー</h2>";
echo "<table border='1' cellpadding='10' cellspacing='0' style='width: 100%; border-collapse: collapse;'>";
echo "<tr><th>項目</th><th>状況</th></tr>";
foreach ($diagnostics as $item => $status) {
    $statusClass = (strpos($status, 'ERROR') !== false) ? 'color: red;' : 'color: green;';
    echo "<tr><td>$item</td><td style='$statusClass'>$status</td></tr>";
}
echo "</table>";

// 10. システム情報
echo "<h2>ℹ️ システム情報</h2>";
echo "<p>OS: " . php_uname() . "</p>";
echo "<p>PHP: " . phpversion() . "</p>";
echo "<p>Current Directory: " . __DIR__ . "</p>";
echo "<p>Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "</p>";
echo "<p>HTTP Host: " . $_SERVER['HTTP_HOST'] . "</p>";

echo "<hr>";
echo "<p><strong>次のステップ:</strong> 問題が解決されたら、<a href='dashboard_v2.html'>ダッシュボード v2.0</a>にアクセスしてください</p>";
?>
