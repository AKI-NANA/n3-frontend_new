<?php
/**
 * Yahoo Auction Tool - デバッグ版（段階的チェック）
 * HTTP 500エラー原因調査用
 */

// エラーレポート設定
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

echo "<h1>デバッグテスト開始</h1>";

// ステップ1: 基本PHP動作確認
echo "<h2>ステップ1: PHP基本動作</h2>";
echo "✅ PHP動作確認: OK<br>";
echo "PHP版: " . phpversion() . "<br>";

// ステップ2: データベース接続テスト
echo "<h2>ステップ2: データベース接続テスト</h2>";
try {
    $host = 'localhost';
    $dbname = 'nagano3_db';
    $username = 'postgres';
    $password = 'password123';
    
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ データベース接続: OK<br>";
    
    // 簡単なクエリテスト
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM mystical_japan_treasures_inventory");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✅ データベースクエリ: OK（" . $result['count'] . "件のデータ）<br>";
    
} catch (Exception $e) {
    echo "❌ データベースエラー: " . $e->getMessage() . "<br>";
}

// ステップ3: require_once テスト
echo "<h2>ステップ3: database_query_handler.php読み込みテスト</h2>";
try {
    require_once __DIR__ . '/database_query_handler.php';
    echo "✅ database_query_handler.php読み込み: OK<br>";
    
    // 関数存在確認
    if (function_exists('getDashboardStats')) {
        echo "✅ getDashboardStats関数: 存在<br>";
        
        // 実行テスト
        $stats = getDashboardStats();
        echo "✅ 統計取得テスト: OK<br>";
        echo "総数: " . ($stats['total_records'] ?? 0) . "件<br>";
    } else {
        echo "❌ getDashboardStats関数: 存在しない<br>";
    }
} catch (Exception $e) {
    echo "❌ database_query_handler.php読み込みエラー: " . $e->getMessage() . "<br>";
}

// ステップ4: HTMLファイル読み込みテスト
echo "<h2>ステップ4: HTMLファイル読み込みテスト</h2>";
$htmlPath = __DIR__ . '/html/yahoo_auction_tool_body.html';
if (file_exists($htmlPath)) {
    echo "✅ HTMLファイル存在: OK<br>";
    
    $htmlContent = file_get_contents($htmlPath);
    if ($htmlContent !== false) {
        echo "✅ HTMLファイル読み込み: OK（" . strlen($htmlContent) . " bytes）<br>";
    } else {
        echo "❌ HTMLファイル読み込み: 失敗<br>";
    }
} else {
    echo "❌ HTMLファイル: 存在しない<br>";
}

// ステップ5: CSSファイル存在確認
echo "<h2>ステップ5: CSSファイル存在確認</h2>";
$cssPath = __DIR__ . '/css/yahoo_auction_tool_styles_complete.css';
if (file_exists($cssPath)) {
    echo "✅ CSSファイル存在: OK<br>";
} else {
    echo "❌ CSSファイル: 存在しない<br>";
}

// ステップ6: JavaScriptファイル確認
echo "<h2>ステップ6: JavaScriptファイル確認</h2>";
$jsPath = __DIR__ . '/js/yahoo_auction_tool_complete.js';
if (file_exists($jsPath)) {
    $jsSize = filesize($jsPath);
    echo "✅ JavaScriptファイル存在: OK（" . number_format($jsSize) . " bytes）<br>";
    
    if ($jsSize > 50000) {
        echo "⚠️ JavaScriptファイルが大きすぎる可能性があります（50KB超え）<br>";
    }
} else {
    echo "❌ JavaScriptファイル: 存在しない<br>";
}

echo "<h2>テスト完了</h2>";
echo "<p>このページが表示されれば、基本的なPHP処理は正常に動作しています。</p>";
?>
