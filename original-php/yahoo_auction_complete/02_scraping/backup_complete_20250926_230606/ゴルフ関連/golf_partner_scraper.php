<?php
/**
 * ゴルフパートナー実用版スクレイパー
 */

require_once __DIR__ . '/ProductionScraperBase.php';

class GolfPartnerProductionScraper extends ProductionScraperBase {
    
    protected function getScraperConfig() {
        return [
            'platform_name' => 'ゴルフパートナー',
            'platform_id' => 'golf_partner',
            'base_url' => 'https://www.golfpartner.jp',
            'request_delay' => 2000,
            'timeout' => 30,
            'max_retries' => 5
        ];
    }
    
    protected function getPlatformName() {
        return 'golf_partner';
    }
    
    protected function getTitleSelectors() {
        return [
            'h1.product-name',
            '.item-title',
            'h1[class*="title"]',
            'meta[property="og:title"]'
        ];
    }
    
    protected function getPriceSelectors() {
        return [
            '.product-price',
            '.price-value',
            'span[class*="price"]',
            '.item-price'
        ];
    }
    
    protected function getImageSelectors() {
        return [
            '.product-image img',
            '.item-image img',
            'meta[property="og:image"]'
        ];
    }
    
    protected function validateUrl($url) {
        if (!preg_match('/golfpartner\.jp/', $url)) {
            throw new InvalidArgumentException('無効なゴルフパートナーURL: ' . $url);
        }
    }
    
    protected function checkDuplicate($url) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM supplier_products 
            WHERE source_url = ? AND platform = 'golf_partner'
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
            '[class*="rank"]',
            '.grade'
        ];
        
        $condition = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($condition)) {
            if (preg_match('/(新品|A\+|A|B|C|D|ジャンク)/u', $html, $matches)) {
                return $matches[1];
            }
        }
        
        return $condition ?: '中古';
    }
    
    protected function extractDescription($html, $xpath, $url) {
        $selectors = [
            '.product-description',
            '.item-detail',
            '[class*="spec"]'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractBrand($html, $xpath, $url) {
        $selectors = [
            '.brand',
            '.maker-name'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractCategory($html, $xpath, $url) {
        if (strpos($url, '/used/') !== false) {
            return '中古ゴルフクラブ';
        }
        return 'ゴルフ用品';
    }
    
    protected function extractSellerInfo($html, $xpath, $url) {
        return 'ゴルフパートナー';
    }
    
    protected function extractAvailability($html, $xpath, $url) {
        if (preg_match('/(売り切れ|完売|SOLD)/i', $html)) {
            return 'sold_out';
        }
        return 'available';
    }
    
    protected function extractPlatformSpecificData($html, $xpath, $url) {
        return [
            'club_specs' => $this->extractClubSpecs($html),
            'store_code' => $this->extractStoreCode($url, $html)
        ];
    }
    
    protected function savePlatformSpecificData($productId, $data) {
        // additional_data に保存
    }
    
    private function extractClubSpecs($html) {
        $specs = [];
        
        $patterns = [
            'loft' => '/ロフト[：:\s]*(\d+\.?\d*)/',
            'flex' => '/フレックス[：:\s]*(R|S|SR|X|L)/',
            'shaft' => '/シャフト[：:\s]*([^<\n]+)/',
            'length' => '/長さ[：:\s]*(\d+\.?\d*)/'
        ];
        
        foreach ($patterns as $key => $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $specs[$key] = trim($matches[1]);
            }
        }
        
        return $specs;
    }
    
    private function extractStoreCode($url, $html) {
        if (preg_match('/store[=\/](\d+)/', $url, $matches)) {
            return $matches[1];
        }
        return '';
    }
}
?>