# ===== .env - 環境変数設定 =====
# データベース設定
DB_HOST=localhost
DB_NAME=gmail_cleaner
DB_USER=gmail_cleaner_user
DB_PASS=your_secure_password_here
DB_CHARSET=utf8mb4

# セキュリティ設定
GMAIL_ENCRYPTION_KEY=your_32_character_encryption_key_here_very_secure
APP_SECRET_KEY=your_app_secret_key_for_sessions_here

# Gmail API設定
GMAIL_CLIENT_ID=your_google_client_id.googleusercontent.com
GMAIL_CLIENT_SECRET=your_google_client_secret
GMAIL_REDIRECT_URI=https://yourdomain.com/auth.php

# アプリケーション設定
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com
LOG_LEVEL=error

# メール同期設定
SYNC_INTERVAL_MINUTES=5
MAX_EMAILS_PER_SYNC=500
SYNC_TIMEOUT_SECONDS=300

# パフォーマンス設定
MEMORY_LIMIT=1024M
MAX_EXECUTION_TIME=300
BATCH_SIZE=100

# ===== config/database.php - データベース接続 =====
<?php
// 環境変数読み込み
if (file_exists(__DIR__ . '/../.env')) {
    $envFile = file_get_contents(__DIR__ . '/../.env');
    $lines = explode("\n", $envFile);
    
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && !str_starts_with($line, '#')) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// データベース設定
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'gmail_cleaner');
define('DB_USER', $_ENV['DB_USER'] ?? 'gmail_cleaner_user');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');
define('DB_CHARSET', $_ENV['DB_CHARSET'] ?? 'utf8mb4');

// データベース接続
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET . " COLLATE " . DB_CHARSET . "_unicode_ci"
    ];
    
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    
    // 接続確認ログ
    if ($_ENV['APP_DEBUG'] === 'true') {
        error_log('Database connected successfully');
    }
    
} catch (PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    
    if ($_ENV['APP_ENV'] === 'production') {
        die('データベース接続エラーが発生しました。管理者にお問い合わせください。');
    } else {
        die('Database connection failed: ' . $e->getMessage());
    }
}

// ===== config/app_config.php - アプリケーション設定 =====
<?php
// セキュリティ設定
define('GMAIL_ENCRYPTION_KEY', $_ENV['GMAIL_ENCRYPTION_KEY'] ?? '');
define('APP_SECRET_KEY', $_ENV['APP_SECRET_KEY'] ?? '');
define('APP_ENV', $_ENV['APP_ENV'] ?? 'development');
define('APP_DEBUG', $_ENV['APP_DEBUG'] === 'true');
define('APP_URL', $_ENV['APP_URL'] ?? 'http://localhost');

// Gmail API設定
define('GMAIL_CLIENT_ID', $_ENV['GMAIL_CLIENT_ID'] ?? '');
define('GMAIL_CLIENT_SECRET', $_ENV['GMAIL_CLIENT_SECRET'] ?? '');
define('GMAIL_REDIRECT_URI', $_ENV['GMAIL_REDIRECT_URI'] ?? '');

// 同期設定
define('SYNC_INTERVAL_MINUTES', (int)($_ENV['SYNC_INTERVAL_MINUTES'] ?? 5));
define('MAX_EMAILS_PER_SYNC', (int)($_ENV['MAX_EMAILS_PER_SYNC'] ?? 500));
define('SYNC_TIMEOUT_SECONDS', (int)($_ENV['SYNC_TIMEOUT_SECONDS'] ?? 300));

// パフォーマンス設定
define('MEMORY_LIMIT', $_ENV['MEMORY_LIMIT'] ?? '512M');
define('MAX_EXECUTION_TIME', (int)($_ENV['MAX_EXECUTION_TIME'] ?? 300));
define('BATCH_SIZE', (int)($_ENV['BATCH_SIZE'] ?? 100));

// ログ設定
define('LOG_LEVEL', $_ENV['LOG_LEVEL'] ?? 'info');
define('LOG_FILE', __DIR__ . '/../logs/app.log');
define('ERROR_LOG_FILE', __DIR__ . '/../logs/error.log');

// ディレクトリパス
define('CONFIG_PATH', __DIR__);
define('ROOT_PATH', dirname(__DIR__));
define('PUBLIC_PATH', ROOT_PATH . '/public');
define('LOGS_PATH', ROOT_PATH . '/logs');

// PHP設定適用
ini_set('memory_limit', MEMORY_LIMIT);
ini_set('max_execution_time', MAX_EXECUTION_TIME);

if (APP_ENV === 'production') {
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    ini_set('error_log', ERROR_LOG_FILE);
} else {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
}

