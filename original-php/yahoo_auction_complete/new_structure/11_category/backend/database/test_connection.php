<?php
/**
 * データベース接続テスト - eBayカテゴリーシステム
 */

try {
    // 環境設定読み込み
    $envPath = '/Users/aritahiroaki/NAGANO-3/N3-Development/common/env/.env';
    if (file_exists($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }

    // データベース接続
    $dsn = sprintf("pgsql:host=%s;dbname=%s;port=%s", 
        $_ENV['DB_HOST'] ?? 'localhost',
        $_ENV['DB_NAME'] ?? 'nagano3_db', 
        $_ENV['DB_PORT'] ?? '5432'
    );
    
    $pdo = new PDO($dsn, $_ENV['DB_USER'] ?? 'aritahiroaki', $_ENV['DB_PASS'] ?? '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ データベース接続成功!\n";
    echo "データベース: " . ($_ENV['DB_NAME'] ?? 'nagano3_db') . "\n";
    echo "ホスト: " . ($_ENV['DB_HOST'] ?? 'localhost') . "\n";
    
    // 既存テーブル確認
    echo "\n📋 現在のeBayカテゴリー関連テーブル:\n";
    $stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%ebay%' OR table_name LIKE '%category%'");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($tables)) {
        echo "❌ eBayカテゴリー関連テーブルが存在しません\n";
    } else {
        foreach ($tables as $table) {
            echo "   - {$table}\n";
        }
    }
    
    // Yahoo Auctionテーブル確認
    echo "\n📋 Yahoo Auction関連テーブル:\n";
    $stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%yahoo%'");
    $yahooTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (!empty($yahooTables)) {
        foreach ($yahooTables as $table) {
            $stmt = $pdo->query("SELECT COUNT(*) FROM {$table}");
            $count = $stmt->fetchColumn();
            echo "   - {$table}: {$count}件\n";
        }
    } else {
        echo "❌ Yahoo Auction関連テーブルが存在しません\n";
    }
    
} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
}
?>