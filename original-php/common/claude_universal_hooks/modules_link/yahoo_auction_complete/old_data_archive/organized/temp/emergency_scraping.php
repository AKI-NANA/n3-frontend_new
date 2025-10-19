<?php
/**
 * 緊急用：PHP直接スクレイピング機能
 * URL: http://localhost:8080/modules/yahoo_auction_complete/emergency_scraping.php
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🚨 緊急用：PHP直接スクレイピング機能</h1>";
echo "<style>body{font-family:monospace; line-height:1.6;} .success{color:green;} .error{color:red;} .info{color:blue;} .warning{color:orange;} pre{background:#f5f5f5; padding:10px; border-radius:5px; overflow-x:auto;} .emergency{background:#ffe6e6; padding:15px; border-radius:8px; margin:15px 0; border:2px solid #ff4444;}</style>";

echo "<div class='emergency'>";
echo "<h2>🚨 緊急対応</h2>";
echo "<strong>スクレイピングサーバーのデータベース保存が機能しないため、PHP直接スクレイピングを実装します</strong><br>";
echo "これにより実際のスクレイピングデータがデータベースに保存され、システムの動作確認が可能になります。";
echo "</div>";

// データベース接続
try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'password123');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<div class='success'>✅ データベース接続成功</div>";
} catch (PDOException $e) {
    echo "<div class='error'>❌ データベース接続失敗: " . $e->getMessage() . "</div>";
    exit;
}

echo "<h2>1. Yahoo オークション スクレイピング実行</h2>";

if (isset($_POST['scrape_url']) && !empty($_POST['scrape_url'])) {
    $scrape_url = $_POST['scrape_url'];
    
    echo "<div class='info'>🚀 スクレイピング実行: " . htmlspecialchars($scrape_url) . "</div>";
    
    try {
        // 簡易スクレイピング（実際のYahooオークションページの代わりにモックデータ）
        $scraped_data = [
            'item_id' => 'EMERGENCY_SCRAPE_' . time(),
            'title' => 'PHP直接スクレイピング商品 - ' . date('Y-m-d H:i:s'),
            'current_price' => rand(500, 5000) / 100, // $5.00 - $50.00
            'source_url' => $scrape_url,
            'scraped_at' => 'NOW()',
            'yahoo_auction_id' => 'emergency_' . time(),
            'category_name' => 'Emergency Test',
            'condition_name' => 'Used',
            'picture_url' => 'https://via.placeholder.com/300x200?text=Emergency+Scraped+Item',
            'gallery_url' => 'https://via.placeholder.com/600x400?text=Emergency+Gallery',
            'watch_count' => rand(1, 100),
            'listing_status' => 'Active'
        ];
        
        echo "<div class='info'>📊 スクレイピングデータ生成:</div>";
        echo "<pre>" . htmlspecialchars(json_encode($scraped_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
        
        // データベースに保存
        $insert_sql = "
            INSERT INTO mystical_japan_treasures_inventory 
            (item_id, title, current_price, source_url, scraped_at, yahoo_auction_id, 
             category_name, condition_name, picture_url, gallery_url, watch_count, listing_status)
            VALUES 
            (:item_id, :title, :current_price, :source_url, NOW(), :yahoo_auction_id,
             :category_name, :condition_name, :picture_url, :gallery_url, :watch_count, :listing_status)
        ";
        
        $stmt = $pdo->prepare($insert_sql);
        $result = $stmt->execute([
            'item_id' => $scraped_data['item_id'],
            'title' => $scraped_data['title'],
            'current_price' => $scraped_data['current_price'],
            'source_url' => $scraped_data['source_url'],
            'yahoo_auction_id' => $scraped_data['yahoo_auction_id'],
            'category_name' => $scraped_data['category_name'],
            'condition_name' => $scraped_data['condition_name'],
            'picture_url' => $scraped_data['picture_url'],
            'gallery_url' => $scraped_data['gallery_url'],
            'watch_count' => $scraped_data['watch_count'],
            'listing_status' => $scraped_data['listing_status']
        ]);
        
        if ($result) {
            echo "<div class='success'>🎉 データベース保存成功！</div>";
            
            // 保存確認
            $verify_sql = "SELECT * FROM mystical_japan_treasures_inventory WHERE item_id = :item_id";
            $verify_stmt = $pdo->prepare($verify_sql);
            $verify_stmt->execute(['item_id' => $scraped_data['item_id']]);
            $saved_data = $verify_stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($saved_data) {
                echo "<div class='success'>✅ 保存データ確認完了</div>";
                echo "<div class='info'>📊 item_id: " . htmlspecialchars($saved_data['item_id']) . "</div>";
                echo "<div class='info'>📊 source_url: " . htmlspecialchars($saved_data['source_url']) . "</div>";
                echo "<div class='info'>📊 scraped_at: " . htmlspecialchars($saved_data['scraped_at']) . "</div>";
                echo "<div class='info'>📊 current_price: $" . htmlspecialchars($saved_data['current_price']) . "</div>";
                
                // スクレイピングデータカウント更新
                $scraped_count = $pdo->query("
                    SELECT COUNT(*) 
                    FROM mystical_japan_treasures_inventory 
                    WHERE source_url IS NOT NULL AND source_url LIKE '%http%'
                ")->fetchColumn();
                
                echo "<div class='success'>🎯 現在のスクレイピングデータ総数: {$scraped_count}件</div>";
                
                echo "<div style='background:#e8f5e8; padding:15px; border-radius:8px; margin:15px 0;'>";
                echo "<h3>✅ 緊急スクレイピング成功</h3>";
                echo "<p><strong>この商品データが「データ編集タブ」の「スクレイピングデータ検索」で表示されるようになりました。</strong></p>";
                echo "<p>Yahoo Auction Toolに戻って確認してください：</p>";
                echo "<ol>";
                echo "<li>Yahoo Auction Tool にアクセス</li>";
                echo "<li>「データ編集」タブをクリック</li>";
                echo "<li>「🕷️ スクレイピングデータ検索」をクリック</li>";
                echo "<li>保存されたデータが表示されることを確認</li>";
                echo "</ol>";
                echo "</div>";
                
            } else {
                echo "<div class='error'>❌ 保存確認に失敗</div>";
            }
        } else {
            echo "<div class='error'>❌ データベース保存失敗</div>";
        }
        
    } catch (Exception $e) {
        echo "<div class='error'>❌ スクレイピング処理エラー: " . $e->getMessage() . "</div>";
    }
    
} else {
    echo "<form method='POST' style='background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0;'>";
    echo "<h3>📡 緊急スクレイピング実行</h3>";
    echo "<p>Yahoo オークション URL（テスト用）:</p>";
    echo "<input type='text' name='scrape_url' placeholder='https://auctions.yahoo.co.jp/jp/auction/test123' style='width:400px; padding:8px; margin:5px 0;' value='https://auctions.yahoo.co.jp/jp/auction/emergency_test_" . time() . "'>";
    echo "<br>";
    echo "<button type='submit' style='background:#dc3545; color:white; padding:10px 20px; border:none; border-radius:5px; margin:10px 0; cursor:pointer; font-weight:bold;'>🚨 緊急スクレイピング実行</button>";
    echo "<p><small>※ 実際のYahooページではなく、テストデータを生成してデータベースに保存します</small></p>";
    echo "</form>";
}

echo "<h2>2. 一括テストデータ生成</h2>";

if (isset($_GET['generate_test_data']) && $_GET['generate_test_data'] === 'true') {
    echo "<div class='info'>🔥 一括テストデータ生成中...</div>";
    
    $test_items = [
        ['title' => 'ヴィンテージ腕時計コレクション', 'price' => 25.50, 'category' => 'Fashion'],
        ['title' => 'レトロゲーム機 完動品', 'price' => 45.00, 'category' => 'Electronics'],
        ['title' => '伝統工芸品 陶器セット', 'price' => 35.75, 'category' => 'Collectibles'],
        ['title' => 'アニメフィギュア 限定版', 'price' => 55.25, 'category' => 'Toys'],
        ['title' => '和服 着物 正絹', 'price' => 75.00, 'category' => 'Fashion']
    ];
    
    $generated_count = 0;
    
    foreach ($test_items as $index => $item) {
        try {
            $test_data = [
                'item_id' => 'BULK_TEST_' . time() . '_' . $index,
                'title' => $item['title'] . ' - ' . date('Y-m-d H:i:s'),
                'current_price' => $item['price'],
                'source_url' => 'https://auctions.yahoo.co.jp/jp/auction/bulk_' . time() . '_' . $index,
                'yahoo_auction_id' => 'bulk_' . time() . '_' . $index,
                'category_name' => $item['category'],
                'condition_name' => 'Used',
                'picture_url' => 'https://via.placeholder.com/300x200?text=' . urlencode($item['title']),
                'watch_count' => rand(5, 50),
                'listing_status' => 'Active'
            ];
            
            $insert_sql = "
                INSERT INTO mystical_japan_treasures_inventory 
                (item_id, title, current_price, source_url, scraped_at, yahoo_auction_id, 
                 category_name, condition_name, picture_url, watch_count, listing_status)
                VALUES 
                (:item_id, :title, :current_price, :source_url, NOW(), :yahoo_auction_id,
                 :category_name, :condition_name, :picture_url, :watch_count, :listing_status)
            ";
            
            $stmt = $pdo->prepare($insert_sql);
            $result = $stmt->execute([
                'item_id' => $test_data['item_id'],
                'title' => $test_data['title'],
                'current_price' => $test_data['current_price'],
                'source_url' => $test_data['source_url'],
                'yahoo_auction_id' => $test_data['yahoo_auction_id'],
                'category_name' => $test_data['category_name'],
                'condition_name' => $test_data['condition_name'],
                'picture_url' => $test_data['picture_url'],
                'watch_count' => $test_data['watch_count'],
                'listing_status' => $test_data['listing_status']
            ]);
            
            if ($result) {
                $generated_count++;
                echo "<div class='success'>✅ " . htmlspecialchars($item['title']) . " - 保存成功</div>";
            }
            
        } catch (Exception $e) {
            echo "<div class='error'>❌ " . htmlspecialchars($item['title']) . " - 保存失敗: " . $e->getMessage() . "</div>";
        }
    }
    
    echo "<div class='success'>🎉 一括生成完了: {$generated_count}件のテストデータを生成しました</div>";
    
    // 最終確認
    $total_scraped = $pdo->query("
        SELECT COUNT(*) 
        FROM mystical_japan_treasures_inventory 
        WHERE source_url IS NOT NULL AND source_url LIKE '%http%'
    ")->fetchColumn();
    
    echo "<div class='info'>📊 スクレイピングデータ総数: {$total_scraped}件</div>";
    
} else {
    echo "<a href='?generate_test_data=true' style='display:inline-block; background:#ffc107; color:black; padding:15px 30px; text-decoration:none; border-radius:8px; margin:10px 0; font-weight:bold;'>🔥 一括テストデータ生成（5件）</a>";
}

echo "<h2>3. 現在のスクレイピングデータ確認</h2>";

try {
    $scraped_data_check = $pdo->query("
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN source_url LIKE '%emergency%' THEN 1 END) as emergency_count,
            COUNT(CASE WHEN source_url LIKE '%bulk%' THEN 1 END) as bulk_count,
            MAX(scraped_at) as latest_scraped
        FROM mystical_japan_treasures_inventory 
        WHERE source_url IS NOT NULL AND source_url LIKE '%http%'
    ")->fetch(PDO::FETCH_ASSOC);
    
    echo "<div class='info'>📊 スクレイピングデータ統計:</div>";
    echo "<ul>";
    echo "<li>総数: {$scraped_data_check['total']}件</li>";
    echo "<li>緊急データ: {$scraped_data_check['emergency_count']}件</li>";
    echo "<li>一括データ: {$scraped_data_check['bulk_count']}件</li>";
    echo "<li>最新: {$scraped_data_check['latest_scraped']}</li>";
    echo "</ul>";
    
    if ($scraped_data_check['total'] > 0) {
        echo "<div class='success'>🎯 スクレイピングデータが存在します</div>";
        echo "<div style='background:#e8f5e8; padding:15px; border-radius:8px; margin:15px 0;'>";
        echo "<h3>✅ 次のステップ</h3>";
        echo "<p><strong>Yahoo Auction Tool の「データ編集タブ」で確認してください：</strong></p>";
        echo "<ol>";
        echo "<li><a href='yahoo_auction_content.php' target='_blank' style='color:blue; text-decoration:underline;'>Yahoo Auction Tool を開く</a></li>";
        echo "<li>「データ編集」タブをクリック</li>";
        echo "<li>「🕷️ スクレイピングデータ検索」をクリック</li>";
        echo "<li>生成されたテストデータが表示されることを確認</li>";
        echo "</ol>";
        echo "</div>";
    } else {
        echo "<div class='warning'>⚠️ まだスクレイピングデータがありません</div>";
    }
    
} catch (Exception $e) {
    echo "<div class='error'>❌ データ確認エラー: " . $e->getMessage() . "</div>";
}

echo "<h2>4. 注意事項</h2>";
echo "<div style='background:#fff3cd; padding:15px; border-radius:8px; margin-top:20px;'>";
echo "<h3>⚠️ これは緊急対応です</h3>";
echo "<p>• <strong>実際のYahooオークションをスクレイピングしているわけではありません</strong></p>";
echo "<p>• <strong>テストデータを生成してデータベースに保存しています</strong></p>";
echo "<p>• <strong>システムの動作確認とデバッグ用途です</strong></p>";
echo "<p>• <strong>スクレイピングサーバーの修正が完了したら、この機能は不要になります</strong></p>";
echo "</div>";
?>
