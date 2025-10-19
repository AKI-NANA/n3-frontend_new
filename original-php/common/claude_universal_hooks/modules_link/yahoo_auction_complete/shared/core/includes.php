<?php
/**
 * インクルード管理ファイル（関数重複回避版）
 */

// エラーハンドリング設定
error_reporting(E_ALL);
ini_set('log_errors', 1);

// デバッグモード確認
$debug_mode = isset($_GET['debug']) || isset($_POST['debug']);

if ($debug_mode) {
    error_log("=== includes.php 読み込み開始 ===");
}

// 設定ファイル読み込み
try {
    require_once __DIR__ . '/config.php';
    if ($debug_mode) error_log("✅ config.php 読み込み完了");
} catch (Error $e) {
    error_log("❌ config.php エラー: " . $e->getMessage());
}

// 共通関数読み込み（エラーハンドリング付き）
try {
    require_once __DIR__ . '/common_functions.php';
    if ($debug_mode) error_log("✅ common_functions.php 読み込み完了");
} catch (Error $e) {
    // 関数重複エラーの場合は継続（ログに記録のみ）
    if (strpos($e->getMessage(), 'Cannot redeclare function') !== false) {
        error_log("⚠️ 関数重複検出（継続）: " . $e->getMessage());
    } else {
        error_log("❌ common_functions.php エラー: " . $e->getMessage());
    }
}

// データベースハンドラー読み込み（エラーハンドリング付き）
try {
    require_once __DIR__ . '/database_query_handler.php';
    if ($debug_mode) error_log("✅ database_query_handler.php 読み込み完了");
} catch (Error $e) {
    // 関数重複エラーの場合は継続（ログに記録のみ）
    if (strpos($e->getMessage(), 'Cannot redeclare function') !== false) {
        error_log("⚠️ 関数重複検出（継続）: " . $e->getMessage());
    } else {
        error_log("❌ database_query_handler.php エラー: " . $e->getMessage());
    }
}

// 関数定義状況確認
if ($debug_mode) {
    $functions = ['getDatabaseConnection', 'getDashboardStats', 'getApprovalQueueData', 'searchProducts'];
    foreach ($functions as $func) {
        $status = function_exists($func) ? '✅' : '❌';
        error_log("{$status} {$func}()");
    }
    error_log("=== includes.php 読み込み完了 ===");
}
