<?php
/**
 * 実用レベル完全商品データ取得・在庫管理統合システム
 * 
 * 目標:
 * - 全商品データの確実な取得
 * - 在庫管理システムとの完全連携
 * - エラー処理とリトライ機能
 * - データ検証とクリーニング
 * - パフォーマンス最適化
 * 
 * @version 3.0.0 (実用版)
 * @created 2025-09-25
 */

require_once __DIR__ . '/../../shared/core/database.php';
require_once __DIR__ . '/../../shared/core/logger.php';

/**
 * 実用レベルスクレイピング基盤クラス
 */
abstract class ProductionScraperBase {
    protected $pdo;
    protected $logger;
    protected $config;
    protected $retryCount = 0;
    protected $maxRetries = 5;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->logger = new Logger(static::class);
        $this->config = $this->getScraperConfig();
    }
    
    /**
     * メイン商品スクレイピングメソッド
     */
    public function scrapeProduct($url, $options = []) {
        $startTime = microtime(true);
        
        try {
            $this->logger->info("商品スクレイピング開始: {$url}");
            
            // URL正規化と検証
            $url = $this->normalizeUrl($url);
            $this->validateUrl($url);
            
            // 重複チェック（オプション）
            if (!($options['force'] ?? false)) {
                $existingProduct = $this->checkDuplicate($url);
                if ($existingProduct) {
                    return $this->handleDuplicate($existingProduct, $url);
                }
            }
            
            // HTML取得（リトライ機能付き）
            $html = $this->fetchHtmlWithRetry($url);
            
            // 商品データ抽出（多段階フォールバック）
            $productData = $this->extractProductData($html, $url);
            
            // データ検証とクリーニング
            $productData = $this->validateAndCleanData($productData);
            
            // データベース保存（トランザクション）
            $productId = $this->saveProductToDatabase($productData);
            
            // 在庫管理システム統合
            $inventoryId = $this->integrateWithInventorySystem($productId, $productData);
            
            // 画像ダウンロード（オプション）
            if ($options['download_images'] ?? false) {
                $this->downloadProductImages($productId, $productData['images'] ?? []);
            }
            
            $processingTime = round((microtime(true) - $startTime) * 1000, 2);
            
            $this->logger->info("スクレイピング完了: ProductID={$productId}, 処理時間={$processingTime}ms");
            
            return [
                'success' => true,
                'product_id' => $productId,
                'inventory_id' => $inventoryId,
                'data' => $productData,
                'processing_time_ms' => $processingTime,
                'platform' => $this->getPlatformName()
            ];
            
        } catch (Exception $e) {
            $this->logger->error("スクレイピングエラー: " . $e->getMessage() . " URL: {$url}");
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'url' => $url,
                'platform' => $this->getPlatformName(),
                'retry_count' => $this->retryCount
            ];
        }
    }
    
    /**
     * HTML取得（リトライ・レート制限対応）
     */
    protected function fetchHtmlWithRetry($url, $attempt = 1) {
        if ($attempt > $this->maxRetries) {
            throw new Exception("最大リトライ回数({$this->maxRetries})に達しました");
        }
        
        try {
            // レート制限遵守
            $this->respectRateLimit($attempt);
            
            // HTTP リクエスト実行
            $html = $this->performHttpRequest($url);
            
            // レスポンス検証
            $this->validateHttpResponse($html, $url);
            
            return $html;
            
        } catch (Exception $e) {
            $this->logger->warning("HTTP取得失敗 (試行{$attempt}/{$this->maxRetries}): " . $e->getMessage());
            
            // 指数バックオフでリトライ
            sleep($attempt * 2);
            return $this->fetchHtmlWithRetry($url, $attempt + 1);
        }
    }
    
    /**
     * HTTP リクエスト実行
     */
    protected function performHttpRequest($url) {
        $userAgent = $this->getRandomUserAgent();
        $headers = $this->buildRequestHeaders($userAgent);
        
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => implode("\r\n", $headers),
                'timeout' => $this->config['timeout'] ?? 30,
                'ignore_errors' => true,
                'follow_location' => true,
                'max_redirects' => 3
            ]
        ]);
        
        $html = file_get_contents($url, false, $context);
        
        if ($html === false) {
            throw new Exception("HTTP リクエスト失敗: {$url}");
        }
        
        // HTTPステータスコードチェック
        $this->checkHttpStatusCode($http_response_header ?? []);
        
        return $html;
    }
    
    /**
     * 商品データ抽出（多段階フォールバック）
     */
    protected function extractProductData($html, $url) {
        $data = [
            'source_url' => $url,
            'platform' => $this->getPlatformName(),
            'scraped_at' => date('Y-m-d H:i:s')
        ];
        
        // DOM解析準備
        $dom = new DOMDocument();
        libxml_use_internal_errors(true); // HTMLエラーを無視
        $dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
        $xpath = new DOMXPath($dom);
        
        // 各データ要素を多段階で抽出
        $data['title'] = $this->extractTitle($html, $xpath, $url);
        $data['price'] = $this->extractPrice($html, $xpath, $url);
        $data['condition'] = $this->extractCondition($html, $xpath, $url);
        $data['description'] = $this->extractDescription($html, $xpath, $url);
        $data['images'] = $this->extractImages($html, $xpath, $url);
        $data['brand'] = $this->extractBrand($html, $xpath, $url);
        $data['category'] = $this->extractCategory($html, $xpath, $url);
        $data['seller_info'] = $this->extractSellerInfo($html, $xpath, $url);
        $data['availability'] = $this->extractAvailability($html, $xpath, $url);
        
        // プラットフォーム固有データ
        $data['platform_specific'] = $this->extractPlatformSpecificData($html, $xpath, $url);
        
        return $data;
    }
    
    /**
     * タイトル抽出（多段階フォールバック）
     */
    protected function extractTitle($html, $xpath, $url) {
        $strategies = [
            // Strategy 1: JSON-LD構造化データ
            function($html) {
                if (preg_match('/"name"\s*:\s*"([^"]+)"/', $html, $matches)) {
                    return html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
                }
                return null;
            },
            
            // Strategy 2: Open Graph
            function($html) {
                if (preg_match('/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/', $html, $matches)) {
                    return html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
                }
                return null;
            },
            
            // Strategy 3: プラットフォーム固有セレクター
            function($html, $xpath) {
                $selectors = $this->getTitleSelectors();
                return $this->extractBySelectors($xpath, $selectors);
            },
            
            // Strategy 4: 汎用H1タグ
            function($html, $xpath) {
                $nodes = $xpath->query('//h1');
                if ($nodes->length > 0) {
                    return trim($nodes->item(0)->textContent);
                }
                return null;
            },
            
            // Strategy 5: タイトルタグからの抽出
            function($html) {
                if (preg_match('/<title[^>]*>([^<]+)<\/title>/i', $html, $matches)) {
                    $title = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
                    // サイト名を除去
                    $title = preg_replace('/\s*[\|\-]\s*' . preg_quote($this->getPlatformName()) . '.*$/i', '', $title);
                    return trim($title);
                }
                return null;
            }
        ];
        
        foreach ($strategies as $strategy) {
            $title = $strategy($html, $xpath);
            if (!empty($title) && strlen($title) > 5) {
                $this->logger->debug("タイトル抽出成功: " . substr($title, 0, 50) . "...");
                return $this->cleanTitle($title);
            }
        }
        
        throw new Exception("商品タイトルの取得に失敗しました");
    }
    
    /**
     * 価格抽出（多段階フォールバック）
     */
    protected function extractPrice($html, $xpath, $url) {
        $strategies = [
            // Strategy 1: JSON-LD価格
            function($html) {
                $patterns = [
                    '/"price"\s*:\s*"?(\d{1,3}(?:,?\d{3})*)"?/',
                    '/"priceRange"\s*:\s*"?(\d{1,3}(?:,?\d{3})*)"?/',
                    '/"highPrice"\s*:\s*"?(\d{1,3}(?:,?\d{3})*)"?/'
                ];
                
                foreach ($patterns as $pattern) {
                    if (preg_match($pattern, $html, $matches)) {
                        return $this->parsePrice($matches[1]);
                    }
                }
                return 0;
            },
            
            // Strategy 2: プラットフォーム固有セレクター
            function($html, $xpath) {
                $selectors = $this->getPriceSelectors();
                $priceText = $this->extractBySelectors($xpath, $selectors);
                return $this->parsePrice($priceText);
            },
            
            // Strategy 3: 汎用価格パターン
            function($html) {
                $patterns = [
                    '/￥[\s]*(\d{1,3}(?:,\d{3})*)/u',
                    '/¥[\s]*(\d{1,3}(?:,\d{3})*)/u',
                    '/(\d{1,3}(?:,\d{3})*)[\s]*円/u',
                    '/価格[^\d]*(\d{1,3}(?:,\d{3})*)[\s]*円/u'
                ];
                
                foreach ($patterns as $pattern) {
                    if (preg_match($pattern, $html, $matches)) {
                        $price = $this->parsePrice($matches[1]);
                        if ($price > 0) return $price;
                    }
                }
                return 0;
            }
        ];
        
        foreach ($strategies as $strategy) {
            $price = $strategy($html, $xpath);
            if ($price > 0) {
                $this->logger->debug("価格抽出成功: ¥" . number_format($price));
                return $price;
            }
        }
        
        throw new Exception("商品価格の取得に失敗しました");
    }
    
    /**
     * 画像抽出（高精度）
     */
    protected function extractImages($html, $xpath, $url) {
        $images = [];
        
        // Strategy 1: プラットフォーム固有セレクター
        $selectors = $this->getImageSelectors();
        foreach ($selectors as $selector) {
            $xpathQuery = $this->cssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            foreach ($nodes as $node) {
                $src = $node->getAttribute('src') ?: $node->getAttribute('data-src') ?: $node->getAttribute('data-lazy');
                if ($src && $this->isValidImageUrl($src)) {
                    $fullUrl = $this->resolveUrl($src, $url);
                    if (!in_array($fullUrl, $images)) {
                        $images[] = $fullUrl;
                    }
                }
            }
        }
        
        // Strategy 2: JSON-LD画像
        if (preg_match_all('/"image"\s*:\s*"([^"]+)"/', $html, $matches)) {
            foreach ($matches[1] as $imageUrl) {
                if ($this->isValidImageUrl($imageUrl) && !in_array($imageUrl, $images)) {
                    $images[] = $imageUrl;
                }
            }
        }
        
        // Strategy 3: 汎用img検索
        if (count($images) < 3) {
            $nodes = $xpath->query('//img[contains(@src, "product") or contains(@src, "item")]');
            foreach ($nodes as $node) {
                $src = $node->getAttribute('src');
                if ($src && $this->isValidImageUrl($src)) {
                    $fullUrl = $this->resolveUrl($src, $url);
                    if (!in_array($fullUrl, $images)) {
                        $images[] = $fullUrl;
                    }
                }
                if (count($images) >= 5) break;
            }
        }
        
        return array_slice($images, 0, 10); // 最大10枚
    }
    
    /**
     * データ検証とクリーニング
     */
    protected function validateAndCleanData($data) {
        // 必須フィールドチェック
        $requiredFields = ['title', 'price', 'source_url'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new Exception("必須フィールド'{$field}'が不足しています");
            }
        }
        
        // データクリーニング
        $data['title'] = $this->cleanTitle($data['title']);
        $data['description'] = $this->cleanDescription($data['description'] ?? '');
        $data['price'] = max(0, (int)$data['price']);
        
        // 価格妥当性チェック
        if ($data['price'] <= 0 || $data['price'] > 10000000) {
            throw new Exception("無効な価格: " . $data['price']);
        }
        
        // 画像URL検証
        $data['images'] = array_filter($data['images'] ?? [], [$this, 'isValidImageUrl']);
        
        // 商品ID生成
        $data['product_id'] = $this->generateProductId($data['source_url']);
        
        return $data;
    }
    
    /**
     * データベース保存（トランザクション）
     */
    protected function saveProductToDatabase($data) {
        try {
            $this->pdo->beginTransaction();
            
            // メイン商品データ
            $stmt = $this->pdo->prepare("
                INSERT INTO supplier_products (
                    platform, platform_product_id, source_url, product_title,
                    condition_type, purchase_price, current_stock, seller_info,
                    description, images, additional_data, monitoring_enabled,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            $result = $stmt->execute([
                $data['platform'],
                $data['product_id'],
                $data['source_url'],
                $data['title'],
                $data['condition'] ?? '状態不明',
                $data['price'],
                ($data['availability'] === 'available') ? 1 : 0,
                $data['seller_info'] ?? '',
                $data['description'] ?? '',
                json_encode($data['images']),
                json_encode($data['platform_specific'] ?? []),
                true
            ]);
            
            if (!$result) {
                throw new Exception('商品データの保存に失敗しました');
            }
            
            $productId = $this->pdo->lastInsertId();
            
            // プラットフォーム固有テーブルへの保存
            $this->savePlatformSpecificData($productId, $data);
            
            $this->pdo->commit();
            
            $this->logger->info("商品データ保存完了: ProductID={$productId}");
            return $productId;
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            $this->logger->error("データベース保存エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 在庫管理システム統合
     */
    protected function integrateWithInventorySystem($productId, $data) {
        try {
            // 在庫管理テーブルに登録
            $stmt = $this->pdo->prepare("
                INSERT INTO inventory_management (
                    product_id, source_platform, source_url, source_product_id,
                    current_stock, current_price, monitoring_enabled,
                    title_hash, url_status, last_verified_at,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    current_stock = VALUES(current_stock),
                    current_price = VALUES(current_price),
                    last_verified_at = VALUES(last_verified_at),
                    updated_at = VALUES(updated_at)
            ");
            
            $result = $stmt->execute([
                $productId,
                $data['platform'],
                $data['source_url'],
                $data['product_id'],
                ($data['availability'] === 'available') ? 1 : 0,
                $data['price'],
                true,
                hash('sha256', $data['title']),
                $data['availability'] === 'available' ? 'active' : 'sold'
            ]);
            
            if (!$result) {
                throw new Exception('在庫管理システム統合に失敗しました');
            }
            
            $inventoryId = $this->pdo->lastInsertId();
            
            // 初回在庫履歴記録
            $this->recordInitialStockHistory($inventoryId, $data);
            
            $this->logger->info("在庫管理統合完了: InventoryID={$inventoryId}");
            return $inventoryId;
            
        } catch (Exception $e) {
            $this->logger->error("在庫管理統合エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 初回在庫履歴記録
     */
    protected function recordInitialStockHistory($inventoryId, $data) {
        $stmt = $this->pdo->prepare("
            INSERT INTO stock_history (
                product_id, previous_stock, new_stock, previous_price, new_price,
                change_type, change_source, change_reason, created_at
            ) VALUES (?, 0, ?, 0, ?, 'initial_scrape', ?, '初回スクレイピング', NOW())
        ");
        
        $stmt->execute([
            $inventoryId,
            ($data['availability'] === 'available') ? 1 : 0,
            $data['price'],
            $data['platform']
        ]);
    }
    
    /**
     * 画像ダウンロード（オプション機能）
     */
    protected function downloadProductImages($productId, $imageUrls) {
        if (empty($imageUrls)) return;
        
        $downloadDir = "/var/www/html/images/products/{$productId}";
        if (!is_dir($downloadDir)) {
            mkdir($downloadDir, 0755, true);
        }
        
        foreach ($imageUrls as $index => $imageUrl) {
            try {
                $imageData = file_get_contents($imageUrl);
                if ($imageData !== false) {
                    $extension = pathinfo(parse_url($imageUrl, PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'jpg';
                    $filename = sprintf("image_%02d.%s", $index + 1, $extension);
                    $filepath = $downloadDir . '/' . $filename;
                    
                    if (file_put_contents($filepath, $imageData)) {
                        $this->logger->debug("画像ダウンロード完了: {$filename}");
                    }
                }
            } catch (Exception $e) {
                $this->logger->warning("画像ダウンロード失敗: {$imageUrl} - " . $e->getMessage());
            }
        }
    }
    
    // ===== ユーティリティメソッド =====
    
    protected function normalizeUrl($url) {
        $url = trim($url);
        if (!preg_match('/^https?:\/\//', $url)) {
            $url = 'https://' . $url;
        }
        return $url;
    }
    
    protected function parsePrice($priceText) {
        $numbers = preg_replace('/[^0-9,]/', '', $priceText);
        return (int)str_replace(',', '', $numbers);
    }
    
    protected function cleanTitle($title) {
        $title = html_entity_decode($title, ENT_QUOTES, 'UTF-8');
        $title = trim(preg_replace('/\s+/', ' ', $title));
        return mb_substr($title, 0, 200, 'UTF-8');
    }
    
    protected function cleanDescription($description) {
        $description = html_entity_decode(strip_tags($description), ENT_QUOTES, 'UTF-8');
        $description = trim(preg_replace('/\s+/', ' ', $description));
        return mb_substr($description, 0, 2000, 'UTF-8');
    }
    
    protected function isValidImageUrl($url) {
        if (empty($url)) return false;
        if (!preg_match('/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i', $url)) return false;
        if (strpos($url, 'placeholder') !== false) return false;
        if (strpos($url, 'no-image') !== false) return false;
        return true;
    }
    
    protected function resolveUrl($relativeUrl, $baseUrl) {
        if (preg_match('/^https?:\/\//', $relativeUrl)) {
            return $relativeUrl;
        }
        
        $parsed = parse_url($baseUrl);
        $base = $parsed['scheme'] . '://' . $parsed['host'];
        
        if (strpos($relativeUrl, '/') === 0) {
            return $base . $relativeUrl;
        } else {
            return $base . '/' . ltrim($relativeUrl, '/');
        }
    }
    
    protected function generateProductId($url) {
        return substr(hash('sha256', $url . time()), 0, 12);
    }
    
    protected function cssToXpath($css) {
        // 基本的なCSS→XPath変換
        if (preg_match('/^\.([a-zA-Z0-9_-]+)$/', $css, $matches)) {
            return '//*[contains(@class, "' . $matches[1] . '")]';
        }
        
        if (preg_match('/^#([a-zA-Z0-9_-]+)$/', $css, $matches)) {
            return '//*[@id="' . $matches[1] . '"]';
        }
        
        if (preg_match('/^\[([^=]+)="([^"]+)"\]$/', $css, $matches)) {
            return '//*[@' . $matches[1] . '="' . $matches[2] . '"]';
        }
        
        return '//' . $css;
    }
    
    protected function extractBySelectors($xpath, $selectors) {
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
    
    protected function getRandomUserAgent() {
        $userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
        ];
        return $userAgents[array_rand($userAgents)];
    }
    
    protected function buildRequestHeaders($userAgent) {
        return [
            "User-Agent: {$userAgent}",
            "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language: ja,en-US;q=0.7,en;q=0.3",
            "Accept-Encoding: gzip, deflate, br",
            "DNT: 1",
            "Connection: keep-alive",
            "Upgrade-Insecure-Requests: 1",
            "Cache-Control: no-cache"
        ];
    }
    
    protected function respectRateLimit($attempt) {
        $baseDelay = $this->config['request_delay'] ?? 2000; // milliseconds
        $delay = $baseDelay * $attempt; // 試行回数に応じて延長
        usleep($delay * 1000);
    }
    
    protected function validateHttpResponse($html, $url) {
        if (empty($html)) {
            throw new Exception("空のレスポンス: {$url}");
        }
        
        if (strlen($html) < 1000) {
            throw new Exception("レスポンスが短すぎます（" . strlen($html) . " bytes）");
        }
        
        // エラーページの検出
        $errorPatterns = [
            '/404|not found/i',
            '/access denied/i',
            '/forbidden/i',
            '/temporarily unavailable/i'
        ];
        
        foreach ($errorPatterns as $pattern) {
            if (preg_match($pattern, $html)) {
                throw new Exception("エラーページを検出: {$url}");
            }
        }
    }
    
    protected function checkHttpStatusCode($headers) {
        foreach ($headers as $header) {
            if (preg_match('/^HTTP\/\d\.\d\s+(\d+)/', $header, $matches)) {
                $statusCode = (int)$matches[1];
                if ($statusCode >= 400) {
                    throw new Exception("HTTP エラー: {$statusCode}");
                }
                return;
            }
        }
    }
    
    // ===== 抽象メソッド（各プラットフォームで実装） =====
    
    abstract protected function getScraperConfig();
    abstract protected function getPlatformName();
    abstract protected function getTitleSelectors();
    abstract protected function getPriceSelectors();
    abstract protected function getImageSelectors();
    abstract protected function extractCondition($html, $xpath, $url);
    abstract protected function extractDescription($html, $xpath, $url);
    abstract protected function extractBrand($html, $xpath, $url);
    abstract protected function extractCategory($html, $xpath, $url);
    abstract protected function extractSellerInfo($html, $xpath, $url);
    abstract protected function extractAvailability($html, $xpath, $url);
    abstract protected function extractPlatformSpecificData($html, $xpath, $url);
    abstract protected function savePlatformSpecificData($productId, $data);
    abstract protected function validateUrl($url);
    abstract protected function checkDuplicate($url);
    abstract protected function handleDuplicate($existingProduct, $url);
}

/**
 * 実用レベル バッチ処理クラス
 */
class ProductionBatchProcessor {
    private $scraper;
    private $logger;
    private $maxConcurrent = 3;
    private $batchSize = 10;
    
    public function __construct($scraper) {
        $this->scraper = $scraper;
        $this->logger = new Logger('production_batch');
    }
    
    /**
     * 大量URL処理（進捗表示・中断対応）
     */
    public function processBatch($urls, $options = []) {
        $totalUrls = count($urls);
        $processed = 0;
        $successful = 0;
        $failed = 0;
        $results = [];
        
        $this->logger->info("バッチ処理開始: {$totalUrls}件");
        
        // バッチサイズごとに分割処理
        $batches = array_chunk($urls, $this->batchSize);
        
        foreach ($batches as $batchIndex => $batch) {
            $this->logger->info("バッチ " . ($batchIndex + 1) . "/" . count($batches) . " 処理中...");
            
            foreach ($batch as $url) {
                try {
                    $result = $this->scraper->scrapeProduct($url, $options);
                    $results[] = $result;
                    
                    if ($result['success']) {
                        $successful++;
                        $this->logger->debug("成功: {$url}");
                    } else {
                        $failed++;
                        $this->logger->warning("失敗: {$url} - " . $result['error']);
                    }
                    
                } catch (Exception $e) {
                    $failed++;
                    $results[] = [
                        'success' => false,
                        'error' => $e->getMessage(),
                        'url' => $url
                    ];
                    $this->logger->error("例外: {$url} - " . $e->getMessage());
                }
                
                $processed++;
                
                // 進捗表示
                if ($processed % 10 === 0) {
                    $progress = round(($processed / $totalUrls) * 100, 1);
                    $this->logger->info("進捗: {$progress}% ({$processed}/{$totalUrls})");
                }
            }
            
            // バッチ間の休憩
            if ($batchIndex < count($batches) - 1) {
                sleep(5);
            }
        }
        
        $this->logger->info("バッチ処理完了: 成功={$successful}, 失敗={$failed}");
        
        return [
            'total' => $totalUrls,
            'processed' => $processed,
            'successful' => $successful,
            'failed' => $failed,
            'success_rate' => round(($successful / $totalUrls) * 100, 1),
            'results' => $results
        ];
    }
}

?>