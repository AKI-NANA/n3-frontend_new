<?php
/**
 * PostgreSQL接続テスト専用ファイル - Phase 1
 * 目的: 既存システムに影響を与えずに接続確認
 */

// セキュリティヘッダー
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-cache, must-revalidate');

// エラー表示設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

function testPostgreSQLConnection() {
    echo "🔍 PostgreSQL接続テスト開始\n";
    
    $connectionConfigs = [
        [
            'name' => 'メイン設定',
            'host' => 'localhost',
            'port' => '5432', 
            'dbname' => 'nagano3_db',
            'username' => 'postgres',
            'password' => 'Kn240914'
        ],
        [
            'name' => 'ローカル設定',
            'host' => '127.0.0.1',
            'port' => '5432',
            'dbname' => 'nagano3_db', 
            'username' => 'postgres',
            'password' => ''
        ]
    ];
    
    $results = [];
    
    foreach ($connectionConfigs as $config) {
        echo "\n📋 テスト: {$config['name']}\n";
        
        try {
            $dsn = "pgsql:host={$config['host']};port={$config['port']};dbname={$config['dbname']}";
            echo "DSN: {$dsn}\n";
            
            $pdo = new PDO($dsn, $config['username'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 5
            ]);
            
            // 接続成功 - バージョン確認
            $stmt = $pdo->query("SELECT version() as pg_version, current_database() as current_db");
            $result = $stmt->fetch();
            
            // テーブル確認
            $tableCheck = $pdo->query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
            $tables = $tableCheck->fetchAll(PDO::FETCH_COLUMN);
            
            $testResult = [
                'config_name' => $config['name'],
                'success' => true,
                'pg_version' => $result['pg_version'],
                'current_db' => $result['current_db'],
                'tables_count' => count($tables),
                'available_tables' => $tables,
                'ebay_tables' => array_filter($tables, function($t) {
                    return strpos($t, 'ebay') !== false || strpos($t, 'inventory') !== false;
                })
            ];
            
            echo "✅ 接続成功!\n";
            echo "PostgreSQL: {$result['pg_version']}\n";
            echo "データベース: {$result['current_db']}\n";
            echo "テーブル数: " . count($tables) . "\n";
            echo "eBay関連テーブル: " . implode(', ', $testResult['ebay_tables']) . "\n";
            
            $results[] = $testResult;
            
            // 最初の成功でbreak
            break;
            
        } catch (Exception $e) {
            echo "❌ 接続失敗: {$e->getMessage()}\n";
            
            $results[] = [
                'config_name' => $config['name'],
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    echo "\n📊 テスト結果サマリー:\n";
    echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    return $results;
}

// CLI実行
if (php_sapi_name() === 'cli') {
    testPostgreSQLConnection();
} else {
    // Web実行
    echo json_encode(testPostgreSQLConnection(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>