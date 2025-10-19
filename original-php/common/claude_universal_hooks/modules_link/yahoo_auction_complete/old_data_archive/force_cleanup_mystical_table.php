<?php
/**
 * mystical_japan_treasures_inventory テーブル強制クリーンアップ
 * Yahoo Auction Tool のデータソース問題を完全解決
 */

require_once __DIR__ . '/database_query_handler.php';

echo "<h2>🔧 mystical_japan_treasures_inventory テーブル強制クリーンアップ</h2>";

$confirm_mode = !isset($_GET['execute']);

try {
    $pdo = getDatabaseConnection();
    if (!$pdo) {
        throw new Exception("PostgreSQL接続失敗");
    }

    echo "<h3>🔍 現在の状況確認</h3>";
    
    // 総レコード数確認
    $total_stmt = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory");
    $total_count = $total_stmt->fetchColumn();
    
    echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
    echo "<p><strong>mystical_japan_treasures_inventory テーブル総レコード数:</strong> {$total_count}件</p>";
    echo "</div>";
    
    if ($total_count == 0) {
        echo "<div style='background: #d4edda; padding: 1rem; border-radius: 8px;'>";
        echo "<h4>✅ テーブルは既に空です</h4>";
        echo "<p>問題データは存在しません。</p>";
        echo "</div>";
        exit;
    }
    
    // 問題データの詳細分析
    echo "<h3>🕵️ 問題データの詳細分析</h3>";
    
    $problem_patterns = [
        'ヴィンテージ腕時計' => "title LIKE '%ヴィンテージ腕時計%'",
        'スクレイピング商品' => "title LIKE '%スクレイピング商品%'", 
        'SEIKO' => "title LIKE '%SEIKO%'",
        'サンプル' => "title LIKE '%サンプル%'",
        'テスト' => "title LIKE '%テスト%'",
        'sample' => "title LIKE '%sample%'",
        'test' => "title LIKE '%test%'"
    ];
    
    $problem_counts = [];
    $total_problem_count = 0;
    
    foreach ($problem_patterns as $pattern_name => $sql_condition) {
        $pattern_stmt = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory WHERE {$sql_condition}");
        $pattern_count = $pattern_stmt->fetchColumn();
        
        if ($pattern_count > 0) {
            $problem_counts[$pattern_name] = $pattern_count;
            $total_problem_count += $pattern_count;
        }
    }
    
    // 実データの存在確認
    $real_data_query = "
        SELECT COUNT(*) FROM mystical_japan_treasures_inventory 
        WHERE NOT (
            title LIKE '%ヴィンテージ腕時計%' OR
            title LIKE '%スクレイピング商品%' OR
            title LIKE '%SEIKO%' OR
            title LIKE '%サンプル%' OR
            title LIKE '%テスト%' OR
            title LIKE '%sample%' OR
            title LIKE '%test%'
        )
    ";
    
    $real_data_stmt = $pdo->query($real_data_query);
    $real_data_count = $real_data_stmt->fetchColumn();
    
    echo "<div style='background: #fff3cd; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;'>";
    echo "<h4>📊 データ分析結果</h4>";
    echo "<div style='display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2rem; text-align: center;'>";
    echo "<div>";
    echo "<div style='font-size: 2rem; font-weight: bold; color: #dc3545;'>{$total_problem_count}</div>";
    echo "<div>問題データ</div>";
    echo "</div>";
    echo "<div>";
    echo "<div style='font-size: 2rem; font-weight: bold; color: #28a745;'>{$real_data_count}</div>";
    echo "<div>実データ</div>";
    echo "</div>";
    echo "<div>";
    echo "<div style='font-size: 2rem; font-weight: bold; color: #007bff;'>{$total_count}</div>";
    echo "<div>総データ</div>";
    echo "</div>";
    echo "</div>";
    
    if (count($problem_counts) > 0) {
        echo "<h5>🔍 問題データの詳細</h5>";
        foreach ($problem_counts as $pattern => $count) {
            echo "<p>• <strong>{$pattern}</strong>: {$count}件</p>";
        }
    }
    echo "</div>";
    
    // 実データのサンプル表示
    if ($real_data_count > 0) {
        echo "<div style='background: #d4edda; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>✅ 保護される実データのサンプル</h4>";
        
        $real_sample_query = "
            SELECT item_id, title, current_price, updated_at
            FROM mystical_japan_treasures_inventory 
            WHERE NOT (
                title LIKE '%ヴィンテージ腕時計%' OR
                title LIKE '%スクレイピング商品%' OR
                title LIKE '%SEIKO%' OR
                title LIKE '%サンプル%' OR
                title LIKE '%テスト%' OR
                title LIKE '%sample%' OR
                title LIKE '%test%'
            )
            ORDER BY updated_at DESC
            LIMIT 5
        ";
        
        $real_sample_stmt = $pdo->query($real_sample_query);
        $real_samples = $real_sample_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($real_samples) > 0) {
            echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.8rem;'>";
            echo "<tr><th>item_id</th><th>title</th><th>price</th><th>updated_at</th></tr>";
            foreach ($real_samples as $sample) {
                echo "<tr>";
                echo "<td>" . htmlspecialchars($sample['item_id']) . "</td>";
                echo "<td>" . htmlspecialchars(mb_substr($sample['title'], 0, 50)) . "</td>";
                echo "<td>¥" . number_format($sample['current_price']) . "</td>";
                echo "<td>" . htmlspecialchars($sample['updated_at']) . "</td>";
                echo "</tr>";
            }
            echo "</table>";
            echo "<p style='color: #155724;'><strong>これらの貴重な実データは保護されます。</strong></p>";
        }
        echo "</div>";
    }
    
    // 問題データのサンプル表示
    if ($total_problem_count > 0) {
        echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>❌ 削除される問題データのサンプル</h4>";
        
        $problem_sample_query = "
            SELECT item_id, title, current_price, updated_at
            FROM mystical_japan_treasures_inventory 
            WHERE (
                title LIKE '%ヴィンテージ腕時計%' OR
                title LIKE '%スクレイピング商品%' OR
                title LIKE '%SEIKO%' OR
                title LIKE '%サンプル%' OR
                title LIKE '%テスト%' OR
                title LIKE '%sample%' OR
                title LIKE '%test%'
            )
            ORDER BY updated_at DESC
            LIMIT 10
        ";
        
        $problem_sample_stmt = $pdo->query($problem_sample_query);
        $problem_samples = $problem_sample_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($problem_samples) > 0) {
            echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.8rem;'>";
            echo "<tr><th>item_id</th><th>title</th><th>price</th><th>updated_at</th></tr>";
            foreach ($problem_samples as $sample) {
                echo "<tr>";
                echo "<td>" . htmlspecialchars($sample['item_id']) . "</td>";
                echo "<td style='color: #dc3545;'>" . htmlspecialchars($sample['title']) . "</td>";
                echo "<td>¥" . number_format($sample['current_price']) . "</td>";
                echo "<td>" . htmlspecialchars($sample['updated_at']) . "</td>";
                echo "</tr>";
            }
            echo "</table>";
            echo "<p style='color: #721c24;'><strong>これらの問題データが削除されます。</strong></p>";
        }
        echo "</div>";
    }
    
    if ($confirm_mode) {
        if ($total_problem_count > 0) {
            echo "<div style='background: #dc3545; color: white; padding: 2rem; border-radius: 12px; margin: 2rem 0;'>";
            echo "<h4>🗑️ 問題データの削除確認</h4>";
            echo "<p><strong>以下の削除を実行しますか？</strong></p>";
            echo "<ul>";
            echo "<li><strong>削除対象:</strong> {$total_problem_count}件の問題データ</li>";
            echo "<li><strong>保護対象:</strong> {$real_data_count}件の実データ</li>";
            echo "<li><strong>削除後:</strong> {$real_data_count}件のクリーンなデータ</li>";
            echo "</ul>";
            
            echo "<div style='background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 6px; margin: 1rem 0;'>";
            echo "<h5>🔒 安全保証</h5>";
            echo "<ul>";
            echo "<li>✅ 実データは一切削除されません</li>";
            echo "<li>✅ 条件指定削除（WHERE句使用）</li>"; 
            echo "<li>✅ トランザクション処理（エラー時ロールバック）</li>";
            echo "<li>✅ バックアップ推奨（念のため）</li>";
            echo "</ul>";
            echo "</div>";
            
            echo "<div style='margin-top: 2rem; text-align: center;'>";
            echo "<a href='?execute=1' style='background: white; color: #dc3545; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 1rem;'>🗑️ 問題データを削除実行</a>";
            echo "<a href='?' style='background: rgba(255,255,255,0.3); color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold;'>❌ キャンセル</a>";
            echo "</div>";
            echo "</div>";
        } else {
            echo "<div style='background: #d4edda; padding: 2rem; border-radius: 12px; margin: 2rem 0;'>";
            echo "<h4>✅ 問題データは見つかりませんでした</h4>";
            echo "<p>mystical_japan_treasures_inventory テーブルは既にクリーンです。</p>";
            echo "</div>";
        }
    } else {
        // 実際の削除処理
        echo "<div style='background: #dc3545; color: white; padding: 2rem; border-radius: 12px; margin: 2rem 0;'>";
        echo "<h4>🗑️ 問題データ削除処理実行中...</h4>";
        
        $pdo->beginTransaction();
        
        try {
            $delete_query = "
                DELETE FROM mystical_japan_treasures_inventory 
                WHERE (
                    title LIKE '%ヴィンテージ腕時計%' OR
                    title LIKE '%スクレイピング商品%' OR
                    title LIKE '%SEIKO%' OR
                    title LIKE '%サンプル%' OR
                    title LIKE '%テスト%' OR
                    title LIKE '%sample%' OR
                    title LIKE '%test%'
                )
            ";
            
            $delete_stmt = $pdo->prepare($delete_query);
            $delete_stmt->execute();
            $deleted_count = $delete_stmt->rowCount();
            
            $pdo->commit();
            
            echo "<div style='background: rgba(255,255,255,0.2); padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;'>";
            echo "<h5>🎉 削除処理完了</h5>";
            echo "<p><strong>削除されたレコード数:</strong> {$deleted_count}件</p>";
            
            // 削除後の状態確認
            $final_count_stmt = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory");
            $final_count = $final_count_stmt->fetchColumn();
            
            echo "<p><strong>削除後のレコード数:</strong> {$final_count}件</p>";
            echo "<p><strong>想定される実データ数:</strong> {$real_data_count}件</p>";
            
            if ($final_count == $real_data_count) {
                echo "<p style='color: #90ee90;'>✅ <strong>削除処理が正常に完了しました</strong></p>";
            } else {
                echo "<p style='color: #ffcccb;'>⚠️ <strong>想定と異なる結果です。確認が必要です。</strong></p>";
            }
            echo "</div>";
            
        } catch (Exception $e) {
            $pdo->rollBack();
            echo "<p>❌ 削除処理エラー: " . htmlspecialchars($e->getMessage()) . "</p>";
            throw $e;
        }
        
        echo "</div>";
        
        // 削除後の確認とテスト
        echo "<h3>✅ 削除後の動作確認</h3>";
        echo "<div style='background: #d4edda; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>🧪 getApprovalQueueData() 関数テスト</h4>";
        
        $test_data = getApprovalQueueData([]);
        $test_count = count($test_data);
        
        echo "<p><strong>取得データ数:</strong> {$test_count}件</p>";
        
        if ($test_count > 0) {
            // 問題データが残っているかチェック
            $remaining_problems = 0;
            foreach ($test_data as $item) {
                $title = $item['title'] ?? '';
                if (strpos($title, 'ヴィンテージ腕時計') !== false || 
                    strpos($title, 'スクレイピング商品') !== false ||
                    strpos($title, 'SEIKO') !== false) {
                    $remaining_problems++;
                }
            }
            
            if ($remaining_problems == 0) {
                echo "<p style='color: #155724;'>✅ <strong>問題データは完全に削除されました</strong></p>";
                echo "<p>Yahoo Auction Tool は正常なデータのみを表示するようになります。</p>";
                
                // クリーンなデータのサンプル表示
                echo "<h5>📋 表示されるクリーンなデータ（最新5件）</h5>";
                echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.8rem;'>";
                echo "<tr><th>item_id</th><th>title</th><th>price</th><th>status</th></tr>";
                
                foreach (array_slice($test_data, 0, 5) as $item) {
                    echo "<tr>";
                    echo "<td>" . htmlspecialchars($item['item_id'] ?? '') . "</td>";
                    echo "<td>" . htmlspecialchars(mb_substr($item['title'] ?? '', 0, 40)) . "</td>";
                    echo "<td>¥" . number_format($item['current_price'] ?? 0) . "</td>";
                    echo "<td>" . htmlspecialchars($item['source_system'] ?? '') . "</td>";
                    echo "</tr>";
                }
                echo "</table>";
            } else {
                echo "<p style='color: #721c24;'>⚠️ <strong>まだ{$remaining_problems}件の問題データが残存しています</strong></p>";
            }
        } else {
            echo "<p>📝 データが取得されませんでした。テーブルが空になっている可能性があります。</p>";
        }
        
        echo "<div style='margin-top: 2rem; text-align: center;'>";
        echo "<a href='../yahoo_auction_complete/yahoo_auction_content.php' target='_blank' style='background: #007bff; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold;'>🔍 Yahoo Auction Tool で確認</a>";
        echo "</div>";
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
table { font-size: 0.8rem; }
th { background: rgba(0,0,0,0.1); padding: 8px; }
td { padding: 6px; }
</style>
