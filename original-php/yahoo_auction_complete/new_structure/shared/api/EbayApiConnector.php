<?php
/**
 * eBay API統合コネクター - Phase 2 Implementation (続き)
 * new_structure/shared/api/EbayApiConnector.php
 */

class EbayApiConnector {
    private $config;
    private $environment;
    private $logger;
    private $cache;
    
    public function __construct($environment = null) {
        $this->config = require '../shared/config/ebay_api.php';
        $this->environment = $environment ?? $this->config['environment'];
        $this->initializeLogger();
        $this->initializeCache();
    }
    
    /**
     * ログシステム初期化
     */
    private function initializeLogger() {
        if ($this->config['logging']['enabled']) {
            $logDir = dirname($this->config['logging']['file']);
            if (!is_dir($logDir)) {
                mkdir($logDir, 0755, true);
            }
        }
    }
    
    /**
     * キャッシュシステム初期化
     */
    private function initializeCache() {
        if ($this->config['cache']['enabled']) {
            $cacheDir = $this->config['cache']['directory'];
            if (!is_dir($cacheDir)) {
                mkdir($cacheDir, 0755, true);
            }
        }
    }
    
    /**
     * eBayカテゴリーの取得
     * @param string $parentCategoryId
     * @return array|false
     */
    public function getCategories($parentCategoryId = null, $detailLevel = 'ReturnAll') {
        try {
            $cacheKey = 'categories_' . ($parentCategoryId ?? 'root') . '_' . $detailLevel;
            
            // キャッシュ確認
            if ($cached = $this->getFromCache($cacheKey)) {
                $this->log('info', "カテゴリー取得: キャッシュヒット ({$cacheKey})");
                return $cached;
            }
            
            // API呼び出し
            $requestData = [
                'DetailLevel' => $detailLevel,
                'CategorySiteID' => $this->config[$this->environment]['site_id'],
                'LevelLimit' => 3
            ];
            
            if ($parentCategoryId) {
                $requestData['CategoryParent'] = $parentCategoryId;
            }
            
            $response = $this->makeApiCall('GetCategories', $requestData);
            
            if ($response && isset($response['CategoryArray']['Category'])) {
                $categories = $this->normalizeCategories($response['CategoryArray']['Category']);
                $this->saveToCache($cacheKey, $categories);
                
                $this->log('info', 'カテゴリー取得成功: ' . count($categories) . '件');
                return $categories;
            }
            
            $this->log('warning', 'カテゴリー取得: レスポンス形式が不正');
            return false;
            
        } catch (Exception $e) {
            $this->log('error', 'カテゴリー取得エラー: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * カテゴリー別手数料情報取得
     * @param string $categoryId
     * @return array|false
     */
    public function getCategoryFees($categoryId) {
        try {
            $cacheKey = 'fees_' . $categoryId;
            
            if ($cached = $this->getFromCache($cacheKey)) {
                return $cached;
            }
            
            $response = $this->makeApiCall('GetCategoryFeatures', [
                'CategoryID' => $categoryId,
                'AllFeaturesForCategory' => true,
                'FeatureID' => ['ListingDurations', 'PaymentMethods', 'ReturnPolicyEnabled']
            ]);
            
            if ($response && isset($response['Category'])) {
                $fees = $this->extractFeeInformation($response['Category']);
                $this->saveToCache($cacheKey, $fees);
                return $fees;
            }
            
            return false;
            
        } catch (Exception $e) {
            $this->log('error', 'カテゴリー手数料取得エラー: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Item Specifics推奨値取得
     * @param string $categoryId
     * @return array|false
     */
    public function getItemSpecifics($categoryId) {
        try {
            $cacheKey = 'specifics_' . $categoryId;
            
            if ($cached = $this->getFromCache($cacheKey)) {
                return $cached;
            }
            
            $response = $this->makeApiCall('GetCategorySpecifics', [
                'CategoryID' => $categoryId,
                'IncludeCondition' => true
            ]);
            
            if ($response && isset($response['Recommendations'])) {
                $specifics = $this->normalizeItemSpecifics($response['Recommendations']);
                $this->saveToCache($cacheKey, $specifics);
                return $specifics;
            }
            
            return false;
            
        } catch (Exception $e) {
            $this->log('error', 'Item Specifics取得エラー: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 現在の為替レート取得
     * @return float
     */
    public function getExchangeRate() {
        try {
            $cacheKey = 'exchange_rate_jpy_usd';
            
            if ($cached = $this->getFromCache($cacheKey)) {
                return (float)$cached;
            }
            
            $apiKey = $this->config['exchange_rate']['api_key'];
            $url = "https://v6.exchangerate-api.com/v6/{$apiKey}/latest/JPY";
            
            $response = file_get_contents($url);
            $data = json_decode($response, true);
            
            if ($data && isset($data['conversion_rates']['USD'])) {
                $rate = $data['conversion_rates']['USD'];
                $this->saveToCache($cacheKey, $rate, $this->config['exchange_rate']['update_interval']);
                return $rate;
            }
            
            // フォールバック
            return $this->config['exchange_rate']['default_rate'];
            
        } catch (Exception $e) {
            $this->log('warning', '為替レート取得エラー: ' . $e->getMessage());
            return $this->config['exchange_rate']['default_rate'];
        }
    }
    
    /**
     * eBay Trading API呼び出し
     * @param string $callName
     * @param array $requestData
     * @return array|false
     */
    private function makeApiCall($callName, $requestData = []) {
        $config = $this->config[$this->environment];
        $endpoint = $this->config['endpoints'][$this->environment]['trading'];
        
        // XML リクエスト作成
        $xml = $this->buildXmlRequest($callName, $requestData, $config);
        
        // HTTP ヘッダー
        $headers = [
            'X-EBAY-API-COMPATIBILITY-LEVEL: ' . $this->config['compatibility_level'],
            'X-EBAY-API-DEV-NAME: ' . $config['dev_id'],
            'X-EBAY-API-APP-NAME: ' . $config['app_id'],
            'X-EBAY-API-CERT-NAME: ' . $config['cert_id'],
            'X-EBAY-API-CALL-NAME: ' . $callName,
            'X-EBAY-API-SITEID: ' . $config['site_id'],
            'Content-Type: text/xml'
        ];
        
        // cURL 実行
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $endpoint,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->config['call_timeout'],
            CURLOPT_SSL_VERIFYPEER => false
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            throw new Exception("cURL エラー: {$error}");
        }
        
        if ($httpCode !== 200) {
            throw new Exception("HTTP エラー: {$httpCode}");
        }
        
        // XML レスポンス解析
        return $this->parseXmlResponse($response);
    }
    
    /**
     * XML リクエスト構築
     */
    private function buildXmlRequest($callName, $requestData, $config) {
        $xml = '<?xml version="1.0" encoding="utf-8"?>';
        $xml .= '<' . $callName . 'Request xmlns="urn:ebay:apis:eBLBaseComponents">';
        $xml .= '<RequesterCredentials>';
        $xml .= '<eBayAuthToken>' . $config['user_token'] . '</eBayAuthToken>';
        $xml .= '</RequesterCredentials>';
        
        // リクエストデータをXMLに変換
        $xml .= $this->arrayToXml($requestData);
        
        $xml .= '</' . $callName . 'Request>';
        
        return $xml;
    }
    
    /**
     * 配列をXMLに変換
     */
    private function arrayToXml($array, $xml = '') {
        foreach ($array as $key => $value) {
            if (is_array($value)) {
                if (is_numeric($key)) {
                    $xml .= $this->arrayToXml($value);
                } else {
                    $xml .= '<' . $key . '>';
                    $xml .= $this->arrayToXml($value);
                    $xml .= '</' . $key . '>';
                }
            } else {
                $xml .= '<' . $key . '>' . htmlspecialchars($value) . '</' . $key . '>';
            }
        }
        return $xml;
    }
    
    /**
     * XML レスポンス解析
     */
    private function parseXmlResponse($xmlString) {
        $xml = simplexml_load_string($xmlString);
        if ($xml === false) {
            throw new Exception('XML 解析エラー');
        }
        
        return json_decode(json_encode($xml), true);
    }
    
    /**
     * カテゴリーデータ正規化
     */
    private function normalizeCategories($categories) {
        $normalized = [];
        
        // 単一カテゴリーの場合は配列に変換
        if (!isset($categories[0])) {
            $categories = [$categories];
        }
        
        foreach ($categories as $category) {
            $normalized[] = [
                'category_id' => $category['CategoryID'],
                'category_name' => $category['CategoryName'],
                'parent_id' => $category['CategoryParentID'] ?? null,
                'level' => $category['CategoryLevel'] ?? 1,
                'is_leaf' => ($category['LeafCategory'] ?? 'false') === 'true'
            ];
        }
        
        return $normalized;
    }
    
    /**
     * 手数料情報抽出
     */
    private function extractFeeInformation($categoryData) {
        // eBay手数料APIは複雑なため、現在はデフォルト値を返す
        // 実装時は具体的なレスポンス構造に合わせて調整
        return $this->config['default_fees'];
    }
    
    /**
     * Item Specifics正規化
     */
    private function normalizeItemSpecifics($recommendations) {
        $specifics = [];
        
        if (isset($recommendations['NameRecommendation'])) {
            $nameRecs = $recommendations['NameRecommendation'];
            
            if (!isset($nameRecs[0])) {
                $nameRecs = [$nameRecs];
            }
            
            foreach ($nameRecs as $nameRec) {
                $specific = [
                    'name' => $nameRec['Name'],
                    'required' => ($nameRec['ValidationRules']['SelectionMode'] ?? '') === 'Required',
                    'values' => []
                ];
                
                if (isset($nameRec['ValueRecommendation'])) {
                    $valueRecs = $nameRec['ValueRecommendation'];
                    if (!isset($valueRecs[0])) {
                        $valueRecs = [$valueRecs];
                    }
                    
                    foreach ($valueRecs as $valueRec) {
                        $specific['values'][] = $valueRec['Value'];
                    }
                }
                
                $specifics[] = $specific;
            }
        }
        
        return $specifics;
    }
    
    /**
     * キャッシュから取得
     */
    private function getFromCache($key) {
        if (!$this->config['cache']['enabled']) {
            return false;
        }
        
        $cacheFile = $this->config['cache']['directory'] . '/' . md5($key) . '.cache';
        
        if (file_exists($cacheFile)) {
            $data = unserialize(file_get_contents($cacheFile));
            
            if ($data['expires'] > time()) {
                return $data['content'];
            } else {
                unlink($cacheFile);
            }
        }
        
        return false;
    }
    
    /**
     * キャッシュに保存
     */
    private function saveToCache($key, $data, $ttl = null) {
        if (!$this->config['cache']['enabled']) {
            return false;
        }
        
        $ttl = $ttl ?? $this->config['cache']['ttl'];
        $cacheFile = $this->config['cache']['directory'] . '/' . md5($key) . '.cache';
        
        $cacheData = [
            'content' => $data,
            'expires' => time() + $ttl
        ];
        
        file_put_contents($cacheFile, serialize($cacheData));
        return true;
    }
    
    /**
     * ログ出力
     */
    private function log($level, $message) {
        if (!$this->config['logging']['enabled']) {
            return;
        }
        
        $logLevels = ['debug' => 1, 'info' => 2, 'warning' => 3, 'error' => 4];
        $currentLevel = $logLevels[$this->config['logging']['level']] ?? 2;
        $messageLevel = $logLevels[$level] ?? 2;
        
        if ($messageLevel >= $currentLevel) {
            $timestamp = date('Y-m-d H:i:s');
            $logLine = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
            file_put_contents($this->config['logging']['file'], $logLine, FILE_APPEND | LOCK_EX);
        }
    }
    
    /**
     * API接続テスト
     */
    public function testConnection() {
        try {
            $response = $this->makeApiCall('GeteBayOfficialTime');
            
            if ($response && isset($response['Ack'])) {
                return [
                    'success' => true,
                    'message' => 'eBay API接続成功',
                    'environment' => $this->environment,
                    'timestamp' => $response['Timestamp'] ?? date('c')
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'eBay API接続失敗: 不正なレスポンス',
                    'environment' => $this->environment
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'eBay API接続エラー: ' . $e->getMessage(),
                'environment' => $this->environment
            ];
        }
    }
    
    /**
     * 環境情報取得
     */
    public function getEnvironmentInfo() {
        return [
            'environment' => $this->environment,
            'use_real_api' => $this->config['use_real_api'],
            'app_id' => substr($this->config[$this->environment]['app_id'], 0, 20) . '...',
            'site_id' => $this->config[$this->environment]['site_id'],
            'marketplace_id' => $this->config[$this->environment]['marketplace_id'],
            'cache_enabled' => $this->config['cache']['enabled'],
            'logging_enabled' => $this->config['logging']['enabled']
        ];
    }
}
?>