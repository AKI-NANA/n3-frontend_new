<?php
/**
 * 共通設定ファイル
 * データベース接続・環境設定
 */

// エラー表示設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// データベース設定
define('DB_HOST', 'localhost');
define('DB_PORT', '5432');
define('DB_NAME', 'nagano3_db');
define('DB_USER', 'aritahiroaki');
define('DB_PASSWORD', '');

// タイムゾーン設定
date_default_timezone_set('Asia/Tokyo');

// セッション開始
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
