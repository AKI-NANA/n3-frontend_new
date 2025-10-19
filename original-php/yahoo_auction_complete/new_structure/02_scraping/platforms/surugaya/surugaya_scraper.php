<?php
/**
 * 駿河屋実用版スクレイパー
 * 
 * ProductionScraperBaseを継承して駿河屋固有の処理を実装
 * supplier_productsテーブルと完全連携
 */

require_once __DIR__ . '/ProductionScraperBase.php';

class SurugayaProductionScraper extends ProductionScraperBase {
    
    protected function getScraperConfig() {
        return [
            'platform_name' => '駿河屋',
            'platform_id' => 'surugaya',
            'base_url' => 'https://www.suruga-ya.jp',
            'request_delay' => 2000,
            'timeout' => 30,
            'max_retries' => 5
        ];
    }
    
    protected function getPlatformName() {
        return 'surugaya';
    }
    
    protected function getTitleSelectors() {
        return [
            'h1.title',
            '.product-name',
            'h1[class*="product"]',
            '.item-title',
            'meta[property="og:title"]'
        ];
    }
    
    protected function getPriceSelectors() {
        return [
            '.price strong',
            '.product-price',
            'span[class*="price"]',
            '[class*="price-value"]'
        ];
    }
    
    protected function getImageSelectors() {
        return [
            '.item_img img',
            '.product-image img',
            'img[class*="main"]',
            'meta[property="og:image"]'
        ];
    }
    
    protected function validateUrl($url) {
        if (!preg_match('/suruga-ya\.jp/', $url)) {
            throw new InvalidArgumentException('無効な駿河屋URL: ' . $url);
        }
    }
    
    protected function checkDuplicate($url) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM supplier_products 
            WHERE source_url = ? AND platform = 'surugaya'
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
            '[class*="state"]',
            '.product-condition'
        ];
        
        $condition = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($condition)) {
            $patterns = [
                '/(新品|中古|美品|難あり|ジャンク)/u',
                '/状態[：:\s]*([^<\n]+)/i'
            ];
            
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $html, $matches)) {
                    return trim($matches[1]);
                }
            }
        }
        
        return $condition ?: '中古';
    }
    
    protected function extractDescription($html, $xpath, $url) {
        $selectors = [
            '.product-detail',
            '[class*="description"]',
            '.item-description',
            '.detail-info'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractBrand($html, $xpath, $url) {
        $selectors = [
            '.maker',
            '.brand-name',
            '[class*="brand"]'
        ];
        
        $brand = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($brand)) {
            if (preg_match('/メーカー[：:\s]*([^<\n]+)/i', $html, $matches)) {
                return trim(strip_tags($matches[1]));
            }
        }
        
        return $brand;
    }
    
    protected function extractCategory($html, $xpath, $url) {
        $selectors = [
            '.breadcrumb',
            '.category-path',
            '[class*="category"]'
        ];
        
        $category = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($category)) {
            if (preg_match('/suruga-ya\.jp\/([^\/]+)\//', $url, $matches)) {
                $categoryMap = [
                    'product' => 'ホビー・ゲーム',
                    'book' => '書籍',
                    'game' => 'ゲーム',
                    'dvd' => 'DVD・ブルーレイ'
                ];
                return $categoryMap[$matches[1]] ?? $matches[1];
            }
        }
        
        return $category ?: 'その他';
    }
    
    protected function extractSellerInfo($html, $xpath, $url) {
        return '駿河屋';
    }
    
    protected function extractAvailability($html, $xpath, $url) {
        $soldOutPatterns = [
            '/(売り切れ|完売|在庫なし|SOLD)/i',
            '/class="[^"]*soldout[^"]*"/i',
            '/class="[^"]*stock-out[^"]*"/i'
        ];
        
        foreach ($soldOutPatterns as $pattern) {
            if (preg_match($pattern, $html)) {
                return 'sold_out';
            }
        }
        
        $stockSelectors = [
            '.stock-status',
            '[class*="stock"]',
            '.availability'
        ];
        
        foreach ($stockSelectors as $selector) {
            $nodes = $xpath->query($this->cssToXpath($selector));
            if ($nodes->length > 0) {
                $stockText = trim($nodes->item(0)->textContent);
                if (preg_match('/(在庫あり|販売中)/i', $stockText)) {
                    return 'available';
                }
            }
        }
        
        return 'available';
    }
    
    protected function extractPlatformSpecificData($html, $xpath, $url) {
        return [
            'product_code' => $this->extractProductCode($url, $html),
            'release_date' => $this->extractReleaseDate($html),
            'jan_code' => $this->extractJanCode($html)
        ];
    }
    
    protected function savePlatformSpecificData($productId, $data) {
        // additional_data JSONフィールドに保存
    }
    
    private function extractProductCode($url, $html) {
        if (preg_match('/\/detail\/([A-Z0-9\-]+)/', $url, $matches)) {
            return $matches[1];
        }
        
        if (preg_match('/商品コード[：:\s]*([A-Z0-9\-]+)/i', $html, $matches)) {
            return $matches[1];
        }
        
        return '';
    }
    
    private function extractReleaseDate($html) {
        if (preg_match('/発売日[：:\s]*(\d{4}年\d{1,2}月\d{1,2}日)/i', $html, $matches)) {
            return $matches[1];
        }
        return '';
    }
    
    private function extractJanCode($html) {
        if (preg_match('/JAN[：:\s]*(\d{13})/i', $html, $matches)) {
            return $matches[1];
        }
        return '';
    }
}
?>