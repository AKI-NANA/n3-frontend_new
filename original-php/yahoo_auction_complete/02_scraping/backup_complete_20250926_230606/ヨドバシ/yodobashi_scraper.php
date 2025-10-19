<?php
/**
 * ヨドバシ実用版スクレイパー
 * 
 * ProductionScraperBaseを継承してヨドバシ固有の処理を実装
 * supplier_productsテーブルと完全連携
 */

require_once __DIR__ . '/ProductionScraperBase.php';

class YodobashiProductionScraper extends ProductionScraperBase {
    
    protected function getScraperConfig() {
        return [
            'platform_name' => 'ヨドバシ',
            'platform_id' => 'yodobashi',
            'base_url' => 'https://www.yodobashi.com',
            'request_delay' => 2000,
            'timeout' => 30,
            'max_retries' => 5
        ];
    }
    
    protected function getPlatformName() {
        return 'yodobashi';
    }
    
    protected function getTitleSelectors() {
        return [
            'h1.pName',
            '.productName',
            'h1[class*="product-name"]',
            '.item-name',
            'meta[property="og:title"]'
        ];
    }
    
    protected function getPriceSelectors() {
        return [
            '.productPrice .price',
            '.pPrice',
            'span[class*="price"]',
            '[itemprop="price"]',
            '.product-price strong'
        ];
    }
    
    protected function getImageSelectors() {
        return [
            '#js_imageMain img',
            '.productImage img',
            'img[class*="product-image"]',
            'meta[property="og:image"]'
        ];
    }
    
    protected function validateUrl($url) {
        if (!preg_match('/yodobashi\.com/', $url)) {
            throw new InvalidArgumentException('無効なヨドバシURL: ' . $url);
        }
    }
    
    protected function checkDuplicate($url) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM supplier_products 
            WHERE source_url = ? AND platform = 'yodobashi'
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
            '.productExplanation',
            '.product-description',
            '[class*="description"]',
            '.productSpec'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractBrand($html, $xpath, $url) {
        $selectors = [
            '.productMaker a',
            '.brand-name',
            '[class*="brand"]',
            '.manufacturer'
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
            '.categoryPath',
            '[class*="breadcrumb"]'
        ];
        
        return $this->extractBySelectors($xpath, $selectors) ?: 'その他';
    }
    
    protected function extractSellerInfo($html, $xpath, $url) {
        return 'ヨドバシカメラ';
    }
    
    protected function extractAvailability($html, $xpath, $url) {
        $soldOutPatterns = [
            '/(在庫なし|品切れ|完売|販売終了)/i',
            '/class="[^"]*soldout[^"]*"/i'
        ];
        
        foreach ($soldOutPatterns as $pattern) {
            if (preg_match($pattern, $html)) {
                return 'sold_out';
            }
        }
        
        $stockSelectors = [
            '.stockStatus',
            '.availability',
            '[class*="stock"]'
        ];
        
        foreach ($stockSelectors as $selector) {
            $nodes = $xpath->query($this->cssToXpath($selector));
            if ($nodes->length > 0) {
                $stockText = trim($nodes->item(0)->textContent);
                if (preg_match('/(在庫あり|24時間以内に出荷)/i', $stockText)) {
                    return 'available';
                }
            }
        }
        
        return 'available';
    }
    
    protected function extractPlatformSpecificData($html, $xpath, $url) {
        return [
            'product_code' => $this->extractProductCode($url, $html),
            'jan_code' => $this->extractJanCode($html),
            'points' => $this->extractPoints($html, $xpath)
        ];
    }
    
    protected function savePlatformSpecificData($productId, $data) {
        // additional_data JSONフィールドに保存
    }
    
    private function extractProductCode($url, $html) {
        if (preg_match('/\/pd\/(\d+)/', $url, $matches)) {
            return $matches[1];
        }
        
        if (preg_match('/商品コード[：:\s]*(\d+)/i', $html, $matches)) {
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
    
    private function extractPoints($html, $xpath) {
        $selectors = [
            '.productPoint',
            '.point-value',
            '[class*="point"]'
        ];
        
        $points = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($points)) {
            if (preg_match('/(\d+)ポイント/i', $html, $matches)) {
                return $matches[1];
            }
        }
        
        return $points;
    }
}
?>