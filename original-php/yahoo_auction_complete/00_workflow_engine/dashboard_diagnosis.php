<?php
/**
 * ダッシュボード問題診断スクリプト
 * くるくる回る問題の原因を特定します
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<html><head><title>🔍 ダッシュボード問題診断</title>";
echo "<style>
body { font-family: Arial, sans-serif; margin: 20px; }
.success { color: green; }
.error { color: red; }
.warning { color: orange; }
.info-box { background: #f0f8ff; padding: 15px; border-left: 4px solid #3498db; margin: 10px 0; }
.error-box { background: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 10px 0; }
.success-box { background: #e8f5e8; padding: 15px; border-left: 4px solid #4caf50; margin: 10px 0; }
pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #f2f2f2; }
</style></head><body>";

echo "<h1>🔍 ダッシュボード問題診断</h1>";

$currentDir = __DIR__;
$baseUrl = 'http://' . $_SERVER['HTTP_HOST'];

echo "<div class='info-box'>";
echo "<strong>診断対象:</strong> NAGANO-3統合ワークフロー監視ダッシュボード<br>";
echo "<strong>問題:</strong> ダッシュボードがくるくる回って表示されない<br>";
echo "<strong>現在時刻:</strong> " . date('Y-m-d H:i:s');
echo "</div>";

// Step 1: ファイル存在確認
echo "<h2>1. 必須ファイル存在確認</h2>";

$requiredFiles = [
    'dashboard_v2.html' => 'メインダッシュボード',
    'integrated_workflow_engine_8080.php' => 'ワークフローエンジン (8080)',
    'server_sent_events_8080.php' => 'SSEストリーム (8080)',
    'redis_queue_manager_8080.php' => 'Redis Queue Manager (8080)'
];

$fileExistenceStatus = [];
foreach ($requiredFiles as $file => $description) {
    $fullPath = $currentDir . '/' . $file;
    $exists = file_exists($fullPath);
    $fileExistenceStatus[$file] = $exists;
    
    $status = $exists ? '✅' : '❌';
    $class = $exists ? 'success' : 'error';
    echo "<p class='$class'>$status $description ($file): " . ($exists ? '存在' : '<strong>存在しません</strong>') . "</p>";
    
    if (!$exists) {
        // 代替ファイル確認
        $alternativeFile = str_replace('_8080', '', $file);
        if (file_exists($currentDir . '/' . $alternativeFile)) {
            echo "<p class='warning'>&nbsp;&nbsp;📝 代替ファイルが存在: $alternativeFile</p>";
        }
    }
}

// Step 2: PHPサーバー動作確認
echo "<h2>2. PHPサーバー動作確認</h2>";

function testUrl($url, $description) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    return [
        'success' => ($httpCode >= 200 && $httpCode < 400),
        'http_code' => $httpCode,
        'error' => $error,
        'response' => $response
    ];
}

// 8080ポートテスト
$port8080Test = testUrl($baseUrl . ':8080/', '8080ポートテスト');
echo "<h3>8080ポート確認</h3>";
if ($port8080Test['success']) {
    echo "<p class='success'>✅ ポート8080: 正常 (HTTP {$port8080Test['http_code']})</p>";
} else {
    echo "<p class='error'>❌ ポート8080: エラー (HTTP {$port8080Test['http_code']}) - {$port8080Test['error']}</p>";
}

// 8080ポートテスト
$port8080Test = testUrl($baseUrl . ':8080/', '8080ポートテスト');
echo "<h3>8080ポート確認</h3>";
if ($port8080Test['success']) {
    echo "<p class='success'>✅ ポート8080: 正常 (HTTP {$port8080Test['http_code']})</p>";
} else {
    echo "<p class='error'>❌ ポート8080: エラー (HTTP {$port8080Test['http_code']}) - {$port8080Test['error']}</p>";
}

// Step 3: APIエンドポイント直接テスト
echo "<h2>3. APIエンドポイント直接テスト</h2>";

$apiEndpoints = [
    'workflow_8080' => $baseUrl . ':8080/modules/yahoo_auction_complete/new_structure/00_workflow_engine/integrated_workflow_engine_8080.php?action=health_check',
    'workflow_8080' => $baseUrl . ':8080/modules/yahoo_auction_complete/new_structure/00_workflow_engine/integrated_workflow_engine_8080.php?action=health_check',
    'sse_8080' => $baseUrl . ':8080/modules/yahoo_auction_complete/new_structure/00_workflow_engine/server_sent_events_8080.php?action=health_check',
    'sse_8080' => $baseUrl . ':8080/modules/yahoo_auction_complete/new_structure/00_workflow_engine/server_sent_events_8080.php?action=health_check'
];

foreach ($apiEndpoints as $name => $url) {
    echo "<h3>API: $name</h3>";
    echo "<p><strong>URL:</strong> <code>$url</code></p>";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    echo "<p><strong>HTTP Status:</strong> $httpCode</p>";
    
    if ($error) {
        echo "<p class='error'><strong>cURL Error:</strong> $error</p>";
    } elseif ($httpCode === 200) {
        echo "<p class='success'>✅ 接続成功</p>";
        
        // JSON解析テスト
        $jsonData = json_decode($response, true);
        if ($jsonData) {
            echo "<p class='success'>✅ JSON解析成功</p>";
            if (isset($jsonData['success']) && $jsonData['success']) {
                echo "<p class='success'>✅ API正常応答: " . ($jsonData['message'] ?? '成功') . "</p>";
            }
        } else {
            echo "<p class='warning'>⚠️ JSON解析失敗</p>";
        }
        
        echo "<details><summary>レスポンス詳細</summary>";
        echo "<pre>" . htmlspecialchars($response) . "</pre>";
        echo "</details>";
    } else {
        echo "<p class='error'>❌ 接続失敗 (HTTP $httpCode)</p>";
    }
    
    echo "<hr>";
}

// Step 4: データベース接続テスト
echo "<h2>4. データベース接続テスト</h2>";

try {
    $pdo = new PDO('postgresql:host=localhost;port=5432;dbname=nagano3_system', 'postgres', 'postgres123');
    echo "<p class='success'>✅ データベース接続成功</p>";
    
    // ワークフロー件数確認
    $stmt = $pdo->query("SELECT COUNT(*) FROM workflows");
    $workflowCount = $stmt->fetchColumn();
    echo "<p>📊 ワークフロー件数: <strong>$workflowCount</strong>件</p>";
    
    if ($workflowCount > 0) {
        $stmt = $pdo->query("SELECT id, yahoo_auction_id, status, current_step, created_at FROM workflows ORDER BY created_at DESC LIMIT 5");
        $workflows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<h4>最新ワークフロー5件:</h4>";
        echo "<table>";
        echo "<tr><th>ID</th><th>Yahoo ID</th><th>Status</th><th>Step</th><th>Created</th></tr>";
        foreach ($workflows as $wf) {
            echo "<tr>";
            echo "<td>" . $wf['id'] . "</td>";
            echo "<td>" . htmlspecialchars($wf['yahoo_auction_id']) . "</td>";
            echo "<td>" . htmlspecialchars($wf['status']) . "</td>";
            echo "<td>" . $wf['current_step'] . "/9</td>";
            echo "<td>" . $wf['created_at'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p class='warning'>⚠️ ワークフローデータが存在しません</p>";
    }
} catch (Exception $e) {
    echo "<p class='error'>❌ データベース接続エラー: " . $e->getMessage() . "</p>";
}

// Step 5: ブラウザJavaScript動作テスト
echo "<h2>5. ブラウザJavaScript動作テスト</h2>";

echo "<div class='info-box'>";
echo "<p><strong>JavaScriptテスト:</strong></p>";
echo "<button onclick=\"testDashboardAPI()\">ダッシュボードAPI接続テスト実行</button>";
echo "<div id='testResult' style='margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px;'>";
echo "ボタンをクリックしてAPIテストを実行してください";
echo "</div>";
echo "</div>";

// Step 6: 解決方法の提案
echo "<h2>6. 解決方法の提案</h2>";

// ファイル存在問題
$missingFiles = array_filter($fileExistenceStatus, function($exists) { return !$exists; });
if (!empty($missingFiles)) {
    echo "<div class='error-box'>";
    echo "<h3>❌ 重大問題: 必須ファイルが存在しません</h3>";
    echo "<p><strong>解決方法:</strong></p>";
    echo "<ol>";
    echo "<li>不足ファイルを作成するか、代替ファイルをリネームしてください</li>";
    echo "<li>ポート番号の統一（8080 or 8080）を確認してください</li>";
    echo "</ol>";
    echo "<p><strong>不足ファイル:</strong> " . implode(', ', array_keys($missingFiles)) . "</p>";
    echo "</div>";
}

// 全体的な解決策
echo "<div class='success-box'>";
echo "<h3>🚀 推奨解決手順</h3>";
echo "<ol>";
echo "<li><strong>ブラウザの開発者ツールを開く</strong>";
echo "<ul><li>F12キーを押してConsoleタブを確認</li>";
echo "<li>ネットワークタブで失敗しているAPIを確認</li></ul>";
echo "</li>";

echo "<li><strong>正しいURLでダッシュボードにアクセス</strong>";
echo "<ul>";
if ($port8080Test['success']) {
    echo "<li><a href='{$baseUrl}:8080/modules/yahoo_auction_complete/new_structure/00_workflow_engine/dashboard_v2.html' target='_blank'>8080ポート版ダッシュボード</a></li>";
}
if ($port8080Test['success']) {
    echo "<li><a href='{$baseUrl}:8080/modules/yahoo_auction_complete/new_structure/00_workflow_engine/dashboard_v2.html' target='_blank'>8080ポート版ダッシュボード</a></li>";
}
echo "</ul>";
echo "</li>";

echo "<li><strong>APIエンドポイントを直接確認</strong>";
echo "<ul>";
echo "<li>上記のAPIテスト結果で正常なエンドポイントを使用</li>";
echo "<li>ダッシュボードのJavaScriptでのURL設定を修正</li>";
echo "</ul>";
echo "</li>";

echo "<li><strong>テストデータの作成</strong>";
echo "<ul><li>create_test_data_fixed.php を実行してテストワークフローを作成</li></ul>";
echo "</li>";
echo "</ol>";
echo "</div>";

// JavaScript テスト関数
echo "<script>";
echo "async function testDashboardAPI() {";
echo "    const resultDiv = document.getElementById('testResult');";
echo "    resultDiv.innerHTML = '🔄 テスト実行中...';";
echo "    ";
echo "    const testUrls = [";
echo "        '{$baseUrl}:8080/modules/yahoo_auction_complete/new_structure/00_workflow_engine/integrated_workflow_engine_8080.php?action=health_check',";
echo "        '{$baseUrl}:8080/modules/yahoo_auction_complete/new_structure/00_workflow_engine/integrated_workflow_engine_8080.php?action=health_check'";
echo "    ];";
echo "    ";
echo "    let results = [];";
echo "    ";
echo "    for (const url of testUrls) {";
echo "        try {";
echo "            const response = await fetch(url, { method: 'GET' });";
echo "            const data = await response.json();";
echo "            ";
echo "            results.push({";
echo "                url: url,";
echo "                success: response.ok && data.success,";
echo "                status: response.status,";
echo "                message: data.message || 'Unknown'";
echo "            });";
echo "        } catch (error) {";
echo "            results.push({";
echo "                url: url,";
echo "                success: false,";
echo "                error: error.message";
echo "            });";
echo "        }";
echo "    }";
echo "    ";
echo "    let html = '<h4>JavaScript APIテスト結果:</h4>';";
echo "    results.forEach((result, index) => {";
echo "        const status = result.success ? '✅ 成功' : '❌ 失敗';";
echo "        const color = result.success ? 'green' : 'red';";
echo "        html += `<p style=\"color: ${color}\">${status} - ${result.url}</p>`;";
echo "        if (result.error) html += `<p style=\"color: red; margin-left: 20px;\">エラー: ${result.error}</p>`;";
echo "        if (result.message) html += `<p style=\"margin-left: 20px;\">応答: ${result.message}</p>`;";
echo "    });";
echo "    ";
echo "    const successfulUrl = results.find(r => r.success);";
echo "    if (successfulUrl) {";
echo "        html += '<div class=\"success-box\" style=\"background: #e8f5e8; padding: 10px; margin: 10px 0; border-left: 4px solid #4caf50;\">';";
echo "        html += '<h4>✅ 解決策発見!</h4>';";
echo "        html += '<p>正常に動作するAPIエンドポイントが見つかりました。</p>';";
echo "        html += '<p>ダッシュボードのJavaScriptでこのURLを使用してください:</p>';";
echo "        html += `<code>${successfulUrl.url.replace('?action=health_check', '')}</code>`;";
echo "        html += '</div>';";
echo "    } else {";
echo "        html += '<div class=\"error-box\" style=\"background: #ffebee; padding: 10px; margin: 10px 0; border-left: 4px solid #f44336;\">';";
echo "        html += '<h4>❌ 問題: 利用可能なAPIエンドポイントが見つかりません</h4>';";
echo "        html += '<p>PHPサーバーの起動またはAPIファイルの存在を確認してください。</p>';";
echo "        html += '</div>';";
echo "    }";
echo "    ";
echo "    resultDiv.innerHTML = html;";
echo "}";
echo "</script>";

echo "<hr>";
echo "<p><strong>診断完了時刻:</strong> " . date('Y-m-d H:i:s') . "</p>";
echo "</body></html>";
?>