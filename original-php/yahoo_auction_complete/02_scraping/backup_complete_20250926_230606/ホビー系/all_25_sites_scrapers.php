<?php
/**
 * 25サイト完全対応 ホビー系ECサイトスクレイパー実装
 * 
 * 既存Yahoo/楽天パーサーの知見を活用した実装
 * 各サイトの実際のHTML構造を解析・対応
 * 
 * @version 2.0.0
 * @date 2025-09-26
 */

// ========================================
// 1. タカラトミーモール完全対応スクレイパー
// ========================================
class TakaraTomyMallScraper extends BaseHobbyScraper {
    
    protected function parseProductPage($html, $url) {
        $data = [];
        
        // 商品ID抽出: /shop/g/g4904810990604/
        if (preg_match('/\/g\/([^\/]+)/', $url, $matches)) {
            $data['platform_product_id'] = $matches[1];
        }
        
        // タイトル抽出（多段階）
        $title_patterns = [
            '/"name"\s*:\s*"([^"]+)"/i',  // JSON-LD
            '/<meta property="og:title" content="([^"]+)"/i',  // OGP
            '/<h1[^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)<\/h1>/i',
            '/<h1[^>]*>([^<]+)<\/h1>/i'
        ];
        
        foreach ($title_patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $data['title'] = trim(html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8'));
                break;
            }
        }
        
        // 価格抽出
        $price_patterns = [
            '/"price"\s*:\s*"?(\d{1,3}(?:,?\d{3})*)"?/i',
            '/<span[^>]*class="[^"]*price[^"]*"[^>]*>.*?¥?(\d{1,3}(?:,\d{3})*).*?<\/span>/is',
            '/価格[^\d]*(\d{1,3}(?:,\d{3})*)[\s]*円/i'
        ];
        
        $data['price'] = $this->extractPriceFromPatterns($html, $price_patterns);
        
        // 在庫状態
        if (preg_match('/class="[^"]*stock[^"]*"[^>]*>([^<]+)</i', $html, $matches)) {
            $stock_text = $matches[1];
            if (strpos($stock_text, '在庫あり') !== false) {
                $data['stock_status'] = 'in_stock';
            } elseif (strpos($stock_text, '品切れ') !== false || strpos($stock_text, '売り切れ') !== false) {
                $data['stock_status'] = 'out_of_stock';
            } elseif (strpos($stock_text, '予約') !== false) {
                $data['stock_status'] = 'preorder';
            }
        }
        
        // カートボタンチェック
        if (preg_match('/<button[^>]*add.*?cart[^>]*disabled/i', $html)) {
            $data['stock_status'] = 'out_of_stock';
        }
        
        // 画像抽出
        $data['images'] = $this->extractImages($html, [
            '/<img[^>]*class="[^"]*product[^"]*image[^"]*"[^>]*src="([^"]+)"/i',
            '/<img[^>]*src="([^"]*product[^"]*\.(jpg|png))"/i'
        ]);
        
        $data['url'] = $url;
        $data['brand'] = 'タカラトミー';
        $data['category'] = $this->extractBreadcrumb($html);
        $data['description'] = $this->extractDescription($html);
        
        return $data;
    }
}

// ========================================
// 2. バンダイホビーサイト完全対応
// ========================================
class BandaiHobbyScraper extends BaseHobbyScraper {
    
    protected function parseProductPage($html, $url) {
        $data = [];
        
        // バンダイは React/Vue SPA構造
        // JSON-LD優先抽出
        if (preg_match('/<script type="application\/ld\+json">(.+?)<\/script>/is', $html, $matches)) {
            $json_data = json_decode($matches[1], true);
            if ($json_data && isset($json_data['name'])) {
                $data['title'] = $json_data['name'];
                $data['price'] = isset($json_data['offers']['price']) ? (float)$json_data['offers']['price'] : 0;
                $data['images'] = isset($json_data['image']) ? (array)$json_data['image'] : [];
            }
        }
        
        // フォールバック: 通常HTML解析
        if (empty($data['title'])) {
            if (preg_match('/<h1[^>]*class="[^"]*item[^"]*name[^"]*"[^>]*>([^<]+)</i', $html, $matches)) {
                $data['title'] = trim($matches[1]);
            }
        }
        
        // 価格（バンダイ特有）
        if (empty($data['price'])) {
            if (preg_match('/<span[^>]*class="[^"]*price[^"]*value[^"]*"[^>]*>(\d+)</i', $html, $matches)) {
                $data['price'] = (float)$matches[1];
            }
        }
        
        // 在庫状態（data属性チ