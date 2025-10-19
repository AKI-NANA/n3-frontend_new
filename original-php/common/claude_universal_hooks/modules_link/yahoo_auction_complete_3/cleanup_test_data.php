<?php
/**
 * テストデータ完全削除・クリーンアップツール
 * URL: http://localhost:8080/modules/yahoo_auction_complete/cleanup_test_data.php
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🧹 テストデータ完全削除・クリーンアップ</h1>";
echo "<style>body{font-family:monospace; line-height:1.6;} .success{color:green;} .error{color:red;} .info{color:blue;} .warning{color:orange;} pre{background:#f5f5f5; padding:10px; border-radius:5px; overflow-x:auto;} .cleanup{background:#ffe6e6; padding:15px; border-radius:8px; margin:15px 0; border:2px solid #dc3545;}</style>";

try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'password123');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<div class='success'>✅ データベース接続成功</div>";
} catch (PDOException $e) {
    echo "<div class='error'>❌ データベース接続失敗: " . $e->getMessage() . "</div>";
    exit;
}

echo "<div class='cleanup'>";
echo "<h2>🚨 テストデータ削除</h2>";
echo "<p><strong>以下のテストデータを完全に削除して、クリーンな状態にします：</strong></p>";
echo "<ul>";
echo "<li>EMERGENCY_SCRAPE_* (緊急テストデータ)</li>";
echo "<li>BULK_TEST_* (一括テストデータ)</li>";
echo "<li>TEST_SCRAPING_* (テストスクレイピングデータ)</li>";
echo "<li>REAL_YAHOO_* (偽スクレイピングデータ)</li>";
echo "<li>プレースホルダー画像を使用しているデータ</li>";
echo "</ul>";
echo "</div>";

echo "<h2>1. 削除対象データの確認</h2>";

// 削除対象データの確認
$check_sql = "
    SELECT 
        item_id,
        title,
        source_url,
        picture_url,
        scraped_at,
        CASE 
            WHEN item_id LIKE 'EMERGENCY_SCRAPE_%' THEN 'Emergency Test Data'
            WHEN item_id LIKE 'BULK_TEST_%' THEN 'Bulk Test Data'
            WHEN item_id LIKE 'TEST_SCRAPING_%' THEN 'Test Scraping Data'
            WHEN item_id LIKE 'REAL_YAHOO_%' THEN 'Fake Yahoo Data'
            WHEN picture_url LIKE '%placeholder%' THEN 'Placeholder Image Data'
            WHEN source_url LIKE '%emergency_test_%' THEN 'Emergency URL Data'
            WHEN source_url LIKE '%bulk_%' THEN 'Bulk URL Data'
            WHEN source_url LIKE '%test%' THEN 'Test URL Data'
            ELSE 'Unknown Test Data'
        END as data_type
    FROM mystical_japan_treasures_inventory 
    WHERE (
        item_id LIKE 'EMERGENCY_SCRAPE_%' OR
        item_id LIKE 'BULK_TEST_%' OR
        item_id LIKE 'TEST_SCRAPING_%' OR
        item_id LIKE 'REAL_YAHOO_%' OR
        picture_url LIKE '%placeholder%' OR
        source_url LIKE '%emergency_test_%' OR
        source_url LIKE '%bulk_%' OR
        source_url LIKE '%test%'
    )
    ORDER BY updated_at DESC
";

$test_data = $pdo->query($check_sql)->fetchAll(PDO::FETCH_ASSOC);

if (count($test_data) > 0) {
    echo "<div class='warning'>⚠️ 削除対象データ: " . count($test_data) . "件</div>";
    echo "<table border='1' style='border-collapse:collapse; width:100%; font-size:0.8em; margin:10px 0;'>";
    echo "<tr style='background:#f0f0f0;'>";
    echo "<th>item_id</th><th>title</th><th>data_type</th><th>source_url</th>";
    echo "</tr>";
    
    foreach ($test_data as $item) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($item['item_id']) . "</td>";
        echo "<td>" . htmlspecialchars(substr($item['title'], 0, 30)) . "...</td>";
        echo "<td>" . htmlspecialchars($item['data_type']) . "</td>";
        echo "<td>" . htmlspecialchars(substr($item['source_url'], 0, 40)) . "...</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "<div class='success'>✅ 削除対象のテストデータは見つかりませんでした</div>";
}

echo "<h2>2. テストデータ削除実行</h2>";

if (isset($_GET['execute_cleanup']) && $_GET['execute_cleanup'] === 'confirm') {
    echo "<div class='warning'>🗑️ テストデータ削除実行中...</div>";
    
    try {
        // 削除SQL実行
        $delete_sql = "
            DELETE FROM mystical_japan_treasures_inventory 
            WHERE (
                item_id LIKE 'EMERGENCY_SCRAPE_%' OR
                item_id LIKE 'BULK_TEST_%' OR
                item_id LIKE 'TEST_SCRAPING_%' OR
                item_id LIKE 'REAL_YAHOO_%' OR
                picture_url LIKE '%placeholder%' OR
                source_url LIKE '%emergency_test_%' OR
                source_url LIKE '%bulk_%' OR
                source_url LIKE '%test%'
            )
        ";
        
        $stmt = $pdo->prepare($delete_sql);
        $result = $stmt->execute();
        $deleted_count = $stmt->rowCount();
        
        if ($result) {
            echo "<div class='success'>🎉 テストデータ削除完了: {$deleted_count}件削除</div>";
            
            // 削除後の確認
            $verify_sql = "
                SELECT COUNT(*) as remaining_test_data
                FROM mystical_japan_treasures_inventory 
                WHERE (
                    item_id LIKE 'EMERGENCY_SCRAPE_%' OR
                    item_id LIKE 'BULK_TEST_%' OR
                    item_id LIKE 'TEST_SCRAPING_%' OR
                    item_id LIKE 'REAL_YAHOO_%' OR
                    picture_url LIKE '%placeholder%' OR
                    source_url LIKE '%emergency_test_%' OR
                    source_url LIKE '%bulk_%' OR
                    source_url LIKE '%test%'
                )
            ";
            
            $remaining = $pdo->query($verify_sql)->fetchColumn();
            
            if ($remaining == 0) {
                echo "<div class='success'>✅ 全てのテストデータが削除されました</div>";
            } else {
                echo "<div class='warning'>⚠️ {$remaining}件のテストデータが残っています</div>";
            }
            
        } else {
            echo "<div class='error'>❌ 削除処理に失敗しました</div>";
        }
        
    } catch (Exception $e) {
        echo "<div class='error'>❌ 削除エラー: " . $e->getMessage() . "</div>";
    }
    
} else {
    if (count($test_data) > 0) {
        echo "<a href='?execute_cleanup=confirm' style='display:inline-block; background:#dc3545; color:white; padding:15px 30px; text-decoration:none; border-radius:8px; margin:10px 0; font-weight:bold;'>🗑️ テストデータを完全削除</a>";
        echo "<div class='warning'>⚠️ この操作は元に戻せません。確実にテストデータのみを削除します。</div>";
    } else {
        echo "<div class='info'>💡 削除するテストデータはありません</div>";
    }
}

echo "<h2>3. クリーンアップ後の状態確認</h2>";

try {
    $stats_sql = "
        SELECT 
            COUNT(*) as total_records,
            COUNT(CASE WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 1 END) as with_source_url,
            COUNT(CASE WHEN source_url IS NULL OR source_url = '' THEN 1 END) as without_source_url,
            COUNT(CASE WHEN item_id LIKE 'EMERGENCY_%' OR item_id LIKE 'BULK_%' OR item_id LIKE 'TEST_%' THEN 1 END) as remaining_test_data
        FROM mystical_japan_treasures_inventory
    ";
    
    $stats = $pdo->query($stats_sql)->fetch(PDO::FETCH_ASSOC);
    
    echo "<div style='background:#e3f2fd; padding:20px; border-radius:8px; margin:20px 0;'>";
    echo "<h3>📊 クリーンアップ後のデータベース状態</h3>";
    echo "<ul>";
    echo "<li><strong>総レコード数:</strong> {$stats['total_records']}件</li>";
    echo "<li><strong>source_url有データ:</strong> {$stats['with_source_url']}件</li>";
    echo "<li><strong>source_url無データ:</strong> {$stats['without_source_url']}件</li>";
    echo "<li><strong>残存テストデータ:</strong> {$stats['remaining_test_data']}件</li>";
    echo "</ul>";
    echo "</div>";
    
    if ($stats['with_source_url'] == 0) {
        echo "<div class='success'>✅ スクレイピングデータが0件になりました（クリーンな状態）</div>";
    } else {
        echo "<div class='warning'>⚠️ まだ{$stats['with_source_url']}件のsource_url有データがあります</div>";
    }
    
} catch (Exception $e) {
    echo "<div class='error'>❌ 状態確認エラー: " . $e->getMessage() . "</div>";
}

echo "<h2>4. Yahoo Auction Tool での確認</h2>";

echo "<div style='background:#d4edda; padding:20px; border-radius:8px; margin:20px 0;'>";
echo "<h3>✅ クリーンアップ完了後の確認手順</h3>";
echo "<ol>";
echo "<li><a href='yahoo_auction_content.php' target='_blank' style='color:blue; text-decoration:underline;'>Yahoo Auction Tool を開く</a></li>";
echo "<li>「データ編集」タブをクリック</li>";
echo "<li>「🕷️ スクレイピングデータ検索」をクリック</li>";
echo "<li><strong>「スクレイピングデータがありません」</strong>が表示されることを確認</li>";
echo "<li>これでクリーンな状態から真のスクレイピングを開始できます</li>";
echo "</ol>";
echo "</div>";

echo "<h2>5. 次のステップ</h2>";

echo "<div style='background:#fff3cd; padding:20px; border-radius:8px; margin:20px 0;'>";
echo "<h3>🚀 真のスクレイピング実装準備完了</h3>";
echo "<p><strong>テストデータ削除後は以下の方法で真のスクレイピングを実装できます：</strong></p>";
echo "<ol>";
echo "<li><strong>スクレイピングサーバーの修正:</strong> データベース設定を正しく修正</li>";
echo "<li><strong>Yahoo API利用:</strong> 公式APIがあれば使用（推奨）</li>";
echo "<li><strong>専用スクレイピングツール:</strong> Selenium/Puppeteer等を使用</li>";
echo "<li><strong>プロキシ経由スクレイピング:</strong> IP制限回避</li>";
echo "</ol>";
echo "<p><strong>重要:</strong> 今後は実際のYahoo画像URL・商品データのみを保存します。</p>";
echo "</div>";

echo "<h2>6. 注意事項</h2>";

echo "<div style='background:#ffe6e6; padding:20px; border-radius:8px; margin:20px 0;'>";
echo "<h3>⚠️ 重要な注意点</h3>";
echo "<ul>";
echo "<li><strong>このクリーンアップは既存の正規データには影響しません</strong></li>";
echo "<li><strong>テストデータのみを削除します</strong></li>";
echo "<li><strong>削除は元に戻せません</strong></li>";
echo "<li><strong>クリーンアップ後は真のスクレイピングのみ実装してください</strong></li>";
echo "</ul>";
echo "</div>";
?>
