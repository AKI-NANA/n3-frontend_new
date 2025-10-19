<?php
/**
 * Yahoo Auction Tool - システム動作確認テスト
 * 更新日: 2025-09-15
 */

echo "<!DOCTYPE html>\n<html>\n<head>\n<meta charset='UTF-8'>\n<title>Yahoo Auction Tool - システムテスト</title>\n";
echo "<style>body{font-family:Arial,sans-serif;margin:2rem;} .ok{color:green;} .error{color:red;} .warning{color:orange;}</style>\n</head>\n<body>\n";

echo "<h1>🔧 Yahoo Auction Tool - 最終動作確認テスト</h1>\n";
echo "<p><strong>テスト実行時刻:</strong> " . date('Y-m-d H:i:s') . "</p>\n";

// 1. ファイル存在確認
echo "<h2>📁 必要ファイル確認</h2>\n";
$requiredFiles = [
    'csv_handler.php' => __DIR__ . '/csv_handler.php',
    'database_query_handler.php' => __DIR__ . '/database_query_handler.php',
    'yahoo_auction_content.php' => __DIR__ . '/yahoo_auction_content.php'
];

foreach ($requiredFiles as $name => $path) {
    if (file_exists($path)) {
        echo "<p class='ok'>✅ $name - 存在確認</p>\n";
    } else {
        echo "<p class='error'>❌ $name - ファイルが見つかりません</p>\n";
    }
}

// 2. 関数読み込みテスト
echo "<h2>🔄 database_query_handler.php 読み込みテスト</h2>\n";
try {
    require_once __DIR__ . '/database_query_handler.php';
    echo "<p class='ok'>✅ database_query_handler.php 読み込み成功</p>\n";
} catch (Exception $e) {
    echo "<p class='error'>❌ 読み込みエラー: " . htmlspecialchars($e->getMessage()) . "</p>\n";
}

// 3. 関数存在確認
echo "<h2>📊 重要関数確認</h2>\n";
$requiredFunctions = [
    'getDatabaseConnection',
    'getDashboardStats', 
    'getApprovalQueueData',
    'searchProducts',
    'sendJsonResponse',
    'h'
];

foreach ($requiredFunctions as $func) {
    if (function_exists($func)) {
        echo "<p class='ok'>✅ $func() - 関数定義確認</p>\n";
    } else {
        echo "<p class='error'>❌ $func() - 関数が定義されていません</p>\n";
    }
}

// 4. データベース接続テスト
echo "<h2>🗄️ データベース接続テスト</h2>\n";
try {
    if (function_exists('getDatabaseConnection')) {
        $pdo = getDatabaseConnection();
        if ($pdo) {
            echo "<p class='ok'>✅ データベース接続成功</p>\n";
            
            // テーブル存在確認
            $tables = ['mystical_japan_treasures_inventory', 'yahoo_scraped_products', 'inventory_products'];
            foreach ($tables as $table) {
                try {
                    $sql = "SELECT COUNT(*) as count FROM $table LIMIT 1";
                    $stmt = $pdo->query($sql);
                    $result = $stmt->fetch();
                    echo "<p class='ok'>✅ テーブル $table: " . ($result['count'] ?? 0) . "件</p>\n";
                } catch (Exception $e) {
                    echo "<p class='warning'>⚠️ テーブル $table: 存在しないかアクセスできません</p>\n";
                }
            }
        } else {
            echo "<p class='error'>❌ データベース接続失敗</p>\n";
        }
    } else {
        echo "<p class='error'>❌ getDatabaseConnection関数が定義されていません</p>\n";
    }
} catch (Exception $e) {
    echo "<p class='error'>❌ データベース接続エラー: " . htmlspecialchars($e->getMessage()) . "</p>\n";
}

// 5. CSVハンドラーテスト
echo "<h2>📄 CSV処理機能テスト</h2>\n";
try {
    require_once __DIR__ . '/csv_handler.php';
    echo "<p class='ok'>✅ csv_handler.php 読み込み成功</p>\n";
    
    if (function_exists('getYahooRawDataForCSV')) {
        echo "<p class='ok'>✅ getYahooRawDataForCSV() 関数確認</p>\n";
    } else {
        echo "<p class='warning'>⚠️ getYahooRawDataForCSV() 関数が見つかりません</p>\n";
    }
} catch (Exception $e) {
    echo "<p class='error'>❌ CSV処理機能エラー: " . htmlspecialchars($e->getMessage()) . "</p>\n";
}

// 6. 最終判定
echo "<h2>🎯 最終判定</h2>\n";
$allFilesExist = array_reduce($requiredFiles, function($carry, $path) { return $carry && file_exists($path); }, true);
$allFunctionsExist = array_reduce($requiredFunctions, function($carry, $func) { return $carry && function_exists($func); }, true);

if ($allFilesExist && $allFunctionsExist) {
    echo "<p class='ok' style='font-size:1.2rem;'><strong>🎉 システム準備完了！Yahoo Auction Tool は正常に動作可能です。</strong></p>\n";
    echo "<p><a href='yahoo_auction_content.php' style='background:#28a745;color:white;padding:1rem 2rem;text-decoration:none;border-radius:5px;'>▶️ Yahoo Auction Tool を開く</a></p>\n";
} else {
    echo "<p class='error' style='font-size:1.2rem;'><strong>⚠️ 一部の機能に問題があります。上記のエラーを確認してください。</strong></p>\n";
}

echo "<hr><p><em>テスト完了時刻: " . date('Y-m-d H:i:s') . "</em></p>\n";
echo "</body></html>";
?>
