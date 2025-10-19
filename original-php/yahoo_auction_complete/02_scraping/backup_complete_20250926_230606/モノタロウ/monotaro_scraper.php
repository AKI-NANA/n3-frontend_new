<?php
/**
 * モノタロウ実用版スクレイパー
 * 
 * ProductionScraperBaseを継承してモノタロウ固有の処理を実装
 * supplier_productsテーブルと完全連携
 */

require_once __DIR__ . '/ProductionScraperBase.php';

class MonotaroProductionScraper extends ProductionScraperBase {
    
    protected function getScraperConfig() {
        return [
            'platform_name' => 'モノタロウ',
            'platform_id' => 'monotaro',
            'base_url' => 'https://www.monotaro.com',
            'request_delay' => 2500,
            'timeout' => 30,
            'max_retries' => 5
        ];
    }
    
    protected function getPlatformName() {
        return 'monotaro';
    }
    
    protected function getTitleSelectors() {
        return [
            'h1.product-name',
            '.productTitle',
            'h1[class*="product"]',
            '.item-name',
            'meta[property="og:title"]'
        ];
    }
    
    protected function getPriceSelectors() {
        return [
            '.product-price .price',
            '.priceArea .price',
            'span[class*="price-value"]',
            '[itemprop="price"]'
        ];
    }
    
    protected function getImageSelectors() {
        return [
            '.product-image img',
            '.productImage img',
            'img[class*="main-image"]',
            'meta[property="og:image"]'
        ];
    }
    
    protected function validateUrl($url) {
        if (!preg_match('/monotaro\.com/', $url)) {
            throw new InvalidArgumentException('無効なモノタロウURL: ' . $url);
        }
    }
    
    protected function checkDuplicate($url) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM supplier_products 
            WHERE source_url = ? AND platform = 'monotaro'
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
        return '新品';
    }
    
    protected function extractDescription($html, $xpath, $url) {
        $selectors = [
            '.product-spec',
            '.productDescription',
            '[class*="description"]',
            '.feature-list'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractBrand($html, $xpath, $url) {
        $selectors = [
            '.brand-name',
            '.manufacturer',
            '[class*="brand"]',
            '.maker-name'
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
        $selectors = [
            '.breadcrumb',
            '.category-path',
            '[class*="breadcrumb"]'
        ];
        
        return $this->extractBySelectors($xpath, $selectors) ?: '工具・部品';
    }
    
    protected function extractSellerInfo($html, $xpath, $url) {
        return 'モノタロウ';
    }
    
    protected function extractAvailability($html, $xpath, $url) {
        $soldOutPatterns = [
            '/(在庫なし|品切れ|販売終了|取扱終了)/i',
            '/class="[^"]*out-of-stock[^"]*"/i'
        ];
        
        foreach ($soldOutPatterns as $pattern) {
            if (preg_match($pattern, $html)) {
                return 'sold_out';
            }
        }
        
        $stockSelectors = [
            '.stock-info',
            '.delivery-info',
            '[class*="stock"]'
        ];
        
        foreach ($stockSelectors as $selector) {
            $nodes = $xpath->query($this->cssToXpath($selector));
            if ($nodes->length > 0) {
                $stockText = trim($nodes->item(0)->textContent);
                if (preg_match('/(在庫あり|当日出荷)/i', $stockText)) {
                    return 'available';
                }
            }
        }
        
        return 'available';
    }
    
    protected function extractPlatformSpecificData($html, $xpath, $url) {
        return [
            'product_code' => $this->extractProductCode($url, $html),
            'min_order_qty' => $this->extractMinOrderQty($html),
            'delivery_days' => $this->extractDeliveryDays($html)
        ];
    }
    
    protected function savePlatformSpecificData($productId, $data) {
        // additional_data JSONフィールドに保存
    }
    
    private function extractProductCode($url, $html) {
        if (preg_match('/\/g\/(\d+)/', $url, $matches)) {
            return $matches[1];
        }
        
        if (preg_match('/商品番号[：:\s]*(\d+)/i', $html, $matches)) {
            return $matches[1];
        }
        
        return '';
    }
    
    private function extractMinOrderQty($html) {
        if (preg_match('/最小注文数[：:\s]*(\d+)/i', $html, $matches)) {
            return $matches[1];
        }
        return '1';
    }
    
    private function extractDeliveryDays($html) {
        if (preg_match('/出荷[：:\s]*([^<\n]+)/i', $html, $matches)) {
            return trim(strip_tags($matches[1]));
        }
        return '';
    }
}
?>