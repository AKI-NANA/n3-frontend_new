<?php
/**
 * ホビー系ECサイト統合スクレイピングシステム
 * 
 * 既存yahoo_scraped_productsテーブルと完全連携
 * 25+プラットフォーム対応
 * 
 * @version 1.0.0
 * @date 2025-09-26
 */

namespace App\Scraping\Hobby;

use GuzzleHttp\Client;
use Symfony\Component\DomCrawler\Crawler;

/**
 * 統合スクレイピング基底クラス
 */
abstract class BaseHobbyScraper {
    protected $httpClient;
    protected $db;
    protected $platformConfig;
    protected $logger;
    
    public function __construct($platformCode) {
        // 既存DB接続
        $this->db = $this->connectDatabase();
        
        // プラットフォーム設定読み込み
        $this->platformConfig = $this->loadPlatformConfig($platformCode);
        
        // HTTP クライアント初期化
        $this->httpClient = new Client([
            'timeout' => $this->platformConfig['timeout'] ?? 30,
            'verify' => false,
            'headers' => [
                'User-Agent' => $this->getRandomUserAgent(),
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language' => 'ja,en-US;q=0.9,en;q=0.8',
            ]
        ]);
        
        $this->logger = new ScrapeLogger($platformCode);
    }
    
    /**
     * データベース接続（既存システム準拠）
     */
    protected function connectDatabase() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new \PDO($dsn, $user, $password);
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(\PDO::ATTR_DEFAULT_FETCH_MODE, \PDO::FETCH_ASSOC);
            
