<?php
/**
 * 統合スクレイピング管理クラス
 * 
 * 作成日: 2025-09-25
 * 用途: 全プラットフォームのスクレイピングを統合管理
 * 場所: 02_scraping/common/ScrapingManager.php
 */

require_once __DIR__ . '/PlatformDetector.php';
require_once __DIR__ . '/DataValidator.php';
require_once __DIR__ . '/ScrapingLogger.php';

class ScrapingManager {
    
    private $pdo;
    private $platformDetector;
    private $dataValidator;
    private $logger;
    private $scrapers;
    private $config;
    
    /**
     * コンストラクタ
     * 
     * @param PDO $pdo データベース接続
     * @param array $config 設定配列
     */
    public function __construct($pdo = null, $config = []) {
        $this->pdo = $pdo;
        $this->config = array_merge($this->getDefaultConfig(), $config);
        
        // 依存クラスの初期化
        $this->platformDetector = new PlatformDetector();
        $this->dataValidator = new DataValidator();
        $this->logger = new ScrapingLogger();
        
        // スクレイパーの初期化
        $this->scrapers = [];
        $this->initializeScrapers();
        
        $this->logger->info('ScrapingManager initialized');
    }
    
    /**
     * 単一URLのスクレイピング実行
     * 
     * @param string $url 対象URL
     * @param array $options オプション
     * @return array 実行結果
     */
    public function scrapeUrl($url, $options = []) {
        try {
            $this->logger->info("Single scraping started: {$url}");
            
            // プラットフォーム判定
            $platform = $this->platformDetector->detect($url);
            $this->logger->info("Platform detected: {$platform}");
            
            // 対応プラットフォームチェック
            if (!$this->isPlatformSupported($platform)) {
                throw new Exception("Unsupported platform: {$platform}");
            }
            
            // スクレイピング実行
            $scraper = $this->getScraper($platform);
            $result = $scraper->scrapeProduct($url, $options);
            
            // データ検証
            if ($result['success'] && isset($result['data'])) {
                $isValid = $this->dataValidator->validate($result['data'], $platform);
                if (!$isValid) {
                    $this->logger->warning("Data validation failed for: {$url}");
                    $result['warnings'] = $this->dataValidator->getWarnings();
                }
            }
            
            // 統計更新
            $this->updateStats($platform, $result['success']);
            
            $this->logger->info("Single scraping completed: " . ($result['success'] ? 'SUCCESS' : 'FAILED'));
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error("Single scraping error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'platform' => $platform ?? 'unknown',
                'url' => $url
            ];
        }
    }
    
    /**
     * 複数URLの一括スクレイピング実行
     * 
     * @param array $urls URL配列
     * @param array $options オプション
     * @return array 一括実行結果
     */
    public function scrapeBatch($urls, $options = []) {
        try {
            $this->logger->info("Batch scraping started: " . count($urls) . " URLs");
            
            $results = [];
            $stats = [
                'total' => count($urls),
                'success' => 0,
                'failed' => 0,
                'by_platform' => []
            ];
            
            $batchOptions = array_merge([
                'delay' => $this->config['batch_delay'],
                'max_concurrent' => $this->config['max_concurrent'],
                'stop_on_error' => false
            ], $options);
            
            foreach ($urls as $index => $url) {
                $this->logger->info("Processing batch item: " . ($index + 1) . "/" . count($urls));
                
                $result = $this->scrapeUrl($url, $options);
                $results[] = $result;
                
                // 統計更新
                $platform = $result['platform'] ?? 'unknown';
                if ($result['success']) {
                    $stats['success']++;
                } else {
                    $stats['failed']++;
                }
                
                if (!isset($stats['by_platform'][$platform])) {
                    $stats['by_platform'][$platform] = ['success' => 0, 'failed' => 0];
                }
                
                $stats['by_platform'][$platform][$result['success'] ? 'success' : 'failed']++;
                
                // エラー時の停止判定
                if (!$result['success'] && $batchOptions['stop_on_error']) {
                    $this->logger->warning("Batch processing stopped due to error");
                    break;
                }
                
                // 遅延処理（サーバー負荷軽減）
                if ($index < count($urls) - 1) {
                    sleep($batchOptions['delay']);
                }
            }
            
            $stats['success_rate'] = $stats['total'] > 0 ? 
                round(($stats['success'] / $stats['total']) * 100, 2) : 0;
            
            $this->logger->info("Batch scraping completed. Success: {$stats['success']}, Failed: {$stats['failed']}");
            
            return [
                'success' => $stats['success'] > 0,
                'results' => $results,
                'stats' => $stats,
                'message' => "Batch processing completed: {$stats['success']}/{$stats['total']} successful"
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Batch scraping error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'results' => $results ?? [],
                'stats' => $stats ?? []
            ];
        }
    }
    
