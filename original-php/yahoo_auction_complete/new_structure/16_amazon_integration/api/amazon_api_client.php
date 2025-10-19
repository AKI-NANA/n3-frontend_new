<?php
/**
 * Amazon API クライアント - 統合版（依存関係解決済み）
 * new_structure/16_amazon_integration/api/amazon_api_client.php
 */

class AmazonApiClient {
    private $config;
    private $logger;
    private $lastRequestTime = 0;
    private $requestCount = 0;
    private $dailyRequestCount = 0;
    private $lastResetTime;
    
    public function __construct() {
        // 内蔵ログ機能
        $this->logger = new SimpleLogger('AmazonAPI');
        $this->lastResetTime = time();
        
        // 設定の読み込み
        $this->loadConfiguration();
        $this->validateConfiguration();
    }
    
    /**
     * 設定読み込み
     */
    private function loadConfiguration() {
        // 環境変数読み込み
        $envPath = '/Users/aritahiroaki/NAGANO-3/N3-Development/common/env/.env';
        $env = [];
        
        if (file_exists($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
                list($key, $value) = explode('=', $line, 2);
                $env[trim($key)] = trim($value, '"');
            }
        }
        
        // デフォルト設定
        $this->config = [
            'credentials' => [
                'access_key' => $env['AMAZON_ACCESS_KEY'] ?? '',
                'secret_key' => $env['AMAZON_SECRET_KEY'] ?? '',
                'partner_tag' => $env['AMAZON_PARTNER_TAG'] ?? '',
                'marketplace' => $env['AMAZON_MARKETPLACE'] ?? 'www.amazon.com'
            ],
            'endpoints' => [
                'paapi' => 'https://webservices.amazon.com/paapi5/getitems',
                'search' => 'https://webservices.amazon.com/paapi5/searchitems',
                'variations' => 'https://webservices.amazon.com/paapi5/getvariations'
            ],
            'rate_limits' => [
                'requests_per_second' => 1,
                'max_requests_per_day' => 8640,
                'retry_max_attempts' => 3
            ],
            'request' => [
                'timeout' => 30,
                'connect_timeout' => 10,
                'user_agent' => 'YahooAmazonIntegrator/1.0'
            ],
            'search_defaults' => [
                'search_index' => 'All',
                'item_count' => 10,
                'resources' => [
                    'Images.Primary.Medium',
                    'Images.Primary.Large',
                    'ItemInfo.Title',
                    'ItemInfo.Features',
                    'ItemInfo.ProductInfo',
                    'Offers.Listings.Price',
                    'Offers.Listings.Availability',
                    'Offers.Listings.DeliveryInfo.IsPrimeEligible'
                ]
            ]
        ];
    }
    
    /**
     * 設定の検証
     */
    private function validateConfiguration() {
        $required = ['access_key', 'secret_key', 'partner_tag', 'marketplace'];
        
        foreach ($required as $key) {
            if (empty($this->config['credentials'][$key])) {
                throw new Exception("Amazon API設定が不完全です: {$key} が設定されていません");
            }
        }
        
        $this->logger->info('Amazon API設定検証完了');
    }
    
    /**
     * ASINによる商品情報取得
     * 
     * @param array $asins ASIN配列（最大10件）
     * @param array $resources 取得するリソース
     * @return array 商品データ配列
     */
    public function getItemsByAsin(array $asins, array $resources = null) {
        // ASIN検証
        $validAsins = array_filter($asins, [$this, 'validateAsin']);
        
        if (empty($validAsins)) {
            throw new Exception('有効なASINが指定されていません');
        }
        
        if (count($validAsins) > 10) {
            $this->logger->warning('ASIN数が上限を超えています。最初の10件のみ処理します');
            $validAsins = array_slice($validAsins, 0, 10);
        }
        
        $resources = $resources ?? $this->config['search_defaults']['resources'];
        
        $requestData = [
            'PartnerTag' => $this->config['credentials']['partner_tag'],
            'PartnerType' => 'Associates',
            'Marketplace' => $this->config['credentials']['marketplace'],
            'ItemIds' => $validAsins,
            'Resources' => $resources
        ];
        
        return $this->executeApiRequest('GetItems', $requestData);
    }
    
    /**
     * キーワード検索
     * 
     * @param string $keywords 検索キーワード
     * @param array $options 検索オプション
     * @return array 検索結果
     */
    public function searchItems(string $keywords, array $options = []) {
        $keywords = trim($keywords);
        
        if (empty($keywords)) {
            throw new Exception('検索キーワードが空です');
        }
        
        $defaultOptions = [
            'SearchIndex' => $this->config['search_defaults']['search_index'],
            'ItemCount' => $this->config['search_defaults']['item_count'],
            'Resources' => $this->config['search_defaults']['resources']
        ];
        
        $options = array_merge($defaultOptions, $options);
        
        $requestData = [
            'PartnerTag' => $this->config['credentials']['partner_tag'],
            'PartnerType' => 'Associates',
            'Marketplace' => $this->config['credentials']['marketplace'],
            'Keywords' => $keywords,
            'SearchIndex' => $options['SearchIndex'],
            'ItemCount' => min($options['ItemCount'], 10),
            'Resources' => $options['Resources']
        ];
        
        if (isset($options['ItemPage'])) {
            $requestData['ItemPage'] = max(1, intval($options['ItemPage']));
        }
        
        return $this->executeApiRequest('SearchItems', $requestData);
    }
    
