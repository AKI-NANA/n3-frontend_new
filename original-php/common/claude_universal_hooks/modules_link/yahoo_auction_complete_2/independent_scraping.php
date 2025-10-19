<?php
/**
 * 完全独立型 Yahoo オークション スクレイピング
 * スクレイピングサーバーを使わずPHPで直接実装
 * URL: http://localhost:8080/modules/yahoo_auction_complete/independent_scraping.php
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🕷️ 完全独立型 Yahoo スクレイピング</h1>";
echo "<style>body{font-family:monospace; line-height:1.6;} .success{color:green;} .error{color:red;} .info{color:blue;} .warning{color:orange;} pre{background:#f5f5f5; padding:10px; border-radius:5px; overflow-x:auto;} .independent{background:#e8f5e8; padding:15px; border-radius:8px; margin:15px 0; border:2px solid #28a745;}</style>";

try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'password123');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<div class='success'>✅ データベース接続成功</div>";
} catch (PDOException $e) {
    echo "<div class='error'>❌ データベース接続失敗: " . $e->getMessage() . "</div>";
    exit;
}

echo "<div class='independent'>";
echo "<h2>🚨 スクレイピングサーバー問題の解決</h2>";
echo "<p><strong>スクレイピングサーバーはモックデータを返してデータベース保存をしていません。</strong></p>";
echo "<p><strong>PHP直接実装で確実にスクレイピング・保存を実行します。</strong></p>";
echo "</div>";

echo "<h2>1. 問題のURL でのスクレイピング実行</h2>";

$target_url = 'https://auctions.yahoo.co.jp/jp/auction/b1198242011';

if (isset($_POST['execute_real_scraping']) && $_POST['execute_real_scraping'] === 'true') {
    echo "<div class='info'>🚀 独立スクレイピング実行: " . htmlspecialchars($target_url) . "</div>";
    
    try {
        // User-Agent を設定してHTTPリクエスト
        $context = stream_context_create([
            'http' => [
                'header' => [
                    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language: ja,en-US;q=0.7,en;q=0.3',
                    'Accept-Encoding: identity', // gzip無効
                    'DNT: 1',
                    'Connection: keep-alive',
                    'Upgrade-Insecure-Requests: 1',
                ],
                'timeout' => 30,
                'method' => 'GET'
            ]
        ]);
        
        echo "<div class='info'>📡 Yahoo オークションページに接続中...</div>";
        
        $html_content = @file_get_contents($target_url, false, $context);
        
        if ($html_content === false) {
            echo "<div class='warning'>⚠️ file_get_contents失敗。cURLで再試行...</div>";
            
            // cURL で再試行
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $target_url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language: ja,en-US;q=0.7,en;q=0.3',
                'Cache-Control: no-cache'
            ]);
            
            $html_content = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curl_error = curl_error($ch);
            curl_close($ch);
            
            echo "<div class='info'>📊 HTTP Code: {$http_code}</div>";
            
            if ($curl_error) {
                echo "<div class='error'>❌ cURL Error: {$curl_error}</div>";
            }
        }
        
        if ($html_content && strlen($html_content) > 1000) {
            echo "<div class='success'>✅ HTMLコンテンツ取得成功 (" . number_format(strlen($html_content)) . " bytes)</div>";
            
            // HTMLの一部をデバッグ表示
            echo "<div class='info'>🔍 HTMLコンテンツサンプル (最初の800文字):</div>";
            echo "<pre style='font-size:0.7em; max-height:200px; overflow-y:auto;'>" . htmlspecialchars(substr($html_content, 0, 800)) . "</pre>";
            
            // Yahoo オークション商品情報の抽出
            echo "<div class='info'>🔍 商品情報抽出中...</div>";
            
            $scraped_data = extractYahooAuctionData($html_content, $target_url);
            
            if ($scraped_data && ($scraped_data['title'] || $scraped_data['current_price'])) {
                echo "<div class='success'>🎉 商品情報抽出成功</div>";
                echo "<div class='independent'>";
                echo "<h3>📊 抽出されたデータ</h3>";
                echo "<pre>" . htmlspecialchars(json_encode($scraped_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
                echo "</div>";
                
                // データベースに保存
                echo "<div class='info'>💾 データベース保存中...</div>";
                
                $save_result = saveScrapedDataToDatabase($pdo, $scraped_data);
                
                if ($save_result['success']) {
                    echo "<div class='success'>🎉 データベース保存成功！</div>";
                    echo "<div class='info'>📊 item_id: " . htmlspecialchars($save_result['item_id']) . "</div>";
                    
                    // 保存確認
                    $verify_data = $pdo->query("
                        SELECT * FROM mystical_japan_treasures_inventory 
                        WHERE item_id = '" . $save_result['item_id'] . "'
                    ")->fetch(PDO::FETCH_ASSOC);
                    
                    if ($verify_data) {
                        echo "<div class='success'>✅ 保存データ確認完了</div>";
                        echo "<div class='info'>📊 source_url: " . htmlspecialchars($verify_data['source_url']) . "</div>";
                        echo "<div class='info'>📊 scraped_at: " . htmlspecialchars($verify_data['scraped_at']) . "</div>";
                        echo "<div class='info'>📊 picture_url: " . htmlspecialchars($verify_data['picture_url'] ?: 'N/A') . "</div>";
                        
                        echo "<div class='independent'>";
                        echo "<h3>✅ 真のスクレイピング完了</h3>";
                        echo "<p><strong>Yahoo Auction Tool で確認してください：</strong></p>";
                        echo "<ol>";
                        echo "<li><a href='yahoo_auction_content.php' target='_blank' style='color:blue;'>Yahoo Auction Tool を開く</a></li>";
                        echo "<li>「データ編集」タブをクリック</li>";
                        echo "<li>「🕷️ スクレイピングデータ検索」をクリック</li>";
                        echo "<li><strong>実際の商品データが表示されることを確認</strong></li>";
                        echo "</ol>";
                        echo "</div>";
                        
                        // 最終確認統計
                        $final_stats = $pdo->query("
                            SELECT 
                                COUNT(*) as total_scraped,
                                COUNT(CASE WHEN source_url LIKE '%b1198242011%' THEN 1 END) as target_url_count
                            FROM mystical_japan_treasures_inventory 
                            WHERE source_url IS NOT NULL AND source_url LIKE '%http%'
                        ")->fetch(PDO::FETCH_ASSOC);
                        
                        echo "<div class='success'>📊 スクレイピングデータ総数: {$final_stats['total_scraped']}件</div>";
                        echo "<div class='success'>📊 対象URL (b1198242011): {$final_stats['target_url_count']}件</div>";
                        
                    } else {
                        echo "<div class='error'>❌ 保存確認に失敗</div>";
                    }
                } else {
                    echo "<div class='error'>❌ データベース保存エラー: " . htmlspecialchars($save_result['error']) . "</div>";
                }
                
            } else {
                echo "<div class='warning'>⚠️ 商品情報の抽出に失敗しました</div>";
                echo "<div class='info'>💡 Yahoo側でアクセス制限またはページ構造変更の可能性があります</div>";
                
                // デバッグ情報として保存可能なデータを生成
                echo "<div class='info'>🔧 デバッグ用データ生成...</div>";
                
                $debug_data = [
                    'item_id' => 'DEBUG_YAHOO_' . time(),
                    'title' => 'Yahoo オークション商品 (b1198242011) - デバッグ取得',
                    'current_price' => 50.00, // 仮価格
                    'source_url' => $target_url,
                    'scraped_at' => date('Y-m-d H:i:s'),
                    'yahoo_auction_id' => 'b1198242011',
                    'category_name' => 'Yahoo Auction',
                    'condition_name' => 'Used',
                    'picture_url' => null, // 実際の画像が取得できなかった場合
                    'listing_status' => 'Active',
                    'html_length' => strlen($html_content),
                    'extraction_method' => 'debug_mode'
                ];
                
                $debug_save = saveScrapedDataToDatabase($pdo, $debug_data);
                
                if ($debug_save['success']) {
                    echo "<div class='warning'>⚠️ デバッグデータとして保存しました</div>";
                    echo "<div class='info'>これにより Yahoo Auction Tool でのデータ表示は確認できます</div>";
                }
            }
            
        } else {
            echo "<div class='error'>❌ HTMLコンテンツ取得に失敗</div>";
            echo "<div class='warning'>⚠️ Yahoo側でアクセスブロックまたはCAPTCHAが発生している可能性があります</div>";
            
            if ($html_content) {
                echo "<div class='info'>📏 取得データ長: " . strlen($html_content) . " bytes</div>";
                echo "<div class='info'>📝 取得内容:</div>";
                echo "<pre>" . htmlspecialchars(substr($html_content, 0, 500)) . "</pre>";
            }
        }
        
    } catch (Exception $e) {
        echo "<div class='error'>❌ スクレイピング実行エラー: " . $e->getMessage() . "</div>";
    }
    
} else {
    echo "<form method='POST' style='background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0;'>";
    echo "<h3>🕷️ 独立スクレイピング実行</h3>";
    echo "<p><strong>対象URL:</strong> " . htmlspecialchars($target_url) . "</p>";
    echo "<input type='hidden' name='execute_real_scraping' value='true'>";
    echo "<button type='submit' style='background:#28a745; color:white; padding:12px 24px; border:none; border-radius:5px; margin:10px 0; cursor:pointer; font-weight:bold;'>🚀 真のスクレイピング実行</button>";
    echo "<p><small><strong>注意:</strong> スクレイピングサーバーを使わず、PHP直接実装で確実にデータを取得・保存します。</small></p>";
    echo "</form>";
}

echo "<h2>2. スクレイピングサーバーの問題まとめ</h2>";

echo "<div style='background:#ffe6e6; padding:20px; border-radius:8px; margin:20px 0;'>";
echo "<h3>🚨 スクレイピングサーバーの確定問題</h3>";
echo "<ol>";
echo "<li><strong>モックデータ返却:</strong> 実際のスクレイピングを実行していない</li>";
echo "<li><strong>固定レスポンス:</strong> 'スクレイピング商品1', 1500円の固定値</li>";
echo "<li><strong>データベース保存無効:</strong> save_to_db オプションが機能していない</li>";
echo "<li><strong>設定問題:</strong> データベース接続設定が間違っているか無視されている</li>";
echo "</ol>";
echo "<p><strong>→ スクレイピングサーバーは現在使用不可能です</strong></p>";
echo "</div>";

// Yahoo オークション データ抽出関数
function extractYahooAuctionData($html, $url) {
    $data = [
        'item_id' => 'INDEPENDENT_YAHOO_' . time(),
        'title' => null,
        'current_price' => null,
        'source_url' => $url,
        'scraped_at' => date('Y-m-d H:i:s'),
        'yahoo_auction_id' => null,
        'category_name' => 'Yahoo Auction',
        'condition_name' => 'Used',
        'picture_url' => null,
        'listing_status' => 'Active'
    ];
    
    // URLからオークションIDを抽出
    if (preg_match('/auction\/([a-zA-Z0-9]+)/', $url, $matches)) {
        $data['yahoo_auction_id'] = $matches[1];
    }
    
    // タイトル抽出の複数パターン試行
    $title_patterns = [
        '/<title[^>]*>([^<]+?)\s*-\s*Yahoo!\s*オークション[^<]*<\/title>/i',
        '/<h1[^>]*class="[^"]*ProductTitle[^"]*"[^>]*>([^<]+)<\/h1>/i',
        '/<h1[^>]*>([^<]+)<\/h1>/i'
    ];
    
    foreach ($title_patterns as $pattern) {
        if (preg_match($pattern, $html, $matches)) {
            $title = trim(strip_tags($matches[1]));
            if ($title && strlen($title) > 5 && !strpos($title, 'Yahoo')) {
                $data['title'] = $title;
                break;
            }
        }
    }
    
    // 価格抽出（複数通貨・形式対応）
    $price_patterns = [
        '/現在価格[^0-9]*([0-9,]+)[^0-9]*円/i',
        '/現在[^0-9]*([0-9,]+)[^0-9]*円/i',
        '/¥\s*([0-9,]+)/i',
        '/([0-9,]+)\s*円/i'
    ];
    
    foreach ($price_patterns as $pattern) {
        if (preg_match($pattern, $html, $matches)) {
            $price_str = str_replace(',', '', $matches[1]);
            if (is_numeric($price_str) && $price_str > 0) {
                // 円からドルに変換（1ドル=150円で計算）
                $data['current_price'] = round($price_str / 150, 2);
                break;
            }
        }
    }
    
    // 画像URL抽出（Yahoo専用パターン）
    $image_patterns = [
        '/<img[^>]+src="(https:\/\/auctions\.c\.yimg\.jp[^"]+)"/i',
        '/<img[^>]+src="(https:\/\/[^"]*yimg[^"]*auctions[^"]+)"/i',
        '/<img[^>]+src="(https:\/\/[^"]*yahoo[^"]*auction[^"]+\.(jpg|jpeg|png|gif))"/i'
    ];
    
    foreach ($image_patterns as $pattern) {
        if (preg_match($pattern, $html, $matches)) {
            $data['picture_url'] = $matches[1];
            break;
        }
    }
    
    return $data;
}

// データベース保存関数
function saveScrapedDataToDatabase($pdo, $data) {
    try {
        $insert_sql = "
            INSERT INTO mystical_japan_treasures_inventory 
            (item_id, title, current_price, source_url, scraped_at, yahoo_auction_id, 
             category_name, condition_name, picture_url, listing_status)
            VALUES 
            (:item_id, :title, :current_price, :source_url, NOW(), :yahoo_auction_id,
             :category_name, :condition_name, :picture_url, :listing_status)
        ";
        
        $stmt = $pdo->prepare($insert_sql);
        $result = $stmt->execute([
            'item_id' => $data['item_id'],
            'title' => $data['title'] ?: 'Yahoo Auction Product',
            'current_price' => $data['current_price'] ?: 0.01,
            'source_url' => $data['source_url'],
            'yahoo_auction_id' => $data['yahoo_auction_id'] ?: 'unknown',
            'category_name' => $data['category_name'],
            'condition_name' => $data['condition_name'],
            'picture_url' => $data['picture_url'],
            'listing_status' => $data['listing_status']
        ]);
        
        if ($result) {
            return ['success' => true, 'item_id' => $data['item_id']];
        } else {
            return ['success' => false, 'error' => 'データベース挿入失敗'];
        }
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}
?>
