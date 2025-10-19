<?php
/**
 * Yahoo Auction Tool 表示問題診断スクリプト
 * 表示されない原因を特定します
 */

echo "<!DOCTYPE html>\n";
echo "<html><head><meta charset='UTF-8'><title>表示問題診断</title></head><body>\n";

echo "<h1>🔍 Yahoo Auction Tool 表示問題診断</h1>\n";

// 1. PHP動作確認
echo "<h2>1. PHP動作確認</h2>\n";
echo "<p>✅ PHP正常動作中 - バージョン: " . PHP_VERSION . "</p>\n";

// 2. ファイル存在確認
echo "<h2>2. ファイル存在確認</h2>\n";
$files_to_check = [
    'content_php/yahoo_auction_tool_content.php',
    'content_php/yahoo_auction_tool_content_0911.php',
    'yahoo_auction_content.php',
    'js/yahoo_auction_tool_content.js',
    'css/yahoo_auction_tool_content.css',
    'config.php',
    'database_query_handler.php'
];

foreach ($files_to_check as $file) {
    if (file_exists(__DIR__ . '/' . $file)) {
        echo "<p>✅ $file - 存在します</p>\n";
    } else {
        echo "<p>❌ $file - 見つかりません</p>\n";
    }
}

// 3. ディレクトリ構造確認
echo "<h2>3. ディレクトリ構造</h2>\n";
echo "<pre>\n";
$directory = __DIR__;
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory));
$files = [];
foreach ($iterator as $file) {
    if ($file->isFile() && !$file->getFilename() === '.DS_Store') {
        $relativePath = str_replace($directory . '/', '', $file->getPathname());
        $files[] = $relativePath;
    }
}
sort($files);
foreach (array_slice($files, 0, 20) as $file) { // 最初の20ファイルのみ表示
    echo htmlspecialchars($file) . "\n";
}
if (count($files) > 20) {
    echo "... その他 " . (count($files) - 20) . " ファイル\n";
}
echo "</pre>\n";

// 4. Webサーバー確認
echo "<h2>4. Webサーバー確認</h2>\n";
echo "<p>サーバー: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Unknown') . "</p>\n";
echo "<p>ドキュメントルート: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'Unknown') . "</p>\n";
echo "<p>現在のスクリプト: " . $_SERVER['SCRIPT_NAME'] . "</p>\n";

// 5. エラーログ確認
echo "<h2>5. エラー設定確認</h2>\n";
echo "<p>エラー表示: " . (ini_get('display_errors') ? '有効' : '無効') . "</p>\n";
echo "<p>エラーレポート: " . error_reporting() . "</p>\n";

// 6. URL確認
echo "<h2>6. 正しいアクセスURL</h2>\n";
$base_url = 'http://localhost:8080/modules/yahoo_auction_complete';
echo "<ul>\n";
echo "<li><a href='$base_url/content_php/yahoo_auction_tool_content.php'>メインファイル (content_php/)</a></li>\n";
echo "<li><a href='$base_url/content_php/yahoo_auction_tool_content_0911.php'>最新ファイル (0911版)</a></li>\n";
echo "<li><a href='$base_url/yahoo_auction_content.php'>代替ファイル</a></li>\n";
echo "</ul>\n";

// 7. メモリ・リソース確認
echo "<h2>7. リソース確認</h2>\n";
echo "<p>メモリ使用量: " . memory_get_usage(true) . " bytes</p>\n";
echo "<p>最大実行時間: " . ini_get('max_execution_time') . " 秒</p>\n";

// 8. データベース接続テスト
echo "<h2>8. データベース接続テスト</h2>\n";
try {
    // PostgreSQL接続情報（環境に合わせて調整）
    $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
    $username = "postgres";
    $password = "password"; // 実際のパスワードに変更
    
    $pdo = new PDO($dsn, $username, $password);
    echo "<p>✅ データベース接続成功</p>\n";
} catch (PDOException $e) {
    echo "<p>❌ データベース接続失敗: " . htmlspecialchars($e->getMessage()) . "</p>\n";
}

// 9. 推奨解決策
echo "<h2>9. 推奨解決策</h2>\n";
echo "<div style='background: #f0f8ff; padding: 15px; border-left: 4px solid #0066cc;'>\n";
echo "<h3>🎯 解決手順:</h3>\n";
echo "<ol>\n";
echo "<li><strong>正しいURL使用:</strong><br><code>http://localhost:8080/modules/yahoo_auction_complete/content_php/yahoo_auction_tool_content.php</code></li>\n";
echo "<li><strong>Webサーバー確認:</strong><br>ポート8080でサーバーが起動しているか確認</li>\n";
echo "<li><strong>ファイル権限確認:</strong><br>PHPファイルに適切な読み取り権限があるか確認</li>\n";
echo "<li><strong>エラーログ確認:</strong><br>Webサーバーのエラーログを確認</li>\n";
echo "</ol>\n";
echo "</div>\n";

// 10. 簡単テスト
echo "<h2>10. 簡単表示テスト</h2>\n";
echo "<div style='background: #e6ffe6; padding: 15px; border: 1px solid #00cc00;'>\n";
echo "<h3>✅ PHP処理正常</h3>\n";
echo "<p>現在時刻: " . date('Y-m-d H:i:s') . "</p>\n";
echo "<p>このメッセージが表示されていれば、PHPは正常に動作しています。</p>\n";
echo "</div>\n";

echo "</body></html>";
?>
