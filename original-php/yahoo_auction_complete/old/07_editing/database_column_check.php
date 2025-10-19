<?php
/**
 * データベースデータ取得の緊急修正
 * active_image_url と scraped_yahoo_data が取得できない問題を解決
 */

echo "<h1>🔍 データベースデータ取得問題診断</h1>";

try {
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres"; 
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<div style='color: green; padding: 10px; background: #e8f5e8; margin: 10px 0;'>✅ データベース接続成功</div>";
    
    // 1. カラム構造確認
    echo "<h2>1. 📋 テーブル構造確認</h2>";
    
    $columns_sql = "SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = 'yahoo_scraped_products'
                    ORDER BY ordinal_position";
    
    $columns_stmt = $pdo->query($columns_sql);
    $columns = $columns_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<div style='background: #f8f9fa; padding: 15px; border-radius: 8px;'>";
    echo "<h3>📊 テーブルカラム一覧:</h3>";
    echo "<table border='1' style='border-collapse: collapse; width: 100%; font-size: 0.9em;'>";
    echo "<tr style='background: #007bff; color: white;'>";
    echo "<th style='padding: 8px;'>カラム名</th>";
    echo "<th style='padding: 8px;'>データ型</th>";
    echo "<th style='padding: 8px;'>NULL許可</th>";
    echo "</tr>";
    
    $has_active_image_url = false;
    $has_scraped_yahoo_data = false;
    
    foreach ($columns as $column) {
        if ($column['column_name'] === 'active_image_url') $has_active_image_url = true;
        if ($column['column_name'] === 'scraped_yahoo_data') $has_scraped_yahoo_data = true;
        
        $row_color = '';
        if ($column['column_name'] === 'active_image_url') $row_color = 'background: #d4edda;';
        if ($column['column_name'] === 'scraped_yahoo_data') $row_color = 'background: #d1ecf1;';
        
        echo "<tr style='{$row_color}'>";
        echo "<td style='padding: 5px; font-weight: bold;'>" . htmlspecialchars($column['column_name']) . "</td>";
        echo "<td style='padding: 5px;'>" . htmlspecialchars($column['data_type']) . "</td>";
        echo "<td style='padding: 5px;'>" . htmlspecialchars($column['is_nullable']) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    echo "</div>";
    
    // 2. 重要カラムの存在確認
    echo "<h2>2. 🔍 重要カラム確認</h2>";
    
    echo "<div style='background: #f0f8ff; padding: 15px; border-radius: 8px;'>";
    echo "<p><strong>active_image_url:</strong> " . ($has_active_image_url ? '✅ 存在' : '❌ 存在しない') . "</p>";
    echo "<p><strong>scraped_yahoo_data:</strong> " . ($has_scraped_yahoo_data ? '✅ 存在' : '❌ 存在しない') . "</p>";
    echo "</div>";
    
    // 3. ゲンガーデータの詳細確認
    echo "<h2>3. 🎯 ゲンガーデータ詳細確認</h2>";
    
    $item_id = 'l1200404917';
    
    // 全カラムを取得
    $detail_sql = "SELECT * FROM yahoo_scraped_products WHERE source_item_id = :item_id ORDER BY updated_at DESC LIMIT 1";
    $detail_stmt = $pdo->prepare($detail_sql);
    $detail_stmt->bindParam(':item_id', $item_id);
    $detail_stmt->execute();
    
    $product_data = $detail_stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($product_data) {
        echo "<div style='background: #e8f5e8; padding: 15px; border-radius: 8px;'>";
        echo "<h3>✅ ゲンガーデータ発見</h3>";
        echo "<p><strong>ID:</strong> {$product_data['id']}</p>";
        echo "<p><strong>source_item_id:</strong> {$product_data['source_item_id']}</p>";
        echo "<p><strong>タイトル:</strong> " . htmlspecialchars($product_data['active_title']) . "</p>";
        echo "<p><strong>更新日:</strong> {$product_data['updated_at']}</p>";
        echo "</div>";
        
        // 画像関連カラムの詳細確認
        echo "<h3>🖼️ 画像関連データ確認:</h3>";
        
        $image_fields = ['active_image_url', 'picture_url', 'scraped_yahoo_data'];
        
        foreach ($image_fields as $field) {
            echo "<div style='margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px;'>";
            echo "<h4 style='margin: 0 0 10px 0; color: #333;'>{$field}:</h4>";
            
            if (isset($product_data[$field])) {
                if ($product_data[$field]) {
                    if ($field === 'scraped_yahoo_data') {
                        // JSON データの場合
                        $json_data = json_decode($product_data[$field], true);
                        if ($json_data) {
                            echo "<p style='color: green; font-weight: bold;'>✅ データあり (" . strlen($product_data[$field]) . " 文字)</p>";
                            
                            // 画像データの確認
                            if (isset($json_data['all_images'])) {
                                $image_count = is_array($json_data['all_images']) ? count($json_data['all_images']) : 0;
                                echo "<p><strong>all_images:</strong> {$image_count}枚</p>";
                                
                                if ($image_count > 0) {
                                    echo "<details>";
                                    echo "<summary style='cursor: pointer;'>画像URL一覧表示</summary>";
                                    echo "<div style='max-height: 200px; overflow-y: auto; margin: 10px 0;'>";
                                    foreach ($json_data['all_images'] as $index => $img_url) {
                                        echo "<p style='font-size: 0.8em; margin: 2px 0;'>";
                                        echo "<strong>画像" . ($index + 1) . ":</strong> ";
                                        echo "<span style='word-break: break-all;'>" . htmlspecialchars($img_url) . "</span>";
                                        echo "</p>";
                                    }
                                    echo "</div>";
                                    echo "</details>";
                                }
                            }
                            
                            if (isset($json_data['validation_info']['image']['all_images'])) {
                                $val_count = count($json_data['validation_info']['image']['all_images']);
                                echo "<p><strong>validation_info.image.all_images:</strong> {$val_count}枚</p>";
                            }
                        } else {
                            echo "<p style='color: red;'>❌ JSON解析失敗</p>";
                        }
                    } else {
                        // 通常のテキストデータの場合
                        echo "<p style='color: green; font-weight: bold;'>✅ データあり</p>";
                        echo "<p style='word-break: break-all; font-size: 0.8em; color: #666;'>" . 
                             htmlspecialchars(substr($product_data[$field], 0, 200)) . 
                             (strlen($product_data[$field]) > 200 ? '...' : '') . "</p>";
                        
                        // 画像として表示してみる
                        if (filter_var($product_data[$field], FILTER_VALIDATE_URL)) {
                            echo "<img src='{$product_data[$field]}' style='max-width: 200px; max-height: 150px; border: 1px solid #ddd; border-radius: 4px; margin: 10px 0;' alt='画像' loading='lazy'>";
                        }
                    }
                } else {
                    echo "<p style='color: red; font-weight: bold;'>❌ データなし (NULL)</p>";
                }
            } else {
                echo "<p style='color: orange; font-weight: bold;'>⚠️ カラム存在しない</p>";
            }
            echo "</div>";
        }
        
        // 4. editing.php で使用されるSQLの確認
        echo "<h2>4. 🔧 editing.php SQL修正案</h2>";
        
        echo "<div style='background: #fff3cd; padding: 15px; border-radius: 8px;'>";
        echo "<h3>⚠️ 問題の原因:</h3>";
        echo "<p>editing.php のSQL文で必要なカラムが取得されていない可能性があります。</p>";
        
        echo "<h4>現在のSQL（推測）:</h4>";
        echo "<pre style='background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 0.8em;'>";
        echo "SELECT id, source_item_id, active_title, price_jpy, current_price, ...</pre>";
        
        echo "<h4 style='color: #28a745;'>修正版SQL:</h4>";
        echo "<pre style='background: #d4edda; padding: 10px; border-radius: 4px; font-size: 0.8em;'>";
        echo "SELECT id, source_item_id, active_title, price_jpy, current_price,
       active_image_url, scraped_yahoo_data, 
       condition_name, category_name, listing_status, 
       current_stock, updated_at, created_at
FROM yahoo_scraped_products 
WHERE listing_status = 'not_listed' 
ORDER BY updated_at DESC";
        echo "</pre>";
        echo "</div>";
        
        // 5. 修正版データ取得テスト
        echo "<h2>5. 🧪 修正版データ取得テスト</h2>";
        
        $fixed_sql = "SELECT id, source_item_id, active_title, price_jpy, current_price,
                             active_image_url, scraped_yahoo_data, 
                             condition_name, category_name, listing_status, 
                             current_stock, updated_at, created_at
                      FROM yahoo_scraped_products 
                      WHERE source_item_id = :item_id 
                      ORDER BY updated_at DESC LIMIT 1";
        
        $fixed_stmt = $pdo->prepare($fixed_sql);
        $fixed_stmt->bindParam(':item_id', $item_id);
        $fixed_stmt->execute();
        
        $fixed_data = $fixed_stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($fixed_data) {
            echo "<div style='background: #d4edda; padding: 15px; border-radius: 8px;'>";
            echo "<h3>✅ 修正版データ取得成功</h3>";
            echo "<p><strong>active_image_url:</strong> " . ($fixed_data['active_image_url'] ? '✅ あり' : '❌ なし') . "</p>";
            echo "<p><strong>scraped_yahoo_data:</strong> " . ($fixed_data['scraped_yahoo_data'] ? '✅ あり' : '❌ なし') . "</p>";
            
            if ($fixed_data['scraped_yahoo_data']) {
                $json_data = json_decode($fixed_data['scraped_yahoo_data'], true);
                if ($json_data && isset($json_data['all_images'])) {
                    $img_count = count($json_data['all_images']);
                    echo "<p><strong>画像数:</strong> <span style='color: #28a745; font-weight: bold; font-size: 1.2em;'>{$img_count}枚</span></p>";
                }
            }
            echo "</div>";
            
            // JSONデータの詳細表示
            echo "<details style='margin: 15px 0;'>";
            echo "<summary style='cursor: pointer; padding: 10px; background: #f8f9fa; border-radius: 4px;'>📊 取得データ全体</summary>";
            echo "<pre style='background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 0.7em; max-height: 400px; overflow-y: auto;'>";
            echo htmlspecialchars(json_encode($fixed_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            echo "</pre>";
            echo "</details>";
        }
        
    } else {
        echo "<div style='color: red; padding: 15px; background: #ffe6e6; border-radius: 8px;'>";
        echo "❌ ゲンガーデータが見つかりません (source_item_id = {$item_id})";
        echo "</div>";
    }
    
} catch (PDOException $e) {
    echo "<div style='color: red; padding: 10px; background: #ffe6e6; margin: 10px 0;'>";
    echo "❌ データベースエラー: " . htmlspecialchars($e->getMessage());
    echo "</div>";
}

echo "<hr>";
echo "<div style='background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;'>";
echo "<h3 style='color: #28a745;'>🎯 解決方針</h3>";
echo "<ol>";
echo "<li><strong>editing.php のSQL文修正</strong> - active_image_url, scraped_yahoo_data を含める</li>";
echo "<li><strong>カラム名の統一</strong> - item_id と source_item_id の使い分け確認</li>";
echo "<li><strong>データ取得関数の修正</strong> - 必要なカラムをすべて取得</li>";
echo "</ol>";
echo "</div>";
?>
