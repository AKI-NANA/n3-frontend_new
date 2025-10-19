<?php
/**
 * nagano3_db 内の全商品テーブル調査
 * Yahoo Auction Tool の実際のデータソースを特定
 */

require_once __DIR__ . '/database_query_handler.php';

echo "<h2>🔍 nagano3_db 全商品テーブル調査</h2>";

try {
    $pdo = getDatabaseConnection();
    if (!$pdo) {
        throw new Exception("PostgreSQL接続失敗");
    }

    // データベース確認
    $stmt = $pdo->query("SELECT current_database() as db_name");
    $db_info = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "<p><strong>接続DB:</strong> {$db_info['db_name']}</p>";
    
    // 商品関連テーブルを特定
    echo "<h3>📊 商品関連テーブル検索</h3>";
    $stmt = $pdo->query("
        SELECT table_name
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND (
            table_name LIKE '%inventory%' OR
            table_name LIKE '%product%' OR
            table_name LIKE '%mystical%' OR
            table_name LIKE '%ebay%' OR
            table_name LIKE '%yahoo%' OR
            table_name LIKE '%treasures%'
        )
        ORDER BY table_name
    ");
    $product_tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "<div style='background: #e7f3ff; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
    echo "<h4>🎯 発見された商品テーブル: " . count($product_tables) . "個</h4>";
    echo "<ul>";
    foreach ($product_tables as $table) {
        echo "<li><strong>{$table}</strong></li>";
    }
    echo "</ul>";
    echo "</div>";
    
    // 各テーブルの詳細調査
    foreach ($product_tables as $table_name) {
        echo "<h3>🔍 テーブル: <code>{$table_name}</code></h3>";
        
        try {
            // レコード数確認
            $count_stmt = $pdo->query("SELECT COUNT(*) as total FROM \"{$table_name}\"");
            $total_count = $count_stmt->fetchColumn();
            
            echo "<p><strong>総レコード数:</strong> {$total_count}件</p>";
            
            if ($total_count > 0) {
                // カラム構造確認
                $columns_stmt = $pdo->query("
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '{$table_name}' 
                    ORDER BY ordinal_position
                ");
                $columns = $columns_stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo "<h4>📋 カラム構造</h4>";
                echo "<div style='display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; font-size: 0.9rem;'>";
                foreach ($columns as $col) {
                    echo "<div style='background: #f8f9fa; padding: 4px 8px; border-radius: 4px;'>";
                    echo "<strong>{$col['column_name']}</strong><br>";
                    echo "<small>{$col['data_type']}</small>";
                    echo "</div>";
                }
                echo "</div>";
                
                // サンプルデータ確認（問題のあるデータを探す）
                echo "<h4>🔍 問題データ検索</h4>";
                $sample_query = "
                    SELECT *
                    FROM \"{$table_name}\"
                    WHERE (
                        \"title\" LIKE '%ヴィンテージ腕時計%' OR
                        \"title\" LIKE '%スクレイピング商品%' OR
                        \"title\" LIKE '%SEIKO%' OR
                        \"item_id\" LIKE 'SCRAPED_%'
                    )
                    LIMIT 5
                ";
                
                try {
                    $sample_stmt = $pdo->query($sample_query);
                    $problem_data = $sample_stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    if (count($problem_data) > 0) {
                        echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px;'>";
                        echo "<h5>❌ 問題データ発見: " . count($problem_data) . "件</h5>";
                        echo "<p><strong>これがYahoo Auction Toolで表示されているデータです！</strong></p>";
                        
                        echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.8rem;'>";
                        if (count($problem_data) > 0) {
                            // ヘッダー
                            echo "<tr>";
                            foreach (array_keys($problem_data[0]) as $key) {
                                echo "<th>" . htmlspecialchars($key) . "</th>";
                            }
                            echo "</tr>";
                            
                            // データ行
                            foreach ($problem_data as $row) {
                                echo "<tr>";
                                foreach ($row as $value) {
                                    echo "<td>" . htmlspecialchars(mb_substr($value, 0, 30)) . "</td>";
                                }
                                echo "</tr>";
                            }
                        }
                        echo "</table>";
                        echo "</div>";
                    } else {
                        echo "<p>✅ 問題データは見つかりませんでした</p>";
                    }
                } catch (Exception $e) {
                    echo "<p>⚠️ 問題データ検索エラー: " . htmlspecialchars($e->getMessage()) . "</p>";
                }
                
                // 最新データ確認
                echo "<h4>📅 最新データ確認</h4>";
                try {
                    $latest_query = "SELECT * FROM \"{$table_name}\" ORDER BY \"updated_at\" DESC LIMIT 5";
                    $latest_stmt = $pdo->query($latest_query);
                    $latest_data = $latest_stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    if (count($latest_data) > 0) {
                        echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.8rem;'>";
                        echo "<tr>";
                        foreach (array_keys($latest_data[0]) as $key) {
                            echo "<th>" . htmlspecialchars($key) . "</th>";
                        }
                        echo "</tr>";
                        
                        foreach (array_slice($latest_data, 0, 3) as $row) {
                            echo "<tr>";
                            foreach ($row as $value) {
                                echo "<td>" . htmlspecialchars(mb_substr($value, 0, 20)) . "</td>";
                            }
                            echo "</tr>";
                        }
                        echo "</table>";
                    }
                } catch (Exception $e) {
                    echo "<p>⚠️ 最新データ取得エラー: " . htmlspecialchars($e->getMessage()) . "</p>";
                }
            }
        } catch (Exception $e) {
            echo "<p style='color: red;'>❌ テーブル調査エラー: " . htmlspecialchars($e->getMessage()) . "</p>";
        }
        
        echo "<hr>";
    }
    
    // PHPコードで使用されているテーブル名を確認
    echo "<h3>🔧 database_query_handler.php の設定確認</h3>";
    $handler_content = file_get_contents(__DIR__ . '/database_query_handler.php');
    
    // FROM句のテーブル名を抽出
    preg_match_all('/FROM\s+([a-zA-Z0-9_]+)/i', $handler_content, $matches);
    $used_tables = array_unique($matches[1]);
    
    echo "<div style='background: #fff3cd; padding: 1rem; border-radius: 8px;'>";
    echo "<h4>📋 PHPコードで参照されているテーブル</h4>";
    echo "<ul>";
    foreach ($used_tables as $table) {
        $table_exists = in_array($table, $product_tables);
        $status = $table_exists ? "✅ 存在" : "❌ 不存在";
        echo "<li><strong>{$table}</strong> - {$status}</li>";
    }
    echo "</ul>";
    echo "</div>";
    
} catch (Exception $e) {
    echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px;'>";
    echo "<h4>❌ エラー発生</h4>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
    echo "</div>";
}
?>

<style>
table { font-size: 0.85rem; }
th { background: #f8f9fa; padding: 6px; }
td { padding: 4px; }
code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
</style>
