<?php
/**
 * 拡張スクレイピングファクトリー
 * 
 * 既存プラットフォーム + 新規5プラットフォームの統合管理
 */

require_once __DIR__ . '/ProductionScraperFactory.php';
require_once __DIR__ . '/PokemonCenterProductionScraper.php';
require_once __DIR__ . '/YodobashiProductionScraper.php';
require_once __DIR__ . '/MonotaroProductionScraper.php';
require_once __DIR__ . '/SurugayaProductionScraper.php';
require_once __DIR__ . '/OffmallProductionScraper.php';

class ExtendedScraperFactory extends ProductionScraperFactory {
    
    public function createScraper($url) {
        // 新規プラットフォーム
        if (preg_match('/pokemoncenter-online\.com/', $url)) {
            return new PokemonCenterProductionScraper($this->pdo);
        }
        
        if (preg_match('/yodobashi\.com/', $url)) {
            return new YodobashiProductionScraper($this->pdo);
        }
        
        if (preg_match('/monotaro\.com/', $url)) {
            return new MonotaroProductionScraper($this->pdo);
        }
        
        if (preg_match('/suruga-ya\.jp/', $url)) {
            return new SurugayaProductionScraper($this->pdo);
        }
        
        if (preg_match('/(netmall\.hardoff\.co\.jp|hardoff\.co\.jp)/', $url)) {
            return new OffmallProductionScraper($this->pdo);
        }
        
        // 既存プラットフォームは親クラスに委譲
        return parent::createScraper($url);
    }
    
    public function getSupportedPlatforms() {
        $platforms = parent::getSupportedPlatforms();
        
        return array_merge($platforms, [
            'pokemon_center' => PokemonCenterProductionScraper::class,
            'yodobashi' => YodobashiProductionScraper::class,
            'monotaro' => MonotaroProductionScraper::class,
            'surugaya' => SurugayaProductionScraper::class,
            'offmall' => OffmallProductionScraper::class
        ]);
    }
    
    /**
     * プラットフォーム統計情報取得
     */
    public function getPlatformStatistics() {
        $platforms = $this->getSupportedPlatforms();
        $stats = [];
        
        foreach (array_keys($platforms) as $platformId) {
            $stmt = $this->pdo->prepare("
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN url_status = 'available' THEN 1 ELSE 0 END) as available,
                    SUM(CASE WHEN url_status = 'sold_out' THEN 1 ELSE 0 END) as sold_out,
                    AVG(purchase_price) as avg_price,
                    MAX(created_at) as last_added
                FROM supplier_products
                WHERE platform = ?
            ");
            $stmt->execute([$platformId]);
            $stats[$platformId] = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        return $stats;
    }
}

/**
 * 統合スクレイピングサービス（拡張版）
 */
class ExtendedScrapingService {
    private $factory;
    private $logger;
    
    public function __construct($pdo) {
        $this->factory = new ExtendedScraperFactory($pdo);
        $this->logger = new Logger('extended_scraping');
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
        $service = new ExtendedScrapingService($pdo);
        
        $testUrls = [
            "https://www.pokemoncenter-online.com/4521329400181.html",
            "https://www.yodobashi.com/product/100000001007471234/",
            "https://www.monotaro.com/g/00123456/",
            "https://www.suruga-ya.jp/product/detail/123456789",
            "https://netmall.hardoff.co.jp/product/ABC1234567890"
        ];
        
        echo "=== 拡張プラットフォームスクレイピングテスト ===\n\n";
        
        foreach ($testUrls as $url) {
            echo "処理中: {$url}\n";
            $result = $service->scrapeAnyPlatform($url, [
                'download_images' => true,
                'force' => false
            ]);
            
            if ($result['success']) {
                echo "✓ 成功 - ProductID: {$result['product_id']}\n";
                echo "  タイトル: " . ($result['data']['title'] ?? 'N/A') . "\n";
                echo "  価格: " . ($result['data']['price'] ?? 'N/A') . " 円\n";
            } else {
                echo "✗ 失敗 - {$result['error']}\n";
            }
            echo "\n";
        }
        
    } catch (Exception $e) {
        echo "エラー: " . $e->getMessage() . "\n";
    }
}
?>