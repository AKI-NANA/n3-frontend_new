<?php
/**
 * オフモール（ハードオフ）実用版スクレイパー
 * 
 * ProductionScraperBaseを継承してオフモール固有の処理を実装
 * supplier_productsテーブルと完全連携
 */

require_once __DIR__ . '/ProductionScraperBase.php';

class OffmallProductionScraper extends ProductionScraperBase {
    
    protected function getScraperConfig() {
        return [
            'platform_name' => 'オフモール',
            'platform_id' => 'offmall',
            'base_url' => 'https://netmall.hardoff.co.jp',
            'request_delay' => 2000,
            'timeout' => 30,
            'max_retries' => 5
        ];
    }
    
    protected function getPlatformName() {
        return 'offmall';
    }
    
    protected function getTitleSelectors() {
        return [
            'h1.product-name',
            '.product-title',
            'h1[class*="item-name"]',
            '.item-title',
            'meta[property="og:title"]'
        ];
    }
    
    protected function getPriceSelectors() {
        return [
            '.product-price .price',
            '.price-value',
            'span[class*="price"]',
            '[class*="price-amount"]'
        ];
    }
    
    protected function getImageSelectors() {
        return [
            '.product-image-main img',
            '.item-image img',
            'img[class*="product"]',
            'meta[property="og:image"]'
        ];
    }
    
    protected function validateUrl($url) {
        if (!preg_match('/(netmall\.hardoff\.co\.jp|hardoff\.co\.jp)/', $url)) {
            throw new InvalidArgumentException('無効なオフモールURL: ' . $url);
        }
    }
    
    protected function checkDuplicate($url) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM supplier_products 
            WHERE source_url = ? AND platform = 'offmall'
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
            '[class*="grade"]',
            '.product-condition',
            '[class*="rank"]'
        ];
        
        $condition = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($condition)) {
            $patterns = [
                '/(未使用|Aランク|Bランク|Cランク|Dランク|ジャンク)/u',
                '/ランク[：:\s]*([ABCD])/i',
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
            '.product-description',
            '[class*="description"]',
            '.item-detail',
            '.product-spec'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractBrand($html, $xpath, $url) {
        $selectors = [
            '.brand-name',
            '[class*="brand"]',
            '.maker-name',
            '.manufacturer'
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
        
        $category = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($category)) {
            $categoryPatterns = [
                'hardoff' => 'ハードオフ（家電）',
                'offhouse' => 'オフハウス（生活用品）',
                'bookoff' => 'ブックオフ（書籍）',
                'hobbyoff' => 'ホビーオフ（ホビー）',
                'modeoff' => 'モードオフ（衣類）'
            ];
            
            foreach ($categoryPatterns as $pattern => $name) {
                if (stripos($url, $pattern) !== false) {
                    return $name;
                }
            }
        }
        
        return $category ?: 'その他';
    }
    
    protected function extractSellerInfo($html, $xpath, $url) {
        $selectors = [
            '.shop-name',
            '[class*="store-name"]',
            '.seller-info'
        ];
        
        $shopInfo = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($shopInfo)) {
            if (preg_match('/店舗[：:\s]*([^<\n]+)/i', $html, $matches)) {
                return trim(strip_tags($matches[1]));
            }
        }
        
        return $shopInfo ?: 'ハードオフグループ';
    }
    
    protected function extractAvailability($html, $xpath, $url) {
        $soldOutPatterns = [
            '/(売り切れ|完売|SOLD|在庫なし)/i',
            '/class="[^"]*soldout[^"]*"/i',
            '/class="[^"]*sold[^"]*"/i'
        ];
        
        foreach ($soldOutPatterns as $pattern) {
            if (preg_match($pattern, $html)) {
                return 'sold_out';
            }
        }
        
        $stockSelectors = [
            '.stock-status',
            '[class*="availability"]',
            '.product-stock'
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
            'store_name' => $this->extractStoreName($html, $xpath),
            'shop_category' => $this->extractShopCategory($url)
        ];
    }
    
    protected function savePlatformSpecificData($productId, $data) {
        // additional_data JSONフィールドに保存
    }
    
    private function extractProductCode($url, $html) {
        if (preg_match('/\/([A-Z0-9]{10,})/', $url, $matches)) {
            return $matches[1];
        }
        
        if (preg_match('/商品番号[：:\s]*([A-Z0-9]+)/i', $html, $matches)) {
            return $matches[1];
        }
        
        return '';
    }
    
    private function extractStoreName($html, $xpath) {
        $selectors = [
            '.shop-name',
            '[class*="store"]',
            '.seller-name'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractShopCategory($url) {
        $categories = [
            'hardoff' => 'ハードオフ',
            'offhouse' => 'オフハウス',
            'bookoff' => 'ブックオフ',
            'hobbyoff' => 'ホビーオフ',
            'modeoff' => 'モードオフ',
            'garageoff' => 'ガレージオフ'
        ];
        
        foreach ($categories as $key => $name) {
            if (stripos($url, $key) !== false) {
                return $name;
            }
        }
        
        return 'その他';
    }
}
?>