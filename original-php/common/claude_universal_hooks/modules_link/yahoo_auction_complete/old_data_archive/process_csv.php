<?php
// modules/ebay_category_system/backend/api/process_csv.php

require_once dirname(dirname(dirname(dirname(__FILE__)))) . '/yahoo_auction_content.php';
require_once '../CSVProcessor.php';
require_once '../CategoryDetector.php';
require_once '../ItemSpecificsGenerator.php';

try {
    // データベース接続設定 (必要に応じて変更)
    $dsn = 'pgsql:host=localhost;port=5432;dbname=nagano3_db';
    $user = 'your_username';
    $password = 'your_password';
    $pdo = new PDO($dsn, $user, $password);

    if (!isset($_FILES['csv_file'])) {
        sendJsonResponse(null, false, 'No file uploaded.');
    }

    $csvFile = $_FILES['csv_file'];
    $tempFilePath = $csvFile['tmp_name'];

    $csvProcessor = new CSVProcessor($pdo);
    $processingResult = $csvProcessor->processBulkCSV($tempFilePath);

    if (!$processingResult['success']) {
        sendJsonResponse(null, false, $processingResult['message']);
    }

    $outputCsvPath = $csvProcessor->generateOutputCSV($processingResult['results']);
    if (!$outputCsvPath) {
        sendJsonResponse(null, false, 'Failed to generate output CSV.');
    }

    $downloadUrl = '/downloads/' . basename($outputCsvPath);

    sendJsonResponse([
        'processed_count' => $processingResult['processed_count'],
        'results' => $processingResult['results'],
        'csv_download_url' => $downloadUrl
    ], true, 'CSV processed successfully.');

} catch (PDOException $e) {
    sendJsonResponse(null, false, 'Database error: ' . $e->getMessage());
} catch (Exception $e) {
    sendJsonResponse(null, false, 'An unexpected error occurred: ' . $e->getMessage());
}