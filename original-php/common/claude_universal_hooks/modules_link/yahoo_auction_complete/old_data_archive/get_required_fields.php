<?php
// modules/ebay_category_system/backend/api/get_required_fields.php

// 既存のシステムファイルから必要な関数を読み込み
require_once dirname(dirname(dirname(dirname(__FILE__)))) . '/yahoo_auction_content.php';
require_once '../ItemSpecificsGenerator.php';

try {
    // データベース接続設定 (必要に応じて変更)
    $dsn = 'pgsql:host=localhost;port=5432;dbname=nagano3_db';
    $user = 'your_username';
    $password = 'your_password';
    $pdo = new PDO($dsn, $user, $password);
    
    $categoryId = $_GET['category_id'] ?? null;

    if (!$categoryId) {
        sendJsonResponse(null, false, 'category_id is required.');
    }

    $itemSpecificsGenerator = new ItemSpecificsGenerator($pdo);
    $fields = $itemSpecificsGenerator->getRequiredFields($categoryId);

    sendJsonResponse(['fields' => $fields], true);

} catch (PDOException $e) {
    sendJsonResponse(null, false, 'Database error: ' . $e->getMessage());
} catch (Exception $e) {
    sendJsonResponse(null, false, 'An unexpected error occurred: ' . $e->getMessage());
}