    /**
     * サポートされているプラットフォーム一覧を取得
     * 
     * @return array プラットフォーム一覧
     */
    public function getSupportedPlatforms() {
        return [
            'yahoo_auction' => [
                'name' => 'Yahoo オークション',
                'status' => 'active',
                'scraper_class' => 'YahooScraper',
                'config_file' => 'platforms/yahoo/yahoo_config.php'
            ],
            'rakuten' => [
                'name' => '楽天市場',
                'status' => 'active', 
                'scraper_class' => 'RakutenScraper',
                'config_file' => 'platforms/rakuten/rakuten_config.php'
            ],
            'mercari' => [
                'name' => 'メルカリ',
                'status' => 'planned',
                'scraper_class' => 'MercariScraper',
                'config_file' => 'platforms/mercari/mercari_config.php'
            ],
            'paypayfleamarket' => [
                'name' => 'PayPayフリマ',
                'status' => 'planned',
                'scraper_class' => 'PayPayScraper',
                'config_file' => 'platforms/paypayfleamarket/paypay_config.php'
            ],
            'pokemon_center' => [
                'name' => 'ポケモンセンター',
                'status' => 'planned',
                'scraper_class' => 'PokemonScraper',
                'config_file' => 'platforms/pokemon_center/pokemon_config.php'
            ],
            'yodobashi' => [
                'name' => 'ヨドバシカメラ',
                'status' => 'planned',
                'scraper_class' => 'YodobashiScraper',
                'config_file' => 'platforms/yodobashi/yodobashi_config.php'
            ],
            'golfdo' => [
                'name' => 'ゴルフドゥ',
                'status' => 'planned',
                'scraper_class' => 'GolfdoScraper',
                'config_file' => 'platforms/golfdo/golfdo_config.php'
            ]
        ];
    }
    
