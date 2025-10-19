<?php
/**
 * 03_approval 設定ファイル
 * 環境固有の設定と定数定義
 */

// エラー報告レベル設定
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/error.log');

// タイムゾーン設定
date_default_timezone_set('Asia/Tokyo');

// デバッグモード（本番環境では false に設定）
define('DEBUG_MODE', true);

// データベース設定
define('DB_CONFIG', [
    'host' => $_ENV['DB_HOST'] ?? 'localhost',
    'port' => $_ENV['DB_PORT'] ?? '5432',
    'dbname' => $_ENV['DB_NAME'] ?? 'nagano3',
    'username' => $_ENV['DB_USER'] ?? 'postgres',
    'password' => $_ENV['DB_PASS'] ?? '',
    'charset' => 'utf8',
    'persistent' => true,
    'timeout' => 30
]);

// JWT設定
define('JWT_CONFIG', [
    'secret' => $_ENV['JWT_SECRET'] ?? 'NAGANO-3-SECRET-KEY-2025-' . date('Y-m'),
    'algorithm' => 'HS256',
    'issuer' => 'nagano-3-approval',
    'expiration_hours' => 24
]);

// Redis設定
define('REDIS_CONFIG', [
    'host' => $_ENV['REDIS_HOST'] ?? '127.0.0.1',
    'port' => $_ENV['REDIS_PORT'] ?? 6379,
    'password' => $_ENV['REDIS_PASS'] ?? null,
    'database' => $_ENV['REDIS_DB'] ?? 0,
    'timeout' => 5
]);

// ログ設定
define('LOG_CONFIG', [
    'min_level' => DEBUG_MODE ? 'DEBUG' : 'INFO',
    'log_to_database' => true,
    'log_to_file' => true,
    'log_file' => __DIR__ . '/logs/application.log',
    'max_file_size' => 50 * 1024 * 1024, // 50MB
    'rotate_files' => 5
]);

// API設定
define('API_CONFIG', [
    'rate_limit' => [
        'requests_per_minute' => 100,
        'requests_per_hour' => 1000,
        'enabled' => true
    ],
    'cors' => [
        'allowed_origins' => ['*'], // 本番では適切に制限
        'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        'allowed_headers' => ['Content-Type', 'Authorization']
    ],
    'cache_ttl' => 300, // 5分
    'max_items_per_page' => 100
]);

// 承認システム固有設定
define('APPROVAL_CONFIG', [
    'default_deadline_hours' => 24,
    'escalation_threshold_hours' => 48,
    'ai_confidence_threshold' => 80,
    'auto_approve_threshold' => 95, // AI信頼度95%以上は自動承認（オプション）
    'batch_size' => 50,
    'image_cache_ttl' => 3600
]);

// 通知設定
define('NOTIFICATION_CONFIG', [
    'email' => [
        'enabled' => false, // 本番では true に設定
        'smtp_host' => $_ENV['SMTP_HOST'] ?? 'localhost',
        'smtp_port' => $_ENV['SMTP_PORT'] ?? 587,
        'smtp_user' => $_ENV['SMTP_USER'] ?? '',
        'smtp_pass' => $_ENV['SMTP_PASS'] ?? '',
        'from_email' => $_ENV['MAIL_FROM'] ?? 'system@nagano3.local',
        'from_name' => 'NAGANO-3 承認システム'
    ],
    'slack' => [
        'enabled' => false,
        'webhook_url' => $_ENV['SLACK_WEBHOOK'] ?? '',
        'channel' => '#approvals',
        'username' => 'Approval Bot'
    ]
]);

// セキュリティ設定
define('SECURITY_CONFIG', [
    'session' => [
        'lifetime' => 8 * 60 * 60, // 8時間
        'name' => 'NAGANO3_SESSION',
        'secure' => false, // HTTPS環境では true
        'httponly' => true,
        'samesite' => 'Lax'
    ],
    'csrf_protection' => true,
    'max_login_attempts' => 5,
    'lockout_duration' => 15 * 60, // 15分
    'password_policy' => [
        'min_length' => 8,
        'require_uppercase' => true,
        'require_lowercase' => true,
        'require_numbers' => true,
        'require_symbols' => false
    ]
]);

// ファイル・ディレクトリ設定
define('PATH_CONFIG', [
    'logs' => __DIR__ . '/logs',
    'cache' => __DIR__ . '/cache',
    'temp' => __DIR__ . '/temp',
    'uploads' => __DIR__ . '/uploads',
    'exports' => __DIR__ . '/exports'
]);

