<?php
/**
 * 修正版 完全版 Yahoo オークション スクレイピングシステム
 * 全情報取得・重複管理・詳細モーダル対応（関数エラー修正版）
 * URL: http://localhost:8080/modules/yahoo_auction_complete/advanced_scraping_fixed.php
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>修正版 完全版 Yahoo スクレイピング・重複管理システム</title>
    <style>
        body { font-family: monospace; line-height: 1.6; margin: 20px; background: #f8f9fa; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success { color: green; font-weight: bold; }
        .error { color: red; font-weight: bold; }
        .info { color: blue; }
        .warning { color: orange; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; font-size: 0.9em; }
        .button { 
            background: #007bff; 
            color: white; 
            padding: 12px 20px; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer; 
            font-weight: bold; 
            margin: 5px;
            text-decoration: none;
            display: inline-block;
        }
        .button:hover { background: #0056b3; transform: translateY(-1px); }
        .button-success { background: #28a745; }
        .button-success:hover { background: #1e7e34; }
        .button-danger { background: #dc3545; }
        .button-danger:hover { background: #c82333; }
        .button-warning { background: #ffc107; color: #212529; }
        .button-warning:hover { background: #e0a800; }
        .result-box { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 15px 0; border: 2px solid #28a745; }
        .problem-box { background: #ffe6e6; padding: 20px; border-radius: 8px; margin: 15px 0; border: 2px solid #dc3545; }
        .info-box { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 15px 0; border: 2px solid #2196f3; }
        .url-input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #dee2e6; }
        .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .stat-label { font-size: 12px; color: #6c757d; margin-top: 5px; }
        .data-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 0.9em; }
        .data-table th, .data-table td { border: 1px solid #dee2e6; padding: 8px; text-align: left; }
        .data-table th { background: #f8f9fa; font-weight: bold; }
        .data-row:nth-child(even) { background: #f8f9fa; }
        .thumbnail { width: 60px; height: 45px; object-fit: cover; border-radius: 4px; cursor: pointer; }
        .image-gallery { display: flex; gap: 5px; flex-wrap: wrap; }
        .duplicate-marker { background: #fff3cd; border: 1px solid #ffeaa7; padding: 2px 6px; border-radius: 3px; font-size: 0.7em; }
        .progress-indicator { background: #e9ecef; border-radius: 5px; margin: 10px 0; height: 20px; }
        .progress-bar { background: #007bff; height: 100%; border-radius: 5px; text-align: center; color: white; line-height: 20px; transition: width 0.3s; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🕷️ 修正版 完全版 Yahoo スクレイピング・重複管理システム</h1>

<?php
try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'password123');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<div class='success'>✅ データベース接続成功</div>";
} catch (PDOException $e) {
    echo "<div class='error'>❌ データベース接続失敗: " . htmlspecialchars($e->getMessage()) . "</div>";
    exit;
}

// カラム存在確認
$required_columns = ['item_description', 'gallery_url', 'brand_name', 'bid_count', 'watch_count', 'price_jpy'];
$existing_columns_query = $pdo->query("
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'mystical_japan_treasures_inventory'
")->fetchAll(PDO::FETCH_COLUMN);

$missing_columns = array_diff($required_columns, $existing_columns_query);

if (!empty($missing_columns)) {
    echo "<div class='problem-box'>";
    echo "<h3>⚠️ データベース構造の問題</h3>";
    echo "<p>以下のカラムが不足しています: " . implode(', ', $missing_columns) . "</p>";
    echo "<a href='fix_database_structure.php' class='button button-warning'>データベース構造を修正</a>";
    echo "</div>";
    exit;
}

// 安全な統計取得
try {
    $stats = $pdo->query("
        SELECT 
            COUNT(*) as total_records,
            COUNT(CASE WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 1 END) as scraped_data,
            COUNT(CASE WHEN item_id LIKE 'ADVANCED_SCRAPING_%' THEN 1 END) as advanced_data,
            COUNT(CASE WHEN gallery_url IS NOT NULL AND gallery_url != '' THEN 1 END) as with_images,
            COUNT(CASE WHEN item_description IS NOT NULL AND LENGTH(item_description) > 50 THEN 1 END) as with_descriptions
        FROM mystical_japan_treasures_inventory
    ")->fetch(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    echo "<div class='error'>❌ 統計取得エラー: " . htmlspecialchars($e->getMessage()) . "</div>";
    $stats = ['total_records' => 0, 'scraped_data' => 0, 'advanced_data' => 0, 'with_images' => 0, 'with_descriptions' => 0];
}

echo "<div class='stats-grid'>";
echo "<div class='stat-card'><div class='stat-value'>{$stats['total_records']}</div><div class='stat-label'>総レコード</div></div>";
echo "<div class='stat-card'><div class='stat-value'>{$stats['scraped_data']}</div><div class='stat-label'>スクレイピングデータ</div></div>";
echo "<div class='stat-card'><div class='stat-value'>{$stats['advanced_data']}</div><div class='stat-label'>完全版データ</div></div>";
echo "<div class='stat-card'><div class='stat-value'>{$stats['with_images']}</div><div class='stat-label'>画像付きデータ</div></div>";
echo "<div class='stat-card'><div class='stat-value'>{$stats['with_descriptions']}</div><div class='stat-label'>説明付きデータ</div></div>";
echo "</div>";

// メイン機能
if (isset($_POST['action'])) {
    $action = $_POST['action'];
    
    switch ($action) {
        case 'advanced_scrape':
            handleAdvancedScrape($_POST['url'] ?? '');
            break;
        case 'batch_advanced_scrape':
            handleBatchAdvancedScrape($_POST['urls'] ?? '');
            break;
        case 'detect_duplicates':
            handleDuplicateDetection();
            break;
        case 'cleanup_old_data':
            handleCleanupOldData();
            break;
    }
}

function handleAdvancedScrape($url) {
    global $pdo;
    
    if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL) || !strpos($url, 'auctions.yahoo.co.jp')) {
        echo "<div class='error'>❌ 有効なYahoo オークションURLを入力してください</div>";
        return;
    }
    
    echo "<div class='result-box'>";
    echo "<h3>🚀 完全版スクレイピング実行</h3>";
    echo "<p><strong>対象URL:</strong> " . htmlspecialchars($url) . "</p>";
    
    // 重複チェック
    $existing = checkForDuplicate($url, $pdo);
    if ($existing) {
        echo "<div class='warning'>⚠️ 既存データ発見: " . htmlspecialchars($existing['title']) . "</div>";
        echo "<div class='info'>📊 最終更新: " . htmlspecialchars($existing['updated_at']) . "</div>";
        echo "<div class='info'>💰 価格変動: 前回 $" . htmlspecialchars($existing['current_price']) . "</div>";
    }
    
    echo "<div class='progress-indicator'>";
    echo "<div class='progress-bar' id='progressBar' style='width: 0%;'>処理中...</div>";
    echo "</div>";
    
    echo "<script>
        function updateProgress(percent, text) {
            const bar = document.getElementById('progressBar');
            if (bar) {
                bar.style.width = percent + '%';
                bar.textContent = text;
            }
        }
        updateProgress(20, 'HTMLコンテンツ取得中...');
    </script>";
    
    $result = executeAdvancedScraping($url, $pdo, $existing);
    
    if ($result['success']) {
        echo "<script>updateProgress(100, '完了!');</script>";
        echo "<div class='success'>🎉 完全スクレイピング成功！</div>";
        echo "<div class='info'>📊 item_id: " . htmlspecialchars($result['item_id']) . "</div>";
        echo "<div class='info'>📝 タイトル: " . htmlspecialchars($result['title']) . "</div>";
        echo "<div class='info'>💰 価格: $" . htmlspecialchars($result['price']) . "</div>";
        echo "<div class='info'>🖼️ 画像数: " . count($result['images']) . "枚</div>";
        echo "<div class='info'>📄 説明文: " . strlen($result['description']) . "文字</div>";
        
        if ($result['is_update']) {
            echo "<div class='info'>🔄 既存データを更新しました</div>";
        } else {
            echo "<div class='info'>🆕 新規データとして保存しました</div>";
        }
        
        // 画像ギャラリー表示
        if (!empty($result['images'])) {
            echo "<div class='image-gallery'>";
            foreach ($result['images'] as $img) {
                echo "<img src='" . htmlspecialchars($img) . "' class='thumbnail' onclick='showImageModal(\"" . htmlspecialchars($img) . "\")' onerror='this.style.display=\"none\"'>";
            }
            echo "</div>";
        }
        
    } else {
        echo "<script>updateProgress(0, 'エラー');</script>";
        echo "<div class='error'>❌ スクレイピング失敗: " . htmlspecialchars($result['error']) . "</div>";
    }
    echo "</div>";
}

function handleBatchAdvancedScrape($urls_text) {
    global $pdo;
    
    if (empty($urls_text)) {
        echo "<div class='error'>❌ URLが入力されていません</div>";
        return;
    }
    
    $urls = array_filter(array_map('trim', explode("\n", $urls_text)));
    
    if (empty($urls)) {
        echo "<div class='error'>❌ 有効なURLがありません</div>";
        return;
    }
    
    echo "<div class='result-box'>";
    echo "<h3>🚀 一括完全版スクレイピング実行</h3>";
    echo "<p><strong>対象URL数:</strong> " . count($urls) . "件</p>";
    
    $success_count = 0;
    $fail_count = 0;
    
    foreach ($urls as $index => $url) {
        echo "<div class='info'>📡 処理中 (" . ($index + 1) . "/" . count($urls) . "): " . htmlspecialchars(substr($url, 0, 60)) . "...</div>";
        
        if (filter_var($url, FILTER_VALIDATE_URL) && strpos($url, 'auctions.yahoo.co.jp')) {
            $existing = checkForDuplicate($url, $pdo);
            $result = executeAdvancedScraping($url, $pdo, $existing);
            
            if ($result['success']) {
                $success_count++;
                echo "<div class='success'>✅ 成功: " . htmlspecialchars($result['title']) . "</div>";
            } else {
                $fail_count++;
                echo "<div class='warning'>⚠️ 失敗: " . htmlspecialchars($result['error']) . "</div>";
            }
            
            // 負荷軽減のため2秒待機
            sleep(2);
        } else {
            $fail_count++;
            echo "<div class='error'>❌ 無効なURL: " . htmlspecialchars($url) . "</div>";
        }
    }
    
    echo "<div class='success'>🎉 一括スクレイピング完了</div>";
    echo "<div class='info'>📊 成功: {$success_count}件, 失敗: {$fail_count}件</div>";
    echo "</div>";
}

function handleDuplicateDetection() {
    global $pdo;
    
    echo "<div class='result-box'>";
    echo "<h3>🔍 重複データ検出</h3>";
    
    // シンプルな重複検出（PostgreSQLのSIMILARITY関数を使わない方法）
    $duplicate_sql = "
        SELECT 
            a.item_id as id1, a.title as title1, a.current_price as price1, a.updated_at as date1,
            b.item_id as id2, b.title as title2, b.current_price as price2, b.updated_at as date2,
            CASE 
                WHEN a.yahoo_auction_id = b.yahoo_auction_id AND a.yahoo_auction_id IS NOT NULL THEN 'auction_id_match'
                WHEN a.title = b.title THEN 'title_exact_match'
                ELSE 'possible_duplicate'
            END as match_type
        FROM mystical_japan_treasures_inventory a
        JOIN mystical_japan_treasures_inventory b ON a.item_id < b.item_id
        WHERE a.source_url IS NOT NULL 
        AND b.source_url IS NOT NULL
        AND (
            (a.yahoo_auction_id = b.yahoo_auction_id AND a.yahoo_auction_id IS NOT NULL)
            OR a.title = b.title
            OR (LENGTH(a.title) > 20 AND LENGTH(b.title) > 20 AND SUBSTRING(a.title, 1, 30) = SUBSTRING(b.title, 1, 30))
        )
        ORDER BY a.updated_at DESC
        LIMIT 20
    ";
    
    try {
        $duplicates = $pdo->query($duplicate_sql)->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($duplicates)) {
            echo "<div class='success'>✅ 重複データは検出されませんでした</div>";
        } else {
            echo "<div class='warning'>⚠️ " . count($duplicates) . "件の重複候補を検出しました</div>";
            
            echo "<table class='data-table'>";
            echo "<tr><th>商品1</th><th>価格1</th><th>日時1</th><th>商品2</th><th>価格2</th><th>日時2</th><th>一致タイプ</th><th>操作</th></tr>";
            
            foreach ($duplicates as $dup) {
                echo "<tr>";
                echo "<td>" . htmlspecialchars(substr($dup['title1'], 0, 40)) . "...</td>";
                echo "<td>$" . htmlspecialchars($dup['price1']) . "</td>";
                echo "<td>" . htmlspecialchars($dup['date1']) . "</td>";
                echo "<td>" . htmlspecialchars(substr($dup['title2'], 0, 40)) . "...</td>";
                echo "<td>$" . htmlspecialchars($dup['price2']) . "</td>";
                echo "<td>" . htmlspecialchars($dup['date2']) . "</td>";
                echo "<td>" . htmlspecialchars($dup['match_type']) . "</td>";
                echo "<td>";
                echo "<button class='button' style='padding: 4px 8px; font-size: 0.7em;' onclick='confirmDelete(\"" . htmlspecialchars($dup['id2']) . "\")'>古い方を削除</button>";
                echo "</td>";
                echo "</tr>";
            }
            
            echo "</table>";
        }
        
    } catch (Exception $e) {
        echo "<div class='error'>❌ 重複検出エラー: " . htmlspecialchars($e->getMessage()) . "</div>";
    }
    
    echo "</div>";
}

function handleCleanupOldData() {
    global $pdo;
    
    echo "<div class='result-box'>";
    echo "<h3>🧹 古いテストデータ削除</h3>";
    
    $delete_sql = "
        DELETE FROM mystical_japan_treasures_inventory 
        WHERE (
            item_id LIKE 'WORKING_YAHOO_%' OR
            item_id LIKE 'INDEPENDENT_YAHOO_%' OR
            item_id LIKE 'EMERGENCY_SCRAPE_%' OR
            item_id LIKE 'BULK_TEST_%' OR
            item_id LIKE 'DEBUG_YAHOO_%' OR
            (picture_url IS NOT NULL AND picture_url LIKE '%placeholder%')
        )
    ";
    
    try {
        $stmt = $pdo->prepare($delete_sql);
        $result = $stmt->execute();
        $deleted_count = $stmt->rowCount();
        
        echo "<div class='success'>🎉 古いテストデータ削除完了: {$deleted_count}件削除</div>";
    } catch (Exception $e) {
        echo "<div class='error'>❌ 削除エラー: " . htmlspecialchars($e->getMessage()) . "</div>";
    }
    
    echo "</div>";
}

function executeAdvancedScraping($url, $pdo, $existing_data = null) {
    try {
        // HTMLコンテンツ取得
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 45);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: ja,en-US;q=0.7,en;q=0.3',
            'Cache-Control: no-cache'
        ]);
        
        $html_content = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if (!$html_content || $http_code != 200) {
            return ['success' => false, 'error' => "HTTP取得失敗 (Code: {$http_code})"];
        }
        
        // 完全な商品情報抽出
        $extracted_data = extractCompleteYahooData($html_content, $url);
        
        if (!$extracted_data) {
            return ['success' => false, 'error' => '商品情報の抽出に失敗'];
        }
        
        // データベース保存または更新
        $save_result = saveOrUpdateProduct($pdo, $extracted_data, $existing_data);
        
        if (!$save_result['success']) {
            return ['success' => false, 'error' => $save_result['error']];
        }
        
        return [
            'success' => true,
            'item_id' => $save_result['item_id'],
            'title' => $extracted_data['title'],
            'price' => $extracted_data['price'],
            'images' => $extracted_data['images'],
            'description' => $extracted_data['description'],
            'is_update' => $save_result['is_update']
        ];
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function extractCompleteYahooData($html, $url) {
    $data = [
        'url' => $url,
        'title' => null,
        'price' => 0.01,
        'price_jpy' => null,
        'images' => [],
        'description' => null,
        'auction_id' => null,
        'category_path' => [],
        'brand' => null,
        'condition' => 'Used',
        'bid_count' => 0,
        'watch_count' => 0
    ];
    
    // オークションID抽出
    if (preg_match('/auction\/([a-zA-Z0-9]+)/', $url, $matches)) {
        $data['auction_id'] = $matches[1];
    }
    
    // タイトル抽出（複数パターン）
    $title_patterns = [
        '/<h1[^>]*class="[^"]*fontSize16[^"]*"[^>]*>([^<]+)<\/h1>/i',
        '/<title[^>]*>([^<]+?)\s*-\s*Yahoo!\s*オークション[^<]*<\/title>/i',
        '/<h1[^>]*>([^<]+)<\/h1>/i'
    ];
    
    foreach ($title_patterns as $pattern) {
        if (preg_match($pattern, $html, $matches)) {
            $title = trim(strip_tags($matches[1]));
            if ($title && strlen($title) > 5) {
                $data['title'] = $title;
                break;
            }
        }
    }
    
    // 価格抽出（円・ドル両対応）
    $price_patterns = [
        '/(\d{1,3}(?:,\d{3})*)<!-- -->円/i',
        '/現在[^0-9]*([0-9,]+)[^0-9]*円/i',
        '/¥\s*([0-9,]+)/i'
    ];
    
    foreach ($price_patterns as $pattern) {
        if (preg_match($pattern, $html, $matches)) {
            $price_str = str_replace(',', '', $matches[1]);
            if (is_numeric($price_str) && $price_str > 0) {
                $data['price_jpy'] = $price_str;
                $data['price'] = round($price_str / 150, 2); // 円→ドル変換
                break;
            }
        }
    }
    
    // 全画像URL抽出
    $image_patterns = [
        '/src="(https:\/\/auctions\.c\.yimg\.jp\/images\.auctions\.yahoo\.co\.jp\/image\/[^"]+)"/i',
        '/src="(https:\/\/[^"]*yimg[^"]*auction[^"]+\.(jpg|jpeg|png|gif))"/i'
    ];
    
    foreach ($image_patterns as $pattern) {
        preg_match_all($pattern, $html, $image_matches);
        if (!empty($image_matches[1])) {
            foreach ($image_matches[1] as $img_url) {
                if (!in_array($img_url, $data['images'])) {
                    $data['images'][] = $img_url;
                }
            }
        }
    }
    
    // 商品説明抽出
    $desc_patterns = [
        '/<div class="sc-e313d5a2-1[^"]*"[^>]*><div>([^<]+(?:<br>[^<]*)*)<\/div><\/div>/is',
        '/<div[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/div>/is'
    ];
    
    foreach ($desc_patterns as $pattern) {
        if (preg_match($pattern, $html, $desc_matches)) {
            $description = strip_tags(str_replace('<br>', "\n", $desc_matches[1]));
            $data['description'] = trim($description);
            break;
        }
    }
    
    // カテゴリパス抽出
    if (preg_match_all('/<a href="[^"]*category[^"]*"[^>]*>([^<]+)<\/a>/i', $html, $cat_matches)) {
        $data['category_path'] = array_map('trim', $cat_matches[1]);
    }
    
    // ブランド抽出
    if (preg_match('/<a href="[^"]*brand[^"]*"[^>]*>([^<]+)<\/a>/i', $html, $brand_matches)) {
        $data['brand'] = trim($brand_matches[1]);
    }
    
    // 商品状態抽出
    if (preg_match('/未使用/i', $html)) {
        $data['condition'] = 'New';
    } elseif (preg_match('/中古/i', $html)) {
        $data['condition'] = 'Used';
    }
    
    // 入札数抽出
    if (preg_match('/(\d+)<!-- -->件/i', $html, $bid_matches)) {
        $data['bid_count'] = intval($bid_matches[1]);
    }
    
    // ウォッチ数抽出
    if (preg_match('/<span class="[^"]*fontSize12[^"]*">(\d+)<\/span>/i', $html, $watch_matches)) {
        $data['watch_count'] = intval($watch_matches[1]);
    }
    
    // 最低限のデータがない場合はデフォルト値を設定
    if (!$data['title']) {
        $data['title'] = 'Yahoo オークション商品 - ' . ($data['auction_id'] ?: 'ID不明');
    }
    
    return $data;
}

function checkForDuplicate($url, $pdo) {
    // URLまたはオークションIDで重複チェック
    $auction_id = null;
    if (preg_match('/auction\/([a-zA-Z0-9]+)/', $url, $matches)) {
        $auction_id = $matches[1];
    }
    
    $check_sql = "
        SELECT item_id, title, current_price, updated_at 
        FROM mystical_japan_treasures_inventory 
        WHERE source_url = :url 
        OR (yahoo_auction_id = :auction_id AND yahoo_auction_id IS NOT NULL)
        ORDER BY updated_at DESC 
        LIMIT 1
    ";
    
    $stmt = $pdo->prepare($check_sql);
    $stmt->execute([
        'url' => $url,
        'auction_id' => $auction_id
    ]);
    
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

function saveOrUpdateProduct($pdo, $data, $existing = null) {
    try {
        if ($existing) {
            // 既存データを更新
            $item_id = $existing['item_id'];
            
            $update_sql = "
                UPDATE mystical_japan_treasures_inventory 
                SET 
                    title = :title,
                    current_price = :current_price,
                    picture_url = :picture_url,
                    gallery_url = :gallery_url,
                    item_description = :description,
                    category_name = :category,
                    brand_name = :brand,
                    condition_name = :condition,
                    bid_count = :bid_count,
                    watch_count = :watch_count,
                    price_jpy = :price_jpy,
                    updated_at = NOW()
                WHERE item_id = :item_id
            ";
            
            $stmt = $pdo->prepare($update_sql);
            $result = $stmt->execute([
                'item_id' => $item_id,
                'title' => $data['title'],
                'current_price' => $data['price'],
                'picture_url' => !empty($data['images']) ? $data['images'][0] : null,
                'gallery_url' => !empty($data['images']) ? json_encode($data['images']) : null,
                'description' => $data['description'],
                'category' => !empty($data['category_path']) ? implode(' > ', $data['category_path']) : 'Yahoo Auction',
                'brand' => $data['brand'],
                'condition' => $data['condition'],
                'bid_count' => $data['bid_count'],
                'watch_count' => $data['watch_count'],
                'price_jpy' => $data['price_jpy']
            ]);
            
            return [
                'success' => $result,
                'item_id' => $item_id,
                'is_update' => true
            ];
            
        } else {
            // 新規データとして保存
            $item_id = 'ADVANCED_SCRAPING_' . time() . '_' . substr(md5($data['url']), 0, 8);
            
            $insert_sql = "
                INSERT INTO mystical_japan_treasures_inventory 
                (item_id, title, current_price, source_url, scraped_at, yahoo_auction_id, 
                 category_name, brand_name, condition_name, picture_url, gallery_url, 
                 item_description, listing_status, bid_count, watch_count, price_jpy)
                VALUES 
                (:item_id, :title, :current_price, :source_url, NOW(), :yahoo_auction_id,
                 :category_name, :brand_name, :condition_name, :picture_url, :gallery_url,
                 :item_description, :listing_status, :bid_count, :watch_count, :price_jpy)
            ";
            
            $stmt = $pdo->prepare($insert_sql);
            $result = $stmt->execute([
                'item_id' => $item_id,
                'title' => $data['title'],
                'current_price' => $data['price'],
                'source_url' => $data['url'],
                'yahoo_auction_id' => $data['auction_id'],
                'category_name' => !empty($data['category_path']) ? implode(' > ', $data['category_path']) : 'Yahoo Auction',
                'brand_name' => $data['brand'],
                'condition_name' => $data['condition'],
                'picture_url' => !empty($data['images']) ? $data['images'][0] : null,
                'gallery_url' => !empty($data['images']) ? json_encode($data['images']) : null,
                'item_description' => $data['description'],
                'listing_status' => 'Active',
                'bid_count' => $data['bid_count'],
                'watch_count' => $data['watch_count'],
                'price_jpy' => $data['price_jpy']
            ]);
            
            return [
                'success' => $result,
                'item_id' => $item_id,
                'is_update' => false
            ];
        }
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

?>

        <h2>🎛️ 完全版スクレイピング実行</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
            <div>
                <h3>📡 完全版スクレイピング</h3>
                <form method="POST">
                    <input type="hidden" name="action" value="advanced_scrape">
                    <input type="url" name="url" class="url-input" placeholder="https://auctions.yahoo.co.jp/jp/auction/xxxxxxxx" required>
                    <button type="submit" class="button button-success">🚀 完全スクレイピング実行</button>
                    <p style="font-size: 0.8em; color: #666;">
                        ✅ 全画像取得 ✅ 詳細説明 ✅ カテゴリ情報 ✅ 重複チェック
                    </p>
                </form>
                
                <h4 style="margin-top: 20px;">📡 一括スクレイピング</h4>
                <form method="POST">
                    <input type="hidden" name="action" value="batch_advanced_scrape">
                    <textarea name="urls" class="url-input" rows="4" placeholder="https://auctions.yahoo.co.jp/jp/auction/xxxxxxxx&#10;https://auctions.yahoo.co.jp/jp/auction/yyyyyyyy&#10;（1行に1つのURLを入力）"></textarea>
                    <button type="submit" class="button button-success">🚀 一括スクレイピング実行</button>
                </form>
            </div>
            
            <div>
                <h3>🔍 重複管理</h3>
                <form method="POST">
                    <input type="hidden" name="action" value="detect_duplicates">
                    <button type="submit" class="button button-warning">🔍 重複データ検出</button>
                </form>
                <form method="POST" style="margin-top: 10px;">
                    <input type="hidden" name="action" value="cleanup_old_data">
                    <button type="submit" class="button button-danger" onclick="return confirm('古いテストデータを削除しますか？')">🧹 古いデータ削除</button>
                </form>
                
                <div style="margin-top: 20px;">
                    <a href="yahoo_auction_content.php" class="button" target="_blank">📊 Yahoo Auction Tool で確認</a>
                </div>
            </div>
        </div>
        
        <?php
        // 最新の完全版データ表示
        echo "<h2>📊 最新完全版スクレイピングデータ</h2>";
        
        try {
            $latest_data = $pdo->query("
                SELECT 
                    item_id, title, current_price, picture_url, gallery_url, 
                    item_description, category_name, brand_name, condition_name,
                    bid_count, watch_count, price_jpy, scraped_at, source_url,
                    CASE 
                        WHEN item_id LIKE 'ADVANCED_SCRAPING_%' THEN '完全版'
                        WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN '基本版'
                        ELSE 'その他'
                    END as scraping_type
                FROM mystical_japan_treasures_inventory 
                WHERE source_url IS NOT NULL AND source_url LIKE '%http%'
                ORDER BY updated_at DESC 
                LIMIT 15
            ")->fetchAll(PDO::FETCH_ASSOC);
            
            if ($latest_data) {
                echo "<table class='data-table'>";
                echo "<tr><th>画像</th><th>タイトル</th><th>価格</th><th>カテゴリ</th><th>状態</th><th>入札/ウォッチ</th><th>タイプ</th><th>詳細</th></tr>";
                
                foreach ($latest_data as $item) {
                    $images = json_decode($item['gallery_url'] ?? '[]', true) ?: [];
                    $image_count = count($images);
                    
                    echo "<tr class='data-row'>";
                    echo "<td>";
                    if ($item['picture_url']) {
                        echo "<img src='" . htmlspecialchars($item['picture_url']) . "' class='thumbnail' onclick='showImageModal(\"" . htmlspecialchars($item['picture_url']) . "\")' onerror='this.style.display=\"none\"'>";
                        if ($image_count > 1) {
                            echo "<br><small>+{$image_count}枚</small>";
                        }
                    } else {
                        echo "No Image";
                    }
                    echo "</td>";
                    echo "<td>" . htmlspecialchars(substr($item['title'], 0, 50)) . "...</td>";
                    echo "<td>";
                    if ($item['price_jpy']) {
                        echo "¥" . number_format($item['price_jpy']) . "<br>";
                    }
                    echo "$" . htmlspecialchars($item['current_price']);
                    echo "</td>";
                    echo "<td>" . htmlspecialchars($item['category_name'] ?: 'N/A') . "</td>";
                    echo "<td>" . htmlspecialchars($item['condition_name']) . "</td>";
                    echo "<td>";
                    echo "入札: " . htmlspecialchars($item['bid_count'] ?: 0) . "<br>";
                    echo "ウォッチ: " . htmlspecialchars($item['watch_count'] ?: 0);
                    echo "</td>";
                    echo "<td>" . htmlspecialchars($item['scraping_type']) . "</td>";
                    echo "<td>";
                    echo "<button class='button' onclick='alert(\"詳細: " . htmlspecialchars($item['item_id']) . "\")' style='padding: 5px 10px; font-size: 0.8em;'>詳細</button>";
                    echo "</td>";
                    echo "</tr>";
                }
                
                echo "</table>";
            } else {
                echo "<div class='info'>📝 完全版スクレイピングデータがありません</div>";
            }
            
        } catch (Exception $e) {
            echo "<div class='error'>❌ データ表示エラー: " . htmlspecialchars($e->getMessage()) . "</div>";
        }
        ?>
        
        <div class="info-box">
            <h3>✅ 修正版システムの特徴</h3>
            <ul>
                <li><strong>🖼️ 全画像取得:</strong> メイン画像＋追加画像を全て取得</li>
                <li><strong>📄 詳細説明:</strong> 商品説明文を完全取得</li>
                <li><strong>📊 完全情報:</strong> カテゴリ・ブランド・入札数・ウォッチ数</li>
                <li><strong>🔍 重複管理:</strong> 同一商品の重複検出機能</li>
                <li><strong>🔄 更新機能:</strong> 既存データの価格・状況更新</li>
                <li><strong>🛡️ エラー修正:</strong> 関数エラー修正・安全性向上</li>
            </ul>
        </div>
        
    </div>

    <script>
        function showImageModal(imageUrl) {
            // 画像拡大表示
            const newWindow = window.open('', '_blank', 'width=800,height=600');
            newWindow.document.write('<img src="' + imageUrl + '" style="width: 100%; height: auto;">');
        }

        function confirmDelete(itemId) {
            if (confirm('本当にこのデータを削除しますか？ ID: ' + itemId)) {
                alert('削除機能は次回実装予定です。ID: ' + itemId);
            }
        }
    </script>
</body>
</html>
