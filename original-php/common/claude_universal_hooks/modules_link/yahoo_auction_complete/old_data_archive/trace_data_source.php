<?php
/**
 * Yahoo Auction Tool の実際のデータ取得先をリアルタイムトレース
 * 表示されている問題データの正確な出所を特定
 */

require_once __DIR__ . '/database_query_handler.php';

echo "<h2>🕵️ Yahoo Auction Tool データ取得先リアルタイムトレース</h2>";

try {
    $pdo = getDatabaseConnection();
    if (!$pdo) {
        throw new Exception("PostgreSQL接続失敗");
    }

    echo "<h3>1️⃣ 表示されている問題データを全テーブルから検索</h3>";
    
    // 表示されている具体的な問題データ
    $problem_titles = [
        'ヴィンテージ腕時計 SEIKO 自動巻き',
        'スクレイピング商品1'
    ];
    
    $problem_skus = [
        'SCRAPED_1757671701_0',
        'SCRAPED_1757671266_0', 
        'SCRAPED_1757591377_0',
        'SCRAPED_1757591233_0'
    ];

    // 全テーブル一覧取得
    $tables_stmt = $pdo->query("
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    ");
    $all_tables = $tables_stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $found_tables = [];
    
    foreach ($all_tables as $table) {
        try {
            // タイトル系カラムを検索
            $title_columns_stmt = $pdo->query("
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '{$table}' 
                AND column_name IN ('title', 'active_title', 'product_name', 'name')
            ");
            $title_columns = $title_columns_stmt->fetchAll(PDO::FETCH_COLUMN);
            
            // SKU系カラムを検索
            $sku_columns_stmt = $pdo->query("
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '{$table}' 
                AND column_name IN ('sku', 'item_id', 'master_sku', 'source_item_id', 'ebay_item_id')
            ");
            $sku_columns = $sku_columns_stmt->fetchAll(PDO::FETCH_COLUMN);
            
            // 問題データ検索
            $found_data = [];
            
            // タイトルで検索
            foreach ($title_columns as $title_col) {
                foreach ($problem_titles as $problem_title) {
                    $search_query = "SELECT COUNT(*) FROM \"{$table}\" WHERE \"{$title_col}\" LIKE '%{$problem_title}%'";
                    $search_stmt = $pdo->query($search_query);
                    $count = $search_stmt->fetchColumn();
                    
                    if ($count > 0) {
                        $found_data[] = [
                            'type' => 'title',
                            'column' => $title_col,
                            'search' => $problem_title,
                            'count' => $count
                        ];
                    }
                }
            }
            
            // SKUで検索
            foreach ($sku_columns as $sku_col) {
                foreach ($problem_skus as $problem_sku) {
                    $search_query = "SELECT COUNT(*) FROM \"{$table}\" WHERE \"{$sku_col}\" LIKE '%{$problem_sku}%'";
                    $search_stmt = $pdo->query($search_query);
                    $count = $search_stmt->fetchColumn();
                    
                    if ($count > 0) {
                        $found_data[] = [
                            'type' => 'sku',
                            'column' => $sku_col,
                            'search' => $problem_sku,
                            'count' => $count
                        ];
                    }
                }
            }
            
            if (count($found_data) > 0) {
                $found_tables[$table] = $found_data;
            }
            
        } catch (Exception $e) {
            // テーブルアクセスエラーはスキップ
            continue;
        }
    }
    
    if (count($found_tables) > 0) {
        echo "<div style='background: #f8d7da; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<h4>❌ 問題データが見つかったテーブル</h4>";
        
        foreach ($found_tables as $table => $findings) {
            echo "<div style='background: white; padding: 1rem; margin: 1rem 0; border: 2px solid #dc3545; border-radius: 8px;'>";
            echo "<h5>🎯 <strong>{$table}</strong></h5>";
            
            foreach ($findings as $finding) {
                echo "<p>📍 <strong>{$finding['column']}</strong> カラムで「{$finding['search']}」を{$finding['count']}件発見</p>";
            }
            
            // 実際のデータを取得して表示
            try {
                $first_finding = $findings[0];
                $column = $first_finding['column'];
                $search = $first_finding['search'];
                
                $sample_query = "
                    SELECT * FROM \"{$table}\" 
                    WHERE \"{$column}\" LIKE '%{$search}%' 
                    LIMIT 3
                ";
                
                $sample_stmt = $pdo->query($sample_query);
                $samples = $sample_stmt->fetchAll(PDO::FETCH_ASSOC);
                
                if (count($samples) > 0) {
                    echo "<h6>📋 実際のデータ:</h6>";
                    echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.8rem;'>";
                    
                    // ヘッダー
                    echo "<tr>";
                    foreach (array_keys($samples[0]) as $key) {
                        echo "<th>" . htmlspecialchars($key) . "</th>";
                    }
                    echo "</tr>";
                    
                    // データ
                    foreach ($samples as $sample) {
                        echo "<tr>";
                        foreach ($sample as $value) {
                            echo "<td>" . htmlspecialchars(mb_substr($value, 0, 20)) . "</td>";
                        }
                        echo "</tr>";
                    }
                    echo "</table>";
                }
            } catch (Exception $e) {
                echo "<p>サンプルデータ取得エラー: " . htmlspecialchars($e->getMessage()) . "</p>";
            }
            
            echo "</div>";
        }
        echo "</div>";
    } else {
        echo "<div style='background: #d4edda; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
        echo "<p>✅ 問題データは全テーブルから見つかりませんでした</p>";
        echo "</div>";
    }
    
    echo "<h3>2️⃣ database_query_handler.php の実際の関数実行</h3>";
    
    // 実際にgetApprovalQueueData関数を実行
    echo "<div style='background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
    echo "<h4>🔧 getApprovalQueueData() 関数の実行</h4>";
    
    $approval_data = getApprovalQueueData([]);
    $approval_count = count($approval_data);
    
    echo "<p><strong>取得データ数:</strong> {$approval_count}件</p>";
    
    if ($approval_count > 0) {
        // 問題データの検出
        $found_problems = [];
        foreach ($approval_data as $item) {
            $title = $item['title'] ?? '';
            $sku = $item['master_sku'] ?? $item['item_id'] ?? '';
            
            if (strpos($title, 'ヴィンテージ腕時計') !== false || 
                strpos($title, 'スクレイピング商品') !== false ||
                strpos($sku, 'SCRAPED_') !== false) {
                $found_problems[] = $item;
            }
        }
        
        if (count($found_problems) > 0) {
            echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 6px; margin: 1rem 0;'>";
            echo "<h5>❌ getApprovalQueueData()で問題データを発見: " . count($found_problems) . "件</h5>";
            
            echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.8rem;'>";
            echo "<tr><th>master_sku</th><th>item_id</th><th>title</th><th>current_price</th><th>source_system</th></tr>";
            
            foreach (array_slice($found_problems, 0, 5) as $problem) {
                echo "<tr style='background: #f8d7da;'>";
                echo "<td>" . htmlspecialchars($problem['master_sku'] ?? '') . "</td>";
                echo "<td>" . htmlspecialchars($problem['item_id'] ?? '') . "</td>";
                echo "<td>" . htmlspecialchars($problem['title'] ?? '') . "</td>";
                echo "<td>" . htmlspecialchars($problem['current_price'] ?? '') . "</td>";
                echo "<td>" . htmlspecialchars($problem['source_system'] ?? '') . "</td>";
                echo "</tr>";
            }
            echo "</table>";
            echo "</div>";
            
            echo "<p><strong>⚠️ これがYahoo Auction Toolで表示されている問題データです！</strong></p>";
        } else {
            echo "<p>✅ getApprovalQueueData()では問題データは見つかりませんでした</p>";
        }
    }
    echo "</div>";
    
    echo "<h3>3️⃣ 実際のSQLクエリの詳細確認</h3>";
    
    // database_query_handler.phpの実際のSQLクエリを確認
    echo "<div style='background: #e7f3ff; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
    echo "<h4>🔍 実行されている実際のSQLクエリ</h4>";
    
    $sql = "
        SELECT 
            item_id,
            title,
            current_price,
            condition_name,
            category_name,
            picture_url,
            gallery_url,
            watch_count,
            updated_at,
            listing_status,
            source_url,
            scraped_at,
            CASE 
                WHEN source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%' THEN 'yahoo_scraped_confirmed'
                WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 'scraped_data'
                WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' AND current_price > 0 THEN 'recent_data'
                ELSE 'existing_data'
            END as source_system,
            item_id as master_sku
        FROM mystical_japan_treasures_inventory 
        WHERE title IS NOT NULL 
        AND current_price > 0
        ORDER BY scraped_at DESC NULLS LAST, updated_at DESC, current_price DESC
        LIMIT 50
    ";
    
    echo "<pre style='background: #f8f9fa; padding: 1rem; border-radius: 4px; font-size: 0.8rem;'>";
    echo htmlspecialchars($sql);
    echo "</pre>";
    
    // 実際にクエリを実行
    $direct_stmt = $pdo->query($sql);
    $direct_results = $direct_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p><strong>直接SQL実行結果:</strong> " . count($direct_results) . "件</p>";
    
    $direct_problems = array_filter($direct_results, function($item) {
        return strpos($item['title'], 'ヴィンテージ腕時計') !== false || 
               strpos($item['title'], 'スクレイピング商品') !== false ||
               strpos($item['item_id'], 'SCRAPED_') !== false;
    });
    
    if (count($direct_problems) > 0) {
        echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 6px;'>";
        echo "<h5>❌ mystical_japan_treasures_inventory テーブルに問題データが存在</h5>";
        echo "<p>これが表示されている問題データの出所です！</p>";
        
        echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.8rem;'>";
        echo "<tr><th>item_id</th><th>title</th><th>current_price</th><th>updated_at</th></tr>";
        
        foreach (array_slice($direct_problems, 0, 5) as $problem) {
            echo "<tr style='background: #f8d7da;'>";
            echo "<td>" . htmlspecialchars($problem['item_id']) . "</td>";
            echo "<td>" . htmlspecialchars($problem['title']) . "</td>";
            echo "<td>¥" . number_format($problem['current_price']) . "</td>";
            echo "<td>" . htmlspecialchars($problem['updated_at']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
        echo "</div>";
    }
    echo "</div>";
    
    echo "<h3>🎯 結論と次のアクション</h3>";
    echo "<div style='background: #dc3545; color: white; padding: 2rem; border-radius: 12px; margin: 2rem 0;'>";
    echo "<h4>📋 問題の正確な原因</h4>";
    
    if (count($found_tables) > 0) {
        echo "<p>✅ <strong>問題データの出所が特定されました:</strong></p>";
        echo "<ul>";
        foreach (array_keys($found_tables) as $table) {
            echo "<li><strong>{$table}</strong> テーブル</li>";
        }
        echo "</ul>";
        echo "<p><strong>これらのテーブルから問題データを削除する必要があります。</strong></p>";
    } elseif (count($direct_problems) > 0) {
        echo "<p>✅ <strong>mystical_japan_treasures_inventory テーブルに問題データが残存</strong></p>";
        echo "<p>選択的削除が完全に実行されていない可能性があります。</p>";
    } else {
        echo "<p>⚠️ <strong>問題データの出所を特定できませんでした</strong></p>";
        echo "<p>別のデータソース（ファイル、外部API、キャッシュ）から取得されている可能性があります。</p>";
    }
    
    echo "<div style='margin-top: 2rem; text-align: center;'>";
    if (count($found_tables) > 0) {
        echo "<a href='delete_from_specific_tables.php' style='background: white; color: #dc3545; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold;'>🗑️ 特定テーブルから削除</a>";
    }
    echo "<a href='force_cleanup_mystical_table.php' style='background: white; color: #dc3545; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold; margin-left: 1rem;'>🔧 メインテーブル強制クリーンアップ</a>";
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
th { background: rgba(0,0,0,0.1); padding: 6px; }
td { padding: 4px; }
pre { font-size: 0.75rem; }
</style>
