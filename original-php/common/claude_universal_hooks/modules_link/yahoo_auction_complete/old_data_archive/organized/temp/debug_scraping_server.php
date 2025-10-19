<?php
/**
 * スクレイピングサーバー データベース問題 直接診断・修正
 * URL: http://localhost:8080/modules/yahoo_auction_complete/debug_scraping_server.php
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🔬 スクレイピングサーバー データベース問題 直接診断</h1>";
echo "<style>body{font-family:monospace; line-height:1.6;} .success{color:green;} .error{color:red;} .info{color:blue;} .warning{color:orange;} pre{background:#f5f5f5; padding:10px; border-radius:5px; overflow-x:auto;} .critical{background:#ffe6e6; padding:15px; border-radius:8px; margin:15px 0; border:2px solid #dc3545;}</style>";

try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'password123');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<div class='success'>✅ データベース接続成功</div>";
} catch (PDOException $e) {
    echo "<div class='error'>❌ データベース接続失敗: " . $e->getMessage() . "</div>";
    exit;
}

echo "<div class='critical'>";
echo "<h2>🚨 確認された問題</h2>";
echo "<p><strong>URL: https://auctions.yahoo.co.jp/jp/auction/b1198242011</strong></p>";
echo "<ul>";
echo "<li>✅ スクレイピングサーバー: 「成功」レスポンス</li>";
echo "<li>❌ データベース: 実際には保存されていない</li>";
echo "<li>📊 表示データ: 既存サンプルデータのみ</li>";
echo "</ul>";
echo "<p><strong>→ スクレイピングサーバーのデータベース設定が完全に間違っています</strong></p>";
echo "</div>";

$api_url = 'http://localhost:5002';

echo "<h2>1. スクレイピングサーバーの詳細診断</h2>";

// 特定URLでのスクレイピングテスト
$test_url = 'https://auctions.yahoo.co.jp/jp/auction/b1198242011';

echo "<h3>📡 問題のURL での詳細テスト</h3>";
echo "<div class='info'>テストURL: " . htmlspecialchars($test_url) . "</div>";

if (isset($_GET['test_specific_url']) && $_GET['test_specific_url'] === 'true') {
    echo "<div class='info'>🔬 詳細診断実行中...</div>";
    
    // 事前のデータベース状態確認
    $before_count = $pdo->query("
        SELECT COUNT(*) 
        FROM mystical_japan_treasures_inventory 
        WHERE source_url LIKE '%b1198242011%' OR source_url LIKE '%yahoo%'
    ")->fetchColumn();
    
    echo "<div class='info'>📊 テスト前のデータ数: {$before_count}件</div>";
    
    // スクレイピングリクエスト送信（詳細ログ付き）
    $post_data = [
        'urls' => [$test_url],
        'options' => [
            'save_to_db' => true,
            'extract_images' => true,
            'convert_currency' => true,
            'debug_mode' => true,
            'verify_save' => true,
            'log_database_operations' => true,
            'force_database_config' => [
                'host' => 'localhost',
                'port' => 5432,
                'database' => 'nagano3_db',
                'user' => 'postgres',
                'password' => 'password123',
                'table' => 'mystical_japan_treasures_inventory'
            ]
        ]
    ];
    
    echo "<div class='info'>📤 送信データ:</div>";
    echo "<pre>" . htmlspecialchars(json_encode($post_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
    
    try {
        $ch = curl_init($api_url . '/api/scrape_yahoo');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'User-Agent: Yahoo-Auction-Debug/1.0'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 45);
        curl_setopt($ch, CURLOPT_VERBOSE, true);
        
        $verbose_output = fopen('php://temp', 'w+');
        curl_setopt($ch, CURLOPT_STDERR, $verbose_output);
        
        $start_time = microtime(true);
        $response = curl_exec($ch);
        $end_time = microtime(true);
        
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        
        rewind($verbose_output);
        $verbose_log = stream_get_contents($verbose_output);
        fclose($verbose_output);
        
        curl_close($ch);
        
        $execution_time = round(($end_time - $start_time), 2);
        
        echo "<div class='info'>⏰ 実行時間: {$execution_time}秒</div>";
        echo "<div class='info'>📡 HTTP Code: {$http_code}</div>";
        echo "<div class='info'>📏 レスポンス長: " . strlen($response) . " bytes</div>";
        
        if ($curl_error) {
            echo "<div class='error'>❌ cURL Error: {$curl_error}</div>";
        }
        
        if ($verbose_log) {
            echo "<div class='info'>🔍 cURL Verbose Log:</div>";
            echo "<pre style='font-size:0.7em; max-height:150px; overflow-y:auto;'>" . htmlspecialchars($verbose_log) . "</pre>";
        }
        
        if ($response) {
            echo "<div class='info'>📥 APIレスポンス:</div>";
            
            try {
                $api_response = json_decode($response, true);
                if ($api_response) {
                    echo "<div class='success'>✅ JSON Parse Success</div>";
                    echo "<pre>" . htmlspecialchars(json_encode($api_response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
                    
                    if (isset($api_response['success']) && $api_response['success']) {
                        echo "<div class='warning'>⚠️ APIは「成功」と言っています</div>";
                        
                        // 待機時間
                        echo "<div class='info'>⏳ データベース保存確認のため3秒待機...</div>";
                        sleep(3);
                        
                        // データベース確認（複数の条件で）
                        $after_counts = [];
                        
                        // 1. 特定URLでの確認
                        $after_counts['specific_url'] = $pdo->query("
                            SELECT COUNT(*) 
                            FROM mystical_japan_treasures_inventory 
                            WHERE source_url LIKE '%b1198242011%'
                        ")->fetchColumn();
                        
                        // 2. Yahoo全般での確認
                        $after_counts['yahoo_all'] = $pdo->query("
                            SELECT COUNT(*) 
                            FROM mystical_japan_treasures_inventory 
                            WHERE source_url LIKE '%yahoo%'
                        ")->fetchColumn();
                        
                        // 3. 最近1分間の更新
                        $after_counts['recent_updates'] = $pdo->query("
                            SELECT COUNT(*) 
                            FROM mystical_japan_treasures_inventory 
                            WHERE updated_at >= NOW() - INTERVAL '1 minute'
                        ")->fetchColumn();
                        
                        // 4. source_url有データ全体
                        $after_counts['all_source_url'] = $pdo->query("
                            SELECT COUNT(*) 
                            FROM mystical_japan_treasures_inventory 
                            WHERE source_url IS NOT NULL AND source_url LIKE '%http%'
                        ")->fetchColumn();
                        
                        echo "<div class='info'>📊 データベース確認結果:</div>";
                        echo "<ul>";
                        echo "<li>特定URL (b1198242011): {$after_counts['specific_url']}件</li>";
                        echo "<li>Yahoo全般: {$after_counts['yahoo_all']}件</li>";
                        echo "<li>最近1分の更新: {$after_counts['recent_updates']}件</li>";
                        echo "<li>source_url有データ: {$after_counts['all_source_url']}件</li>";
                        echo "</ul>";
                        
                        if ($after_counts['specific_url'] > 0) {
                            echo "<div class='success'>🎉 データベース保存成功！</div>";
                            
                            // 保存されたデータの詳細表示
                            $saved_data = $pdo->query("
                                SELECT * 
                                FROM mystical_japan_treasures_inventory 
                                WHERE source_url LIKE '%b1198242011%'
                                ORDER BY updated_at DESC
                                LIMIT 1
                            ")->fetch(PDO::FETCH_ASSOC);
                            
                            if ($saved_data) {
                                echo "<div class='success'>💾 保存されたデータ:</div>";
                                echo "<pre>" . htmlspecialchars(json_encode($saved_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
                            }
                        } else {
                            echo "<div class='error'>❌ データベース保存失敗</div>";
                            echo "<div class='critical'>";
                            echo "<h3>🚨 確定問題</h3>";
                            echo "<p><strong>スクレイピングサーバーは「成功」と言っているが、実際にはデータベースに保存されていない</strong></p>";
                            echo "<p>原因の可能性:</p>";
                            echo "<ul>";
                            echo "<li>❌ データベース接続先が間違っている</li>";
                            echo "<li>❌ テーブル名が間違っている</li>";
                            echo "<li>❌ 認証情報が間違っている</li>";
                            echo "<li>❌ save_to_db オプションが無視されている</li>";
                            echo "<li>❌ スクレイピングサーバーのバグ</li>";
                            echo "</ul>";
                            echo "</div>";
                        }
                        
                    } else {
                        echo "<div class='error'>❌ APIエラー: " . ($api_response['error'] ?? 'Unknown error') . "</div>";
                    }
                } else {
                    echo "<div class='error'>❌ JSON Parse Failed</div>";
                    echo "<pre>" . htmlspecialchars(substr($response, 0, 1000)) . "</pre>";
                }
            } catch (Exception $json_e) {
                echo "<div class='error'>❌ JSON処理エラー: " . $json_e->getMessage() . "</div>";
            }
        } else {
            echo "<div class='error'>❌ Empty Response</div>";
        }
        
    } catch (Exception $e) {
        echo "<div class='error'>❌ Exception: " . $e->getMessage() . "</div>";
    }
    
} else {
    echo "<a href='?test_specific_url=true' style='display:inline-block; background:#dc3545; color:white; padding:15px 30px; text-decoration:none; border-radius:8px; margin:10px 0; font-weight:bold;'>🔬 問題URL での詳細診断実行</a>";
    echo "<div class='warning'>⚠️ この診断で「成功」なのに保存されない問題の原因を特定します</div>";
}

echo "<h2>2. スクレイピングサーバーのログ確認方法</h2>";

echo "<div style='background:#fff3cd; padding:20px; border-radius:8px; margin:20px 0;'>";
echo "<h3>🔍 スクレイピングサーバーのコンソールログ確認</h3>";
echo "<p><strong>スクレイピングサーバーが起動しているターミナルで以下を確認してください：</strong></p>";
echo "<ol>";
echo "<li><strong>データベース接続エラー:</strong> PostgreSQL接続失敗のメッセージ</li>";
echo "<li><strong>テーブルエラー:</strong> 'mystical_japan_treasures_inventory' not found</li>";
echo "<li><strong>保存処理ログ:</strong> INSERT INTO または save_to_db 関連</li>";
echo "<li><strong>認証エラー:</strong> Authentication failed for user 'postgres'</li>";
echo "<li><strong>データベース名エラー:</strong> database 'nagano3_db' does not exist</li>";
echo "</ol>";
echo "</div>";

echo "<h2>3. 推定される具体的問題</h2>";

echo "<div class='critical'>";
echo "<h3>🎯 最も可能性の高い問題</h3>";
echo "<ol>";
echo "<li><strong>データベース名の間違い:</strong> 'nagano3_db' ではなく別のDB名</li>";
echo "<li><strong>テーブル名の間違い:</strong> 'mystical_japan_treasures_inventory' ではなく別のテーブル名</li>";
echo "<li><strong>認証情報の間違い:</strong> パスワード 'password123' が間違っている</li>";
echo "<li><strong>ホスト名の間違い:</strong> 'localhost' ではなく別のホスト</li>";
echo "<li><strong>save_to_db無効:</strong> 処理はするが保存処理が実行されない</li>";
echo "</ol>";
echo "</div>";

echo "<h2>4. 解決方法</h2>";

echo "<div style='background:#d4edda; padding:20px; border-radius:8px; margin:20px 0;'>";
echo "<h3>🛠️ 問題解決の手順</h3>";
echo "<ol>";
echo "<li><strong>上記の「詳細診断実行」</strong>で具体的エラーを確認</li>";
echo "<li><strong>スクレイピングサーバーのコンソールログ</strong>を確認</li>";
echo "<li><strong>スクレイピングサーバーのデータベース設定ファイル</strong>を修正</li>";
echo "<li><strong>スクレイピングサーバーを再起動</strong></li>";
echo "<li><strong>再度テスト実行</strong>して動作確認</li>";
echo "</ol>";
echo "</div>";

echo "<h2>5. 確実な動作確認方法</h2>";

echo "<div style='background:#e8f5e8; padding:20px; border-radius:8px; margin:20px 0;'>";
echo "<h3>✅ 修正完了の確認方法</h3>";
echo "<p><strong>以下が確認できれば修正完了です：</strong></p>";
echo "<ol>";
echo "<li>上記診断で「データベース保存成功」が表示される</li>";
echo "<li>Yahoo Auction Tool の「データ編集タブ」でデータが表示される</li>";
echo "<li>実際のYahoo画像URL・商品データが保存される</li>";
echo "<li>source_url に 'b1198242011' が含まれるデータが存在する</li>";
echo "</ol>";
echo "</div>";
?>
