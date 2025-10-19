<?php
/**
 * データベース詳細調査：重複・サンプルデータ問題の原因特定
 */

require_once __DIR__ . '/database_query_handler.php';

echo "<h2>🔍 データベース詳細調査</h2>";

try {
    $pdo = getDatabaseConnection();
    if (!$pdo) {
        throw new Exception("データベース接続失敗");
    }

    echo "<h3>📊 データベース全体状況</h3>";
    
    // 1. 総データ数とテーブル構造確認
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM mystical_japan_treasures_inventory");
    $total = $stmt->fetchColumn();
    echo "<p><strong>総データ数:</strong> {$total}件</p>";
    
    // 2. 重複SKU確認
    echo "<h3>🔄 重複SKU問題調査</h3>";
    $stmt = $pdo->query("
        SELECT item_id, COUNT(*) as count 
        FROM mystical_japan_treasures_inventory 
        WHERE item_id LIKE 'SCRAPED_%'
        GROUP BY item_id 
        HAVING COUNT(*) > 1 
        ORDER BY count DESC 
        LIMIT 10
    ");
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($duplicates) > 0) {
        echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>❌ 重複SKU発見</h4>";
        echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
        echo "<tr><th>SKU</th><th>重複数</th></tr>";
        foreach ($duplicates as $dup) {
            echo "<tr><td>{$dup['item_id']}</td><td>{$dup['count']}件</td></tr>";
        }
        echo "</table>";
        echo "</div>";
    } else {
        echo "<p>✅ SKU重複は検出されませんでした</p>";
    }
    
    // 3. サンプルデータ検出
    echo "<h3>🎭 サンプル・テストデータ検出</h3>";
    $stmt = $pdo->query("
        SELECT item_id, title, current_price, updated_at, source_url
        FROM mystical_japan_treasures_inventory 
        WHERE (
            title LIKE '%ヴィンテージ腕時計%' OR
            title LIKE '%スクレイピング商品%' OR
            title LIKE '%サンプル%' OR
            title LIKE '%テスト%' OR
            title LIKE '%SEIKO%' OR
            item_id LIKE 'SCRAPED_%' OR
            source_url = ''
        )
        ORDER BY updated_at DESC
        LIMIT 20
    ");
    $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($samples) > 0) {
        echo "<div style='background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>⚠️ サンプル・テストデータ発見: " . count($samples) . "件</h4>";
        echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.9rem;'>";
        echo "<tr><th>SKU</th><th>タイトル</th><th>価格</th><th>URL</th><th>更新日時</th></tr>";
        foreach ($samples as $sample) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($sample['item_id']) . "</td>";
            echo "<td>" . htmlspecialchars(mb_substr($sample['title'], 0, 30)) . "</td>";
            echo "<td>¥" . number_format($sample['current_price']) . "</td>";
            echo "<td>" . (empty($sample['source_url']) ? '❌空' : '✅有り') . "</td>";
            echo "<td>" . htmlspecialchars($sample['updated_at']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
        echo "</div>";
    }
    
    // 4. 実際のYahooオークションデータ検索
    echo "<h3>🎯 実際のYahooオークションデータ検索</h3>";
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
    $realYahoo = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($realYahoo) > 0) {
        echo "<div style='background: #d4edda; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>✅ 実際のYahooオークションデータ: " . count($realYahoo) . "件</h4>";
        echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.9rem;'>";
        echo "<tr><th>SKU</th><th>タイトル</th><th>価格</th><th>YahooURL</th><th>更新日時</th></tr>";
        foreach ($realYahoo as $real) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($real['item_id']) . "</td>";
            echo "<td>" . htmlspecialchars(mb_substr($real['title'], 0, 40)) . "</td>";
            echo "<td>¥" . number_format($real['current_price']) . "</td>";
            echo "<td>" . htmlspecialchars(mb_substr($real['source_url'], 0, 30)) . "...</td>";
            echo "<td>" . htmlspecialchars($real['updated_at']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
        echo "</div>";
    } else {
        echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>❌ 実際のYahooオークションデータが見つかりません</h4>";
        echo "<p>データベースには実際のYahooオークションからスクレイピングしたデータがありません。</p>";
        echo "</div>";
    }
    
    // 5. 日付分析
    echo "<h3>📅 データ日付分析</h3>";
    $stmt = $pdo->query("
        SELECT 
            DATE(updated_at) as date,
            COUNT(*) as count,
            COUNT(CASE WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 1 END) as yahoo_count,
            COUNT(CASE WHEN title LIKE '%サンプル%' OR title LIKE '%スクレイピング商品%' THEN 1 END) as sample_count
        FROM mystical_japan_treasures_inventory 
        GROUP BY DATE(updated_at)
        ORDER BY date DESC
        LIMIT 10
    ");
    $dateAnalysis = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr><th>日付</th><th>総数</th><th>Yahoo実データ</th><th>サンプルデータ</th></tr>";
    foreach ($dateAnalysis as $date) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($date['date']) . "</td>";
        echo "<td>" . $date['count'] . "件</td>";
        echo "<td>" . $date['yahoo_count'] . "件</td>";
        echo "<td>" . $date['sample_count'] . "件</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // 6. 推奨アクション
    echo "<h3>🎯 問題と解決策</h3>";
    echo "<div style='background: #e7f3ff; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;'>";
    echo "<h4>📋 問題点</h4>";
    echo "<ul>";
    if (count($duplicates) > 0) {
        echo "<li>❌ <strong>重複SKU:</strong> " . count($duplicates) . "個のSKUが重複</li>";
    }
    if (count($samples) > 0) {
        echo "<li>⚠️ <strong>サンプルデータ:</strong> " . count($samples) . "件の不要なテストデータ</li>";
    }
    if (count($realYahoo) == 0) {
        echo "<li>❌ <strong>実データなし:</strong> 実際のYahooオークションデータが0件</li>";
    }
    echo "</ul>";
    
    echo "<h4>🔧 推奨解決策</h4>";
    echo "<ol>";
    if (count($samples) > 0) {
        echo "<li><strong>サンプルデータ削除:</strong> テスト用データを削除</li>";
    }
    if (count($duplicates) > 0) {
        echo "<li><strong>重複データ削除:</strong> 重複SKUを統合</li>";
    }
    if (count($realYahoo) == 0) {
        echo "<li><strong>実スクレイピング実行:</strong> 実際のYahooオークションURLでスクレイピング</li>";
    }
    echo "<li><strong>データ品質チェック:</strong> 定期的なデータ検証の実装</li>";
    echo "</ol>";
    echo "</div>";
    
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
</style>
