<?php
/**
 * ゴルフキッズ実用版スクレイパー
 */

require_once __DIR__ . '/ProductionScraperBase.php';

class GolfKidsProductionScraper extends ProductionScraperBase {
    
    protected function getScraperConfig() {
        return [
            'platform_name' => 'ゴルフキッズ',
            'platform_id' => 'golf_kids',
            'base_url' => 'https://shop.golfkids.co.jp',
            'request_delay' => 2000,
            'timeout' => 30,
            'max_retries' => 5
        ];
    }
    
    protected function getPlatformName() {
        return 'golf_kids';
    }
    
    protected function getTitleSelectors() {
        return [
            'h1.product-name',
            '.product-title',
            'h1[class*="title"]',
            'meta[property="og:title"]'
        ];
    }
    
    protected function getPriceSelectors() {
        return [
            '.product-price',
            '.price-value',
            'span[class*="price"]',
            '[itemprop="price"]'
        ];
    }
    
    protected function getImageSelectors() {
        return [
            '.product-image img',
            '.main-image img',
            'meta[property="og:image"]'
        ];
    }
    
    protected function validateUrl($url) {
        if (!preg_match('/golfkids\.co\.jp/', $url)) {
            throw new InvalidArgumentException('無効なゴルフキッズURL: ' . $url);
        }
    }
    
    protected function checkDuplicate($url) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM supplier_products 
            WHERE source_url = ? AND platform = 'golf_kids'
        ");
        $stmt->execute([$url]);
        return $stmt->fetch();
    }
    
    protected function handleDuplicate($existingProduct, $url) {
        return [
            'success' => true,
            'duplicate' => true,
            'product_id' => $existingProduct['id'],
            'message' => '既存の商品です'
        ];
    }
    
    protected function extractCondition($html, $xpath, $url) {
        $selectors = [
            '.condition',
            '[class*="grade"]'
        ];
        
        $condition = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($condition)) {
            if (preg_match('/(新品|中古|美品|Aランク|Bランク|Cランク)/u', $html, $matches)) {
                return $matches[1];
            }
        }
        
        return $condition ?: '中古';
    }
    
    protected function extractDescription($html, $xpath, $url) {
        $selectors = [
            '.product-description',
            '.description',
            '[class*="spec"]'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractBrand($html, $xpath, $url) {
        $selectors = [
            '.brand-name',
            '.maker'
        ];
        
        $brand = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($brand)) {
            if (preg_match('/ブランド[：:\s]*([^<\n]+)/i', $html, $matches)) {
                return trim(strip_tags($matches[1]));
            }
        }
        
        return $brand;
    }
    
    protected function extractCategory($html, $xpath, $url) {
        return 'ゴルフ用品';
    }
    
    protected function extractSellerInfo($html, $xpath, $url) {
        return 'ゴルフキッズ';
    }
    
    protected function extractAvailability($html, $xpath, $url) {
        if (preg_match('/(売り切れ|完売|在庫なし)/i', $html)) {
            return 'sold_out';
        }
        return 'available';
    }
    
    protected function extractPlatformSpecificData($html, $xpath, $url) {
        return [
            'golf_specs' => $this->extractGolfSpecs($html, $xpath)
        ];
    }
    
    protected function savePlatformSpecificData($productId, $data) {
        // additional_data に保存
    }
    
    private function extractGolfSpecs($html, $xpath) {
        $specs = [];
        
        $patterns = [
            'club_type' => '/(ドライバー|FW|UT|アイアン|ウェッジ|パター)/',
            'flex' => '/フレックス[：:\s]*(R|S|SR|X|L)/',
            'loft' => '/ロフト[：:\s]*(\d+\.?\d*)/'
        ];
        
        foreach ($patterns as $key => $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $specs[$key] = $matches[1];
            }
        }
        
        return $specs;
    }
}
?>