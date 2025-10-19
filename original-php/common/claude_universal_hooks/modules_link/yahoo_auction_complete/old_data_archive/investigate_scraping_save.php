<?php
/**
 * スクレイピング保存処理詳細調査ツール
 * URL: http://localhost:8080/modules/yahoo_auction_complete/investigate_scraping_save.php
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🔍 スクレイピング保存処理 詳細調査</h1>";
echo "<style>body{font-family:monospace;} .success{color:green;} .error{color:red;} .info{color:blue;} .warning{color:orange;}</style>";

// データベース接続
try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'password123');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<div class='success'>✅ データベース接続成功</div>";
} catch (PDOException $e) {
    echo "<div class='error'>❌ データベース接続失敗: " . $e->getMessage() . "</div>";
    exit;
}

echo "<h2>1. スクレイピングサーバー接続確認</h2>";
$api_url = 'http://localhost:5002';

// ヘルスチェック
try {
    $ch = curl_init($api_url . '/health');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    if ($curl_error) {
        echo "<div class='error'>❌ スクレイピングサーバー接続失敗: {$curl_error}</div>";
        echo "<div class='warning'>⚠️ スクレイピングサーバーが起動していない可能性があります</div>";
    } elseif ($http_code == 200) {
        echo "<div class='success'>✅ スクレイピングサーバー接続成功 (HTTP {$http_code})</div>";
        $health_data = json_decode($response, true);
        if ($health_data) {
            echo "<div class='info'>📊 サーバー情報: ポート{$health_data['port']}, セッション{$health_data['session_id']}</div>";
        }
    } else {
        echo "<div class='error'>❌ スクレイピングサーバーエラー: HTTP {$http_code}</div>";
    }
} catch (Exception $e) {
    echo "<div class='error'>❌ 接続エラー: " . $e->getMessage() . "</div>";
}

echo "<h2>2. テストスクレイピング実行</h2>";
if (isset($_GET['test_scraping']) && $_GET['test_scraping'] === 'true') {
    echo "<div class='info'>🧪 テストスクレイピング実行中...</div>";
    
    $test_url = 'https://auctions.yahoo.co.jp/jp/auction/test123456';
    
    $post_data = [
        'urls' => [$test_url],
        'options' => [
            'save_to_db' => true,
            'extract_images' => true,
            'convert_currency' => true,
            'test_mode' => true
        ]
    ];
    
    try {
        $ch = curl_init($api_url . '/api/scrape_yahoo');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'User-Agent: Yahoo-Auction-Tool/1.0'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        echo "<div class='info'>📡 APIリクエスト送信完了</div>";
        echo "<div class='info'>📊 HTTP Code: {$http_code}</div>";
        echo "<div class='info'>📝 Response Length: " . strlen($response) . " chars</div>";
        
        if ($curl_error) {
            echo "<div class='error'>❌ cURL Error: {$curl_error}</div>";
        } else {
            echo "<div class='info'>🔤 Response (first 500 chars): " . htmlspecialchars(substr($response, 0, 500)) . "</div>";
            
            try {
                $api_response = json_decode($response, true);
                if ($api_response) {
                    echo "<div class='success'>✅ JSON Parse Success</div>";
                    echo "<pre>" . print_r($api_response, true) . "</pre>";
                    
                    if (isset($api_response['success']) && $api_response['success']) {
                        echo "<div class='success'>✅ スクレイピングサーバーは成功レスポンスを返しました</div>";
                        
                        // データベース確認
                        echo "<div class='info'>🔍 データベースへの保存確認中...</div>";
                        
                        // 5秒待ってからデータベース確認
                        sleep(2);
                        
                        $check_sql = "
                            SELECT COUNT(*) as count, MAX(updated_at) as latest_update
                            FROM mystical_japan_treasures_inventory 
                            WHERE updated_at >= NOW() - INTERVAL '1 minute'
                        ";
                        
                        $check_result = $pdo->query($check_sql)->fetch(PDO::FETCH_ASSOC);
                        echo "<div class='info'>📊 最近1分間の更新: {$check_result['count']}件</div>";
                        
                        $source_url_check = $pdo->query("
                            SELECT COUNT(*) 
                            FROM mystical_japan_treasures_inventory 
                            WHERE source_url IS NOT NULL AND source_url LIKE '%http%'
                        ")->fetchColumn();
                        
                        echo "<div class='info'>📊 source_url有データ: {$source_url_check}件</div>";
                        
                        if ($source_url_check == 0) {
                            echo "<div class='error'>❌ データベースに保存されていません！</div>";
                            echo "<div class='warning'>⚠️ スクレイピング成功 → データベース保存失敗</div>";
                        } else {
                            echo "<div class='success'>✅ データベースに保存されています</div>";
                        }
                        
                    } else {
                        echo "<div class='error'>❌ スクレイピングサーバーがエラーを返しました</div>";
                        echo "<div class='error'>Error: " . ($api_response['error'] ?? 'Unknown error') . "</div>";
                    }
                } else {
                    echo "<div class='error'>❌ JSON Parse Failed</div>";
                    echo "<div class='error'>Raw Response: " . htmlspecialchars($response) . "</div>";
                }
            } catch (Exception $json_error) {
                echo "<div class='error'>❌ JSON処理エラー: " . $json_error->getMessage() . "</div>";
            }
        }
        
    } catch (Exception $e) {
        echo "<div class='error'>❌ テストスクレイピング実行エラー: " . $e->getMessage() . "</div>";
    }
    
} else {
    echo "<a href='?test_scraping=true' style='display:inline-block; background:#007bff; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; margin:10px 0;'>🧪 テストスクレイピング実行</a>";
}

echo "<h2>3. データベース保存処理の確認</h2>";

// データベース保存のテスト
if (isset($_GET['test_db_save']) && $_GET['test_db_save'] === 'true') {
    echo "<div class='info'>💾 データベース直接保存テスト実行中...</div>";
    
    try {
        $test_data = [
            'item_id' => 'TEST_SCRAPING_' . time(),
            'title' => 'テストスクレイピング商品 - ' . date('Y-m-d H:i:s'),
            'current_price' => 1500.00,
            'source_url' => 'https://auctions.yahoo.co.jp/jp/auction/test' . time(),
            'scraped_at' => 'NOW()',
            'yahoo_auction_id' => 'test' . time(),
            'category_name' => 'Test Category',
            'condition_name' => 'Used'
        ];
        
        $insert_sql = "
            INSERT INTO mystical_japan_treasures_inventory 
            (item_id, title, current_price, source_url, scraped_at, yahoo_auction_id, category_name, condition_name)
            VALUES 
            (:item_id, :title, :current_price, :source_url, NOW(), :yahoo_auction_id, :category_name, :condition_name)
        ";
        
        $stmt = $pdo->prepare($insert_sql);
        $result = $stmt->execute([
            'item_id' => $test_data['item_id'],
            'title' => $test_data['title'],
            'current_price' => $test_data['current_price'],
            'source_url' => $test_data['source_url'],
            'yahoo_auction_id' => $test_data['yahoo_auction_id'],
            'category_name' => $test_data['category_name'],
            'condition_name' => $test_data['condition_name']
        ]);
        
        if ($result) {
            echo "<div class='success'>✅ データベース直接保存成功</div>";
            echo "<pre>" . print_r($test_data, true) . "</pre>";
            
            // 挿入確認
            $verify_sql = "SELECT * FROM mystical_japan_treasures_inventory WHERE item_id = :item_id";
            $verify_stmt = $pdo->prepare($verify_sql);
            $verify_stmt->execute(['item_id' => $test_data['item_id']]);
            $saved_data = $verify_stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($saved_data) {
                echo "<div class='success'>✅ 保存データ確認完了</div>";
                echo "<div class='info'>📊 source_url: " . htmlspecialchars($saved_data['source_url']) . "</div>";
                echo "<div class='info'>📊 scraped_at: " . htmlspecialchars($saved_data['scraped_at']) . "</div>";
            } else {
                echo "<div class='error'>❌ 保存データが見つかりません</div>";
            }
            
        } else {
            echo "<div class='error'>❌ データベース直接保存失敗</div>";
        }
        
    } catch (Exception $e) {
        echo "<div class='error'>❌ データベース保存テストエラー: " . $e->getMessage() . "</div>";
    }
    
} else {
    echo "<a href='?test_db_save=true' style='display:inline-block; background:#28a745; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; margin:10px 0;'>💾 データベース保存テスト</a>";
}

echo "<h2>4. スクレイピング設定確認</h2>";

// PHPの設定確認
echo "<div class='info'>📋 PHP設定:</div>";
echo "<ul>";
echo "<li>allow_url_fopen: " . (ini_get('allow_url_fopen') ? '✅ 有効' : '❌ 無効') . "</li>";
echo "<li>cURL: " . (extension_loaded('curl') ? '✅ 有効' : '❌ 無効') . "</li>";
echo "<li>PDO PostgreSQL: " . (extension_loaded('pdo_pgsql') ? '✅ 有効' : '❌ 無効') . "</li>";
echo "</ul>";

// データベース接続文字列確認
echo "<div class='info'>📋 データベース設定:</div>";
echo "<ul>";
echo "<li>Host: localhost</li>";
echo "<li>Database: nagano3_db</li>";
echo "<li>User: postgres</li>";
echo "<li>Password: [設定済み]</li>";
echo "</ul>";

echo "<h2>5. 推定される問題と解決策</h2>";

echo "<div style='background:#fff3cd; padding:15px; border-radius:8px; margin-top:20px;'>";
echo "<strong>🔍 問題の推定:</strong><br>";
echo "1. <strong>スクレイピングサーバー</strong>は正常に動作している<br>";
echo "2. <strong>APIレスポンス</strong>では成功と表示される<br>";
echo "3. <strong>データベース保存処理</strong>が実行されていない<br>";
echo "4. <strong>接続設定</strong>またはAPIサーバーの保存ロジックに問題<br><br>";

echo "<strong>🔧 解決方法:</strong><br>";
echo "1. 上記の「テストスクレイピング実行」で詳細確認<br>";
echo "2. 「データベース保存テスト」で直接保存を確認<br>";
echo "3. スクレイピングサーバーのデータベース設定を確認<br>";
echo "4. APIサーバーのログを確認<br>";
echo "</div>";

echo "<hr>";
echo "<div style='background:#e3f2fd; padding:15px; border-radius:8px; margin-top:20px;'>";
echo "<strong>📝 結論:</strong><br>";
echo "「スクレイピング成功」と表示されるのに実際のデータが保存されない問題は、<br>";
echo "<strong>スクレイピングサーバーとデータベースの連携部分</strong>にあります。<br>";
echo "上記のテストで詳細な原因を特定できます。";
echo "</div>";
?>