            return $pdo;
        } catch (\PDOException $e) {
            throw new \Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    /**
     * メインスクレイピング処理
     */
    public function scrape($targetUrl) {
        try {
            $this->logger->info("スクレイピング開始: {$targetUrl}");
            
            // レート制限
            $this->applyRateLimit();
            
            // HTMLコンテンツ取得
            $html = $this->fetchHTML($targetUrl);
            
            // HTML解析
            $productData = $this->parseProductPage($html, $targetUrl);
            
            // 在庫状態検出
            $productData['stock_status'] = $this->detectStockStatus($html);
            $productData['stock_quantity'] = $this->extractStockQuantity($html);
            
            // 価格情報抽出
            $productData['price'] = $this->extractPrice($html);
            $productData['original_price'] = $this->extractOriginalPrice($html);
            
            // データベース保存（既存テーブル構造準拠）
            $productId = $this->saveToDatabase($productData);
            
            $this->logger->info("スクレイピング完了: Product ID {$productId}");
            
            return [
                'success' => true,
                'product_id' => $productId,
                'data' => $productData
            ];
            
        } catch (\Exception $e) {
            $this->logger->error("スクレイピングエラー: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * HTML取得
     */
    protected function fetchHTML($url) {
        $response = $this->httpClient->get($url);
        return (string) $response->getBody();
    }
    
    /**
     * 既存yahoo_scraped_productsテーブルにデータ保存
     */
    protected function saveToDatabase($data) {
        // 既存レコード確認
        $checkSql = "SELECT id FROM yahoo_scraped_products 
                     WHERE source_platform = ? AND source_item_id = ?";
        $stmt = $this->db->prepare($checkSql);
        $stmt->execute([
            $this->platformConfig['platform_code'],
            $data['platform_product_id']
        ]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            // 更新処理
            return $this->updateProduct($existing['id'], $data);
        } else {
            // 新規登録
            return $this->insertProduct($data);
        }
    }
    
    /**
     * 新規商品登録
     */
    protected function insertProduct($data) {
        $sql = "INSERT INTO yahoo_scraped_products (
            source_platform,
            source_item_id,
            title,
            price,
            original_price,
            url,
            image_url,
            description,
            category,
            brand,
            stock_status,
            stock_quantity,
            scraped_data,
            workflow_status,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scraped', NOW(), NOW()) 
        RETURNING id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $this->platformConfig['platform_code'],
            $data['platform_product_id'],
            $data['title'],
            $data['price'],
            $data['original_price'] ?? $data['price'],
            $data['url'],
            $data['images'][0] ?? null,
            $data['description'] ?? '',
            $data['category'] ?? '',
            $data['brand'] ?? '',
            $data['stock_status'],
            $data['stock_quantity'] ?? 0,
            json_encode($data, JSON_UNESCAPED_UNICODE)
        ]);
        
        $result = $stmt->fetch();
        return $result['id'];
    }
    
    /**
     * 商品情報更新
     */
    protected function updateProduct($productId, $data) {
        // 価格・在庫変動チェック
        $oldData = $this->getProductById($productId);
        
        $sql = "UPDATE yahoo_scraped_products SET
            title = ?,
            price = ?,
            original_price = ?,
            image_url = ?,
            description = ?,
            category = ?,
            brand = ?,
            stock_status = ?,
            stock_quantity = ?,
            scraped_data = ?,
            updated_at = NOW()
        WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['title'],
            $data['price'],
            $data['original_price'] ?? $data['price'],
            $data['images'][0] ?? null,
            $data['description'] ?? '',
            $data['category'] ?? '',
            $data['brand'] ?? '',
            $data['stock_status'],
            $data['stock_quantity'] ?? 0,
            json_encode($data, JSON_UNESCAPED_UNICODE),
            $productId
        ]);
        
        // 変動履歴記録
        $this->recordChanges($productId, $oldData, $data);
        
        return $productId;
    }
    
    /**
     * 価格・在庫変動履歴記録
     */
    protected function recordChanges($productId, $oldData, $newData) {
        // 価格変動
        if ($oldData['price'] != $newData['price']) {
            $priceChangeSql = "INSERT INTO price_change_history 
                (product_id, old_price, new_price, change_percent, detected_at)
                VALUES (?, ?, ?, ?, NOW())";
            
            $changePercent = (($newData['price'] - $oldData['price']) / $oldData['price']) * 100;
            
            $stmt = $this->db->prepare($priceChangeSql);
            $stmt->execute([
                $productId,
                $oldData['price'],
                $newData['price'],
                round($changePercent, 2)
            ]);
        }
        
        // 在庫変動
        if ($oldData['stock_status'] !== $newData['stock_status'] || 
            $oldData['stock_quantity'] !== $newData['stock_quantity']) {
            
            $stockChangeSql = "INSERT INTO stock_change_history 
                (product_id, old_status, new_status, old_quantity, new_quantity, detected_at)
                VALUES (?, ?, ?, ?, ?, NOW())";
            
            $stmt = $this->db->prepare($stockChangeSql);
            $stmt->execute([
                $productId,
                $oldData['stock_status'],
                $newData['stock_status'],
                $oldData['stock_quantity'],
                $newData['stock_quantity']
            ]);
        }
    }
    
    /**
     * レート制限適用
     */
    protected function applyRateLimit() {
        $delay = $this->platformConfig['request_delay'] ?? 2000;
        usleep($delay * 1000);
    }
    
    /**
     * User-Agent ランダム選択
     */
    protected function getRandomUserAgent() {
        $userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
        ];
        return $userAgents[array_rand($userAgents)];
    }
    
    /**
     * 商品ID取得
     */
    protected function getProductById($id) {
        $stmt = $this->db->prepare("SELECT * FROM yahoo_scraped_products WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }
    
    /**
     * プラットフォーム設定読み込み
     */
    protected function loadPlatformConfig($platformCode) {
        $configFile = __DIR__ . "/../../config/platforms/{$platformCode}.json";
        if (file_exists($configFile)) {
            return json_decode(file_get_contents($configFile), true);
        }
        throw new \Exception("Platform config not found: {$platformCode}");
    }
    
    // 抽象メソッド（各プラットフォームで実装）
    abstract protected function parseProductPage($html, $url);
    abstract protected function detectStockStatus($html);
    abstract protected function extractStockQuantity($html);
    abstract protected function extractPrice($html);
    abstract protected function extractOriginalPrice($html);
}

/**
 * タカラトミー専用スクレイパー
 */
class TakaraTomyScraper extends BaseHobbyScraper {
    
    public function __construct() {
        parent::__construct('takaratomy');
    }
    
    protected function parseProductPage($html, $url) {
        $crawler = new Crawler($html);
        
        return [
            'platform_product_id' => $this->extractProductId($url),
            'title' => $this->extractTitle($crawler),
            'url' => $url,
            'images' => $this->extractImages($crawler),
            'description' => $this->extractDescription($crawler),
            'category' => $this->extractCategory($crawler),
            'brand' => $this->detectBrand($crawler),
            'specifications' => $this->extractSpecifications($crawler)
        ];
    }
    
    protected function extractProductId($url) {
        // URL: https://takaratomymall.jp/shop/g/g4904810990604/
        if (preg_match('/\/g\/([^\/]+)/', $url, $matches)) {
            return $matches[1];
        }
        return null;
    }
    
    protected function extractTitle($crawler) {
        $selectors = [
            'h1.product-name',
            'h1.item-name',
            '.product-title h1',
            'h1[itemprop="name"]'
        ];
        
        foreach ($selectors as $selector) {
            try {
                $title = $crawler->filter($selector)->text();
                if (!empty($title)) {
                    return trim($title);
                }
            } catch (\Exception $e) {
                continue;
            }
        }
        return 'タイトル取得失敗';
    }
    
    protected function extractPrice($html) {
        $crawler = new Crawler($html);
        
        $selectors = [
            'span.price',
            '.product-price',
            'span[itemprop="price"]',
            '.item-price span'
        ];
        
        foreach ($selectors as $selector) {
            try {
                $priceText = $crawler->filter($selector)->text();
                // 数字のみ抽出
                $price = preg_replace('/[^0-9]/', '', $priceText);
                if (!empty($price)) {
                    return (float) $price;
                }
            } catch (\Exception $e) {
                continue;
            }
        }
        return 0;
    }
    
    protected function extractOriginalPrice($html) {
        $crawler = new Crawler($html);
        
        $selectors = [
            'span.original-price',
            '.price-original',
            's.old-price'
        ];
        
        foreach ($selectors as $selector) {
            try {
                $priceText = $crawler->filter($selector)->text();
                $price = preg_replace('/[^0-9]/', '', $priceText);
                if (!empty($price)) {
                    return (float) $price;
                }
            } catch (\Exception $e) {
                continue;
            }
        }
        return null;
    }
    
    protected function detectStockStatus($html) {
        $crawler = new Crawler($html);
        
        // パターン1: カートボタンの状態
        try {
            $button = $crawler->filter('button.add-to-cart, .cart-btn, button[name="add"]');
            if ($button->count() > 0) {
                $buttonHtml = $button->html();
                $buttonText = $button->text();
                
                // disabled属性チェック
                if ($button->attr('disabled') || strpos($buttonHtml, 'disabled') !== false) {
                    return 'out_of_stock';
                }
                
                // ボタンテキストチェック
                if (strpos($buttonText, 'カートに入れる') !== false || 
                    strpos($buttonText, '購入する') !== false) {
                    return 'in_stock';
                }
            }
        } catch (\Exception $e) {}
        
        // パターン2: ステータステキスト
        $statusKeywords = [
            '品切れ' => 'out_of_stock',
            '売り切れ' => 'out_of_stock',
            '入荷待ち' => 'out_of_stock',
            '予約' => 'preorder',
            '予約受付中' => 'preorder',
            '在庫あり' => 'in_stock',
            '発売中' => 'in_stock'
        ];
        
        foreach ($statusKeywords as $keyword => $status) {
            if (strpos($html, $keyword) !== false) {
                return $status;
            }
        }
        
        return 'unknown';
    }
    
    protected function extractStockQuantity($html) {
        $crawler = new Crawler($html);
        
        $selectors = [
            '.stock-quantity',
            '.stock-info',
            'span.stock'
        ];
        
        foreach ($selectors as $selector) {
            try {
                $stockText = $crawler->filter($selector)->text();
                if (preg_match('/(\d+)/', $stockText, $matches)) {
                    return (int) $matches[1];
                }
            } catch (\Exception $e) {
                continue;
            }
        }
        
        return null;
    }
    
    protected function extractImages($crawler) {
        $images = [];
        
        $selectors = [
            'img.product-image',
            '.item-images img',
            'img[itemprop="image"]',
            '.product-gallery img'
        ];
        
        foreach ($selectors as $selector) {
            try {
                $crawler->filter($selector)->each(function($node) use (&$images) {
                    $src = $node->attr('src') ?: $node->attr('data-src');
                    if ($src && !in_array($src, $images)) {
                        $images[] = $src;
                    }
                });
                
                if (!empty($images)) {
                    break;
                }
            } catch (\Exception $e) {
                continue;
            }
        }
        
        return $images;
    }
    
    protected function extractDescription($crawler) {
        $selectors = [
            '.product-description',
            '.item-detail',
            'div[itemprop="description"]',
            '.detail-text'
        ];
        
        foreach ($selectors as $selector) {
            try {
                $desc = $crawler->filter($selector)->text();
                if (!empty($desc)) {
                    return trim($desc);
                }
            } catch (\Exception $e) {
                continue;
            }
        }
        
        return '';
    }
    
    protected function extractCategory($crawler) {
        try {
            $breadcrumbs = $crawler->filter('.breadcrumb a, .bread-crumb a')->each(function($node) {
                return $node->text();
            });
            return implode(' > ', array_slice($breadcrumbs, 1));
        } catch (\Exception $e) {
            return '';
        }
    }
    
    protected function detectBrand($crawler) {
        $brands = ['トミカ', 'プラレール', 'リカちゃん', 'ポケモン', 'ディズニー', 'トランスフォーマー'];
        
        try {
            $breadcrumb = $crawler->filter('.breadcrumb')->text();
            foreach ($brands as $brand) {
                if (strpos($breadcrumb, $brand) !== false) {
                    return $brand;
                }
            }
        } catch (\Exception $e) {}
        
        return 'タカラトミー';
    }
    
    protected function extractSpecifications($crawler) {
        $specs = [];
        
        try {
            $crawler->filter('.spec-table tr, .product-spec li')->each(function($node) use (&$specs) {
                $text = $node->text();
                if (preg_match('/(.+?)[:：](.+)/', $text, $matches)) {
                    $specs[trim($matches[1])] = trim($matches[2]);
                }
            });
        } catch (\Exception $e) {}
        
        return $specs;
    }
}

/**
 * シンプルなロガークラス
 */
class ScrapeLogger {
    private $platform;
    private $logFile;
    
    public function __construct($platform) {
        $this->platform = $platform;
        $this->logFile = __DIR__ . "/../../logs/scraping/{$platform}_" . date('Y-m-d') . ".log";
        
        $logDir = dirname($this->logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
        }
    }
    
    public function info($message) {
        $this->write('INFO', $message);
    }
    
    public function error($message) {
        $this->write('ERROR', $message);
    }
    
    private function write($level, $message) {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] [{$level}] {$message}\n";
        file_put_contents($this->logFile, $logMessage, FILE_APPEND);
    }
}

// 使用例
/*
$scraper = new TakaraTomyScraper();
$result = $scraper->scrape('https://takaratomymall.jp/shop/g/g4904810990604/');

if ($result['success']) {
    echo "スクレイピング成功: Product ID " . $result['product_id'];
} else {
    echo "エラー: " . $result['error'];
}
*/
