<?php
/**
 * NAGANO-3 基本設定ファイル
 * CSS-only化対応・最小限設定
 */

// 直接アクセス防止
if (!defined('NAGANO3_SYSTEM')) {
    define('NAGANO3_SYSTEM', true);
}

// ===== 基本設定 =====
define('NAGANO3_VERSION', '3.0.0');
define('DEBUG_MODE', true); // 開発環境：true、本番環境：false
define('PRODUCTION_MODE', false);

// N3データベース設定読み込み
require_once(dirname(__FILE__) . '/../../modules/apikey/nagano3_db_config.php');

// ===== パス設定 =====
define('ROOT_PATH', dirname(__DIR__));
define('COMMON_PATH', ROOT_PATH . '/common');
define('CSS_PATH', COMMON_PATH . '/css');
define('JS_PATH', COMMON_PATH . '/js');
define('TEMPLATES_PATH', COMMON_PATH . '/templates');

// ===== セッション設定 =====
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ===== エラー報告設定 =====
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('log_errors', 1);
    ini_set('error_log', ROOT_PATH . '/logs/php_errors.log');
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// ===== タイムゾーン設定 =====
date_default_timezone_set('Asia/Tokyo');

// ===== 文字エンコーディング設定 =====
mb_internal_encoding('UTF-8');

// ===== セキュリティ設定 =====
// CSRF トークン生成
function generate_csrf_token() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

// CSRF トークン検証
function verify_csrf_token($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// 文字列サニタイズ
function sanitize_string($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

// XSS防止
function escape_html($input) {
    return htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
}

// ===== ページ設定 =====
// 許可されたページ一覧
$ALLOWED_PAGES = [
    'dashboard',
    'kicho_content',
    'asin_upload_content',
    'shohin_content',
    'zaiko_content',
    'juchu_content',
    'ai_content',
    'settings_content',
    'manual_content',
    'coming_soon'
];

// ページタイトル設定
$PAGE_TITLES = [
    'dashboard' => 'ダッシュボード',
    'kicho_content' => '記帳管理',
    'asin_upload_content' => 'ASIN登録',
    'shohin_content' => '商品管理',
    'zaiko_content' => '在庫管理',
    'juchu_content' => '受注管理',
    'ai_content' => 'AI分析',
    'settings_content' => '設定',
    'manual_content' => 'マニュアル',
    'coming_soon' => '準備中'
];

// ページ固有CSS設定
$PAGE_CSS_MAP = [
    'dashboard' => 'pages/dashboard.css',
    'kicho_content' => '../kicho/kicho.css',
    'asin_upload_content' => '../asin_upload/asin_upload.css',
    'shohin_content' => 'pages/shohin.css',
    'zaiko_content' => 'pages/zaiko.css',
    'juchu_content' => 'pages/juchu.css',
    'ai_content' => 'pages/ai.css',
    'settings_content' => 'pages/settings.css',
    'manual_content' => 'pages/manual.css',
    'coming_soon' => null // templates/templates_coming_soon.css が自動読み込み
];

// ページ固有JavaScript設定
$PAGE_JS_MAP = [
    'dashboard' => 'dashboard/dashboard.js',
    'kicho_content' => 'kicho/kicho.js',
    'asin_upload_content' => 'asin_upload/asin_upload.js',
    'shohin_content' => 'shohin/shohin.js',
    'zaiko_content' => 'zaiko/zaiko.js',
    'juchu_content' => 'juchu/juchu.js',
    'ai_content' => 'ai/ai.js',
    'settings_content' => 'settings/settings.js',
    'manual_content' => 'manual/manual.js'
];

// ===== ユーザー設定 =====
// デフォルトテーマ
if (!isset($_SESSION['user_theme'])) {
    $_SESSION['user_theme'] = 'light';
}

// デフォルトサイドバー状態
if (!isset($_SESSION['sidebar_state'])) {
    $_SESSION['sidebar_state'] = 'expanded';
}

// ===== データベース設定（将来用） =====
// 本番環境では環境変数から取得することを推奨
$DATABASE_CONFIG = [
    'host' => 'localhost',
    'port' => 5432,
    'dbname' => 'nagano3',
    'username' => 'nagano3_user',
    'password' => 'your_password_here',
    'charset' => 'utf8'
];

// ===== ファイルアップロード設定 =====
$UPLOAD_CONFIG = [
    'max_file_size' => 10 * 1024 * 1024, // 10MB
    'allowed_extensions' => ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'xlsx', 'csv'],
    'upload_dir' => ROOT_PATH . '/uploads/',
    'temp_dir' => ROOT_PATH . '/temp/'
];

// ===== ログ設定 =====
$LOG_CONFIG = [
    'log_dir' => ROOT_PATH . '/logs/',
    'max_log_size' => 10 * 1024 * 1024, // 10MB
    'log_rotation' => true,
    'log_level' => DEBUG_MODE ? 'DEBUG' : 'ERROR'
];

// ===== キャッシュ設定 =====
$CACHE_CONFIG = [
    'enabled' => !DEBUG_MODE,
    'cache_dir' => ROOT_PATH . '/cache/',
    'default_ttl' => 3600, // 1時間
    'css_cache_ttl' => 86400, // 24時間
    'js_cache_ttl' => 86400 // 24時間
];

// ===== CSS-only化設定 =====
$CSS_ONLY_CONFIG = [
    'bootstrap_cdn_enabled' => false, // Phase 1完了後はfalse
    'minimal_js_enabled' => true,
    'css_only_controls' => true,
    'performance_mode' => true
];

// ===== 簡単なログ記録関数 =====
function write_log($message, $level = 'INFO') {
    if (!DEBUG_MODE && $level === 'DEBUG') {
        return;
    }
    
    $log_dir = ROOT_PATH . '/logs';
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }
    
    $log_file = $log_dir . '/nagano3_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    
    error_log($log_entry, 3, $log_file);
}

