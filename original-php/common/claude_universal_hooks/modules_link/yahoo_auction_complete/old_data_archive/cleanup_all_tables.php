<?php
/**
 * 全テーブル横断 問題データ一括削除
 * SCRAPED_サンプルデータを全て削除
 */

require_once __DIR__ . '/database_query_handler.php';

echo "<h2>🧹 全テーブル問題データ一括削除</h2>";

$confirm_mode = !isset($_GET['execute']);

try {
    $pdo = getDatabaseConnection();
    if (!$pdo) {
        throw new Exception("PostgreSQL接続失敗");
    }

    // 問題データが存在するテーブル一覧
    $target_tables = [
        'mystical_japan_treasures_inventory',
        'unified_product_data',
        'unified_product_inventory', 
        'yahoo_scraped_products',
        'products',
        'inventory_products',
        'product_master'
    ];

    echo "<h3>🔍 全テーブル問題データ検索</h3>";
    
    $total_problem_data = [];
    
    foreach ($target_tables as $table) {
        try {
            // テーブルの存在確認
            $check_stmt = $pdo->query("SELECT to_regclass('public.{$table}')");
            if (!$check_stmt->fetchColumn()) {
                echo "<p>⚠️ テーブル {$table} は存在しません</p>";
                continue;
            }
            
            // 問題データ検索（タイトルカラムの存在を確認）
            $col_check = $pdo->query("
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '{$table}' 
                AND column_name IN ('title', 'active_title', 'product_name', 'name')
            ");
            $title_columns = $col_check->fetchAll(PDO::FETCH_COLUMN);
            
            if (empty($title_columns)) {
                echo "<p>📋 {$table}: タイトルカラムなし</p>";
                continue;
            }
            
            $title_col = $title_columns[0]; // 最初に見つかったタイトルカラム
            
            // 問題データ検索
            $problem_query = "
                SELECT COUNT(*) as problem_count
                FROM \"{$table}\"
                WHERE (
                    \"{$title_col}\" LIKE '%ヴィンテージ腕時計%' OR
                    \"{$title_col}\" LIKE '%スクレイピング商品%' OR
                    \"{$title_col}\" LIKE '%SEIKO%' OR
                    \"{$title_col}\" LIKE '%サンプル%' OR
                    \"{$title_col}\" LIKE '%テスト%'
                )
            ";
            
            $stmt = $pdo->query($problem_query);
            $problem_count = $stmt->fetchColumn();
            
            if ($problem_count > 0) {
                $total_problem_data[$table] = [
                    'count' => $problem_count,
                    'title_column' => $title_col
                ];
                
                // サンプルデータ取得
                $sample_query = "
                    SELECT \"{$title_col}\" as title, updated_at
                    FROM \"{$table}\"
                    WHERE (
                        \"{$title_col}\" LIKE '%ヴィンテージ腕時計%' OR
                        \"{$title_col}\" LIKE '%スクレイピング商品%' OR
                        \"{$title_col}\" LIKE '%SEIKO%' OR
                        \"{$title_col}\" LIKE '%サンプル%' OR
                        \"{$title_col}\" LIKE '%テスト%'
                    )
                    LIMIT 3
                ";
                
                $sample_stmt = $pdo->query($sample_query);
                $samples = $sample_stmt->fetchAll(PDO::FETCH_ASSOC);
                $total_problem_data[$table]['samples'] = $samples;
            }
            
            echo "<p>📊 <strong>{$table}</strong>: {$problem_count}件の問題データ</p>";
            
        } catch (Exception $e) {
            echo "<p>⚠️ {$table} 調査エラー: " . htmlspecialchars($e->getMessage()) . "</p>";
        }
    }
    
    $total_count = array_sum(array_column($total_problem_data, 'count'));
    
    if ($total_count > 0) {
        echo "<div style='background: #f8d7da; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>❌ 全体問題データ統計</h4>";
        echo "<p><strong>総問題データ数:</strong> {$total_count}件</p>";
        echo "<p><strong>対象テーブル数:</strong> " . count($total_problem_data) . "個</p>";
        
        echo "<table border='1' style='border-collapse: collapse; width: 100%; margin: 1rem 0;'>";
        echo "<tr><th>テーブル名</th><th>問題データ数</th><th>タイトルカラム</th><th>サンプルデータ</th></tr>";
        
        foreach ($total_problem_data as $table => $data) {
            echo "<tr>";
            echo "<td><strong>{$table}</strong></td>";
            echo "<td>{$data['count']}件</td>";
            echo "<td>{$data['title_column']}</td>";
            echo "<td>";
            if (!empty($data['samples'])) {
                foreach (array_slice($data['samples'], 0, 2) as $sample) {
                    echo "<small>" . htmlspecialchars(mb_substr($sample['title'], 0, 30)) . "...</small><br>";
                }
            }
            echo "</td>";
            echo "</tr>";
        }
        echo "</table>";
        echo "</div>";
        
        if ($confirm_mode) {
            echo "<div style='background: #fff3cd; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;'>";
            echo "<h4>🔧 一括削除の実行</h4>";
            echo "<p><strong>{$total_count}件の問題データを全テーブルから削除しますか？</strong></p>";
            echo "<p>削除対象: " . implode(', ', array_keys($total_problem_data)) . "</p>";
            
            echo "<div style='margin-top: 1.5rem;'>";
            echo "<a href='?execute=1' style='background: #dc3545; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; margin-right: 1rem; font-weight: bold;'>🗑️ 全テーブル一括削除を実行</a>";
            echo "<a href='?' style='background: #6c757d; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px;'>❌ キャンセル</a>";
            echo "</div>";
            echo "<p style='color: #dc3545; font-size: 0.9rem; margin-top: 1rem;'><strong>⚠️ 警告:</strong> この操作は複数テーブルにまたがって実行され、元に戻せません。</p>";
            echo "</div>";
        } else {
            // 実際の削除処理
            echo "<div style='background: #dc3545; color: white; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;'>";
            echo "<h4>🗑️ 一括削除処理実行中...</h4>";
            
            $total_deleted = 0;
            $pdo->beginTransaction();
            
            try {
                foreach ($total_problem_data as $table => $data) {
                    $title_col = $data['title_column'];
                    
                    $delete_query = "
                        DELETE FROM \"{$table}\"
                        WHERE (
                            \"{$title_col}\" LIKE '%ヴィンテージ腕時計%' OR
                            \"{$title_col}\" LIKE '%スクレイピング商品%' OR
                            \"{$title_col}\" LIKE '%SEIKO%' OR
                            \"{$title_col}\" LIKE '%サンプル%' OR
                            \"{$title_col}\" LIKE '%テスト%'
                        )
                    ";
                    
                    $delete_stmt = $pdo->prepare($delete_query);
                    $delete_stmt->execute();
                    $deleted_count = $delete_stmt->rowCount();
                    
                    $total_deleted += $deleted_count;
                    
                    echo "<p>✅ <strong>{$table}</strong>: {$deleted_count}件削除</p>";
                }
                
                $pdo->commit();
                
                echo "<div style='background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 6px; margin: 1rem 0;'>";
                echo "<h5>🎉 一括削除完了</h5>";
                echo "<p><strong>総削除数:</strong> {$total_deleted}件</p>";
                echo "<p><strong>処理テーブル数:</strong> " . count($total_problem_data) . "個</p>";
                echo "</div>";
                
            } catch (Exception $e) {
                $pdo->rollBack();
                echo "<p>❌ 削除処理エラー: " . htmlspecialchars($e->getMessage()) . "</p>";
                throw $e;
            }
            echo "</div>";
            
            // 削除後の確認
            echo "<h3>✅ 削除後の確認</h3>";
            echo "<div style='background: #d4edda; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
            echo "<h4>📊 クリーンアップ結果</h4>";
            
            foreach ($target_tables as $table) {
                try {
                    $count_stmt = $pdo->query("SELECT COUNT(*) FROM \"{$table}\"");
                    $remaining_count = $count_stmt->fetchColumn();
                    echo "<p><strong>{$table}:</strong> {$remaining_count}件 (残存データ)</p>";
                } catch (Exception $e) {
                    echo "<p><strong>{$table}:</strong> 確認エラー</p>";
                }
            }
            
            echo "<div style='margin-top: 1.5rem;'>";
            echo "<a href='yahoo_auction_content.php' target='_blank' style='background: #28a745; color: white; padding: 1rem 1.5rem; text-decoration: none; border-radius: 6px;'>✅ Yahoo Auction Tool で確認</a>";
            echo "</div>";
            echo "</div>";
        }
        
    } else {
        echo "<div style='background: #d4edda; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>✅ 問題データは見つかりませんでした</h4>";
        echo "<p>全テーブルがクリーンな状態です。</p>";
        echo "</div>";
    }
    
} catch (Exception $e) {
    echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px;'>";
    echo "<h4>❌ エラー発生</h4>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
    echo "</div>";
}
?>

<style>
table { font-size: 0.85rem; }
th { background: rgba(0,0,0,0.1); padding: 8px; }
td { padding: 6px; vertical-align: top; }
</style>
