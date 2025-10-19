<?php
/**
 * Yahoo Auction Tool - 利益計算システム完全版
 * データベース設定修正版
 */

// 正しいデータベース接続設定
$host = 'localhost';
$dbname = 'nagano3_db';  // 正しいデータベース名
$username = 'postgres';   // 正しいユーザー名
$password = 'Kn240914';   // 正しいパスワード

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die('データベース接続エラー: ' . $e->getMessage());
}

// 以下は元のコードと同じ...
?>