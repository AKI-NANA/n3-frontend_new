<?php
/**
 * 重複一括削除機能付きスクレイピング管理システム
 * URL: http://localhost:8080/modules/yahoo_auction_complete/bulk_duplicate_manager.php
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>重複一括削除管理システム</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; margin: 0; background: #f8fafc; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success { color: #10b981; font-weight: 600; }
        .error { color: #ef4444; font-weight: 600; }
        .info { color: #3b82f6; font-weight: 600; }
        .warning { color: #f59e0b; font-weight: 600; }
        
        .button { 
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer; 
            font-weight: 500; 
            font-size: 14px;
            text-decoration: none;
            transition: all 0.2s;
        }
        .button:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .button-primary { background: #3b82f6; color: white; }
        .button-success { background: #10b981; color: white; }
        .button-danger { background: #ef4444; color: white; }
        .button-warning { background: #f59e0b; color: white; }
        .button-secondary { background: #6b7280; color: white; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 20px; 
            border-radius: 12px; 
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .stat-value { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
        .stat-label { font-size: 14px; opacity: 0.9; }
        
        .data-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .data-table th { 
            background: #f8fafc; 
            padding: 12px 16px; 
            font-weight: 600; 
            font-size: 13px;
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
        }
        .data-table td { 
            padding: 12px 16px; 
            border-bottom: 1px solid #f3f4f6; 
            font-size: 14px;
            vertical-align: middle;
        }
        .data-table tr:hover { background: #f9fafb; }
        
        .thumbnail { 
            width: 60px; 
            height: 45px; 
            object-fit: cover; 
            border-radius: 6px; 
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .duplicate-group {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            margin: 10px 0;
        }
        
        .duplicate-header {
            background: #f59e0b;
            color: white;
            padding: 8px 12px;
            font-weight: 600;
            font-size: 14px;
        }
        
        .bulk-actions {
            background: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            margin: 20px 0;
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .selection-info {
            font-weight: 600;
            color: #374151;
        }
        
        .checkbox {
            width: 18px;
            height: 18px;
            accent-color: #3b82f6;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #10b981);
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🗂️ 重複一括削除管理システム</h1>

<?php
try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'password123');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<div class='success'>✅ データベース接続成功</div>";
} catch (PDOException $e) {
    echo "<div class='error'>❌ データベース接続失敗: " . htmlspecialchars($e->getMessage()) . "</div>";
    exit;
}

// 統計取得
$stats = $pdo->query("
    SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN source_url IS NOT NULL THEN 1 END) as scraped_data,
        COUNT(CASE WHEN item_id LIKE 'ADVANCED_SCRAPING_%' THEN 1 END) as advanced_data
    FROM mystical_japan_treasures_inventory
")->fetch(PDO::FETCH_ASSOC);

echo "<div class='stats-grid'>";
echo "<div class='stat-card'><div class='stat-value'>{$stats['total_records']}</div><div class='stat-label'>総データ数</div></div>";
echo "<div class='stat-card'><div class='stat-value'>{$stats['scraped_data']}</div><div class='stat-label'>スクレイピングデータ</div></div>";
echo "<div class='stat-card'><div class='stat-value'>{$stats['advanced_data']}</div><div class='stat-label'>完全版データ</div></div>";
echo "</div>";

// アクション処理
if (isset($_POST['action'])) {
    $action = $_POST['action'];
    
    switch ($action) {
        case 'bulk_delete':
            handleBulkDelete($_POST['selected_items'] ?? []);
            break;
        case 'detect_duplicates':
            // 重複検出は後で表示
            break;
    }
}

function handleBulkDelete($selected_items) {
    global $pdo;
    
    if (empty($selected_items)) {
        echo "<div class='warning'>⚠️ 削除対象が選択されていません</div>";
        return;
    }
    
    echo "<div class='info'>🗑️ 一括削除実行中...</div>";
    
    $deleted_count = 0;
    $error_count = 0;
    
    try {
        $pdo->beginTransaction();
        
        $delete_sql = "DELETE FROM mystical_japan_treasures_inventory WHERE item_id = ?";
        $stmt = $pdo->prepare($delete_sql);
        
        foreach ($selected_items as $item_id) {
            try {
                $stmt->execute([$item_id]);
                if ($stmt->rowCount() > 0) {
                    $deleted_count++;
                    echo "<div class='success'>✅ 削除成功: " . htmlspecialchars($item_id) . "</div>";
                }
            } catch (Exception $e) {
                $error_count++;
                echo "<div class='error'>❌ 削除失敗: " . htmlspecialchars($item_id) . " - " . htmlspecialchars($e->getMessage()) . "</div>";
            }
        }
        
        $pdo->commit();
        echo "<div class='success'>🎉 一括削除完了: {$deleted_count}件削除, {$error_count}件エラー</div>";
        
    } catch (Exception $e) {
        $pdo->rollBack();
        echo "<div class='error'>❌ 一括削除エラー: " . htmlspecialchars($e->getMessage()) . "</div>";
    }
}

// 重複検出と表示
echo "<h2>🔍 重複データ検出・一括削除</h2>";

$duplicate_sql = "
    WITH duplicate_groups AS (
        SELECT 
            item_id, title, current_price, picture_url, updated_at, source_url,
            CASE 
                WHEN yahoo_auction_id IS NOT NULL THEN yahoo_auction_id
                ELSE title
            END as group_key,
            ROW_NUMBER() OVER (
                PARTITION BY CASE 
                    WHEN yahoo_auction_id IS NOT NULL THEN yahoo_auction_id
                    ELSE title
                END 
                ORDER BY updated_at DESC
            ) as row_num
        FROM mystical_japan_treasures_inventory 
        WHERE source_url IS NOT NULL
    )
    SELECT 
        item_id, title, current_price, picture_url, updated_at, source_url, group_key, row_num
    FROM duplicate_groups 
    WHERE group_key IN (
        SELECT group_key 
        FROM duplicate_groups 
        GROUP BY group_key 
        HAVING COUNT(*) > 1
    )
    ORDER BY group_key, row_num
";

$duplicates = $pdo->query($duplicate_sql)->fetchAll(PDO::FETCH_ASSOC);

if (empty($duplicates)) {
    echo "<div class='success'>✅ 重複データは検出されませんでした</div>";
} else {
    // 重複グループに整理
    $grouped_duplicates = [];
    foreach ($duplicates as $dup) {
        $grouped_duplicates[$dup['group_key']][] = $dup;
    }
    
    echo "<div class='warning'>⚠️ " . count($grouped_duplicates) . "グループの重複データを検出しました（合計" . count($duplicates) . "件）</div>";
    
    echo "<form method='POST' id='bulkDeleteForm'>";
    echo "<input type='hidden' name='action' value='bulk_delete'>";
    
    echo "<div class='bulk-actions'>";
    echo "<div class='selection-info'>選択中: <span id='selectedCount'>0</span>件</div>";
    echo "<button type='button' class='button button-primary' onclick='selectOldDuplicates()'>古いデータを自動選択</button>";
    echo "<button type='button' class='button button-secondary' onclick='selectAll()'>全選択</button>";
    echo "<button type='button' class='button button-secondary' onclick='deselectAll()'>全解除</button>";
    echo "<button type='submit' class='button button-danger' onclick='return confirmBulkDelete()'>選択データを一括削除</button>";
    echo "</div>";
    
    foreach ($grouped_duplicates as $group_key => $group_items) {
        echo "<div class='duplicate-group'>";
        echo "<div class='duplicate-header'>重複グループ: " . htmlspecialchars(substr($group_key, 0, 50)) . "... (" . count($group_items) . "件)</div>";
        
        echo "<table class='data-table'>";
        echo "<tr>";
        echo "<th>選択</th>";
        echo "<th>画像</th>";
        echo "<th>タイトル</th>";
        echo "<th>価格</th>";
        echo "<th>更新日時</th>";
        echo "<th>推奨</th>";
        echo "</tr>";
        
        foreach ($group_items as $index => $item) {
            $is_newest = ($index === 0); // 最新データ
            $recommend_keep = $is_newest ? '保持推奨' : '削除推奨';
            $recommend_class = $is_newest ? 'success' : 'warning';
            
            echo "<tr>";
            echo "<td>";
            if (!$is_newest) {
                echo "<input type='checkbox' name='selected_items[]' value='" . htmlspecialchars($item['item_id']) . "' class='checkbox duplicate-checkbox old-duplicate' onchange='updateSelectedCount()'>";
            } else {
                echo "<span style='color: #10b981; font-weight: 600;'>保持</span>";
            }
            echo "</td>";
            echo "<td>";
            if ($item['picture_url']) {
                echo "<img src='" . htmlspecialchars($item['picture_url']) . "' class='thumbnail' onerror='this.style.display=\"none\"'>";
            } else {
                echo "<div style='width: 60px; height: 45px; background: #f3f4f6; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #6b7280;'>No Image</div>";
            }
            echo "</td>";
            echo "<td>" . htmlspecialchars(substr($item['title'], 0, 60)) . "...</td>";
            echo "<td>$" . htmlspecialchars($item['current_price']) . "</td>";
            echo "<td>" . htmlspecialchars($item['updated_at']) . "</td>";
            echo "<td><span class='{$recommend_class}'>{$recommend_keep}</span></td>";
            echo "</tr>";
        }
        
        echo "</table>";
        echo "</div>";
    }
    
    echo "</form>";
}

// 重複のない一般データ表示
echo "<h2>📊 重複のないデータ一覧</h2>";

$normal_data = $pdo->query("
    WITH duplicate_groups AS (
        SELECT 
            item_id,
            CASE 
                WHEN yahoo_auction_id IS NOT NULL THEN yahoo_auction_id
                ELSE title
            END as group_key
        FROM mystical_japan_treasures_inventory 
        WHERE source_url IS NOT NULL
    ),
    duplicate_keys AS (
        SELECT group_key 
        FROM duplicate_groups 
        GROUP BY group_key 
        HAVING COUNT(*) > 1
    )
    SELECT 
        item_id, title, current_price, picture_url, updated_at, source_url
    FROM mystical_japan_treasures_inventory 
    WHERE source_url IS NOT NULL
    AND (
        CASE 
            WHEN yahoo_auction_id IS NOT NULL THEN yahoo_auction_id
            ELSE title
        END
    ) NOT IN (SELECT group_key FROM duplicate_keys)
    ORDER BY updated_at DESC 
    LIMIT 20
")->fetchAll(PDO::FETCH_ASSOC);

if ($normal_data) {
    echo "<table class='data-table'>";
    echo "<tr><th>画像</th><th>タイトル</th><th>価格</th><th>更新日時</th><th>操作</th></tr>";
    
    foreach ($normal_data as $item) {
        echo "<tr>";
        echo "<td>";
        if ($item['picture_url']) {
            echo "<img src='" . htmlspecialchars($item['picture_url']) . "' class='thumbnail' onerror='this.style.display=\"none\"'>";
        } else {
            echo "<div style='width: 60px; height: 45px; background: #f3f4f6; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #6b7280;'>No Image</div>";
        }
        echo "</td>";
        echo "<td>" . htmlspecialchars(substr($item['title'], 0, 80)) . "...</td>";
        echo "<td>$" . htmlspecialchars($item['current_price']) . "</td>";
        echo "<td>" . htmlspecialchars($item['updated_at']) . "</td>";
        echo "<td>";
        echo "<a href='" . htmlspecialchars($item['source_url']) . "' target='_blank' class='button button-primary' style='padding: 4px 8px; font-size: 12px;'>表示</a>";
        echo "</td>";
        echo "</tr>";
    }
    
    echo "</table>";
} else {
    echo "<div class='info'>📝 重複のないデータがありません</div>";
}
?>

        <div style="margin-top: 40px; text-align: center;">
            <a href="advanced_scraping_fixed.php" class="button button-primary">🔙 スクレイピングシステムに戻る</a>
            <a href="yahoo_auction_content.php" class="button button-success">📊 Yahoo Auction Tool</a>
        </div>
        
    </div>

    <script>
        function updateSelectedCount() {
            const checked = document.querySelectorAll('.duplicate-checkbox:checked').length;
            document.getElementById('selectedCount').textContent = checked;
        }

        function selectOldDuplicates() {
            const oldDuplicates = document.querySelectorAll('.old-duplicate');
            oldDuplicates.forEach(checkbox => {
                checkbox.checked = true;
            });
            updateSelectedCount();
        }

        function selectAll() {
            const checkboxes = document.querySelectorAll('.duplicate-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
            updateSelectedCount();
        }

        function deselectAll() {
            const checkboxes = document.querySelectorAll('.duplicate-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            updateSelectedCount();
        }

        function confirmBulkDelete() {
            const checked = document.querySelectorAll('.duplicate-checkbox:checked').length;
            if (checked === 0) {
                alert('削除対象を選択してください。');
                return false;
            }
            return confirm(`選択した ${checked} 件のデータを削除しますか？\nこの操作は取り消せません。`);
        }

        // 初期化
        updateSelectedCount();
    </script>
</body>
</html>
