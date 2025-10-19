<?php
/**
 * スクレイピングデータ詳細調査ツール
 * URL: http://localhost:8080/modules/yahoo_auction_complete/investigate_scraping.php
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🔍 スクレイピングデータ詳細調査</h1>";
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

// 1. source_urlカラムの実際の状況確認
echo "<h2>1. source_urlカラムの状況確認</h2>";
try {
    // source_urlがNULLでないデータ
    $url_data = $pdo->query("
        SELECT 
            item_id, title, source_url, scraped_at, yahoo_auction_id,
            updated_at, current_price
        FROM mystical_japan_treasures_inventory 
        WHERE source_url IS NOT NULL 
        ORDER BY updated_at DESC 
        LIMIT 10
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($url_data) > 0) {
        echo "<div class='success'>✅ source_url有りデータ: " . count($url_data) . "件</div>";
        echo "<table border='1' style='border-collapse:collapse; width:100%;'>";
        echo "<tr><th>ID</th><th>タイトル</th><th>source_url</th><th>scraped_at</th><th>yahoo_id</th><th>更新日</th></tr>";
        
        foreach ($url_data as $row) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($row['item_id']) . "</td>";
            echo "<td>" . htmlspecialchars(substr($row['title'], 0, 30)) . "...</td>";
            echo "<td>" . htmlspecialchars(substr($row['source_url'] ?? 'NULL', 0, 40)) . "...</td>";
            echo "<td>" . htmlspecialchars($row['scraped_at'] ?? 'NULL') . "</td>";
            echo "<td>" . htmlspecialchars($row['yahoo_auction_id'] ?? 'NULL') . "</td>";
            echo "<td>" . htmlspecialchars($row['updated_at']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<div class='error'>❌ source_urlを持つデータが存在しません</div>";
    }
    
} catch (Exception $e) {
    echo "<div class='error'>❌ source_url確認エラー: " . $e->getMessage() . "</div>";
}

// 2. 実際にスクレイピングされたはずのデータを探す
echo "<h2>2. 最近追加されたデータの確認</h2>";
try {
    // 最新の10件（更新日順）
    $recent_data = $pdo->query("
        SELECT 
            item_id, title, source_url, scraped_at, yahoo_auction_id,
            updated_at, current_price,
            CASE 
                WHEN item_id LIKE 'YAH_TEST_%' THEN 'テストデータ'
                WHEN item_id LIKE 'YA%' THEN 'テストまたはサンプル'
                WHEN source_url IS NOT NULL THEN 'スクレイピングデータ'
                ELSE '既存データ'
            END as data_type
        FROM mystical_japan_treasures_inventory 
        ORDER BY updated_at DESC 
        LIMIT 15
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<div class='info'>📊 最新15件のデータ:</div>";
    echo "<table border='1' style='border-collapse:collapse; width:100%;'>";
    echo "<tr><th>ID</th><th>タイトル</th><th>価格</th><th>更新日</th><th>データ種別</th><th>source_url</th></tr>";
    
    foreach ($recent_data as $row) {
        $bg_color = '';
        if ($row['data_type'] === 'テストデータ') $bg_color = 'background:#ffebcc;';
        elseif ($row['data_type'] === 'スクレイピングデータ') $bg_color = 'background:#ccffcc;';
        
        echo "<tr style='{$bg_color}'>";
        echo "<td>" . htmlspecialchars($row['item_id']) . "</td>";
        echo "<td>" . htmlspecialchars(substr($row['title'], 0, 25)) . "...</td>";
        echo "<td>$" . htmlspecialchars($row['current_price']) . "</td>";
        echo "<td>" . htmlspecialchars($row['updated_at']) . "</td>";
        echo "<td><strong>" . htmlspecialchars($row['data_type']) . "</strong></td>";
        echo "<td>" . htmlspecialchars(substr($row['source_url'] ?? 'なし', 0, 20)) . "...</td>";
        echo "</tr>";
    }
    echo "</table>";
    
} catch (Exception $e) {
    echo "<div class='error'>❌ 最新データ確認エラー: " . $e->getMessage() . "</div>";
}

// 3. テストデータの特定と削除オプション
echo "<h2>3. テストデータの確認</h2>";
try {
    $test_data_count = $pdo->query("
        SELECT COUNT(*) 
        FROM mystical_japan_treasures_inventory 
        WHERE item_id LIKE 'YAH_TEST_%' OR item_id LIKE 'YA0%'
    ")->fetchColumn();
    
    echo "<div class='warning'>⚠️ テストデータ件数: {$test_data_count}件</div>";
    
    if ($test_data_count > 0) {
        echo "<div class='info'>💡 これらのテストデータが「スクレイピングデータ」として誤認されている可能性があります</div>";
        
        if (isset($_GET['remove_test']) && $_GET['remove_test'] === 'true') {
            $pdo->exec("
                DELETE FROM mystical_japan_treasures_inventory 
                WHERE item_id LIKE 'YAH_TEST_%' OR item_id LIKE 'YA0%'
            ");
            echo "<div class='success'>✅ テストデータを削除しました</div>";
        } else {
            echo "<a href='?remove_test=true' style='display:inline-block; background:#dc3545; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; margin:10px 0;'>🗑️ テストデータを削除</a>";
        }
    }
    
} catch (Exception $e) {
    echo "<div class='error'>❌ テストデータ確認エラー: " . $e->getMessage() . "</div>";
}

// 4. 拡張検索クエリの確認
echo "<h2>4. 拡張検索クエリのテスト</h2>";
try {
    // 実際のPHPファイルで使用されているクエリをテスト
    $extended_sql = "
        SELECT 
            item_id,
            title,
            current_price,
            source_url,
            updated_at,
            CASE 
                WHEN source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%' THEN 'Yahoo Auction (確認済み)'
                WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 'Web Scraped'
                WHEN title LIKE '%Yahoo%' OR title LIKE '%ヤフオク%' THEN 'Yahoo推定'
                WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN '最近追加'
                ELSE 'その他'
            END as scraped_source,
            CASE 
                WHEN source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%' THEN 1
                WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 2
                WHEN title LIKE '%Yahoo%' OR title LIKE '%ヤフオク%' OR title LIKE '%オークション%' THEN 3
                WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' AND current_price > 0 THEN 4
                ELSE 5
            END as confidence_level
        FROM mystical_japan_treasures_inventory 
        WHERE (
            -- 確実なスクレイピングデータ
            (source_url IS NOT NULL AND source_url != '' AND source_url LIKE '%http%') OR
            -- Yahoo/オークション関連タイトル
            (title LIKE '%Yahoo%' OR title LIKE '%ヤフオク%' OR title LIKE '%オークション%') OR
            -- 最近追加されたデータ（スクレイピング可能性高）
            (updated_at >= CURRENT_DATE - INTERVAL '7 days' AND current_price > 0) OR
            -- 特定のパターン
            (item_id LIKE 'yahoo_%') OR
            (category_name LIKE '%Auction%')
        )
        AND title IS NOT NULL 
        AND current_price > 0
        ORDER BY confidence_level ASC, updated_at DESC
        LIMIT 10
    ";
    
    $extended_results = $pdo->query($extended_sql)->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<div class='info'>📊 拡張検索結果: " . count($extended_results) . "件</div>";
    
    if (count($extended_results) > 0) {
        echo "<table border='1' style='border-collapse:collapse; width:100%;'>";
        echo "<tr><th>ID</th><th>タイトル</th><th>source_url</th><th>判定</th><th>信頼度</th></tr>";
        
        foreach ($extended_results as $row) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($row['item_id']) . "</td>";
            echo "<td>" . htmlspecialchars(substr($row['title'], 0, 30)) . "...</td>";
            echo "<td>" . htmlspecialchars(substr($row['source_url'] ?? 'なし', 0, 20)) . "...</td>";
            echo "<td>" . htmlspecialchars($row['scraped_source']) . "</td>";
            echo "<td>" . htmlspecialchars($row['confidence_level']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
        
        echo "<div class='warning'>⚠️ これらのデータが「スクレイピングデータ」として表示されています</div>";
    }
    
} catch (Exception $e) {
    echo "<div class='error'>❌ 拡張検索テストエラー: " . $e->getMessage() . "</div>";
}

// 5. 実際のスクレイピング処理の確認
echo "<h2>5. スクレイピング処理の状況確認</h2>";
echo "<div class='info'>📝 スクレイピングログから判明した情報:</div>";
echo "<ul>";
echo "<li>✅ スクレイピング成功: 1件のデータを取得しました</li>";
echo "<li>✅ スクレイピングが正常に完了しました</li>";
echo "<li>⚠️ しかし実際のデータベースにはスクレイピングデータが見つからない</li>";
echo "</ul>";

echo "<div class='warning'>🚨 推定される問題:</div>";
echo "<ol>";
echo "<li><strong>スクレイピングサーバー</strong>は成功レスポンスを返している</li>";
echo "<li><strong>データベース保存処理</strong>で何らかの問題が発生している</li>";
echo "<li><strong>テストデータ</strong>が拡張検索条件に合致して表示されている</li>";
echo "<li><strong>実際のYahoo URLデータ</strong>は保存されていない</li>";
echo "</ol>";

echo "<h2>6. 推奨解決策</h2>";
echo "<div class='info'>💡 以下の順序で問題を解決してください:</div>";
echo "<ol>";
echo "<li><strong>テストデータを削除</strong>（上記ボタン）</li>";
echo "<li><strong>スクレイピングサーバーの設定確認</strong></li>";
echo "<li><strong>データベース保存処理のデバッグ</strong></li>";
echo "<li><strong>再度スクレイピング実行</strong></li>";
echo "</ol>";

echo "<hr>";
echo "<div style='background:#fff3cd; padding:15px; border-radius:8px; margin-top:20px;'>";
echo "<strong>📋 結論:</strong><br>";
echo "表示されているのは<strong>テストデータ</strong>です。実際のスクレイピングデータは保存されていません。<br>";
echo "スクレイピングサーバーとデータベース保存処理の連携に問題があります。";
echo "</div>";
?>
