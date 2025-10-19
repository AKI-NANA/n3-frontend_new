<?php
// PHP エラーデバッグ専用ファイル
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

echo "<!DOCTYPE html><html><head><title>PHP Debug</title></head><body>";
echo "<h1>PHP デバッグ情報</h1>";

// PHP基本情報
echo "<h2>PHP 基本情報</h2>";
echo "<p>PHP Version: " . phpversion() . "</p>";
echo "<p>Current Directory: " . __DIR__ . "</p>";
echo "<p>Script: " . __FILE__ . "</p>";

// ファイル存在確認
echo "<h2>ファイル存在確認</h2>";
$files_to_check = [
    '../shared/core/includes.php',
    '../shared/core/common_functions.php', 
    '../../../database_query_handler.php',
    '../../css/yahoo_auction_tool_content.css',
    '../../css/yahoo_auction_system.css'
];

foreach ($files_to_check as $file) {
    $exists = file_exists($file);
    $realpath = $exists ? realpath($file) : 'N/A';
    echo "<p><strong>{$file}</strong>: " . ($exists ? '✅ 存在' : '❌ 存在しない') . " ({$realpath})</p>";
}

// ディレクトリ構造確認
echo "<h2>ディレクトリ構造</h2>";
echo "<h3>現在のディレクトリ:</h3>";
$current_dir = __DIR__;
if (is_dir($current_dir)) {
    $files = scandir($current_dir);
    echo "<ul>";
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            $type = is_dir($current_dir . '/' . $file) ? '[DIR]' : '[FILE]';
            echo "<li>{$type} {$file}</li>";
        }
    }
    echo "</ul>";
}

// 親ディレクトリ確認
echo "<h3>親ディレクトリ (../shared/core/):</h3>";
$parent_dir = $current_dir . '/../shared/core';
if (is_dir($parent_dir)) {
    $files = scandir($parent_dir);
    echo "<ul>";
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            $type = is_dir($parent_dir . '/' . $file) ? '[DIR]' : '[FILE]';
            echo "<li>{$type} {$file}</li>";
        }
    }
    echo "</ul>";
} else {
    echo "<p>❌ ディレクトリが存在しません: {$parent_dir}</p>";
}

// メモリ・設定情報
echo "<h2>PHP 設定</h2>";
echo "<p>Memory Limit: " . ini_get('memory_limit') . "</p>";
echo "<p>Max Execution Time: " . ini_get('max_execution_time') . "</p>";
echo "<p>Error Reporting: " . ini_get('error_reporting') . "</p>";
echo "<p>Display Errors: " . ini_get('display_errors') . "</p>";

// 簡単な関数テスト
echo "<h2>関数定義テスト</h2>";
function testFunction() {
    return "テスト関数が正常に動作しています";
}

try {
    echo "<p>✅ " . testFunction() . "</p>";
} catch (Exception $e) {
    echo "<p>❌ 関数エラー: " . $e->getMessage() . "</p>";
}

// JSON関数テスト
echo "<h2>JSON関数テスト</h2>";
$test_data = ['test' => 'データ', 'number' => 123];
try {
    $json_output = json_encode($test_data, JSON_UNESCAPED_UNICODE);
    echo "<p>✅ JSON エンコード成功: " . $json_output . "</p>";
} catch (Exception $e) {
    echo "<p>❌ JSON エラー: " . $e->getMessage() . "</p>";
}

echo "</body></html>";
?>
