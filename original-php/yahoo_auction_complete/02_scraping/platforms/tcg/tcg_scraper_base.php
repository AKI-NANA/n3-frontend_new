<?php
/**
 * TCG共通スクレイパー基底クラス
 * 
 * Yahoo Auction統合システムの設計思想を継承
 * 既存の在庫管理システム(10_zaiko)と完全連携
 * 
 * @version 1.0.0
 * @created 2025-09-26
 */

abstract class TCGScraperBase {
    protected $pdo;
    protected $logger;
    protected $config;
    protected $platformName;
    
    /**
     * コンストラクタ
     */
    public function __construct($pdo, $platformName = 'tcg_generic') {
        $this->pdo = $pdo;
        $this->platformName = $platformName;
        $this->initializeLogger();
        $this->loadConfig();
    }
    
    /**
     * ロガー初期化（既存システム準拠）
     */
    private function initializeLogger() {
        $logDir = __DIR__ . '/../../logs/' . $this->platformName;
        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
        }
        
        $this->logger = new class($logDir, $this->platformName) {
            private $logDir;
            private $platform;
            
            public function __construct($logDir, $platform) {
                $this->logDir = $logDir;
                $this->platform = $platform;
            }
            
            public function info($message) {
                $this->writeLog('INFO', $message);
            }
            
            public function error($message) {
                $this->writeLog('ERROR', $message);
            }
            
            public function warning($message) {
                $this->writeLog('WARNING', $message);
            }
            
            private function writeLog($level, $message) {
                $timestamp = date('Y-m-d H:i:s');
                $logFile = $this->logDir . '/' . date('Y-m-d') . '.log';
                $logMessage = "[{$timestamp}] [{$level}] [{$this->platform}] {$message}" . PHP_EOL;
                file_put_contents($logFile, $logMessage, FILE_APPEND);
            }
        };
    }
    
    /**
     * 設定読み込み（抽象メソッド - 各プラットフォームで実装）
     */
    abstract protected function loadConfig();
    
    /**
     * 商品ページ解析（抽象メソッド）
     */
    abstract protected function parseProductPage($html, $url);
    
    /**
     * 商品ID抽出（抽象メソッド）
     */
    abstract protected function extractProductId($url);
    
    /**
     * メインスクレイピング処理
     */
    public function scrapeProduct($url) {
        try {
            $this->logger->info("スクレイピング開始: {$url}");
            
            // URL検証
            if (!$this->isValidUrl($url)) {
                throw new InvalidArgumentException('無効なURL: ' . $url);
            }
            
            // 商品ID抽出
            $productId = $this->extractProductId($url);
            $this->logger->info("商品ID抽出: {$productId}");
            
            // 重複チェック（既存システムパターン）
            if ($this->isDuplicateProduct($productId, $url)) {
                $this->logger->info("重複商品検知: {$productId}");
                return $this->handleDuplicateProduct($productId, $url);
            }
            
            // HTML取得（リトライ機能付き）
            $html = $this->fetchWithRetry($url);
            
            if (!$html) {
                throw new Exception('HTML取得失敗');
            }
            
            // データ解析
            $rawData = $this->parseProductPage($html, $url);
            
            // TCGデータ正規化
            $normalizedData = $this->normalizeTCGData($rawData, $url, $productId);
            
            // データベース保存（yahoo_scraped_products準拠）
            $dbProductId = $this->saveToDatabase($normalizedData);
            
            // 在庫管理システム登録
            $this->registerToInventorySystem($dbProductId, $url, $normalizedData);
            
            $this->logger->info("スクレイピング完了: ProductID={$dbProductId}");
            
            return [
                'success' => true,
                'product_id' => $dbProductId,
                'platform' => $this->platformName,
                'data' => $normalizedData
            ];
            
        } catch (Exception $e) {
            $this->logger->error("スクレイピングエラー: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'platform' => $this->platformName,
                'url' => $url
            ];
        }
    }
    
    /**
     * URL検証
     */
    protected function isValidUrl($url) {
        if (empty($this->config['url_patterns'])) {
            return filter_var($url, FILTER_VALIDATE_URL) !== false;
        }
        
        foreach ($this->config['url_patterns'] as $pattern) {
            if (preg_match($pattern, $url)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * 重複商品チェック
     */
    protected function isDuplicateProduct($productId, $url) {
        $stmt = $this->pdo->prepare("
            SELECT id FROM tcg_products 
            WHERE product_id = ? OR source_url = ?
            LIMIT 1
        ");
        $stmt->execute([$productId, $url]);
        return $stmt->fetch() !== false;
    }
    
    /**
     * 重複商品処理
     */
    protected function handleDuplicateProduct($productId, $url) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM tcg_products 
            WHERE product_id = ? OR source_url = ?
            LIMIT 1
        ");
        $stmt->execute([$productId, $url]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'duplicate' => true,
            'product_id' => $existing['id'],
            'message' => '既存商品が見つかりました'
        ];
    }
    
    /**
     * HTML取得（リトライ機能付き - Yahoo Auction方式）
     */
    protected function fetchWithRetry($url, $retryCount = 0) {
        $maxRetries = $this->config['max_retries'] ?? 3;
        
        if ($retryCount >= $maxRetries) {
            $this->logger->error("最大リトライ回数超過: {$url}");
            return false;
        }
        
        try {
            // User-Agentローテーション
            $userAgents = $this->config['user_agents'] ?? [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            ];
            $userAgent = $userAgents[array_rand($userAgents)];
            
            $options = [
                'http' => [
                    'header' => "User-Agent: {$userAgent}\r\n",
                    'timeout' => $this->config['timeout'] ?? 30,
                    'ignore_errors' => true
                ]
            ];
            
            $context = stream_context_create($options);
            $html = file_get_contents($url, false, $context);
            
            // レート制限対応
            if (!empty($this->config['request_delay'])) {
                usleep($this->config['request_delay'] * 1000);
            }
            
            if ($html === false) {
                throw new Exception('HTML取得失敗');
            }
            
            return $html;
            
        } catch (Exception $e) {
            $this->logger->warning("HTML取得失敗 (Retry {$retryCount}): " . $e->getMessage());
            sleep(2); // リトライ前に待機
            return $this->fetchWithRetry($url, $retryCount + 1);
        }
    }
    
    /**
     * TCGデータ正規化
     */
    protected function normalizeTCGData($rawData, $url, $productId) {
        return [
            'product_id' => $productId,
            'platform' => $this->platformName,
            'source_url' => $url,
            'card_name' => $this->cleanCardName($rawData['title'] ?? ''),
            'price' => $this->extractNumericPrice($rawData['price'] ?? '0'),
            'condition' => $this->normalizeCondition($rawData['condition'] ?? ''),
            'stock_status' => $this->detectStockStatus($rawData),
            'rarity' => $rawData['rarity'] ?? null,
            'set_name' => $rawData['set_name'] ?? null,
            'card_number' => $rawData['card_number'] ?? null,
            'description' => $rawData['description'] ?? '',
            'image_url' => $rawData['image_url'] ?? '',
            'tcg_category' => $rawData['tcg_category'] ?? 'unknown',
            'tcg_specific_data' => json_encode($rawData['specific'] ?? []),
            'scraped_at' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * カード名クリーンアップ
     */
    protected function cleanCardName($title) {
        // サイト名等の不要文字列を除去
        $patterns = [
            '/ - .*$/',
            '/ \| .*$/',
            '/【.*?】/',
            '/\[.*?\]/'
        ];
        
        foreach ($patterns as $pattern) {
            $title = preg_replace($pattern, '', $title);
        }
        
        return trim($title);
    }
    
    /**
     * 価格数値抽出
     */
    protected function extractNumericPrice($priceText) {
        // 数値のみ抽出
        $price = preg_replace('/[^0-9]/', '', $priceText);
        return !empty($price) ? (float)$price : 0.0;
    }
    
    /**
     * 状態正規化
     */
    protected function normalizeCondition($condition) {
        $conditionMap = [
            '新品' => 'mint',
            '未使用' => 'near_mint',
            '美品' => 'excellent',
            '良好' => 'good',
            '傷あり' => 'played',
            '中古' => 'used'
        ];
        
        foreach ($conditionMap as $keyword => $normalized) {
            if (mb_strpos($condition, $keyword) !== false) {
                return $normalized;
            }
        }
        
        return 'unknown';
    }
    
    /**
     * 在庫状態検知
     */
    protected function detectStockStatus($rawData) {
        $soldKeywords = ['売り切れ', 'SOLD', '完売', '在庫切れ', 'sold out'];
        
        $checkText = strtolower(
            ($rawData['title'] ?? '') . ' ' . 
            ($rawData['stock_text'] ?? '') . ' ' . 
            ($rawData['sold_status'] ?? '')
        );
        
        foreach ($soldKeywords as $keyword) {
            if (mb_strpos($checkText, $keyword) !== false) {
                return 'sold_out';
            }
        }
        
        return 'in_stock';
    }
    
    /**
     * データベース保存（yahoo_scraped_products準拠）
     */
    protected function saveToDatabase($data) {
        $stmt = $this->pdo->prepare("
            INSERT INTO tcg_products (
                product_id, platform, source_url, card_name, price,
                condition, stock_status, rarity, set_name, card_number,
                description, image_url, tcg_category, tcg_specific_data,
                scraped_at, updated_at
            ) VALUES (
                :product_id, :platform, :source_url, :card_name, :price,
                :condition, :stock_status, :rarity, :set_name, :card_number,
                :description, :image_url, :tcg_category, :tcg_specific_data,
                :scraped_at, NOW()
            )
            ON CONFLICT (product_id, platform) DO UPDATE SET
                price = EXCLUDED.price,
                stock_status = EXCLUDED.stock_status,
                updated_at = NOW()
            RETURNING id
        ");
        
        $stmt->execute([
            'product_id' => $data['product_id'],
            'platform' => $data['platform'],
            'source_url' => $data['source_url'],
            'card_name' => $data['card_name'],
            'price' => $data['price'],
            'condition' => $data['condition'],
            'stock_status' => $data['stock_status'],
            'rarity' => $data['rarity'],
            'set_name' => $data['set_name'],
            'card_number' => $data['card_number'],
            'description' => $data['description'],
            'image_url' => $data['image_url'],
            'tcg_category' => $data['tcg_category'],
            'tcg_specific_data' => $data['tcg_specific_data'],
            'scraped_at' => $data['scraped_at']
        ]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['id'];
    }
    
    /**
     * 在庫管理システム登録（既存10_zaikoシステム連携）
     */
    protected function registerToInventorySystem($productId, $url, $data) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO inventory_management (
                    product_id, source_platform, source_url,
                    product_name, current_price, monitoring_enabled,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, true, NOW())
                ON CONFLICT (product_id, source_platform) DO UPDATE SET
                    current_price = EXCLUDED.current_price,
                    last_checked_at = NOW()
            ");
            
            $stmt->execute([
                $productId,
                $this->platformName,
                $url,
                $data['card_name'],
                $data['price']
            ]);
            
            $this->logger->info("在庫管理システム登録完了: ProductID={$productId}");
            
        } catch (Exception $e) {
            $this->logger->error("在庫管理システム登録エラー: " . $e->getMessage());
        }
    }
    
    /**
     * CSSセレクタ→XPath変換（Yahoo Auctionパターン）
     */
    protected function convertCssToXpath($selector) {
        // 簡易的なCSS→XPath変換
        $selector = str_replace('.', "contains(@class, '", $selector);
        $selector = str_replace('#', "contains(@id, '", $selector);
        
        if (strpos($selector, 'contains') !== false) {
            $selector = "//*[" . $selector . "')]";
        } else {
            $selector = "//{$selector}";
        }
        
        return $selector;
    }
    
    /**
     * XPathによる要素抽出
     */
    protected function extractByXPath($xpath, $query) {
        $nodes = $xpath->query($query);
        if ($nodes->length > 0) {
            return trim($nodes->item(0)->textContent);
        }
        return '';
    }
    
    /**
     * 複数セレクタによる抽出（フォールバック）
     */
    protected function extractBySelectors($xpath, $selectors) {
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $value = $this->extractByXPath($xpath, $xpathQuery);
            if (!empty($value)) {
                return $value;
            }
        }
        return '';
    }
}
