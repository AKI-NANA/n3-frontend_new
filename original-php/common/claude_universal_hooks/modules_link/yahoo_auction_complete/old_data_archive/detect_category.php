<?php
// modules/ebay_category_system/backend/api/detect_category.php

// 既存のシステムファイルから必要な関数を読み込み
require_once dirname(dirname(dirname(dirname(__FILE__)))) . '/yahoo_auction_content.php';
require_once '../CategoryDetector.php';
require_once '../ItemSpecificsGenerator.php';

try {
    // データベース接続設定 (必要に応じて変更)
    $dsn = 'pgsql:host=localhost;port=5432;dbname=nagano3_db';
    $user = 'your_username';
    $password = 'your_password';
    $pdo = new PDO($dsn, $user, $password);

    // POSTリクエストのJSONデータを取得
    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(null, false, 'Invalid JSON input.');
    }

    $productData = [
        'title' => $input['title'] ?? '',
        'price' => $input['price'] ?? 0,
        'description' => $input['description'] ?? ''
    ];

    $categoryDetector = new CategoryDetector($pdo);
    $detectionResult = $categoryDetector->detectCategory($productData);
    
    $itemSpecificsGenerator = new ItemSpecificsGenerator($pdo);
    $itemSpecificsString = $itemSpecificsGenerator->generateItemSpecificsString($detectionResult['category_id']);

    $detectionResult['item_specifics'] = $itemSpecificsString;
    
    sendJsonResponse($detectionResult, true, 'Category detected successfully.');

} catch (PDOException $e) {
    sendJsonResponse(null, false, 'Database error: ' . $e->getMessage());
} catch (Exception $e) {
    sendJsonResponse(null, false, 'An unexpected error occurred: ' . $e->getMessage());
}