// パフォーマンス設定
define('PERFORMANCE_CONFIG', [
    'memory_limit' => '256M',
    'max_execution_time' => 60,
    'query_cache_ttl' => 300,
    'stats_cache_ttl' => 60,
    'slow_query_threshold' => 1000, // milliseconds
    'enable_query_profiling' => DEBUG_MODE
]);

// 外部API設定
define('EXTERNAL_API_CONFIG', [
    'yahoo_auction' => [
        'base_url' => 'https://auctions.yahoo.co.jp',
        'timeout' => 30,
        'retry_attempts' => 3,
        'rate_limit' => 60 // requests per minute
    ],
    'ebay' => [
        'base_url' => 'https://api.ebay.com',
        'app_id' => $_ENV['EBAY_APP_ID'] ?? '',
        'dev_id' => $_ENV['EBAY_DEV_ID'] ?? '',
        'cert_id' => $_ENV['EBAY_CERT_ID'] ?? '',
        'token' => $_ENV['EBAY_TOKEN'] ?? '',
        'sandbox' => DEBUG_MODE
    ]
]);

// 統合ワークフロー設定
define('WORKFLOW_CONFIG', [
    'redis_queue_name' => 'workflow_queue',
    'max_retries' => 3,
    'retry_delay' => 60, // seconds
    'step_timeout' => 300, // 5 minutes
    'enable_auto_progression' => true,
    'notification_on_failure' => true
]);

// 開発用設定
if (DEBUG_MODE) {
    // 開発環境でのみ有効
    define('DEV_CONFIG', [
        'enable_test_data' => true,
        'bypass_auth' => isset($_GET['dev_mode']),
        'show_debug_info' => true,
        'enable_query_log' => true,
        'fake_external_apis' => true
    ]);
}

// 必要なディレクトリを作成
foreach (PATH_CONFIG as $path) {
    if (!is_dir($path)) {
        mkdir($path, 0755, true);
    }
}

// セッション設定を適用
if (session_status() === PHP_SESSION_NONE) {
    session_name(SECURITY_CONFIG['session']['name']);
    session_set_cookie_params([
        'lifetime' => SECURITY_CONFIG['session']['lifetime'],
        'path' => '/',
        'domain' => '',
        'secure' => SECURITY_CONFIG['session']['secure'],
        'httponly' => SECURITY_CONFIG['session']['httponly'],
        'samesite' => SECURITY_CONFIG['session']['samesite']
    ]);
}

// PHP設定の適用
ini_set('memory_limit', PERFORMANCE_CONFIG['memory_limit']);
ini_set('max_execution_time', PERFORMANCE_CONFIG['max_execution_time']);

// ログファイルのローテーション
function rotateLogFile($logFile) {
    if (!file_exists($logFile)) return;
    
    $maxSize = LOG_CONFIG['max_file_size'];
    $maxFiles = LOG_CONFIG['rotate_files'];
    
    if (filesize($logFile) > $maxSize) {
        // 既存ファイルをローテーション
        for ($i = $maxFiles - 1; $i > 0; $i--) {
            $oldFile = $logFile . '.' . $i;
            $newFile = $logFile . '.' . ($i + 1);
            if (file_exists($oldFile)) {
                rename($oldFile, $newFile);
            }
        }
        
        // 現在のファイルを .1 に移動
        rename($logFile, $logFile . '.1');
    }
}

// ログローテーション実行
if (LOG_CONFIG['log_to_file']) {
    rotateLogFile(LOG_CONFIG['log_file']);
}

// 環境情報の表示（開発時のみ）
if (DEBUG_MODE && isset($_GET['phpinfo'])) {
    phpinfo();
    exit;
}

// 設定の検証
function validateConfig() {
    $errors = [];
    
    // 必須環境変数チェック
    $required_env = ['DB_HOST', 'DB_NAME'];
    foreach ($required_env as $env) {
        if (empty($_ENV[$env]) && empty($_SERVER[$env]) && !array_key_exists($env, $_ENV)) {
            $errors[] = "Required environment variable {$env} is not set";
        }
    }
    
    // ディレクトリ権限チェック
    foreach (PATH_CONFIG as $name => $path) {
        if (!is_writable($path)) {
            $errors[] = "Directory {$name} ({$path}) is not writable";
        }
    }
    
    if (!empty($errors)) {
        if (DEBUG_MODE) {
            echo "Configuration errors:\n";
            foreach ($errors as $error) {
                echo "- $error\n";
            }
            exit(1);
        } else {
            error_log("Configuration errors: " . implode(', ', $errors));
        }
    }
}

// 設定検証実行（開発モードまたはCLIの場合）
if (DEBUG_MODE || php_sapi_name() === 'cli') {
    validateConfig();
}
