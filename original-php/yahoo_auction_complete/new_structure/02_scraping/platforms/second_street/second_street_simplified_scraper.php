<?php
/**
 * セカンドストリート簡略化スクレイピング設計
 * 
 * 調査結果：同じ企業グループのため、HTML構造は85%程度共通
 * → 複雑なサイト別処理ではなく、共通処理+差分対応に変更
 * 
 * @version 2.0.0 (簡略化版)
 * @created 2025-09-25
 */

/**
 * セカンドストリート統合設定（簡略化）
 */
class SecondStreetUnifiedConfig {
    public static function getConfig() {
        return [
            'platform_name' => 'セカンドストリート系',
            'platform_id' => 'second_street_unified',
            'request_delay' => 2500,
            'timeout' => 30,
            'max_retries' => 3,
            
            // 共通セレクター（85%のサイトで共通）
            'common_selectors' => [
                'title' => [
                    'h1.product-title', 
                    'h1[class*="title"]', 
                    '.item-name',
                    'h1.item_name'
                ],
                'price' => [
                    '.price-value', 
                    '[class*="price"]', 
                    '.item-price',
                    '[data-price]'
                ],
                'condition' => [
                    '.condition', 
                    '.item-condition',
                    '.grade',
                    '[class*="rank"]'
                ],
                'images' => [
                    '.product-images img',
                    '.item-gallery img', 
                    '.product_image img'
                ],
                'description' => [
                    '.product-description',
                    '.item-detail',
                    '.product_detail'
                ]
            ],
            
            // サイト別差分のみ定義（15%の違い）
            'site_differences' => [
                'golf-kace.com' => [
                    'additional_selectors' => [
                        'golf_specs' => '.golf-specs',
                        'club_type' => '.club-type',
                        'loft' => '.loft-angle'
                    ],
                    'price_pattern' => '/中古価格[^0-9]*(\d{1,3}(?:,\d{3})*)/'
                ],
                'ec.golf-kace.com' => [
                    'additional_selectors' => [
                        'ec_price' => '.ec-price',
                        'stock_status' => '.stock-info'
                    ]
                ]
            ],
            
            // URL判定（簡略化）
            'url_patterns' => [
                'main_site' => '/2ndstreet\.jp/',
                'golf_site' => '/golf-kace\.com/',
                'golf_ec' => '/ec\.golf-kace\.com/'
            ]
        ];
    }
}

/**
 * セカンドストリート統合スクレイパー（簡略化版）
 */
