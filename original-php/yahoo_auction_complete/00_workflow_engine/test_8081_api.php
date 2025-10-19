<?php
/**
 * 8080ポート版 API動作確認テスト
 * 24ツールシステム統合ワークフローエンジン
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>🔧 8080ポート版 ワークフローエンジン動作確認テスト</h1>";
echo "<div style='background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 10px 0;'>";
echo "<strong>📍 8080ポート専用テスト</strong><br>";
echo "24ツールシステムと統合したワークフローエンジンをテストします";
echo "</div>";

$baseUrl = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']);
$tests = [];

// テスト1: ワークフローエンジン ヘルスチェック（8080版）
echo "<h2>1. ワークフローエンジン ヘルスチェック（8080版）</h2>";
$engineUrl = $baseUrl . '/integrated_workflow_engine_8080.php?action=health_check';
echo "<p>テスト URL: <code>$engineUrl</code></p>";

$response = @file_get_contents($engineUrl);
if ($response) {
    $result = json_decode($response, true);
    if ($result && $result['success']) {
        echo "<p>✅ 成功: " . $result['message'] . "</p>";
        if (isset($result['port'])) {
            echo "<p>ポート確認: " . $result['port'] . "</p>";
        }
        $tests['workflow_engine_8080'] = true;
    } else {
        echo "<p>❌ JSON解析エラー: " . htmlspecialchars($response) . "</p>";
        $tests['workflow_engine_8080'] = false;
    }
} else {
    echo "<p>❌ 接続エラー</p>";
    $tests['workflow_engine_8080'] = false;
}

// テスト2: Server-Sent Events（8080版）
echo "<h2>2. Server-Sent Events（8080版）</h2>";
$sseUrl = $baseUrl . '/server_sent_events_8080.php?action=test';
echo "<p>テスト URL: <code>$sseUrl</code></p>";

$context = stream_context_create([
    'http' => [
        'timeout' => 5
    ]
]);
$response = @file_get_contents($sseUrl, false, $context);
if ($response) {
    echo "<p>✅ SSE基本テスト成功</p>";
    echo "<p>レスポンス: <code>" . htmlspecialchars(trim($response)) . "</code></p>";
    $tests['sse_8080'] = true;
} else {
    echo "<p>❌ SSE接続エラー</p>";
    $tests['sse_8080'] = false;
}

// テスト3: アクティブワークフロー取得（8080版）
echo "<h2>3. アクティブワークフロー取得（8080版）</h2>";
$workflowsUrl = $baseUrl . '/integrated_workflow_engine_8080.php?action=get_active_workflows';
echo "<p>テスト URL: <code>$workflowsUrl</code></p>";

$response = @file_get_contents($workflowsUrl);
if ($response) {
    $result = json_decode($response, true);
    if ($result && $result['success']) {
        echo "<p>✅ ワークフロー取得成功: " . $result['count'] . "件</p>";
        if (!empty($result['data'])) {
            echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
            echo "<h4>取得されたワークフロー:</h4>";
            foreach (array_slice($result['data'], 0, 3) as $workflow) {
                echo "<p>ID: {$workflow['id']}, Status: {$workflow['status']}, Step: {$workflow['current_step']}</p>";
            }
            echo "</div>";
        }
        $tests['active_workflows_8080'] = true;
    } else {
        echo "<p>❌ ワークフロー取得エラー</p>";
        $tests['active_workflows_8080'] = false;
    }
} else {
    echo "<p>❌ 接続エラー</p>";
    $tests['active_workflows_8080'] = false;
}

// テスト4: 手動承認フロー実行テスト（8080版）
echo "<h2>4. 手動承認フロー実行テスト（8080版）</h2>";

// テスト用商品IDを取得
try {
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres"; 
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->query("SELECT id FROM yahoo_scraped_products LIMIT 2");
    $productIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (!empty($productIds)) {
        echo "<p>テスト用商品ID: " . implode(', ', $productIds) . "</p>";
        
        // POST データ準備
        $postData = json_encode([
            'action' => 'execute_approval_flow',
            'product_ids' => $productIds,
            'approved_by' => 'api_test_8080'
        ]);
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $postData,
                'timeout' => 10
            ]
        ]);
        
        $approvalUrl = $baseUrl . '/integrated_workflow_engine_8080.php';
        $response = @file_get_contents($approvalUrl, false, $context);
        
        if ($response) {
            $result = json_decode($response, true);
            echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
            echo "<pre>" . json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
            echo "</div>";
            $tests['manual_approval_8080'] = ($result && isset($result['success']));
        } else {
            echo "<p>❌ 承認フローテストエラー</p>";
            $tests['manual_approval_8080'] = false;
        }
    } else {
        echo "<p>⚠️ テスト用商品データが見つかりません</p>";
        $tests['manual_approval_8080'] = false;
    }
    
} catch (Exception $e) {
    echo "<p>❌ データベースエラー: " . $e->getMessage() . "</p>";
    $tests['manual_approval_8080'] = false;
}

// テスト5: ダッシュボードファイル確認
echo "<h2>5. ダッシュボードファイル確認</h2>";

$dashboardFile = __DIR__ . '/dashboard_v2_8080.html';
if (file_exists($dashboardFile)) {
    echo "<p>✅ ダッシュボードファイル: 存在</p>";
    echo "<p>URL: <code>$baseUrl/dashboard_v2_8080.html</code></p>";
    $tests['dashboard_file_8080'] = true;
} else {
    echo "<p>❌ ダッシュボードファイル: 存在しません</p>";
    $tests['dashboard_file_8080'] = false;
}

// 結果サマリー
echo "<h2>📊 テスト結果サマリー</h2>";

$successCount = array_sum($tests);
$totalCount = count($tests);
$successRate = round(($successCount / $totalCount) * 100);

echo "<table border='1' cellpadding='10' cellspacing='0' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>テスト項目</th><th>結果</th></tr>";

$testLabels = [
    'workflow_engine_8080' => 'ワークフローエンジン（8080版）',
    'sse_8080' => 'Server-Sent Events（8080版）',
    'active_workflows_8080' => 'アクティブワークフロー取得（8080版）',
    'manual_approval_8080' => '手動承認フロー（8080版）',
    'dashboard_file_8080' => 'ダッシュボードファイル（8080版）'
];

foreach ($tests as $test => $result) {
    $status = $result ? '✅ 成功' : '❌ 失敗';
    $color = $result ? 'color: green;' : 'color: red;';
    $label = $testLabels[$test] ?? $test;
    echo "<tr><td>$label</td><td style='$color'>$status</td></tr>";
}

echo "</table>";

echo "<div style='margin: 20px 0; padding: 20px; border-radius: 10px; " . 
     ($successRate >= 80 ? 'background: #d4edda; border: 1px solid #c3e6cb;' : 'background: #f8d7da; border: 1px solid #f5c6cb;') . "'>";
echo "<h3>総合結果（8080ポート版）</h3>";
echo "<p><strong>成功率: $successRate% ($successCount/$totalCount)</strong></p>";

if ($successRate >= 80) {
    echo "<p>✅ <strong>8080版API修正成功！</strong> ダッシュボードが正常に動作するはずです。</p>";
    echo "<p>次のステップ:</p>";
    echo "<ul>";
    echo "<li><a href='dashboard_v2_8080.html' target='_blank'>ダッシュボード v2.0（8080版）を開く</a></li>";
    echo "<li><a href='/yahoo_auction_complete_24tools.html' target='_blank'>24ツール統合システムを開く</a></li>";
    echo "</ul>";
} elseif ($successRate >= 60) {
    echo "<p>⚠️ <strong>部分的に成功</strong> いくつかの機能に問題があります。</p>";
} else {
    echo "<p>❌ <strong>大きな問題があります</strong> APIエンドポイントの修正が必要です。</p>";
}

echo "</div>";

// デバッグ情報
echo "<h2>🔧 デバッグ情報</h2>";
echo "<p><strong>ベースURL:</strong> $baseUrl</p>";
echo "<p><strong>現在のディレクトリ:</strong> " . __DIR__ . "</p>";
echo "<p><strong>ドキュメントルート:</strong> " . $_SERVER['DOCUMENT_ROOT'] . "</p>";
echo "<p><strong>サーバー時刻:</strong> " . date('Y-m-d H:i:s') . "</p>";
echo "<p><strong>対象ポート:</strong> 8080</p>";

// 次の手順案内
echo "<h2>🚀 次の手順</h2>";
echo "<div style='background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 10px 0;'>";
echo "<ol>";
echo "<li><strong>8080サーバー起動確認:</strong><br>";
echo "<code>cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete<br>";
echo "php -S localhost:8080</code></li>";
echo "<li><strong>ダッシュボード確認:</strong><br>";
echo "<code>http://localhost:8080/new_structure/workflow_engine/dashboard_v2_8080.html</code></li>";
echo "<li><strong>24ツール統合確認:</strong><br>";
echo "<code>http://localhost:8080/yahoo_auction_complete_24tools.html</code></li>";
echo "</ol>";
echo "</div>";
?>
