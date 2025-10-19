<?php
/**
 * サンプル・テストデータクリーンアップスクリプト
 * 表示されている不正なデータを削除
 */

require_once __DIR__ . '/database_query_handler.php';

echo "<h2>🧹 データベースクリーンアップ</h2>";

// 確認モード（実際の削除前に確認）
$confirm_mode = !isset($_GET['execute']);

try {
    $pdo = getDatabaseConnection();
    if (!$pdo) {
        throw new Exception("データベース接続失敗");
    }

    echo "<h3>🔍 削除対象データの確認</h3>";
    
    // サンプル・テストデータを特定
    $stmt = $pdo->prepare("
        SELECT item_id, title, current_price, updated_at, source_url
        FROM mystical_japan_treasures_inventory 
        WHERE (
            title LIKE '%ヴィンテージ腕時計%' OR
            title LIKE '%スクレイピング商品%' OR
            title LIKE '%SEIKO 自動巻き%' OR
            title LIKE '%サンプル%' OR
            title LIKE '%テスト%' OR
            item_id LIKE 'SCRAPED_%' OR
            (source_url = '' OR source_url IS NULL) AND item_id LIKE 'SCRAPED_%'
        )
        ORDER BY updated_at DESC
    ");
    $stmt->execute();
    $deleteTargets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($deleteTargets) > 0) {
        echo "<div style='background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>⚠️ 削除対象: " . count($deleteTargets) . "件</h4>";
        echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.9rem;'>";
        echo "<tr><th>SKU</th><th>タイトル</th><th>価格</th><th>URL状態</th><th>更新日時</th></tr>";
        
        foreach ($deleteTargets as $target) {
            $isProblematic = (
                strpos($target['title'], 'ヴィンテージ腕時計') !== false ||
                strpos($target['title'], 'スクレイピング商品') !== false ||
                strpos($target['title'], 'SEIKO') !== false ||
                empty($target['source_url'])
            );
            
            $rowStyle = $isProblematic ? "background-color: #f8d7da;" : "";
            
            echo "<tr style='{$rowStyle}'>";
            echo "<td>" . htmlspecialchars($target['item_id']) . "</td>";
            echo "<td>" . htmlspecialchars($target['title']) . "</td>";
            echo "<td>¥" . number_format($target['current_price']) . "</td>";
            echo "<td>" . (empty($target['source_url']) ? '❌空' : '✅有り') . "</td>";
            echo "<td>" . htmlspecialchars($target['updated_at']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
        echo "</div>";
        
        if ($confirm_mode) {
            echo "<div style='background: #e7f3ff; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;'>";
            echo "<h4>🔧 クリーンアップの実行</h4>";
            echo "<p>上記の " . count($deleteTargets) . " 件のサンプル・テストデータを削除しますか？</p>";
            echo "<div style='margin-top: 1rem;'>";
            echo "<a href='?execute=1' style='background: #dc3545; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 6px; margin-right: 1rem;'>🗑️ 削除を実行</a>";
            echo "<a href='?' style='background: #6c757d; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 6px;'>❌ キャンセル</a>";
            echo "</div>";
            echo "<p style='color: #dc3545; font-size: 0.9rem; margin-top: 1rem;'><strong>注意:</strong> この操作は元に戻せません。</p>";
            echo "</div>";
        } else {
            // 実際の削除処理
            echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
            echo "<h4>🗑️ 削除処理実行中...</h4>";
            
            $deleteStmt = $pdo->prepare("
                DELETE FROM mystical_japan_treasures_inventory 
                WHERE (
                    title LIKE '%ヴィンテージ腕時計%' OR
                    title LIKE '%スクレイピング商品%' OR
                    title LIKE '%SEIKO 自動巻き%' OR
                    title LIKE '%サンプル%' OR
                    title LIKE '%テスト%' OR
                    item_id LIKE 'SCRAPED_%'
                )
            ");
            
            $deletedCount = $deleteStmt->execute() ? $deleteStmt->rowCount() : 0;
            
            echo "<p>✅ <strong>{$deletedCount}件のサンプル・テストデータを削除しました</strong></p>";
            echo "</div>";
            
            // 削除後の確認
            echo "<h3>✅ クリーンアップ後の状況</h3>";
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM mystical_japan_treasures_inventory");
            $newTotal = $stmt->fetchColumn();
            
            $stmt = $pdo->query("
                SELECT COUNT(*) as real_yahoo 
                FROM mystical_japan_treasures_inventory 
                WHERE source_url LIKE '%auctions.yahoo.co.jp%'
                AND title NOT LIKE '%サンプル%'
                AND title NOT LIKE '%テスト%'
            ");
            $realYahooCount = $stmt->fetchColumn();
            
            echo "<div style='background: #d4edda; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
            echo "<h4>📊 クリーンアップ結果</h4>";
            echo "<ul>";
            echo "<li><strong>残存データ総数:</strong> {$newTotal}件</li>";
            echo "<li><strong>実Yahooデータ:</strong> {$realYahooCount}件</li>";
            echo "<li><strong>削除されたデータ:</strong> {$deletedCount}件</li>";
            echo "</ul>";
            echo "</div>";
            
            if ($realYahooCount == 0) {
                echo "<div style='background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
                echo "<h4>⚠️ 実データが不足しています</h4>";
                echo "<p>実際のYahooオークションからスクレイピングしたデータがありません。</p>";
                echo "<p><strong>次のステップ:</strong></p>";
                echo "<ol>";
                echo "<li>Yahoo Auction Tool の「データ取得」タブにアクセス</li>";
                echo "<li>実際のYahooオークションURLを入力</li>";
                echo "<li>スクレイピングを実行</li>";
                echo "</ol>";
                echo "</div>";
            }
            
            echo "<div style='background: #e7f3ff; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
            echo "<h4>🔄 次の手順</h4>";
            echo "<p>1. <a href='yahoo_auction_content.php' target='_blank'>Yahoo Auction Tool</a> を開く</p>";
            echo "<p>2. 「データ編集」タブでデータを確認</p>";
            echo "<p>3. 実際のYahooオークションURLでスクレイピングを実行</p>";
            echo "</div>";
        }
        
    } else {
        echo "<div style='background: #d4edda; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>✅ サンプル・テストデータは見つかりませんでした</h4>";
        echo "<p>データベースはクリーンな状態です。</p>";
        echo "</div>";
    }
    
    // 残存する実データの確認
    echo "<h3>📊 実データの状況</h3>";
    $stmt = $pdo->query("
        SELECT item_id, title, current_price, source_url, updated_at
        FROM mystical_japan_treasures_inventory 
        WHERE source_url LIKE '%auctions.yahoo.co.jp%'
        AND title NOT LIKE '%サンプル%'
        AND title NOT LIKE '%テスト%'
        AND title NOT LIKE '%スクレイピング商品%'
        ORDER BY updated_at DESC
        LIMIT 10
    ");
    $realData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($realData) > 0) {
        echo "<div style='background: #d4edda; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>✅ 実際のYahooオークションデータ: " . count($realData) . "件</h4>";
        echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.9rem;'>";
        echo "<tr><th>SKU</th><th>タイトル</th><th>価格</th><th>YahooURL</th><th>更新日時</th></tr>";
        foreach ($realData as $real) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($real['item_id']) . "</td>";
            echo "<td>" . htmlspecialchars(mb_substr($real['title'], 0, 40)) . "</td>";
            echo "<td>¥" . number_format($real['current_price']) . "</td>";
            echo "<td>✅</td>";
            echo "<td>" . htmlspecialchars($real['updated_at']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
        echo "</div>";
    } else {
        echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>❌ 実際のYahooオークションデータがありません</h4>";
        echo "<p>実際のスクレイピングを実行する必要があります。</p>";
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
table { font-size: 0.9rem; }
th { background: #f8f9fa; padding: 8px; }
td { padding: 6px; }
a { display: inline-block; }
</style>
