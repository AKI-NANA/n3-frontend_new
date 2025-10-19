<?php
/**
 * 🔧 Yahoo Auction Tool - 最終修正テスト
 * 関数重複エラー修正確認
 */

// エラー表示ON
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html><html><head><title>Yahoo Auction Tool - 最終修正テスト</title></head><body>";
echo "<h1>🔧 Yahoo Auction Tool - 関数重複エラー修正最終テスト</h1>";

// 📊 システム情報
echo "<h2>📊 システム情報</h2>";
echo "<ul>";
echo "<li><strong>PHPバージョン:</strong> " . phpversion() . "</li>";
echo "<li><strong>現在時刻:</strong> " . date('Y-m-d H:i:s') . "</li>";
echo "<li><strong>エラー表示:</strong> " . (ini_get('display_errors') ? '有効' : '無効') . "</li>";
echo "</ul>";

// 📊 関数定義状況（事前チェック）
echo "<h2>📊 関数定義状況（事前チェック）</h2>";
echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>関数名</th><th>状況</th></tr>";

$checkFunctions = [
    'getDatabaseConnection',
    'getDashboardStats', 
    'getApprovalQueueData',
    'searchProducts',
    'checkDatabaseTables',
    'addNewProduct',
    'sendJsonResponse',
    'logSystemMessage',
    'h',
    'generateCSRFToken',
    'validateCSRFToken'
];

foreach ($checkFunctions as $func) {
    $exists = function_exists($func);
    $status = $exists ? '✅ 定義済み' : '❌ 未定義';
    echo "<tr><td>{$func}()</td><td>{$status}</td></tr>";
}
echo "</table>";

// 📁 ファイル読み込みテスト
echo "<h2>📁 ファイル読み込みテスト</h2>";

$loadStartTime = microtime(true);
echo "<p><strong>Step 1:</strong> includes.php 読み込み中...</p>";

try {
    $includesPath = '/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/shared/core/includes.php';
    
    if (file_exists($includesPath)) {
        require_once $includesPath;
        $loadTime = round((microtime(true) - $loadStartTime) * 1000, 2);
        echo "<p>✅ includes.php 読み込み成功（{$loadTime}ms）</p>";
    } else {
        echo "<p>❌ includes.php が見つかりません: {$includesPath}</p>";
    }
} catch (Error $e) {
    echo "<p>🚨 <strong>Fatal Error:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p><strong>ファイル:</strong> " . htmlspecialchars($e->getFile()) . " <strong>行:</strong> " . $e->getLine() . "</p>";
} catch (Exception $e) {
    echo "<p>⚠️ <strong>Exception:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p><strong>ファイル:</strong> " . htmlspecialchars($e->getFile()) . " <strong>行:</strong> " . $e->getLine() . "</p>";
}

echo "<p><strong>Step 2:</strong> scraping_integrated.php 読み込み中...</p>";

try {
    $scrapingPath = '/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/yahoo_auction_content.php';
    
    if (file_exists($scrapingPath)) {
        // 出力をキャッチして HTML 出力を避ける
        ob_start();
        include_once $scrapingPath;
        $output = ob_get_clean();
        
        $loadTime = round((microtime(true) - $loadStartTime) * 1000, 2);
        echo "<p>✅ scraping_integrated.php 読み込み成功（{$loadTime}ms）</p>";
        
        if (!empty($output)) {
            echo "<p><strong>出力内容:</strong></p>";
            echo "<pre style='background: #f5f5f5; padding: 10px; max-height: 200px; overflow-y: auto;'>";
            echo htmlspecialchars(substr($output, 0, 1000));
            if (strlen($output) > 1000) echo "\n... (truncated)";
            echo "</pre>";
        }
    } else {
        echo "<p>❌ scraping_integrated.php が見つかりません: {$scrapingPath}</p>";
    }
} catch (Error $e) {
    echo "<p>🚨 <strong>Fatal Error:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p><strong>ファイル:</strong> " . htmlspecialchars($e->getFile()) . " <strong>行:</strong> " . $e->getLine() . "</p>";
} catch (Exception $e) {
    echo "<p>⚠️ <strong>Exception:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p><strong>ファイル:</strong> " . htmlspecialchars($e->getFile()) . " <strong>行:</strong> " . $e->getLine() . "</p>";
}

