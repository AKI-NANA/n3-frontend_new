<?php
/**
 * データベース設定ファイル
 * ファイル: shared/config/database.php
 */

// データベース接続設定
define('DB_HOST', 'localhost');
define('DB_PORT', '5432');
define('DB_NAME', 'yahoo_auction_system');
define('DB_USER', 'your_db_user');
define('DB_PASSWORD', 'your_db_password');

// 接続オプション
define('DB_CHARSET', 'utf8');
define('DB_TIMEZONE', 'Asia/Tokyo');

// デバッグモード
define('DEBUG_MODE', true);

// セッション設定
define('SESSION_NAME', 'yahoo_auction_session');
define('SESSION_LIFETIME', 3600); // 1時間

// CSRF設定
define('CSRF_TOKEN_NAME', 'csrf_token');
define('CSRF_TOKEN_LIFETIME', 1800); // 30分
?>