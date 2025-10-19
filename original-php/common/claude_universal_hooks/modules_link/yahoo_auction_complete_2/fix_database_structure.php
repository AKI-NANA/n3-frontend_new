<?php
/**
 * データベーステーブル構造確認・修正ツール
 * URL: http://localhost:8080/modules/yahoo_auction_complete/fix_database_structure.php
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>データベース構造修正</title>
    <style>
        body { font-family: monospace; line-height: 1.6; margin: 20px; }
        .success { color: green; font-weight: bold; }
        .error { color: red; font-weight: bold; }
        .info { color: blue; }
        .warning { color: orange; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
        .button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        .button:hover { background: #0056b3; }
        .button-success { background: #28a745; }
        .button-danger { background: #dc3545; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
    </style>
</head>
<body>
    <h1>データベース構造確認・修正</h1>

<?php
try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'password123');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<div class='success'>✅ データベース接続成功</div>";
} catch (PDOException $e) {
    echo "<div class='error'>❌ データベース接続失敗: " . htmlspecialchars($e->getMessage()) . "</div>";
    exit;
}

echo "<h2>1. 現在のテーブル構造確認</h2>";

// テーブル構造確認
try {
    $columns = $pdo->query("
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'mystical_japan_treasures_inventory' 
        ORDER BY ordinal_position
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    if ($columns) {
        echo "<div class='info'>📊 現在のカラム構造:</div>";
        echo "<table>";
        echo "<tr><th>カラム名</th><th>データ型</th><th>NULL許可</th><th>デフォルト値</th></tr>";
        
        $existing_columns = [];
        foreach ($columns as $col) {
            $existing_columns[] = $col['column_name'];
            echo "<tr>";
            echo "<td>" . htmlspecialchars($col['column_name']) . "</td>";
            echo "<td>" . htmlspecialchars($col['data_type']) . "</td>";
            echo "<td>" . htmlspecialchars($col['is_nullable']) . "</td>";
            echo "<td>" . htmlspecialchars($col['column_default'] ?: 'N/A') . "</td>";
            echo "</tr>";
        }
        echo "</table>";
        
        echo "<div class='info'>📋 既存カラム数: " . count($existing_columns) . "個</div>";
        
    } else {
        echo "<div class='error'>❌ テーブルが見つかりません</div>";
        exit;
    }
    
} catch (Exception $e) {
    echo "<div class='error'>❌ テーブル構造確認エラー: " . htmlspecialchars($e->getMessage()) . "</div>";
    exit;
}

echo "<h2>2. 必要なカラムの確認</h2>";

// 必要なカラムリスト
$required_columns = [
    'item_description' => 'TEXT',
    'gallery_url' => 'TEXT',
    'brand_name' => 'VARCHAR(255)',
    'bid_count' => 'INTEGER DEFAULT 0',
    'watch_count' => 'INTEGER DEFAULT 0',
    'price_jpy' => 'INTEGER',
    'seller_info' => 'TEXT',
    'shipping_info' => 'TEXT',
    'start_time' => 'TIMESTAMP',
    'end_time' => 'TIMESTAMP'
];

$missing_columns = [];
foreach ($required_columns as $col_name => $col_type) {
    if (!in_array($col_name, $existing_columns)) {
        $missing_columns[$col_name] = $col_type;
    }
}

if (empty($missing_columns)) {
    echo "<div class='success'>✅ 全ての必要なカラムが存在します</div>";
} else {
    echo "<div class='warning'>⚠️ 不足しているカラム: " . count($missing_columns) . "個</div>";
    echo "<table>";
    echo "<tr><th>不足カラム名</th><th>データ型</th></tr>";
    foreach ($missing_columns as $col_name => $col_type) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($col_name) . "</td>";
        echo "<td>" . htmlspecialchars($col_type) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
}

echo "<h2>3. カラム追加実行</h2>";

if (isset($_POST['add_columns']) && $_POST['add_columns'] === 'true') {
    echo "<div class='info'>🔧 カラム追加実行中...</div>";
    
    $added_count = 0;
    $error_count = 0;
    
    foreach ($missing_columns as $col_name => $col_type) {
        try {
            $alter_sql = "ALTER TABLE mystical_japan_treasures_inventory ADD COLUMN IF NOT EXISTS {$col_name} {$col_type}";
            $pdo->exec($alter_sql);
            echo "<div class='success'>✅ カラム追加成功: {$col_name} ({$col_type})</div>";
            $added_count++;
        } catch (Exception $e) {
            echo "<div class='error'>❌ カラム追加失敗: {$col_name} - " . htmlspecialchars($e->getMessage()) . "</div>";
            $error_count++;
        }
    }
    
    echo "<div class='info'>📊 追加完了: {$added_count}個, エラー: {$error_count}個</div>";
    
    if ($added_count > 0) {
        echo "<div class='success'>🎉 データベース構造修正完了！</div>";
        echo "<a href='advanced_scraping_system.php' class='button button-success'>完全版スクレイピングシステムに戻る</a>";
    }
    
} else {
    if (!empty($missing_columns)) {
        echo "<form method='POST'>";
        echo "<input type='hidden' name='add_columns' value='true'>";
        echo "<button type='submit' class='button button-success'>不足カラムを追加する</button>";
        echo "</form>";
        echo "<div class='warning'>⚠️ この操作により、必要なカラムがテーブルに追加されます</div>";
    }
}

echo "<h2>4. 修正後の動作確認</h2>";

if (empty($missing_columns) || (isset($_POST['add_columns']) && $added_count > 0)) {
    echo "<div class='info'>🔧 統計クエリテスト実行...</div>";
    
    try {
        $test_stats = $pdo->query("
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 1 END) as scraped_data,
                COUNT(CASE WHEN item_description IS NOT NULL AND LENGTH(item_description) > 50 THEN 1 END) as with_descriptions,
                COUNT(CASE WHEN gallery_url IS NOT NULL THEN 1 END) as with_gallery
            FROM mystical_japan_treasures_inventory
        ")->fetch(PDO::FETCH_ASSOC);
        
        echo "<div class='success'>✅ 統計クエリテスト成功</div>";
        echo "<table>";
        echo "<tr><th>項目</th><th>件数</th></tr>";
        echo "<tr><td>総レコード数</td><td>{$test_stats['total_records']}</td></tr>";
        echo "<tr><td>スクレイピングデータ</td><td>{$test_stats['scraped_data']}</td></tr>";
        echo "<tr><td>説明文付きデータ</td><td>{$test_stats['with_descriptions']}</td></tr>";
        echo "<tr><td>ギャラリー付きデータ</td><td>{$test_stats['with_gallery']}</td></tr>";
        echo "</table>";
        
        echo "<div class='success'>🎉 データベース構造修正完了！完全版スクレイピングシステムが使用可能です。</div>";
        
    } catch (Exception $e) {
        echo "<div class='error'>❌ 統計クエリテストエラー: " . htmlspecialchars($e->getMessage()) . "</div>";
    }
}

echo "<h2>5. 次のステップ</h2>";
echo "<div style='background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0;'>";
echo "<h3>✅ 修正完了後の確認手順</h3>";
echo "<ol>";
echo "<li><a href='advanced_scraping_system.php' target='_blank'>完全版スクレイピングシステム</a>にアクセス</li>";
echo "<li>Yahoo オークションURLでテストスクレイピング実行</li>";
echo "<li>全画像・詳細説明・カテゴリ情報が正常に取得されることを確認</li>";
echo "<li>重複検出機能をテスト</li>";
echo "</ol>";
echo "</div>";
?>

</body>
</html>
