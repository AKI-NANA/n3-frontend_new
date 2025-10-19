<?php
/**
 * 複数ゴルフサイト対応統合スクレイパー
 * 
 * 対応サイト:
 * - ゴルフエフォート (golfeffort.com)
 * - Yゴルフリユース (y-golf-reuse.com)
 * - ニキゴルフ (nikigolf.co.jp)
 * - レオナード (reonard.com)
 * - STST中古 (stst-used.jp)
 * - アフターゴルフ (aftergolf.net)
 * - ゴルフケース (golf-kace.com)
 */

require_once __DIR__ . '/ProductionScraperBase.php';

class MultiGolfSitesProductionScraper extends ProductionScraperBase {
    
    private $detectedSite = '';
    
    protected function getScraperConfig() {
        return [
            'platform_name' => '統合ゴルフサイト',
            'platform_id' => 'multi_golf_sites',
            'request_delay' => 2000,
            'timeout' => 30,
            'max_retries' => 5
        ];
    }
    
    protected function getPlatformName() {
        return $this->detectedSite ?: 'multi_golf_sites';
    }
    
    protected function validateUrl($url) {
        $supportedDomains = [
            'golfeffort.com',
            'y-golf-reuse.com',
            'nikigolf.co.jp',
            'reonard.com',
            'stst-used.jp',
            'aftergolf.net',
            'golf-kace.com'
        ];
        
        $isValid = false;
        foreach ($supportedDomains as $domain) {
            if (strpos($url, $domain) !== false) {
                $isValid = true;
                $this->detectedSite = $this->detectSiteFromUrl($url);
                break;
            }
        }
        
        if (!$isValid) {
            throw new InvalidArgumentException('未対応のゴルフサイトURL: ' . $url);
        }
    }
    
    protected function getTitleSelectors() {
        return [
            'h1.product-name',
            'h1.item-name',
            '.product-title',
            'h1[class*="title"]',
            'h1[class*="product"]',
            'meta[property="og:title"]'
        ];
    }
    
    protected function getPriceSelectors() {
        return [
            '.product-price',
            '.item-price',
            '.price-value',
            'span[class*="price"]',
            '[class*="price-value"]',
            '[itemprop="price"]'
        ];
    }
    
    protected function getImageSelectors() {
        return [
            '.product-image img',
            '.item-image img',
            '.main-image img',
            'img[class*="product"]',
            'meta[property="og:image"]'
        ];
    }
    
    protected function checkDuplicate($url) {
        $platform = $this->detectedSite ?: 'multi_golf_sites';
        $stmt = $this->pdo->prepare("
            SELECT * FROM supplier_products 
            WHERE source_url = ? AND platform = ?
        ");
        $stmt->execute([$url, $platform]);
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
            '[class*="rank"]',
            '.product-condition'
        ];
        
        $condition = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($condition)) {
            $patterns = [
                '/(新品|未使用|美品|良品|可|A\+|A|B|C|D|S|ジャンク)/u',
                '/ランク[：:\s]*([SABCD]\+?)/i',
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
            '.item-description',
            '[class*="description"]',
            '.product-detail',
            '[class*="spec"]'
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
            $patterns = [
                '/ブランド[：:\s]*([^<\n]+)/i',
                '/メーカー[：:\s]*([^<\n]+)/i'
            ];
            
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $html, $matches)) {
                    return trim(strip_tags($matches[1]));
                }
            }
        }
        
        return $brand;
    }
    
    protected function extractCategory($html, $xpath, $url) {
        $selectors = [
            '.breadcrumb',
            '[class*="category"]',
            '.category-path'
        ];
        
        return $this->extractBySelectors($xpath, $selectors) ?: 'ゴルフ用品';
    }
    
    protected function extractSellerInfo($html, $xpath, $url) {
        $siteMap = [
            'golfeffort.com' => 'ゴルフエフォート',
            'y-golf-reuse.com' => 'Yゴルフリユース',
            'nikigolf.co.jp' => 'ニキゴルフ',
            'reonard.com' => 'レオナード',
            'stst-used.jp' => 'STST中古',
            'aftergolf.net' => 'アフターゴルフ',
            'golf-kace.com' => 'ゴルフケース'
        ];
        
        foreach ($siteMap as $domain => $name) {
            if (strpos($url, $domain) !== false) {
                return $name;
            }
        }
        
        return '統合ゴルフサイト';
    }
    
    protected function extractAvailability($html, $xpath, $url) {
        $soldOutPatterns = [
            '/(売り切れ|完売|SOLD|在庫なし|品切れ)/i',
            '/class="[^"]*sold[^"]*"/i',
            '/class="[^"]*unavailable[^"]*"/i'
        ];
        
        foreach ($soldOutPatterns as $pattern) {
            if (preg_match($pattern, $html)) {
                return 'sold_out';
            }
        }
        
        return 'available';
    }
    
    protected function extractPlatformSpecificData($html, $xpath, $url) {
        return [
            'site_name' => $this->detectSiteFromUrl($url),
            'golf_specs' => $this->extractGolfSpecs($html, $xpath),
            'product_code' => $this->extractProductCode($url, $html)
        ];
    }
    
    protected function savePlatformSpecificData($productId, $data) {
        // additional_data に保存
    }
    
    private function detectSiteFromUrl($url) {
        $siteMap = [
            'golfeffort.com' => 'golf_effort',
            'y-golf-reuse.com' => 'y_golf_reuse',
            'nikigolf.co.jp' => 'niki_golf',
            'reonard.com' => 'reonard',
            'stst-used.jp' => 'stst_used',
            'aftergolf.net' => 'after_golf',
            'golf-kace.com' => 'golf_kace'
        ];
        
        foreach ($siteMap as $domain => $code) {
            if (strpos($url, $domain) !== false) {
                return $code;
            }
        }
        
        return 'multi_golf_sites';
    }
    
    private function extractGolfSpecs($html, $xpath) {
        $specs = [];
        
        $patterns = [
            'club_type' => '/(ドライバー|フェアウェイウッド|ユーティリティ|アイアン|ウェッジ|パター)/u',
            'loft' => '/ロフト[：:\s]*(\d+\.?\d*)/',
            'flex' => '/フレックス[：:\s]*(R|S|SR|X|L|R2|S2)/',
            'shaft' => '/シャフト[：:\s]*([^<\n]{3,50})/',
            'length' => '/長さ[：:\s]*(\d+\.?\d*)/',
            'weight' => '/重さ[：:\s]*(\d+)/'
        ];
        
        foreach ($patterns as $key => $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $specs[$key] = trim($matches[1]);
            }
        }
        
        return $specs;
    }
    
    private function extractProductCode($url, $html) {
        // URL パターン
        $urlPatterns = [
            '/\/products?\/([A-Z0-9\-_]+)/',
            '/\/item\/([A-Z0-9\-_]+)/',
            '/pid=([^&]+)/',
            '/id=([^&]+)/'
        ];
        
        foreach ($urlPatterns as $pattern) {
            if (preg_match($pattern, $url, $matches)) {
                return $matches[1];
            }
        }
        
        // HTML パターン
        $htmlPatterns = [
            '/商品番号[：:\s]*([A-Z0-9\-_]+)/i',
            '/商品コード[：:\s]*([A-Z0-9\-_]+)/i',
            '/品番[：:\s]*([A-Z0-9\-_]+)/i'
        ];
        
        foreach ($htmlPatterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                return $matches[1];
            }
        }
        
        return '';
    }
}
?>