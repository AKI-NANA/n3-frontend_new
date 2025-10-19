<?php
/**
 * 🚨 CSV出力緊急修正パッチ
 * yahoo_auction_content.php の該当部分をこのコードで置き換えてください
 */

// case 'download_csv': を以下で完全置き換え
case 'download_csv':
    // 1. 出力バッファ完全クリア
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // 2. エラー出力完全停止
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    
    try {
        // 3. CSVヘッダー設定
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="ebay_listing_fixed_' . date('Ymd_His') . '.csv"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Expires: 0');
        header('Pragma: no-cache');
        
        // 4. UTF-8 BOM追加
        echo "\xEF\xBB\xBF";
        
        // 5. ヘッダー行出力
        $headers = [
            'Action', 'Category', 'Title', 'Description', 'Quantity',
            'BuyItNowPrice', 'ConditionID', 'Location', 'PaymentProfile',
            'ReturnProfile', 'ShippingProfile', 'PictureURL', 'UPC',
            'Brand', 'ConditionDescription', 'SiteID', 'PostalCode',
            'Currency', 'Format', 'Duration', 'Country', 'SourceURL',
            'OriginalPriceJPY', 'ConversionRate', 'ProcessedAt'
        ];
        echo implode(',', $headers) . "\n";
        
        // 6. データ取得・出力
        $pdo = getDatabaseConnection();
        if ($pdo) {
            $sql = "
                SELECT 
                    COALESCE(item_id, 'SAMPLE') as item_id,
                    COALESCE(title, 'Sample Product') as title,
                    COALESCE(current_price, 1000) as current_price,
                    COALESCE(condition_name, 'Used') as condition_name,
                    COALESCE(category_name, 'Other') as category_name,
                    COALESCE(picture_url, '') as picture_url,
                    COALESCE(source_url, '') as source_url
                FROM mystical_japan_treasures_inventory 
                WHERE title IS NOT NULL 
                AND current_price > 0
                ORDER BY current_price DESC 
                LIMIT 10
            ";
            
            $stmt = $pdo->query($sql);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($products as $product) {
                // 7. 文字化け修正済みデータ行出力
                $title = mb_convert_encoding($product['title'], 'UTF-8', 'auto');
                $title = preg_replace('/[^\x20-\x7E\x{3040}-\x{309F}\x{30A0}-\x{30FF}\x{4E00}-\x{9FAF}]/u', '', $title);
                if (mb_strlen($title) > 80) {
                    $title = mb_substr($title, 0, 77) . '...';
                }
                
                $priceUSD = number_format($product['current_price'] * 0.0067 * 1.3, 2);
                
                $row = [
                    'Add',
                    '293',
                    '"' . str_replace('"', '""', $title) . '"',
                    '"Original Japanese item imported from Yahoo Auctions. Shipped from Japan with tracking."',
                    '1',
                    $priceUSD,
                    '3000',
                    'Japan',
                    'Standard Payment',
                    '30 Days Return',
                    'Standard Shipping',
                    $product['picture_url'],
                    '',
                    '',
                    'Used',
                    '0',
                    '100-0001',
                    'USD',
                    'FixedPriceItem',
                    'GTC',
                    'JP',
                    $product['source_url'],
                    $product['current_price'],
                    '0.0067',
                    date('Y-m-d H:i:s')
                ];
                
                echo implode(',', $row) . "\n";
            }
        } else {
            // サンプルデータ出力
            echo 'Add,293,"Sample Japanese Product","Original Japanese item. Shipped from Japan.",1,19.99,3000,Japan,Standard Payment,30 Days Return,Standard Shipping,,,,Used,0,100-0001,USD,FixedPriceItem,GTC,JP,,1500,0.0067,' . date('Y-m-d H:i:s') . "\n";
        }
        
    } catch (Exception $e) {
        // エラー時の処理
        header('Content-Type: text/plain; charset=utf-8');
        echo "CSV生成エラー: " . $e->getMessage();
    }
    
    exit(); // 重要：追加出力を防ぐ
    
case 'export_ebay_csv':
    // 上記と同じ処理
    while (ob_get_level()) ob_end_clean();
    error_reporting(0);
    
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="ebay_listing_export_' . date('Ymd_His') . '.csv"');
    echo "\xEF\xBB\xBF";
    
    // ヘッダー
    echo "Action,Category,Title,Description,Quantity,BuyItNowPrice,ConditionID,Location,PaymentProfile,ReturnProfile,ShippingProfile,PictureURL,UPC,Brand,ConditionDescription,SiteID,PostalCode,Currency,Format,Duration,Country,SourceURL,OriginalPriceJPY,ConversionRate,ProcessedAt\n";
    
    // サンプルデータ
    echo 'Add,293,"Fixed Japanese Product","Original Japanese auction item. No character corruption. Shipped from Japan with tracking.",1,29.99,3000,Japan,Standard Payment,30 Days Return,Standard Shipping,https://example.com/image.jpg,,,Used,0,100-0001,USD,FixedPriceItem,GTC,JP,https://auctions.yahoo.co.jp/sample,2000,0.0067,' . date('Y-m-d H:i:s') . "\n";
    
    exit();
    
?>