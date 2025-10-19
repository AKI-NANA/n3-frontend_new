<?php
/**
 * API直接テスト用スクリプト
 * サーバーなしでAPIをテストできる
 */

// 環境変数設定
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['CONTENT_TYPE'] = 'application/json';

// 入力パラメータ設定
$testInput = [
    'action' => 'get_tabbed_matrix',
    'destination' => 'US',
    'max_weight' => 5.0,
    'weight_step' => 0.5
];

// JSON入力をシミュレート
$GLOBALS['HTTP_RAW_POST_DATA'] = json_encode($testInput);

echo "🔧 API直接テスト開始\n";
echo "==================\n";
echo "入力パラメータ: " . json_encode($testInput, JSON_UNESCAPED_UNICODE) . "\n\n";

// データベース接続テスト
try {
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'postgres', 'Kn240914');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ データベース接続成功\n";
    
    // CSVデータ件数確認
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM real_shipping_rates WHERE data_source LIKE \'%csv_2025\'');
    $stmt->execute();
    $count = $stmt->fetchColumn();
    echo "📊 CSVデータ件数: {$count} 件\n\n";
    
} catch (Exception $e) {
    echo "❌ データベースエラー: " . $e->getMessage() . "\n";
    exit(1);
}

// API実行
echo "📡 API実行中...\n";

// 出力バッファリング開始
ob_start();

// APIファイルを直接インクルード
try {
    // 入力をPOSTとして設定
    $_POST = $testInput;
    file_put_contents('php://input', json_encode($testInput));
    
    include 'api/matrix_data_api.php';
    
    $output = ob_get_contents();
    ob_end_clean();
    
    echo "📋 API応答:\n";
    echo $output . "\n";
    
    // JSON解析
    $response = json_decode($output, true);
    if ($response && $response['success']) {
        echo "\n✅ API実行成功！\n";
        
        // データが存在するかチェック
        if (isset($response['data']['carriers'])) {
            echo "📊 取得データ:\n";
            foreach ($response['data']['carriers'] as $carrier => $data) {
                echo "  - {$carrier}: " . count($data) . " サービス\n";
            }
        }
    } else {
        echo "\n❌ API実行失敗\n";
        if ($response && isset($response['message'])) {
            echo "エラー: " . $response['message'] . "\n";
        }
    }
    
} catch (Exception $e) {
    ob_end_clean();
    echo "❌ API実行エラー: " . $e->getMessage() . "\n";
}

echo "\n🔧 API直接テスト完了\n";
?>