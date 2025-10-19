<?php
/**
 * Yahoo！フリマ商品スクレイピングシステム
 * 
 * 既存のYahoo Auctionシステムのノウハウを活用
 * ヤフオクと構造が類似しているため開発効率が高い
 * 
 * @version 1.0.0
 * @created 2025-09-25
 */

require_once __DIR__ . '/../../shared/core/database.php';
require_once __DIR__ . '/../../shared/core/logger.php';

/**
 * Yahoo！フリマ設定クラス
 */
class YahooFleaMarketConfig {
    public static function getConfig() {
        return [
            'platform_name' => 'Yahoo！フリマ',
            'platform_id' => 'yahoo_fleamarket',
            'base_url' => 'https://paypayfleamarket.yahoo.co.jp',
            'request_delay' => 2000, // Yahoo系なので既存と同じ2秒
            'timeout' => 30,
            'max_retries' => 3,
            'user_agents' => [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
            ],
            'selectors' => [
                'title' => ['h1[data-testid="item-name"]', 'h1.ItemName', '.p-item-detail-title'],
                'price' => ['[data-testid="price"]', '.p-item-detail-price', '.ItemPrice'],
                'condition' => ['[data-testid="item-condition"]', '.p-condition', '.ItemCondition'],
                'description' => ['[data-testid="description"]', '.p-item-description', '.ItemDescription'],
                'images' => ['img[data-testid="product-image"]', '.p-item-images img', '.ItemImages img'],
                'seller' => ['[data-testid="seller-name"]', '.p-seller-info .name', '.SellerInfo'],
                'sold_status' => ['.sold-out', '.p-sold-badge', '[data-testid="sold-out"]'],
                'shipping' => ['.p-shipping-info', '.ShippingInfo', '[data-testid="shipping"]'],
                'category' => ['.p-breadcrumb', '.Breadcrumb', '[data-testid="breadcrumb"]']
            ]
        ];
    }
}

/**
 * Yahoo！フリマスクレイピングクラス
 */
