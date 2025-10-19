<?php
// NAGANO-3 Yahoo Auction Common Functions (8080版)

function getCorrectionSettings() {
    return [
        'price_adjustment' => 1.0,
        'shipping_correction' => 0,
        'tax_rate' => 0.1
    ];
}

function formatPrice($price) {
    return number_format($price) . '円';
}

function sanitizeInput($input) {
    return htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
}

function logError($message, $context = []) {
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] $message");
}

function getDBConnection() {
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3";
        $pdo = new PDO($dsn, 'postgres', 'password123');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        error_log("DB接続エラー: " . $e->getMessage());
        return null;
    }
}
