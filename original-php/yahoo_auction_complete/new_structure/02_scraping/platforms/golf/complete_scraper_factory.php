<?php
/**
 * 完全統合スクレイピングファクトリー
 * 
 * 全18プラットフォーム対応
 */

require_once __DIR__ . '/ExtendedScraperFactory.php';
require_once __DIR__ . '/MercariShopsProductionScraper.php';
require_once __DIR__ . '/GolfKidsProductionScraper.php';
require_once __DIR__ . '/GolfPartnerProductionScraper.php';
require_once __DIR__ . '/AlpenGolf5ProductionScraper.php';
require_once __DIR__ . '/MultiGolfSitesProductionScraper.php';

class CompleteScraperFactory extends ExtendedScraperFactory {
    
    public function createScraper($url) {
        // メルカリショップス
        if (preg_match('/(mercari-shops\.com|shop\.[^\/]+\.co\.jp)/', $url)) {
            return new MercariShopsProductionScraper($this->pdo);
        }
        
        // ゴルフキッズ
        if (preg_match('/golfkids\.co\.jp/', $url)) {
            return new GolfKidsProductionScraper($this->pdo);
        }
        
        // ゴルフパートナー
        if (preg_match('/golfpartner\.jp/', $url)) {
            return new GolfPartnerProductionScraper($this->pdo);
        }
        
        // アルペン・ゴルフ5
        if (preg_match('/alpen-group\.jp/', $url)) {
            return new AlpenGolf5ProductionScraper($this->pdo);
        }
        
        // 複数ゴルフサイト
        $golfSites = [
            'golfeffort.com',
            'y-golf-reuse.com',
            'nikigolf.co.jp',
            'reonard.com',
            'stst-used.jp',
            'aftergolf.net',
            'golf-kace.com'
        ];
        
        foreach ($golfSites as $site) {
            if (strpos($url, $site) !== false) {
                return new MultiGolfSitesProductionScraper($this->pdo);
            }
        }
        
        // 既存プラットフォーム（親クラス）
        return parent::createScraper($url);
    }
    
    public function getSupportedPlatforms() {
        $platforms = parent::getSupportedPlatforms();
        
        return array_merge($platforms, [
            'mercari_shops' => MercariShopsProductionScraper::class,
            'golf_kids' => GolfKidsProductionScraper::class,
            'golf_partner' => GolfPartnerProductionScraper::class,
            'alpen_golf5' => AlpenGolf5ProductionScraper::class,
            'golf_effort' => MultiGolfSitesProductionScraper::class,
            'y_golf_reuse' => MultiGolfSitesProductionScraper::class,
            'niki_golf' => MultiGolfSitesProductionScraper::class,
            'reonard' => MultiGolfSitesProductionScraper::class,
            'stst_used' => MultiGolfSitesProductionScraper::class,
            'after_golf' => MultiGolfSitesProductionScraper::class,
            'golf_kace' => MultiGolfSitesProductionScraper::class
        ]);
    }
    
    /**
     * プラットフォーム情報取得（日本語名含む）
     */
    public function getPlatformInfo() {
        return [
            // 既存プラットフォーム
            'mercari' => ['name' => 'メルカリ', 'category' => 'フリマ'],
            'yahoo_fleamarket' => ['name' => 'Yahoo！フリマ', 'category' => 'フリマ'],
            'second_street' => ['name' => 'セカンドストリート', 'category' => 'リユース'],
            'pokemon_center' => ['name' => 'ポケモンセンター', 'category' => '公式ショップ'],
            'yodobashi' => ['name' => 'ヨドバシ', 'category' => '家電量販店'],
            'monotaro' => ['name' => 'モノタロウ', 'category' => '工具・部品'],
            'surugaya' => ['name' => '駿河屋', 'category' => 'ホビー'],
            'offmall' => ['name' => 'オフモール', 'category' => 'リユース'],
            
            // 新規プラットフォーム
            'mercari_shops' => ['name' => 'メルカリショップス', 'category' => 'フリマ'],
            'golf_kids' => ['name' => 'ゴルフキッズ', 'category' => 'ゴルフ'],
            'golf_partner' => ['name' => 'ゴルフパートナー', 'category' => 'ゴルフ'],
            'alpen_golf5' => ['name' => 'アルペン・ゴルフ5', 'category' => 'ゴルフ'],
            'golf_effort' => ['name' => 'ゴルフエフォート', 'category' => 'ゴルフ'],
            'y_golf_reuse' => ['name' => 'Yゴルフリユース', 'category' => 'ゴルフ'],
            'niki_golf' => ['name' => 'ニキゴルフ', 'category' => 'ゴルフ'],
            'reonard' => ['name' => 'レオナード', 'category' => 'ゴルフ'],
            'stst_used' => ['name' => 'STST中古', 'category' => 'ゴルフ'],
            'after_golf' => ['name' => 'アフターゴルフ', 'category' => 'ゴルフ'],
            'golf_kace' => ['name' => 'ゴルフケース', 'category' => 'ゴルフ']
        ];
    }
    
