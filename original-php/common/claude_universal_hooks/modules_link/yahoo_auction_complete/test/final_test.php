<?php
/**
 * 🔧 Yahoo Auction Tool - 最終動作確認テスト
 * 関数重複エラー修正後の動作確認
 */

// エラー表示ON（デバッグ用）
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

echo "<!DOCTYPE html><html><head><title>Yahoo Auction Tool - 最終動作確認</title>";
echo "<style>";
echo "body { font-family: Arial, sans-serif; margin: 20px; }";
echo "table { border-collapse: collapse; width: 100%; margin: 10px 0; }";
echo "th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }";
echo "th { background-color: #f2f2f2; }";
echo ".success { color: green; font-weight: bold; }";
echo ".error { color: red; font-weight: bold; }";
echo ".warning { color: orange; font-weight: bold; }";
echo ".info { color: blue; font-weight: bold; }";
echo ".log-section { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 10px 0; max-height: 300px; overflow-y: auto; }";
echo "</style></head><body>";

echo "<h1>🔧 Yahoo Auction Tool - 最終動作確認テスト</h1>";
echo "<p><strong>テスト実行時刻:</strong> " . date('Y-m-d H:i:s') . "</p>";

// 📊 Phase 1: 関数存在チェック（読み込み前）
echo "<h2>📊 Phase 1: 関数存在チェック（読み込み前）</h2>";
$criticalFunctions = [
    'getDatabaseConnection',
    'getDashboardStats', 
    'getApprovalQueueData',
    'searchProducts',
    'checkDatabaseTables',
    'addNewProduct',
    'sendJsonResponse',
    'h',
    'generateCSRFToken',
    'validateCSRFToken'
];

echo "<table>";
echo "<tr><th>関数名</th><th>読み込み前状況</th></tr>";
$preLoadStatus = [];
foreach ($criticalFunctions as $func) {
    $exists = function_exists($func);
    $preLoadStatus[$func] = $exists;
    $status = $exists ? '<span class="warning">⚠️ 既に定義済み</span>' : '<span class="info">❌ 未定義</span>';
    echo "<tr><td>{$func}()</td><td>{$status}</td></tr>";
}
echo "</table>";

// 📁 Phase 2: includes.php 読み込みテスト
echo "<h2>📁 Phase 2: includes.php 読み込みテスト</h2>";

$loadStartTime = microtime(true);
$errorOccurred = false;
$errorMessage = '';

try {
    echo "<p>🔄 includes.php 読み込み開始...</p>";
    
    // includes.php を読み込み
    require_once '/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/shared/core/includes.php';
    
    $loadTime = round((microtime(true) - $loadStartTime) * 1000, 2);
    echo "<p><span class='success'>✅ includes.php 読み込み成功</span> (実行時間: {$loadTime}ms)</p>";
    
} catch (Error $e) {
    $errorOccurred = true;
    $errorMessage = $e->getMessage();
    echo "<p><span class='error'>🚨 Fatal Error:</span> " . htmlspecialchars($errorMessage) . "</p>";
    echo "<p><strong>ファイル:</strong> " . htmlspecialchars($e->getFile()) . " <strong>行:</strong> " . $e->getLine() . "</p>";
} catch (Exception $e) {
    $errorOccurred = true;
    $errorMessage = $e->getMessage();
    echo "<p><span class='error'>⚠️ Exception:</span> " . htmlspecialchars($errorMessage) . "</p>";
}

// 📊 Phase 3: 関数存在チェック（読み込み後）
echo "<h2>📊 Phase 3: 関数存在チェック（読み込み後）</h2>";

echo "<table>";
echo "<tr><th>関数名</th><th>読み込み前</th><th>読み込み後</th><th>結果</th></tr>";
foreach ($criticalFunctions as $func) {
    $beforeStatus = $preLoadStatus[$func] ? '✅ 定義済み' : '❌ 未定義';
    $afterExists = function_exists($func);
    $afterStatus = $afterExists ? '✅ 定義済み' : '❌ 未定義';
    
    // 結果判定
    if (!$preLoadStatus[$func] && $afterExists) {
        $result = '<span class="success">🎉 正常に定義</span>';
    } elseif ($preLoadStatus[$func] && $afterExists) {
        $result = '<span class="warning">⚠️ 重複回避成功</span>';
    } elseif (!$afterExists) {
        $result = '<span class="error">❌ 定義失敗</span>';
    } else {
        $result = '<span class="info">➖ 変化なし</span>';
    }
    
    echo "<tr><td>{$func}()</td><td>{$beforeStatus}</td><td>{$afterStatus}</td><td>{$result}</td></tr>";
}
echo "</table>";