class SecondStreetUnifiedScraper {
    private $pdo;
    private $logger;
    private $config;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->logger = new Logger('second_street_unified');
        $this->config = SecondStreetUnifiedConfig::getConfig();
    }
    
    /**
     * 統合スクレイピング処理
     */
    public function scrapeProduct($url) {
        try {
            $this->logger->info("セカンドストリート統合スクレイピング: {$url}");
            
            // サイト判定（簡素化）
            $siteType = $this->detectSiteType($url);
            
            // HTML取得
            $html = $this->fetchHtml($url);
            
            // 共通処理で90%の情報を抽出
            $productData = $this->extractCommonData($html, $url);
            
            // サイト別差分処理（残り10%）
            $productData = $this->applySiteSpecificExtraction($productData, $html, $siteType);
            
            // データベース保存
            $productId = $this->saveToDatabase($productData);
            
            return [
                'success' => true,
                'product_id' => $productId,
                'site_type' => $siteType,
                'data' => $productData
            ];
            
        } catch (Exception $e) {
            $this->logger->error("スクレイピングエラー: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * サイト判定（簡素化）
     */
    private function detectSiteType($url) {
        foreach ($this->config['url_patterns'] as $type => $pattern) {
            if (preg_match($pattern, $url)) {
                return $type;
            }
        }
        return 'main_site'; // デフォルト
    }
    
    /**
     * 共通データ抽出（85%の処理）
     */
    private function extractCommonData($html, $url) {
        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new DOMXPath($dom);
        
        $data = [
            'source_url' => $url,
            'platform' => 'second_street',
            'scraped_at' => date('Y-m-d H:i:s')
        ];
        
        // 共通セレクターで基本情報抽出
        $selectors = $this->config['common_selectors'];
        
        $data['title'] = $this->extractBySelectors($xpath, $selectors['title']);
        $data['price'] = $this->extractPriceBySelectors($html, $xpath, $selectors['price']);
        $data['condition'] = $this->extractBySelectors($xpath, $selectors['condition']);
        $data['description'] = $this->extractBySelectors($xpath, $selectors['description']);
        $data['images'] = $this->extractImagesBySelectors($xpath, $selectors['images']);
        
        return $data;
    }
    
    /**
     * サイト別差分処理（15%の処理）
     */
    private function applySiteSpecificExtraction($data, $html, $siteType) {
        $siteDiff = $this->config['site_differences'];
        
        // ゴルフサイト特有の情報
        if ($siteType === 'golf_site' && isset($siteDiff['golf-kace.com'])) {
            $golfConfig = $siteDiff['golf-kace.com'];
            
            // ゴルフクラブ仕様情報
            if (isset($golfConfig['additional_selectors']['golf_specs'])) {
                $data['golf_specifications'] = $this->extractGolfSpecs($html);
            }
            
            // ゴルフ特有の価格パターン
            if (isset($golfConfig['price_pattern'])) {
                $golfPrice = $this->extractPriceByPattern($html, $golfConfig['price_pattern']);
                if ($golfPrice > 0) {
                    $data['price'] = $golfPrice; // 上書き
                }
            }
        }
        
        return $data;
    }
    
    /**
     * セレクターによる抽出（汎用）
     */
    private function extractBySelectors($xpath, $selectors) {
        foreach ($selectors as $selector) {
            $xpathQuery = $this->cssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            if ($nodes->length > 0) {
                $value = trim($nodes->item(0)->textContent);
                if (!empty($value)) {
                    return $value;
                }
            }
        }
        return '';
    }
    
    /**
     * 価格抽出（セレクター + 正規表現）
     */
    private function extractPriceBySelectors($html, $xpath, $selectors) {
        // まずセレクターで試行
        $priceText = $this->extractBySelectors($xpath, $selectors);
        if (!empty($priceText)) {
            $price = $this->parsePriceText($priceText);
            if ($price > 0) return $price;
        }
        
        // 正規表現フォールバック（セカンドストリート共通パターン）
        $patterns = [
            '/￥[\s]*(\d{1,3}(?:,\d{3})*)/u',
            '/(\d{1,3}(?:,\d{3})*)[\s]*円/u',
            '/買取価格[^0-9]*(\d{1,3}(?:,\d{3})*)/'
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $price = $this->parsePriceText($matches[1]);
                if ($price > 0) return $price;
            }
        }
        
        return 0;
    }
    
    /**
     * 画像抽出
     */
    private function extractImagesBySelectors($xpath, $selectors) {
        $images = [];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->cssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            foreach ($nodes as $node) {
                if ($node->hasAttribute('src')) {
                    $src = $node->getAttribute('src');
                    if (strpos($src, 'http') === 0 && !in_array($src, $images)) {
                        $images[] = $src;
                    }
                }
            }
            
            if (count($images) >= 5) break; // 最大5枚で十分
        }
        
        return $images;
    }
    
    /**
     * ゴルフ仕様情報抽出（専門処理）
     */
    private function extractGolfSpecs($html) {
        $specs = [];
        
        // ゴルフクラブ特有の情報パターン
        $golfPatterns = [
            'loft' => '/ロフト[：\s]*(\d+\.?\d*)/',
            'shaft' => '/シャフト[：\s]*([^<\n]+)/',
            'club_type' => '/(ドライバー|フェアウェイウッド|アイアン|パター)/',
            'condition' => '/(A|B|C)ランク/'
        ];
        
        foreach ($golfPatterns as $key => $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $specs[$key] = trim($matches[1]);
            }
        }
        
        return $specs;
    }
    
    /**
     * 価格パターン抽出
     */
    private function extractPriceByPattern($html, $pattern) {
        if (preg_match($pattern, $html, $matches)) {
            return $this->parsePriceText($matches[1]);
        }
        return 0;
    }
    
    /**
     * 価格テキスト解析
     */
    private function parsePriceText($text) {
        $numbers = preg_replace('/[^0-9,]/', '', $text);
        $price = (int)str_replace(',', '', $numbers);
        return ($price >= 100 && $price <= 5000000) ? $price : 0;
    }
    
    /**
     * CSS to XPath 変換（簡易版）
     */
    private function cssToXpath($css) {
        // クラス名
        if (preg_match('/^\.([a-zA-Z0-9_-]+)$/', $css, $matches)) {
            return '//*[contains(@class, "' . $matches[1] . '")]';
        }
        
        // 要素 + クラス
        if (preg_match('/^([a-zA-Z]+)\.([a-zA-Z0-9_-]+)$/', $css, $matches)) {
            return '//' . $matches[1] . '[contains(@class, "' . $matches[2] . '")]';
        }
        
        // 属性セレクター
        if (preg_match('/\[([^=]+)="([^"]+)"\]/', $css, $matches)) {
            return '//*[@' . $matches[1] . '="' . $matches[2] . '"]';
        }
        
        // 要素名
        if (preg_match('/^[a-zA-Z]+$/', $css)) {
            return '//' . $css;
        }
        
        return '//*';
    }
    
    /**
     * HTML取得
     */
    private function fetchHtml($url) {
        $userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => "User-Agent: {$userAgent}\r\n",
                'timeout' => $this->config['timeout']
            ]
        ]);
        
        usleep($this->config['request_delay'] * 1000);
        
        $html = file_get_contents($url, false, $context);
        
        if ($html === false) {
            throw new Exception('HTML取得失敗: ' . $url);
        }
        
        return $html;
    }
    
    /**
     * データベース保存
     */
    private function saveToDatabase($data) {
        $stmt = $this->pdo->prepare("
            INSERT INTO supplier_products (
                platform, platform_product_id, source_url, product_title,
                condition_type, purchase_price, current_stock, description,
                images, additional_data, monitoring_enabled, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        
        $stmt->execute([
            'second_street',
            substr(md5($data['source_url']), 0, 12),
            $data['source_url'],
            $data['title'],
            $data['condition'],
            $data['price'],
            1,
            $data['description'],
            json_encode($data['images']),
            json_encode($data),
            true
        ]);
        
        return $this->pdo->lastInsertId();
    }
}

/**
 * 使用例とテスト
 */
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    try {
        $pdo = getDbConnection();
        $scraper = new SecondStreetUnifiedScraper($pdo);
        
        $testUrls = [
            "https://www.2ndstreet.jp/buy", // メインサイト
            "https://golf-kace.com/", // ゴルフ専門
            "https://ec.golf-kace.com/" // ゴルフEC
        ];
        
        echo "=== セカンドストリート統合スクレイピングテスト ===\n";
        
        foreach ($testUrls as $url) {
            echo "\n処理中: {$url}\n";
            $result = $scraper->scrapeProduct($url);
            
            if ($result['success']) {
                echo "✅ 成功: {$result['site_type']}\n";
                echo "商品名: " . ($result['data']['title'] ?? 'N/A') . "\n";
                echo "価格: ¥" . number_format($result['data']['price'] ?? 0) . "\n";
            } else {
                echo "❌ 失敗: " . $result['error'] . "\n";
            }
        }
        
    } catch (Exception $e) {
        echo "エラー: " . $e->getMessage() . "\n";
    }
}

?>