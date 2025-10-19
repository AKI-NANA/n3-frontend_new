<?php
/**
 * 2025年版 楽天市場 構造ベーススクレイピング
 * HTML構造で商品情報を抽出
 * 
 * 作成日: 2025-09-25
 * 用途: 楽天市場商品ページから商品データを抽出
 */

/**
 * 楽天商品ページHTMLを解析して商品データを抽出
 * 
 * @param string $html 楽天商品ページのHTML
 * @param string $url 楽天商品ページのURL
 * @param string $item_id 商品ID
 * @return array 抽出された商品データ
 */
function parseRakutenProductHTML_V2025($html, $url, $item_id) {
    try {
        writeLog("楽天商品構造解析開始: {$item_id}", 'INFO');
        
        // HTMLエンティティのデコード
        $html = html_entity_decode($html, ENT_QUOTES, 'UTF-8');
        
        // 1. タイトル抽出（楽天特有のパターン）
        $title = '商品名取得失敗';
        $title_patterns = [
            // JSON-LDからの抽出（最優先）
            '/"name"\s*:\s*"([^"]+)"/i',
            // meta property="og:title"からの抽出
            '/<meta\s+property="og:title"\s+content="([^"]+)"/i',
            // h1タグからの抽出
            '/<h1[^>]*>([^<]+)<\/h1>/i',
            // titleタグからの抽出（楽天市場部分を除去）
            '/<title>([^【]*?)【楽天市場】/i',
            '/<title>([^】]*?)】/i'
        ];
        
        foreach ($title_patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $candidate = trim(strip_tags($matches[1]));
                if (strlen($candidate) > 10 && strlen($candidate) > strlen($title)) {
                    $title = $candidate;
                    break;
                }
            }
        }
        
        // タイトルクリーンアップ
        $title = preg_replace('/\s*【楽天市場】.*$/', '', $title);
        $title = preg_replace('/\s*：.*$/', '', $title);
        writeLog("タイトル抽出: " . substr($title, 0, 50) . "...", 'SUCCESS');
        
        // 2. 価格抽出（楽天特有のパターン）
        $current_price = 0;
        $price_patterns = [
            // JSON-LDからの価格抽出（最優先）
            '/"price"\s*:\s*"?(\d{1,3}(?:,?\d{3})*)"?/i',
            '/"priceRange"\s*:\s*"?(\d{1,3}(?:,?\d{3})*)"?/i',
            // span要素の価格（楽天の一般的なパターン）
            '/<span[^>]*price[^>]*>.*?(\d{1,3}(?:,\d{3})*).*?円/i',
            // div要素の価格
            '/<div[^>]*price[^>]*>.*?(\d{1,3}(?:,\d{3})*).*?円/i',
            // 価格表示の一般的なパターン
            '/価格[^\d]*(\d{1,3}(?:,\d{3})*)[\s]*円/i',
            '/\¥[\s]*(\d{1,3}(?:,\d{3})*)/i',
            // 税込み価格パターン
            '/(\d{1,3}(?:,\d{3})*)[\s]*円[\s]*（税込）/i',
            '/(\d{1,3}(?:,\d{3})*)[\s]*円[\s]*税込/i',
            // 汎用価格パターン
            '/(\d{1,3}(?:,\d{3})*)[\s]*円/i'
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
        
        // 3. 画像URL抽出（楽天特有のパターン）
        $images = [];
        
        // 楽天画像サーバーの特徴的なパターン
        $image_patterns = [
            // 楽天画像サーバーの基本パターン
            '/src="(https:\/\/thumbnail\.image\.rakuten\.co\.jp[^"]+)"/i',
            '/src="(https:\/\/image\.rakuten\.co\.jp[^"]+)"/i',
            '/src="(https:\/\/shop\d+\.r10s\.jp[^"]+)"/i',
            '/src="(https:\/\/r\.r10s\.jp[^"]+)"/i',
            // data-src属性も確認
            '/data-src="(https:\/\/thumbnail\.image\.rakuten\.co\.jp[^"]+)"/i',
            '/data-src="(https:\/\/image\.rakuten\.co\.jp[^"]+)"/i',
            // JSON-LDからの画像URL抽出
            '/"image"\s*:\s*"([^"]+)"/i'
        ];
        
        foreach ($image_patterns as $pattern) {
            if (preg_match_all($pattern, $html, $matches)) {
                foreach ($matches[1] as $img_url) {
                    // 重複チェック & 有効性チェック
                    if (!in_array($img_url, $images) && 
                        !strpos($img_url, 'placeholder') &&
                        !strpos($img_url, 'loading') &&
                        !strpos($img_url, '_s.jpg') && // 小さいサムネイル除外
                        strpos($img_url, 'http') === 0) {
                        $images[] = $img_url;
                    }
                }
            }
        }
        
        // 画像が見つからない場合の追加検索
        if (empty($images)) {
            $fallback_patterns = [
                '/src="([^"]+\.(jpg|jpeg|png|gif)[^"]*)"[^>]*alt="[^"]*商品/i',
                '/src="([^"]+cabinet[^"]+\.(jpg|jpeg|png|gif)[^"]*)"/i'
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
        
        // 4. 商品説明抽出（楽天特有のパターン）
        $description = '';
        $desc_patterns = [
            // JSON-LDからの説明抽出
            '/"description"\s*:\s*"([^"]+)"/i',
            // meta descriptionからの抽出
            '/<meta\s+name="description"\s+content="([^"]+)"/i',
            // 商品説明エリアからの抽出
            '/<div[^>]*商品説明[^>]*>([^<]+)/i',
            '/<div[^>]*description[^>]*>([^<]+)/i'
        ];
        
        foreach ($desc_patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $candidate = trim(strip_tags($matches[1]));
                if (strlen($candidate) > strlen($description)) {
                    $description = $candidate;
                }
            }
        }
        
        // 5. 店舗情報抽出
        $seller_info = [
            'shop_name' => '',
            'shop_id' => ''
        ];
        
        // 店舗名抽出パターン
        $shop_patterns = [
            '/<a[^>]*shop[^>]*>([^<]+)<\/a>/i',
            '/：([^：]+)$/',  // タイトル末尾の店舗名
            '/【([^】]+)】$/' // 【店舗名】パターン
        ];
        
        foreach ($shop_patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $shop_candidate = trim(strip_tags($matches[1]));
                if (strlen($shop_candidate) > 0) {
                    $seller_info['shop_name'] = $shop_candidate;
                    break;
                }
            }
        }
        
        // URLから店舗IDを抽出
        if (preg_match('/item\.rakuten\.co\.jp\/([^\/]+)\//', $url, $matches)) {
            $seller_info['shop_id'] = $matches[1];
        }
        
        // 6. カテゴリー情報抽出（楽天のパンくずリストから）
        $categories = [];
        $category_patterns = [
            '/<nav[^>]*breadcrumb[^>]*>.*?<\/nav>/is',
            '/<ul[^>]*breadcrumb[^>]*>.*?<\/ul>/is',
            '/<ol[^>]*breadcrumb[^>]*>.*?<\/ol>/is'
        ];
        
        foreach ($category_patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                // リンクテキストを抽出
                if (preg_match_all('/<a[^>]*>([^<]+)<\/a>/i', $matches[0], $cat_matches)) {
                    foreach ($cat_matches[1] as $cat) {
                        $cat = trim(strip_tags($cat));
                        if (strlen($cat) > 0 && $cat !== 'TOP' && $cat !== 'トップ') {
                            $categories[] = $cat;
                        }
                    }
                }
                break;
            }
        }
        
        // 7. レビュー・評価情報抽出
        $rating_info = [
            'average_rating' => 0,
            'review_count' => 0
        ];
        
        // 評価パターン
        $rating_patterns = [
            '/"ratingValue"\s*:\s*"?([0-9.]+)"?/i',
            '/評価[\s\S]*?([0-9.]+)[\s\S]*?点/i'
        ];
        
        foreach ($rating_patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $rating_info['average_rating'] = floatval($matches[1]);
                break;
            }
        }
        
        // レビュー数パターン
        $review_patterns = [
            '/"reviewCount"\s*:\s*"?(\d+)"?/i',
            '/(\d+)[\s]*件[\s]*のレビュー/i',
            '/レビュー[\s\S]*?(\d+)[\s]*件/i'
        ];
        
        foreach ($review_patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $rating_info['review_count'] = intval($matches[1]);
                break;
            }
        }
        
        // 8. 配送情報抽出
        $shipping_info = [
            'shipping_cost' => '',
            'delivery_time' => ''
        ];
        
        // 送料パターン
        if (preg_match('/送料[\s\S]*?(\d+)[\s]*円/i', $html, $matches)) {
            $shipping_info['shipping_cost'] = $matches[1] . '円';
        } elseif (preg_match('/送料無料/i', $html)) {
            $shipping_info['shipping_cost'] = '無料';
        }
        
        // お届け時間パターン
        if (preg_match('/お届け[\s\S]*?(\d+)[\s]*日/i', $html, $matches)) {
            $shipping_info['delivery_time'] = $matches[1] . '日';
        }
        
        // 最終データ構築
        $scraped_data = [
            'platform' => 'rakuten',
            'item_id' => $item_id,
            'url' => $url,
            'title' => $title,
            'current_price' => $current_price,
            'description' => $description,
            'images' => $images,
            'seller_info' => $seller_info,
            'categories' => $categories,
            'rating_info' => $rating_info,
            'shipping_info' => $shipping_info,
            'scraped_at' => date('Y-m-d H:i:s'),
            'extraction_method' => 'rakuten_structure_based_v2025'
        ];
        
        writeLog("楽天商品解析完了: {$title}", 'SUCCESS');
        return $scraped_data;
        
    } catch (Exception $e) {
        writeLog("楽天商品解析エラー: " . $e->getMessage(), 'ERROR');
        return [
            'platform' => 'rakuten',
            'item_id' => $item_id,
            'url' => $url,
            'title' => '解析エラー',
            'current_price' => 0,
            'description' => '',
            'images' => [],
            'seller_info' => ['shop_name' => '', 'shop_id' => ''],
            'categories' => [],
            'rating_info' => ['average_rating' => 0, 'review_count' => 0],
            'shipping_info' => ['shipping_cost' => '', 'delivery_time' => ''],
            'scraped_at' => date('Y-m-d H:i:s'),
            'extraction_method' => 'rakuten_structure_based_v2025_error',
            'error' => $e->getMessage()
        ];
    }
}

