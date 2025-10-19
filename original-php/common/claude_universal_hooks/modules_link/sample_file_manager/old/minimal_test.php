<?php
// 🔧 CAIDS 最小限テストファイル - エラー原因特定用
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>";
echo "<html><head><title>最小限テスト</title></head><body>";
echo "<h1>🔧 PHPテスト - ステップ1</h1>";
echo "<p>現在時刻: " . date('Y-m-d H:i:s') . "</p>";
echo "<p>PHPバージョン: " . PHP_VERSION . "</p>";

// セッションテスト
echo "<h2>セッションテスト:</h2>";
try {
    session_start();
    echo "<p>✅ セッション開始: 成功</p>";
} catch (Exception $e) {
    echo "<p>❌ セッション開始: 失敗 - " . $e->getMessage() . "</p>";
}

// ディレクトリ存在確認
echo "<h2>ディレクトリ確認:</h2>";
$dirs = ['uploads', 'database', 'logs'];
foreach ($dirs as $dir) {
    $path = __DIR__ . '/' . $dir;
    if (is_dir($path)) {
        echo "<p>✅ ディレクトリ $dir: 存在</p>";
    } else {
        echo "<p>❌ ディレクトリ $dir: 不存在</p>";
    }
}

// 書き込みテスト
echo "<h2>書き込みテスト:</h2>";
$testFile = __DIR__ . '/test_write.txt';
if (file_put_contents($testFile, 'テスト')) {
    echo "<p>✅ ファイル書き込み: 成功</p>";
    if (file_exists($testFile)) {
        unlink($testFile);
        echo "<p>✅ ファイル削除: 成功</p>";
    }
} else {
    echo "<p>❌ ファイル書き込み: 失敗</p>";
}

// SQLiteテスト
echo "<h2>SQLiteテスト:</h2>";
try {
    $pdo = new PDO('sqlite:' . __DIR__ . '/database/test_minimal.db');
    echo "<p>✅ SQLite接続: 成功</p>";
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS test (id INTEGER, name TEXT)");
    echo "<p>✅ テーブル作成: 成功</p>";
    
    $pdo->exec("INSERT INTO test (id, name) VALUES (1, 'テスト')");
    echo "<p>✅ データ挿入: 成功</p>";
    
    $stmt = $pdo->query("SELECT * FROM test");
    $result = $stmt->fetch();
    echo "<p>✅ データ取得: " . ($result ? '成功' : '失敗') . "</p>";
    
} catch (Exception $e) {
    echo "<p>❌ SQLite接続: 失敗 - " . $e->getMessage() . "</p>";
}

echo "<h2>結果:</h2>";
echo "<p><strong>このページが表示されていれば、基本的なPHP動作は正常です。</strong></p>";
echo "<p>元のファイルに問題がある可能性があります。</p>";

echo "</body></html>";
?>
