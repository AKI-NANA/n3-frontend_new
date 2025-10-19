<?php
/**
 * Yahoo Auction Tool - 設定ファイル
 * 作成日: 2025-09-15
 * 目的: 全システム共通設定
 */

// デバッグモード（本番環境では false に設定）
define('DEBUG_MODE', true);

// データベース設定
define('DB_HOST', 'localhost');
define('DB_PORT', '5432');
define('DB_NAME', 'nagano3_db');
define('DB_USER', 'aritahiroaki');
define('DB_PASS', '');

// アプリケーション設定
define('APP_NAME', 'Yahoo Auction Tool');
define('APP_VERSION', '2.0.0');
define('APP_URL', 'http://localhost:8080');

// ワークフロー定義
define('WORKFLOW_STEPS', [
    1 => 'スクレイピング',
    2 => '承認',
    3 => 'カテゴリ設定',
    4 => '計算',
    5 => 'フィルター',
    6 => '出品準備',
    7 => '出品実行',
    8 => '在庫管理'
]);

// ファイルアップロード設定
define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); // 5MB
define('UPLOAD_ALLOWED_TYPES', ['csv', 'json', 'txt']);
define('UPLOAD_PATH', __DIR__ . '/../uploads/');

// API設定
define('API_RATE_LIMIT', 100); // requests per minute
define('API_TIMEOUT', 30); // seconds

// セキュリティ設定
define('SESSION_LIFETIME', 3600); // 1時間
define('CSRF_TOKEN_LIFETIME', 1800); // 30分

// eBay設定（後で環境変数から読み込み）
define('EBAY_APP_ID', '');
define('EBAY_CERT_ID', '');
define('EBAY_DEV_ID', '');
define('EBAY_USER_TOKEN', '');

// ログ設定
define('LOG_LEVEL', 'info');
define('LOG_MAX_FILES', 10);
define('LOG_PATH', __DIR__ . '/../logs/');

// テンプレート設定
define('TEMPLATE_PATH', __DIR__ . '/../../../templates/');
define('N3_TEMPLATE_ENABLED', true);

// キャッシュ設定
define('CACHE_ENABLED', true);
define('CACHE_TTL', 300); // 5分
define('CACHE_PATH', __DIR__ . '/../cache/');

// メール設定（エラー通知用）
define('ERROR_EMAIL_ENABLED', false);
define('ERROR_EMAIL_TO', 'admin@example.com');
define('ERROR_EMAIL_FROM', 'system@yahoo-auction-tool.local');

// 国際化設定
define('DEFAULT_LOCALE', 'ja_JP');
define('DEFAULT_TIMEZONE', 'Asia/Tokyo');

// システム情報
define('SYSTEM_INFO', [
    'name' => APP_NAME,
    'version' => APP_VERSION,
    'description' => 'Yahoo→eBay統合ワークフローシステム',
    'author' => 'CAIDS Development Team',
    'created' => '2025-09-15',
    'updated' => '2025-09-15'
]);

// 本番環境チェック
if (!DEBUG_MODE) {
    // 本番環境設定
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    define('ERROR_REPORTING_LEVEL', E_ERROR | E_WARNING);
} else {
    // 開発環境設定
    ini_set('display_errors', 1);
    define('ERROR_REPORTING_LEVEL', E_ALL);
}

error_reporting(ERROR_REPORTING_LEVEL);

// タイムゾーン設定
date_default_timezone_set(DEFAULT_TIMEZONE);

// ディレクトリ作成（存在しない場合）
$directories = [
    UPLOAD_PATH,
    LOG_PATH,
    CACHE_PATH
];

foreach ($directories as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}
?>