// セッション設定
ini_set('session.cookie_httponly', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.cookie_secure', APP_ENV === 'production' ? '1' : '0');

// ===== scripts/cron_sync.php - Cronジョブスクリプト =====
#!/usr/bin/env php
<?php
/**
 * Gmail自動同期Cronジョブ
 * 使用方法: php scripts/cron_sync.php [user_id] [--full-sync]
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/app_config.php';

use App\Controllers\EmailController;
use App\Services\GmailApiService;

// コマンドライン引数解析
$options = getopt('', ['user-id:', 'full-sync', 'help']);

if (isset($options['help'])) {
    echo "Gmail Cleaner 自動同期スクリプト\n";
    echo "使用方法: php cron_sync.php --user-id=1 [--full-sync]\n";
    echo "オプション:\n";
    echo "  --user-id=ID    対象ユーザーID（必須）\n";
    echo "  --full-sync     全件同期を実行\n";
    echo "  --help          このヘルプを表示\n";
    exit(0);
}

$userId = $options['user-id'] ?? null;
$fullSync = isset($options['full-sync']);

if (!$userId) {
    echo "エラー: --user-id パラメータが必要です\n";
    exit(1);
}

// ログ設定
$logFile = LOGS_PATH . '/cron_sync.log';
if (!file_exists(dirname($logFile))) {
    mkdir(dirname($logFile), 0755, true);
}

function cronLog($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND | LOCK_EX);
    echo "[$timestamp] $message\n";
}

try {
    cronLog("開始: ユーザーID {$userId} の同期 " . ($fullSync ? '(全件同期)' : '(増分同期)'));
    
    // メモリ制限設定
    ini_set('memory_limit', MEMORY_LIMIT);
    ini_set('max_execution_time', SYNC_TIMEOUT_SECONDS);
    
    $startTime = microtime(true);
    $startMemory = memory_get_usage();
    
    // EmailController初期化
    $emailController = new EmailController($pdo);
    
    // 同期実行
    $result = $emailController->syncEmails($userId, $fullSync);
    
    $endTime = microtime(true);
    $endMemory = memory_get_usage();
    $duration = round($endTime - $startTime, 2);
    $memoryUsed = round(($endMemory - $startMemory) / 1024 / 1024, 2);
    
    if ($result['success']) {
        cronLog("成功: {$result['processed']}件処理 (新規: {$result['new']}, 更新: {$result['updated']}) " .
               "時間: {$duration}秒, メモリ: {$memoryUsed}MB");
    } else {
        cronLog("失敗: " . $result['error']);
        exit(1);
    }
    
} catch (Exception $e) {
    cronLog("例外エラー: " . $e->getMessage());
    cronLog("スタックトレース: " . $e->getTraceAsString());
    exit(1);
}

cronLog("完了: ユーザーID {$userId} の同期が正常に終了しました");
exit(0);

# ===== crontab設定例 =====
# Gmail Cleaner 自動同期設定
# 毎5分に増分同期
*/5 * * * * /usr/bin/php /path/to/gmail-cleaner/scripts/cron_sync.php --user-id=1 >> /path/to/gmail-cleaner/logs/cron.log 2>&1

# 毎日午前2時に全件同期
0 2 * * * /usr/bin/php /path/to/gmail-cleaner/scripts/cron_sync.php --user-id=1 --full-sync >> /path/to/gmail-cleaner/logs/cron.log 2>&1

# 週1回のデータクリーンアップ（日曜日午前3時）
0 3 * * 0 /usr/bin/php /path/to/gmail-cleaner/scripts/cleanup_old_data.php >> /path/to/gmail-cleaner/logs/cleanup.log 2>&1

# ===== Apache .htaccess ファイル =====
# public/.htaccess
RewriteEngine On

# HTTPS強制（本番環境）
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# セキュリティヘッダー
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

# フロントコントローラー
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]

# 機密ファイルへのアクセス拒否
<FilesMatch "\.(env|json|log)$">
    Require all denied
</FilesMatch>

# ===== Nginx設定例 =====
# /etc/nginx/sites-available/gmail-cleaner
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    root /path/to/gmail-cleaner/public;
    index index.php;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # セキュリティヘッダー
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # 機密ファイル保護
    location ~ /\.(env|json|log) {
        deny all;
        return 404;
    }
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        
        # PHPのタイムアウト設定
        fastcgi_read_timeout 300;
    }
}

# ===== MySQL最適化設定 =====
# /etc/mysql/mysql.conf.d/gmail-cleaner.cnf
[mysqld]
# メモリ設定（サーバースペックに応じて調整）
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
key_buffer_size = 64M
max_allowed_packet = 64M

# パフォーマンス設定
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
query_cache_size = 64M
query_cache_type = 1

# 接続設定
max_connections = 200
connect_timeout = 10
wait_timeout = 600
interactive_timeout = 600

# 文字セット
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

[client]
default-character-set = utf8mb4