<?php
/**
 * データベース接続・データ確認用ツール
 */

echo "<h1>データベース接続確認</h1>";

try {
    // PostgreSQL接続テスト
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'Kn240914');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<div style='color:green;'>✅ PostgreSQL接続成功</div>";
    
    // テーブル一覧
    echo "<h2>テーブル一覧</h2>";
    $tables = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")->fetchAll();
    foreach ($tables as $table) {
        echo "<li>" . $table['table_name'] . "</li>";
    }
    
    // yahoo_scraped_products の確認
    echo "<h2>yahoo_scraped_products テーブル</h2>";
    $count = $pdo->query("SELECT COUNT(*) as count FROM yahoo_scraped_products")->fetch();
    echo "<p>レコード数: " . $count['count'] . "</p>";
    
    if ($count['count'] > 0) {
        echo "<h3>最新5件のデータ</h3>";
        $data = $pdo->query("SELECT id, source_item_id, active_title, active_image_url FROM yahoo_scraped_products ORDER BY id DESC LIMIT 5")->fetchAll();
        echo "<table border='1'>";
        echo "<tr><th>ID</th><th>Source Item ID</th><th>Title</th><th>Image URL</th></tr>";
        foreach ($data as $row) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($row['id']) . "</td>";
            echo "<td>" . htmlspecialchars($row['source_item_id']) . "</td>";
            echo "<td>" . htmlspecialchars($row['active_title']) . "</td>";
            echo "<td>" . htmlspecialchars($row['active_image_url']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
    // mystical_japan_treasures_inventory の確認
    echo "<h2>mystical_japan_treasures_inventory テーブル</h2>";
    try {
        $count2 = $pdo->query("SELECT COUNT(*) as count FROM mystical_japan_treasures_inventory")->fetch();
        echo "<p>レコード数: " . $count2['count'] . "</p>";
        
        if ($count2['count'] > 0) {
            echo "<h3>最新5件のデータ</h3>";
            $data2 = $pdo->query("SELECT item_id, title, picture_url FROM mystical_japan_treasures_inventory ORDER BY scraped_at DESC LIMIT 5")->fetchAll();
            echo "<table border='1'>";
            echo "<tr><th>Item ID</th><th>Title</th><th>Picture URL</th></tr>";
            foreach ($data2 as $row) {
                echo "<tr>";
                echo "<td>" . htmlspecialchars($row['item_id']) . "</td>";
                echo "<td>" . htmlspecialchars($row['title']) . "</td>";
                echo "<td>" . htmlspecialchars($row['picture_url']) . "</td>";
                echo "</tr>";
            }
            echo "</table>";
        }
    } catch (Exception $e) {
        echo "<p>mystical_japan_treasures_inventory テーブルは存在しません</p>";
    }
    
    // via.placeholder を含むデータの検索
    echo "<h2>via.placeholder を含むデータ検索</h2>";
    
    // yahoo_scraped_products から検索
    $via_data = $pdo->query("SELECT id, source_item_id, active_title, active_image_url FROM yahoo_scraped_products WHERE active_image_url LIKE '%via.placeholder%'")->fetchAll();
    if (count($via_data) > 0) {
        echo "<h3>yahoo_scraped_products でvia.placeholderを使用しているデータ:</h3>";
        foreach ($via_data as $row) {
            echo "<p>ID: {$row['id']}, Title: {$row['active_title']}, Image: {$row['active_image_url']}</p>";
        }
    } else {
        echo "<p>yahoo_scraped_products にvia.placeholderを使用しているデータはありません</p>";
    }
    
    // mystical_japan_treasures_inventory から検索
    try {
        $via_data2 = $pdo->query("SELECT item_id, title, picture_url FROM mystical_japan_treasures_inventory WHERE picture_url LIKE '%via.placeholder%'")->fetchAll();
        if (count($via_data2) > 0) {
            echo "<h3>mystical_japan_treasures_inventory でvia.placeholderを使用しているデータ:</h3>";
            foreach ($via_data2 as $row) {
                echo "<p>ID: {$row['item_id']}, Title: {$row['title']}, Image: {$row['picture_url']}</p>";
            }
        } else {
            echo "<p>mystical_japan_treasures_inventory にvia.placeholderを使用しているデータはありません</p>";
        }
    } catch (Exception $e) {
        // テーブルが存在しない場合は無視
    }
    
} catch (Exception $e) {
    echo "<div style='color:red;'>❌ データベース接続失敗: " . $e->getMessage() . "</div>";
}
?>
