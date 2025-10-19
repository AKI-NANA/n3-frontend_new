<?php
/**
 * Yahoo Auction Tool - エラー診断版
 * 元のファイルの問題を段階的に特定
 */

// エラー表示を有効にして詳細な情報を取得
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

echo "<h2>Yahoo Auction Tool - エラー診断</h2>";

// Step 1: 基本PHP確認
echo "<h3>Step 1: PHP基本確認</h3>";
echo "✅ PHP Version: " . PHP_VERSION . "<br>";
echo "✅ 現在時刻: " . date('Y-m-d H:i:s') . "<br>";

// Step 2: 必要ファイルの存在確認
echo "<h3>Step 2: 必要ファイル存在確認</h3>";

$requiredFiles = [
    'database_query_handler.php',
    'css/yahoo_auction_tool_content.css',
    'js/yahoo_auction_tool_complete.js'
];

foreach ($requiredFiles as $file) {
    if (file_exists(__DIR__ . '/' . $file)) {
        echo "✅ $file - 存在<br>";
    } else {
        echo "❌ $file - 不存在<br>";
    }
}

// Step 3: データベース接続テスト
echo "<h3>Step 3: データベース接続テスト</h3>";
try {
    require_once __DIR__ . '/database_query_handler.php';
    echo "✅ database_query_handler.php 読み込み成功<br>";
    
    $stats = getDashboardStats();
    if ($stats) {
        echo "✅ getDashboardStats() 実行成功<br>";
        echo "　総レコード数: " . ($stats['total_records'] ?? 'N/A') . "<br>";
        echo "　スクレイピング数: " . ($stats['scraped_count'] ?? 'N/A') . "<br>";
    } else {
        echo "⚠️ getDashboardStats() データ取得失敗<br>";
    }
    
} catch (Exception $e) {
    echo "❌ データベースハンドラーエラー: " . $e->getMessage() . "<br>";
}

// Step 4: セッション機能テスト
echo "<h3>Step 4: セッション機能テスト</h3>";
try {
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
        echo "✅ セッション開始成功<br>";
    } else {
        echo "✅ セッション既に開始済み<br>";
    }
    
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        echo "✅ CSRF トークン生成成功<br>";
    } else {
        echo "✅ CSRF トークン既に存在<br>";
    }
    
} catch (Exception $e) {
    echo "❌ セッションエラー: " . $e->getMessage() . "<br>";
}

// Step 5: 元ファイルの問題箇所特定
echo "<h3>Step 5: 元ファイルの重要部分テスト</h3>";

// 元ファイルで使用している主要な変数を再現
$action = $_POST['action'] ?? $_GET['action'] ?? '';
echo "✅ アクション変数取得: '$action'<br>";

// API URL設定テスト
$api_url = "http://localhost:5002";
echo "✅ API URL設定: $api_url<br>";

// CSVハンドラー存在確認
if (file_exists(__DIR__ . '/csv_handler.php')) {
    echo "✅ csv_handler.php 存在<br>";
    try {
        require_once __DIR__ . '/csv_handler.php';
        echo "✅ csv_handler.php 読み込み成功<br>";
    } catch (Exception $e) {
        echo "❌ csv_handler.php エラー: " . $e->getMessage() . "<br>";
    }
} else {
    echo "⚠️ csv_handler.php 不存在（オプション）<br>";
}

echo "<h3>診断完了</h3>";
echo "<p>上記の結果で❌が表示された項目が、元ファイルのエラー原因です。</p>";

?>
