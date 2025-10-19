<?php
/**
 * スクレイピングAPI詳細テストツール
 * URL: http://localhost:8080/modules/yahoo_auction_complete/test_scraping_api.php
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🔬 スクレイピングAPI詳細テスト</h1>";
echo "<style>body{font-family:monospace; line-height:1.6;} .success{color:green;} .error{color:red;} .info{color:blue;} .warning{color:orange;} pre{background:#f5f5f5; padding:10px; border-radius:5px; overflow-x:auto;}</style>";

$api_url = 'http://localhost:5002';

echo "<h2>1. APIエンドポイント確認</h2>";

// 利用可能エンドポイントの確認
$endpoints_to_test = [
    '/health' => 'ヘルスチェック',
    '/api/system_status' => 'システムステータス',
    '/api/scrape_yahoo' => 'Yahoo スクレイピング',
    '/api/endpoints' => 'エンドポイント一覧',
    '/' => 'ルート'
];

foreach ($endpoints_to_test as $endpoint => $description) {
    echo "<h3>{$description} ({$endpoint})</h3>";
    
    try {
        $ch = curl_init($api_url . $endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            echo "<div class='error'>❌ cURL Error: {$curl_error}</div>";
        } else {
            echo "<div class='info'>📡 HTTP Code: {$http_code}</div>";
            echo "<div class='info'>📏 Response Length: " . strlen($response) . " bytes</div>";
            
            if ($http_code == 200) {
                echo "<div class='success'>✅ エンドポイント利用可能</div>";
                
                // JSONパース試行
                $json_data = json_decode($response, true);
                if ($json_data) {
                    echo "<div class='success'>✅ JSON レスポンス</div>";
                    echo "<pre>" . htmlspecialchars(json_encode($json_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
                } else {
                    echo "<div class='info'>📝 Raw Response (first 300 chars):</div>";
                    echo "<pre>" . htmlspecialchars(substr($response, 0, 300)) . "</pre>";
                }
            } else {
                echo "<div class='warning'>⚠️ HTTP {$http_code}</div>";
                if ($response) {
                    echo "<div class='info'>📝 Error Response:</div>";
                    echo "<pre>" . htmlspecialchars(substr($response, 0, 500)) . "</pre>";
                }
            }
        }
    } catch (Exception $e) {
        echo "<div class='error'>❌ Exception: " . $e->getMessage() . "</div>";
    }
    
    echo "<hr>";
}

echo "<h2>2. 実際のスクレイピングリクエスト テスト</h2>";

if (isset($_GET['test_real_scraping']) && $_GET['test_real_scraping'] === 'true') {
    echo "<div class='info'>🚀 実スクレイピングテスト開始...</div>";
    
    // 複数のテストURLを試行
    $test_urls = [
        'https://auctions.yahoo.co.jp/jp/auction/test123',
        'https://auctions.yahoo.co.jp/jp/auction/b1198242011', // 実際のURL形式
    ];
    
    foreach ($test_urls as $test_url) {
        echo "<h3>📡 テスト URL: {$test_url}</h3>";
        
        $post_data = [
            'urls' => [$test_url],
            'options' => [
                'save_to_db' => true,
                'extract_images' => true,
                'convert_currency' => true,
                'database_config' => [
                    'host' => 'localhost',
                    'database' => 'nagano3_db',
                    'user' => 'postgres',
                    'password' => 'password123'
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
                'User-Agent: Yahoo-Auction-Tool/1.0',
                'Accept: application/json'
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 60);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
            curl_setopt($ch, CURLOPT_VERBOSE, true);
            
            $verbose_log = fopen('php://temp', 'w+');
            curl_setopt($ch, CURLOPT_STDERR, $verbose_log);
            
            echo "<div class='info'>⏱️ リクエスト実行中...</div>";
            
            $start_time = microtime(true);
            $response = curl_exec($ch);
            $end_time = microtime(true);
            
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curl_error = curl_error($ch);
            
            rewind($verbose_log);
            $verbose_output = stream_get_contents($verbose_log);
            fclose($verbose_log);
            
            curl_close($ch);
            
            $execution_time = round(($end_time - $start_time), 2);
            
            echo "<div class='info'>⏰ 実行時間: {$execution_time}秒</div>";
            echo "<div class='info'>📡 HTTP Code: {$http_code}</div>";
            echo "<div class='info'>📏 Response Length: " . strlen($response) . " bytes</div>";
            
            if ($curl_error) {
                echo "<div class='error'>❌ cURL Error: {$curl_error}</div>";
            }
            
            if ($verbose_output) {
                echo "<div class='info'>🔍 cURL Verbose Log:</div>";
                echo "<pre style='font-size:0.8em; max-height:200px; overflow-y:auto;'>" . htmlspecialchars($verbose_output) . "</pre>";
            }
            
            if ($response) {
                echo "<div class='info'>📥 API Response:</div>";
                
                $json_response = json_decode($response, true);
                if ($json_response) {
                    echo "<div class='success'>✅ JSON Response Parsed</div>";
                    echo "<pre>" . htmlspecialchars(json_encode($json_response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
                    
                    // 成功判定
                    if (isset($json_response['success']) && $json_response['success']) {
                        echo "<div class='success'>🎉 APIレスポンス: 成功</div>";
                        
                        if (isset($json_response['data']['success_count'])) {
                            echo "<div class='info'>📊 Success Count: {$json_response['data']['success_count']}</div>";
                        }
                        
                        // データベース確認
                        echo "<div class='info'>🔍 データベース確認中...</div>";
                        
                        try {
                            $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'password123');
                            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                            
                            sleep(1); // 1秒待機
                            
                            $recent_check = $pdo->query("
                                SELECT COUNT(*) as count, MAX(updated_at) as latest
                                FROM mystical_japan_treasures_inventory 
                                WHERE updated_at >= NOW() - INTERVAL '2 minutes'
                                AND source_url IS NOT NULL
                            ")->fetch(PDO::FETCH_ASSOC);
                            
                            echo "<div class='info'>📊 最近2分以内のsource_url有データ: {$recent_check['count']}件</div>";
                            echo "<div class='info'>📊 最新更新: {$recent_check['latest']}</div>";
                            
                            if ($recent_check['count'] > 0) {
                                echo "<div class='success'>✅ データベースに保存されました！</div>";
                                
                                // 保存されたデータの詳細
                                $saved_data = $pdo->query("
                                    SELECT item_id, title, source_url, scraped_at, current_price
                                    FROM mystical_japan_treasures_inventory 
                                    WHERE updated_at >= NOW() - INTERVAL '2 minutes'
                                    AND source_url IS NOT NULL
                                    ORDER BY updated_at DESC
                                    LIMIT 1
                                ")->fetch(PDO::FETCH_ASSOC);
                                
                                if ($saved_data) {
                                    echo "<div class='info'>💾 保存されたデータ:</div>";
                                    echo "<pre>" . htmlspecialchars(json_encode($saved_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
                                }
                            } else {
                                echo "<div class='error'>❌ データベースに保存されていません</div>";
                                echo "<div class='warning'>⚠️ APIは成功と言っているが、実際には保存されていない</div>";
                            }
                            
                        } catch (Exception $db_error) {
                            echo "<div class='error'>❌ データベース確認エラー: " . $db_error->getMessage() . "</div>";
                        }
                        
                    } else {
                        echo "<div class='error'>❌ APIレスポンス: 失敗</div>";
                        if (isset($json_response['error'])) {
                            echo "<div class='error'>Error: {$json_response['error']}</div>";
                        }
                    }
                    
                } else {
                    echo "<div class='error'>❌ JSON Parse Failed</div>";
                    echo "<div class='info'>📝 Raw Response (first 1000 chars):</div>";
                    echo "<pre>" . htmlspecialchars(substr($response, 0, 1000)) . "</pre>";
                }
            } else {
                echo "<div class='error'>❌ Empty Response</div>";
            }
            
        } catch (Exception $e) {
            echo "<div class='error'>❌ Exception: " . $e->getMessage() . "</div>";
        }
        
        echo "<hr>";
    }
    
} else {
    echo "<a href='?test_real_scraping=true' style='display:inline-block; background:#dc3545; color:white; padding:15px 30px; text-decoration:none; border-radius:8px; margin:10px 0; font-weight:bold;'>🚀 実スクレイピングテスト実行</a>";
    echo "<div class='warning'>⚠️ このテストは実際のAPIサーバーにスクレイピングリクエストを送信します</div>";
}

echo "<h2>3. スクレイピングサーバーのログ確認方法</h2>";
echo "<div class='info'>💡 スクレイピングサーバーのコンソールログを確認してください:</div>";
echo "<pre>";
echo "1. スクレイピングサーバーを起動したターミナルを確認\n";
echo "2. エラーメッセージやデータベース接続エラーがないか確認\n";
echo "3. 'save_to_db' オプションが正しく処理されているか確認\n";
echo "4. データベース接続文字列が正しいか確認\n";
echo "</pre>";

echo "<h2>4. 問題の特定</h2>";
echo "<div style='background:#fff3cd; padding:15px; border-radius:8px; margin-top:20px;'>";
echo "<strong>🔍 現在の状況:</strong><br>";
echo "• スクレイピングサーバー: ✅ 正常起動<br>";
echo "• データベース直接保存: ✅ 正常動作<br>";
echo "• APIエンドポイント: 📡 上記で確認<br>";
echo "• スクレイピングAPI: 🧪 テスト実行で確認<br><br>";

echo "<strong>📋 次のステップ:</strong><br>";
echo "1. 上記の「実スクレイピングテスト実行」を実行<br>";
echo "2. APIレスポンスとデータベース保存を確認<br>";
echo "3. スクレイピングサーバーのログを確認<br>";
echo "</div>";
?>
