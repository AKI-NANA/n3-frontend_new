<?php
/**
 * スクレイピングサーバー データベース設定診断・修正ツール
 * URL: http://localhost:8080/modules/yahoo_auction_complete/fix_scraping_database.php
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🛠️ スクレイピングサーバー データベース設定診断・修正</h1>";
echo "<style>body{font-family:monospace; line-height:1.6;} .success{color:green;} .error{color:red;} .info{color:blue;} .warning{color:orange;} pre{background:#f5f5f5; padding:10px; border-radius:5px; overflow-x:auto;} .fix-section{background:#e8f5e8; padding:15px; border-radius:8px; margin:15px 0;} .problem{background:#ffe6e6; padding:15px; border-radius:8px; margin:15px 0;}</style>";

$api_url = 'http://localhost:5002';

echo "<div class='problem'>";
echo "<h2>🚨 確認された問題</h2>";
echo "<strong>スクレイピングAPIは「1件のデータを取得・保存しました」と応答するが、実際にはデータベースに保存されていない</strong><br>";
echo "これは<strong>スクレイピングサーバーのデータベース設定</strong>に問題があることを示しています。";
echo "</div>";

echo "<h2>1. スクレイピングサーバーのデータベース設定確認</h2>";

// API経由でデータベース設定を確認
try {
    echo "<h3>📡 APIサーバーの設定情報取得</h3>";
    
    $config_endpoints = [
        '/api/config' => 'データベース設定',
        '/api/database_status' => 'データベース状況',
        '/api/debug/database' => 'データベースデバッグ情報',
        '/debug' => 'デバッグ情報',
        '/config' => '設定情報'
    ];
    
    foreach ($config_endpoints as $endpoint => $description) {
        echo "<h4>{$description} ({$endpoint})</h4>";
        
        $ch = curl_init($api_url . $endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code == 200 && $response) {
            $data = json_decode($response, true);
            if ($data) {
                echo "<div class='success'>✅ 取得成功</div>";
                echo "<pre>" . htmlspecialchars(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
            } else {
                echo "<div class='info'>📝 Raw Response:</div>";
                echo "<pre>" . htmlspecialchars($response) . "</pre>";
            }
        } else {
            echo "<div class='warning'>⚠️ エンドポイントなし (HTTP {$http_code})</div>";
        }
    }
    
} catch (Exception $e) {
    echo "<div class='error'>❌ 設定取得エラー: " . $e->getMessage() . "</div>";
}

echo "<h2>2. スクレイピングサーバーへの設定修正リクエスト</h2>";

if (isset($_GET['fix_database_config']) && $_GET['fix_database_config'] === 'true') {
    echo "<div class='info'>🔧 データベース設定修正リクエスト送信中...</div>";
    
    $correct_database_config = [
        'database_config' => [
            'host' => 'localhost',
            'port' => 5432,
            'database' => 'nagano3_db',
            'user' => 'postgres',
            'password' => 'password123',
            'table' => 'mystical_japan_treasures_inventory',
            'ssl_mode' => 'prefer'
        ],
        'save_options' => [
            'save_to_db' => true,
            'verify_save' => true,
            'log_save_operations' => true
        ]
    ];
    
    // POST で設定更新を試行
    $ch = curl_init($api_url . '/api/update_config');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($correct_database_config));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'User-Agent: Yahoo-Auction-Tool-Fix/1.0'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "<div class='info'>📡 HTTP Code: {$http_code}</div>";
    
    if ($response) {
        $update_result = json_decode($response, true);
        if ($update_result) {
            echo "<div class='success'>✅ 設定更新レスポンス受信</div>";
            echo "<pre>" . htmlspecialchars(json_encode($update_result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
        } else {
            echo "<div class='info'>📝 Raw Response:</div>";
            echo "<pre>" . htmlspecialchars($response) . "</pre>";
        }
    }
    
    // 設定修正後のテストスクレイピング
    echo "<h3>🧪 設定修正後のテストスクレイピング</h3>";
    
    $test_post_data = [
        'urls' => ['https://auctions.yahoo.co.jp/jp/auction/fix_test_' . time()],
        'options' => [
            'save_to_db' => true,
            'force_database_config' => [
                'host' => 'localhost',
                'database' => 'nagano3_db',
                'user' => 'postgres',
                'password' => 'password123'
            ],
            'verify_save' => true,
            'debug_mode' => true
        ]
    ];
    
    $ch = curl_init($api_url . '/api/scrape_yahoo');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($test_post_data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $test_response = curl_exec($ch);
    $test_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "<div class='info'>📡 テストスクレイピング HTTP Code: {$test_http_code}</div>";
    
    if ($test_response) {
        $test_result = json_decode($test_response, true);
        if ($test_result) {
            echo "<div class='success'>✅ テスト結果受信</div>";
            echo "<pre>" . htmlspecialchars(json_encode($test_result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
            
            // データベース確認
            echo "<div class='info'>🔍 修正後データベース確認...</div>";
            
            try {
                $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'password123');
                
                sleep(2);
                
                $recent_check = $pdo->query("
                    SELECT COUNT(*) as count, MAX(updated_at) as latest
                    FROM mystical_japan_treasures_inventory 
                    WHERE updated_at >= NOW() - INTERVAL '3 minutes'
                    AND source_url LIKE '%fix_test_%'
                ")->fetch(PDO::FETCH_ASSOC);
                
                echo "<div class='info'>📊 修正テスト後のデータ: {$recent_check['count']}件</div>";
                
                if ($recent_check['count'] > 0) {
                    echo "<div class='success'>🎉 修正成功！データベース保存されました！</div>";
                } else {
                    echo "<div class='error'>❌ 修正後もデータベース保存されていません</div>";
                }
                
            } catch (Exception $db_e) {
                echo "<div class='error'>❌ データベース確認エラー: " . $db_e->getMessage() . "</div>";
            }
        }
    }
    
} else {
    echo "<a href='?fix_database_config=true' style='display:inline-block; background:#28a745; color:white; padding:15px 30px; text-decoration:none; border-radius:8px; margin:10px 0; font-weight:bold;'>🔧 データベース設定修正を試行</a>";
}

echo "<h2>3. 手動修正手順</h2>";

echo "<div class='fix-section'>";
echo "<h3>🛠️ スクレイピングサーバーを手動で修正する方法</h3>";

echo "<h4>A. スクレイピングサーバーのコンソールログ確認</h4>";
echo "<pre>";
echo "1. スクレイピングサーバーが起動しているターミナルを確認\n";
echo "2. データベース接続エラーメッセージを探す\n";
echo "3. 'save_to_db' に関するログメッセージを確認\n";
echo "4. PostgreSQL 接続エラーがないか確認\n";
echo "</pre>";

echo "<h4>B. 正しいデータベース設定</h4>";
echo "<pre>";
echo "HOST: localhost\n";
echo "PORT: 5432\n";
echo "DATABASE: nagano3_db\n";
echo "USER: postgres\n";
echo "PASSWORD: password123\n";
echo "TABLE: mystical_japan_treasures_inventory\n";
echo "</pre>";

echo "<h4>C. スクレイピングサーバー再起動</h4>";
echo "<pre>";
echo "1. 現在のスクレイピングサーバーを停止 (Ctrl+C)\n";
echo "2. データベース設定を修正\n";
echo "3. サーバーを再起動\n";
echo "4. このページでテスト実行\n";
echo "</pre>";

echo "</div>";

echo "<h2>4. データベース接続テスト</h2>";

echo "<div class='info'>💾 直接データベース接続テスト実行中...</div>";

try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'password123');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<div class='success'>✅ PostgreSQL 接続成功</div>";
    
    // テーブル存在確認
    $table_exists = $pdo->query("
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'mystical_japan_treasures_inventory'
        );
    ")->fetchColumn();
    
    if ($table_exists) {
        echo "<div class='success'>✅ テーブル mystical_japan_treasures_inventory 存在確認</div>";
        
        // 現在のデータ数
        $current_count = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory")->fetchColumn();
        echo "<div class='info'>📊 現在のデータ数: {$current_count}件</div>";
        
        // source_urlがあるデータ数
        $source_url_count = $pdo->query("
            SELECT COUNT(*) 
            FROM mystical_japan_treasures_inventory 
            WHERE source_url IS NOT NULL AND source_url != ''
        ")->fetchColumn();
        echo "<div class='info'>📊 source_url有データ: {$source_url_count}件</div>";
        
        // 書き込み権限テスト
        $test_insert_sql = "
            INSERT INTO mystical_japan_treasures_inventory 
            (item_id, title, current_price, source_url) 
            VALUES 
            ('WRITE_TEST_' || extract(epoch from now()), 'Write Test', 100.00, 'https://test.example.com')
        ";
        
        try {
            $pdo->exec($test_insert_sql);
            echo "<div class='success'>✅ データベース書き込み権限OK</div>";
            
            // テストデータ削除
            $pdo->exec("DELETE FROM mystical_japan_treasures_inventory WHERE item_id LIKE 'WRITE_TEST_%'");
            
        } catch (Exception $write_e) {
            echo "<div class='error'>❌ データベース書き込み権限エラー: " . $write_e->getMessage() . "</div>";
        }
        
    } else {
        echo "<div class='error'>❌ テーブル mystical_japan_treasures_inventory が存在しません</div>";
    }
    
} catch (Exception $e) {
    echo "<div class='error'>❌ データベース接続エラー: " . $e->getMessage() . "</div>";
}

echo "<h2>5. 結論と次のステップ</h2>";

echo "<div style='background:#fff3cd; padding:15px; border-radius:8px; margin-top:20px;'>";
echo "<h3>🔍 問題の原因</h3>";
echo "<strong>スクレイピングサーバーのデータベース設定が間違っている</strong><br>";
echo "• 接続先データベースが違う<br>";
echo "• 認証情報が間違っている<br>";
echo "• テーブル名が間違っている<br>";
echo "• save_to_db オプションが無効<br><br>";

echo "<h3>🛠️ 解決方法</h3>";
echo "1. 上記の「データベース設定修正を試行」を実行<br>";
echo "2. スクレイピングサーバーのコンソールログを確認<br>";
echo "3. 設定修正後にスクレイピングサーバーを再起動<br>";
echo "4. 修正後に再度テスト実行<br>";
echo "</div>";
?>
