<?php
/**
 * 02_scraping/includes/UrlValidator.php
 * 
 * URL生存確認・検証クラス
 * Yahoo Auctionリンクの有効性チェック
 */

require_once __DIR__ . '/../../shared/core/Database.php';
require_once __DIR__ . '/../../shared/core/Logger.php';

class UrlValidator {
    private $db;
    private $logger;
    private $config;
    private $userAgents;
    
    public function __construct($config = null) {
        $this->db = Database::getInstance();
        $this->logger = new Logger('url_validator');
        $this->config = $config ?: require __DIR__ . '/../config/inventory.php';
        
        // 複数のUser-Agentをローテーション
        $this->userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ];
    }
    
    /**
     * 単一URL検証
     */
    public function validateUrl($url, $options = []) {
        try {
            $this->logger->info("URL検証開始: {$url}");
            
            // 基本検証
            $basicValidation = $this->performBasicValidation($url);
            if (!$basicValidation['valid']) {
                return $basicValidation;
            }
            
            // HTTP接続検証
            $connectionResult = $this->testHttpConnection($url, $options);
            
            // コンテンツ検証
            $contentResult = $this->validateContent($url, $connectionResult['content'] ?? '');
            
            // 結果統合
            $result = array_merge($basicValidation, $connectionResult, $contentResult);
            $result['validation_timestamp'] = date('Y-m-d H:i:s');
            
            $this->logger->info("URL検証完了: {$url} - ステータス: {$result['status']}");
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error("URL検証エラー: {$url} - " . $e->getMessage());
            
            return [
                'url' => $url,
                'valid' => false,
                'status' => 'error',
                'error_message' => $e->getMessage(),
                'validation_timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }
    
    /**
     * 一括URL検証
     */
    public function validateUrlsBatch($urls, $options = []) {
        $results = [];
        $delay = $options['delay'] ?? $this->config['yahoo']['request_delay'];
        $maxConcurrent = $options['max_concurrent'] ?? 1;
        
        try {
            $this->logger->info("一括URL検証開始: " . count($urls) . "件");
            
            if ($maxConcurrent > 1) {
                // 並列処理
                $results = $this->validateUrlsConcurrent($urls, $maxConcurrent, $options);
            } else {
                // 順次処理
                foreach ($urls as $index => $url) {
                    $results[] = $this->validateUrl($url, $options);
                    
                    // 最後の処理でない場合は遅延
                    if ($index < count($urls) - 1) {
                        sleep($delay);
                    }
                }
            }
            
            $this->logger->info("一括URL検証完了: " . count($results) . "件処理");
            
            return [
                'total' => count($urls),
                'processed' => count($results),
                'results' => $results,
                'summary' => $this->generateValidationSummary($results)
            ];
            
        } catch (Exception $e) {
            $this->logger->error("一括URL検証エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 在庫管理商品のURL検証
     */
    public function validateInventoryUrls($productIds = null, $options = []) {
        try {
            // 対象商品取得
            $products = $this->getInventoryProducts($productIds);
            
            if (empty($products)) {
                return [
                    'total' => 0,
                    'processed' => 0,
                    'results' => [],
                    'summary' => []
                ];
            }
            
            $this->logger->info("在庫商品URL検証開始: " . count($products) . "件");
            
            $results = [];
            $updateQueue = [];
            
            foreach ($products as $product) {
                $validationResult = $this->validateUrl($product['source_url'], $options);
                $validationResult['product_id'] = $product['product_id'];
                $validationResult['title'] = $product['title'];
                
                $results[] = $validationResult;
                
                // URL状態が変更された場合は更新キューに追加
                if ($this->shouldUpdateUrlStatus($product, $validationResult)) {
                    $updateQueue[] = [
                        'product_id' => $product['product_id'],
                        'new_status' => $this->determineUrlStatus($validationResult),
                        'validation_result' => $validationResult
                    ];
                }
                
                // レート制限
                if (isset($options['delay'])) {
                    sleep($options['delay']);
                }
            }
            
            // 一括更新実行
            if (!empty($updateQueue)) {
                $this->updateUrlStatuses($updateQueue);
            }
            
            $this->logger->info("在庫商品URL検証完了: " . count($results) . "件処理、" . count($updateQueue) . "件更新");
            
            return [
                'total' => count($products),
                'processed' => count($results),
                'updated' => count($updateQueue),
                'results' => $results,
                'summary' => $this->generateValidationSummary($results)
            ];
            
        } catch (Exception $e) {
            $this->logger->error("在庫商品URL検証エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * デッドリンク検出・報告
     */
    public function detectDeadLinks($options = []) {
        try {
            $this->logger->info("デッドリンク検出開始");
            
            // 疑わしいリンクを特定
            $suspiciousLinks = $this->identifySuspiciousLinks();
            
            if (empty($suspiciousLinks)) {
                return [
                    'dead_links' => [],
                    'suspicious_links' => [],
                    'summary' => ['total' => 0, 'confirmed_dead' => 0]
                ];
            }
            
            // 詳細検証実行
            $validationResults = $this->validateUrlsBatch(
                array_column($suspiciousLinks, 'source_url'),
                $options
            );
            
            // デッドリンク分類
            $deadLinks = [];
            $recoveredLinks = [];
            
            foreach ($validationResults['results'] as $index => $result) {
                $product = $suspiciousLinks[$index];
                
                if (!$result['valid'] || $result['status'] === 'dead') {
                    $deadLinks[] = array_merge($product, $result);
                } elseif ($result['valid'] && $result['status'] === 'active') {
                    $recoveredLinks[] = array_merge($product, $result);
                }
            }
            
            // データベース更新
            $this->updateDeadLinkStatus($deadLinks, $recoveredLinks);
            
            $this->logger->info("デッドリンク検出完了: " . count($deadLinks) . "件デッド、" . count($recoveredLinks) . "件回復");
            
            return [
                'dead_links' => $deadLinks,
                'recovered_links' => $recoveredLinks,
                'suspicious_links' => $suspiciousLinks,
                'summary' => [
                    'total' => count($suspiciousLinks),
                    'confirmed_dead' => count($deadLinks),
                    'recovered' => count($recoveredLinks)
                ]
            ];
            
        } catch (Exception $e) {
            $this->logger->error("デッドリンク検出エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    // ===============================================
    // プライベートヘルパーメソッド
    // ===============================================
    
    /**
     * 基本URL検証
     */
    private function performBasicValidation($url) {
        // URL形式チェック
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return [
                'url' => $url,
                'valid' => false,
                'status' => 'invalid_format',
                'error_message' => '無効なURL形式'
            ];
        }
        
        // Yahoo Auction URLチェック
        if (!$this->isYahooAuctionUrl($url)) {
            return [
                'url' => $url,
                'valid' => false,
                'status' => 'not_yahoo_auction',
                'error_message' => 'Yahoo Auction URLではありません'
            ];
        }
        
        return [
            'url' => $url,
            'valid' => true,
            'status' => 'format_valid'
        ];
    }
    
    /**
     * HTTP接続テスト
     */
    private function testHttpConnection($url, $options = []) {
        $timeout = $options['timeout'] ?? $this->config['monitoring']['url_timeout_seconds'];
        $retryCount = $options['retry_count'] ?? $this->config['monitoring']['url_retry_count'];
        $userAgent = $this->getRandomUserAgent();
        
        for ($attempt = 1; $attempt <= $retryCount; $attempt++) {
            try {
                $ch = curl_init();
                
                curl_setopt_array($ch, [
                    CURLOPT_URL => $url,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_TIMEOUT => $timeout,
                    CURLOPT_CONNECTTIMEOUT => 10,
                    CURLOPT_USERAGENT => $userAgent,
                    CURLOPT_SSL_VERIFYPEER => false,
                    CURLOPT_MAXREDIRS => 5,
                    CURLOPT_HEADER => true,
                    CURLOPT_NOBODY => false
                ]);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $responseTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
                $finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
                $curlError = curl_error($ch);
                
                curl_close($ch);
                
                if ($curlError) {
                    throw new Exception("cURL エラー: {$curlError}");
                }
                
                // ヘッダーとボディを分離
                $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
                $headers = substr($response, 0, $headerSize);
                $content = substr($response, $headerSize);
                
                return [
                    'http_code' => $httpCode,
                    'response_time' => $responseTime,
                    'final_url' => $finalUrl,
                    'headers' => $headers,
                    'content' => $content,
                    'connection_successful' => true,
                    'attempt' => $attempt
                ];
                
            } catch (Exception $e) {
                $this->logger->warning("HTTP接続試行 {$attempt}/{$retryCount} 失敗: {$url} - " . $e->getMessage());
                
                if ($attempt === $retryCount) {
                    return [
                        'http_code' => 0,
                        'response_time' => 0,
                        'final_url' => $url,
                        'headers' => '',
                        'content' => '',
                        'connection_successful' => false,
                        'error_message' => $e->getMessage(),
                        'attempt' => $attempt
                    ];
                }
                
                // リトライ前の待機
                sleep($this->config['monitoring']['url_retry_delay']);
            }
        }
    }
    
    /**
     * コンテンツ検証
     */
    private function validateContent($url, $content) {
        if (empty($content)) {
            return [
                'content_valid' => false,
                'auction_status' => 'no_content',
                'status' => 'dead'
            ];
        }
        
        // Yahoo Auctionページの特徴的要素をチェック
        $indicators = [
            'active' => [
                '現在価格',
                '入札件数',
                '残り時間',
                'auc-bid-count'
            ],
            'ended' => [
                '終了',
                'ended',
                'オークション終了',
                'auction-ended'
            ],
            'deleted' => [
                '削除',
                'deleted',
                'ページが見つかりません',
                '404'
            ]
        ];
        
        // ステータス判定
        $status = 'unknown';
        $matchedIndicators = [];
        
        foreach ($indicators as $statusType => $patterns) {
            foreach ($patterns as $pattern) {
                if (stripos($content, $pattern) !== false) {
                    $status = $statusType;
                    $matchedIndicators[] = $pattern;
                }
            }
            
            if ($status !== 'unknown') break;
        }
        
        // 価格情報抽出試行
        $priceInfo = $this->extractPriceFromContent($content);
        
        return [
            'content_valid' => !empty($content),
            'auction_status' => $status,
            'status' => $this->mapAuctionStatusToValidationStatus($status),
            'matched_indicators' => $matchedIndicators,
            'price_info' => $priceInfo,
            'content_length' => strlen($content)
        ];
    }
    
    /**
     * コンテンツから価格情報抽出
     */
    private function extractPriceFromContent($content) {
        $pricePatterns = [
            '/現在価格[:\s]*([0-9,]+)\s*円/u',
            '/current-price["\'][^>]*>([0-9,]+)/i',
            '/price["\'][^>]*>([0-9,]+)/i'
        ];
        
        foreach ($pricePatterns as $pattern) {
            if (preg_match($pattern, $content, $matches)) {
                $price = str_replace(',', '', $matches[1]);
                if (is_numeric($price)) {
                    return [
                        'current_price' => intval($price),
                        'extracted_by' => $pattern
                    ];
                }
            }
        }
        
        return null;
    }
    
    /**
     * 並列URL検証
     */
    private function validateUrlsConcurrent($urls, $maxConcurrent, $options) {
        // 簡易的な並列処理実装
        $results = [];
        $batches = array_chunk($urls, $maxConcurrent);
        
        foreach ($batches as $batch) {
            $batchResults = [];
            
            foreach ($batch as $url) {
                $batchResults[] = $this->validateUrl($url, $options);
            }
            
            $results = array_merge($results, $batchResults);
            
            // バッチ間の待機
            if (count($batches) > 1) {
                sleep(2);
            }
        }
        
        return $results;
    }
    
    /**
     * 在庫管理商品取得
     */
    private function getInventoryProducts($productIds = null) {
        $sql = "
            SELECT 
                im.product_id,
                im.source_url,
                im.url_status,
                im.last_verified_at,
                ysp.title
            FROM inventory_management im
            JOIN yahoo_scraped_products ysp ON im.product_id = ysp.id
            WHERE im.monitoring_enabled = true
              AND ysp.workflow_status = 'listed'
        ";
        
        $params = [];
        if ($productIds) {
            $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
            $sql .= " AND im.product_id IN ({$placeholders})";
            $params = $productIds;
        }
        
        $sql .= " ORDER BY im.last_verified_at ASC NULLS FIRST";
        
        return $this->db->query($sql, $params)->fetchAll();
    }
    
    /**
     * 疑わしいリンク特定
     */
    private function identifySuspiciousLinks() {
        $sql = "
            SELECT 
                im.product_id,
                im.source_url,
                im.url_status,
                im.last_verified_at,
                ysp.title
            FROM inventory_management im
            JOIN yahoo_scraped_products ysp ON im.product_id = ysp.id
            WHERE im.monitoring_enabled = true
              AND (
                  im.url_status = 'dead' 
                  OR im.last_verified_at < NOW() - INTERVAL '7 days'
                  OR im.last_verified_at IS NULL
              )
            ORDER BY im.last_verified_at ASC NULLS FIRST
            LIMIT 50
        ";
        
        return $this->db->query($sql)->fetchAll();
    }
    
    /**
     * URL状態更新要否判定
     */
    private function shouldUpdateUrlStatus($product, $validationResult) {
        $currentStatus = $product['url_status'] ?? 'unknown';
        $newStatus = $this->determineUrlStatus($validationResult);
        
        return $currentStatus !== $newStatus;
    }
    
    /**
     * URL状態判定
     */
    private function determineUrlStatus($validationResult) {
        if (!$validationResult['valid']) {
            return 'dead';
        }
        
        switch ($validationResult['status']) {
            case 'active':
                return 'active';
            case 'ended':
                return 'ended';
            case 'dead':
            case 'deleted':
                return 'dead';
            default:
                return 'unknown';
        }
    }
    
    /**
     * URL状態一括更新
     */
    private function updateUrlStatuses($updateQueue) {
        try {
            $this->db->beginTransaction();
            
            foreach ($updateQueue as $update) {
                $this->db->update('inventory_management', [
                    'url_status' => $update['new_status'],
                    'last_verified_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ], ['product_id' => $update['product_id']]);
                
                // 履歴記録
                if ($update['new_status'] === 'dead') {
                    $this->recordUrlStatusChange($update);
                }
            }
            
            $this->db->commit();
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }
    
    /**
     * URL状態変更履歴記録
     */
    private function recordUrlStatusChange($update) {
        $this->db->insert('stock_history', [
            'product_id' => $update['product_id'],
            'change_type' => 'url_status_change',
            'change_source' => 'url_validator',
            'change_details' => json_encode($update['validation_result']),
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * デッドリンク状態更新
     */
    private function updateDeadLinkStatus($deadLinks, $recoveredLinks) {
        // デッドリンク更新
        foreach ($deadLinks as $link) {
            $this->db->update('inventory_management', [
                'url_status' => 'dead',
                'monitoring_enabled' => false, // 監視停止
                'last_verified_at' => date('Y-m-d H:i:s')
            ], ['product_id' => $link['product_id']]);
        }
        
        // 回復リンク更新
        foreach ($recoveredLinks as $link) {
            $this->db->update('inventory_management', [
                'url_status' => 'active',
                'monitoring_enabled' => true, // 監視再開
                'last_verified_at' => date('Y-m-d H:i:s')
            ], ['product_id' => $link['product_id']]);
        }
    }
    
    /**
     * 検証結果サマリー生成
     */
    private function generateValidationSummary($results) {
        $summary = [
            'total' => count($results),
            'valid' => 0,
            'invalid' => 0,
            'dead' => 0,
            'ended' => 0,
            'active' => 0,
            'errors' => 0
        ];
        
        foreach ($results as $result) {
            if ($result['valid']) {
                $summary['valid']++;
            } else {
                $summary['invalid']++;
            }
            
            switch ($result['status']) {
                case 'active':
                    $summary['active']++;
                    break;
                case 'ended':
                    $summary['ended']++;
                    break;
                case 'dead':
                    $summary['dead']++;
                    break;
                case 'error':
                    $summary['errors']++;
                    break;
            }
        }
        
        return $summary;
    }
    
    /**
     * ヘルパーメソッド
     */
    private function isYahooAuctionUrl($url) {
        return strpos($url, 'page.auctions.yahoo.co.jp') !== false ||
               strpos($url, 'auctions.yahoo.co.jp') !== false;
    }
    
    private function getRandomUserAgent() {
        return $this->userAgents[array_rand($this->userAgents)];
    }
    
    private function mapAuctionStatusToValidationStatus($auctionStatus) {
        switch ($auctionStatus) {
            case 'active':
                return 'active';
            case 'ended':
                return 'ended';
            case 'deleted':
                return 'dead';
            default:
                return 'unknown';
        }
    }
}
?>