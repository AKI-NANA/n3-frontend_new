<?php
/**
 * APIサーバーとデータベースの両方を確認
 * Yahoo Auction Tool の真のデータソースを特定
 */

require_once __DIR__ . '/database_query_handler.php';

echo "<h2>🕵️ APIサーバー・データベース両方の状況確認</h2>";

try {
    echo "<h3>1️⃣ APIサーバー (localhost:5002) 接続確認</h3>";
    
    // APIサーバーヘルスチェック
    $health_check = checkScrapingServerConnection();
    
    if ($health_check['connected']) {
        echo "<div style='background: #d4edda; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>✅ APIサーバー接続成功</h4>";
        echo "<p><strong>ステータス:</strong> " . htmlspecialchars($health_check['status']) . "</p>";
        echo "<p><strong>データベース:</strong> " . htmlspecialchars($health_check['database'] ?? 'Unknown') . "</p>";
        echo "<p><strong>データベース種別:</strong> " . htmlspecialchars($health_check['database_type'] ?? 'Unknown') . "</p>";
        echo "<p><strong>ポート:</strong> " . htmlspecialchars($health_check['port'] ?? '5002') . "</p>";
        echo "</div>";
        
        // APIサーバーから承認データ取得試行
        echo "<h4>🔍 APIサーバーから承認データ取得</h4>";
        $api_result = fetchFromAPIServer('/api/get_approval_queue');
        
        if ($api_result && $api_result['success']) {
            $api_data_count = count($api_result['data']);
            echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
            echo "<h5>❌ APIサーバーに問題データが存在</h5>";
            echo "<p><strong>取得データ数:</strong> {$api_data_count}件</p>";
            
            if ($api_data_count > 0) {
                echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.8rem;'>";
                echo "<tr><th>item_id</th><th>title</th><th>price</th><th>source</th></tr>";
                
                foreach (array_slice($api_result['data'], 0, 10) as $item) {
                    $title = $item['title'] ?? '';
                    $is_problem = strpos($title, 'ヴィンテージ腕時計') !== false || 
                                  strpos($title, 'スクレイピング商品') !== false ||
                                  strpos($title, 'SEIKO') !== false;
                    
                    $row_style = $is_problem ? 'background: #f8d7da;' : '';
                    
                    echo "<tr style='{$row_style}'>";
                    echo "<td>" . htmlspecialchars($item['item_id'] ?? '') . "</td>";
                    echo "<td>" . htmlspecialchars($title) . "</td>";
                    echo "<td>" . htmlspecialchars($item['current_price'] ?? '') . "</td>";
                    echo "<td>" . htmlspecialchars($item['source_system'] ?? '') . "</td>";
                    echo "</tr>";
                }
                echo "</table>";
                
                echo "<p><strong>⚠️ これがYahoo Auction Toolで表示されている問題データです！</strong></p>";
                echo "<p><strong>解決方法:</strong> APIサーバー側のデータも削除する必要があります。</p>";
            }
            echo "</div>";
            
        } else {
            echo "<div style='background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
            echo "<p>⚠️ APIサーバーから承認データを取得できませんでした</p>";
            if (isset($api_result['error'])) {
                echo "<p>エラー: " . htmlspecialchars($api_result['error']) . "</p>";
            }
            echo "</div>";
        }
        
    } else {
        echo "<div style='background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>⚠️ APIサーバー接続失敗</h4>";
        echo "<p>エラー: " . htmlspecialchars($health_check['error']) . "</p>";
        echo "<p>APIサーバーが停止している可能性があります。</p>";
        echo "</div>";
    }
    
    echo "<h3>2️⃣ データベース直接確認</h3>";
    
    $pdo = getDatabaseConnection();
    if ($pdo) {
        // データベース直接確認
        $db_check_stmt = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory");
        $db_total = $db_check_stmt->fetchColumn();
        
        $db_problem_stmt = $pdo->query("
            SELECT COUNT(*) FROM mystical_japan_treasures_inventory 
            WHERE (
                title LIKE '%ヴィンテージ腕時計%' OR
                title LIKE '%スクレイピング商品%' OR
                title LIKE '%SEIKO%'
            )
        ");
        $db_problem_count = $db_problem_stmt->fetchColumn();
        
        echo "<div style='background: " . ($db_problem_count > 0 ? '#f8d7da' : '#d4edda') . "; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>📊 データベース直接確認結果</h4>";
        echo "<p><strong>総レコード数:</strong> {$db_total}件</p>";
        echo "<p><strong>問題データ:</strong> {$db_problem_count}件</p>";
        
        if ($db_problem_count > 0) {
            echo "<p style='color: #721c24;'><strong>⚠️ データベースにまだ問題データが残存しています</strong></p>";
            
            // 残存問題データのサンプル表示
            $remaining_stmt = $pdo->query("
                SELECT item_id, title, current_price 
                FROM mystical_japan_treasures_inventory 
                WHERE (
                    title LIKE '%ヴィンテージ腕時計%' OR
                    title LIKE '%スクレイピング商品%' OR
                    title LIKE '%SEIKO%'
                )
                LIMIT 5
            ");
            $remaining_samples = $remaining_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo "<h5>🔍 残存問題データサンプル</h5>";
            echo "<ul>";
            foreach ($remaining_samples as $sample) {
                echo "<li><strong>" . htmlspecialchars($sample['item_id']) . "</strong>: " . 
                     htmlspecialchars($sample['title']) . " (¥" . number_format($sample['current_price']) . ")</li>";
            }
            echo "</ul>";
        } else {
            echo "<p style='color: #155724;'><strong>✅ データベースはクリーンです</strong></p>";
        }
        echo "</div>";
    }
    
    echo "<h3>3️⃣ getApprovalQueueData() 関数の実際の動作確認</h3>";
    
    // 実際に関数を実行して確認
    echo "<div style='background: #e7f3ff; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
    echo "<h4>🔧 getApprovalQueueData() 関数実行</h4>";
    
    $approval_data = getApprovalQueueData([]);
    $approval_count = count($approval_data);
    
    echo "<p><strong>取得データ数:</strong> {$approval_count}件</p>";
    
    if ($approval_count > 0) {
        $problem_data = array_filter($approval_data, function($item) {
            $title = $item['title'] ?? '';
            return strpos($title, 'ヴィンテージ腕時計') !== false || 
                   strpos($title, 'スクレイピング商品') !== false ||
                   strpos($title, 'SEIKO') !== false;
        });
        
        $problem_count = count($problem_data);
        
        if ($problem_count > 0) {
            echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 6px; margin: 1rem 0;'>";
            echo "<h5>❌ 問題データ発見: {$problem_count}件</h5>";
            
            echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.8rem;'>";
            echo "<tr><th>item_id</th><th>title</th><th>price</th><th>source_system</th></tr>";
            
            foreach (array_slice($problem_data, 0, 10) as $problem) {
                echo "<tr style='background: #f8d7da;'>";
                echo "<td>" . htmlspecialchars($problem['item_id'] ?? '') . "</td>";
                echo "<td>" . htmlspecialchars($problem['title'] ?? '') . "</td>";
                echo "<td>" . htmlspecialchars($problem['current_price'] ?? '') . "</td>";
                echo "<td>" . htmlspecialchars($problem['source_system'] ?? '') . "</td>";
                echo "</tr>";
            }
            echo "</table>";
            echo "</div>";
        } else {
            echo "<p style='color: #155724;'>✅ 問題データは見つかりませんでした</p>";
        }
    } else {
        echo "<p>📝 データが取得されませんでした</p>";
    }
    echo "</div>";
    
    echo "<h3>🎯 結論と解決策</h3>";
    echo "<div style='background: #dc3545; color: white; padding: 2rem; border-radius: 12px; margin: 2rem 0;'>";
    echo "<h4>📋 問題の正確な原因</h4>";
    
    if ($health_check['connected'] && isset($api_result) && $api_result['success']) {
        echo "<p>✅ <strong>原因特定:</strong> APIサーバー (localhost:5002) に問題データが存在</p>";
        echo "<p>🔧 <strong>解決策:</strong> APIサーバー側のデータベースも削除する必要があります</p>";
        echo "<p>📍 <strong>データソース:</strong> " . htmlspecialchars($health_check['database'] ?? 'Unknown') . " (" . htmlspecialchars($health_check['database_type'] ?? 'Unknown') . ")</p>";
    } elseif ($db_problem_count > 0) {
        echo "<p>✅ <strong>原因特定:</strong> PostgreSQL データベースに問題データが残存</p>";
        echo "<p>🔧 <strong>解決策:</strong> データベースの削除処理が不完全だった可能性</p>";
    } else {
        echo "<p>⚠️ <strong>原因不明:</strong> 更なる調査が必要です</p>";
    }
    
    echo "<div style='margin-top: 2rem; text-align: center;'>";
    if ($health_check['connected']) {
        echo "<a href='cleanup_api_server.php' style='background: white; color: #dc3545; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 1rem;'>🗑️ APIサーバーデータ削除</a>";
    }
    if ($db_problem_count > 0) {
        echo "<a href='force_cleanup_mystical_table.php?execute=1' style='background: white; color: #dc3545; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold;'>🔧 データベース再削除</a>";
    }
    echo "</div>";
    echo "</div>";
    
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
