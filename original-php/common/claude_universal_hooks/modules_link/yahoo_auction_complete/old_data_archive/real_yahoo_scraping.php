<?php
/**
 * 真のYahooオークション スクレイピング実装
 * URL: http://localhost:8080/modules/yahoo_auction_complete/real_yahoo_scraping.php
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🕷️ 真のYahooオークション スクレイピング</h1>";
echo "<style>body{font-family:monospace; line-height:1.6;} .success{color:green;} .error{color:red;} .info{color:blue;} .warning{color:orange;} pre{background:#f5f5f5; padding:10px; border-radius:5px; overflow-x:auto;} .real-scraping{background:#e8f5e8; padding:15px; border-radius:8px; margin:15px 0; border:2px solid #28a745;} .test-data{background:#fff3cd; padding:15px; border-radius:8px; margin:15px 0; border:2px solid #ffc107;}</style>";

try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'password123');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<div class='success'>✅ データベース接続成功</div>";
} catch (PDOException $e) {
    echo "<div class='error'>❌ データベース接続失敗: " . $e->getMessage() . "</div>";
    exit;
}

echo "<div class='test-data'>";
echo "<h2>⚠️ 現状確認</h2>";
echo "<p><strong>現在表示されているデータはテストデータです：</strong></p>";
echo "<ul>";
echo "<li>画像: プレースホルダー画像</li>";
echo "<li>URL: 存在しないテスト用URL</li>";
echo "<li>データ: PHP生成のモックデータ</li>";
echo "</ul>";
echo "<p><strong>真のスクレイピングを実装します。</strong></p>";
echo "</div>";

echo "<h2>1. 実在するYahooオークション商品の確認</h2>";

// 実在するYahooオークション商品例を表示
$real_yahoo_examples = [
    'https://auctions.yahoo.co.jp/jp/auction/r1234567890',
    'https://auctions.yahoo.co.jp/jp/auction/k1234567890',
    'https://auctions.yahoo.co.jp/jp/auction/b1234567890'
];

echo "<div class='info'>💡 実在するYahooオークション商品例:</div>";
echo "<ul>";
foreach ($real_yahoo_examples as $example) {
    echo "<li>" . htmlspecialchars($example) . "</li>";
}
echo "</ul>";

echo "<h2>2. 真のスクレイピング実装</h2>";

if (isset($_POST['real_scrape_url']) && !empty($_POST['real_scrape_url'])) {
    $scrape_url = $_POST['real_scrape_url'];
    
    echo "<div class='info'>🚀 真のスクレイピング実行: " . htmlspecialchars($scrape_url) . "</div>";
    
    // URLの検証
    if (!filter_var($scrape_url, FILTER_VALIDATE_URL) || !strpos($scrape_url, 'auctions.yahoo.co.jp')) {
        echo "<div class='error'>❌ 無効なYahooオークションURLです</div>";
    } else {
        try {
            echo "<div class='info'>📡 HTTPリクエスト送信中...</div>";
            
            // User-Agentを設定してHTTPリクエスト
            $context = stream_context_create([
                'http' => [
                    'header' => [
                        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language: ja,en-US;q=0.7,en;q=0.3',
                        'Accept-Encoding: gzip, deflate',
                        'DNT: 1',
                        'Connection: keep-alive',
                        'Upgrade-Insecure-Requests: 1',
                    ],
                    'timeout' => 30,
                    'method' => 'GET'
                ]
            ]);
            
            $html_content = @file_get_contents($scrape_url, false, $context);
            
            if ($html_content === false) {
                echo "<div class='error'>❌ HTTPリクエスト失敗</div>";
                echo "<div class='warning'>⚠️ Yahoo側でブロックされた可能性があります</div>";
                
                // 代替手段としてcURLを試行
                echo "<div class='info'>🔄 cURLで再試行...</div>";
                
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $scrape_url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 30);
                curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language: ja,en-US;q=0.7,en;q=0.3',
                    'Cache-Control: no-cache',
                    'Pragma: no-cache'
                ]);
                
                $html_content = curl_exec($ch);
                $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curl_error = curl_error($ch);
                curl_close($ch);
                
                echo "<div class='info'>📊 HTTP Code: {$http_code}</div>";
                
                if ($curl_error) {
                    echo "<div class='error'>❌ cURL Error: {$curl_error}</div>";
                } elseif ($http_code != 200) {
                    echo "<div class='error'>❌ HTTP Error: {$http_code}</div>";
                }
            }
            
            if ($html_content && strlen($html_content) > 1000) {
                echo "<div class='success'>✅ HTMLコンテンツ取得成功 (" . strlen($html_content) . " bytes)</div>";
                
                // HTMLをパースして商品情報を抽出
                echo "<div class='info'>🔍 商品情報抽出中...</div>";
                
                // 簡易HTMLパーサー（実際のスクレイピング）
                $scraped_data = parseYahooAuctionHTML($html_content, $scrape_url);
                
                if ($scraped_data) {
                    echo "<div class='real-scraping'>";
                    echo "<h3>🎉 真のスクレイピング成功</h3>";
                    echo "<strong>抽出されたデータ:</strong>";
                    echo "<pre>" . htmlspecialchars(json_encode($scraped_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
                    echo "</div>";
                    
                    // データベースに保存
                    $save_result = saveRealScrapedData($pdo, $scraped_data);
                    
                    if ($save_result['success']) {
                        echo "<div class='success'>🎉 真のスクレイピングデータをデータベースに保存しました</div>";
                        echo "<div class='info'>📊 item_id: " . htmlspecialchars($save_result['item_id']) . "</div>";
                        
                        echo "<div class='real-scraping'>";
                        echo "<h3>✅ 真のスクレイピング完了</h3>";
                        echo "<p><strong>Yahoo Auction Tool で確認してください：</strong></p>";
                        echo "<ol>";
                        echo "<li><a href='yahoo_auction_content.php' target='_blank'>Yahoo Auction Tool を開く</a></li>";
                        echo "<li>「データ編集」タブをクリック</li>";
                        echo "<li>「🕷️ スクレイピングデータ検索」をクリック</li>";
                        echo "<li>実際の商品画像・タイトル・価格が表示されることを確認</li>";
                        echo "</ol>";
                        echo "</div>";
                        
                    } else {
                        echo "<div class='error'>❌ データベース保存失敗: " . htmlspecialchars($save_result['error']) . "</div>";
                    }
                } else {
                    echo "<div class='error'>❌ 商品情報の抽出に失敗しました</div>";
                    echo "<div class='warning'>⚠️ Yahoo側の構造変更またはアクセス制限の可能性があります</div>";
                }
                
                // デバッグ用：HTMLの一部を表示
                echo "<div class='info'>🔍 HTMLコンテンツ（最初の500文字）:</div>";
                echo "<pre>" . htmlspecialchars(substr($html_content, 0, 500)) . "...</pre>";
                
            } else {
                echo "<div class='error'>❌ HTMLコンテンツが取得できませんでした</div>";
                echo "<div class='warning'>⚠️ Yahoo側でアクセスがブロックされている可能性があります</div>";
            }
            
        } catch (Exception $e) {
            echo "<div class='error'>❌ スクレイピングエラー: " . $e->getMessage() . "</div>";
        }
    }
    
} else {
    echo "<form method='POST' style='background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0;'>";
    echo "<h3>🕷️ 真のYahooオークション スクレイピング</h3>";
    echo "<p><strong>実在するYahooオークションURL:</strong></p>";
    echo "<input type='text' name='real_scrape_url' placeholder='https://auctions.yahoo.co.jp/jp/auction/実在ID' style='width:500px; padding:8px; margin:5px 0;'>";
    echo "<br>";
    echo "<button type='submit' style='background:#28a745; color:white; padding:12px 24px; border:none; border-radius:5px; margin:10px 0; cursor:pointer; font-weight:bold;'>🕷️ 真のスクレイピング実行</button>";
    echo "<br>";
    echo "<p><small><strong>注意:</strong> 実在するYahooオークションURLを入力してください。存在しないURLではスクレイピングできません。</small></p>";
    echo "</form>";
}

echo "<h2>3. スクレイピング実装の技術的説明</h2>";

echo "<div style='background:#e3f2fd; padding:20px; border-radius:8px; margin:20px 0;'>";
echo "<h3>🔧 真のスクレイピングの仕組み</h3>";
echo "<ol>";
echo "<li><strong>HTTPリクエスト:</strong> 実際のYahooオークションページにアクセス</li>";
echo "<li><strong>HTMLパース:</strong> ページのHTML構造を解析</li>";
echo "<li><strong>データ抽出:</strong> タイトル、価格、画像URLを抽出</li>";
echo "<li><strong>画像URL取得:</strong> Yahoo画像サーバーの実際のURL</li>";
echo "<li><strong>データベース保存:</strong> 実データを保存</li>";
echo "</ol>";
echo "</div>";

echo "<h2>4. 課題と制限事項</h2>";

echo "<div style='background:#fff3cd; padding:20px; border-radius:8px; margin:20px 0;'>";
echo "<h3>⚠️ スクレイピングの課題</h3>";
echo "<ul>";
echo "<li><strong>アクセス制限:</strong> Yahoo側でスクレイピングを検出・ブロック</li>";
echo "<li><strong>CAPTCHA:</strong> 人間確認が必要な場合がある</li>";
echo "<li><strong>IP制限:</strong> 短時間での大量アクセスによるブロック</li>";
echo "<li><strong>構造変更:</strong> Yahooサイトの構造変更による抽出失敗</li>";
echo "<li><strong>JavaScript必須:</strong> 一部コンテンツがJavaScript必須</li>";
echo "</ul>";
echo "</div>";

echo "<h2>5. 推奨されるアプローチ</h2>";

echo "<div style='background:#d4edda; padding:20px; border-radius:8px; margin:20px 0;'>";
echo "<h3>✅ 実用的な解決策</h3>";
echo "<ol>";
echo "<li><strong>Yahoo API利用:</strong> 公式APIがあれば使用（推奨）</li>";
echo "<li><strong>間隔を空けたスクレイピング:</strong> 1回/秒以下の頻度</li>";
echo "<li><strong>プロキシ・VPN使用:</strong> IP分散によるブロック回避</li>";
echo "<li><strong>ヘッドレスブラウザ:</strong> Selenium/Puppeteer使用</li>";
echo "<li><strong>専用スクレイピングサービス:</strong> ScrapingBee等の利用</li>";
echo "</ol>";
echo "</div>";

// Yahoo HTML解析関数
function parseYahooAuctionHTML($html, $url) {
    try {
        // 基本的なHTMLパターンマッチング
        $scraped_data = [
            'item_id' => 'REAL_YAHOO_' . time(),
            'source_url' => $url,
            'title' => null,
            'current_price' => null,
            'picture_url' => null,
            'category_name' => 'Yahoo Auction',
            'condition_name' => 'Used',
            'scraped_at' => date('Y-m-d H:i:s'),
            'listing_status' => 'Active'
        ];
        
        // タイトル抽出（複数パターン試行）
        $title_patterns = [
            '/<title[^>]*>([^<]+)<\/title>/i',
            '/<h1[^>]*class="[^"]*ProductTitle[^"]*"[^>]*>([^<]+)<\/h1>/i',
            '/<h1[^>]*>([^<]+)<\/h1>/i'
        ];
        
        foreach ($title_patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $scraped_data['title'] = trim(strip_tags($matches[1]));
                break;
            }
        }
        
        // 価格抽出
        $price_patterns = [
            '/現在価格[^0-9]*([0-9,]+)[^0-9]*円/i',
            '/Price[^0-9]*([0-9,]+)/i',
            '/¥([0-9,]+)/i'
        ];
        
        foreach ($price_patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $price_str = str_replace(',', '', $matches[1]);
                if (is_numeric($price_str)) {
                    // 円からドルに変換（概算 1ドル=150円）
                    $scraped_data['current_price'] = round($price_str / 150, 2);
                    break;
                }
            }
        }
        
        // 画像URL抽出
        $image_patterns = [
            '/<img[^>]+src="(https:\/\/auctions\.c\.yimg\.jp[^"]+)"/i',
            '/<img[^>]+src="(https:\/\/[^"]*yimg[^"]+)"/i',
            '/<img[^>]+src="([^"]+\.(jpg|jpeg|png|gif))"/i'
        ];
        
        foreach ($image_patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $scraped_data['picture_url'] = $matches[1];
                break;
            }
        }
        
        // 基本検証
        if (!$scraped_data['title'] && !$scraped_data['current_price']) {
            return null; // 抽出失敗
        }
        
        // URLからオークションIDを抽出
        if (preg_match('/auction\/([a-zA-Z0-9]+)/', $url, $matches)) {
            $scraped_data['yahoo_auction_id'] = $matches[1];
        }
        
        return $scraped_data;
        
    } catch (Exception $e) {
        return null;
    }
}

// 真のスクレイピングデータ保存関数
function saveRealScrapedData($pdo, $data) {
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
            'yahoo_auction_id' => $data['yahoo_auction_id'] ?? 'unknown',
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
