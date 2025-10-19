<?php
/**
 * PostgreSQLデータベースのスクレイピングデータ確認スクリプト
 * 実際のスクレイピングデータがあるか確認
 */

require_once __DIR__ . '/database_query_handler.php';

echo "<h2>📊 PostgreSQL スクレイピングデータ確認</h2>";

try {
    // ダッシュボード統計を取得
    $stats = getDashboardStats();
    
    echo "<h3>📈 統計情報</h3>";
    echo "<ul>";
    echo "<li><strong>総データ数:</strong> " . ($stats['total_records'] ?? 0) . "件</li>";
    echo "<li><strong>スクレイピングデータ:</strong> " . ($stats['scraped_count'] ?? 0) . "件</li>";
    echo "<li><strong>Yahoo確認済み:</strong> " . ($stats['confirmed_scraped'] ?? 0) . "件</li>";
    echo "<li><strong>URL付きデータ:</strong> " . ($stats['with_scraped_timestamp'] ?? 0) . "件</li>";
    echo "</ul>";
    
    // 実際のスクレイピングデータをチェック
    $pdo = getDatabaseConnection();
    if ($pdo) {
        echo "<h3>🔍 詳細チェック</h3>";
        
        // source_urlがあるデータ
        $stmt = $pdo->query("
            SELECT COUNT(*) as count, 
                   COUNT(CASE WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 1 END) as yahoo_count,
                   COUNT(CASE WHEN scraped_at IS NOT NULL THEN 1 END) as with_scraped_at
            FROM mystical_japan_treasures_inventory 
            WHERE source_url IS NOT NULL AND source_url != '' AND source_url LIKE '%http%'
        ");
        $urlData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo "<ul>";
        echo "<li><strong>URL付きデータ:</strong> " . $urlData['count'] . "件</li>";
        echo "<li><strong>Yahoo URL:</strong> " . $urlData['yahoo_count'] . "件</li>";
        echo "<li><strong>scraped_atタイムスタンプ付き:</strong> " . $urlData['with_scraped_at'] . "件</li>";
        echo "</ul>";
        
        if ($urlData['count'] > 0) {
            echo "<h3>📋 URL付きデータサンプル</h3>";
            $stmt = $pdo->query("
                SELECT item_id, title, source_url, scraped_at, updated_at
                FROM mystical_japan_treasures_inventory 
                WHERE source_url IS NOT NULL AND source_url != '' AND source_url LIKE '%http%'
                ORDER BY updated_at DESC
                LIMIT 5
            ");
            $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
            echo "<tr><th>ID</th><th>タイトル</th><th>URL</th><th>スクレイピング日時</th><th>更新日時</th></tr>";
            foreach ($samples as $sample) {
                echo "<tr>";
                echo "<td>" . htmlspecialchars($sample['item_id']) . "</td>";
                echo "<td>" . htmlspecialchars(mb_substr($sample['title'], 0, 30)) . "...</td>";
                echo "<td>" . htmlspecialchars(mb_substr($sample['source_url'], 0, 50)) . "...</td>";
                echo "<td>" . htmlspecialchars($sample['scraped_at'] ?? 'なし') . "</td>";
                echo "<td>" . htmlspecialchars($sample['updated_at']) . "</td>";
                echo "</tr>";
            }
            echo "</table>";
        } else {
            echo "<div style='background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 1rem; margin: 1rem 0;'>";
            echo "<h4>⚠️ スクレイピングデータが見つかりません</h4>";
            echo "<p>現在、データベースに実際のスクレイピングデータ（URL付き）は0件です。</p>";
            echo "<p><strong>対処方法:</strong></p>";
            echo "<ol>";
            echo "<li>「データ取得」タブでYahooオークションURLを入力してスクレイピングを実行</li>";
            echo "<li>または、real_yahoo_scraping.phpを使用して直接スクレイピングを実行</li>";
            echo "</ol>";
            echo "</div>";
        }
        
        // 最近のデータもチェック
        echo "<h3>📅 最新データ（全体）</h3>";
        $stmt = $pdo->query("
            SELECT item_id, title, current_price, updated_at, 
                   CASE WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 'URL有り' ELSE 'URL無し' END as url_status
            FROM mystical_japan_treasures_inventory 
            ORDER BY updated_at DESC
            LIMIT 10
        ");
        $recentData = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
        echo "<tr><th>ID</th><th>タイトル</th><th>価格</th><th>URL状態</th><th>更新日時</th></tr>";
        foreach ($recentData as $recent) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($recent['item_id']) . "</td>";
            echo "<td>" . htmlspecialchars(mb_substr($recent['title'], 0, 40)) . "...</td>";
            echo "<td>¥" . number_format($recent['current_price']) . "</td>";
            echo "<td>" . $recent['url_status'] . "</td>";
            echo "<td>" . htmlspecialchars($recent['updated_at']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
        
    } else {
        echo "<p style='color: red;'>❌ データベース接続に失敗しました</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ エラーが発生しました: " . htmlspecialchars($e->getMessage()) . "</p>";
}

echo "<hr>";
echo "<p><strong>結論:</strong></p>";
echo "<ul>";
echo "<li>スクレイピングデータが0件の場合は、Yahoo Auction Tool のAPIサーバー機能を無効化し、PostgreSQL直接アクセス版で動作します</li>";
echo "<li>実際のスクレイピングデータのみが表示されるようになり、サンプルデータは表示されません</li>";
echo "<li>「データ取得」タブでYahooオークションをスクレイピングすると、実際のデータが表示されます</li>";
echo "</ul>";
?>
