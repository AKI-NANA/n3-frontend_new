<?php
/**
 * 各プラットフォーム実装クラス（実用版）
 * 
 * ProductionScraperBaseを継承して各プラットフォーム固有の処理を実装
 * 確実にデータを取得し、在庫管理システムと完全連携
 */

require_once __DIR__ . '/ProductionScraperBase.php';

/**
 * メルカリ実用版スクレイパー
 */
class MercariProductionScraper extends ProductionScraperBase {
    
    protected function getScraperConfig() {
        return [
            'platform_name' => 'メルカリ',
            'platform_id' => 'mercari',
            'base_url' => 'https://jp.mercari.com',
            'request_delay' => 3000,
            'timeout' => 30,
            'max_retries' => 5
        ];
    }
    
    protected function getPlatformName() {
        return 'mercari';
    }
    
    protected function getTitleSelectors() {
        return [
            'h1[data-testid="name"]',
            'h1.mer-heading',
            '.item-name',
            'h1[class*="ItemName"]'
        ];
    }
    
    protected function getPriceSelectors() {
        return [
            'span[data-testid="price"]',
            '.price-value',
            '[class*="Price"]',
            '.item-price'
        ];
    }
    
    protected function getImageSelectors() {
        return [
            'img[data-testid="product-image"]',
            '.product-photos img',
            '.item-photos img',
            'figure img'
        ];
    }
    
    protected function validateUrl($url) {
        if (!preg_match('/jp\.mercari\.com\/item\/m\d+/', $url)) {
            throw new InvalidArgumentException('無効なメルカリURL: ' . $url);
        }
    }
    