// 🧪 Phase 4: 基本機能テスト
if (!$errorOccurred) {
    echo "<h2>🧪 Phase 4: 基本機能テスト</h2>";
    
    // データベース接続テスト
    if (function_exists('getDatabaseConnection')) {
        try {
            echo "<p>🔄 データベース接続テスト中...</p>";
            $connection = getDatabaseConnection();
            
            if ($connection) {
                echo "<p><span class='success'>✅ データベース接続: 成功</span></p>";
                
                // テーブル確認テスト
                if (function_exists('checkDatabaseTables')) {
                    $tableCheck = checkDatabaseTables();
                    if ($tableCheck['success']) {
                        echo "<p><span class='success'>✅ テーブル確認: 成功</span></p>";
                        
                        echo "<h3>📊 データベーステーブル状況</h3>";
                        echo "<table>";
                        echo "<tr><th>テーブル名</th><th>存在</th><th>レコード数</th></tr>";
                        
                        foreach ($tableCheck['tables'] as $table => $info) {
                            if (is_array($info)) {
                                $exists = $info['exists'] ? '✅ 存在' : '❌ 不存在';
                                $count = $info['exists'] ? number_format($info['count']) . '件' : '-';
                            } else {
                                $exists = '✅ 存在';
                                $count = '-';
                            }
                            echo "<tr><td>{$table}</td><td>{$exists}</td><td>{$count}</td></tr>";
                        }
                        echo "</table>";
                        
                    } else {
                        echo "<p><span class='error'>❌ テーブル確認: 失敗</span> - " . htmlspecialchars($tableCheck['error'] ?? '不明なエラー') . "</p>";
                    }
                }
                
                // ダッシュボード統計テスト
                if (function_exists('getDashboardStats')) {
                    echo "<p>🔄 ダッシュボード統計テスト中...</p>";
                    $stats = getDashboardStats();
                    
                    if ($stats) {
                        echo "<p><span class='success'>✅ ダッシュボード統計: 成功</span></p>";
                        
                        echo "<h3>📈 システム統計情報</h3>";
                        echo "<table>";
                        echo "<tr><th>項目</th><th>値</th></tr>";
                        foreach ($stats as $key => $value) {
                            if (is_numeric($value)) {
                                $value = number_format($value);
                            }
                            echo "<tr><td>" . htmlspecialchars($key) . "</td><td>" . htmlspecialchars($value) . "</td></tr>";
                        }
                        echo "</table>";
                    } else {
                        echo "<p><span class='warning'>⚠️ ダッシュボード統計: データなし</span></p>";
                    }
                }
                
            } else {
                echo "<p><span class='error'>❌ データベース接続: 失敗</span></p>";
            }
            
        } catch (Exception $e) {
            echo "<p><span class='error'>❌ データベーステスト エラー:</span> " . htmlspecialchars($e->getMessage()) . "</p>";
        }
    } else {
        echo "<p><span class='error'>❌ getDatabaseConnection() 関数が定義されていません</span></p>";
    }
    
    // その他の関数テスト
    echo "<h3>🧪 その他の関数テスト</h3>";
    echo "<ul>";
    
    if (function_exists('h')) {
        $testString = '<script>alert("test")</script>';
        $escaped = h($testString);
        echo "<li><span class='success'>✅ h() 関数:</span> HTML エスケープ動作確認 - " . htmlspecialchars($escaped) . "</li>";
    } else {
        echo "<li><span class='error'>❌ h() 関数: 定義されていません</span></li>";
    }
    
    if (function_exists('generateCSRFToken')) {
        session_start();
        $token = generateCSRFToken();
        echo "<li><span class='success'>✅ generateCSRFToken() 関数:</span> トークン生成成功 - " . substr($token, 0, 16) . "...</li>";
    } else {
        echo "<li><span class='error'>❌ generateCSRFToken() 関数: 定義されていません</span></li>";
    }
    
    echo "</ul>";
}

// 🎯 Phase 5: 修正サマリー
echo "<h2>🎯 Phase 5: 修正サマリー</h2>";

$successCount = 0;
$totalCount = count($criticalFunctions);

foreach ($criticalFunctions as $func) {
    if (function_exists($func)) {
        $successCount++;
    }
}

$successRate = round(($successCount / $totalCount) * 100, 1);

echo "<div class='log-section'>";
echo "<h3>📊 修正結果</h3>";
echo "<ul>";
echo "<li><strong>対象関数数:</strong> {$totalCount}個</li>";
echo "<li><strong>成功関数数:</strong> {$successCount}個</li>";
echo "<li><strong>成功率:</strong> {$successRate}%</li>";
echo "<li><strong>エラー発生:</strong> " . ($errorOccurred ? '<span class="error">あり</span>' : '<span class="success">なし</span>') . "</li>";
echo "</ul>";

if ($successRate >= 90) {
    echo "<p><span class='success'>🎉 修正完了！関数重複エラーは解決されました。</span></p>";
} elseif ($successRate >= 70) {
    echo "<p><span class='warning'>⚠️ ほぼ修正完了。一部の関数で問題が残っています。</span></p>";
} else {
    echo "<p><span class='error'>❌ 修正が不十分です。さらなる対応が必要です。</span></p>";
}

echo "<h3>✅ 実施した修正</h3>";
echo "<ul>";
echo "<li><strong>関数定義ガード:</strong> 全ての関数を <code>function_exists()</code> でチェック</li>";
echo "<li><strong>エラーハンドリング強化:</strong> try-catch による関数重複エラーの適切な処理</li>";
echo "<li><strong>読み込み順序最適化:</strong> includes.php → common_functions.php → database_query_handler.php</li>";
echo "<li><strong>デバッグ機能追加:</strong> 読み込み状況の詳細ログ</li>";
echo "</ul>";

echo "<h3>🚀 次のステップ</h3>";
echo "<ol>";
echo "<li><strong>Yahoo Auction Tool メインシステム:</strong> <a href='../yahoo_auction_content.php' target='_blank'>動作確認</a></li>";
echo "<li><strong>スクレイピング機能:</strong> 実データ取得テスト</li>";
echo "<li><strong>商品承認システム:</strong> ワークフローテスト</li>";
echo "<li><strong>データベース統合:</strong> 全機能統合確認</li>";
echo "</ol>";

echo "</div>";

// 🔗 便利リンク
echo "<h2>🔗 便利リンク</h2>";
echo "<ul>";
echo "<li><a href='?debug=1'>デバッグモード再実行</a></li>";
echo "<li><a href='../yahoo_auction_content.php' target='_blank'>Yahoo Auction Tool メインシステム</a></li>";
echo "<li><a href='../index.php' target='_blank'>プロジェクト インデックス</a></li>";
echo "</ul>";

echo "</body></html>";
?>
