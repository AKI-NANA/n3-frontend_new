<?php
/**
 * セカンドストリート系統合スクレイピングシステム
 * 
 * 対応サイト:
 * 1. https://www.2ndstreet.jp/buy (メイン買取サイト)
 * 2. https://golf-kace.com/ (ゴルフ専門サイト)
 * 3. https://ec.golf-kace.com/ (ゴルフ専門ECサイト)
 * 4. https://www.2ndstreet.jp/search?category=130001&shops[]=17284&page=1 (検索・商品一覧)
 * 
 * @version 1.0.0
 * @created 2025-09-25
 */

require_once __DIR__ . '/../../shared/core/database.php';
require_once __DIR__ . '/../../shared/core/logger.php';

/**
 * セカンドストリート系設定クラス
 */
class SecondStreetConfig {
    public static function getConfig() {
        return [
            'platform_name' => 'セカンドストリート',
            'platform_id' => 'second_street',
            'request_delay' => 2500, // 2.5秒間隔（中古品サイトは慎重に）
            'timeout' => 30,
            'max_retries' => 3,
            'user_agents' => [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
            ],
            'sites' => [
                'main' => [
                    'name' => '2ndSTREET メイン',
                    'base_url' => 'https://www.2ndstreet.jp',
                    'patterns' => [
                        '/^https:\/\/www\.2ndstreet\.jp\/buy/',
                        '/^https:\/\/www\.2ndstreet\.jp\/search/',
                        '/^https:\/\/www\.2ndstreet\.jp\/detail/'
                    ]
                ],
                'golf_kace' => [
                    'name' => 'GOLF KACE',
                    'base_url' => 'https://golf-kace.com',
                    'patterns' => [
                        '/^https:\/\/golf-kace\.com\//',
                        '/^https:\/\/www\.golf-kace\.com\//'
                    ]
                ],
                'golf_kace_ec' => [
                    'name' => 'GOLF KACE EC',
                    'base_url' => 'https://ec.golf-kace.com',
                    'patterns' => [
                        '/^https:\/\/ec\.golf-kace\.com\//'
                    ]
                ]
            ],
            'selectors' => [
                'title' => [
                    'h1[class*="title"]',
                    'h1[class*="name"]',
                    '.product-title',
                    '.item-title',
                    '.product-name',
                    'h1.product_name'
                ],
                'price' => [
                    '[class*="price"]',
                    '.price-value',
                    '.item-price',
                    '.product-price',
                    '[data-price]',
                    '.price_area'
                ],
                'condition' => [
                    '[class*="condition"]',
                    '.item-condition',
                    '.product-condition',
                    '.status',
                    '.grade'
                ],
                'description' => [
                    '[class*="description"]',
                    '.product-desc',
                    '.item-description',
                    '.product-detail'
                ],
                'images' => [
                    '.product-images img',
                    '.item-images img',
                    '.gallery img',
                    '[class*="image"] img'
                ],
                'brand' => [
                    '[class*="brand"]',
                    '.product-brand',
                    '.item-brand',
                    '.maker'
                ],
                'category' => [
                    '.breadcrumb',
                    '[class*="category"]',
                    '.product-category'
                ],
                'shop_info' => [
                    '[class*="shop"]',
                    '.store-info',
                    '[class*="store"]'
                ]
            ]
        ];
    }
}

/**
 * セカンドストリート系スクレイピングクラス
 */