/**
 * 楽天商品URLから商品IDを抽出
 * 
 * @param string $url 楽天商品ページURL
 * @return string 商品ID
 */
function extractRakutenItemId($url) {
    // URL例: https://item.rakuten.co.jp/shop-id/item-id/
    if (preg_match('/item\.rakuten\.co\.jp\/[^\/]+\/([^\/]+)/', $url, $matches)) {
        return $matches[1];
    }
    
    // フォールバック: URLの最後の部分を使用
    $parts = explode('/', rtrim($url, '/'));
    return end($parts);
}

/**
 * 楽天URLかどうかを判定
 * 
 * @param string $url URL
 * @return bool 楽天URLかどうか
 */
function isRakutenUrl($url) {
    return strpos($url, 'rakuten.co.jp') !== false;
}

/**
 * 楽天APIを使用したデータ取得（将来の拡張用）
 * 
 * @param string $item_id 商品ID
 * @return array|null APIから取得したデータ
 */
function fetchRakutenApiData($item_id) {
    // 将来的に楽天APIを使用する場合のプレースホルダー
    // 現時点では楽天APIのアプリケーションID取得が必要
    writeLog("楽天API機能は将来実装予定", 'INFO');
    return null;
}

/**
 * 楽天商品データを検証
 * 
 * @param array $data スクレイピングされたデータ
 * @return bool データが有効かどうか
 */
function validateRakutenData($data) {
    // 必須フィールドの存在チェック
    $required_fields = ['title', 'current_price', 'url'];
    
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            writeLog("楽天データ検証失敗: {$field}が不足", 'WARNING');
            return false;
        }
    }
    
    // 価格の妥当性チェック
    if ($data['current_price'] <= 0) {
        writeLog("楽天データ検証失敗: 価格が無効", 'WARNING');
        return false;
    }
    
    // タイトルの長さチェック
    if (strlen($data['title']) < 5) {
        writeLog("楽天データ検証失敗: タイトルが短すぎる", 'WARNING');
        return false;
    }
    
    return true;
}

writeLog("✅ 楽天パーサー v2025 読み込み完了", 'SUCCESS');
?>