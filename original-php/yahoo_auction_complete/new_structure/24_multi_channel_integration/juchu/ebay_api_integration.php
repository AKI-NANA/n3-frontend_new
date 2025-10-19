<?php
/**
 * NAGANO-3 eBay API統合基盤
 * 
 * 機能: eBay API連携・認証・データ同期・レート制限対応
 * アーキテクチャ: orchestrator層・データ統合・API連携層
 * セキュリティ: OAuth2.0・APIキー暗号化・レート制限管理
 */

class EbayApiIntegration {
    
    private $config;
    private $auth_token;
    private $rate_limiter;
    private $cache_manager;
    private $error_handler;
    
    // eBay API エンドポイント
    private const SANDBOX_BASE_URL = 'https://api.sandbox.ebay.com';
    private const PRODUCTION_BASE_URL = 'https://api.ebay.com';
    
    // API バージョン
    private const SELL_FULFILLMENT_VERSION = 'v1';
    private const SELL_INVENTORY_VERSION = 'v1';
    private const BUY_ORDER_VERSION = 'v2';
    
    public function __construct() {
        $this->loadConfiguration();
        $this->initializeRateLimiter();
        $this->initializeCacheManager();
        $this->initializeErrorHandler();
        
        // 認証初期化
        $this->initializeAuthentication();
        
        error_log("eBay API Integration initialized");
    }
    
    /**
     * 設定読み込み
     */
    private function loadConfiguration() {
        $config_file = '../../../config/ebay_api_config.php';
        
        if (!file_exists($config_file)) {
            throw new Exception("eBay API設定ファイルが見つかりません: {$config_file}");
        }
        
        $this->config = include $config_file;
        
        // 必須設定の確認
        $required_keys = ['client_id', 'client_secret', 'redirect_uri', 'environment', 'accounts'];
        
        foreach ($required_keys as $key) {
            if (!isset($this->config[$key])) {
                throw new Exception("必須設定が不足しています: {$key}");
            }
        }
    }
    
    /**
     * 認証初期化
     */
    private function initializeAuthentication() {
        // 保存されたトークンの読み込み
        $this->loadAuthTokens();
        
        // トークンの有効性確認
        if (!$this->isTokenValid()) {
            $this->refreshAuthToken();
        }
    }
    
    /**
     * 受注一覧取得
     */
    public function getOrderList($filter_params = []) {
        try {
            $orders = [];
            
            // 複数アカウント対応
            foreach ($this->config['accounts'] as $account_id => $account_config) {
                $account_orders = $this->getOrdersForAccount($account_id, $filter_params);
                
                // アカウント識別子を付加
                foreach ($account_orders as &$order) {
                    $order['account_identifier'] = $account_id;
                    $order['account_name'] = $account_config['name'];
                }
                
                $orders = array_merge($orders, $account_orders);
            }
            
            // ソート・フィルタリング
            $orders = $this->processOrderList($orders, $filter_params);
            
            // キャッシュ保存
            $this->cacheOrderData($orders);
            
            return $orders;
            
        } catch (Exception $e) {
            error_log("eBay API Error (getOrderList): " . $e->getMessage());
            
            // フォールバック: キャッシュデータ使用
            return $this->getCachedOrderData();
        }
    }
    
    /**
     * アカウント別受注取得
     */
    private function getOrdersForAccount($account_id, $filter_params) {
        // レート制限チェック
        $this->checkRateLimit($account_id);
        
        // APIエンドポイント構築
        $endpoint = $this->buildOrdersEndpoint($filter_params);
        
        // API呼び出し
        $response = $this->makeApiRequest($endpoint, 'GET', null, $account_id);
        
        if (!$response || !isset($response['orders'])) {
            throw new Exception("受注データの取得に失敗しました (Account: {$account_id})");
        }
        
        // データ変換
        return $this->transformOrderData($response['orders']);
    }
    