    /**
     * プラットフォーム統計を取得
     * 
     * @return array 統計データ
     */
    public function getPlatformStats() {
        if (!$this->pdo) {
            return ['error' => 'Database connection required'];
        }
        
        try {
            $stmt = $this->pdo->query("
                SELECT 
                    platform,
                    COUNT(*) as total_products,
                    AVG(current_price) as avg_price,
                    MAX(scraped_at) as last_scraped,
                    COUNT(DISTINCT DATE(scraped_at)) as active_days
                FROM yahoo_scraped_products 
                GROUP BY platform
                ORDER BY total_products DESC
            ");
            
            $platformStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 全体統計も取得
            $totalStmt = $this->pdo->query("
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(DISTINCT platform) as total_platforms,
                    AVG(current_price) as overall_avg_price,
                    MAX(scraped_at) as last_activity
                FROM yahoo_scraped_products
            ");
            
            $overallStats = $totalStmt->fetch(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'platform_stats' => $platformStats,
                'overall_stats' => $overallStats,
                'supported_platforms' => $this->getSupportedPlatforms()
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Stats retrieval error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * システム健全性チェック
     * 
     * @return array チェック結果
     */
    public function healthCheck() {
        $checks = [];
        
        // データベース接続チェック
        $checks['database'] = [
            'status' => $this->pdo ? 'OK' : 'NG',
            'message' => $this->pdo ? 'Database connected' : 'Database not connected'
        ];
        
        // プラットフォームスクレイパーチェック
        foreach ($this->getSupportedPlatforms() as $platform => $info) {
            if ($info['status'] === 'active') {
                $checks["scraper_{$platform}"] = [
                    'status' => isset($this->scrapers[$platform]) ? 'OK' : 'NG',
                    'message' => isset($this->scrapers[$platform]) ? 
                        "{$info['name']} scraper loaded" : 
                        "{$info['name']} scraper not found"
                ];
            }
        }
        
        // ログディレクトリチェック
        $logDir = __DIR__ . '/../logs/common/';
        $checks['log_directory'] = [
            'status' => is_writable($logDir) ? 'OK' : 'NG',
            'message' => is_writable($logDir) ? 'Log directory writable' : 'Log directory not writable'
        ];
        
        // 全体ステータス
        $allOk = !in_array('NG', array_column($checks, 'status'));
        
        return [
            'success' => $allOk,
            'overall_status' => $allOk ? 'HEALTHY' : 'ISSUES_FOUND',
            'checks' => $checks,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * スクレイパーの初期化
     */
    private function initializeScrapers() {
        $platforms = $this->getSupportedPlatforms();
        
        foreach ($platforms as $platform => $info) {
            if ($info['status'] === 'active') {
                try {
                    $this->loadScraper($platform, $info);
                } catch (Exception $e) {
                    $this->logger->error("Failed to load scraper for {$platform}: " . $e->getMessage());
                }
            }
        }
    }
    
    /**
     * 特定プラットフォームのスクレイパーを読み込み
     * 
     * @param string $platform プラットフォーム名
     * @param array $info プラットフォーム情報
     */
    private function loadScraper($platform, $info) {
        $scraperFile = __DIR__ . "/../platforms/{$platform}/{$info['scraper_class']}.php";
        
        if (file_exists($scraperFile)) {
            require_once $scraperFile;
            
            if (class_exists($info['scraper_class'])) {
                $this->scrapers[$platform] = new $info['scraper_class']($this->pdo);
                $this->logger->info("Loaded scraper: {$platform}");
            } else {
                throw new Exception("Scraper class not found: {$info['scraper_class']}");
            }
        } else {
            throw new Exception("Scraper file not found: {$scraperFile}");
        }
    }
    
    /**
     * 特定プラットフォームのスクレイパーを取得
     * 
     * @param string $platform プラットフォーム名
     * @return object スクレイパーインスタンス
     */
    private function getScraper($platform) {
        if (!isset($this->scrapers[$platform])) {
            throw new Exception("Scraper not available for platform: {$platform}");
        }
        
        return $this->scrapers[$platform];
    }
    
    /**
     * プラットフォームがサポートされているかチェック
     * 
     * @param string $platform プラットフォーム名
     * @return bool サポート状況
     */
    private function isPlatformSupported($platform) {
        $platforms = $this->getSupportedPlatforms();
        return isset($platforms[$platform]) && $platforms[$platform]['status'] === 'active';
    }
    
    /**
     * 統計を更新
     * 
     * @param string $platform プラットフォーム名
     * @param bool $success 成功フラグ
     */
    private function updateStats($platform, $success) {
        // 将来的に統計テーブルに記録する場合の処理
        $this->logger->info("Stats updated: {$platform} - " . ($success ? 'SUCCESS' : 'FAILED'));
    }
    
    /**
     * デフォルト設定を取得
     * 
     * @return array デフォルト設定
     */
    private function getDefaultConfig() {
        return [
            'batch_delay' => 2,           // バッチ処理の遅延時間（秒）
            'max_concurrent' => 5,        // 最大同時実行数
            'request_timeout' => 30,      // リクエストタイムアウト（秒）
            'max_retries' => 3,          // 最大リトライ回数
            'log_level' => 'INFO',       // ログレベル
            'enable_caching' => true,    // キャッシュ有効フラグ
            'cache_duration' => 3600     // キャッシュ保持時間（秒）
        ];
    }
}

/**
 * ScrapingManager のファクトリークラス
 */
class ScrapingManagerFactory {
    
    /**
     * ScrapingManager インスタンスを作成
     * 
     * @param PDO|null $pdo データベース接続
     * @param array $config 設定
     * @return ScrapingManager
     */
    public static function create($pdo = null, $config = []) {
        // 設定ファイルの読み込み
        $configFile = __DIR__ . '/../config/scraping_config.php';
        if (file_exists($configFile)) {
            $fileConfig = include $configFile;
            $config = array_merge($fileConfig, $config);
        }
        
        return new ScrapingManager($pdo, $config);
    }
    
    /**
     * シングルトンインスタンスを取得
     * 
     * @param PDO|null $pdo データベース接続
     * @param array $config 設定
     * @return ScrapingManager
     */
    private static $instance = null;
    
    public static function getInstance($pdo = null, $config = []) {
        if (self::$instance === null) {
            self::$instance = self::create($pdo, $config);
        }
        
        return self::$instance;
    }
}

// ログ出力（既存システムとの互換性のため）
if (!function_exists('writeLog')) {
    function writeLog($message, $type = 'INFO') {
        $logger = new ScrapingLogger();
        $logger->log($type, $message);
    }
}
?>