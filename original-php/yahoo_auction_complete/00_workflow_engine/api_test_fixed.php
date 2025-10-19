<?php
/**
 * API修正後の動作確認テスト
 * ダッシュボードの動作に必要なAPIエンドポイントをテスト
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>🔧 API修正後の動作確認テスト</h1>";

$baseUrl = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']);
$tests = [];

// テスト1: ワークフローエンジン ヘルスチェック
echo "<h2>1. ワークフローエンジン ヘルスチェック</h2>";
$engineUrl = $baseUrl . '/integrated_workflow_engine.php?action=health_check';
echo "<p>テスト URL: <code>$engineUrl</code></p>";

$response = @file_get_contents($engineUrl);
if ($response) {
    $result = json_decode($response, true);
    if ($result && $result['success']) {
        echo "<p>✅ 成功: " . $result['message'] . "</p>";
        $tests['workflow_engine'] = true;
    } else {
        echo "<p>❌ JSON解析エラー: " . htmlspecialchars($response) . "</p>";
        $tests['workflow_engine'] = false;
    }
} else {
    echo "<p>❌ 接続エラー</p>";
    $tests['workflow_engine'] = false;
}

// テスト2: Redis Queue Manager
echo "<h2>2. Redis Queue Manager</h2>";
$queueUrl = $baseUrl . '/redis_queue_manager.php?action=health_check';
echo "<p>テスト URL: <code>$queueUrl</code></p>";

$response = @file_get_contents($queueUrl);
if ($response) {
    $result = json_decode($response, true);
    if ($result && $result['success']) {
        echo "<p>✅ 成功: " . $result['message'] . "</p>";
        if (isset($result['fallback_mode'])) {
            echo "<p>フォールバックモード: " . ($result['fallback_mode'] ? 'Yes' : 'No') . "</p>";
        }
        $tests['queue_manager'] = true;
    } else {
        echo "<p>❌ JSON解析エラー: " . htmlspecialchars($response) . "</p>";
        $tests['queue_manager'] = false;
    }
} else {
    echo "<p>❌ 接続エラー</p>";
    $tests['queue_manager'] = false;
}

// テスト3: キュー統計取得
echo "<h2>3. キュー統計取得</h2>";
$statsUrl = $baseUrl . '/redis_queue_manager.php?action=get_stats';
echo "<p>テスト URL: <code>$statsUrl</code></p>";

$response = @file_get_contents($statsUrl);
if ($response) {
    $result = json_decode($response, true);
    if ($result && $result['success']) {
        echo "<p>✅ 統計取得成功</p>";
        echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
        echo "<pre>" . json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
        echo "</div>";
        $tests['queue_stats'] = true;
    } else {
        echo "<p>❌ 統計取得エラー</p>";
        $tests['queue_stats'] = false;
    }
} else {
    echo "<p>❌ 接続エラー</p>";
    $tests['queue_stats'] = false;
}

// テスト4: アクティブワークフロー取得
echo "<h2>4. アクティブワークフロー取得</h2>";
$workflowsUrl = $baseUrl . '/integrated_workflow_engine.php?action=get_active_workflows';
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
        $tests['active_workflows'] = true;
    } else {
        echo "<p>❌ ワークフロー取得エラー</p>";
        $tests['active_workflows'] = false;
    }
} else {
    echo "<p>❌ 接続エラー</p>";
    $tests['active_workflows'] = false;
}

// テスト5: Server-Sent Events 基本テスト
echo "<h2>5. Server-Sent Events 基本テスト</h2>";
$sseUrl = $baseUrl . '/server_sent_events.php?action=test';
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
    $tests['sse_basic'] = true;
} else {
    echo "<p>❌ SSE接続エラー</p>";
    $tests['sse_basic'] = false;
}

// テスト6: 手動承認フロー実行テスト
echo "<h2>6. 手動承認フロー実行テスト</h2>";

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
            'approved_by' => 'api_test'
        ]);
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $postData,
                'timeout' => 10
            ]
        ]);
        
        $approvalUrl = $baseUrl . '/integrated_workflow_engine.php';
        $response = @file_get_contents($approvalUrl, false, $context);
        
        if ($response) {
            $result = json_decode($response, true);
            echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
            echo "<pre>" . json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
            echo "</div>";
            $tests['manual_approval'] = ($result && isset($result['success']));
        } else {
            echo "<p>❌ 承認フローテストエラー</p>";
            $tests['manual_approval'] = false;
        }
    } else {
        echo "<p>⚠️ テスト用商品データが見つかりません</p>";
        $tests['manual_approval'] = false;
    }
    
} catch (Exception $e) {
    echo "<p>❌ データベースエラー: " . $e->getMessage() . "</p>";
    $tests['manual_approval'] = false;
}

// 結果サマリー
echo "<h2>📊 テスト結果サマリー</h2>";

$successCount = array_sum($tests);
$totalCount = count($tests);
$successRate = round(($successCount / $totalCount) * 100);

echo "<table border='1' cellpadding='10' cellspacing='0' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>テスト項目</th><th>結果</th></tr>";

$testLabels = [
    'workflow_engine' => 'ワークフローエンジン',
    'queue_manager' => 'Redis Queue Manager',
    'queue_stats' => 'キュー統計取得',
    'active_workflows' => 'アクティブワークフロー取得',
    'sse_basic' => 'Server-Sent Events',
    'manual_approval' => '手動承認フロー'
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
echo "<h3>総合結果</h3>";
echo "<p><strong>成功率: $successRate% ($successCount/$totalCount)</strong></p>";

if ($successRate >= 80) {
    echo "<p>✅ <strong>API修正成功！</strong> ダッシュボードが正常に動作するはずです。</p>";
    echo "<p>次のステップ:</p>";
    echo "<ul>";
    echo "<li><a href='dashboard_v2.html' target='_blank'>ダッシュボード v2.0 を開く</a></li>";
    echo "<li><a href='test_integration.php' target='_blank'>完全統合テストを実行</a></li>";
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
?>