    /**
     * 受注詳細取得
     */
    public function getOrderDetail($order_id, $account_id = null) {
        try {
            // アカウント自動判定
            if (!$account_id) {
                $account_id = $this->detectAccountByOrderId($order_id);
            }
            
            // レート制限チェック
            $this->checkRateLimit($account_id);
            
            // API呼び出し
            $endpoint = "/sell/fulfillment/" . self::SELL_FULFILLMENT_VERSION . "/order/{$order_id}";
            $response = $this->makeApiRequest($endpoint, 'GET', null, $account_id);
            
            if (!$response) {
                throw new Exception("受注詳細の取得に失敗しました: {$order_id}");
            }
            
            // 詳細データ変換
            return $this->transformOrderDetailData($response);
            
        } catch (Exception $e) {
            error_log("eBay API Error (getOrderDetail): " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 商品情報取得
     */
    public function getItemDetails($item_id, $account_id = null) {
        try {
            if (!$account_id) {
                $account_id = $this->getDefaultAccountId();
            }
            
            $this->checkRateLimit($account_id);
            
            $endpoint = "/sell/inventory/" . self::SELL_INVENTORY_VERSION . "/inventory_item/{$item_id}";
            $response = $this->makeApiRequest($endpoint, 'GET', null, $account_id);
            
            return $this->transformItemData($response);
            
        } catch (Exception $e) {
            error_log("eBay API Error (getItemDetails): " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * 出荷情報更新
     */
    public function updateShippingStatus($order_id, $tracking_data, $account_id = null) {
        try {
            if (!$account_id) {
                $account_id = $this->detectAccountByOrderId($order_id);
            }
            
            $this->checkRateLimit($account_id);
            
            $endpoint = "/sell/fulfillment/" . self::SELL_FULFILLMENT_VERSION . "/order/{$order_id}/shipping_fulfillment";
            
            $payload = [
                'lineItems' => $tracking_data['line_items'],
                'shippedDate' => $tracking_data['shipped_date'],
                'shippingCarrierCode' => $tracking_data['carrier_code'],
                'trackingNumber' => $tracking_data['tracking_number']
            ];
            
            $response = $this->makeApiRequest($endpoint, 'POST', $payload, $account_id);
            
            return $response ? true : false;
            
        } catch (Exception $e) {
            error_log("eBay API Error (updateShippingStatus): " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * API リクエスト実行
     */
    private function makeApiRequest($endpoint, $method = 'GET', $payload = null, $account_id = null) {
        // URL構築
        $base_url = $this->config['environment'] === 'production' 
            ? self::PRODUCTION_BASE_URL 
            : self::SANDBOX_BASE_URL;
        
        $url = $base_url . $endpoint;
        
        // ヘッダー構築
        $headers = $this->buildRequestHeaders($account_id);
        
        // cURL初期化
        $curl = curl_init();
        
        curl_setopt_array($curl, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_USERAGENT => 'NAGANO-3-eBay-Integration/1.0'
        ]);
        
        // HTTPメソッド設定
        switch (strtoupper($method)) {
            case 'POST':
                curl_setopt($curl, CURLOPT_POST, true);
                if ($payload) {
                    curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($payload));
                }
                break;
                
            case 'PUT':
                curl_setopt($curl, CURLOPT_CUSTOMREQUEST, 'PUT');
                if ($payload) {
                    curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($payload));
                }
                break;
                
            case 'DELETE':
                curl_setopt($curl, CURLOPT_CUSTOMREQUEST, 'DELETE');
                break;
        }
        
        // リクエスト実行
        $response = curl_exec($curl);
        $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($curl);
        
        curl_close($curl);
        
        // エラーハンドリング
        if ($curl_error) {
            throw new Exception("cURL Error: {$curl_error}");
        }
        
        if ($http_code >= 400) {
            $this->handleApiError($response, $http_code, $endpoint);
        }
        
        // レスポンス解析
        $decoded_response = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON response: " . json_last_error_msg());
        }
        
        // レート制限情報更新
        $this->updateRateLimitInfo($account_id, $headers);
        
        return $decoded_response;
    }
    
    /**
     * リクエストヘッダー構築
     */
    private function buildRequestHeaders($account_id) {
        $token = $this->getAccountToken($account_id);
        
        return [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'Accept: application/json',
            'X-EBAY-SOA-SECURITY-TOKEN: ' . $token,
            'X-EBAY-SOA-SERVICE-VERSION: ' . self::SELL_FULFILLMENT_VERSION
        ];
    }
    
    /**
     * 受注データ変換
     */
    private function transformOrderData($raw_orders) {
        $transformed = [];
        
        foreach ($raw_orders as $raw_order) {
            $order = [
                'order_id' => $raw_order['orderId'],
                'created_date' => $raw_order['creationDate'],
                'order_status' => $this->mapOrderStatus($raw_order['orderFulfillmentStatus']),
                'payment_status' => $this->mapPaymentStatus($raw_order['orderPaymentStatus']),
                'total_amount' => $raw_order['pricingSummary']['total']['value'],
                'currency' => $raw_order['pricingSummary']['total']['currency'],
                'buyer_username' => $raw_order['buyer']['username'] ?? '',
                'buyer_email' => $raw_order['buyer']['buyerRegistrationDate'] ?? '',
                'shipping_address' => $this->extractShippingAddress($raw_order),
                'line_items' => $this->transformLineItems($raw_order['lineItems']),
                'payment_date' => $raw_order['paymentSummary']['paymentDate'] ?? null,
                'shipping_deadline' => $this->calculateShippingDeadline($raw_order),
                'ebay_item_url' => $this->buildEbayItemUrl($raw_order),
                'sales_record_number' => $raw_order['salesRecordReference'] ?? ''
            ];
            
            // 商品情報抽出（最初のアイテム）
            if (!empty($order['line_items'])) {
                $first_item = $order['line_items'][0];
                $order['item_title'] = $first_item['title'];
                $order['item_image_url'] = $first_item['image_url'];
                $order['custom_label'] = $first_item['sku'];
                $order['shipping_country'] = $order['shipping_address']['country_code'];
                $order['payment_method'] = $raw_order['paymentSummary']['paymentMethod'] ?? 'unknown';
            }
            
            $transformed[] = $order;
        }
        
        return $transformed;
    }
    
    /**
     * 受注詳細データ変換
     */
    private function transformOrderDetailData($raw_order) {
        $detail = $this->transformOrderData([$raw_order])[0];
        
        // 詳細情報追加
        $detail['fulfillment_instructions'] = $raw_order['fulfillmentInstructions'] ?? [];
        $detail['cancellation_requests'] = $raw_order['cancellationRequests'] ?? [];
        $detail['payment_summary'] = $raw_order['paymentSummary'] ?? [];
        $detail['program_summary'] = $raw_order['programSummary'] ?? [];
        
        return $detail;
    }
    
    /**
     * ラインアイテム変換
     */
    private function transformLineItems($raw_line_items) {
        $line_items = [];
        
        foreach ($raw_line_items as $raw_item) {
            $line_items[] = [
                'line_item_id' => $raw_item['lineItemId'],
                'sku' => $raw_item['legacyVariationSku'] ?? $raw_item['lineItemId'],
                'title' => $raw_item['title'],
                'quantity' => $raw_item['quantity'],
                'item_price' => $raw_item['itemPrice']['value'],
                'total_price' => $raw_item['total']['value'],
                'currency' => $raw_item['total']['currency'],
                'ebay_item_id' => $raw_item['ebayItemId'],
                'condition' => $raw_item['itemCondition'] ?? 'NEW',
                'image_url' => $this->extractItemImageUrl($raw_item),
                'fulfillment_status' => $raw_item['lineItemFulfillmentStatus']
            ];
        }
        
        return $line_items;
    }
    
    /**
     * 配送先住所抽出
     */
    private function extractShippingAddress($raw_order) {
        $shipping = $raw_order['fulfillmentStartInstructions'][0]['shippingStep']['shipTo'] ?? [];
        
        return [
            'full_name' => $shipping['fullName'] ?? '',
            'company_name' => $shipping['companyName'] ?? '',
            'address_line1' => $shipping['contactAddress']['addressLine1'] ?? '',
            'address_line2' => $shipping['contactAddress']['addressLine2'] ?? '',
            'city' => $shipping['contactAddress']['city'] ?? '',
            'state_or_province' => $shipping['contactAddress']['stateOrProvince'] ?? '',
            'postal_code' => $shipping['contactAddress']['postalCode'] ?? '',
            'country_code' => $shipping['contactAddress']['countryCode'] ?? '',
            'phone_number' => $shipping['primaryPhone']['phoneNumber'] ?? ''
        ];
    }
    
    /**
     * ステータスマッピング
     */
    private function mapOrderStatus($ebay_status) {
        $status_map = [
            'NOT_STARTED' => 'awaiting_payment',
            'IN_PROGRESS' => 'payment_received',
            'FULFILLED' => 'shipped',
            'CANCELLED' => 'cancelled'
        ];
        
        return $status_map[$ebay_status] ?? 'unknown';
    }
    
    /**
     * 支払いステータスマッピング
     */
    private function mapPaymentStatus($ebay_payment_status) {
        $payment_map = [
            'NOT_PAID' => 'pending',
            'PAID' => 'completed',
            'FAILED' => 'failed',
            'PENDING' => 'pending'
        ];
        
        return $payment_map[$ebay_payment_status] ?? 'unknown';
    }
    
    /**
     * 発送期限計算
     */
    private function calculateShippingDeadline($raw_order) {
        $handling_time = $raw_order['fulfillmentStartInstructions'][0]['maxEstimatedDeliveryDate'] ?? null;
        
        if ($handling_time) {
            return $handling_time;
        }
        
        // デフォルト: 注文日から3営業日後
        $order_date = new DateTime($raw_order['creationDate']);
        $order_date->add(new DateInterval('P3D'));
        
        return $order_date->format('Y-m-d');
    }
    
    /**
     * eBay商品URL構築
     */
    private function buildEbayItemUrl($raw_order) {
        $item_id = $raw_order['lineItems'][0]['ebayItemId'] ?? '';
        
        if ($item_id) {
            return "https://www.ebay.com/itm/{$item_id}";
        }
        
        return null;
    }
    
    /**
     * 商品画像URL抽出
     */
    private function extractItemImageUrl($raw_item) {
        // eBay API経由で商品画像取得（別途実装）
        return "/images/placeholder-product.jpg"; // プレースホルダー
    }
    
    /**
     * レート制限チェック
     */
    private function checkRateLimit($account_id) {
        $current_usage = $this->rate_limiter->getCurrentUsage($account_id);
        $limit = $this->rate_limiter->getLimit($account_id);
        
        if ($current_usage >= $limit) {
            $reset_time = $this->rate_limiter->getResetTime($account_id);
            $wait_seconds = $reset_time - time();
            
            if ($wait_seconds > 0) {
                sleep(min($wait_seconds, 60)); // 最大60秒待機
            }
        }
    }
    
    /**
     * レート制限情報更新
     */
    private function updateRateLimitInfo($account_id, $response_headers) {
        // レスポンスヘッダーからレート制限情報抽出
        foreach ($response_headers as $header) {
            if (strpos($header, 'X-RateLimit-Remaining:') !== false) {
                $remaining = (int) trim(substr($header, strpos($header, ':') + 1));
                $this->rate_limiter->updateRemaining($account_id, $remaining);
            }
            
            if (strpos($header, 'X-RateLimit-Reset:') !== false) {
                $reset_time = (int) trim(substr($header, strpos($header, ':') + 1));
                $this->rate_limiter->updateResetTime($account_id, $reset_time);
            }
        }
        
        $this->rate_limiter->incrementUsage($account_id);
    }
    
    /**
     * APIエラーハンドリング
     */
    private function handleApiError($response, $http_code, $endpoint) {
        $error_data = json_decode($response, true);
        
        $error_message = "eBay API Error [{$http_code}] on {$endpoint}";
        
        if ($error_data && isset($error_data['errors'])) {
            foreach ($error_data['errors'] as $error) {
                $error_message .= " - " . $error['message'];
            }
        }
        
        // 特定エラーの対処
        switch ($http_code) {
            case 401:
                // 認証エラー - トークン更新
                $this->refreshAuthToken();
                throw new Exception("認証エラー: トークンを更新しました。再試行してください。");
                
            case 429:
                // レート制限エラー
                throw new Exception("レート制限に達しました。しばらく待ってから再試行してください。");
                
            case 500:
            case 502:
            case 503:
                // サーバーエラー
                throw new Exception("eBayサーバーエラー: 一時的な問題の可能性があります。");
                
            default:
                throw new Exception($error_message);
        }
    }
    
    /**
     * 認証トークン読み込み
     */
    private function loadAuthTokens() {
        $token_file = '../../../cache/ebay_tokens.json';
        
        if (file_exists($token_file)) {
            $tokens = json_decode(file_get_contents($token_file), true);
            $this->auth_token = $tokens;
        } else {
            $this->auth_token = [];
        }
    }
    
    /**
     * トークン有効性確認
     */
    private function isTokenValid() {
        foreach ($this->config['accounts'] as $account_id => $account_config) {
            if (!isset($this->auth_token[$account_id])) {
                return false;
            }
            
            $token_data = $this->auth_token[$account_id];
            
            if (!isset($token_data['expires_at']) || time() >= $token_data['expires_at']) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 認証トークン更新
     */
    private function refreshAuthToken() {
        foreach ($this->config['accounts'] as $account_id => $account_config) {
            $this->refreshAccountToken($account_id, $account_config);
        }
        
        $this->saveAuthTokens();
    }
    
    /**
     * アカウント別トークン更新
     */
    private function refreshAccountToken($account_id, $account_config) {
        // OAuth2.0 リフレッシュトークンフロー
        $refresh_token = $this->auth_token[$account_id]['refresh_token'] ?? $account_config['refresh_token'];
        
        if (!$refresh_token) {
            throw new Exception("リフレッシュトークンが設定されていません: {$account_id}");
        }
        
        $token_url = $this->config['environment'] === 'production' 
            ? 'https://api.ebay.com/identity/v1/oauth2/token'
            : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';
        
        $curl = curl_init();
        
        curl_setopt_array($curl, [
            CURLOPT_URL => $token_url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Basic ' . base64_encode($this->config['client_id'] . ':' . $this->config['client_secret']),
                'Content-Type: application/x-www-form-urlencoded'
            ],
            CURLOPT_POSTFIELDS => http_build_query([
                'grant_type' => 'refresh_token',
                'refresh_token' => $refresh_token,
                'scope' => 'https://api.ebay.com/oauth/api_scope/sell.marketing.readonly https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.fulfillment'
            ])
        ]);
        
        $response = curl_exec($curl);
        $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        
        if ($http_code !== 200) {
            throw new Exception("トークン更新に失敗しました: {$account_id} (HTTP {$http_code})");
        }
        
        $token_data = json_decode($response, true);
        
        $this->auth_token[$account_id] = [
            'access_token' => $token_data['access_token'],
            'refresh_token' => $token_data['refresh_token'] ?? $refresh_token,
            'expires_at' => time() + $token_data['expires_in'] - 300, // 5分のマージン
            'token_type' => $token_data['token_type'] ?? 'Bearer'
        ];
    }
    
    /**
     * 認証トークン保存
     */
    private function saveAuthTokens() {
        $token_file = '../../../cache/ebay_tokens.json';
        $cache_dir = dirname($token_file);
        
        if (!is_dir($cache_dir)) {
            mkdir($cache_dir, 0755, true);
        }
        
        file_put_contents($token_file, json_encode($this->auth_token, JSON_PRETTY_PRINT));
        chmod($token_file, 0600); // セキュリティ: 読み書き権限制限
    }
    
    /**
     * アカウントトークン取得
     */
    private function getAccountToken($account_id) {
        if (!isset($this->auth_token[$account_id])) {
            throw new Exception("アカウントトークンが見つかりません: {$account_id}");
        }
        
        return $this->auth_token[$account_id]['access_token'];
    }
    
    /**
     * 受注IDからアカウント検出
     */
    private function detectAccountByOrderId($order_id) {
        // 受注IDのパターンから推測またはデータベース検索
        // 実装時に具体的なロジックを組み込み
        return $this->getDefaultAccountId();
    }
    
    /**
     * デフォルトアカウントID取得
     */
    private function getDefaultAccountId() {
        $account_keys = array_keys($this->config['accounts']);
        return $account_keys[0] ?? null;
    }
    
    /**
     * 受注一覧処理
     */
    private function processOrderList($orders, $filter_params) {
        // 日付ソート（新しい順）
        usort($orders, function($a, $b) {
            return strtotime($b['created_date']) - strtotime($a['created_date']);
        });
        
        return $orders;
    }
    
    /**
     * 受注データキャッシュ保存
     */
    private function cacheOrderData($orders) {
        $cache_file = '../../../cache/ebay_orders_cache.json';
        $cache_dir = dirname($cache_file);
        
        if (!is_dir($cache_dir)) {
            mkdir($cache_dir, 0755, true);
        }
        
        $cache_data = [
            'timestamp' => time(),
            'orders' => $orders
        ];
        
        file_put_contents($cache_file, json_encode($cache_data));
    }
    
    /**
     * キャッシュデータ取得
     */
    private function getCachedOrderData() {
        $cache_file = '../../../cache/ebay_orders_cache.json';
        
        if (file_exists($cache_file)) {
            $cache_data = json_decode(file_get_contents($cache_file), true);
            return $cache_data['orders'] ?? [];
        }
        
        return [];
    }
    
    /**
     * 受注エンドポイント構築
     */
    private function buildOrdersEndpoint($filter_params) {
        $endpoint = "/sell/fulfillment/" . self::SELL_FULFILLMENT_VERSION . "/order";
        $query_params = [];
        
        // フィルターパラメータ適用
        if (!empty($filter_params['date_from'])) {
            $query_params['filter'] = 'creationdate:[' . $filter_params['date_from'] . 'T00:00:00.000Z..';
            
            if (!empty($filter_params['date_to'])) {
                $query_params['filter'] .= $filter_params['date_to'] . 'T23:59:59.999Z]';
            } else {
                $query_params['filter'] .= ']';
            }
        }
        
        if (!empty($filter_params['status_filter'])) {
            $query_params['orderFulfillmentStatus'] = $filter_params['status_filter'];
        }
        
        $query_params['limit'] = $filter_params['limit'] ?? 200;
        $query_params['offset'] = $filter_params['offset'] ?? 0;
        
        if (!empty($query_params)) {
            $endpoint .= '?' . http_build_query($query_params);
        }
        
        return $endpoint;
    }
    
    /**
     * レート制限管理初期化
     */
    private function initializeRateLimiter() {
        require_once '../../../common/utils/rate_limiter.php';
        $this->rate_limiter = new RateLimiter('ebay_api');
    }
    
    /**
     * キャッシュ管理初期化
     */
    private function initializeCacheManager() {
        require_once '../../../common/utils/cache_manager.php';
        $this->cache_manager = new CacheManager('ebay');
    }
    
    /**
     * エラーハンドラー初期化
     */
    private function initializeErrorHandler() {
        require_once '../../../common/utils/error_handler.php';
        $this->error_handler = new ErrorHandler('ebay_api');
    }
}
?>