<?php
/**
 * メルカリショップス実用版スクレイパー
 */

require_once __DIR__ . '/ProductionScraperBase.php';

class MercariShopsProductionScraper extends ProductionScraperBase {
    
    protected function getScraperConfig() {
        return [
            'platform_name' => 'メルカリショップス',
            'platform_id' => 'mercari_shops',
            'base_url' => 'https://mercari-shops.com',
            'request_delay' => 2500,
            'timeout' => 30,
            'max_retries' => 5
        ];
    }
    
    protected function getPlatformName() {
        return 'mercari_shops';
    }
    
    protected function getTitleSelectors() {
        return [
            'h1[data-testid="product-name"]',
            'h1.product-name',
            '.item-name',
            'meta[property="og:title"]'
        ];
    }
    
    protected function getPriceSelectors() {
        return [
            '[data-testid="product-price"]',
            '.product-price',
            '.price-value',
            'meta[property="product:price:amount"]'
        ];
    }
    
    protected function getImageSelectors() {
        return [
            'img[data-testid="product-image"]',
            '.product-image img',
            'meta[property="og:image"]'
        ];
    }
    
    protected function validateUrl($url) {
        if (!preg_match('/(mercari-shops\.com|shop\.[^\/]+\.co\.jp)/', $url)) {
            throw new InvalidArgumentException('無効なメルカリショップスURL: ' . $url);
        }
    }
    
    protected function checkDuplicate($url) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM supplier_products 
            WHERE source_url = ? AND platform = 'mercari_shops'
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
            '[data-testid="condition"]',
            '.product-condition',
            '.condition-label'
        ];
        
        return $this->extractBySelectors($xpath, $selectors) ?: '新品';
    }
    
    protected function extractDescription($html, $xpath, $url) {
        $selectors = [
            '[data-testid="description"]',
            '.product-description',
            '.description-text'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractBrand($html, $xpath, $url) {
        $selectors = [
            '.brand-name',
            '[data-testid="brand"]'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractCategory($html, $xpath, $url) {
        $selectors = [
            '.breadcrumb',
            '[data-testid="breadcrumb"]'
        ];
        
        return $this->extractBySelectors($xpath, $selectors) ?: 'その他';
    }
    
    protected function extractSellerInfo($html, $xpath, $url) {
        $selectors = [
            '[data-testid="shop-name"]',
            '.shop-name'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractAvailability($html, $xpath, $url) {
        if (preg_match('/(売り切れ|SOLD|完売)/i', $html)) {
            return 'sold_out';
        }
        return 'available';
    }
    
    protected function extractPlatformSpecificData($html, $xpath, $url) {
        return [
            'shop_id' => $this->extractShopId($url),
            'product_id' => $this->extractProductId($url)
        ];
    }
    
    protected function savePlatformSpecificData($productId, $data) {
        // additional_data に保存
    }
    
    private function extractShopId($url) {
        if (preg_match('/shop\/([^\/]+)/', $url, $matches)) {
            return $matches[1];
        }
        return '';
    }
    
    private function extractProductId($url) {
        if (preg_match('/items?\/([^\/\?]+)/', $url, $matches)) {
            return $matches[1];
        }
        return '';
    }
}
?>