<?php
/**
 * アルペングループ（ゴルフ5）実用版スクレイパー
 */

require_once __DIR__ . '/ProductionScraperBase.php';

class AlpenGolf5ProductionScraper extends ProductionScraperBase {
    
    protected function getScraperConfig() {
        return [
            'platform_name' => 'アルペン・ゴルフ5',
            'platform_id' => 'alpen_golf5',
            'base_url' => 'https://store.alpen-group.jp',
            'request_delay' => 2000,
            'timeout' => 30,
            'max_retries' => 5
        ];
    }
    
    protected function getPlatformName() {
        return 'alpen_golf5';
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
        if (!preg_match('/alpen-group\.jp/', $url)) {
            throw new InvalidArgumentException('無効なアルペンURL: ' . $url);
        }
    }
    
    protected function checkDuplicate($url) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM supplier_products 
            WHERE source_url = ? AND platform = 'alpen_golf5'
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
        if (strpos($url, '/206.aspx') !== false) {
            return '中古';
        }
        return '新品';
    }
    
    protected function extractDescription($html, $xpath, $url) {
        $selectors = [
            '.product-description',
            '.description',
            '[class*="detail"]'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractBrand($html, $xpath, $url) {
        $selectors = [
            '.brand-name',
            '[class*="brand"]'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractCategory($html, $xpath, $url) {
        $selectors = [
            '.breadcrumb',
            '[class*="category"]'
        ];
        
        return $this->extractBySelectors($xpath, $selectors) ?: 'ゴルフ用品';
    }
    
    protected function extractSellerInfo($html, $xpath, $url) {
        return 'アルペングループ（ゴルフ5）';
    }
    
    protected function extractAvailability($html, $xpath, $url) {
        if (preg_match('/(売り切れ|完売|在庫なし)/i', $html)) {
            return 'sold_out';
        }
        return 'available';
    }
    
    protected function extractPlatformSpecificData($html, $xpath, $url) {
        return [
            'page_type' => $this->detectPageType($url),
            'product_code' => $this->extractProductCode($url, $html)
        ];
    }
    
    protected function savePlatformSpecificData($productId, $data) {
        // additional_data に保存
    }
    
    private function detectPageType($url) {
        if (strpos($url, '/206.aspx') !== false) {
            return 'used';
        }
        return 'new';
    }
    
    private function extractProductCode($url, $html) {
        if (preg_match('/pid=([^&]+)/', $url, $matches)) {
            return $matches[1];
        }
        if (preg_match('/商品番号[：:\s]*([A-Z0-9\-]+)/i', $html, $matches)) {
            return $matches[1];
        }
        return '';
    }
}
?>