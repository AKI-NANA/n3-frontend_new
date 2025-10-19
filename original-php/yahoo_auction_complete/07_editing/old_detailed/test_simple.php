<?php
/**
 * 簡易テストページ - HTTP 500エラー修復用
 */

// エラー表示を有効にして問題を特定
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>";
echo "<html><head><title>Simple Test</title></head><body>";
echo "<h1>PHP Test Page</h1>";
echo "<p>Current Time: " . date('Y-m-d H:i:s') . "</p>";
echo "<p>PHP Version: " . phpversion() . "</p>";

// パス確認
echo "<h2>Path Information</h2>";
echo "<p>Current Directory: " . __DIR__ . "</p>";
echo "<p>Script Name: " . __FILE__ . "</p>";

// 必要なファイル存在確認
$includes_path = '../shared/core/includes.php';
echo "<h2>File Check</h2>";
echo "<p>includes.php exists: " . (file_exists($includes_path) ? "YES" : "NO") . "</p>";
echo "<p>includes.php path: " . realpath($includes_path) . "</p>";

// 基本的なサンプルデータ生成テスト
function generateTestData() {
    return [
        [
            'id' => 'TEST-001',
            'item_id' => 'test123',
            'title' => 'テスト商品1',
            'price' => '1000',
            'current_price' => '1000',
            'category_name' => 'テストカテゴリ',
            'condition_name' => '新品',
            'picture_url' => 'https://via.placeholder.com/150',
            'source_url' => 'http://example.com/test1',
            'updated_at' => date('Y-m-d H:i:s'),
            'platform' => 'Test',
            'master_sku' => 'TEST-SKU-001'
        ]
    ];
}

$testData = generateTestData();
echo "<h2>Sample Data Test</h2>";
echo "<pre>" . print_r($testData, true) . "</pre>";

echo "</body></html>";
?>
