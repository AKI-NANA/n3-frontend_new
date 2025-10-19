<?php
/**
 * テーブル構造確認・修正用スクリプト
 * URL: http://localhost:8080/modules/yahoo_auction_complete/fix_table_structure.php
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🔧 テーブル構造確認・修正</h1>";
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

// 現在のテーブル構造確認
echo "<h2>1. 現在のテーブル構造</h2>";
try {
    $columns = $pdo->query("
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'mystical_japan_treasures_inventory' 
        ORDER BY ordinal_position
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<table border='1' style='border-collapse:collapse; width:100%;'>";
    echo "<tr><th>カラム名</th><th>データ型</th><th>NULL許可</th><th>デフォルト値</th></tr>";
    
    $existing_columns = [];
    foreach ($columns as $col) {
        $existing_columns[] = $col['column_name'];
        echo "<tr>";
        echo "<td>" . htmlspecialchars($col['column_name']) . "</td>";
        echo "<td>" . htmlspecialchars($col['data_type']) . "</td>";
        echo "<td>" . htmlspecialchars($col['is_nullable']) . "</td>";
        echo "<td>" . htmlspecialchars($col['column_default'] ?? 'なし') . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    echo "<div class='info'>📊 現在のカラム数: " . count($existing_columns) . "個</div>";
    
} catch (Exception $e) {
    echo "<div class='error'>❌ テーブル構造確認エラー: " . $e->getMessage() . "</div>";
    exit;
}

// 必要なカラムの確認
echo "<h2>2. 必要なカラムの確認</h2>";
$required_columns = [
    'source_url' => 'TEXT',
    'scraped_at' => 'TIMESTAMP',
    'scraping_session_id' => 'VARCHAR(255)',
    'yahoo_auction_id' => 'VARCHAR(255)',
    'original_price_jpy' => 'DECIMAL(10,2)',
    'exchange_rate' => 'DECIMAL(8,4)'
];

$missing_columns = [];
foreach ($required_columns as $col_name => $col_type) {
    if (in_array($col_name, $existing_columns)) {
        echo "<div class='success'>✅ {$col_name} - 存在します</div>";
    } else {
        echo "<div class='error'>❌ {$col_name} - 存在しません（{$col_type}で追加が必要）</div>";
        $missing_columns[$col_name] = $col_type;
    }
}

// カラム追加実行
if (!empty($missing_columns)) {
    echo "<h2>3. 不足カラムの追加</h2>";
    
    if (isset($_GET['execute']) && $_GET['execute'] === 'true') {
        echo "<div class='warning'>🔧 カラム追加を実行中...</div>";
        
        try {
            $pdo->beginTransaction();
            
            foreach ($missing_columns as $col_name => $col_type) {
                $sql = "ALTER TABLE mystical_japan_treasures_inventory ADD COLUMN {$col_name} {$col_type}";
                echo "<div class='info'>実行: {$sql}</div>";
                $pdo->exec($sql);
                echo "<div class='success'>✅ {$col_name} カラムを追加しました</div>";
            }
            
            $pdo->commit();
            echo "<div class='success'>🎉 全てのカラム追加が完了しました！</div>";
            
            // 追加後の確認
            echo "<h3>追加後のテーブル構造確認</h3>";
            $new_columns = $pdo->query("
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'mystical_japan_treasures_inventory' 
                ORDER BY ordinal_position
            ")->fetchAll(PDO::FETCH_ASSOC);
            
            echo "<div class='info'>📊 更新後のカラム数: " . count($new_columns) . "個</div>";
            echo "<div class='success'>✅ source_url カラムが追加されました。スクレイピングが正常に動作するはずです。</div>";
            
        } catch (Exception $e) {
            $pdo->rollBack();
            echo "<div class='error'>❌ カラム追加エラー: " . $e->getMessage() . "</div>";
        }
        
    } else {
        echo "<div class='warning'>⚠️ {count($missing_columns)}個のカラムが不足しています。</div>";
        echo "<div class='info'>💡 以下のボタンをクリックしてカラムを追加してください:</div>";
        echo "<a href='?execute=true' style='display:inline-block; background:#28a745; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; margin:10px 0;'>🔧 カラム追加を実行</a>";
        
        echo "<h3>追加予定のSQL</h3>";
        echo "<pre style='background:#f8f9fa; padding:10px; border-radius:5px;'>";
        foreach ($missing_columns as $col_name => $col_type) {
            echo "ALTER TABLE mystical_japan_treasures_inventory ADD COLUMN {$col_name} {$col_type};\n";
        }
        echo "</pre>";
    }
} else {
    echo "<div class='success'>✅ 全ての必要なカラムが存在します</div>";
}

// スクレイピングテスト
echo "<h2>4. スクレイピング機能テスト</h2>";
if (in_array('source_url', $existing_columns) || isset($_GET['execute'])) {
    echo "<div class='info'>🧪 source_urlカラムが存在するため、スクレイピング機能のテストが可能です</div>";
    
    // テストデータ挿入
    if (isset($_GET['test_insert']) && $_GET['test_insert'] === 'true') {
        try {
            $test_sql = "
                INSERT INTO mystical_japan_treasures_inventory 
                (item_id, title, current_price, source_url, scraped_at, yahoo_auction_id) 
                VALUES 
                ('TEST_YAHOO_001', 'テスト商品 - Yahoo オークション', 1500.00, 'https://auctions.yahoo.co.jp/jp/auction/test123', NOW(), 'test123')
                ON CONFLICT (item_id) DO UPDATE SET 
                    source_url = EXCLUDED.source_url,
                    scraped_at = EXCLUDED.scraped_at
            ";
            
            $pdo->exec($test_sql);
            echo "<div class='success'>✅ テストデータを挿入しました</div>";
            
            // 挿入結果確認
            $test_result = $pdo->query("
                SELECT item_id, title, source_url, scraped_at 
                FROM mystical_japan_treasures_inventory 
                WHERE item_id = 'TEST_YAHOO_001'
            ")->fetch(PDO::FETCH_ASSOC);
            
            if ($test_result) {
                echo "<div class='success'>🎯 テストデータ確認:</div>";
                echo "<pre>" . print_r($test_result, true) . "</pre>";
                
                // スクレイピングデータ検索テスト
                $scraped_count = $pdo->query("
                    SELECT COUNT(*) 
                    FROM mystical_japan_treasures_inventory 
                    WHERE source_url IS NOT NULL AND source_url LIKE '%http%'
                ")->fetchColumn();
                
                echo "<div class='success'>✅ スクレイピングデータ検索結果: {$scraped_count}件</div>";
            }
            
        } catch (Exception $e) {
            echo "<div class='error'>❌ テストデータ挿入エラー: " . $e->getMessage() . "</div>";
        }
    } else {
        echo "<a href='?test_insert=true' style='display:inline-block; background:#007bff; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; margin:10px 0;'>🧪 テストデータ挿入</a>";
    }
} else {
    echo "<div class='error'>❌ source_urlカラムが存在しないため、スクレイピング機能は動作しません</div>";
}

echo "<h2>5. 次のステップ</h2>";
if (empty($missing_columns)) {
    echo "<div class='success'>✅ テーブル構造は完了です。Yahoo Auction Toolでスクレイピングを実行してください。</div>";
    echo "<ol>";
    echo "<li>Yahoo Auction Toolに戻る</li>";
    echo "<li>データ取得タブでYahoo URLをスクレイピング</li>";
    echo "<li>データ編集タブで「スクレイピングデータ検索」を実行</li>";
    echo "</ol>";
} else {
    echo "<div class='warning'>⚠️ まず上記の「カラム追加を実行」ボタンを押してください</div>";
}

echo "<hr>";
echo "<div style='background:#e3f2fd; padding:15px; border-radius:8px; margin-top:20px;'>";
echo "<strong>📝 問題解決の流れ:</strong><br>";
echo "1. source_urlカラムが存在しない → スクレイピングデータが保存できない<br>";
echo "2. カラム追加 → スクレイピング機能が正常動作<br>";
echo "3. 実際のスクレイピング実行 → データ編集タブで確認可能<br>";
echo "</div>";
?>