// ===== 簡単なファイル存在確認関数 =====
function check_required_files() {
    $required_files = [
        COMMON_PATH . '/css/style.css',
        COMMON_PATH . '/js/minimal-core.js',
        TEMPLATES_PATH . '/header.php',
        TEMPLATES_PATH . '/sidebar.php',
        TEMPLATES_PATH . '/footer.php'
    ];
    
    $missing_files = [];
    foreach ($required_files as $file) {
        if (!file_exists($file)) {
            $missing_files[] = $file;
        }
    }
    
    if (!empty($missing_files)) {
        write_log('必須ファイルが見つかりません: ' . implode(', ', $missing_files), 'ERROR');
        return false;
    }
    
    return true;
}

// ===== ディレクトリ作成関数 =====
function ensure_directories() {
    $required_dirs = [
        ROOT_PATH . '/logs',
        ROOT_PATH . '/cache',
        ROOT_PATH . '/uploads',
        ROOT_PATH . '/temp'
    ];
    
    foreach ($required_dirs as $dir) {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
            write_log("ディレクトリを作成しました: {$dir}", 'INFO');
        }
    }
}

// ===== 初期化処理 =====
function initialize_nagano3() {
    // 必要ディレクトリの作成
    ensure_directories();
    
    // CSRFトークン生成
    generate_csrf_token();
    
    // 必須ファイル確認
    if (!check_required_files()) {
        write_log('NAGANO-3初期化中に必須ファイルの不足を検出', 'WARNING');
    }
    
    write_log('NAGANO-3システム初期化完了', 'INFO');
    return true;
}

// ===== システム初期化実行 =====
if (!defined('SKIP_INITIALIZATION')) {
    initialize_nagano3();
}

// ===== グローバル変数設定 =====
$GLOBALS['nagano3_config'] = [
    'version' => NAGANO3_VERSION,
    'debug_mode' => DEBUG_MODE,
    'csrf_token' => generate_csrf_token(),
    'user_theme' => $_SESSION['user_theme'] ?? 'light',
    'sidebar_state' => $_SESSION['sidebar_state'] ?? 'expanded',
    'css_only_enabled' => true,
    'bootstrap_enabled' => $CSS_ONLY_CONFIG['bootstrap_cdn_enabled']
];

// デバッグ情報出力（開発環境のみ）
if (DEBUG_MODE) {
    write_log('設定ファイル読み込み完了 - デバッグモード有効', 'DEBUG');
}
?>