    protected function checkDuplicate($url) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM supplier_products 
            WHERE source_url = ? AND platform = 'mercari'
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
            '[data-testid="item-condition"]',
            '.item-condition',
            '.condition-label'
        ];
        
        $condition = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($condition)) {
            // 正規表現パターン
            $patterns = [
                '/(新品|未使用|目立った傷や汚れなし|やや傷や汚れあり|傷や汚れあり|全体的に状態が悪い)/',
                '/商品の状態[^>]*>([^<]+)/'
            ];
            
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $html, $matches)) {
                    return trim($matches[1]);
                }
            }
        }
        
        return $condition ?: '状態不明';
    }
    
    protected function extractDescription($html, $xpath, $url) {
        $selectors = [
            '[data-testid="description"]',
            '.item-description',
            '.product-description'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractBrand($html, $xpath, $url) {
        $selectors = [
            '[data-testid="brand"]',
            '.brand-name',
            '.item-brand'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractCategory($html, $xpath, $url) {
        $selectors = [
            '.breadcrumb',
            '[data-testid="breadcrumb"]',
            '.category-path'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractSellerInfo($html, $xpath, $url) {
        $selectors = [
            '[data-testid="seller-name"]',
            '.seller-info .name',
            '.user-name'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractAvailability($html, $xpath, $url) {
        // SOLD表示の検出
        $soldSelectors = [
            '[data-testid="item-sold-out-badge"]',
            '.sold-badge',
            '.item-sold'
        ];
        
        foreach ($soldSelectors as $selector) {
            $nodes = $xpath->query($this->cssToXpath($selector));
            if ($nodes->length > 0) {
                return 'sold_out';
            }
        }
        
        // テキストパターンでも確認
        if (preg_match('/(売り切れ|SOLD|完売)/i', $html)) {
            return 'sold_out';
        }
        
        return 'available';
    }
    
    protected function extractPlatformSpecificData($html, $xpath, $url) {
        return [
            'mercari_item_id' => $this->extractMercariItemId($url),
            'shipping_method' => $this->extractShippingMethod($html, $xpath),
            'size_info' => $this->extractSizeInfo($html, $xpath)
        ];
    }
    
    protected function savePlatformSpecificData($productId, $data) {
        // メルカリ固有データテーブルに保存
        $specific = $data['platform_specific'] ?? [];
        
        if (!empty($specific)) {
            $stmt = $this->pdo->prepare("
                INSERT INTO mercari_product_details (
                    supplier_product_id, mercari_item_id, shipping_method, size_info
                ) VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    shipping_method = VALUES(shipping_method),
                    size_info = VALUES(size_info)
            ");
            
            $stmt->execute([
                $productId,
                $specific['mercari_item_id'] ?? '',
                $specific['shipping_method'] ?? '',
                $specific['size_info'] ?? ''
            ]);
        }
    }
    
    private function extractMercariItemId($url) {
        if (preg_match('/\/item\/(m\d+)/', $url, $matches)) {
            return $matches[1];
        }
        return '';
    }
    
    private function extractShippingMethod($html, $xpath) {
        $selectors = [
            '[data-testid="shipping-method"]',
            '.shipping-info',
            '.delivery-method'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractSizeInfo($html, $xpath) {
        $selectors = [
            '[data-testid="size"]',
            '.size-info',
            '.item-size'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
}

/**
 * Yahoo！フリマ実用版スクレイパー
 */
class YahooFleaMarketProductionScraper extends ProductionScraperBase {
    
    protected function getScraperConfig() {
        return [
            'platform_name' => 'Yahoo！フリマ',
            'platform_id' => 'yahoo_fleamarket',
            'base_url' => 'https://paypayfleamarket.yahoo.co.jp',
            'request_delay' => 2000,
            'timeout' => 30,
            'max_retries' => 5
        ];
    }
    
    protected function getPlatformName() {
        return 'yahoo_fleamarket';
    }
    
    protected function getTitleSelectors() {
        return [
            'h1[data-testid="item-name"]',
            'h1.ItemName',
            '.p-item-detail-title',
            'h1.item-name'
        ];
    }
    
    protected function getPriceSelectors() {
        return [
            '[data-testid="price"]',
            '.p-item-detail-price',
            '.ItemPrice',
            '.price-area'
        ];
    }
    
    protected function getImageSelectors() {
        return [
            'img[data-testid="product-image"]',
            '.p-item-images img',
            '.ItemImages img',
            '.product-image img'
        ];
    }
    
    protected function validateUrl($url) {
        if (!preg_match('/paypayfleamarket\.yahoo\.co\.jp\/item/', $url)) {
            throw new InvalidArgumentException('無効なYahoo！フリマURL: ' . $url);
        }
    }
    
    protected function checkDuplicate($url) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM supplier_products 
            WHERE source_url = ? AND platform = 'yahoo_fleamarket'
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
            '[data-testid="item-condition"]',
            '.p-condition',
            '.ItemCondition'
        ];
        
        return $this->extractBySelectors($xpath, $selectors) ?: '状態不明';
    }
    
    protected function extractDescription($html, $xpath, $url) {
        $selectors = [
            '[data-testid="description"]',
            '.p-item-description',
            '.ItemDescription'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractBrand($html, $xpath, $url) {
        return ''; // Yahoo！フリマではブランド情報が少ない
    }
    
    protected function extractCategory($html, $xpath, $url) {
        $selectors = [
            '.p-breadcrumb',
            '.Breadcrumb',
            '[data-testid="breadcrumb"]'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractSellerInfo($html, $xpath, $url) {
        $selectors = [
            '[data-testid="seller-name"]',
            '.p-seller-info .name',
            '.SellerInfo'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractAvailability($html, $xpath, $url) {
        $soldSelectors = [
            '.sold-out',
            '.p-sold-badge',
            '[data-testid="sold-out"]'
        ];
        
        foreach ($soldSelectors as $selector) {
            $nodes = $xpath->query($this->cssToXpath($selector));
            if ($nodes->length > 0) {
                return 'sold_out';
            }
        }
        
        return 'available';
    }
    
    protected function extractPlatformSpecificData($html, $xpath, $url) {
        return [
            'yahoo_fleamarket_item_id' => $this->extractItemId($url),
            'shipping_info' => $this->extractShippingInfo($html, $xpath)
        ];
    }
    
    protected function savePlatformSpecificData($productId, $data) {
        // Yahoo！フリマ固有データの保存は additional_data で対応
    }
    
    private function extractItemId($url) {
        if (preg_match('/\/item\/([a-zA-Z0-9_\-]+)/', $url, $matches)) {
            return $matches[1];
        }
        return '';
    }
    
    private function extractShippingInfo($html, $xpath) {
        $selectors = [
            '.p-shipping-info',
            '.ShippingInfo',
            '[data-testid="shipping"]'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
}

/**
 * セカンドストリート実用版スクレイパー
 */
class SecondStreetProductionScraper extends ProductionScraperBase {
    
    protected function getScraperConfig() {
        return [
            'platform_name' => 'セカンドストリート',
            'platform_id' => 'second_street',
            'request_delay' => 2500,
            'timeout' => 30,
            'max_retries' => 5
        ];
    }
    
    protected function getPlatformName() {
        return 'second_street';
    }
    
    protected function getTitleSelectors() {
        return [
            'h1.product-title',
            'h1[class*="title"]',
            '.item-title',
            '.product-name',
            'h1.product_name'
        ];
    }
    
    protected function getPriceSelectors() {
        return [
            '.price-value',
            '[class*="price"]',
            '.item-price',
            '.product-price',
            '[data-price]'
        ];
    }
    
    protected function getImageSelectors() {
        return [
            '.product-images img',
            '.item-images img',
            '.gallery img',
            '[class*="image"] img'
        ];
    }
    
    protected function validateUrl($url) {
        $validPatterns = [
            '/2ndstreet\.jp/',
            '/golf-kace\.com/',
            '/ec\.golf-kace\.com/'
        ];
        
        $isValid = false;
        foreach ($validPatterns as $pattern) {
            if (preg_match($pattern, $url)) {
                $isValid = true;
                break;
            }
        }
        
        if (!$isValid) {
            throw new InvalidArgumentException('無効なセカンドストリートURL: ' . $url);
        }
    }
    
    protected function checkDuplicate($url) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM supplier_products 
            WHERE source_url = ? AND platform = 'second_street'
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
            '[class*="condition"]',
            '.item-condition',
            '.product-condition',
            '.grade',
            '[class*="rank"]'
        ];
        
        $condition = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($condition)) {
            // セカンドストリート特有のランクパターン
            $patterns = [
                '/(新品|美品|良品|可|ジャンク)/u',
                '/([ABC])ランク/',
                '/状態[：\s]*([^<\n]+)/'
            ];
            
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $html, $matches)) {
                    return trim($matches[1]);
                }
            }
        }
        
        return $condition ?: '状態不明';
    }
    
    protected function extractDescription($html, $xpath, $url) {
        $selectors = [
            '[class*="description"]',
            '.product-desc',
            '.item-description',
            '.product-detail'
        ];
        
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    protected function extractBrand($html, $xpath, $url) {
        $selectors = [
            '[class*="brand"]',
            '.product-brand',
            '.item-brand',
            '.maker'
        ];
        
        $brand = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($brand)) {
            // 正規表現パターン
            $patterns = [
                '/ブランド[：\s]*([^<\n]+)/i',
                '/メーカー[：\s]*([^<\n]+)/i'
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
            '.product-category'
        ];
        
        return $this->extractBySelectors($xpath, $selectors) ?: 'その他';
    }
    
    protected function extractSellerInfo($html, $xpath, $url) {
        $selectors = [
            '[class*="shop"]',
            '.store-info',
            '[class*="store"]'
        ];
        
        $shopInfo = $this->extractBySelectors($xpath, $selectors);
        
        // URLから店舗情報を抽出
        if (empty($shopInfo) && preg_match('/shops\[\]=(\d+)/', $url, $matches)) {
            $shopInfo = '店舗ID: ' . $matches[1];
        }
        
        return $shopInfo;
    }
    
    protected function extractAvailability($html, $xpath, $url) {
        $soldPatterns = [
            '/(売り切れ|完売|SOLD|品切れ|在庫なし)/i',
            '/class="[^"]*sold[^"]*"/i',
            '/class="[^"]*unavailable[^"]*"/i'
        ];
        
        foreach ($soldPatterns as $pattern) {
            if (preg_match($pattern, $html)) {
                return 'sold_out';
            }
        }
        
        return 'available';
    }
    
    protected function extractPlatformSpecificData($html, $xpath, $url) {
        return [
            'site_type' => $this->detectSiteType($url),
            'shop_id' => $this->extractShopId($url),
            'golf_specs' => $this->extractGolfSpecs($html)
        ];
    }
    
    protected function savePlatformSpecificData($productId, $data) {
        // セカンドストリート固有データの保存は additional_data で対応
    }
    
    private function detectSiteType($url) {
        if (strpos($url, 'golf-kace.com') !== false) {
            return strpos($url, 'ec.') !== false ? 'golf_ec' : 'golf_site';
        }
        return 'main_site';
    }
    
    private function extractShopId($url) {
        if (preg_match('/shops\[\]=(\d+)/', $url, $matches)) {
            return $matches[1];
        }
        return '';
    }
    
    private function extractGolfSpecs($html) {
        $specs = [];
        
        $patterns = [
            'loft' => '/ロフト[：\s]*(\d+\.?\d*)/',
            'shaft' => '/シャフト[：\s]*([^<\n]+)/',
            'club_type' => '/(ドライバー|フェアウェイウッド|アイアン|パター)/'
        ];
        
        foreach ($patterns as $key => $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $specs[$key] = trim($matches[1]);
            }
        }
        
        return $specs;
    }
}

/**
 * スクレイピングファクトリークラス
 */
class ProductionScraperFactory {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function createScraper($url) {
        if (preg_match('/jp\.mercari\.com/', $url)) {
            return new MercariProductionScraper($this->pdo);
        }
        
        if (preg_match('/paypayfleamarket\.yahoo\.co\.jp/', $url)) {
            return new YahooFleaMarketProductionScraper($this->pdo);
        }
        
        if (preg_match('/(2ndstreet\.jp|golf-kace\.com)/', $url)) {
            return new SecondStreetProductionScraper($this->pdo);
        }
        
        throw new InvalidArgumentException('未対応のプラットフォーム: ' . $url);
    }
    
    public function getSupportedPlatforms() {
        return [
            'mercari' => MercariProductionScraper::class,
            'yahoo_fleamarket' => YahooFleaMarketProductionScraper::class,
            'second_street' => SecondStreetProductionScraper::class
        ];
    }
}

/**
 * 統合スクレイピングサービス
 */
class UnifiedScrapingService {
    private $factory;
    private $logger;
    
    public function __construct($pdo) {
        $this->factory = new ProductionScraperFactory($pdo);
        $this->logger = new Logger('unified_scraping');
    }
    
    /**
     * 任意のプラットフォームの商品をスクレイピング
     */
    public function scrapeAnyPlatform($url, $options = []) {
        try {
            $scraper = $this->factory->createScraper($url);
            return $scraper->scrapeProduct($url, $options);
            
        } catch (Exception $e) {
            $this->logger->error("統合スクレイピングエラー: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'url' => $url
            ];
        }
    }
    
    /**
     * 複数プラットフォームの一括処理
     */
    public function scrapeBatch($urls, $options = []) {
        $results = [];
        $platformGroups = [];
        
        // プラットフォーム別にグループ化
        foreach ($urls as $url) {
            try {
                $scraper = $this->factory->createScraper($url);
                $platformName = $scraper->getPlatformName();
                $platformGroups[$platformName][] = $url;
            } catch (Exception $e) {
                $results[] = [
                    'success' => false,
                    'error' => $e->getMessage(),
                    'url' => $url
                ];
            }
        }
        
        // プラットフォーム別に最適化処理
        foreach ($platformGroups as $platform => $platformUrls) {
            $scraper = $this->factory->createScraper($platformUrls[0]);
            $processor = new ProductionBatchProcessor($scraper);
            $batchResult = $processor->processBatch($platformUrls, $options);
            $results = array_merge($results, $batchResult['results']);
        }
        
        return [
            'total' => count($urls),
            'results' => $results,
            'summary' => $this->generateBatchSummary($results)
        ];
    }
    
    private function generateBatchSummary($results) {
        $summary = [
            'total' => count($results),
            'successful' => 0,
            'failed' => 0,
            'duplicates' => 0,
            'platforms' => []
        ];
        
        foreach ($results as $result) {
            if ($result['success']) {
                $summary['successful']++;
                if ($result['duplicate'] ?? false) {
                    $summary['duplicates']++;
                }
                $platform = $result['platform'] ?? 'unknown';
                $summary['platforms'][$platform] = ($summary['platforms'][$platform] ?? 0) + 1;
            } else {
                $summary['failed']++;
            }
        }
        
        return $summary;
    }
}

// 使用例
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    try {
        $pdo = getDbConnection();
        $service = new UnifiedScrapingService($pdo);
        
        $testUrls = [
            "https://jp.mercari.com/item/m12345678901",
            "https://paypayfleamarket.yahoo.co.jp/item/abc123",
            "https://www.2ndstreet.jp/buy",
            "https://golf-kace.com/"
        ];
        
        echo "=== 統合スクレイピングサービステスト ===\n";
        
        $result = $service->scrapeBatch($testUrls, [
            'download_images' => true,
            'force' => false
        ]);
        
        echo "処理結果:\n";
        echo "- 総数: {$result['summary']['total']}\n";
        echo "- 成功: {$result['summary']['successful']}\n";
        echo "- 失敗: {$result['summary']['failed']}\n";
        echo "- 重複: {$result['summary']['duplicates']}\n";
        echo "- プラットフォーム別: " . json_encode($result['summary']['platforms']) . "\n";
        
    } catch (Exception $e) {
        echo "エラー: " . $e->getMessage() . "\n";
    }
}

?>