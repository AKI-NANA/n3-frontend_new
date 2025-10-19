<?php
/**
 * セッション認証ガード - 全view_*.phpの先頭で読み込み
 * ログインしていないユーザーをlogin.phpにリダイレクト
 */
session_start();
require_once __DIR__ . '/../Authentication.php';

// 現在のユーザー取得
$current_user = Authentication::getCurrentUser();

// ログインしていない場合はlogin.phpにリダイレクト
if (!$current_user) {
    header('Location: /login.php');
    exit;
}

// グローバル変数として利用可能にする
$GLOBALS['current_user'] = $current_user;
?>