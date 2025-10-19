<?php
/**
 * メルカリ商品スクレイピングシステム
 * 
 * 既存のYahoo Auctionシステムをベースに、メルカリ対応を追加
 * 複数仕入れ先対応の在庫管理システムに統合
 * 
 * @version 1.0.0
 * @created 2025-09-25
 */

require_once __DIR__ . '/../../shared/core/database.php';
require_once __DIR__ . '/../../shared/core/logger.php';

/**
 * メルカリ設定クラス
 */
class MercariConfig {
    public static function getConfig() {
        return [
            'platform_name' => 'メルカリ',
            'platform_id' => 'mercari',
            'base_url' => 'https://jp.mercari.com',
            'request_delay' => 3000, // 3秒間隔（メルカリは厳しい）
            'timeout' => 30,
            'max_retries' => 3,
            'user_agents' => [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
            ],
            'selectors' => [
                'title' => 'h1[data-testid="name"]',
                'price' => 'span[data-testid="price"]',
                'condition' => '[data-testid="item-condition"]',
                'description' => '[data-testid="description"]',
                'images' => 'img[data-testid="product-image"]',
                'seller' => '[data-testid="seller-name"]',
                'sold_status' => '[data-testid="item-sold-out-badge"]',
                'shipping' => '[data-testid="shipping-method"]'
            ]
        ];
    }
}

/**
 * メルカリスクレイピングクラス
 */
