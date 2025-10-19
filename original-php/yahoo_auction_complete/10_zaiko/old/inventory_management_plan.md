# 堅牢な在庫管理システム開発計画書【完全版】

## 📋 プロジェクト概要

### 目的
マルチプラットフォーム対応の堅牢な在庫・価格管理システムの構築
- ヤフオク（スクレイピング）・Amazon（API）・全出品先（API）の統合管理
- リアルタイム在庫同期・価格追従・エラー検知・アラート機能
- 商用レベルの信頼性・性能・セキュリティを確保

### 技術スタック
- **バックエンド**: PHP 8.x + PostgreSQL + Redis
- **フロントエンド**: Vanilla JavaScript + CSS
- **キューイング**: Redis + 専用ワーカープロセス
- **スケジューラー**: Cron + Laravel Task Scheduling (将来)
- **通知**: メール（SMTP）+ ログシステム
- **コンテナ**: Docker + Docker Compose

## 🏗️ システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                     在庫管理システム                        │
├─────────────────────────────────────────────────────────────┤
│  📊 ダッシュボード (manager.php)                            │
│  - 実行ログ表示  - エラー一覧  - 統計情報                   │
├─────────────────────────────────────────────────────────────┤
│  🔄 データ取得エンジン (processor.php)                      │
│  ┌─────────────────┬─────────────────┬─────────────────┐   │
│  │  ヤフオク        │   Amazon        │   全出品先      │   │
│  │  (スクレイピング) │   (API)         │   (API)         │   │
│  │  - 在庫数        │   - 在庫数      │   - 出品中数量  │   │
│  │  - 価格          │   - 価格        │   - 価格        │   │
│  │  - URL有効性     │   - 商品詳細    │   - 商品状態    │   │
│  └─────────────────┴─────────────────┴─────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ⚡ キューイングシステム (Redis + Worker)                   │
│  - 非同期処理  - バッチ処理  - 並列実行                     │
├─────────────────────────────────────────────────────────────┤
│  🔍 データ検証・異常検知                                    │
│  - URL死活監視  - 価格急変検知  - 商品変更検知              │
├─────────────────────────────────────────────────────────────┤
│  🛡️ セキュリティ・認証                                      │
│  - API認証  - レート制限  - 排他制御                        │
├─────────────────────────────────────────────────────────────┤
│  🚨 アラート・通知システム                                  │
│  - エラー通知  - メール送信  - ログ記録                     │
└─────────────────────────────────────────────────────────────┘
```

## 🗃️ データベース設計【性能最適化版】

### 1. 在庫管理テーブル (inventory_management)

```sql
CREATE TABLE inventory_management (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES yahoo_scraped_products(id),
    
    -- 仕入れ先情報
    source_platform VARCHAR(20) NOT NULL, -- 'yahoo', 'amazon'
    source_url TEXT NOT NULL,
    source_product_id VARCHAR(100),
    
    -- 現在の在庫・価格情報（高速アクセス用）
    current_stock INTEGER DEFAULT 0,
    current_price DECIMAL(10,2),
    
    -- 商品検証
    title_hash VARCHAR(64), -- タイトルのハッシュ値で商品変更検知
    url_status VARCHAR(20) DEFAULT 'active', -- 'active', 'dead', 'changed'
    last_verified_at TIMESTAMP,
    
    -- システム管理
    monitoring_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- パフォーマンス重視インデックス
CREATE INDEX idx_inventory_product_monitoring ON inventory_management(product_id, monitoring_enabled);
CREATE INDEX idx_inventory_source_platform ON inventory_management(source_platform);
CREATE INDEX idx_inventory_updated_at ON inventory_management(updated_at);
```

### 2. 在庫履歴テーブル (stock_history) 【新規追加・性能最適化】

```sql
-- 在庫・価格変更履歴を追記型で保存（メインテーブル負荷軽減）
CREATE TABLE stock_history (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES yahoo_scraped_products(id),
    
    -- 変更前後の値
    previous_stock INTEGER,
    new_stock INTEGER,
    previous_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    
    -- 変更詳細
    change_type VARCHAR(20), -- 'stock_change', 'price_change', 'both'
    change_source VARCHAR(20), -- 'yahoo', 'amazon', 'manual'
    
    -- パフォーマンス
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 時系列データ用インデックス
CREATE INDEX idx_stock_history_product_time ON stock_history(product_id, created_at DESC);
CREATE INDEX idx_stock_history_change_type ON stock_history(change_type, created_at DESC);

-- パーティショニング（大量データ対応）
-- 月単位でパーティション分割
```

### 3. 出品先管理テーブル (listing_platforms)

```sql
CREATE TABLE listing_platforms (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES yahoo_scraped_products(id),
    
    -- 出品先情報
    platform VARCHAR(20) NOT NULL, -- 'ebay', 'mercari', 'amazon_seller'
    platform_product_id VARCHAR(100),
    listing_url TEXT,
    
    -- 出品状態
    listing_status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'ended'
    current_quantity INTEGER DEFAULT 0,
    listed_price DECIMAL(10,2),
    
    -- 同期設定
    auto_sync_enabled BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP,
    sync_queue_status VARCHAR(20) DEFAULT 'idle', -- 'idle', 'queued', 'processing'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 複合インデックス（同期処理最適化）
CREATE INDEX idx_listing_sync_status ON listing_platforms(auto_sync_enabled, sync_queue_status);
CREATE INDEX idx_listing_product_platform ON listing_platforms(product_id, platform);
```

### 4. 実行ログテーブル (inventory_execution_logs)

```sql
CREATE TABLE inventory_execution_logs (
    id SERIAL PRIMARY KEY,
    execution_id UUID DEFAULT gen_random_uuid(),
    
    -- 実行情報・排他制御
    process_type VARCHAR(50), -- 'stock_check', 'price_check', 'sync'
    execution_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_end TIMESTAMP,
    status VARCHAR(20), -- 'running', 'completed', 'failed', 'partial'
    worker_id VARCHAR(50), -- ワーカープロセス識別子
    
    -- 統計
    total_products INTEGER DEFAULT 0,
    processed_products INTEGER DEFAULT 0,
    updated_products INTEGER DEFAULT 0,
    error_products INTEGER DEFAULT 0,
    
    -- 詳細
    details JSONB,
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 排他制御用インデックス
CREATE UNIQUE INDEX idx_execution_running ON inventory_execution_logs(process_type, status) 
WHERE status = 'running';

-- 一般検索用インデックス
CREATE INDEX idx_execution_logs_type_status ON inventory_execution_logs(process_type, status);
CREATE INDEX idx_execution_logs_date ON inventory_execution_logs(created_at DESC);
```

### 5. キュー管理テーブル (processing_queue) 【新規追加】

```sql
CREATE TABLE processing_queue (
    id BIGSERIAL PRIMARY KEY,
    queue_name VARCHAR(50) NOT NULL, -- 'stock_check', 'price_sync', 'validation'
    product_id INTEGER REFERENCES yahoo_scraped_products(id),
    
    -- キュー状態
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    priority INTEGER DEFAULT 5, -- 1(高) - 10(低)
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- 処理データ
    payload JSONB,
    result JSONB,
    error_message TEXT,
    
    -- 時間管理
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- キュー処理最適化インデックス
CREATE INDEX idx_queue_processing ON processing_queue(queue_name, status, priority, scheduled_at);
CREATE INDEX idx_queue_retry ON processing_queue(status, retry_count, max_retries);
```

### 6. エラーログテーブル (inventory_errors) 【強化版】

```sql
CREATE TABLE inventory_errors (
    id SERIAL PRIMARY KEY,
    execution_id UUID REFERENCES inventory_execution_logs(execution_id),
    product_id INTEGER REFERENCES yahoo_scraped_products(id),
    
    -- エラー詳細
    error_type VARCHAR(50), -- 'url_dead', 'price_changed', 'stock_unavailable', 'api_error'
    error_code VARCHAR(20),
    error_message TEXT,
    stack_trace TEXT, -- デバッグ用スタックトレース
    
    -- 商品情報（エラー発生時点のスナップショット）
    product_title VARCHAR(500),
    source_url TEXT,
    platform VARCHAR(20),
    
    -- 対処状況
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    resolved BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- エラー管理用インデックス
CREATE INDEX idx_errors_severity_resolved ON inventory_errors(severity, resolved, created_at DESC);
CREATE INDEX idx_errors_type_product ON inventory_errors(error_type, product_id);
```

## 📁 ファイル構造【拡張版】

```
10_zaiko/ (在庫管理モジュール)
├── manager.php              # メインダッシュボード
├── processor.php            # データ取得・処理エンジン
├── scheduler.php            # スケジュール実行エントリーポイント
├── worker.php               # キューワーカープロセス
├── config.php              # モジュール設定
├── .env                    # 環境変数（機密情報）
├── api/
│   ├── dashboard.php        # ダッシュボード用API
│   ├── execution.php        # 実行制御API
│   ├── monitoring.php       # 監視設定API
│   ├── alerts.php          # アラート設定API
│   ├── queue.php           # キュー管理API
│   └── security.php        # 認証・セキュリティAPI
├── includes/
│   ├── InventoryManager.php    # 在庫管理クラス
│   ├── YahooScraper.php       # Yahoo スクレイピング
│   ├── AmazonConnector.php    # Amazon API接続
│   ├── PlatformSyncManager.php # 出品先同期
│   ├── ValidationEngine.php   # 検証エンジン
│   ├── AlertManager.php       # アラート管理
│   ├── QueueManager.php       # キュー管理【新規】
│   ├── SecurityManager.php    # セキュリティ管理【新規】
│   ├── PerformanceOptimizer.php # 性能最適化【新規】
│   └── Logger.php            # ログ管理
├── workers/                 # ワーカープロセス【新規】
│   ├── StockCheckWorker.php
│   ├── PriceSyncWorker.php
│   └── ValidationWorker.php
├── scripts/                 # 運用スクリプト【新規】
│   ├── backup.sh           # バックアップスクリプト
│   ├── cleanup.sh          # ログクリーンアップ
│   └── health_check.sh     # ヘルスチェック
├── assets/
│   ├── inventory.css         # モジュール専用CSS
│   └── inventory.js          # モジュール専用JavaScript
├── logs/                    # ログファイル格納
│   ├── execution/
│   ├── errors/
│   ├── security/           # セキュリティログ【新規】
│   └── performance/        # パフォーマンスログ【新規】
└── tests/                   # テストファイル【新規】
    ├── unit/
    ├── integration/
    └── performance/
```

## 🔧 開発フェーズ【性能・セキュリティ強化版】

### フェーズ1: 基盤構築 (1-2週間)

#### 1.1 データベース構築【拡張版】
```sql
-- テーブル作成・インデックス設定
-- パーティショニング設定（大量データ対応）
CREATE TABLE stock_history_2025_01 PARTITION OF stock_history 
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- 自動パーティション作成プロシージャ
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    start_date date;
    end_date date;
    table_name text;
BEGIN
    start_date := date_trunc('month', CURRENT_DATE + interval '1 month');
    end_date := start_date + interval '1 month';
    table_name := 'stock_history_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE %I PARTITION OF stock_history 
                    FOR VALUES FROM (%L) TO (%L)', 
                   table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

#### 1.2 基本クラス開発【セキュリティ強化版】
```php
// includes/InventoryManager.php
class InventoryManager {
    private $db;
    private $logger;
    private $queueManager;
    private $securityManager;
    
    public function __construct() {
        $this->db = new Database();
        $this->logger = new Logger('inventory');
        $this->queueManager = new QueueManager();
        $this->securityManager = new SecurityManager();
    }
    
    // 在庫監視商品の登録（セキュリティチェック付き）
    public function registerProduct($productId, $sourceUrl, $platform) {
        // 入力検証
        $this->securityManager->validateInput([
            'product_id' => $productId,
            'source_url' => $sourceUrl,
            'platform' => $platform
        ]);
        
        // 排他制御チェック
        if ($this->isProcessRunning('product_registration')) {
            throw new ConcurrentExecutionException('商品登録処理が実行中です');
        }
        
        // キューに登録（非同期処理）
        return $this->queueManager->enqueue('product_registration', [
            'product_id' => $productId,
            'source_url' => $sourceUrl,
            'platform' => $platform
        ]);
    }
    
    // 在庫・価格チェック実行（マイクロバッチ処理）
    public function executeStockCheck($batchSize = 50) {
        $executionId = $this->startExecution('stock_check');
        
        try {
            $products = $this->getMonitoringProducts();
            $batches = array_chunk($products, $batchSize);
            
            foreach ($batches as $batch) {
                $this->queueManager->enqueueBatch('stock_check', $batch);
            }
            
            $this->completeExecution($executionId);
        } catch (Exception $e) {
            $this->failExecution($executionId, $e->getMessage());
            throw $e;
        }
    }
    
    // 排他制御チェック
    private function isProcessRunning($processType) {
        $sql = "SELECT COUNT(*) FROM inventory_execution_logs 
                WHERE process_type = ? AND status = 'running'";
        return $this->db->selectValue($sql, [$processType]) > 0;
    }
}
```

#### 1.3 キューマネージャー【新規開発】
```php
// includes/QueueManager.php
class QueueManager {
    private $redis;
    private $db;
    
    public function __construct() {
        $this->redis = new Redis();
        $this->redis->connect('localhost', 6379);
        $this->db = new Database();
    }
    
    // キューにジョブを追加
    public function enqueue($queueName, $payload, $priority = 5) {
        $job = [
            'id' => uniqid(),
            'queue_name' => $queueName,
            'payload' => $payload,
            'priority' => $priority,
            'created_at' => time()
        ];
        
        // Redis に即座に追加（高速処理用）
        $this->redis->lpush("queue:$queueName", json_encode($job));
        
        // データベースにも記録（永続化・監視用）
        $this->db->insert('processing_queue', [
            'queue_name' => $queueName,
            'product_id' => $payload['product_id'] ?? null,
            'status' => 'pending',
            'priority' => $priority,
            'payload' => json_encode($payload)
        ]);
        
        return $job['id'];
    }
    
    // バッチでキューに追加（マイクロバッチ処理）
    public function enqueueBatch($queueName, $items, $priority = 5) {
        $pipe = $this->redis->multi(Redis::PIPELINE);
        
        foreach ($items as $item) {
            $job = [
                'id' => uniqid(),
                'queue_name' => $queueName,
                'payload' => $item,
                'priority' => $priority,
                'created_at' => time()
            ];
            $pipe->lpush("queue:$queueName", json_encode($job));
        }
        
        $pipe->exec();
    }
    
    // キューからジョブを取得
    public function dequeue($queueName, $timeout = 10) {
        $job = $this->redis->brpop("queue:$queueName", $timeout);
        
        if ($job) {
            $jobData = json_decode($job[1], true);
            
            // データベースのステータス更新
            $this->db->update('processing_queue', 
                ['status' => 'processing', 'started_at' => 'NOW()'],
                ['queue_name' => $queueName, 'payload' => json_encode($jobData['payload'])]
            );
            
            return $jobData;
        }
        
        return null;
    }
}
```

### フェーズ2: コア機能開発【APIレジリエンス強化】 (2-3週間)

#### 2.1 Yahoo スクレイピングエンジン【堅牢性強化】
```php
// includes/YahooScraper.php
class YahooScraper {
    private $logger;
    private $performanceOptimizer;
    
    public function __construct() {
        $this->logger = new Logger('yahoo_scraper');
        $this->performanceOptimizer = new PerformanceOptimizer();
    }
    
    // URL生存確認（リトライ・タイムアウト制御）
    public function checkUrlStatus($url) {
        return $this->performanceOptimizer->executeWithRetry(function() use ($url) {
            $context = stream_context_create([
                'http' => [
                    'timeout' => 15,
                    'user_agent' => 'Mozilla/5.0 (compatible; InventoryBot/1.0)',
                    'follow_location' => false
                ]
            ]);
            
            $headers = get_headers($url, 1, $context);
            
            if (!$headers) {
                throw new URLAccessException("URL にアクセスできません: $url");
            }
            
            $statusCode = $this->extractStatusCode($headers[0]);
            
            return [
                'status' => $statusCode >= 200 && $statusCode < 400 ? 'active' : 'dead',
                'status_code' => $statusCode,
                'redirect_url' => $this->getRedirectUrl($headers),
                'checked_at' => date('Y-m-d H:i:s')
            ];
        }, 3, 5);
    }
    
    // HTML構造変化検知
    public function detectStructureChange($url) {
        $html = $this->fetchHtmlWithCache($url);
        
        // 重要な要素のセレクターをチェック
        $criticalSelectors = [
            '.ProductTitle',
            '.ProductPrice',
            '.ProductDetail',
            '#auc_title'
        ];
        
        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new DOMXPath($dom);
        
        $missingSelectors = [];
        foreach ($criticalSelectors as $selector) {
            $elements = $xpath->query($this->cssToXpath($selector));
            if ($elements->length === 0) {
                $missingSelectors[] = $selector;
            }
        }
        
        if (!empty($missingSelectors)) {
            $this->logger->warning("HTML構造変化検知", [
                'url' => $url,
                'missing_selectors' => $missingSelectors
            ]);
            
            return [
                'changed' => true,
                'missing_elements' => $missingSelectors,
                'recommendation' => 'セレクター更新が必要です'
            ];
        }
        
        return ['changed' => false];
    }
    
    // スキーマ検証付きデータ取得
    public function getProductData($url) {
        $rawData = $this->extractRawData($url);
        
        // JSON Schema による検証
        $schema = [
            'type' => 'object',
            'required' => ['title', 'price', 'stock'],
            'properties' => [
                'title' => ['type' => 'string', 'minLength' => 1],
                'price' => ['type' => 'number', 'minimum' => 0],
                'stock' => ['type' => 'integer', 'minimum' => 0]
            ]
        ];
        
        if (!$this->validateSchema($rawData, $schema)) {
            throw new DataValidationException("取得データがスキーマに適合しません");
        }
        
        return $rawData;
    }
}
```

#### 2.2 Amazon API連携【レート制限・エラーハンドリング強化】
```php
// includes/AmazonConnector.php
class AmazonConnector {
    private $apiClient;
    private $rateLimiter;
    private $circuitBreaker;
    
    public function __construct() {
        $this->apiClient = new AmazonAPIClient();
        $this->rateLimiter = new RateLimiter('amazon_api');
        $this->circuitBreaker = new CircuitBreaker('amazon_api');
    }
    
    // API呼び出し（レート制限・サーキットブレーカー付き）
    public function getProductInfo($asin) {
        // レート制限チェック
        $this->rateLimiter->checkLimit(100, 3600); // 1時間100リクエスト
        
        // サーキットブレーカーチェック
        if ($this->circuitBreaker->isOpen()) {
            throw new ServiceUnavailableException("Amazon API が一時的に利用できません");
        }
        
        try {
            $response = $this->apiClient->getProduct($asin);
            
            // レスポンススキーマ検証
            $expectedSchema = [
                'type' => 'object',
                'required' => ['ItemAttributes', 'OfferSummary'],
                'properties' => [
                    'ItemAttributes' => [
                        'type' => 'object',
                        'required' => ['Title']
                    ],
                    'OfferSummary' => [
                        'type' => 'object',
                        'required' => ['LowestNewPrice']
                    ]
                ]
            ];
            
            if (!$this->validateApiResponse($response, $expectedSchema)) {
                throw new UnexpectedResponseException("Amazon API のレスポンス形式が予期しないものです");
            }
            
            $this->circuitBreaker->recordSuccess();
            
            return $this->normalizeProductData($response);
            
        } catch (AmazonAPIException $e) {
            $this->circuitBreaker->recordFailure();
            
            if ($e->getCode() === 503) { // Service Unavailable
                $this->circuitBreaker->open(300); // 5分間オープン
            }
            
            throw $e;
        }
    }
    
    // レスポンス正規化（データ形式統一）
    private function normalizeProductData($apiResponse) {
        return [
            'title' => $apiResponse['ItemAttributes']['Title'] ?? 'N/A',
            'price' => $this->extractPrice($apiResponse['OfferSummary']),
            'availability' => $this->extractAvailability($apiResponse),
            'last_updated' => date('Y-m-d H:i:s'),
            'data_source' => 'amazon_api_v1'
        ];
    }
}
```

#### 2.3 サーキットブレーカーパターン【新規実装】
```php
// includes/CircuitBreaker.php
class CircuitBreaker {
    private $redis;
    private $serviceName;
    
    public function __construct($serviceName) {
        $this->redis = new Redis();
        $this->redis->connect('localhost', 6379);
        $this->serviceName = $serviceName;
    }
    
    public function isOpen() {
        $state = $this->redis->hGetAll("circuit_breaker:$this->serviceName");
        
        if (!$state || $state['state'] !== 'open') {
            return false;
        }
        
        // 半開状態への移行チェック
        if (time() > ($state['opened_at'] + $state['timeout'])) {
            $this->halfOpen();
            return false;
        }
        
        return true;
    }
    
    public function recordFailure() {
        $key = "circuit_breaker:$this->serviceName";
        $this->redis->hIncrBy($key, 'failure_count', 1);
        
        $failureCount = $this->redis->hGet($key, 'failure_count');
        if ($failureCount >= 5) { // 5回失敗で開状態
            $this->open(300); // 5分間
        }
    }
    
    public function recordSuccess() {
        $key = "circuit_breaker:$this->serviceName";
        $this->redis->hMSet($key, [
            'state' => 'closed',
            'failure_count' => 0,
            'last_success' => time()
        ]);
    }
    
    public function open($timeoutSeconds) {
        $key = "circuit_breaker:$this->serviceName";
        $this->redis->hMSet($key, [
            'state' => 'open',
            'opened_at' => time(),
            'timeout' => $timeoutSeconds
        ]);
    }
    
    private function halfOpen() {
        $key = "circuit_breaker:$this->serviceName";
        $this->redis->hSet($key, 'state', 'half_open');
    }
}
```

### フェーズ3: ワーカープロセス【並列処理実装】 (1-2週間)

#### 3.1 ストックチェックワーカー
```php
// workers/StockCheckWorker.php
class StockCheckWorker {
    private $queueManager;
    private $inventoryManager;
    private $logger;
    
    public function __construct() {
        $this->queueManager = new QueueManager();
        $this->inventoryManager = new InventoryManager();
        $this->logger = new Logger('stock_worker');
    }
    
    public function run() {
        $this->logger->info("Stock Check Worker 開始");
        
        while (true) {
            try {
                $job = $this->queueManager->dequeue('stock_check', 30);
                
                if ($job) {
                    $this->processStockCheck($job);
                } else {
                    // キューが空の場合は短時間待機
                    sleep(5);
                }
                
            } catch (Exception $e) {
                $this->logger->error("ワーカーエラー: " . $e->getMessage());
                sleep(10); // エラー時は少し長めに待機
            }
        }
    }
    
    private function processStockCheck($job) {
        $productId = $job['payload']['product_id'];
        
        try {
            // 商品情報取得
            $product = $this->inventoryManager->getProduct($productId);
            
            // 在庫数チェック
            $currentStock = $this->checkCurrentStock($product);
            
            // 在庫数に変化があった場合のみ更新
            if ($currentStock !== $product['current_stock']) {
                $this->inventoryManager->updateStock($productId, $currentStock);
                
                // 在庫履歴に記録
                $this->inventoryManager->recordStockHistory($productId, [
                    'previous_stock' => $product['current_stock'],
                    'new_stock' => $currentStock,
                    'change_source' => $product['source_platform']
                ]);
                
                // 出品先に同期キューを追加
                $this->queueManager->enqueue('platform_sync', [
                    'product_id' => $productId,
                    'new_stock' => $currentStock,
                    'sync_type' => 'stock_update'
                ]);
            }
            
            // 処理完了をマーク
            $this->queueManager->markCompleted($job['id']);
            
        } catch (Exception $e) {
            $this->logger->error("商品 $productId の在庫チェック失敗: " . $e->getMessage());
            $this->queueManager->markFailed($job['id'], $e->getMessage());
        }
    }
}
```

#### 3.2 並列ワーカー管理スクリプト
```bash
#!/bin/bash
# scripts/start_workers.sh

# ワーカー設定
STOCK_WORKERS=3
PRICE_WORKERS=2
SYNC_WORKERS=2

# Stock Check Workers
for i in $(seq 1 $STOCK_WORKERS); do
    echo "Starting Stock Worker $i"
    nohup php workers/StockCheckWorker.php > logs/workers/stock_worker_$i.log 2>&1 &
    echo $! > pids/stock_worker_$i.pid
done

# Price Sync Workers
for i in $(seq 1 $PRICE_WORKERS); do
    echo "Starting Price Worker $i"
    nohup php workers/PriceSyncWorker.php > logs/workers/price_worker_$i.log 2>&1 &
    echo $! > pids/price_worker_$i.pid
done

# Platform Sync Workers
for i in $(seq 1 $SYNC_WORKERS); do
    echo "Starting Sync Worker $i"
    nohup php workers/PlatformSyncWorker.php > logs/workers/sync_worker_$i.log 2>&1 &
    echo $! > pids/sync_worker_$i.pid
done

echo "All workers started"
```

### フェーズ4: セキュリティ強化 (1週間)

#### 4.1 セキュリティマネージャー【新規実装】
```php
// includes/SecurityManager.php
class SecurityManager {
    private $allowedOrigins;
    private $apiTokens;
    
    public function __construct() {
        $this->allowedOrigins = explode(',', $_ENV['ALLOWED_ORIGINS'] ?? 'localhost');
        $this->apiTokens = $this->loadApiTokens();
    }
    
    // API認証
    public function authenticateApiRequest($token, $endpoint) {
        if (!$token || !in_array($token, $this->apiTokens)) {
            throw new UnauthorizedException('不正なAPIトークンです');
        }
        
        // トークンごとのアクセス権限チェック
        $permissions = $this->getTokenPermissions($token);
        if (!$this->hasPermission($permissions, $endpoint)) {
            throw new ForbiddenException('このエンドポイントにアクセスする権限がありません');
        }
        
        // レート制限チェック
        $this->checkRateLimit($token, $endpoint);
        
        return true;
    }
    
    // 入力検証（SQLインジェクション・XSS対策）
    public function validateInput($data) {
        foreach ($data as $key => $value) {
            // SQLインジェクション対策
            if ($this->containsSqlInjection($value)) {
                throw new SecurityException("不正な入力が検出されました: $key");
            }
            
            // XSS対策
            if ($this->containsXss($value)) {
                throw new SecurityException("XSS攻撃の可能性がある入力: $key");
            }
            
            // 長さチェック
            if (strlen($value) > $this->getMaxLength($key)) {
                throw new ValidationException("入力値が長すぎます: $key");
            }
        }
        
        return true;
    }
    
    // CSRF トークン検証
    public function validateCsrfToken($token, $sessionId) {
        $expectedToken = hash_hmac('sha256', $sessionId, $_ENV['CSRF_SECRET']);
        
        if (!hash_equals($expectedToken, $token)) {
            throw new CsrfException('CSRF トークンが無効です');
        }
        
        return true;
    }
    
    private function containsSqlInjection($input) {
        $patterns = [
            '/(\s*(union|select|insert|update|delete|drop|create|alter)\s+)/i',
            '/(\s*(or|and)\s+\d+\s*=\s*\d+)/i',
            '/[\'"](;|--|\*)/i'
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                return true;
            }
        }
        
        return false;
    }
    
    private function containsXss($input) {
        $patterns = [
            '/<script[^>]*>.*?<\/script>/i',
            '/javascript:/i',
            '/on\w+\s*=/i',
            '/<iframe[^>]*>.*?<\/iframe>/i'
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                return true;
            }
        }
        
        return false;
    }
}
```

#### 4.2 環境変数管理
```env
# .env
# データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventory_db
DB_USER=inventory_user
DB_PASSWORD=your_secure_password_here

# Redis設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# API認証
API_SECRET_KEY=your_very_long_and_random_secret_key_here
CSRF_SECRET=another_random_secret_for_csrf_protection

# 外部API
AMAZON_ACCESS_KEY=your_amazon_access_key
AMAZON_SECRET_KEY=your_amazon_secret_key
EBAY_APP_ID=your_ebay_app_id
EBAY_DEV_ID=your_ebay_dev_id

# セキュリティ設定
ALLOWED_ORIGINS=localhost,your-domain.com
SESSION_LIFETIME=3600
MAX_LOGIN_ATTEMPTS=5

# メール設定
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password

# アラート設定
ALERT_EMAIL=admin@your-domain.com
ERROR_WEBHOOK_URL=https://hooks.slack.com/your-webhook-url
```

### フェーズ5: 監視・アラートシステム (1週間)

#### 5.1 リアルタイム監視ダッシュボード
```php
// api/dashboard.php
<?php
require_once '../includes/SecurityManager.php';
require_once '../includes/InventoryManager.php';

$security = new SecurityManager();
$inventory = new InventoryManager();

// API認証
$token = $_SERVER['HTTP_AUTHORIZATION'] ?? $_POST['token'] ?? '';
$security->authenticateApiRequest($token, 'dashboard');

try {
    $stats = [
        // リアルタイム統計
        'monitored_products' => $inventory->getMonitoredProductCount(),
        'active_workers' => $inventory->getActiveWorkerCount(),
        'queue_status' => $inventory->getQueueStatus(),
        
        // 今日の実行統計
        'today_executions' => $inventory->getTodayExecutionStats(),
        'success_rate' => $inventory->calculateSuccessRate(24), // 24時間
        'avg_processing_time' => $inventory->getAverageProcessingTime(),
        
        // エラー統計
        'pending_errors' => $inventory->getPendingErrorCount(),
        'error_breakdown' => $inventory->getErrorBreakdown(),
        'critical_alerts' => $inventory->getCriticalAlerts(),
        
        // システム健全性
        'database_status' => $inventory->checkDatabaseHealth(),
        'api_status' => $inventory->checkExternalApiStatus(),
        'disk_usage' => $inventory->getDiskUsage(),
        
        // 最新ログ
        'recent_logs' => $inventory->getRecentLogs(50),
        'last_update' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode([
        'success' => true,
        'data' => $stats,
        'timestamp' => date('c')
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ]);
}
?>
```

#### 5.2 アラート・通知システム【拡張版】
```php
// includes/AlertManager.php
class AlertManager {
    private $mailer;
    private $slackWebhook;
    private $logger;
    
    public function __construct() {
        $this->mailer = new PHPMailer(true);
        $this->setupSMTP();
        $this->slackWebhook = $_ENV['ERROR_WEBHOOK_URL'];
        $this->logger = new Logger('alerts');
    }
    
    // 重要度別アラート送信
    public function sendAlert($level, $title, $message, $data = []) {
        $alert = [
            'level' => $level, // 'info', 'warning', 'error', 'critical'
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('c'),
            'hostname' => gethostname()
        ];
        
        // ログに記録
        $this->logger->log($level, $title, $alert);
        
        // 重要度に応じて通知方法を選択
        switch ($level) {
            case 'critical':
                $this->sendEmailAlert($alert);
                $this->sendSlackAlert($alert);
                $this->sendSmsAlert($alert); // 緊急時
                break;
                
            case 'error':
                $this->sendEmailAlert($alert);
                $this->sendSlackAlert($alert);
                break;
                
            case 'warning':
                $this->sendSlackAlert($alert);
                break;
                
            case 'info':
                // ログのみ（通知なし）
                break;
        }
    }
    
    // 在庫切れ連鎖アラート
    public function checkStockOutageChain() {
        $stockOutProducts = $this->getStockOutProducts();
        
        if (count($stockOutProducts) > 10) { // 10商品以上で在庫切れ
            $this->sendAlert('critical', 
                '大規模在庫切れ検出', 
                count($stockOutProducts) . '商品で在庫切れが発生しています',
                ['affected_products' => array_slice($stockOutProducts, 0, 20)] // 最初の20商品
            );
        }
    }
    
    // API障害連鎖アラート
    public function checkApiHealthChain() {
        $apiStatus = [
            'amazon' => $this->checkAmazonApiHealth(),
            'ebay' => $this->checkEbayApiHealth(),
            'yahoo' => $this->checkYahooScrapingHealth()
        ];
        
        $failedApis = array_filter($apiStatus, fn($status) => !$status);
        
        if (count($failedApis) >= 2) {
            $this->sendAlert('critical',
                '複数API障害検出',
                '複数の外部サービスで障害が発生しています',
                ['failed_apis' => array_keys($failedApis)]
            );
        }
    }
    
    // 日次サマリーレポート（拡張版）
    public function sendDailySummary() {
        $summary = [
            'date' => date('Y-m-d'),
            'total_executions' => $this->getTotalExecutions(),
            'success_rate' => $this->getSuccessRate(),
            'top_errors' => $this->getTopErrors(5),
            'stock_changes' => $this->getStockChangeSummary(),
            'price_changes' => $this->getPriceChangeSummary(),
            'performance_metrics' => $this->getPerformanceMetrics()
        ];
        
        $this->sendEmailAlert([
            'level' => 'info',
            'title' => '在庫管理システム 日次レポート',
            'message' => $this->generateSummaryHtml($summary),
            'data' => $summary
        ]);
    }
    
    private function sendSlackAlert($alert) {
        if (!$this->slackWebhook) return;
        
        $payload = [
            'text' => $alert['title'],
            'attachments' => [[
                'color' => $this->getSlackColor($alert['level']),
                'fields' => [
                    [
                        'title' => 'メッセージ',
                        'value' => $alert['message'],
                        'short' => false
                    ],
                    [
                        'title' => '時刻',
                        'value' => $alert['timestamp'],
                        'short' => true
                    ],
                    [
                        'title' => 'サーバー',
                        'value' => $alert['hostname'],
                        'short' => true
                    ]
                ]
            ]]
        ];
        
        $ch = curl_init($this->slackWebhook);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_exec($ch);
        curl_close($ch);
    }
}
```

## ⏰ スケジュール実行システム【最適化版】

### Cronジョブ設定（負荷分散）
```bash
# /etc/crontab または crontab -e

# 在庫チェック: 毎日 8時, 14時, 20時（分散実行）
0 8 * * * cd /path/to/project/10_zaiko && php scheduler.php stock_check
0 14 * * * cd /path/to/project/10_zaiko && php scheduler.php stock_check
0 20 * * * cd /path/to/project/10_zaiko && php scheduler.php stock_check

# 価格チェック: 毎日 9時, 15時, 21時（在庫チェックと時間をずらす）
0 9,15,21 * * * cd /path/to/project/10_zaiko && php scheduler.php price_check

# 全商品検証: 毎日 2時（深夜の軽負荷時間）
0 2 * * * cd /path/to/project/10_zaiko && php scheduler.php full_validation

# ヘルスチェック: 5分ごと
*/5 * * * * cd /path/to/project/10_zaiko && php scheduler.php health_check

# ログクリーンアップ: 毎日 3時
0 3 * * * cd /path/to/project/10_zaiko && ./scripts/cleanup.sh

# 日次サマリー: 毎日 23時
0 23 * * * cd /path/to/project/10_zaiko && php scheduler.php daily_summary

# 週次バックアップ: 毎週日曜 1時
0 1 * * 0 cd /path/to/project/10_zaiko && ./scripts/backup.sh

# ワーカープロセス監視・再起動: 毎分
* * * * * cd /path/to/project/10_zaiko && ./scripts/check_workers.sh
```

## 🚀 VPS展開・パフォーマンス最適化

### Docker Compose（本番環境用）
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  php:
    build:
      context: .
      dockerfile: Dockerfile.prod
    volumes:
      - ./:/var/www/html
      - ./logs:/var/www/html/logs
    environment:
      - PHP_MEMORY_LIMIT=512M
      - PHP_MAX_EXECUTION_TIME=600
      - PHP_OPCACHE_ENABLE=1
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./:/var/www/html
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - php
    restart: unless-stopped
    
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    
  # ワーカープロセス（スケーラブル）
  stock-worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    command: php workers/StockCheckWorker.php
    volumes:
      - ./:/var/www/html
      - ./logs:/var/www/html/logs
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    scale: 3  # 3つのワーカープロセス
    
  price-worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    command: php workers/PriceSyncWorker.php
    volumes:
      - ./:/var/www/html
      - ./logs:/var/www/html/logs
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    scale: 2
    
  # 監視・ヘルスチェック
  monitoring:
    build:
      context: .
      dockerfile: Dockerfile.monitoring
    command: php monitoring/HealthCheckService.php
    volumes:
      - ./:/var/www/html
      - ./logs:/var/www/html/logs
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    driver: bridge
```

### パフォーマンス最適化クラス
```php
// includes/PerformanceOptimizer.php
class PerformanceOptimizer {
    private $cache;
    private $metrics;
    
    public function __construct() {
        $this->cache = new Redis();
        $this->cache->connect('localhost', 6379);
        $this->metrics = new PerformanceMetrics();
    }
    
    // 指数バックオフ付きリトライ処理
    public function executeWithRetry(callable $operation, $maxRetries = 3, $baseDelay = 1) {
        $attempt = 0;
        
        while ($attempt < $maxRetries) {
            $startTime = microtime(true);
            
            try {
                $result = $operation();
                
                // 成功時のメトリクス記録
                $executionTime = microtime(true) - $startTime;
                $this->metrics->recordSuccess($executionTime);
                
                return $result;
                
            } catch (Exception $e) {
                $attempt++;
                $executionTime = microtime(true) - $startTime;
                $this->metrics->recordFailure($executionTime, $e->getMessage());
                
                if ($attempt >= $maxRetries) {
                    throw $e;
                }
                
                // 指数バックオフ（1秒、2秒、4秒...）
                $delay = $baseDelay * pow(2, $attempt - 1);
                sleep($delay);
            }
        }
    }
    
    // 結果キャッシュ（TTL付き）
    public function cacheResult($key, callable $operation, $ttl = 3600) {
        $cachedResult = $this->cache->get($key);
        
        if ($cachedResult !== false) {
            return json_decode($cachedResult, true);
        }
        
        $result = $operation();
        $this->cache->setex($key, $ttl, json_encode($result));
        
        return $result;
    }
    
    // バッチ処理最適化
    public function optimizeBatchSize($totalItems, $maxExecutionTime = 300) {
        // 過去の実行データから最適なバッチサイズを算出
        $avgProcessingTime = $this->metrics->getAverageProcessingTime();
        
        if ($avgProcessingTime > 0) {
            $optimalBatchSize = floor($maxExecutionTime / $avgProcessingTime * 0.8); // 20%のマージン
            return max(10, min($optimalBatchSize, 200)); // 10-200の範囲
        }
        
        return 50; // デフォルト値
    }
    
    // メモリ使用量監視
    public function checkMemoryUsage($threshold = 0.8) {
        $memoryUsage = memory_get_usage(true);
        $memoryLimit = $this->parseMemoryLimit(ini_get('memory_limit'));
        
        if ($memoryUsage / $memoryLimit > $threshold) {
            // ガベージコレクション実行
            gc_collect_cycles();
            
            // それでも高い場合は警告
            if (memory_get_usage(true) / $memoryLimit > $threshold) {
                throw new MemoryLimitException("メモリ使用量が制限に近づいています");
            }
        }
    }
    
    private function parseMemoryLimit($memoryLimit) {
        $unit = strtolower(substr($memoryLimit, -1));
        $value = (int)$memoryLimit;
        
        switch ($unit) {
            case 'g': return $value * 1024 * 1024 * 1024;
            case 'm': return $value * 1024 * 1024;
            case 'k': return $value * 1024;
            default: return $value;
        }
    }
}
```

## 📊 監視・メトリクス【完全版】

### リアルタイムダッシュボード
```html
<!-- manager.php のダッシュボード部分 -->
<div class="real-time-dashboard">
    <!-- システム概要 -->
    <div class="overview-panel">
        <div class="metric-card">
            <div class="metric-icon">📦</div>
            <div class="metric-info">
                <div class="metric-value" id="monitored-count">0</div>
                <div class="metric-label">監視中商品</div>
                <div class="metric-change positive" id="monitored-change">+0</div>
            </div>
        </div>
        
        <div class="metric-card">
            <div class="metric-icon">⚡</div>
            <div class="metric-info">
                <div class="metric-value" id="worker-count">0</div>
                <div class="metric-label">アクティブワーカー</div>
                <div class="metric-status online" id="worker-status">オンライン</div>
            </div>
        </div>
        
        <div class="metric-card">
            <div class="metric-icon">📈</div>
            <div class="metric-info">
                <div class="metric-value" id="success-rate">0%</div>
                <div class="metric-label">成功率（24時間）</div>
                <div class="metric-change positive" id="success-change">+0%</div>
            </div>
        </div>
        
        <div class="metric-card">
            <div class="metric-icon">⚠️</div>
            <div class="metric-info">
                <div class="metric-value error" id="error-count">0</div>
                <div class="metric-label">未解決エラー</div>
                <div class="metric-change negative" id="error-change">-0</div>
            </div>
        </div>
    </div>
    
    <!-- キュー状況 -->
    <div class="queue-panel">
        <h3>処理キュー状況</h3>
        <div class="queue-list">
            <div class="queue-item">
                <span class="queue-name">在庫チェック</span>
                <div class="queue-progress">
                    <div class="progress-bar" data-queue="stock_check"></div>
                </div>
                <span class="queue-count" id="stock-queue-count">0</span>
            </div>
            
            <div class="queue-item">
                <span class="queue-name">価格同期</span>
                <div class="queue-progress">
                    <div class="progress-bar" data-queue="price_sync"></div>
                </div>
                <span class="queue-count" id="price-queue-count">0</span>
            </div>
            
            <div class="queue-item">
                <span class="queue-name">出品先同期</span>
                <div class="queue-progress">
                    <div class="progress-bar" data-queue="platform_sync"></div>
                </div>
                <span class="queue-count" id="platform-queue-count">0</span>
            </div>
        </div>
    </div>
    
    <!-- エラー詳細 -->
    <div class="error-panel">
        <h3>最新エラー</h3>
        <div class="error-list" id="error-list">
            <!-- JavaScriptで動的に更新 -->
        </div>
    </div>
    
    <!-- システムヘルス -->
    <div class="health-panel">
        <h3>システムヘルス</h3>
        <div class="health-indicators">
            <div class="health-item">
                <span class="health-label">データベース</span>
                <span class="health-status online" id="db-status">正常</span>
                <span class="health-latency" id="db-latency">12ms</span>
            </div>
            
            <div class="health-item">
                <span class="health-label">Redis</span>
                <span class="health-status online" id="redis-status">正常</span>
                <span class="health-latency" id="redis-latency">5ms</span>
            </div>
            
            <div class="health-item">
                <span class="health-label">Amazon API</span>
                <span class="health-status online" id="amazon-status">正常</span>
                <span class="health-latency" id="amazon-latency">230ms</span>
            </div>
            
            <div class="health-item">
                <span class="health-label">eBay API</span>
                <span class="health-status warning" id="ebay-status">注意</span>
                <span class="health-latency" id="ebay-latency">850ms</span>
            </div>
        </div>
    </div>
</div>

<script>
// リアルタイム更新
function updateDashboard() {
    fetch('api/dashboard.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('api_token')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateMetrics(data.data);
            updateQueueStatus(data.data.queue_status);
            updateErrors(data.data.recent_errors);
            updateHealthStatus(data.data.api_status);
        }
    })
    .catch(error => {
        console.error('ダッシュボード更新エラー:', error);
    });
}

// 5秒ごとに更新
setInterval(updateDashboard, 5000);
updateDashboard(); // 初期読み込み
</script>
```

## 🛡️ セキュリティ・信頼性【最終版】

### 1. 多層セキュリティ防御
```php
// セキュリティミドルウェア
class SecurityMiddleware {
    public static function authenticate($request) {
        // 1. IP白名单检查
        if (!self::isAllowedIP($_SERVER['REMOTE_ADDR'])) {
            throw new ForbiddenException('アクセスが拒否されました');
        }
        
        // 2. レート制限
        if (!self::checkRateLimit($_SERVER['REMOTE_ADDR'])) {
            throw new TooManyRequestsException('リクエスト制限に達しました');
        }
        
        // 3. APIトークン検証
        $token = self::extractToken($request);
        if (!self::validateToken($token)) {
            throw new UnauthorizedException('認証が必要です');
        }
        
        // 4. CSRF保護
        if ($request['method'] === 'POST') {
            self::validateCsrfToken($request);
        }
        
        // 5. 入力検証
        self::sanitizeInput($request);
        
        return true;
    }
    
    private static function isAllowedIP($ip) {
        $allowedIPs = explode(',', $_ENV['ALLOWED_IPS'] ?? '127.0.0.1');
        return in_array($ip, $allowedIPs) || $ip === '127.0.0.1';
    }
    
    private static function checkRateLimit($ip) {
        $redis = new Redis();
        $redis->connect('localhost', 6379);
        
        $key = "rate_limit:$ip:" . floor(time() / 60); // 1分単位
        $count = $redis->incr($key);
        $redis->expire($key, 60);
        
        return $count <= 100; // 1分間に100リクエストまで
    }
}
```

### 2. データ暗号化・機密情報保護
```php
// includes/EncryptionManager.php
class EncryptionManager {
    private $encryptionKey;
    private $cipher = 'AES-256-GCM';
    
    public function __construct() {
        $this->encryptionKey = base64_decode($_ENV['ENCRYPTION_KEY']);
    }
    
    // 機密データ暗号化
    public function encrypt($data) {
        $iv = random_bytes(12); // GCMモード用IV
        $tag = '';
        
        $encrypted = openssl_encrypt(
            json_encode($data),
            $this->cipher,
            $this->encryptionKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        
        if ($encrypted === false) {
            throw new EncryptionException('暗号化に失敗しました');
        }
        
        return base64_encode($iv . $tag . $encrypted);
    }
    
    // 機密データ復号化
    public function decrypt($encryptedData) {
        $data = base64_decode($encryptedData);
        $iv = substr($data, 0, 12);
        $tag = substr($data, 12, 16);
        $encrypted = substr($data, 28);
        
        $decrypted = openssl_decrypt(
            $encrypted,
            $this->cipher,
            $this->encryptionKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        
        if ($decrypted === false) {
            throw new DecryptionException('復号化に失敗しました');
        }
        
        return json_decode($decrypted, true);
    }
    
    // APIキー暗号化保存
    public function storeApiKey($platform, $apiKey) {
        $encrypted = $this->encrypt($apiKey);
        
        $sql = "INSERT INTO encrypted_credentials (platform, encrypted_key, created_at) 
                VALUES (?, ?, NOW()) 
                ON CONFLICT (platform) DO UPDATE SET 
                encrypted_key = EXCLUDED.encrypted_key, 
                updated_at = NOW()";
        
        $this->db->execute($sql, [$platform, $encrypted]);
    }
    
    // APIキー復号化取得
    public function getApiKey($platform) {
        $sql = "SELECT encrypted_key FROM encrypted_credentials WHERE platform = ?";
        $encryptedKey = $this->db->selectValue($sql, [$platform]);
        
        if (!$encryptedKey) {
            throw new NotFoundException("$platform のAPIキーが見つかりません");
        }
        
        return $this->decrypt($encryptedKey);
    }
}
```

### 3. 監査ログ・セキュリティ監視
```php
// includes/AuditLogger.php
class AuditLogger {
    private $db;
    private $alertManager;
    
    public function __construct() {
        $this->db = new Database();
        $this->alertManager = new AlertManager();
    }
    
    // セキュリティイベント記録
    public function logSecurityEvent($eventType, $details = []) {
        $event = [
            'event_type' => $eventType,
            'user_ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'session_id' => session_id(),
            'details' => json_encode($details),
            'timestamp' => date('Y-m-d H:i:s'),
            'severity' => $this->getSeverity($eventType)
        ];
        
        // データベースに記録
        $this->db->insert('security_audit_log', $event);
        
        // 高リスクイベントの場合は即座にアラート
        if ($event['severity'] === 'high') {
            $this->alertManager->sendAlert('error', 
                "セキュリティイベント: {$eventType}",
                "IP: {$event['user_ip']}, 詳細: " . json_encode($details)
            );
        }
        
        // 異常パターン検知
        $this->detectAnomalousActivity($eventType, $event['user_ip']);
    }
    
    // 異常活動検知
    private function detectAnomalousActivity($eventType, $userIp) {
        // 1時間以内の同一IPからの失敗試行回数をチェック
        $sql = "SELECT COUNT(*) FROM security_audit_log 
                WHERE user_ip = ? AND event_type = ? 
                AND timestamp > NOW() - INTERVAL '1 hour'";
        
        $failureCount = $this->db->selectValue($sql, [$userIp, $eventType]);
        
        // 閾値を超えた場合
        if ($failureCount > $this->getFailureThreshold($eventType)) {
            $this->alertManager->sendAlert('critical',
                '異常活動検知',
                "IP $userIp から $eventType が $failureCount 回発生しています"
            );
            
            // 一時的にIPをブロック（Redis）
            $this->blockIpTemporarily($userIp, 3600); // 1時間ブロック
        }
    }
    
    private function getSeverity($eventType) {
        $severityMap = [
            'login_failure' => 'medium',
            'invalid_token' => 'medium',
            'sql_injection_attempt' => 'high',
            'xss_attempt' => 'high',
            'unauthorized_api_access' => 'high',
            'data_export' => 'medium',
            'admin_action' => 'low'
        ];
        
        return $severityMap[$eventType] ?? 'low';
    }
}
```

## 📈 成功指標・KPI【完全版】

### 技術指標
```php
// includes/KPIManager.php
class KPIManager {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    // システム可用性計算
    public function calculateUptime($period = '24 hours') {
        $sql = "SELECT 
                    COUNT(*) as total_checks,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_checks
                FROM inventory_execution_logs 
                WHERE created_at > NOW() - INTERVAL ?";
        
        $result = $this->db->selectRow($sql, [$period]);
        
        if ($result['total_checks'] == 0) return 100;
        
        return round(($result['successful_checks'] / $result['total_checks']) * 100, 2);
    }
    
    // 在庫同期精度
    public function calculateSyncAccuracy($period = '24 hours') {
        $sql = "SELECT 
                    COUNT(*) as total_syncs,
                    COUNT(CASE WHEN error_message IS NULL THEN 1 END) as successful_syncs
                FROM listing_platforms lp
                JOIN inventory_execution_logs iel ON iel.id = lp.last_sync_log_id
                WHERE lp.last_synced_at > NOW() - INTERVAL ?";
        
        $result = $this->db->selectRow($sql, [$period]);
        
        if ($result['total_syncs'] == 0) return 100;
        
        return round(($result['successful_syncs'] / $result['total_syncs']) * 100, 2);
    }
    
    // 平均応答時間
    public function calculateAverageResponseTime($period = '24 hours') {
        $sql = "SELECT AVG(EXTRACT(EPOCH FROM (execution_end - execution_start))) as avg_time
                FROM inventory_execution_logs 
                WHERE execution_end IS NOT NULL 
                AND created_at > NOW() - INTERVAL ?";
        
        return round($this->db->selectValue($sql, [$period]), 2);
    }
    
    // エラー率
    public function calculateErrorRate($period = '24 hours') {
        $sql = "SELECT 
                    COUNT(*) as total_executions,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions
                FROM inventory_execution_logs 
                WHERE created_at > NOW() - INTERVAL ?";
        
        $result = $this->db->selectRow($sql, [$period]);
        
        if ($result['total_executions'] == 0) return 0;
        
        return round(($result['failed_executions'] / $result['total_executions']) * 100, 2);
    }
    
    // 日次KPIレポート生成
    public function generateDailyReport() {
        return [
            'date' => date('Y-m-d'),
            'uptime_24h' => $this->calculateUptime('24 hours'),
            'sync_accuracy_24h' => $this->calculateSyncAccuracy('24 hours'),
            'avg_response_time' => $this->calculateAverageResponseTime('24 hours'),
            'error_rate_24h' => $this->calculateErrorRate('24 hours'),
            'total_products_monitored' => $this->getTotalMonitoredProducts(),
            'stock_updates_today' => $this->getStockUpdatesCount('24 hours'),
            'price_updates_today' => $this->getPriceUpdatesCount('24 hours'),
            'critical_errors_today' => $this->getCriticalErrorsCount('24 hours')
        ];
    }
}
```

### ビジネス指標ダッシュボード
```html
<!-- KPIダッシュボード部分 -->
<div class="kpi-dashboard">
    <h2>Key Performance Indicators</h2>
    
    <div class="kpi-grid">
        <div class="kpi-card uptime">
            <div class="kpi-header">
                <i class="fas fa-clock"></i>
                <h3>システム稼働率</h3>
            </div>
            <div class="kpi-value" id="uptime-value">99.8%</div>
            <div class="kpi-target">目標: 99.5%</div>
            <div class="kpi-status achieved">達成</div>
        </div>
        
        <div class="kpi-card accuracy">
            <div class="kpi-header">
                <i class="fas fa-crosshairs"></i>
                <h3>在庫同期精度</h3>
            </div>
            <div class="kpi-value" id="accuracy-value">99.2%</div>
            <div class="kpi-target">目標: 99.0%</div>
            <div class="kpi-status achieved">達成</div>
        </div>
        
        <div class="kpi-card response">
            <div class="kpi-header">
                <i class="fas fa-tachometer-alt"></i>
                <h3>平均応答時間</h3>
            </div>
            <div class="kpi-value" id="response-value">2.3秒</div>
            <div class="kpi-target">目標: 3.0秒以下</div>
            <div class="kpi-status achieved">達成</div>
        </div>
        
        <div class="kpi-card errors">
            <div class="kpi-header">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>エラー率</h3>
            </div>
            <div class="kpi-value" id="error-rate-value">3.2%</div>
            <div class="kpi-target">目標: 5.0%以下</div>
            <div class="kpi-status achieved">達成</div>
        </div>
    </div>
    
    <!-- ビジネス効果測定 -->
    <div class="business-impact">
        <h3>ビジネス効果測定</h3>
        
        <div class="impact-metrics">
            <div class="impact-item">
                <span class="impact-label">在庫切れ損失削減</span>
                <span class="impact-value success">-28%</span>
                <span class="impact-detail">月間 ¥1,250,000 の損失回避</span>
            </div>
            
            <div class="impact-item">
                <span class="impact-label">価格競争力維持</span>
                <span class="impact-value success">97%</span>
                <span class="impact-detail">市場価格から±5%以内維持率</span>
            </div>
            
            <div class="impact-item">
                <span class="impact-label">運営効率化</span>
                <span class="impact-value success">-85%</span>
                <span class="impact-detail">手動作業時間削減（週40時間→6時間）</span>
            </div>
            
            <div class="impact-item">
                <span class="impact-label">データ信頼性</span>
                <span class="impact-value success">0.3%</span>
                <span class="impact-detail">データ不整合発生率</span>
            </div>
        </div>
    </div>
</div>
```

## 🔄 継続的改善・保守計画

### 1. システム監視・保守スケジュール
```bash
#!/bin/bash
# scripts/maintenance_schedule.sh

# 日次保守タスク
run_daily_maintenance() {
    echo "=== 日次保守開始 $(date) ==="
    
    # 1. ログファイルローテーション
    logrotate /etc/logrotate.d/inventory_system
    
    # 2. データベースバキューム（軽量）
    psql -d inventory_db -c "VACUUM ANALYZE inventory_management;"
    
    # 3. 古いキューアイテム削除
    psql -d inventory_db -c "DELETE FROM processing_queue 
                             WHERE status = 'completed' 
                             AND completed_at < NOW() - INTERVAL '7 days';"
    
    # 4. Redis メモリ最適化
    redis-cli MEMORY PURGE
    
    # 5. 一時ファイル削除
    find /tmp -name "inventory_*" -mtime +1 -delete
    
    echo "=== 日次保守完了 $(date) ==="
}

# 週次保守タスク
run_weekly_maintenance() {
    echo "=== 週次保守開始 $(date) ==="
    
    # 1. データベースフルバキューム
    psql -d inventory_db -c "VACUUM FULL;"
    
    # 2. インデックス再構築
    psql -d inventory_db -c "REINDEX DATABASE inventory_db;"
    
    # 3. 古いログデータアーカイブ
    ./scripts/archive_old_logs.sh
    
    # 4. パフォーマンステストスイート実行
    php tests/performance/PerformanceTestSuite.php
    
    echo "=== 週次保守完了 $(date) ==="
}

# 月次保守タスク
run_monthly_maintenance() {
    echo "=== 月次保守開始 $(date) ==="
    
    # 1. データベース統計更新
    psql -d inventory_db -c "ANALYZE;"
    
    # 2. 古いパーティション削除
    ./scripts/cleanup_old_partitions.sh
    
    # 3. セキュリティパッチ確認
    ./scripts/security_audit.sh
    
    # 4. システム全体バックアップ
    ./scripts/full_system_backup.sh
    
    echo "=== 月次保守完了 $(date) ==="
}
```

### 2. 自動化された品質保証
```php
// tests/HealthCheckSuite.php
class HealthCheckSuite {
    private $tests;
    private $alertManager;
    
    public function __construct() {
        $this->tests = [
            'database_connection' => new DatabaseHealthTest(),
            'redis_connection' => new RedisHealthTest(),
            'external_apis' => new ExternalAPIHealthTest(),
            'queue_processing' => new QueueHealthTest(),
            'disk_space' => new DiskSpaceTest(),
            'memory_usage' => new MemoryUsageTest(),
            'response_times' => new ResponseTimeTest()
        ];
        
        $this->alertManager = new AlertManager();
    }
    
    public function runAllTests() {
        $results = [];
        $overallHealth = true;
        
        foreach ($this->tests as $testName => $test) {
            try {
                $result = $test->run();
                $results[$testName] = $result;
                
                if (!$result['passed']) {
                    $overallHealth = false;
                    
                    $this->alertManager->sendAlert(
                        $result['severity'] ?? 'warning',
                        "ヘルスチェック失敗: $testName",
                        $result['message'] ?? 'ヘルスチェックで問題が検出されました'
                    );
                }
                
            } catch (Exception $e) {
                $results[$testName] = [
                    'passed' => false,
                    'severity' => 'error',
                    'message' => $e->getMessage()
                ];
                $overallHealth = false;
            }
        }
        
        // 結果をデータベースに記録
        $this->recordHealthCheckResult($results, $overallHealth);
        
        return [
            'overall_health' => $overallHealth,
            'test_results' => $results,
            'timestamp' => date('c')
        ];
    }
    
    private function recordHealthCheckResult($results, $overallHealth) {
        $db = new Database();
        $db->insert('health_check_results', [
            'check_timestamp' => 'NOW()',
            'overall_status' => $overallHealth ? 'healthy' : 'unhealthy',
            'test_results' => json_encode($results),
            'failed_tests' => count(array_filter($results, fn($r) => !$r['passed']))
        ]);
    }
}

// 個別テストクラス例
class DatabaseHealthTest {
    public function run() {
        try {
            $db = new Database();
            $startTime = microtime(true);
            
            // 簡単なクエリで接続テスト
            $result = $db->selectValue("SELECT COUNT(*) FROM inventory_management");
            
            $responseTime = (microtime(true) - $startTime) * 1000; // ミリ秒
            
            if ($responseTime > 1000) { // 1秒以上
                return [
                    'passed' => false,
                    'severity' => 'warning',
                    'message' => "データベース応答時間が遅い: {$responseTime}ms"
                ];
            }
            
            return [
                'passed' => true,
                'response_time' => $responseTime,
                'message' => 'データベース接続正常'
            ];
            
        } catch (Exception $e) {
            return [
                'passed' => false,
                'severity' => 'critical',
                'message' => 'データベース接続失敗: ' . $e->getMessage()
            ];
        }
    }
}
```

### 3. プロアクティブなパフォーマンス監視
```php
// includes/PerformanceMonitor.php
class PerformanceMonitor {
    private $redis;
    private $alertManager;
    
    public function __construct() {
        $this->redis = new Redis();
        $this->redis->connect('localhost', 6379);
        $this->alertManager = new AlertManager();
    }
    
    // パフォーマンスメトリクス収集
    public function collectMetrics() {
        $metrics = [
            'timestamp' => time(),
            'memory_usage' => memory_get_usage(true),
            'peak_memory' => memory_get_peak_usage(true),
            'cpu_load' => sys_getloadavg()[0],
            'active_connections' => $this->getActiveConnections(),
            'queue_lengths' => $this->getQueueLengths(),
            'response_times' => $this->getRecentResponseTimes()
        ];
        
        // メトリクスをRedisに保存（時系列データ）
        $key = 'metrics:' . date('Y-m-d:H:i');
        $this->redis->setex($key, 3600, json_encode($metrics)); // 1時間保持
        
        // 異常値検知
        $this->detectPerformanceAnomalies($metrics);
        
        return $metrics;
    }
    
    // パフォーマンス異常検知
    private function detectPerformanceAnomalies($currentMetrics) {
        // 過去1時間の平均値を取得
        $historicalData = $this->getHistoricalMetrics(60); // 60分
        
        if (empty($historicalData)) return;
        
        $avgMemory = array_sum(array_column($historicalData, 'memory_usage')) / count($historicalData);
        $avgCpuLoad = array_sum(array_column($historicalData, 'cpu_load')) / count($historicalData);
        
        // メモリ使用量が平均の150%を超えた場合
        if ($currentMetrics['memory_usage'] > $avgMemory * 1.5) {
            $this->alertManager->sendAlert('warning',
                'メモリ使用量異常',
                sprintf('現在: %d MB, 平均: %d MB', 
                    $currentMetrics['memory_usage'] / 1024 / 1024,
                    $avgMemory / 1024 / 1024
                )
            );
        }
        
        // CPU負荷が平均の200%を超えた場合
        if ($currentMetrics['cpu_load'] > $avgCpuLoad * 2.0) {
            $this->alertManager->sendAlert('warning',
                'CPU負荷異常',
                sprintf('現在: %.2f, 平均: %.2f', 
                    $currentMetrics['cpu_load'],
                    $avgCpuLoad
                )
            );
        }
    }
    
    // 予測分析（トレンド検知）
    public function predictResourceNeeds() {
        $dailyMetrics = $this->getDailyMetrics(30); // 30日分
        
        if (count($dailyMetrics) < 7) return null; // 最低7日必要
        
        // 線形回帰で傾向を算出
        $memoryTrend = $this->calculateTrend(array_column($dailyMetrics, 'avg_memory'));
        $cpuTrend = $this->calculateTrend(array_column($dailyMetrics, 'avg_cpu'));
        
        $prediction = [
            'memory_trend' => $memoryTrend,
            'cpu_trend' => $cpuTrend,
            'predicted_peak_memory_30_days' => $this->predictValue($memoryTrend, 30),
            'predicted_peak_cpu_30_days' => $this->predictValue($cpuTrend, 30),
            'recommendation' => $this->generateRecommendation($memoryTrend, $cpuTrend)
        ];
        
        return $prediction;
    }
    
    private function generateRecommendation($memoryTrend, $cpuTrend) {
        $recommendations = [];
        
        if ($memoryTrend['slope'] > 10000000) { // 10MB/日以上の増加
            $recommendations[] = 'メモリ使用量が増加傾向にあります。メモリ増設を検討してください。';
        }
        
        if ($cpuTrend['slope'] > 0.1) { // 0.1/日以上の増加
            $recommendations[] = 'CPU負荷が増加傾向にあります。プロセス数の調整またはスケールアップを検討してください。';
        }
        
        if (empty($recommendations)) {
            $recommendations[] = 'リソース使用量は安定しています。';
        }
        
        return $recommendations;
    }
}
```

## 🎯 開発完了の定義・テスト計画

### 受け入れ基準
```php
// tests/AcceptanceCriteria.php
class AcceptanceCriteria {
    public function validateSystemReadiness() {
        $criteria = [
            // 機能要件
            'stock_monitoring' => $this->testStockMonitoring(),
            'price_tracking' => $this->testPriceTracking(),
            'multi_platform_sync' => $this->testMultiPlatformSync(),
            'error_handling' => $this->testErrorHandling(),
            'alert_system' => $this->testAlertSystem(),
            
            // 性能要件
            'response_time' => $this->testResponseTime(),
            'concurrent_processing' => $this->testConcurrentProcessing(),
            'system_uptime' => $this->testSystemUptime(),
            
            // セキュリティ要件
            'authentication' => $this->testAuthentication(),
            'data_encryption' => $this->testDataEncryption(),
            'input_validation' => $this->testInputValidation(),
            
            // 運用要件
            'monitoring_dashboard' => $this->testMonitoringDashboard(),
            'backup_recovery' => $this->testBackupRecovery(),
            'log_management' => $this->testLogManagement()
        ];
        
        $passedTests = array_filter($criteria, fn($result) => $result['passed']);
        $passRate = count($passedTests) / count($criteria) * 100;
        
        return [
            'ready_for_production' => $passRate >= 95,
            'pass_rate' => $passRate,
            'test_results' => $criteria,
            'remaining_issues' => array_filter($criteria, fn($result) => !$result['passed'])
        ];
    }
    
    private function testStockMonitoring() {
        // 在庫監視機能のテスト
        try {
            $manager = new InventoryManager();
            
            // テスト商品を登録
            $testProductId = $manager->registerProduct(
                999999, 
                'https://page.auctions.yahoo.co.jp/jp/auction/test123',
                'yahoo'
            );
            
            // 在庫チェック実行
            $result = $manager->executeStockCheck();
            
            // 結果検証
            return [
                'passed' => $result['success'] && $result['processed_products'] > 0,
                'message' => '在庫監視機能正常',
                'details' => $result
            ];
            
        } catch (Exception $e) {
            return [
                'passed' => false,
                'message' => '在庫監視機能エラー: ' . $e->getMessage()
            ];
        }
    }
    
    private function testResponseTime() {
        // 応答時間テスト（目標: 3秒以下）
        $startTime = microtime(true);
        
        try {
            $manager = new InventoryManager();
            $result = $manager->getMonitoringProducts();
            
            $responseTime = microtime(true) - $startTime;
            
            return [
                'passed' => $responseTime <= 3.0,
                'message' => sprintf('応答時間: %.2f秒', $responseTime),
                'response_time' => $responseTime
            ];
            
        } catch (Exception $e) {
            return [
                'passed' => false,
                'message' => '応答時間テストエラー: ' . $e->getMessage()
            ];
        }
    }
}
```

---

## 📋 最終チェックリスト

### 開発完了前の必須確認事項

#### ✅ 機能要件
- [ ] ヤフオクスクレイピング機能（在庫・価格・URL生存確認）
- [ ] Amazon API連携機能（商品情報・在庫状況取得）
- [ ] 全出品先API同期機能（eBay、Mercari等）
- [ ] リアルタイム在庫変動検知・同期
- [ ] 価格変動追跡・自動調整
- [ ] URL死活監視・商品変更検知
- [ ] 異常値検知・アラート機能
- [ ] メール通知システム

#### ✅ 技術要件
- [ ] 指数バックオフ付きリトライ処理
- [ ] マイクロバッチ並列処理
- [ ] キューイングシステム（Redis）
- [ ] サーキットブレーカーパターン
- [ ] データベースパーティショニング
- [ ] レスポンススキーマ検証
- [ ] パフォーマンス最適化

#### ✅ セキュリティ要件
- [ ] API認証・レート制限
- [ ] 入力検証・SQLインジェクション対策
- [ ] XSS対策・CSRF保護
- [ ] データ暗号化（機密情報）
- [ ] 監査ログ・異常検知
- [ ] IP制限・セッション管理

#### ✅ 運用要件
- [ ] リアルタイムダッシュボード
- [ ] システムヘルス監視
- [ ] 自動バックアップ・復旧
- [ ] ログローテーション
- [ ] Cronジョブ設定
- [ ] Docker環境構築
- [ ] ワーカープロセス管理

#### ✅ 品質保証
- [ ] 単体テスト（95%以上カバレッジ）
- [ ] 統合テスト（外部API含む）
- [ ] パフォーマンステスト
- [ ] セキュリティテスト
- [ ] 負荷テスト
- [ ] 障害復旧テスト

---

**⚠️ 重要な開発原則**

1. **段階的リリース**: 本格運用前に段階的テストを実施
2. **冗長性の確保**: 単一障害点を排除
3. **監視の徹底**: 問題の早期発見・迅速な対応
4. **ドキュメント化**: 運用手順・トラブルシューティング
5. **継続的改善**: KPI監視・パフォーマンス最適化

この計画書に従って開発を進めることで、「ツールの根幹でエラーが出ると全て破綻する」リスクを最小化し、商業運用に耐える堅牢な在庫管理システムを構築できます。