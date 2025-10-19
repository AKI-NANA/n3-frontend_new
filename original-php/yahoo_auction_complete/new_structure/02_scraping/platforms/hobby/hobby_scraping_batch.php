<?php
/**
 * ホビー系ECサイト一括スクレイピングバッチ
 * 
 * 実行方法:
 * php hobby_scraping_batch.php --platform=all
 * php hobby_scraping_batch.php --platform=takaratomy --urls=urls.txt
 * 
 * @version 1.0.0
 */

require_once __DIR__ . '/BaseHobbyScraper.php';
require_once __DIR__ . '/TakaraTomyScraper.php';
// 他のスクレイパーもrequire

class HobbyScrapingBatch {
    private $db;
    private $config;
    private $stats = [
        'total' => 0,
        'success' => 0,
        'failed' => 0,
        'updated' => 0,
        'new' => 0
    ];
    
    public function __construct() {
        $this->db = $this->connectDatabase();
        $this->config = $this->loadConfig();
        $this->ensureTablesExist();
    }
    
    /**
     * データベース接続
     */
    private function connectDatabase() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $pdo = new PDO($dsn, "postgres", "Kn240914");
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            return $pdo;
        } catch (PDOException $e) {
            die("Database connection failed: " . $e->getMessage());
        }
    }
    
    /**
     * 設定読み込み
     */
    private function loadConfig() {
        $configFile = __DIR__ . '/../../config/platforms.json';
        return json_decode(file_get_contents($configFile), true);
    }
    
    /**
     * 必要なテーブルの存在確認と作成
     */
    private function ensureTablesExist() {
        // 価格変動履歴テーブル
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS price_change_history (
                id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE,
                old_price DECIMAL(10,2),
                new_price DECIMAL(10,2),
                change_percent DECIMAL(5,2),
                detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_product_date (product_id, detected_at DESC)
            )
        ");
        
        // 在庫変動履歴テーブル
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS stock_change_history (
                id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE,
                old_status VARCHAR(50),
                new_status VARCHAR(50),
                old_quantity INTEGER,
                new_quantity INTEGER,
                detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_product_date (product_id, detected_at DESC)
            )
        ");
        
        // スクレイピングログテーブル
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS scraping_batch_logs (
                id SERIAL PRIMARY KEY,
                platform VARCHAR(50),
                batch_type VARCHAR(20),
                urls_count INTEGER,
                success_count INTEGER,
                failed_count INTEGER,
                execution_time_seconds INTEGER,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                status VARCHAR(20),
                error_log TEXT
            )
        ");
        
        echo "✓ テーブル確認完了\n";
    }
    
    /**
     * メイン実行
     */
    public function run($options) {
        $startTime = time();
        $platform = $options['platform'] ?? 'all';
        $urlsFile = $options['urls'] ?? null;
        
        echo "========================================\n";
        echo "ホビー系ECサイト一括スクレイピング開始\n";
        echo "========================================\n";
        echo "プラットフォーム: {$platform}\n";
        echo "開始時刻: " . date('Y-m-d H:i:s') . "\n\n";
        
        try {
            if ($platform === 'all') {
                $this->scrapeAllPlatforms();
            } else {
                $urls = $this->loadUrls($urlsFile);
                $this->scrapePlatform($platform, $urls);
            }
            
            $status = 'success';
        } catch (Exception $e) {
            echo "✗ エラー発生: " . $e->getMessage() . "\n";
            $status = 'failed';
        }
        
        $executionTime = time() - $startTime;
        
        // ログ記録
        $this->recordBatchLog($platform, $status, $executionTime, $startTime);
        
        // 統計表示
        $this->displayStats($executionTime);
    }
    
    /**
     * 全プラットフォームスクレイピング
     */
    private function scrapeAllPlatforms() {
        $platforms = $this->config['platforms'];
        
        foreach ($platforms as $platformCode => $platformConfig) {
            echo "\n--- {$platformConfig['platform_name']} 処理開始 ---\n";
            
            // プラットフォーム固有のURL一覧を取得
            $urls = $this->getPlatformUrls($platformCode);
            
            if (empty($urls)) {
                echo "  スキップ: URLが見つかりません\n";
                continue;
            }
            
            $this->scrapePlatform($platformCode, $urls);
        }
    }
    
    /**
     * 特定プラットフォームのスクレイピング
     */
    private function scrapePlatform($platformCode, $urls) {
        $scraperClass = $this->getScraperClass($platformCode);
        
        if (!class_exists($scraperClass)) {
            echo "  ✗ スクレイパークラスが見つかりません: {$scraperClass}\n";
            return;
        }
        
        $scraper = new $scraperClass();
        
        foreach ($urls as $url) {
            $this->stats['total']++;
            
            echo "  処理中: {$url}\n";
            
            $result = $scraper->scrape($url);
            
            if ($result['success']) {
                $this->stats['success']++;
                echo "  ✓ 成功 (Product ID: {$result['product_id']})\n";
            } else {
                $this->stats['failed']++;
                echo "  ✗ 失敗: {$result['error']}\n";
            }
            
            // プログレス表示
            $this->displayProgress();
        }
    }
    
    /**
     * スクレイパークラス名取得
     */
    private function getScraperClass($platformCode) {
        $classMap = [
            'takaratomy' => 'TakaraTomyScraper',
            'bandai_hobby' => 'BandaiHobbyScraper',
            'posthobby' => 'PostHobbyScraper',
            'kyd_store' => 'KYDStoreScraper',
            'nintendo_store' => 'NintendoStoreScraper',
            // 他のプラットフォームも追加
        ];
        
        return $classMap[$platformCode] ?? null;
    }
    
    /**
     * プラットフォームのURL一覧取得
     */
    private function getPlatformUrls($platformCode) {
        // データベースから既存URLを取得
        $stmt = $this->db->prepare("
            SELECT DISTINCT url 
            FROM yahoo_scraped_products 
            WHERE source_platform = ? 
            AND monitoring_enabled = true
            ORDER BY updated_at DESC
            LIMIT 100
        ");
        $stmt->execute([$platformCode]);
        
        $urls = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $urls[] = $row['url'];
        }
        
        // URLファイルからも読み込み
        $urlFile = __DIR__ . "/../../config/urls/{$platformCode}_urls.txt";
        if (file_exists($urlFile)) {
            $fileUrls = file($urlFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            $urls = array_merge($urls, $fileUrls);
        }
        
        return array_unique($urls);
    }
    
    /**
     * URLファイル読み込み
     */
    private function loadUrls($filename) {
        if (!$filename || !file_exists($filename)) {
            return [];
        }
        
        return file($filename, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    }
    
    /**
     * バッチログ記録
     */
    private function recordBatchLog($platform, $status, $executionTime, $startTime) {
        $sql = "INSERT INTO scraping_batch_logs 
                (platform, batch_type, urls_count, success_count, failed_count, 
                 execution_time_seconds, started_at, completed_at, status)
                VALUES (?, 'hobby_scraping', ?, ?, ?, ?, ?, NOW(), ?)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $platform,
            $this->stats['total'],
            $this->stats['success'],
            $this->stats['failed'],
            $executionTime,
            date('Y-m-d H:i:s', $startTime),
            $status
        ]);
    }
    
    /**
     * プログレス表示
     */
    private function displayProgress() {
        $progress = $this->stats['total'] > 0 
            ? round(($this->stats['success'] + $this->stats['failed']) / $this->stats['total'] * 100, 1)
            : 0;
        
        echo "  進捗: {$progress}% ({$this->stats['success']}/{$this->stats['total']} 成功)\r";
    }
    
    /**
     * 統計表示
     */
    private function displayStats($executionTime) {
        echo "\n\n========================================\n";
        echo "スクレイピング完了\n";
        echo "========================================\n";
        echo "総処理数: {$this->stats['total']}\n";
        echo "成功: {$this->stats['success']}\n";
        echo "失敗: {$this->stats['failed']}\n";
        echo "実行時間: {$executionTime}秒\n";
        echo "========================================\n";
    }
}

// コマンドライン引数解析
$options = getopt('', ['platform:', 'urls:']);

if (empty($options)) {
    echo "使用方法:\n";
    echo "  php hobby_scraping_batch.php --platform=all\n";
    echo "  php hobby_scraping_batch.php --platform=takaratomy --urls=urls.txt\n";
    exit(1);
}

// バッチ実行
$batch = new HobbyScrapingBatch();
$batch->run($options);