    /**
     * APIリクエスト実行
     * 
     * @param string $operation API操作名
     * @param array $requestData リクエストデータ
     * @param int $attempt 試行回数
     * @return array APIレスポンス
     */
    private function executeApiRequest(string $operation, array $requestData, int $attempt = 1) {
        try {
            // レート制限チェック
            $this->enforceRateLimit();
            
            // 日次制限チェック
            $this->checkDailyLimit();
            
            // HTTPリクエスト実行
            $endpoint = $this->config['endpoints']['paapi'];
            if ($operation === 'SearchItems') {
                $endpoint = $this->config['endpoints']['search'];
            }
            
            $response = $this->makeHttpRequest($endpoint, $requestData, $operation);
            
            // 成功時の処理
            $this->requestCount++;
            $this->dailyRequestCount++;
            $this->lastRequestTime = microtime(true);
            
            $this->logger->info("API呼び出し成功", [
                'operation' => $operation,
                'attempt' => $attempt,
                'daily_count' => $this->dailyRequestCount
            ]);
            
            return $this->parseResponse($response);
            
        } catch (Exception $e) {
            $this->logger->error("API呼び出しエラー (試行{$attempt})", [
                'operation' => $operation,
                'error' => $e->getMessage(),
                'attempt' => $attempt
            ]);
            
            // リトライ判定
            if ($attempt <= $this->config['rate_limits']['retry_max_attempts']) {
                $waitTime = $this->calculateBackoffTime($attempt);
                
                if ($this->shouldRetry($e)) {
                    $this->logger->info("リトライ実行", [
                        'wait_time' => $waitTime,
                        'attempt' => $attempt
                    ]);
                    
                    sleep($waitTime);
                    return $this->executeApiRequest($operation, $requestData, $attempt + 1);
                }
            }
            
            $this->logger->error("API呼び出し完全失敗", [
                'operation' => $operation,
                'final_error' => $e->getMessage(),
                'total_attempts' => $attempt
            ]);
            
            throw $e;
        }
    }
    
    /**
     * HTTPリクエスト実行
     * 
     * @param string $endpoint エンドポイントURL
     * @param array $requestData リクエストデータ
     * @param string $operation 操作名
     * @return string レスポンス
     */
    private function makeHttpRequest(string $endpoint, array $requestData, string $operation) {
        $jsonPayload = json_encode($requestData);
        
        // AWS署名v4作成
        $headers = $this->createAwsSignature($endpoint, $jsonPayload, $operation);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $endpoint,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $jsonPayload,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => $this->config['request']['timeout'],
            CURLOPT_CONNECTTIMEOUT => $this->config['request']['connect_timeout'],
            CURLOPT_USERAGENT => $this->config['request']['user_agent'],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($response === false || !empty($error)) {
            throw new Exception("HTTP通信エラー: {$error}");
        }
        
        if ($httpCode !== 200) {
            throw new Exception("HTTP エラー: {$httpCode}");
        }
        
        return $response;
    }
    
    /**
     * AWS署名v4作成
     * 
     * @param string $endpoint エンドポイント
     * @param string $payload ペイロード
     * @param string $operation 操作名
     * @return array ヘッダー配列
     */
    private function createAwsSignature(string $endpoint, string $payload, string $operation) {
        $accessKey = $this->config['credentials']['access_key'];
        $secretKey = $this->config['credentials']['secret_key'];
        
        $host = parse_url($endpoint, PHP_URL_HOST);
        $uri = parse_url($endpoint, PHP_URL_PATH);
        
        $timestamp = gmdate('Ymd\THis\Z');
        $date = gmdate('Ymd');
        
        // Canonical request
        $canonicalHeaders = "content-type:application/json; charset=utf-8\n";
        $canonicalHeaders .= "host:{$host}\n";
        $canonicalHeaders .= "x-amz-date:{$timestamp}\n";
        $canonicalHeaders .= "x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.{$operation}\n";
        
        $signedHeaders = 'content-type;host;x-amz-date;x-amz-target';
        $payloadHash = hash('sha256', $payload);
        
        $canonicalRequest = "POST\n{$uri}\n\n{$canonicalHeaders}\n{$signedHeaders}\n{$payloadHash}";
        
        // String to sign
        $credentialScope = "{$date}/us-east-1/ProductAdvertisingAPI/aws4_request";
        $stringToSign = "AWS4-HMAC-SHA256\n{$timestamp}\n{$credentialScope}\n" . hash('sha256', $canonicalRequest);
        
        // Signing key
        $kDate = hash_hmac('sha256', $date, 'AWS4' . $secretKey, true);
        $kRegion = hash_hmac('sha256', 'us-east-1', $kDate, true);
        $kService = hash_hmac('sha256', 'ProductAdvertisingAPI', $kRegion, true);
        $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);
        
