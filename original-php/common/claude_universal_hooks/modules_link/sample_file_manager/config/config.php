<?php
/**
 * 📁 ファイルマネージャー 設定ファイル
 * Claude Hooks PHP統合 - セキュリティ重視設計
 */

// エラー報告設定
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/error.log');

// タイムゾーン設定
date_default_timezone_set('Asia/Tokyo');

// セッション設定
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.use_strict_mode', 1);
session_start();

// データベース設定
define('DB_HOST', 'localhost');
define('DB_NAME', 'claude_hooks_integrated');
define('DB_USER', 'postgres');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8');

// ファイル・アップロード設定
define('UPLOAD_DIR', dirname(__DIR__) . '/uploads/');
define('MAX_FILE_SIZE', 50 * 1024 * 1024); // 50MB
define('MAX_FILES_PER_REQUEST', 10);
define('ALLOWED_EXTENSIONS', [
    // 画像
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
    // 文書
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'pages',
    // 動画
    'mp4', 'avi', 'mov', 'wmv', 'mkv', 'flv', 'webm',
    // 音声
    'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a',
    // アーカイブ
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
    // コード
    'js', 'css', 'html', 'php', 'py', 'java', 'cpp', 'c',
    // データ
    'json', 'xml', 'csv', 'xlsx', 'xls', 'sql'
]);

// セキュリティ設定
define('CSRF_TOKEN_EXPIRY', 3600); // 1時間
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_TIME', 900); // 15分
define('SECURE_KEY', 'your-secure-key-here-change-this');

// レート制限設定
define('RATE_LIMIT_UPLOADS', 100); // 1時間あたりのアップロード数
define('RATE_LIMIT_DOWNLOADS', 500); // 1時間あたりのダウンロード数

/**
 * データベース接続取得
 * @return PDO
 * @throws Exception
 */
function getDBConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = "pgsql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => false
            ];
            
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("データベース接続エラー: " . $e->getMessage());
            throw new Exception("データベース接続に失敗しました");
        }
    }
    
    return $pdo;
}

/**
 * CSRF トークン生成
 * @return string
 */
function generateCSRFToken() {
    if (!isset($_SESSION['csrf_token']) || 
        !isset($_SESSION['csrf_token_expiry']) || 
        time() > $_SESSION['csrf_token_expiry']) {
        
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['csrf_token_expiry'] = time() + CSRF_TOKEN_EXPIRY;
    }
    
    return $_SESSION['csrf_token'];
}

/**
 * CSRF トークン検証
 * @param string $token
 * @return bool
 */
function validateCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && 
           isset($_SESSION['csrf_token_expiry']) &&
           time() <= $_SESSION['csrf_token_expiry'] && 
           hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * ファイル拡張子チェック
 * @param string $filename
 * @return bool
 */
function isAllowedExtension($filename) {
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return in_array($ext, ALLOWED_EXTENSIONS);
}

/**
 * ファイル名サニタイズ
 * @param string $filename
 * @return string
 */
function sanitizeFilename($filename) {
    // 危険な文字を除去
    $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
    
    // 先頭のドットを除去（隠しファイル防止）
    $filename = ltrim($filename, '.');
    
    // 長すぎるファイル名を短縮
    if (strlen($filename) > 100) {
        $ext = pathinfo($filename, PATHINFO_EXTENSION);
        $name = substr(pathinfo($filename, PATHINFO_FILENAME), 0, 95);
        $filename = $name . '.' . $ext;
    }
    
    return $filename;
}

/**
 * ファイルタイプ検証
 * @param string $filepath
 * @param string $originalName
 * @return bool
 */
function validateFileType($filepath, $originalName) {
    // MIME タイプチェック
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $filepath);
    finfo_close($finfo);
    
    // 拡張子とMIMEタイプの整合性チェック
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    
    $mimeMap = [
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png' => ['image/png'],
        'gif' => ['image/gif'],
        'pdf' => ['application/pdf'],
        'txt' => ['text/plain'],
        'mp4' => ['video/mp4'],
        'mp3' => ['audio/mpeg'],
        'zip' => ['application/zip'],
        'js' => ['text/javascript', 'application/javascript'],
        'css' => ['text/css'],
        'html' => ['text/html'],
        'php' => ['text/x-php', 'application/x-php']
    ];
    
    if (isset($mimeMap[$ext])) {
        return in_array($mimeType, $mimeMap[$ext]);
    }
    
    return false;
}

