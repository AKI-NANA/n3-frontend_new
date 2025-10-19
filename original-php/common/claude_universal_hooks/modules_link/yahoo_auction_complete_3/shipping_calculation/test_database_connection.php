<?php
/**
 * データベース接続テスト & 修正版
 */

// MAMP環境用のデータベース接続設定
$dbConfigs = [
    // MAMP標準設定
    'mamp' => [
        'host' => 'localhost',
        'port' => '8889',
        'dbname' => 'nagano3_db',
        'username' => 'root',
        'password' => 'root'
    ],
    // 標準MySQL設定
    'standard' => [
        'host' => 'localhost', 
        'port' => '3306',
        'dbname' => 'nagano3_db',
        'username' => 'root',
        'password' => ''
    ],
    // Socket接続
    'socket' => [
        'host' => 'localhost',
        'port' => null,
        'dbname' => 'nagano3_db', 
        'username' => 'root',
        'password' => 'root',
        'socket' => '/Applications/MAMP/tmp/mysql/mysql.sock'
    ]
];

echo "データベース接続テスト開始...\n\n";

foreach ($dbConfigs as $configName => $config) {
    echo "=== {$configName} 設定でテスト ===\n";
    
    try {
        if (isset($config['socket'])) {
            $dsn = "mysql:unix_socket={$config['socket']};dbname={$config['dbname']};charset=utf8mb4";
        } else {
            $port = $config['port'] ? ";port={$config['port']}" : '';
            $dsn = "mysql:host={$config['host']}{$port};dbname={$config['dbname']};charset=utf8mb4";
        }
        
        echo "DSN: {$dsn}\n";
        echo "ユーザー: {$config['username']}\n";
        
        $pdo = new PDO($dsn, $config['username'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5
        ]);
        
        // 接続確認クエリ
        $stmt = $pdo->query("SELECT VERSION() as version, DATABASE() as current_db");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo "✅ 接続成功!\n";
        echo "MySQL バージョン: {$result['version']}\n";
        echo "現在のDB: {$result['current_db']}\n";
        
        // テーブル存在確認
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo "既存テーブル数: " . count($tables) . "\n";
        
        if (count($tables) > 0) {
            echo "テーブル一覧: " . implode(', ', $tables) . "\n";
        }
        
        echo "👍 この設定を使用してください\n\n";
        
        // 成功した設定でスキーマ作成を実行
        executeSchemaCreation($pdo, $configName);
        break;
        
    } catch (PDOException $e) {
        echo "❌ 接続失敗: " . $e->getMessage() . "\n\n";
    }
}

/**
 * スキーマ作成実行
 */
function executeSchemaCreation($pdo, $configName) {
    echo "=== データベーススキーマ作成 ({$configName}) ===\n";
    
    $schemaFile = __DIR__ . '/carrier_comparison_schema.sql';
    
    if (!file_exists($schemaFile)) {
        echo "❌ スキーマファイルが見つかりません\n";
        return;
    }
    
    try {
        $sql = file_get_contents($schemaFile);
        
        // SQLを分割して実行
        $statements = array_filter(array_map('trim', explode(';', $sql)));
        
        $pdo->beginTransaction();
        
        foreach ($statements as $statement) {
            if (!empty($statement) && !preg_match('/^--/', $statement)) {
                $pdo->exec($statement);
            }
        }
        
        $pdo->commit();
        
        echo "✅ スキーマ作成完了\n";
        
        // 作成されたテーブル確認
        $stmt = $pdo->query("SHOW TABLES LIKE 'shipping_%' OR SHOW TABLES LIKE 'carrier_%'");
        $newTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        echo "作成されたテーブル: " . implode(', ', $newTables) . "\n";
        
    } catch (Exception $e) {
        $pdo->rollBack();
        echo "❌ スキーマ作成エラー: " . $e->getMessage() . "\n";
    }
}
?>
