<?php
/**
 * 在庫管理システム設定ファイル
 * 計画書に基づく完全版実装
 */

// データベース設定
define('DB_HOST', 'localhost');
define('DB_NAME', 'yahoo_auction_system');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Redis設定（Webサーバー版では無効化）
define('REDIS_HOST', 'localhost');
define('REDIS_PORT', 6379);
define('REDIS_ENABLED', false); // Web版では無効

// セキュリティ設定
define('API_SECRET_KEY', 'inventory_system_secret_key_2025');
define('SESSION_LIFETIME', 3600);
define('MAX_LOGIN_ATTEMPTS', 5);

// システム設定
define('SYSTEM_NAME', '在庫管理システム');
define('SYSTEM_VERSION', '1.0.0');
define('SYSTEM_ENVIRONMENT', 'development');

// ログ設定
define('LOG_PATH', __DIR__ . '/logs/');
define('LOG_MAX_SIZE', 10 * 1024 * 1024); // 10MB
define('LOG_RETENTION_DAYS', 30);

// メール設定（Web版では無効化）
define('SMTP_ENABLED', false);
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('ALERT_EMAIL', 'admin@example.com');

// API設定
define('AMAZON_API_ENABLED', false); // Web版では無効
define('EBAY_API_ENABLED', false);   // Web版では無効

// キュー設定
define('QUEUE_BATCH_SIZE', 50);
define('QUEUE_MAX_RETRIES', 3);
define('QUEUE_TIMEOUT', 300);

// パフォーマンス設定
define('MEMORY_LIMIT', '512M');
define('EXECUTION_TIME_LIMIT', 300);
define('CACHE_TTL', 3600);

// 監視設定
define('HEALTH_CHECK_INTERVAL', 300); // 5分
define('ALERT_THRESHOLD_ERROR_RATE', 5.0); // 5%
define('ALERT_THRESHOLD_RESPONSE_TIME', 3.0); // 3秒

// ファイルパス設定
define('ASSET_PATH', __DIR__ . '/assets/');
define('INCLUDE_PATH', __DIR__ . '/includes/');
define('WORKER_PATH', __DIR__ . '/workers/');
define('SCRIPT_PATH', __DIR__ . '/scripts/');

// タイムゾーン設定
date_default_timezone_set('Asia/Tokyo');

// エラーレポート設定
if (SYSTEM_ENVIRONMENT === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// セッション設定
ini_set('session.gc_maxlifetime', SESSION_LIFETIME);
session_set_cookie_params(SESSION_LIFETIME);

/**
 * 設定値取得関数
 */
function getConfig($key, $default = null) {
    return defined($key) ? constant($key) : $default;
}

/**
 * 環境チェック関数
 */
function checkEnvironment() {
    $checks = [
        'PHP Version' => version_compare(PHP_VERSION, '8.0.0', '>='),
        'PDO Extension' => extension_loaded('pdo'),
        'PDO MySQL Extension' => extension_loaded('pdo_mysql'),
        'JSON Extension' => extension_loaded('json'),
        'cURL Extension' => extension_loaded('curl'),
        'OpenSSL Extension' => extension_loaded('openssl'),
        'Log Directory Writable' => is_writable(LOG_PATH)
    ];
    
    return $checks;
}

/**
 * システム初期化
 */
function initializeSystem() {
    // ログディレクトリ作成
    $logDirs = [
        LOG_PATH,
        LOG_PATH . 'execution/',
        LOG_PATH . 'errors/',
        LOG_PATH . 'security/',
        LOG_PATH . 'performance/'
    ];
    
    foreach ($logDirs as $dir) {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
    
    return true;
}

// システム初期化実行
initializeSystem();
?>