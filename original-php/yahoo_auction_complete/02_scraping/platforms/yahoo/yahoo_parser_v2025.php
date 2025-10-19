<?php
/**
 * 2025年版 Yahoo オークション構造ベーススクレイピング
 * クラス名に依存せず、HTML構造で抽出
 */

function parseYahooAuctionHTML_V2025($html, $url, $item_id) {
    try {
        writeLog("構造ベース解析開始: {$item_id}", 'INFO');
        
        // HTMLエンティティのデコード
        $html = html_entity_decode($html, ENT_QUOTES, 'UTF-8');
        
        // 1. タイトル抽出（h1タグ内の最長テキスト）
        $title = 'タイトル取得失敗';
        if (preg_match_all('/<h1[^>]*>([^<]+)<\/h1>/i', $html, $title_matches)) {
            foreach ($title_matches[1] as $candidate) {
                $candidate = trim(strip_tags($candidate));
                if (strlen($candidate) > strlen($title) && strlen($candidate) > 10) {
                    $title = $candidate;
                }
            }
        }
        
        // タイトルクリーンアップ
        $title = str_replace([' - Yahoo!オークション', 'Yahoo!オークション - ', ' | ヤフオク!'], '', $title);
        writeLog("タイトル抽出: " . substr($title, 0, 50) . "...", 'SUCCESS');
        
        // 2. 価格抽出（構造パターン - 即決価格を優先）
        $current_price = 0;
        $price_patterns = [
            // 即決価格（最優先）
            '/即決[^0-9]*(\d{1,3}(?:,\d{3})*)[\s]*円/u',
            '/(\d{1,3}(?:,\d{3})*)[\s]*<!--[^>]*-->[\s]*円/u', // HTMLコメント付き価格
            '/現在価格[^0-9]*(\d{1,3}(?:,\d{3})*)[\s]*円/u',
            '/価格[^0-9]*(\d{1,3}(?:,\d{3})*)[\s]*円/u',
            // 一般的な価格パターン
            '/(\d{1,3}(?:,\d{3})*)[\s]*円[\s]*（税/u',
            '/¥[\s]*(\d{1,3}(?:,\d{3})*)/u',
            '/(\d{1,3}(?:,\d{3})*)[\s]*円/u'
        ];
        
        foreach ($price_patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $price_num = (int)str_replace(',', '', $matches[1]);
                if ($price_num > 0) {
                    $current_price = $price_num;
                    writeLog("価格抽出成功: ¥{$current_price}", 'SUCCESS');
                    break;
                }
            }
        }
        
        // 3. 画像URL抽出（構造ベース - imgタグからYahoo画像サーバーを抽出）
        $images = [];
        
        // Yahoo オークション画像の特徴的なパターン
        $image_patterns = [
            // Yahoo画像サーバーの基本パターン
            '/src="(https:\/\/auctions\.c\.yimg\.jp[^"]+)"/i',
            '/src="(https:\/\/[^"]*yimg\.jp[^"]*auctions[^"]+)"/i',
            '/src="(https:\/\/[^"]*auction[^"]*yimg[^"]+)"/i',
            // data-src属性も確認
            '/data-src="(https:\/\/auctions\.c\.yimg\.jp[^"]+)"/i',
            '/data-src="(https:\/\/[^"]*yimg\.jp[^"]*auctions[^"]+)"/i'
        ];
        
        foreach ($image_patterns as $pattern) {
            if (preg_match_all($pattern, $html, $matches)) {
                foreach ($matches[1] as $img_url) {
                    // 重複チェック & 有効性チェック
                    if (!in_array($img_url, $images) && 
                        !strpos($img_url, 'placeholder') &&
                        !strpos($img_url, 'loading') &&
                        !strpos($img_url, 'na_170x170') && // サムネイル除外
                        strpos($img_url, 'http') === 0) {
                        $images[] = $img_url;
                    }
                }
            }
        }
        
        // 画像が見つからない場合、より広範囲で検索
        if (empty($images)) {
            // より汎用的なパターン
            $fallback_patterns = [
                '/src="([^"]+\/image\/dr[^"]+)"/i', // Yahoo画像の特徴的パス
                '/src="([^"]+\/user\/[^"]+\/i-img[^"]+)"/i', // ユーザー画像パス
                '/src="([^"]+\.(jpg|jpeg|png|gif)[^"]*)"[^>]*alt="[^"]*ポケモン/i' // ポケモン関連画像
            ];
            
            foreach ($fallback_patterns as $pattern) {
                if (preg_match_all($pattern, $html, $matches)) {
                    foreach ($matches[1] as $img_url) {
                        if (!in_array($img_url, $images) && strpos($img_url, 'http') === 0) {
                            $images[] = $img_url;
                        }
                    }
                }
            }
        }
        
        writeLog("画像抽出完了: " . count($images) . "枚", count($images) > 0 ? 'SUCCESS' : 'WARNING');
        
        // 4. 入札数抽出（構造ベース）
        $bid_count = 0;
        $bid_patterns = [
            '/(\d+)[\s]*<!--[^>]*-->[\s]*件/u', // HTMLコメント付き件数
            '/入札[\s\S]*?(\d+)[\s]*件/u',
            '/(\d+)[\s]*件/u' // 一般的な件数パターン
        ];
        
        foreach ($bid_patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $bid_count = (int)$matches[1];
                writeLog("入札数抽出成功: {$bid_count}件", 'SUCCESS');
                break;
            }
        }
        
        // 5. カテゴリ抽出（パンくずリストから）
        $category = 'ポケモンカードゲーム'; // デフォルト
        if (preg_match('/ポケモンカードゲーム/u', $html)) {
            $category = 'ポケモンカードゲーム';
        } elseif (preg_match('/トレーディングカード/u', $html)) {
            $category = 'トレーディングカード';
        }
        
        // 6. 商品状態抽出
        $condition = 'Used';
        if (preg_match('/目立った傷や汚れなし/u', $html)) {
            $condition = 'Excellent';
        } elseif (preg_match('/新品|未使用|未開封/u', $html)) {
            $condition = 'New';
        } elseif (preg_match('/傷や汚れあり|ジャンク/u', $html)) {
            $condition = 'Poor';
        }
        
        // 7. 出品者名抽出（構造ベース）
        $seller_name = '出品者不明';
        if (preg_match('/>([^<]+)[\s]*さん</', $html, $matches)) {
            $seller_name = trim($matches[1]);
        } elseif (preg_match('/seller\/[^"]*>([^<]+)</', $html, $matches)) {
            $seller_name = trim($matches[1]);
        }
        
        // 8. 終了時間抽出
        $end_time = date('Y-m-d H:i:s', strtotime('+7 days'));
        if (preg_match('/(\d{1,2})月(\d{1,2})日[^0-9]*(\d{1,2})時(\d{1,2})分[^0-9]*終了/u', $html, $matches)) {
            $year = date('Y');
            $end_time = sprintf('%04d-%02d-%02d %02d:%02d:00', 
                $year, $matches[1], $matches[2], $matches[3], $matches[4]);
        }
        
        $product_data = [
            'item_id' => $item_id,
            'title' => $title,
            'description' => mb_substr($title, 0, 200, 'UTF-8'),
            'current_price' => $current_price,
            'condition' => $condition,
            'category' => $category,
            'images' => $images,
            'seller_info' => [
                'name' => $seller_name,
                'rating' => 'N/A'
            ],
            'auction_info' => [
                'end_time' => $end_time,
                'bid_count' => $bid_count
            ],
            'scraped_at' => date('Y-m-d H:i:s'),
            'source_url' => $url,
            'scraping_method' => 'structure_based_v2025'
        ];
        
        writeLog("構造ベース解析完了: {$title} - ¥{$current_price} (画像" . count($images) . "枚)", 'SUCCESS');
        
        // データベースに保存（重要）
        writeLog("🔄 [データベース保存開始] 解析済みデータをデータベースに保存します", 'INFO');
        $save_result = saveProductToDatabase($product_data);
        
        if ($save_result) {
            writeLog("✅ [データベース保存成功] 商品データが正常に保存されました: {$item_id}", 'SUCCESS');
            $product_data['database_saved'] = true;
            $product_data['save_status'] = 'success';
        } else {
            writeLog("❌ [データベース保存失敗] 商品データの保存に失敗しました: {$item_id}", 'ERROR');
            $product_data['database_saved'] = false;
            $product_data['save_status'] = 'failed';
        }
        
        return $product_data;
        
    } catch (Exception $e) {
        writeLog("構造ベース解析例外: " . $e->getMessage(), 'ERROR');
        return false;
    }
}

echo "✅ 2025年版構造ベーススクレイピング関数読み込み完了\n";
?>
