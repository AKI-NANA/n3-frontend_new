<?php
/**
 * NAGANO3 データベース設定ファイル
 * config/kicho_config.php
 */

// 環境判定
$is_development = (
    in_array($_SERVER['HTTP_HOST'] ?? 'localhost', ['localhost', '127.0.0.1']) ||
    strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false ||
    strpos($_SERVER['HTTP_HOST'] ?? '', '.local') !== false
);

// 基本設定
$config = [
    // データベース設定
    'DB_TYPE' => 'postgresql',  // or 'mysql'
    'DB_HOST' => 'localhost',
    'DB_PORT' => '5432',        // PostgreSQL: 5432, MySQL: 3306
    'DB_NAME' => 'nagano3',
    'DB_USER' => 'postgres',    // 環境に応じて変更
    'DB_PASS' => '',            // 環境に応じて変更
    
    // 開発環境用設定
    'DEBUG_MODE' => $is_development,
    'LOG_LEVEL' => $is_development ? 'DEBUG' : 'ERROR',
    'CACHE_ENABLED' => !$is_development,
    
    // MFクラウド連携設定
    'MF_API_KEY' => '',         // MFクラウドAPIキー
    'MF_API_SECRET' => '',      // MFクラウドAPIシークレット
    'MF_API_ENDPOINT' => 'https://api.moneyforward.com/api/v1/',
    'MF_ENABLED' => false,      // 実装完了後にtrue
    
    // AI学習サービス設定
    'AI_SERVICE_URL' => 'http://localhost:8000',  // FastAPIサーバー
    'AI_SERVICE_ENABLED' => false,                // 実装完了後にtrue
    'AI_TIMEOUT' => 30,                          // タイムアウト（秒）
    
    // ファイル処理設定
    'UPLOAD_MAX_SIZE' => 50 * 1024 * 1024,      // 50MB
    'BACKUP_DIR' => __DIR__ . '/../backup/',
    'EXPORT_DIR' => __DIR__ . '/../exports/',
    'UPLOAD_DIR' => __DIR__ . '/../uploads/',
    
    // セキュリティ設定
    'CSRF_ENABLED' => true,
    'SESSION_TIMEOUT' => 3600,                   // 1時間
    'RATE_LIMIT_PER_MINUTE' => 100,
    
    // 機能設定
    'AUTO_REFRESH_INTERVAL' => 30000,            // 30秒
    'AI_CONFIDENCE_THRESHOLD' => 0.8,            // 80%以上で自動承認
    'BACKUP_RETENTION_DAYS' => 30,               // 30日間保持
    'MAX_TRANSACTIONS_PER_IMPORT' => 10000,      // インポート上限
];

// 環境別設定上書き
if ($is_development) {
    // 開発環境
    $config = array_merge($config, [
        'DB_PASS' => '',                          // 開発環境ではパスワードなし
        'LOG_LEVEL' => 'DEBUG',
        'AI_SERVICE_ENABLED' => false,            // 開発時はAI無効
        'MF_ENABLED' => false,                    // 開発時はMF無効
        'RATE_LIMIT_PER_MINUTE' => 1000,          // 開発時は制限緩和
    ]);
} else {
    // 本番環境
    $config = array_merge($config, [
        'DB_PASS' => getenv('DB_PASSWORD') ?: '', // 環境変数から取得
        'MF_API_KEY' => getenv('MF_API_KEY') ?: '',
        'MF_API_SECRET' => getenv('MF_API_SECRET') ?: '',
        'LOG_LEVEL' => 'ERROR',
        'DEBUG_MODE' => false,
    ]);
}

// データベース接続テスト関数
function testDatabaseConnection($config) {
    try {
        $dsn = "{$config['DB_TYPE']}:host={$config['DB_HOST']};port={$config['DB_PORT']};dbname={$config['DB_NAME']}";
        $pdo = new PDO($dsn, $config['DB_USER'], $config['DB_PASS'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5
        ]);
        
        // 簡単なクエリでテスト
        $stmt = $pdo->query("SELECT 1");
        return [
            'success' => true,
            'message' => 'データベース接続成功',
            'version' => $pdo->getAttribute(PDO::ATTR_SERVER_VERSION)
        ];
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'message' => 'データベース接続失敗: ' . $e->getMessage(),
            'error_code' => $e->getCode()
        ];
    }
}

// MFクラウド接続テスト関数
function testMFConnection($config) {
    if (!$config['MF_ENABLED'] || empty($config['MF_API_KEY'])) {
        return [
            'success' => false,
            'message' => 'MFクラウド連携が無効またはAPIキーが未設定'
        ];
    }
    
    // TODO: 実際のMFクラウドAPI接続テスト実装
    return [
        'success' => false,
        'message' => 'MFクラウド接続テスト未実装'
    ];
}

// AI学習サービス接続テスト関数
function testAIConnection($config) {
    if (!$config['AI_SERVICE_ENABLED']) {
        return [
            'success' => false,
            'message' => 'AI学習サービスが無効'
        ];
    }
    
    try {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 5,
                'header' => 'Content-Type: application/json'
            ]
        ]);
        
        $response = @file_get_contents($config['AI_SERVICE_URL'] . '/health', false, $context);
        
        if ($response !== false) {
            return [
                'success' => true,
                'message' => 'AI学習サービス接続成功',
                'response' => json_decode($response, true)
            ];
        } else {
            return [
                'success' => false,
                'message' => 'AI学習サービス接続失敗'
            ];
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'AI学習サービス接続エラー: ' . $e->getMessage()
        ];
    }
}

// 必要ディレクトリ作成
$required_dirs = [
    $config['BACKUP_DIR'],
    $config['EXPORT_DIR'], 
    $config['UPLOAD_DIR'],
    dirname(__FILE__) . '/../logs/'
];

foreach ($required_dirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

return $config;
