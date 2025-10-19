<?php
// シンプルテストファイル
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "PHP動作テスト<br>";
echo "現在時刻: " . date('Y-m-d H:i:s') . "<br>";

// データベース接続テスト
try {
    $host = 'localhost';
    $dbname = 'nagano3_db';
    $username = 'postgres';
    $password = 'password123';
    
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "データベース接続: ✅ 成功<br>";
    
    // 簡単なクエリテスト
    $stmt = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory");
    $count = $stmt->fetchColumn();
    echo "データ件数: $count 件<br>";
    
} catch (Exception $e) {
    echo "データベース接続: ❌ エラー - " . $e->getMessage() . "<br>";
}

echo "テスト完了";
?>
