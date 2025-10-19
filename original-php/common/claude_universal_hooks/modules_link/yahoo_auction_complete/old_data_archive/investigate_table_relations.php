<?php
/**
 * nagano3_db テーブル間の外部キー・連携構造調査
 * 共通キーによるテーブル連携を特定
 */

require_once __DIR__ . '/database_query_handler.php';

echo "<h2>🔗 テーブル間連携構造調査</h2>";

try {
    $pdo = getDatabaseConnection();
    if (!$pdo) {
        throw new Exception("PostgreSQL接続失敗");
    }

    // 1. 外部キー制約の確認
    echo "<h3>🔑 外部キー制約一覧</h3>";
    $fk_query = "
        SELECT
            tc.table_name as source_table,
            kcu.column_name as source_column,
            ccu.table_name AS referenced_table,
            ccu.column_name AS referenced_column,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name
    ";
    
    $stmt = $pdo->query($fk_query);
    $foreign_keys = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($foreign_keys) > 0) {
        echo "<table border='1' style='border-collapse: collapse; width: 100%; margin: 1rem 0;'>";
        echo "<tr><th>参照元テーブル</th><th>参照元カラム</th><th>参照先テーブル</th><th>参照先カラム</th><th>制約名</th></tr>";
        
        foreach ($foreign_keys as $fk) {
            echo "<tr>";
            echo "<td><strong>" . htmlspecialchars($fk['source_table']) . "</strong></td>";
            echo "<td>" . htmlspecialchars($fk['source_column']) . "</td>";
            echo "<td><strong>" . htmlspecialchars($fk['referenced_table']) . "</strong></td>";
            echo "<td>" . htmlspecialchars($fk['referenced_column']) . "</td>";
            echo "<td><small>" . htmlspecialchars($fk['constraint_name']) . "</small></td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p>⚠️ 外部キー制約は設定されていません</p>";
    }
    
    // 2. 共通カラム名の検索（命名規則による連携）
    echo "<h3>🔍 共通カラム名による連携検索</h3>";
    
    // 商品関連テーブルの共通キー候補
    $key_candidates = [
        'id', 'item_id', 'product_id', 'sku', 'master_sku', 'ebay_item_id', 
        'yahoo_item_id', 'source_item_id', 'parent_id', 'uuid'
    ];
    
    $product_tables = [
        'mystical_japan_treasures_inventory',
        'unified_product_data', 
        'unified_product_inventory',
        'yahoo_scraped_products',
        'ebay_inventory',
        'products',
        'inventory_products',
        'product_master'
    ];
    
    echo "<div style='background: #e7f3ff; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
    echo "<h4>🎯 キー候補の存在確認</h4>";
    
    $key_table_matrix = [];
    
    foreach ($key_candidates as $key) {
        echo "<h5>🔑 キー: <code>{$key}</code></h5>";
        echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.9rem;'>";
        echo "<tr><th>テーブル名</th><th>カラム存在</th><th>ユニーク値数</th><th>サンプル値</th></tr>";
        
        foreach ($product_tables as $table) {
            try {
                // カラムの存在確認
                $col_check = $pdo->query("
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{$table}' 
                    AND column_name = '{$key}'
                ");
                $col_exists = $col_check->rowCount() > 0;
                
                if ($col_exists) {
                    // ユニーク値数とサンプル取得
                    $count_query = "SELECT COUNT(DISTINCT \"{$key}\") as unique_count FROM \"{$table}\"";
                    $count_stmt = $pdo->query($count_query);
                    $unique_count = $count_stmt->fetchColumn();
                    
                    $sample_query = "SELECT \"{$key}\" FROM \"{$table}\" WHERE \"{$key}\" IS NOT NULL LIMIT 3";
                    $sample_stmt = $pdo->query($sample_query);
                    $samples = $sample_stmt->fetchAll(PDO::FETCH_COLUMN);
                    
                    $key_table_matrix[$key][$table] = [
                        'exists' => true,
                        'unique_count' => $unique_count,
                        'samples' => $samples
                    ];
                    
                    echo "<tr style='background: #d4edda;'>";
                    echo "<td><strong>{$table}</strong></td>";
                    echo "<td>✅ 存在</td>";
                    echo "<td>{$unique_count}</td>";
                    echo "<td>" . implode(', ', array_map('htmlspecialchars', $samples)) . "</td>";
                    echo "</tr>";
                } else {
                    echo "<tr>";
                    echo "<td>{$table}</td>";
                    echo "<td>❌ なし</td>";
                    echo "<td>-</td>";
                    echo "<td>-</td>";
                    echo "</tr>";
                }
            } catch (Exception $e) {
                echo "<tr>";
                echo "<td>{$table}</td>";
                echo "<td>⚠️ エラー</td>";
                echo "<td>-</td>";
                echo "<td><small>" . htmlspecialchars($e->getMessage()) . "</small></td>";
                echo "</tr>";
            }
        }
        echo "</table>";
    }
    echo "</div>";
    
    // 3. 実際のデータ連携確認
    echo "<h3>🔗 実際のデータ連携確認</h3>";
    
    // SCRAPED_データが存在するテーブルを特定
    $problem_tables = [];
    
    foreach ($product_tables as $table) {
        try {
            $problem_query = "
                SELECT COUNT(*) as problem_count
                FROM \"{$table}\"
                WHERE (
                    \"title\" LIKE '%ヴィンテージ腕時計%' OR
                    \"title\" LIKE '%スクレイピング商品%' OR
                    \"title\" LIKE '%SEIKO%'
                )
            ";
            
            $stmt = $pdo->query($problem_query);
            $problem_count = $stmt->fetchColumn();
            
            if ($problem_count > 0) {
                $problem_tables[$table] = $problem_count;
                
                // 問題データのキー値を取得
                foreach ($key_candidates as $key) {
                    if (isset($key_table_matrix[$key][$table])) {
                        $key_query = "
                            SELECT \"{$key}\", \"title\"
                            FROM \"{$table}\"
                            WHERE (
                                \"title\" LIKE '%ヴィンテージ腕時計%' OR
                                \"title\" LIKE '%スクレイピング商品%' OR
                                \"title\" LIKE '%SEIKO%'
                            )
                            LIMIT 3
                        ";
                        
                        $key_stmt = $pdo->query($key_query);
                        $key_data = $key_stmt->fetchAll(PDO::FETCH_ASSOC);
                        
                        $problem_tables[$table . '_' . $key] = $key_data;
                    }
                }
            }
        } catch (Exception $e) {
            // カラムが存在しない場合はスキップ
            continue;
        }
    }
    
    if (count($problem_tables) > 0) {
        echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>❌ 問題データが存在するテーブル</h4>";
        
        foreach ($problem_tables as $key => $value) {
            if (is_numeric($value)) {
                echo "<p><strong>{$key}:</strong> {$value}件の問題データ</p>";
            } elseif (is_array($value)) {
                $table_key = explode('_', $key);
                $table_name = $table_key[0];
                $key_name = $table_key[1] ?? '';
                
                if (!empty($key_name) && count($value) > 0) {
                    echo "<h5>📋 {$table_name} テーブルの {$key_name} 値</h5>";
                    echo "<ul>";
                    foreach ($value as $item) {
                        echo "<li><strong>{$key_name}:</strong> " . htmlspecialchars($item[$key_name]) . 
                             " → <strong>タイトル:</strong> " . htmlspecialchars($item['title']) . "</li>";
                    }
                    echo "</ul>";
                }
            }
        }
        echo "</div>";
    }
    
    // 4. 連携マトリックス表示
    echo "<h3>📊 テーブル連携マトリックス</h3>";
    
    // 最も多くのテーブルに存在するキーを特定
    $key_coverage = [];
    foreach ($key_table_matrix as $key => $tables) {
        $key_coverage[$key] = count(array_filter($tables, function($table) {
            return $table['exists'];
        }));
    }
    
    arsort($key_coverage);
    
    echo "<div style='background: #d4edda; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
    echo "<h4>🎯 最も広範囲なキー（テーブル間連携の可能性）</h4>";
    echo "<ol>";
    foreach (array_slice($key_coverage, 0, 5) as $key => $count) {
        echo "<li><strong>{$key}</strong> - {$count}個のテーブルに存在</li>";
    }
    echo "</ol>";
    echo "</div>";
    
    // 5. 推奨される調査アクション
    echo "<h3>🔧 推奨アクション</h3>";
    echo "<div style='background: #fff3cd; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;'>";
    echo "<h4>📋 次に実行すべき調査</h4>";
    
    if (count($problem_tables) > 0) {
        echo "<p><strong>問題データを含むテーブルが特定されました。</strong></p>";
        echo "<ol>";
        foreach (array_keys($problem_tables) as $table) {
            if (!strpos($table, '_')) {
                echo "<li><strong>{$table}</strong> テーブルの問題データを削除</li>";
            }
        }
        echo "</ol>";
    }
    
    if (count($key_coverage) > 0) {
        $top_key = array_key_first($key_coverage);
        echo "<p><strong>共通キー候補:</strong> <code>{$top_key}</code> が最も多くのテーブル（{$key_coverage[$top_key]}個）に存在します。</p>";
        echo "<p>このキーを使用してテーブル間でデータを連携している可能性があります。</p>";
    }
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
