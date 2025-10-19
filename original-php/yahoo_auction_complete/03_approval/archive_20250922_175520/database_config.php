<?php
/**
 * データベース設定ファイル
 * modules/yahoo_auction_complete/new_structure/03_approval/database_config.php
 * 
 * 複数データベース対応・自動フォールバック機能付き
 */

// データベース接続設定（優先順）
$database_configs = [
    // PostgreSQL (優先)
    [
        'type' => 'postgresql',
        'host' => 'localhost',
        'port' => '5432',
        'dbname' => 'yahoo_auction_system',
        'username' => 'postgres',
        'password' => '',
        'charset' => 'utf8',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_STRINGIFY_FETCHES => false
        ]
    ],
    // PostgreSQL (代替DB)
    [
        'type' => 'postgresql',
        'host' => 'localhost',
        'port' => '5432',
        'dbname' => 'nagano3_db',
        'username' => 'postgres',
        'password' => '',
        'charset' => 'utf8',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_STRINGIFY_FETCHES => false
        ]
    ],
    // MySQL (フォールバック)
    [
        'type' => 'mysql',
        'host' => 'localhost',
        'port' => '3306',
        'dbname' => 'yahoo_auction_system',
        'username' => 'root',
        'password' => '',
        'charset' => 'utf8mb4',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        ]
    ]
];

/**
 * データベース接続試行
 */
function connectDatabase() {
    global $database_configs;
    
    foreach ($database_configs as $config) {
        try {
            $dsn = buildDSN($config);
            $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
            
            // 接続テスト
            $pdo->query('SELECT 1');
            
            return [
                'connection' => $pdo,
                'config' => $config,
                'status' => 'success'
            ];
            
        } catch (PDOException $e) {
            error_log("DB接続失敗 ({$config['type']}): " . $e->getMessage());
            continue;
        }
    }
    
    throw new Exception('すべてのデータベース接続に失敗しました');
}

/**
 * DSN文字列構築
 */
function buildDSN($config) {
    switch ($config['type']) {
        case 'postgresql':
            return sprintf(
                'pgsql:host=%s;port=%s;dbname=%s',
                $config['host'],
                $config['port'],
                $config['dbname']
            );
            
        case 'mysql':
            return sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                $config['host'],
                $config['port'],
                $config['dbname'],
                $config['charset']
            );
            
        default:
            throw new Exception("未サポートのデータベース種別: {$config['type']}");
    }
}

/**
 * 環境変数からの設定上書き
 */
function loadEnvironmentConfig() {
    global $database_configs;
    
    if (getenv('DB_HOST')) {
        foreach ($database_configs as &$config) {
            $config['host'] = getenv('DB_HOST');
        }
    }
    
    if (getenv('DB_USER')) {
        foreach ($database_configs as &$config) {
            $config['username'] = getenv('DB_USER');
        }
    }
    
    if (getenv('DB_PASSWORD')) {
        foreach ($database_configs as &$config) {
            $config['password'] = getenv('DB_PASSWORD');
        }
    }
    
    if (getenv('DB_NAME')) {
        foreach ($database_configs as &$config) {
            $config['dbname'] = getenv('DB_NAME');
        }
    }
}

// 環境変数設定の読み込み
loadEnvironmentConfig();

/**
 * 本番環境用セキュリティ設定
 */
function getSecureConfig() {
    return [
        // SSL接続強制（本番環境）
        'ssl_mode' => 'require',
        // 接続タイムアウト
        'connect_timeout' => 10,
        // クエリタイムアウト
        'query_timeout' => 30,
        // 最大接続試行回数
        'max_retry' => 3
    ];
}
?>