<?php
/**
 * データベース接続・クエリデバッグ用ファイル
 * 直接ブラウザでアクセスしてデータベースの状況を確認
 * URL: http://localhost:8080/modules/yahoo_auction_complete/debug_database.php
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🔍 データベースデバッグ情報</h1>";
echo "<style>body{font-family:monospace;} .success{color:green;} .error{color:red;} .info{color:blue;}</style>";

// データベース接続テスト
echo "<h2>1. データベース接続テスト</h2>";
try {
    $host = 'localhost';
    $dbname = 'nagano3_db';
    $username = 'postgres';
    $password = 'password123';
    
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<div class='success'>✅ データベース接続成功</div>";
    
    // PostgreSQLバージョン確認
    $version = $pdo->query("SELECT version();")->fetchColumn();
    echo "<div class='info'>📊 PostgreSQL Version: " . substr($version, 0, 50) . "...</div>";
    
} catch (PDOException $e) {
    echo "<div class='error'>❌ データベース接続失敗: " . $e->getMessage() . "</div>";
    exit;
}

// テーブル存在確認
echo "<h2>2. テーブル存在確認</h2>";
try {
    $tables = $pdo->query("
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    ")->fetchAll(PDO::FETCH_COLUMN);
    
    echo "<div class='info'>📋 利用可能なテーブル (" . count($tables) . "個):</div>";
    foreach ($tables as $table) {
        echo "<li>" . htmlspecialchars($table) . "</li>";
    }
    
    // mystical_japan_treasures_inventory テーブルの存在確認
    $target_table = 'mystical_japan_treasures_inventory';
    if (in_array($target_table, $tables)) {
        echo "<div class='success'>✅ メインテーブル '{$target_table}' が存在します</div>";
    } else {
        echo "<div class='error'>❌ メインテーブル '{$target_table}' が見つかりません</div>";
        echo "<div class='info'>💡 利用可能なテーブルから代替テーブルを探してください</div>";
    }
    
} catch (Exception $e) {
    echo "<div class='error'>❌ テーブル確認エラー: " . $e->getMessage() . "</div>";
}

// データ数確認
echo "<h2>3. データ数確認</h2>";
try {
    // 全データ数
    $total_count = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory")->fetchColumn();
    echo "<div class='info'>📊 総レコード数: " . number_format($total_count) . "件</div>";
    
    // データがある場合の詳細確認
    if ($total_count > 0) {
        // 価格データがあるレコード数
        $price_count = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory WHERE current_price > 0")->fetchColumn();
        echo "<div class='info'>💰 価格データ有: " . number_format($price_count) . "件</div>";
        
        // タイトルがあるレコード数
        $title_count = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory WHERE title IS NOT NULL AND title != ''")->fetchColumn();
        echo "<div class='info'>📝 タイトル有: " . number_format($title_count) . "件</div>";
        
        // source_urlがあるレコード数
        $url_count = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory WHERE source_url IS NOT NULL AND source_url LIKE '%http%'")->fetchColumn();
        echo "<div class='info'>🔗 source_url有: " . number_format($url_count) . "件</div>";
        
        // 最近7日以内のデータ
        $recent_count = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory WHERE updated_at >= CURRENT_DATE - INTERVAL '7 days'")->fetchColumn();
        echo "<div class='info'>🕒 最近7日以内: " . number_format($recent_count) . "件</div>";
        
    } else {
        echo "<div class='error'>❌ テーブルにデータが存在しません</div>";
    }
    
} catch (Exception $e) {
    echo "<div class='error'>❌ データ数確認エラー: " . $e->getMessage() . "</div>";
}

// サンプルデータ表示
echo "<h2>4. サンプルデータ（最新5件）</h2>";
try {
    if ($total_count > 0) {
        $samples = $pdo->query("
            SELECT 
                item_id, 
                title, 
                current_price, 
                source_url, 
                updated_at,
                CASE WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 'スクレイピング' ELSE '既存データ' END as data_type
            FROM mystical_japan_treasures_inventory 
            ORDER BY updated_at DESC 
            LIMIT 5
        ")->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<table border='1' style='border-collapse:collapse; width:100%;'>";
        echo "<tr><th>ID</th><th>タイトル</th><th>価格</th><th>URL</th><th>更新日</th><th>データ種別</th></tr>";
        
        foreach ($samples as $row) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($row['item_id']) . "</td>";
            echo "<td>" . htmlspecialchars(substr($row['title'], 0, 50)) . "...</td>";
            echo "<td>$" . htmlspecialchars($row['current_price']) . "</td>";
            echo "<td>" . htmlspecialchars(substr($row['source_url'] ?? 'なし', 0, 30)) . "...</td>";
            echo "<td>" . htmlspecialchars($row['updated_at']) . "</td>";
            echo "<td><strong>" . htmlspecialchars($row['data_type']) . "</strong></td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<div class='error'>❌ 表示するデータがありません</div>";
    }
    
} catch (Exception $e) {
    echo "<div class='error'>❌ サンプルデータ取得エラー: " . $e->getMessage() . "</div>";
}

// Yahoo Auction関連データの確認
echo "<h2>5. Yahoo Auction関連データの確認</h2>";
try {
    // Yahoo URL確認
    $yahoo_url_count = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory WHERE source_url LIKE '%auctions.yahoo.co.jp%'")->fetchColumn();
    echo "<div class='info'>🎯 Yahoo Auction URL: " . number_format($yahoo_url_count) . "件</div>";
    
    // Yahoo タイトル確認
    $yahoo_title_count = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory WHERE title LIKE '%Yahoo%' OR title LIKE '%ヤフオク%' OR title LIKE '%オークション%'")->fetchColumn();
    echo "<div class='info'>🎯 Yahoo関連タイトル: " . number_format($yahoo_title_count) . "件</div>";
    
    // 拡張検索条件での合計
    $extended_count = $pdo->query("
        SELECT COUNT(*) FROM mystical_japan_treasures_inventory 
        WHERE (
            (source_url IS NOT NULL AND source_url != '' AND source_url LIKE '%http%') OR
            (title LIKE '%Yahoo%' OR title LIKE '%ヤフオク%' OR title LIKE '%オークション%') OR
            (updated_at >= CURRENT_DATE - INTERVAL '7 days' AND current_price > 0) OR
            (item_id LIKE 'yahoo_%') OR
            (category_name LIKE '%Auction%')
        )
        AND title IS NOT NULL 
        AND current_price > 0
    ")->fetchColumn();
    echo "<div class='info'>🔍 拡張検索条件合致: " . number_format($extended_count) . "件</div>";
    
    if ($extended_count > 0) {
        echo "<div class='success'>✅ 拡張検索でデータが見つかるはずです</div>";
    } else {
        echo "<div class='error'>❌ 拡張検索条件に合致するデータがありません</div>";
    }
    
} catch (Exception $e) {
    echo "<div class='error'>❌ Yahoo関連データ確認エラー: " . $e->getMessage() . "</div>";
}

// データベース関数テスト
echo "<h2>6. データベース関数テスト</h2>";
require_once __DIR__ . '/database_query_handler.php';

try {
    echo "<div class='info'>📊 getDashboardStats() テスト:</div>";
    $stats = getDashboardStats();
    if ($stats) {
        echo "<pre>" . print_r($stats, true) . "</pre>";
    } else {
        echo "<div class='error'>❌ getDashboardStats() が null を返しました</div>";
    }
    
    echo "<div class='info'>📊 getAllRecentProductsData() テスト:</div>";
    $all_data = getAllRecentProductsData(1, 5);
    echo "<div class='info'>結果: " . $all_data['total'] . "件中 " . count($all_data['data']) . "件表示</div>";
    
    if (count($all_data['data']) > 0) {
        echo "<div class='success'>✅ データベース関数は正常に動作しています</div>";
        echo "<div class='info'>最初のレコード:</div>";
        echo "<pre>" . print_r($all_data['data'][0], true) . "</pre>";
    } else {
        echo "<div class='error'>❌ データベース関数からデータが取得できません</div>";
    }
    
} catch (Exception $e) {
    echo "<div class='error'>❌ データベース関数テストエラー: " . $e->getMessage() . "</div>";
}

echo "<h2>7. 推奨アクション</h2>";
if ($total_count == 0) {
    echo "<div class='error'>🚨 データベースが空です。以下を確認してください:</div>";
    echo "<ul>";
    echo "<li>1. スクレイピングが正常に動作しているか</li>";
    echo "<li>2. 別のテーブルにデータが保存されていないか</li>";
    echo "<li>3. データベース設定が正しいか</li>";
    echo "</ul>";
} elseif ($extended_count == 0) {
    echo "<div class='error'>🚨 検索条件に合致するデータがありません。既存データを確認してください。</div>";
} else {
    echo "<div class='success'>✅ データは存在します。PHPのAPI関数に問題がある可能性があります。</div>";
}

echo "<hr>";
echo "<div style='background:#f0f0f0; padding:10px; margin-top:20px;'>";
echo "<strong>📝 このデバッグ情報をコピーして問題解決に役立ててください。</strong><br>";
echo "作成日時: " . date('Y-m-d H:i:s');
echo "</div>";
?>