    /**
     * カテゴリ別プラットフォーム取得
     */
    public function getPlatformsByCategory() {
        $info = $this->getPlatformInfo();
        $categories = [];
        
        foreach ($info as $platform => $data) {
            $category = $data['category'];
            if (!isset($categories[$category])) {
                $categories[$category] = [];
            }
            $categories[$category][] = [
                'id' => $platform,
                'name' => $data['name']
            ];
        }
        
        return $categories;
    }
}

/**
 * 完全統合スクレイピングサービス
 */
class CompleteScrapingService extends ExtendedScrapingService {
    
    public function __construct($pdo) {
        $this->factory = new CompleteScraperFactory($pdo);
        $this->logger = new Logger('complete_scraping');
    }
    
    /**
     * ゴルフ商品専用スクレイピング
     */
    public function scrapeGolfProduct($url, $options = []) {
        $scraper = $this->factory->createScraper($url);
        $result = $scraper->scrapeProduct($url, $options);
        
        // ゴルフ固有データの追加処理
        if ($result['success'] && isset($result['data']['platform_specific']['golf_specs'])) {
            $this->enrichGolfData($result);
        }
        
        return $result;
    }
    
    /**
     * カテゴリ別統計情報
     */
    public function getCategoryStatistics() {
        $platformInfo = $this->factory->getPlatformInfo();
        $stats = [];
        
        foreach ($platformInfo as $platformId => $info) {
            $category = $info['category'];
            
            if (!isset($stats[$category])) {
                $stats[$category] = [
                    'category' => $category,
                    'total_products' => 0,
                    'available' => 0,
                    'sold_out' => 0,
                    'platforms' => []
                ];
            }
            
            $stmt = $this->pdo->prepare("
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN url_status = 'available' THEN 1 ELSE 0 END) as available,
                    SUM(CASE WHEN url_status = 'sold_out' THEN 1 ELSE 0 END) as sold_out
                FROM supplier_products
                WHERE platform = ?
            ");
            $stmt->execute([$platformId]);
            $platformStats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $stats[$category]['total_products'] += $platformStats['total'];
            $stats[$category]['available'] += $platformStats['available'];
            $stats[$category]['sold_out'] += $platformStats['sold_out'];
            $stats[$category]['platforms'][] = [
                'id' => $platformId,
                'name' => $info['name'],
                'stats' => $platformStats
            ];
        }
        
        return $stats;
    }
    
    private function enrichGolfData(&$result) {
        // ゴルフクラブ固有のデータ補完処理
        // 例: ロフト角、フレックス等の正規化
    }
}

// 使用例
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    try {
        $pdo = getDbConnection();
        $service = new CompleteScrapingService($pdo);
        $factory = new CompleteScraperFactory($pdo);
        
        echo "=== 完全統合スクレイピングシステム ===\n\n";
        echo "対応プラットフォーム数: " . count($factory->getSupportedPlatforms()) . "\n\n";
        
        // カテゴリ別表示
        $categories = $factory->getPlatformsByCategory();
        foreach ($categories as $category => $platforms) {
            echo "【{$category}】\n";
            foreach ($platforms as $platform) {
                echo "  - {$platform['name']} ({$platform['id']})\n";
            }
            echo "\n";
        }
        
        // テストURL
        $testUrls = [
            "https://shop.golfkids.co.jp/products/test",
            "https://www.golfpartner.jp/shop/used/test",
            "https://store.alpen-group.jp/Page/206.aspx"
        ];
        
        echo "\n=== スクレイピングテスト ===\n";
        foreach ($testUrls as $url) {
            try {
                echo "\n処理中: {$url}\n";
                $result = $service->scrapeAnyPlatform($url);
                
                if ($result['success']) {
                    echo "✓ 成功\n";
                    echo "  プラットフォーム: {$result['platform']}\n";
                } else {
                    echo "✗ 失敗: {$result['error']}\n";
                }
            } catch (Exception $e) {
                echo "✗ エラー: " . $e->getMessage() . "\n";
            }
        }
        
    } catch (Exception $e) {
        echo "システムエラー: " . $e->getMessage() . "\n";
    }
}
?>