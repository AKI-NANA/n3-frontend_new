<?php
/**
 * Yahoo Auction編集システム - データベース構造確認ツール
 * テーブル構造を調査して適切なクエリを生成
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres";
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<h2>🔍 Yahoo Scraped Products テーブル構造確認</h2>";
    
    // カラム情報を詳細に取得
    $sql = "SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'yahoo_scraped_products' 
            ORDER BY ordinal_position";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h3>📋 利用可能なカラム一覧 (" . count($columns) . "個)</h3>";
    echo "<table border='1' style='border-collapse: collapse; margin: 10px 0;'>";
    echo "<tr style='background: #f0f0f0;'>";
    echo "<th>カラム名</th><th>データ型</th><th>NULL許可</th><th>デフォルト値</th><th>最大長</th>";
    echo "</tr>";
    
    foreach ($columns as $column) {
        echo "<tr>";
        echo "<td><strong>" . htmlspecialchars($column['column_name']) . "</strong></td>";
        echo "<td>" . htmlspecialchars($column['data_type']) . "</td>";
        echo "<td>" . htmlspecialchars($column['is_nullable']) . "</td>";
        echo "<td>" . htmlspecialchars($column['column_default'] ?? 'なし') . "</td>";
        echo "<td>" . htmlspecialchars($column['character_maximum_length'] ?? 'N/A') . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // サンプルデータを1件取得
    echo "<h3>📊 サンプルデータ（最新1件）</h3>";
    $sampleSql = "SELECT * FROM yahoo_scraped_products ORDER BY id DESC LIMIT 1";
    $sampleStmt = $pdo->prepare($sampleSql);
    $sampleStmt->execute();
    $sampleData = $sampleStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($sampleData) {
        echo "<table border='1' style='border-collapse: collapse; margin: 10px 0;'>";
        echo "<tr style='background: #f0f0f0;'><th>カラム名</th><th>値</th></tr>";
        
        foreach ($sampleData as $key => $value) {
            echo "<tr>";
            echo "<td><strong>" . htmlspecialchars($key) . "</strong></td>";
            echo "<td>" . htmlspecialchars(substr($value ?? 'NULL', 0, 100)) . (strlen($value ?? '') > 100 ? '...' : '') . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
    // レコード数確認
    $countSql = "SELECT COUNT(*) as total FROM yahoo_scraped_products";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute();
    $total = $countStmt->fetch()['total'];
    
    echo "<h3>📈 統計情報</h3>";
    echo "<p><strong>総レコード数:</strong> " . number_format($total) . "件</p>";
    
    // 未出品データ数確認
    $unlistedSql = "SELECT COUNT(*) as unlisted FROM yahoo_scraped_products WHERE (ebay_item_id IS NULL OR ebay_item_id = '' OR ebay_item_id = '0')";
    $unlistedStmt = $pdo->prepare($unlistedSql);
    $unlistedStmt->execute();
    $unlisted = $unlistedStmt->fetch()['unlisted'];
    
    echo "<p><strong>未出品データ数:</strong> " . number_format($unlisted) . "件</p>";
    
    // 画像データありの件数
    if (in_array('active_image_url', array_column($columns, 'column_name'))) {
        $imagesSql = "SELECT COUNT(*) as with_images FROM yahoo_scraped_products WHERE active_image_url IS NOT NULL AND active_image_url != ''";
        $imagesStmt = $pdo->prepare($imagesSql);
        $imagesStmt->execute();
        $withImages = $imagesStmt->fetch()['with_images'];
        echo "<p><strong>画像データあり:</strong> " . number_format($withImages) . "件</p>";
    }
    
} catch (Exception $e) {
    echo "<h2 style='color: red;'>❌ エラー発生</h2>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
}
?>