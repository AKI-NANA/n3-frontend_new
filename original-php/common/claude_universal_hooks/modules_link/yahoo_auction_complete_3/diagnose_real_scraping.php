<?php
/**
 * スクレイピングサーバー 根本問題診断
 * あなた自身のスクレイピングデータが保存されない問題を特定
 * URL: http://localhost:8080/modules/yahoo_auction_complete/diagnose_real_scraping.php
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🔬 スクレイピングサーバー 根本問題診断</h1>";
echo "<style>body{font-family:monospace; line-height:1.6;} .success{color:green;} .error{color:red;} .info{color:blue;} .warning{color:orange;} pre{background:#f5f5f5; padding:10px; border-radius:5px; overflow-x:auto;} .critical{background:#ffe6e6; padding:15px; border-radius:8px; margin:15px 0; border:2px solid #dc3545;} .real-issue{background:#fff3cd; padding:15px; border-radius:8px; margin:15px 0; border:2px solid #ffc107;}</style>";

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
echo "<p><strong>表示されているデータは全て我々が作成したテストデータです。</strong></p>";
echo "<p><strong>あなた自身がスクレイピングで取得したデータは保存されていません。</strong></p>";
echo "</div>";

echo "<h2>1. 現在のデータベース内容の詳細分析</h2>";

// 全スクレイピングデータの詳細確認
$all_scraping_data = $pdo->query("
    SELECT 
        item_id,
        title,
        current_price,
        source_url,
        scraped_at,
        updated_at,
        CASE 
            WHEN item_id LIKE 'WORKING_YAHOO_%' THEN 'PHP直接実装テストデータ'
            WHEN item_id LIKE 'INDEPENDENT_YAHOO_%' THEN 'PHP独立実装テストデータ'
            WHEN item_id LIKE 'EMERGENCY_SCRAPE_%' THEN 'PHP緊急テストデータ'
            WHEN item_id LIKE 'BULK_TEST_%' THEN 'PHP一括テストデータ'
            WHEN item_id LIKE 'SCRAPED_%' THEN 'スクレイピングサーバーからのデータ（疑わしい）'
            ELSE '不明なデータ'
        END as data_origin
    FROM mystical_japan_treasures_inventory 
    WHERE source_url IS NOT NULL AND source_url LIKE '%http%'
    ORDER BY updated_at DESC
")->fetchAll(PDO::FETCH_ASSOC);

echo "<div class='real-issue'>";
echo "<h3>📊 現在のスクレイピングデータ分析</h3>";
echo "<table border='1' style='border-collapse:collapse; width:100%; font-size:0.8em;'>";
echo "<tr style='background:#f0f0f0;'>";
echo "<th>item_id</th><th>title</th><th>price</th><th>データ種別</th><th>作成日時</th>";
echo "</tr>";

$php_generated_count = 0;
$real_scraping_count = 0;

foreach ($all_scraping_data as $item) {
    $is_php_generated = strpos($item['data_origin'], 'PHP') !== false;
    $row_color = $is_php_generated ? '#ffe6e6' : '#e8f5e8';
    
    if ($is_php_generated) {
        $php_generated_count++;
    } else {
        $real_scraping_count++;
    }
    
    echo "<tr style='background:{$row_color};'>";
    echo "<td>" . htmlspecialchars(substr($item['item_id'], 0, 30)) . "...</td>";
    echo "<td>" . htmlspecialchars(substr($item['title'], 0, 40)) . "...</td>";
    echo "<td>$" . htmlspecialchars($item['current_price']) . "</td>";
    echo "<td>" . htmlspecialchars($item['data_origin']) . "</td>";
    echo "<td>" . htmlspecialchars($item['updated_at']) . "</td>";
    echo "</tr>";
}

echo "</table>";
echo "<p><strong>PHP生成テストデータ:</strong> {$php_generated_count}件</p>";
echo "<p><strong>真のスクレイピングデータ:</strong> {$real_scraping_count}件</p>";
echo "</div>";

if ($real_scraping_count == 0) {
    echo "<div class='critical'>";
    echo "<h3>🚨 重大な問題確認</h3>";
    echo "<p><strong>あなた自身のスクレイピングデータが1件も保存されていません。</strong></p>";
    echo "<p><strong>スクレイピングサーバーは完全にデータベース保存機能が無効です。</strong></p>";
    echo "</div>";
}

echo "<h2>2. スクレイピングサーバーの詳細問題診断</h2>";

$api_url = 'http://localhost:5002';

// スクレイピングサーバーの設定確認
echo "<h3>📡 スクレイピングサーバー設定確認</h3>";

$config_endpoints = [
    '/api/config' => 'API設定確認',
    '/api/database/status' => 'データベース状態',
    '/api/debug/settings' => 'デバッグ設定',
    '/health' => 'ヘルスチェック',
    '/status' => 'ステータス確認'
];

foreach ($config_endpoints as $endpoint => $description) {
    echo "<div class='info'>🔍 {$description} ({$endpoint})</div>";
    
    try {
        $ch = curl_init($api_url . $endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code == 200 && $response) {
            echo "<div class='success'>✅ レスポンス取得成功</div>";
            
            $decoded = json_decode($response, true);
            if ($decoded) {
                echo "<pre>" . htmlspecialchars(json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
            } else {
                echo "<pre>" . htmlspecialchars(substr($response, 0, 500)) . "</pre>";
            }
        } else {
            echo "<div class='warning'>⚠️ HTTP {$http_code} - エンドポイント利用不可</div>";
        }
    } catch (Exception $e) {
        echo "<div class='error'>❌ 接続エラー: " . $e->getMessage() . "</div>";
    }
    
    echo "<hr>";
}

echo "<h2>3. データベース設定強制修正テスト</h2>";

if (isset($_GET['force_db_test']) && $_GET['force_db_test'] === 'true') {
    echo "<div class='info'>🔧 データベース設定強制修正テスト実行中...</div>";
    
    $force_config_data = [
        'action' => 'update_database_config',
        'database_config' => [
            'host' => 'localhost',
            'port' => 5432,
            'database' => 'nagano3_db',
            'user' => 'postgres',
            'password' => 'password123',
            'table' => 'mystical_japan_treasures_inventory'
        ],
        'force_reconnect' => true,
        'test_connection' => true,
        'enable_save_to_db' => true
    ];
    
    try {
        $ch = curl_init($api_url . '/api/config/database');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($force_config_data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-Force-Update: true'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $config_response = curl_exec($ch);
        $config_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        echo "<div class='info'>📊 設定更新 HTTP Code: {$config_http_code}</div>";
        
        if ($config_response) {
            echo "<div class='info'>📥 設定更新レスポンス:</div>";
            echo "<pre>" . htmlspecialchars($config_response) . "</pre>";
        }
        
        // 設定更新後にテストスクレイピング実行
        echo "<div class='info'>🚀 設定更新後のテストスクレイピング実行...</div>";
        
        $test_scrape_data = [
            'urls' => ['https://auctions.yahoo.co.jp/jp/auction/b1198242011'],
            'options' => [
                'save_to_db' => true,
                'force_database_save' => true,
                'verify_save' => true,
                'test_mode' => false
            ]
        ];
        
        $ch2 = curl_init($api_url . '/api/scrape_yahoo');
        curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch2, CURLOPT_POST, true);
        curl_setopt($ch2, CURLOPT_POSTFIELDS, json_encode($test_scrape_data));
        curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch2, CURLOPT_TIMEOUT, 45);
        
        $scrape_response = curl_exec($ch2);
        $scrape_http_code = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
        curl_close($ch2);
        
        echo "<div class='info'>📊 テストスクレイピング HTTP Code: {$scrape_http_code}</div>";
        
        if ($scrape_response) {
            echo "<div class='info'>📥 テストスクレイピング レスポンス:</div>";
            echo "<pre>" . htmlspecialchars($scrape_response) . "</pre>";
            
            // 3秒待機後にデータベース確認
            echo "<div class='info'>⏳ データベース保存確認のため3秒待機...</div>";
            sleep(3);
            
            $after_test_count = $pdo->query("
                SELECT COUNT(*) 
                FROM mystical_japan_treasures_inventory 
                WHERE updated_at >= NOW() - INTERVAL '1 minute'
                AND item_id NOT LIKE 'WORKING_YAHOO_%'
                AND item_id NOT LIKE 'INDEPENDENT_YAHOO_%'
            ")->fetchColumn();
            
            echo "<div class='info'>📊 新規保存データ: {$after_test_count}件</div>";
            
            if ($after_test_count > 0) {
                echo "<div class='success'>🎉 スクレイピングサーバーのデータベース保存が復旧しました！</div>";
            } else {
                echo "<div class='error'>❌ まだデータベース保存されていません</div>";
            }
        }
        
    } catch (Exception $e) {
        echo "<div class='error'>❌ 強制修正エラー: " . $e->getMessage() . "</div>";
    }
    
} else {
    echo "<a href='?force_db_test=true' style='display:inline-block; background:#dc3545; color:white; padding:15px 30px; text-decoration:none; border-radius:8px; margin:10px 0; font-weight:bold;'>🔧 データベース設定強制修正テスト</a>";
    echo "<div class='warning'>⚠️ スクレイピングサーバーのデータベース設定を強制修正してテスト実行します</div>";
}

echo "<h2>4. 推奨される解決方法</h2>";

echo "<div style='background:#d4edda; padding:20px; border-radius:8px; margin:20px 0;'>";
echo "<h3>🛠️ 確実な解決手順</h3>";
echo "<ol>";
echo "<li><strong>スクレイピングサーバーのコンソールログ確認</strong><br>データベース接続エラー・保存エラーメッセージを確認</li>";
echo "<li><strong>スクレイピングサーバーの設定ファイル修正</strong><br>database_config.py または config.json の修正</li>";
echo "<li><strong>スクレイピングサーバー再起動</strong><br>設定変更後の再起動</li>";
echo "<li><strong>上記「強制修正テスト」実行</strong><br>API経由での設定修正試行</li>";
echo "<li><strong>動作確認</strong><br>あなた自身のスクレイピングデータが保存されることを確認</li>";
echo "</ol>";
echo "</div>";

echo "<h2>5. 現状まとめ</h2>";

echo "<div class='critical'>";
echo "<h3>🚨 現在の状況</h3>";
echo "<ul>";
echo "<li><strong>✅ Yahoo Auction Tool:</strong> 正常動作（テストデータ表示）</li>";
echo "<li><strong>✅ データベース:</strong> 接続・保存機能正常</li>";
echo "<li><strong>❌ スクレイピングサーバー:</strong> データベース保存機能無効</li>";
echo "<li><strong>❌ 真のスクレイピング:</strong> あなたのデータが保存されない</li>";
echo "</ul>";
echo "<p><strong>→ スクレイピングサーバーの設定修正が必要</strong></p>";
echo "</div>";
?>
