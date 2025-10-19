<?php
header('Content-Type: text/plain; charset=utf-8');

echo "=== WORKFLOW ENGINE TEST ===\n";
echo "Current time: " . date('Y-m-d H:i:s') . "\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Memory usage: " . memory_get_usage(true) . " bytes\n";

// ディレクトリ内容確認
echo "\n=== Files in directory ===\n";
$files = scandir(__DIR__);
foreach ($files as $file) {
    if ($file !== '.' && $file !== '..') {
        echo "- $file\n";
    }
}

// データベース接続テスト
echo "\n=== Database Connection Test ===\n";
try {
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres";
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    echo "Database: CONNECTED ✓\n";
} catch (PDOException $e) {
    echo "Database: FAILED - " . $e->getMessage() . "\n";
}

// Redis接続テスト
echo "\n=== Redis Connection Test ===\n";
try {
    if (class_exists('Redis')) {
        $redis = new Redis();
        $redis->connect('127.0.0.1', 6379);
        $redis->ping();
        echo "Redis: CONNECTED ✓\n";
    } else {
        echo "Redis: PHP extension not installed\n";
    }
} catch (Exception $e) {
    echo "Redis: FAILED - " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n";
?>
