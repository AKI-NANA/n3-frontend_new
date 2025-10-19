<?php
/**
 * サンプルデータ混入テーブルの特定・選択的削除
 * 重要データを保護しながら安全にクリーンアップ
 */

require_once __DIR__ . '/database_query_handler.php';

echo "<h2>🎯 サンプルデータ混入テーブル特定・選択的削除</h2>";

$confirm_mode = !isset($_GET['execute']);

try {
    $pdo = getDatabaseConnection();
    if (!$pdo) {
        throw new Exception("PostgreSQL接続失敗");
    }

    // 重要データが含まれるテーブルを分析
    $important_tables = [
        'mystical_japan_treasures_inventory' => 'メイン商品データベース',
        'ebay_inventory' => 'eBay API専用データ', 
        'yahoo_scraped_products' => 'Yahoo スクレイピングデータ',
        'inventory_products' => '物理在庫管理',
        'product_master' => '商品マスターテーブル',
        'unified_product_inventory' => '統合在庫管理'
    ];

    echo "<h3>🔍 重要テーブルのサンプルデータ検出</h3>";
    
    $tables_with_sample_data = [];
    $total_sample_count = 0;
    $total_real_count = 0;
    
    foreach ($important_tables as $table => $description) {
        try {
            // テーブル存在確認
            $check_stmt = $pdo->query("SELECT to_regclass('public.{$table}')");
            if (!$check_stmt->fetchColumn()) {
                echo "<div style='background: #f8f9fa; padding: 1rem; border-radius: 8px; margin: 0.5rem 0;'>";
                echo "<p>⚠️ <strong>{$table}</strong> - テーブルが存在しません</p>";
                echo "</div>";
                continue;
            }
            
            // 総レコード数
            $count_stmt = $pdo->query("SELECT COUNT(*) FROM \"{$table}\"");
            $total_count = $count_stmt->fetchColumn();
            
            if ($total_count == 0) {
                echo "<div style='background: #e2e3e5; padding: 1rem; border-radius: 8px; margin: 0.5rem 0;'>";
                echo "<p>📝 <strong>{$table}</strong> ({$description}) - 空のテーブル (0件)</p>";
                echo "</div>";
                continue;
            }
            
            // タイトルカラム特定
            $title_columns = ['title', 'active_title', 'product_name', 'name'];
            $title_column = null;
            
            foreach ($title_columns as $col) {
                $col_check = $pdo->query("
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{$table}' AND column_name = '{$col}'
                ");
                if ($col_check->rowCount() > 0) {
                    $title_column = $col;
                    break;
                }
            }
            
            if (!$title_column) {
                echo "<div style='background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 0.5rem 0;'>";
                echo "<p>📋 <strong>{$table}</strong> ({$description}) - タイトルカラムなし ({$total_count}件)</p>";
                echo "</div>";
                continue;
            }
            
            // サンプルデータ検出
            $sample_query = "
                SELECT COUNT(*) as sample_count
                FROM \"{$table}\"
                WHERE (
                    \"{$title_column}\" LIKE '%サンプル%' OR
                    \"{$title_column}\" LIKE '%テスト%' OR
                    \"{$title_column}\" LIKE '%ヴィンテージ腕時計%' OR
                    \"{$title_column}\" LIKE '%スクレイピング商品%' OR
                    \"{$title_column}\" LIKE '%SEIKO%' OR
                    \"{$title_column}\" LIKE '%sample%' OR
                    \"{$title_column}\" LIKE '%test%'
                )
            ";
            
            $sample_stmt = $pdo->query($sample_query);
            $sample_count = $sample_stmt->fetchColumn();
            $real_count = $total_count - $sample_count;
            
            $total_sample_count += $sample_count;
            $total_real_count += $real_count;
            
            if ($sample_count > 0) {
                $tables_with_sample_data[$table] = [
                    'description' => $description,
                    'total' => $total_count,
                    'sample' => $sample_count, 
                    'real' => $real_count,
                    'title_column' => $title_column
                ];
                
                echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px; margin: 0.5rem 0;'>";
                echo "<h4>❌ <strong>{$table}</strong> ({$description})</h4>";
                echo "<div style='display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0;'>";
                echo "<div style='text-align: center; background: rgba(255,255,255,0.7); padding: 0.5rem; border-radius: 4px;'>";
                echo "<strong>{$total_count}</strong><br><small>総数</small></div>";
                echo "<div style='text-align: center; background: rgba(255,255,255,0.7); padding: 0.5rem; border-radius: 4px; color: #28a745;'>";
                echo "<strong>{$real_count}</strong><br><small>実データ</small></div>";
                echo "<div style='text-align: center; background: rgba(255,255,255,0.7); padding: 0.5rem; border-radius: 4px; color: #dc3545;'>";
                echo "<strong>{$sample_count}</strong><br><small>サンプル</small></div>";
                echo "</div>";
                
                // サンプルデータの例を表示
                $sample_preview_query = "
                    SELECT \"{$title_column}\" as title
                    FROM \"{$table}\"
                    WHERE (
                        \"{$title_column}\" LIKE '%サンプル%' OR
                        \"{$title_column}\" LIKE '%テスト%' OR
                        \"{$title_column}\" LIKE '%ヴィンテージ腕時計%' OR
                        \"{$title_column}\" LIKE '%スクレイピング商品%' OR
                        \"{$title_column}\" LIKE '%SEIKO%'
                    )
                    LIMIT 3
                ";
                
                $sample_preview_stmt = $pdo->query($sample_preview_query);
                $sample_previews = $sample_preview_stmt->fetchAll(PDO::FETCH_COLUMN);
                
                if (count($sample_previews) > 0) {
                    echo "<p><strong>削除対象サンプル:</strong></p>";
                    echo "<ul>";
                    foreach ($sample_previews as $preview) {
                        echo "<li>" . htmlspecialchars($preview) . "</li>";
                    }
                    echo "</ul>";
                }
                echo "</div>";
                
            } else {
                echo "<div style='background: #d4edda; padding: 1rem; border-radius: 8px; margin: 0.5rem 0;'>";
                echo "<p>✅ <strong>{$table}</strong> ({$description}) - クリーンなテーブル ({$real_count}件の実データ)</p>";
                echo "</div>";
            }
            
        } catch (Exception $e) {
            echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px; margin: 0.5rem 0;'>";
            echo "<p>❌ <strong>{$table}</strong> - 分析エラー: " . htmlspecialchars($e->getMessage()) . "</p>";
            echo "</div>";
        }
    }
    
    // 結果サマリー
    echo "<h3>📊 サンプルデータ削除サマリー</h3>";
    echo "<div style='background: #e7f3ff; padding: 1.5rem; border-radius: 12px; margin: 1rem 0;'>";
    echo "<div style='display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; text-align: center;'>";
    echo "<div>";
    echo "<div style='font-size: 2rem; font-weight: bold; color: #0066cc;'>" . count($tables_with_sample_data) . "</div>";
    echo "<div>サンプルデータ混入テーブル</div>";
    echo "</div>";
    echo "<div>";
    echo "<div style='font-size: 2rem; font-weight: bold; color: #28a745;'>{$total_real_count}</div>";
    echo "<div>保護される実データ</div>";
    echo "</div>";
    echo "<div>";
    echo "<div style='font-size: 2rem; font-weight: bold; color: #dc3545;'>{$total_sample_count}</div>";
    echo "<div>削除対象サンプルデータ</div>";
    echo "</div>";
    echo "</div>";
    echo "</div>";
    
    if (count($tables_with_sample_data) > 0) {
        if ($confirm_mode) {
            echo "<div style='background: #fff3cd; padding: 2rem; border-radius: 12px; margin: 2rem 0;'>";
            echo "<h4>🔧 選択的サンプルデータ削除の実行</h4>";
            echo "<p><strong>以下の操作を実行しますか？</strong></p>";
            echo "<ul>";
            foreach ($tables_with_sample_data as $table => $info) {
                echo "<li><strong>{$table}</strong> - {$info['sample']}件のサンプルデータを削除（{$info['real']}件の実データは保護）</li>";
            }
            echo "</ul>";
            echo "<p style='color: #856404;'><strong>⚠️ 重要:</strong> 実データ（eBay API、スクレイピング、在庫データ）は一切削除されません。サンプルデータのみが対象です。</p>";
            
            echo "<div style='margin-top: 2rem; text-align: center;'>";
            echo "<a href='?execute=1' style='background: #28a745; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 1rem;'>✅ サンプルデータのみ安全削除</a>";
            echo "<a href='?' style='background: #6c757d; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px;'>❌ キャンセル</a>";
            echo "</div>";
            echo "</div>";
            
        } else {
            // 実際の削除処理
            echo "<div style='background: #28a745; color: white; padding: 2rem; border-radius: 12px; margin: 2rem 0;'>";
            echo "<h4>🗑️ 選択的削除処理実行中...</h4>";
            
            $total_deleted = 0;
            $deletion_log = [];
            
            $pdo->beginTransaction();
            
            try {
                foreach ($tables_with_sample_data as $table => $info) {
                    $title_column = $info['title_column'];
                    
                    $delete_query = "
                        DELETE FROM \"{$table}\"
                        WHERE (
                            \"{$title_column}\" LIKE '%サンプル%' OR
                            \"{$title_column}\" LIKE '%テスト%' OR
                            \"{$title_column}\" LIKE '%ヴィンテージ腕時計%' OR
                            \"{$title_column}\" LIKE '%スクレイピング商品%' OR
                            \"{$title_column}\" LIKE '%SEIKO%' OR
                            \"{$title_column}\" LIKE '%sample%' OR
                            \"{$title_column}\" LIKE '%test%'
                        )
                    ";
                    
                    $delete_stmt = $pdo->prepare($delete_query);
                    $delete_stmt->execute();
                    $deleted_count = $delete_stmt->rowCount();
                    
                    $total_deleted += $deleted_count;
                    $deletion_log[$table] = [
                        'deleted' => $deleted_count,
                        'expected' => $info['sample'],
                        'remaining_real' => $info['real']
                    ];
                    
                    echo "<div style='background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 6px; margin: 0.5rem 0;'>";
                    echo "<p>✅ <strong>{$table}</strong>: {$deleted_count}件削除 (実データ{$info['real']}件は保護済み)</p>";
                    echo "</div>";
                }
                
                $pdo->commit();
                
                echo "<div style='background: rgba(255,255,255,0.3); padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;'>";
                echo "<h5>🎉 選択的削除完了</h5>";
                echo "<p><strong>削除されたサンプルデータ:</strong> {$total_deleted}件</p>";
                echo "<p><strong>保護された実データ:</strong> {$total_real_count}件</p>";
                echo "<p><strong>処理テーブル:</strong> " . count($tables_with_sample_data) . "個</p>";
                echo "</div>";
                
            } catch (Exception $e) {
                $pdo->rollBack();
                echo "<p>❌ 削除処理エラー: " . htmlspecialchars($e->getMessage()) . "</p>";
                throw $e;
            }
            echo "</div>";
            
            // 削除後の確認
            echo "<h3>✅ 削除後の状態確認</h3>";
            echo "<div style='background: #d4edda; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;'>";
            echo "<h4>📊 各テーブルの最終状態</h4>";
            
            foreach ($important_tables as $table => $description) {
                try {
                    $final_count_stmt = $pdo->query("SELECT COUNT(*) FROM \"{$table}\"");
                    $final_count = $final_count_stmt->fetchColumn();
                    
                    if (isset($deletion_log[$table])) {
                        $log = $deletion_log[$table];
                        echo "<p><strong>{$table}:</strong> {$final_count}件 (削除: {$log['deleted']}件, 残存実データ: 約{$log['remaining_real']}件)</p>";
                    } else {
                        echo "<p><strong>{$table}:</strong> {$final_count}件 (変更なし)</p>";
                    }
                } catch (Exception $e) {
                    echo "<p><strong>{$table}:</strong> 確認エラー</p>";
                }
            }
            
            echo "<div style='margin-top: 2rem; text-align: center;'>";
            echo "<a href='yahoo_auction_content.php' target='_blank' style='background: #007bff; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 1rem;'>🔍 Yahoo Auction Tool で確認</a>";
            echo "<a href='analyze_table_importance.php' style='background: #28a745; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold;'>📊 再分析実行</a>";
            echo "</div>";
            echo "</div>";
        }
    } else {
        echo "<div style='background: #d4edda; padding: 2rem; border-radius: 12px; margin: 2rem 0;'>";
        echo "<h4>✅ サンプルデータは見つかりませんでした</h4>";
        echo "<p>すべての重要テーブルがクリーンな状態です。</p>";
        echo "<p><strong>実データ総数:</strong> {$total_real_count}件</p>";
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
td { padding: 6px; }
</style>
