<?php
/**
 * ダッシュボード問題調査スクリプト
 * くるくる回る問題の原因を特定します
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>🔍 ダッシュボード問題調査</h1>";
echo "<div style='background: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 10px 0;'>";
echo "<strong>問題:</strong> ダッシュボードがくるくる回って表示されない<br>";
echo "<strong>調査対象:</strong> API接続、データ取得、JavaScript エラー";
echo "</div>";

$baseUrl = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']);

// ステップ1: 基本的なファイル存在確認
echo "<h2>1. ファイル存在確認</h2>";

$requiredFiles = [
    'dashboard_v2_8080.html' => 'メインダッシュボード',
    'integrated_workflow_engine_8080.php' => 'ワークフローエンジン',
    'server_sent_events_8080.php' => 'SSEストリーム'
];

foreach ($requiredFiles as $file => $description) {
    $fullPath = __DIR__ . '/' . $file;
    if (file_exists($fullPath)) {
        echo "<p>✅ $description ($file): 存在</p>";
    } else {
        echo "<p>❌ $description ($file): <strong>存在しません</strong></p>";
    }
}

// ステップ2: API直接テスト
echo "<h2>2. API直接テスト</h2>";

// 2.1 ワークフローエンジンテスト
echo "<h3>2.1 ワークフローエンジン</h3>";
$engineUrl = $baseUrl . '/integrated_workflow_engine_8080.php?action=health_check';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $engineUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_VERBOSE, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "<p><strong>URL:</strong> <code>$engineUrl</code></p>";
echo "<p><strong>HTTP Code:</strong> $httpCode</p>";

if ($error) {
    echo "<p><strong>cURL Error:</strong> $error</p>";
} else {
    echo "<p><strong>Response:</strong></p>";
    echo "<pre style='background: #f5f5f5; padding: 10px; border-radius: 5px;'>" . htmlspecialchars($response) . "</pre>";
}

// 2.2 アクティブワークフロー取得テスト
echo "<h3>2.2 アクティブワークフロー取得</h3>";
$workflowUrl = $baseUrl . '/integrated_workflow_engine_8080.php?action=get_active_workflows';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $workflowUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "<p><strong>URL:</strong> <code>$workflowUrl</code></p>";
echo "<p><strong>HTTP Code:</strong> $httpCode</p>";

if ($error) {
    echo "<p><strong>cURL Error:</strong> $error</p>";
} else {
    echo "<p><strong>Response:</strong></p>";
    echo "<pre style='background: #f5f5f5; padding: 10px; border-radius: 5px;'>" . htmlspecialchars($response) . "</pre>";
    
    // JSON解析確認
    $jsonData = json_decode($response, true);
    if ($jsonData) {
        echo "<p>✅ JSON解析成功</p>";
        if (isset($jsonData['success']) && $jsonData['success']) {
            echo "<p>✅ API正常応答: " . ($jsonData['count'] ?? 0) . "件のワークフロー</p>";
        } else {
            echo "<p>❌ API失敗応答: " . ($jsonData['message'] ?? '不明') . "</p>";
        }
    } else {
        echo "<p>❌ JSON解析失敗</p>";
    }
}

// 2.3 SSEテスト
echo "<h3>2.3 Server-Sent Events テスト</h3>";
$sseUrl = $baseUrl . '/server_sent_events_8080.php?action=test';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $sseUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "<p><strong>URL:</strong> <code>$sseUrl</code></p>";
echo "<p><strong>HTTP Code:</strong> $httpCode</p>";

if ($error) {
    echo "<p><strong>cURL Error:</strong> $error</p>";
} else {
    echo "<p><strong>Response:</strong></p>";
    echo "<pre style='background: #f5f5f5; padding: 10px; border-radius: 5px;'>" . htmlspecialchars($response) . "</pre>";
}

// ステップ3: データベース接続確認
echo "<h2>3. データベース接続・データ確認</h2>";

try {
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres";
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<p>✅ データベース接続成功</p>";
    
    // ワークフロー数確認
    $stmt = $pdo->query("SELECT COUNT(*) FROM workflows");
    $workflowCount = $stmt->fetchColumn();
    
    echo "<p>ワークフロー総数: <strong>$workflowCount</strong>件</p>";
    
    if ($workflowCount > 0) {
        // 最新のワークフロー数件を表示
        $stmt = $pdo->query("
            SELECT id, yahoo_auction_id, status, current_step, created_at 
            FROM workflows 
            ORDER BY created_at DESC 
            LIMIT 5
        ");
        $workflows = $stmt->fetchAll();
        
        echo "<h4>最新ワークフロー（最大5件）:</h4>";
        echo "<table border='1' cellpadding='8' cellspacing='0' style='border-collapse: collapse;'>";
        echo "<tr><th>ID</th><th>Yahoo ID</th><th>Status</th><th>Step</th><th>Created</th></tr>";
        
        foreach ($workflows as $wf) {
            echo "<tr>";
            echo "<td>" . $wf['id'] . "</td>";
            echo "<td>" . htmlspecialchars($wf['yahoo_auction_id']) . "</td>";
            echo "<td>" . htmlspecialchars($wf['status']) . "</td>";
            echo "<td>" . $wf['current_step'] . "</td>";
            echo "<td>" . $wf['created_at'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p>⚠️ ワークフローデータが存在しません</p>";
    }
    
    // 商品データ確認
    $stmt = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products");
    $productCount = $stmt->fetchColumn();
    echo "<p>商品データ総数: <strong>$productCount</strong>件</p>";
    
} catch (Exception $e) {
    echo "<p>❌ データベース接続エラー: " . $e->getMessage() . "</p>";
}

// ステップ4: JavaScript 問題の可能性確認
echo "<h2>4. JavaScript動作確認用の簡易テスト</h2>";

echo "<div style='background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 10px 0;'>";
echo "<p><strong>JavaScriptテスト:</strong></p>";
echo "<button onclick=\"testAPI()\">API接続テスト実行</button>";
echo "<div id='testResult' style='margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px;'>";
echo "ボタンをクリックしてAPIテストを実行してください";
echo "</div>";
echo "</div>";

echo "<script>";
echo "async function testAPI() {";
echo "    const resultDiv = document.getElementById('testResult');";
echo "    resultDiv.innerHTML = '🔄 テスト実行中...';";
echo "    ";
echo "    try {";
echo "        // ワークフローエンジンテスト";
echo "        const response = await fetch('integrated_workflow_engine_8080.php?action=health_check');";
echo "        ";
echo "        if (!response.ok) {";
echo "            throw new Error(`HTTP ${response.status}: ${response.statusText}`);";
echo "        }";
echo "        ";
echo "        const data = await response.json();";
echo "        ";
echo "        if (data.success) {";
echo "            resultDiv.innerHTML = '✅ API接続成功: ' + data.message;";
echo "        } else {";
echo "            resultDiv.innerHTML = '❌ API失敗: ' + data.message;";
echo "        }";
echo "    } catch (error) {";
echo "        resultDiv.innerHTML = '❌ JavaScriptエラー: ' + error.message;";
echo "        console.error('API Test Error:', error);";
echo "    }";
echo "}";
echo "</script>";

// ステップ5: 解決方法の提案
echo "<h2>5. 問題解決の提案</h2>";

echo "<div style='background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 10px 0;'>";
echo "<h3>🔧 可能性のある問題と解決方法</h3>";
echo "<ol>";
echo "<li><strong>APIエンドポイント404エラー</strong>";
echo "<ul>";
echo "<li>ファイル名やパスが正しくない</li>";
echo "<li>解決: ファイル存在確認と正しいURL確認</li>";
echo "</ul>";
echo "</li>";

echo "<li><strong>データベースにデータがない</strong>";
echo "<ul>";
echo "<li>テストデータが作成されていない</li>";
echo "<li>解決: create_test_data_fixed.php を再実行</li>";
echo "</ul>";
echo "</li>";

echo "<li><strong>CORS問題</strong>";
echo "<ul>";
echo "<li>ブラウザがAPIリクエストをブロック</li>";
echo "<li>解決: ブラウザの開発者ツールでConsoleエラー確認</li>";
echo "</ul>";
echo "</li>";

echo "<li><strong>JavaScript エラー</strong>";
echo "<ul>";
echo "<li>ダッシュボードのJavaScriptに構文エラーがある</li>";
echo "<li>解決: ブラウザの開発者ツールでエラー確認</li>";
echo "</ul>";
echo "</li>";
echo "</ol>";
echo "</div>";

// ステップ6: 次のアクション
echo "<h2>6. 推奨する次のアクション</h2>";

echo "<div style='background: #e8f5e8; padding: 15px; border-left: 4px solid #4caf50; margin: 10px 0;'>";
echo "<h3>🚀 段階的解決手順</h3>";
echo "<ol>";
echo "<li><strong>ブラウザの開発者ツールを開く</strong>";
echo "<ul><li>F12キーを押してConsoleタブを確認</li>";
echo "<li>JavaScriptエラーやネットワークエラーをチェック</li></ul>";
echo "</li>";

echo "<li><strong>APIを直接確認</strong>";
echo "<ul>";
echo "<li><a href='integrated_workflow_engine_8080.php?action=health_check' target='_blank'>ワークフローエンジン直接テスト</a></li>";
echo "<li><a href='integrated_workflow_engine_8080.php?action=get_active_workflows' target='_blank'>ワークフロー一覧取得テスト</a></li>";
echo "</ul>";
echo "</li>";

echo "<li><strong>サーバー再起動</strong>";
echo "<ul><li>8080サーバーを一度停止して再起動</li></ul>";
echo "</li>";

echo "<li><strong>簡易版ダッシュボード作成</strong>";
echo "<ul><li>問題を特定するための最小限のダッシュボードを作成</li></ul>";
echo "</li>";
echo "</ol>";
echo "</div>";

echo "<hr>";
echo "<p><strong>調査完了時刻:</strong> " . date('Y-m-d H:i:s') . "</p>";
echo "<p><strong>次のステップ:</strong> 上記の結果を確認して、問題箇所を特定してください</p>";
?>