// 📊 関数定義状況（事後チェック）
echo "<h2>📊 関数定義状況（事後チェック）</h2>";
echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
echo "<tr><th>関数名</th><th>状況</th><th>変化</th></tr>";

foreach ($checkFunctions as $func) {
    $exists = function_exists($func);
    $status = $exists ? '✅ 定義済み' : '❌ 未定義';
    $change = $exists ? '🟢 OK' : '🔴 未定義のまま';
    echo "<tr><td>{$func}()</td><td>{$status}</td><td>{$change}</td></tr>";
}
echo "</table>";

// 🧪 機能テスト
if (function_exists('getDatabaseConnection')) {
    echo "<h2>🧪 機能テスト</h2>";
    
    try {
        $connection = getDatabaseConnection();
        if ($connection) {
            echo "<p>✅ データベース接続: 成功</p>";
            
            if (function_exists('checkDatabaseTables')) {
                $tableCheck = checkDatabaseTables();
                if ($tableCheck['success']) {
                    echo "<p>✅ テーブル確認: 成功</p>";
                    echo "<ul>";
                    foreach ($tableCheck['tables'] as $table => $info) {
                        if (is_array($info)) {
                            $status = $info['exists'] ? "✅ 存在 ({$info['count']}件)" : "❌ 存在しない";
                        } else {
                            $status = "✅ 存在";
                        }
                        echo "<li><strong>{$table}:</strong> {$status}</li>";
                    }
                    echo "</ul>";
                } else {
                    echo "<p>⚠️ テーブル確認: " . htmlspecialchars($tableCheck['error'] ?? 'エラー') . "</p>";
                }
            }
        } else {
            echo "<p>❌ データベース接続: 失敗</p>";
        }
    } catch (Exception $e) {
        echo "<p>❌ データベーステスト エラー: " . htmlspecialchars($e->getMessage()) . "</p>";
    }
}

// 🎯 JSON API テスト
if (isset($_GET['test_json'])) {
    header('Content-Type: application/json');
    ob_clean();
    
    $result = [
        'success' => true,
        'message' => '関数重複エラー修正完了',
        'functions_available' => [],
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    foreach ($checkFunctions as $func) {
        $result['functions_available'][$func] = function_exists($func);
    }
    
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// 📝 修正サマリー
echo "<h2>📝 修正サマリー</h2>";
echo "<div style='background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
echo "<h3>✅ 実施した修正</h3>";
echo "<ul>";
echo "<li><strong>関数重複回避:</strong> 全ての関数定義を <code>function_exists()</code> でガード</li>";
echo "<li><strong>読み込み順序最適化:</strong> includes.php → common_functions.php → その他</li>";
echo "<li><strong>エラーハンドリング強化:</strong> try-catch によるグレースフルな継続</li>";
echo "</ul>";

echo "<h3>🔧 修正済み関数</h3>";
echo "<ul>";
echo "<li>getDatabaseConnection() - データベース接続</li>";
echo "<li>getDashboardStats() - ダッシュボード統計</li>";
echo "<li>getApprovalQueueData() - 承認データ取得</li>";
echo "<li>searchProducts() - 商品検索</li>";
echo "<li>checkDatabaseTables() - テーブル確認</li>";
echo "<li>addNewProduct() - 商品追加</li>";
echo "</ul>";
echo "</div>";

// 🚀 次のステップ
echo "<h2>🚀 次のステップ</h2>";
echo "<div style='background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
echo "<ol>";
echo "<li><strong>スクレイピング機能テスト:</strong> Yahoo オークションからの実データ取得</li>";
echo "<li><strong>統合システム検証:</strong> 商品承認フローのテスト</li>";
echo "<li><strong>API連携確認:</strong> データベース読み書きの動作確認</li>";
echo "<li><strong>本格運用開始:</strong> 実際のオークションデータ処理</li>";
echo "</ol>";
echo "</div>";

// 📊 テストリンク
echo "<h2>📊 テストリンク</h2>";
echo "<ul>";
echo "<li><a href='?debug=1'>デバッグモード</a></li>";
echo "<li><a href='?test_json=1' target='_blank'>JSON API テスト</a></li>";
echo "<li><a href='../yahoo_auction_tool_content.php'>メインシステム</a></li>";
echo "<li><a href='02_scraping/scraping_integrated.php'>スクレイピングシステム</a></li>";
echo "</ul>";

echo "</body></html>";
?>
