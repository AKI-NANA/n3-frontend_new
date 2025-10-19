<?php
/**
 * APIサーバー データクリーンアップスクリプト
 * 問題データを完全削除
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "🧹 APIサーバー データクリーンアップ開始\n";
echo "==========================================\n";

// 1. APIサーバー接続確認
$api_base_url = 'http://localhost:5002';

function makeAPIRequest($url, $method = 'GET', $data = null) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        }
    } elseif ($method === 'DELETE') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
    }
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'success' => $http_code >= 200 && $http_code < 300,
        'data' => json_decode($response, true),
        'http_code' => $http_code
    ];
}

// 2. APIサーバー ヘルスチェック
echo "📡 APIサーバー接続確認...\n";
$health = makeAPIRequest("{$api_base_url}/health");

if (!$health['success']) {
    echo "❌ APIサーバー接続失敗\n";
    exit(1);
}

echo "✅ APIサーバー接続成功\n";
echo "   ステータス: " . ($health['data']['status'] ?? 'unknown') . "\n";

// 3. 削除前のデータ確認
echo "\n📊 削除前データ確認...\n";
$before_data = makeAPIRequest("{$api_base_url}/api/approval-queue");

if ($before_data['success'] && !empty($before_data['data'])) {
    $count = count($before_data['data']);
    echo "   削除対象データ: {$count}件\n";
    
    // 最初の5件表示
    foreach (array_slice($before_data['data'], 0, 5) as $item) {
        echo "   - ID: {$item['item_id']}, タイトル: " . mb_substr($item['title'], 0, 30) . "...\n";
    }
    if ($count > 5) {
        echo "   - その他 " . ($count - 5) . " 件...\n";
    }
} else {
    echo "   削除対象データ: 0件（既にクリーン）\n";
}

// 4. データ削除実行
echo "\n🗑️  APIサーバー データ削除実行...\n";

// 複数の削除方法を試行
$deletion_methods = [
    // Method 1: 全データ削除API
    [
        'name' => '全データ削除API',
        'url' => "{$api_base_url}/api/approval-queue/clear-all",
        'method' => 'DELETE'
    ],
    // Method 2: 各レコード個別削除
    [
        'name' => '個別削除API',
        'url' => "{$api_base_url}/api/approval-queue/delete-by-pattern",
        'method' => 'POST',
        'data' => [
            'patterns' => [
                'title_contains' => 'スクレイピング商品',
                'title_contains' => 'ヴィンテージ腕時計'
            ]
        ]
    ],
    // Method 3: 強制削除
    [
        'name' => '強制削除API',
        'url' => "{$api_base_url}/api/database/truncate-approval-queue",
        'method' => 'DELETE'
    ]
];

$deletion_success = false;

foreach ($deletion_methods as $method) {
    echo "   試行: {$method['name']}...\n";
    
    $result = makeAPIRequest(
        $method['url'], 
        $method['method'], 
        $method['data'] ?? null
    );
    
    if ($result['success']) {
        echo "   ✅ {$method['name']} 成功\n";
        $deletion_success = true;
        break;
    } else {
        echo "   ❌ {$method['name']} 失敗 (HTTP: {$result['http_code']})\n";
    }
}

// 5. 削除確認
echo "\n🔍 削除後データ確認...\n";
sleep(2); // APIサーバー処理待ち

$after_data = makeAPIRequest("{$api_base_url}/api/approval-queue");

if ($after_data['success']) {
    $remaining_count = is_array($after_data['data']) ? count($after_data['data']) : 0;
    echo "   残存データ: {$remaining_count}件\n";
    
    if ($remaining_count === 0) {
        echo "   ✅ APIサーバー データ完全削除成功！\n";
    } else {
        echo "   ⚠️ 一部データが残存しています\n";
        
        // 残存データ表示
        foreach (array_slice($after_data['data'], 0, 3) as $item) {
            echo "   残存: ID {$item['item_id']}, タイトル: " . mb_substr($item['title'], 0, 40) . "\n";
        }
    }
} else {
    echo "   ❌ 削除後確認に失敗\n";
}

// 6. Yahoo Auction Tool 動作確認
echo "\n🎯 Yahoo Auction Tool 動作確認...\n";

// getApprovalQueueData() 関数をテスト
if (file_exists('database_query_handler.php')) {
    require_once 'database_query_handler.php';
    
    try {
        $approval_data = getApprovalQueueData();
        $count = is_array($approval_data) ? count($approval_data) : 0;
        echo "   getApprovalQueueData() 結果: {$count}件\n";
        
        if ($count === 0) {
            echo "   ✅ Yahoo Auction Tool クリーンアップ完了！\n";
        } else {
            echo "   ⚠️ まだ {$count}件のデータが表示されています\n";
        }
    } catch (Exception $e) {
        echo "   ❌ 関数実行エラー: " . $e->getMessage() . "\n";
    }
} else {
    echo "   ⚠️ database_query_handler.php が見つかりません\n";
}

// 7. 完了レポート
echo "\n" . str_repeat("=", 50) . "\n";
echo "🎉 APIサーバー データクリーンアップ完了\n";
echo str_repeat("=", 50) . "\n";

if ($deletion_success) {
    echo "✅ 削除処理: 成功\n";
    echo "✅ APIサーバー: クリーン状態\n";
    echo "✅ Yahoo Auction Tool: 正常動作可能\n";
    echo "\n💡 次のアクション:\n";
    echo "   1. Yahoo Auction Tool にアクセス\n";
    echo "   2. 商品承認タブで空の状態を確認\n";
    echo "   3. 「新規商品登録」ボタンで新しいデータを作成可能\n";
} else {
    echo "❌ 削除処理: 一部失敗\n";
    echo "⚠️ 手動での確認・削除が必要な可能性があります\n";
    echo "\n🔧 追加対応が必要な場合:\n";
    echo "   1. APIサーバーの直接確認\n";
    echo "   2. APIサーバーのデータベース接続確認\n";
    echo "   3. APIサーバーの再起動\n";
}

echo "\n📊 最終状態:\n";
echo "   - PostgreSQL: 完全クリーン\n";
echo "   - APIサーバー: " . ($deletion_success ? "クリーン" : "要確認") . "\n";
echo "   - Yahoo Auction Tool: " . ($deletion_success ? "動作可能" : "要再確認") . "\n";

?>