        // Signature
        $signature = hash_hmac('sha256', $stringToSign, $kSigning);
        $authorization = "AWS4-HMAC-SHA256 Credential={$accessKey}/{$credentialScope}, SignedHeaders={$signedHeaders}, Signature={$signature}";
        
        return [
            'Content-Type: application/json; charset=utf-8',
            'X-Amz-Date: ' . $timestamp,
            'X-Amz-Target: com.amazon.paapi5.v1.ProductAdvertisingAPIv1.' . $operation,
            'Authorization: ' . $authorization
        ];
    }
    
    /**
     * レスポンス解析
     * 
     * @param string $response APIレスポンス
     * @return array 解析済みデータ
     */
    private function parseResponse(string $response) {
        $data = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('レスポンスのJSON解析エラー: ' . json_last_error_msg());
        }
        
        // エラーチェック
        if (isset($data['__type']) && isset($data['message'])) {
            $errorCode = $data['__type'];
            $errorMessage = $data['message'];
            
            $this->logger->error("API エラーレスポンス", [
                'error_code' => $errorCode,
                'error_message' => $errorMessage
            ]);
            
            throw new Exception("Amazon API エラー [{$errorCode}]: {$errorMessage}");
        }
        
        return $data;
    }
    
    /**
     * レート制限の実施
     */
    private function enforceRateLimit() {
        $now = microtime(true);
        $timeSinceLastRequest = $now - $this->lastRequestTime;
        $minInterval = 1.0 / $this->config['rate_limits']['requests_per_second'];
        
        if ($timeSinceLastRequest < $minInterval) {
            $waitTime = $minInterval - $timeSinceLastRequest;
            usleep($waitTime * 1000000);
        }
    }
    
    /**
     * 日次制限チェック
     */
    private function checkDailyLimit() {
        $now = time();
        
        if (date('Y-m-d', $now) !== date('Y-m-d', $this->lastResetTime)) {
            $this->dailyRequestCount = 0;
            $this->lastResetTime = $now;
        }
        
        if ($this->dailyRequestCount >= $this->config['rate_limits']['max_requests_per_day']) {
            throw new Exception('1日のAPIリクエスト上限に達しました');
        }
    }
    
    /**
     * バックオフ時間計算
     * 
     * @param int $attempt 試行回数
     * @return int 待機時間（秒）
     */
    private function calculateBackoffTime(int $attempt) {
        return min(pow(2, $attempt), 60);
    }
    
    /**
     * リトライすべきかの判定
     * 
     * @param Exception $exception 例外
     * @return bool リトライするかどうか
     */
    private function shouldRetry(Exception $exception) {
        $message = $exception->getMessage();
        
        $retryableErrors = [
            'RequestThrottled',
            'TooManyRequests',
            'InternalServerError',
            'ServiceUnavailable'
        ];
        
        foreach ($retryableErrors as $error) {
            if (strpos($message, $error) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * ASIN検証
     * 
     * @param string $asin ASIN
     * @return bool 有効かどうか
     */
    private function validateAsin(string $asin) {
        return preg_match('/^[A-Z0-9]{10}$/', $asin);
    }
    
    /**
     * API統計情報取得
     * 
     * @return array 統計情報
     */
    public function getApiStats() {
        return [
            'total_requests' => $this->requestCount,
            'daily_requests' => $this->dailyRequestCount,
            'daily_limit' => $this->config['rate_limits']['max_requests_per_day'],
            'daily_remaining' => $this->config['rate_limits']['max_requests_per_day'] - $this->dailyRequestCount,
            'last_request_time' => $this->lastRequestTime ? date('Y-m-d H:i:s', $this->lastRequestTime) : null
        ];
    }
}

/**
 * 簡易ログクラス
 */
class SimpleLogger {
    private $name;
    private $logFile;
    
    public function __construct($name) {
        $this->name = $name;
        $logDir = __DIR__ . '/../logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        $this->logFile = $logDir . '/amazon_api_' . date('Y-m-d') . '.log';
    }
    
    public function info($message, $context = []) {
        $this->log('INFO', $message, $context);
    }
    
    public function error($message, $context = []) {
        $this->log('ERROR', $message, $context);
    }
    
    public function warning($message, $context = []) {
        $this->log('WARNING', $message, $context);
    }
    
    private function log($level, $message, $context = []) {
        $timestamp = date('Y-m-d H:i:s');
        $contextStr = empty($context) ? '' : ' ' . json_encode($context, JSON_UNESCAPED_UNICODE);
        $logEntry = "[{$timestamp}] [{$this->name}] [{$level}] {$message}{$contextStr}" . PHP_EOL;
        
        file_put_contents($this->logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
}
?>