class MercariScraper {
    private $pdo;
    private $logger;
    private $config;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->logger = new Logger('mercari_scraper');
        $this->config = MercariConfig::getConfig();
    }
    
    /**
     * メルカリ商品をスクレイピング
     */
    public function scrapeProduct($url) {
        try {
            $this->logger->info("メルカリスクレイピング開始: {$url}");
            
            // URL検証
            if (!$this->isValidMercariUrl($url)) {
                throw new InvalidArgumentException('無効なメルカリURL: ' . $url);
            }
            
            // 商品ID抽出
            $itemId = $this->extractItemId($url);
            $this->logger->info("商品ID抽出: {$itemId}");
            
            // 重複チェック（同一URL）
            if ($this->isDuplicateUrl($url)) {
                $this->logger->info("重複URL検知: {$url}");
                return $this->handleDuplicateProduct($url);
            }
            
            // スクレイピング実行
            $html = $this->fetchWithRetry($url);
            if (!$html) {
                throw new Exception('HTML取得に失敗しました');
            }
            
            // データ解析
            $productData = $this->parseProductData($html, $url, $itemId);
            
            // データベース保存
            $productId = $this->saveToDatabase($productData);
            
            // 在庫管理システムに登録
            $this->registerToInventorySystem($productId, $url, $productData);
            
            $this->logger->info("スクレイピング完了: ProductID={$productId}");
            
            return [
                'success' => true,
                'product_id' => $productId,
                'data' => $productData
            ];
            
        } catch (Exception $e) {
            $this->logger->error("スクレイピングエラー: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'url' => $url
            ];
        }
    }
    
    /**
     * メルカリURL検証
     */
    private function isValidMercariUrl($url) {
        $pattern = '/^https:\/\/(jp\.)?mercari\.com\/item\/[a-zA-Z0-9]+/';
        return preg_match($pattern, $url);
    }
    
    /**
     * 商品ID抽出
     */
    private function extractItemId($url) {
        if (preg_match('/\/item\/([a-zA-Z0-9]+)/', $url, $matches)) {
            return $matches[1];
        }
        throw new Exception('商品IDの抽出に失敗: ' . $url);
    }
    
    /**
     * 重複URL チェック
     */
    private function isDuplicateUrl($url) {
        $stmt = $this->pdo->prepare("
            SELECT id FROM supplier_products 
            WHERE source_url = ? AND platform = 'mercari'
        ");
        $stmt->execute([$url]);
        return $stmt->fetch() !== false;
    }
    
    /**
     * 重複商品の処理
     */
    private function handleDuplicateProduct($url) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM supplier_products 
            WHERE source_url = ? AND platform = 'mercari'
        ");
        $stmt->execute([$url]);
        $existing = $stmt->fetch();
        
        return [
            'success' => true,
            'duplicate' => true,
            'product_id' => $existing['id'],
            'message' => '既存の商品です'
        ];
    }
    
    /**
     * HTTP リクエスト（リトライ機能付き）
     */
    private function fetchWithRetry($url, $retryCount = 0) {
        if ($retryCount >= $this->config['max_retries']) {
            throw new Exception('最大リトライ回数に達しました');
        }
        
        try {
            // ランダムUA選択
            $userAgent = $this->config['user_agents'][array_rand($this->config['user_agents'])];
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'header' => [
                        "User-Agent: {$userAgent}",
                        "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                        "Accept-Language: ja,en-US;q=0.7,en;q=0.3",
                        "Accept-Encoding: gzip, deflate, br",
                        "DNT: 1",
                        "Connection: keep-alive",
                        "Upgrade-Insecure-Requests: 1"
                    ],
                    'timeout' => $this->config['timeout']
                ]
            ]);
            
            // リクエスト間隔
            if ($retryCount > 0) {
                sleep($retryCount * 2); // 指数バックオフ
            } else {
                usleep($this->config['request_delay'] * 1000);
            }
            
            $html = file_get_contents($url, false, $context);
            
            if ($html === false) {
                throw new Exception('HTTP リクエストに失敗');
            }
            
            return $html;
            
        } catch (Exception $e) {
            $this->logger->warning("リクエスト失敗 (試行 " . ($retryCount + 1) . "): " . $e->getMessage());
            return $this->fetchWithRetry($url, $retryCount + 1);
        }
    }
    
    /**
     * HTML データ解析
     */
    private function parseProductData($html, $url, $itemId) {
        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new DOMXPath($dom);
        
        $data = [
            'mercari_item_id' => $itemId,
            'source_url' => $url,
            'platform' => 'mercari',
            'title' => $this->extractText($xpath, $this->config['selectors']['title']),
            'price' => $this->extractPrice($xpath, $this->config['selectors']['price']),
            'condition' => $this->extractText($xpath, $this->config['selectors']['condition']),
            'description' => $this->extractText($xpath, $this->config['selectors']['description']),
            'seller_name' => $this->extractText($xpath, $this->config['selectors']['seller']),
            'shipping_info' => $this->extractText($xpath, $this->config['selectors']['shipping']),
            'images' => $this->extractImages($xpath, $this->config['selectors']['images']),
            'sold_status' => $this->checkSoldStatus($xpath),
            'scraped_at' => date('Y-m-d H:i:s')
        ];
        
        // データ検証
        $this->validateProductData($data);
        
        return $data;
    }
    
    /**
     * テキスト抽出
     */
    private function extractText($xpath, $selector) {
        // CSS セレクターをXPathに変換（簡易版）
        $xpathQuery = $this->cssToXpath($selector);
        $nodes = $xpath->query($xpathQuery);
        
        if ($nodes->length > 0) {
            return trim($nodes->item(0)->textContent);
        }
        
        return '';
    }
    
    /**
     * 価格抽出
     */
    private function extractPrice($xpath, $selector) {
        $priceText = $this->extractText($xpath, $selector);
        
        // 数字のみ抽出
        if (preg_match('/[\d,]+/', $priceText, $matches)) {
            return (int)str_replace(',', '', $matches[0]);
        }
        
        return 0;
    }
    
    /**
     * 画像URL抽出
     */
    private function extractImages($xpath, $selector) {
        $xpathQuery = $this->cssToXpath($selector);
        $nodes = $xpath->query($xpathQuery);
        $images = [];
        
        foreach ($nodes as $node) {
            if ($node->hasAttribute('src')) {
                $images[] = $node->getAttribute('src');
            }
        }
        
        return array_slice($images, 0, 5); // 最大5枚
    }
    
    /**
     * 売り切れ状態チェック
     */
    private function checkSoldStatus($xpath) {
        $soldSelector = $this->config['selectors']['sold_status'];
        $xpathQuery = $this->cssToXpath($soldSelector);
        $nodes = $xpath->query($xpathQuery);
        
        return $nodes->length > 0 ? 'sold_out' : 'available';
    }
    
    /**
     * CSS セレクターをXPathに変換（基本的な変換のみ）
     */
    private function cssToXpath($css) {
        // 基本的な変換ルール
        $css = preg_replace('/\[data-testid="([^"]+)"\]/', '[@data-testid="$1"]', $css);
        $css = preg_replace('/^([a-zA-Z]+)/', '//$1', $css);
        $css = str_replace('#', '[@id="', $css);
        $css = str_replace('.', '[@class="', $css);
        
        // より複雑なセレクターは手動で対応
        if (strpos($css, 'h1[') === 0) {
            return '//h1' . substr($css, 2);
        }
        if (strpos($css, 'span[') === 0) {
            return '//span' . substr($css, 4);
        }
        if (strpos($css, 'div[') === 0) {
            return '//div' . substr($css, 3);
        }
        
        return $css;
    }
    
    /**
     * 商品データ検証
     */
    private function validateProductData($data) {
        if (empty($data['title'])) {
            throw new Exception('商品タイトルが取得できません');
        }
        
        if ($data['price'] <= 0) {
            throw new Exception('有効な価格が取得できません');
        }
        
        if (empty($data['mercari_item_id'])) {
            throw new Exception('商品IDが無効です');
        }
    }
    
    /**
     * データベース保存
     */
    private function saveToDatabase($data) {
        try {
            // supplier_products テーブルに保存（複数仕入れ先対応設計）
            $stmt = $this->pdo->prepare("
                INSERT INTO supplier_products (
                    platform, platform_product_id, source_url,
                    product_title, condition_type, purchase_price, 
                    current_stock, seller_info, description,
                    images, additional_data, monitoring_enabled,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            $result = $stmt->execute([
                'mercari',
                $data['mercari_item_id'],
                $data['source_url'],
                $data['title'],
                $data['condition'],
                $data['price'],
                ($data['sold_status'] === 'available') ? 1 : 0,
                $data['seller_name'],
                $data['description'],
                json_encode($data['images']),
                json_encode([
                    'shipping_info' => $data['shipping_info'],
                    'scraped_at' => $data['scraped_at']
                ]),
                true
            ]);
            
            if (!$result) {
                throw new Exception('データベース保存に失敗: ' . implode(', ', $stmt->errorInfo()));
            }
            
            return $this->pdo->lastInsertId();
            
        } catch (Exception $e) {
            $this->logger->error("データベース保存エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 在庫管理システムに登録
     */
    private function registerToInventorySystem($productId, $url, $data) {
        try {
            // inventory_management テーブルに登録
            $stmt = $this->pdo->prepare("
                INSERT INTO inventory_management (
                    product_id, source_platform, source_url, source_product_id,
                    current_stock, current_price, monitoring_enabled,
                    created_at, updated_at
                ) VALUES (?, 'mercari', ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            $stmt->execute([
                $productId,
                $url,
                $data['mercari_item_id'],
                ($data['sold_status'] === 'available') ? 1 : 0,
                $data['price'],
                true
            ]);
            
            $this->logger->info("在庫管理システム登録完了: ProductID={$productId}");
            
        } catch (Exception $e) {
            $this->logger->error("在庫管理登録エラー: " . $e->getMessage());
            // 在庫管理の登録失敗は致命的ではないので、処理を続行
        }
    }
}

/**
 * メルカリバッチ処理クラス
 */
class MercarieBatchProcessor {
    private $scraper;
    private $logger;
    
    public function __construct($pdo) {
        $this->scraper = new MercariScraper($pdo);
        $this->logger = new Logger('mercari_batch');
    }
    
    /**
     * 複数URL の一括スクレイピング
     */
    public function processBatch($urls) {
        $results = [];
        $successCount = 0;
        $errorCount = 0;
        
        $this->logger->info("バッチ処理開始: " . count($urls) . " 件");
        
        foreach ($urls as $index => $url) {
            try {
                $this->logger->info("処理中: " . ($index + 1) . "/" . count($urls) . " - {$url}");
                
                $result = $this->scraper->scrapeProduct(trim($url));
                $results[] = $result;
                
                if ($result['success']) {
                    $successCount++;
                    $this->logger->info("成功: {$url}");
                } else {
                    $errorCount++;
                    $this->logger->warning("失敗: {$url} - " . $result['error']);
                }
                
                // 次のリクエストまで待機（重要）
                if ($index < count($urls) - 1) {
                    $this->logger->debug("待機中... (3秒)");
                    sleep(3);
                }
                
            } catch (Exception $e) {
                $errorCount++;
                $results[] = [
                    'success' => false,
                    'error' => $e->getMessage(),
                    'url' => $url
                ];
                $this->logger->error("バッチ処理エラー: {$url} - " . $e->getMessage());
            }
        }
        
        $this->logger->info("バッチ処理完了: 成功={$successCount}, 失敗={$errorCount}");
        
        return [
            'total' => count($urls),
            'success' => $successCount,
            'errors' => $errorCount,
            'results' => $results
        ];
    }
}

// 使用例
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    try {
        // データベース接続
        $pdo = getDbConnection();
        
        // スクレイパー初期化
        $scraper = new MercariScraper($pdo);
        
        // テスト用URL（実際のURLに変更してください）
        $testUrl = "https://jp.mercari.com/item/m12345678";
        
        echo "=== メルカリスクレイピングテスト ===\n";
        echo "URL: {$testUrl}\n\n";
        
        $result = $scraper->scrapeProduct($testUrl);
        
        if ($result['success']) {
            echo "✅ スクレイピング成功!\n";
            echo "商品ID: " . $result['product_id'] . "\n";
            echo "商品名: " . $result['data']['title'] . "\n";
            echo "価格: ¥" . number_format($result['data']['price']) . "\n";
        } else {
            echo "❌ スクレイピング失敗: " . $result['error'] . "\n";
        }
        
    } catch (Exception $e) {
        echo "エラー: " . $e->getMessage() . "\n";
    }
}

?>