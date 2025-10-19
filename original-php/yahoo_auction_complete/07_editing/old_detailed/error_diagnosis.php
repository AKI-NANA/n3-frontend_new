<?php
/**
 * editing.php エラー診断ツール
 * HTTP 500 エラーの原因を特定
 */

// エラー表示を有効化
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>🔍 editing.php エラー診断ツール</h1>";

try {
    echo "<h2>1. 📋 基本チェック</h2>";
    
    // PHPバージョン確認
    echo "<p><strong>PHPバージョン:</strong> " . phpversion() . "</p>";
    
    // 現在のディレクトリ確認
    echo "<p><strong>現在のディレクトリ:</strong> " . getcwd() . "</p>";
    
    // editing.php の存在確認
    $editing_file = __DIR__ . '/editing.php';
    echo "<p><strong>editing.php ファイル:</strong> " . ($editing_file) . "</p>";
    echo "<p><strong>ファイル存在:</strong> " . (file_exists($editing_file) ? '✅ あり' : '❌ なし') . "</p>";
    
    if (file_exists($editing_file)) {
        echo "<p><strong>ファイルサイズ:</strong> " . number_format(filesize($editing_file)) . " bytes</p>";
        echo "<p><strong>読み取り可能:</strong> " . (is_readable($editing_file) ? '✅ 可能' : '❌ 不可') . "</p>";
    }
    
    echo "<h2>2. 🔧 JavaScript ファイル確認</h2>";
    
    $js_files = [
        'editing.js',
        'delete_functions.js', 
        'delete_fix.js',
        'hybrid_price_display.js',
        'image_display_fix.js',
        'modal_debug_fix.js',
        'image_display_complete_fix.js'
    ];
    
    foreach ($js_files as $js_file) {
        $file_path = __DIR__ . '/' . $js_file;
        $exists = file_exists($file_path);
        $size = $exists ? filesize($file_path) : 0;
        
        echo "<p><strong>{$js_file}:</strong> " . 
             ($exists ? "✅ あり (" . number_format($size) . " bytes)" : "❌ なし") . 
             "</p>";
    }
    
    echo "<h2>3. 🗃️ データベース接続テスト</h2>";
    
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        echo "<p style='color: green;'>✅ データベース接続成功</p>";
        
        // テーブル存在確認
        $table_check = $pdo->query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yahoo_scraped_products')");
        $table_exists = $table_check->fetchColumn();
        
        echo "<p><strong>yahoo_scraped_products テーブル:</strong> " . 
             ($table_exists ? "✅ 存在" : "❌ 存在しない") . "</p>";
        
    } catch (PDOException $e) {
        echo "<p style='color: red;'>❌ データベース接続エラー: " . htmlspecialchars($e->getMessage()) . "</p>";
    }
    
    echo "<h2>4. 📝 editing.php の構文チェック</h2>";
    
    // 構文チェック（簡易版）
    if (file_exists($editing_file)) {
        $content = file_get_contents($editing_file);
        
        // 基本的な構文問題をチェック
        $issues = [];
        
        // 不完全なPHPタグ
        if (preg_match('/\<\?[^p]/', $content)) {
            $issues[] = "不完全なPHPタグが見つかりました";
        }
        
        // 未閉じの括弧
        $open_braces = substr_count($content, '{');
        $close_braces = substr_count($content, '}');
        if ($open_braces !== $close_braces) {
            $issues[] = "括弧の数が一致しません (開: {$open_braces}, 閉: {$close_braces})";
        }
        
        // 未閉じの引用符
        $single_quotes = substr_count($content, "'") - substr_count($content, "\\'");
        $double_quotes = substr_count($content, '"') - substr_count($content, '\\"');
        
        if ($single_quotes % 2 !== 0) {
            $issues[] = "シングルクォートが未閉じの可能性があります";
        }
        
        if ($double_quotes % 2 !== 0) {
            $issues[] = "ダブルクォートが未閉じの可能性があります";
        }
        
        if (empty($issues)) {
            echo "<p style='color: green;'>✅ 基本的な構文問題は見つかりませんでした</p>";
        } else {
            echo "<div style='color: red;'>";
            echo "<p><strong>❌ 構文の問題が見つかりました:</strong></p>";
            echo "<ul>";
            foreach ($issues as $issue) {
                echo "<li>" . htmlspecialchars($issue) . "</li>";
            }
            echo "</ul>";
            echo "</div>";
        }
        
        // ファイルの最後10行を表示
        $lines = explode("\n", $content);
        $last_lines = array_slice($lines, -15);
        
        echo "<h3>📄 ファイルの最後15行:</h3>";
        echo "<pre style='background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 0.8em; overflow-x: auto;'>";
        foreach ($last_lines as $i => $line) {
            $line_num = count($lines) - 15 + $i + 1;
            echo sprintf("%3d: %s\n", $line_num, htmlspecialchars($line));
        }
        echo "</pre>";
    }
    
    echo "<h2>5. 🚨 推奨解決策</h2>";
    
    echo "<div style='background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0;'>";
    echo "<h4>⚠️ HTTP 500 エラーの一般的な原因と解決方法:</h4>";
    echo "<ol>";
    echo "<li><strong>PHP構文エラー</strong> - ファイルの構文を確認</li>";
    echo "<li><strong>JavaScriptファイルの欠損</strong> - 必要なJSファイルがすべて存在するか確認</li>";
    echo "<li><strong>データベース接続エラー</strong> - データベースの設定確認</li>";
    echo "<li><strong>メモリ不足</strong> - PHPのメモリ制限確認</li>";
    echo "<li><strong>権限問題</strong> - ファイルの読み取り権限確認</li>";
    echo "</ol>";
    echo "</div>";
    
    echo "<h2>6. 🔧 緊急修復オプション</h2>";
    
    echo "<div style='text-align: center; margin: 20px 0;'>";
    echo "<a href='editing_simple.php' style='background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 10px; display: inline-block;'>📝 シンプル版editing.php</a>";
    echo "<a href='test_simple.php' style='background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 10px; display: inline-block;'>🧪 テスト版</a>";
    echo "</div>";
    
} catch (Exception $e) {
    echo "<div style='color: red; padding: 15px; background: #ffe6e6; border-radius: 8px;'>";
    echo "<h3>❌ 診断中にエラーが発生しました</h3>";
    echo "<p><strong>エラー:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p><strong>ファイル:</strong> " . htmlspecialchars($e->getFile()) . "</p>";
    echo "<p><strong>行:</strong> " . $e->getLine() . "</p>";
    echo "</div>";
}

echo "<hr>";
echo "<p style='text-align: center; color: #666; font-size: 0.9em;'>エラー診断完了</p>";
?>