/**
 * XSS防止用HTMLエスケープ
 * @param string $str
 * @return string
 */
function h($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

/**
 * JSON レスポンス送信
 * @param mixed $data
 * @param int $status
 */
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * エラーレスポンス送信
 * @param string $message
 * @param int $status
 * @param string $details
 */
function errorResponse($message, $status = 400, $details = null) {
    $response = [
        'success' => false,
        'error' => $message,
        'timestamp' => date('c')
    ];
    
    if ($details && defined('DEBUG') && DEBUG) {
        $response['details'] = $details;
    }
    
    jsonResponse($response, $status);
}

/**
 * 成功レスポンス送信
 * @param mixed $data
 * @param string $message
 */
function successResponse($data = null, $message = 'Success') {
    $response = [
        'success' => true,
        'message' => $message,
        'timestamp' => date('c')
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    jsonResponse($response);
}

/**
 * レート制限チェック
 * @param string $action
 * @param int $limit
 * @return bool
 */
function checkRateLimit($action, $limit) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = $action . '_' . $ip . '_' . date('YmdH');
    
    if (!isset($_SESSION['rate_limits'])) {
        $_SESSION['rate_limits'] = [];
    }
    
    $current = $_SESSION['rate_limits'][$key] ?? 0;
    
    if ($current >= $limit) {
        return false;
    }
    
    $_SESSION['rate_limits'][$key] = $current + 1;
    return true;
}

/**
 * ログ記録
 * @param string $message
 * @param string $level
 */
function logMessage($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $logEntry = "[$timestamp] [$level] [$ip] $message" . PHP_EOL;
    
    $logFile = dirname(__DIR__) . '/logs/app.log';
    @mkdir(dirname($logFile), 0755, true);
    @file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

/**
 * ディレクトリ作成（安全）
 * @param string $path
 * @return bool
 */
function createDirectorySafe($path) {
    if (!is_dir($path)) {
        return @mkdir($path, 0755, true);
    }
    return true;
}

/**
 * ファイルアクセス権限設定
 * @param string $filepath
 */
function setSecureFilePermissions($filepath) {
    @chmod($filepath, 0644);
}

/**
 * 重複ファイル名回避
 * @param string $directory
 * @param string $filename
 * @return string
 */
function getUniqueFilename($directory, $filename) {
    $originalName = $filename;
    $counter = 1;
    
    while (file_exists($directory . $filename)) {
        $pathInfo = pathinfo($originalName);
        $name = $pathInfo['filename'];
        $ext = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';
        $filename = $name . '_' . $counter . $ext;
        $counter++;
    }
    
    return $filename;
}

/**
 * ファイルサイズフォーマット
 * @param int $bytes
 * @return string
 */
function formatFileSize($bytes) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $factor = floor((strlen($bytes) - 1) / 3);
    return sprintf("%.1f %s", $bytes / pow(1024, $factor), $units[$factor]);
}

// アップロードディレクトリ作成
if (!createDirectorySafe(UPLOAD_DIR)) {
    error_log("アップロードディレクトリの作成に失敗: " . UPLOAD_DIR);
}

// .htaccess ファイル作成（セキュリティ強化）
$htaccessPath = UPLOAD_DIR . '.htaccess';
if (!file_exists($htaccessPath)) {
    $htaccessContent = "# Claude Hooks ファイルマネージャー セキュリティ設定\n";
    $htaccessContent .= "Options -Indexes\n";
    $htaccessContent .= "Options -ExecCGI\n";
    $htaccessContent .= "<FilesMatch \"\\.(php|phtml|php3|php4|php5|pl|py|jsp|asp|sh|cgi|exe)$\">\n";
    $htaccessContent .= "    Require all denied\n";
    $htaccessContent .= "</FilesMatch>\n";
    
    @file_put_contents($htaccessPath, $htaccessContent);
}

logMessage("ファイルマネージャー設定初期化完了");
?>