class SecondStreetScraper {
    private $pdo;
    private $logger;
    private $config;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->logger = new Logger('second_street_scraper');
        $this->config = SecondStreetConfig::getConfig();
    }
    
    /**
     * セカンドストリート商品をスクレイピング
     */
    public function scrapeProduct($url) {
        try {
            $this->logger->info("セカンドストリートスクレイピング開始: {$url}");
            
            // URL検証とサイト判定
            $siteType = $this->detectSiteType($url);
            if (!$siteType) {
                throw new InvalidArgumentException('無効なセカンドストリート系URL: ' . $url);
            }
            
            // 商品ID抽出
            $itemId = $this->extractItemId($url, $siteType);
            $this->logger->info("商品ID抽出: {$itemId} (サイト: {$siteType})");
            
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
            
            // サイト別データ解析
            $productData = $this->parseProductData($html, $url, $itemId, $siteType);
            
            // データベース保存
            $productId = $this->saveToDatabase($productData);
            
            // 在庫管理システムに登録
            $this->registerToInventorySystem($productId, $url, $productData);
            
            $this->logger->info("スクレイピング完了: ProductID={$productId}");
            
            return [
                'success' => true,
                'product_id' => $productId,
                'site_type' => $siteType,
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
     * サイトタイプを検出
     */
    private function detectSiteType($url) {
        foreach ($this->config['sites'] as $siteKey => $siteConfig) {
            foreach ($siteConfig['patterns'] as $pattern) {
                if (preg_match($pattern, $url)) {
                    return $siteKey;
                }
            }
        }
        return false;
    }
    
    /**
     * 商品ID抽出（サイト別）
     */
    private function extractItemId($url, $siteType) {
        $patterns = [
            'main' => [
                '/\/detail\/(\d+)/',
                '/\/search.*id=(\d+)/',
                '/item_id=(\d+)/',
                '/\/(\d+)$/'
            ],
            'golf_kace' => [
                '/golf-kace\.com\/products\/([a-zA-Z0-9_\-]+)/',
                '/golf-kace\.com\/item\/([a-zA-Z0-9_\-]+)/',
                '/\/([a-zA-Z0-9_\-]+)$/'
            ],
            'golf_kace_ec' => [
                '/ec\.golf-kace\.com\/products\/([a-zA-Z0-9_\-]+)/',
                '/ec\.golf-kace\.com\/item\/([a-zA-Z0-9_\-]+)/',
                '/\/([a-zA-Z0-9_\-]+)$/'
            ]
        ];
        
        $sitePatterns = $patterns[$siteType] ?? $patterns['main'];
        
        foreach ($sitePatterns as $pattern) {
            if (preg_match($pattern, $url, $matches)) {
                return $matches[1];
            }
        }
        
        // フォールバック: URLからハッシュを生成
        return substr(md5($url), 0, 12);
    }
    
    /**
     * 重複URLチェック
     */
    private function isDuplicateUrl($url) {
        $stmt = $this->pdo->prepare("
            SELECT id FROM supplier_products 
            WHERE source_url = ? AND platform = 'second_street'
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
            WHERE source_url = ? AND platform = 'second_street'
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
     * HTTP リクエスト
     */
    private function fetchWithRetry($url, $retryCount = 0) {
        if ($retryCount >= $this->config['max_retries']) {
            throw new Exception('最大リトライ回数に達しました');
        }
        
        try {
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
                        "Cache-Control: no-cache",
                        "Pragma: no-cache"
                    ],
                    'timeout' => $this->config['timeout'],
                    'ignore_errors' => true
                ]
            ]);
            
            // リクエスト間隔（セカンドストリート系は慎重に）
            if ($retryCount > 0) {
                sleep($retryCount * 3); // より長い間隔
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
     * セカンドストリート系データ解析
     */
    private function parseProductData($html, $url, $itemId, $siteType) {
        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new DOMXPath($dom);
        
        $data = [
            'second_street_item_id' => $itemId,
            'source_url' => $url,
            'platform' => 'second_street',
            'site_type' => $siteType,
            'title' => $this->extractTitle($html, $xpath),
            'price' => $this->extractPrice($html, $xpath),
            'condition' => $this->extractCondition($html, $xpath),
            'brand' => $this->extractBrand($html, $xpath),
            'description' => $this->extractDescription($html, $xpath),
            'category' => $this->extractCategory($html, $xpath),
            'shop_info' => $this->extractShopInfo($html, $xpath),
            'images' => $this->extractImages($html, $xpath),
            'sold_status' => $this->checkSoldStatus($html, $xpath),
            'scraped_at' => date('Y-m-d H:i:s')
        ];
        
        // データ検証
        $this->validateProductData($data);
        
        return $data;
    }
    
    /**
     * タイトル抽出
     */
    private function extractTitle($html, $xpath) {
        $selectors = $this->config['selectors']['title'];
        
        // セレクターベース抽出
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
        
        // 正規表現フォールバック
        $patterns = [
            '/<h1[^>]*>([^<]+)<\/h1>/i',
            '/<title[^>]*>([^<]+)<\/title>/i',
            '/og:title[^>]*content="([^"]+)"/i',
            '/product[_\-]?name[^>]*>([^<]+)/i'
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $title = trim(strip_tags($matches[1]));
                if (strlen($title) > 5) {
                    $this->logger->info("タイトル抽出成功（正規表現）");
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
        $cleanPatterns = [
            '/\s*[\|\-]\s*2ndSTREET.*$/',
            '/\s*[\|\-]\s*セカンドストリート.*$/',
            '/\s*[\|\-]\s*GOLF\s*KACE.*$/',
            '/\s*買取.*$/',
            '/\s*\【[^】]*\】\s*$/'
        ];
        
        foreach ($cleanPatterns as $pattern) {
            $title = preg_replace($pattern, '', $title);
        }
        
        return trim($title);
    }
    
    /**
     * 価格抽出
     */
    private function extractPrice($html, $xpath) {
        $selectors = $this->config['selectors']['price'];
        
        // セレクターベース抽出
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
        
        // 正規表現パターン（中古品サイト特有）
        $pricePatterns = [
            '/￥[\s]*(\d{1,3}(?:,\d{3})*)/u',
            '/(\d{1,3}(?:,\d{3})*)[\s]*円/u',
            '/価格[^\d]*(\d{1,3}(?:,\d{3})*)[\s]*円/u',
            '/買取価格[^\d]*(\d{1,3}(?:,\d{3})*)[\s]*円/u',
            '/販売価格[^\d]*(\d{1,3}(?:,\d{3})*)[\s]*円/u',
            '/¥[\s]*(\d{1,3}(?:,\d{3})*)/u',
            '/"price"[^>]*>.*?(\d{1,3}(?:,\d{3})*)/s',
            '/data-price="(\d+)"/i'
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
        $numbers = preg_replace('/[^0-9,]/', '', $text);
        $price = (int)str_replace(',', '', $numbers);
        
        // 妥当性チェック（10円〜100万円）
        if ($price >= 10 && $price <= 1000000) {
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
        
        // 中古品サイト特有のパターン
        $conditionPatterns = [
            '/(新品|未使用品|美品|良品|可|ジャンク|訳あり)/u',
            '/ランク[：\s]*([ABC])/i',
            '/状態[：\s]*([^<\n]+)/i',
            '/グレード[：\s]*([^<\n]+)/i'
        ];
        
        foreach ($conditionPatterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                return trim($matches[1]);
            }
        }
        
        return '状態不明';
    }
    
    /**
     * ブランド抽出
     */
    private function extractBrand($html, $xpath) {
        $selectors = $this->config['selectors']['brand'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            if ($nodes->length > 0) {
                $brand = trim($nodes->item(0)->textContent);
                if (!empty($brand)) {
                    return $brand;
                }
            }
        }
        
        // ブランド名パターン
        $brandPatterns = [
            '/ブランド[：\s]*([^<\n]+)/i',
            '/メーカー[：\s]*([^<\n]+)/i',
            '/maker[：\s]*([^<\n]+)/i'
        ];
        
        foreach ($brandPatterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                return trim(strip_tags($matches[1]));
            }
        }
        
        return '';
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
                    return substr($description, 0, 1000); // 制限
                }
            }
        }
        
        return '';
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
     * 店舗情報抽出
     */
    private function extractShopInfo($html, $xpath) {
        $selectors = $this->config['selectors']['shop_info'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            if ($nodes->length > 0) {
                $shopInfo = trim($nodes->item(0)->textContent);
                if (!empty($shopInfo)) {
                    return $shopInfo;
                }
            }
        }
        
        // URLから店舗情報を抽出
        if (preg_match('/shops\[\]=(\d+)/', $this->data['source_url'] ?? '', $matches)) {
            return '店舗ID: ' . $matches[1];
        }
        
        return '';
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
        
        return array_slice($images, 0, 8); // 最大8枚
    }
    
    /**
     * 売り切れ状態チェック
     */
    private function checkSoldStatus($html, $xpath) {
        // 売り切れを示すパターン
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
    
    /**
     * CSSセレクターをXPathに変換
     */
    private function convertCssToXpath($css) {
        // 基本的な変換ルール
        if (preg_match('/^\[([^=]+)="([^"]+)"\]$/', $css, $matches)) {
            return '//*[@' . $matches[1] . '="' . $matches[2] . '"]';
        }
        
        if (preg_match('/^\.([a-zA-Z0-9_-]+)$/', $css, $matches)) {
            return '//*[contains(@class, "' . $matches[1] . '")]';
        }
        
        if (preg_match('/^#([a-zA-Z0-9_-]+)$/', $css, $matches)) {
            return '//*[@id="' . $matches[1] . '"]';
        }
        
        if (preg_match('/^([a-zA-Z]+)$/', $css)) {
            return '//' . $css;
        }
        
        // 複雑なセレクタの基本対応
        $css = str_replace('[class*="', '[contains(@class, "', $css);
        $css = str_replace('"]', '")]', $css);
        
        return '//' . $css;
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
        
        if (empty($data['second_street_item_id'])) {
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
                'second_street',
                $data['second_street_item_id'],
                $data['source_url'],
                $data['title'],
                $data['condition'],
                $data['price'],
                ($data['sold_status'] === 'available') ? 1 : 0,
                $data['shop_info'],
                $data['description'],
                json_encode($data['images']),
                json_encode([
                    'site_type' => $data['site_type'],
                    'brand' => $data['brand'],
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
                ) VALUES (?, 'second_street', ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            $stmt->execute([
                $productId,
                $url,
                $data['second_street_item_id'],
                ($data['sold_status'] === 'available') ? 1 : 0,
                $data['price'],
                true
            ]);
            
            $this->logger->info("在庫管理システム登録完了: ProductID={$productId}");
            
        } catch (Exception $e) {
            $this->logger->error("在庫管理登録エラー: " . $e->getMessage());
        }
    }
}

/**
 * セカンドストリート系バッチ処理クラス
 */
class SecondStreetBatchProcessor {
    private $scraper;
    private $logger;
    
    public function __construct($pdo) {
        $this->scraper = new SecondStreetScraper($pdo);
        $this->logger = new Logger('second_street_batch');
    }
    
    /**
     * 複数URLの一括スクレイピング
     */
    public function processBatch($urls) {
        $results = [];
        $successCount = 0;
        $errorCount = 0;
        
        $this->logger->info("セカンドストリートバッチ処理開始: " . count($urls) . " 件");
        
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
                
                // 次のリクエストまで待機（中古品サイトは慎重に2.5秒）
                if ($index < count($urls) - 1) {
                    $this->logger->debug("待機中... (2.5秒)");
                    usleep(2500000); // 2.5秒
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
        
        $this->logger->info("セカンドストリートバッチ処理完了: 成功={$successCount}, 失敗={$errorCount}");
        
        return [
            'total' => count($urls),
            'success' => $successCount,
            'errors' => $errorCount,
            'results' => $results
        ];
    }
    
    /**
     * 検索ページからの商品リスト取得
     */
    public function scrapeSearchPage($searchUrl, $maxPages = 5) {
        $this->logger->info("検索ページスクレイピング開始: {$searchUrl}");
        
        $allProductUrls = [];
        
        for ($page = 1; $page <= $maxPages; $page++) {
            try {
                // ページ番号を追加
                $pageUrl = $this->addPageParam($searchUrl, $page);
                $this->logger->info("ページ {$page} スクレイピング: {$pageUrl}");
                
                $html = $this->scraper->fetchWithRetry($pageUrl);
                if (!$html) {
                    $this->logger->warning("ページ {$page} のHTML取得に失敗");
                    continue;
                }
                
                $productUrls = $this->extractProductUrls($html);
                if (empty($productUrls)) {
                    $this->logger->info("ページ {$page} に商品が見つからない（終了）");
                    break;
                }
                
                $allProductUrls = array_merge($allProductUrls, $productUrls);
                $this->logger->info("ページ {$page}: " . count($productUrls) . " 商品発見");
                
                // ページ間の間隔
                sleep(3);
                
            } catch (Exception $e) {
                $this->logger->error("ページ {$page} スクレイピングエラー: " . $e->getMessage());
            }
        }
        
        return array_unique($allProductUrls);
    }
    
    /**
     * ページパラメータ追加
     */
    private function addPageParam($url, $page) {
        if (strpos($url, 'page=') !== false) {
            return preg_replace('/page=\d+/', 'page=' . $page, $url);
        } else {
            $separator = (strpos($url, '?') !== false) ? '&' : '?';
            return $url . $separator . 'page=' . $page;
        }
    }
    
    /**
     * HTMLから商品URLを抽出
     */
    private function extractProductUrls($html) {
        $productUrls = [];
        
        // セカンドストリート系の商品URLパターン
        $patterns = [
            '/href="(https:\/\/www\.2ndstreet\.jp\/detail\/\d+[^"]*)"/',
            '/href="(https:\/\/golf-kace\.com\/products\/[^"]*)"/',
            '/href="(https:\/\/ec\.golf-kace\.com\/products\/[^"]*)"/',
            '/href="(\/detail\/\d+[^"]*)"/', // 相対パス
            '/href="(\/products\/[^"]*)"/' // 相対パス
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match_all($pattern, $html, $matches)) {
                foreach ($matches[1] as $url) {
                    // 相対パスの場合は絶対パスに変換
                    if (strpos($url, '/') === 0) {
                        if (strpos($html, 'golf-kace.com') !== false) {
                            $url = 'https://golf-kace.com' . $url;
                        } else {
                            $url = 'https://www.2ndstreet.jp' . $url;
                        }
                    }
                    
                    $productUrls[] = $url;
                }
            }
        }
        
        return array_unique($productUrls);
    }
}

// 使用例
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    try {
        // データベース接続
        $pdo = getDbConnection();
        
        // スクレイパー初期化
        $scraper = new SecondStreetScraper($pdo);
        
        // テスト用URL（実際のURLに変更してください）
        $testUrls = [
            "https://www.2ndstreet.jp/buy",
            "https://golf-kace.com/",
            "https://ec.golf-kace.com/",
            "https://www.2ndstreet.jp/search?category=130001&shops[]=17284&page=1"
        ];
        
        echo "=== セカンドストリート系スクレイピングテスト ===\n";
        
        foreach ($testUrls as $testUrl) {
            echo "\nURL: {$testUrl}\n";
            
            $result = $scraper->scrapeProduct($testUrl);
            
            if ($result['success']) {
                echo "✅ スクレイピング成功!\n";
                echo "商品ID: " . $result['product_id'] . "\n";
                echo "サイト: " . $result['site_type'] . "\n";
                if (isset($result['data']['title'])) {
                    echo "商品名: " . $result['data']['title'] . "\n";
                }
                if (isset($result['data']['price'])) {
                    echo "価格: ¥" . number_format($result['data']['price']) . "\n";
                }
            } else {
                echo "❌ スクレイピング失敗: " . $result['error'] . "\n";
            }
        }
        
    } catch (Exception $e) {
        echo "エラー: " . $e->getMessage() . "\n";
    }
}

?>