class YahooFleaMarketScraper {
    private $pdo;
    private $logger;
    private $config;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->logger = new Logger('yahoo_fleamarket_scraper');
        $this->config = YahooFleaMarketConfig::getConfig();
    }
    
    /**
     * Yahoo！フリマ商品をスクレイピング
     */
    public function scrapeProduct($url) {
        try {
            $this->logger->info("Yahoo！フリマスクレイピング開始: {$url}");
            
            // URL検証
            if (!$this->isValidYahooFleaMarketUrl($url)) {
                throw new InvalidArgumentException('無効なYahoo！フリマURL: ' . $url);
            }
            
            // 商品ID抽出
            $itemId = $this->extractItemId($url);
            $this->logger->info("商品ID抽出: {$itemId}");
            
            // 重複チェック
            if ($this->isDuplicateUrl($url)) {
                $this->logger->info("重複URL検知: {$url}");
                return $this->handleDuplicateProduct($url);
            }
            
            // スクレイピング実行
            $html = $this->fetchWithRetry($url);
            if (!$html) {
                throw new Exception('HTML取得に失敗しました');
            }
            
            // データ解析（Yahoo Auctionの知見を活用）
            $productData = $this->parseYahooFleaMarketData($html, $url, $itemId);
            
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
     * Yahoo！フリマURL検証
     */
    private function isValidYahooFleaMarketUrl($url) {
        $patterns = [
            '/^https:\/\/paypayfleamarket\.yahoo\.co\.jp\/item\/[a-zA-Z0-9]+/',
            '/^https:\/\/www\.paypayfleamarket\.yahoo\.co\.jp\/item\/[a-zA-Z0-9]+/',
            '/^https:\/\/paypay\-fleamarket\.yahoo\.co\.jp\/item\/[a-zA-Z0-9]+/' // ハイフン付きパターン
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $url)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 商品ID抽出（Yahoo Auctionパターンを参考）
     */
    private function extractItemId($url) {
        // 複数のパターンに対応
        $patterns = [
            '/\/item\/([a-zA-Z0-9_\-]+)/', // 標準パターン
            '/\/item\/([^\/\?]+)/', // より柔軟なパターン
            '/item_id=([a-zA-Z0-9_\-]+)/' // クエリパラメータパターン
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $url, $matches)) {
                return $matches[1];
            }
        }
        
        throw new Exception('商品IDの抽出に失敗: ' . $url);
    }
    
    /**
     * 重複URLチェック
     */
    private function isDuplicateUrl($url) {
        $stmt = $this->pdo->prepare("
            SELECT id FROM supplier_products 
            WHERE source_url = ? AND platform = 'yahoo_fleamarket'
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
            WHERE source_url = ? AND platform = 'yahoo_fleamarket'
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
     * HTTP リクエスト（Yahoo Auction と同じアンチスクレイピング対策）
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
                        "Upgrade-Insecure-Requests: 1",
                        // Yahoo系に有効なヘッダー
                        "Sec-Fetch-Dest: document",
                        "Sec-Fetch-Mode: navigate",
                        "Sec-Fetch-Site: none"
                    ],
                    'timeout' => $this->config['timeout'],
                    'ignore_errors' => true
                ]
            ]);
            
            // リクエスト間隔（Yahoo系の標準）
            if ($retryCount > 0) {
                sleep($retryCount * 2); // 指数バックオフ
            } else {
                usleep($this->config['request_delay'] * 1000);
            }
            
            $html = file_get_contents($url, false, $context);
            
            if ($html === false) {
                throw new Exception('HTTP リクエストに失敗');
            }
            
            // HTTPステータスコードチェック
            $responseCode = $this->getHttpResponseCode($http_response_header);
            if ($responseCode >= 400) {
                throw new Exception("HTTP エラー: {$responseCode}");
            }
            
            return $html;
            
        } catch (Exception $e) {
            $this->logger->warning("リクエスト失敗 (試行 " . ($retryCount + 1) . "): " . $e->getMessage());
            return $this->fetchWithRetry($url, $retryCount + 1);
        }
    }
    
    /**
     * HTTPレスポンスコード取得
     */
    private function getHttpResponseCode($headers) {
        if (is_array($headers) && count($headers) > 0) {
            if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $headers[0], $matches)) {
                return (int)$matches[1];
            }
        }
        return 200; // デフォルトは成功とみなす
    }
    
    /**
     * Yahoo！フリマデータ解析（Yahoo Auctionの構造解析技術を活用）
     */
    private function parseYahooFleaMarketData($html, $url, $itemId) {
        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new DOMXPath($dom);
        
        $data = [
            'yahoo_fleamarket_item_id' => $itemId,
            'source_url' => $url,
            'platform' => 'yahoo_fleamarket',
            'title' => $this->extractTitle($html, $xpath),
            'price' => $this->extractPrice($html, $xpath),
            'condition' => $this->extractCondition($html, $xpath),
            'description' => $this->extractDescription($html, $xpath),
            'seller_name' => $this->extractSellerInfo($html, $xpath),
            'shipping_info' => $this->extractShippingInfo($html, $xpath),
            'images' => $this->extractImages($html, $xpath),
            'category' => $this->extractCategory($html, $xpath),
            'sold_status' => $this->checkSoldStatus($html, $xpath),
            'scraped_at' => date('Y-m-d H:i:s')
        ];
        
        // データ検証
        $this->validateProductData($data);
        
        return $data;
    }
    
    /**
     * タイトル抽出（Yahoo Auctionの多段階フォールバック手法）
     */
    private function extractTitle($html, $xpath) {
        $selectors = $this->config['selectors']['title'];
        
        // 1. セレクターベース抽出
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            if ($nodes->length > 0) {
                $title = trim($nodes->item(0)->textContent);
                if (strlen($title) > 5) {
                    $this->logger->info("タイトル抽出成功（セレクター）: " . substr($title, 0, 50) . "...");
                    return $this->cleanTitle($title);
                }
            }
        }
        
        // 2. 正規表現パターン（Yahoo Auctionスタイル）
        $patterns = [
            '/<h1[^>]*>([^<]+)<\/h1>/i',
            '/<title[^>]*>([^<]+)<\/title>/i',
            '/data-testid="item-name"[^>]*>([^<]+)</i',
            '/class="[^"]*title[^"]*"[^>]*>([^<]+)</i'
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $title = trim(strip_tags($matches[1]));
                if (strlen($title) > 5) {
                    $this->logger->info("タイトル抽出成功（正規表現）: " . substr($title, 0, 50) . "...");
                    return $this->cleanTitle($title);
                }
            }
        }
        
        return 'タイトル取得失敗';
    }
    
    /**
     * タイトルクリーンアップ
     */
    private function cleanTitle($title) {
        // Yahoo！フリマ固有のクリーンアップ
        $cleanPatterns = [
            '/ - Yahoo！フリマ.*$/',
            '/ \| Yahoo！フリマ.*$/',
            '/Yahoo！フリマ[\s\-\|].*$/',
            '/PayPayフリマ[\s\-\|].*$/'
        ];
        
        foreach ($cleanPatterns as $pattern) {
            $title = preg_replace($pattern, '', $title);
        }
        
        return trim($title);
    }
    
    /**
     * 価格抽出（Yahoo Auctionの価格抽出ロジックを応用）
     */
    private function extractPrice($html, $xpath) {
        $selectors = $this->config['selectors']['price'];
        
        // 1. セレクターベース抽出
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            if ($nodes->length > 0) {
                $priceText = trim($nodes->item(0)->textContent);
                $price = $this->parsePriceText($priceText);
                if ($price > 0) {
                    $this->logger->info("価格抽出成功（セレクター）: ¥{$price}");
                    return $price;
                }
            }
        }
        
        // 2. 正規表現パターン（Yahoo Auction実績パターン）
        $pricePatterns = [
            '/￥[\s]*(\d{1,3}(?:,\d{3})*)/u',
            '/(\d{1,3}(?:,\d{3})*)[\s]*円/u',
            '/価格[^0-9]*(\d{1,3}(?:,\d{3})*)[\s]*円/u',
            '/¥[\s]*(\d{1,3}(?:,\d{3})*)/u',
            '/"price"[^>]*>.*?(\d{1,3}(?:,\d{3})*)/s'
        ];
        
        foreach ($pricePatterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $price = $this->parsePriceText($matches[1]);
                if ($price > 0) {
                    $this->logger->info("価格抽出成功（正規表現）: ¥{$price}");
                    return $price;
                }
            }
        }
        
        return 0;
    }
    
    /**
     * 価格文字列のパース
     */
    private function parsePriceText($text) {
        // 数字とカンマのみ抽出
        $numbers = preg_replace('/[^0-9,]/', '', $text);
        $price = (int)str_replace(',', '', $numbers);
        
        // 妥当性チェック（1円〜1億円）
        if ($price >= 1 && $price <= 100000000) {
            return $price;
        }
        
        return 0;
    }
    
    /**
     * 商品状態抽出
     */
    private function extractCondition($html, $xpath) {
        $selectors = $this->config['selectors']['condition'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            if ($nodes->length > 0) {
                $condition = trim($nodes->item(0)->textContent);
                if (!empty($condition)) {
                    return $condition;
                }
            }
        }
        
        // 正規表現パターンでフォールバック
        $conditionPatterns = [
            '/状態[^>]*>([^<]+)</i',
            '/condition[^>]*>([^<]+)</i',
            '/(新品|未使用|目立った傷や汚れなし|やや傷や汚れあり|傷や汚れあり|全体的に状態が悪い)/'
        ];
        
        foreach ($conditionPatterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                return trim(strip_tags($matches[1]));
            }
        }
        
        return '状態不明';
    }
    
    /**
     * 商品説明抽出
     */
    private function extractDescription($html, $xpath) {
        $selectors = $this->config['selectors']['description'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            if ($nodes->length > 0) {
                $description = trim($nodes->item(0)->textContent);
                if (strlen($description) > 10) {
                    return substr($description, 0, 2000); // 制限
                }
            }
        }
        
        return '';
    }
    
    /**
     * 出品者情報抽出
     */
    private function extractSellerInfo($html, $xpath) {
        $selectors = $this->config['selectors']['seller'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            if ($nodes->length > 0) {
                $seller = trim($nodes->item(0)->textContent);
                if (!empty($seller)) {
                    return $seller;
                }
            }
        }
        
        return '不明';
    }
    
    /**
     * 配送情報抽出
     */
    private function extractShippingInfo($html, $xpath) {
        $selectors = $this->config['selectors']['shipping'];
        
        $shippingInfo = [];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            if ($nodes->length > 0) {
                $info = trim($nodes->item(0)->textContent);
                if (!empty($info)) {
                    $shippingInfo[] = $info;
                }
            }
        }
        
        return implode(' / ', $shippingInfo);
    }
    
    /**
     * 画像URL抽出
     */
    private function extractImages($html, $xpath) {
        $selectors = $this->config['selectors']['images'];
        $images = [];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            foreach ($nodes as $node) {
                if ($node->hasAttribute('src')) {
                    $src = $node->getAttribute('src');
                    if (strpos($src, 'http') === 0 && !in_array($src, $images)) {
                        $images[] = $src;
                    }
                }
                if ($node->hasAttribute('data-src')) {
                    $src = $node->getAttribute('data-src');
                    if (strpos($src, 'http') === 0 && !in_array($src, $images)) {
                        $images[] = $src;
                    }
                }
            }
        }
        
        return array_slice($images, 0, 10); // 最大10枚
    }
    
    /**
     * カテゴリ抽出
     */
    private function extractCategory($html, $xpath) {
        $selectors = $this->config['selectors']['category'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            if ($nodes->length > 0) {
                $category = trim($nodes->item(0)->textContent);
                if (!empty($category)) {
                    return $category;
                }
            }
        }
        
        return 'その他';
    }
    
    /**
     * 売り切れ状態チェック
     */
    private function checkSoldStatus($html, $xpath) {
        $selectors = $this->config['selectors']['sold_status'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            if ($nodes->length > 0) {
                return 'sold_out';
            }
        }
        
        // テキストパターンでチェック
        if (preg_match('/(売り切れ|完売|SOLD|sold)/i', $html)) {
            return 'sold_out';
        }
        
        return 'available';
    }
    
    /**
     * CSSセレクターをXPathに変換（基本的な変換）
     */
    private function convertCssToXpath($css) {
        // data-testid属性の変換
        if (preg_match('/\[data-testid="([^"]+)"\]/', $css, $matches)) {
            $element = preg_replace('/\[data-testid="[^"]+"\]/', '', $css);
            if (empty($element)) {
                return '//*[@data-testid="' . $matches[1] . '"]';
            } else {
                return '//' . $element . '[@data-testid="' . $matches[1] . '"]';
            }
        }
        
        // クラス名の変換
        if (preg_match('/^\.([a-zA-Z0-9_-]+)$/', $css, $matches)) {
            return '//*[@class="' . $matches[1] . '"]';
        }
        
        // ID の変換
        if (preg_match('/^#([a-zA-Z0-9_-]+)$/', $css, $matches)) {
            return '//*[@id="' . $matches[1] . '"]';
        }
        
        // 要素名
        if (preg_match('/^[a-zA-Z]+$/', $css)) {
            return '//' . $css;
        }
        
        // その他はそのままXPathとして使用を試行
        return $css;
    }
    
    /**
     * 商品データ検証
     */
    private function validateProductData($data) {
        if (empty($data['title']) || $data['title'] === 'タイトル取得失敗') {
            throw new Exception('商品タイトルが取得できません');
        }
        
        if ($data['price'] <= 0) {
            throw new Exception('有効な価格が取得できません');
        }
        
        if (empty($data['yahoo_fleamarket_item_id'])) {
            throw new Exception('商品IDが無効です');
        }
    }
    
    /**
     * データベース保存
     */
    private function saveToDatabase($data) {
        try {
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
                'yahoo_fleamarket',
                $data['yahoo_fleamarket_item_id'],
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
                    'category' => $data['category'],
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
            $stmt = $this->pdo->prepare("
                INSERT INTO inventory_management (
                    product_id, source_platform, source_url, source_product_id,
                    current_stock, current_price, monitoring_enabled,
                    created_at, updated_at
                ) VALUES (?, 'yahoo_fleamarket', ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            $stmt->execute([
                $productId,
                $url,
                $data['yahoo_fleamarket_item_id'],
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
 * Yahoo！フリマバッチ処理クラス
 */
class YahooFleaMarketBatchProcessor {
    private $scraper;
    private $logger;
    
    public function __construct($pdo) {
        $this->scraper = new YahooFleaMarketScraper($pdo);
        $this->logger = new Logger('yahoo_fleamarket_batch');
    }
    
    /**
     * 複数URLの一括スクレイピング
     */
    public function processBatch($urls) {
        $results = [];
        $successCount = 0;
        $errorCount = 0;
        
        $this->logger->info("Yahoo！フリマバッチ処理開始: " . count($urls) . " 件");
        
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
                
                // 次のリクエストまで待機（Yahoo系標準の2秒）
                if ($index < count($urls) - 1) {
                    $this->logger->debug("待機中... (2秒)");
                    sleep(2);
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
        
        $this->logger->info("Yahoo！フリマバッチ処理完了: 成功={$successCount}, 失敗={$errorCount}");
        
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
        $scraper = new YahooFleaMarketScraper($pdo);
        
        // テスト用URL（実際のURLに変更してください）
        $testUrl = "https://paypayfleamarket.yahoo.co.jp/item/abc123";
        
        echo "=== Yahoo！フリマスクレイピングテスト ===\n";
        echo "URL: {$testUrl}\n\n";
        
        $result = $scraper->scrapeProduct($testUrl);
        
        if ($result['success']) {
            echo "✅ スクレイピング成功!\n";
            echo "商品ID: " . $result['product_id'] . "\n";
            echo "商品名: " . $result['data']['title'] . "\n";
            echo "価格: ¥" . number_format($result['data']['price']) . "\n";
            echo "状態: " . $result['data']['condition'] . "\n";
            echo "出品者: " . $result['data']['seller_name'] . "\n";
        } else {
            echo "❌ スクレイピング失敗: " . $result['error'] . "\n";
        }
        
    } catch (Exception $e) {
        echo "エラー: " . $e->getMessage() . "\n";
    }
}

?>